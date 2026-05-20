"use client"

import Image from "next/image"
import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  ArrowUpRight,
  HandHelping,
  HeartHandshake,
  Loader2,
  Search,
  ShieldCheck,
  X,
} from "lucide-react"
import AppTopbar from "@/components/AppTopbar"
import { useDialogFocusTrap } from "@/lib/use-dialog-focus-trap"
import {
  isValidContactEmail,
  isValidContactPhone,
  validatePublicTextFields,
} from "@/lib/contact-guard"
import { buildAuthorizedHeaders } from "@/lib/notifications-client"
import { createClient, ensureSignedInUser, getCurrentSessionUser } from "@/lib/supabase"

type HelpKind = "request" | "offer"
type HelpCategory =
  | "Courses"
  | "Déplacement"
  | "Présence"
  | "Matériel"
  | "Voisinage"
  | "Numérique"

type HelpPostRecord = {
  id: string
  kind: HelpKind
  category: HelpCategory
  priority: "normal" | "urgent"
  title: string
  summary: string
  details: string
  city: string
  scheduled_for: string | null
  availability_slot: "morning" | "afternoon" | "evening" | "flexible" | null
  availability_text: string | null
  contact_hint: string | null
  author_label: string | null
  user_id: string
  status: "open" | "closed"
  workflow_state: "searching" | "found" | "closed"
  accepted_response_id?: string | null
  created_at: string
}

type HelpPostResponseRecord = {
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
  kind: HelpKind
  category: HelpCategory
  priority: "normal" | "urgent"
  title: string
  summary: string
  details: string
  city: string
  scheduledDate: string
  availabilitySlot: "morning" | "afternoon" | "evening" | "flexible"
  availabilityText: string
  contactHint: string
}

type ResponseComposeState = {
  message: string
  contactEmail: string
  contactPhone: string
}

const CATEGORY_FILTERS = [
  { value: "all", label: "Toutes" },
  { value: "Courses", label: "Courses" },
  { value: "Déplacement", label: "Déplacement" },
  { value: "Présence", label: "Présence" },
  { value: "Matériel", label: "Matériel" },
  { value: "Voisinage", label: "Voisinage" },
  { value: "Numérique", label: "Numérique" },
] as const

const KIND_FILTERS = [
  { value: "all", label: "Tout" },
  { value: "request", label: "Besoin d’aide" },
  { value: "offer", label: "Je peux aider" },
] as const

const DEFAULT_COMPOSE_STATE: ComposeState = {
  kind: "request",
  category: "Courses",
  priority: "normal",
  title: "",
  summary: "",
  details: "",
  city: "",
  scheduledDate: "",
  availabilitySlot: "flexible",
  availabilityText: "",
  contactHint: "",
}

const DEFAULT_RESPONSE_STATE: ResponseComposeState = {
  message: "",
  contactEmail: "",
  contactPhone: "",
}

function getKindTone(kind: HelpKind) {
  if (kind === "request") {
    return {
      card: "border-[#F7E3A0] bg-[#FFFDF3]",
      badge: "bg-[#D6A100] text-white",
      button: "bg-[#1A1A1A] text-white",
      ghost: "bg-white text-[#1A1A1A] ring-1 ring-gray-200",
    }
  }

  return {
    card: "border-[#D9E7C3] bg-[#F8FCF2]",
    badge: "bg-[#6B8E23] text-white",
    button: "bg-[#1A1A1A] text-white",
    ghost: "bg-white text-[#1A1A1A] ring-1 ring-gray-200",
  }
}

function getKindLabel(kind: HelpKind) {
  return kind === "request" ? "Besoin d’aide" : "Je peux aider"
}

function formatPostDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(date)
}

function formatScheduledDate(value: string | null) {
  if (!value) {
    return null
  }

  const date = new Date(`${value}T12:00:00`)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date)
}

function getAvailabilitySlotLabel(slot: ComposeState["availabilitySlot"] | HelpPostRecord["availability_slot"]) {
  switch (slot) {
    case "morning":
      return "matin"
    case "afternoon":
      return "après-midi"
    case "evening":
      return "soir"
    case "flexible":
      return "horaire flexible"
    default:
      return null
  }
}

function formatAvailabilitySummary(post: Pick<HelpPostRecord, "scheduled_for" | "availability_slot" | "availability_text">) {
  const parts = [
    formatScheduledDate(post.scheduled_for),
    getAvailabilitySlotLabel(post.availability_slot),
    post.availability_text?.trim() || null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(" · ") : "À préciser"
}

function getWorkflowLabel(post: Pick<HelpPostRecord, "workflow_state" | "status">) {
  if (post.workflow_state === "found") {
    return "Solution trouvée"
  }

  if (post.workflow_state === "closed" || post.status === "closed") {
    return "Annonce clôturée"
  }

  return "En recherche"
}

function getWorkflowTone(post: Pick<HelpPostRecord, "workflow_state" | "status">) {
  if (post.workflow_state === "found") {
    return "bg-[#D9E7C3] text-[#385314]"
  }

  if (post.workflow_state === "closed" || post.status === "closed") {
    return "bg-[#E5E7EB] text-[#4B5563]"
  }

  return "bg-[#FEF3C7] text-[#92400E]"
}

function getPriorityRank(priority: HelpPostRecord["priority"]) {
  return priority === "urgent" ? 0 : 1
}

function EntraidePageContent() {
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const [query, setQuery] = useState("")
  const [viewMode, setViewMode] = useState<"local" | "mine">("local")
  const [kindFilter, setKindFilter] =
    useState<(typeof KIND_FILTERS)[number]["value"]>("all")
  const [categoryFilter, setCategoryFilter] =
    useState<(typeof CATEGORY_FILTERS)[number]["value"]>("all")
  const [priorityFilter, setPriorityFilter] = useState<"all" | "urgent">("all")
  const [preferredCity, setPreferredCity] = useState<string | null>(null)
  const [viewerUserId, setViewerUserId] = useState<string | null>(null)
  const [posts, setPosts] = useState<HelpPostRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [isClosingPost, setIsClosingPost] = useState(false)
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false)
  const [isLoadingResponses, setIsLoadingResponses] = useState(false)
  const [acceptingResponseId, setAcceptingResponseId] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<HelpPostRecord | null>(null)
  const [composeState, setComposeState] = useState<ComposeState>(DEFAULT_COMPOSE_STATE)
  const [responseState, setResponseState] = useState<ResponseComposeState>(DEFAULT_RESPONSE_STATE)
  const [responsesByPost, setResponsesByPost] = useState<Record<string, HelpPostResponseRecord[]>>(
    {}
  )
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadNotice, setLoadNotice] = useState<string | null>(null)
  const composeDialogRef = useDialogFocusTrap(
    isComposeOpen,
    () => setIsComposeOpen(false)
  )
  const detailDialogRef = useDialogFocusTrap(
    selectedItem !== null,
    () => setSelectedItem(null)
  )
  const requestedPostId = searchParams.get("postId")?.trim() || null
  const requestedView = searchParams.get("view")?.trim() || null

  useEffect(() => {
    let mounted = true

    async function loadPage() {
      setIsLoading(true)
      setLoadError(null)

      try {
        const user = await getCurrentSessionUser(supabase)
        let nextPreferredCity: string | null = null

        if (user) {
          setViewerUserId(user.id)

          const { data: profile } = await supabase
            .from("profiles")
            .select("preferred_city")
            .eq("id", user.id)
            .maybeSingle()

          nextPreferredCity = profile?.preferred_city?.trim() || null
        }

        const publicPostsQuery = supabase
          .from("help_posts")
          .select(
            "id, kind, category, priority, title, summary, details, city, scheduled_for, availability_slot, availability_text, contact_hint, author_label, user_id, status, workflow_state, accepted_response_id, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(50)

        const ownPostsQuery = user
          ? supabase
              .from("help_posts")
              .select(
                "id, kind, category, priority, title, summary, details, city, scheduled_for, availability_slot, availability_text, contact_hint, author_label, user_id, status, workflow_state, accepted_response_id, created_at"
              )
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
              .limit(100)
          : null

        const [{ data: publicPosts, error: publicPostsError }, ownPostsResult] =
          await Promise.all([
            publicPostsQuery.eq("status", "open"),
            ownPostsQuery ?? Promise.resolve({ data: null, error: null }),
          ])

        if (publicPostsError) {
          throw publicPostsError
        }

        if (ownPostsResult?.error) {
          throw ownPostsResult.error
        }

        const mergedPosts = [...(publicPosts ?? []), ...((ownPostsResult?.data ?? []) as HelpPostRecord[])]
        const dedupedPosts = Array.from(
          new Map(mergedPosts.map((item) => [item.id, item])).values()
        ).sort(
          (left, right) =>
            new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
        )

        if (mounted) {
          if (requestedView === "mine" && user) {
            setViewMode("mine")
          }

          setPreferredCity(nextPreferredCity)
          setPosts(dedupedPosts as HelpPostRecord[])
          setComposeState((current) => ({
            ...current,
            city: current.city || nextPreferredCity || "",
          }))

          if (nextPreferredCity) {
            const localCount = (publicPosts ?? []).filter(
              (item) => item.city === nextPreferredCity
            ).length
            setLoadNotice(
              localCount > 0
                ? `Affichage prioritaire des publications autour de ${nextPreferredCity}.`
                : `Aucune publication locale autour de ${nextPreferredCity} pour l’instant.`
            )
          } else {
            setLoadNotice(null)
          }
        }
      } catch (error) {
        if (mounted) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Impossible de charger les publications d’entraide."
          )
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    void loadPage()

    return () => {
      mounted = false
    }
  }, [requestedView, supabase])

  useEffect(() => {
    if (!requestedPostId || posts.length === 0) {
      return
    }

    const requestedPost = posts.find((item) => item.id === requestedPostId)

    if (requestedPost) {
      setSelectedItem((current) => (current?.id === requestedPost.id ? current : requestedPost))

      if (viewerUserId && requestedPost.user_id === viewerUserId) {
        setViewMode("mine")
      }
    }
  }, [posts, requestedPostId, viewerUserId])

  useEffect(() => {
    if (!selectedItem) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedItem(null)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedItem])

  useEffect(() => {
    if (!selectedItem || selectedItem.user_id !== viewerUserId) {
      return
    }

    let mounted = true
    const postId = selectedItem.id

    async function loadResponses() {
      setIsLoadingResponses(true)

      try {
        const response = await fetch(
          `/api/entraide/responses?postId=${encodeURIComponent(postId)}`,
          {
            headers: await buildAuthorizedHeaders(),
          }
        )

        const payload = (await response.json()) as {
          error?: string
          responses?: HelpPostResponseRecord[]
        }

        if (!response.ok) {
          throw new Error(payload.error ?? "Impossible de charger les réponses.")
        }

        if (mounted) {
          setResponsesByPost((current) => ({
            ...current,
            [postId]: payload.responses ?? [],
          }))
        }
      } catch (error) {
        if (mounted) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Impossible de charger les réponses à cette annonce."
          )
        }
      } finally {
        if (mounted) {
          setIsLoadingResponses(false)
        }
      }
    }

    void loadResponses()

    return () => {
      mounted = false
    }
  }, [selectedItem, viewerUserId])

  useEffect(() => {
    if (!isComposeOpen) {
      return
    }

    setComposeState((current) => ({
      ...current,
      city: current.city || preferredCity || "",
    }))
  }, [isComposeOpen, preferredCity])

  useEffect(() => {
    setResponseState(DEFAULT_RESPONSE_STATE)
  }, [selectedItem?.id])

  const scopedPosts = useMemo(() => {
    if (viewMode === "mine") {
      if (!viewerUserId) {
        return []
      }

      return posts.filter((item) => item.user_id === viewerUserId)
    }

    if (!preferredCity) {
      return posts.filter((item) => item.status === "open")
    }

    const openPosts = posts.filter((item) => item.status === "open")
    const localPosts = openPosts.filter((item) => item.city === preferredCity)
    return localPosts.length > 0 ? localPosts : openPosts
  }, [posts, preferredCity, viewMode, viewerUserId])

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return scopedPosts.filter((item) => {
      const matchesKind = kindFilter === "all" ? true : item.kind === kindFilter
      const matchesCategory =
        categoryFilter === "all" ? true : item.category === categoryFilter
      const matchesPriority =
        priorityFilter === "all" ? true : item.priority === "urgent"
      const haystack = [
        item.title,
        item.summary,
        item.details,
        item.city,
        item.category,
        item.author_label ?? "",
      ].join(" ")

      const matchesQuery =
        normalizedQuery.length === 0 || haystack.toLowerCase().includes(normalizedQuery)

      return matchesKind && matchesCategory && matchesPriority && matchesQuery
    })
  }, [categoryFilter, kindFilter, priorityFilter, query, scopedPosts])

  const sortedItems = useMemo(
    () =>
      [...filteredItems].sort((left, right) => {
        const priorityDelta = getPriorityRank(left.priority) - getPriorityRank(right.priority)

        if (priorityDelta !== 0) {
          return priorityDelta
        }

        return new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
      }),
    [filteredItems]
  )

  const requestsCount = filteredItems.filter((item) => item.kind === "request").length
  const offersCount = filteredItems.filter((item) => item.kind === "offer").length

  async function openCompose(kind: HelpKind) {
    setEditingPostId(null)
    setComposeState((current) => ({
      ...DEFAULT_COMPOSE_STATE,
      kind,
      city: current.city || preferredCity || "",
    }))
    setIsComposeOpen(true)
  }

  async function handleCreatePost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const publicTextError = validatePublicTextFields([
      { label: "Titre", value: composeState.title },
      { label: "Résumé", value: composeState.summary },
      { label: "Détail", value: composeState.details },
      { label: "Disponibilité", value: composeState.availabilityText },
      { label: "Consigne de contact", value: composeState.contactHint },
    ])

    if (publicTextError) {
      setLoadError(publicTextError)
      return
    }

    setIsSubmitting(true)
    setLoadError(null)

    try {
      const user = await ensureSignedInUser(supabase)

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, first_name")
        .eq("id", user.id)
        .maybeSingle()

      const authorLabel =
        profile?.display_name?.trim() ||
        profile?.first_name?.trim() ||
        "Habitant local"

      const payload = {
        user_id: user.id,
        kind: composeState.kind,
        category: composeState.category,
        priority: composeState.priority,
        title: composeState.title.trim(),
        summary: composeState.summary.trim(),
        details: composeState.details.trim(),
        city: composeState.city.trim(),
        scheduled_for: composeState.scheduledDate || null,
        availability_slot: composeState.availabilitySlot || null,
        availability_text: composeState.availabilityText.trim() || null,
        contact_hint: composeState.contactHint.trim() || null,
        author_label: authorLabel,
        status: "open",
        workflow_state: "searching",
      }

      const mutation = editingPostId
        ? supabase
            .from("help_posts")
            .update(payload)
            .eq("id", editingPostId)
            .eq("user_id", user.id)
        : supabase.from("help_posts").insert(payload)

      const { data, error } = await mutation
        .select(
          "id, kind, category, priority, title, summary, details, city, scheduled_for, availability_slot, availability_text, contact_hint, author_label, user_id, status, workflow_state, accepted_response_id, created_at"
        )
        .single()

      if (error) {
        throw error
      }

      const createdPost = data as HelpPostRecord

      setViewerUserId(user.id)
      setPosts((current) =>
        editingPostId
          ? current.map((item) => (item.id === createdPost.id ? createdPost : item))
          : [createdPost, ...current]
      )
      setIsComposeOpen(false)
      setEditingPostId(null)
      setComposeState({
        ...DEFAULT_COMPOSE_STATE,
        city: preferredCity || "",
      })
      setSelectedItem(createdPost)
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Impossible de publier cette annonce d’entraide."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleEditPost(post: HelpPostRecord) {
    setSelectedItem(null)
    setEditingPostId(post.id)
    setComposeState({
      kind: post.kind,
      category: post.category,
      priority: post.priority,
      title: post.title,
      summary: post.summary,
      details: post.details,
      city: post.city,
      scheduledDate: post.scheduled_for ?? "",
      availabilitySlot: post.availability_slot ?? "flexible",
      availabilityText: post.availability_text ?? "",
      contactHint: post.contact_hint ?? "",
    })
    setIsComposeOpen(true)
  }

  async function handleClosePost(post: HelpPostRecord) {
    setIsClosingPost(true)
    setLoadError(null)

    try {
      const user = await ensureSignedInUser(supabase)

      const { error } = await supabase
        .from("help_posts")
        .update({
          status: "closed",
          workflow_state: post.accepted_response_id ? "found" : "closed",
          follow_up_scheduled_at: null,
          follow_up_notified_at: null,
        })
        .eq("id", post.id)
        .eq("user_id", user.id)

      if (error) {
        throw error
      }

      setPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? {
                ...item,
                status: "closed",
                workflow_state: post.accepted_response_id ? "found" : "closed",
              }
            : item
        )
      )
      setSelectedItem(null)
      setLoadNotice("Annonce clôturée. Elle n’apparaît plus dans la liste publique.")
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Impossible de clôturer cette annonce."
      )
    } finally {
      setIsClosingPost(false)
    }
  }

  async function handleCreateResponse(post: HelpPostRecord) {
    const publicTextError = validatePublicTextFields([
      { label: "Message", value: responseState.message },
    ])

    if (publicTextError) {
      setLoadError(publicTextError)
      return
    }

    if (!responseState.contactEmail.trim() || !responseState.contactPhone.trim()) {
      setLoadError("Ajoute un email et un numéro de téléphone pour être recontacté(e).")
      return
    }

    if (!isValidContactEmail(responseState.contactEmail)) {
      setLoadError("Ajoute une adresse email valide pour être recontacté(e).")
      return
    }

    if (!isValidContactPhone(responseState.contactPhone)) {
      setLoadError("Ajoute un numéro de téléphone valide pour être recontacté(e).")
      return
    }

    setIsSubmittingResponse(true)
    setLoadError(null)

    try {
      await ensureSignedInUser(supabase)

      const response = await fetch("/api/entraide/responses", {
        method: "POST",
        headers: await buildAuthorizedHeaders(),
        body: JSON.stringify({
          action: "create",
          postId: post.id,
          message: responseState.message.trim(),
          contactEmail: responseState.contactEmail.trim(),
          contactPhone: responseState.contactPhone.trim(),
        }),
      })

      const payload = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? "Impossible d'envoyer cette proposition.")
      }

      setResponseState(DEFAULT_RESPONSE_STATE)
      setLoadNotice("Réponse envoyée. Le créateur de l’annonce a été notifié.")
      setSelectedItem(null)
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Impossible d'envoyer cette proposition."
      )
    } finally {
      setIsSubmittingResponse(false)
    }
  }

  async function handleAcceptResponse(post: HelpPostRecord, responseItem: HelpPostResponseRecord) {
    setAcceptingResponseId(responseItem.id)
    setLoadError(null)

    try {
      const response = await fetch("/api/entraide/responses", {
        method: "POST",
        headers: await buildAuthorizedHeaders(),
        body: JSON.stringify({
          action: "accept",
          responseId: responseItem.id,
        }),
      })

      const payload = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? "Impossible de retenir cette proposition.")
      }

      const refreshResponse = await fetch(
        `/api/entraide/responses?postId=${encodeURIComponent(post.id)}`,
        {
          headers: await buildAuthorizedHeaders(),
        }
      )
      const refreshPayload = (await refreshResponse.json()) as {
        error?: string
        responses?: HelpPostResponseRecord[]
      }

      if (!refreshResponse.ok) {
        throw new Error(refreshPayload.error ?? "Impossible de recharger les réponses.")
      }

      setResponsesByPost((current) => ({
        ...current,
        [post.id]: refreshPayload.responses ?? [],
      }))
      setPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? { ...item, accepted_response_id: responseItem.id, workflow_state: "searching" }
            : item
        )
      )
      setLoadNotice(
        "Proposition retenue. Les coordonnées ont été débloquées et une notification de suivi a été créée."
      )
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Impossible de retenir cette proposition."
      )
    } finally {
      setAcceptingResponseId(null)
    }
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      <AppTopbar
        title="Entraide"
        filterPanel={
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#666666]">
                Type
              </p>
              <div className="grid grid-cols-3 gap-2">
                {KIND_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setKindFilter(filter.value)}
                    className={`min-h-11 rounded-2xl px-3 text-xs font-semibold ${
                      kindFilter === filter.value
                        ? "bg-[#1A1A1A] text-white"
                        : "bg-[#F8F8F8] text-[#1A1A1A]"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#666666]">
                Catégorie
              </p>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORY_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setCategoryFilter(filter.value)}
                    className={`min-h-11 rounded-2xl px-3 text-xs font-semibold ${
                      categoryFilter === filter.value
                        ? "bg-[#1A1A1A] text-white"
                        : "bg-[#F8F8F8] text-[#1A1A1A]"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#666666]">
                Priorité
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "all", label: "Toutes" },
                  { value: "urgent", label: "Urgentes" },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setPriorityFilter(filter.value as "all" | "urgent")}
                    className={`min-h-11 rounded-2xl px-3 text-xs font-semibold ${
                      priorityFilter === filter.value
                        ? "bg-[#1A1A1A] text-white"
                        : "bg-[#F8F8F8] text-[#1A1A1A]"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        }
        searchPanel={
          <div className="flex items-center gap-3 rounded-2xl bg-[#F8F8F8] px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Rechercher une aide, un besoin ou du matériel"
              placeholder="Rechercher une aide, un besoin, un matériel..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>
        }
      />

      <div className="mx-auto max-w-md px-4 pt-4">
        <div className="border-b border-gray-100 pb-4">
          <p className="text-sm font-semibold text-[#1A1A1A]">
            {preferredCity ? `Autour de ${preferredCity}` : "Entraide locale"}
          </p>
          <p className="mt-1 text-sm leading-6 text-[#666666]">
            Demandes et propositions d’aide de proximité. Premier contact via
            l’app, échange clair, puis validation avant tout partage
            d’informations sensibles.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode("local")}
              className={`rounded-full px-3 py-2 text-sm font-semibold ${
                viewMode === "local"
                  ? "bg-[#1A1A1A] text-white"
                  : "bg-[#F3F4F6] text-[#1A1A1A]"
              }`}
            >
              Local
            </button>
            <button
              type="button"
              onClick={() => setViewMode("mine")}
              disabled={!viewerUserId}
              className={`rounded-full px-3 py-2 text-sm font-semibold disabled:opacity-50 ${
                viewMode === "mine"
                  ? "bg-[#1A1A1A] text-white"
                  : "bg-[#F3F4F6] text-[#1A1A1A]"
              }`}
            >
              Mes annonces
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => void openCompose("request")}
            className="rounded-[24px] border border-[#F7E3A0] bg-[#FFFDF3] px-4 py-4 text-left"
          >
            <div className="flex items-center gap-2">
              <HandHelping className="h-4 w-4 text-[#8A6A00]" />
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8A6A00]">
                Demander
              </p>
            </div>
            <p className="mt-2 text-base font-semibold text-[#1A1A1A]">
              J’ai besoin d’un coup de main
            </p>
            <p className="mt-1 text-sm leading-6 text-[#666666]">
              Courses, déplacement, présence, aide numérique ou besoin ponctuel.
            </p>
          </button>

          <button
            type="button"
            onClick={() => void openCompose("offer")}
            className="rounded-[24px] border border-[#D9E7C3] bg-[#F8FCF2] px-4 py-4 text-left"
          >
            <div className="flex items-center gap-2">
              <HeartHandshake className="h-4 w-4 text-[#4D6B14]" />
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4D6B14]">
                Proposer
              </p>
            </div>
            <p className="mt-2 text-base font-semibold text-[#1A1A1A]">
              Je peux rendre service
            </p>
            <p className="mt-1 text-sm leading-6 text-[#666666]">
              Matériel, accompagnement, voisinage, présence ou disponibilité.
            </p>
          </button>
        </div>

        <div className="mt-4 rounded-[24px] border border-gray-200 bg-[#FBFBFB] px-4 py-3.5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1A1A1A]" />
            <p className="text-sm leading-6 text-[#666666]">
              Reste concret, privilégie les besoins ponctuels, et évite toute
              donnée sensible dans le texte public.
            </p>
          </div>
        </div>

        {loadError ? (
          <div
            className="mt-4 rounded-[24px] border border-[#F9C7CB] bg-[#FFF5F5] px-4 py-3.5 text-sm leading-6 text-[#8A1C23]"
            role="alert"
            aria-live="polite"
          >
            {loadError}
          </div>
        ) : null}

        {loadNotice ? (
          <p className="mt-4 text-sm text-[#666666]" role="status" aria-live="polite">
            {loadNotice}
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="font-medium text-[#1A1A1A]">
            {filteredItems.length} publication(s) affichée(s)
          </p>
          <p className="text-[#666666]">
            {requestsCount} besoin(s) · {offersCount} aide(s)
          </p>
        </div>

        {isLoading ? (
          <div className="py-10 text-sm text-[#666666]">
            <div className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement des publications locales...
            </div>
          </div>
        ) : null}

        {!isLoading && sortedItems.length === 0 ? (
          <div className="mt-4 rounded-[24px] bg-[#FBFBFB] px-4 py-5 text-sm leading-6 text-[#666666] ring-1 ring-gray-100">
            Aucune publication ne correspond aux filtres en cours. Tu peux ouvrir
            une première annonce d’entraide juste au-dessus.
          </div>
        ) : null}

        {!isLoading && sortedItems.length > 0 ? (
          <div className="mt-4 space-y-3">
            {sortedItems.map((item) => {
              const styles = getKindTone(item.kind)
              const createdAt = formatPostDate(item.created_at)
              const isOwner = viewerUserId != null && item.user_id === viewerUserId
              const workflowLabel = getWorkflowLabel(item)
              const workflowTone = getWorkflowTone(item)
              return (
                <article
                  key={item.id}
                  className={`rounded-[24px] border px-4 py-4 ${styles.card}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#666666]">
                        {item.category} · {item.city}
                      </p>
                      <h2 className="mt-1 text-base font-semibold text-[#1A1A1A]">
                        {item.title}
                      </h2>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex flex-wrap justify-end gap-2">
                        <span
                          className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-[11px] font-semibold ${styles.badge}`}
                        >
                          {getKindLabel(item.kind)}
                        </span>
                        {item.priority === "urgent" ? (
                          <span className="rounded-full bg-[#B91C1C] px-3 py-1 text-[11px] font-semibold text-white">
                            Urgent
                          </span>
                        ) : null}
                      </div>
                      {isOwner ? (
                        <span className="text-[11px] font-semibold text-[#666666]">
                          Votre annonce
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-[#4B5563]">
                    {item.summary}
                  </p>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-black/5 pt-3">
                    <div className="min-w-0 text-xs text-[#666666]">
                      <p className="truncate">
                        Par : {item.author_label?.trim() || "Habitant local"}
                      </p>
                      <p className="truncate">
                        Disponibilité : {formatAvailabilitySummary(item)}
                      </p>
                      <p className="truncate">
                        État : <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${workflowTone}`}>{workflowLabel}</span>
                      </p>
                      {createdAt ? <p className="truncate">Publié le {createdAt}</p> : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        className={`inline-flex items-center rounded-full px-3 py-2 text-sm font-semibold ${styles.ghost}`}
                      >
                        Détail
                      </button>
                      {item.status === "open" ? (
                        <button
                          type="button"
                          onClick={() => setSelectedItem(item)}
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold ${styles.button}`}
                        >
                          {isOwner ? "Gérer" : "Contacter"}
                          <ArrowUpRight className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : null}
      </div>

      {isComposeOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end overflow-y-auto bg-black/45 p-4 sm:items-center sm:justify-center"
          onClick={() => setIsComposeOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="entraide-compose-title"
            ref={composeDialogRef}
            tabIndex={-1}
            className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[28px] bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#666666]">
                  {editingPostId ? "Modifier l’annonce" : "Nouvelle annonce"}
                </p>
                <h2
                  id="entraide-compose-title"
                  className="mt-1 text-lg font-semibold text-[#1A1A1A]"
                >
                  {editingPostId
                    ? "Mettre à jour l’annonce"
                    : composeState.kind === "request"
                      ? "Demander un coup de main"
                      : "Proposer son aide"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsComposeOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#F8F8F8] text-[#1A1A1A]"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form className="mt-4 space-y-4" onSubmit={handleCreatePost}>
              <div className="grid grid-cols-2 gap-2">
                {(["request", "offer"] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() =>
                      setComposeState((current) => ({
                        ...current,
                        kind,
                      }))
                    }
                    className={`min-h-11 rounded-2xl px-3 text-sm font-semibold ${
                      composeState.kind === kind
                        ? "bg-[#1A1A1A] text-white"
                        : "bg-[#F8F8F8] text-[#1A1A1A]"
                    }`}
                  >
                    {getKindLabel(kind)}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: "normal", label: "Normal" },
                  { value: "urgent", label: "Urgent" },
                ] as const).map((priority) => (
                  <button
                    key={priority.value}
                    type="button"
                    onClick={() =>
                      setComposeState((current) => ({
                        ...current,
                        priority: priority.value,
                      }))
                    }
                    className={`min-h-11 rounded-2xl px-3 text-sm font-semibold ${
                      composeState.priority === priority.value
                        ? priority.value === "urgent"
                          ? "bg-[#B91C1C] text-white"
                          : "bg-[#1A1A1A] text-white"
                        : "bg-[#F8F8F8] text-[#1A1A1A]"
                    }`}
                  >
                    {priority.label}
                  </button>
                ))}
              </div>

              <div className="grid gap-2">
                <label htmlFor="help-post-category" className="text-sm font-medium text-[#1A1A1A]">
                  Catégorie
                </label>
                <select
                  id="help-post-category"
                  value={composeState.category}
                  onChange={(event) =>
                    setComposeState((current) => ({
                      ...current,
                      category: event.target.value as HelpCategory,
                    }))
                  }
                  className="min-h-11 rounded-2xl bg-[#F8F8F8] px-4 text-sm outline-none"
                >
                  {CATEGORY_FILTERS.filter((item) => item.value !== "all").map((filter) => (
                    <option key={filter.value} value={filter.value}>
                      {filter.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label htmlFor="help-post-title" className="text-sm font-medium text-[#1A1A1A]">Titre</label>
                <input
                  id="help-post-title"
                  required
                  value={composeState.title}
                  onChange={(event) =>
                    setComposeState((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Ex. Besoin d’un passage en pharmacie"
                  className="min-h-11 rounded-2xl bg-[#F8F8F8] px-4 text-sm outline-none placeholder:text-gray-400"
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="help-post-summary" className="text-sm font-medium text-[#1A1A1A]">
                  Résumé
                </label>
                <input
                  id="help-post-summary"
                  required
                  value={composeState.summary}
                  onChange={(event) =>
                    setComposeState((current) => ({
                      ...current,
                      summary: event.target.value,
                    }))
                  }
                  placeholder="Un besoin court et concret"
                  className="min-h-11 rounded-2xl bg-[#F8F8F8] px-4 text-sm outline-none placeholder:text-gray-400"
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="help-post-details" className="text-sm font-medium text-[#1A1A1A]">
                  Détail
                </label>
                <textarea
                  id="help-post-details"
                  required
                  value={composeState.details}
                  onChange={(event) =>
                    setComposeState((current) => ({
                      ...current,
                      details: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Précise le contexte sans donner d’informations sensibles."
                  className="rounded-[20px] bg-[#F8F8F8] px-4 py-3 text-sm outline-none placeholder:text-gray-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <label htmlFor="help-post-city" className="text-sm font-medium text-[#1A1A1A]">
                    Ville
                  </label>
                  <input
                    id="help-post-city"
                    required
                    value={composeState.city}
                    onChange={(event) =>
                      setComposeState((current) => ({
                        ...current,
                        city: event.target.value,
                      }))
                    }
                    className="min-h-11 rounded-2xl bg-[#F8F8F8] px-4 text-sm outline-none"
                  />
                </div>

                <div className="grid gap-2">
                  <label htmlFor="help-post-date" className="text-sm font-medium text-[#1A1A1A]">
                    Date
                  </label>
                  <input
                    id="help-post-date"
                    type="date"
                    value={composeState.scheduledDate}
                    onChange={(event) =>
                      setComposeState((current) => ({
                        ...current,
                        scheduledDate: event.target.value,
                      }))
                    }
                    className="min-h-11 rounded-2xl bg-[#F8F8F8] px-4 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <label htmlFor="help-post-slot" className="text-sm font-medium text-[#1A1A1A]">
                    Créneau
                  </label>
                  <select
                    id="help-post-slot"
                    value={composeState.availabilitySlot}
                    onChange={(event) =>
                      setComposeState((current) => ({
                        ...current,
                        availabilitySlot: event.target.value as ComposeState["availabilitySlot"],
                      }))
                    }
                    className="min-h-11 rounded-2xl bg-[#F8F8F8] px-4 text-sm outline-none"
                  >
                    <option value="flexible">Flexible</option>
                    <option value="morning">Matin</option>
                    <option value="afternoon">Après-midi</option>
                    <option value="evening">Soir</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <label htmlFor="help-post-availability" className="text-sm font-medium text-[#1A1A1A]">
                    Disponibilité
                  </label>
                  <input
                    id="help-post-availability"
                    value={composeState.availabilityText}
                    onChange={(event) =>
                      setComposeState((current) => ({
                        ...current,
                        availabilityText: event.target.value,
                      }))
                    }
                    placeholder="Ex. ce soir"
                    className="min-h-11 rounded-2xl bg-[#F8F8F8] px-4 text-sm outline-none placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <label htmlFor="help-post-contact-hint" className="text-sm font-medium text-[#1A1A1A]">
                  Consigne de contact
                </label>
                <input
                  id="help-post-contact-hint"
                  value={composeState.contactHint}
                  onChange={(event) =>
                    setComposeState((current) => ({
                      ...current,
                      contactHint: event.target.value,
                    }))
                  }
                  placeholder="Ex. message d’abord dans l’app"
                  className="min-h-11 rounded-2xl bg-[#F8F8F8] px-4 text-sm outline-none placeholder:text-gray-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="inline-flex rounded-full bg-[#F8F8F8] px-4 py-2.5 text-sm font-semibold text-[#1A1A1A]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center rounded-full bg-[#1A1A1A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {isSubmitting
                    ? editingPostId
                      ? "Mise à jour..."
                      : "Publication..."
                    : editingPostId
                      ? "Enregistrer"
                      : "Publier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {selectedItem ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/45 p-4 sm:items-center sm:justify-center"
          onClick={() => setSelectedItem(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="entraide-modal-title"
            ref={detailDialogRef}
            tabIndex={-1}
            className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#666666]">
                    {selectedItem.category}
                  </p>
                  <span className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[11px] font-semibold text-[#4B5563]">
                    {selectedItem.city}
                  </span>
                  <span className="rounded-full bg-[#1A1A1A] px-2.5 py-1 text-[11px] font-semibold text-white">
                    {getKindLabel(selectedItem.kind)}
                  </span>
                  {selectedItem.priority === "urgent" ? (
                    <span className="rounded-full bg-[#B91C1C] px-2.5 py-1 text-[11px] font-semibold text-white">
                      Urgent
                    </span>
                  ) : null}
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getWorkflowTone(selectedItem)}`}
                  >
                    {getWorkflowLabel(selectedItem)}
                  </span>
                </div>
                <h2
                  id="entraide-modal-title"
                  className="mt-1 text-lg font-semibold text-[#1A1A1A]"
                >
                  {selectedItem.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#F8F8F8] text-[#1A1A1A]"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-[20px] bg-[#FBFBFB] px-4 py-3 ring-1 ring-gray-100">
                <p className="text-sm font-semibold text-[#1A1A1A]">Détail</p>
                <p className="mt-1 text-sm leading-6 text-[#666666]">
                  {selectedItem.details}
                </p>
              </div>

              <div className="rounded-[20px] bg-[#FBFBFB] px-4 py-3 ring-1 ring-gray-100">
                <p className="text-sm font-semibold text-[#1A1A1A]">Contact</p>
                <p className="mt-1 text-sm leading-6 text-[#666666]">
                  {viewerUserId != null && selectedItem.user_id === viewerUserId
                    ? selectedItem.contact_hint?.trim() ||
                      "Choisis une proposition pour débloquer ensuite les coordonnées."
                    : "Réponds avec un message court. Tes coordonnées resteront privées jusqu'à l'acceptation."}
                </p>
              </div>

              <div className="flex items-center justify-between text-sm text-[#666666]">
                <span>{selectedItem.author_label?.trim() || "Habitant local"}</span>
                <span>{formatAvailabilitySummary(selectedItem)}</span>
              </div>

              {viewerUserId != null && selectedItem.user_id === viewerUserId ? (
                <div className="rounded-[20px] bg-[#FBFBFB] px-4 py-3 ring-1 ring-gray-100">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#1A1A1A]">Propositions reçues</p>
                    <span className="text-xs font-semibold text-[#666666]">
                      {(responsesByPost[selectedItem.id] ?? []).length}
                    </span>
                  </div>

                  {isLoadingResponses ? (
                    <div className="mt-3 inline-flex items-center gap-2 text-sm text-[#666666]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Chargement des réponses...
                    </div>
                  ) : null}

                  {!isLoadingResponses && (responsesByPost[selectedItem.id] ?? []).length === 0 ? (
                    <p className="mt-3 text-sm leading-6 text-[#666666]">
                      Aucune proposition pour l’instant.
                    </p>
                  ) : null}

                  {!isLoadingResponses && (responsesByPost[selectedItem.id] ?? []).length > 0 ? (
                    <div className="mt-3 space-y-3">
                      {(responsesByPost[selectedItem.id] ?? []).map((responseItem) => (
                        <div
                          key={responseItem.id}
                          className="rounded-[18px] border border-gray-200 bg-white px-3 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              {responseItem.responderAvatarUrl ? (
                                <Image
                                  src={responseItem.responderAvatarUrl}
                                  alt={responseItem.responderLabel}
                                  width={40}
                                  height={40}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E5E7EB] text-sm font-semibold text-[#4B5563]">
                                  {responseItem.responderLabel.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[#1A1A1A]">
                                  {responseItem.responderLabel}
                                </p>
                                <p className="text-xs text-[#666666]">
                                  {formatPostDate(responseItem.createdAt) ?? "Aujourd’hui"}
                                </p>
                              </div>
                            </div>
                            <span className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[11px] font-semibold text-[#4B5563]">
                              {responseItem.status === "accepted" ? "Retenue" : "En attente"}
                            </span>
                          </div>

                          <p className="mt-3 text-sm leading-6 text-[#666666]">
                            {responseItem.message}
                          </p>

                          {responseItem.status === "accepted" ? (
                            <div className="mt-3 rounded-[16px] bg-[#F8FCF2] px-3 py-3 text-sm leading-6 text-[#385314] ring-1 ring-[#D9E7C3]">
                              <p>Email : {responseItem.contactEmail ?? "Disponible dans la notification"}</p>
                              <p>Téléphone : {responseItem.contactPhone ?? "Disponible dans la notification"}</p>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleAcceptResponse(selectedItem, responseItem)}
                              disabled={acceptingResponseId === responseItem.id}
                              className="mt-3 inline-flex rounded-full bg-[#1A1A1A] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                            >
                              {acceptingResponseId === responseItem.id
                                ? "Sélection..."
                                : "Choisir cette proposition"}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {viewerUserId == null || selectedItem.user_id !== viewerUserId ? (
                <div className="rounded-[20px] bg-[#FBFBFB] px-4 py-3 ring-1 ring-gray-100">
                  <p className="text-sm font-semibold text-[#1A1A1A]">Répondre</p>
                  <p className="mt-1 text-sm leading-6 text-[#666666]">
                    Reste simple dans le message public. Ajoute ton email et ton téléphone
                    seulement dans les champs privés ci-dessous.
                  </p>

                  <div className="mt-3 space-y-3">
                    <textarea
                      value={responseState.message}
                      onChange={(event) =>
                        setResponseState((current) => ({
                          ...current,
                          message: event.target.value,
                        }))
                      }
                      aria-label="Expliquer comment vous pouvez aider"
                      rows={4}
                      placeholder="Explique en quelques mots comment tu peux aider."
                      className="w-full rounded-[18px] bg-white px-4 py-3 text-sm outline-none ring-1 ring-gray-200 placeholder:text-gray-400"
                    />
                    <input
                      value={responseState.contactEmail}
                      onChange={(event) =>
                        setResponseState((current) => ({
                          ...current,
                          contactEmail: event.target.value,
                        }))
                      }
                      aria-label="Email privé"
                      placeholder="Email privé"
                      className="min-h-11 w-full rounded-[18px] bg-white px-4 text-sm outline-none ring-1 ring-gray-200 placeholder:text-gray-400"
                    />
                    <input
                      value={responseState.contactPhone}
                      onChange={(event) =>
                        setResponseState((current) => ({
                          ...current,
                          contactPhone: event.target.value,
                        }))
                      }
                      aria-label="Téléphone privé"
                      placeholder="Téléphone privé"
                      className="min-h-11 w-full rounded-[18px] bg-white px-4 text-sm outline-none ring-1 ring-gray-200 placeholder:text-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => void handleCreateResponse(selectedItem)}
                      disabled={isSubmittingResponse || selectedItem.status !== "open"}
                      className="inline-flex w-full items-center justify-center rounded-full bg-[#1A1A1A] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {isSubmittingResponse ? "Envoi..." : "Envoyer ma proposition"}
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="flex items-center gap-2">
                {viewerUserId != null &&
                selectedItem.user_id === viewerUserId &&
                selectedItem.status === "open" ? (
                  <button
                    type="button"
                    onClick={() => handleEditPost(selectedItem)}
                    className="inline-flex flex-1 items-center justify-center rounded-full bg-[#F3F4F6] px-4 py-3 text-sm font-semibold text-[#1A1A1A]"
                  >
                    Modifier
                  </button>
                ) : null}
                {viewerUserId != null &&
                selectedItem.user_id === viewerUserId &&
                selectedItem.status === "open" ? (
                  <button
                    type="button"
                    onClick={() => void handleClosePost(selectedItem)}
                    disabled={isClosingPost}
                    className="inline-flex flex-1 items-center justify-center rounded-full bg-[#F3F4F6] px-4 py-3 text-sm font-semibold text-[#1A1A1A] disabled:opacity-60"
                  >
                    {isClosingPost ? "Clôture..." : "Clôturer l’annonce"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="inline-flex flex-1 items-center justify-center rounded-full bg-[#1A1A1A] px-4 py-3 text-sm font-semibold text-white"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function EntraidePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white pb-24" />}>
      <EntraidePageContent />
    </Suspense>
  )
}
