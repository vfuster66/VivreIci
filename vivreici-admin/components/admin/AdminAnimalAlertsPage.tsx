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
import type { AdminAnimalAlertsData, AdminAnimalAlertRow } from "@/lib/admin-types"

function formatAdminDate(value: string | null) {
  if (!value) {
    return "Non défini"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Non défini"
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function getConfidenceClasses(label: AdminAnimalAlertRow["confidenceLabel"]) {
  switch (label) {
    case "high":
      return "bg-[#EAF3E0] text-[#385314]"
    case "medium":
      return "bg-[#FFF7D6] text-[#9A7800]"
    default:
      return "bg-[#FFF1F2] text-[#9F1239]"
  }
}

function getModerationActionLabel(
  action: AdminAnimalAlertRow["moderationLogs"][number]["action"]
) {
  switch (action) {
    case "animal_alert_verified":
      return "Alerte vérifiée"
    case "animal_alert_unverified":
      return "Vérification retirée"
    case "animal_alert_source_updated":
      return "Source modifiée"
    case "animal_alert_status_updated":
      return "Statut modifié"
  }
}

function getSourceLabel(sourceType: AdminAnimalAlertRow["sourceType"]) {
  switch (sourceType) {
    case "community":
      return "Communauté"
    case "official":
      return "Officielle"
    case "system":
      return "Automatique"
  }
}

function getStatusLabel(status: AdminAnimalAlertRow["status"]) {
  switch (status) {
    case "active":
      return "Active"
    case "resolved":
      return "Résolue"
    case "expired":
      return "Expirée"
  }
}

function buildAnimalAlertsStats(alerts: AdminAnimalAlertsData["alerts"]) {
  return {
    total: alerts.length,
    active: alerts.filter((alert) => alert.status === "active").length,
    verified: alerts.filter((alert) => alert.isVerified).length,
    highSeverity: alerts.filter((alert) => alert.severity === "high").length,
    community: alerts.filter((alert) => alert.sourceType === "community").length,
  }
}

export default function AdminAnimalAlertsPage({
  initialData = null,
}: {
  initialData?: AdminAnimalAlertsData | null
}) {
  const [data, setData] = useState<AdminAnimalAlertsData | null>(initialData)
  const [isLoading, setIsLoading] = useState(!initialData)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [verificationFilter, setVerificationFilter] = useState("all")
  const [savingAlertId, setSavingAlertId] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null)
  const [isSavingForm, setIsSavingForm] = useState(false)
  const [form, setForm] = useState({
    title: "",
    city: "",
    lat: "",
    lng: "",
    alertType: "processionnaires" as
      | "processionnaires"
      | "epillets"
      | "tiques"
      | "puces"
      | "plantes_toxiques"
      | "cyanobacteries"
      | "chaleur"
      | "autre",
    sourceType: "official" as "community" | "official" | "system",
    severity: "medium" as "medium" | "high",
    status: "active" as "active" | "resolved" | "expired",
    speciesScope: "all" as "all" | "cat" | "dog" | "bird" | "nac" | "multiple",
    isVerified: true,
    radiusMeters: "500",
    description: "",
    observedAt: "",
    expiresAt: "",
  })

  async function load() {
    try {
      setLoadError(null)
      const payload = await fetchAdminJson<AdminAnimalAlertsData>(
        "/api/admin/animal-alerts"
      )
      setData(payload)
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Impossible de charger les alertes animales."
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (initialData) {
      return
    }

    void load()
  }, [initialData])

  const filteredAlerts = useMemo(() => {
    if (!data) {
      return []
    }

    const normalizedQuery = query.trim().toLowerCase()

    return data.alerts.filter((alert) => {
      const matchesSource =
        sourceFilter === "all" ? true : alert.sourceType === sourceFilter
      const matchesVerification =
        verificationFilter === "all"
          ? true
          : verificationFilter === "verified"
            ? alert.isVerified
            : !alert.isVerified
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          alert.title,
          alert.city,
          alert.alertType,
          alert.authorLabel,
          alert.description,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)

      return matchesSource && matchesVerification && matchesQuery
    })
  }, [data, query, sourceFilter, verificationFilter])

  const priorityItems = useMemo(() => {
    if (!data) {
      return []
    }

    return [
      {
        key: "unverified",
        title: "À confirmer",
        value: data.alerts.filter((alert) => !alert.isVerified).length,
        detail: "Alertes non vérifiées à arbitrer avant diffusion prolongée.",
      },
      {
        key: "high-active",
        title: "Vigilance forte active",
        value: data.alerts.filter(
          (alert) => alert.status === "active" && alert.severity === "high"
        ).length,
        detail: "Cas à surveiller en priorité dans le territoire actif.",
      },
      {
        key: "community-active",
        title: "Communautaires actives",
        value: data.alerts.filter(
          (alert) => alert.status === "active" && alert.sourceType === "community"
        ).length,
        detail: "Signalements communautaires encore ouverts, à qualifier ou confirmer.",
      },
    ].filter((item) => item.value > 0)
  }, [data])

  const canManageContent = data?.membership.role === "superadmin"

  function resetForm() {
    setEditingAlertId(null)
    setFormError(null)
    setForm({
      title: "",
      city: "",
      lat: "",
      lng: "",
      alertType: "processionnaires",
      sourceType: "official",
      severity: "medium",
      status: "active",
      speciesScope: "all",
      isVerified: true,
      radiusMeters: "500",
      description: "",
      observedAt: "",
      expiresAt: "",
    })
  }

  function openCreateForm() {
    resetForm()
    setEditorOpen(true)
  }

  function openEditForm(alert: AdminAnimalAlertRow) {
    setEditingAlertId(alert.id)
    setForm({
      title: alert.title,
      city: alert.city,
      lat: String(alert.lat),
      lng: String(alert.lng),
      alertType: alert.alertType as typeof form.alertType,
      sourceType: alert.sourceType,
      severity: alert.severity,
      status: alert.status,
      speciesScope: alert.speciesScope as typeof form.speciesScope,
      isVerified: alert.isVerified,
      radiusMeters: String(alert.radiusMeters),
      description: alert.description,
      observedAt: alert.observedAt ? alert.observedAt.slice(0, 16) : "",
      expiresAt: alert.expiresAt ? alert.expiresAt.slice(0, 16) : "",
    })
    setEditorOpen(true)
  }

  async function handleSaveAlert(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSavingForm(true)
    setFeedbackMessage(null)
    setFormError(null)

    try {
      const response = await fetchAdminJson<{ ok: true; id: string }>(
        "/api/admin/animal-alerts",
        {
          method: "POST",
          body: JSON.stringify({
            mode: "upsert",
            alertId: editingAlertId,
            title: form.title,
            city: form.city,
            lat: Number(form.lat),
            lng: Number(form.lng),
            alertType: form.alertType,
            sourceType: form.sourceType,
            severity: form.severity,
            status: form.status,
            speciesScope: form.speciesScope,
            isVerified: form.isVerified,
            radiusMeters: Number(form.radiusMeters),
            description: form.description,
            observedAt: form.observedAt || null,
            expiresAt: form.expiresAt || null,
          }),
        }
      )

      setData((current) => {
        if (!current) {
          return current
        }

        const existingAlert = current.alerts.find((alert) => alert.id === response.id)
        const nextAlert: AdminAnimalAlertRow = {
          id: response.id,
          title: form.title.trim(),
          city: form.city.trim(),
          lat: Number(form.lat),
          lng: Number(form.lng),
          alertType: form.alertType,
          sourceType: form.sourceType,
          severity: form.severity,
          status: form.status,
          speciesScope: form.speciesScope,
          isVerified: form.isVerified,
          radiusMeters: Number(form.radiusMeters),
          authorLabel: current.membership.organizationName || "Administration",
          description: form.description.trim(),
          observedAt: form.observedAt || null,
          createdAt: existingAlert?.createdAt ?? new Date().toISOString(),
          expiresAt: form.expiresAt || null,
          confirmCount: existingAlert?.confirmCount ?? 0,
          clearCount: existingAlert?.clearCount ?? 0,
          confidenceScore: existingAlert?.confidenceScore ?? 50,
          confidenceLabel: existingAlert?.confidenceLabel ?? "medium",
          confidenceReasons: existingAlert?.confidenceReasons ?? [],
          confidenceVersion: existingAlert?.confidenceVersion ?? null,
          moderationLogs: existingAlert?.moderationLogs ?? [],
        }

        const nextAlerts = existingAlert
          ? current.alerts.map((alert) =>
              alert.id === response.id ? nextAlert : alert
            )
          : [nextAlert, ...current.alerts]

        return {
          ...current,
          stats: buildAnimalAlertsStats(nextAlerts),
          alerts: nextAlerts,
        }
      })

      resetForm()
      setEditorOpen(false)
      setFeedbackMessage(
        editingAlertId ? "Alerte mise à jour." : "Alerte créée."
      )
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer cette alerte."
      )
    } finally {
      setIsSavingForm(false)
    }
  }

  async function updateAlert(
    alert: AdminAnimalAlertRow,
    payload: Partial<{
      sourceType: "community" | "official" | "system"
      status: "active" | "resolved" | "expired"
      isVerified: boolean
    }>
  ) {
    setSavingAlertId(alert.id)
    setFeedbackMessage(null)

    try {
      await fetchAdminJson<{ ok: true; id: string }>("/api/admin/animal-alerts", {
        method: "POST",
        body: JSON.stringify({
          alertId: alert.id,
          ...payload,
        }),
      })

      setData((current) => {
        if (!current) {
          return current
        }

        const nextAlerts = current.alerts.map((item) =>
          item.id === alert.id
            ? {
                ...item,
                sourceType: payload.sourceType ?? item.sourceType,
                status: payload.status ?? item.status,
                isVerified:
                  typeof payload.isVerified === "boolean"
                    ? payload.isVerified
                    : item.isVerified,
              }
            : item
        )

        return {
          ...current,
          stats: buildAnimalAlertsStats(nextAlerts),
          alerts: nextAlerts,
        }
      })
      setFeedbackMessage("Alerte mise à jour.")
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Impossible de mettre à jour cette alerte."
      )
    } finally {
      setSavingAlertId(null)
    }
  }

  if (isLoading) {
    return (
      <AdminPageSkeleton
        title="Chargement des alertes animales"
        description="Préparation des alertes, scores de confiance et outils de modération."
        metrics={5}
        sections={2}
      />
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-[#6B7280]">
        {loadError ?? "Accès administration indisponible."}
      </div>
    )
  }

  return (
    <AdminDesktopLayout
      membership={data.membership}
      title="Alertes animales"
      description="Modération des alertes animales locales, réservée aux admins du service."
      toolbar={
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
            <label className="block">
              <span className="text-sm font-medium text-[#18212B]">Recherche</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Titre, ville, auteur…"
                className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none ring-0"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[#18212B]">Source</span>
              <select
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
              >
                <option value="all">Toutes</option>
                <option value="community">Communauté</option>
                <option value="official">Officielle</option>
                <option value="system">Automatique</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[#18212B]">Confiance</span>
              <select
                value={verificationFilter}
                onChange={(event) => setVerificationFilter(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
              >
                <option value="all">Toutes</option>
                <option value="verified">Vérifiées</option>
                <option value="unverified">À confirmer</option>
              </select>
            </label>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-[#F8FBFF] px-4 py-2 text-sm text-[#5B6572]">
              {filteredAlerts.length} alerte(s)
            </div>
            {canManageContent ? (
              <button
                type="button"
                onClick={openCreateForm}
                className="rounded-full bg-[#FAC411] px-4 py-2 text-sm font-semibold text-[#18212B]"
              >
                Nouvelle alerte
              </button>
            ) : null}
          </div>
        </div>
      }
    >
      {editorOpen && canManageContent ? (
        <AdminModalShell
          open={editorOpen}
          titleId="admin-animal-alert-title"
          descriptionId="admin-animal-alert-description"
          onClose={() => {
            resetForm()
            setEditorOpen(false)
          }}
        >
          <div className="mx-auto w-full max-w-4xl rounded-[32px] border border-[#0337AA]/8 bg-white p-6 shadow-[0_18px_48px_rgba(3,55,170,0.08)]">
          <h2 id="admin-animal-alert-title" className="text-xl font-semibold text-[#0337AA]">
            {editingAlertId ? "Modifier l’alerte" : "Créer une alerte"}
          </h2>
          <p
            id="admin-animal-alert-description"
            className="mt-2 text-sm leading-6 text-[#5B6572]"
          >
            Modifie le contenu, la localisation et les paramètres de vigilance dans une
            modale dédiée.
          </p>
          <form onSubmit={handleSaveAlert} className="mt-5 space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block"><span className="text-sm font-medium text-[#18212B]">Titre</span><input value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none" /></label>
              <label className="block"><span className="text-sm font-medium text-[#18212B]">Ville</span><input value={form.city} onChange={(e) => setForm((current) => ({ ...current, city: e.target.value }))} className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none" /></label>
              <label className="block"><span className="text-sm font-medium text-[#18212B]">Type</span><select value={form.alertType} onChange={(e) => setForm((current) => ({ ...current, alertType: e.target.value as typeof form.alertType }))} className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"><option value="processionnaires">Chenilles processionnaires</option><option value="epillets">Épillets</option><option value="tiques">Tiques</option><option value="puces">Puces</option><option value="plantes_toxiques">Plantes toxiques</option><option value="cyanobacteries">Cyanobactéries</option><option value="chaleur">Chaleur</option><option value="autre">Autre</option></select></label>
              <label className="block"><span className="text-sm font-medium text-[#18212B]">Espèces</span><select value={form.speciesScope} onChange={(e) => setForm((current) => ({ ...current, speciesScope: e.target.value as typeof form.speciesScope }))} className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"><option value="all">Toutes</option><option value="cat">Chats</option><option value="dog">Chiens</option><option value="bird">Oiseaux</option><option value="nac">NAC</option><option value="multiple">Multiples</option></select></label>
              <label className="block"><span className="text-sm font-medium text-[#18212B]">Latitude</span><input value={form.lat} onChange={(e) => setForm((current) => ({ ...current, lat: e.target.value }))} className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none" /></label>
              <label className="block"><span className="text-sm font-medium text-[#18212B]">Longitude</span><input value={form.lng} onChange={(e) => setForm((current) => ({ ...current, lng: e.target.value }))} className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none" /></label>
              <label className="block"><span className="text-sm font-medium text-[#18212B]">Source</span><select value={form.sourceType} onChange={(e) => setForm((current) => ({ ...current, sourceType: e.target.value as typeof form.sourceType }))} className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"><option value="official">Officielle</option><option value="community">Communauté</option><option value="system">Automatique</option></select></label>
              <label className="block"><span className="text-sm font-medium text-[#18212B]">Gravité</span><select value={form.severity} onChange={(e) => setForm((current) => ({ ...current, severity: e.target.value as typeof form.severity }))} className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"><option value="medium">Moyenne</option><option value="high">Forte</option></select></label>
              <label className="block"><span className="text-sm font-medium text-[#18212B]">Statut</span><select value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value as typeof form.status }))} className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"><option value="active">Active</option><option value="resolved">Résolue</option><option value="expired">Expirée</option></select></label>
              <label className="block"><span className="text-sm font-medium text-[#18212B]">Rayon (m)</span><input value={form.radiusMeters} onChange={(e) => setForm((current) => ({ ...current, radiusMeters: e.target.value }))} className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none" /></label>
            </div>
            <label className="block"><span className="text-sm font-medium text-[#18212B]">Description</span><textarea value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} rows={4} className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none" /></label>
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
              <label className="block"><span className="text-sm font-medium text-[#18212B]">Observée le</span><input type="datetime-local" value={form.observedAt} onChange={(e) => setForm((current) => ({ ...current, observedAt: e.target.value }))} className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none" /></label>
              <label className="block"><span className="text-sm font-medium text-[#18212B]">Expire le</span><input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm((current) => ({ ...current, expiresAt: e.target.value }))} className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none" /></label>
              <label className="flex items-end gap-3 pb-2 text-sm text-[#18212B]"><input type="checkbox" checked={form.isVerified} onChange={(e) => setForm((current) => ({ ...current, isVerified: e.target.checked }))} /><span>Vérifiée</span></label>
            </div>
            <div aria-live="polite" aria-atomic="true">
              {formError ? (
                <p className="text-sm text-[#7A1C22]" role="status">
                  {formError}
                </p>
              ) : null}
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={isSavingForm} className="rounded-full bg-[#FAC411] px-5 py-3 text-sm font-semibold text-[#18212B]">{isSavingForm ? "Enregistrement..." : "Enregistrer"}</button>
              <button type="button" onClick={() => { resetForm(); setEditorOpen(false) }} className="rounded-full border border-[#0337AA]/10 bg-white px-5 py-3 text-sm font-medium text-[#0337AA]">Annuler</button>
            </div>
          </form>
          </div>
        </AdminModalShell>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Total", value: data.stats.total },
          { label: "Actives", value: data.stats.active },
          { label: "Vérifiées", value: data.stats.verified },
          { label: "Vigilance forte", value: data.stats.highSeverity },
          { label: "Communautaires", value: data.stats.community },
        ].map((stat) => (
          <AdminMetricCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>

      {priorityItems.length > 0 ? (
        <AdminPanel tone="soft" className="mt-8">
          <AdminSectionHeader
            eyebrow="Priorités"
            title="File de vigilance"
            description="Met en avant les alertes à confirmer, les vigilances fortes encore actives et les remontées communautaires à qualifier."
          />
          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {priorityItems.map((item) => (
              <AdminMetricCard
                key={item.key}
                label={item.title}
                value={item.value}
                detail={item.detail}
                tone={item.key === "high-active" ? "danger" : item.key === "unverified" ? "warning" : "highlight"}
              />
            ))}
          </div>
        </AdminPanel>
      ) : null}

      <AdminPanel className="mt-8">
        <AdminSectionHeader
          eyebrow="Liste"
          title="Alertes animales locales"
          description="Vue de modération et de pilotage des alertes animales avec vérification, source et statut."
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
          columns={["Alerte", "Confiance", "Consensus", "Modération", "Historique"]}
          className="xl:grid-cols-[1.7fr_1fr_1fr_0.9fr_1fr]"
        />

        <div className="space-y-3">
          {filteredAlerts.length === 0 ? (
            <AdminEmptyState
              title="Aucune alerte à afficher"
              description={
                query.trim() ||
                sourceFilter !== "all" ||
                verificationFilter !== "all"
                  ? "Aucune alerte ne correspond aux filtres actifs. Élargis la recherche ou modifie les critères de source et de confiance."
                  : "Aucune alerte animale n'est encore disponible dans ce périmètre."
              }
              actionLabel={
                canManageContent &&
                !query.trim() &&
                sourceFilter === "all" &&
                verificationFilter === "all"
                  ? "Créer une alerte"
                  : undefined
              }
              onAction={
                canManageContent &&
                !query.trim() &&
                sourceFilter === "all" &&
                verificationFilter === "all"
                  ? openCreateForm
                  : undefined
              }
            />
          ) : null}
          {filteredAlerts.map((alert) => (
            <AdminRecordCard key={alert.id}>
              <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr_1fr_0.9fr_1fr]">
                <div>
                  <p className="text-sm font-semibold text-[#0337AA]">{alert.title}</p>
                  <p className="mt-2 text-xs text-[#6B7280]">
                    {alert.city} · {alert.alertType} · {alert.radiusMeters} m · {getSourceLabel(alert.sourceType)}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-[#425166]">{alert.description}</p>
                  <p className="mt-2 text-xs text-[#6B7280]">
                    Par {alert.authorLabel} · {formatAdminDate(alert.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#6B7280]">Confiance</p>
                  <button
                    type="button"
                    onClick={() =>
                      void updateAlert(alert, { isVerified: !alert.isVerified })
                    }
                    disabled={savingAlertId === alert.id}
                    className={`mt-1 rounded-full px-3 py-2 text-xs font-semibold ${
                      alert.isVerified
                        ? "bg-[#EAF3E0] text-[#385314]"
                        : "bg-[#FFF4E5] text-[#92400E]"
                    }`}
                  >
                    {alert.isVerified ? "Vérifiée" : "À confirmer"}
                  </button>
                  <div className="mt-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getConfidenceClasses(
                        alert.confidenceLabel
                      )}`}
                    >
                      Score {alert.confidenceScore}/100
                    </span>
                  </div>
                  {alert.confidenceReasons.length > 0 ? (
                    <div className="mt-2 space-y-1 text-xs text-[#6B7280]">
                      {alert.confidenceReasons.slice(0, 2).map((reason) => (
                        <div key={reason}>{reason}</div>
                      ))}
                      {alert.confidenceVersion ? (
                        <div className="text-[11px] text-[#64748B]">
                          Version {alert.confidenceVersion}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#6B7280]">Consensus</p>
                  <p className="mt-1 text-sm font-medium text-[#18212B]">
                    {alert.confirmCount} confirmations
                  </p>
                  <p className="mt-1 text-xs text-[#6B7280]">
                    {alert.clearCount} “plus d’actualité”
                  </p>
                  <p className="mt-3 text-xs text-[#6B7280]">
                    Observée: {formatAdminDate(alert.observedAt)}
                  </p>
                  <p className="mt-1 text-xs text-[#6B7280]">
                    Expire: {formatAdminDate(alert.expiresAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#6B7280]">Modération</p>
                  <label className="mt-1 block text-xs text-[#6B7280]">Source</label>
                  <select
                    value={alert.sourceType}
                    onChange={(event) =>
                      void updateAlert(alert, {
                        sourceType: event.target.value as
                          | "community"
                          | "official"
                          | "system",
                      })
                    }
                    disabled={savingAlertId === alert.id}
                    className="mt-1 w-full rounded-2xl border border-[#0337AA]/10 bg-white px-3 py-2 text-sm outline-none"
                  >
                    <option value="community">Communauté</option>
                    <option value="official">Officielle</option>
                    <option value="system">Automatique</option>
                  </select>
                  <label className="mt-3 block text-xs text-[#6B7280]">Statut</label>
                  <select
                    value={alert.status}
                    onChange={(event) =>
                      void updateAlert(alert, {
                        status: event.target.value as
                          | "active"
                          | "resolved"
                          | "expired",
                      })
                    }
                    disabled={savingAlertId === alert.id}
                    className="mt-1 w-full rounded-2xl border border-[#0337AA]/10 bg-white px-3 py-2 text-sm outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="resolved">Résolue</option>
                    <option value="expired">Expirée</option>
                  </select>
                  <p className="mt-3 text-xs font-medium text-[#4B5563]">
                    {getStatusLabel(alert.status)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#6B7280]">Historique</p>
                  {alert.moderationLogs.length > 0 ? (
                    <div className="mt-1 space-y-2">
                      {alert.moderationLogs.map((log) => (
                        <div
                          key={log.id}
                          className="rounded-xl bg-white px-3 py-2 ring-1 ring-[#0337AA]/8"
                        >
                          <div className="font-medium text-[#18212B]">
                            {getModerationActionLabel(log.action)}
                          </div>
                          <div className="mt-1 text-[#6B7280]">
                            {log.previousValue || "∅"} → {log.nextValue || "∅"}
                          </div>
                          <div className="mt-1 text-[#64748B]">
                            {formatAdminDate(log.createdAt)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-1 text-xs text-[#64748B]">
                      Aucun log de modération.
                    </div>
                  )}
                </div>
                {canManageContent ? (
                  <div className="flex items-start justify-end xl:col-span-5">
                    <button
                      type="button"
                      onClick={() => openEditForm(alert)}
                      className="rounded-full border border-[#0337AA]/10 bg-white px-4 py-2 text-sm font-medium text-[#0337AA]"
                    >
                      Modifier le contenu
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
