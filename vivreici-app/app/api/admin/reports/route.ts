import { NextResponse } from "next/server"
import { getAdminMembershipForRequest } from "@/lib/admin-access"
import type { AdminReportsData } from "@/lib/admin-types"
import {
  getDisplayReportReference,
  getPrimaryReportText,
  isReportVisibleOnMap,
  parseStoredReportMetadata,
  REPORT_SELECT_WITH_ARCHIVE,
} from "@/lib/reports"
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

    const { data: reports, error: reportsError } = await reportsQuery

    if (reportsError) {
      throw reportsError
    }

    const reportIds = (reports ?? []).map((report) => report.id)
    const { data: abuseFlags, error: abuseFlagsError } = reportIds.length
      ? await supabase
          .from("report_abuse_flags")
          .select("report_id")
          .in("report_id", reportIds)
      : { data: [], error: null }

    if (abuseFlagsError) {
      throw abuseFlagsError
    }

    const abuseCountByReportId = (abuseFlags ?? []).reduce<Record<string, number>>(
      (accumulator, flag) => {
        accumulator[flag.report_id] = (accumulator[flag.report_id] ?? 0) + 1
        return accumulator
      },
      {}
    )

    const rows = (reports ?? []).map((report) => {
      const metadata = parseStoredReportMetadata(report.description)

      return {
        id: report.id,
        reference: getDisplayReportReference(report),
        type: report.type,
        status: report.status,
        createdAt: report.created_at ?? null,
        updatedAt: report.updated_at ?? null,
        lat: report.lat,
        lng: report.lng,
        address: metadata.address,
        description: getPrimaryReportText(report.description),
        abuseCount: abuseCountByReportId[report.id] ?? 0,
        visibleOnMap: isReportVisibleOnMap(report),
      }
    })

    const response: AdminReportsData = {
      membership,
      stats: {
        total: rows.length,
        open: rows.filter((report) => report.status === "open").length,
        inProgress: rows.filter((report) => report.status === "in_progress").length,
        resolved: rows.filter((report) => report.status === "resolved").length,
        archived: rows.filter((report) => report.status === "archived").length,
        flagged: rows.filter((report) => report.abuseCount > 0).length,
        visibleOnMap: rows.filter((report) => report.visibleOnMap).length,
      },
      reports: rows,
    }

    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de charger les signalements admin.",
      },
      { status: 500 }
    )
  }
}
