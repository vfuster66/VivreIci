"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef } from "react"
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
  filterReports,
  formatReportDate,
  getPrimaryReportText,
  getReportStatusLabel,
  isReportVisibleOnMap,
  parseStoredReportMetadata,
  type ReportStatusFilter,
  type ReportRecord,
} from "@/lib/reports"

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

function getMarkerLabel(report: ReportRecord) {
  const statusLabel = getReportStatusLabel(report.status)
  return `${report.type}, statut ${statusLabel}`
}

const FRANCE_CENTER: [number, number] = [46.603354, 1.888334]

type MapClientProps = {
  reports?: ReportRecord[]
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

function AccessibleReportMarker({
  report,
  focused,
}: {
  report: ReportRecord
  focused: boolean
}) {
  const markerRef = useRef<L.Marker | null>(null)
  const metadata = parseStoredReportMetadata(report.description)
  const markerLabel = useMemo(() => getMarkerLabel(report), [report])

  useEffect(() => {
    const element = markerRef.current?.getElement()
    if (!element) {
      return
    }

    element.setAttribute("aria-label", markerLabel)
    element.setAttribute("title", markerLabel)
  }, [markerLabel])

  return (
    <Marker
      ref={markerRef}
      position={[report.lat, report.lng]}
      icon={createMarkerIcon(report.status, focused)}
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
          <p className="text-xs text-gray-500">{formatReportDate(report.created_at)}</p>
          <Link
            href={`/signalements/${report.id}?from=map`}
            className="inline-flex text-xs font-semibold text-[#E30613]"
          >
            Voir le détail
          </Link>
        </div>
      </Popup>
    </Marker>
  )
}

export default function MapClient({
  reports = [],
  typeFilter = "all",
  statusFilter = "all",
  focusCoordinates = null,
  focusedReportId = null,
  onMapInteract,
}: MapClientProps) {
  const filteredReports = useMemo(
    () =>
      filterReports(reports, {
        query: "",
        typeFilter,
        statusFilter,
      }).filter((report) => isReportVisibleOnMap(report)),
    [reports, statusFilter, typeFilter]
  )
  return (
    <MapContainer
      center={FRANCE_CENTER}
      zoom={14}
      style={{ height: "100%", width: "100%", zIndex: 0 }}
      zoomControl={false} // On désactive les boutons + et - par défaut pour une UI plus propre sur mobile
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains={["a", "b", "c", "d"]}
      />
      <MapViewportController focusCoordinates={focusCoordinates} />
      <MapInteractionController onMapInteract={onMapInteract} />

      {filteredReports.length === 0 ? (
        <div className="pointer-events-none absolute top-3 left-3 z-[500] max-w-[260px] rounded-2xl bg-white/95 px-3 py-2 text-xs text-[#4B5563] shadow-sm">
          Aucun signalement ne correspond aux filtres actuels.
        </div>
      ) : null}

      {filteredReports.map((report) => {
        return (
          <AccessibleReportMarker
            key={report.id}
            report={report}
            focused={report.id === focusedReportId}
          />
        )
      })}
    </MapContainer>
  )
}
