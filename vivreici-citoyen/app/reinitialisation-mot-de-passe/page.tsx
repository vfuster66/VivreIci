"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import AppTopbar from "@/components/AppTopbar"
import { createClient } from "@/lib/supabase"

export default function ResetPasswordPage() {
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
    <div className="min-h-screen bg-white pb-20">
      <AppTopbar title="Nouveau mot de passe" backHref="/connexion" />

      <div className="mx-auto max-w-md px-4 pt-4">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="reset-password" className="text-sm font-semibold text-[#1A1A1A]">
              Nouveau mot de passe
            </label>
            <input
              id="reset-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm outline-none ring-1 ring-gray-200"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="reset-password-confirm" className="text-sm font-semibold text-[#1A1A1A]">
              Confirmer le mot de passe
            </label>
            <input
              id="reset-password-confirm"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
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
            {isSubmitting ? "Mise à jour..." : "Enregistrer le mot de passe"}
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
