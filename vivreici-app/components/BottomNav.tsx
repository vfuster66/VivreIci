"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { Map, MapPin, Bell, Handshake, User } from "lucide-react"
import { createClient, getCurrentSessionUser } from "@/lib/supabase"

const navItems = [
  { name: "Carte", href: "/carte", icon: Map },
  { name: "Signalements", href: "/signalements", icon: MapPin },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Entraide", href: "/entraide", icon: Handshake },
  { name: "Profil", href: "/profil", icon: User },
]

export default function BottomNav() {
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])
  const [unreadCount, setUnreadCount] = useState(0)
  const isHidden = pathname === "/"

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

    function handleNotificationsSync() {
      void loadUnreadCount()
    }

    function handleWindowFocus() {
      void loadUnreadCount()
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void loadUnreadCount()
      }
    }

    const channel = supabase
      .channel("notifications-bottom-nav")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          void loadUnreadCount()
        }
      )
      .subscribe()

    const interval = window.setInterval(() => {
      void loadUnreadCount()
    }, 15000)

    window.addEventListener("notifications:sync", handleNotificationsSync)
    window.addEventListener("focus", handleWindowFocus)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      mounted = false
      window.clearInterval(interval)
      window.removeEventListener("notifications:sync", handleNotificationsSync)
      window.removeEventListener("focus", handleWindowFocus)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      void supabase.removeChannel(channel)
    }
  }, [supabase, pathname])

  if (isHidden) {
    return null
  }

  return (
    <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 border-t border-gray-200 bg-white shadow-[0_-6px_20px_rgba(0,0,0,0.05)]">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`)
          const isNotificationsItem = item.href === "/notifications"

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex h-full w-full flex-col items-center justify-center space-y-1 ${
                isActive
                  ? "text-[#fac411]"
                  : "text-[#666666] hover:text-[#1A1A1A]"
              }`}
            >
              <span className="relative">
                <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
                {isNotificationsItem && unreadCount > 0 ? (
                  <span className="absolute -top-1 -right-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#E30613] px-1 text-[10px] font-semibold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </span>
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
