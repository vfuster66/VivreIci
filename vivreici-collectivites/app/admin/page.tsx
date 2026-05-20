import { getAdminMembershipForServer } from "@/lib/admin-access"
import { buildAdminOverviewData } from "@/lib/admin-overview"
import AdminOverviewPage from "@/components/admin/AdminOverviewPage"

export default async function AdminPage() {
  const membership = await getAdminMembershipForServer()
  const initialData = membership ? await buildAdminOverviewData(membership) : null

  return <AdminOverviewPage initialData={initialData} />
}
