"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Building2,
  MapPinned,
  ShieldCheck,
} from "lucide-react"
import { ADMIN_ROLE_LABELS, type AdminMembership } from "@/lib/admin-types"

const ICONS = {
  dashboard: BarChart3,
  reports: ShieldCheck,
  municipalities: Building2,
} as const

export default function AdminSidebar({
  membership,
}: {
  membership: AdminMembership
}) {
  const pathname = usePathname()

  const items = [
    {
      href: "/admin",
      label: membership.role === "mairie" ? "Synthèse" : "Vue d'ensemble",
      icon: ICONS.dashboard,
      visible: true,
    },
    {
      href: "/admin/signalements",
      label: "Signalements",
      icon: ICONS.reports,
      visible: membership.role !== "mairie",
    },
    {
      href: "/admin/collectivites",
      label: "Collectivités",
      icon: ICONS.municipalities,
      visible: true,
    },
  ].filter((item) => item.visible)

  return (
    <aside className="flex h-full min-h-screen w-full max-w-[280px] flex-col border-r border-black/5 bg-[#1D2A38] px-5 py-6 text-white">
      <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
        <p className="text-xs uppercase tracking-[0.28em] text-white/55">
          Administration
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FAC411] text-[#1D2A38]">
            <MapPinned className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-semibold">VivreIci</p>
            <p className="text-sm text-white/65">
              {ADMIN_ROLE_LABELS[membership.role]}
            </p>
          </div>
        </div>
        {membership.organizationName ? (
          <p className="mt-4 text-sm leading-6 text-white/72">
            {membership.organizationName}
          </p>
        ) : null}
        {membership.territoryLabel ? (
          <p className="mt-1 text-sm text-white/55">{membership.territoryLabel}</p>
        ) : null}
      </div>

      <nav className="mt-8 space-y-2">
        {items.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
                isActive
                  ? "bg-[#FAC411] font-semibold text-[#1D2A38]"
                  : "text-white/72 hover:bg-white/8 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/68">
        Dashboard desktop séparé de l&apos;app mobile, centré sur le suivi des
        signalements, la modération et l&apos;usage réel.
      </div>
    </aside>
  )
}
