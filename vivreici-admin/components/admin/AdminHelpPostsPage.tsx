"use client"

import { useEffect, useMemo, useState } from "react"
import AdminDesktopLayout from "@/components/admin/AdminDesktopLayout"
import AdminEmptyState from "@/components/admin/AdminEmptyState"
import AdminListHeader from "@/components/admin/AdminListHeader"
import AdminMetricCard from "@/components/admin/AdminMetricCard"
import AdminModalShell from "@/components/admin/AdminModalShell"
import AdminPanel from "@/components/admin/AdminPanel"
import AdminPageSkeleton from "@/components/admin/AdminPageSkeleton"
import AdminRecordCard from "@/components/admin/AdminRecordCard"
import AdminSectionHeader from "@/components/admin/AdminSectionHeader"
import { fetchAdminJson } from "@/lib/admin-client"
import type { AdminHelpPostsData } from "@/lib/admin-types"

function getConfidenceClasses(level: "low" | "medium" | "high" | null) {
  switch (level) {
    case "high":
      return "bg-[#EAF3E0] text-[#385314]"
    case "medium":
      return "bg-[#FFF7D6] text-[#9A7800]"
    default:
      return "bg-[#FFF1F2] text-[#9F1239]"
  }
}

function formatAdminDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export default function AdminHelpPostsPage({
  initialData = null,
}: {
  initialData?: AdminHelpPostsData | null
}) {
  const [data, setData] = useState<AdminHelpPostsData | null>(initialData)
  const [isLoading, setIsLoading] = useState(!initialData)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createKind, setCreateKind] = useState<"request" | "offer">("request")
  const [createCategory, setCreateCategory] = useState("Déplacement")
  const [createPriority, setCreatePriority] = useState<"normal" | "urgent">("normal")
  const [createTitle, setCreateTitle] = useState("")
  const [createSummary, setCreateSummary] = useState("")
  const [createDetails, setCreateDetails] = useState("")
  const [createCity, setCreateCity] = useState("")
  const [createAvailabilityText, setCreateAvailabilityText] = useState("")
  const [createContactHint, setCreateContactHint] = useState("")

  async function load() {
    setLoadError(null)
    const payload = await fetchAdminJson<AdminHelpPostsData>("/api/admin/help-posts")
    setData(payload)
  }

  useEffect(() => {
    if (initialData) {
      return
    }

    async function load() {
      try {
        const payload = await fetchAdminJson<AdminHelpPostsData>("/api/admin/help-posts")
        setData(payload)
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Impossible de charger l'entraide."
        )
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [initialData])

  async function handleCreatePost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsCreating(true)
    setFeedbackMessage(null)
    setCreateError(null)

    try {
      await fetchAdminJson("/api/admin/help-posts", {
        method: "POST",
        body: JSON.stringify({
          kind: createKind,
          category: createCategory,
          priority: createPriority,
          title: createTitle,
          summary: createSummary,
          details: createDetails,
          city: createCity,
          availabilityText: createAvailabilityText,
          contactHint: createContactHint,
        }),
      })

      await load()
      setIsCreateOpen(false)
      setCreateKind("request")
      setCreateCategory("Déplacement")
      setCreatePriority("normal")
      setCreateTitle("")
      setCreateSummary("")
      setCreateDetails("")
      setCreateCity("")
      setCreateAvailabilityText("")
      setCreateContactHint("")
      setFeedbackMessage("Annonce d'entraide créée.")
    } catch (error) {
      setCreateError(
        error instanceof Error
          ? error.message
          : "Impossible de créer cette annonce d'entraide."
      )
    } finally {
      setIsCreating(false)
    }
  }

  const filteredPosts = useMemo(() => {
    if (!data) {
      return []
    }

    const normalizedQuery = query.trim().toLowerCase()

    return data.posts.filter((post) => {
      const matchesStatus = statusFilter === "all" ? true : post.status === statusFilter
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [post.title, post.summary, post.city, post.category, post.authorLabel ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)

      return matchesStatus && matchesQuery
    })
  }, [data, query, statusFilter])

  const priorityItems = useMemo(() => {
    if (!data) {
      return []
    }

    return [
      {
        key: "urgent",
        title: "Urgences sans délai",
        value: data.posts.filter(
          (post) => post.priority === "urgent" && post.status === "open"
        ).length,
        detail: "Demandes urgentes encore ouvertes dans la file active.",
      },
      {
        key: "without-response",
        title: "Sans réponse",
        value: data.posts.filter(
          (post) => post.status === "open" && post.responseCount === 0
        ).length,
        detail: "Annonces ouvertes à relancer ou mieux qualifier.",
      },
      {
        key: "low-confidence",
        title: "Confiance fragile",
        value: data.posts.filter(
          (post) => (post.confidenceScore ?? 0) > 0 && (post.confidenceScore ?? 0) < 45
        ).length,
        detail: "Annonces à vérifier avant mise en avant ou traitement prioritaire.",
      },
    ].filter((item) => item.value > 0)
  }, [data])

  if (isLoading) {
    return (
      <AdminPageSkeleton
        title="Chargement de l’entraide"
        description="Préparation des annonces d’entraide et des indicateurs associés."
        metrics={4}
        sections={2}
      />
    )
  }

  if (!data) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-[#6B7280]">{loadError ?? "Accès refusé."}</div>
  }

  return (
    <AdminDesktopLayout
      membership={data.membership}
      title="Entraide"
      description="Vue admin des annonces d'entraide avec score de confiance masqué côté citoyen."
      toolbar={
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
            <label className="block">
              <span className="text-sm font-medium text-[#18212B]">Recherche</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Titre, ville, auteur…"
                className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[#18212B]">Statut</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
              >
                <option value="all">Tous</option>
                <option value="open">Ouvertes</option>
                <option value="closed">Clôturées</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full bg-[#F8FBFF] px-4 py-2 text-sm text-[#5B6572]">
              {filteredPosts.length} annonce(s)
            </div>
            {data.membership.role === "superadmin" ? (
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#FAC411] px-5 text-sm font-semibold text-[#18212B]"
              >
                Ajouter une annonce
              </button>
            ) : null}
          </div>
        </div>
      }
    >
      {isCreateOpen ? (
        <AdminModalShell
          open={isCreateOpen}
          titleId="admin-help-posts-create-title"
          descriptionId="admin-help-posts-create-description"
          onClose={() => setIsCreateOpen(false)}
        >
          <div className="w-full max-w-2xl rounded-[32px] border border-[#0337AA]/10 bg-white p-6 shadow-[0_30px_80px_rgba(3,55,170,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[#6B7280]">
                  Nouvelle annonce
                </p>
                <h2
                  id="admin-help-posts-create-title"
                  className="mt-2 text-xl font-semibold text-[#18212B]"
                >
                  Ajouter une annonce d&apos;entraide
                </h2>
                <p
                  id="admin-help-posts-create-description"
                  className="mt-2 text-sm leading-6 text-[#5B6572]"
                >
                  Publie une demande ou une offre avec titre, ville, résumé et détails.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-full bg-[#EAF0FB] px-3 py-2 text-sm font-medium text-[#0337AA]"
              >
                Fermer
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="mt-6 space-y-5">
              <div className="grid gap-5 lg:grid-cols-3">
                <label className="block">
                  <span className="text-sm font-medium text-[#18212B]">Type</span>
                  <select
                    value={createKind}
                    onChange={(event) => setCreateKind(event.target.value as "request" | "offer")}
                    className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
                  >
                    <option value="request">Demande</option>
                    <option value="offer">Offre</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-[#18212B]">Catégorie</span>
                  <select
                    value={createCategory}
                    onChange={(event) => setCreateCategory(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
                  >
                    {["Courses", "Déplacement", "Présence", "Matériel", "Voisinage", "Numérique"].map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-[#18212B]">Priorité</span>
                  <select
                    value={createPriority}
                    onChange={(event) => setCreatePriority(event.target.value as "normal" | "urgent")}
                    className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
                  >
                    <option value="normal">Normale</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
                <label className="block">
                  <span className="text-sm font-medium text-[#18212B]">Titre</span>
                  <input
                    value={createTitle}
                    onChange={(event) => setCreateTitle(event.target.value)}
                    placeholder="Ex. Besoin d'un trajet vers l'hôpital"
                    className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-[#18212B]">Ville</span>
                  <input
                    value={createCity}
                    onChange={(event) => setCreateCity(event.target.value)}
                    placeholder="Ex. Cabestany"
                    className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-[#18212B]">Résumé</span>
                <textarea
                  value={createSummary}
                  onChange={(event) => setCreateSummary(event.target.value)}
                  rows={2}
                  className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[#18212B]">Détails</span>
                <textarea
                  value={createDetails}
                  onChange={(event) => setCreateDetails(event.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
                />
              </label>

              <div className="grid gap-5 lg:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-[#18212B]">Disponibilité</span>
                  <input
                    value={createAvailabilityText}
                    onChange={(event) => setCreateAvailabilityText(event.target.value)}
                    placeholder="Ex. Tous les matins"
                    className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-[#18212B]">Consigne contact</span>
                  <input
                    value={createContactHint}
                    onChange={(event) => setCreateContactHint(event.target.value)}
                    placeholder="Ex. Réponse via l'app"
                    className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
                  />
                </label>
              </div>

              <div aria-live="polite" aria-atomic="true">
                {createError ? (
                  <p className="text-sm text-[#7A1C22]" role="status">
                    {createError}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#FAC411] px-5 text-sm font-semibold text-[#18212B] disabled:opacity-60"
                >
                  {isCreating ? "Création..." : "Créer l'annonce"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#EAF0FB] px-5 text-sm font-semibold text-[#0337AA]"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </AdminModalShell>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Total", value: data.stats.total },
          { label: "Ouvertes", value: data.stats.open },
          { label: "Urgentes", value: data.stats.urgent },
          { label: "Solutions", value: data.stats.solved },
          { label: "Confiance haute", value: data.stats.highConfidence },
        ].map((stat) => (
          <AdminMetricCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>

      {priorityItems.length > 0 ? (
        <AdminPanel tone="soft" className="mt-8">
          <AdminSectionHeader
            eyebrow="Priorités"
            title="File de traitement entraide"
            description="Met en avant les annonces qui demandent une intervention rapide ou une vérification supplémentaire."
          />
          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {priorityItems.map((item) => (
              <AdminMetricCard
                key={item.key}
                label={item.title}
                value={item.value}
                detail={item.detail}
                tone={item.key === "urgent" ? "warning" : item.key === "low-confidence" ? "danger" : "highlight"}
              />
            ))}
          </div>
        </AdminPanel>
      ) : null}

      <AdminPanel className="mt-8">
        <AdminSectionHeader
          eyebrow="Liste"
          title="Annonces d'entraide"
          description="Recherche, qualification et suivi des demandes et offres publiées dans le backoffice."
        />
        <div aria-live="polite" aria-atomic="true" className="mb-4 space-y-2">
          {feedbackMessage ? (
            <p className="rounded-2xl bg-[#ECFDF3] px-4 py-3 text-sm text-[#027A48]" role="status">
              {feedbackMessage}
            </p>
          ) : null}
        </div>
        <AdminListHeader
          columns={["Annonce", "Statut", "Réponses", "Confiance"]}
          className="xl:grid-cols-[1.7fr_1fr_0.7fr_1fr]"
        />
        <div className="space-y-3">
          {filteredPosts.length === 0 ? (
            <AdminEmptyState
              title="Aucune annonce d'entraide à afficher"
              description={
                query.trim() || statusFilter !== "all"
                  ? "Aucune annonce ne correspond aux filtres actifs. Ajuste la recherche ou le statut sélectionné."
                  : "Aucune annonce d'entraide n'a encore été publiée dans ce périmètre."
              }
              actionLabel={
                data.membership.role === "superadmin" &&
                !query.trim() &&
                statusFilter === "all"
                  ? "Ajouter une annonce"
                  : undefined
              }
              onAction={
                data.membership.role === "superadmin" &&
                !query.trim() &&
                statusFilter === "all"
                  ? () => setIsCreateOpen(true)
                  : undefined
              }
            />
          ) : null}
          {filteredPosts.map((post) => (
            <AdminRecordCard key={post.id}>
              <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr_0.7fr_1fr]">
                <div>
                  <p className="text-sm font-semibold text-[#0337AA]">{post.title}</p>
                  <p className="mt-2 text-xs text-[#6B7280]">
                    {post.category} · {post.city} · {post.authorLabel ?? "Habitant local"}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-[#425166]">{post.summary}</p>
                  <p className="mt-2 text-xs text-[#64748B]">{formatAdminDate(post.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#6B7280]">Statut</p>
                  <p className="mt-1 text-sm font-medium text-[#18212B]">
                    {post.status === "open" ? "Ouverte" : "Clôturée"}
                  </p>
                  <p className="mt-1 text-xs text-[#6B7280]">
                    {post.workflowState === "found"
                      ? "Solution trouvée"
                      : post.workflowState === "closed"
                        ? "Fermée"
                        : "Recherche en cours"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#6B7280]">Réponses</p>
                  <p className="mt-1 text-sm font-medium text-[#18212B]">{post.responseCount}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#6B7280]">Confiance</p>
                  <div className="mt-1">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getConfidenceClasses(post.confidenceLevel)}`}>
                      {post.confidenceScore ?? "?"}/100
                    </span>
                  </div>
                  {post.confidenceReasons.length > 0 ? (
                    <div className="mt-2 space-y-1 text-xs text-[#6B7280]">
                      {post.confidenceReasons.slice(0, 2).map((reason) => (
                        <div key={reason}>{reason}</div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </AdminRecordCard>
          ))}
        </div>
      </AdminPanel>
    </AdminDesktopLayout>
  )
}
