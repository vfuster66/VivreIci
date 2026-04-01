"use client"

import AdminSidebar from "@/components/admin/AdminSidebar"
import { ADMIN_ROLE_LABELS, type AdminMembership } from "@/lib/admin-types"

export default function AdminDesktopLayout({
  membership,
  title,
  description,
  children,
}: {
  membership: AdminMembership
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <div className="hidden xl:block">
          <AdminSidebar membership={membership} />
        </div>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="border-b border-black/5 bg-white/80 px-6 py-6 backdrop-blur lg:px-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-[#6B7280]">
                  {ADMIN_ROLE_LABELS[membership.role]}
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#18212B]">
                  {title}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5B6572]">
                  {description}
                </p>
              </div>
              <div className="rounded-[24px] border border-black/6 bg-[#FFF8DF] px-4 py-3 text-sm text-[#7B5B00]">
                {membership.territoryLabel
                  ? `Périmètre courant: ${membership.territoryLabel}`
                  : "Périmètre global de l'application"}
              </div>
            </div>
          </header>

          <main className="flex-1 px-6 py-6 lg:px-10 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  )
}
