import { NextResponse } from "next/server"
import {
  canManageAnimalContent,
  canAccessModeration,
  getAdminMembershipForRequest,
} from "@/lib/admin-access"
import { buildAdminAnimalPostsData } from "@/lib/admin-animal-posts"
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

    return NextResponse.json(await buildAdminAnimalPostsData(membership))
  } catch {
    return NextResponse.json(
      {
        error: "Impossible de charger les annonces animaux admin.",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const membership = await getAdminMembershipForRequest(request)

    if (!membership || !canManageAnimalContent(membership.role)) {
      return NextResponse.json(
        { error: "Seul le superadmin peut créer ou modifier une annonce animale." },
        { status: 403 }
      )
    }

    const body = (await request.json()) as {
      postId?: string
      petName?: string
      animalType?: string
      city?: string
      description?: string
      status?: "lost" | "found" | "spotted"
      isFound?: boolean
      lat?: number
      lng?: number
      lastSeenAt?: string | null
    }

    const city = body.city?.trim() ?? ""
    const description = body.description?.trim() ?? ""

    if (!city || !description) {
      return NextResponse.json(
        { error: "Ville et description sont obligatoires." },
        { status: 400 }
      )
    }

    if (typeof body.lat !== "number" || typeof body.lng !== "number") {
      return NextResponse.json(
        { error: "Les coordonnées latitude/longitude sont obligatoires." },
        { status: 400 }
      )
    }

    const payload = {
      user_id: membership.userId,
      pet_name: body.petName?.trim() || null,
      animal_type: body.animalType?.trim() || null,
      city,
      description,
      status: body.status ?? "lost",
      is_found: Boolean(body.isFound),
      lat: body.lat,
      lng: body.lng,
      last_seen_at: body.lastSeenAt || null,
      updated_at: new Date().toISOString(),
    }

    const supabase = createAdminClient()

    if (body.postId) {
      const { error } = await supabase
        .from("lost_pets")
        .update(payload)
        .eq("id", body.postId)

      if (error) {
        throw error
      }

      const { error: auditError } = await supabase.from("admin_audit_logs").insert({
        actor_user_id: membership.userId,
        target_user_id: membership.userId,
        action: "animal_post_updated",
        previous_role: null,
        next_role: null,
        organization_name: membership.organizationName,
        territory_label: membership.territoryLabel,
        metadata: {
          postId: body.postId,
          petName: body.petName?.trim() || null,
          animalType: body.animalType?.trim() || null,
          city,
          status: body.status ?? "lost",
        },
      })

      if (auditError) {
        throw auditError
      }

      return NextResponse.json({ ok: true, id: body.postId })
    } else {
      const { data, error } = await supabase
        .from("lost_pets")
        .insert(payload)
        .select("id")
        .single()

      if (error) {
        throw error
      }

      const { error: auditError } = await supabase.from("admin_audit_logs").insert({
        actor_user_id: membership.userId,
        target_user_id: membership.userId,
        action: "animal_post_created",
        previous_role: null,
        next_role: null,
        organization_name: membership.organizationName,
        territory_label: membership.territoryLabel,
        metadata: {
          petName: body.petName?.trim() || null,
          animalType: body.animalType?.trim() || null,
          city,
          status: body.status ?? "lost",
        },
      })

      if (auditError) {
        throw auditError
      }

      return NextResponse.json({ ok: true, id: data.id })
    }
  } catch {
    return NextResponse.json(
      {
        error: "Impossible d'enregistrer cette annonce animale.",
      },
      { status: 500 }
    )
  }
}
