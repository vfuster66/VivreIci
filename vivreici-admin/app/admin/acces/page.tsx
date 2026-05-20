import { getAdminMembershipForServer } from "@/lib/admin-access"
import { buildAdminMembersData } from "@/lib/admin-members"
import AdminAccessPage from "@/components/admin/AdminAccessPage"

export default async function AdminAccessRoutePage() {
  const membership = await getAdminMembershipForServer()
  const initialData =
    membership && membership.role === "superadmin"
      ? await buildAdminMembersData(membership)
      : null

  return <AdminAccessPage initialData={initialData} />
}
