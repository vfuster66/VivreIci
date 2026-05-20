"use client"

import { ChevronDown } from "lucide-react"
import type { ReactNode } from "react"
import { useState } from "react"

import { VivreIciMark } from "./VivreIciMark"

const faqs: { q: string; a: ReactNode }[] = [
  {
    q: "Peut-on tester gratuitement ?",
    a: "Oui, l'offre Observation est gratuite et vous permet de découvrir la solution sans engagement.",
  },
  {
    q: "Est-ce adapté aux petites communes ?",
    a: (
      <>
        Absolument. <VivreIciMark className="font-semibold" /> est conçu pour s&apos;adapter à toutes les tailles de
        collectivité, de 500 à 100 000 habitants.
      </>
    ),
  },
  {
    q: "Les données sont-elles sécurisées ?",
    a: "Oui. Toutes les données sont hébergées en France et conformes au RGPD. Seuls les agents autorisés ont accès aux informations.",
  },
  {
    q: "Comment sont envoyés les signalements ?",
    a: "Les habitants utilisent une application mobile simple. Chaque signalement est géolocalisé, horodaté et catégorisé automatiquement.",
  },
]

export function CollectivitesFaq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="section-padding">
      <div className="container-landing max-w-2xl">
        <h2 className="mb-12 text-center text-2xl font-bold md:text-3xl">Questions fréquentes</h2>
        <div className="w-full divide-y divide-border rounded-xl border border-border bg-card">
          {faqs.map((f, i) => {
            const isOpen = open === i
            return (
              <div key={f.q} className="px-4">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 py-4 text-left text-sm font-medium"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                >
                  {f.q}
                  <ChevronDown
                    className={`text-muted-foreground h-5 w-5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                </button>
                {isOpen ? (
                  <p className="text-muted-foreground border-border border-t pb-4 text-sm leading-relaxed">{f.a}</p>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
