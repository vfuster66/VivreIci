import AdminAnimalPostsPage from "@/components/admin/AdminAnimalPostsPage"
import { getAdminMembershipForServer } from "@/lib/admin-access"
import { buildAdminAnimalPostsData } from "@/lib/admin-animal-posts"

export default async function AdminAnimalPostsRoute() {
  const membership = await getAdminMembershipForServer()
  const initialData =
    membership && (membership.role === "superadmin" || membership.role === "admin")
      ? await buildAdminAnimalPostsData(membership)
      : null

  return <AdminAnimalPostsPage initialData={initialData} />
}
