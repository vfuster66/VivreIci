import { redirect } from "next/navigation"

import { getAdminMembershipForServer } from "@/lib/admin-access"

/**
 * Console plateforme (superadmin, admin, et rôle mairie si connexion sur ce même origin).
 * Les comptes mairie peuvent préférer l’app dédiée `vivreici-collectivites` (port 3004) — voir docs/APPLICATIONS.md.
 */
export default async function PlateformeAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const membership = await getAdminMembershipForServer()

  if (!membership) {
    redirect("/connexion?next=/admin")
  }

  return children
}
