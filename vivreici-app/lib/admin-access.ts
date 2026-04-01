import "server-only"

import { createAdminClient } from "@/lib/supabase-admin"
import { createServerAuthClient } from "@/lib/supabase-server"
import type { AdminMembership, AdminRole } from "@/lib/admin-types"

function isAdminRole(value: string | null | undefined): value is AdminRole {
  return value === "superadmin" || value === "admin" || value === "mairie"
}

async function getAuthenticatedUserId(request: Request) {
  const authorization = request.headers.get("authorization")

  if (!authorization?.startsWith("Bearer ")) {
    return null
  }

  const accessToken = authorization.slice("Bearer ".length).trim()

  if (!accessToken) {
    return null
  }

  const supabase = createServerAuthClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken)

  if (error || !user) {
    return null
  }

  return user.id
}

export async function getAdminMembershipForRequest(
  request: Request
): Promise<AdminMembership | null> {
  const userId = await getAuthenticatedUserId(request)

  if (!userId) {
    return null
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("app_admins")
    .select("user_id, role, organization_name, territory_label")
    .eq("user_id", userId)
    .maybeSingle()

  if (error || !data || !isAdminRole(data.role)) {
    return null
  }

  return {
    userId: data.user_id,
    role: data.role,
    organizationName: data.organization_name ?? null,
    territoryLabel: data.territory_label ?? null,
  }
}

export function canAccessModeration(role: AdminRole) {
  return role === "superadmin" || role === "admin"
}

export function canAccessAnalytics(role: AdminRole) {
  return role === "superadmin"
}

export function canAccessUserInsights(role: AdminRole) {
  return role === "superadmin"
}
