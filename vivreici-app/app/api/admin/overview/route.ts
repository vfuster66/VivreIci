import { NextResponse } from "next/server"
import {
  canAccessAnalytics,
  canAccessModeration,
  canAccessUserInsights,
  getAdminMembershipForRequest,
} from "@/lib/admin-access"
import type { AdminOverviewData } from "@/lib/admin-types"
import { getDisplayReportReference, REPORT_SELECT_WITH_ARCHIVE } from "@/lib/reports"
import { createAdminClient } from "@/lib/supabase-admin"

export async function GET(request: Request) {
  try {
    const membership = await getAdminMembershipForRequest(request)

    if (!membership) {
      return NextResponse.json(
        { error: "Accès administration refusé." },
        { status: 403 }
      )
    }

    const supabase = createAdminClient()

    let reportsQuery = supabase
      .from("reports")
      .select(REPORT_SELECT_WITH_ARCHIVE)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(250)

    if (membership.role === "mairie" && membership.territoryLabel) {
      reportsQuery = reportsQuery.ilike(
        "description",
        `%${membership.territoryLabel}%`
      )
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
      supabase
        .from("reports")
        .select("id", { head: true, count: "exact" })
        .is("deleted_at", null),
      supabase
        .from("reports")
        .select("id", { head: true, count: "exact" })
        .is("deleted_at", null)
        .eq("status", "open"),
      supabase
        .from("reports")
        .select("id", { head: true, count: "exact" })
        .is("deleted_at", null)
        .eq("status", "in_progress"),
      supabase
        .from("reports")
        .select("id", { head: true, count: "exact" })
        .is("deleted_at", null)
        .eq("status", "resolved"),
      supabase
        .from("reports")
        .select("id", { head: true, count: "exact" })
        .is("deleted_at", null)
        .eq("status", "archived"),
      canAccessModeration(membership.role)
        ? supabase
            .from("report_abuse_flags")
            .select("id", { head: true, count: "exact" })
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

    const scopedReports = recentReports ?? []
    let topEvents: AdminOverviewData["topEvents"] = []
    let totalUsers: number | null = null
    let recentUsers7d: number | null = null
    let recentUsers: AdminOverviewData["recentUsers"] = []
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
        .map(([eventName, count: eventCount]) => ({
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

      const reportMap = new Map(
        (abuseReports ?? []).map((report) => [report.id, report])
      )

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

    const response: AdminOverviewData = {
      membership,
      stats: {
        totalReports:
          membership.role === "mairie" ? scopedReports.length : (totalReports ?? 0),
        openReports:
          membership.role === "mairie"
            ? scopedReports.filter((report) => report.status === "open").length
            : (openReports ?? 0),
        inProgressReports:
          membership.role === "mairie"
            ? scopedReports.filter((report) => report.status === "in_progress").length
            : (inProgressReports ?? 0),
        resolvedReports:
          membership.role === "mairie"
            ? scopedReports.filter((report) => report.status === "resolved").length
            : (resolvedReports ?? 0),
        archivedReports:
          membership.role === "mairie"
            ? scopedReports.filter((report) => report.status === "archived").length
            : (archivedReports ?? 0),
        flaggedReports: flaggedReports ?? 0,
        totalUsers,
        recentUsers7d,
        analyticsEvents7d,
      },
      reportsByType,
      topEvents,
      recentAbuseFlags,
      recentUsers,
    }

    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de charger la vue d'ensemble admin.",
      },
      { status: 500 }
    )
  }
}
