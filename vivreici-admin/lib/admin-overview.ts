import "server-only"

import {
  canAccessAnalytics,
  canAccessModeration,
  canAccessUserInsights,
} from "@/lib/admin-access"
import type { AdminMembership, AdminOverviewData } from "@/lib/admin-types"
import { getDisplayReportReference, REPORT_SELECT_WITH_ARCHIVE } from "@/lib/reports"
import { createAdminClient } from "@/lib/supabase-admin"
import { normalizeTerritoryLabel } from "@/lib/territory"

const RECENT_REPORTS_LIMIT = 250

export async function buildAdminOverviewData(
  membership: AdminMembership
): Promise<AdminOverviewData> {
  const supabase = createAdminClient()
  const territoryKey = normalizeTerritoryLabel(membership.territoryLabel)

  let reportsQuery = supabase
    .from("reports")
    .select(REPORT_SELECT_WITH_ARCHIVE)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(RECENT_REPORTS_LIMIT)

  if (membership.role === "mairie" && territoryKey) {
    reportsQuery = reportsQuery.eq("territory_key", territoryKey)
  }

  const [
    { data: recentReports, error: reportsError },
    { count: totalReports, error: totalReportsError },
    { count: openReports, error: openReportsError },
    { count: inProgressReports, error: inProgressReportsError },
    { count: resolvedReports, error: resolvedReportsError },
    { count: archivedReports, error: archivedReportsError },
    { count: flaggedReports, error: flaggedReportsError },
  ] = await Promise.all([
    reportsQuery,
    (membership.role === "mairie" && territoryKey
      ? supabase
          .from("reports")
          .select("id", { head: true, count: "exact" })
          .is("deleted_at", null)
          .eq("territory_key", territoryKey)
      : supabase
          .from("reports")
          .select("id", { head: true, count: "exact" })
          .is("deleted_at", null)),
    (membership.role === "mairie" && territoryKey
      ? supabase
          .from("reports")
          .select("id", { head: true, count: "exact" })
          .is("deleted_at", null)
          .eq("territory_key", territoryKey)
          .eq("status", "open")
      : supabase
          .from("reports")
          .select("id", { head: true, count: "exact" })
          .is("deleted_at", null)
          .eq("status", "open")),
    (membership.role === "mairie" && territoryKey
      ? supabase
          .from("reports")
          .select("id", { head: true, count: "exact" })
          .is("deleted_at", null)
          .eq("territory_key", territoryKey)
          .eq("status", "in_progress")
      : supabase
          .from("reports")
          .select("id", { head: true, count: "exact" })
          .is("deleted_at", null)
          .eq("status", "in_progress")),
    (membership.role === "mairie" && territoryKey
      ? supabase
          .from("reports")
          .select("id", { head: true, count: "exact" })
          .is("deleted_at", null)
          .eq("territory_key", territoryKey)
          .eq("status", "resolved")
      : supabase
          .from("reports")
          .select("id", { head: true, count: "exact" })
          .is("deleted_at", null)
          .eq("status", "resolved")),
    (membership.role === "mairie" && territoryKey
      ? supabase
          .from("reports")
          .select("id", { head: true, count: "exact" })
          .is("deleted_at", null)
          .eq("territory_key", territoryKey)
          .eq("status", "archived")
      : supabase
          .from("reports")
          .select("id", { head: true, count: "exact" })
          .is("deleted_at", null)
          .eq("status", "archived")),
    canAccessModeration(membership.role)
      ? supabase.from("report_abuse_flags").select("id", { head: true, count: "exact" })
      : Promise.resolve({ count: 0, error: null }),
  ])

  if (
    reportsError ||
    totalReportsError ||
    openReportsError ||
    inProgressReportsError ||
    resolvedReportsError ||
    archivedReportsError ||
    flaggedReportsError
  ) {
    throw (
      reportsError ??
      totalReportsError ??
      openReportsError ??
      inProgressReportsError ??
      resolvedReportsError ??
      archivedReportsError ??
      flaggedReportsError
    )
  }

  const reportsByType = Object.entries(
    (recentReports ?? []).reduce<Record<string, number>>((accumulator, report) => {
      accumulator[report.type] = (accumulator[report.type] ?? 0) + 1
      return accumulator
    }, {})
  )
    .map(([type, count]) => ({ type, count }))
    .sort((first, second) => second.count - first.count)
    .slice(0, 6)

  let topEvents: AdminOverviewData["topEvents"] = []
  let totalUsers: number | null = null
  let recentUsers7d: number | null = null
  let recentUsers: AdminOverviewData["recentUsers"] = []
  let adminMembers: AdminOverviewData["adminMembers"] = []
  let analyticsEvents7d: number | null = null

  if (canAccessAnalytics(membership.role)) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const [{ count, error }, { data, error: dataError }] = await Promise.all([
      supabase
        .from("analytics_events")
        .select("id", { head: true, count: "exact" })
        .gte("created_at", sevenDaysAgo),
      supabase
        .from("analytics_events")
        .select("event_name")
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(600),
    ])

    if (error || dataError) {
      throw error ?? dataError
    }

    const eventsCountByName = (data ?? []).reduce<Record<string, number>>(
      (accumulator, event) => {
        accumulator[event.event_name] = (accumulator[event.event_name] ?? 0) + 1
        return accumulator
      },
      {}
    )

    topEvents = Object.entries(eventsCountByName)
      .map(([eventName, eventCount]) => ({
        eventName,
        count: eventCount,
      }))
      .sort((first, second) => second.count - first.count)
      .slice(0, 8)

    analyticsEvents7d = count ?? 0
  }

  if (canAccessUserInsights(membership.role)) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [
      { count: usersCount, error: usersError },
      { count: recentUsersCount, error: recentUsersCountError },
      { data: usersData, error: usersDataError },
    ] = await Promise.all([
      supabase.from("profiles").select("id", { head: true, count: "exact" }),
      supabase
        .from("profiles")
        .select("id", { head: true, count: "exact" })
        .gte("created_at", sevenDaysAgo),
      supabase.auth.admin.listUsers({
        page: 1,
        perPage: 6,
      }),
    ])

    if (usersError || recentUsersCountError || usersDataError) {
      throw usersError ?? recentUsersCountError ?? usersDataError
    }

    totalUsers = usersCount ?? 0
    recentUsers7d = recentUsersCount ?? 0
    recentUsers = (usersData.users ?? []).map((user) => ({
      id: user.id,
      email: user.email ?? null,
      createdAt: user.created_at ?? null,
      lastSignInAt: user.last_sign_in_at ?? null,
    }))

    const { data: adminMemberships, error: adminMembershipsError } = await supabase
      .from("app_admins")
      .select("user_id, role, organization_name, territory_label")
      .order("created_at", { ascending: true })

    if (adminMembershipsError) {
      throw adminMembershipsError
    }

    const adminUserIds = (adminMemberships ?? []).map((member) => member.user_id)
    const { data: adminProfiles, error: adminProfilesError } = adminUserIds.length
      ? await supabase
          .from("profiles")
          .select("id, display_name, email, created_at")
          .in("id", adminUserIds)
      : { data: [], error: null }

    if (adminProfilesError) {
      throw adminProfilesError
    }

    const profileById = new Map(
      (adminProfiles ?? []).map((profile) => [profile.id, profile])
    )

    adminMembers = (adminMemberships ?? []).map((member) => {
      const profile = profileById.get(member.user_id)

      return {
        userId: member.user_id,
        email: profile?.email ?? null,
        displayName: profile?.display_name ?? null,
        role: member.role,
        organizationName: member.organization_name ?? null,
        territoryLabel: member.territory_label ?? null,
        territoryKey: normalizeTerritoryLabel(member.territory_label),
        profileCreatedAt: profile?.created_at ?? null,
        activity: {
          reportsCount: 0,
          lastReportAt: null,
          analyticsEvents30d: 0,
        },
      }
    })
  }

  let recentAbuseFlags: AdminOverviewData["recentAbuseFlags"] = []

  if (canAccessModeration(membership.role)) {
    const { data: flagsData, error: flagsError } = await supabase
      .from("report_abuse_flags")
      .select("id, report_id, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(8)

    if (flagsError) {
      throw flagsError
    }

    const reportIds = [...new Set((flagsData ?? []).map((flag) => flag.report_id))]
    const { data: abuseReports, error: abuseReportsError } = reportIds.length
      ? await supabase
          .from("reports")
          .select("id, type, status, report_number, report_type_number")
          .in("id", reportIds)
      : { data: [], error: null }

    if (abuseReportsError) {
      throw abuseReportsError
    }

    const reportMap = new Map((abuseReports ?? []).map((report) => [report.id, report]))

    recentAbuseFlags = (flagsData ?? []).map((flag) => {
      const report = reportMap.get(flag.report_id)

      return {
        id: flag.id,
        reason: flag.reason,
        createdAt: flag.created_at,
        reportId: flag.report_id,
        reportReference: report
          ? getDisplayReportReference({
              id: report.id,
              type: report.type,
              report_number: report.report_number,
              report_type_number: report.report_type_number,
            })
          : flag.report_id.slice(0, 8).toUpperCase(),
        reportType: report?.type ?? "Signalement",
        reportStatus: report?.status ?? null,
      }
    })
  }

  return {
    membership,
    stats: {
      totalReports: totalReports ?? 0,
      openReports: openReports ?? 0,
      inProgressReports: inProgressReports ?? 0,
      resolvedReports: resolvedReports ?? 0,
      archivedReports: archivedReports ?? 0,
      flaggedReports: flaggedReports ?? 0,
      totalUsers,
      recentUsers7d,
      analyticsEvents7d,
    },
    reportsByType,
    topEvents,
    recentAbuseFlags,
    recentUsers,
    adminMembers,
  }
}
