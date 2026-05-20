"use client"

import { useEffect, useMemo, useState } from "react"
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog"
import AdminDesktopLayout from "@/components/admin/AdminDesktopLayout"
import AdminEmptyState from "@/components/admin/AdminEmptyState"
import AdminInsetPanel from "@/components/admin/AdminInsetPanel"
import AdminMetricCard from "@/components/admin/AdminMetricCard"
import AdminMiniStat from "@/components/admin/AdminMiniStat"
import AdminModalShell from "@/components/admin/AdminModalShell"
import AdminPanel from "@/components/admin/AdminPanel"
import AdminPageSkeleton from "@/components/admin/AdminPageSkeleton"
import AdminSelectableCard from "@/components/admin/AdminSelectableCard"
import AdminSectionHeader from "@/components/admin/AdminSectionHeader"
import { fetchAdminJson } from "@/lib/admin-client"
import { type AdminMembersResponse } from "@/lib/admin-members"
import {
  ADMIN_ROLE_LABELS,
  type AdminRole,
} from "@/lib/admin-types"
import { formatReportDate } from "@/lib/reports"

function getRoleChipClasses(role: AdminRole | null) {
  switch (role) {
    case "superadmin":
      return "bg-[#FFF1F2] text-[#BE123C]"
    case "admin":
      return "bg-[#EFF6FF] text-[#1D4ED8]"
    case "mairie":
      return "bg-[#ECFDF3] text-[#027A48]"
    default:
      return "bg-white text-[#4B5563] ring-1 ring-black/6"
  }
}

function getRoleSortWeight(role: AdminRole | null) {
  switch (role) {
    case "superadmin":
      return 0
    case "admin":
      return 1
    case "mairie":
      return 2
    default:
      return 3
  }
}

export default function AdminAccessPage({
  initialData = null,
}: {
  initialData?: AdminMembersResponse | null
}) {
  const [membership, setMembership] = useState(initialData?.membership ?? null)
  const [members, setMembers] = useState(initialData?.members ?? [])
  const [logs, setLogs] = useState(initialData?.logs ?? [])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [roleFilter, setRoleFilter] = useState<
    AdminRole | "none" | "all" | "with_access"
  >("all")
  const [role, setRole] = useState<AdminRole | "none">("none")
  const [organizationName, setOrganizationName] = useState("")
  const [territoryLabel, setTerritoryLabel] = useState("")
  const [query, setQuery] = useState("")
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createUserId, setCreateUserId] = useState("")
  const [createRole, setCreateRole] = useState<AdminRole>("admin")
  const [createOrganizationName, setCreateOrganizationName] = useState("")
  const [createTerritoryLabel, setCreateTerritoryLabel] = useState("")
  const [createFeedbackMessage, setCreateFeedbackMessage] = useState<string | null>(null)
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(!initialData)
  const [isSaving, setIsSaving] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    title: string
    description: string
    payload: {
      userId: string
      role: AdminRole | null
      organizationName: string
      territoryLabel: string
    }
  } | null>(null)

  async function load() {
    const data = await fetchAdminJson<AdminMembersResponse>("/api/admin/members")
    setMembership(data.membership)
    setMembers(data.members)
    setLogs(data.logs)
  }

  useEffect(() => {
    if (initialData) {
      return
    }

    let active = true

    async function run() {
      try {
        const data = await fetchAdminJson<AdminMembersResponse>("/api/admin/members")

        if (!active) {
          return
        }

        setMembership(data.membership)
        setMembers(data.members)
        setLogs(data.logs)
      } catch (error) {
        if (!active) {
          return
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de charger les accès."
        )
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void run()

    return () => {
      active = false
    }
  }, [initialData])

  const sortedMembers = useMemo(() => {
    if (!membership) {
      return members
    }

    return [...members].sort((first, second) => {
      if (first.userId === membership.userId) {
        return -1
      }

      if (second.userId === membership.userId) {
        return 1
      }

      const roleWeightDifference =
        getRoleSortWeight(first.role) - getRoleSortWeight(second.role)

      if (roleWeightDifference !== 0) {
        return roleWeightDifference
      }

      const firstLabel = (
        first.displayName ||
        first.email ||
        first.organizationName ||
        first.userId
      ).toLowerCase()
      const secondLabel = (
        second.displayName ||
        second.email ||
        second.organizationName ||
        second.userId
      ).toLowerCase()

      return firstLabel.localeCompare(secondLabel, "fr")
    })
  }, [members, membership])

  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return sortedMembers.filter((member) => {
      const matchesRole =
        roleFilter === "all"
          ? true
          : roleFilter === "with_access"
            ? member.role != null
            : roleFilter === "none"
              ? member.role == null
              : member.role === roleFilter

      if (!normalizedQuery) {
        return matchesRole
      }

      const haystack = [
        member.email ?? "",
        member.displayName ?? "",
        member.organizationName ?? "",
        member.territoryLabel ?? "",
        member.role ?? "",
      ]
        .join(" ")
        .toLowerCase()

      return matchesRole && haystack.includes(normalizedQuery)
    })
  }, [query, roleFilter, sortedMembers])

  useEffect(() => {
    if (!membership || selectedUserId) {
      return
    }

    setSelectedUserId(membership.userId)
  }, [membership, selectedUserId])

  const selectedMember = members.find((member) => member.userId === selectedUserId) ?? null
  const roleCounts = useMemo(
    () => ({
      superadmin: members.filter((member) => member.role === "superadmin").length,
      admin: members.filter((member) => member.role === "admin").length,
      mairie: members.filter((member) => member.role === "mairie").length,
      none: members.filter((member) => member.role == null).length,
    }),
    [members]
  )
  const priorityItems = useMemo(
    () =>
      [
        {
          key: "mairie-without-territory",
          label: "Mairies sans commune",
          value: members.filter(
            (member) => member.role === "mairie" && !member.territoryLabel?.trim()
          ).length,
          detail: "Accès mairie sans périmètre stable, à corriger rapidement.",
          tone: "danger" as const,
        },
        {
          key: "access-without-organization",
          label: "Accès sans organisation",
          value: members.filter(
            (member) =>
              (member.role === "admin" || member.role === "mairie") &&
              !member.organizationName?.trim()
          ).length,
          detail: "Comptes d’exploitation sans rattachement explicite.",
          tone: "warning" as const,
        },
        {
          key: "inactive-with-access",
          label: "Accès peu exploités",
          value: members.filter(
            (member) => member.role != null && member.activity.analyticsEvents30d === 0
          ).length,
          detail: "Comptes avec rôle admin mais sans activité visible sur 30 jours.",
          tone: "highlight" as const,
        },
      ].filter((item) => item.value > 0),
    [members]
  )
  const isSelectedLastSuperadmin =
    selectedMember?.role === "superadmin" && roleCounts.superadmin <= 1
  const selectedMemberLogs = useMemo(
    () =>
      selectedMember
        ? logs.filter((log) => log.targetUserId === selectedMember.userId).slice(0, 6)
        : [],
    [logs, selectedMember]
  )
  const availableMembersForCreate = useMemo(
    () => members.filter((member) => member.role == null),
    [members]
  )

  useEffect(() => {
    if (!selectedMember) {
      setRole("none")
      setOrganizationName("")
      setTerritoryLabel("")
      return
    }

    setRole(selectedMember.role ?? "none")
    setOrganizationName(selectedMember.organizationName ?? "")
    setTerritoryLabel(selectedMember.territoryLabel ?? "")
  }, [selectedMember])

  function applyQuickRole(nextRole: AdminRole | "none") {
    setRole(nextRole)

    if (nextRole === "superadmin" || nextRole === "admin") {
      setTerritoryLabel("")
    }
  }

  function openCreateModal() {
    const firstAvailableMember = availableMembersForCreate[0] ?? members[0] ?? null

    setCreateUserId(firstAvailableMember?.userId ?? "")
    setCreateRole("admin")
    setCreateOrganizationName("")
    setCreateTerritoryLabel("")
    setCreateFeedbackMessage(null)
    setCreateErrorMessage(null)
    setIsCreateModalOpen(true)
  }

  function closeCreateModal() {
    if (isCreating) {
      return
    }

    setIsCreateModalOpen(false)
    setCreateFeedbackMessage(null)
    setCreateErrorMessage(null)
  }

  async function handleCreateAccess(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!createUserId) {
      setCreateErrorMessage("Choisissez un compte.")
      return
    }

    setIsCreating(true)
    setCreateFeedbackMessage(null)
    setCreateErrorMessage(null)

    try {
      await fetchAdminJson("/api/admin/members", {
        method: "POST",
        body: JSON.stringify({
          userId: createUserId,
          role: createRole,
          organizationName: createOrganizationName,
          territoryLabel: createRole === "mairie" ? createTerritoryLabel : "",
        }),
      })

      await load()
      setSelectedUserId(createUserId)
      setFeedbackMessage("Accès ajouté.")
      setIsCreateModalOpen(false)
    } catch (error) {
      setCreateErrorMessage(
        error instanceof Error ? error.message : "Impossible d'ajouter cet accès."
      )
    } finally {
      setIsCreating(false)
    }
  }

  async function persistAccessUpdate(payload: {
    userId: string
    role: AdminRole | null
    organizationName: string
    territoryLabel: string
  }) {
    await fetchAdminJson("/api/admin/members", {
      method: "POST",
      body: JSON.stringify(payload),
    })

    await load()
    setFeedbackMessage("Accès mis à jour.")
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedUserId) {
      setErrorMessage("Choisissez un compte avant d'enregistrer un accès.")
      return
    }

    setIsSaving(true)
    setFeedbackMessage(null)
    setErrorMessage(null)

    try {
      const isSensitiveRemoval =
        selectedMember?.role === "superadmin" || selectedMember?.role === "admin"
      const isRemovingAccess = role === "none" && selectedMember?.role != null
      const isSelfSensitiveRemoval = membership
        ? selectedMember?.userId === membership.userId
        : false

      if (isRemovingAccess && isSensitiveRemoval) {
        setPendingConfirmation({
          title: isSelfSensitiveRemoval
            ? "Retirer votre propre accès sensible ?"
            : "Retirer cet accès sensible ?",
          description: isSelfSensitiveRemoval
            ? "Vous allez retirer votre propre accès admin ou superadmin. Vérifiez que vous disposez encore d'un autre compte de secours avant de confirmer."
            : `Le compte ${selectedMember?.email ?? selectedMember?.displayName ?? selectedUserId} perdra immédiatement son accès ${selectedMember?.role}.`,
          payload: {
            userId: selectedUserId,
            role: null,
            organizationName,
            territoryLabel,
          },
        })
        setIsSaving(false)
        return
      }

      await persistAccessUpdate({
        userId: selectedUserId,
        role: role === "none" ? null : role,
        organizationName,
        territoryLabel,
      })
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer cet accès."
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleConfirmSensitiveRemoval() {
    if (!pendingConfirmation) {
      return
    }

    setIsSaving(true)
    setFeedbackMessage(null)
    setErrorMessage(null)

    try {
      await persistAccessUpdate(pendingConfirmation.payload)
      setPendingConfirmation(null)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer cet accès."
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <AdminPageSkeleton
        title="Chargement des accès"
        description="Préparation des rôles, comptes et journaux d’attribution."
        metrics={5}
        sections={2}
      />
    )
  }

  if (!membership) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-[#5B6572]">
        Cet espace est réservé au superadmin.
      </div>
    )
  }

  return (
    <AdminDesktopLayout
      membership={membership}
      title="Gestion des accès"
      description="Attribuez les rôles admin, superadmin ou mairie sans passer par la base. Le territoire mairie s’appuie désormais sur une clé normalisée directement stockée sur les signalements."
      toolbar={
        <div className="flex flex-col gap-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un email, un rôle, une mairie…"
            className="min-w-[260px] rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
          />
          <div className="flex flex-wrap gap-2">
            {[
              { value: "all", label: "Tous" },
              { value: "with_access", label: "Avec accès" },
              { value: "superadmin", label: "Superadmins" },
              { value: "admin", label: "Admins" },
              { value: "mairie", label: "Mairies" },
              { value: "none", label: "Sans accès" },
            ].map((item) => {
              const isActive = roleFilter === item.value

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() =>
                    setRoleFilter(
                      item.value as AdminRole | "none" | "all" | "with_access"
                    )
                  }
                  className={`rounded-full px-3 py-2 text-sm transition ${
                    isActive
                      ? "bg-[#FAC411] font-semibold text-[#18212B]"
                      : "bg-[#EAF0FB] text-[#4F5F77]"
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>
      }
    >
      <AdminConfirmDialog
        open={pendingConfirmation != null}
        title={pendingConfirmation?.title ?? ""}
        description={pendingConfirmation?.description ?? ""}
        confirmLabel="Confirmer le retrait"
        tone="warning"
        onConfirm={() => void handleConfirmSensitiveRemoval()}
        onCancel={() => setPendingConfirmation(null)}
        isSubmitting={isSaving}
      />

      {isCreateModalOpen ? (
        <AdminModalShell
          open={isCreateModalOpen}
          titleId="admin-access-create-title"
          descriptionId="admin-access-create-description"
          onClose={closeCreateModal}
        >
          <div className="w-full max-w-xl rounded-[32px] border border-[#0337AA]/10 bg-white p-6 shadow-[0_30px_80px_rgba(3,55,170,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[#6B7280]">
                  Nouvel accès
                </p>
                <h2
                  id="admin-access-create-title"
                  className="mt-2 text-xl font-semibold text-[#18212B]"
                >
                  Ajouter un accès admin
                </h2>
                <p
                  id="admin-access-create-description"
                  className="mt-2 text-sm leading-6 text-[#5B6572]"
                >
                  Attribue un rôle d&apos;administration à un compte existant avec son
                  périmètre éventuel.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreateModal}
                className="rounded-full bg-[#EAF0FB] px-3 py-2 text-sm font-medium text-[#0337AA]"
              >
                Fermer
              </button>
            </div>

            <form onSubmit={handleCreateAccess} className="mt-6 space-y-5">
              <label className="block">
                <span className="text-sm font-medium text-[#18212B]">Compte</span>
                <select
                  value={createUserId}
                  onChange={(event) => setCreateUserId(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
                >
                  <option value="">Choisir un compte</option>
                  {availableMembersForCreate.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.displayName || member.email || member.userId}
                      {member.email ? ` · ${member.email}` : ""}
                    </option>
                  ))}
                  {availableMembersForCreate.length === 0
                    ? members
                        .filter((member) => member.role != null)
                        .map((member) => (
                          <option key={member.userId} value={member.userId}>
                            {member.displayName || member.email || member.userId}
                            {member.email ? ` · ${member.email}` : ""}
                          </option>
                        ))
                    : null}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[#18212B]">Rôle</span>
                <select
                  value={createRole}
                  onChange={(event) => {
                    const nextRole = event.target.value as AdminRole
                    setCreateRole(nextRole)

                    if (nextRole !== "mairie") {
                      setCreateTerritoryLabel("")
                    }
                  }}
                  className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
                >
                  <option value="superadmin">Superadmin</option>
                  <option value="admin">Admin</option>
                  <option value="mairie">Mairie</option>
                </select>
              </label>

              <div className="grid gap-5 lg:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-[#18212B]">
                    Organisation
                  </span>
                  <input
                    value={createOrganizationName}
                    onChange={(event) => setCreateOrganizationName(event.target.value)}
                    placeholder="Ex. Ville de Perpignan"
                    className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[#18212B]">
                    Territoire / commune
                  </span>
                  <input
                    value={createTerritoryLabel}
                    onChange={(event) => setCreateTerritoryLabel(event.target.value)}
                    placeholder="Ex. Perpignan"
                    disabled={createRole !== "mairie"}
                    className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </label>
              </div>

              <div className="rounded-[24px] bg-[#FFF8DF] px-4 py-4 text-sm leading-6 text-[#7B5B00]">
                Pour `mairie`, saisis simplement la commune. Pour `admin` et
                `superadmin`, laisse ce champ vide.
              </div>

              <div aria-live="polite" aria-atomic="true" className="space-y-2">
                {createFeedbackMessage ? (
                  <p className="text-sm text-[#027A48]" role="status">
                    {createFeedbackMessage}
                  </p>
                ) : null}
                {createErrorMessage ? (
                  <p className="text-sm text-[#7A1C22]" role="status">
                    {createErrorMessage}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#FAC411] px-5 text-sm font-semibold text-[#18212B] disabled:opacity-60"
                >
                  {isCreating ? "Ajout..." : "Ajouter l’accès"}
                </button>
                <button
                  type="button"
                  onClick={closeCreateModal}
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
        <AdminMetricCard label="Superadmins" value={roleCounts.superadmin} />
        <AdminMetricCard label="Admins" value={roleCounts.admin} />
        <AdminMetricCard label="Mairies" value={roleCounts.mairie} />
        <AdminMetricCard label="Sans accès" value={roleCounts.none} />
        <AdminMetricCard
          label="Accès admin"
          value="Ajouter un rôle"
          tone="highlight"
          detail="Attribue un rôle admin, superadmin ou mairie à un compte existant."
          actionLabel="Ajouter un accès"
          onAction={openCreateModal}
        />
      </div>

      {priorityItems.length > 0 ? (
        <AdminPanel tone="soft" className="mt-8">
          <AdminSectionHeader
            eyebrow="Priorités"
            title="Vigilance sur les accès"
            description="Met en avant les comptes admin à corriger ou à requalifier avant qu’ils ne créent du flou de gouvernance."
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

      <div className="mt-8 grid gap-8">
        <AdminPanel>
          <AdminSectionHeader
            eyebrow="Comptes"
            title="Utilisateurs et rôles actuels"
            description="La liste remonte d’abord les comptes disposant déjà d’un accès, avec priorité à ton propre compte."
          />

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un email, un rôle, une mairie…"
            className="mt-5 hidden"
          />
          <AdminInsetPanel className="mt-4 leading-6">
            Les comptes avec accès sont remontés en premier. Ton compte reste
            prioritaire en haut de liste pour éviter les erreurs de manipulation.
          </AdminInsetPanel>

          <div className="mt-5 max-h-[520px] space-y-3 overflow-y-auto pr-1">
            {filteredMembers.length === 0 ? (
              <AdminEmptyState
                title="Aucun compte ne correspond aux filtres"
                description={
                  query.trim()
                    ? "Aucun utilisateur ne correspond à la recherche en cours. Ajuste les filtres ou ajoute un accès à un compte existant."
                    : "Aucun compte n'est encore disponible dans ce périmètre."
                }
                actionLabel="Ajouter un accès"
                onAction={openCreateModal}
              />
            ) : null}
            {filteredMembers.map((member) => {
              const isActive = member.userId === selectedUserId
              const isCurrentUser = member.userId === membership.userId

              return (
                <AdminSelectableCard
                  key={member.userId}
                  active={isActive}
                  onClick={() => setSelectedUserId(member.userId)}
                >
                  <p className="text-sm font-semibold text-[#18212B]">
                    {member.displayName || member.email || member.userId}
                  </p>
                  <p className="mt-1 text-sm text-[#5B6572]">
                    {member.email ?? "Email non disponible"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span
                      className={`rounded-full px-2 py-1 ${getRoleChipClasses(member.role)}`}
                    >
                      {member.role ? ADMIN_ROLE_LABELS[member.role] : "Aucun accès"}
                    </span>
                    {isCurrentUser ? (
                      <span className="rounded-full bg-[#0F2D78] px-2 py-1 text-white">
                        Moi
                      </span>
                    ) : null}
                    {member.organizationName ? (
                      <span className="rounded-full bg-white px-2 py-1 text-[#4B5563] ring-1 ring-black/6">
                        {member.organizationName}
                      </span>
                    ) : null}
                    {member.territoryLabel ? (
                      <span className="rounded-full bg-white px-2 py-1 text-[#4B5563] ring-1 ring-black/6">
                        {member.territoryLabel}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#6B7280]">
                    <span>{member.activity.reportsCount} signalement(s)</span>
                    <span>{member.activity.analyticsEvents30d} événement(s) 30j</span>
                    <span>
                      Dernier signalement: {formatReportDate(member.activity.lastReportAt)}
                    </span>
                  </div>
                </AdminSelectableCard>
              )
            })}
          </div>
        </AdminPanel>

        <AdminPanel tone="soft">
          <AdminSectionHeader
            eyebrow="Attribution"
            title="Configurer un accès"
            description="Attribue, modifie ou retire un rôle avec son périmètre éventuel."
          />

          {selectedMember ? (
            <form onSubmit={handleSave} className="mt-5 space-y-5">
              <AdminInsetPanel className="text-inherit">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#18212B]">
                      {selectedMember.displayName || selectedMember.email || selectedMember.userId}
                    </p>
                    <p className="mt-1 text-sm text-[#5B6572]">
                      {selectedMember.email ?? "Email non disponible"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span
                      className={`rounded-full px-2 py-1 ${getRoleChipClasses(selectedMember.role)}`}
                    >
                      {selectedMember.role
                        ? ADMIN_ROLE_LABELS[selectedMember.role]
                        : "Aucun accès"}
                    </span>
                    {selectedMember.userId === membership.userId ? (
                      <span className="rounded-full bg-[#0F2D78] px-2 py-1 text-white">
                        Mon compte
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="mt-3 text-xs text-[#6B7280]">
                  Compte créé le {formatReportDate(selectedMember.profileCreatedAt)}
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <AdminMiniStat
                    label="Signalements"
                    value={
                      <p className="text-2xl font-semibold">
                        {selectedMember.activity.reportsCount}
                      </p>
                    }
                  />
                  <AdminMiniStat
                    label="Activité 30j"
                    value={
                      <p className="text-2xl font-semibold">
                        {selectedMember.activity.analyticsEvents30d}
                      </p>
                    }
                  />
                  <AdminMiniStat
                    label="Dernier signalement"
                    value={
                      <p className="text-sm font-medium">
                        {formatReportDate(selectedMember.activity.lastReportAt)}
                      </p>
                    }
                  />
                </div>
              </AdminInsetPanel>

              <div className="rounded-[24px] border border-[#0337AA]/8 bg-white px-4 py-4">
                <p className="text-sm font-semibold text-[#18212B]">
                  Raccourcis d’attribution
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyQuickRole("superadmin")}
                    className="rounded-full bg-[#FFF1F2] px-3 py-2 text-sm font-medium text-[#BE123C]"
                  >
                    Passer superadmin
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickRole("admin")}
                    className="rounded-full bg-[#EFF6FF] px-3 py-2 text-sm font-medium text-[#1D4ED8]"
                  >
                    Passer admin
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickRole("mairie")}
                    className="rounded-full bg-[#ECFDF3] px-3 py-2 text-sm font-medium text-[#027A48]"
                  >
                    Passer mairie
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickRole("none")}
                    disabled={isSelectedLastSuperadmin}
                    className="rounded-full bg-[#F3F4F6] px-3 py-2 text-sm font-medium text-[#4B5563] disabled:opacity-50"
                  >
                    Retirer l’accès
                  </button>
                </div>
              </div>

              {selectedMember.role === "mairie" || role === "mairie" ? (
                <div className="rounded-[24px] border border-[#027A48]/10 bg-[#ECFDF3] px-4 py-4 text-sm leading-6 text-[#027A48]">
                  Vue mairie: utilise un nom de commune simple et stable.
                </div>
              ) : null}

              <label className="block">
                <span className="text-sm font-medium text-[#18212B]">Rôle</span>
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value as AdminRole | "none")}
                  className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
                >
                  <option value="none" disabled={isSelectedLastSuperadmin}>
                    Aucun accès
                  </option>
                  <option value="superadmin">Superadmin</option>
                  <option value="admin">Admin</option>
                  <option value="mairie">Mairie</option>
                </select>
              </label>

              <div className="grid gap-5 lg:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-[#18212B]">
                    Organisation
                  </span>
                  <input
                    value={organizationName}
                    onChange={(event) => setOrganizationName(event.target.value)}
                    placeholder="Ex. Ville de Perpignan"
                    className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[#18212B]">
                    Territoire / commune
                  </span>
                  <input
                    value={territoryLabel}
                    onChange={(event) => setTerritoryLabel(event.target.value)}
                    placeholder="Ex. Perpignan"
                    className="mt-2 w-full rounded-2xl border border-[#0337AA]/10 bg-[#F8FBFF] px-4 py-3 text-sm outline-none"
                  />
                </label>
              </div>

              <div className="rounded-[24px] bg-[#FFF8DF] px-4 py-4 text-sm leading-6 text-[#7B5B00]">
                Pour `mairie`, saisis simplement la commune. Pour `admin` et
                `superadmin`, laisse ce champ vide.
              </div>

              {selectedMember.userId === membership.userId &&
              (selectedMember.role === "superadmin" || role === "none") ? (
                <div className="rounded-[24px] bg-[#FFF1F2] px-4 py-4 text-sm leading-6 text-[#BE123C]">
                  Attention: tu modifies ton propre accès admin.
                </div>
              ) : null}

              {isSelectedLastSuperadmin ? (
                <div className="rounded-[24px] bg-[#FFF1F2] px-4 py-4 text-sm leading-6 text-[#BE123C]">
                  Dernier superadmin: rétrogradation bloquée.
                </div>
              ) : null}

              <div aria-live="polite" aria-atomic="true" className="space-y-2">
                {feedbackMessage ? (
                  <p className="text-sm text-[#027A48]" role="status">
                    {feedbackMessage}
                  </p>
                ) : null}
                {errorMessage ? (
                  <p className="text-sm text-[#7A1C22]" role="status">
                    {errorMessage}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#FAC411] px-5 text-sm font-semibold text-[#18212B] disabled:opacity-60"
                >
                  {isSaving ? "Enregistrement..." : "Enregistrer l’accès"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserId(membership.userId)
                    setFeedbackMessage(null)
                    setErrorMessage(null)
                  }}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#EAF0FB] px-5 text-sm font-semibold text-[#0337AA]"
                >
                  Revenir à mon compte
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-8">
              <AdminEmptyState
                title="Sélectionne un compte à administrer"
                description="Choisis un utilisateur dans la liste pour attribuer, modifier ou retirer un rôle d'accès."
                actionLabel={availableMembersForCreate.length > 0 ? "Ajouter un accès" : undefined}
                onAction={availableMembersForCreate.length > 0 ? openCreateModal : undefined}
              />
            </div>
          )}
        </AdminPanel>
      </div>

      <AdminPanel className="mt-6">
        <AdminSectionHeader
          eyebrow="Journal admin"
          title="Dernières actions sur les accès"
          titleTone="primary"
          action={
            selectedMember ? (
              <div className="rounded-full bg-[#F8FBFF] px-4 py-2 text-sm text-[#4F5F77]">
                Focus: {selectedMember.displayName || selectedMember.email || selectedMember.userId}
              </div>
            ) : null
          }
        />

        <div className="mt-5 space-y-3">
          {(selectedMember ? selectedMemberLogs : logs.slice(0, 10)).map((log) => (
            <div
              key={log.id}
              className="grid gap-2 rounded-[24px] border border-[#0337AA]/8 bg-[#F8FBFF] px-4 py-4 lg:grid-cols-[1.2fr_1fr_auto]"
            >
              <div>
                <p className="text-sm font-semibold text-[#18212B]">
                  {log.actorLabel} a modifié {log.targetLabel}
                </p>
                <p className="mt-1 text-sm text-[#5B6572]">
                  {log.previousRole ? ADMIN_ROLE_LABELS[log.previousRole] : "Aucun accès"}{" "}
                  {" -> "}
                  {log.nextRole ? ADMIN_ROLE_LABELS[log.nextRole] : "Aucun accès"}
                </p>
              </div>
              <div className="text-sm text-[#5B6572]">
                {log.organizationName ? <p>{log.organizationName}</p> : null}
                {log.territoryLabel ? <p>{log.territoryLabel}</p> : null}
              </div>
              <p className="text-sm text-[#6B7280]">{formatReportDate(log.createdAt)}</p>
            </div>
          ))}

          {(selectedMember ? selectedMemberLogs : logs).length === 0 ? (
            <p className="text-sm text-[#6B7280]">
              Aucune action admin enregistrée pour le moment.
            </p>
          ) : null}
        </div>
      </AdminPanel>
    </AdminDesktopLayout>
  )
}
