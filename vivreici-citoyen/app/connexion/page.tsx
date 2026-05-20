"use client"

import Link from "next/link"
import { Suspense, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import AppTopbar from "@/components/AppTopbar"
import { MarketingLegalLink } from "@/components/marketing-legal-link"
import { createClient } from "@/lib/supabase"

function ConnexionPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const nextPath = searchParams.get("next") || "/signalements?view=map"
  const backHref = nextPath.startsWith("/") ? nextPath : "/"

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        throw error
      }

      router.push(nextPath)
      router.refresh()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message === "Email not confirmed"
            ? "Votre email n'est pas encore confirmé. Ouvrez le message reçu puis revenez vous connecter."
            : "Connexion impossible pour le moment. Vérifiez vos identifiants et réessayez."
          : "Connexion impossible pour le moment. Réessayez dans un instant."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <AppTopbar title="Connexion" backHref={backHref} />

      <div className="mx-auto max-w-md px-4 pt-4">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="login-email" className="text-sm font-semibold text-[#1A1A1A]">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="vous@exemple.fr"
              autoComplete="email"
              className="w-full rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm outline-none ring-1 ring-gray-200"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="login-password" className="text-sm font-semibold text-[#1A1A1A]">
              Mot de passe
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Votre mot de passe"
              autoComplete="current-password"
              className="w-full rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm outline-none ring-1 ring-gray-200"
              required
            />
          </div>

          <div className="flex justify-end">
            <Link
              href="/mot-de-passe-oublie"
              className="text-sm font-semibold text-[#D6A100]"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          {errorMessage ? (
            <p className="text-sm text-[#7A1C22]" role="alert" aria-live="polite">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#fac411] px-5 text-sm font-semibold text-[#1A1A1A] disabled:opacity-60"
          >
            {isSubmitting ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <div className="border-t border-gray-100 pt-5 mt-6 text-sm text-[#666666]">
          <p>
            Pas encore de compte ?{" "}
            <Link
              href={`/inscription?next=${encodeURIComponent(nextPath)}`}
              className="font-semibold text-[#D6A100]"
            >
              Créer un compte
            </Link>
          </p>
        </div>

        <nav
          aria-label="Informations légales"
          className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-2 border-t border-gray-100 pt-5 text-center text-xs text-[#666666]"
        >
          <MarketingLegalLink page="privacy" className="font-medium text-[#D6A100] underline">
            Confidentialité
          </MarketingLegalLink>
          <MarketingLegalLink page="terms" className="font-medium text-[#D6A100] underline">
            CGU
          </MarketingLegalLink>
          <MarketingLegalLink page="cookies" className="font-medium text-[#D6A100] underline">
            Cookies
          </MarketingLegalLink>
          <MarketingLegalLink page="legal" className="font-medium text-[#D6A100] underline">
            Mentions légales
          </MarketingLegalLink>
        </nav>
      </div>
    </div>
  )
}

export default function ConnexionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <ConnexionPageContent />
    </Suspense>
  )
}
