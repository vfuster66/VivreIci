"use client"

import { createClient } from "@/lib/supabase"

const ANALYTICS_SESSION_KEY = "vivreici-analytics-session-id"

type TrackEventOptions = {
  metadata?: Record<string, unknown>
  pagePath?: string
  keepalive?: boolean
}

function getAnalyticsSessionId() {
  if (typeof window === "undefined") {
    return "server"
  }

  const existing = window.localStorage.getItem(ANALYTICS_SESSION_KEY)

  if (existing) {
    return existing
  }

  const nextValue =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `analytics-${Date.now()}`

  window.localStorage.setItem(ANALYTICS_SESSION_KEY, nextValue)
  return nextValue
}

async function getAuthorizationHeader() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const headers: Record<string, string> = {}

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`
  }

  return headers
}

export async function trackEvent(
  eventName: string,
  options: TrackEventOptions = {}
) {
  if (typeof window === "undefined") {
    return
  }

  try {
    const authorizationHeaders = await getAuthorizationHeader()
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...authorizationHeaders,
    }

    await fetch("/api/analytics/event", {
      method: "POST",
      keepalive: options.keepalive ?? false,
      headers,
      body: JSON.stringify({
        eventName,
        pagePath: options.pagePath ?? window.location.pathname,
        sessionId: getAnalyticsSessionId(),
        metadata: options.metadata ?? {},
      }),
    })
  } catch {
    // Le tracking ne doit jamais casser l'UX.
  }
}
