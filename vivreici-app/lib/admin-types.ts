export type AdminRole = "superadmin" | "admin" | "mairie"

export type AdminMembership = {
  userId: string
  role: AdminRole
  organizationName: string | null
  territoryLabel: string | null
}

export type AdminOverviewData = {
  membership: AdminMembership
  stats: {
    totalReports: number
    openReports: number
    inProgressReports: number
    resolvedReports: number
    archivedReports: number
    flaggedReports: number
    totalUsers: number | null
    recentUsers7d: number | null
    analyticsEvents7d: number | null
  }
  reportsByType: Array<{
    type: string
    count: number
  }>
  topEvents: Array<{
    eventName: string
    count: number
  }>
  recentAbuseFlags: Array<{
    id: string
    reason: string
    createdAt: string
    reportId: string
    reportReference: string
    reportType: string
    reportStatus: string | null
  }>
  recentUsers: Array<{
    id: string
    email: string | null
    createdAt: string | null
    lastSignInAt: string | null
  }>
}

export type AdminReportRow = {
  id: string
  reference: string
  type: string
  status: string | null
  createdAt: string | null
  updatedAt: string | null
  lat: number
  lng: number
  address: string | null
  description: string
  abuseCount: number
  visibleOnMap: boolean
}

export type AdminReportsData = {
  membership: AdminMembership
  stats: {
    total: number
    open: number
    inProgress: number
    resolved: number
    archived: number
    flagged: number
    visibleOnMap: number
  }
  reports: AdminReportRow[]
}

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  mairie: "Mairie",
}
