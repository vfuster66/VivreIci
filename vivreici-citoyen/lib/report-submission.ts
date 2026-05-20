import type { SupabaseClient } from "@supabase/supabase-js"
import {
  buildStoredDescription,
  REPORT_MEDIA_BUCKET,
  sanitizeFileName,
} from "./report-form"
import { triggerReportCreatedNotifications } from "./notifications-client"
import {
  geocodeAddress,
  PERPIGNAN_WORLD_CENTER,
  type ReportCoordinates,
} from "./report-location"
import { ensureSignedInUser } from "./supabase"
import { buildTerritoryInfo } from "./territory"

export type ReportMediaInput = {
  kind: "image" | "video"
  file: File
}

type UploadedMedia = {
  kind: "image" | "video"
  url: string
  mimeType: string
  fileSize: number
}

export type ReportSubmissionPayload = {
  type: string
  description: string
  address: string
  selectedCoordinates: ReportCoordinates | null
  mediaFiles: ReportMediaInput[]
}

export async function uploadReportMediaFiles(
  supabase: SupabaseClient,
  mediaFiles: ReportMediaInput[],
  onLog?: (message: string) => void
) {
  const uploadedMedia: UploadedMedia[] = []

  for (const media of mediaFiles) {
    const filePath = `reports/${Date.now()}-${sanitizeFileName(media.file.name)}`
    onLog?.(
      `Pré-upload média : name=${media.file.name || "inconnu"}, type=${media.file.type || "inconnu"}, size=${media.file.size || 0}, isFile=${media.file instanceof File}, isBlob=${media.file instanceof Blob}`
    )
    onLog?.(`Upload ${media.kind} : ${media.file.name}`)
    const { error } = await supabase.storage
      .from(REPORT_MEDIA_BUCKET)
      .upload(filePath, media.file)

    if (error) {
      throw error
    }

    const { data } = supabase.storage
      .from(REPORT_MEDIA_BUCKET)
      .getPublicUrl(filePath)

    uploadedMedia.push({
      kind: media.kind,
      url: data.publicUrl,
      mimeType: media.file.type,
      fileSize: media.file.size,
    })
  }

  return uploadedMedia
}

export async function submitReportPayload({
  supabase,
  payload,
  onLog,
}: {
  supabase: SupabaseClient
  payload: ReportSubmissionPayload
  onLog?: (message: string) => void
}) {
  onLog?.("Initialisation de la session Supabase")
  const currentUser = await ensureSignedInUser(supabase)

  let coordinates = payload.selectedCoordinates
  let locationSource: "gps" | "address_geocoded" | "fallback_perpignan" =
    payload.selectedCoordinates ? "gps" : "fallback_perpignan"

  if (!coordinates && payload.address.trim()) {
    onLog?.("Géocodage de l'adresse")
    coordinates = await geocodeAddress(payload.address.trim())
    if (coordinates) {
      locationSource = "address_geocoded"
    }
  }

  if (!coordinates) {
    onLog?.("Aucune position précise, fallback Perpignan")
    coordinates = PERPIGNAN_WORLD_CENTER
    locationSource = "fallback_perpignan"
  }

  onLog?.(`Localisation retenue : ${locationSource}`)
  const uploadedMedia =
    payload.mediaFiles.length > 0
      ? await uploadReportMediaFiles(supabase, payload.mediaFiles, onLog)
      : ([] as UploadedMedia[])

  const finalDescription = buildStoredDescription({
    description: payload.description,
    address: payload.address,
    mediaUrls: [],
  })
  const territory = buildTerritoryInfo(payload.address)

  onLog?.("Insertion du signalement dans reports")
  const { data: insertedReport, error } = await supabase
    .from("reports")
    .insert([
      {
        user_id: currentUser.id,
        type: payload.type,
        description: finalDescription || null,
        address_text: territory.addressText,
        territory_name: territory.territoryName,
        territory_key: territory.territoryKey,
        lat: coordinates.lat,
        lng: coordinates.lng,
        photo_url:
          uploadedMedia.find((media) => media.kind === "image")?.url ?? null,
        status: "open",
      },
    ])
    .select("id")
    .single()

  if (error) {
    throw error
  }

  if (uploadedMedia.length > 0) {
    onLog?.("Insertion des médias dans report_media")
    const { error: mediaInsertError } = await supabase
      .from("report_media")
      .insert(
        uploadedMedia.map((media, index) => ({
          report_id: insertedReport.id,
          kind: media.kind,
          url: media.url,
          mime_type: media.mimeType,
          file_size: media.fileSize,
          sort_order: index,
        }))
      )

    if (mediaInsertError) {
      throw mediaInsertError
    }
  }

  try {
    onLog?.("Déclenchement des notifications liées au signalement")
    await triggerReportCreatedNotifications({
      reportId: insertedReport.id,
    })
  } catch {
    // Les notifications ne doivent pas bloquer la création du signalement.
  }

  return {
    reportId: insertedReport.id,
    coordinates,
    locationSource,
  }
}

export function isLikelyNetworkError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : ""

  return [
    "Failed to fetch",
    "Load failed",
    "NetworkError",
    "fetch failed",
    "ERR_NETWORK",
    "Failed to send a request",
  ].some((pattern) => message.includes(pattern))
}
