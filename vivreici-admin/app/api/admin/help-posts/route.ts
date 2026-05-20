import { NextResponse } from "next/server"
import {
  canAccessModeration,
  getAdminMembershipForRequest,
} from "@/lib/admin-access"
import { buildAdminHelpPostsData } from "@/lib/admin-help-posts"
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

    return NextResponse.json(await buildAdminHelpPostsData(membership))
  } catch {
    return NextResponse.json(
      {
        error: "Impossible de charger les annonces d'entraide admin.",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const membership = await getAdminMembershipForRequest(request)

    if (!membership || membership.role !== "superadmin") {
      return NextResponse.json(
        { error: "Accès superadmin requis." },
        { status: 403 }
      )
    }

    const body = (await request.json()) as {
      kind?: "request" | "offer"
      category?: string
      priority?: "normal" | "urgent"
      title?: string
      summary?: string
      details?: string
      city?: string
      availabilityText?: string | null
      contactHint?: string | null
    }

    if (
      !body.kind ||
      !body.category?.trim() ||
      !body.title?.trim() ||
      !body.summary?.trim() ||
      !body.details?.trim() ||
      !body.city?.trim()
    ) {
      return NextResponse.json(
        { error: "Les champs principaux de l'annonce sont requis." },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data: insertedPost, error: insertError } = await supabase
      .from("help_posts")
      .insert({
        user_id: membership.userId,
        kind: body.kind,
        category: body.category.trim(),
        priority: body.priority === "urgent" ? "urgent" : "normal",
        title: body.title.trim(),
        summary: body.summary.trim(),
        details: body.details.trim(),
        city: body.city.trim(),
        availability_text: body.availabilityText?.trim() || null,
        contact_hint: body.contactHint?.trim() || null,
        author_label: membership.organizationName || "Administration",
        status: "open",
        workflow_state: "searching",
      })
      .select("id, title, city")
      .single()

    if (insertError) {
      throw insertError
    }

    const { error: auditError } = await supabase.from("admin_audit_logs").insert({
      actor_user_id: membership.userId,
      target_user_id: membership.userId,
      action: "help_post_created",
      previous_role: membership.role,
      next_role: membership.role,
      organization_name: membership.organizationName,
      territory_label: membership.territoryLabel,
      metadata: {
        postId: insertedPost.id,
        title: insertedPost.title,
        city: insertedPost.city,
      },
    })

    if (auditError) {
      throw auditError
    }

    return NextResponse.json({ success: true, id: insertedPost.id })
  } catch {
    return NextResponse.json(
      {
        error: "Impossible de créer cette annonce d'entraide.",
      },
      { status: 500 }
    )
  }
}
