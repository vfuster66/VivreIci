"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { CircleAlert, Loader2, MapPin, Navigation, Search } from "lucide-react"
import AppTopbar from "@/components/AppTopbar"
import FeedbackBanner from "@/components/FeedbackBanner"
import { trackEvent } from "@/lib/analytics-client"
import { buildDisplayName, getProfileInitials, isAnonymousUser } from "@/lib/profile"
import { triggerReportStatusChangedNotifications } from "@/lib/notifications-client"
import {
  createClient,
  getCurrentSessionUser,
  isSuperadmin,
} from "@/lib/supabase"
import {
  ADDRESS_SEARCH_MIN_CHARS,
  APPROXIMATE_LOCATION_MESSAGE,
  buildStoredDescription,
  formatCompactAddress,
  REPORT_TYPES,
} from "@/lib/report-form"
import {
  ARCHIVED_RETENTION_DAYS,
  REPORT_SELECT_LEGACY,
  REPORT_SELECT_WITH_ARCHIVE,
  REPORT_SELECT_WITH_HISTORY,
  RESOLVED_VISIBILITY_DAYS,
  buildReportTimeline,
  isReportLocked,
  formatReportDate,
  getDisplayReportReference,
  getReportTimelineAccent,
  getPrimaryReportText,
  parseStoredReportMetadata,
  canTransitionReportStatus,
  getAllowedReportStatusTransitions,
  getReportStatusClasses,
  getReportStatusLabel,
  type ReportHistoryRecord,
  type ReportStatus,
  type ReportRecord,
} from "@/lib/reports"

type Coordinates = {
  lat: number
  lng: number
}

type AddressSuggestion = {
  label: string
  lat: number
  lng: number
}

const ABUSE_REASON_OPTIONS = [
  { value: "spam", label: "Spam" },
  { value: "incorrect", label: "Information incorrecte" },
  { value: "abusive", label: "Contenu abusif" },
  { value: "duplicate", label: "Doublon" },
  { value: "other", label: "Autre" },
] as const

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.length > 0
  ) {
    return error.message
  }

  return fallback
}

async function reverseGeocode({ lat, lng }: Coordinates) {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(lat),
    lon: String(lng),
    addressdetails: "1",
  })

  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
    {
      headers: {
        Accept: "application/json",
      },
    }
  )

  if (!response.ok) {
    throw new Error("La recherche d'adresse a échoué.")
  }

  const data = (await response.json()) as {
    address?: {
      house_number?: string
      road?: string
      postcode?: string
      city?: string
      town?: string
      village?: string
      municipality?: string
    }
  }

  return formatCompactAddress(data.address)
}

async function geocodeAddress(query: string) {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1",
    countrycodes: "fr",
    addressdetails: "1",
  })

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      headers: {
        Accept: "application/json",
      },
    }
  )

  if (!response.ok) {
    throw new Error("La recherche d'adresse a échoué.")
  }

  const data = (await response.json()) as Array<{
    lat: string
    lon: string
    address?: {
      house_number?: string
      road?: string
      postcode?: string
      city?: string
      town?: string
      village?: string
      municipality?: string
    }
  }>

  return data.map((item) => ({
    label: formatCompactAddress(item.address),
    lat: Number(item.lat),
    lng: Number(item.lon),
  }))
}

export default function SignalementDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const addressAbortRef = useRef<AbortController | null>(null)
  const reportId = useMemo(() => params?.id ?? "", [params])
  const supabase = useMemo(() => createClient(), [])
  const detailBackHref = useMemo(() => {
    const source = searchParams.get("from")

    if (source === "map" || source === "new") {
      return "/signalements?view=map"
    }

    if (source === "profile") {
      return "/profil"
    }

    return "/signalements?view=list"
  }, [searchParams])
  const [report, setReport] = useState<ReportRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [historySupported, setHistorySupported] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isViewerSuperadmin, setIsViewerSuperadmin] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [formType, setFormType] = useState(REPORT_TYPES[0])
  const [formStatus, setFormStatus] = useState<ReportStatus>("open")
  const [formDescription, setFormDescription] = useState("")
  const [formAddress, setFormAddress] = useState("")
  const [formCoordinates, setFormCoordinates] = useState<Coordinates | null>(null)
  const [addressSuggestions, setAddressSuggestions] = useState<
    AddressSuggestion[]
  >([])
  const [isSearchingAddress, setIsSearchingAddress] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [locationMessage, setLocationMessage] = useState("")
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null)
  const [reportHistory, setReportHistory] = useState<ReportHistoryRecord[]>([])
  const [historyLoadError, setHistoryLoadError] = useState<string | null>(null)
  const [creatorName, setCreatorName] = useState<string | null>(null)
  const [creatorAvatarUrl, setCreatorAvatarUrl] = useState<string | null>(null)
  const [reportMedia, setReportMedia] = useState<
    Array<{ kind: "image" | "video"; url: string }>
  >([])
  const [abuseReason, setAbuseReason] =
    useState<(typeof ABUSE_REASON_OPTIONS)[number]["value"]>("spam")
  const [abuseDetails, setAbuseDetails] = useState("")
  const [abuseFeedback, setAbuseFeedback] = useState<string | null>(null)
  const [isSubmittingAbuse, setIsSubmittingAbuse] = useState(false)

  useEffect(() => {
    if (!reportId) {
      return
    }

    void trackEvent("report_detail_opened", {
      metadata: {
        reportId,
      },
    })
  }, [reportId])

  useEffect(() => {
    async function fetchViewerPermissions() {
      try {
        const currentUser = await getCurrentSessionUser(supabase)
        setCurrentUserId(currentUser?.id ?? null)

        if (!currentUser) {
          setIsViewerSuperadmin(false)
          return
        }

        const admin = await isSuperadmin(supabase, currentUser)
        setIsViewerSuperadmin(admin)
      } catch {
        setCurrentUserId(null)
        setIsViewerSuperadmin(false)
      }
    }

    fetchViewerPermissions()
  }, [supabase])

  useEffect(() => {
    if (!reportId) {
      setLoadError("Identifiant de signalement invalide.")
      setIsLoading(false)
      return
    }

    async function fetchReport() {
      try {
        const archivedQuery = await supabase
          .from("reports")
          .select(REPORT_SELECT_WITH_ARCHIVE)
          .eq("id", reportId)
          .is("deleted_at", null)
          .single()

        if (!archivedQuery.error) {
          setReport(archivedQuery.data)
          setHistorySupported(true)
          setLoadError(null)
          return
        }

        const historyQuery = await supabase
          .from("reports")
          .select(REPORT_SELECT_WITH_HISTORY)
          .eq("id", reportId)
          .is("deleted_at", null)
          .single()

        if (!historyQuery.error) {
          setReport(historyQuery.data)
          setHistorySupported(true)
          setLoadError(null)
          return
        }

        const legacyQuery = await supabase
          .from("reports")
          .select(REPORT_SELECT_LEGACY)
          .eq("id", reportId)
          .is("deleted_at", null)
          .single()

        if (legacyQuery.error) {
          throw legacyQuery.error
        }

        setReport(legacyQuery.data)
        setHistorySupported(false)
        setLoadError(null)
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Impossible de charger ce signalement."
        )
      } finally {
        setIsLoading(false)
      }
    }

    fetchReport()
  }, [reportId, supabase])

  useEffect(() => {
    if (!report) {
      return
    }

    const metadata = parseStoredReportMetadata(report.description)
    setFormType(report.type)
    setFormStatus((report.status as ReportStatus) ?? "open")
    setFormDescription(getPrimaryReportText(report.description))
    setFormAddress(metadata.address ?? "")
    setFormCoordinates({ lat: report.lat, lng: report.lng })
  }, [report])

  useEffect(() => {
    const trimmedAddress = formAddress.trim()

    if (
      !isEditing ||
      trimmedAddress.length < ADDRESS_SEARCH_MIN_CHARS
    ) {
      setAddressSuggestions([])
      setIsSearchingAddress(false)
      return
    }

    const timeoutId = window.setTimeout(async () => {
      addressAbortRef.current?.abort()
      const controller = new AbortController()
      addressAbortRef.current = controller
      setIsSearchingAddress(true)

      try {
        const suggestions = await geocodeAddress(trimmedAddress)
        setAddressSuggestions(suggestions.filter((item) => item.label))
      } catch (error) {
        if ((error as DOMException).name !== "AbortError") {
          setAddressSuggestions([])
          setLocationMessage("Impossible de proposer des adresses pour le moment.")
        }
      } finally {
        setIsSearchingAddress(false)
      }
    }, 300)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [formAddress, isEditing])

  useEffect(() => {
    const reportUserId = report?.user_id

    if (!reportUserId) {
      setCreatorName("Utilisateur VivreIci")
      setCreatorAvatarUrl(null)
      return
    }

    async function fetchCreatorProfile() {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("display_name, first_name, last_name, avatar_url")
          .eq("id", reportUserId)
          .maybeSingle()

        if (error) {
          throw error
        }

        if (!data) {
          setCreatorName("Utilisateur VivreIci")
          setCreatorAvatarUrl(null)
          return
        }

        setCreatorName(buildDisplayName(data))
        setCreatorAvatarUrl(data.avatar_url ?? null)
      } catch {
        setCreatorName("Utilisateur VivreIci")
        setCreatorAvatarUrl(null)
      }
    }

    fetchCreatorProfile()
  }, [report?.user_id, supabase])

  useEffect(() => {
    if (!reportId) {
      setReportMedia([])
      return
    }

    async function fetchReportMedia() {
      try {
        const { data, error } = await supabase
          .from("report_media")
          .select("kind, url, sort_order")
          .eq("report_id", reportId)
          .order("sort_order", { ascending: true })

        if (error) {
          throw error
        }

        setReportMedia((data ?? []).map((media) => ({
          kind: media.kind as "image" | "video",
          url: media.url,
        })))
      } catch {
        setReportMedia([])
      }
    }

    fetchReportMedia()
  }, [reportId, supabase])

  useEffect(() => {
    if (!reportId) {
      setReportHistory([])
      setHistoryLoadError(null)
      return
    }

    async function fetchReportHistory() {
      try {
        const { data, error } = await supabase
          .from("report_history")
          .select("id, action, snapshot, created_at")
          .eq("report_id", reportId)
          .order("created_at", { ascending: false })

        if (error) {
          throw error
        }

        setReportHistory(
          (data ?? []).map((entry) => ({
            id: entry.id,
            action: entry.action as "update" | "delete",
            snapshot: (entry.snapshot ?? {}) as Partial<ReportRecord>,
            created_at: entry.created_at,
          }))
        )
        setHistoryLoadError(null)
      } catch (error) {
        setReportHistory([])
        setHistoryLoadError(
          error instanceof Error ? error.message : "Historique indisponible."
        )
      }
    }

    void fetchReportHistory()
  }, [reportId, supabase])

  const canManage = Boolean(
    report &&
      ((report.user_id && currentUserId && report.user_id === currentUserId) ||
        isViewerSuperadmin)
  )
  const canDelete = Boolean(report && isViewerSuperadmin)
  const canReportAbuse = Boolean(
    report &&
      currentUserId &&
      report.user_id !== currentUserId &&
      !isViewerSuperadmin
  )
  const isLocked = report ? isReportLocked(report) : false
  const canEditDetails = canManage && !isLocked
  const availableStatusTransitions = report
    ? getAllowedReportStatusTransitions(report.status)
    : []
  const timelineEvents = report ? buildReportTimeline(report, reportHistory) : []

  const handleSave = async () => {
    if (!report) {
      return
    }

    if (isReportLocked(report)) {
      setLoadError("Un signalement archivé ne peut plus être modifié.")
      return
    }

    if (!canTransitionReportStatus(report.status, formStatus)) {
      setLoadError("Transition de statut non autorisée.")
      return
    }

    setIsSaving(true)
    setLoadError(null)

    try {
      let nextCoordinates = formCoordinates

      if (!nextCoordinates && formAddress.trim()) {
        const [firstSuggestion] = await geocodeAddress(formAddress.trim())
        nextCoordinates = firstSuggestion
          ? { lat: firstSuggestion.lat, lng: firstSuggestion.lng }
          : null
      }

      const mediaUrls = parseStoredReportMetadata(report.description).mediaUrls
      const nextDescription = buildStoredDescription({
        description: formDescription,
        address: formAddress,
        mediaUrls,
      })

      const { data, error } = await supabase
        .from("reports")
        .update({
          type: formType,
          status: formStatus,
          archived_at: formStatus === "archived" ? new Date().toISOString() : null,
          description: nextDescription || null,
          lat: nextCoordinates?.lat ?? report.lat,
          lng: nextCoordinates?.lng ?? report.lng,
        })
        .eq("id", report.id)
        .is("deleted_at", null)
        .select(REPORT_SELECT_WITH_ARCHIVE)
        .single()

      let nextData = data as Partial<ReportRecord> | null
      let nextError = error

      if (nextError) {
        const fallbackUpdate = await supabase
          .from("reports")
          .update({
            type: formType,
            status: formStatus,
            description: nextDescription || null,
            lat: nextCoordinates?.lat ?? report.lat,
            lng: nextCoordinates?.lng ?? report.lng,
          })
          .eq("id", report.id)
          .is("deleted_at", null)
          .select(REPORT_SELECT_WITH_HISTORY)
          .single()

        nextData = fallbackUpdate.data as Partial<ReportRecord> | null
        nextError = fallbackUpdate.error
      }

      if (nextError || !nextData) {
        throw nextError
      }

      setReport((current) => {
        if (!current) {
          return null
        }

        return {
          ...current,
          ...nextData,
          archived_at:
            "archived_at" in nextData ? nextData.archived_at ?? null : current.archived_at ?? null,
          updated_at: historySupported ? new Date().toISOString() : current.updated_at ?? null,
        }
      })
      if (nextCoordinates) {
        setFormCoordinates(nextCoordinates)
      }
      setStatusFeedback("Signalement mis à jour.")
      setIsEditing(false)
    } catch (error) {
      setLoadError(getErrorMessage(error, "Impossible de modifier ce signalement."))
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusUpdate = async (nextStatus: ReportStatus) => {
    if (!report) {
      return
    }

    if (isReportLocked(report)) {
      setLoadError("Un signalement archivé ne peut plus être modifié.")
      return
    }

    if (!canTransitionReportStatus(report.status, nextStatus)) {
      setLoadError("Transition de statut non autorisée.")
      return
    }

    setIsUpdatingStatus(true)
    setLoadError(null)
    setStatusFeedback(null)

    try {
      const { data, error } = await supabase
        .from("reports")
        .update({
          status: nextStatus,
          archived_at: nextStatus === "archived" ? new Date().toISOString() : null,
        })
        .eq("id", report.id)
        .is("deleted_at", null)
        .select(REPORT_SELECT_WITH_ARCHIVE)
        .single()

      let nextData = data as Partial<ReportRecord> | null
      let nextError = error

      if (nextError) {
        const fallbackUpdate = await supabase
          .from("reports")
          .update({
            status: nextStatus,
          })
          .eq("id", report.id)
          .is("deleted_at", null)
          .select(REPORT_SELECT_WITH_HISTORY)
          .single()

        nextData = fallbackUpdate.data as Partial<ReportRecord> | null
        nextError = fallbackUpdate.error
      }

      if (nextError || !nextData) {
        throw nextError
      }

      setReport((current) => {
        if (!current) {
          return null
        }

        return {
          ...current,
          ...nextData,
          archived_at:
            "archived_at" in nextData
              ? nextData.archived_at ?? null
              : nextStatus === "archived"
                ? current.archived_at ?? new Date().toISOString()
                : null,
        }
      })
      setFormStatus(nextStatus)

      try {
        await triggerReportStatusChangedNotifications({
          reportId: report.id,
          nextStatus,
        })
      } catch {
        // Les notifications ne doivent pas bloquer la mise à jour du statut.
      }

      setStatusFeedback(
        nextStatus === "archived"
          ? "Signalement archivé."
          : "Statut mis à jour."
      )
      router.refresh()
    } catch (error) {
      setLoadError(getErrorMessage(error, "Impossible de mettre à jour le statut."))
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleUseGeolocation = () => {
    if (!("geolocation" in navigator)) {
      setLocationMessage(APPROXIMATE_LOCATION_MESSAGE)
      return
    }

    setIsLocating(true)
    setLocationMessage("")

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }

        setFormCoordinates(coordinates)
        try {
          const resolvedAddress = await reverseGeocode(coordinates)
          if (resolvedAddress) {
            setFormAddress(resolvedAddress)
          }
        } catch {
          // No-op
        }

        setLocationMessage("Position récupérée depuis votre appareil.")
        setIsLocating(false)
      },
      () => {
        setLocationMessage(APPROXIMATE_LOCATION_MESSAGE)
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const handleSelectAddressSuggestion = (suggestion: AddressSuggestion) => {
    setFormAddress(suggestion.label)
    setFormCoordinates({ lat: suggestion.lat, lng: suggestion.lng })
    setAddressSuggestions([])
    setLocationMessage("Adresse sélectionnée manuellement.")
  }

  const handleDelete = async () => {
    if (!report) {
      return
    }

    if (!isViewerSuperadmin) {
      setLoadError("Seul un administrateur peut supprimer ce signalement.")
      return
    }

    if (!historySupported) {
      setLoadError(
        "La suppression avec historique nécessite la migration Supabase la plus récente."
      )
      return
    }

    const confirmed = window.confirm(
      "Supprimer ce signalement ? Il sera retiré de la liste, tout en conservant un historique."
    )

    if (!confirmed) {
      return
    }

    setIsDeleting(true)
    setLoadError(null)

    try {
      const { error } = await supabase
        .from("reports")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", report.id)
        .is("deleted_at", null)

      if (error) {
        throw error
      }

      router.push("/signalements")
      router.refresh()
    } catch (error) {
      setLoadError(getErrorMessage(error, "Impossible de supprimer ce signalement."))
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSubmitAbuseFlag = async () => {
    if (!report) {
      return
    }

    setAbuseFeedback(null)
    setLoadError(null)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user || isAnonymousUser(session.user)) {
      setAbuseFeedback("Connectez-vous pour signaler ce contenu.")
      return
    }

    setIsSubmittingAbuse(true)

    try {
      const { error } = await supabase.from("report_abuse_flags").upsert(
        {
          report_id: report.id,
          user_id: session.user.id,
          reason: abuseReason,
          details: abuseDetails.trim() || null,
        },
        { onConflict: "report_id,user_id" }
      )

      if (error) {
        throw error
      }

      setAbuseFeedback("Merci. Ce signalement a bien été transmis à l'équipe de modération.")
      setAbuseDetails("")
    } catch (error) {
      setAbuseFeedback(
        getErrorMessage(
          error,
          "Le signalement n'a pas pu être envoyé pour le moment."
        )
      )
    } finally {
      setIsSubmittingAbuse(false)
    }
  }

  return (
    <div className="min-h-screen bg-white pb-6">
      <AppTopbar title={report?.type ?? "Détail"} backHref={detailBackHref} />

      <div className="mx-auto max-w-md space-y-4 px-4 pt-4">

        {isLoading ? (
          <div className="py-6 text-sm text-[#666666]">
            Chargement du signalement...
          </div>
        ) : loadError ? (
          <FeedbackBanner variant="error" className="py-6">
            Impossible de charger ce signalement : {loadError}
          </FeedbackBanner>
        ) : !report ? (
          <div className="py-6 text-sm text-[#666666]">
            Signalement introuvable.
          </div>
        ) : (
          <div className="space-y-5 py-1">
            {(() => {
              const fallbackMedia = parseStoredReportMetadata(report.description).mediaUrls.map(
                (url) => ({
                  kind: url.match(/\.(mp4|mov|webm)(\?|$)/i)
                    ? ("video" as const)
                    : ("image" as const),
                  url,
                })
              )
              const displayedMedia =
                reportMedia.length > 0
                  ? reportMedia
                  : fallbackMedia.length > 0
                    ? fallbackMedia
                    : report.photo_url
                      ? [{ kind: "image" as const, url: report.photo_url }]
                      : []

              return (
                <>
            <div className="border-b border-gray-100 pb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#D6A100]">
                {getDisplayReportReference(report)}
              </p>
              <div className="mt-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-[#1A1A1A]">
                    {report.type}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Créé le {formatReportDate(report.created_at)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getReportStatusClasses(report.status)}`}
                >
                  {getReportStatusLabel(report.status)}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                {creatorAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={creatorAvatarUrl}
                    alt={creatorName ?? "Créateur du signalement"}
                    className="h-10 w-10 rounded-full object-cover ring-1 ring-gray-200"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF7D6] text-xs font-semibold text-[#D6A100]">
                    {getProfileInitials(
                      {
                        display_name: creatorName,
                        first_name: null,
                        last_name: null,
                      },
                      creatorName ?? "Utilisateur"
                    )}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                    Créé par
                  </p>
                  <p className="truncate text-sm font-medium text-[#1A1A1A]">
                    {creatorName ?? "Utilisateur VivreIci"}
                  </p>
                </div>
              </div>
              {report.updated_at && report.updated_at !== report.created_at ? (
                <p className="mt-2 text-xs text-gray-400">
                  Modifié le {formatReportDate(report.updated_at)}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[22px] bg-[#FBFBFB] px-4 py-3 ring-1 ring-gray-100">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                  Créé le
                </p>
                <p className="mt-1 text-sm font-medium text-[#1A1A1A]">
                  {formatReportDate(report.created_at)}
                </p>
              </div>
              <div className="rounded-[22px] bg-[#FBFBFB] px-4 py-3 ring-1 ring-gray-100">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                  Dernière évolution
                </p>
                <p className="mt-1 text-sm font-medium text-[#1A1A1A]">
                  {formatReportDate(report.updated_at ?? report.created_at)}
                </p>
              </div>
            </div>

            {statusFeedback ? (
              <FeedbackBanner variant="success" className="text-sm font-medium">
                {statusFeedback}
              </FeedbackBanner>
            ) : null}

            <div className="space-y-3 rounded-[24px] bg-[#FBFBFB] p-4 ring-1 ring-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#1A1A1A]">
                    Statut du signalement
                  </p>
                  <p className="text-sm leading-6 text-gray-500">
                    Suivez l&apos;avancement du traitement depuis cette fiche.
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getReportStatusClasses(report.status)}`}
                >
                  {getReportStatusLabel(report.status)}
                </span>
              </div>

              {report.status === "resolved" && report.updated_at ? (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">
                    Résolu le {formatReportDate(report.updated_at)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Reste visible sur la carte pendant {RESOLVED_VISIBILITY_DAYS} jours, puis passe automatiquement en archive.
                  </p>
                </div>
              ) : null}

              {report.status === "archived" ? (
                <p className="text-xs text-gray-500">
                  Archivé le {formatReportDate(report.archived_at ?? report.updated_at ?? report.created_at)}
                </p>
              ) : null}

              {report.status === "archived" ? (
                <div className="rounded-2xl bg-[#F3F4F6] px-4 py-3 text-sm text-[#4B5563]">
                  Ce signalement est archivé. Il reste consultable mais ne peut plus être modifié.
                </div>
              ) : canManage ? (
                <div className="flex gap-3">
                  <label htmlFor="report-status" className="sr-only">
                    Statut du signalement
                  </label>
                  <select
                    id="report-status"
                    value={formStatus}
                    onChange={(event) =>
                      setFormStatus(event.target.value as ReportStatus)
                    }
                    className="min-h-11 flex-1 rounded-2xl bg-white px-3 py-3 text-sm font-medium outline-none ring-1 ring-gray-200"
                  >
                    <option value={report.status ?? "open"}>
                      {getReportStatusLabel(report.status)}
                    </option>
                    {availableStatusTransitions.map((status) => (
                      <option key={status} value={status}>
                        {getReportStatusLabel(status)}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={
                      isUpdatingStatus ||
                      formStatus === report.status ||
                      availableStatusTransitions.length === 0
                    }
                    onClick={() => void handleStatusUpdate(formStatus)}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#E30613] px-4 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {isUpdatingStatus ? "Mise à jour..." : "Mettre à jour"}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  Seul le créateur du signalement ou un superadmin peut modifier le statut.
                </p>
              )}
            </div>

            {canEditDetails ? (
              <div className="space-y-3 rounded-[24px] bg-[#FBFBFB] p-4 ring-1 ring-gray-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">
                      Éditer la fiche
                    </p>
                    <p className="text-sm leading-6 text-gray-500">
                      Ajustez le type, la description ou la localisation si besoin.
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getReportStatusClasses(report.status)}`}
                  >
                    {getReportStatusLabel(report.status)}
                  </span>
                </div>

                <p className="text-xs text-gray-500">
                  Le statut se met à jour dans le bloc ci-dessus.
                </p>
              </div>
            ) : null}

            {canManage ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing((current) => !current)}
                  disabled={isLocked}
                  className="inline-flex h-11 items-center rounded-full bg-[#FFF7D6] px-4 text-sm font-semibold text-[#D6A100]"
                >
                  {isEditing ? "Annuler" : "Modifier"}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting || !historySupported || !canDelete}
                  className="inline-flex h-11 items-center rounded-full bg-[#F5F5F5] px-4 text-sm font-semibold text-[#1A1A1A] disabled:opacity-60"
                >
                  {isDeleting ? "Suppression..." : "Supprimer"}
                </button>
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                Seul le créateur peut modifier cette fiche. La suppression est réservée aux administrateurs.
              </p>
            )}

            {canManage && !canDelete ? (
              <p className="text-xs text-gray-500">
                La suppression est réservée aux administrateurs. Vous pouvez encore modifier ou archiver ce signalement.
              </p>
            ) : null}

            {!historySupported ? (
              <p className="text-xs text-gray-500">
                L&apos;historique complet n&apos;est pas encore activé dans la
                base. La consultation reste disponible.
              </p>
            ) : null}

            {report.expires_at && report.status !== "open" && report.status !== "in_progress" ? (
              <p className="text-xs text-gray-500">
                Archivage conservé {ARCHIVED_RETENTION_DAYS} jours, puis nettoyage automatique prévu le {formatReportDate(report.expires_at)}.
              </p>
            ) : null}

            {canReportAbuse ? (
              <div className="space-y-3 rounded-[24px] bg-[#FBFBFB] p-4 ring-1 ring-gray-100">
                <div className="flex items-start gap-3">
                  <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#B42318]" />
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">
                      Signaler un abus
                    </p>
                    <p className="text-sm leading-6 text-gray-500">
                      En cas de spam, d&apos;erreur manifeste ou de contenu abusif.
                    </p>
                  </div>
                </div>

                <label htmlFor="report-abuse-reason" className="sr-only">
                  Motif du signalement d&apos;abus
                </label>
                <select
                  id="report-abuse-reason"
                  value={abuseReason}
                  onChange={(event) =>
                    setAbuseReason(
                      event.target.value as (typeof ABUSE_REASON_OPTIONS)[number]["value"]
                    )
                  }
                  className="w-full rounded-2xl bg-white px-3 py-3 text-sm outline-none ring-1 ring-gray-200"
                >
                  {ABUSE_REASON_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <label htmlFor="report-abuse-details" className="sr-only">
                  Détails du signalement d&apos;abus
                </label>
                <textarea
                  id="report-abuse-details"
                  value={abuseDetails}
                  onChange={(event) => setAbuseDetails(event.target.value)}
                  rows={3}
                  placeholder="Précisez si besoin en une phrase."
                  className="w-full resize-none rounded-2xl bg-white px-3 py-3 text-sm outline-none ring-1 ring-gray-200"
                />

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void handleSubmitAbuseFlag()}
                    disabled={isSubmittingAbuse}
                    className="inline-flex h-11 items-center rounded-full bg-[#1A1A1A] px-4 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {isSubmittingAbuse ? "Envoi..." : "Signaler"}
                  </button>
                  {abuseFeedback ? (
                    <p className="text-xs text-gray-500" role="status" aria-live="polite">
                      {abuseFeedback}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {isEditing && canEditDetails ? (
              <div className="space-y-4 border-b border-gray-100 pb-5">
                <label htmlFor="report-type" className="sr-only">
                  Type de problème
                </label>
                <select
                  id="report-type"
                  value={formType}
                  onChange={(event) => setFormType(event.target.value)}
                  className="w-full rounded-2xl bg-[#F8F8F8] px-3 py-3 text-sm font-medium outline-none"
                >
                  {REPORT_TYPES.map((reportType) => (
                    <option key={reportType} value={reportType}>
                      {reportType}
                    </option>
                  ))}
                </select>

                <div className="space-y-3 rounded-2xl bg-[#F8F8F8] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-[#1A1A1A]">
                      Localisation
                    </p>
                    <button
                      type="button"
                      onClick={handleUseGeolocation}
                      disabled={isLocating}
                      className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-3 text-sm font-semibold text-[#1A1A1A] ring-1 ring-gray-200 disabled:opacity-60"
                    >
                      {isLocating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Localisation...
                        </>
                      ) : (
                        <>
                          <Navigation className="h-4 w-4" />
                          Utiliser ma position
                        </>
                      )}
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Search className="h-4 w-4 text-gray-400" />
                      <input
                        id="report-address"
                        value={formAddress}
                        onChange={(event) => {
                          setFormAddress(event.target.value)
                          setFormCoordinates(null)
                          setLocationMessage("")
                        }}
                        aria-label="Entrer une adresse ou un lieu"
                        placeholder="Entrer une adresse ou un lieu"
                        className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                      />
                    </div>

                    {(isSearchingAddress || addressSuggestions.length > 0) && (
                      <div className="border-t border-gray-100 px-2 py-2">
                        {isSearchingAddress ? (
                          <div className="flex items-center gap-2 px-2 py-2 text-sm text-gray-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Recherche d&apos;adresses...
                          </div>
                        ) : (
                          addressSuggestions.map((suggestion) => (
                            <button
                              key={`${suggestion.lat}-${suggestion.lng}-${suggestion.label}`}
                              type="button"
                              onClick={() => handleSelectAddressSuggestion(suggestion)}
                              className="block w-full rounded-xl px-3 py-2 text-left text-sm text-[#1A1A1A] transition hover:bg-[#F8F8F8]"
                            >
                              {suggestion.label}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {formCoordinates ? (
                    <p className="text-xs text-gray-500">
                      Coordonnées retenues : {formCoordinates.lat.toFixed(5)},{" "}
                      {formCoordinates.lng.toFixed(5)}
                    </p>
                  ) : null}
                  {locationMessage ? (
                    <p className="text-xs text-gray-500">{locationMessage}</p>
                  ) : null}
                </div>

                <label htmlFor="report-description" className="sr-only">
                  Description du signalement
                </label>
                <textarea
                  id="report-description"
                  value={formDescription}
                  onChange={(event) => setFormDescription(event.target.value)}
                  rows={5}
                  className="w-full rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm outline-none"
                />

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex h-12 items-center rounded-full bg-[#fac411] px-5 text-sm font-semibold text-[#1A1A1A] disabled:opacity-60"
                >
                  {isSaving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-[#1A1A1A]">Description</p>
                <p className="text-sm leading-7 whitespace-pre-wrap text-[#1A1A1A]">
                  {getPrimaryReportText(report.description)}
                </p>
              </div>
            )}

            {displayedMedia.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-[#1A1A1A]">Médias</p>
                <div className="grid grid-cols-1 gap-3">
                  {displayedMedia.map((media) =>
                    media.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={media.url}
                        src={media.url}
                        alt={report.type}
                        className="h-56 w-full rounded-[24px] object-cover"
                      />
                    ) : (
                      <video
                        key={media.url}
                        src={media.url}
                        className="h-56 w-full rounded-[24px] object-cover"
                        controls
                      />
                    )
                  )}
                </div>
              </div>
            ) : null}

            <div className="space-y-3 border-t border-gray-100 pt-4">
              <p className="text-sm font-medium text-[#1A1A1A]">Signalement complet</p>
              <p className="text-sm leading-7 whitespace-pre-wrap text-[#666666]">
                {report.description || "Aucune description fournie."}
              </p>
            </div>

            <div className="space-y-4 border-t border-gray-100 pt-4">
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]">Historique</p>
                <p className="mt-1 text-sm leading-6 text-gray-500">
                  Suivez les étapes clés de ce signalement dans le temps.
                </p>
              </div>

              {historyLoadError ? (
                <div className="rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm text-gray-500">
                  Historique indisponible pour le moment.
                </div>
              ) : (
                <div className="space-y-4">
                  {timelineEvents.map((event, index) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="flex w-5 flex-col items-center">
                        <span
                          className={`mt-1 h-3 w-3 rounded-full ${getReportTimelineAccent(event.status)}`}
                        />
                        {index !== timelineEvents.length - 1 ? (
                          <span className="mt-2 h-full w-px bg-gray-200" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1 rounded-[22px] bg-[#FBFBFB] px-4 py-3 ring-1 ring-gray-100">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-[#1A1A1A]">
                            {event.title}
                          </p>
                          <span className="shrink-0 text-xs text-gray-400">
                            {formatReportDate(event.created_at)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-gray-500">
                          {event.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-start gap-3 border-t border-gray-100 pt-4">
              <MapPin className="mt-0.5 h-5 w-5 text-[#D6A100]" />
              <div className="min-w-0">
                <p className="font-medium text-[#1A1A1A]">Localisation</p>
                {parseStoredReportMetadata(report.description).address ? (
                  <p className="text-sm text-[#666666]">
                    {parseStoredReportMetadata(report.description).address}
                  </p>
                ) : null}
                <p className="text-sm text-[#666666]">
                  {report.lat.toFixed(5)}, {report.lng.toFixed(5)}
                </p>
              </div>
            </div>
                </>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
