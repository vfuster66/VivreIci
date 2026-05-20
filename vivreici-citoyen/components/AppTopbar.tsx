"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowLeft, Filter, Search, X } from "lucide-react"
import NotificationBell from "@/components/NotificationBell"
import OfflineSyncIndicator from "@/components/OfflineSyncIndicator"
import { trackEvent } from "@/lib/analytics-client"

type AppTopbarProps = {
  eyebrow?: string
  title: string
  description?: string
  backHref?: string
  backOnHistory?: boolean
  backFallbackHref?: string
  backLabel?: string
  leadingAction?: React.ReactNode
  action?: React.ReactNode
  overlay?: boolean
  actionsOnly?: boolean
  filterPanel?: React.ReactNode
  searchPanel?: React.ReactNode
}

export default function AppTopbar({
  eyebrow,
  title,
  description,
  backHref,
  backOnHistory = false,
  backFallbackHref = "/signalements?view=map",
  backLabel = "Retour",
  leadingAction,
  action,
  overlay = false,
  actionsOnly = false,
  filterPanel,
  searchPanel,
}: AppTopbarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const filterPanelId = "app-topbar-filter-panel"
  const searchPanelId = "app-topbar-search-panel"
  const hasPanels = Boolean(filterPanel || searchPanel)
  const showNotificationBell =
    pathname !== "/notifications" && !pathname.startsWith("/notifications/")

  function handleHistoryBack() {
    void trackEvent("navigation_back_clicked", {
      metadata: {
        title,
        backMode: "history",
        backFallbackHref,
      },
    })

    if (window.history.length > 1) {
      router.back()
      return
    }

    router.push(backFallbackHref)
  }

  return (
    <div
      className={`${
        overlay
          ? "absolute top-0 right-0 left-0 z-20"
          : "sticky top-0 z-20"
      }`}
    >
      <div className="mx-auto max-w-md border-b border-gray-200/80 bg-white/95 shadow-[0_4px_18px_rgba(0,0,0,0.05)] backdrop-blur">
        <div className="flex min-h-16 items-center px-4" role="toolbar" aria-label={title}>
          {actionsOnly ? (
            <div className="relative flex w-full items-center justify-between gap-3">
              <div className="h-10 w-10 shrink-0" />

              <div className="pointer-events-none absolute inset-x-0 px-24 text-center">
                {eyebrow ? (
                  <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D6A100]">
                    {eyebrow}
                  </p>
                ) : null}
                <h1 className="truncate text-base font-semibold text-[#1A1A1A]">
                  {title}
                </h1>
                {description ? (
                  <p className="truncate text-xs text-[#666666]">{description}</p>
                ) : null}
              </div>

              <div className="relative z-10 flex min-h-10 items-center justify-end gap-2">
                <OfflineSyncIndicator />
                {action}
                {showNotificationBell ? <NotificationBell /> : null}
              </div>
            </div>
          ) : (
            <div className="relative flex w-full items-center justify-between gap-3">
              <div className="relative z-10 flex min-h-10 min-w-10 items-center justify-start">
              {backOnHistory ? (
                <button
                  type="button"
                  aria-label={backLabel}
                  onClick={handleHistoryBack}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#1A1A1A] transition hover:bg-[#F6F6F6]"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              ) : null}

              {!backOnHistory && backHref ? (
                <Link
                  href={backHref}
                  aria-label={backLabel}
                  onClick={() => {
                    void trackEvent("navigation_back_clicked", {
                      metadata: {
                        title,
                        backHref,
                      },
                    })
                  }}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#1A1A1A] transition hover:bg-[#F6F6F6]"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              ) : null}

              {!backOnHistory && !backHref && leadingAction ? leadingAction : null}

              {!backOnHistory && !backHref && !leadingAction && searchPanel ? (
                <button
                  type="button"
                  aria-label="Ouvrir la recherche"
                  aria-expanded={isSearchOpen}
                  aria-controls={searchPanelId}
                  onClick={() => {
                    setIsSearchOpen((current) => !current)
                    setIsFilterOpen(false)
                  }}
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-full transition ${
                      isSearchOpen
                      ? "bg-[#fac411] text-white"
                      : "text-[#1A1A1A] hover:bg-[#F6F6F6]"
                  }`}
                >
                  <Search className="h-4 w-4" />
                </button>
              ) : null}

              {!backOnHistory && !backHref && !leadingAction && !searchPanel ? (
                <div className="h-10 w-10" />
              ) : null}
              </div>

              <div className="pointer-events-none absolute inset-x-0 px-24 text-center">
                {eyebrow ? (
                  <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D6A100]">
                    {eyebrow}
                  </p>
                ) : null}
                <h1 className="truncate text-base font-semibold text-[#1A1A1A]">
                  {title}
                </h1>
                {description ? (
                  <p className="truncate text-xs text-[#666666]">{description}</p>
                ) : null}
              </div>

              <div className="relative z-10 flex min-h-10 items-center justify-end gap-2">
                <OfflineSyncIndicator />
                {action}
                {showNotificationBell ? <NotificationBell /> : null}
                {filterPanel ? (
                  <button
                    type="button"
                    aria-label="Ouvrir les filtres"
                    aria-expanded={isFilterOpen}
                    aria-controls={filterPanelId}
                    onClick={() => {
                      setIsFilterOpen((current) => !current)
                      setIsSearchOpen(false)
                    }}
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-full transition ${
                      isFilterOpen
                        ? "bg-[#fac411] text-white"
                        : "text-[#1A1A1A] hover:bg-[#F6F6F6]"
                    }`}
                  >
                    <Filter className="h-4 w-4" />
                  </button>
                ) : null}
                {!action && !showNotificationBell && !filterPanel ? (
                  <div className="h-10 w-10" />
                ) : null}
              </div>
            </div>
          )}
        </div>

        {hasPanels && isFilterOpen && filterPanel ? (
          <div id={filterPanelId} className="border-t border-gray-100 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">{filterPanel}</div>
              <button
                type="button"
                aria-label="Fermer les filtres"
                onClick={() => setIsFilterOpen(false)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-[#F6F6F6]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {hasPanels && isSearchOpen && searchPanel ? (
          <div id={searchPanelId} className="border-t border-gray-100 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">{searchPanel}</div>
              <button
                type="button"
                aria-label="Fermer la recherche"
                onClick={() => setIsSearchOpen(false)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-[#F6F6F6]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
