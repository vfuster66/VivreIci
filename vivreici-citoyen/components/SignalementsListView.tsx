"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ChevronRight, Search } from "lucide-react"
import AppTopbar from "@/components/AppTopbar"
import FeedbackBanner from "@/components/FeedbackBanner"
import {
  listOfflineReports,
  subscribeToOfflineReports,
} from "@/lib/offline-report-queue"
import { buildDisplayName } from "@/lib/profile"
import {
  isOfflineLikeError,
  loadCachedReports,
  saveCachedReports,
} from "@/lib/reports-cache"
import { createClient } from "@/lib/supabase"
import {
  REPORT_SELECT_LEGACY,
  REPORT_SELECT_WITH_ARCHIVE,
  REPORT_SELECT_WITH_HISTORY,
  REPORT_STATUS_FILTERS,
  REPORT_TYPE_FILTERS,
  filterReports,
  formatReportDate,
  getDisplayReportReference,
  getReportStatusClasses,
  getReportStatusLabel,
  parseStoredReportMetadata,
  type ReportRecord,
  type ReportStatusFilter,
} from "@/lib/reports"

type SignalementsListViewProps = {
  tabsSlot?: React.ReactNode
}

export default function SignalementsListView({
  tabsSlot,
}: SignalementsListViewProps) {
  const [reports, setReports] = useState<ReportRecord[]>([])
  const [query, setQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState<ReportStatusFilter>("active")
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadNotice, setLoadNotice] = useState<string | null>(null)
  const [offlinePendingCount, setOfflinePendingCount] = useState(0)

  useEffect(() => {
    const cachedReports = loadCachedReports()

    if (cachedReports.length > 0) {
      setReports(cachedReports)
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    async function loadOfflinePendingCount() {
      const offlineReports = await listOfflineReports().catch(() => [])
      setOfflinePendingCount(
        offlineReports.filter(
          (report) => report.status === "pending" || report.status === "error"
        ).length
      )
    }

    void loadOfflinePendingCount()

    return subscribeToOfflineReports(() => {
      void loadOfflinePendingCount()
    })
  }, [])

  useEffect(() => {
    const supabase = createClient()

    async function fetchReports() {
      try {
        let data = null
        let error = null

        const archivedQuery = await supabase
          .from("reports")
          .select(REPORT_SELECT_WITH_ARCHIVE)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })

        if (!archivedQuery.error) {
          data = archivedQuery.data
        } else {
          const historyQuery = await supabase
            .from("reports")
            .select(REPORT_SELECT_WITH_HISTORY)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })

          if (!historyQuery.error) {
            data = historyQuery.data
          } else {
            const legacyQuery = await supabase
              .from("reports")
              .select(REPORT_SELECT_LEGACY)
              .is("deleted_at", null)
              .order("created_at", { ascending: false })

            data = legacyQuery.data
            error = legacyQuery.error
          }
        }

        if (error) {
          if (isOfflineLikeError(error)) {
            const cachedReports = loadCachedReports()
            setReports(cachedReports)
            setLoadError(null)
            setLoadNotice(
              cachedReports.length > 0
                ? "Mode hors ligne. Affichage du dernier état disponible."
                : "Mode hors ligne. Aucun signalement en cache pour le moment."
            )
            return
          }

          throw error
        }

        const reportsData = data ?? []
        const userIds = Array.from(
          new Set(
            reportsData
              .map((report) => report.user_id)
              .filter((userId): userId is string => Boolean(userId))
          )
        )

        let profilesById = new Map<
          string,
          {
            display_name: string | null
            first_name: string | null
            last_name: string | null
            avatar_url: string | null
          }
        >()

        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, display_name, first_name, last_name, avatar_url")
            .in("id", userIds)

          if (profilesError) {
            throw profilesError
          }

          profilesById = new Map(
            (profilesData ?? []).map((profile) => [
              profile.id,
              {
                display_name: profile.display_name,
                first_name: profile.first_name,
                last_name: profile.last_name,
                avatar_url: profile.avatar_url,
              },
            ])
          )
        }

        const nextReports = reportsData.map((report) => {
          const creatorProfile = report.user_id
            ? profilesById.get(report.user_id)
            : null

          return {
            ...report,
            creator_name: creatorProfile
              ? buildDisplayName(creatorProfile)
              : "Utilisateur VivreIci",
            creator_avatar_url: creatorProfile?.avatar_url ?? null,
          }
        })

        setReports(nextReports)
        saveCachedReports(nextReports)
        setLoadError(null)
        setLoadNotice(null)
      } catch (error) {
        if (isOfflineLikeError(error)) {
          const cachedReports = loadCachedReports()
          setReports(cachedReports)
          setLoadError(null)
          setLoadNotice(
            cachedReports.length > 0
              ? "Mode hors ligne. Affichage du dernier état disponible."
              : "Mode hors ligne. Aucun signalement en cache pour le moment."
          )
        } else {
          setLoadNotice(null)
          setLoadError(
            error instanceof Error
              ? error.message
              : "Impossible de charger les signalements."
          )
        }
      } finally {
        setIsLoading(false)
      }
    }

    void fetchReports()

    function refetchReports() {
      void fetchReports()
    }

    const channel = supabase
      .channel("reports-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports" },
        () => {
          void fetchReports()
        }
      )
      .subscribe()

    window.addEventListener("online", refetchReports)
    window.addEventListener("focus", refetchReports)
    window.addEventListener("reports:sync", refetchReports)
    document.addEventListener("visibilitychange", refetchReports)

    return () => {
      window.removeEventListener("online", refetchReports)
      window.removeEventListener("focus", refetchReports)
      window.removeEventListener("reports:sync", refetchReports)
      document.removeEventListener("visibilitychange", refetchReports)
      void supabase.removeChannel(channel)
    }
  }, [])

  const filteredReports = useMemo(
    () => filterReports(reports, { query, typeFilter, statusFilter }),
    [reports, query, typeFilter, statusFilter]
  )

  return (
    <div className="min-h-screen bg-white pb-24">
      <AppTopbar
        title="Signalements"
        filterPanel={
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2">
              {REPORT_STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatusFilter(filter.value)}
                  className={`min-h-11 rounded-2xl px-3 text-xs font-semibold transition ${
                    statusFilter === filter.value
                      ? "bg-[#1A1A1A] text-white"
                      : "bg-[#F8F8F8] text-[#1A1A1A]"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="w-full rounded-2xl bg-[#F8F8F8] px-3 py-3 text-sm font-medium text-[#1A1A1A] outline-none"
            >
              {REPORT_TYPE_FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  Type : {filter.label}
                </option>
              ))}
            </select>
          </div>
        }
        searchPanel={
          <div className="flex items-center gap-3 rounded-2xl bg-[#F8F8F8] px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Rechercher un lieu, un type ou un problème"
              placeholder="Rechercher un lieu, un type, un problème..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>
        }
      />

      {tabsSlot}

      <div className="mx-auto max-w-md px-4 pt-4">
        {offlinePendingCount > 0 ? (
          <Link
            href="/signalements/nouveau?focus=queue"
            className="mb-4 flex items-center justify-between rounded-[24px] border border-[#F1E4A6] bg-[#FFFDF2] px-4 py-4"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#1A1A1A]">
                Signalements en attente
              </p>
              <p className="mt-1 text-sm leading-6 text-[#5F5A45]">
                {offlinePendingCount} en attente d&apos;envoi. Ouvrir la file pour
                reprendre le premier.
              </p>
            </div>
            <span className="ml-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-[#1A1A1A] ring-1 ring-[#F1E4A6]">
              {offlinePendingCount}
              <ChevronRight className="h-4 w-4" />
            </span>
          </Link>
        ) : null}

        <div className="flex items-center justify-between border-b border-gray-100 pb-4 text-sm text-[#666666]">
          <span className="font-medium text-[#1A1A1A]">
            {filteredReports.length} signalement(s)
          </span>
          {(query || typeFilter !== "all" || statusFilter !== "active") && (
            <button
              type="button"
              onClick={() => {
                setQuery("")
                setTypeFilter("all")
                setStatusFilter("active")
              }}
              className="font-medium text-[#D6A100]"
            >
              Réinitialiser
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="py-6 text-sm text-[#666666]">
            Chargement des signalements...
          </div>
        ) : loadError ? (
          <FeedbackBanner variant="error" className="py-6">
            Impossible de charger les signalements : {loadError}
          </FeedbackBanner>
        ) : (
          <div className="space-y-3 py-4">
            {loadNotice ? (
              <FeedbackBanner variant="warning">
                {loadNotice}
              </FeedbackBanner>
            ) : null}

            {filteredReports.length === 0 ? (
              <div className="py-2 text-sm text-[#666666]">
                Aucun signalement pour le moment sur ces filtres.
              </div>
            ) : (
              filteredReports.map((report) => (
                (() => {
                  return (
                    <Link
                      key={report.id}
                      href={`/signalements/${report.id}?from=list`}
                      className="block rounded-[24px] border border-gray-100 bg-white px-4 py-4 transition hover:bg-[#FCFCFC]"
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#D6A100]">
                            {getDisplayReportReference(report)}
                          </p>
                          <p className="truncate text-base font-semibold text-[#1A1A1A]">
                            {report.type}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${getReportStatusClasses(report.status)}`}
                        >
                          {getReportStatusLabel(report.status)}
                        </span>
                      </div>

                      <p className="line-clamp-1 text-sm leading-5 text-[#666666]">
                        {parseStoredReportMetadata(report.description).address ??
                          `${report.lat.toFixed(5)}, ${report.lng.toFixed(5)}`}
                      </p>

                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#1A1A1A]">
                        {report.description
                          ? parseStoredReportMetadata(report.description).primaryText
                          : "Aucune description fournie."}
                      </p>

                      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-gray-500">
                        <div className="min-w-0">
                          <p>{formatReportDate(report.created_at)}</p>
                        </div>
                        <span className="shrink-0 font-medium text-[#1A1A1A]">
                          Voir le détail
                        </span>
                      </div>
                    </Link>
                  )
                })()
              ))
            )}
          </div>
        )}
      </div>

      <div className="pointer-events-none fixed bottom-20 left-1/2 z-30 w-full max-w-md -translate-x-1/2 px-4">
        <div className="flex justify-end">
          <Link
            href="/signalements/nouveau"
            className="pointer-events-auto inline-flex h-14 items-center justify-center rounded-full bg-[#E30613] px-5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(227,6,19,0.28)]"
          >
            Ajouter
          </Link>
        </div>
      </div>
    </div>
  )
}
