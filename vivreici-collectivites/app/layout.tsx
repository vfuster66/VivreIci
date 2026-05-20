import type { Metadata, Viewport } from "next"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

export const metadata: Metadata = {
  title: "VivreIci — Espace collectivité",
  description:
    "Tableau de bord pour les comptes mairie : synthèse et signalements du territoire (aligné sur l’offre site collectivités).",
  robots: {
    index: false,
    follow: false,
  },
}

export const viewport: Viewport = {
  themeColor: "#0337aa",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="bg-[#eef4ff] text-[#1A1A1A]">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
