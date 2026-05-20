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
  adminMembers: Array<AdminMemberRecord>
}

export type AdminUserRecord = {
  userId: string
  email: string | null
  displayName: string | null
  createdAt: string | null
  lastSignInAt: string | null
  role: AdminRole | null
  organizationName: string | null
  territoryLabel: string | null
}

export type AdminUsersData = {
  membership: AdminMembership
  stats: {
    total: number
    withAccess: number
    superadmins: number
    admins: number
    mairies: number
  }
  users: AdminUserRecord[]
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
  confidenceScore: number | null
  confidenceLevel: "low" | "medium" | "high" | null
  confidenceReasons: string[]
  duplicateCount: number
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
  meta?: {
    totalMatchingReports: number
    returnedReports: number
    hasMore: boolean
    currentPage: number
    pageSize: number
    totalPages: number
  }
  reports: AdminReportRow[]
}

export type AdminAnimalAlertRow = {
  id: string
  title: string
  city: string
  lat: number
  lng: number
  alertType: string
  sourceType: "community" | "official" | "system"
  severity: "medium" | "high"
  status: "active" | "resolved" | "expired"
  speciesScope: string
  radiusMeters: number
  isVerified: boolean
  authorLabel: string
  description: string
  observedAt: string | null
  createdAt: string
  expiresAt: string | null
  confirmCount: number
  clearCount: number
  confidenceScore: number
  confidenceLabel: "low" | "medium" | "high"
  confidenceReasons: string[]
  confidenceVersion: string | null
  moderationLogs: Array<{
    id: string
    action:
      | "animal_alert_verified"
      | "animal_alert_unverified"
      | "animal_alert_source_updated"
      | "animal_alert_status_updated"
    previousValue: string | null
    nextValue: string | null
    actorUserId: string
    createdAt: string
  }>
}

export type AdminAnimalAlertsData = {
  membership: AdminMembership
  stats: {
    total: number
    active: number
    verified: number
    highSeverity: number
    community: number
  }
  alerts: AdminAnimalAlertRow[]
}

export type AdminHelpPostRow = {
  id: string
  kind: "request" | "offer"
  category: string
  priority: "normal" | "urgent"
  title: string
  summary: string
  city: string
  authorLabel: string | null
  status: "open" | "closed"
  workflowState: "searching" | "found" | "closed"
  responseCount: number
  createdAt: string
  confidenceScore: number | null
  confidenceLevel: "low" | "medium" | "high" | null
  confidenceReasons: string[]
}

export type AdminHelpPostsData = {
  membership: AdminMembership
  stats: {
    total: number
    open: number
    urgent: number
    solved: number
    highConfidence: number
  }
  posts: AdminHelpPostRow[]
}

export type AdminAnimalPostRow = {
  id: string
  petName: string | null
  animalType: string | null
  city: string | null
  lat: number
  lng: number
  description: string | null
  lastSeenAt: string | null
  status: "lost" | "found" | "spotted"
  isFound: boolean
  authorLabel: string
  createdAt: string
  responseCount: number
  acceptedResponse: boolean
  hasPhoto: boolean
  confidenceScore: number | null
  confidenceLevel: "low" | "medium" | "high" | null
  confidenceReasons: string[]
}

export type AdminAnimalPostsData = {
  membership: AdminMembership
  stats: {
    total: number
    active: number
    resolved: number
    withLead: number
    highConfidence: number
  }
  posts: AdminAnimalPostRow[]
}

export type AdminMemberRecord = {
  userId: string
  email: string | null
  displayName: string | null
  role: AdminRole | null
  organizationName: string | null
  territoryLabel: string | null
  territoryKey: string | null
  profileCreatedAt: string | null
  activity: {
    reportsCount: number
    lastReportAt: string | null
    analyticsEvents30d: number
  }
}

export type AdminAuditLogRecord = {
  id: string
  actorUserId: string
  actorLabel: string
  targetUserId: string
  targetLabel: string
  action:
    | "admin_role_granted"
    | "admin_role_updated"
    | "admin_role_revoked"
    | "user_created"
    | "user_updated"
    | "user_password_reset_requested"
    | "user_deleted"
    | "report_created"
    | "help_post_created"
    | "animal_post_created"
    | "animal_post_updated"
    | "animal_alert_created"
    | "animal_alert_updated"
  previousRole: AdminRole | null
  nextRole: AdminRole | null
  organizationName: string | null
  territoryLabel: string | null
  createdAt: string
  metadata?: Record<string, unknown> | null
}

export type AdminJournalItem = {
  id: string
  createdAt: string
  category:
    | "access"
    | "user"
    | "report"
    | "help_post"
    | "animal_alert"
    | "animal_post"
    | "moderation"
  title: string
  detail: string
  actorLabel: string
}

export type AdminJournalData = {
  membership: AdminMembership
  items: AdminJournalItem[]
}

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  mairie: "Mairie",
}
