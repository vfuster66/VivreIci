"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { CloudOff, RefreshCw } from "lucide-react"
import {
  listOfflineReports,
  subscribeToOfflineReports,
} from "@/lib/offline-report-queue"

export default function OfflineSyncIndicator() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof window === "undefined" ? true : window.navigator.onLine
  )
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    function handleOnlineStatus() {
      setIsOnline(window.navigator.onLine)
    }

    async function loadOfflineQueue() {
      const offlineReports = await listOfflineReports().catch(() => [])
      setPendingCount(
        offlineReports.filter(
          (report) => report.status === "pending" || report.status === "error"
        ).length
      )
    }

    void loadOfflineQueue()

    window.addEventListener("online", handleOnlineStatus)
    window.addEventListener("offline", handleOnlineStatus)
    const unsubscribe = subscribeToOfflineReports(() => {
      void loadOfflineQueue()
    })

    return () => {
      window.removeEventListener("online", handleOnlineStatus)
      window.removeEventListener("offline", handleOnlineStatus)
      unsubscribe()
    }
  }, [])

  if (pendingCount === 0 && isOnline) {
    return null
  }

  const content = (
    <>
      {pendingCount > 0 ? (
        <RefreshCw className="h-4 w-4" />
      ) : (
        <CloudOff className="h-4 w-4" />
      )}
      <span className="text-[10px] font-semibold">
        {pendingCount > 0
          ? `${pendingCount} en attente`
          : "Hors ligne"}
      </span>
    </>
  )

  const className =
    "inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#FFFDF2] px-3 text-[#A77D00] ring-1 ring-[#F1E4A6]"

  if (pendingCount > 0) {
    return (
      <Link
        href="/signalements/nouveau?focus=queue"
        className={className}
        aria-label={`Ouvrir la file des signalements hors ligne, ${pendingCount} en attente`}
      >
        {content}
      </Link>
    )
  }

  return (
    <div className={className} aria-live="polite">
      {content}
    </div>
  )
}
