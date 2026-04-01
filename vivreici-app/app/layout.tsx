import type { Metadata } from "next"

import "./globals.css"
import AppShell from "@/components/AppShell"
import { ThemeProvider } from "@/components/theme-provider"

export const metadata: Metadata = {
  title: "VivreIci",
  description: "L'application hyper-locale pour signaler, alerter et s'entraider partout en France",
  manifest: "/manifest.json", // Préparation pour la PWA
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="bg-[#F5F5F5] text-[#1A1A1A]">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  )
}
