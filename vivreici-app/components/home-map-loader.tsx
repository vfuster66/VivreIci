"use client"

import dynamic from "next/dynamic"
import type { ReportStatusFilter } from "@/lib/reports"

type HomeMapLoaderProps = {
  typeFilter?: string
  statusFilter?: ReportStatusFilter
  focusCoordinates?: {
    lat: number
    lng: number
  } | null
  focusedReportId?: string | null
  onMapInteract?: () => void
}

// Ce composant est un "Client Component" qui charge dynamiquement la carte.
// C'est la manière correcte d'utiliser `ssr: false` dans le App Router.
const Map = dynamic(() => import("@/components/MapClient"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[#F5F5F5]">
      <p className="animate-pulse font-medium text-[#666666]">
        Chargement de la carte...
      </p>
    </div>
  ),
})

export default function HomeMapLoader(props: HomeMapLoaderProps) {
  return <Map {...props} />
}
