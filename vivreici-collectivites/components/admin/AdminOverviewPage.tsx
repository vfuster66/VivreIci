"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import AdminDesktopLayout from "@/components/admin/AdminDesktopLayout"
import AdminMetricCard from "@/components/admin/AdminMetricCard"
import AdminPageSkeleton from "@/components/admin/AdminPageSkeleton"
import AdminSectionHeader from "@/components/admin/AdminSectionHeader"
import { fetchAdminJson } from "@/lib/admin-client"
import {
  ADMIN_ROLE_LABELS,
  type AdminOverviewData,
} from "@/lib/admin-types"
import { buildCitizenAppUrl } from "@/lib/citizen-app-url"
import { formatReportDate } from "@/lib/reports"

function getAnalyticsEventLabel(eventName: string) {
  switch (eventName) {
    case "map_viewed":
      return "Carte consultée"
    case "user_returned":
      return "Utilisateur revenu"
    case "notifications_opened":
      return "Notifications ouvertes"
    case "report_created":
      return "Signalement créé"
    case "report_viewed":
      return "Signalement consulté"
    case "help_post_created":
      return "Annonce d'entraide créée"
    case "animal_alert_created":
      return "Alerte animale créée"
    default:
      return eventName.replaceAll("_", " ")
  }
}

function getPriorityCards(data: AdminOverviewData) {
  const { membership, stats } = data

  if (membership.role === "superadmin") {
    return [
      {
        title: "Vérifier les abus signalés",
        value: stats.flaggedReports,
        description:
          stats.flaggedReports > 0
            ? "Des signalements remontent avec suspicion d'abus et demandent une revue rapide."
            : "Aucun abus récent ne nécessite d'intervention immédiate.",
        href: "/admin/signalements",
        cta: stats.flaggedReports > 0 ? "Traiter les signalements" : "Voir les signalements",
        tone: stats.flaggedReports > 0 ? "danger" : "default",
      },
      {
        title: "Réduire le stock ouvert",
        value: stats.openReports,
        description:
          stats.openReports > 0
            ? "Le volume ouvert reste le meilleur indicateur de charge opérationnelle."
            : "Aucun signalement ouvert n'est en attente immédiate.",
        href: "/admin/signalements",
        cta: "Prioriser le traitement",
        tone: stats.openReports > 12 ? "warning" : "default",
      },
      {
        title: "Suivre l'acquisition",
        value: stats.recentUsers7d ?? 0,
        description:
          (stats.recentUsers7d ?? 0) > 0
            ? "Des comptes ont été créés cette semaine. Vérifie leur activation et leur usage réel."
            : "Aucun nouveau compte sur 7 jours. Le funnel mérite sans doute une revue.",
        href: "/admin/utilisateurs",
        cta: "Voir les utilisateurs",
        tone: (stats.recentUsers7d ?? 0) === 0 ? "warning" : "default",
      },
    ] as const
  }

  if (membership.role === "admin") {
    return [
      {
        title: "Traiter les ouverts",
        value: stats.openReports,
        description:
          stats.openReports > 0
            ? "Les signalements ouverts doivent être qualifiés ou pris en charge en premier."
            : "Aucun signalement ouvert à absorber pour le moment.",
        href: "/admin/signalements",
        cta: "Ouvrir la file",
        tone: stats.openReports > 12 ? "warning" : "default",
      },
      {
        title: "Revoir les abus",
        value: stats.flaggedReports,
        description:
          stats.flaggedReports > 0
            ? "La file de modération contient des cas à arbitrer."
            : "Aucun abus récent à arbitrer.",
        href: "/admin/signalements",
        cta: "Voir la modération",
        tone: stats.flaggedReports > 0 ? "danger" : "default",
      },
      {
        title: "Faire avancer les dossiers",
        value: stats.inProgressReports,
        description:
          stats.inProgressReports > 0
            ? "Les signalements en cours doivent être clôturés ou réévalués."
            : "Aucun dossier en cours ne semble bloqué.",
        href: "/admin/signalements",
        cta: "Voir les en cours",
        tone: stats.inProgressReports > 8 ? "warning" : "default",
      },
    ] as const
  }

  return [
    {
      title: "Signalements ouverts du territoire",
      value: stats.openReports,
      description:
        stats.openReports > 0
          ? "Les cas ouverts du territoire demandent une lecture opérationnelle rapide."
          : "Aucun signalement ouvert n'est remonté sur le territoire.",
      href: "/admin/collectivites",
      cta: "Voir les signalements",
      tone: stats.openReports > 8 ? "warning" : "default",
    },
    {
      title: "Dossiers en cours",
      value: stats.inProgressReports,
      description:
        stats.inProgressReports > 0
          ? "Les signalements en cours méritent un suivi jusqu'à résolution."
          : "Aucun dossier en cours ne semble nécessiter de relance.",
      href: "/admin/collectivites",
      cta: "Suivre les dossiers",
      tone: stats.inProgressReports > 4 ? "warning" : "default",
    },
    {
      title: "Résolutions récentes",
      value: stats.resolvedReports,
      description:
        stats.resolvedReports > 0
          ? "Les résolutions donnent une vision du débit de traitement sur le territoire."
          : "Aucune résolution récente à valoriser.",
      href: "/admin/collectivites",
      cta: "Voir le détail",
      tone: "default",
    },
  ] as const
}

export default function AdminOverviewPage({
  initialData = null,
}: {
  initialData?: AdminOverviewData | null
}) {
  const [data, setData] = useState<AdminOverviewData | null>(initialData)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(!initialData)

  useEffect(() => {
    if (initialData) {
      return
    }

    let active = true

    async function load() {
      try {
        setLoadError(null)
        const nextData = await fetchAdminJson<AdminOverviewData>(
          "/api/admin/overview"
        )

        if (active) {
          setData(nextData)
        }
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Impossible de charger le tableau de bord."
          )
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [initialData])

  if (isLoading) {
    return (
      <AdminPageSkeleton
        title="Chargement du dashboard"
        description="Préparation de la vue d’ensemble produit, modération et activité."
        metrics={8}
        sections={3}
      />
    )
  }

  if (!data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold text-[#0337AA]">
          Accès administration indisponible
        </h1>
        <p className="text-sm leading-6 text-[#5B6572]">
          {loadError ??
            "Connectez-vous avec un compte disposant d'un rôle admin ou superadmin."}
        </p>
        <Link
          href="/connexion?next=/admin"
          className="rounded-full bg-[#FAC411] px-5 py-3 text-sm font-semibold text-[#18212B]"
        >
          Ouvrir la connexion
        </Link>
      </div>
    )
  }

  const { membership, stats } = data
  const priorityCards = getPriorityCards(data)
  const title =
    membership.role === "mairie"
      ? "Synthèse collectivités"
      : "Vue d'ensemble opérationnelle"

  return (
    <AdminDesktopLayout
      membership={membership}
      title={title}
      description={
        membership.role === "superadmin"
          ? "Suivi global de l'usage produit, des signalements, des utilisateurs et de la modération."
          : membership.role === "admin"
            ? "Pilotage quotidien des signalements et de la modération, sans surcharge inutile."
            : "Lecture rapide des signalements utiles à une collectivité: volume, état, priorités et accès aux données terrain."
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Signalements total" value={stats.totalReports} />
        <AdminMetricCard
          label="Ouverts"
          value={stats.openReports}
          tone={stats.openReports > 0 ? "warning" : "default"}
        />
        <AdminMetricCard
          label="En cours"
          value={stats.inProgressReports}
          tone={stats.inProgressReports > 0 ? "warning" : "default"}
        />
        <AdminMetricCard
          label="Signalements abus"
          value={stats.flaggedReports}
          tone={stats.flaggedReports > 0 ? "danger" : "default"}
        />
        {membership.role === "superadmin" ? (
          <>
            <AdminMetricCard label="Utilisateurs total" value={stats.totalUsers} />
            <AdminMetricCard
              label="Nouveaux 7 jours"
              value={stats.recentUsers7d}
            />
            <AdminMetricCard
              label="Événements analytics 7 jours"
              value={stats.analyticsEvents7d}
            />
            <AdminMetricCard label="Archivés" value={stats.archivedReports} />
          </>
        ) : null}
      </div>

      <section className="mt-6 rounded-[32px] border border-[#0337AA]/8 bg-[linear-gradient(180deg,#ffffff_0%,#f4f8ff_100%)] p-6 shadow-[0_18px_48px_rgba(3,55,170,0.08)]">
        <AdminSectionHeader
          eyebrow="Priorités du jour"
          title={`Actions recommandées pour ${ADMIN_ROLE_LABELS[membership.role].toLowerCase()}`}
          titleTone="primary"
          description="Cette vue met en avant les prochains arbitrages utiles au lieu de seulement décrire l’activité."
        />

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {priorityCards.map((item) => (
            <div
              key={item.title}
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
              <div className="mt-5">
                <Link
                  href={item.href}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-[#FAC411] px-5 text-sm font-semibold text-[#18212B]"
                >
                  {item.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[32px] border border-[#0337AA]/8 bg-white p-6 shadow-[0_18px_48px_rgba(3,55,170,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#5B6572]">
                Répartition
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#0337AA]">
                Types de signalements les plus présents
              </h2>
            </div>
            <Link
              href={
                membership.role === "mairie"
                  ? "/admin/collectivites"
                  : "/admin/signalements"
              }
              className="text-sm font-semibold text-[#7B5B00]"
            >
              Ouvrir la vue détaillée
            </Link>
          </div>

          <div className="mt-5 space-y-4">
            {data.reportsByType.length === 0 ? (
              <p className="text-sm text-[#5B6572]">
                Aucun signalement récent pour calculer une tendance.
              </p>
            ) : (
              data.reportsByType.map((item) => (
                <div key={item.type}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-[#0337AA]">{item.type}</span>
                    <span className="text-[#5B6572]">{item.count}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-[#E7EEF9]">
                    <div
                      className="h-2 rounded-full bg-[#FAC411]"
                      style={{
                        width: `${Math.max(
                          8,
                          Math.round(
                            (item.count / Math.max(data.reportsByType[0]?.count ?? 1, 1)) *
                              100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[32px] border border-[#0337AA]/10 bg-[#0F2D78] p-6 text-white shadow-[0_18px_48px_rgba(3,55,170,0.22)]">
          <p className="text-xs uppercase tracking-[0.28em] text-white/75">
            Accès
          </p>
          <h2 className="mt-2 text-xl font-semibold">
            Profil courant: {ADMIN_ROLE_LABELS[membership.role]}
          </h2>
          <div className="mt-5 space-y-3 text-sm leading-6 text-white/88">
            <p>
              {membership.role === "superadmin"
                ? "Vous avez accès au suivi produit complet, aux utilisateurs, à la modération et aux données terrain."
                : membership.role === "admin"
                  ? "Vous avez accès au pilotage opérationnel: signalements, modération et suivi quotidien."
                  : "Vous avez accès aux données signalements utiles à la collectivité, avec un angle terrain et adresses."}
            </p>
            {membership.organizationName ? (
              <p>Organisation: {membership.organizationName}</p>
            ) : null}
            {membership.territoryLabel ? (
              <p>Territoire déclaré: {membership.territoryLabel}</p>
            ) : null}
          </div>
        </section>
      </div>

      {membership.role === "superadmin" ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <section className="rounded-[32px] border border-[#0337AA]/8 bg-white p-6 shadow-[0_18px_48px_rgba(3,55,170,0.08)]">
            <p className="text-xs uppercase tracking-[0.28em] text-[#5B6572]">
              Analytics
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[#0337AA]">
              Événements les plus fréquents
            </h2>
            <div className="mt-5 space-y-3">
              {data.topEvents.length === 0 ? (
                <p className="text-sm text-[#5B6572]">
                  Pas encore assez d&apos;événements collectés.
                </p>
              ) : (
                data.topEvents.map((item) => (
                  <div
                    key={item.eventName}
                    className="flex items-center justify-between rounded-2xl bg-[#F8FBFF] px-4 py-3 text-sm"
                  >
                    <span className="font-medium text-[#0337AA]">
                      {getAnalyticsEventLabel(item.eventName)}
                    </span>
                    <span className="text-[#5B6572]">{item.count}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[32px] border border-[#0337AA]/8 bg-white p-6 shadow-[0_18px_48px_rgba(3,55,170,0.08)]">
            <p className="text-xs uppercase tracking-[0.28em] text-[#5B6572]">
              Utilisateurs
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[#0337AA]">
              Comptes les plus récents
            </h2>
            <div className="mt-5 space-y-3">
              {data.recentUsers.length === 0 ? (
                <p className="text-sm text-[#5B6572]">
                  Aucun compte récent à afficher.
                </p>
              ) : (
                data.recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-2xl border border-[#0337AA]/8 bg-[#F8FBFF] px-4 py-3"
                  >
                    <p className="text-sm font-medium text-[#0337AA]">
                      {user.email ?? "Adresse email non disponible"}
                    </p>
                    <p className="mt-1 text-xs text-[#5B6572]">
                      Créé le {formatReportDate(user.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}

      {(membership.role === "superadmin" || membership.role === "admin") && (
        <section className="mt-6 rounded-[32px] border border-[#0337AA]/8 bg-white p-6 shadow-[0_18px_48px_rgba(3,55,170,0.08)]">
          <p className="text-xs uppercase tracking-[0.28em] text-[#5B6572]">
            Modération
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[#0337AA]">
            Derniers signalements d&apos;abus
          </h2>
          <div className="mt-5 grid gap-3">
            {data.recentAbuseFlags.length === 0 ? (
              <p className="text-sm text-[#5B6572]">
                Aucun abus signalé récemment.
              </p>
            ) : (
              data.recentAbuseFlags.map((flag) => (
                <div
                  key={flag.id}
                  className="grid gap-2 rounded-[24px] border border-[#0337AA]/8 bg-[#F8FBFF] px-4 py-4 lg:grid-cols-[1fr_auto_auto]"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#0337AA]">
                      {flag.reportReference}
                    </p>
                    <p className="mt-1 text-sm text-[#5B6572]">
                      {flag.reportType} · {flag.reason}
                    </p>
                  </div>
                  <p className="text-sm text-[#6B7280]">
                    {formatReportDate(flag.createdAt)}
                  </p>
                  <Link
                    href={buildCitizenAppUrl(`/signalements/${flag.reportId}`)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-[#7B5B00]"
                  >
                    Ouvrir la fiche
                  </Link>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </AdminDesktopLayout>
  )
}
