"use client"

const OFFLINE_REPORT_LOGS_KEY = "vivreici-offline-report-logs-v1"
const OFFLINE_REPORT_LOGS_EVENT = "offline-report-logs:changed"
const MAX_LOG_ENTRIES = 200

export type OfflineReportLogEntry = {
  id: string
  localId: string | null
  level: "info" | "error"
  message: string
  createdAt: string
}

export function loadOfflineReportLogs(localId?: string | null) {
  if (typeof window === "undefined") {
    return [] as OfflineReportLogEntry[]
  }

  try {
    const rawValue = window.localStorage.getItem(OFFLINE_REPORT_LOGS_KEY)
    const entries = rawValue
      ? (JSON.parse(rawValue) as OfflineReportLogEntry[])
      : []

    return entries.filter((entry) => !localId || entry.localId === localId)
  } catch {
    return [] as OfflineReportLogEntry[]
  }
}

export function appendOfflineReportLog(input: {
  localId?: string | null
  level?: "info" | "error"
  message: string
}) {
  if (typeof window === "undefined") {
    return
  }

  try {
    const nextEntry: OfflineReportLogEntry = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `offline-log-${Date.now()}`,
      localId: input.localId ?? null,
      level: input.level ?? "info",
      message: input.message,
      createdAt: new Date().toISOString(),
    }

    const currentEntries = loadOfflineReportLogs()
    const nextEntries = [nextEntry, ...currentEntries].slice(0, MAX_LOG_ENTRIES)

    window.localStorage.setItem(
      OFFLINE_REPORT_LOGS_KEY,
      JSON.stringify(nextEntries)
    )
    window.dispatchEvent(new Event(OFFLINE_REPORT_LOGS_EVENT))
  } catch {
    // Le logging ne doit jamais casser l'UX principale.
  }
}

export function subscribeToOfflineReportLogs(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined
  }

  window.addEventListener(OFFLINE_REPORT_LOGS_EVENT, callback)
  return () => window.removeEventListener(OFFLINE_REPORT_LOGS_EVENT, callback)
}
