"use client"

import { createClient } from "@/lib/supabase"

export async function fetchAdminJson<T>(input: string): Promise<T> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const headers: Record<string, string> = {}

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`
  }

  const response = await fetch(input, {
    headers,
    cache: "no-store",
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === "string"
        ? payload.error
        : "Impossible de charger les données d'administration."
    )
  }

  return payload as T
}
