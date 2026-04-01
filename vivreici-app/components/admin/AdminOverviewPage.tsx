"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import AdminDesktopLayout from "@/components/admin/AdminDesktopLayout"
import { fetchAdminJson } from "@/lib/admin-client"
import {
  ADMIN_ROLE_LABELS,
  type AdminOverviewData,
} from "@/lib/admin-types"
import { formatReportDate } from "@/lib/reports"

function OverviewMetric({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: number | null
  tone?: "default" | "warning" | "danger"
}) {
  const toneClasses =
    tone === "danger"
      ? "bg-[#FFF1F2] text-[#BE123C]"
      : tone === "warning"
        ? "bg-[#FFF8DF] text-[#8A6700]"
        : "bg-white text-[#18212B]"

  return (
    <div
      className={`rounded-[28px] border border-black/5 px-5 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] ${toneClasses}`}
    >
      <p className="text-sm text-current/72">{label}</p>
      <p className="mt-4 text-3xl font-semibold tracking-[-0.03em]">
        {value ?? "—"}
      </p>
    </div>
  )
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverviewData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
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
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[#6B7280]">
        Chargement du dashboard…
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold text-[#18212B]">
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
        <OverviewMetric label="Signalements total" value={stats.totalReports} />
        <OverviewMetric
          label="Ouverts"
          value={stats.openReports}
          tone={stats.openReports > 0 ? "warning" : "default"}
        />
        <OverviewMetric
          label="En cours"
          value={stats.inProgressReports}
          tone={stats.inProgressReports > 0 ? "warning" : "default"}
        />
        <OverviewMetric
          label="Signalements abus"
          value={stats.flaggedReports}
          tone={stats.flaggedReports > 0 ? "danger" : "default"}
        />
        {membership.role === "superadmin" ? (
          <>
            <OverviewMetric label="Utilisateurs total" value={stats.totalUsers} />
            <OverviewMetric
              label="Nouveaux 7 jours"
              value={stats.recentUsers7d}
            />
            <OverviewMetric
              label="Événements analytics 7 jours"
              value={stats.analyticsEvents7d}
            />
            <OverviewMetric label="Archivés" value={stats.archivedReports} />
          </>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.07)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#6B7280]">
                Répartition
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#18212B]">
                Types de signalements les plus présents
              </h2>
            </div>
            <Link
              href={
                membership.role === "mairie"
                  ? "/admin/collectivites"
                  : "/admin/signalements"
              }
              className="text-sm font-medium text-[#9A7800]"
            >
              Ouvrir la vue détaillée
            </Link>
          </div>

          <div className="mt-5 space-y-4">
            {data.reportsByType.length === 0 ? (
              <p className="text-sm text-[#6B7280]">
                Aucun signalement récent pour calculer une tendance.
              </p>
            ) : (
              data.reportsByType.map((item) => (
                <div key={item.type}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-[#18212B]">{item.type}</span>
                    <span className="text-[#6B7280]">{item.count}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-[#F3F4F6]">
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

        <section className="rounded-[32px] border border-black/5 bg-[#1D2A38] p-6 text-white shadow-[0_18px_48px_rgba(15,23,42,0.16)]">
          <p className="text-xs uppercase tracking-[0.28em] text-white/55">
            Accès
          </p>
          <h2 className="mt-2 text-xl font-semibold">
            Profil courant: {ADMIN_ROLE_LABELS[membership.role]}
          </h2>
          <div className="mt-5 space-y-3 text-sm leading-6 text-white/72">
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
          <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.07)]">
            <p className="text-xs uppercase tracking-[0.28em] text-[#6B7280]">
              Analytics
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[#18212B]">
              Événements les plus fréquents
            </h2>
            <div className="mt-5 space-y-3">
              {data.topEvents.length === 0 ? (
                <p className="text-sm text-[#6B7280]">
                  Pas encore assez d&apos;événements collectés.
                </p>
              ) : (
                data.topEvents.map((item) => (
                  <div
                    key={item.eventName}
                    className="flex items-center justify-between rounded-2xl bg-[#F8FAFC] px-4 py-3 text-sm"
                  >
                    <span className="font-medium text-[#18212B]">{item.eventName}</span>
                    <span className="text-[#6B7280]">{item.count}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.07)]">
            <p className="text-xs uppercase tracking-[0.28em] text-[#6B7280]">
              Utilisateurs
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[#18212B]">
              Comptes les plus récents
            </h2>
            <div className="mt-5 space-y-3">
              {data.recentUsers.length === 0 ? (
                <p className="text-sm text-[#6B7280]">
                  Aucun compte récent à afficher.
                </p>
              ) : (
                data.recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-2xl border border-black/5 bg-[#FCFCFD] px-4 py-3"
                  >
                    <p className="text-sm font-medium text-[#18212B]">
                      {user.email ?? "Adresse email non disponible"}
                    </p>
                    <p className="mt-1 text-xs text-[#6B7280]">
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
        <section className="mt-6 rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.07)]">
          <p className="text-xs uppercase tracking-[0.28em] text-[#6B7280]">
            Modération
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[#18212B]">
            Derniers signalements d&apos;abus
          </h2>
          <div className="mt-5 grid gap-3">
            {data.recentAbuseFlags.length === 0 ? (
              <p className="text-sm text-[#6B7280]">
                Aucun abus signalé récemment.
              </p>
            ) : (
              data.recentAbuseFlags.map((flag) => (
                <div
                  key={flag.id}
                  className="grid gap-2 rounded-[24px] border border-black/5 bg-[#FCFCFD] px-4 py-4 lg:grid-cols-[1fr_auto_auto]"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#18212B]">
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
                    href={`/signalements/${flag.reportId}`}
                    className="text-sm font-medium text-[#9A7800]"
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
