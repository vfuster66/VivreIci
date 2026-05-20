"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { useEffect, useMemo, useState } from "react"
import AdminDesktopLayout from "@/components/admin/AdminDesktopLayout"
import AdminEmptyState from "@/components/admin/AdminEmptyState"
import AdminMetricCard from "@/components/admin/AdminMetricCard"
import AdminModalShell from "@/components/admin/AdminModalShell"
import AdminPanel from "@/components/admin/AdminPanel"
import AdminPageSkeleton from "@/components/admin/AdminPageSkeleton"
import AdminRecordCard from "@/components/admin/AdminRecordCard"
import { fetchAdminJson } from "@/lib/admin-client"
import type { AdminReportsData } from "@/lib/admin-types"
import { buildCitizenAppUrl } from "@/lib/citizen-app-url"
import {
  formatReportDate,
  getReportStatusClasses,
  getReportStatusLabel,
} from "@/lib/reports"

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

function getWorkQueueCards(data: AdminReportsData, mode: "admin" | "mairie") {
  if (mode === "mairie") {
    return [
      {
        key: "open",
        title: "Ouvrir les nouveaux cas",
        value: data.stats.open,
        description:
          data.stats.open > 0
            ? "Commence par les signalements encore ouverts sur le territoire."
            : "Aucun signalement ouvert n'attend de qualification immédiate.",
        cta: "Voir les ouverts",
        status: "open",
        tone: data.stats.open > 8 ? "warning" : "default",
      },
      {
        key: "progress",
        title: "Débloquer les dossiers en cours",
        value: data.stats.inProgress,
        description:
          data.stats.inProgress > 0
            ? "Ces dossiers ont déjà démarré mais demandent encore un suivi."
            : "Aucun dossier en cours ne paraît bloqué.",
        cta: "Voir les en cours",
        status: "in_progress",
        tone: data.stats.inProgress > 4 ? "warning" : "default",
      },
      {
        key: "resolved",
        title: "Contrôler les résolutions",
        value: data.stats.resolved,
        description:
          data.stats.resolved > 0
            ? "Les résolutions récentes permettent de vérifier le débit de traitement."
            : "Aucune résolution récente à relire.",
        cta: "Voir les résolus",
        status: "resolved",
        tone: "default",
      },
    ] as const
  }

  return [
    {
      key: "open",
      title: "Qualifier les ouverts",
      value: data.stats.open,
      description:
        data.stats.open > 0
          ? "Le stock ouvert doit être qualifié ou affecté en priorité."
          : "Aucun signalement ouvert ne reste à qualifier.",
      cta: "Traiter les ouverts",
      status: "open",
      tone: data.stats.open > 12 ? "warning" : "default",
    },
    {
      key: "abuse",
      title: "Arbitrer les abus signalés",
      value: data.stats.flagged,
      description:
        data.stats.flagged > 0
          ? "Des contenus remontent avec suspicion d'abus et nécessitent une revue rapide."
          : "Aucun signalement abusif récent à arbitrer.",
      cta: "Voir la file",
      status: "all",
      tone: data.stats.flagged > 0 ? "danger" : "default",
    },
    {
      key: "progress",
      title: "Clore les dossiers en cours",
      value: data.stats.inProgress,
      description:
        data.stats.inProgress > 0
          ? "Les dossiers en cours doivent avancer vers une résolution ou un archivage."
          : "Aucun dossier en cours ne demande de relance particulière.",
      cta: "Voir les en cours",
      status: "in_progress",
      tone: data.stats.inProgress > 8 ? "warning" : "default",
    },
  ] as const
}

const AdminReportsMap = dynamic(
  () => import("@/components/admin/AdminReportsMap"),
  {
    ssr: false,
  }
)

export default function AdminReportsPage({
  mode,
  initialData = null,
}: {
  mode: "admin" | "mairie"
  initialData?: AdminReportsData | null
}) {
  const [data, setData] = useState<AdminReportsData | null>(initialData)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(!initialData)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(initialData?.meta?.currentPage ?? 1)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createType, setCreateType] = useState("")
  const [createDescription, setCreateDescription] = useState("")
  const [createAddress, setCreateAddress] = useState("")
  const [createLat, setCreateLat] = useState("")
  const [createLng, setCreateLng] = useState("")
  const [createStatus, setCreateStatus] = useState("open")

  async function load(nextPage = currentPage, options?: { silent?: boolean }) {
    setLoadError(null)
    if (options?.silent) {
      setIsRefreshing(true)
    }
    const params = new URLSearchParams()
    params.set("page", String(nextPage))
    if (statusFilter !== "all") {
      params.set("status", statusFilter)
    }
    if (query.trim()) {
      params.set("q", query.trim())
    }
    const nextData = await fetchAdminJson<AdminReportsData>(
      `/api/admin/reports?${params.toString()}`
    )
    setData(nextData)
    setCurrentPage(nextData.meta?.currentPage ?? nextPage)
    setIsRefreshing(false)
  }

  useEffect(() => {
    const isUsingInitialViewState =
      initialData &&
      currentPage === (initialData.meta?.currentPage ?? 1) &&
      statusFilter === "all" &&
      query.trim().length === 0

    if (isUsingInitialViewState) {
      return
    }

    let active = true

    async function load() {
      try {
        const params = new URLSearchParams()
        params.set("page", String(currentPage))
        if (statusFilter !== "all") {
          params.set("status", statusFilter)
        }
        if (query.trim()) {
          params.set("q", query.trim())
        }
        const nextData = await fetchAdminJson<AdminReportsData>(
          `/api/admin/reports?${params.toString()}`
        )

        if (active) {
          setData(nextData)
          setCurrentPage(nextData.meta?.currentPage ?? currentPage)
        }
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Impossible de charger les signalements."
          )
        }
      } finally {
        if (active) {
          setIsLoading(false)
          setIsRefreshing(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [currentPage, initialData, query, statusFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [query, statusFilter])

  async function handleCreateReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsCreating(true)
    setFeedbackMessage(null)
    setCreateError(null)

    try {
      await fetchAdminJson("/api/admin/reports", {
        method: "POST",
        body: JSON.stringify({
          type: createType,
          description: createDescription,
          address: createAddress,
          lat: Number(createLat),
          lng: Number(createLng),
          status: createStatus,
        }),
      })

      await load(1, { silent: true })
      setIsCreateOpen(false)
      setCreateType("")
      setCreateDescription("")
      setCreateAddress("")
      setCreateLat("")
      setCreateLng("")
      setCreateStatus("open")
      setFeedbackMessage("Signalement créé.")
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Impossible de créer ce signalement."
      )
    } finally {
      setIsCreating(false)
    }
  }

  const filteredReports = useMemo(() => data?.reports ?? [], [data])
  const workQueueCards = useMemo(
    () => (data ? getWorkQueueCards(data, mode) : []),
    [data, mode],
  )

  if (isLoading) {
    return (
      <AdminPageSkeleton
        title="Chargement des signalements"
        description="Récupération des données terrain, de la carte et des indicateurs de suivi."
        metrics={6}
        sections={2}
      />
    )
  }

  if (!data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold text-[#18212B]">
          Espace non accessible
        </h1>
        <p className="text-sm leading-6 text-[#5B6572]">
          {loadError ??
            "Connectez-vous avec un compte autorisé pour accéder à cet espace."}
        </p>
        <Link
          href={`/connexion?next=${mode === "mairie" ? "/admin/collectivites" : "/admin/signalements"}`}
          className="rounded-full bg-[#FAC411] px-5 py-3 text-sm font-semibold text-[#18212B]"
        >
          Ouvrir la connexion
        </Link>
      </div>
    )
  }

  return (
    <AdminDesktopLayout
      membership={data.membership}
      title={mode === "mairie" ? "Vue collectivités" : "Pilotage signalements"}
      description={
        mode === "mairie"
          ? "Vue terrain orientée exploitation: adresses, types, statuts et lecture cartographique pour les collectivités."
          : "Vue opérationnelle des signalements avec modération légère, priorisation et lecture cartographique."
      }
      toolbar={
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
            <label className="block">
              <span className="text-sm font-medium text-[#18212B]">Recherche</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Référence, type, adresse…"
                className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none ring-0"
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
                <option value="open">Ouverts</option>
                <option value="in_progress">En cours</option>
                <option value="resolved">Résolus</option>
                <option value="archived">Archivés</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full bg-[#F8FBFF] px-4 py-2 text-sm text-[#5B6572]">
              {data.meta?.totalMatchingReports ?? filteredReports.length} signalement(s)
            </div>
            {data.membership.role === "superadmin" ? (
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#FAC411] px-5 text-sm font-semibold text-[#18212B]"
              >
                Ajouter un signalement
              </button>
            ) : null}
          </div>
        </div>
      }
    >
      <section className="rounded-[32px] border border-[#0337AA]/8 bg-[linear-gradient(180deg,#ffffff_0%,#f4f8ff_100%)] p-6 shadow-[0_18px_48px_rgba(3,55,170,0.08)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#5B6572]">
              File de travail
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[#0337AA]">
              Priorités opérationnelles
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-[#5B6572]">
            Utilise ces raccourcis pour passer d’une lecture globale à une action immédiate sur les signalements les plus sensibles.
          </p>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {workQueueCards.map((item) => (
            <div
              key={item.key}
              className={`rounded-[28px] border px-5 py-5 shadow-[0_12px_32px_rgba(3,55,170,0.08)] ${
                item.tone === "danger"
                  ? "border-[#BE123C]/12 bg-[#FFF1F2]"
                  : item.tone === "warning"
                    ? "border-[#FAC411]/30 bg-[#FFF8DF]"
                    : "border-[#0337AA]/8 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#18212B]">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[#5B6572]">{item.description}</p>
                </div>
                <div className="rounded-full bg-white px-4 py-2 text-2xl font-semibold text-[#0337AA] shadow-[0_8px_24px_rgba(3,55,170,0.08)]">
                  {item.value}
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter(item.status)
                    setCurrentPage(1)
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-[#FAC411] px-5 text-sm font-semibold text-[#18212B]"
                >
                  {item.cta}
                </button>
                {item.key === "abuse" ? (
                  <Link
                    href={buildCitizenAppUrl("/signalements")}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center rounded-full border border-[#0337AA]/10 bg-white px-5 text-sm font-medium text-[#0337AA]"
                  >
                    Ouvrir l’app citoyenne
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      {isCreateOpen ? (
        <AdminModalShell
          open={isCreateOpen}
          titleId="admin-reports-create-title"
          descriptionId="admin-reports-create-description"
          onClose={() => setIsCreateOpen(false)}
        >
          <div className="w-full max-w-2xl rounded-[32px] border border-[#0337AA]/10 bg-white p-6 shadow-[0_30px_80px_rgba(3,55,170,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[#6B7280]">
                  Nouveau signalement
                </p>
                <h2
                  id="admin-reports-create-title"
                  className="mt-2 text-xl font-semibold text-[#18212B]"
                >
                  Ajouter un signalement
                </h2>
                <p
                  id="admin-reports-create-description"
                  className="mt-2 text-sm leading-6 text-[#5B6572]"
                >
                  Crée un signalement manuel avec type, adresse, description et
                  coordonnées.
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

            <form onSubmit={handleCreateReport} className="mt-6 space-y-5">
              <div className="grid gap-5 lg:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-[#18212B]">Type</span>
                  <input
                    value={createType}
                    onChange={(event) => setCreateType(event.target.value)}
                    placeholder="Ex. Voirie"
                    className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-[#18212B]">Statut</span>
                  <select
                    value={createStatus}
                    onChange={(event) => setCreateStatus(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
                  >
                    <option value="open">Ouvert</option>
                    <option value="in_progress">En cours</option>
                    <option value="resolved">Résolu</option>
                    <option value="archived">Archivé</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-[#18212B]">Adresse</span>
                <input
                  value={createAddress}
                  onChange={(event) => setCreateAddress(event.target.value)}
                  placeholder="Ex. Place de la République, Perpignan"
                  className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[#18212B]">Description</span>
                <textarea
                  value={createDescription}
                  onChange={(event) => setCreateDescription(event.target.value)}
                  rows={4}
                  placeholder="Décris le problème constaté."
                  className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
                />
              </label>

              <div className="grid gap-5 lg:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-[#18212B]">Latitude</span>
                  <input
                    value={createLat}
                    onChange={(event) => setCreateLat(event.target.value)}
                    placeholder="42.6986"
                    className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-[#18212B]">Longitude</span>
                  <input
                    value={createLng}
                    onChange={(event) => setCreateLng(event.target.value)}
                    placeholder="2.8956"
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
                  {isCreating ? "Création..." : "Créer le signalement"}
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

      <section>
        <AdminReportsMap reports={filteredReports} />
      </section>

      {data.meta ? (
        <div className="mt-6 rounded-[24px] border border-[#FAC411]/35 bg-[#FFF8DF] px-4 py-4 text-sm leading-6 text-[#7B5B00]">
          {data.meta.returnedReports} signalements affichés sur{" "}
          {data.meta.totalMatchingReports} correspondant aux filtres. Les statistiques
          de synthèse restent calculées sur l&apos;ensemble du périmètre.
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <AdminMetricCard label="Total" value={data.stats.total} />
        <AdminMetricCard label="Ouverts" value={data.stats.open} />
        <AdminMetricCard label="En cours" value={data.stats.inProgress} />
        <AdminMetricCard label="Résolus" value={data.stats.resolved} />
        <AdminMetricCard label="Abus signalés" value={data.stats.flagged} tone={data.stats.flagged > 0 ? "danger" : "default"} />
        <AdminMetricCard label="Visibles carte" value={data.stats.visibleOnMap} />
      </div>

      <AdminPanel className="mt-8">
        <div aria-live="polite" aria-atomic="true" className="mb-4 space-y-2">
          {feedbackMessage ? (
            <p className="rounded-2xl bg-[#ECFDF3] px-4 py-3 text-sm text-[#027A48]" role="status">
              {feedbackMessage}
            </p>
          ) : null}
        </div>
        <div className="mb-4 hidden grid-cols-[1.5fr_0.8fr_1fr_1fr_0.9fr_0.9fr] gap-4 px-2 text-[11px] uppercase tracking-[0.24em] text-[#6B7280] xl:grid">
          <span>Signalement</span>
          <span>Type</span>
          <span>Statut</span>
          <span>Confiance</span>
          <span>Créé le</span>
          <span>Actions</span>
        </div>
        <div className="space-y-3">
          {filteredReports.map((report) => (
            <AdminRecordCard key={report.id}>
              <div className="grid gap-4 xl:grid-cols-[1.5fr_0.8fr_1fr_1fr_0.9fr_0.9fr] xl:items-start">
                <div>
                  <p className="text-sm font-semibold text-[#0337AA]">{report.reference}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-[#425166]">{report.description}</p>
                  <p className="mt-3 text-xs text-[#6B7280]">
                    {report.address ?? "Adresse non précisée"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#6B7280] xl:hidden">Type</p>
                  <p className="mt-1 text-sm font-medium text-[#18212B]">{report.type}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#6B7280] xl:hidden">Statut</p>
                  <div className="mt-1">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getReportStatusClasses(report.status)}`}>
                      {getReportStatusLabel(report.status)}
                    </span>
                  </div>
                  {report.abuseCount > 0 ? (
                    <p className="mt-2 text-xs text-[#BE123C]">{report.abuseCount} abus signalé(s)</p>
                  ) : null}
                  {report.duplicateCount > 1 ? (
                    <p className="mt-2 text-xs text-[#92400E]">{report.duplicateCount} doublons probables</p>
                  ) : null}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#6B7280] xl:hidden">Confiance</p>
                  <div className="mt-1">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getConfidenceClasses(report.confidenceLevel)}`}>
                      {report.confidenceScore ?? "?"}/100
                    </span>
                  </div>
                  {report.confidenceReasons.length > 0 ? (
                    <div className="mt-2 space-y-1 text-xs text-[#6B7280]">
                      {report.confidenceReasons.slice(0, 2).map((reason) => (
                        <div key={reason}>{reason}</div>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#6B7280] xl:hidden">Créé le</p>
                  <p className="mt-1 text-sm text-[#4B5563]">{formatReportDate(report.createdAt)}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#6B7280] xl:hidden">Actions</p>
                  <Link
                    href={buildCitizenAppUrl(`/signalements/${report.id}`)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center rounded-full bg-[#FAC411] px-4 text-sm font-semibold text-[#18212B]"
                  >
                    Ouvrir
                  </Link>
                  <Link
                    href={buildCitizenAppUrl(`/carte?lat=${report.lat}&lng=${report.lng}`)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center rounded-full border border-[#0337AA]/10 bg-white px-4 text-sm font-medium text-[#0337AA]"
                  >
                    Voir sur carte
                  </Link>
                </div>
              </div>
            </AdminRecordCard>
          ))}
          {filteredReports.length === 0 ? (
            <AdminEmptyState
              title="Aucun signalement à afficher"
              description={
                query.trim() || statusFilter !== "all"
                  ? "Aucun signalement ne correspond aux filtres actuels. Ajuste la recherche ou le statut sélectionné."
                  : "Aucun signalement n'est encore disponible dans ce périmètre."
              }
              actionLabel={
                data.membership.role === "superadmin" &&
                !query.trim() &&
                statusFilter === "all"
                  ? "Ajouter un signalement"
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
        </div>

        {data.meta && data.meta.totalPages > 1 ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#0337AA]/8 pt-4">
            <p className="text-sm text-[#5B6572]">
              Page {data.meta.currentPage} sur {data.meta.totalPages}
              {isRefreshing ? " · actualisation…" : ""}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={data.meta.currentPage <= 1 || isRefreshing}
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#EAF0FB] px-4 text-sm font-semibold text-[#0337AA] disabled:opacity-50"
              >
                Page précédente
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.min(data.meta?.totalPages ?? page, page + 1)
                  )
                }
                disabled={
                  data.meta.currentPage >= data.meta.totalPages || isRefreshing
                }
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#FAC411] px-4 text-sm font-semibold text-[#18212B] disabled:opacity-50"
              >
                Page suivante
              </button>
            </div>
          </div>
        ) : null}
      </AdminPanel>
    </AdminDesktopLayout>
  )
}
