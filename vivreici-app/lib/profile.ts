import type { User } from "@supabase/supabase-js"

export type UserProfile = {
  id: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  avatar_url: string | null
  email: string | null
  preferred_city: string | null
  neighborhood: string | null
  marketing_consent: boolean
  in_app_notifications: boolean
  nearby_report_notifications: boolean
  report_updates_notifications: boolean
  nearby_notifications_radius_meters: number
  notification_lat: number | null
  notification_lng: number | null
  email_notifications: boolean
  push_notifications: boolean
  contact_follow_up_consent: boolean
  contact_follow_up_actor: "none" | "mairie" | "vivreici"
  privacy_policy_accepted_at: string | null
  created_at: string | null
  updated_at: string | null
}

export function buildDisplayName(
  profile: Partial<UserProfile> | null,
  fallbackEmail?: string | null
) {
  const explicitName = profile?.display_name?.trim()

  if (explicitName) {
    return explicitName
  }

  const composedName = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim()

  if (composedName) {
    return composedName
  }

  return fallbackEmail ?? "Mon profil"
}

export function getProfileInitials(
  profile: Partial<UserProfile> | null,
  fallbackEmail?: string | null
) {
  const source = buildDisplayName(profile, fallbackEmail)

  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("") || "VI"
}

export function isAnonymousUser(user: Pick<User, "app_metadata"> | null) {
  if (!user) {
    return false
  }

  const provider = user.app_metadata?.provider
  const providers = user.app_metadata?.providers

  return (
    provider === "anonymous" ||
    (Array.isArray(providers) && providers.includes("anonymous"))
  )
}

export function formatConsentDate(dateString: string | null) {
  if (!dateString) {
    return "Non renseigné"
  }

  const date = new Date(dateString)

  if (Number.isNaN(date.getTime())) {
    return "Non renseigné"
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}
