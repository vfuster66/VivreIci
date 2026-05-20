import "server-only"

import {
  CONFIDENCE_VERSION,
  getAnimalPostConfidence,
  getHelpPostConfidence,
  getReportConfidence,
} from "@/lib/confidence"
import { createAdminClient } from "@/lib/supabase-admin"

type RefreshOptions = {
  dryRun?: boolean
}

export async function refreshConfidenceScores({ dryRun = false }: RefreshOptions = {}) {
  const supabase = createAdminClient()

  const [
    reportsQuery,
    reportConfirmationsQuery,
    reportAbuseQuery,
    helpPostsQuery,
    helpResponsesQuery,
    animalPostsQuery,
    animalResponsesQuery,
    animalAlertsQuery,
    animalAlertConfirmationsQuery,
  ] = await Promise.all([
    supabase
      .from("reports")
      .select("id, status, created_at")
      .is("deleted_at", null),
    supabase.from("report_confirmations").select("report_id"),
    supabase.from("report_abuse_flags").select("report_id"),
    supabase
      .from("help_posts")
      .select("id, accepted_response_id, workflow_state, priority, created_at"),
    supabase.from("help_post_responses").select("post_id"),
    supabase
      .from("lost_pets")
      .select("id, accepted_response_id, is_found, photo_url, created_at"),
    supabase.from("lost_pet_responses").select("pet_id"),
    supabase
      .from("animal_alerts")
      .select(
        "id, source_type, severity, status, is_verified, confidence_score, confidence_level, confidence_reasons"
      ),
    supabase.from("animal_alert_confirmations").select("alert_id, vote"),
  ])

  for (const result of [
    reportsQuery,
    reportConfirmationsQuery,
    reportAbuseQuery,
    helpPostsQuery,
    helpResponsesQuery,
    animalPostsQuery,
    animalResponsesQuery,
    animalAlertsQuery,
    animalAlertConfirmationsQuery,
  ]) {
    if (result.error) {
      throw result.error
    }
  }

  const reportConfirmationCounts = (reportConfirmationsQuery.data ?? []).reduce<Record<string, number>>(
    (accumulator, item) => {
      accumulator[item.report_id] = (accumulator[item.report_id] ?? 0) + 1
      return accumulator
    },
    {}
  )
  const reportAbuseCounts = (reportAbuseQuery.data ?? []).reduce<Record<string, number>>(
    (accumulator, item) => {
      accumulator[item.report_id] = (accumulator[item.report_id] ?? 0) + 1
      return accumulator
    },
    {}
  )
  const helpResponseCounts = (helpResponsesQuery.data ?? []).reduce<Record<string, number>>(
    (accumulator, item) => {
      accumulator[item.post_id] = (accumulator[item.post_id] ?? 0) + 1
      return accumulator
    },
    {}
  )
  const animalResponseCounts = (animalResponsesQuery.data ?? []).reduce<Record<string, number>>(
    (accumulator, item) => {
      accumulator[item.pet_id] = (accumulator[item.pet_id] ?? 0) + 1
      return accumulator
    },
    {}
  )
  const animalAlertCounts = (animalAlertConfirmationsQuery.data ?? []).reduce<
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

  const reportUpdates = (reportsQuery.data ?? []).map((report) => {
    const confidence = getReportConfidence({
      status: report.status,
      confirmationCount: reportConfirmationCounts[report.id] ?? 0,
      abuseCount: reportAbuseCounts[report.id] ?? 0,
      createdAt: report.created_at,
    })

    return {
      id: report.id,
      confidence_score: confidence.score,
      confidence_level: confidence.level,
      confidence_reasons: confidence.reasons,
      confidence_version: CONFIDENCE_VERSION,
      confidence_updated_at: new Date().toISOString(),
    }
  })

  const helpUpdates = (helpPostsQuery.data ?? []).map((post) => {
    const confidence = getHelpPostConfidence({
      responseCount: helpResponseCounts[post.id] ?? 0,
      acceptedResponse: Boolean(post.accepted_response_id),
      workflowState: post.workflow_state,
      priority: post.priority,
      createdAt: post.created_at,
    })

    return {
      id: post.id,
      confidence_score: confidence.score,
      confidence_level: confidence.level,
      confidence_reasons: confidence.reasons,
      confidence_version: CONFIDENCE_VERSION,
      confidence_updated_at: new Date().toISOString(),
    }
  })

  const animalPostUpdates = (animalPostsQuery.data ?? []).map((post) => {
    const confidence = getAnimalPostConfidence({
      responseCount: animalResponseCounts[post.id] ?? 0,
      acceptedResponse: Boolean(post.accepted_response_id),
      isResolved: Boolean(post.is_found),
      hasPhoto: Boolean(post.photo_url),
      createdAt: post.created_at,
    })

    return {
      id: post.id,
      confidence_score: confidence.score,
      confidence_level: confidence.level,
      confidence_reasons: confidence.reasons,
      confidence_version: CONFIDENCE_VERSION,
      confidence_updated_at: new Date().toISOString(),
    }
  })

  const animalAlertUpdates = (animalAlertsQuery.data ?? []).map((alert) => {
    const counts = animalAlertCounts[alert.id] ?? { confirmCount: 0, clearCount: 0 }
    const score = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          50 +
            Math.min(30, counts.confirmCount * 12) -
            Math.min(36, counts.clearCount * 18) +
            (alert.is_verified ? 18 : 0) +
            (alert.source_type === "official" ? 12 : alert.source_type === "system" ? 8 : 0) +
            (alert.severity === "high" ? 4 : 0) -
            (alert.status === "resolved" ? 6 : alert.status === "expired" ? 20 : 0)
        )
      )
    )
    const level = score >= 75 ? "high" : score >= 45 ? "medium" : "low"
    const reasons = [
      counts.confirmCount > 0 ? `${counts.confirmCount} confirmation(s) terrain` : "Pas encore de retour terrain",
      counts.clearCount > 0 ? `${counts.clearCount} signalement(s) de fin` : "Aucune fin signalée",
      alert.is_verified ? "Vérifiée par un admin" : "Pas encore vérifiée",
      alert.source_type === "official"
        ? "Source officielle"
        : alert.source_type === "system"
          ? "Alerte automatique"
          : "Source communautaire",
    ]

    return {
      id: alert.id,
      confidence_score: score,
      confidence_level: level,
      confidence_reasons: reasons,
      confidence_version: CONFIDENCE_VERSION,
      confidence_updated_at: new Date().toISOString(),
    }
  })

  if (!dryRun) {
    for (const [table, updates] of [
      ["reports", reportUpdates],
      ["help_posts", helpUpdates],
      ["lost_pets", animalPostUpdates],
      ["animal_alerts", animalAlertUpdates],
    ] as const) {
      if (updates.length === 0) {
        continue
      }

      const { error } = await supabase.from(table).upsert(updates, { onConflict: "id" })
      if (error) {
        throw error
      }
    }
  }

  return {
    ok: true,
    dryRun,
    reportsUpdated: reportUpdates.length,
    helpPostsUpdated: helpUpdates.length,
    animalPostsUpdated: animalPostUpdates.length,
    animalAlertsUpdated: animalAlertUpdates.length,
  }
}
