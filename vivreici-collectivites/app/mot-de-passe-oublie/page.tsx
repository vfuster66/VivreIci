"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { createClient } from "@/lib/supabase"

export default function AdminForgotPasswordPage() {
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(250,196,17,0.2),_transparent_28%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] px-6 py-10">
      <div className="mx-auto max-w-xl rounded-[36px] border border-[#0337aa]/8 bg-white p-8 shadow-[0_28px_80px_rgba(3,55,170,0.08)]">
        <p className="text-xs uppercase tracking-[0.32em] text-[#0337aa]">
          Mot de passe oublié
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#0337aa]">
          Réinitialiser l&apos;accès admin
        </h1>
        <p className="mt-4 text-sm leading-7 text-[#5b6572]">
          Saisis ton email admin. Un lien de réinitialisation te sera envoyé.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-[#18212B]">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#0337aa]/12 bg-[#F8FBFF] px-4 py-3 text-sm outline-none focus:border-[#0337aa]"
              required
            />
          </label>

          <div aria-live="polite" aria-atomic="true" className="space-y-2">
            {message ? (
              <p className="text-sm text-[#027A48]" role="status">
                {message}
              </p>
            ) : null}
            {errorMessage ? (
              <p className="text-sm text-[#7A1C22]" role="status">
                {errorMessage}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#fac411] px-5 text-sm font-semibold text-[#0337aa] disabled:opacity-60"
          >
            {isSubmitting ? "Envoi..." : "Envoyer le lien"}
          </button>
        </form>

        <div className="mt-6">
          <Link href="/connexion" className="text-sm font-medium text-[#0337aa]">
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  )
}
