"use client"

import { useEffect, useRef, useState } from "react"
import FeedbackBanner from "@/components/FeedbackBanner"
import {
  loadOfflineReportLogs,
  subscribeToOfflineReportLogs,
} from "@/lib/offline-report-logs"

type OfflineFeedbackState = {
  id: string
  message: string
  variant: "info" | "success" | "warning"
}

function mapLogToFeedback(message: string): Omit<OfflineFeedbackState, "id"> | null {
  if (message.startsWith("Synchronisation réussie.")) {
    return {
      message: "Signalement envoyé automatiquement.",
      variant: "success",
    }
  }

  if (message.startsWith("Échec de synchronisation")) {
    return {
      message: "L'envoi automatique a échoué. Nouvelle tentative prévue.",
      variant: "warning",
    }
  }

  if (message === "Tentative de synchronisation lancée.") {
    return {
      message: "Connexion retrouvée. Reprise des envois en attente.",
      variant: "info",
    }
  }

  return null
}

export default function OfflineSyncFeedback() {
  const [feedback, setFeedback] = useState<OfflineFeedbackState | null>(null)
  const lastSeenLogIdRef = useRef<string | null>(null)

  useEffect(() => {
    const initialLogs = loadOfflineReportLogs()
    lastSeenLogIdRef.current = initialLogs[0]?.id ?? null

    function handleLogChange() {
      const nextLogs = loadOfflineReportLogs()
      const latestLog = nextLogs[0]

      if (!latestLog || latestLog.id === lastSeenLogIdRef.current) {
        return
      }

      lastSeenLogIdRef.current = latestLog.id

      const nextFeedback = mapLogToFeedback(latestLog.message)
      if (!nextFeedback) {
        return
      }

      setFeedback({
        id: latestLog.id,
        ...nextFeedback,
      })
    }

    return subscribeToOfflineReportLogs(handleLogChange)
  }, [])

  useEffect(() => {
    if (!feedback) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setFeedback((current) => (current?.id === feedback.id ? null : current))
    }, 4500)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [feedback])

  if (!feedback) {
    return null
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-50 mx-auto flex max-w-md justify-center px-4">
      <FeedbackBanner
        variant={feedback.variant}
        className="pointer-events-auto w-full shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
      >
        {feedback.message}
      </FeedbackBanner>
    </div>
  )
}
