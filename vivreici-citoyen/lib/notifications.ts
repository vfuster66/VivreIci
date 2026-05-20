import "server-only"

import { parseStoredReportMetadata, type ReportStatus } from "@/lib/reports"
import { createAdminClient } from "@/lib/supabase-admin"

type NotificationType =
  | "report_created_nearby"
  | "report_updated"
  | "report_resolved"
  | "report_archived"
  | "user_report_update"
  | "department_alert_escalated"
  | "help_post_response_received"
  | "help_post_contact_unlocked"
  | "help_post_follow_up"
  | "animal_post_response_received"
  | "animal_post_contact_unlocked"
  | "animal_alert_created_nearby"

type CreateNotificationInput = {
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
  metadata?: Record<string, unknown>
}

function getDefaultCity() {
  return (process.env.VIVREICI_DEFAULT_CITY ?? "Cabestany").trim().toLowerCase()
}

function calculateDistanceMeters(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
) {
  const earthRadius = 6371000
  const lat1 = (from.lat * Math.PI) / 180
  const lat2 = (to.lat * Math.PI) / 180
  const deltaLat = ((to.lat - from.lat) * Math.PI) / 180
  const deltaLng = ((to.lng - from.lng) * Math.PI) / 180

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadius * c
}

function getStatusNotificationCopy(nextStatus: ReportStatus) {
  switch (nextStatus) {
    case "in_progress":
      return {
        type: "user_report_update" as const,
        title: "Votre signalement est en cours",
        message: "Le traitement de votre signalement a commencé.",
      }
    case "resolved":
      return {
        type: "report_resolved" as const,
        title: "Votre signalement est résolu",
        message: "Votre signalement a été marqué comme résolu.",
      }
    case "archived":
      return {
        type: "report_archived" as const,
        title: "Votre signalement est archivé",
        message: "Votre signalement a été archivé et n'apparaît plus dans les vues actives.",
      }
    default:
      return {
        type: "report_updated" as const,
        title: "Votre signalement a été mis à jour",
        message: "Le statut de votre signalement a été modifié.",
      }
  }
}

export async function createNotifications(inputs: CreateNotificationInput[]) {
  if (inputs.length === 0) {
    return
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from("notifications").insert(
    inputs.map((input) => ({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link ?? null,
      metadata: input.metadata ?? {},
    }))
  )

  if (error) {
    throw error
  }
}

export async function handleReportCreatedNotification({
  reportId,
  actorUserId,
}: {
  reportId: string
  actorUserId: string | null
}) {
  const supabase = createAdminClient()

  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("id, user_id, type, description, lat, lng")
    .eq("id", reportId)
    .single()

  if (reportError || !report) {
    throw reportError ?? new Error("Signalement introuvable.")
  }

  const city = getDefaultCity()
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select(
      "id, preferred_city, in_app_notifications, nearby_report_notifications, nearby_notifications_radius_meters, notification_lat, notification_lng"
    )
    .neq("id", actorUserId ?? "")

  if (profilesError) {
    throw profilesError
  }

  const metadata = parseStoredReportMetadata(report.description)
  const locationLabel = metadata.address ?? city
  const nearbyRecipients = (profiles ?? []).filter((profile) => {
    if (!profile.in_app_notifications || !profile.nearby_report_notifications) {
      return false
    }

    if (
      typeof profile.notification_lat === "number" &&
      typeof profile.notification_lng === "number"
    ) {
      return (
        calculateDistanceMeters(
          { lat: report.lat, lng: report.lng },
          {
            lat: profile.notification_lat,
            lng: profile.notification_lng,
          }
        ) <= profile.nearby_notifications_radius_meters
      )
    }

    const preferredCity = profile.preferred_city?.trim().toLowerCase()
    return !preferredCity || preferredCity === city
  })

  const notifications: CreateNotificationInput[] = nearbyRecipients.map((recipient) => ({
    userId: recipient.id,
    type: "report_created_nearby",
    title: "Nouveau signalement près de chez vous",
    message: `${report.type} signalé à ${locationLabel}.`,
    link: `/signalements/${report.id}`,
    metadata: { reportId: report.id },
  }))

  if (actorUserId) {
    const { data: actorProfile } = await supabase
      .from("profiles")
      .select("in_app_notifications, report_updates_notifications")
      .eq("id", actorUserId)
      .maybeSingle()

    if (!actorProfile?.in_app_notifications || !actorProfile.report_updates_notifications) {
      return await createNotifications(notifications)
    }

    notifications.push({
      userId: actorUserId,
      type: "user_report_update",
      title: "Votre signalement a été créé",
      message: "Votre signalement est maintenant visible dans l'application.",
      link: `/signalements/${report.id}`,
      metadata: { reportId: report.id },
    })
  }

  await createNotifications(notifications)
}

export async function handleReportStatusChangedNotification({
  reportId,
  ownerUserId,
  actorUserId,
  nextStatus,
}: {
  reportId: string
  ownerUserId: string | null
  actorUserId: string | null
  nextStatus: ReportStatus
}) {
  if (!ownerUserId || ownerUserId === actorUserId) {
    return
  }

  const supabase = createAdminClient()
  const { data: ownerProfile } = await supabase
    .from("profiles")
    .select("in_app_notifications, report_updates_notifications")
    .eq("id", ownerUserId)
    .maybeSingle()

  if (!ownerProfile?.in_app_notifications || !ownerProfile.report_updates_notifications) {
    return
  }

  const copy = getStatusNotificationCopy(nextStatus)

  await createNotifications([
    {
      userId: ownerUserId,
      type: copy.type,
      title: copy.title,
      message: copy.message,
      link: `/signalements/${reportId}`,
      metadata: { reportId, nextStatus },
    },
  ])
}

export async function handleAnimalAlertCreatedNotification({
  alertId,
  actorUserId,
}: {
  alertId: string
  actorUserId: string | null
}) {
  const supabase = createAdminClient()

  const { data: alert, error: alertError } = await supabase
    .from("animal_alerts")
    .select("id, title, city, lat, lng, radius_meters, severity, species_scope")
    .eq("id", alertId)
    .maybeSingle()

  if (alertError || !alert) {
    throw alertError ?? new Error("Alerte animale introuvable.")
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select(
      "id, preferred_city, in_app_notifications, animal_alert_notifications, animal_alerts_high_priority_only, nearby_notifications_radius_meters, notification_lat, notification_lng"
    )
    .neq("id", actorUserId ?? "")

  if (profilesError) {
    throw profilesError
  }

  const nearbyRecipients = (profiles ?? []).filter((profile) => {
    if (!profile.in_app_notifications || !profile.animal_alert_notifications) {
      return false
    }

    if (profile.animal_alerts_high_priority_only && alert.severity !== "high") {
      return false
    }

    if (
      typeof profile.notification_lat === "number" &&
      typeof profile.notification_lng === "number"
    ) {
      return (
        calculateDistanceMeters(
          { lat: alert.lat, lng: alert.lng },
          { lat: profile.notification_lat, lng: profile.notification_lng }
        ) <= Math.max(100, alert.radius_meters ?? profile.nearby_notifications_radius_meters)
      )
    }

    const preferredCity = profile.preferred_city?.trim().toLowerCase()
    return Boolean(preferredCity) && preferredCity === alert.city.trim().toLowerCase()
  })

  await createNotifications(
    nearbyRecipients.map((recipient) => ({
      userId: recipient.id,
      type: "animal_alert_created_nearby",
      title:
        alert.severity === "high"
          ? `Alerte animale forte : ${alert.title}`
          : `Nouvelle alerte animale : ${alert.title}`,
      message: `${alert.city} · ${alert.species_scope === "all" ? "Tous les animaux" : alert.species_scope}.`,
      link: "/animaux?tab=alerts",
      metadata: {
        alertId: alert.id,
        severity: alert.severity,
        city: alert.city,
      },
    }))
  )
}
