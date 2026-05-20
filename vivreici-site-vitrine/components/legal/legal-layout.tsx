import { ArrowLeft } from "lucide-react"
import Link from "next/link"

import { LegalSubnav } from "./legal-subnav"

type LegalLayoutProps = {
  title: string
  children: React.ReactNode
}

export function LegalLayout({ title, children }: LegalLayoutProps) {
  return (
    <div className="bg-background min-h-screen">
      <nav className="border-border fixed top-0 right-0 left-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex min-h-[4.25rem] w-full max-w-[1200px] items-center justify-between gap-3 px-4 py-2 sm:min-h-20 sm:py-2.5 lg:px-8">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-wide.svg" alt="VivreIci" className="h-11 w-auto sm:h-12 md:h-14" />
          </Link>
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Accueil
          </Link>
        </div>
      </nav>

      <main className="pt-28 pb-16 sm:pt-32 sm:pb-24">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <h1 className="font-heading mb-2 text-3xl font-extrabold sm:text-4xl">{title}</h1>
          <LegalSubnav />
          <div className="text-foreground space-y-8 leading-relaxed">{children}</div>

          <div className="border-border mt-12 border-t pt-8">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-border bg-card border-t py-8">
        <div className="text-muted-foreground mx-auto max-w-[1200px] px-4 text-center text-xs lg:px-8">
          © {new Date().getFullYear()} VivreIci. Tous droits réservés.
        </div>
      </footer>
    </div>
  )
}
