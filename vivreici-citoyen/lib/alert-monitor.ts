import "server-only"

import { fetchDepartmentAlerts, resolveDepartmentContext, type AlertItem } from "@/lib/alerts"
import { createNotifications } from "@/lib/notifications"
import { createAdminClient } from "@/lib/supabase-admin"

type DepartmentAlertStateRecord = {
  department_code: string
  department_name: string
  alert_key: string
  alert_title: string
  category: string
  official_level: "green" | "yellow" | "orange" | "red" | "black"
  official_rank: number
  alert_snapshot: Record<string, unknown>
  last_changed_at: string
  last_seen_at: string
  created_at: string
  updated_at: string
}

type DepartmentRecipient = {
  userId: string
  preferredCity: string
}

type DepartmentRecipientsGroup = {
  departmentCode: string
  departmentName: string
  city: string
  recipients: DepartmentRecipient[]
}

function getOfficialLevelRank(level: AlertItem["officialLevel"]) {
  switch (level) {
    case "black":
      return 5
    case "red":
      return 4
    case "orange":
      return 3
    case "yellow":
      return 2
    case "green":
      return 1
    default:
      return 0
  }
}

function getOfficialLevelLabel(level: AlertItem["officialLevel"]) {
  switch (level) {
    case "black":
      return "noir"
    case "red":
      return "rouge"
    case "orange":
      return "orange"
    case "yellow":
      return "jaune"
    case "green":
      return "vert"
    default:
      return "inconnu"
  }
}

function shouldNotifyForEscalation(previousRank: number | null, nextRank: number) {
  if (previousRank == null) {
    return false
  }

  return nextRank >= 3 && nextRank > previousRank
}

function buildAlertKey(alert: AlertItem) {
  return alert.id
}

async function loadRecipientsByDepartment() {
  const supabase = createAdminClient()
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, preferred_city, in_app_notifications")
    .eq("in_app_notifications", true)
    .not("preferred_city", "is", null)

  if (error) {
    throw error
  }

  const contextByCity = new Map<
    string,
    {
      departmentCode: string
      departmentName: string
      city: string
    }
  >()
  const recipientsByDepartment = new Map<string, DepartmentRecipientsGroup>()

  for (const profile of profiles ?? []) {
    const preferredCity = profile.preferred_city?.trim()

    if (!preferredCity) {
      continue
    }

    let context = contextByCity.get(preferredCity.toLowerCase())

    if (!context) {
      const resolved = await resolveDepartmentContext(preferredCity).catch(() => null)

      if (!resolved) {
        continue
      }

      context = {
        departmentCode: resolved.departmentCode,
        departmentName: resolved.departmentName,
        city: resolved.city,
      }
      contextByCity.set(preferredCity.toLowerCase(), context)
    }

    const existing = recipientsByDepartment.get(context.departmentCode)

    if (existing) {
      existing.recipients.push({
        userId: profile.id,
        preferredCity,
      })
      continue
    }

    recipientsByDepartment.set(context.departmentCode, {
      departmentCode: context.departmentCode,
      departmentName: context.departmentName,
      city: context.city,
      recipients: [
        {
          userId: profile.id,
          preferredCity,
        },
      ],
    })
  }

  return Array.from(recipientsByDepartment.values())
}

export async function monitorDepartmentAlerts({
  dryRun = false,
}: {
  dryRun?: boolean
} = {}) {
  const supabase = createAdminClient()
  const departmentGroups = await loadRecipientsByDepartment()
  const previousStatesByDepartment = new Map<string, Map<string, DepartmentAlertStateRecord>>()

  if (departmentGroups.length === 0) {
    return {
      ok: true,
      dryRun,
      departmentsChecked: 0,
      notificationsCreated: 0,
      escalations: [],
    }
  }

  const { data: existingStates, error: statesError } = await supabase
    .from("department_alert_states")
    .select("*")
    .in(
      "department_code",
      departmentGroups.map((group) => group.departmentCode)
    )

  if (statesError) {
    throw statesError
  }

  for (const state of existingStates ?? []) {
    const byDepartment =
      previousStatesByDepartment.get(state.department_code) ??
      new Map<string, DepartmentAlertStateRecord>()
    byDepartment.set(state.alert_key, state)
    previousStatesByDepartment.set(state.department_code, byDepartment)
  }

  const now = new Date().toISOString()
  const stateUpserts: Array<Record<string, unknown>> = []
  const notifications = []
  const escalations: Array<Record<string, unknown>> = []

  for (const departmentGroup of departmentGroups) {
    const payload = await fetchDepartmentAlerts(departmentGroup.city)
    const previousStates =
      previousStatesByDepartment.get(departmentGroup.departmentCode) ?? new Map()
    const seenKeys = new Set<string>()

    for (const alert of payload.alerts.filter((item) => item.officialLevel != null)) {
      if (alert.period === "J1") {
        continue
      }

      const alertKey = buildAlertKey(alert)
      const officialRank = getOfficialLevelRank(alert.officialLevel)
      const previousState = previousStates.get(alertKey)

      seenKeys.add(alertKey)

      if (shouldNotifyForEscalation(previousState?.official_rank ?? null, officialRank)) {
        escalations.push({
          departmentCode: departmentGroup.departmentCode,
          departmentName: departmentGroup.departmentName,
          alertKey,
          title: alert.title,
          officialLevel: alert.officialLevel,
          previousLevel: previousState?.official_level ?? null,
        })

        notifications.push(
          ...departmentGroup.recipients.map((recipient) => ({
            userId: recipient.userId,
            type: "department_alert_escalated" as const,
            title: `Alerte ${getOfficialLevelLabel(alert.officialLevel)} : ${alert.title}`,
            message: `${departmentGroup.departmentName} passe en niveau ${getOfficialLevelLabel(alert.officialLevel)} pour ${alert.title.toLowerCase()}.`,
            link: "/alertes",
            metadata: {
              departmentCode: departmentGroup.departmentCode,
              departmentName: departmentGroup.departmentName,
              alertKey,
              alertTitle: alert.title,
              category: alert.category,
              officialLevel: alert.officialLevel,
              previousLevel: previousState?.official_level ?? null,
            },
          }))
        )
      }

      stateUpserts.push({
        department_code: departmentGroup.departmentCode,
        department_name: departmentGroup.departmentName,
        alert_key: alertKey,
        alert_title: alert.title,
        category: alert.category,
        official_level: alert.officialLevel,
        official_rank: officialRank,
        alert_snapshot: {
          category: alert.category,
          title: alert.title,
          statusLabel: alert.statusLabel,
          summary: alert.summary,
          details: alert.details ?? null,
          updatedAt: alert.updatedAt ?? null,
        },
        last_changed_at:
          previousState && previousState.official_rank === officialRank
            ? previousState.last_changed_at
            : now,
        last_seen_at: now,
        updated_at: now,
      })
    }

    for (const previousState of previousStates.values()) {
      if (seenKeys.has(previousState.alert_key)) {
        continue
      }

      stateUpserts.push({
        department_code: previousState.department_code,
        department_name: previousState.department_name,
        alert_key: previousState.alert_key,
        alert_title: previousState.alert_title,
        category: previousState.category,
        official_level: "green",
        official_rank: 1,
        alert_snapshot: previousState.alert_snapshot,
        last_changed_at:
          previousState.official_rank === 1 ? previousState.last_changed_at : now,
        last_seen_at: now,
        updated_at: now,
      })
    }
  }

  if (!dryRun && stateUpserts.length > 0) {
    const { error: upsertError } = await supabase
      .from("department_alert_states")
      .upsert(stateUpserts, { onConflict: "department_code,alert_key" })

    if (upsertError) {
      throw upsertError
    }
  }

  if (!dryRun) {
    await createNotifications(notifications)
  }

  return {
    ok: true,
    dryRun,
    departmentsChecked: departmentGroups.length,
    notificationsCreated: notifications.length,
    escalations,
  }
}
