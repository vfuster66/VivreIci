"use client"

import dynamic from "next/dynamic"
import type { ReportStatusFilter } from "@/lib/reports"

type HomeMapLoaderProps = {
  reports?: import("@/lib/reports").ReportRecord[]
  typeFilter?: string
  statusFilter?: ReportStatusFilter
  isLoading?: boolean
  focusCoordinates?: {
    lat: number
    lng: number
  } | null
  focusedReportId?: string | null
  onMapInteract?: () => void
}

function getStatusLabel(statusFilter: ReportStatusFilter) {
  switch (statusFilter) {
    case "active":
      return "Actifs"
    case "resolved":
      return "Résolus"
    case "archived":
      return "Archivés"
    case "all":
    default:
      return "Tous"
  }
}

function MapLoadingShell({
  reportsCount = 0,
  statusFilter = "all",
  hasFocusCoordinates = false,
}: {
  reportsCount?: number
  statusFilter?: ReportStatusFilter
  hasFocusCoordinates?: boolean
}) {
  return (
    <div className="flex h-full flex-col bg-[#F5F5F5]">
      <div className="flex-1 px-4 pt-6 pb-5">
        <div className="mx-auto flex h-full max-w-md flex-col justify-between rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8A8A8A]">
              Carte des signalements
            </p>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#1A1A1A]">
                Préparation de la carte
              </h2>
              <p className="text-sm leading-6 text-[#5F5F5F]">
                Chargement des signalements et du fond de carte pour afficher
                une vue mobile plus stable.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#F7F7F7] p-4 ring-1 ring-black/5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A8A8A]">
                Signalements
              </p>
              <p className="mt-2 text-xl font-semibold text-[#1A1A1A]">
                {reportsCount}
              </p>
            </div>
            <div className="rounded-2xl bg-[#F7F7F7] p-4 ring-1 ring-black/5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A8A8A]">
                Filtre
              </p>
              <p className="mt-2 text-xl font-semibold text-[#1A1A1A]">
                {getStatusLabel(statusFilter)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="overflow-hidden rounded-3xl bg-[#EFEFEF]">
              <div className="h-52 w-full animate-pulse bg-[linear-gradient(110deg,#EFEFEF, #F7F7F7 45%, #EFEFEF 55%)] bg-[length:200%_100%]" />
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-[#FFF7D6] px-4 py-3 text-sm text-[#5F5120] ring-1 ring-[#F4E2A1]">
              <span>
                {hasFocusCoordinates
                  ? "Centrage personnalisé en préparation."
                  : "La carte se centre automatiquement dès qu'elle est prête."}
              </span>
              <span className="font-semibold">Chargement...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Ce composant est un "Client Component" qui charge dynamiquement la carte.
// C'est la manière correcte d'utiliser `ssr: false` dans le App Router.
const Map = dynamic(() => import("@/components/MapClient"), {
  ssr: false,
  loading: () => <MapLoadingShell />,
})

export default function HomeMapLoader(props: HomeMapLoaderProps) {
  if (props.isLoading) {
    return (
      <MapLoadingShell
        reportsCount={props.reports?.length ?? 0}
        statusFilter={props.statusFilter}
        hasFocusCoordinates={Boolean(props.focusCoordinates)}
      />
    )
  }

  return <Map {...props} />
}
