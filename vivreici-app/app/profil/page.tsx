"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import {
  Bell,
  Camera,
  ChevronDown,
  ChevronUp,
  Loader2,
  LogOut,
  MapPin,
  Shield,
  Trash2,
  UserRound,
  Wrench,
} from "lucide-react"
import AppTopbar from "@/components/AppTopbar"
import {
  buildDisplayName,
  formatConsentDate,
  getProfileInitials,
  isAnonymousUser,
  type UserProfile,
} from "@/lib/profile"
import { geocodeAddress } from "@/lib/report-location"
import { sanitizeFileName } from "@/lib/report-form"
import { getDisplayReportReference, type ReportRecord } from "@/lib/reports"
import {
  createClient,
  getCurrentSessionUser,
  isSuperadmin,
} from "@/lib/supabase"

type DeletionRequest = {
  id: string
  created_at: string
  processed_at: string | null
}

type ProfileSectionKey =
  | "preferences"
  | "privacy"
  | "activity"
  | "account"
  | "admin"

function AccordionSection({
  icon,
  title,
  summary,
  isOpen,
  onToggle,
  children,
}: {
  icon: React.ReactNode
  title: string
  summary: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-[24px] bg-white ring-1 ring-gray-100">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF7D6] text-[#D6A100]">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#1A1A1A]">{title}</p>
            <p className="text-sm text-[#666666]">{summary}</p>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-gray-500" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-gray-500" />
        )}
      </button>

      {isOpen ? (
        <div className="border-t border-gray-100 px-4 py-4">{children}</div>
      ) : null}
    </section>
  )
}

export default function ProfilPage() {
  const router = useRouter()
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [reports, setReports] = useState<ReportRecord[]>([])
  const [deletionRequest, setDeletionRequest] = useState<DeletionRequest | null>(
    null
  )
  const [isViewerSuperadmin, setIsViewerSuperadmin] = useState(false)
  const [canBootstrapSuperadmin, setCanBootstrapSuperadmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isRequestingDeletion, setIsRequestingDeletion] = useState(false)
  const [isBootstrappingSuperadmin, setIsBootstrappingSuperadmin] =
    useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [openSection, setOpenSection] = useState<ProfileSectionKey | null>(null)
  const [confirmAction, setConfirmAction] = useState<null | "logout" | "delete">(
    null
  )
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [preferredCity, setPreferredCity] = useState("")
  const [neighborhood, setNeighborhood] = useState("")
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [inAppNotifications, setInAppNotifications] = useState(true)
  const [nearbyReportNotifications, setNearbyReportNotifications] = useState(true)
  const [reportUpdatesNotifications, setReportUpdatesNotifications] = useState(true)
  const [nearbyNotificationsRadiusMeters, setNearbyNotificationsRadiusMeters] =
    useState(500)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(false)
  const [contactFollowUpConsent, setContactFollowUpConsent] = useState(false)
  const [contactFollowUpActor, setContactFollowUpActor] = useState<
    "none" | "mairie" | "vivreici"
  >("none")

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const currentUser = await getCurrentSessionUser(supabase)
        setUser(currentUser)

        if (!currentUser || isAnonymousUser(currentUser)) {
          setUser(null)
          setProfile(null)
          setReports([])
          setDeletionRequest(null)
          setIsViewerSuperadmin(false)
          setCanBootstrapSuperadmin(false)
          router.replace("/connexion")
          return
        }

        const [
          { data: profileData, error: profileError },
          { data: reportsData, error: reportsError },
          { data: deletionData, error: deletionError },
          { data: bootstrapData, error: bootstrapError },
        ] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", currentUser.id).maybeSingle(),
          supabase
            .from("reports")
            .select(
              "id, report_number, report_type_number, lat, lng, type, status, description, photo_url, created_at"
            )
            .eq("user_id", currentUser.id)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("account_deletion_requests")
            .select("id, created_at, processed_at")
            .eq("user_id", currentUser.id)
            .maybeSingle(),
          supabase.rpc("can_bootstrap_first_superadmin"),
        ])

        if (profileError) {
          throw profileError
        }

        if (reportsError) {
          throw reportsError
        }

        if (deletionError) {
          throw deletionError
        }

        if (bootstrapError) {
          throw bootstrapError
        }

        const admin = await isSuperadmin(supabase, currentUser)

        setProfile(profileData)
        setReports(reportsData ?? [])
        setDeletionRequest(deletionData)
        setIsViewerSuperadmin(admin)
        setCanBootstrapSuperadmin(Boolean(bootstrapData))
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de charger votre profil."
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadProfile()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadProfile()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase])

  useEffect(() => {
    setFirstName(profile?.first_name ?? "")
    setLastName(profile?.last_name ?? "")
    setDisplayName(profile?.display_name ?? "")
    setAvatarUrl(profile?.avatar_url ?? null)
    setPreferredCity(profile?.preferred_city ?? "")
    setNeighborhood(profile?.neighborhood ?? "")
    setMarketingConsent(profile?.marketing_consent ?? false)
    setInAppNotifications(profile?.in_app_notifications ?? true)
    setNearbyReportNotifications(profile?.nearby_report_notifications ?? true)
    setReportUpdatesNotifications(profile?.report_updates_notifications ?? true)
    setNearbyNotificationsRadiusMeters(
      profile?.nearby_notifications_radius_meters ?? 500
    )
    setEmailNotifications(profile?.email_notifications ?? true)
    setPushNotifications(profile?.push_notifications ?? false)
    setContactFollowUpConsent(profile?.contact_follow_up_consent ?? false)
    setContactFollowUpActor(profile?.contact_follow_up_actor ?? "none")
  }, [profile])

  const handleSaveProfile = async () => {
    if (!user) {
      return
    }

    setIsSaving(true)
    setFeedbackMessage(null)
    setErrorMessage(null)

    try {
      const notificationAnchorQuery = [neighborhood.trim(), preferredCity.trim()]
        .filter(Boolean)
        .join(", ")
      const notificationAnchor = notificationAnchorQuery
        ? await geocodeAddress(notificationAnchorQuery)
        : null

      const payload = {
        id: user.id,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        display_name: displayName.trim() || null,
        avatar_url: avatarUrl,
        email: user.email ?? null,
        preferred_city: preferredCity.trim() || null,
        neighborhood: neighborhood.trim() || null,
        marketing_consent: marketingConsent,
        in_app_notifications: inAppNotifications,
        nearby_report_notifications: nearbyReportNotifications,
        report_updates_notifications: reportUpdatesNotifications,
        nearby_notifications_radius_meters: nearbyNotificationsRadiusMeters,
        notification_lat: notificationAnchor?.lat ?? null,
        notification_lng: notificationAnchor?.lng ?? null,
        email_notifications: emailNotifications,
        push_notifications: pushNotifications,
        contact_follow_up_consent: contactFollowUpConsent,
        contact_follow_up_actor: contactFollowUpConsent
          ? contactFollowUpActor
          : "none",
        privacy_policy_accepted_at:
          profile?.privacy_policy_accepted_at ?? new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from("profiles")
        .upsert(payload)
        .select("*")
        .single()

      if (error) {
        throw error
      }

      setProfile(data)
      setFeedbackMessage("Profil enregistré.")
      setIsEditingProfile(false)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer votre profil."
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarSelection = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]

    if (!file || !user) {
      return
    }

    setIsUploadingAvatar(true)
    setErrorMessage(null)
    setFeedbackMessage(null)

    try {
      const filePath = `${user.id}/avatar-${Date.now()}-${sanitizeFileName(file.name)}`
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath)

      const { data: updatedProfile, error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: user.email ?? null,
          avatar_url: data.publicUrl,
          privacy_policy_accepted_at:
            profile?.privacy_policy_accepted_at ?? new Date().toISOString(),
        })
        .select("*")
        .single()

      if (profileError) {
        throw profileError
      }

      setAvatarUrl(data.publicUrl)
      setProfile(updatedProfile)
      setFeedbackMessage("Photo de profil mise à jour.")
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de mettre à jour la photo de profil."
      )
    } finally {
      setIsUploadingAvatar(false)
      event.target.value = ""
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    setErrorMessage(null)

    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        throw error
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de vous déconnecter."
      )
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleRequestDeletion = async () => {
    if (!user) {
      return
    }

    setIsRequestingDeletion(true)
    setErrorMessage(null)
    setFeedbackMessage(null)

    try {
      const { data, error } = await supabase
        .from("account_deletion_requests")
        .upsert(
          {
            user_id: user.id,
            reason: "Demande initiée depuis le profil utilisateur.",
          },
          { onConflict: "user_id" }
        )
        .select("id, created_at, processed_at")
        .single()

      if (error) {
        throw error
      }

      setDeletionRequest(data)
      setFeedbackMessage("Demande de suppression enregistrée.")
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer cette demande."
      )
    } finally {
      setIsRequestingDeletion(false)
    }
  }

  const handleBootstrapSuperadmin = async () => {
    setIsBootstrappingSuperadmin(true)
    setErrorMessage(null)
    setFeedbackMessage(null)

    try {
      const { data, error } = await supabase.rpc("bootstrap_first_superadmin")

      if (error) {
        throw error
      }

      if (!data) {
        throw new Error("Un superadmin existe déjà.")
      }

      setIsViewerSuperadmin(true)
      setCanBootstrapSuperadmin(false)
      setFeedbackMessage("Votre compte est désormais superadmin.")
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'activer le rôle superadmin."
      )
    } finally {
      setIsBootstrappingSuperadmin(false)
    }
  }

  const accountActionClass =
    "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold disabled:opacity-60"
  const toggleSection = (section: ProfileSectionKey) => {
    setOpenSection((current) => (current === section ? null : section))
  }
  const activeReportsCount = reports.length
  const privacySummary = contactFollowUpConsent
    ? contactFollowUpActor === "mairie"
      ? "La mairie peut vous recontacter"
      : "VivreIci peut vous recontacter"
    : "Consentements et gestion des données"
  const preferencesSummary = preferredCity
    ? `${inAppNotifications ? "Notifications actives" : "Notifications coupées"} · ${preferredCity}`
    : inAppNotifications
      ? "Notifications actives"
      : "Notifications désactivées"

  const confirmConfig =
    confirmAction === "logout"
      ? {
          title: "Se déconnecter ?",
          description:
            "Vous allez fermer votre session sur cet appareil. Vous pourrez vous reconnecter à tout moment.",
          confirmLabel: isLoggingOut ? "Déconnexion..." : "Confirmer la déconnexion",
          confirmClassName: "bg-[#F8F8F8] text-[#1A1A1A] ring-1 ring-gray-200",
          onConfirm: handleLogout,
          disabled: isLoggingOut,
        }
      : confirmAction === "delete"
        ? {
            title: "Demander la suppression du compte ?",
            description:
              "Une demande RGPD sera enregistrée pour traitement administratif. Votre compte ne sera pas supprimé instantanément.",
            confirmLabel: isRequestingDeletion
              ? "Envoi de la demande..."
              : "Confirmer la demande",
            confirmClassName:
              "bg-[#D21C23] text-white shadow-[0_10px_24px_rgba(210,28,35,0.18)]",
            onConfirm: handleRequestDeletion,
            disabled: isRequestingDeletion,
          }
        : null

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-20">
      <AppTopbar title="Profil" />

      <div className="mx-auto max-w-md space-y-4 px-4 pt-4">
        {isLoading ? (
          <p className="py-6 text-sm text-[#666666]">Chargement du profil...</p>
        ) : !user ? (
          <p className="py-6 text-sm text-[#666666]">
            Redirection vers la connexion...
          </p>
        ) : (
          <>
            <section className="rounded-[28px] bg-white px-4 py-4 ring-1 ring-gray-100">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt={buildDisplayName(profile, user.email ?? "Profil")}
                      className="h-16 w-16 rounded-full object-cover ring-1 ring-gray-200"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF7D6] text-base font-semibold text-[#D6A100]">
                      {getProfileInitials(profile, user.email)}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute -right-1 -bottom-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#fac411] text-white shadow-sm disabled:opacity-60"
                    aria-label="Changer la photo de profil"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </button>

                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarSelection}
                    className="hidden"
                  />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-[#1A1A1A]">
                    {buildDisplayName(profile, user.email ?? "Mon profil")}
                  </p>
                  <p className="truncate text-sm text-[#666666]">
                    {user.email ?? "Session temporaire"}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#D6A100]">
                    {isViewerSuperadmin ? "Superadmin" : "Compte citoyen"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#FAFAFA] px-4 py-3 ring-1 ring-gray-100">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Ville mise en avant
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#1A1A1A]">
                    {profile?.preferred_city ?? "Non renseignée"}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#FAFAFA] px-4 py-3 ring-1 ring-gray-100">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Signalements
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#1A1A1A]">
                    {activeReportsCount}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile((current) => !current)}
                  className="inline-flex h-11 items-center rounded-full bg-[#fac411] px-4 text-sm font-semibold text-white"
                >
                  {isEditingProfile ? "Fermer l’édition" : "Modifier le profil"}
                </button>
              </div>

              {isAnonymousUser(user) ? (
                <div className="mt-3 space-y-3">
                  <p className="text-sm leading-6 text-[#666666]">
                    Vous utilisez actuellement une session temporaire. Pour
                    conserver vos signalements sur le long terme, finalisez votre
                    compte avec une adresse email.
                  </p>
                  <Link
                    href="/inscription"
                    className="inline-flex h-11 items-center rounded-full bg-[#fac411] px-4 text-sm font-semibold text-white"
                  >
                    Finaliser mon compte
                  </Link>
                </div>
              ) : null}
            </section>

            {isEditingProfile ? (
              <section className="space-y-4 rounded-[24px] bg-white p-4 ring-1 ring-gray-100">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF7D6] text-[#D6A100]">
                    <UserRound className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">
                      Modifier le profil
                    </p>
                    <p className="text-sm text-[#666666]">
                      Ajustez votre identité visible et votre zone locale.
                    </p>
                  </div>
                </div>

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
                    Nom affiché
                  </label>
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="w-full rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm outline-none ring-1 ring-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#1A1A1A]">
                    Ville mise en avant
                  </label>
                  <input
                    value={preferredCity}
                    onChange={(event) => setPreferredCity(event.target.value)}
                    placeholder="Ex. Perpignan"
                    className="w-full rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm outline-none ring-1 ring-gray-200"
                  />
                  <p className="text-xs leading-5 text-[#666666]">
                    Utilisée pour centrer la carte si vous ne partagez pas votre
                    position.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#1A1A1A]">
                    Quartier
                  </label>
                  <input
                    value={neighborhood}
                    onChange={(event) => setNeighborhood(event.target.value)}
                    placeholder="Ex. Centre-ville"
                    className="w-full rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm outline-none ring-1 ring-gray-200"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-[#fac411] text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {isSaving ? "Enregistrement..." : "Enregistrer"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="inline-flex h-12 items-center justify-center rounded-full bg-[#F8F8F8] px-4 text-sm font-semibold text-[#1A1A1A] ring-1 ring-gray-200"
                  >
                    Annuler
                  </button>
                </div>
              </section>
            ) : null}

            <AccordionSection
              icon={<Bell className="h-4 w-4" />}
              title="Préférences"
              summary={preferencesSummary}
              isOpen={openSection === "preferences"}
              onToggle={() => toggleSection("preferences")}
            >
              <div className="space-y-3">
                <label className="flex items-start gap-3 rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm text-[#1A1A1A]">
                  <input
                    type="checkbox"
                    checked={inAppNotifications}
                    onChange={(event) => setInAppNotifications(event.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Recevoir les notifications dans l&apos;application.
                    <span className="mt-1 block text-xs leading-5 text-[#666666]">
                      Affiche une cloche, un badge et une liste de notifications dans l&apos;app.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-3 rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm text-[#1A1A1A]">
                  <input
                    type="checkbox"
                    checked={reportUpdatesNotifications}
                    onChange={(event) =>
                      setReportUpdatesNotifications(event.target.checked)
                    }
                    className="mt-0.5"
                    disabled={!inAppNotifications}
                  />
                  <span>
                    Être prévenu des mises à jour de mes signalements.
                    <span className="mt-1 block text-xs leading-5 text-[#666666]">
                      Quand un de vos signalements passe en cours, résolu ou archivé.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-3 rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm text-[#1A1A1A]">
                  <input
                    type="checkbox"
                    checked={nearbyReportNotifications}
                    onChange={(event) =>
                      setNearbyReportNotifications(event.target.checked)
                    }
                    className="mt-0.5"
                    disabled={!inAppNotifications}
                  />
                  <span>
                    Être prévenu des signalements proches.
                    <span className="mt-1 block text-xs leading-5 text-[#666666]">
                      Basé sur votre ville suivie. Le rayon est prêt pour une future version plus précise.
                    </span>
                  </span>
                </label>

                <div className="space-y-2 rounded-2xl bg-[#F8F8F8] px-4 py-3">
                  <label className="text-sm font-semibold text-[#1A1A1A]">
                    Rayon de proximité
                  </label>
                  <select
                    value={nearbyNotificationsRadiusMeters}
                    onChange={(event) =>
                      setNearbyNotificationsRadiusMeters(Number(event.target.value))
                    }
                    disabled={!inAppNotifications || !nearbyReportNotifications}
                    className="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none ring-1 ring-gray-200"
                  >
                    <option value={500}>500 m</option>
                    <option value={1000}>1 km</option>
                    <option value={2000}>2 km</option>
                  </select>
                  <p className="text-xs leading-5 text-[#666666]">
                    Préférence enregistrée dès maintenant pour un futur ciblage par rayon.
                  </p>
                </div>

                <label className="flex items-start gap-3 rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm text-[#1A1A1A]">
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(event) => setEmailNotifications(event.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Recevoir les notifications par email.
                    <span className="mt-1 block text-xs leading-5 text-[#666666]">
                      Mises à jour importantes sur vos signalements et alertes utiles.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-3 rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm text-[#1A1A1A]">
                  <input
                    type="checkbox"
                    checked={pushNotifications}
                    onChange={(event) => setPushNotifications(event.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Recevoir les notifications push.
                    <span className="mt-1 block text-xs leading-5 text-[#666666]">
                      Pour être prévenu rapidement depuis votre téléphone.
                    </span>
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
                    Recevoir les informations utiles sur le service.
                    <span className="mt-1 block text-xs leading-5 text-[#666666]">
                      Évolutions du service et informations locales pertinentes.
                    </span>
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#fac411] text-sm font-semibold text-white disabled:opacity-60"
                >
                  {isSaving ? "Enregistrement..." : "Enregistrer les préférences"}
                </button>
              </div>
            </AccordionSection>

            <AccordionSection
              icon={<Shield className="h-4 w-4" />}
              title="Confidentialité et données"
              summary={privacySummary}
              isOpen={openSection === "privacy"}
              onToggle={() => toggleSection("privacy")}
            >
              <div className="space-y-3">
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
                      J&apos;accepte d&apos;être recontacté au sujet de mes
                      signalements.
                      <span className="mt-1 block text-xs leading-5 text-[#666666]">
                        Vous gardez le contrôle sur qui peut vous joindre.
                      </span>
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
                          name="profile-contact-follow-up-actor"
                          value="mairie"
                          checked={contactFollowUpActor === "mairie"}
                          onChange={() => setContactFollowUpActor("mairie")}
                        />
                        <span>La mairie peut me recontacter directement</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="profile-contact-follow-up-actor"
                          value="vivreici"
                          checked={contactFollowUpActor === "vivreici"}
                          onChange={() => setContactFollowUpActor("vivreici")}
                        />
                        <span>VivreIci peut me recontacter et relayer l’échange</span>
                      </label>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm text-[#1A1A1A]">
                  <p className="font-medium">Consentement RGPD</p>
                  <p className="mt-1 text-[#666666]">
                    Accepté le {formatConsentDate(profile?.privacy_policy_accepted_at ?? null)}
                  </p>
                </div>

                <Link
                  href="/confidentialite"
                  className="inline-flex text-sm font-semibold text-[#D6A100]"
                >
                  Consulter la politique de confidentialité
                </Link>

                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#fac411] text-sm font-semibold text-white disabled:opacity-60"
                >
                  {isSaving ? "Enregistrement..." : "Enregistrer la confidentialité"}
                </button>
              </div>
            </AccordionSection>

            <AccordionSection
              icon={<MapPin className="h-4 w-4" />}
              title="Activité"
              summary="Derniers signalements et activité récente"
              isOpen={openSection === "activity"}
              onToggle={() => toggleSection("activity")}
            >
              {reports.length === 0 ? (
                <p className="text-sm text-[#666666]">
                  Aucun signalement rattaché à ce compte pour le moment.
                </p>
              ) : (
                <div className="space-y-3">
                  {reports.map((report) => (
                    <Link
                      key={report.id}
                      href={`/signalements/${report.id}`}
                      className="block rounded-2xl bg-[#FAFAFA] px-4 py-3 ring-1 ring-gray-100"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#D6A100]">
                        {getDisplayReportReference(report)}
                      </p>
                      <p className="mt-1 text-sm font-medium text-[#1A1A1A]">
                        {report.type}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </AccordionSection>

            <AccordionSection
              icon={<LogOut className="h-4 w-4" />}
              title="Compte"
              summary="Déconnexion et suppression du compte"
              isOpen={openSection === "account"}
              onToggle={() => toggleSection("account")}
            >
              <div className="space-y-4">
                <div className="overflow-hidden rounded-[24px] bg-[#FAFAFA] ring-1 ring-gray-100">
                  <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-4 py-3 text-sm">
                    <span className="text-[#666666]">Signalements actifs</span>
                    <span className="font-semibold text-[#1A1A1A]">{activeReportsCount}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-4 py-3 text-sm">
                    <span className="text-[#666666]">Zone locale</span>
                    <span className="text-right font-semibold text-[#1A1A1A]">
                      {profile?.preferred_city ?? "Votre position"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                    <span className="text-[#666666]">Compte</span>
                    <span className="text-right font-semibold text-[#1A1A1A]">
                      {isViewerSuperadmin ? "Superadmin" : "Utilisateur"}
                    </span>
                  </div>
                </div>

                {deletionRequest ? (
                  <p className="text-sm text-[#666666]">
                    Demande de suppression envoyée le {formatConsentDate(deletionRequest.created_at)}.
                  </p>
                ) : (
                  <p className="text-sm leading-6 text-[#666666]">
                    Vous pouvez demander la suppression de votre compte. La demande est enregistrée pour traitement administratif.
                  </p>
                )}

                <div className="flex flex-col gap-4">
                  {!deletionRequest ? (
                    <button
                      type="button"
                      onClick={() => setConfirmAction("delete")}
                      disabled={isRequestingDeletion}
                      className={`${accountActionClass} bg-[#D21C23] text-white shadow-[0_10px_24px_rgba(210,28,35,0.18)]`}
                    >
                      <Trash2 className="h-4 w-4" />
                      Supprimer mon compte
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setConfirmAction("logout")}
                    disabled={isLoggingOut}
                    className={`${accountActionClass} bg-[#F8F8F8] text-[#1A1A1A] ring-1 ring-gray-200`}
                  >
                    <LogOut className="h-4 w-4" />
                    Se déconnecter
                  </button>
                </div>
              </div>
            </AccordionSection>

            {canBootstrapSuperadmin && !isViewerSuperadmin ? (
              <AccordionSection
                icon={<Wrench className="h-4 w-4" />}
                title="Administration"
                summary="Outils avancés réservés à l’administration"
                isOpen={openSection === "admin"}
                onToggle={() => toggleSection("admin")}
              >
                <div className="space-y-3">
                  <p className="text-sm leading-6 text-[#666666]">
                    Aucun superadmin n&apos;est encore défini. Le premier compte authentifié peut activer ce rôle une seule fois.
                  </p>
                  <button
                    type="button"
                    onClick={handleBootstrapSuperadmin}
                    disabled={isBootstrappingSuperadmin}
                    className="inline-flex h-11 items-center rounded-full bg-[#FFF7D6] px-4 text-sm font-semibold text-[#D6A100] disabled:opacity-60"
                  >
                    {isBootstrappingSuperadmin
                      ? "Activation..."
                      : "Devenir le premier superadmin"}
                  </button>
                </div>
              </AccordionSection>
            ) : null}

            {feedbackMessage ? (
              <p className="text-sm text-[#027A48]">{feedbackMessage}</p>
            ) : null}
            {errorMessage ? (
              <p className="text-sm text-[#7A1C22]">{errorMessage}</p>
            ) : null}
          </>
        )}
      </div>

      {confirmConfig ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-4 pb-6 pt-20 sm:items-center">
          <div className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-[#1A1A1A]">
                {confirmConfig.title}
              </h2>
              <p className="text-sm leading-6 text-[#666666]">
                {confirmConfig.description}
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="inline-flex h-11 items-center rounded-full bg-[#F8F8F8] px-4 text-sm font-semibold text-[#1A1A1A] ring-1 ring-gray-200"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={confirmConfig.disabled}
                onClick={async () => {
                  await confirmConfig.onConfirm()
                  setConfirmAction(null)
                }}
                className={`inline-flex h-11 items-center rounded-full px-4 text-sm font-semibold disabled:opacity-60 ${confirmConfig.confirmClassName}`}
              >
                {confirmConfig.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
