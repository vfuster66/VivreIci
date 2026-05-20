import "server-only"

import type { AdminJournalData, AdminMembership } from "@/lib/admin-types"
import { createAdminClient } from "@/lib/supabase-admin"

function getActionTitle(action: string) {
  switch (action) {
    case "admin_role_granted":
      return "Accès accordé"
    case "admin_role_updated":
      return "Accès modifié"
    case "admin_role_revoked":
      return "Accès retiré"
    case "user_created":
      return "Utilisateur créé"
    case "user_updated":
      return "Utilisateur modifié"
    case "user_password_reset_requested":
      return "Réinitialisation mot de passe demandée"
    case "user_deleted":
      return "Utilisateur supprimé"
    case "report_created":
      return "Signalement créé"
    case "help_post_created":
      return "Annonce d'entraide créée"
    case "animal_post_created":
      return "Annonce animale créée"
    case "animal_post_updated":
      return "Annonce animale modifiée"
    case "animal_alert_created":
      return "Alerte animale créée"
    case "animal_alert_updated":
      return "Alerte animale modifiée"
    case "animal_alert_verified":
      return "Alerte animale vérifiée"
    case "animal_alert_unverified":
      return "Vérification retirée"
    case "animal_alert_source_updated":
      return "Source d’alerte modifiée"
    case "animal_alert_status_updated":
      return "Statut d’alerte modifié"
    default:
      return action
  }
}

function formatMetadataDetail(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) {
    return "Aucun détail complémentaire."
  }

  if (typeof metadata.title === "string") {
    return metadata.title
  }

  if (typeof metadata.petName === "string" && metadata.petName.trim()) {
    return metadata.petName
  }

  if (typeof metadata.city === "string" && metadata.city.trim()) {
    return `Ville: ${metadata.city}`
  }

  return "Action enregistrée."
}

export async function buildAdminJournalData(
  membership: AdminMembership
): Promise<AdminJournalData> {
  if (membership.role !== "superadmin") {
    throw new Error("Accès superadmin requis.")
  }

  const supabase = createAdminClient()
  const [
    { data: auditRows, error: auditError },
    { data: moderationRows, error: moderationError },
  ] = await Promise.all([
    supabase
      .from("admin_audit_logs")
      .select(
        "id, actor_user_id, target_user_id, action, organization_name, territory_label, metadata, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("animal_alert_moderation_logs")
      .select("id, actor_user_id, action, previous_value, next_value, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
  ])

  if (auditError || moderationError) {
    throw auditError ?? moderationError
  }

  const actorIds = [
    ...new Set([
      ...(auditRows ?? []).flatMap((row) => [row.actor_user_id, row.target_user_id]),
      ...(moderationRows ?? []).map((row) => row.actor_user_id),
    ]),
  ].filter((id): id is string => typeof id === "string" && id.length > 0)

  const { data: profiles, error: profilesError } = actorIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", actorIds)
    : { data: [], error: null }

  if (profilesError) {
    throw profilesError
  }

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      profile.display_name || profile.email || profile.id.slice(0, 8),
    ])
  )

  const items = [
    ...(auditRows ?? []).map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      category:
        row.action === "user_created" ||
        row.action === "user_updated" ||
        row.action === "user_password_reset_requested" ||
        row.action === "user_deleted"
          ? ("user" as const)
          : row.action === "report_created"
            ? ("report" as const)
            : row.action === "help_post_created"
              ? ("help_post" as const)
              : row.action === "animal_post_created" ||
                  row.action === "animal_post_updated"
                ? ("animal_post" as const)
                : row.action === "animal_alert_created" ||
                    row.action === "animal_alert_updated"
                  ? ("animal_alert" as const)
                  : ("access" as const),
      title: getActionTitle(row.action),
      detail: formatMetadataDetail(
        row.metadata && typeof row.metadata === "object"
          ? (row.metadata as Record<string, unknown>)
          : null
      ),
      actorLabel: profileMap.get(row.actor_user_id) ?? row.actor_user_id.slice(0, 8),
    })),
    ...(moderationRows ?? []).map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      category: "moderation" as const,
      title: getActionTitle(row.action),
      detail: `${row.previous_value || "∅"} -> ${row.next_value || "∅"}`,
      actorLabel: profileMap.get(row.actor_user_id) ?? row.actor_user_id.slice(0, 8),
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return {
    membership,
    items,
  }
}
