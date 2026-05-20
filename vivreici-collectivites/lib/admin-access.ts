import "server-only"

import { createAdminClient } from "@/lib/supabase-admin"
import {
  createServerAuthClient,
  createServerSessionClient,
} from "@/lib/supabase-server"
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

async function getAdminMembershipByUserId(userId: string) {
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
  } satisfies AdminMembership
}

export async function getAdminMembershipForRequest(
  request: Request
): Promise<AdminMembership | null> {
  const userId = await getAuthenticatedUserId(request)

  if (!userId) {
    return null
  }

  return getAdminMembershipByUserId(userId)
}

export async function getAdminMembershipForServer() {
  const supabase = await createServerSessionClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return getAdminMembershipByUserId(user.id)
}

export function canAccessModeration(role: AdminRole) {
  return role === "superadmin" || role === "admin"
}

export function canManageAnimalContent(role: AdminRole) {
  return role === "superadmin"
}

export function canAccessAnalytics(role: AdminRole) {
  return role === "superadmin"
}

export function canAccessUserInsights(role: AdminRole) {
  return role === "superadmin"
}
