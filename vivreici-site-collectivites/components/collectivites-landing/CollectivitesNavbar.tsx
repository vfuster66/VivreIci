"use client"

import { Menu, X } from "lucide-react"
import { useState } from "react"

import { mailtoDemoCollectivites } from "@/lib/collectivites-links"

const links = [
  { label: "Solution", href: "#solution" },
  { label: "Fonctionnement", href: "#fonctionnement" },
  { label: "Tarifs", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const

export function CollectivitesNavbar() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed top-0 right-0 left-0 z-50 border-b backdrop-blur">
      <div className="container-landing flex h-16 items-center justify-between px-4 md:px-8">
        <a href="#" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/collectivites/6.svg" alt="VivreIci" className="h-9 w-auto" />
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              {l.label}
            </a>
          ))}
          <a
            href={mailtoDemoCollectivites()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors"
          >
            Demander une démo
          </a>
        </div>

        <button
          type="button"
          className="text-foreground p-2 md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
          aria-expanded={open}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open ? (
        <div className="border-border bg-background border-t px-4 pb-4 md:hidden">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-muted-foreground hover:text-foreground block py-3 text-sm font-medium"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <a
            href={mailtoDemoCollectivites()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-2 flex h-9 w-full items-center justify-center rounded-md text-sm font-medium"
            onClick={() => setOpen(false)}
          >
            Demander une démo
          </a>
        </div>
      ) : null}
    </nav>
  )
}
