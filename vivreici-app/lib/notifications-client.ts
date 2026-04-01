import type { ReportStatus } from "@/lib/reports"
import { createClient } from "@/lib/supabase"

async function buildAuthorizedHeaders() {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }

  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`
  }

  return headers
}

export async function triggerReportCreatedNotifications({
  reportId,
}: {
  reportId: string
}) {
  const response = await fetch("/api/notifications/report-event", {
    method: "POST",
    headers: await buildAuthorizedHeaders(),
    body: JSON.stringify({
      event: "report_created",
      reportId,
    }),
  })

  if (!response.ok) {
    throw new Error("Impossible de créer les notifications du signalement.")
  }
}

export async function triggerReportStatusChangedNotifications({
  reportId,
  nextStatus,
}: {
  reportId: string
  nextStatus: ReportStatus
}) {
  const response = await fetch("/api/notifications/report-event", {
    method: "POST",
    headers: await buildAuthorizedHeaders(),
    body: JSON.stringify({
      event: "report_status_changed",
      reportId,
      nextStatus,
    }),
  })

  if (!response.ok) {
    throw new Error("Impossible de créer les notifications de mise à jour.")
  }
}
