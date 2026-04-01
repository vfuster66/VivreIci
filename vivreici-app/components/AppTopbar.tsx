"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, Filter, Search, X } from "lucide-react"
import { trackEvent } from "@/lib/analytics-client"

type AppTopbarProps = {
  eyebrow?: string
  title: string
  description?: string
  backHref?: string
  backLabel?: string
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
  backLabel = "Retour",
  action,
  overlay = false,
  actionsOnly = false,
  filterPanel,
  searchPanel,
}: AppTopbarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const hasPanels = Boolean(filterPanel || searchPanel)

  return (
    <div
      className={`${
        overlay
          ? "absolute top-0 right-0 left-0 z-20"
          : "sticky top-0 z-20"
      }`}
    >
      <div className="mx-auto max-w-md border-b border-gray-200/80 bg-white/95 shadow-[0_4px_18px_rgba(0,0,0,0.05)] backdrop-blur">
        <div className="flex min-h-16 items-center px-4">
          {actionsOnly ? (
            <div className="flex w-full items-center justify-between">{action}</div>
          ) : (
            <div className="grid w-full grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-3">
              {backHref ? (
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
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#1A1A1A] transition hover:bg-[#F6F6F6]"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              ) : null}

              {!backHref && searchPanel ? (
                <button
                  type="button"
                  aria-label="Ouvrir la recherche"
                  onClick={() => {
                    setIsSearchOpen((current) => !current)
                    setIsFilterOpen(false)
                  }}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition ${
                      isSearchOpen
                      ? "bg-[#fac411] text-white"
                      : "text-[#1A1A1A] hover:bg-[#F6F6F6]"
                  }`}
                >
                  <Search className="h-4 w-4" />
                </button>
              ) : null}

              {!backHref && !searchPanel ? (
                <div className="h-10 w-10" />
              ) : null}

              <div className="min-w-0 text-center">
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

              {action ? (
                <div className="flex min-h-10 min-w-10 items-center justify-end">
                  {action}
                </div>
              ) : filterPanel ? (
                <button
                  type="button"
                  aria-label="Ouvrir les filtres"
                  onClick={() => {
                    setIsFilterOpen((current) => !current)
                    setIsSearchOpen(false)
                  }}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition ${
                    isFilterOpen
                      ? "bg-[#fac411] text-white"
                      : "text-[#1A1A1A] hover:bg-[#F6F6F6]"
                  }`}
                >
                  <Filter className="h-4 w-4" />
                </button>
              ) : (
                <div className="h-10 w-10" />
              )}
            </div>
          )}
        </div>

        {hasPanels && isFilterOpen && filterPanel ? (
          <div className="border-t border-gray-100 px-4 py-3">
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
          <div className="border-t border-gray-100 px-4 py-3">
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
