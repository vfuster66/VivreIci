import { REPORT_TYPE_DICTIONARY } from "./report-type-dictionary"

export const REPORT_TYPES = [
  "Voirie",
  "Déchets",
  "Éclairage",
  "Mobilier urbain",
  "Sécurité",
  "Autre",
]

export const DEFAULT_LAT = 42.6805
export const DEFAULT_LNG = 2.9399
export const ADDRESS_SEARCH_MIN_CHARS = 3
export const REPORT_MEDIA_BUCKET = "photos"
export const MAX_REPORT_MEDIA_COUNT = 6
export const MAX_REPORT_VIDEO_COUNT = 2
export const MAX_REPORT_VIDEO_SIZE_BYTES = 40 * 1024 * 1024
export const APPROXIMATE_LOCATION_MESSAGE =
  "Aucune position précise détectée. Une localisation approximative sera utilisée."

export type ReportMediaKind = "image" | "video"

export type SelectedMediaFile = {
  kind: ReportMediaKind
  file: File
}

export type NominatimAddress = {
  house_number?: string
  road?: string
  postcode?: string
  city?: string
  town?: string
  village?: string
  municipality?: string
}

export type SuggestedReportType = {
  type: string
  score: number
}

export type SuggestedReportTypeResult = {
  primary: SuggestedReportType | null
  alternatives: SuggestedReportType[]
  confidence: "high" | "medium" | "low" | "none"
}

function normalizeReportText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase()
}

export function formatCompactAddress(address?: NominatimAddress | null) {
  if (!address) {
    return ""
  }

  const streetParts = [address.house_number, address.road]
    .map((part) => part?.trim())
    .filter(Boolean)
  const locality = [address.postcode, address.city ?? address.town ?? address.village ?? address.municipality]
    .map((part) => part?.trim())
    .filter(Boolean)

  return [streetParts.join(" "), locality.join(" ")]
    .filter(Boolean)
    .join(", ")
}

export function buildStoredDescription({
  description,
  address,
  mediaUrls,
}: {
  description: string
  address: string
  mediaUrls: string[]
}) {
  const chunks = [description.trim()]

  if (address.trim()) {
    chunks.push(`Adresse indiquée : ${address.trim()}`)
  }

  if (mediaUrls.length > 0) {
    chunks.push(`Médias joints : ${mediaUrls.join(", ")}`)
  }

  return chunks.filter(Boolean).join("\n\n")
}

export function appendSpeechTranscript(
  currentDescription: string,
  transcript: string
) {
  const trimmedTranscript = transcript.trim()

  if (!trimmedTranscript) {
    return currentDescription
  }

  const trimmedDescription = currentDescription.trimEnd()
  const separator = trimmedDescription.length > 0 ? " " : ""
  return `${trimmedDescription}${separator}${trimmedTranscript}`
}

export function shouldSearchAddress(address: string) {
  return address.trim().length >= ADDRESS_SEARCH_MIN_CHARS
}

export function validateMediaSelection(
  selectedFiles: SelectedMediaFile[],
  currentCount: number,
  currentVideoCount: number
) {
  if (currentCount + selectedFiles.length > MAX_REPORT_MEDIA_COUNT) {
    return `Vous pouvez joindre jusqu'à ${MAX_REPORT_MEDIA_COUNT} médias.`
  }

  const nextVideoCount =
    currentVideoCount +
    selectedFiles.filter((media) => media.kind === "video").length

  if (nextVideoCount > MAX_REPORT_VIDEO_COUNT) {
    return `Vous pouvez joindre jusqu'à ${MAX_REPORT_VIDEO_COUNT} vidéos.`
  }

  const tooLargeVideo = selectedFiles.find(
    (media) =>
      media.kind === "video" && media.file.size > MAX_REPORT_VIDEO_SIZE_BYTES
  )

  if (tooLargeVideo) {
    return "Une vidéo dépasse la taille maximale autorisée de 40 Mo."
  }

  return null
}

export function suggestReportType(description: string) {
  return getSuggestedReportTypes(description).primary?.type ?? null
}

export function getSuggestedReportTypes(
  description: string
): SuggestedReportTypeResult {
  const normalizedDescription = normalizeReportText(description)

  if (!normalizedDescription) {
    return {
      primary: null,
      alternatives: [],
      confidence: "none",
    }
  }

  const matches: SuggestedReportType[] = []

  for (const entry of REPORT_TYPE_DICTIONARY) {
    const strongScore = entry.strongSignals.reduce((total, keyword) => {
      const normalizedKeyword = normalizeReportText(keyword)
      return normalizedDescription.includes(normalizedKeyword)
        ? total + normalizedKeyword.split(" ").length + 2
        : total
    }, 0)

    const weakScore = entry.weakSignals.reduce((total, keyword) => {
      const normalizedKeyword = normalizeReportText(keyword)
      return normalizedDescription.includes(normalizedKeyword)
        ? total + 1
        : total
    }, 0)

    const score = strongScore + weakScore

    if (score <= 0) {
      continue
    }

    matches.push({ type: entry.type, score })
  }

  const rankedMatches = matches.sort((first, second) => second.score - first.score)
  const [primary, ...alternatives] = rankedMatches

  if (!primary) {
    return {
      primary: null,
      alternatives: [],
      confidence: "none",
    }
  }

  const nextBestScore = alternatives[0]?.score ?? 0
  const confidence =
    primary.score >= 6
      ? "high"
      : primary.score >= 3 && primary.score >= nextBestScore + 2
        ? "medium"
        : "low"

  return {
    primary,
    alternatives: alternatives.slice(0, 2),
    confidence,
  }
}
