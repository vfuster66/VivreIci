"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import AdminDesktopLayout from "@/components/admin/AdminDesktopLayout"
import AdminReportsMap from "@/components/admin/AdminReportsMap"
import { fetchAdminJson } from "@/lib/admin-client"
import type { AdminReportsData } from "@/lib/admin-types"
import {
  formatReportDate,
  getReportStatusClasses,
  getReportStatusLabel,
} from "@/lib/reports"

export default function AdminReportsPage({
  mode,
}: {
  mode: "admin" | "mairie"
}) {
  const [data, setData] = useState<AdminReportsData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    let active = true

    async function load() {
      try {
        setLoadError(null)
        const nextData = await fetchAdminJson<AdminReportsData>(
          "/api/admin/reports"
        )

        if (active) {
          setData(nextData)
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
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  const filteredReports = useMemo(() => {
    if (!data) {
      return []
    }

    const normalizedQuery = query.trim().toLowerCase()

    return data.reports.filter((report) => {
      const matchesStatus =
        statusFilter === "all" ? true : report.status === statusFilter
      const haystack = [
        report.reference,
        report.type,
        report.address ?? "",
        report.description,
      ]
        .join(" ")
        .toLowerCase()
      const matchesQuery =
        normalizedQuery.length === 0 || haystack.includes(normalizedQuery)

      return matchesStatus && matchesQuery
    })
  }, [data, query, statusFilter])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[#6B7280]">
        Chargement des données terrain…
      </div>
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
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-[28px] border border-black/5 bg-white px-5 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] xl:col-span-1">
          <p className="text-sm text-[#6B7280]">Total</p>
          <p className="mt-4 text-3xl font-semibold text-[#18212B]">
            {data.stats.total}
          </p>
        </div>
        <div className="rounded-[28px] border border-black/5 bg-white px-5 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] xl:col-span-1">
          <p className="text-sm text-[#6B7280]">Ouverts</p>
          <p className="mt-4 text-3xl font-semibold text-[#18212B]">
            {data.stats.open}
          </p>
        </div>
        <div className="rounded-[28px] border border-black/5 bg-white px-5 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] xl:col-span-1">
          <p className="text-sm text-[#6B7280]">En cours</p>
          <p className="mt-4 text-3xl font-semibold text-[#18212B]">
            {data.stats.inProgress}
          </p>
        </div>
        <div className="rounded-[28px] border border-black/5 bg-white px-5 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] xl:col-span-1">
          <p className="text-sm text-[#6B7280]">Résolus</p>
          <p className="mt-4 text-3xl font-semibold text-[#18212B]">
            {data.stats.resolved}
          </p>
        </div>
        <div className="rounded-[28px] border border-black/5 bg-white px-5 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] xl:col-span-1">
          <p className="text-sm text-[#6B7280]">Abus signalés</p>
          <p className="mt-4 text-3xl font-semibold text-[#18212B]">
            {data.stats.flagged}
          </p>
        </div>
        <div className="rounded-[28px] border border-black/5 bg-white px-5 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] xl:col-span-1">
          <p className="text-sm text-[#6B7280]">Visibles carte</p>
          <p className="mt-4 text-3xl font-semibold text-[#18212B]">
            {data.stats.visibleOnMap}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section>
          <AdminReportsMap reports={filteredReports} />
        </section>

        <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.07)]">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
            <label className="block">
              <span className="text-sm font-medium text-[#18212B]">Recherche</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Référence, type, adresse…"
                className="mt-2 w-full rounded-2xl border border-black/8 bg-[#FCFCFD] px-4 py-3 text-sm outline-none ring-0"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[#18212B]">Statut</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/8 bg-[#FCFCFD] px-4 py-3 text-sm outline-none"
              >
                <option value="all">Tous</option>
                <option value="open">Ouverts</option>
                <option value="in_progress">En cours</option>
                <option value="resolved">Résolus</option>
                <option value="archived">Archivés</option>
              </select>
            </label>
          </div>

          <div className="mt-5 text-sm text-[#6B7280]">
            {filteredReports.length} signalement(s) affiché(s)
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.07)]">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.22em] text-[#6B7280]">
                <th className="pb-2 pr-4">Référence</th>
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2 pr-4">Adresse</th>
                <th className="pb-2 pr-4">Statut</th>
                <th className="pb-2 pr-4">Créé le</th>
                <th className="pb-2 pr-4">Carte</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr key={report.id} className="bg-[#FCFCFD] text-sm text-[#18212B]">
                  <td className="rounded-l-[18px] px-4 py-4 font-semibold">
                    <div>{report.reference}</div>
                    <div className="mt-1 line-clamp-2 text-xs font-normal text-[#6B7280]">
                      {report.description}
                    </div>
                  </td>
                  <td className="px-4 py-4">{report.type}</td>
                  <td className="px-4 py-4 text-[#4B5563]">
                    {report.address ?? "Adresse non précisée"}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getReportStatusClasses(report.status)}`}
                    >
                      {getReportStatusLabel(report.status)}
                    </span>
                    {report.abuseCount > 0 ? (
                      <p className="mt-2 text-xs text-[#BE123C]">
                        {report.abuseCount} abus signalé(s)
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 text-[#4B5563]">
                    {formatReportDate(report.createdAt)}
                  </td>
                  <td className="rounded-r-[18px] px-4 py-4">
                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/signalements/${report.id}`}
                        className="text-sm font-medium text-[#9A7800]"
                      >
                        Ouvrir la fiche
                      </Link>
                      <Link
                        href={`/carte?lat=${report.lat}&lng=${report.lng}`}
                        className="text-sm text-[#5B6572]"
                      >
                        Centrer la carte
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredReports.length === 0 ? (
            <p className="py-8 text-sm text-[#6B7280]">
              Aucun signalement ne correspond aux filtres actuels.
            </p>
          ) : null}
        </div>
      </section>
    </AdminDesktopLayout>
  )
}
