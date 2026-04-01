"use client"

import Link from "next/link"
import { Suspense, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import AppTopbar from "@/components/AppTopbar"
import { isAnonymousUser } from "@/lib/profile"
import { createClient, getCurrentSessionUser } from "@/lib/supabase"

function InscriptionPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [contactFollowUpConsent, setContactFollowUpConsent] = useState(false)
  const [contactFollowUpActor, setContactFollowUpActor] = useState<
    "none" | "mairie" | "vivreici"
  >("none")
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const nextPath = searchParams.get("next") || "/profil"

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!privacyAccepted) {
      setErrorMessage(
        "Vous devez accepter la politique de confidentialité pour créer votre compte."
      )
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const existingUser = await getCurrentSessionUser(supabase)
      const profilePayload = {
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        display_name: [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || null,
        email: email.trim(),
        marketing_consent: marketingConsent,
        email_notifications: true,
        push_notifications: false,
        contact_follow_up_consent: contactFollowUpConsent,
        contact_follow_up_actor: contactFollowUpConsent
          ? contactFollowUpActor
          : "none",
        privacy_policy_accepted_at: new Date().toISOString(),
      }

      let userId: string | null = null
      let shouldRedirectToMap = false

      if (existingUser && isAnonymousUser(existingUser)) {
        const { data, error } = await supabase.auth.updateUser({
          email: email.trim(),
          password,
          data: {
            first_name: firstName.trim() || null,
            last_name: lastName.trim() || null,
          },
        })

        if (error || !data.user) {
          throw error ?? new Error("Impossible de finaliser ce compte.")
        }

        userId = data.user.id
        shouldRedirectToMap = true
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              first_name: firstName.trim() || null,
              last_name: lastName.trim() || null,
            },
          },
        })

        if (error || !data.user) {
          throw error ?? new Error("Impossible de créer ce compte.")
        }

        userId = data.user.id
        shouldRedirectToMap = Boolean(data.session)
      }

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: userId,
        ...profilePayload,
      })

      if (profileError) {
        throw profileError
      }

      if (shouldRedirectToMap) {
        router.push(nextPath)
        router.refresh()
        return
      }

      setSuccessMessage(
        "Compte créé. Confirmez votre email depuis le message reçu, puis revenez vous connecter."
      )
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? "Nous n'avons pas pu créer votre compte pour le moment. Réessayez dans un instant."
          : "Nous n'avons pas pu créer votre compte pour le moment. Réessayez dans un instant."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <AppTopbar title="Inscription" backHref="/profil" />

      <div className="mx-auto max-w-md px-4 pt-4">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#1A1A1A]">
                Prénom
              </label>
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="w-full rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm outline-none ring-1 ring-gray-200"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#1A1A1A]">
                Nom
              </label>
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="w-full rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm outline-none ring-1 ring-gray-200"
              />
            </div>
          </div>

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
              placeholder="Choisissez un mot de passe"
              className="w-full rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm outline-none ring-1 ring-gray-200"
              minLength={8}
              required
            />
          </div>

          <label className="flex items-start gap-3 rounded-2xl bg-[#FFFBEA] px-4 py-3 text-sm text-[#1A1A1A]">
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={(event) => setPrivacyAccepted(event.target.checked)}
              className="mt-0.5"
            />
            <span>
              J&apos;accepte la{" "}
              <Link href="/confidentialite" className="font-semibold text-[#D6A100]">
                politique de confidentialité
              </Link>{" "}
              et le traitement de mes données pour le fonctionnement du service.
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm text-[#1A1A1A]">
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={(event) => setMarketingConsent(event.target.checked)}
              className="mt-0.5"
            />
            <span>
              J&apos;accepte de recevoir des informations utiles sur les évolutions
              du service.
            </span>
          </label>

          <div className="space-y-3 rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm text-[#1A1A1A]">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={contactFollowUpConsent}
                onChange={(event) => {
                  const checked = event.target.checked
                  setContactFollowUpConsent(checked)
                  setContactFollowUpActor(checked ? "mairie" : "none")
                }}
                className="mt-0.5"
              />
              <span>
                J&apos;accepte d&apos;être recontacté à propos de mes signalements.
              </span>
            </label>

            {contactFollowUpConsent ? (
              <div className="space-y-2 pl-6">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#666666]">
                  Interlocuteur autorisé
                </p>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="contact-follow-up-actor"
                    value="mairie"
                    checked={contactFollowUpActor === "mairie"}
                    onChange={() => setContactFollowUpActor("mairie")}
                  />
                  <span>La mairie peut me recontacter directement</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="contact-follow-up-actor"
                    value="vivreici"
                    checked={contactFollowUpActor === "vivreici"}
                    onChange={() => setContactFollowUpActor("vivreici")}
                  />
                  <span>VivreIci peut me recontacter et relayer l&apos;échange</span>
                </label>
              </div>
            ) : null}
          </div>

          {errorMessage ? (
            <p className="text-sm text-[#7A1C22]">{errorMessage}</p>
          ) : null}

          {successMessage ? (
            <p className="text-sm text-[#027A48]">{successMessage}</p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#fac411] px-5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isSubmitting ? "Création..." : "Créer mon compte"}
          </button>
        </form>

        <div className="border-t border-gray-100 pt-5 mt-6 text-sm text-[#666666]">
          <p>
            Vous avez déjà un compte ?{" "}
            <Link
              href={`/connexion?next=${encodeURIComponent(nextPath)}`}
              className="font-semibold text-[#D6A100]"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function InscriptionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <InscriptionPageContent />
    </Suspense>
  )
}
