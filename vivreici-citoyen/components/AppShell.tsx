"use client"

import { usePathname } from "next/navigation"
import AnalyticsPresenceTracker from "@/components/AnalyticsPresenceTracker"
import BottomNav, { shouldHideBottomNav } from "@/components/BottomNav"
import OfflineSyncFeedback from "@/components/OfflineSyncFeedback"
import OfflineReportSync from "@/components/OfflineReportSync"
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration"

export default function AppShell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const hideBottomNav = shouldHideBottomNav(pathname)

  return (
    <>
      <main
        className={`relative mx-auto min-h-screen max-w-md bg-white shadow-sm ${
          hideBottomNav
            ? "pb-[env(safe-area-inset-bottom)]"
            : "pb-[calc(env(safe-area-inset-bottom)+4.5rem)]"
        }`}
      >
        {children}
      </main>
      {!hideBottomNav ? <BottomNav /> : null}
      <OfflineSyncFeedback />
      <ServiceWorkerRegistration />
      <AnalyticsPresenceTracker />
      <OfflineReportSync />
    </>
  )
}
