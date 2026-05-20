import "server-only"

import { canAccessModeration } from "@/lib/admin-access"
import type { AdminAnimalAlertsData, AdminMembership } from "@/lib/admin-types"
import { createAdminClient } from "@/lib/supabase-admin"

function getConfidenceScore(confirmCount: number, clearCount: number, isVerified: boolean) {
  const baseScore = 50 + confirmCount * 15 - clearCount * 20 + (isVerified ? 20 : 0)
  return Math.max(0, Math.min(100, baseScore))
}

function getConfidenceLabel(score: number): "low" | "medium" | "high" {
  if (score >= 75) {
    return "high"
  }

  if (score >= 45) {
    return "medium"
  }

  return "low"
}

export async function buildAdminAnimalAlertsData(
  membership: AdminMembership
): Promise<AdminAnimalAlertsData> {
  if (!canAccessModeration(membership.role)) {
    throw new Error("Accès administration refusé.")
  }

  const supabase = createAdminClient()
  const { data: alerts, error: alertsError } = await supabase
    .from("animal_alerts")
    .select(
      "id, title, city, lat, lng, alert_type, source_type, severity, status, species_scope, radius_meters, is_verified, author_label, description, observed_at, created_at, expires_at, confidence_score, confidence_level, confidence_reasons, confidence_version"
    )
    .order("created_at", { ascending: false })
    .limit(250)

  if (alertsError) {
    throw alertsError
  }

  const alertIds = (alerts ?? []).map((alert) => alert.id)
  const { data: confirmations, error: confirmationsError } = alertIds.length
    ? await supabase
        .from("animal_alert_confirmations")
        .select("alert_id, vote")
        .in("alert_id", alertIds)
    : { data: [], error: null }

  const { data: moderationLogs, error: moderationLogsError } = alertIds.length
    ? await supabase
        .from("animal_alert_moderation_logs")
        .select("id, alert_id, actor_user_id, action, previous_value, next_value, created_at")
        .in("alert_id", alertIds)
        .order("created_at", { ascending: false })
    : { data: [], error: null }

  if (confirmationsError) {
    throw confirmationsError
  }

  if (moderationLogsError) {
    throw moderationLogsError
  }

  const countsByAlertId = (confirmations ?? []).reduce<
    Record<string, { confirmCount: number; clearCount: number }>
  >((accumulator, item) => {
    if (!accumulator[item.alert_id]) {
      accumulator[item.alert_id] = { confirmCount: 0, clearCount: 0 }
    }

    if (item.vote === "confirm") {
      accumulator[item.alert_id].confirmCount += 1
    } else if (item.vote === "clear") {
      accumulator[item.alert_id].clearCount += 1
    }

    return accumulator
  }, {})

  const rows = (alerts ?? []).map((alert) => {
    const confirmCount = countsByAlertId[alert.id]?.confirmCount ?? 0
    const clearCount = countsByAlertId[alert.id]?.clearCount ?? 0
    const computedScore = getConfidenceScore(
      confirmCount,
      clearCount,
      alert.is_verified ?? false
    )
    const normalizedScore =
      typeof alert.confidence_score === "number" ? alert.confidence_score : computedScore
    const normalizedLabel =
      alert.confidence_level === "low" ||
      alert.confidence_level === "medium" ||
      alert.confidence_level === "high"
        ? alert.confidence_level
        : getConfidenceLabel(normalizedScore)
    const normalizedReasons = Array.isArray(alert.confidence_reasons)
      ? alert.confidence_reasons.filter(
          (item): item is string => typeof item === "string"
        )
      : []

    return {
      id: alert.id,
      title: alert.title,
      city: alert.city,
      lat: alert.lat,
      lng: alert.lng,
      alertType: alert.alert_type,
      sourceType: alert.source_type,
      severity: alert.severity,
      status: alert.status,
      speciesScope: alert.species_scope,
      radiusMeters: alert.radius_meters ?? 500,
      isVerified: alert.is_verified ?? false,
      authorLabel: alert.author_label,
      description: alert.description,
      observedAt: alert.observed_at ?? null,
      createdAt: alert.created_at,
      expiresAt: alert.expires_at ?? null,
      confirmCount,
      clearCount,
      confidenceScore: normalizedScore,
      confidenceLabel: normalizedLabel,
      confidenceReasons: normalizedReasons,
      confidenceVersion:
        typeof alert.confidence_version === "string" ? alert.confidence_version : null,
      moderationLogs: (moderationLogs ?? [])
        .filter((item) => item.alert_id === alert.id)
        .slice(0, 6)
        .map((item) => ({
          id: item.id,
          action: item.action,
          previousValue: item.previous_value ?? null,
          nextValue: item.next_value ?? null,
          actorUserId: item.actor_user_id,
          createdAt: item.created_at,
        })),
    }
  })

  return {
    membership,
    stats: {
      total: rows.length,
      active: rows.filter((alert) => alert.status === "active").length,
      verified: rows.filter((alert) => alert.isVerified).length,
      highSeverity: rows.filter((alert) => alert.severity === "high").length,
      community: rows.filter((alert) => alert.sourceType === "community").length,
    },
    alerts: rows,
  }
}
