import AdminJournalPage from "@/components/admin/AdminJournalPage"
import { getAdminMembershipForServer } from "@/lib/admin-access"
import { buildAdminJournalData } from "@/lib/admin-journal"

export default async function AdminJournalRoutePage() {
  const membership = await getAdminMembershipForServer()
  const initialData =
    membership && membership.role === "superadmin"
      ? await buildAdminJournalData(membership)
      : null

  return <AdminJournalPage initialData={initialData} />
}
