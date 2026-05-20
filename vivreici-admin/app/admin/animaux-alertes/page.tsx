import AdminAnimalAlertsPage from "@/components/admin/AdminAnimalAlertsPage"
import { getAdminMembershipForServer } from "@/lib/admin-access"
import { buildAdminAnimalAlertsData } from "@/lib/admin-animal-alerts"

export default async function AdminAnimalAlertsRoute() {
  const membership = await getAdminMembershipForServer()
  const initialData =
    membership && (membership.role === "superadmin" || membership.role === "admin")
      ? await buildAdminAnimalAlertsData(membership)
      : null

  return <AdminAnimalAlertsPage initialData={initialData} />
}
