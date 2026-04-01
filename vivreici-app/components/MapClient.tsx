"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
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
  filterReports,
  formatReportDate,
  getPrimaryReportText,
  getReportStatusLabel,
  isReportVisibleOnMap,
  parseStoredReportMetadata,
  type ReportStatusFilter,
  type ReportRecord,
} from "@/lib/reports"

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === "object" && error !== null) {
    const entries = Object.entries(error).filter(([, value]) => value != null)

    if (entries.length > 0) {
      return entries.map(([key, value]) => `${key}: ${String(value)}`).join(", ")
    }
  }

  if (typeof error === "string" && error.trim()) {
    return error
  }

  return "Erreur Supabase inconnue"
}

function formatErrorForLog(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`
  }

  if (typeof error === "object" && error !== null) {
    const entries = Object.entries(error).filter(([, value]) => value != null)

    if (entries.length > 0) {
      return entries.map(([key, value]) => `${key}: ${String(value)}`).join(", ")
    }

    return JSON.stringify(error)
  }

  if (typeof error === "string" && error.trim()) {
    return error
  }

  return "Aucun detail supplementaire"
}

function getMarkerColor(status: string | null) {
  switch (status) {
    case "open":
      return "#D21C23"
    case "in_progress":
      return "#F59E0B"
    case "resolved":
      return "#16A34A"
    default:
      return "#6B7280"
  }
}

function createMarkerIcon(status: string | null, focused = false) {
  const color = getMarkerColor(status)
  const size = focused ? 24 : 18
  const halo = focused ? `box-shadow:0 0 0 8px ${color}2E;` : ""

  return L.divIcon({
    className: focused ? "map-highlight-pin" : "map-status-pin",
    html: `
      <div style="position: relative; width: ${size}px; height: ${size}px;">
        <div style="position:absolute; inset:0; border-radius:9999px; background:${color}; border:3px solid #FFFFFF; ${halo}"></div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

const FRANCE_CENTER: [number, number] = [46.603354, 1.888334]

type MapClientProps = {
  typeFilter?: string
  statusFilter?: ReportStatusFilter
  focusCoordinates?: {
    lat: number
    lng: number
  } | null
  focusedReportId?: string | null
  onMapInteract?: () => void
}

function MapViewportController({
  focusCoordinates,
}: {
  focusCoordinates?: {
    lat: number
    lng: number
  } | null
}) {
  const map = useMap()

  useEffect(() => {
    if (!focusCoordinates) {
      return
    }

    map.setView([focusCoordinates.lat, focusCoordinates.lng], 16, {
      animate: true,
    })
  }, [focusCoordinates, map])

  return null
}

function MapInteractionController({
  onMapInteract,
}: {
  onMapInteract?: () => void
}) {
  useMapEvents({
    click: () => onMapInteract?.(),
    dragstart: () => onMapInteract?.(),
    zoomstart: () => onMapInteract?.(),
    mousedown: () => onMapInteract?.(),
  })

  return null
}

export default function MapClient({
  typeFilter = "all",
  statusFilter = "all",
  focusCoordinates = null,
  focusedReportId = null,
  onMapInteract,
}: MapClientProps) {
  const [reports, setReports] = useState<ReportRecord[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  // Récupération des signalements depuis Supabase au chargement de la carte
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
            setLoadError(
              cachedReports.length > 0
                ? "Mode hors ligne : dernier état disponible."
                : "Mode hors ligne : aucun signalement en cache."
            )
            return
          }

          const message = normalizeErrorMessage(error)
          setLoadError(message)
          console.warn(
            `Erreur lors de la recuperation des signalements: ${message}. Details: ${formatErrorForLog(error)}`
          )
          return
        }

        setLoadError(null)
        setReports(data ?? [])
        saveCachedReports(data ?? [])
      } catch (error) {
        if (isOfflineLikeError(error)) {
          const cachedReports = loadCachedReports()
          setReports(cachedReports)
          setLoadError(
            cachedReports.length > 0
              ? "Mode hors ligne : dernier état disponible."
              : "Mode hors ligne : aucun signalement en cache."
          )
        } else {
          const message = normalizeErrorMessage(error)
          setLoadError(message)
          console.warn(
            `Erreur lors de la recuperation des signalements: ${message}. Details: ${formatErrorForLog(error)}`
          )
        }
      }
    }

    void fetchReports()

    const channel = supabase
      .channel("reports-map")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports" },
        () => {
          void fetchReports()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  const filteredReports = useMemo(
    () =>
      filterReports(reports, {
        query: "",
        typeFilter,
        statusFilter,
      }).filter((report) => isReportVisibleOnMap(report)),
    [reports, statusFilter, typeFilter]
  )
  const isOfflineNotice = loadError?.startsWith("Mode hors ligne") ?? false

  return (
    <MapContainer
      center={FRANCE_CENTER}
      zoom={14}
      style={{ height: "100%", width: "100%", zIndex: 0 }}
      zoomControl={false} // On désactive les boutons + et - par défaut pour une UI plus propre sur mobile
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapViewportController focusCoordinates={focusCoordinates} />
      <MapInteractionController onMapInteract={onMapInteract} />

      {loadError ? (
        <div
          className={`pointer-events-none absolute top-3 left-3 z-[500] max-w-[280px] rounded-2xl px-3 py-2 text-xs shadow-sm ${
            isOfflineNotice
              ? "bg-[#FFFDF2] text-[#5F5A45] ring-1 ring-[#F1E4A6]"
              : "bg-white/95 text-[#7A1C22]"
          }`}
        >
          {isOfflineNotice
            ? loadError
            : `Impossible de charger les signalements pour le moment: ${loadError}`}
        </div>
      ) : null}

      {filteredReports.length === 0 && !loadError ? (
        <div className="pointer-events-none absolute top-3 left-3 z-[500] max-w-[260px] rounded-2xl bg-white/95 px-3 py-2 text-xs text-[#4B5563] shadow-sm">
          Aucun signalement ne correspond aux filtres actuels.
        </div>
      ) : null}

      {filteredReports.map((report) => {
        const metadata = parseStoredReportMetadata(report.description)

        return (
          <Marker
            key={report.id}
            position={[report.lat, report.lng]}
            icon={createMarkerIcon(report.status, report.id === focusedReportId)}
          >
            <Popup>
              <div className="space-y-2 text-sm">
                <div className="space-y-1">
                  <p className="font-semibold text-[#1A1A1A]">{report.type}</p>
                  <p className="text-xs font-medium text-gray-500">
                    {getReportStatusLabel(report.status)}
                  </p>
                </div>
                <p className="line-clamp-2 text-gray-600">
                  {getPrimaryReportText(report.description)}
                </p>
                {metadata.address ? (
                  <p className="text-xs text-gray-500">{metadata.address}</p>
                ) : null}
                <p className="text-xs text-gray-500">
                  {formatReportDate(report.created_at)}
                </p>
                <Link
                  href={`/signalements/${report.id}`}
                  className="inline-flex text-xs font-semibold text-[#E30613]"
                >
                  Voir le détail
                </Link>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
