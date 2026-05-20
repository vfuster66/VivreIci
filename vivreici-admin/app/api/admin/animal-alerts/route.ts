import { NextResponse } from "next/server"
import {
  canManageAnimalContent,
  canAccessModeration,
  getAdminMembershipForRequest,
} from "@/lib/admin-access"
import { buildAdminAnimalAlertsData } from "@/lib/admin-animal-alerts"
import { createAdminClient } from "@/lib/supabase-admin"

export async function GET(request: Request) {
  try {
    const membership = await getAdminMembershipForRequest(request)

    if (!membership || !canAccessModeration(membership.role)) {
      return NextResponse.json(
        { error: "Accès administration refusé." },
        { status: 403 }
      )
    }

    return NextResponse.json(await buildAdminAnimalAlertsData(membership))
  } catch {
    return NextResponse.json(
      {
        error: "Impossible de charger les alertes animales admin.",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const membership = await getAdminMembershipForRequest(request)

    if (!membership || !canAccessModeration(membership.role)) {
      return NextResponse.json(
        { error: "Accès administration refusé." },
        { status: 403 }
      )
    }

    const body = (await request.json()) as {
      mode?: "moderate" | "upsert"
      alertId?: string
      title?: string
      description?: string
      city?: string
      lat?: number
      lng?: number
      alertType?:
        | "processionnaires"
        | "epillets"
        | "tiques"
        | "puces"
        | "plantes_toxiques"
        | "cyanobacteries"
        | "chaleur"
        | "autre"
      sourceType?: "community" | "official" | "system"
      severity?: "medium" | "high"
      status?: "active" | "resolved" | "expired"
      speciesScope?: "all" | "cat" | "dog" | "bird" | "nac" | "multiple"
      isVerified?: boolean
      radiusMeters?: number
      observedAt?: string | null
      expiresAt?: string | null
    }

    if (body.mode === "upsert") {
      if (!canManageAnimalContent(membership.role)) {
        return NextResponse.json(
          { error: "Seul le superadmin peut créer ou modifier une alerte." },
          { status: 403 }
        )
      }

      const title = body.title?.trim() ?? ""
      const description = body.description?.trim() ?? ""
      const city = body.city?.trim() ?? ""

      if (!title || !description || !city || !body.alertType) {
        return NextResponse.json(
          { error: "Titre, description, ville et type sont obligatoires." },
          { status: 400 }
        )
      }

      if (typeof body.lat !== "number" || typeof body.lng !== "number") {
        return NextResponse.json(
          { error: "Les coordonnées latitude/longitude sont obligatoires." },
          { status: 400 }
        )
      }

      const supabase = createAdminClient()
      const payload = {
        user_id: membership.userId,
        title,
        description,
        city,
        lat: body.lat,
        lng: body.lng,
        alert_type: body.alertType,
        source_type: body.sourceType ?? "official",
        severity: body.severity ?? "medium",
        status: body.status ?? "active",
        species_scope: body.speciesScope ?? "all",
        is_verified: typeof body.isVerified === "boolean" ? body.isVerified : true,
        radius_meters: body.radiusMeters ?? 500,
        observed_at: body.observedAt || null,
        expires_at: body.expiresAt || null,
        author_label: membership.organizationName?.trim() || "Administration",
        updated_at: new Date().toISOString(),
      }

      if (body.alertId) {
        const { error } = await supabase
          .from("animal_alerts")
          .update(payload)
          .eq("id", body.alertId)

        if (error) {
          throw error
        }

        const { error: auditError } = await supabase.from("admin_audit_logs").insert({
          actor_user_id: membership.userId,
          target_user_id: membership.userId,
          action: "animal_alert_updated",
          previous_role: null,
          next_role: null,
          organization_name: membership.organizationName,
          territory_label: membership.territoryLabel,
          metadata: {
            alertId: body.alertId,
            title,
            city,
            alertType: body.alertType,
            status: body.status ?? "active",
          },
        })

        if (auditError) {
          throw auditError
        }

        return NextResponse.json({ ok: true, id: body.alertId })
      } else {
        const { data, error } = await supabase
          .from("animal_alerts")
          .insert(payload)
          .select("id")
          .single()

        if (error) {
          throw error
        }

        const { error: auditError } = await supabase.from("admin_audit_logs").insert({
          actor_user_id: membership.userId,
          target_user_id: membership.userId,
          action: "animal_alert_created",
          previous_role: null,
          next_role: null,
          organization_name: membership.organizationName,
          territory_label: membership.territoryLabel,
          metadata: {
            title,
            city,
            alertType: body.alertType,
            status: body.status ?? "active",
          },
        })

        if (auditError) {
          throw auditError
        }

        return NextResponse.json({ ok: true, id: data.id })
      }
    }

    if (!body.alertId) {
      return NextResponse.json({ error: "alertId manquant." }, { status: 400 })
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    const auditEntries: Array<{
      action:
        | "animal_alert_verified"
        | "animal_alert_unverified"
        | "animal_alert_source_updated"
        | "animal_alert_status_updated"
      previous_value: string | null
      next_value: string | null
      metadata: Record<string, unknown>
    }> = []

    const supabase = createAdminClient()
    const { data: currentAlert, error: currentAlertError } = await supabase
      .from("animal_alerts")
      .select("id, is_verified, source_type, status")
      .eq("id", body.alertId)
      .maybeSingle()

    if (currentAlertError || !currentAlert) {
      return NextResponse.json({ error: "Alerte introuvable." }, { status: 404 })
    }

    if (typeof body.isVerified === "boolean") {
      updatePayload.is_verified = body.isVerified
      if (body.isVerified !== currentAlert.is_verified) {
        auditEntries.push({
          action: body.isVerified ? "animal_alert_verified" : "animal_alert_unverified",
          previous_value: String(currentAlert.is_verified),
          next_value: String(body.isVerified),
          metadata: {},
        })
      }
    }

    if (
      body.sourceType === "community" ||
      body.sourceType === "official" ||
      body.sourceType === "system"
    ) {
      updatePayload.source_type = body.sourceType
      if (body.sourceType !== currentAlert.source_type) {
        auditEntries.push({
          action: "animal_alert_source_updated",
          previous_value: currentAlert.source_type,
          next_value: body.sourceType,
          metadata: {},
        })
      }
    }

    if (
      body.status === "active" ||
      body.status === "resolved" ||
      body.status === "expired"
    ) {
      updatePayload.status = body.status
      if (body.status !== currentAlert.status) {
        auditEntries.push({
          action: "animal_alert_status_updated",
          previous_value: currentAlert.status,
          next_value: body.status,
          metadata: {},
        })
      }
    }
    const { data, error } = await supabase
      .from("animal_alerts")
      .update(updatePayload)
      .eq("id", body.alertId)
      .select("id")
      .maybeSingle()

    if (error || !data) {
      return NextResponse.json({ error: "Alerte introuvable." }, { status: 404 })
    }

    if (auditEntries.length > 0) {
      const { error: auditError } = await supabase
        .from("animal_alert_moderation_logs")
        .insert(
          auditEntries.map((entry) => ({
            alert_id: body.alertId,
            actor_user_id: membership.userId,
            action: entry.action,
            previous_value: entry.previous_value,
            next_value: entry.next_value,
            metadata: entry.metadata,
          }))
        )

      if (auditError) {
        throw auditError
      }
    }

    return NextResponse.json({ ok: true, id: body.alertId })
  } catch {
    return NextResponse.json(
      {
        error: "Impossible de mettre à jour cette alerte animale.",
      },
      { status: 500 }
    )
  }
}
