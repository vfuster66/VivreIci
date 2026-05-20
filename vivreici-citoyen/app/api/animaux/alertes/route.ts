import { NextResponse } from "next/server"
import { getAnimalAlertTypeLabel, type AnimalAlertRecord } from "@/lib/animal-alerts"
import { handleAnimalAlertCreatedNotification } from "@/lib/notifications"
import { buildDisplayName } from "@/lib/profile"
import { createAdminClient } from "@/lib/supabase-admin"
import { createServerAuthClient } from "@/lib/supabase-server"
import { validatePublicTextFields } from "@/lib/contact-guard"
import { geocodePlaceInFrance } from "@/lib/map-location"

async function getAuthenticatedUserId(request: Request) {
  const authorization = request.headers.get("authorization")

  if (!authorization?.startsWith("Bearer ")) {
    return null
  }

  const accessToken = authorization.slice("Bearer ".length).trim()

  if (!accessToken) {
    return null
  }

  const supabase = createServerAuthClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken)

  if (error || !user) {
    return null
  }

  return user.id
}

function getDefaultExpiryIso(observedAt?: string | null) {
  const baseDate = observedAt ? new Date(observedAt) : new Date()

  if (Number.isNaN(baseDate.getTime())) {
    return null
  }

  const expiryDate = new Date(baseDate)
  expiryDate.setDate(expiryDate.getDate() + 21)
  return expiryDate.toISOString()
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const city = searchParams.get("city")?.trim().toLowerCase() || null
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("animal_alerts")
      .select(
        "id, user_id, alert_type, title, description, city, lat, lng, radius_meters, severity, status, source_type, species_scope, observed_at, expires_at, is_verified, author_label, author_avatar_url, created_at, updated_at"
      )
      .order("created_at", { ascending: false })
      .limit(80)

    if (error) {
      throw error
    }

    const now = Date.now()
    const alerts = ((data ?? []) as AnimalAlertRecord[])
      .filter((alert) => {
        if (alert.status !== "active") {
          return false
        }

        if (!alert.expires_at) {
          return true
        }

        const expiry = new Date(alert.expires_at).getTime()
        return !Number.isNaN(expiry) && expiry >= now
      })
      .sort((first, second) => {
        if (city) {
          const firstIsLocal = first.city.trim().toLowerCase() === city
          const secondIsLocal = second.city.trim().toLowerCase() === city

          if (firstIsLocal !== secondIsLocal) {
            return firstIsLocal ? -1 : 1
          }
        }

        return new Date(second.created_at).getTime() - new Date(first.created_at).getTime()
      })

    return NextResponse.json({ alerts })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de charger les alertes animales.",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request)

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json()) as {
      alertType?: AnimalAlertRecord["alert_type"]
      title?: string
      description?: string
      city?: string
      severity?: AnimalAlertRecord["severity"]
      speciesScope?: AnimalAlertRecord["species_scope"]
      radiusMeters?: number
      observedAt?: string | null
    }

    const validationError = validatePublicTextFields([
      { label: "Titre", value: body.title ?? "" },
      { label: "Description", value: body.description ?? "" },
      { label: "Ville", value: body.city ?? "" },
    ])

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    if (!body.alertType) {
      return NextResponse.json({ error: "Choisissez un type d’alerte." }, { status: 400 })
    }

    if (!body.city?.trim()) {
      return NextResponse.json({ error: "Indiquez une ville." }, { status: 400 })
    }

    if (!body.description?.trim()) {
      return NextResponse.json(
        { error: "Ajoutez une description utile et localisée." },
        { status: 400 }
      )
    }

    const title = body.title?.trim() || getAnimalAlertTypeLabel(body.alertType)
    const coordinates = await geocodePlaceInFrance(body.city.trim())

    if (!coordinates) {
      return NextResponse.json(
        { error: "Impossible de localiser cette ville." },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("display_name, first_name, last_name, avatar_url")
      .eq("id", userId)
      .maybeSingle()

    if (profileError) {
      throw profileError
    }

    const authorLabel = buildDisplayName(profile, "Habitant local")
    const observedAtIso =
      body.observedAt?.trim() ? new Date(`${body.observedAt.trim()}T12:00:00`).toISOString() : null

    const { data, error } = await supabase
      .from("animal_alerts")
      .insert({
        user_id: userId,
        alert_type: body.alertType,
        title,
        description: body.description.trim(),
        city: body.city.trim(),
        lat: coordinates.lat,
        lng: coordinates.lng,
        radius_meters:
          typeof body.radiusMeters === "number" && body.radiusMeters > 0
            ? body.radiusMeters
            : 500,
        severity: body.severity === "high" ? "high" : "medium",
        status: "active",
        source_type: "community",
        species_scope: body.speciesScope ?? "all",
        observed_at: observedAtIso,
        expires_at: getDefaultExpiryIso(observedAtIso),
        is_verified: false,
        author_label: authorLabel,
        author_avatar_url: profile?.avatar_url ?? null,
        updated_at: new Date().toISOString(),
      })
      .select(
        "id, user_id, alert_type, title, description, city, lat, lng, radius_meters, severity, status, source_type, species_scope, observed_at, expires_at, is_verified, author_label, author_avatar_url, created_at, updated_at"
      )
      .single()

    if (error) {
      throw error
    }

    try {
      await handleAnimalAlertCreatedNotification({
        alertId: data.id,
        actorUserId: userId,
      })
    } catch (notificationError) {
      console.error("animal alert notifications failed", notificationError)
    }

    return NextResponse.json({ alert: data })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de publier cette alerte animale.",
      },
      { status: 500 }
    )
  }
}
