"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Siren,
  BarChart3,
  Building2,
  HandHelping,
  KeyRound,
  LogOut,
  PawPrint,
  ScrollText,
  ShieldCheck,
  Users,
} from "lucide-react"
import { ADMIN_ROLE_LABELS, type AdminMembership } from "@/lib/admin-types"
import { createClient } from "@/lib/supabase"

const ICONS = {
  dashboard: BarChart3,
  reports: ShieldCheck,
  municipalities: Building2,
  access: KeyRound,
  animalAlerts: Siren,
  helpPosts: HandHelping,
  animalPosts: PawPrint,
  journal: ScrollText,
  users: Users,
} as const

export default function AdminSidebar({
  membership,
}: {
  membership: AdminMembership
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

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
    {
      href: "/admin/entraide",
      label: "Entraide",
      icon: ICONS.helpPosts,
      visible: membership.role !== "mairie",
    },
    {
      href: "/admin/animaux-annonces",
      label: "Animaux annonces",
      icon: ICONS.animalPosts,
      visible: membership.role !== "mairie",
    },
    {
      href: "/admin/animaux-alertes",
      label: "Animaux alertes",
      icon: ICONS.animalAlerts,
      visible: membership.role !== "mairie",
    },
    {
      href: "/admin/acces",
      label: "Accès",
      icon: ICONS.access,
      visible: membership.role === "superadmin",
    },
    {
      href: "/admin/utilisateurs",
      label: "Utilisateurs",
      icon: ICONS.users,
      visible: membership.role === "superadmin",
    },
    {
      href: "/admin/journal",
      label: "Journal",
      icon: ICONS.journal,
      visible: membership.role === "superadmin",
    },
  ].filter((item) => item.visible)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace("/connexion")
    router.refresh()
  }

  return (
    <aside className="sticky top-0 flex h-screen w-full max-w-[280px] flex-col overflow-hidden border-r border-[#0337aa]/8 bg-[linear-gradient(180deg,#fcfdff_0%,#f4f8ff_100%)] px-5 py-6 text-[#18212b]">
      <div className="rounded-[30px] border border-[#0337aa]/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(240,246,255,0.98))] p-5 shadow-[0_20px_44px_rgba(3,55,170,0.08)]">
        <p className="text-xs uppercase tracking-[0.28em] text-[#0337aa]/70">
          Espace collectivité
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Image
            src="/admin-logo.svg"
            alt="VivreIci"
            width={72}
            height={72}
            className="h-[4.5rem] w-[4.5rem] object-contain"
            priority
          />
          <div>
            <p className="rounded-full bg-[#eaf0fb] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[#0337aa]">
              {ADMIN_ROLE_LABELS[membership.role]}
            </p>
          </div>
        </div>
        <div className="mt-4 h-px bg-[linear-gradient(90deg,rgba(3,55,170,0.14),rgba(250,196,17,0.24),transparent)]" />
        {membership.organizationName ? (
          <p className="mt-4 text-sm font-medium leading-6 text-[#18212b]">
            {membership.organizationName}
          </p>
        ) : null}
        {membership.territoryLabel ? (
          <p className="mt-1 text-sm text-[#5b6572]">{membership.territoryLabel}</p>
        ) : null}
      </div>

      <nav className="mt-8 space-y-2">
        {items.map((item) => {
          const Icon = item.icon
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-[22px] px-4 py-3.5 text-sm transition-all duration-200 ${
                isActive
                  ? "border border-[#0337aa]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] font-semibold text-[#0337aa] shadow-[0_14px_30px_rgba(3,55,170,0.09)]"
                  : "border border-transparent text-[#5b6572] hover:border-[#0337aa]/8 hover:bg-white/88 hover:text-[#0337aa]"
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full transition ${
                  isActive ? "bg-[#fac411] shadow-[0_0_0_5px_rgba(250,196,17,0.16)]" : "bg-[#d5deef] group-hover:bg-[#0337aa]/28"
                }`}
              />
              <Icon className={`h-4 w-4 transition ${isActive ? "text-[#0337aa]" : "text-[#6d7890] group-hover:text-[#0337aa]"}`} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto">
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex w-full items-center justify-center gap-2 rounded-[20px] border border-[#0337aa]/10 bg-white px-4 py-3 text-sm font-medium text-[#0337aa] transition hover:border-[#0337aa]/16 hover:bg-[#f8fbff]"
        >
          <LogOut className="h-4 w-4" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  )
}
