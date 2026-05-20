"use client"

import { useEffect, useMemo } from "react"
import { syncOfflineReports } from "@/lib/offline-report-queue"
import { createClient } from "@/lib/supabase"

export default function OfflineReportSync() {
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    function syncNow() {
      void syncOfflineReports(supabase)
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        syncNow()
      }
    }

    syncNow()

    const interval = window.setInterval(syncNow, 30000)
    window.addEventListener("online", syncNow)
    window.addEventListener("focus", syncNow)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener("online", syncNow)
      window.removeEventListener("focus", syncNow)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [supabase])

  return null
}
