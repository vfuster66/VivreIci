"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Trash2 } from "lucide-react"
import AppTopbar from "@/components/AppTopbar"
import { trackEvent } from "@/lib/analytics-client"
import { loadCachedNotifications, saveCachedNotifications } from "@/lib/notifications-cache"
import { isOfflineLikeError } from "@/lib/reports-cache"
import { createClient, getCurrentSessionUser } from "@/lib/supabase"
import { formatReportDate } from "@/lib/reports"

type NotificationRecord = {
  id: string
  title: string
  message: string
  link: string | null
  is_read: boolean
  created_at: string
}

export default function NotificationsPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [userId, setUserId] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all")
  const [loadNotice, setLoadNotice] = useState<string | null>(null)

  useEffect(() => {
    void trackEvent("notifications_opened")
  }, [])

  function syncNotificationsUi() {
    window.dispatchEvent(new Event("notifications:sync"))
  }

  useEffect(() => {
    const cachedNotifications = loadCachedNotifications()

    if (cachedNotifications.length > 0) {
      setNotifications(cachedNotifications)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function fetchNotifications() {
      try {
        const user = await getCurrentSessionUser(supabase)

        if (!user) {
          if (mounted) {
            setUserId(null)
            setNotifications([])
            setIsLoading(false)
          }
          return
        }

        const { data, error } = await supabase
          .from("notifications")
          .select("id, title, message, link, is_read, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (error) {
          throw error
        }

        if (mounted) {
          setUserId(user.id)
          setNotifications(data ?? [])
          saveCachedNotifications(data ?? [])
          setLoadNotice(null)
        }
      } catch (error) {
        if (mounted && isOfflineLikeError(error)) {
          const cachedNotifications = loadCachedNotifications()
          setNotifications(cachedNotifications)
          setLoadNotice(
            cachedNotifications.length > 0
              ? "Mode hors ligne. Affichage du dernier état disponible."
              : "Mode hors ligne. Aucune notification en cache."
          )
        }
      }

      if (mounted) {
        setIsLoading(false)
      }
    }

    void fetchNotifications()

    const channel = supabase
      .channel("notifications-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          void fetchNotifications()
        }
      )
      .subscribe()

    return () => {
      mounted = false
      void supabase.removeChannel(channel)
    }
  }, [supabase])

  async function handleOpenNotification(notification: NotificationRecord) {
    if (!userId) {
      return
    }

    if (!notification.is_read) {
      await supabase
        .from("notifications")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("id", notification.id)
        .eq("user_id", userId)

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item
        )
      )
      saveCachedNotifications(
        notifications.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item
        )
      )

      syncNotificationsUi()
    }

    if (notification.link) {
      void trackEvent("notification_clicked", {
        metadata: {
          notificationId: notification.id,
          link: notification.link,
        },
      })
      router.push(notification.link)
      router.refresh()
    }
  }

  async function handleMarkAllAsRead() {
    if (!userId) {
      return
    }

    setIsMarkingAll(true)

    await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("is_read", false)

    const nextNotifications = notifications.map((notification) => ({
      ...notification,
      is_read: true,
    }))
    setNotifications(nextNotifications)
    saveCachedNotifications(nextNotifications)

    syncNotificationsUi()
    setIsMarkingAll(false)
  }

  async function handleDeleteNotification(notification: NotificationRecord) {
    if (!userId || deletingId) {
      return
    }

    setDeletingId(notification.id)

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notification.id)
      .eq("user_id", userId)

    if (!error) {
      const nextNotifications = notifications.filter(
        (item) => item.id !== notification.id
      )
      setNotifications(nextNotifications)
      saveCachedNotifications(nextNotifications)

      syncNotificationsUi()
    }

    setDeletingId(null)
  }

  const unreadCount = notifications.filter((notification) => !notification.is_read).length
  const filteredNotifications = notifications.filter((notification) => {
    const matchesFilter =
      filter === "all"
        ? true
        : filter === "unread"
          ? !notification.is_read
          : notification.is_read

    const haystack = `${notification.title} ${notification.message}`.toLowerCase()
    const matchesQuery =
      query.trim().length === 0 || haystack.includes(query.trim().toLowerCase())

    return matchesFilter && matchesQuery
  })

  return (
    <div className="min-h-screen bg-white pb-24">
      <AppTopbar
        title="Notifications"
        filterPanel={
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "all", label: "Toutes" },
                { value: "unread", label: "Non lues" },
                { value: "read", label: "Lues" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value as "all" | "unread" | "read")}
                  className={`min-h-11 rounded-2xl px-3 text-xs font-semibold ${
                    filter === option.value
                      ? "bg-[#1A1A1A] text-white"
                      : "bg-[#F8F8F8] text-[#1A1A1A]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void handleMarkAllAsRead()}
                disabled={isMarkingAll}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-[#fac411] px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isMarkingAll ? "Lecture..." : "Tout marquer comme lu"}
              </button>
            ) : null}
          </div>
        }
        searchPanel={
          <div className="flex items-center gap-3 rounded-2xl bg-[#F8F8F8] px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher une notification"
              className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>
        }
      />

      <div className="mx-auto max-w-md px-4 pt-4">
        <div className="mb-4 flex items-center justify-between text-sm">
          <p className="font-medium text-[#1A1A1A]">
            {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
          </p>
          <p className="text-[#666666]">{filteredNotifications.length} notification(s)</p>
        </div>

        {isLoading ? (
          <p className="py-6 text-sm text-[#666666]">Chargement des notifications...</p>
        ) : null}

        {!isLoading && loadNotice ? (
          <div className="mb-3 rounded-[24px] border border-[#F1E4A6] bg-[#FFFDF2] px-4 py-3.5 text-sm leading-6 text-[#5F5A45]">
            {loadNotice}
          </div>
        ) : null}

        {!isLoading && filteredNotifications.length === 0 ? (
          <div className="rounded-[24px] bg-[#FBFBFB] px-4 py-5 text-sm leading-6 text-[#666666] ring-1 ring-gray-100">
            Aucune notification pour ces filtres.
          </div>
        ) : null}

        {!isLoading && filteredNotifications.length > 0 ? (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`w-full rounded-[24px] border px-4 py-4 text-left ${
                  notification.is_read
                    ? "border-gray-100 bg-white"
                    : "border-[#FDE68A] bg-[#FFFBEA]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => void handleOpenNotification(notification)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1A1A1A]">
                          {notification.title}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[#666666]">
                          {notification.message}
                        </p>
                      </div>
                      {!notification.is_read ? (
                        <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[#E30613]" />
                      ) : null}
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                      <span>{formatReportDate(notification.created_at)}</span>
                      {notification.link ? <span>Ouvrir</span> : null}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleDeleteNotification(notification)}
                    disabled={deletingId === notification.id}
                    aria-label="Supprimer la notification"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/70 text-[#666666] transition hover:bg-white disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
