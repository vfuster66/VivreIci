"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { createClient } from "@/lib/supabase"

export default function AdminResetPasswordPage() {
  const supabase = useMemo(() => createClient(), [])
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    setErrorMessage(null)

    if (password.length < 8) {
      setErrorMessage("Le mot de passe doit contenir au moins 8 caractères.")
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage("Les mots de passe ne correspondent pas.")
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        throw error
      }

      setMessage("Mot de passe mis à jour. Tu peux te reconnecter.")
      setPassword("")
      setConfirmPassword("")
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de mettre à jour le mot de passe."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(250,196,17,0.2),_transparent_28%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] px-6 py-10">
      <div className="mx-auto max-w-xl rounded-[36px] border border-[#0337aa]/8 bg-white p-8 shadow-[0_28px_80px_rgba(3,55,170,0.08)]">
        <p className="text-xs uppercase tracking-[0.32em] text-[#0337aa]">
          Réinitialisation
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#0337aa]">
          Nouveau mot de passe admin
        </h1>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-[#18212B]">Nouveau mot de passe</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#0337aa]/12 bg-[#F8FBFF] px-4 py-3 text-sm outline-none focus:border-[#0337aa]"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[#18212B]">Confirmer le mot de passe</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
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
            {isSubmitting ? "Mise à jour..." : "Enregistrer le mot de passe"}
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
