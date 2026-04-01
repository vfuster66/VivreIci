"use client"

type NotificationRecord = {
  id: string
  title: string
  message: string
  link: string | null
  is_read: boolean
  created_at: string
}

const NOTIFICATIONS_CACHE_KEY = "vivreici-notifications-cache-v1"

export function loadCachedNotifications() {
  if (typeof window === "undefined") {
    return [] as NotificationRecord[]
  }

  try {
    const rawValue = window.localStorage.getItem(NOTIFICATIONS_CACHE_KEY)

    if (!rawValue) {
      return [] as NotificationRecord[]
    }

    return JSON.parse(rawValue) as NotificationRecord[]
  } catch {
    return [] as NotificationRecord[]
  }
}

export function saveCachedNotifications(notifications: NotificationRecord[]) {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(
      NOTIFICATIONS_CACHE_KEY,
      JSON.stringify(notifications)
    )
  } catch {
    // Le cache local ne doit jamais casser la page notifications.
  }
}
