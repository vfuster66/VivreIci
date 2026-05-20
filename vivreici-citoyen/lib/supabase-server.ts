import "server-only"

import { createClient } from "@supabase/supabase-js"

function getPublicSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY est manquante."
    )
  }

  return { supabaseUrl, supabaseAnonKey }
}

export function createServerAuthClient() {
  const { supabaseUrl, supabaseAnonKey } = getPublicSupabaseEnv()

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
