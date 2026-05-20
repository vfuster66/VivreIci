"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { LEGAL_NAV } from "@/lib/legal-nav"

export function LegalSubnav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Autres pages légales" className="mb-10 flex flex-wrap gap-2 border-border border-b pb-6">
      {LEGAL_NAV.map(({ href, label }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-muted text-foreground ring-1 ring-border"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
