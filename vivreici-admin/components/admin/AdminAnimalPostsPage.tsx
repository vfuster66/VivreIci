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
import type { AdminAnimalPostsData } from "@/lib/admin-types"

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

function buildAnimalPostsStats(posts: AdminAnimalPostsData["posts"]) {
  return {
    total: posts.length,
    active: posts.filter((post) => !post.isFound).length,
    resolved: posts.filter((post) => post.isFound).length,
    withLead: posts.filter((post) => post.acceptedResponse).length,
    highConfidence: posts.filter((post) => (post.confidenceScore ?? 0) >= 75).length,
  }
}

export default function AdminAnimalPostsPage({
  initialData = null,
}: {
  initialData?: AdminAnimalPostsData | null
}) {
  const [data, setData] = useState<AdminAnimalPostsData | null>(initialData)
  const [isLoading, setIsLoading] = useState(!initialData)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    petName: "",
    animalType: "",
    city: "",
    description: "",
    status: "lost" as "lost" | "found" | "spotted",
    isFound: false,
    lat: "",
    lng: "",
    lastSeenAt: "",
  })

  useEffect(() => {
    if (initialData) {
      return
    }

    async function load() {
      try {
        setLoadError(null)
        const payload = await fetchAdminJson<AdminAnimalPostsData>("/api/admin/animal-posts")
        setData(payload)
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Impossible de charger les annonces animaux."
        )
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [initialData])

  const filteredPosts = useMemo(() => {
    if (!data) {
      return []
    }

    const normalizedQuery = query.trim().toLowerCase()

    return data.posts.filter((post) => {
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "resolved"
            ? post.isFound
            : !post.isFound
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [post.petName ?? "", post.animalType ?? "", post.city ?? "", post.authorLabel]
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
        key: "active-without-lead",
        title: "Actives sans piste",
        value: data.posts.filter(
          (post) => !post.isFound && post.responseCount === 0
        ).length,
        detail: "Annonces à relancer ou enrichir pour déclencher des retours utiles.",
      },
      {
        key: "high-confidence",
        title: "Confiance haute actives",
        value: data.posts.filter(
          (post) => !post.isFound && (post.confidenceScore ?? 0) >= 75
        ).length,
        detail: "Cas solides à pousser en haut de la file de traitement.",
      },
      {
        key: "resolved-to-close",
        title: "Résolues à clôturer",
        value: data.posts.filter(
          (post) => post.isFound && !post.acceptedResponse
        ).length,
        detail: "Annonces marquées résolues sans piste retenue explicitement.",
      },
    ].filter((item) => item.value > 0)
  }, [data])

  const canManageContent = data?.membership.role === "superadmin"

  function resetForm() {
    setEditingPostId(null)
    setFormError(null)
    setForm({
      petName: "",
      animalType: "",
      city: "",
      description: "",
      status: "lost",
      isFound: false,
      lat: "",
      lng: "",
      lastSeenAt: "",
    })
  }

  function openCreateForm() {
    resetForm()
    setEditorOpen(true)
  }

  function openEditForm(post: AdminAnimalPostsData["posts"][number]) {
    setEditingPostId(post.id)
    setForm({
      petName: post.petName ?? "",
      animalType: post.animalType ?? "",
      city: post.city ?? "",
      description: post.description ?? "",
      status: post.status,
      isFound: post.isFound,
      lat: String(post.lat),
      lng: String(post.lng),
      lastSeenAt: post.lastSeenAt ? post.lastSeenAt.slice(0, 16) : "",
    })
    setEditorOpen(true)
  }

  async function handleSavePost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setFeedbackMessage(null)
    setFormError(null)

    try {
      const payload = await fetchAdminJson<{ ok: true; id: string }>(
        "/api/admin/animal-posts",
        {
          method: "POST",
          body: JSON.stringify({
            postId: editingPostId,
            petName: form.petName,
            animalType: form.animalType,
            city: form.city,
            description: form.description,
            status: form.status,
            isFound: form.isFound,
            lat: Number(form.lat),
            lng: Number(form.lng),
            lastSeenAt: form.lastSeenAt || null,
          }),
        }
      )

      setData((current) => {
        if (!current) {
          return current
        }

        const existingPost = current.posts.find((post) => post.id === payload.id)
        const nextPost = {
          id: payload.id,
          petName: form.petName.trim() || null,
          animalType: form.animalType.trim() || null,
          city: form.city.trim() || null,
          lat: Number(form.lat),
          lng: Number(form.lng),
          description: form.description.trim() || null,
          lastSeenAt: form.lastSeenAt || null,
          status: form.status,
          isFound: form.isFound,
          authorLabel: current.membership.organizationName || "Administration",
          createdAt: existingPost?.createdAt ?? new Date().toISOString(),
          responseCount: existingPost?.responseCount ?? 0,
          acceptedResponse: existingPost?.acceptedResponse ?? false,
          hasPhoto: existingPost?.hasPhoto ?? false,
          confidenceScore: existingPost?.confidenceScore ?? null,
          confidenceLevel: existingPost?.confidenceLevel ?? null,
          confidenceReasons: existingPost?.confidenceReasons ?? [],
        }

        const nextPosts = existingPost
          ? current.posts.map((post) => (post.id === payload.id ? nextPost : post))
          : [nextPost, ...current.posts]

        return {
          ...current,
          stats: buildAnimalPostsStats(nextPosts),
          posts: nextPosts,
        }
      })

      resetForm()
      setEditorOpen(false)
      setFeedbackMessage(
        editingPostId ? "Annonce animale mise à jour." : "Annonce animale créée."
      )
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer cette annonce animale."
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <AdminPageSkeleton
        title="Chargement des annonces animales"
        description="Préparation des annonces perdu, trouvé ou aperçu et de leur score de confiance."
        metrics={5}
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
      title="Animaux annonces"
      description="Vue admin des annonces perdu/trouvé/aperçu avec score de confiance réservé à l'exploitation."
      toolbar={
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
            <label className="block">
              <span className="text-sm font-medium text-[#18212B]">Recherche</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nom, type, ville…"
                className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[#18212B]">État</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
              >
                <option value="all">Tous</option>
                <option value="active">Actives</option>
                <option value="resolved">Résolues</option>
              </select>
            </label>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-[#F8FBFF] px-4 py-2 text-sm text-[#5B6572]">
              {filteredPosts.length} annonce(s)
            </div>
            {canManageContent ? (
              <button
                type="button"
                onClick={openCreateForm}
                className="rounded-full bg-[#FAC411] px-4 py-2 text-sm font-semibold text-[#18212B]"
              >
                Nouvelle annonce
              </button>
            ) : null}
          </div>
        </div>
      }
    >
      {editorOpen && canManageContent ? (
        <AdminModalShell
          open={editorOpen}
          titleId="admin-animal-post-title"
          descriptionId="admin-animal-post-description"
          onClose={() => {
            resetForm()
            setEditorOpen(false)
          }}
        >
          <div className="mx-auto w-full max-w-3xl rounded-[32px] border border-[#0337AA]/8 bg-white p-6 shadow-[0_18px_48px_rgba(3,55,170,0.08)]">
          <h2 id="admin-animal-post-title" className="text-xl font-semibold text-[#0337AA]">
            {editingPostId ? "Modifier l’annonce" : "Créer une annonce"}
          </h2>
          <p
            id="admin-animal-post-description"
            className="mt-2 text-sm leading-6 text-[#5B6572]"
          >
            Renseigne l’animal, la localisation et l’état de l’annonce sans quitter la liste.
          </p>
          <form onSubmit={handleSavePost} className="mt-5 space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-[#18212B]">Nom</span>
                <input value={form.petName} onChange={(e) => setForm((current) => ({ ...current, petName: e.target.value }))} className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-[#18212B]">Type</span>
                <input value={form.animalType} onChange={(e) => setForm((current) => ({ ...current, animalType: e.target.value }))} className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-[#18212B]">Ville</span>
                <input value={form.city} onChange={(e) => setForm((current) => ({ ...current, city: e.target.value }))} className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-[#18212B]">Statut</span>
                <select value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value as "lost" | "found" | "spotted" }))} className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none">
                  <option value="lost">Perdu</option>
                  <option value="found">Trouvé</option>
                  <option value="spotted">Aperçu</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-[#18212B]">Latitude</span>
                <input value={form.lat} onChange={(e) => setForm((current) => ({ ...current, lat: e.target.value }))} className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-[#18212B]">Longitude</span>
                <input value={form.lng} onChange={(e) => setForm((current) => ({ ...current, lng: e.target.value }))} className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none" />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-[#18212B]">Description</span>
              <textarea value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} rows={4} className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none" />
            </label>
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
              <label className="block">
                <span className="text-sm font-medium text-[#18212B]">Dernière vue</span>
                <input type="datetime-local" value={form.lastSeenAt} onChange={(e) => setForm((current) => ({ ...current, lastSeenAt: e.target.value }))} className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none" />
              </label>
              <label className="flex items-end gap-3 pb-2 text-sm text-[#18212B]">
                <input type="checkbox" checked={form.isFound} onChange={(e) => setForm((current) => ({ ...current, isFound: e.target.checked }))} />
                <span>Annonce résolue</span>
              </label>
            </div>
            <div aria-live="polite" aria-atomic="true">
              {formError ? (
                <p className="text-sm text-[#7A1C22]" role="status">
                  {formError}
                </p>
              ) : null}
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={isSaving} className="rounded-full bg-[#FAC411] px-5 py-3 text-sm font-semibold text-[#18212B]">
                {isSaving ? "Enregistrement..." : "Enregistrer"}
              </button>
              <button type="button" onClick={() => { resetForm(); setEditorOpen(false) }} className="rounded-full border border-[#0337AA]/10 bg-white px-5 py-3 text-sm font-medium text-[#0337AA]">
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
          { label: "Actives", value: data.stats.active },
          { label: "Résolues", value: data.stats.resolved },
          { label: "Pistes retenues", value: data.stats.withLead },
          { label: "Confiance haute", value: data.stats.highConfidence },
        ].map((stat) => (
          <AdminMetricCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>

      {priorityItems.length > 0 ? (
        <AdminPanel tone="soft" className="mt-8">
          <AdminSectionHeader
            eyebrow="Priorités"
            title="File de traitement animale"
            description="Met en avant les annonces encore bloquées, les cas solides et les dossiers à refermer."
          />
          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {priorityItems.map((item) => (
              <AdminMetricCard
                key={item.key}
                label={item.title}
                value={item.value}
                detail={item.detail}
                tone={item.key === "active-without-lead" ? "warning" : item.key === "resolved-to-close" ? "highlight" : "default"}
              />
            ))}
          </div>
        </AdminPanel>
      ) : null}

      <AdminPanel className="mt-8">
        <AdminSectionHeader
          eyebrow="Liste"
          title="Annonces perdu, trouvé, aperçu"
          description="Vue opérationnelle des annonces animales avec édition rapide et score de confiance réservé à l'exploitation."
        />
        <div aria-live="polite" aria-atomic="true" className="mb-4 space-y-2">
          {feedbackMessage ? (
            <p className="rounded-2xl bg-[#ECFDF3] px-4 py-3 text-sm text-[#027A48]" role="status">
              {feedbackMessage}
            </p>
          ) : null}
        </div>
        {loadError ? (
          <div className="mb-4 rounded-2xl bg-[#FFF1F2] px-4 py-3 text-sm text-[#9F1239]">
            {loadError}
          </div>
        ) : null}
        <AdminListHeader
          columns={["Annonce", "État", "Pistes", "Confiance"]}
          className="xl:grid-cols-[1.6fr_0.9fr_0.8fr_1fr]"
        />

        <div className="space-y-3">
          {filteredPosts.length === 0 ? (
            <AdminEmptyState
              title="Aucune annonce animale à afficher"
              description={
                query.trim() || statusFilter !== "all"
                  ? "Aucune annonce ne correspond aux filtres actuels. Ajuste la recherche ou l'état sélectionné."
                  : "Aucune annonce n'a encore été créée dans ce périmètre."
              }
              actionLabel={
                canManageContent && !query.trim() && statusFilter === "all"
                  ? "Créer une annonce"
                  : undefined
              }
              onAction={
                canManageContent && !query.trim() && statusFilter === "all"
                  ? openCreateForm
                  : undefined
              }
            />
          ) : null}
          {filteredPosts.map((post) => (
            <AdminRecordCard key={post.id}>
              <div className="grid gap-4 xl:grid-cols-[1.6fr_0.9fr_0.8fr_1fr]">
                <div>
                  <p className="text-sm font-semibold text-[#0337AA]">
                    {post.petName ?? post.animalType ?? "Animal signalé"}
                  </p>
                  <p className="mt-2 text-xs text-[#6B7280]">
                    {(post.animalType ?? "Autre")} · {post.city ?? "Ville à préciser"} · {post.authorLabel}
                  </p>
                  <p className="mt-2 text-xs text-[#64748B]">{formatAdminDate(post.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#6B7280]">État</p>
                  <p className="mt-1 text-sm font-medium text-[#18212B]">{post.isFound ? "Résolue" : "Active"}</p>
                  <p className="mt-1 text-xs text-[#6B7280]">{post.status}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#6B7280]">Pistes</p>
                  <p className="mt-1 text-sm font-medium text-[#18212B]">{post.responseCount}</p>
                  {post.acceptedResponse ? (
                    <div className="mt-1 text-xs text-[#385314]">Piste retenue</div>
                  ) : null}
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
                {canManageContent ? (
                  <div className="flex items-start justify-end">
                    <button
                      type="button"
                      onClick={() => openEditForm(post)}
                      className="rounded-full border border-[#0337AA]/10 bg-white px-4 py-2 text-sm font-medium text-[#0337AA]"
                    >
                      Modifier
                    </button>
                  </div>
                ) : null}
              </div>
            </AdminRecordCard>
          ))}
        </div>
      </AdminPanel>
    </AdminDesktopLayout>
  )
}
