import { redirect } from "next/navigation"

import { getAdminMembershipForServer } from "@/lib/admin-access"

function platformAdminBaseUrl() {
  return (process.env.NEXT_PUBLIC_PLATFORM_ADMIN_URL ?? "http://localhost:3001").replace(/\/+$/, "")
}

/**
 * Espace réservé aux comptes « mairie ». Admins plateforme → console sur vivreici-admin.
 */
export default async function CollectivitesAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const membership = await getAdminMembershipForServer()

  if (!membership) {
    redirect("/connexion?next=/admin")
  }

  if (membership.role !== "mairie") {
    redirect(`${platformAdminBaseUrl()}/admin`)
  }

  return children
}
