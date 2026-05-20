import "server-only"

import type { AdminMembership, AdminReportsData } from "@/lib/admin-types"
import {
  getDisplayReportReference,
  getPrimaryReportText,
  isReportVisibleOnMap,
  parseStoredReportMetadata,
  REPORT_SELECT_WITH_ARCHIVE,
} from "@/lib/reports"
import { createAdminClient } from "@/lib/supabase-admin"
import { normalizeTerritoryLabel } from "@/lib/territory"

export const REPORT_ROWS_PAGE_SIZE = 50

type ReportFilterableQuery<T> = {
  eq: (column: string, value: string) => T
  or: (filters: string) => T
}

export function applyReportListFilters<T extends ReportFilterableQuery<T>>(
  query: T,
  filters: { status: string; search: string }
) {
  let nextQuery = query

  if (filters.status !== "all") {
    nextQuery = nextQuery.eq("status", filters.status)
  }

  if (filters.search) {
    const escapedSearch = filters.search.replaceAll(",", "\\,")
    nextQuery = nextQuery.or(
      `type.ilike.%${escapedSearch}%,address_text.ilike.%${escapedSearch}%,description.ilike.%${escapedSearch}%`
    )
  }

  return nextQuery
}

export async function buildAdminReportsData(
  membership: AdminMembership,
  options?: {
    page?: number
    status?: string
    search?: string
  }
): Promise<AdminReportsData> {
  const supabase = createAdminClient()
  const territoryKey = normalizeTerritoryLabel(membership.territoryLabel)
  const page = Math.max(1, options?.page ?? 1)
  const status = options?.status || "all"
  const search = options?.search?.trim() || ""
  const rangeFrom = (page - 1) * REPORT_ROWS_PAGE_SIZE
  const rangeTo = rangeFrom + REPORT_ROWS_PAGE_SIZE - 1

  if (membership.role === "mairie" && !territoryKey) {
    return {
      membership,
      stats: {
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
        archived: 0,
        flagged: 0,
        visibleOnMap: 0,
      },
      meta: {
        totalMatchingReports: 0,
        returnedReports: 0,
        hasMore: false,
        currentPage: 1,
        pageSize: REPORT_ROWS_PAGE_SIZE,
        totalPages: 0,
      },
      reports: [],
    }
  }

  let reportsQuery = supabase
    .from("reports")
    .select(REPORT_SELECT_WITH_ARCHIVE)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(rangeFrom, rangeTo)

  if (membership.role === "mairie" && territoryKey) {
    reportsQuery = reportsQuery.eq("territory_key", territoryKey)
  }

  reportsQuery = applyReportListFilters(reportsQuery, { status, search })

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

  const duplicateCountByKey = (reports ?? []).reduce<Record<string, number>>(
    (accumulator, report) => {
      const metadata = parseStoredReportMetadata(report.description)
      const address = (report.address_text ?? metadata.address ?? "").trim().toLowerCase()
      const locationKey =
        address.length > 0 ? address : `${report.lat.toFixed(4)},${report.lng.toFixed(4)}`
      const key = `${report.type.trim().toLowerCase()}::${locationKey}`
      accumulator[key] = (accumulator[key] ?? 0) + 1
      return accumulator
    },
    {}
  )

  const rows = (reports ?? []).map((report) => {
    const metadata = parseStoredReportMetadata(report.description)
    const address = report.address_text ?? metadata.address
    const locationKey =
      address?.trim().toLowerCase().length
        ? address.trim().toLowerCase()
        : `${report.lat.toFixed(4)},${report.lng.toFixed(4)}`
    const duplicateKey = `${report.type.trim().toLowerCase()}::${locationKey}`
    const normalizedReasons = Array.isArray(report.confidence_reasons)
      ? report.confidence_reasons.filter((item): item is string => typeof item === "string")
      : []

    return {
      id: report.id,
      reference: getDisplayReportReference(report),
      type: report.type,
      status: report.status,
      createdAt: report.created_at ?? null,
      updatedAt: report.updated_at ?? null,
      lat: report.lat,
      lng: report.lng,
      address,
      description: getPrimaryReportText(report.description),
      abuseCount: abuseCountByReportId[report.id] ?? 0,
      visibleOnMap: isReportVisibleOnMap(report),
      confidenceScore:
        typeof report.confidence_score === "number" ? report.confidence_score : null,
      confidenceLevel:
        report.confidence_level === "low" ||
        report.confidence_level === "medium" ||
        report.confidence_level === "high"
          ? report.confidence_level
          : null,
      confidenceReasons: normalizedReasons,
      duplicateCount: duplicateCountByKey[duplicateKey] ?? 1,
    }
  })

  let totalMatchingReportsQuery = supabase
    .from("reports")
    .select("id", { head: true, count: "exact" })
    .is("deleted_at", null)

  if (membership.role === "mairie" && territoryKey) {
    totalMatchingReportsQuery = totalMatchingReportsQuery.eq("territory_key", territoryKey)
  }

  totalMatchingReportsQuery = applyReportListFilters(totalMatchingReportsQuery, {
    status,
    search,
  })

  const totalMatchingReports = await totalMatchingReportsQuery

  if (totalMatchingReports.error) {
    throw totalMatchingReports.error
  }

  const totalMatchingCount = totalMatchingReports.count ?? rows.length
  const totalPages =
    totalMatchingCount > 0 ? Math.ceil(totalMatchingCount / REPORT_ROWS_PAGE_SIZE) : 0

  return {
    membership,
    stats: {
      total: totalMatchingReports.count ?? rows.length,
      open: rows.filter((report) => report.status === "open").length,
      inProgress: rows.filter((report) => report.status === "in_progress").length,
      resolved: rows.filter((report) => report.status === "resolved").length,
      archived: rows.filter((report) => report.status === "archived").length,
      flagged: rows.filter((report) => report.abuseCount > 0).length,
      visibleOnMap: rows.filter((report) => report.visibleOnMap).length,
    },
    meta: {
      totalMatchingReports: totalMatchingCount,
      returnedReports: rows.length,
      hasMore: page < totalPages,
      currentPage: page,
      pageSize: REPORT_ROWS_PAGE_SIZE,
      totalPages,
    },
    reports: rows,
  }
}
