"use client"

import type { ReportRecord } from "./reports"

const REPORTS_CACHE_KEY = "vivreici-reports-cache-v1"

export function loadCachedReports() {
  if (typeof window === "undefined") {
    return [] as ReportRecord[]
  }

  try {
    const rawValue = window.localStorage.getItem(REPORTS_CACHE_KEY)

    if (!rawValue) {
      return [] as ReportRecord[]
    }

    return JSON.parse(rawValue) as ReportRecord[]
  } catch {
    return [] as ReportRecord[]
  }
}

export function saveCachedReports(reports: ReportRecord[]) {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(REPORTS_CACHE_KEY, JSON.stringify(reports))
  } catch {
    // Le cache local ne doit jamais casser l'expérience principale.
  }
}

export function isOfflineLikeError(error: unknown) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return true
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : ""

  return [
    "Failed to fetch",
    "Load failed",
    "NetworkError",
    "fetch failed",
    "ERR_NETWORK",
    "TypeError: Failed to fetch",
  ].some((pattern) => message.includes(pattern))
}
