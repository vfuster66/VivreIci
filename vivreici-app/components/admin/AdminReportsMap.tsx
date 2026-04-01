"use client"

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import {
  getReportStatusClasses,
  getReportStatusLabel,
} from "@/lib/reports"
import type { AdminReportRow } from "@/lib/admin-types"

const FRANCE_CENTER: [number, number] = [46.603354, 1.888334]

function getMarkerColor(status: string | null) {
  switch (status) {
    case "open":
      return "#D21C23"
    case "in_progress":
      return "#F59E0B"
    case "resolved":
      return "#16A34A"
    default:
      return "#64748B"
  }
}

function createMarkerIcon(status: string | null) {
  const color = getMarkerColor(status)

  return L.divIcon({
    className: "admin-map-pin",
    html: `
      <div style="position:relative;width:18px;height:18px;">
        <div style="position:absolute;inset:0;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 8px 22px rgba(15,23,42,0.18);"></div>
      </div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  })
}

export default function AdminReportsMap({
  reports,
}: {
  reports: AdminReportRow[]
}) {
  const visibleReports = reports.filter((report) => report.visibleOnMap).slice(0, 120)
  const center =
    visibleReports.length > 0
      ? ([visibleReports[0].lat, visibleReports[0].lng] as [number, number])
      : FRANCE_CENTER

  if (visibleReports.length === 0) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-[28px] border border-dashed border-black/10 bg-white text-sm text-[#6B7280]">
        Aucun signalement visible sur la carte pour ce périmètre.
      </div>
    )
  }

  return (
    <div className="h-[420px] overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {visibleReports.map((report) => (
          <Marker
            key={report.id}
            position={[report.lat, report.lng]}
            icon={createMarkerIcon(report.status)}
          >
            <Popup>
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-[#111827]">{report.reference}</p>
                <p className="text-[#4B5563]">{report.type}</p>
                <p
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getReportStatusClasses(report.status)}`}
                >
                  {getReportStatusLabel(report.status)}
                </p>
                {report.address ? <p>{report.address}</p> : null}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
