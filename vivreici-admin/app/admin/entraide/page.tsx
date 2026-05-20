import AdminHelpPostsPage from "@/components/admin/AdminHelpPostsPage"
import { getAdminMembershipForServer } from "@/lib/admin-access"
import { buildAdminHelpPostsData } from "@/lib/admin-help-posts"

export default async function AdminHelpPostsRoute() {
  const membership = await getAdminMembershipForServer()
  const initialData =
    membership && (membership.role === "superadmin" || membership.role === "admin")
      ? await buildAdminHelpPostsData(membership)
      : null

  return <AdminHelpPostsPage initialData={initialData} />
}
