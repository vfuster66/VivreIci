import "server-only"

import type { AdminMembership, AdminUsersData } from "@/lib/admin-types"
import { listAllAuthUsers } from "@/lib/admin-user-directory"
import { createAdminClient } from "@/lib/supabase-admin"

export async function buildAdminUsersData(
  membership: AdminMembership
): Promise<AdminUsersData> {
  if (membership.role !== "superadmin") {
    throw new Error("Accès superadmin requis.")
  }

  const supabase = createAdminClient()
  const [users, { data: adminRows, error: adminError }] = await Promise.all([
    listAllAuthUsers(),
    supabase
      .from("app_admins")
      .select("user_id, role, organization_name, territory_label"),
  ])

  if (adminError) {
    throw adminError
  }

  const userIds = users.map((user) => user.id)
  const { data: profiles, error: profilesError } = userIds.length
    ? await supabase.from("profiles").select("id, display_name, email").in("id", userIds)
    : { data: [], error: null }

  if (profilesError) {
    throw profilesError
  }

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  const adminMap = new Map((adminRows ?? []).map((row) => [row.user_id, row]))

  const mappedUsers = users.map((user) => {
    const profile = profileMap.get(user.id)
    const adminRow = adminMap.get(user.id)

    return {
      userId: user.id,
      email: user.email ?? profile?.email ?? null,
      displayName:
        profile?.display_name ??
        (typeof user.user_metadata?.display_name === "string"
          ? user.user_metadata.display_name
          : null),
      createdAt: user.created_at ?? null,
      lastSignInAt: user.last_sign_in_at ?? null,
      role:
        adminRow?.role === "superadmin" ||
        adminRow?.role === "admin" ||
        adminRow?.role === "mairie"
          ? adminRow.role
          : null,
      organizationName: adminRow?.organization_name ?? null,
      territoryLabel: adminRow?.territory_label ?? null,
    }
  })

  return {
    membership,
    stats: {
      total: mappedUsers.length,
      withAccess: mappedUsers.filter((user) => user.role != null).length,
      superadmins: mappedUsers.filter((user) => user.role === "superadmin").length,
      admins: mappedUsers.filter((user) => user.role === "admin").length,
      mairies: mappedUsers.filter((user) => user.role === "mairie").length,
    },
    users: mappedUsers,
  }
}
