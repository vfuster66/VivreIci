"use client"

import Image from "next/image"
import Link from "next/link"
import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  Bird,
  Camera,
  Cat,
  ChevronDown,
  Dog,
  Loader2,
  MapPin,
  PawPrint,
  Search,
  ShieldCheck,
  X,
} from "lucide-react"
import AppTopbar from "@/components/AppTopbar"
import FeedbackBanner from "@/components/FeedbackBanner"
import {
  ANIMAL_ALERT_RADIUS_OPTIONS,
  type AnimalAlertConfirmationRecord,
  type AnimalAlertConfirmationVote,
  ANIMAL_ALERT_SEVERITY_OPTIONS,
  ANIMAL_ALERT_TYPE_OPTIONS,
  ANIMAL_SPECIES_SCOPE_OPTIONS,
  getAnimalAlertSourceLabel,
  getAnimalAlertTypeLabel,
  getAnimalSeasonalAlerts,
  getAnimalSpeciesScopeLabel,
  type AnimalAlertRecord,
  type AnimalAlertSeverity,
  type AnimalAlertType,
  type AnimalSpeciesScope,
} from "@/lib/animal-alerts"
import { useDialogFocusTrap } from "@/lib/use-dialog-focus-trap"
import { buildAuthorizedHeaders } from "@/lib/notifications-client"
import { sanitizeFileName } from "@/lib/report-form"
import { buildDisplayName } from "@/lib/profile"
import { validatePublicTextFields } from "@/lib/contact-guard"
import { geocodePlaceInFrance } from "@/lib/map-location"
import { createClient, ensureSignedInUser, getCurrentSessionUser } from "@/lib/supabase"

type AnimalPostStatus = "lost" | "found" | "spotted"
type AnimalType = "Chat" | "Chien" | "Oiseau" | "NAC" | "Autre"

type AnimalPostRecord = {
  id: string
  user_id: string
  pet_name: string | null
  animal_type: AnimalType | null
  city: string | null
  status: AnimalPostStatus
  photo_url: string | null
  description: string | null
  lat: number
  lng: number
  last_seen_at: string | null
  is_found: boolean | null
  accepted_response_id?: string | null
  created_at: string
  updated_at: string | null
  author_label: string
  author_avatar_url: string | null
}

type AnimalPostResponseRecord = {
  id: string
  message: string
  responderLabel: string
  responderAvatarUrl: string | null
  status: "pending" | "accepted" | "rejected"
  createdAt: string
  contactEmail: string | null
  contactPhone: string | null
}

type ComposeState = {
  status: AnimalPostStatus
  animalType: AnimalType
  petName: string
  city: string
  description: string
  date: string
  photoFile: File | null
  photoPreviewUrl: string | null
}

type ResponseComposeState = {
  message: string
  contactEmail: string
  contactPhone: string
}

type AlertComposeState = {
  alertType: AnimalAlertType
  title: string
  city: string
  description: string
  severity: AnimalAlertSeverity
  speciesScope: AnimalSpeciesScope
  radiusMeters: number
  observedAt: string
}

type AlertConfirmationSummary = {
  confirmCount: number
  clearCount: number
  viewerVote: AnimalAlertConfirmationVote | null
}

const STATUS_FILTERS = [
  { value: "all", label: "Tout" },
  { value: "lost", label: "Perdus" },
  { value: "found", label: "Trouvés" },
  { value: "spotted", label: "Aperçus" },
] as const

const ANIMAL_TYPES: AnimalType[] = ["Chat", "Chien", "Oiseau", "NAC", "Autre"]
const ICAD_UPDATE_COORDINATES_URL =
  "https://www.i-cad.fr/articles/mise_a_jour_coordonnees"
const ICAD_LOST_PET_URL = "https://www.i-cad.fr/articles/animal_perdu"
const ICAD_FOUND_PET_URL = "https://www.i-cad.fr/articles/animal_trouve"

const DEFAULT_COMPOSE_STATE: ComposeState = {
  status: "lost",
  animalType: "Chat",
  petName: "",
  city: "",
  description: "",
  date: "",
  photoFile: null,
  photoPreviewUrl: null,
}

const DEFAULT_RESPONSE_STATE: ResponseComposeState = {
  message: "",
  contactEmail: "",
  contactPhone: "",
}

const DEFAULT_ALERT_COMPOSE_STATE: AlertComposeState = {
  alertType: "processionnaires",
  title: "",
  city: "",
  description: "",
  severity: "high",
  speciesScope: "all",
  radiusMeters: 500,
  observedAt: "",
}

function getAnimalTypeVisual(type: AnimalType | null) {
  switch (type) {
    case "Chat":
      return {
        icon: Cat,
        tone: "bg-[#FCE7F3] text-[#9D174D]",
      }
    case "Chien":
      return {
        icon: Dog,
        tone: "bg-[#DBEAFE] text-[#1D4ED8]",
      }
    case "Oiseau":
      return {
        icon: Bird,
        tone: "bg-[#DCFCE7] text-[#166534]",
      }
    case "NAC":
      return {
        icon: PawPrint,
        tone: "bg-[#FEF3C7] text-[#92400E]",
      }
    default:
      return {
        icon: PawPrint,
        tone: "bg-[#E5E7EB] text-[#374151]",
      }
  }
}

function getStatusLabel(status: AnimalPostStatus) {
  switch (status) {
    case "lost":
      return "Perdu"
    case "found":
      return "Trouvé"
    case "spotted":
      return "Aperçu"
  }
}

function getStatusTone(status: AnimalPostStatus, isResolved: boolean) {
  if (isResolved) {
    return {
      card: "border-gray-200 bg-[#FAFAFA]",
      badge: "bg-[#E5E7EB] text-[#4B5563]",
    }
  }

  switch (status) {
    case "lost":
      return {
        card: "border-[#F4D3D6] bg-[#FFF6F7]",
        badge: "bg-[#C2414B] text-white",
      }
    case "found":
      return {
        card: "border-[#D8E6C1] bg-[#F7FBF1]",
        badge: "bg-[#6B8E23] text-white",
      }
    case "spotted":
      return {
        card: "border-[#F2E1A8] bg-[#FFFBEF]",
        badge: "bg-[#D6A100] text-white",
      }
  }
}

function formatPostDate(value: string | null) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date)
}

function getResolvedLabel(post: Pick<AnimalPostRecord, "status" | "is_found">) {
  if (!post.is_found) {
    return null
  }

  return post.status === "lost" ? "Retrouvé" : "Annonce clôturée"
}

function getTrackingLabel(post: Pick<AnimalPostRecord, "accepted_response_id" | "is_found">) {
  if (post.is_found) {
    return null
  }

  if (post.accepted_response_id) {
    return "Piste retenue"
  }

  return "En recherche"
}

function getTrackingTone(post: Pick<AnimalPostRecord, "accepted_response_id" | "is_found">) {
  if (post.is_found) {
    return "bg-[#E5E7EB] text-[#4B5563]"
  }

  if (post.accepted_response_id) {
    return "bg-[#D9E7C3] text-[#385314]"
  }

  return "bg-[#FEF3C7] text-[#92400E]"
}

function getIcadSupportContent(status: AnimalPostStatus) {
  if (status === "lost") {
    return {
      title: "Mettre à jour le dossier I-CAD",
      body: "Déclarez la perte de l’animal et vérifiez que vos coordonnées I-CAD sont à jour pour pouvoir être recontacté rapidement.",
      primaryHref: ICAD_LOST_PET_URL,
      primaryLabel: "Déclarer la perte",
      secondaryHref: ICAD_UPDATE_COORDINATES_URL,
      secondaryLabel: "Mettre à jour mes coordonnées",
    }
  }

  return {
    title: "Déclarer la situation à I-CAD",
    body: "Si l’animal est identifié, consultez la procédure I-CAD pour signaler un animal trouvé et faciliter le contact avec son détenteur.",
    primaryHref: ICAD_FOUND_PET_URL,
    primaryLabel: "Voir la démarche I-CAD",
    secondaryHref: ICAD_UPDATE_COORDINATES_URL,
    secondaryLabel: "Consulter le dossier détenteur",
  }
}

function getRiskSeverityClasses(severity: AnimalAlertSeverity) {
  if (severity === "high") {
    return {
      badge: "bg-[#B91C1C] text-white",
      card: "border-[#F4D3D6] bg-[#FFF6F7]",
    }
  }

  return {
    badge: "bg-[#D6A100] text-[#1A1A1A]",
    card: "border-[#F2E1A8] bg-[#FFFBEF]",
  }
}

function getAlertConsensusText(summary?: AlertConfirmationSummary) {
  if (!summary || (summary.confirmCount === 0 && summary.clearCount === 0)) {
    return "Aucun retour terrain pour le moment."
  }

  if (summary.confirmCount > 0 && summary.clearCount === 0) {
    return `${summary.confirmCount} confirmation(s) terrain`
  }

  if (summary.clearCount > 0 && summary.confirmCount === 0) {
    return `${summary.clearCount} signalement(s) “n’est plus d’actualité”`
  }

  return `${summary.confirmCount} confirmation(s) · ${summary.clearCount} fin(s) signalée(s)`
}

async function uploadAnimalPhoto(supabase: ReturnType<typeof createClient>, file: File) {
  const filePath = `animals/${Date.now()}-${sanitizeFileName(file.name)}`
  const { error } = await supabase.storage.from("photos").upload(filePath, file)

  if (error) {
    throw error
  }

  const { data } = supabase.storage.from("photos").getPublicUrl(filePath)
  return data.publicUrl
}

function AnimauxPageContent() {
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const [viewerUserId, setViewerUserId] = useState<string | null>(null)
  const [preferredCity, setPreferredCity] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"posts" | "alerts">("posts")
  const [viewMode, setViewMode] = useState<"local" | "mine">("local")
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTERS)[number]["value"]>("all")
  const [query, setQuery] = useState("")
  const [alertSourceFilter, setAlertSourceFilter] = useState<
    "all" | "community" | "official" | "system"
  >("all")
  const [alertTrustFilter, setAlertTrustFilter] = useState<"all" | "verified" | "unverified">(
    "all"
  )
  const [posts, setPosts] = useState<AnimalPostRecord[]>([])
  const [animalAlerts, setAnimalAlerts] = useState<AnimalAlertRecord[]>([])
  const [alertConfirmations, setAlertConfirmations] = useState<
    Record<string, AlertConfirmationSummary>
  >({})
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true)
  const [alertLoadError, setAlertLoadError] = useState<string | null>(null)
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [isAlertComposeOpen, setIsAlertComposeOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmittingAlert, setIsSubmittingAlert] = useState(false)
  const [submittingAlertVote, setSubmittingAlertVote] = useState<
    AnimalAlertConfirmationVote | null
  >(null)
  const [isResolving, setIsResolving] = useState(false)
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false)
  const [isLoadingResponses, setIsLoadingResponses] = useState(false)
  const [acceptingResponseId, setAcceptingResponseId] = useState<string | null>(null)
  const [selectedPost, setSelectedPost] = useState<AnimalPostRecord | null>(null)
  const [selectedAlert, setSelectedAlert] = useState<AnimalAlertRecord | null>(null)
  const [composeError, setComposeError] = useState<string | null>(null)
  const [alertComposeError, setAlertComposeError] = useState<string | null>(null)
  const [alertVoteError, setAlertVoteError] = useState<string | null>(null)
  const [responseError, setResponseError] = useState<string | null>(null)
  const [composeState, setComposeState] = useState<ComposeState>(DEFAULT_COMPOSE_STATE)
  const [alertComposeState, setAlertComposeState] =
    useState<AlertComposeState>(DEFAULT_ALERT_COMPOSE_STATE)
  const [responseState, setResponseState] = useState<ResponseComposeState>(DEFAULT_RESPONSE_STATE)
  const [responsesByPost, setResponsesByPost] = useState<Record<string, AnimalPostResponseRecord[]>>({})
  const [showOptionalDetails, setShowOptionalDetails] = useState(false)
  const composeDialogRef = useDialogFocusTrap(
    isComposeOpen,
    () => {
      setIsComposeOpen(false)
      resetComposeState()
    }
  )
  const detailDialogRef = useDialogFocusTrap(
    selectedPost !== null,
    () => setSelectedPost(null)
  )
  const alertDetailDialogRef = useDialogFocusTrap(
    selectedAlert !== null,
    () => setSelectedAlert(null)
  )
  const alertComposeDialogRef = useDialogFocusTrap(
    isAlertComposeOpen,
    () => {
      setIsAlertComposeOpen(false)
      resetAlertComposeState()
    }
  )
  const requestedPostId = searchParams.get("postId")?.trim() || null
  const requestedView = searchParams.get("view")?.trim() || null
  const requestedTab = searchParams.get("tab")?.trim() || null

  useEffect(() => {
    if (requestedView === "mine") {
      setViewMode("mine")
    }
  }, [requestedView])

  useEffect(() => {
    if (requestedTab === "alerts") {
      setActiveTab("alerts")
    }
  }, [requestedTab])

  useEffect(() => {
    let mounted = true

    async function loadPage() {
      try {
        const user = await getCurrentSessionUser(supabase)

        if (mounted) {
          setViewerUserId(user?.id ?? null)
        }

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("preferred_city")
            .eq("id", user.id)
            .maybeSingle()

          const nextCity = profile?.preferred_city?.trim() || null

          if (mounted) {
            setPreferredCity(nextCity)
            setComposeState((current) => ({
              ...current,
              city: current.city || nextCity || "",
            }))
            setAlertComposeState((current) => ({
              ...current,
              city: current.city || nextCity || "",
            }))
          }
        }
      } catch {
        if (mounted) {
          setViewerUserId(null)
          setPreferredCity(null)
        }
      }
    }

    void loadPage()

    return () => {
      mounted = false
    }
  }, [supabase])

  useEffect(() => {
    let mounted = true

    async function fetchPosts() {
      try {
        const { data, error } = await supabase
          .from("lost_pets")
          .select(
            "id, user_id, pet_name, animal_type, city, status, photo_url, description, lat, lng, last_seen_at, is_found, accepted_response_id, created_at, updated_at"
          )
          .order("created_at", { ascending: false })
          .limit(120)

        if (error) {
          throw error
        }

        const rows = data ?? []
        const userIds = Array.from(
          new Set(rows.map((item) => item.user_id).filter((value): value is string => Boolean(value)))
        )

        let profilesById = new Map<
          string,
          {
            display_name: string | null
            first_name: string | null
            last_name: string | null
            avatar_url: string | null
          }
        >()

        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, display_name, first_name, last_name, avatar_url")
            .in("id", userIds)

          profilesById = new Map(
            (profilesData ?? []).map((profile) => [
              profile.id,
              {
                display_name: profile.display_name,
                first_name: profile.first_name,
                last_name: profile.last_name,
                avatar_url: profile.avatar_url,
              },
            ])
          )
        }

        const nextPosts: AnimalPostRecord[] = rows.map((row) => {
          const profile = row.user_id ? profilesById.get(row.user_id) : null

          return {
            ...row,
            animal_type: (row.animal_type as AnimalType | null) ?? null,
            status: row.status as AnimalPostStatus,
            is_found: row.is_found ?? false,
            accepted_response_id: row.accepted_response_id ?? null,
            author_label:
              profile != null
                ? buildDisplayName(profile, "Voisin VivreIci")
                : "Voisin VivreIci",
            author_avatar_url: profile?.avatar_url ?? null,
          }
        })

        if (mounted) {
          setPosts(nextPosts)
          setLoadError(null)
        }

      } catch (error) {
        if (mounted) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Impossible de charger les annonces animaux."
          )
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    void fetchPosts()

    const channel = supabase
      .channel("lost-pets")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lost_pets" },
        () => {
          void fetchPosts()
        }
      )
      .subscribe()

    return () => {
      mounted = false
      void supabase.removeChannel(channel)
    }
  }, [supabase])

  useEffect(() => {
    let mounted = true

    async function fetchAnimalAlerts() {
      setIsLoadingAlerts(true)

      try {
        const response = await fetch(
          preferredCity
            ? `/api/animaux/alertes?city=${encodeURIComponent(preferredCity)}`
            : "/api/animaux/alertes"
        )
        const payload = (await response.json()) as {
          error?: string
          alerts?: AnimalAlertRecord[]
        }

        if (!response.ok) {
          throw new Error(payload.error || "Impossible de charger les alertes animales.")
        }

        if (mounted) {
          setAnimalAlerts(payload.alerts ?? [])
          setAlertLoadError(null)
        }

        const alertIds = (payload.alerts ?? []).map((item) => item.id)

        if (alertIds.length === 0) {
          if (mounted) {
            setAlertConfirmations({})
          }
          return
        }

        const { data: confirmationsData, error: confirmationsError } = await supabase
          .from("animal_alert_confirmations")
          .select("id, alert_id, user_id, vote, created_at, updated_at")
          .in("alert_id", alertIds)

        if (confirmationsError) {
          throw confirmationsError
        }

        const summaryByAlert: Record<string, AlertConfirmationSummary> = {}

        for (const alertId of alertIds) {
          summaryByAlert[alertId] = {
            confirmCount: 0,
            clearCount: 0,
            viewerVote: null,
          }
        }

        for (const confirmation of (confirmationsData ?? []) as AnimalAlertConfirmationRecord[]) {
          const current = summaryByAlert[confirmation.alert_id]

          if (!current) {
            continue
          }

          if (confirmation.vote === "confirm") {
            current.confirmCount += 1
          } else {
            current.clearCount += 1
          }

          if (viewerUserId && confirmation.user_id === viewerUserId) {
            current.viewerVote = confirmation.vote
          }
        }

        if (mounted) {
          setAlertConfirmations(summaryByAlert)
        }
      } catch (error) {
        if (mounted) {
          setAlertLoadError(
            error instanceof Error
              ? error.message
              : "Impossible de charger les alertes animales."
          )
        }
      } finally {
        if (mounted) {
          setIsLoadingAlerts(false)
        }
      }
    }

    void fetchAnimalAlerts()

    return () => {
      mounted = false
    }
  }, [preferredCity, supabase, viewerUserId])

  useEffect(() => {
    return () => {
      if (composeState.photoPreviewUrl) {
        URL.revokeObjectURL(composeState.photoPreviewUrl)
      }
    }
  }, [composeState.photoPreviewUrl])

  const visiblePosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return posts
      .filter((post) => {
        if (viewMode === "local" && post.is_found) {
          return false
        }

        if (viewMode === "mine" && post.user_id !== viewerUserId) {
          return false
        }

        if (statusFilter !== "all" && post.status !== statusFilter) {
          return false
        }

        if (!normalizedQuery) {
          return true
        }

        return [
          post.pet_name,
          post.animal_type,
          post.city,
          post.description,
          post.author_label,
        ]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedQuery))
      })
      .sort((first, second) => {
        if ((first.user_id === viewerUserId) !== (second.user_id === viewerUserId)) {
          return first.user_id === viewerUserId ? -1 : 1
        }

        if (preferredCity) {
          const firstIsLocal = first.city?.toLowerCase() === preferredCity.toLowerCase()
          const secondIsLocal = second.city?.toLowerCase() === preferredCity.toLowerCase()

          if (firstIsLocal !== secondIsLocal) {
            return firstIsLocal ? -1 : 1
          }
        }

        return new Date(second.created_at).getTime() - new Date(first.created_at).getTime()
      })
  }, [posts, preferredCity, query, statusFilter, viewMode, viewerUserId])
  const seasonalRisks = useMemo(() => getAnimalSeasonalAlerts(preferredCity), [preferredCity])
  const visibleAnimalAlerts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return animalAlerts.filter((alert) => {
      if (alertSourceFilter !== "all" && alert.source_type !== alertSourceFilter) {
        return false
      }

      if (alertTrustFilter === "verified" && !alert.is_verified) {
        return false
      }

      if (alertTrustFilter === "unverified" && alert.is_verified) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      return [
        alert.title,
        alert.description,
        alert.city,
        alert.author_label,
        getAnimalAlertTypeLabel(alert.alert_type),
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    })
  }, [alertSourceFilter, alertTrustFilter, animalAlerts, query])
  const visibleSeasonalRisks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return seasonalRisks.filter((risk) => {
      if (!normalizedQuery) {
        return true
      }

      return [risk.title, risk.summary, getAnimalAlertTypeLabel(risk.type)]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    })
  }, [query, seasonalRisks])

  useEffect(() => {
    if (!requestedPostId || posts.length === 0) {
      return
    }

    const requestedPost = posts.find((post) => post.id === requestedPostId)

    if (!requestedPost) {
      return
    }

    if (requestedView === "mine") {
      setViewMode("mine")
    }

    setSelectedPost(requestedPost)
  }, [posts, requestedPostId, requestedView])

  function resetComposeState() {
    if (composeState.photoPreviewUrl) {
      URL.revokeObjectURL(composeState.photoPreviewUrl)
    }

    setComposeState({
      ...DEFAULT_COMPOSE_STATE,
      city: preferredCity ?? "",
    })
    setComposeError(null)
    setShowOptionalDetails(false)
  }

  function resetAlertComposeState() {
    setAlertComposeState({
      ...DEFAULT_ALERT_COMPOSE_STATE,
      city: preferredCity ?? "",
    })
    setAlertComposeError(null)
  }

  function resetResponseState() {
    setResponseState(DEFAULT_RESPONSE_STATE)
    setResponseError(null)
  }

  async function loadResponses(postId: string) {
    setIsLoadingResponses(true)
    setResponseError(null)

    try {
      const response = await fetch(`/api/animaux/responses?postId=${encodeURIComponent(postId)}`, {
        headers: await buildAuthorizedHeaders(),
      })
      const payload = (await response.json()) as {
        error?: string
        responses?: AnimalPostResponseRecord[]
      }

      if (!response.ok) {
        throw new Error(payload.error || "Impossible de charger les réponses.")
      }

      setResponsesByPost((current) => ({
        ...current,
        [postId]: payload.responses ?? [],
      }))
    } catch (error) {
      setResponseError(
        error instanceof Error
          ? error.message
          : "Impossible de charger les réponses."
      )
    } finally {
      setIsLoadingResponses(false)
    }
  }

  async function handleCreatePost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setComposeError(null)

    try {
      const validationError = validatePublicTextFields([
        { label: "Nom", value: composeState.petName },
        { label: "Ville", value: composeState.city },
        { label: "Description", value: composeState.description },
      ])

      if (validationError) {
        throw new Error(validationError)
      }

      if (!composeState.city.trim()) {
        throw new Error("Indiquez au moins une ville.")
      }

      if (!composeState.description.trim()) {
        throw new Error("Ajoutez un court descriptif.")
      }

      const user = await ensureSignedInUser(supabase)
      const coordinates = await geocodePlaceInFrance(composeState.city.trim())

      if (!coordinates) {
        throw new Error("Impossible de localiser cette ville.")
      }

      const photoUrl = composeState.photoFile
        ? await uploadAnimalPhoto(supabase, composeState.photoFile)
        : null

      const { error } = await supabase.from("lost_pets").insert([
        {
          user_id: user.id,
          pet_name: composeState.petName.trim() || null,
          animal_type: composeState.animalType,
          city: composeState.city.trim(),
          status: composeState.status,
          description: composeState.description.trim(),
          lat: coordinates.lat,
          lng: coordinates.lng,
          photo_url: photoUrl,
          last_seen_at: composeState.date
            ? new Date(`${composeState.date}T12:00:00`).toISOString()
            : null,
          is_found: false,
          updated_at: new Date().toISOString(),
        },
      ])

      if (error) {
        throw error
      }

      setIsComposeOpen(false)
      resetComposeState()
      setViewMode("mine")
    } catch (error) {
      setComposeError(
        error instanceof Error
          ? error.message
          : "Impossible de publier cette annonce."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCreateAlert(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmittingAlert(true)
    setAlertComposeError(null)

    try {
      const response = await fetch("/api/animaux/alertes", {
        method: "POST",
        headers: {
          ...(await buildAuthorizedHeaders()),
        },
        body: JSON.stringify({
          alertType: alertComposeState.alertType,
          title: alertComposeState.title,
          city: alertComposeState.city,
          description: alertComposeState.description,
          severity: alertComposeState.severity,
          speciesScope: alertComposeState.speciesScope,
          radiusMeters: alertComposeState.radiusMeters,
          observedAt: alertComposeState.observedAt || null,
        }),
      })

      const payload = (await response.json()) as {
        error?: string
        alert?: AnimalAlertRecord
      }

      if (!response.ok) {
        throw new Error(payload.error || "Impossible de publier cette alerte.")
      }

      if (payload.alert) {
        setAnimalAlerts((current) => [payload.alert!, ...current])
      }
      setActiveTab("alerts")
      setIsAlertComposeOpen(false)
      resetAlertComposeState()
    } catch (error) {
      setAlertComposeError(
        error instanceof Error
          ? error.message
          : "Impossible de publier cette alerte."
      )
    } finally {
      setIsSubmittingAlert(false)
    }
  }

  async function handleSetAlertVote(
    alert: AnimalAlertRecord,
    nextVote: AnimalAlertConfirmationVote
  ) {
    setSubmittingAlertVote(nextVote)
    setAlertVoteError(null)

    const previousSummary = alertConfirmations[alert.id] ?? {
      confirmCount: 0,
      clearCount: 0,
      viewerVote: null,
    }
    const nextSummary: AlertConfirmationSummary = {
      ...previousSummary,
      viewerVote:
        previousSummary.viewerVote === nextVote ? null : nextVote,
    }

    if (previousSummary.viewerVote === "confirm") {
      nextSummary.confirmCount = Math.max(0, nextSummary.confirmCount - 1)
    } else if (previousSummary.viewerVote === "clear") {
      nextSummary.clearCount = Math.max(0, nextSummary.clearCount - 1)
    }

    if (nextSummary.viewerVote === "confirm") {
      nextSummary.confirmCount += 1
    } else if (nextSummary.viewerVote === "clear") {
      nextSummary.clearCount += 1
    }

    setAlertConfirmations((current) => ({
      ...current,
      [alert.id]: nextSummary,
    }))

    try {
      const user = await ensureSignedInUser(supabase)

      if (previousSummary.viewerVote === nextVote) {
        const { error } = await supabase
          .from("animal_alert_confirmations")
          .delete()
          .eq("alert_id", alert.id)
          .eq("user_id", user.id)

        if (error) {
          throw error
        }
      } else {
        const { error } = await supabase.from("animal_alert_confirmations").upsert(
          {
            alert_id: alert.id,
            user_id: user.id,
            vote: nextVote,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "alert_id,user_id" }
        )

        if (error) {
          throw error
        }
      }
    } catch (error) {
      setAlertConfirmations((current) => ({
        ...current,
        [alert.id]: previousSummary,
      }))
      setAlertVoteError(
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer ce retour terrain."
      )
    } finally {
      setSubmittingAlertVote(null)
    }
  }

  async function handleResolvePost(post: AnimalPostRecord) {
    if (!viewerUserId || post.user_id !== viewerUserId || isResolving) {
      return
    }

    setIsResolving(true)

    const { error } = await supabase
      .from("lost_pets")
      .update({
        is_found: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id)
      .eq("user_id", viewerUserId)

    if (!error) {
      setSelectedPost((current) =>
        current?.id === post.id ? { ...current, is_found: true } : current
      )
      setPosts((current) =>
        current.map((item) =>
          item.id === post.id ? { ...item, is_found: true } : item
        )
      )
    }

    setIsResolving(false)
  }

  async function handleSubmitResponse() {
    if (!selectedPost) {
      return
    }

    setIsSubmittingResponse(true)
    setResponseError(null)

    try {
      const response = await fetch("/api/animaux/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await buildAuthorizedHeaders()),
        },
        body: JSON.stringify({
          action: "create",
          postId: selectedPost.id,
          message: responseState.message,
          contactEmail: responseState.contactEmail,
          contactPhone: responseState.contactPhone,
        }),
      })

      const payload = (await response.json()) as {
        error?: string
        response?: AnimalPostResponseRecord
      }

      if (!response.ok) {
        throw new Error(payload.error || "Impossible d'envoyer votre réponse.")
      }

      resetResponseState()
      setResponsesByPost((current) => ({
        ...current,
        [selectedPost.id]: [
          ...(current[selectedPost.id] ?? []),
          ...(payload.response ? [payload.response] : []),
        ],
      }))
    } catch (error) {
      setResponseError(
        error instanceof Error
          ? error.message
          : "Impossible d'envoyer votre réponse."
      )
    } finally {
      setIsSubmittingResponse(false)
    }
  }

  async function handleAcceptResponse(post: AnimalPostRecord, responseId: string) {
    setAcceptingResponseId(responseId)
    setResponseError(null)

    try {
      const response = await fetch("/api/animaux/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await buildAuthorizedHeaders()),
        },
        body: JSON.stringify({
          action: "accept",
          responseId,
        }),
      })

      const payload = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || "Impossible de retenir cette piste.")
      }

      await loadResponses(post.id)
      setPosts((current) =>
        current.map((item) =>
          item.id === post.id ? { ...item, accepted_response_id: responseId } : item
        )
      )
      setSelectedPost((current) =>
        current?.id === post.id
          ? { ...current, accepted_response_id: responseId }
          : current
      )
    } catch (error) {
      setResponseError(
        error instanceof Error
          ? error.message
          : "Impossible de retenir cette piste."
      )
    } finally {
      setAcceptingResponseId(null)
    }
  }

  useEffect(() => {
    if (!selectedPost || selectedPost.user_id !== viewerUserId) {
      return
    }

    if (responsesByPost[selectedPost.id]) {
      return
    }

    void loadResponses(selectedPost.id)
  }, [responsesByPost, selectedPost, viewerUserId])

  return (
    <div className="min-h-screen bg-white pb-24">
      <AppTopbar
        title="Animaux"
        filterPanel={
          activeTab === "posts" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                {STATUS_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setStatusFilter(filter.value)}
                    className={`min-h-11 rounded-2xl px-3 text-xs font-semibold transition ${
                      statusFilter === filter.value
                        ? "bg-[#1A1A1A] text-white"
                        : "bg-[#F8F8F8] text-[#1A1A1A]"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-[24px] bg-[#F8F8F8] p-1">
                {[
                  { value: "local", label: preferredCity ? preferredCity : "En cours" },
                  { value: "mine", label: "Mes annonces" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setViewMode(item.value as "local" | "mine")}
                    className={`min-h-11 rounded-[18px] px-4 text-sm font-semibold transition ${
                      viewMode === item.value
                        ? "bg-white text-[#1A1A1A] shadow-sm"
                        : "text-[#666666]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 rounded-[24px] bg-[#F8F8F8] p-1">
                {[
                  { value: "all", label: "Toutes" },
                  { value: "community", label: "Communauté" },
                  { value: "official", label: "Officielles" },
                  { value: "system", label: "Automatiques" },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() =>
                      setAlertSourceFilter(
                        filter.value as "all" | "community" | "official" | "system"
                      )
                    }
                    className={`min-h-11 rounded-[18px] px-3 text-xs font-semibold transition ${
                      alertSourceFilter === filter.value
                        ? "bg-white text-[#1A1A1A] shadow-sm"
                        : "text-[#666666]"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "all", label: "Tous statuts" },
                  { value: "verified", label: "Vérifiées" },
                  { value: "unverified", label: "À confirmer" },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() =>
                      setAlertTrustFilter(
                        filter.value as "all" | "verified" | "unverified"
                      )
                    }
                    className={`min-h-11 rounded-2xl px-3 text-xs font-semibold transition ${
                      alertTrustFilter === filter.value
                        ? "bg-[#1A1A1A] text-white"
                        : "bg-[#F8F8F8] text-[#1A1A1A]"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        searchPanel={
          <div className="flex items-center gap-3 rounded-2xl bg-[#F8F8F8] px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label={
                activeTab === "posts"
                  ? "Rechercher un nom, une ville ou un type d'animal"
                  : "Rechercher une alerte animale, une ville ou un risque"
              }
              placeholder={
                activeTab === "posts"
                  ? "Rechercher un nom, une ville, un type..."
                  : "Rechercher un risque, une ville..."
              }
              className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>
        }
      />

      <div className="mx-auto max-w-md px-4 pt-4">
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-[24px] bg-[#F8F8F8] p-1">
          {[
            { value: "posts", label: "Annonces" },
            { value: "alerts", label: "Alertes" },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value as "posts" | "alerts")}
              className={`min-h-11 rounded-[18px] px-4 text-sm font-semibold transition ${
                activeTab === tab.value
                  ? "bg-white text-[#1A1A1A] shadow-sm"
                  : "text-[#666666]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mb-4 flex items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#1A1A1A]">
              {activeTab === "posts"
                ? `${visiblePosts.length} annonce(s)`
                : `${visibleAnimalAlerts.length + visibleSeasonalRisks.length} alerte(s)`}
            </p>
            <p className="text-xs text-[#666666]">
              {activeTab === "posts"
                ? "Perdus, trouvés ou aperçus autour de vous."
                : "Prévention automatique et alertes localisées autour de vous."}
            </p>
          </div>
          {(query || (activeTab === "posts" && (statusFilter !== "all" || viewMode !== "local"))) && (
            <button
              type="button"
              onClick={() => {
                setQuery("")
                if (activeTab === "posts") {
                  setStatusFilter("all")
                  setViewMode("local")
                } else {
                  setAlertSourceFilter("all")
                  setAlertTrustFilter("all")
                }
              }}
              className="shrink-0 text-sm font-medium text-[#D6A100]"
            >
              Réinitialiser
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            if (activeTab === "posts") {
              resetComposeState()
              setIsComposeOpen(true)
              return
            }

            resetAlertComposeState()
            setIsAlertComposeOpen(true)
          }}
          className="mb-4 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#1A1A1A] px-5 text-sm font-semibold text-white"
        >
          {activeTab === "posts" ? "Publier une annonce" : "Ajouter une alerte"}
        </button>

        {activeTab === "posts" ? isLoading ? (
          <div className="py-8 text-sm text-[#666666]">Chargement des annonces...</div>
        ) : loadError ? (
          <FeedbackBanner variant="error" className="py-8">
            {loadError}
          </FeedbackBanner>
        ) : visiblePosts.length === 0 ? (
          <div className="rounded-[24px] border border-gray-100 bg-white px-4 py-5 text-sm text-[#666666]">
            Aucune annonce animale pour ces filtres.
          </div>
        ) : (
          <div className="space-y-3">
            {visiblePosts.map((post) => {
              const tone = getStatusTone(post.status, Boolean(post.is_found))
              const resolvedLabel = getResolvedLabel(post)
              const trackingLabel = getTrackingLabel(post)
              const isOwner = post.user_id === viewerUserId
              const animalVisual = getAnimalTypeVisual(post.animal_type)
              const AnimalIcon = animalVisual.icon

              return (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => setSelectedPost(post)}
                  className={`block w-full rounded-[24px] border px-4 py-4 text-left transition ${tone.card}`}
                >
                  <div className="flex items-start gap-3">
                    {post.photo_url ? (
                      <Image
                        src={post.photo_url}
                        alt={post.pet_name || post.animal_type || "Animal signalé"}
                        width={72}
                        height={72}
                        unoptimized
                        className="h-[72px] w-[72px] rounded-2xl object-cover"
                      />
                    ) : (
                      <span className="inline-flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl bg-white text-[#B8860B] ring-1 ring-black/5">
                        <PawPrint className="h-6 w-6" />
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-[#1A1A1A]">
                            {post.pet_name?.trim() || post.animal_type || "Animal signalé"}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${animalVisual.tone}`}
                            >
                              <AnimalIcon className="h-3.5 w-3.5" />
                              {post.animal_type || "Autre"}
                            </span>
                            <p className="text-sm text-[#666666]">
                              {post.city || "Lieu à préciser"}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${tone.badge}`}>
                            {getStatusLabel(post.status)}
                          </span>
                          {isOwner ? (
                            <span className="rounded-full bg-[#1A1A1A] px-2.5 py-1 text-[10px] font-semibold text-white">
                              Mon annonce
                            </span>
                          ) : null}
                          {trackingLabel ? (
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${getTrackingTone(post)}`}
                            >
                              {trackingLabel}
                            </span>
                          ) : null}
                          {resolvedLabel ? (
                            <span className="rounded-full bg-[#E5E7EB] px-2.5 py-1 text-[10px] font-semibold text-[#4B5563]">
                              {resolvedLabel}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <p className="line-clamp-2 text-sm leading-6 text-[#1A1A1A]">
                        {post.description?.trim() || "Aucun détail fourni."}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#666666]">
                        {formatPostDate(post.last_seen_at ?? post.created_at) ? (
                          <span>{formatPostDate(post.last_seen_at ?? post.created_at)}</span>
                        ) : null}
                        <span>{post.author_label}</span>
                        {post.accepted_response_id && !post.is_found ? (
                          <span className="font-medium text-[#385314]">
                            Coordonnées débloquées
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {visibleSeasonalRisks.length > 0 ? (
              <section className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">
                      Risques du moment
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#666666]">
                      Prévention automatique et saisonnière avant la promenade.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#F3F4F6] px-3 py-1 text-[11px] font-semibold text-[#4B5563]">
                    {preferredCity ? preferredCity : "Local"}
                  </span>
                </div>

                <div className="space-y-3">
                  {visibleSeasonalRisks.map((risk) => {
                    const styles = getRiskSeverityClasses(risk.severity)

                    return (
                      <article
                        key={risk.id}
                        className={`rounded-[24px] border px-4 py-4 ${styles.card}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-[#4B5563] ring-1 ring-black/5">
                                Automatique
                              </span>
                              <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-[#4B5563] ring-1 ring-black/5">
                                {getAnimalAlertTypeLabel(risk.type)}
                              </span>
                            </div>
                            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#666666]">
                              {risk.seasonLabel}
                            </p>
                            <h2 className="mt-1 text-base font-semibold text-[#1A1A1A]">
                              {risk.title}
                            </h2>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${styles.badge}`}
                          >
                            {risk.severity === "high" ? "Vigilance forte" : "À surveiller"}
                          </span>
                        </div>

                        <p className="mt-3 text-sm leading-6 text-[#4B5563]">
                          {risk.summary}
                        </p>

                        <ul className="mt-3 space-y-2 text-sm leading-6 text-[#4B5563]">
                          {risk.actions.map((action) => (
                            <li key={action} className="flex gap-2">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1A1A1A]" />
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </article>
                    )
                  })}
                </div>
              </section>
            ) : null}

            <section className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#1A1A1A]">
                    Alertes localisées
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#666666]">
                    Observations publiées par la communauté, avec expiration automatique.
                  </p>
                </div>
              </div>

              {isLoadingAlerts ? (
                <div className="py-8 text-sm text-[#666666]">Chargement des alertes...</div>
              ) : alertLoadError ? (
                <FeedbackBanner variant="error">{alertLoadError}</FeedbackBanner>
              ) : visibleAnimalAlerts.length === 0 ? (
                <div className="rounded-[24px] border border-gray-100 bg-white px-4 py-5 text-sm text-[#666666]">
                  Aucune alerte locale pour les filtres en cours.
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleAnimalAlerts.map((alert) => {
                    const styles = getRiskSeverityClasses(alert.severity)
                    const summary = alertConfirmations[alert.id]

                    return (
                      <button
                        key={alert.id}
                        type="button"
                        onClick={() => setSelectedAlert(alert)}
                        className={`block w-full rounded-[24px] border px-4 py-4 text-left ${styles.card}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-[#4B5563] ring-1 ring-black/5">
                                {getAnimalAlertSourceLabel(alert.source_type)}
                              </span>
                              <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-[#4B5563] ring-1 ring-black/5">
                                {getAnimalAlertTypeLabel(alert.alert_type)}
                              </span>
                              <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-[#4B5563] ring-1 ring-black/5">
                                {getAnimalSpeciesScopeLabel(alert.species_scope)}
                              </span>
                              <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-[#4B5563] ring-1 ring-black/5">
                                Zone {alert.radius_meters} m
                              </span>
                              {alert.is_verified ? (
                                <span className="rounded-full bg-[#EAF3E0] px-2.5 py-1 text-[10px] font-semibold text-[#385314]">
                                  Vérifiée
                                </span>
                              ) : null}
                            </div>
                            <h2 className="mt-3 text-base font-semibold text-[#1A1A1A]">
                              {alert.title}
                            </h2>
                            <p className="mt-1 text-sm text-[#666666]">
                              {alert.city}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${styles.badge}`}
                          >
                            {alert.severity === "high" ? "Vigilance forte" : "À surveiller"}
                          </span>
                        </div>

                        <p className="mt-3 text-sm leading-6 text-[#4B5563]">
                          {alert.description}
                        </p>

                        <p className="mt-3 text-xs font-medium text-[#4B5563]">
                          {getAlertConsensusText(summary)}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#666666]">
                          <span>Par {alert.author_label}</span>
                          {formatPostDate(alert.observed_at ?? alert.created_at) ? (
                            <span>
                              Observé le {formatPostDate(alert.observed_at ?? alert.created_at)}
                            </span>
                          ) : null}
                          {formatPostDate(alert.expires_at) ? (
                            <span>Expire le {formatPostDate(alert.expires_at)}</span>
                          ) : null}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {isComposeOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40 px-4 py-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="animal-compose-title"
            ref={composeDialogRef}
            tabIndex={-1}
            className="mx-auto flex max-h-[calc(100dvh-3rem)] max-w-md flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <p id="animal-compose-title" className="text-base font-semibold text-[#1A1A1A]">
                  Nouvelle annonce animale
                </p>
                <p className="text-sm text-[#666666]">
                  Perdu, trouvé ou simplement aperçu.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsComposeOpen(false)
                  resetComposeState()
                }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-gray-500 hover:bg-[#F6F6F6]"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="flex min-h-0 flex-1 flex-col">
              <div className="space-y-5 overflow-y-auto px-5 py-5">
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_FILTERS.filter((item) => item.value !== "all").map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() =>
                        setComposeState((current) => ({
                          ...current,
                          status: item.value as AnimalPostStatus,
                        }))
                      }
                      className={`min-h-11 rounded-2xl px-3 text-xs font-semibold transition ${
                        composeState.status === item.value
                          ? "bg-[#1A1A1A] text-white"
                          : "bg-[#F8F8F8] text-[#1A1A1A]"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <label className="block space-y-2" htmlFor="animal-type-group">
                  <span className="text-sm font-semibold text-[#1A1A1A]">
                    Type d’animal
                  </span>
                  <div id="animal-type-group" className="grid grid-cols-2 gap-2">
                    {ANIMAL_TYPES.map((type) => {
                      const animalVisual = getAnimalTypeVisual(type)
                      const AnimalIcon = animalVisual.icon
                      const isActive = composeState.animalType === type

                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() =>
                            setComposeState((current) => ({
                              ...current,
                              animalType: type,
                            }))
                          }
                          className={`inline-flex min-h-11 items-center gap-2 rounded-2xl px-3 text-sm font-semibold transition ${
                            isActive
                              ? "bg-[#1A1A1A] text-white"
                              : `bg-[#F8F8F8] text-[#1A1A1A]`
                          }`}
                        >
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
                              isActive ? "bg-white/15" : animalVisual.tone
                            }`}
                          >
                            <AnimalIcon className="h-3.5 w-3.5" />
                          </span>
                          {type}
                        </button>
                      )
                    })}
                  </div>
                </label>

                <label className="block space-y-2" htmlFor="animal-city">
                  <span className="text-sm font-semibold text-[#1A1A1A]">
                    Ville
                  </span>
                  <input
                    id="animal-city"
                    value={composeState.city}
                    onChange={(event) =>
                      setComposeState((current) => ({
                        ...current,
                        city: event.target.value,
                      }))
                    }
                    placeholder="Cabestany"
                    className="w-full rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm outline-none ring-1 ring-gray-200"
                  />
                </label>

                <label className="block space-y-2" htmlFor="animal-description">
                  <span className="text-sm font-semibold text-[#1A1A1A]">
                    Description
                  </span>
                  <textarea
                    id="animal-description"
                    value={composeState.description}
                    onChange={(event) =>
                      setComposeState((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    rows={5}
                    placeholder="Décrivez l’animal, l’endroit, le comportement ou tout indice utile."
                    className="w-full rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm outline-none ring-1 ring-gray-200"
                  />
                </label>

                <div className="rounded-[24px] border border-gray-200 bg-[#FAFAFA]">
                  <button
                    type="button"
                    onClick={() => setShowOptionalDetails((current) => !current)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A1A]">
                        Ajouter des détails
                      </p>
                      <p className="text-sm text-[#666666]">
                        Nom, date précise, photo.
                      </p>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-[#666666] transition ${
                        showOptionalDetails ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {showOptionalDetails ? (
                    <div className="space-y-4 border-t border-gray-200 px-4 py-4">
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block space-y-2" htmlFor="animal-pet-name">
                          <span className="text-sm font-semibold text-[#1A1A1A]">
                            Nom ou repère
                          </span>
                          <input
                            id="animal-pet-name"
                            value={composeState.petName}
                            onChange={(event) =>
                              setComposeState((current) => ({
                                ...current,
                                petName: event.target.value,
                              }))
                            }
                            placeholder="Ex. Simba"
                            className="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none ring-1 ring-gray-200"
                          />
                        </label>

                        <label className="block space-y-2" htmlFor="animal-date">
                          <span className="text-sm font-semibold text-[#1A1A1A]">
                            Date
                          </span>
                          <input
                            id="animal-date"
                            type="date"
                            value={composeState.date}
                            onChange={(event) =>
                              setComposeState((current) => ({
                                ...current,
                                date: event.target.value,
                              }))
                            }
                            className="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none ring-1 ring-gray-200"
                          />
                        </label>
                      </div>

                      <label className="block space-y-2" htmlFor="animal-photo">
                        <span className="text-sm font-semibold text-[#1A1A1A]">
                          Photo
                        </span>
                        <div className="rounded-[24px] border border-dashed border-gray-300 bg-white p-4">
                          <input
                            id="animal-photo"
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                            onChange={(event) => {
                              const file = event.target.files?.[0] ?? null

                              setComposeState((current) => {
                                if (current.photoPreviewUrl) {
                                  URL.revokeObjectURL(current.photoPreviewUrl)
                                }

                                return {
                                  ...current,
                                  photoFile: file,
                                  photoPreviewUrl: file ? URL.createObjectURL(file) : null,
                                }
                              })
                            }}
                            className="w-full text-sm text-[#666666]"
                          />

                          {composeState.photoPreviewUrl ? (
                            <Image
                              src={composeState.photoPreviewUrl}
                              alt="Prévisualisation"
                              width={800}
                              height={500}
                              unoptimized
                              className="mt-3 h-40 w-full rounded-2xl object-cover"
                            />
                          ) : (
                            <div className="mt-3 flex items-center gap-2 text-sm text-[#666666]">
                              <Camera className="h-4 w-4" />
                              Une photo aide à reconnaître rapidement l’animal.
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-[24px] border border-[#E5E7EB] bg-[#FAFAFA] px-4 py-3">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#6B7280]" />
                    <p className="text-sm leading-6 text-[#4B5563]">
                      Pas de numéro ni d’email dans le texte public. L’annonce doit
                      rester lisible et sûre pour tous.
                    </p>
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#D9E7C3] bg-[#F8FCF2] px-4 py-4">
                  <p className="text-sm font-semibold text-[#1A1A1A]">
                    {getIcadSupportContent(composeState.status).title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#4B5563]">
                    {getIcadSupportContent(composeState.status).body}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={getIcadSupportContent(composeState.status).primaryHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1A1A1A] ring-1 ring-[#D9E7C3]"
                    >
                      {getIcadSupportContent(composeState.status).primaryLabel}
                    </Link>
                    <Link
                      href={getIcadSupportContent(composeState.status).secondaryHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#EAF3E0] px-4 py-2 text-sm font-semibold text-[#385314]"
                    >
                      {getIcadSupportContent(composeState.status).secondaryLabel}
                    </Link>
                  </div>
                </div>

                {composeError ? (
                  <FeedbackBanner variant="error">{composeError}</FeedbackBanner>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1A1A1A] px-5 text-sm font-semibold text-white disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Publication...
                    </>
                  ) : (
                    "Publier l’annonce"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isAlertComposeOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40 px-4 py-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="animal-alert-compose-title"
            ref={alertComposeDialogRef}
            tabIndex={-1}
            className="mx-auto flex max-h-[calc(100dvh-3rem)] max-w-md flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <p
                  id="animal-alert-compose-title"
                  className="text-base font-semibold text-[#1A1A1A]"
                >
                  Nouvelle alerte animale
                </p>
                <p className="text-sm text-[#666666]">
                  Risque observé localement, avec expiration automatique.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAlertComposeOpen(false)
                  resetAlertComposeState()
                }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-gray-500 hover:bg-[#F6F6F6]"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAlert} className="flex min-h-0 flex-1 flex-col">
              <div className="space-y-5 overflow-y-auto px-5 py-5">
                <label className="block space-y-2" htmlFor="animal-alert-type">
                  <span className="text-sm font-semibold text-[#1A1A1A]">
                    Type de risque
                  </span>
                  <select
                    id="animal-alert-type"
                    value={alertComposeState.alertType}
                    onChange={(event) =>
                      setAlertComposeState((current) => ({
                        ...current,
                        alertType: event.target.value as AnimalAlertType,
                      }))
                    }
                    className="w-full rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm outline-none ring-1 ring-gray-200"
                  >
                    {ANIMAL_ALERT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-2" htmlFor="animal-alert-severity">
                    <span className="text-sm font-semibold text-[#1A1A1A]">
                      Gravité
                    </span>
                    <select
                      id="animal-alert-severity"
                      value={alertComposeState.severity}
                      onChange={(event) =>
                        setAlertComposeState((current) => ({
                          ...current,
                          severity: event.target.value as AnimalAlertSeverity,
                        }))
                      }
                      className="w-full rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm outline-none ring-1 ring-gray-200"
                    >
                      {ANIMAL_ALERT_SEVERITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-2" htmlFor="animal-alert-species">
                    <span className="text-sm font-semibold text-[#1A1A1A]">
                      Espèces
                    </span>
                    <select
                      id="animal-alert-species"
                      value={alertComposeState.speciesScope}
                      onChange={(event) =>
                        setAlertComposeState((current) => ({
                          ...current,
                          speciesScope: event.target.value as AnimalSpeciesScope,
                        }))
                      }
                      className="w-full rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm outline-none ring-1 ring-gray-200"
                    >
                      {ANIMAL_SPECIES_SCOPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block space-y-2" htmlFor="animal-alert-radius">
                  <span className="text-sm font-semibold text-[#1A1A1A]">
                    Zone concernée
                  </span>
                  <select
                    id="animal-alert-radius"
                    value={alertComposeState.radiusMeters}
                    onChange={(event) =>
                      setAlertComposeState((current) => ({
                        ...current,
                        radiusMeters: Number(event.target.value),
                      }))
                    }
                    className="w-full rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm outline-none ring-1 ring-gray-200"
                  >
                    {ANIMAL_ALERT_RADIUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2" htmlFor="animal-alert-city">
                  <span className="text-sm font-semibold text-[#1A1A1A]">
                    Ville
                  </span>
                  <input
                    id="animal-alert-city"
                    value={alertComposeState.city}
                    onChange={(event) =>
                      setAlertComposeState((current) => ({
                        ...current,
                        city: event.target.value,
                      }))
                    }
                    placeholder="Cabestany"
                    className="w-full rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm outline-none ring-1 ring-gray-200"
                  />
                </label>

                <label className="block space-y-2" htmlFor="animal-alert-title">
                  <span className="text-sm font-semibold text-[#1A1A1A]">
                    Titre court
                  </span>
                  <input
                    id="animal-alert-title"
                    value={alertComposeState.title}
                    onChange={(event) =>
                      setAlertComposeState((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Ex. Chenilles observées près du parc"
                    className="w-full rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm outline-none ring-1 ring-gray-200"
                  />
                </label>

                <label className="block space-y-2" htmlFor="animal-alert-description">
                  <span className="text-sm font-semibold text-[#1A1A1A]">
                    Description
                  </span>
                  <textarea
                    id="animal-alert-description"
                    value={alertComposeState.description}
                    onChange={(event) =>
                      setAlertComposeState((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    rows={5}
                    placeholder="Décrivez précisément le lieu, le risque observé et ce qu’il faut éviter."
                    className="w-full rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm outline-none ring-1 ring-gray-200"
                  />
                </label>

                <label className="block space-y-2" htmlFor="animal-alert-date">
                  <span className="text-sm font-semibold text-[#1A1A1A]">
                    Date d’observation
                  </span>
                  <input
                    id="animal-alert-date"
                    type="date"
                    value={alertComposeState.observedAt}
                    onChange={(event) =>
                      setAlertComposeState((current) => ({
                        ...current,
                        observedAt: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm outline-none ring-1 ring-gray-200"
                  />
                </label>

                <div className="rounded-[24px] border border-[#E5E7EB] bg-[#FAFAFA] px-4 py-3">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#6B7280]" />
                    <p className="text-sm leading-6 text-[#4B5563]">
                      Restez factuel, localisé et sans coordonnées privées. L’alerte
                      expirera automatiquement pour éviter le bruit.
                    </p>
                  </div>
                </div>

                {alertComposeError ? (
                  <FeedbackBanner variant="error">{alertComposeError}</FeedbackBanner>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmittingAlert}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1A1A1A] px-5 text-sm font-semibold text-white disabled:opacity-70"
                >
                  {isSubmittingAlert ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Publication...
                    </>
                  ) : (
                    "Publier l’alerte"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {selectedAlert ? (
        <div className="fixed inset-0 z-50 bg-black/40 px-4 py-6">
          {(() => {
            const selectedAlertSummary = alertConfirmations[selectedAlert.id]
            const viewerVote = selectedAlertSummary?.viewerVote ?? null

            return (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="animal-alert-detail-title"
            ref={alertDetailDialogRef}
            tabIndex={-1}
            className="mx-auto flex max-h-[calc(100dvh-3rem)] max-w-md flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="min-w-0">
                <p
                  id="animal-alert-detail-title"
                  className="truncate text-base font-semibold text-[#1A1A1A]"
                >
                  {selectedAlert.title}
                </p>
                <p className="text-sm text-[#666666]">{selectedAlert.city}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-gray-500 hover:bg-[#F6F6F6]"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[10px] font-semibold text-[#4B5563]">
                  {getAnimalAlertSourceLabel(selectedAlert.source_type)}
                </span>
                <span className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[10px] font-semibold text-[#4B5563]">
                  {getAnimalAlertTypeLabel(selectedAlert.alert_type)}
                </span>
                <span className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[10px] font-semibold text-[#4B5563]">
                  {getAnimalSpeciesScopeLabel(selectedAlert.species_scope)}
                </span>
                <span className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[10px] font-semibold text-[#4B5563]">
                  Rayon {selectedAlert.radius_meters} m
                </span>
                {selectedAlert.is_verified ? (
                  <span className="rounded-full bg-[#EAF3E0] px-2.5 py-1 text-[10px] font-semibold text-[#385314]">
                    Vérifiée
                  </span>
                ) : (
                  <span className="rounded-full bg-[#FFF4E5] px-2.5 py-1 text-[10px] font-semibold text-[#92400E]">
                    À confirmer
                  </span>
                )}
              </div>

              <div className="mt-4 rounded-[24px] bg-[#FAFAFA] px-4 py-4">
                <p className="text-sm font-semibold text-[#1A1A1A]">Description</p>
                <p className="mt-2 text-sm leading-6 text-[#4B5563]">
                  {selectedAlert.description}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-[20px] bg-[#F8F8F8] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#666666]">
                    Observée
                  </p>
                  <p className="mt-1 text-sm text-[#1A1A1A]">
                    {formatPostDate(selectedAlert.observed_at ?? selectedAlert.created_at) ||
                      "À préciser"}
                  </p>
                </div>
                <div className="rounded-[20px] bg-[#F8F8F8] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#666666]">
                    Expire
                  </p>
                  <p className="mt-1 text-sm text-[#1A1A1A]">
                    {formatPostDate(selectedAlert.expires_at) || "Non défini"}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-[24px] border border-[#E5E7EB] bg-[#FAFAFA] px-4 py-4">
                <p className="text-sm font-semibold text-[#1A1A1A]">
                  Niveau de confiance
                </p>
                <p className="mt-1 text-sm leading-6 text-[#4B5563]">
                  {selectedAlert.is_verified
                    ? "Cette alerte a été marquée comme vérifiée. Tu peux la considérer comme plus fiable."
                    : "Cette alerte vient du terrain mais n’est pas encore vérifiée. Garde une posture de vigilance et confirme visuellement si possible."}
                </p>
                <p className="mt-3 text-sm font-medium text-[#1A1A1A]">
                  {getAlertConsensusText(selectedAlertSummary)}
                </p>
              </div>

              <div className="mt-4 rounded-[24px] border border-[#E5E7EB] bg-white px-4 py-4">
                <p className="text-sm font-semibold text-[#1A1A1A]">
                  Retour terrain
                </p>
                <p className="mt-1 text-sm leading-6 text-[#4B5563]">
                  Aide les autres à savoir si l’alerte est toujours d’actualité.
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => void handleSetAlertVote(selectedAlert, "confirm")}
                    disabled={Boolean(submittingAlertVote)}
                    className={`min-h-11 rounded-2xl px-4 text-sm font-semibold transition ${
                      viewerVote === "confirm"
                        ? "bg-[#1A1A1A] text-white"
                        : "bg-[#F8F8F8] text-[#1A1A1A]"
                    } disabled:opacity-60`}
                  >
                    {submittingAlertVote === "confirm" ? "Envoi..." : "Je confirme"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSetAlertVote(selectedAlert, "clear")}
                    disabled={Boolean(submittingAlertVote)}
                    className={`min-h-11 rounded-2xl px-4 text-sm font-semibold transition ${
                      viewerVote === "clear"
                        ? "bg-[#1A1A1A] text-white"
                        : "bg-[#F8F8F8] text-[#1A1A1A]"
                    } disabled:opacity-60`}
                  >
                    {submittingAlertVote === "clear"
                      ? "Envoi..."
                      : "Ce n’est plus d’actualité"}
                  </button>
                </div>

                {alertVoteError ? (
                  <FeedbackBanner variant="error" className="mt-3">
                    {alertVoteError}
                  </FeedbackBanner>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#666666]">
                <span>Par {selectedAlert.author_label}</span>
                <span>Source {getAnimalAlertSourceLabel(selectedAlert.source_type).toLowerCase()}</span>
              </div>
            </div>
          </div>
            )
          })()}
        </div>
      ) : null}

      {selectedPost ? (
        <div className="fixed inset-0 z-50 bg-black/40 px-4 py-6">
          {(() => {
            const selectedAnimalVisual = getAnimalTypeVisual(selectedPost.animal_type)
            const SelectedAnimalIcon = selectedAnimalVisual.icon

            return (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="animal-detail-title"
            ref={detailDialogRef}
            tabIndex={-1}
            className="mx-auto flex max-h-[calc(100dvh-3rem)] max-w-md flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="min-w-0">
                <p id="animal-detail-title" className="truncate text-base font-semibold text-[#1A1A1A]">
                  {selectedPost.pet_name?.trim() ||
                    selectedPost.animal_type ||
                    "Animal signalé"}
                </p>
                <p className="text-sm text-[#666666]">
                  {[selectedPost.animal_type, selectedPost.city]
                    .filter(Boolean)
                    .join(" · ") || "Lieu à préciser"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-gray-500 hover:bg-[#F6F6F6]"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {selectedPost.photo_url ? (
                <Image
                  src={selectedPost.photo_url}
                  alt={selectedPost.pet_name || selectedPost.animal_type || "Animal"}
                  width={900}
                  height={600}
                  unoptimized
                  className="mb-4 h-56 w-full rounded-[24px] object-cover"
                />
              ) : null}

              <div className="mb-4 flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${selectedAnimalVisual.tone}`}
                >
                  <SelectedAnimalIcon className="h-3.5 w-3.5" />
                  {selectedPost.animal_type || "Autre"}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    getStatusTone(selectedPost.status, Boolean(selectedPost.is_found)).badge
                  }`}
                >
                  {getStatusLabel(selectedPost.status)}
                </span>
                {selectedPost.user_id === viewerUserId ? (
                  <span className="rounded-full bg-[#1A1A1A] px-2.5 py-1 text-[10px] font-semibold text-white">
                    Mon annonce
                  </span>
                ) : null}
                {getTrackingLabel(selectedPost) ? (
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${getTrackingTone(
                      selectedPost
                    )}`}
                  >
                    {getTrackingLabel(selectedPost)}
                  </span>
                ) : null}
                {getResolvedLabel(selectedPost) ? (
                  <span className="rounded-full bg-[#E5E7EB] px-2.5 py-1 text-[10px] font-semibold text-[#4B5563]">
                    {getResolvedLabel(selectedPost)}
                  </span>
                ) : null}
              </div>

              <div className="space-y-4 text-sm text-[#1A1A1A]">
                <div>
                  <p className="font-semibold">Description</p>
                  <p className="mt-1 leading-6 text-[#4B5563]">
                    {selectedPost.description?.trim() || "Aucun détail fourni."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[20px] bg-[#F8F8F8] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#666666]">
                      Date
                    </p>
                    <p className="mt-1">
                      {formatPostDate(selectedPost.last_seen_at ?? selectedPost.created_at) ||
                        "À préciser"}
                    </p>
                  </div>
                  <div className="rounded-[20px] bg-[#F8F8F8] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#666666]">
                      Signalé par
                    </p>
                    <p className="mt-1">{selectedPost.author_label}</p>
                  </div>
                </div>

                <div className="rounded-[20px] bg-[#F8F8F8] px-4 py-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#666666]" />
                    <div className="min-w-0">
                      <p className="font-semibold">Zone</p>
                      <p className="mt-1 text-[#4B5563]">
                        {selectedPost.city?.trim() || "Ville non renseignée"}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedPost.user_id === viewerUserId ? (
                  <div
                    className={`rounded-[24px] border px-4 py-4 ${
                      selectedPost.accepted_response_id
                        ? "border-[#D8E6C1] bg-[#F7FBF1]"
                        : "border-[#F2E1A8] bg-[#FFFBEF]"
                    }`}
                  >
                    <p className="text-sm font-semibold text-[#1A1A1A]">
                      {selectedPost.accepted_response_id
                        ? "Piste retenue et coordonnées débloquées"
                        : "En attente d’une piste fiable"}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#666666]">
                      {selectedPost.accepted_response_id
                        ? "Une piste a été retenue. Tu peux maintenant continuer l’échange hors application avec les coordonnées affichées ci-dessous."
                        : "Quand une personne t’écrit, tu peux retenir une piste. Les coordonnées restent privées jusqu’à ce choix."}
                    </p>
                  </div>
                ) : null}

                {selectedPost.user_id === viewerUserId ? (
                  <div className="rounded-[24px] border border-[#D9E7C3] bg-[#F8FCF2] px-4 py-4">
                    <p className="text-sm font-semibold text-[#1A1A1A]">
                      {getIcadSupportContent(selectedPost.status).title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#4B5563]">
                      {getIcadSupportContent(selectedPost.status).body}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={getIcadSupportContent(selectedPost.status).primaryHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-10 items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1A1A1A] ring-1 ring-[#D9E7C3]"
                      >
                        {getIcadSupportContent(selectedPost.status).primaryLabel}
                      </Link>
                      <Link
                        href={getIcadSupportContent(selectedPost.status).secondaryHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#EAF3E0] px-4 py-2 text-sm font-semibold text-[#385314]"
                      >
                        {getIcadSupportContent(selectedPost.status).secondaryLabel}
                      </Link>
                    </div>
                  </div>
                ) : null}

                {selectedPost.user_id !== viewerUserId && !selectedPost.is_found ? (
                  <div className="rounded-[24px] border border-gray-200 bg-[#FAFAFA] px-4 py-4">
                    <p className="text-sm font-semibold text-[#1A1A1A]">
                      J’ai une piste
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#666666]">
                      Ton message reste public. Email et téléphone restent privés
                      jusqu&apos;à ce que l&apos;auteur retienne ta proposition.
                    </p>

                    <div className="mt-4 space-y-3">
                      <textarea
                        value={responseState.message}
                        onChange={(event) =>
                          setResponseState((current) => ({
                            ...current,
                            message: event.target.value,
                          }))
                        }
                        aria-label="Décrire votre piste"
                        rows={4}
                        placeholder="Ex. Je pense l’avoir vu près du parc ce matin."
                        className="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none ring-1 ring-gray-200"
                      />

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <input
                          type="email"
                          value={responseState.contactEmail}
                          onChange={(event) =>
                            setResponseState((current) => ({
                              ...current,
                              contactEmail: event.target.value,
                            }))
                          }
                          aria-label="Email privé"
                          placeholder="Email privé"
                          className="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none ring-1 ring-gray-200"
                        />
                        <input
                          type="tel"
                          value={responseState.contactPhone}
                          onChange={(event) =>
                            setResponseState((current) => ({
                              ...current,
                              contactPhone: event.target.value,
                            }))
                          }
                          aria-label="Téléphone privé"
                          placeholder="Téléphone privé"
                          className="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none ring-1 ring-gray-200"
                        />
                      </div>

                      {responseError ? (
                        <FeedbackBanner variant="error">{responseError}</FeedbackBanner>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => void handleSubmitResponse()}
                        disabled={isSubmittingResponse}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1A1A1A] px-4 text-sm font-semibold text-white disabled:opacity-70"
                      >
                        {isSubmittingResponse ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Envoi...
                          </>
                        ) : (
                          "Envoyer ma piste"
                        )}
                      </button>
                    </div>
                  </div>
                ) : null}

                {selectedPost.user_id === viewerUserId ? (
                  <div className="rounded-[24px] border border-gray-200 bg-[#FAFAFA] px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#1A1A1A]">
                          Pistes reçues
                        </p>
                        <p className="text-sm leading-6 text-[#666666]">
                          {selectedPost.accepted_response_id
                            ? "La piste retenue affiche maintenant ses coordonnées."
                            : "Choisis une piste pour débloquer ses coordonnées."}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void loadResponses(selectedPost.id)}
                        className="text-sm font-medium text-[#D6A100]"
                      >
                        Actualiser
                      </button>
                    </div>

                    {isLoadingResponses ? (
                      <div className="mt-4 text-sm text-[#666666]">Chargement des pistes...</div>
                    ) : (responsesByPost[selectedPost.id] ?? []).length === 0 ? (
                      <div className="mt-4 text-sm text-[#666666]">
                        Aucune piste reçue pour le moment.
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {(responsesByPost[selectedPost.id] ?? []).map((response) => (
                          <div
                            key={response.id}
                            className="rounded-[20px] bg-white px-4 py-4 ring-1 ring-gray-200"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[#1A1A1A]">
                                  {response.responderLabel}
                                </p>
                                <p className="mt-1 text-sm leading-6 text-[#4B5563]">
                                  {response.message}
                                </p>
                              </div>
                              <span
                                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                  response.status === "accepted"
                                    ? "bg-[#D9E7C3] text-[#385314]"
                                    : "bg-[#F3F4F6] text-[#4B5563]"
                                }`}
                              >
                                {response.status === "accepted" ? "Retenue" : "En attente"}
                              </span>
                            </div>

                            <p className="mt-2 text-xs text-[#666666]">
                              {formatPostDate(response.createdAt) || "Date non disponible"}
                            </p>

                            {response.status === "accepted" ? (
                              <div className="mt-3 rounded-2xl bg-[#F8F8F8] px-3 py-3 text-sm text-[#1A1A1A]">
                                <p>Email : {response.contactEmail}</p>
                                <p className="mt-1">Téléphone : {response.contactPhone}</p>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void handleAcceptResponse(selectedPost, response.id)}
                                disabled={Boolean(acceptingResponseId)}
                                className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full bg-[#1A1A1A] px-4 text-sm font-semibold text-white disabled:opacity-70"
                              >
                                {acceptingResponseId === response.id
                                  ? "Validation..."
                                  : "Retenir cette piste"}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {responseError ? (
                      <FeedbackBanner variant="error" className="mt-3">
                        {responseError}
                      </FeedbackBanner>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            {selectedPost.user_id === viewerUserId && !selectedPost.is_found ? (
              <div className="border-t border-gray-100 px-5 py-4">
                <button
                  type="button"
                  onClick={() => void handleResolvePost(selectedPost)}
                  disabled={isResolving}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1A1A1A] px-5 text-sm font-semibold text-white disabled:opacity-70"
                >
                  {isResolving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Mise à jour...
                    </>
                  ) : selectedPost.status === "lost" ? (
                    "Marquer comme retrouvé"
                  ) : (
                    "Clôturer l’annonce"
                  )}
                </button>
              </div>
            ) : null}
          </div>
            )
          })()}
        </div>
      ) : null}
    </div>
  )
}

export default function AnimauxPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white pb-24" />}>
      <AnimauxPageContent />
    </Suspense>
  )
}
