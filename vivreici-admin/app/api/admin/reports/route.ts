import { NextResponse } from "next/server"
import { getAdminMembershipForRequest } from "@/lib/admin-access"
import { buildAdminReportsData } from "@/lib/admin-reports"
import { createAdminClient } from "@/lib/supabase-admin"
import { buildTerritoryInfo } from "@/lib/territory"

export async function GET(request: Request) {
  try {
    const membership = await getAdminMembershipForRequest(request)

    if (!membership) {
      return NextResponse.json(
        { error: "Accès administration refusé." },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number(searchParams.get("page") || "1") || 1)
    const status = searchParams.get("status") || "all"
    const search = searchParams.get("q")?.trim() || ""
    return NextResponse.json(
      await buildAdminReportsData(membership, { page, status, search })
    )
  } catch {
    return NextResponse.json(
      {
        error: "Impossible de charger les signalements admin.",
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
      type?: string
      description?: string
      address?: string
      lat?: number
      lng?: number
      status?: string
    }

    if (!body.type?.trim() || !body.description?.trim() || !body.address?.trim()) {
      return NextResponse.json(
        { error: "Type, description et adresse sont requis." },
        { status: 400 }
      )
    }

    if (typeof body.lat !== "number" || typeof body.lng !== "number") {
      return NextResponse.json(
        { error: "Latitude et longitude sont requises." },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const territory = buildTerritoryInfo(body.address)

    const { data: insertedReport, error: insertError } = await supabase
      .from("reports")
      .insert({
        user_id: membership.userId,
        type: body.type.trim(),
        description: body.description.trim(),
        address_text: territory.addressText,
        territory_name: territory.territoryName,
        territory_key: territory.territoryKey,
        lat: body.lat,
        lng: body.lng,
        status: body.status === "in_progress" || body.status === "resolved" || body.status === "archived"
          ? body.status
          : "open",
      })
      .select("id, type, address_text")
      .single()

    if (insertError) {
      throw insertError
    }

    const { error: auditError } = await supabase.from("admin_audit_logs").insert({
      actor_user_id: membership.userId,
      target_user_id: membership.userId,
      action: "report_created",
      previous_role: membership.role,
      next_role: membership.role,
      organization_name: membership.organizationName,
      territory_label: membership.territoryLabel,
      metadata: {
        reportId: insertedReport.id,
        title: insertedReport.type,
        address: insertedReport.address_text,
      },
    })

    if (auditError) {
      throw auditError
    }

    return NextResponse.json({ success: true, id: insertedReport.id })
  } catch {
    return NextResponse.json(
      {
        error: "Impossible de créer ce signalement.",
      },
      { status: 500 }
    )
  }
}
