import "server-only"

import type {
  AdminAuditLogRecord,
  AdminMemberRecord,
  AdminMembership,
  AdminRole,
} from "@/lib/admin-types"
import { listAllAuthUsers } from "@/lib/admin-user-directory"
import { createAdminClient } from "@/lib/supabase-admin"
import { normalizeTerritoryLabel } from "@/lib/territory"

export type AdminMembersResponse = {
  membership: AdminMembership
  members: AdminMemberRecord[]
  logs: AdminAuditLogRecord[]
}

function isAdminRole(value: string): value is AdminRole {
  return value === "superadmin" || value === "admin" || value === "mairie"
}

export async function buildAdminMembersData(
  membership: AdminMembership
): Promise<AdminMembersResponse> {
  if (membership.role !== "superadmin") {
    throw new Error("Accès superadmin requis.")
  }

  const supabase = createAdminClient()
  const [users, { data: adminRows, error: adminError }] = await Promise.all([
    listAllAuthUsers(),
    supabase
      .from("app_admins")
      .select("user_id, role, organization_name, territory_label"),
  ])

  if (adminError) {
    throw adminError
  }

  const userIds = users.map((user) => user.id)
  const adminUserIds = (adminRows ?? []).map((row) => row.user_id)
  const { data: profileRows, error: profileError } = adminUserIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name, email, created_at")
        .in("id", adminUserIds)
    : { data: [], error: null }

  if (profileError) {
    throw profileError
  }

  const [{ data: reportsRows, error: reportsError }, { data: analyticsRows, error: analyticsError }] =
    await Promise.all([
      userIds.length
        ? await supabase
            .from("reports")
            .select("user_id, created_at")
            .in("user_id", userIds)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
        : { data: [], error: null },
      userIds.length
        ? await supabase
            .from("analytics_events")
            .select("user_id, created_at")
            .in("user_id", userIds)
            .gte(
              "created_at",
              new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
            )
            .order("created_at", { ascending: false })
        : { data: [], error: null },
    ])

  if (reportsError || analyticsError) {
    throw reportsError ?? analyticsError
  }

  const profileByUserId = new Map((profileRows ?? []).map((profile) => [profile.id, profile]))
  const adminByUserId = new Map((adminRows ?? []).map((row) => [row.user_id, row]))
  const reportsByUserId = new Map<string, { count: number; lastReportAt: string | null }>()
  const analyticsCountByUserId = new Map<string, number>()

  for (const report of reportsRows ?? []) {
    if (!report.user_id) {
      continue
    }

    const currentStats = reportsByUserId.get(report.user_id)
    reportsByUserId.set(report.user_id, {
      count: (currentStats?.count ?? 0) + 1,
      lastReportAt: currentStats?.lastReportAt ?? report.created_at ?? null,
    })
  }

  for (const event of analyticsRows ?? []) {
    if (!event.user_id) {
      continue
    }

    analyticsCountByUserId.set(
      event.user_id,
      (analyticsCountByUserId.get(event.user_id) ?? 0) + 1
    )
  }

  const members: AdminMemberRecord[] = users.map((user) => {
    const adminRow = adminByUserId.get(user.id)
    const profile = profileByUserId.get(user.id)
    const email = user.email ?? profile?.email ?? null
    const reportStats = reportsByUserId.get(user.id)

    return {
      userId: user.id,
      email,
      displayName: profile?.display_name ?? null,
      role: adminRow?.role ?? null,
      organizationName: adminRow?.organization_name ?? null,
      territoryLabel: adminRow?.territory_label ?? null,
      territoryKey: normalizeTerritoryLabel(adminRow?.territory_label),
      profileCreatedAt: profile?.created_at ?? user.created_at ?? null,
      activity: {
        reportsCount: reportStats?.count ?? 0,
        lastReportAt: reportStats?.lastReportAt ?? null,
        analyticsEvents30d: analyticsCountByUserId.get(user.id) ?? 0,
      },
    }
  })

  const { data: auditRows, error: auditError } = await supabase
    .from("admin_audit_logs")
    .select(
      "id, actor_user_id, target_user_id, action, previous_role, next_role, organization_name, territory_label, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(20)

  if (auditError) {
    throw auditError
  }

  const auditUserIds = [
    ...new Set((auditRows ?? []).flatMap((row) => [row.actor_user_id, row.target_user_id])),
  ]

  const { data: auditProfiles, error: auditProfilesError } = auditUserIds.length
    ? await supabase.from("profiles").select("id, display_name, email").in("id", auditUserIds)
    : { data: [], error: null }

  if (auditProfilesError) {
    throw auditProfilesError
  }

  const auditProfileById = new Map((auditProfiles ?? []).map((profile) => [profile.id, profile]))

  const logs: AdminAuditLogRecord[] = (auditRows ?? []).map((row) => {
    const actorProfile = auditProfileById.get(row.actor_user_id)
    const targetProfile = auditProfileById.get(row.target_user_id)

    return {
      id: row.id,
      actorUserId: row.actor_user_id,
      actorLabel:
        actorProfile?.display_name || actorProfile?.email || row.actor_user_id.slice(0, 8),
      targetUserId: row.target_user_id,
      targetLabel:
        targetProfile?.display_name || targetProfile?.email || row.target_user_id.slice(0, 8),
      action: row.action,
      previousRole: isAdminRole(row.previous_role ?? "") ? row.previous_role : null,
      nextRole: isAdminRole(row.next_role ?? "") ? row.next_role : null,
      organizationName: row.organization_name ?? null,
      territoryLabel: row.territory_label ?? null,
      createdAt: row.created_at,
    }
  })

  return { membership, members, logs }
}
