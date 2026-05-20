import { getAdminMembershipForServer } from "@/lib/admin-access"
import { buildAdminUsersData } from "@/lib/admin-users"
import AdminUsersPage from "@/components/admin/AdminUsersPage"

export default async function AdminUsersRoutePage() {
  const membership = await getAdminMembershipForServer()
  const initialData =
    membership && membership.role === "superadmin"
      ? await buildAdminUsersData(membership)
      : null

  return <AdminUsersPage initialData={initialData} />
}
