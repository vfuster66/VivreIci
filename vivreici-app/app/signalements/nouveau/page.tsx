"use client"

import Link from "next/link"
import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Loader2,
  MapPin,
  Mic,
  MicOff,
  Navigation,
  RefreshCw,
  Search,
  Send,
  Video,
  WandSparkles,
  X,
} from "lucide-react"
import AppTopbar from "@/components/AppTopbar"
import { trackEvent } from "@/lib/analytics-client"
import {
  APPROXIMATE_LOCATION_MESSAGE,
  ADDRESS_SEARCH_MIN_CHARS,
  MAX_REPORT_MEDIA_COUNT,
  MAX_REPORT_VIDEO_COUNT,
  REPORT_TYPES,
  appendSpeechTranscript,
  formatCompactAddress,
  getSuggestedReportTypes,
  validateMediaSelection,
} from "@/lib/report-form"
import {
  enqueueOfflineReport,
  listOfflineReports,
  retryOfflineReport,
  syncOfflineReports,
  subscribeToOfflineReports,
  type OfflineQueuedReport,
} from "@/lib/offline-report-queue"
import {
  loadOfflineReportLogs,
  subscribeToOfflineReportLogs,
  type OfflineReportLogEntry,
} from "@/lib/offline-report-logs"
import {
  reverseGeocode,
  type ReportCoordinates,
} from "@/lib/report-location"
import {
  formatReportDate,
  getDisplayReportReference,
  getPrimaryReportText,
  parseStoredReportMetadata,
  type ReportRecord,
} from "@/lib/reports"
import {
  isLikelyNetworkError,
  submitReportPayload,
  type ReportMediaInput,
} from "@/lib/report-submission"
import { createClient } from "@/lib/supabase"
import { isAnonymousUser } from "@/lib/profile"

type MediaPreview = {
  file: File
  kind: "image" | "video"
  previewUrl: string
}

type AddressSuggestion = {
  label: string
  lat: number
  lng: number
}

type DuplicateCandidate = ReportRecord & {
  distanceMeters: number
}

type SpeechRecognitionAlternative = {
  transcript: string
}

type SpeechRecognitionResult = {
  0: SpeechRecognitionAlternative
  isFinal: boolean
  length: number
}

type SpeechRecognitionEventLike = Event & {
  resultIndex: number
  results: {
    [index: number]: SpeechRecognitionResult
    length: number
  }
}

type SpeechRecognitionInstance = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

type BrowserSpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

type LocationPrecision = "precise" | "approximate"
type PendingReportPayload = {
  type: string
  description: string
  address: string
  selectedCoordinates: ReportCoordinates | null
  mediaFiles: ReportMediaInput[]
}

function calculateDistanceMeters(from: ReportCoordinates, to: ReportCoordinates) {
  const earthRadius = 6371000
  const lat1 = (from.lat * Math.PI) / 180
  const lat2 = (to.lat * Math.PI) / 180
  const deltaLat = ((to.lat - from.lat) * Math.PI) / 180
  const deltaLng = ((to.lng - from.lng) * Math.PI) / 180

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadius * c
}

function getLocationStatusText(
  locationPrecision: LocationPrecision,
  selectedCoordinates: ReportCoordinates | null
) {
  if (selectedCoordinates && locationPrecision === "precise") {
    return "Position détectée automatiquement."
  }

  return APPROXIMATE_LOCATION_MESSAGE
}

function NouveauSignalementPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const addressAbortRef = useRef<AbortController | null>(null)
  const mediaFilesRef = useRef<MediaPreview[]>([])
  const descriptionRef = useRef("")
  const addressRef = useRef("")
  const autoLocateAttemptedRef = useRef(false)
  const hasTrackedStartRef = useRef(false)
  const hasTrackedSuccessRef = useRef(false)
  const quickPhotoInputRef = useRef<HTMLInputElement | null>(null)
  const mediaLibraryInputRef = useRef<HTMLInputElement | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [description, setDescription] = useState("")
  const [address, setAddress] = useState("")
  const [selectedCoordinates, setSelectedCoordinates] =
    useState<ReportCoordinates | null>(null)
  const [addressSuggestions, setAddressSuggestions] = useState<
    AddressSuggestion[]
  >([])
  const [isSearchingAddress, setIsSearchingAddress] = useState(false)
  const [addressMessage, setAddressMessage] = useState("")
  const [locationPrecision, setLocationPrecision] =
    useState<LocationPrecision>("approximate")
  const [mediaFiles, setMediaFiles] = useState<MediaPreview[]>([])
  const [mediaError, setMediaError] = useState("")
  const [submitError, setSubmitError] = useState("")
  const [isPreparingMedia, setIsPreparingMedia] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null)
  const [duplicateReports, setDuplicateReports] = useState<DuplicateCandidate[]>(
    []
  )
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [offlineReports, setOfflineReports] = useState<OfflineQueuedReport[]>([])
  const [submitNotice, setSubmitNotice] = useState("")
  const [isRetryingOfflineReports, setIsRetryingOfflineReports] = useState(false)
  const [selectedOfflineReportIndex, setSelectedOfflineReportIndex] = useState(0)
  const [offlineLogs, setOfflineLogs] = useState<OfflineReportLogEntry[]>([])
  const [showFreshForm, setShowFreshForm] = useState(false)
  const [authRequiredMessage, setAuthRequiredMessage] = useState("")
  const [isAuthenticatedUser, setIsAuthenticatedUser] = useState(false)
  const [lastFailedPayload, setLastFailedPayload] = useState<PendingReportPayload | null>(
    null
  )
  const [lastSubmitAttemptWasUploadFailure, setLastSubmitAttemptWasUploadFailure] =
    useState(false)

  const typeSuggestion = useMemo(
    () => getSuggestedReportTypes(description),
    [description]
  )
  const suggestedType = typeSuggestion.primary?.type ?? null
  const effectiveType = selectedType ?? suggestedType
  const descriptionPreview = useMemo(() => {
    const firstLine = description
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean)

    if (!firstLine) {
      return null
    }

    return firstLine.length > 72 ? `${firstLine.slice(0, 72).trim()}...` : firstLine
  }, [description])
  const photoCount = useMemo(
    () => mediaFiles.filter((media) => media.kind === "image").length,
    [mediaFiles]
  )
  const videoCount = useMemo(
    () => mediaFiles.filter((media) => media.kind === "video").length,
    [mediaFiles]
  )
  const effectiveLocationText = getLocationStatusText(
    locationPrecision,
    selectedCoordinates
  )
  const hasQuickContent =
    description.trim().length > 0 ||
    mediaFiles.length > 0 ||
    Boolean(selectedCoordinates) ||
    address.trim().length > 0
  const recentOfflineReports = offlineReports.slice(0, 3)
  const actionableOfflineReports = offlineReports.filter(
    (report) => report.status === "pending" || report.status === "error"
  )
  const highlightedOfflineReport =
    actionableOfflineReports[selectedOfflineReportIndex] ??
    actionableOfflineReports[0] ??
    null
  const isQueueReviewMode =
    searchParams.get("focus") === "queue" &&
    actionableOfflineReports.length > 0 &&
    !showFreshForm
  const authRedirectHref = `/connexion?next=${encodeURIComponent(
    "/signalements/nouveau"
  )}`

  function trackReportCreationStarted(source: string) {
    if (hasTrackedStartRef.current) {
      return
    }

    hasTrackedStartRef.current = true
    void trackEvent("report_creation_started", {
      metadata: { source },
    })
  }

  useEffect(() => {
    setIsOnline(window.navigator.onLine)
  }, [])

  useEffect(() => {
    async function loadAuthState() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const user = session?.user ?? null
      const isAuthenticated = Boolean(user && !isAnonymousUser(user))

      setIsAuthenticatedUser(isAuthenticated)
      setAuthRequiredMessage(
        isAuthenticated
          ? ""
          : "Vous pouvez préparer votre signalement maintenant, puis vous connecter pour l'envoyer."
      )
    }

    void loadAuthState()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadAuthState()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  useEffect(() => {
    function handleOnlineStatus() {
      setIsOnline(window.navigator.onLine)
    }

    window.addEventListener("online", handleOnlineStatus)
    window.addEventListener("offline", handleOnlineStatus)

    return () => {
      window.removeEventListener("online", handleOnlineStatus)
      window.removeEventListener("offline", handleOnlineStatus)
    }
  }, [])

  useEffect(() => {
    async function loadOfflineReports() {
      const reports = await listOfflineReports().catch(() => [])
      setOfflineReports(reports)
    }

    void loadOfflineReports()

    return subscribeToOfflineReports(() => {
      void loadOfflineReports()
    })
  }, [])

  useEffect(() => {
    function loadLogs() {
      setOfflineLogs(loadOfflineReportLogs(highlightedOfflineReport?.localId ?? null))
    }

    loadLogs()

    return subscribeToOfflineReportLogs(loadLogs)
  }, [highlightedOfflineReport?.localId])

  useEffect(() => {
    if (selectedOfflineReportIndex <= actionableOfflineReports.length - 1) {
      return
    }

    setSelectedOfflineReportIndex(0)
  }, [actionableOfflineReports.length, selectedOfflineReportIndex])

  useEffect(() => {
    const speechWindow = window as BrowserSpeechWindow
    const SpeechRecognitionCtor =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition

    if (!SpeechRecognitionCtor) {
      setSpeechSupported(false)
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = "fr-FR"
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event) => {
      let finalTranscript = ""

      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        if (event.results[index].isFinal) {
          finalTranscript += event.results[index][0].transcript
        }
      }

      if (finalTranscript.trim()) {
        setDescription((currentDescription) =>
          appendSpeechTranscript(currentDescription, finalTranscript)
        )
      }
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    setSpeechSupported(true)

    return () => {
      recognition.stop()
      recognitionRef.current = null
    }
  }, [])

  useEffect(() => {
    mediaFilesRef.current = mediaFiles
  }, [mediaFiles])

  useEffect(() => {
    descriptionRef.current = description
  }, [description])

  useEffect(() => {
    addressRef.current = address
  }, [address])

  useEffect(() => {
    return () => {
      mediaFilesRef.current.forEach((media) => {
        URL.revokeObjectURL(media.previewUrl)
      })
    }
  }, [])

  useEffect(() => {
    return () => {
      if (hasTrackedStartRef.current && !hasTrackedSuccessRef.current) {
        void trackEvent("report_creation_abandoned", {
          metadata: {
            hadDescription: descriptionRef.current.trim().length > 0,
            mediaCount: mediaFilesRef.current.length,
            hadAddress: addressRef.current.trim().length > 0,
          },
          keepalive: true,
        })
      }
    }
  }, [])

  useEffect(() => {
    if (autoLocateAttemptedRef.current) {
      return
    }

    autoLocateAttemptedRef.current = true

    if (!("geolocation" in navigator)) {
      setAddressMessage(APPROXIMATE_LOCATION_MESSAGE)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }

        setSelectedCoordinates(coordinates)
        setLocationPrecision("precise")

        try {
          const reverseAddress = await reverseGeocode(coordinates)
          if (reverseAddress) {
            setAddress(reverseAddress)
          }
        } catch {
          // No-op: the quick flow still works without a resolved address.
        }

        setAddressMessage("Votre position a bien été récupérée.")
      },
      () => {
        setLocationPrecision("approximate")
        setAddressMessage(
          "Nous n'avons pas pu récupérer votre position. Vous pouvez saisir l'adresse manuellement juste en dessous."
        )
      },
      { enableHighAccuracy: true, timeout: 6000 }
    )
  }, [])

  useEffect(() => {
    const trimmedAddress = address.trim()

    if (!advancedOpen || trimmedAddress.length < ADDRESS_SEARCH_MIN_CHARS) {
      setAddressSuggestions([])
      setIsSearchingAddress(false)
      return
    }

    const timeoutId = window.setTimeout(async () => {
      addressAbortRef.current?.abort()
      const controller = new AbortController()
      addressAbortRef.current = controller
      setIsSearchingAddress(true)
      setAddressMessage("")

      try {
        const params = new URLSearchParams({
          q: trimmedAddress,
          format: "jsonv2",
          limit: "5",
          countrycodes: "fr",
          addressdetails: "1",
        })

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?${params.toString()}`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
            },
          }
        )

        if (!response.ok) {
          throw new Error("Recherche d'adresse indisponible.")
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

        setAddressSuggestions(
          data
            .map((item) => ({
              label: formatCompactAddress(item.address),
              lat: Number(item.lat),
              lng: Number(item.lon),
            }))
            .filter((item) => item.label)
        )
      } catch (error) {
        if ((error as DOMException).name !== "AbortError") {
          setAddressMessage(
            "Les suggestions d'adresse sont indisponibles pour le moment. Vous pouvez continuer en saisissant le lieu manuellement."
          )
          setAddressSuggestions([])
        }
      } finally {
        setIsSearchingAddress(false)
      }
    }, 350)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [address, advancedOpen])

  useEffect(() => {
    const currentType = effectiveType

    if (!selectedCoordinates || !currentType) {
      setDuplicateReports([])
      setIsCheckingDuplicates(false)
      return
    }

    let cancelled = false
    const coordinates = selectedCoordinates

    async function checkDuplicates() {
      setIsCheckingDuplicates(true)

      try {
        const recentThreshold = new Date(
          Date.now() - 1000 * 60 * 60 * 24 * 30
        ).toISOString()

        const { data, error } = await supabase
          .from("reports")
          .select(
            "id, user_id, type, status, description, photo_url, created_at, report_number, report_type_number, lat, lng, deleted_at"
          )
          .eq("type", currentType)
          .gte("created_at", recentThreshold)
          .in("status", ["open", "in_progress"])
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(8)

        if (error) {
          throw error
        }

        const nearbyDuplicates = (data ?? [])
          .map((report) => ({
            ...(report as ReportRecord),
            distanceMeters: calculateDistanceMeters(coordinates, {
              lat: report.lat,
              lng: report.lng,
            }),
          }))
          .filter((report) => report.distanceMeters <= 30)
          .sort((first, second) => first.distanceMeters - second.distanceMeters)

        if (!cancelled) {
          setDuplicateReports(nearbyDuplicates)
        }
      } catch {
        if (!cancelled) {
          setDuplicateReports([])
        }
      } finally {
        if (!cancelled) {
          setIsCheckingDuplicates(false)
        }
      }
    }

    void checkDuplicates()

    return () => {
      cancelled = true
    }
  }, [effectiveType, selectedCoordinates, supabase])

  const handleToggleDictation = () => {
    if (!recognitionRef.current) {
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
      return
    }

    setSubmitError("")
    recognitionRef.current.start()
    setIsListening(true)
  }

  async function compressImageFile(file: File) {
    if (!file.type.startsWith("image/")) {
      return file
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return file
    }

    const objectUrl = URL.createObjectURL(file)

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error("Image illisible."))
        img.src = objectUrl
      })

      const maxSide = 1600
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
      const canvas = document.createElement("canvas")
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))

      const context = canvas.getContext("2d")

      if (!context) {
        return file
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height)

      const outputType = file.type === "image/png" ? "image/png" : "image/jpeg"
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, outputType, 0.78)
      })

      if (!blob || blob.size >= file.size) {
        return file
      }

      const nextExtension = outputType === "image/png" ? ".png" : ".jpg"
      const normalizedName = file.name.replace(/\.[^.]+$/, "") || "image"

      return new File([blob], `${normalizedName}${nextExtension}`, {
        type: outputType,
      })
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  }

  const handleMediaSelection = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    trackReportCreationStarted("media")

    const files = Array.from(event.target.files ?? [])

    if (files.length === 0) {
      return
    }

    const selectedMedia = files.map((file) => ({
      file,
      kind: file.type.startsWith("video/")
        ? ("video" as const)
        : ("image" as const),
    }))

    const validationError = validateMediaSelection(
      selectedMedia,
      mediaFiles.length,
      mediaFiles.filter((media) => media.kind === "video").length
    )

    if (validationError) {
      setMediaError(validationError)
      event.target.value = ""
      return
    }

    setIsPreparingMedia(true)
    setMediaError("")
    setSubmitError("")

    try {
      const nextMediaFiles: MediaPreview[] = []

      for (const media of selectedMedia) {
        const nextFile =
          media.kind === "image"
            ? await compressImageFile(media.file)
            : media.file

        nextMediaFiles.push({
          file: nextFile,
          kind: media.kind,
          previewUrl: URL.createObjectURL(nextFile),
        })
      }

      setMediaFiles((currentMediaFiles) => [
        ...currentMediaFiles,
        ...nextMediaFiles,
      ])
      setLastSubmitAttemptWasUploadFailure(false)
      setLastFailedPayload(null)
    } catch (error) {
      setMediaError(
        error instanceof Error
          ? error.message
          : "Ce fichier n'a pas pu être ajouté. Essayez avec un autre média."
      )
    } finally {
      setIsPreparingMedia(false)
    }

    event.target.value = ""
  }

  const removeMedia = (previewUrl: string) => {
    setMediaFiles((currentMediaFiles) => {
      const removedIndex = currentMediaFiles.findIndex(
        (media) => media.previewUrl === previewUrl
      )
      const mediaToRemove = currentMediaFiles.find(
        (media) => media.previewUrl === previewUrl
      )

      if (mediaToRemove) {
        URL.revokeObjectURL(mediaToRemove.previewUrl)
      }

      setSelectedMediaIndex((currentIndex) => {
        if (currentIndex === null || removedIndex === -1) {
          return currentIndex
        }

        if (removedIndex === currentIndex) {
          return null
        }

        if (removedIndex < currentIndex) {
          return currentIndex - 1
        }

        return currentIndex
      })

      return currentMediaFiles.filter(
        (media) => media.previewUrl !== previewUrl
      )
    })
  }

  const selectedMedia =
    selectedMediaIndex !== null ? mediaFiles[selectedMediaIndex] ?? null : null

  const showPreviousMedia = () => {
    setSelectedMediaIndex((currentIndex) => {
      if (currentIndex === null || mediaFiles.length <= 1) {
        return currentIndex
      }

      return currentIndex === 0 ? mediaFiles.length - 1 : currentIndex - 1
    })
  }

  const showNextMedia = () => {
    setSelectedMediaIndex((currentIndex) => {
      if (currentIndex === null || mediaFiles.length <= 1) {
        return currentIndex
      }

      return currentIndex === mediaFiles.length - 1 ? 0 : currentIndex + 1
    })
  }

  const applyCoordinates = async (
    coordinates: ReportCoordinates,
    sourceMessage: string,
    precision: LocationPrecision = "precise"
  ) => {
    setSelectedCoordinates(coordinates)
    setLocationPrecision(precision)

    try {
      const reverseAddress = await reverseGeocode(coordinates)
      if (reverseAddress) {
        setAddress(reverseAddress)
      }
      setAddressMessage(sourceMessage)
    } catch {
      setAddressMessage(sourceMessage)
    }
  }

  const handleUseGeolocation = () => {
    trackReportCreationStarted("location")

    if (!("geolocation" in navigator)) {
      setLocationPrecision("approximate")
      setAddressMessage(APPROXIMATE_LOCATION_MESSAGE)
      return
    }

    setIsLocating(true)
    setAddressMessage("")

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await applyCoordinates(
          {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          "Votre position a bien été mise à jour."
        )
        setIsLocating(false)
      },
      () => {
        setLocationPrecision("approximate")
        setAddressMessage(
          "La localisation n'est pas disponible. Vous pouvez saisir l'adresse manuellement."
        )
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const handleSelectAddressSuggestion = async (suggestion: AddressSuggestion) => {
    setAddress(suggestion.label)
    setAddressSuggestions([])
    await applyCoordinates(
      { lat: suggestion.lat, lng: suggestion.lng },
      "Adresse sélectionnée manuellement."
    )
  }

  const handleConfirmExistingReport = async (reportId: string) => {
    if (!isAuthenticatedUser) {
      setSubmitError("Connectez-vous pour confirmer ce signalement.")
      return
    }

    setIsSubmitting(true)
    setSubmitError("")

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user || isAnonymousUser(session.user)) {
        throw new Error("Connexion requise")
      }
      const { error } = await supabase.from("report_confirmations").upsert(
        [
          {
            report_id: reportId,
            user_id: session.user.id,
          },
        ],
        { onConflict: "report_id,user_id" }
      )

      if (error) {
        throw error
      }

      router.push(`/signalements/${reportId}`)
      router.refresh()
    } catch (error) {
      console.error("Erreur lors de la confirmation du signalement :", error)
      setSubmitError(
        "La confirmation n'a pas pu être envoyée pour le moment. Réessayez dans un instant."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function saveReportOffline(payload: {
    type: string
    description: string
    address: string
    selectedCoordinates: ReportCoordinates | null
    mediaFiles: ReportMediaInput[]
  }) {
    try {
      await enqueueOfflineReport(payload)
      clearForm()
      setSubmitError("")
      setSubmitNotice(
        "Votre signalement a été enregistré sur cet appareil. Il partira automatiquement dès que la connexion reviendra."
      )
      return true
    } catch (error) {
      console.error("Erreur lors du stockage local du signalement :", error)
      setSubmitNotice("")
      setSubmitError(
        "Le brouillon n'a pas pu être enregistré hors ligne sur cet appareil."
      )
      return false
    }
  }

  async function handleRetryOfflineReports() {
    setIsRetryingOfflineReports(true)

    try {
      await syncOfflineReports(supabase)
    } finally {
      setIsRetryingOfflineReports(false)
    }
  }

  async function handleRetryHighlightedOfflineReport() {
    if (!highlightedOfflineReport) {
      return
    }

    setIsRetryingOfflineReports(true)

    try {
      await retryOfflineReport(supabase, highlightedOfflineReport.localId)
    } finally {
      setIsRetryingOfflineReports(false)
    }
  }

  function clearForm() {
    mediaFiles.forEach((media) => {
      URL.revokeObjectURL(media.previewUrl)
    })
    setSelectedType(null)
    setDescription("")
    setAddress("")
    setSelectedCoordinates(null)
    setAddressSuggestions([])
    setLocationPrecision("approximate")
    setMediaFiles([])
    setMediaError("")
    setSubmitError("")
    setDuplicateReports([])
    setSelectedMediaIndex(null)
    setLastFailedPayload(null)
    setLastSubmitAttemptWasUploadFailure(false)
  }

  async function submitPayload(payload: PendingReportPayload) {
    setIsSubmitting(true)
    setSubmitError("")
    setMediaError("")

    try {
      setLastFailedPayload(payload)
      setLastSubmitAttemptWasUploadFailure(false)

      if (!window.navigator.onLine) {
        await saveReportOffline(payload)
        return
      }

      await submitReportPayload({
        supabase,
        payload,
      })

      hasTrackedSuccessRef.current = true
      void trackEvent("report_creation_succeeded", {
        metadata: {
          type: payload.type,
          hasMedia: payload.mediaFiles.length > 0,
          hasAddress: Boolean(payload.address.trim()),
        },
      })

      router.push("/carte")
      router.refresh()
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du signalement :", error)

      if (!window.navigator.onLine || isLikelyNetworkError(error)) {
        await saveReportOffline(payload)
      } else {
        setLastSubmitAttemptWasUploadFailure(true)
        setSubmitError(
          "L'envoi n'a pas abouti. Vous pouvez réessayer maintenant ou ajuster votre signalement."
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isAuthenticatedUser) {
      setSubmitError("Connectez-vous pour envoyer votre signalement.")
      setAuthRequiredMessage(
        "L'envoi est réservé aux utilisateurs connectés. Votre brouillon reste ici en attendant."
      )
      return
    }

    if (description.trim().length === 0 && mediaFiles.length === 0) {
      setSubmitError("Ajoutez au moins une photo ou une courte description.")
      return
    }

    const payload = {
      type: effectiveType ?? "Autre",
      description,
      address,
      selectedCoordinates,
      mediaFiles: mediaFiles.map((media) => ({
        kind: media.kind,
        file: media.file,
      })) satisfies ReportMediaInput[],
    }

    await submitPayload(payload)
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] px-4 pt-20 pb-6">
      <div className="mx-auto max-w-md overflow-hidden rounded-[30px] bg-white shadow-sm">
        <AppTopbar title="Nouveau signalement" backHref="/signalements" />

        <form onSubmit={handleSubmit} className="space-y-4 px-5 pt-5 pb-6">
          {isQueueReviewMode && highlightedOfflineReport ? (
            <section className="space-y-3 rounded-[24px] border border-[#F1E4A6] bg-[#FFFDF2] px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#1A1A1A]">
                    Premier signalement à reprendre
                  </p>
                  <p className="text-sm leading-6 text-[#5F5A45]">
                    {selectedOfflineReportIndex + 1} / {actionableOfflineReports.length}
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#B88A00] ring-1 ring-[#F1E4A6]">
                  {highlightedOfflineReport.status === "error"
                    ? "Erreur"
                    : "En attente"}
                </span>
              </div>

              <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-[#F1E4A6]">
                <p className="text-sm font-semibold text-[#1A1A1A]">
                  {highlightedOfflineReport.type}
                </p>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  {highlightedOfflineReport.description || "Sans description"}
                </p>
                {highlightedOfflineReport.lastError ? (
                  <p className="mt-2 text-xs leading-5 text-[#BE123C]">
                    {highlightedOfflineReport.lastError}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleRetryHighlightedOfflineReport()}
                  disabled={isRetryingOfflineReports || !isOnline}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#d21c23] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${
                      isRetryingOfflineReports ? "animate-spin" : ""
                    }`}
                  />
                  Relancer celui-ci
                </button>

                {actionableOfflineReports.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedOfflineReportIndex((currentIndex) =>
                        currentIndex >= actionableOfflineReports.length - 1
                          ? 0
                          : currentIndex + 1
                      )
                    }
                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-[#1A1A1A] ring-1 ring-gray-200"
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              {offlineLogs.length > 0 ? (
                <div className="space-y-2 rounded-2xl bg-white px-4 py-3 ring-1 ring-[#F1E4A6]">
                  <p className="text-sm font-semibold text-[#1A1A1A]">
                    Logs de reprise
                  </p>
                  <div className="space-y-2">
                    {offlineLogs.slice(0, 6).map((log) => (
                      <div key={log.id} className="text-xs leading-5">
                        <p
                          className={
                            log.level === "error"
                              ? "text-[#BE123C]"
                              : "text-[#5F5A45]"
                          }
                        >
                          {log.message}
                        </p>
                        <p className="text-gray-400">
                          {formatReportDate(log.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setShowFreshForm(true)}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-4 py-3 text-sm font-semibold text-[#1A1A1A] ring-1 ring-gray-200"
              >
                Créer un nouveau signalement
              </button>
            </section>
          ) : null}

          {!isQueueReviewMode ? (
            <section className="space-y-3">
            {!isAuthenticatedUser ? (
              <div className="rounded-[24px] border border-[#F1E4A6] bg-[#FFFDF2] px-4 py-4 text-sm leading-6 text-[#5F5A45]">
                <p className="font-semibold text-[#A77D00]">
                  Connexion requise pour publier
                </p>
                <p className="mt-1">
                  {authRequiredMessage ||
                    "Préparez votre signalement, puis connectez-vous pour l'envoyer."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={authRedirectHref}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#fac411] px-4 py-3 font-semibold text-white"
                  >
                    Se connecter
                  </Link>
                  <Link
                    href={`/inscription?next=${encodeURIComponent("/signalements/nouveau")}`}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-4 py-3 font-semibold text-[#1A1A1A] ring-1 ring-gray-200"
                  >
                    Créer un compte
                  </Link>
                </div>
              </div>
            ) : null}

            {!isOnline ? (
              <div className="rounded-[24px] border border-[#F1E4A6] bg-[#FFFDF2] px-4 py-3.5 text-sm leading-6 text-[#5F5A45]">
                <p className="font-semibold text-[#A77D00]">Mode hors ligne</p>
                <p>
                  Vous pouvez continuer normalement. Le signalement sera gardé sur
                  cet appareil puis envoyé automatiquement au retour du réseau.
                </p>
              </div>
            ) : null}

            <div className="rounded-[24px] bg-[#FBFBFB] p-4 ring-1 ring-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-[#1A1A1A]">
                    Signaler rapidement
                  </p>
                  <p className="text-sm leading-6 text-gray-500">
                    Une photo ou quelques mots suffisent pour commencer.
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => quickPhotoInputRef.current?.click()}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#d21c23] px-4 text-sm font-semibold text-white transition hover:bg-[#b8181e]"
                  >
                    <Camera className="h-4 w-4" />
                    Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => mediaLibraryInputRef.current?.click()}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-[#1A1A1A] ring-1 ring-gray-200 transition hover:bg-[#FAFAFA]"
                  >
                    Importer
                  </button>
                  <input
                    ref={quickPhotoInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={handleMediaSelection}
                    className="hidden"
                  />
                  <input
                    ref={mediaLibraryInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleMediaSelection}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-semibold text-[#1A1A1A]">
                    Décrivez le problème
                  </label>
                  <button
                    type="button"
                    onClick={handleToggleDictation}
                    disabled={!speechSupported}
                    className={`inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition ${
                      isListening
                        ? "bg-[#d21c23] text-white"
                        : "bg-[#FFF7D6] text-[#B88A00] hover:bg-[#FDECA0]"
                    } disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400`}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="h-4 w-4" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4" />
                        Dicter
                      </>
                    )}
                  </button>
                </div>

                <textarea
                  value={description}
                  onChange={(event) => {
                    if (event.target.value.trim()) {
                      trackReportCreationStarted("description")
                    }
                    setDescription(event.target.value)
                  }}
                  placeholder="Ex. nid de poule devant l'école"
                  rows={4}
                  className="w-full resize-none rounded-3xl border border-gray-200 bg-white px-4 py-3.5 text-base leading-6 text-[#1A1A1A] outline-none transition placeholder:text-gray-400 focus:border-[#fac411] focus:ring-2 focus:ring-[#fac411]/25"
                />

                <div className="flex items-start gap-3 rounded-2xl bg-[#FFFBEA] px-4 py-3 text-sm text-[#5F5A45]">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#B88A00]" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p>{effectiveLocationText}</p>
                    {address ? <p className="text-[#1A1A1A]">{address}</p> : null}
                    {addressMessage && addressMessage !== effectiveLocationText ? (
                      <p>{addressMessage}</p>
                    ) : null}
                    {locationPrecision === "approximate" ? (
                      <p className="text-xs text-[#5F5A45]">
                        Si la position ne fonctionne pas, ouvrez les options avancées
                        et saisissez simplement l&apos;adresse.
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={handleUseGeolocation}
                    disabled={isLocating}
                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-white px-3 text-sm font-semibold text-[#1A1A1A] ring-1 ring-[#EAD89D] transition hover:bg-[#FFFDF2] disabled:opacity-60"
                  >
                    {isLocating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Navigation className="h-4 w-4" />
                        <span className="sr-only">Utiliser ma position</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {mediaFiles.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#1A1A1A]">
                    Médias joints
                  </p>
                  <p className="text-xs text-gray-500">
                    {mediaFiles.length}/{MAX_REPORT_MEDIA_COUNT}
                  </p>
                </div>

                <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
                  {mediaFiles.map((media, index) => (
                    <div
                      key={media.previewUrl}
                      className="relative w-28 shrink-0 snap-start overflow-hidden rounded-3xl border border-gray-200 bg-[#FAFAFA]"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedMediaIndex(index)}
                        className="block w-full text-left"
                      >
                        {media.kind === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={media.previewUrl}
                            alt={media.file.name}
                            className="h-28 w-full object-cover"
                          />
                        ) : (
                          <video
                            src={media.previewUrl}
                            className="h-28 w-full object-cover"
                            controls
                          />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => removeMedia(media.previewUrl)}
                        className="absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {hasQuickContent ? (
              <div className="rounded-[24px] border border-[#F1E4A6] bg-[#FFFDF2] px-4 py-3.5">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#A77D00]">
                    <WandSparkles className="h-4 w-4" />
                    Résumé intelligent
                  </div>
                  <p className="text-sm leading-6 text-[#5F5A45]">
                    {typeSuggestion.confidence === "high"
                      ? "Type détecté : "
                      : typeSuggestion.confidence === "medium"
                        ? "Type proposé : "
                      : typeSuggestion.confidence === "low"
                          ? "Type à vérifier : "
                          : "Type : "}
                    <span className="font-semibold text-[#1A1A1A]">
                      {effectiveType ?? "Autre"}
                    </span>
                    {address ? (
                      <>
                        {" · "}
                        <span className="text-[#1A1A1A]">{address}</span>
                      </>
                    ) : null}
                  </p>
                  {typeSuggestion.confidence !== "none" &&
                  typeSuggestion.alternatives.length > 0 ? (
                    <p className="text-sm leading-6 text-[#5F5A45]">
                      Alternatives :{" "}
                      <span className="text-[#1A1A1A]">
                        {typeSuggestion.alternatives
                          .map((alternative) => alternative.type)
                          .join(" · ")}
                      </span>
                    </p>
                  ) : null}
                  {descriptionPreview ? (
                    <p className="text-sm leading-6 text-[#5F5A45]">
                      Description :{" "}
                      <span className="text-[#1A1A1A]">{descriptionPreview}</span>
                    </p>
                  ) : null}
                  {photoCount > 0 || videoCount > 0 ? (
                    <p className="text-sm leading-6 text-[#5F5A45]">
                      Médias :{" "}
                      <span className="text-[#1A1A1A]">
                        {photoCount > 0
                          ? `${photoCount} photo${photoCount > 1 ? "s" : ""}`
                          : "0 photo"}
                        {videoCount > 0
                          ? ` · ${videoCount} vidéo${videoCount > 1 ? "s" : ""}`
                          : ""}
                      </span>
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {isCheckingDuplicates ? (
              <div className="flex items-center gap-2 rounded-2xl border border-[#F1E4A6] bg-[#FFFDF2] px-4 py-3 text-sm text-[#5F5A45]">
                <Loader2 className="h-4 w-4 animate-spin text-[#B88A00]" />
                Recherche de signalements similaires à proximité...
              </div>
            ) : null}

            {duplicateReports.length > 0 ? (
              <div className="space-y-3 rounded-[24px] border border-[#F4C6C8] bg-[#FFF6F6] p-4">
                <div className="flex items-start gap-3">
                  <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#d21c23]" />
                  <div className="space-y-1">
                    <p className="font-semibold text-[#1A1A1A]">
                      Un signalement proche ressemble déjà au vôtre
                    </p>
                    <p className="text-sm leading-6 text-[#6B4A4D]">
                      Vérifiez d&apos;abord qu&apos;il ne s&apos;agit pas du même problème.
                    </p>
                  </div>
                </div>

	                  <div className="space-y-3">
                  {duplicateReports.map((report) => {
                    const metadata = parseStoredReportMetadata(report.description)

                    return (
                      <div
                        key={report.id}
                        className="space-y-3 rounded-2xl bg-white px-4 py-3.5 ring-1 ring-[#F3D6D8]"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-[#1A1A1A]">
                            {getDisplayReportReference(report)} · {report.type}
                          </p>
                          <p className="text-sm text-gray-600">
                            {Math.round(report.distanceMeters)} m •{" "}
                            {formatReportDate(report.created_at)}
                          </p>
                        </div>

                        <div className="space-y-1 text-sm text-gray-700">
                          <p className="font-medium text-[#1A1A1A]">
                            {metadata.address ?? "Adresse non renseignée"}
                          </p>
                          <p className="line-clamp-2">
                            {getPrimaryReportText(report.description)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => router.push(`/signalements/${report.id}`)}
                            className="inline-flex h-11 items-center rounded-full bg-[#F8F8F8] px-4 text-sm font-semibold text-[#1A1A1A] ring-1 ring-gray-200"
                          >
                            Voir le signalement
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleConfirmExistingReport(report.id)}
                            disabled={isSubmitting}
                            className="inline-flex h-11 items-center rounded-full bg-[#fac411] px-4 text-sm font-semibold text-[#1A1A1A] transition hover:bg-[#E8B400] disabled:opacity-60"
                          >
                            Je confirme celui-ci
                          </button>
                          <button
                            type="button"
                            onClick={() => setDuplicateReports([])}
                            className="inline-flex h-11 items-center rounded-full bg-white px-4 text-sm font-semibold text-gray-600 ring-1 ring-gray-200"
                          >
                            Continuer quand même
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

            <div className="rounded-[24px] border border-gray-200 bg-white">
              <button
                type="button"
                onClick={() => setAdvancedOpen((current) => !current)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
              >
                <div>
                  <p className="font-semibold text-[#1A1A1A]">
                    Options avancées
                  </p>
                  <p className="text-sm text-gray-500">
                    Adresse, type et vidéo si besoin
                  </p>
                </div>
                {advancedOpen ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>

              {advancedOpen ? (
                <div className="space-y-4 border-t border-gray-100 px-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#1A1A1A]">
                      Type de problème
                    </label>
                    <select
                      value={selectedType ?? effectiveType ?? "Autre"}
                      onChange={(event) => {
                        trackReportCreationStarted("type")
                        setSelectedType(event.target.value)
                      }}
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-base text-[#1A1A1A] outline-none transition focus:border-[#fac411] focus:ring-2 focus:ring-[#fac411]/20"
                    >
                      {REPORT_TYPES.map((reportType) => (
                        <option key={reportType} value={reportType}>
                          {reportType}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-sm font-semibold text-[#1A1A1A]">
                        Adresse ou lieu
                      </label>
                      <button
                        type="button"
                        onClick={handleUseGeolocation}
                        disabled={isLocating}
                        className="inline-flex h-11 items-center gap-2 rounded-full bg-[#FFF7D6] px-4 text-sm font-semibold text-[#B88A00] transition hover:bg-[#FDECA0] disabled:opacity-60"
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

                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                      <div className="flex items-center gap-3 px-4 py-3">
                        <Search className="h-4 w-4 text-gray-400" />
                        <input
                          value={address}
                          onChange={(event) => {
                            if (event.target.value.trim()) {
                              trackReportCreationStarted("address")
                            }
                            setAddress(event.target.value)
                            setSelectedCoordinates(null)
                            setLocationPrecision("approximate")
                            setAddressMessage("")
                          }}
                          placeholder="Entrer une adresse ou un lieu"
                          className="w-full bg-transparent text-base text-[#1A1A1A] outline-none placeholder:text-gray-400"
                        />
                      </div>

	                      {(isSearchingAddress || addressSuggestions.length > 0) && (
                        <div className="border-t border-gray-100 px-2 py-2">
                          {isSearchingAddress ? (
                            <div className="flex items-center gap-2 px-2 py-2 text-sm text-gray-500">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Recherche en cours...
                            </div>
                          ) : (
                            addressSuggestions.map((suggestion) => (
                              <button
                                key={`${suggestion.lat}-${suggestion.lng}-${suggestion.label}`}
                                type="button"
                                onClick={() =>
                                  void handleSelectAddressSuggestion(suggestion)
                                }
                                className="block w-full rounded-xl px-3 py-2 text-left text-sm text-[#1A1A1A] transition hover:bg-[#F8F8F8]"
                              >
                                {suggestion.label}
                              </button>
                            ))
                          )}
                        </div>
	                      )}
	                    </div>
                      {addressMessage ? (
                        <p className="text-xs leading-5 text-gray-500">
                          {addressMessage}
                        </p>
                      ) : (
                        <p className="text-xs leading-5 text-gray-500">
                          Si le GPS est refusé, indiquez simplement la rue ou le lieu.
                        </p>
                      )}
	                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#1A1A1A]">
                      Ajouter aussi une vidéo
                    </label>
                    <label className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm font-semibold text-[#1A1A1A] ring-1 ring-gray-200 transition hover:bg-[#F2F2F2]">
                      <Video className="h-4 w-4" />
                      Ajouter photo ou vidéo
                      <input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={handleMediaSelection}
                        className="hidden"
                      />
                    </label>
                      <p className="text-xs leading-5 text-gray-500">
                        Jusqu&apos;à {MAX_REPORT_MEDIA_COUNT} médias, dont{" "}
                        {MAX_REPORT_VIDEO_COUNT} vidéos maximum.
                      </p>
                      <p className="text-xs leading-5 text-gray-500">
                        Si l&apos;appareil photo ne s&apos;ouvre pas, utilisez
                        l&apos;import depuis votre téléphone.
                      </p>
	                  </div>
	                </div>
              ) : null}
            </div>
            </section>
          ) : null}

          {!isQueueReviewMode && submitNotice ? (
            <div className="rounded-[24px] border border-[#F1E4A6] bg-[#FFFDF2] px-4 py-3.5 text-sm leading-6 text-[#5F5A45]">
              {submitNotice}
            </div>
          ) : null}

          {!isQueueReviewMode && offlineReports.length > 0 ? (
            <div className="space-y-3 rounded-[24px] border border-gray-200 bg-white px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Envois en attente</p>
                  <p className="text-sm leading-6 text-gray-500">
                    Les signalements enregistrés localement seront repris automatiquement.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full bg-[#F8F8F8] px-3 text-sm font-semibold text-[#1A1A1A]">
                    {offlineReports.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleRetryOfflineReports()}
                    disabled={isRetryingOfflineReports || !isOnline}
                    className="inline-flex h-9 items-center gap-2 rounded-full bg-[#F8F8F8] px-3 text-xs font-semibold text-[#1A1A1A] ring-1 ring-gray-200 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${
                        isRetryingOfflineReports ? "animate-spin" : ""
                      }`}
                    />
                    Relancer
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {recentOfflineReports.map((offlineReport) => {
                  const statusStyles = {
                    pending: "bg-[#FFFBEA] text-[#B88A00]",
                    syncing: "bg-[#EAF3FF] text-[#1663C7]",
                    sent: "bg-[#ECFDF3] text-[#147A3F]",
                    error: "bg-[#FFF1F2] text-[#BE123C]",
                  }

                  const statusLabels = {
                    pending: "En attente",
                    syncing: "En cours",
                    sent: "Envoyé",
                    error: "Erreur",
                  }

                  return (
                    <div
                      key={offlineReport.localId}
                      className="rounded-2xl bg-[#FBFBFB] px-4 py-3 ring-1 ring-gray-100"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#1A1A1A]">
                            {offlineReport.type}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-gray-500">
                            {offlineReport.description.trim() || "Sans description"}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[offlineReport.status]}`}
                        >
                          {offlineReport.status === "syncing" ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : offlineReport.status === "sent" ? (
                            <Send className="mr-1.5 h-3.5 w-3.5" />
                          ) : null}
                          {statusLabels[offlineReport.status]}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-gray-400">
                        <span>{formatReportDate(offlineReport.updatedAt)}</span>
                        <span>
                          {offlineReport.mediaFiles.length} média
                          {offlineReport.mediaFiles.length > 1 ? "s" : ""}
                        </span>
                      </div>

                      {offlineReport.lastError ? (
                        <p className="mt-2 text-xs leading-5 text-[#BE123C]">
                          {offlineReport.lastError}
                        </p>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          {!isQueueReviewMode && mediaError ? (
            <div className="space-y-2 rounded-2xl border border-[#F4C6C8] bg-[#FFF6F6] px-4 py-3 text-sm text-[#7A1C22]">
              <p>{mediaError}</p>
              <button
                type="button"
                onClick={() => mediaLibraryInputRef.current?.click()}
                className="inline-flex min-h-10 items-center justify-center rounded-full bg-white px-4 py-2 font-semibold text-[#1A1A1A] ring-1 ring-gray-200"
              >
                Choisir un autre fichier
              </button>
            </div>
          ) : null}
          {!isQueueReviewMode && submitError ? (
            <div className="space-y-2 rounded-2xl border border-[#F4C6C8] bg-[#FFF6F6] px-4 py-3 text-sm text-[#7A1C22]">
              <p>{submitError}</p>
              <div className="flex flex-wrap gap-2">
                {lastSubmitAttemptWasUploadFailure && lastFailedPayload ? (
                  <button
                    type="button"
                    onClick={() => void submitPayload(lastFailedPayload)}
                    disabled={isSubmitting}
                    className="inline-flex min-h-10 items-center justify-center rounded-full bg-white px-4 py-2 font-semibold text-[#1A1A1A] ring-1 ring-gray-200 disabled:opacity-60"
                  >
                    Réessayer
                  </button>
                ) : null}
                {!isAuthenticatedUser ? (
                  <Link
                    href={authRedirectHref}
                    className="inline-flex min-h-10 items-center justify-center rounded-full bg-white px-4 py-2 font-semibold text-[#1A1A1A] ring-1 ring-gray-200"
                  >
                    Se connecter
                  </Link>
                ) : null}
                  <button
                    type="button"
                    onClick={() => setAdvancedOpen(true)}
                    className="inline-flex min-h-10 items-center justify-center rounded-full bg-white px-4 py-2 font-semibold text-[#1A1A1A] ring-1 ring-gray-200"
                  >
                  Voir mes options
                  </button>
              </div>
            </div>
          ) : null}

          {!isQueueReviewMode ? (
          <button
            type="submit"
            disabled={isSubmitting || isPreparingMedia || !isAuthenticatedUser}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#d21c23] px-5 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-[#b8181e] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting || isPreparingMedia ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {isPreparingMedia
                  ? "Préparation des médias..."
                  : "Envoi en cours..."}
              </>
            ) : (
              "Envoyer"
            )}
          </button>
          ) : null}
        </form>
      </div>

      {selectedMedia ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <button
            type="button"
            onClick={() => setSelectedMediaIndex(null)}
            className="absolute top-5 right-5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur"
          >
            <X className="h-5 w-5" />
          </button>

          {mediaFiles.length > 1 ? (
            <button
              type="button"
              onClick={showPreviousMedia}
              className="absolute left-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : null}

          <div className="w-full max-w-md overflow-hidden rounded-[28px] bg-[#111111]">
            {selectedMedia.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedMedia.previewUrl}
                alt={selectedMedia.file.name}
                className="max-h-[70vh] w-full object-contain"
              />
            ) : (
              <video
                src={selectedMedia.previewUrl}
                controls
                autoPlay
                className="max-h-[70vh] w-full bg-black object-contain"
              />
            )}

            <div className="space-y-1 px-4 py-3 text-white">
              <p className="truncate text-sm font-semibold">
                {selectedMedia.file.name}
              </p>
              <p className="text-xs text-white/70">
                {selectedMediaIndex !== null ? selectedMediaIndex + 1 : 1}/
                {mediaFiles.length}
              </p>
            </div>
          </div>

          {mediaFiles.length > 1 ? (
            <button
              type="button"
              onClick={showNextMedia}
              className="absolute right-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default function NouveauSignalementPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white px-4 py-8">
          <div className="mx-auto max-w-md">
            <div className="flex items-center gap-3 text-sm text-[#666666]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement du formulaire...
            </div>
          </div>
        </div>
      }
    >
      <NouveauSignalementPageContent />
    </Suspense>
  )
}
