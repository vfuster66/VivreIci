"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { Crosshair, Filter, Loader2, MapPin, Search, X } from "lucide-react"
import AppTopbar from "@/components/AppTopbar"
import HomeMapLoader from "@/components/home-map-loader"
import { trackEvent } from "@/lib/analytics-client"
import { geocodePlaceInFrance, type Coordinates } from "@/lib/map-location"
import {
  isOfflineLikeError,
  loadCachedReports,
  saveCachedReports,
} from "@/lib/reports-cache"
import { createClient, getCurrentSessionUser } from "@/lib/supabase"
import {
  MAP_REPORT_SELECT_LEGACY,
  MAP_REPORT_SELECT_WITH_ARCHIVE,
  MAP_REPORT_SELECT_WITH_HISTORY,
  MAP_REPORT_STATUS_FILTERS,
  REPORT_TYPE_FILTERS,
  getReportSearchText,
  type ReportRecord,
  type ReportStatusFilter,
} from "@/lib/reports"

type MapHomeScreenProps = {
  initialFocusCoordinates?: Coordinates | null
  title?: string
  tabsSlot?: React.ReactNode
}

export default function MapHomeScreen({
  initialFocusCoordinates = null,
  title = "Carte",
  tabsSlot,
}: MapHomeScreenProps) {
  const [reports, setReports] = useState<ReportRecord[]>([])
  const [isReportsLoading, setIsReportsLoading] = useState(true)
  const [showMapSummary, setShowMapSummary] = useState(true)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState<ReportStatusFilter>("active")
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [focusCoordinates, setFocusCoordinates] = useState<Coordinates | null>(
    initialFocusCoordinates
  )
  const [focusedReportId, setFocusedReportId] = useState<string | null>(null)
  const [preferredCity, setPreferredCity] = useState<string | null>(null)
  const [locationNotice, setLocationNotice] = useState<string | null>(null)
  const [showLocationPrompt, setShowLocationPrompt] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [reportsNotice, setReportsNotice] = useState<string | null>(null)

  useEffect(() => {
    void trackEvent("map_viewed", {
      metadata: {
        hasInitialFocus: Boolean(initialFocusCoordinates),
      },
    })
  }, [initialFocusCoordinates])

  useEffect(() => {
    const cachedReports = loadCachedReports()

    if (cachedReports.length > 0) {
      setReports(cachedReports)
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    let isMounted = true
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null

    async function fetchReports() {
      try {
        if (isMounted) {
          setIsReportsLoading(true)
        }

        let data = null
        let error = null

        const archivedQuery = await supabase
          .from("reports")
          .select(MAP_REPORT_SELECT_WITH_ARCHIVE)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })

        if (!archivedQuery.error) {
          data = archivedQuery.data
        } else {
          const historyQuery = await supabase
            .from("reports")
            .select(MAP_REPORT_SELECT_WITH_HISTORY)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })

          if (!historyQuery.error) {
            data = historyQuery.data
          } else {
            const legacyQuery = await supabase
              .from("reports")
              .select(MAP_REPORT_SELECT_LEGACY)
              .is("deleted_at", null)
              .order("created_at", { ascending: false })

            data = legacyQuery.data
            error = legacyQuery.error
          }
        }

        if (error) {
          if (isOfflineLikeError(error)) {
            const cachedReports = loadCachedReports()
            if (isMounted) {
              setReports(cachedReports)
              setReportsNotice(
                cachedReports.length > 0
                  ? "Mode hors ligne : carte basée sur le dernier état disponible."
                  : "Mode hors ligne : aucun signalement en cache."
              )
            }
            return
          }

          throw error
        }

        const nextReports = data ?? []
        if (!isMounted) {
          return
        }

        setReports(nextReports)
        saveCachedReports(nextReports)
        setReportsNotice(null)
      } catch (error) {
        if (!isMounted) {
          return
        }

        if (isOfflineLikeError(error)) {
          const cachedReports = loadCachedReports()
          setReports(cachedReports)
          setReportsNotice(
            cachedReports.length > 0
              ? "Mode hors ligne : carte basée sur le dernier état disponible."
              : "Mode hors ligne : aucun signalement en cache."
          )
        } else {
          setReports([])
          setReportsNotice(null)
        }
      } finally {
        if (isMounted) {
          setIsReportsLoading(false)
        }
      }
    }

    void fetchReports().then(() => {
      if (!isMounted) {
        return
      }

      realtimeChannel = supabase
        .channel("reports-map-home")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "reports" },
          () => {
            void fetchReports()
          }
        )
        .subscribe()
    })

    return () => {
      isMounted = false

      if (realtimeChannel) {
        void supabase.removeChannel(realtimeChannel)
      }
    }
  }, [])

  useEffect(() => {
    if (!locationNotice) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setLocationNotice(null)
    }, 2600)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [locationNotice])

  const activateGeolocation = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      setLocationNotice(
        preferredCity
          ? `Géolocalisation indisponible. Carte centrée sur ${preferredCity}.`
          : "Géolocalisation indisponible sur cet appareil."
      )
      setShowLocationPrompt(false)
      return
    }

    setIsLocating(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }

        setFocusCoordinates(coordinates)
        setFocusedReportId(null)
        setLocationNotice("Carte centrée autour de votre position.")
        setShowLocationPrompt(false)
        window.localStorage.setItem("vivreici-map-geolocation-choice", "allowed")
        setIsLocating(false)
      },
      async () => {
        window.localStorage.setItem("vivreici-map-geolocation-choice", "denied")
        setShowLocationPrompt(false)

        if (preferredCity) {
          const coordinates = await geocodePlaceInFrance(preferredCity)
          if (coordinates) {
            setFocusCoordinates(coordinates)
            setFocusedReportId(null)
            setLocationNotice(
              `Position indisponible. Carte centrée sur ${preferredCity}.`
            )
          } else {
            setLocationNotice(
              "Position refusée. Renseignez une ville dans votre profil pour personnaliser la carte."
            )
          }
        } else {
          setLocationNotice(
            "Position refusée. Vous pouvez renseigner une ville dans votre profil pour personnaliser la carte."
          )
        }

        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [preferredCity])

  useEffect(() => {
    async function loadLocationContext() {
      if (initialFocusCoordinates) {
        setLocationNotice("Carte centrée sur le signalement partagé.")
        return
      }

      try {
        const supabase = createClient()
        const user = await getCurrentSessionUser(supabase)

        if (user) {
          const { data } = await supabase
            .from("profiles")
            .select("preferred_city")
            .eq("id", user.id)
            .maybeSingle()

          const nextPreferredCity = data?.preferred_city?.trim() || null
          setPreferredCity(nextPreferredCity)

          const consentState =
            typeof window !== "undefined"
              ? window.localStorage.getItem("vivreici-map-geolocation-choice")
              : null

          if (consentState === "allowed") {
            void activateGeolocation()
            return
          }

          if (!consentState) {
            setShowLocationPrompt(true)
          }

          if (nextPreferredCity) {
            const coordinates = await geocodePlaceInFrance(nextPreferredCity)
            if (coordinates) {
              setFocusCoordinates(coordinates)
              setFocusedReportId(null)
              setLocationNotice(`Ville mise en avant : ${nextPreferredCity}`)
            }
          }
          return
        }

        const consentState =
          typeof window !== "undefined"
            ? window.localStorage.getItem("vivreici-map-geolocation-choice")
            : null

        if (!consentState) {
          setShowLocationPrompt(true)
        }
      } catch {
        setPreferredCity(null)
      }
    }

    void loadLocationContext()
  }, [activateGeolocation, initialFocusCoordinates])

  async function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedQuery = searchQuery.trim()

    if (!trimmedQuery) {
      setSearchError("Entrez une rue, un lieu ou un signalement.")
      return
    }

    setIsSearching(true)
    setSearchError(null)

    try {
      const normalizedQuery = trimmedQuery.toLowerCase()
      const matchedReport = reports.find((report) =>
        getReportSearchText(report).includes(normalizedQuery)
      )

      if (matchedReport) {
        setFocusCoordinates({
          lat: matchedReport.lat,
          lng: matchedReport.lng,
        })
        setFocusedReportId(matchedReport.id)
        setIsSearchOpen(false)
        return
      }

      const coordinates = await geocodePlaceInFrance(trimmedQuery)

      if (!coordinates) {
        setSearchError("Aucun lieu trouvé.")
        return
      }

      setFocusCoordinates(coordinates)
      setFocusedReportId(null)
      setIsSearchOpen(false)
    } catch {
      setSearchError("Impossible de rechercher ce lieu pour le moment.")
    } finally {
      setIsSearching(false)
    }
  }

  const summaryTopClassName = tabsSlot ? "top-40" : "top-28"
  const hasCustomFocus = Boolean(initialFocusCoordinates || focusCoordinates)
  const activeTypeLabel =
    typeFilter === "all"
      ? "Tous les types"
      : REPORT_TYPE_FILTERS.find((filter) => filter.value === typeFilter)?.label ??
        "Filtre actif"
  const activeStatusLabel =
    MAP_REPORT_STATUS_FILTERS.find((filter) => filter.value === statusFilter)?.label ??
    "Actifs"

  return (
    <div className="relative h-[calc(100dvh-4rem)] w-full overflow-hidden">
      <AppTopbar
        title={title}
        overlay
        leadingAction={
          <button
            type="button"
            aria-label="Ouvrir la recherche"
            onClick={() => {
              setIsSearchOpen((current) => !current)
              setIsFilterOpen(false)
              setShowMapSummary(false)
            }}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full transition ${
              isSearchOpen
                ? "bg-[#fac411] text-[#1A1A1A]"
                : "text-[#1A1A1A] hover:bg-[#F6F6F6]"
            }`}
          >
            <Search className="h-4 w-4" />
          </button>
        }
        action={
          <button
            type="button"
            aria-label="Ouvrir les filtres"
            onClick={() => {
              setIsFilterOpen((current) => !current)
              setIsSearchOpen(false)
              setShowMapSummary(false)
            }}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full transition ${
              isFilterOpen
                ? "bg-[#fac411] text-[#1A1A1A]"
                : "text-[#1A1A1A] hover:bg-[#F6F6F6]"
            }`}
          >
            <Filter className="h-4 w-4" />
          </button>
        }
      />

      {tabsSlot ? (
        <div className="absolute top-16 right-0 left-0 z-20">{tabsSlot}</div>
      ) : null}

      {showLocationPrompt ? (
        <div
          className={`absolute right-0 left-0 z-20 px-4 pt-2 ${
            tabsSlot ? "top-28" : "top-16"
          }`}
        >
          <div className="mx-auto max-w-md rounded-[22px] border border-gray-200 bg-white p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#D6A100]" />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-semibold text-[#1A1A1A]">
                  Activer votre position ?
                </p>
                <p className="text-sm leading-6 text-[#666666]">
                  Pour voir plus facilement les signalements autour de vous.
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => void activateGeolocation()}
                disabled={isLocating}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#fac411] px-4 py-3 text-sm font-semibold text-[#1A1A1A] disabled:opacity-70"
              >
                {isLocating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Localisation...
                  </>
                ) : (
                  <>
                    <Crosshair className="h-4 w-4" />
                    Activer
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  window.localStorage.setItem(
                    "vivreici-map-geolocation-choice",
                    "skipped"
                  )
                  setShowLocationPrompt(false)
                  setLocationNotice(
                    preferredCity
                      ? `Carte centrée sur ${preferredCity}.`
                      : "Vous pouvez activer votre position plus tard."
                  )
                }}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#F6F6F6] px-4 py-3 text-sm font-semibold text-[#1A1A1A] ring-1 ring-gray-200"
              >
                Plus tard
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isFilterOpen ? (
        <div
          className={`absolute right-0 left-0 z-20 px-4 pt-2 ${
            tabsSlot ? "top-28" : "top-16"
          }`}
        >
          <div className="mx-auto max-w-md rounded-[22px] border border-gray-200 bg-white p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-[#1A1A1A]">Filtres</p>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-[#F6F6F6]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                  Type
                </span>
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="w-full rounded-2xl bg-[#F6F6F6] px-3 py-2.5 text-sm outline-none ring-1 ring-gray-200"
                >
                  {REPORT_TYPE_FILTERS.map((filter) => (
                    <option key={filter.value} value={filter.value}>
                      {filter.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                  Statut
                </span>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as ReportStatusFilter)
                  }
                  className="w-full rounded-2xl bg-[#F6F6F6] px-3 py-2.5 text-sm outline-none ring-1 ring-gray-200"
                >
                  {MAP_REPORT_STATUS_FILTERS.map((filter) => (
                    <option key={filter.value} value={filter.value}>
                      {filter.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      ) : null}

      {isSearchOpen ? (
        <div
          className={`absolute right-0 left-0 z-20 px-4 pt-2 ${
            tabsSlot ? "top-28" : "top-16"
          }`}
        >
          <div className="mx-auto max-w-md rounded-[22px] border border-gray-200 bg-white p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-[#1A1A1A]">Recherche</p>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-[#F6F6F6]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSearchSubmit} className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl bg-[#F6F6F6] px-4 py-3 ring-1 ring-gray-200">
                <Search className="h-4 w-4 shrink-0 text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  aria-label="Rechercher un lieu ou un signalement"
                  placeholder="Rechercher un lieu ou un signalement"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                />
              </div>

              {searchError ? (
                <p className="text-sm text-[#7A1C22]">{searchError}</p>
              ) : null}

              <button
                type="submit"
                disabled={isSearching}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#fac411] px-4 py-3 text-sm font-semibold text-[#1A1A1A] transition hover:bg-[#E0AF00] disabled:opacity-70"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Recherche...
                  </>
                ) : (
                  "Voir sur la carte"
                )}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {locationNotice ? (
        <div
          className={`pointer-events-none absolute right-0 left-0 z-10 px-4 pt-2 ${
            tabsSlot ? "top-28" : "top-16"
          }`}
        >
          <div className="mx-auto max-w-md rounded-2xl bg-white/95 px-4 py-3 text-sm text-[#1A1A1A] shadow-sm ring-1 ring-gray-200 backdrop-blur">
            {locationNotice}
          </div>
        </div>
      ) : null}

      {reportsNotice ? (
        <div
          className={`pointer-events-none absolute right-0 left-0 z-10 px-4 pt-2 ${
            tabsSlot ? "top-40" : "top-28"
          }`}
        >
          <div className="mx-auto max-w-md rounded-2xl bg-[#FFFDF2] px-4 py-3 text-sm text-[#5F5A45] shadow-sm ring-1 ring-[#F1E4A6]">
            {reportsNotice}
          </div>
        </div>
      ) : null}

      {showMapSummary && !isFilterOpen && !isSearchOpen ? (
        <div className={`absolute right-0 left-0 z-10 px-4 pt-2 ${summaryTopClassName}`}>
          <div className="mx-auto max-w-md rounded-[24px] bg-white/96 p-4 shadow-lg ring-1 ring-black/5 backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8A8A8A]">
                  Vue carte
                </p>
                <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#1A1A1A]">
                  {isReportsLoading
                    ? "Préparation des signalements"
                    : `${reports.length} signalement${reports.length > 1 ? "s" : ""} prêts à explorer`}
                </h2>
                <p className="text-sm leading-6 text-[#5F5F5F]">
                  {hasCustomFocus
                    ? "La carte démarre sur une zone ciblée pour aller plus vite."
                    : "Déplacez la carte ou utilisez la recherche pour cibler une rue, un lieu ou un signalement."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMapSummary(false)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-[#F6F6F6]"
                aria-label="Masquer le résumé de la carte"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#F7F7F7] px-4 py-3 ring-1 ring-black/5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A8A8A]">
                  Type
                </p>
                <p className="mt-1 text-sm font-semibold text-[#1A1A1A]">
                  {activeTypeLabel}
                </p>
              </div>
              <div className="rounded-2xl bg-[#F7F7F7] px-4 py-3 ring-1 ring-black/5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A8A8A]">
                  Statut
                </p>
                <p className="mt-1 text-sm font-semibold text-[#1A1A1A]">
                  {activeStatusLabel}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className={`absolute inset-0 z-0 ${tabsSlot ? "pt-28" : "pt-16"}`}>
        <HomeMapLoader
          isLoading={isReportsLoading}
          reports={reports}
          typeFilter={typeFilter}
          statusFilter={statusFilter}
          focusCoordinates={focusCoordinates}
          focusedReportId={focusedReportId}
          onMapInteract={() => {
            setIsFilterOpen(false)
            setIsSearchOpen(false)
            setShowMapSummary(false)
          }}
        />
      </div>

      <div className="pointer-events-none absolute right-0 bottom-4 left-0 z-10 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+4.5rem)]">
        <Link
          href="/signalements/nouveau"
          className="pointer-events-auto flex min-h-14 items-center gap-2 rounded-full bg-[#E30613] px-7 py-3.5 text-base font-semibold text-white shadow-lg transition-colors hover:bg-red-700"
        >
          <span className="mb-1 text-2xl leading-none">+</span> Signaler
        </Link>
      </div>
    </div>
  )
}
