"use client"

import { useEffect, useRef } from "react"
import { trackEvent } from "@/lib/analytics-client"

const RETURN_THRESHOLD_MS = 5 * 60 * 1000

export default function AnalyticsPresenceTracker() {
  const hiddenAtRef = useRef<number | null>(null)

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now()
        return
      }

      if (
        document.visibilityState === "visible" &&
        hiddenAtRef.current &&
        Date.now() - hiddenAtRef.current >= RETURN_THRESHOLD_MS
      ) {
        void trackEvent("user_returned", {
          metadata: {
            hiddenDurationMs: Date.now() - hiddenAtRef.current,
          },
        })
      }

      hiddenAtRef.current = null
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  return null
}
