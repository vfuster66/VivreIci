"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MapPin, TriangleAlert, Handshake, PawPrint, User } from "lucide-react"

const navItems = [
  { name: "Signalements", href: "/signalements", icon: MapPin },
  { name: "Alertes", href: "/alertes", icon: TriangleAlert },
  { name: "Entraide", href: "/entraide", icon: Handshake },
  { name: "Animaux", href: "/animaux", icon: PawPrint },
  { name: "Profil", href: "/profil", icon: User },
]

export function shouldHideBottomNav(pathname: string) {
  if (pathname === "/") {
    return true
  }

  if (
    pathname === "/connexion" ||
    pathname === "/inscription" ||
    pathname === "/mot-de-passe-oublie" ||
    pathname === "/reinitialisation-mot-de-passe" ||
    pathname === "/confidentialite" ||
    pathname.startsWith("/notifications") ||
    pathname === "/signalements/nouveau"
  ) {
    return true
  }

  if (pathname.startsWith("/signalements/") && pathname !== "/signalements/nouveau") {
    return true
  }

  return false
}

export default function BottomNav() {
  const pathname = usePathname()
  const isHidden = shouldHideBottomNav(pathname)

  if (isHidden) {
    return null
  }

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 border-t border-gray-200 bg-white px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_rgba(0,0,0,0.05)]"
    >
      <div className="flex min-h-16 items-center justify-around px-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`) ||
            (item.href === "/signalements" && pathname === "/carte")

          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-16 w-full flex-col items-center justify-center space-y-1 rounded-2xl ${
                isActive
                  ? "text-[#7A4B00]"
                  : "text-[#666666] hover:text-[#1A1A1A]"
              }`}
            >
              <span className="relative">
                {isActive ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full bg-[#FAC411]/20"
                  />
                ) : null}
                <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
              </span>
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
