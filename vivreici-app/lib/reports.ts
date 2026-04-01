import { REPORT_TYPES } from "./report-form"

export type ReportStatus = "open" | "in_progress" | "resolved" | "archived"
export type ReportStatusFilter = "active" | "resolved" | "archived" | "all"

export type ReportRecord = {
  id: string
  user_id?: string | null
  creator_name?: string | null
  creator_avatar_url?: string | null
  report_number?: number | null
  report_type_number?: number | null
  lat: number
  lng: number
  type: string
  status: string | null
  description: string | null
  photo_url: string | null
  created_at: string | null
  updated_at?: string | null
  archived_at?: string | null
  expires_at?: string | null
  deleted_at?: string | null
}

export type ReportHistoryRecord = {
  id: string
  action: "update" | "delete"
  created_at: string
  snapshot: Partial<ReportRecord>
}

export type ReportTimelineEvent = {
  id: string
  type: "created" | "status_changed" | "archived" | "updated" | "deleted"
  title: string
  description: string
  status: ReportStatus | null
  created_at: string
}

export const REPORT_SELECT_WITH_ARCHIVE =
  "id, user_id, report_number, report_type_number, lat, lng, type, status, description, photo_url, created_at, updated_at, archived_at, expires_at, deleted_at"

export const REPORT_SELECT_WITH_HISTORY =
  "id, user_id, report_number, report_type_number, lat, lng, type, status, description, photo_url, created_at, updated_at, expires_at, deleted_at"

export const REPORT_SELECT_LEGACY =
  "id, user_id, report_number, report_type_number, lat, lng, type, status, description, photo_url, created_at"

export const REPORT_STATUS_FILTERS = [
  { value: "active", label: "Actifs" },
  { value: "resolved", label: "Résolus" },
  { value: "archived", label: "Archivés" },
  { value: "all", label: "Tous" },
] as const satisfies ReadonlyArray<{
  value: ReportStatusFilter
  label: string
}>

export const MAP_REPORT_STATUS_FILTERS = [
  { value: "active", label: "Actifs" },
  { value: "open", label: "Ouverts" },
  { value: "in_progress", label: "En cours" },
  { value: "resolved", label: "Résolus" },
] as const

export const REPORT_TYPE_FILTERS = [
  { value: "all", label: "Tous les types" },
  ...REPORT_TYPES.map((type) => ({ value: type, label: type })),
] as const

export const ACTIVE_REPORT_STATUSES = [
  "open",
  "in_progress",
] as const satisfies ReadonlyArray<ReportStatus>

export const RESOLVED_VISIBILITY_DAYS = 14
export const ARCHIVED_RETENTION_DAYS = 30

const REPORT_TYPE_CODES: Record<string, string> = {
  Voirie: "VOI",
  "Déchets": "DEC",
  "Éclairage": "ECL",
  "Mobilier urbain": "MOB",
  "Sécurité": "SEC",
  Autre: "AUT",
}

export function getReportStatusLabel(status: string | null) {
  switch (status) {
    case "open":
      return "Ouvert"
    case "in_progress":
      return "En cours"
    case "resolved":
      return "Résolu"
    case "archived":
      return "Archivé"
    default:
      return "Inconnu"
  }
}

export function getReportStatusClasses(status: string | null) {
  switch (status) {
    case "open":
      return "bg-[#FFF7D6] text-[#D6A100]"
    case "in_progress":
      return "bg-[#FFF7E8] text-[#B86700]"
    case "resolved":
      return "bg-[#ECFDF3] text-[#027A48]"
    case "archived":
      return "bg-[#F3F4F6] text-[#4B5563]"
    default:
      return "bg-gray-100 text-gray-600"
  }
}

export function getAllowedReportStatusTransitions(
  currentStatus: ReportStatus | string | null
) {
  switch (currentStatus) {
    case "open":
      return ["in_progress", "resolved"] as ReportStatus[]
    case "in_progress":
      return ["open", "resolved"] as ReportStatus[]
    case "resolved":
      return ["archived"] as ReportStatus[]
    case "archived":
      return [] as ReportStatus[]
    default:
      return ["open", "in_progress", "resolved"] as ReportStatus[]
  }
}

export function canTransitionReportStatus(
  currentStatus: ReportStatus | string | null,
  nextStatus: ReportStatus
) {
  if (currentStatus === nextStatus) {
    return true
  }

  return getAllowedReportStatusTransitions(currentStatus).includes(nextStatus)
}

export function isReportArchived(report: Pick<ReportRecord, "status" | "archived_at">) {
  return report.status === "archived" || Boolean(report.archived_at)
}

export function isReportLocked(report: Pick<ReportRecord, "status" | "archived_at">) {
  return isReportArchived(report)
}

export function isReportVisibleOnMap(
  report: ReportRecord,
  resolvedWindowDays = RESOLVED_VISIBILITY_DAYS
) {
  if (isReportArchived(report)) {
    return false
  }

  if (report.status === "resolved") {
    const referenceDate = report.updated_at ?? report.created_at

    if (!referenceDate) {
      return false
    }

    const resolvedAt = new Date(referenceDate)

    if (Number.isNaN(resolvedAt.getTime())) {
      return false
    }

    const maxAge = resolvedWindowDays * 24 * 60 * 60 * 1000
    return Date.now() - resolvedAt.getTime() <= maxAge
  }

  return report.status === "open" || report.status === "in_progress"
}

export function formatReportDate(dateString: string | null) {
  if (!dateString) {
    return "Date inconnue"
  }

  const date = new Date(dateString)

  if (Number.isNaN(date.getTime())) {
    return "Date inconnue"
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export function getReportTimelineAccent(status: ReportStatus | null) {
  switch (status) {
    case "open":
      return "bg-[#E30613]"
    case "in_progress":
      return "bg-[#F59E0B]"
    case "resolved":
      return "bg-[#16A34A]"
    case "archived":
      return "bg-[#9CA3AF]"
    default:
      return "bg-[#D6A100]"
  }
}

export function getReportTypeCode(type: string) {
  return REPORT_TYPE_CODES[type] ?? "SIG"
}

export function getReportReference(report: Pick<ReportRecord, "id" | "type">) {
  return `${getReportTypeCode(report.type)}-${report.id.slice(0, 6).toUpperCase()}`
}

export function getDisplayReportReference(
  report: Pick<ReportRecord, "id" | "type" | "report_number" | "report_type_number">
) {
  if (
    typeof report.report_type_number === "number" &&
    Number.isFinite(report.report_type_number)
  ) {
    return `${getReportTypeCode(report.type)}-${String(report.report_type_number).padStart(5, "0")}`
  }

  if (typeof report.report_number === "number" && Number.isFinite(report.report_number)) {
    return `${getReportTypeCode(report.type)}-${String(report.report_number).padStart(5, "0")}`
  }

  return getReportReference(report)
}

export function getPrimaryReportText(description: string | null) {
  return parseStoredReportMetadata(description).primaryText
}

export function getReportSearchText(report: ReportRecord) {
  const metadata = parseStoredReportMetadata(report.description)

  return [
    report.type,
    getDisplayReportReference(report),
    getReportStatusLabel(report.status),
    report.creator_name ?? "",
    metadata.primaryText,
    metadata.address ?? "",
  ]
    .join(" ")
    .toLowerCase()
}

export function parseStoredReportMetadata(description: string | null) {
  if (!description) {
    return {
      primaryText: "Aucune description fournie.",
      address: null,
      mediaUrls: [] as string[],
    }
  }

  let address: string | null = null
  let mediaUrls: string[] = []
  let primaryText: string | null = null

  description
    .split("\n")
    .map((line) => line.trim())
    .forEach((line) => {
      if (line.startsWith("Adresse indiquée :")) {
        address = line.replace("Adresse indiquée :", "").trim() || null
        return
      }

      if (line.startsWith("Médias joints :")) {
        mediaUrls = line
          .replace("Médias joints :", "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
        return
      }

      if (!primaryText && line.length > 0) {
        primaryText = line
      }
    })

  return {
    primaryText: primaryText || "Aucune description fournie.",
    address,
    mediaUrls,
  }
}

export function filterReports(
  reports: ReportRecord[],
  {
    query,
    typeFilter,
    statusFilter,
  }: {
    query: string
    typeFilter: string
    statusFilter: ReportStatusFilter | string
  }
) {
  const normalizedQuery = query.trim().toLowerCase()

  return reports.filter((report) => {
    const matchesType = typeFilter === "all" || report.type === typeFilter
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
          ? report.status === "open" || report.status === "in_progress"
          : report.status === statusFilter
    const haystack = getReportSearchText(report)
    const matchesQuery =
      normalizedQuery.length === 0 || haystack.includes(normalizedQuery)

    return matchesType && matchesStatus && matchesQuery
  })
}

function buildTimelineDescription(previousStatus: string | null, nextStatus: string | null) {
  if (!previousStatus && nextStatus) {
    return `Statut initial : ${getReportStatusLabel(nextStatus)}`
  }

  if (previousStatus && nextStatus) {
    return `${getReportStatusLabel(previousStatus)} -> ${getReportStatusLabel(nextStatus)}`
  }

  return "Mise à jour du signalement"
}

export function buildReportTimeline(
  report: ReportRecord,
  history: ReportHistoryRecord[]
) {
  const timeline: ReportTimelineEvent[] = [
    {
      id: `created-${report.id}`,
      type: "created",
      title: "Signalement créé",
      description: "Le signalement a été publié dans l'application.",
      status: "open",
      created_at: report.created_at ?? new Date().toISOString(),
    },
  ]

  const orderedHistory = [...history].sort(
    (first, second) =>
      new Date(first.created_at).getTime() - new Date(second.created_at).getTime()
  )

  orderedHistory.forEach((entry, index) => {
    const currentSnapshot = entry.snapshot
    const nextSnapshot = orderedHistory[index + 1]?.snapshot ?? report
    const previousStatus = (currentSnapshot.status as ReportStatus | null | undefined) ?? null
    const nextStatus = (nextSnapshot.status as ReportStatus | null | undefined) ?? null

    if (entry.action === "delete") {
      timeline.push({
        id: entry.id,
        type: "deleted",
        title: "Signalement supprimé",
        description: "Le signalement a été retiré des vues actives.",
        status: null,
        created_at: entry.created_at,
      })
      return
    }

    if (previousStatus !== nextStatus) {
      const isArchived =
        nextStatus === "archived" ||
        (nextSnapshot.archived_at ?? null) !== (currentSnapshot.archived_at ?? null)

      timeline.push({
        id: entry.id,
        type: isArchived ? "archived" : "status_changed",
        title: isArchived
          ? "Signalement archivé"
          : `Statut passé à “${getReportStatusLabel(nextStatus)}”`,
        description: buildTimelineDescription(previousStatus, nextStatus),
        status: nextStatus,
        created_at: entry.created_at,
      })
      return
    }

    timeline.push({
      id: entry.id,
      type: "updated",
      title: "Signalement mis à jour",
      description: "Les informations du signalement ont été modifiées.",
      status: nextStatus,
      created_at: entry.created_at,
    })
  })

  return timeline.sort(
    (first, second) =>
      new Date(second.created_at).getTime() - new Date(first.created_at).getTime()
  )
}
