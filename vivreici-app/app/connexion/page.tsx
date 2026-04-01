"use client"

import Link from "next/link"
import { Suspense, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import AppTopbar from "@/components/AppTopbar"
import { createClient } from "@/lib/supabase"

function ConnexionPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const nextPath = searchParams.get("next") || "/carte"

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
      <AppTopbar title="Connexion" backHref="/profil" />

      <div className="mx-auto max-w-md px-4 pt-4">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#1A1A1A]">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="vous@exemple.fr"
              className="w-full rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm outline-none ring-1 ring-gray-200"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#1A1A1A]">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Votre mot de passe"
              className="w-full rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm outline-none ring-1 ring-gray-200"
              required
            />
          </div>

          {errorMessage ? (
            <p className="text-sm text-[#7A1C22]">{errorMessage}</p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#fac411] px-5 text-sm font-semibold text-white disabled:opacity-60"
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
