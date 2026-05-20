"use client"

import Link from "next/link"

type SignalementsView = "map" | "list"

type SignalementsTabsProps = {
  currentView: SignalementsView
  mapHref?: string
  listHref?: string
}

export default function SignalementsTabs({
  currentView,
  mapHref = "/signalements?view=map",
  listHref = "/signalements?view=list",
}: SignalementsTabsProps) {
  const items = [
    { label: "Carte", href: mapHref, value: "map" as const },
    { label: "Liste", href: listHref, value: "list" as const },
  ]

  return (
    <div className="border-b border-gray-100 bg-white px-4 py-3">
      <div
        className="mx-auto flex max-w-md rounded-full bg-[#F6F6F6] p-1"
        role="tablist"
        aria-label="Affichage des signalements"
      >
        {items.map((item) => {
          const isActive = item.value === currentView

          return (
            <Link
              key={item.value}
              href={item.href}
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              className={`flex-1 rounded-full px-4 py-2.5 text-center text-sm font-semibold transition ${
                isActive
                  ? "bg-[#1A1A1A] text-white shadow-sm"
                  : "text-[#666666]"
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
