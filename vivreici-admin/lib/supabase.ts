import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient, User } from "@supabase/supabase-js"
import type { AdminMembership, AdminRole } from "@/lib/admin-types"

/**
 * Crée un client Supabase pour le navigateur (Client Components).
 * Ce client est utilisé pour les interactions côté client, comme les formulaires interactifs.
 */
export function createClient() {
  // Note: Ces variables d'environnement DOIVENT être préfixées par NEXT_PUBLIC_
  // pour être accessibles dans le navigateur.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase URL or Anon Key is missing. Check your .env.local file."
    )
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

export async function getCurrentSessionUser(supabase: SupabaseClient) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) {
    throw error
  }

  return session?.user ?? null
}

export async function ensureSignedInUser(supabase: SupabaseClient) {
  const existingUser = await getCurrentSessionUser(supabase)

  if (existingUser) {
    return existingUser
  }

  const { data, error } = await supabase.auth.signInAnonymously()

  if (error || !data.user) {
    throw new Error(
      "Impossible d'initialiser votre session. Vérifiez que l'authentification anonyme est activée dans Supabase."
    )
  }

  return data.user
}

export async function isSuperadmin(
  supabase: SupabaseClient,
  user: Pick<User, "id"> | null
) {
  const membership = await getAdminMembership(supabase, user)
  return membership?.role === "superadmin"
}

export async function getAdminMembership(
  supabase: SupabaseClient,
  user: Pick<User, "id"> | null
): Promise<AdminMembership | null> {
  if (!user) {
    return null
  }

  const { data, error } = await supabase
    .from("app_admins")
    .select("user_id, role, organization_name, territory_label")
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  const role = data.role as AdminRole | null

  if (role !== "superadmin" && role !== "admin" && role !== "mairie") {
    return null
  }

  return {
    userId: data.user_id,
    role,
    organizationName: data.organization_name ?? null,
    territoryLabel: data.territory_label ?? null,
  }
}
