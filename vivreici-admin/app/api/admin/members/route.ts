import { NextResponse } from "next/server"
import { getAdminMembershipForRequest } from "@/lib/admin-access"
import type { AdminAuditLogRecord, AdminRole } from "@/lib/admin-types"
import { buildAdminMembersData } from "@/lib/admin-members"
import { createAdminClient } from "@/lib/supabase-admin"
import { buildTerritoryInfo } from "@/lib/territory"

function isAdminRole(value: string): value is AdminRole {
  return value === "superadmin" || value === "admin" || value === "mairie"
}

function getAuditAction(
  previousRole: AdminRole | null,
  nextRole: AdminRole | null
): AdminAuditLogRecord["action"] {
  if (!previousRole && nextRole) {
    return "admin_role_granted"
  }

  if (previousRole && !nextRole) {
    return "admin_role_revoked"
  }

  return "admin_role_updated"
}

export async function GET(request: Request) {
  try {
    const membership = await getAdminMembershipForRequest(request)

    if (!membership || membership.role !== "superadmin") {
      return NextResponse.json(
        { error: "Accès superadmin requis." },
        { status: 403 }
      )
    }

    return NextResponse.json(await buildAdminMembersData(membership))
  } catch {
    return NextResponse.json(
      {
        error: "Impossible de charger les accès admin.",
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
      userId?: string
      role?: string | null
      organizationName?: string | null
      territoryLabel?: string | null
    }

    if (!body.userId) {
      return NextResponse.json({ error: "Utilisateur manquant." }, { status: 400 })
    }

    const supabase = createAdminClient()

    if (!body.role) {
      const { data: existingMembership, error: existingMembershipError } = await supabase
        .from("app_admins")
        .select("role, organization_name, territory_label")
        .eq("user_id", body.userId)
        .maybeSingle()

      if (existingMembershipError) {
        throw existingMembershipError
      }

      if (existingMembership?.role === "superadmin") {
        const { count, error: countError } = await supabase
          .from("app_admins")
          .select("user_id", { head: true, count: "exact" })
          .eq("role", "superadmin")

        if (countError) {
          throw countError
        }

        if ((count ?? 0) <= 1) {
          return NextResponse.json(
            { error: "Impossible de retirer le dernier superadmin." },
            { status: 400 }
          )
        }
      }

      const { error } = await supabase
        .from("app_admins")
        .delete()
        .eq("user_id", body.userId)

      if (error) {
        throw error
      }

      const existingRole = existingMembership?.role ?? null
      const previousRole = isAdminRole(existingRole) ? existingRole : null

      const { error: auditError } = await supabase.from("admin_audit_logs").insert({
        actor_user_id: membership.userId,
        target_user_id: body.userId,
        action: getAuditAction(previousRole, null),
        previous_role: previousRole,
        next_role: null,
        organization_name: existingMembership?.organization_name ?? null,
        territory_label: existingMembership?.territory_label ?? null,
      })

      if (auditError) {
        throw auditError
      }

      return NextResponse.json({ ok: true })
    }

    if (!isAdminRole(body.role)) {
      return NextResponse.json({ error: "Rôle invalide." }, { status: 400 })
    }

    const { data: existingMembership, error: existingMembershipError } = await supabase
      .from("app_admins")
      .select("role, organization_name, territory_label")
      .eq("user_id", body.userId)
      .maybeSingle()

    if (existingMembershipError) {
      throw existingMembershipError
    }

    if (existingMembership?.role === "superadmin" && body.role !== "superadmin") {
      const { count, error: countError } = await supabase
        .from("app_admins")
        .select("user_id", { head: true, count: "exact" })
        .eq("role", "superadmin")

      if (countError) {
        throw countError
      }

      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: "Impossible de rétrograder le dernier superadmin." },
          { status: 400 }
        )
      }
    }

    const territory = buildTerritoryInfo(body.territoryLabel)
    const { error } = await supabase.from("app_admins").upsert({
      user_id: body.userId,
      role: body.role,
      organization_name: body.organizationName?.trim() || null,
      territory_label:
        territory.territoryName ?? (body.territoryLabel?.trim() || null),
    })

    if (error) {
      throw error
    }

    const existingRole = existingMembership?.role ?? null
    const previousRole = isAdminRole(existingRole) ? existingRole : null
    const nextRole = body.role
    const nextOrganizationName = body.organizationName?.trim() || null
    const nextTerritoryLabel =
      territory.territoryName ?? (body.territoryLabel?.trim() || null)

    const { error: auditError } = await supabase.from("admin_audit_logs").insert({
      actor_user_id: membership.userId,
      target_user_id: body.userId,
      action: getAuditAction(previousRole, nextRole),
      previous_role: previousRole,
      next_role: nextRole,
      organization_name: nextOrganizationName,
      territory_label: nextTerritoryLabel,
      metadata: {
        previousOrganizationName: existingMembership?.organization_name ?? null,
        previousTerritoryLabel: existingMembership?.territory_label ?? null,
      },
    })

    if (auditError) {
      throw auditError
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      {
        error: "Impossible de mettre à jour le rôle admin.",
      },
      { status: 500 }
    )
  }
}
