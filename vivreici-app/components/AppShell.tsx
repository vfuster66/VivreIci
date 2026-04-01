"use client"

import { usePathname } from "next/navigation"
import AnalyticsPresenceTracker from "@/components/AnalyticsPresenceTracker"
import BottomNav from "@/components/BottomNav"
import OfflineReportSync from "@/components/OfflineReportSync"
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration"

export default function AppShell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAdminRoute = pathname.startsWith("/admin")

  return (
    <>
      {isAdminRoute ? (
        <div className="min-h-screen bg-[#F3EFE7] text-[#1A1A1A]">{children}</div>
      ) : (
        <>
          <main className="relative mx-auto min-h-screen max-w-md bg-white pb-16 shadow-sm">
            {children}
          </main>
          <BottomNav />
        </>
      )}
      <ServiceWorkerRegistration />
      <AnalyticsPresenceTracker />
      <OfflineReportSync />
    </>
  )
}
