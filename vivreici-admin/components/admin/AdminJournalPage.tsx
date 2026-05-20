"use client"

import { useEffect, useState } from "react"
import AdminDesktopLayout from "@/components/admin/AdminDesktopLayout"
import AdminListHeader from "@/components/admin/AdminListHeader"
import AdminMetricCard from "@/components/admin/AdminMetricCard"
import AdminPanel from "@/components/admin/AdminPanel"
import AdminPageSkeleton from "@/components/admin/AdminPageSkeleton"
import AdminRecordCard from "@/components/admin/AdminRecordCard"
import AdminSectionHeader from "@/components/admin/AdminSectionHeader"
import { fetchAdminJson } from "@/lib/admin-client"
import type { AdminJournalData } from "@/lib/admin-types"
import { formatReportDate } from "@/lib/reports"

function getCategoryLabel(category: AdminJournalData["items"][number]["category"]) {
  switch (category) {
    case "access":
      return "Accès"
    case "user":
      return "Utilisateurs"
    case "report":
      return "Signalements"
    case "help_post":
      return "Entraide"
    case "animal_alert":
      return "Alertes animales"
    case "animal_post":
      return "Annonces animales"
    case "moderation":
      return "Modération"
  }
}

export default function AdminJournalPage({
  initialData = null,
}: {
  initialData?: AdminJournalData | null
}) {
  const [data, setData] = useState<AdminJournalData | null>(initialData)
  const [isLoading, setIsLoading] = useState(!initialData)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (initialData) {
      return
    }

    async function load() {
      try {
        setLoadError(null)
        const payload = await fetchAdminJson<AdminJournalData>("/api/admin/journal")
        setData(payload)
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Impossible de charger le journal."
        )
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [initialData])

  if (isLoading) {
    return (
      <AdminPageSkeleton
        title="Chargement du journal"
        description="Préparation de l’historique des actions admin et de modération."
        metrics={3}
        sections={1}
      />
    )
  }

  if (!data) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-[#6B7280]">{loadError ?? "Accès refusé."}</div>
  }

  const accessCount = data.items.filter((item) => item.category === "access").length
  const moderationCount = data.items.filter((item) => item.category === "moderation").length
  const contentCount = data.items.filter(
    (item) =>
      item.category === "report" ||
      item.category === "help_post" ||
      item.category === "animal_alert" ||
      item.category === "animal_post"
  ).length
  const last24HoursCount = data.items.filter(
    (item) => Date.now() - new Date(item.createdAt).getTime() <= 24 * 60 * 60 * 1000
  ).length
  const userActionsCount = data.items.filter((item) => item.category === "user").length
  const recentModerationCount = data.items.filter(
    (item) =>
      item.category === "moderation" &&
      Date.now() - new Date(item.createdAt).getTime() <= 72 * 60 * 60 * 1000
  ).length

  return (
    <AdminDesktopLayout
      membership={data.membership}
      title="Journal"
      description="Historique des actions admin essentielles: accès, contenu animal et modération."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Entrées" value={data.items.length} />
        <AdminMetricCard label="Accès" value={accessCount} />
        <AdminMetricCard label="Modération" value={moderationCount} />
        <AdminMetricCard label="Contenus" value={contentCount} />
      </div>

      <AdminPanel tone="soft" className="mt-8">
        <AdminSectionHeader
          eyebrow="Lecture rapide"
          title="Points chauds du journal"
          description="Aide à savoir s’il faut regarder d’abord l’activité très récente, les comptes ou la modération."
        />
        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          <AdminMetricCard
            label="Activité 24h"
            value={last24HoursCount}
            detail="Entrées enregistrées sur les dernières 24 heures."
            tone="highlight"
          />
          <AdminMetricCard
            label="Actions utilisateurs"
            value={userActionsCount}
            detail="Créations, mises à jour et réinitialisations de comptes."
            tone="default"
          />
          <AdminMetricCard
            label="Modération 72h"
            value={recentModerationCount}
            detail="Changements récents de statut, source ou vérification."
            tone={recentModerationCount > 0 ? "warning" : "default"}
          />
        </div>
      </AdminPanel>

      <AdminPanel className="mt-8">
        <AdminSectionHeader
          eyebrow="Historique"
          title="Journal des opérations"
          description="Consolide les actions d'accès, de contenu et de modération pour un suivi chronologique plus lisible."
        />
        <AdminListHeader
          columns={["Événement", "Acteur"]}
          className="xl:grid-cols-[1.5fr_0.6fr]"
        />
        <div className="mt-6 space-y-3">
          {data.items.map((item) => (
            <AdminRecordCard key={`${item.category}-${item.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#EAF0FB] px-2.5 py-1 text-xs font-semibold text-[#0337AA]">
                      {getCategoryLabel(item.category)}
                    </span>
                    <span className="text-xs text-[#5B6572]">{formatReportDate(item.createdAt)}</span>
                  </div>
                  <h2 className="mt-3 text-base font-semibold text-[#18212B]">{item.title}</h2>
                  <p className="mt-2 text-sm text-[#425166]">{item.detail}</p>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-xs text-[#5B6572] ring-1 ring-[#0337AA]/8">
                  {item.actorLabel}
                </div>
              </div>
            </AdminRecordCard>
          ))}
        </div>
      </AdminPanel>
    </AdminDesktopLayout>
  )
}
