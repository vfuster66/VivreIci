"use client"

import Image from "next/image"
import AdminSidebar from "@/components/admin/AdminSidebar"
import { ADMIN_ROLE_LABELS, type AdminMembership } from "@/lib/admin-types"

export default function AdminDesktopLayout({
  membership,
  title,
  description,
  toolbar,
  children,
}: {
  membership: AdminMembership
  title: string
  description: string
  toolbar?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(250,196,17,0.15),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(3,55,170,0.08),_transparent_22%),linear-gradient(180deg,#f8fbff_0%,#edf4ff_100%)]">
      <div className="mx-auto flex h-screen max-w-[1600px]">
        <div className="hidden h-screen xl:block">
          <AdminSidebar membership={membership} />
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <header className="border-b border-[#0337aa]/8 bg-white/78 px-6 py-6 backdrop-blur-xl lg:px-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[22px] bg-white/92 shadow-[0_14px_30px_rgba(3,55,170,0.08)] xl:hidden">
                  <Image
                    src="/admin-logo.svg"
                    alt="VivreIci"
                    width={40}
                    height={40}
                    className="h-10 w-10 object-contain"
                  />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-[#0337aa]/80">
                    {ADMIN_ROLE_LABELS[membership.role]}
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[#0337aa]">
                    {title}
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5B6572]">
                    {description}
                  </p>
                </div>
              </div>
              <div className="rounded-[24px] border border-[#fac411]/30 bg-[linear-gradient(180deg,#fff9e4_0%,#fff4c9_100%)] px-4 py-3 text-sm text-[#7b5b00] shadow-[0_10px_24px_rgba(250,196,17,0.14)]">
                {membership.territoryLabel
                  ? `Périmètre courant: ${membership.territoryLabel}`
                  : "Périmètre global de l'application"}
              </div>
            </div>
          </header>

          {toolbar ? (
            <div className="border-b border-[#0337aa]/8 bg-white/72 px-6 py-4 backdrop-blur-xl lg:px-10">
              {toolbar}
            </div>
          ) : null}

          <main className="flex-1 px-6 py-6 lg:px-10 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  )
}
