"use client"

import Image from "next/image"
import Link from "next/link"
import { Suspense, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase"

function ConnexionPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const nextPath = searchParams.get("next") || "/admin"

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
          ? "Connexion admin impossible. Vérifiez vos identifiants."
          : "Connexion admin impossible pour le moment."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(250,196,17,0.2),_transparent_28%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] px-6 py-10">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[36px] border border-[#0337aa]/10 bg-white p-8 shadow-[0_28px_80px_rgba(3,55,170,0.08)]">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(180deg,rgba(3,55,170,0.04),rgba(250,196,17,0.14))] p-2 shadow-[0_10px_24px_rgba(3,55,170,0.08)]">
            <Image
              src="/admin-logo.svg"
              alt="VivreIci"
              width={48}
              height={48}
              className="h-12 w-12 object-contain"
              priority
            />
          </div>
          <p className="mt-8 text-xs uppercase tracking-[0.32em] text-[#0337aa]">
            Dashboard Séparé
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[#0337aa]">
            VivreIci Admin
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-[#5b6572]">
            Espace desktop dédié au pilotage produit, à la modération et au suivi
            des collectivités. Cette interface est distincte de l’app citoyenne.
          </p>
          <div className="mt-6 inline-flex items-center rounded-full bg-[#fff7d6] px-4 py-2 text-sm font-medium text-[#7b5b00] ring-1 ring-[#fac411]/35">
            Bleu et jaune utilisés en accent uniquement
          </div>
        </section>

        <section className="rounded-[36px] border border-[#0337aa]/8 bg-white p-8 shadow-[0_28px_80px_rgba(3,55,170,0.08)]">
          <p className="text-xs uppercase tracking-[0.32em] text-[#0337aa]">
            Connexion
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#0337aa]">
            Accéder au dashboard
          </h2>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block">
              <span className="text-sm font-medium text-[#18212B]">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@vivreici.app"
                className="mt-2 w-full rounded-2xl border border-[#0337aa]/12 bg-[#F8FBFF] px-4 py-3 text-sm outline-none focus:border-[#0337aa]"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[#18212B]">Mot de passe</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Votre mot de passe admin"
                className="mt-2 w-full rounded-2xl border border-[#0337aa]/12 bg-[#F8FBFF] px-4 py-3 text-sm outline-none focus:border-[#0337aa]"
                required
              />
            </label>

            <div className="flex justify-end">
              <Link
                href="/mot-de-passe-oublie"
                className="text-sm font-medium text-[#0337aa]"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            <div aria-live="polite" aria-atomic="true">
              {errorMessage ? (
                <p className="text-sm text-[#7A1C22]" role="status">
                  {errorMessage}
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#fac411] px-5 text-sm font-semibold text-[#0337aa] shadow-[0_12px_24px_rgba(250,196,17,0.22)] disabled:opacity-60"
            >
              {isSubmitting ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}

export default function ConnexionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#eef4ff]" />}>
      <ConnexionPageContent />
    </Suspense>
  )
}
