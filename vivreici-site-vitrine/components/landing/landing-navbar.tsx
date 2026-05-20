"use client"

import { Menu, X } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

const NAV_LINKS = [
  { label: "Pourquoi VivreIci", href: "#pourquoi" },
  { label: "Comment ça marche", href: "#comment" },
  { label: "Installer", href: "#installer" },
] as const

export function LandingNavbar() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 border-border border-b bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex min-h-[4.25rem] w-full max-w-[1200px] items-center justify-between gap-3 px-4 py-2 sm:min-h-20 sm:py-2.5 lg:px-8">
        <Link href="/" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG logo depuis /public */}
          <img src="/brand/logo-wide.svg" alt="VivreIci" className="h-11 w-auto sm:h-12 md:h-14" />
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-muted-foreground text-sm font-medium transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#installer"
            className="bg-primary text-primary-foreground hover:bg-primary-hover inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors"
          >
            Installer l&apos;app
          </a>
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="text-foreground p-2 md:hidden"
          aria-expanded={open}
          aria-label="Menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open ? (
        <div className="border-border bg-card space-y-3 border-t px-4 pb-4 md:hidden">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground block py-2 text-base font-medium"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#installer"
            onClick={() => setOpen(false)}
            className="bg-primary text-primary-foreground hover:bg-primary-hover block rounded-full px-5 py-3 text-center text-sm font-semibold transition-colors"
          >
            Installer l&apos;app
          </a>
        </div>
      ) : null}
    </nav>
  )
}
