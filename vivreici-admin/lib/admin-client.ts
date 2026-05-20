"use client"

import { createClient } from "@/lib/supabase"

export async function fetchAdminJson<T>(
  input: string,
  init?: RequestInit
): Promise<T> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const headers: Record<string, string> = {}

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`
  }

  const response = await fetch(input, {
    ...init,
    headers: {
      ...(init?.headers && typeof init.headers === "object" ? init.headers : {}),
      ...headers,
      "Content-Type": "application/json",
    },
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
