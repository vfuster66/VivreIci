"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Bell } from "lucide-react"
import { createClient, getCurrentSessionUser } from "@/lib/supabase"

export default function NotificationBell() {
  const supabase = useMemo(() => createClient(), [])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let mounted = true

    async function loadUnreadCount() {
      const user = await getCurrentSessionUser(supabase)

      if (!user) {
        if (mounted) {
          setUnreadCount(0)
        }
        return
      }

      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false)

      if (!error && mounted) {
        setUnreadCount(count ?? 0)
      }
    }

    void loadUnreadCount()

    const channel = supabase
      .channel("notifications-bell")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          void loadUnreadCount()
        }
      )
      .subscribe()

    return () => {
      mounted = false
      void supabase.removeChannel(channel)
    }
  }, [supabase])

  return (
    <Link
      href="/notifications"
      aria-label="Notifications"
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-[#1A1A1A] transition hover:bg-[#F6F6F6]"
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 ? (
        <span className="absolute top-1 right-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#E30613] px-1 text-[10px] font-semibold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </Link>
  )
}
