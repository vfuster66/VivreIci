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
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  )
}
