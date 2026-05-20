import type { Metadata } from "next"
import { Inter, Plus_Jakarta_Sans } from "next/font/google"

import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
})

export const metadata: Metadata = {
  title: "VivreIci — Signalez les problèmes près de chez vous",
  description:
    "Signalez les problèmes du quotidien dans votre quartier : voirie, propreté, éclairage. Alertes météo, animaux perdus, entraide entre voisins. Gratuit, sans téléchargement depuis l'App Store ou Google Play.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.className} ${plusJakarta.variable} min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  )
}
