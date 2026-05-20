import { getAdminMembershipForServer } from "@/lib/admin-access"
import { buildAdminReportsData } from "@/lib/admin-reports"
import AdminReportsPage from "@/components/admin/AdminReportsPage"

export default async function AdminMunicipalitiesPage() {
  const membership = await getAdminMembershipForServer()
  const initialData = membership ? await buildAdminReportsData(membership) : null

  return <AdminReportsPage mode="mairie" initialData={initialData} />
}
