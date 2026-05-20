"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import AppTopbar from "@/components/AppTopbar"
import { createClient } from "@/lib/supabase"

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => createClient(), [])
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage(null)
    setErrorMessage(null)

    try {
      const redirectTo = `${window.location.origin}/reinitialisation-mot-de-passe`
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      })

      if (error) {
        throw error
      }

      setMessage("Email de réinitialisation envoyé si le compte existe.")
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'envoyer l'email de réinitialisation."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <AppTopbar title="Mot de passe oublié" backHref="/connexion" />

      <div className="mx-auto max-w-md px-4 pt-4">
        <p className="text-sm leading-6 text-[#666666]">
          Saisis ton email. Un lien de réinitialisation te sera envoyé.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <label htmlFor="forgot-email" className="text-sm font-semibold text-[#1A1A1A]">
              Email
            </label>
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm outline-none ring-1 ring-gray-200"
              required
            />
          </div>

          {message ? <p className="text-sm text-[#027A48]">{message}</p> : null}
          {errorMessage ? <p className="text-sm text-[#7A1C22]">{errorMessage}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#fac411] px-5 text-sm font-semibold text-[#1A1A1A] disabled:opacity-60"
          >
            {isSubmitting ? "Envoi..." : "Envoyer le lien"}
          </button>
        </form>

        <div className="mt-6 text-sm text-[#666666]">
          <Link href="/connexion" className="font-semibold text-[#D6A100]">
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  )
}
