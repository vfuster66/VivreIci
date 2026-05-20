import Link from "next/link"

export default function NotFound() {
  return (
    <div className="bg-muted flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h1 className="font-heading mb-4 text-4xl font-bold">404</h1>
        <p className="text-muted-foreground mb-6 text-xl">Cette page n&apos;existe pas.</p>
        <Link href="/" className="text-primary font-medium underline hover:opacity-90">
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  )
}
