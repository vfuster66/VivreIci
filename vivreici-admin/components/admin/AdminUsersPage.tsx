"use client"

import { useEffect, useMemo, useState } from "react"
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog"
import AdminDesktopLayout from "@/components/admin/AdminDesktopLayout"
import AdminEmptyState from "@/components/admin/AdminEmptyState"
import AdminInsetPanel from "@/components/admin/AdminInsetPanel"
import AdminMetricCard from "@/components/admin/AdminMetricCard"
import AdminModalShell from "@/components/admin/AdminModalShell"
import AdminPanel from "@/components/admin/AdminPanel"
import AdminPageSkeleton from "@/components/admin/AdminPageSkeleton"
import AdminSelectableCard from "@/components/admin/AdminSelectableCard"
import AdminSectionHeader from "@/components/admin/AdminSectionHeader"
import { fetchAdminJson } from "@/lib/admin-client"
import {
  ADMIN_ROLE_LABELS,
  type AdminUsersData,
} from "@/lib/admin-types"
import { formatReportDate } from "@/lib/reports"

export default function AdminUsersPage({
  initialData = null,
}: {
  initialData?: AdminUsersData | null
}) {
  const [data, setData] = useState<AdminUsersData | null>(initialData)
  const [isLoading, setIsLoading] = useState(!initialData)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [selectedUserId, setSelectedUserId] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editDisplayName, setEditDisplayName] = useState("")
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createEmail, setCreateEmail] = useState("")
  const [createDisplayName, setCreateDisplayName] = useState("")
  const [createFeedback, setCreateFeedback] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false)

  async function load() {
    setLoadError(null)
    const payload = await fetchAdminJson<AdminUsersData>("/api/admin/users")
    setData(payload)
  }

  useEffect(() => {
    if (initialData) {
      return
    }

    async function run() {
      try {
        await load()
      } catch (loadErr) {
        setLoadError(
          loadErr instanceof Error
            ? loadErr.message
            : "Impossible de charger les utilisateurs."
        )
      } finally {
        setIsLoading(false)
      }
    }

    void run()
  }, [initialData])

  const filteredUsers = useMemo(() => {
    if (!data) {
      return []
    }

    const normalizedQuery = query.trim().toLowerCase()

    return data.users.filter((user) => {
      if (!normalizedQuery) {
        return true
      }

      return [
        user.email ?? "",
        user.displayName ?? "",
        user.role ?? "",
        user.organizationName ?? "",
        user.territoryLabel ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    })
  }, [data, query])

  useEffect(() => {
    if (!data || selectedUserId) {
      return
    }

    setSelectedUserId(data.users[0]?.userId ?? "")
  }, [data, selectedUserId])

  const selectedUser =
    data?.users.find((user) => user.userId === selectedUserId) ?? null
  const priorityItems = useMemo(() => {
    if (!data) {
      return []
    }

    return [
      {
        key: "without-access",
        label: "Comptes sans accès",
        value: data.users.filter((user) => user.role == null).length,
        detail: "Utilisateurs présents mais sans rôle admin attribué.",
        tone: "highlight" as const,
      },
      {
        key: "without-display-name",
        label: "Profils incomplets",
        value: data.users.filter((user) => !user.displayName?.trim()).length,
        detail: "Comptes sans nom affiché exploitable dans le backoffice.",
        tone: "warning" as const,
      },
      {
        key: "never-signed-in",
        label: "Jamais connectés",
        value: data.users.filter((user) => !user.lastSignInAt).length,
        detail: "Comptes créés mais jamais activés par une connexion effective.",
        tone: "default" as const,
      },
    ].filter((item) => item.value > 0)
  }, [data])

  useEffect(() => {
    if (!selectedUser) {
      setEditEmail("")
      setEditDisplayName("")
      return
    }

    setEditEmail(selectedUser.email ?? "")
    setEditDisplayName(selectedUser.displayName ?? "")
  }, [selectedUser])

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedUser) {
      return
    }

    setIsSaving(true)
    setFeedback(null)
    setError(null)

    try {
      await fetchAdminJson("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          userId: selectedUser.userId,
          email: editEmail,
          displayName: editDisplayName,
          action: "update",
        }),
      })

      await load()
      setFeedback("Utilisateur mis à jour.")
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Impossible de mettre à jour cet utilisateur."
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleResetPassword() {
    if (!selectedUser) {
      return
    }

    setIsSaving(true)
    setFeedback(null)
    setError(null)

    try {
      await fetchAdminJson("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          userId: selectedUser.userId,
          action: "reset_password",
        }),
      })

      setFeedback("Email de réinitialisation envoyé.")
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Impossible d'envoyer l'email de réinitialisation."
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteUser() {
    if (!selectedUser) {
      return
    }

    setIsSaving(true)
    setFeedback(null)
    setError(null)

    try {
      await fetchAdminJson(`/api/admin/users?userId=${encodeURIComponent(selectedUser.userId)}`, {
        method: "DELETE",
      })

      await load()
      setSelectedUserId("")
      setDeleteConfirmationOpen(false)
      setFeedback("Utilisateur supprimé.")
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Impossible de supprimer cet utilisateur."
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsCreating(true)
    setFeedback(null)
    setCreateFeedback(null)
    setCreateError(null)

    try {
      await fetchAdminJson("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email: createEmail,
          displayName: createDisplayName,
        }),
      })

      await load()
      setCreateFeedback("Utilisateur créé. Un email de définition du mot de passe a été envoyé.")
      setIsCreateOpen(false)
      setCreateEmail("")
      setCreateDisplayName("")
      setFeedback("Utilisateur créé. Un email de définition du mot de passe a été envoyé.")
    } catch (createError) {
      setCreateError(
        createError instanceof Error
          ? createError.message
          : "Impossible de créer cet utilisateur."
      )
    } finally {
      setIsCreating(false)
    }
  }

  if (isLoading) {
    return (
      <AdminPageSkeleton
        title="Chargement des utilisateurs"
        description="Préparation des comptes, rôles et actions d’administration."
        metrics={5}
        sections={2}
      />
    )
  }

  if (!data) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-[#6B7280]">{loadError ?? "Accès refusé."}</div>
  }

  return (
    <AdminDesktopLayout
      membership={data.membership}
      title="Utilisateurs"
      description="Création, modification, réinitialisation de mot de passe et suppression des comptes."
      toolbar={
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <label className="block flex-1">
            <span className="text-sm font-medium text-[#18212B]">Recherche</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Email, nom, rôle…"
              className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full bg-[#F8FBFF] px-4 py-2 text-sm text-[#5B6572]">
              {filteredUsers.length} utilisateur(s)
            </div>
            <button
              type="button"
              onClick={() => {
                setCreateFeedback(null)
                setCreateError(null)
                setIsCreateOpen(true)
              }}
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#FAC411] px-5 text-sm font-semibold text-[#18212B]"
            >
              Ajouter un utilisateur
            </button>
          </div>
        </div>
      }
    >
      <AdminConfirmDialog
        open={deleteConfirmationOpen}
        title="Supprimer ce compte ?"
        description={`Le compte ${selectedUser?.email ?? selectedUser?.userId ?? ""} sera supprimé définitivement depuis le backoffice.`}
        confirmLabel="Supprimer le compte"
        onConfirm={() => void handleDeleteUser()}
        onCancel={() => setDeleteConfirmationOpen(false)}
        isSubmitting={isSaving}
      />

      {isCreateOpen ? (
        <AdminModalShell
          open={isCreateOpen}
          titleId="admin-users-create-title"
          descriptionId="admin-users-create-description"
          onClose={() => {
            setCreateFeedback(null)
            setCreateError(null)
            setIsCreateOpen(false)
          }}
        >
          <div className="w-full max-w-xl rounded-[32px] border border-[#0337AA]/10 bg-white p-6 shadow-[0_30px_80px_rgba(3,55,170,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[#6B7280]">
                  Nouveau compte
                </p>
                <h2
                  id="admin-users-create-title"
                  className="mt-2 text-xl font-semibold text-[#18212B]"
                >
                  Ajouter un utilisateur
                </h2>
                <p
                  id="admin-users-create-description"
                  className="mt-2 text-sm leading-6 text-[#5B6572]"
                >
                  Crée un compte puis envoie automatiquement un email de définition du
                  mot de passe.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCreateFeedback(null)
                  setCreateError(null)
                  setIsCreateOpen(false)
                }}
                className="rounded-full bg-[#EAF0FB] px-3 py-2 text-sm font-medium text-[#0337AA]"
              >
                Fermer
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-6 space-y-5">
              <label className="block">
                <span className="text-sm font-medium text-[#18212B]">Email</span>
                <input
                  type="email"
                  value={createEmail}
                  onChange={(event) => setCreateEmail(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-[#18212B]">Nom affiché</span>
                <input
                  value={createDisplayName}
                  onChange={(event) => setCreateDisplayName(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
                />
              </label>
              <div className="rounded-[24px] bg-[#F8FBFF] px-4 py-4 text-sm text-[#5B6572]">
                Le mot de passe n&apos;est plus saisi dans le backoffice. Un email de
                définition de mot de passe sera envoyé automatiquement.
              </div>
              <div aria-live="polite" aria-atomic="true" className="space-y-2">
                {createFeedback ? (
                  <p className="text-sm text-[#027A48]" role="status">
                    {createFeedback}
                  </p>
                ) : null}
                {createError ? (
                  <p className="text-sm text-[#7A1C22]" role="status">
                    {createError}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#FAC411] px-5 text-sm font-semibold text-[#18212B] disabled:opacity-60"
                >
                  {isCreating ? "Création..." : "Créer le compte"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreateFeedback(null)
                    setCreateError(null)
                    setIsCreateOpen(false)
                  }}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#EAF0FB] px-5 text-sm font-semibold text-[#0337AA]"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </AdminModalShell>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Total", value: data.stats.total },
          { label: "Avec accès", value: data.stats.withAccess },
          { label: "Superadmins", value: data.stats.superadmins },
          { label: "Admins", value: data.stats.admins },
          { label: "Mairies", value: data.stats.mairies },
        ].map((stat) => (
          <AdminMetricCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>

      {priorityItems.length > 0 ? (
        <AdminPanel tone="soft" className="mt-8">
          <AdminSectionHeader
            eyebrow="Priorités"
            title="File de gestion des comptes"
            description="Repère d’abord les comptes à qualifier, compléter ou activer avant d’ouvrir leur fiche."
          />
          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {priorityItems.map((item) => (
              <AdminMetricCard
                key={item.key}
                label={item.label}
                value={item.value}
                detail={item.detail}
                tone={item.tone}
              />
            ))}
          </div>
        </AdminPanel>
      ) : null}

      <div className="mt-8 grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
        <AdminPanel>
          <AdminSectionHeader
            title="Comptes"
            description="Sélectionne un utilisateur pour modifier ses informations ou ses accès."
          />
          <div className="mt-5 max-h-[620px] space-y-3 overflow-y-auto pr-1">
            {filteredUsers.length === 0 ? (
              <AdminEmptyState
                title="Aucun utilisateur à afficher"
                description={
                  query.trim()
                    ? "Aucun compte ne correspond à la recherche en cours. Ajuste le filtre ou crée un nouvel utilisateur."
                    : "Aucun utilisateur n'est encore disponible dans ce périmètre."
                }
                actionLabel={!query.trim() ? "Ajouter un utilisateur" : undefined}
                onAction={
                  !query.trim()
                    ? () => {
                        setCreateFeedback(null)
                        setCreateError(null)
                        setIsCreateOpen(true)
                      }
                    : undefined
                }
              />
            ) : null}
            {filteredUsers.map((user) => (
              <AdminSelectableCard
                key={user.userId}
                active={user.userId === selectedUserId}
                onClick={() => setSelectedUserId(user.userId)}
              >
                <p className="text-sm font-semibold text-[#18212B]">
                  {user.displayName || user.email || user.userId}
                </p>
                <p className="mt-1 text-sm text-[#5B6572]">
                  {user.email ?? "Email non disponible"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-white px-2 py-1 text-[#4B5563] ring-1 ring-black/6">
                    {user.role ? ADMIN_ROLE_LABELS[user.role] : "Sans accès"}
                  </span>
                  {user.organizationName ? (
                    <span className="rounded-full bg-white px-2 py-1 text-[#4B5563] ring-1 ring-black/6">
                      {user.organizationName}
                    </span>
                  ) : null}
                </div>
              </AdminSelectableCard>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel tone="soft">
          <AdminSectionHeader
            title="Gestion du compte"
            description="Met à jour le profil, déclenche une réinitialisation ou supprime le compte."
          />

          {selectedUser ? (
            <form onSubmit={handleSave} className="mt-5 space-y-5">
              <AdminInsetPanel>
                <p>
                  Créé le {formatReportDate(selectedUser.createdAt)} · Dernière connexion{" "}
                  {formatReportDate(selectedUser.lastSignInAt)}
                </p>
                <p className="mt-2">
                  Accès admin: {selectedUser.role ? ADMIN_ROLE_LABELS[selectedUser.role] : "Aucun"}
                </p>
              </AdminInsetPanel>

              <label className="block">
                <span className="text-sm font-medium text-[#18212B]">Email</span>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(event) => setEditEmail(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[#18212B]">Nom affiché</span>
                <input
                  value={editDisplayName}
                  onChange={(event) => setEditDisplayName(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
                />
              </label>

              <div aria-live="polite" aria-atomic="true" className="space-y-2">
                {feedback ? (
                  <p className="text-sm text-[#027A48]" role="status">
                    {feedback}
                  </p>
                ) : null}
                {error ? (
                  <p className="text-sm text-[#7A1C22]" role="status">
                    {error}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#FAC411] px-5 text-sm font-semibold text-[#18212B] disabled:opacity-60"
                >
                  {isSaving ? "Enregistrement..." : "Enregistrer"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleResetPassword()}
                  disabled={isSaving}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#EAF0FB] px-5 text-sm font-semibold text-[#0337AA] disabled:opacity-60"
                >
                  Réinitialiser le mot de passe
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmationOpen(true)}
                  disabled={isSaving}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#FFF1F2] px-5 text-sm font-semibold text-[#BE123C] disabled:opacity-60"
                >
                  Supprimer
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-6 rounded-[24px] border border-dashed border-[#0337AA]/14 px-4 py-10 text-center text-sm text-[#5B6572]">
              Sélectionne un compte pour le modifier.
            </div>
          )}
        </AdminPanel>
      </div>
    </AdminDesktopLayout>
  )
}
