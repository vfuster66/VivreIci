import "server-only"

import {
  REPORT_SELECT_WITH_ARCHIVE,
  REPORT_SELECT_WITH_HISTORY,
  formatReportDate,
  getDisplayReportReference,
  getPrimaryReportText,
  parseStoredReportMetadata,
  type ReportRecord,
} from "@/lib/reports"
import { createAdminClient } from "@/lib/supabase-admin"

type WeeklyEmailAudience = "users" | "city"
type WeeklyEmailStatus = "sent" | "dry_run" | "skipped" | "failed"

type WeeklyReportDigestItem = ReportRecord & {
  creator_email?: string | null
  creator_first_name?: string | null
}

type WeeklyDigestReport = {
  id: string
  reference: string
  type: string
  status: string | null
  createdAtLabel: string
  shortDescription: string
  fullDescription: string
  street: string
  mapLink: string
  mediaLinks: string[]
}

type WeeklyDigestPayload = {
  weekLabel: string
  periodStart: string
  periodEnd: string
  reportsCount: number
  activeCount: number
  resolvedCount: number
  archivedCount: number
  reports: WeeklyDigestReport[]
}

type WeeklyUserRecipient = {
  email: string
  firstName: string | null
}

type SendWeeklyDigestOptions = {
  dryRun?: boolean
  trigger?: string
}

const TEST_MODE = process.env.WEEKLY_REPORTS_TEST_MODE !== "false"
const DEFAULT_CITY_NAME = process.env.VIVREICI_DEFAULT_CITY ?? "Cabestany"
const FROM_EMAIL = process.env.WEEKLY_REPORTS_FROM_EMAIL ?? "noreply@vivreici.app"
const CONTACT_EMAIL =
  process.env.VIVREICI_CONTACT_EMAIL ?? process.env.WEEKLY_REPORTS_REPLY_TO ?? FROM_EMAIL
const APP_LINK = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const SUPERADMIN_USER = process.env.SUPERADMIN_USER ?? null
const REPORTS_PREVIEW_LIMIT = 5

function buildMapLink(lat: number, lng: number) {
  const url = new URL("/carte", APP_LINK)
  url.searchParams.set("lat", String(lat))
  url.searchParams.set("lng", String(lng))
  return url.toString()
}

function truncateText(text: string, maxLength: number) {
  const trimmed = text.trim()
  if (trimmed.length <= maxLength) {
    return trimmed
  }

  return `${trimmed.slice(0, maxLength - 1).trim()}…`
}

function formatWeekLabel(startDate: Date, endDate: Date) {
  const formatter = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  return `${formatter.format(startDate)} au ${formatter.format(endDate)}`
}

function getPreviousWeekRange(referenceDate = new Date()) {
  const current = new Date(referenceDate)
  current.setHours(0, 0, 0, 0)

  const day = current.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day

  const currentWeekMonday = new Date(current)
  currentWeekMonday.setDate(current.getDate() + mondayOffset)

  const start = new Date(currentWeekMonday)
  start.setDate(currentWeekMonday.getDate() - 7)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return {
    start,
    end,
    weekLabel: formatWeekLabel(start, end),
  }
}

function buildDigestReport(report: WeeklyReportDigestItem, mediaUrls: string[]) {
  const metadata = parseStoredReportMetadata(report.description)
  const fullDescription = getPrimaryReportText(report.description)

  return {
    id: report.id,
    reference: getDisplayReportReference(report),
    type: report.type,
    status: report.status,
    createdAtLabel: formatReportDate(report.created_at),
    shortDescription: truncateText(fullDescription, 120),
    fullDescription,
    street: metadata.address ?? `${report.lat.toFixed(5)}, ${report.lng.toFixed(5)}`,
    mapLink: buildMapLink(report.lat, report.lng),
    mediaLinks: mediaUrls,
  } satisfies WeeklyDigestReport
}

function buildUserEmailText(
  recipient: WeeklyUserRecipient,
  digest: WeeklyDigestPayload
) {
  const intro = recipient.firstName?.trim() ? `Bonjour ${recipient.firstName},` : "Bonjour,"
  const previewReports = digest.reports.slice(0, REPORTS_PREVIEW_LIMIT)
  const reportLines =
    previewReports.length > 0
      ? previewReports
          .map(
            (report) =>
              `- ${report.type} — ${report.street}\n  ${report.shortDescription}\n  Signalé le ${report.createdAtLabel}`
          )
          .join("\n\n")
      : "- Aucun nouveau signalement cette semaine."

  return [
    intro,
    "",
    `Voici le résumé de la semaine sur VivreIci dans votre zone (${DEFAULT_CITY_NAME}).`,
    "",
    `- ${digest.reportsCount} signalements cette semaine`,
    `- ${digest.activeCount} encore actifs`,
    `- ${digest.resolvedCount} marqués comme résolus`,
    "",
    "À retenir cette semaine :",
    "",
    reportLines,
    "",
    "Voir plus de détails dans l’application :",
    APP_LINK,
    "",
    "À bientôt,",
    "L’équipe VivreIci",
  ].join("\n")
}

function buildCityEmailText(digest: WeeklyDigestPayload) {
  const reportsBlock =
    digest.reports.length > 0
      ? digest.reports
          .map((report) => {
            const mediaLine =
              report.mediaLinks.length > 0
                ? report.mediaLinks.join(", ")
                : "Aucun média"

            return [
              `Signalement ${report.reference}`,
              `Type : ${report.type}`,
              `Rue / secteur : ${report.street}`,
              `Date : ${report.createdAtLabel}`,
              `Description : ${report.fullDescription}`,
              `Localisation : ${report.mapLink}`,
              `Médias : ${mediaLine}`,
            ].join("\n")
          })
          .join("\n\n")
      : "Aucun signalement remonté cette semaine."

  return [
    "Bonjour,",
    "",
    `Voici les signalements remontés cette semaine via l’application VivreIci pour ${DEFAULT_CITY_NAME}.`,
    "",
    "Résumé :",
    `- ${digest.reportsCount} signalements cette semaine`,
    `- ${digest.activeCount} actifs`,
    `- ${digest.resolvedCount} résolus`,
    `- ${digest.archivedCount} archivés`,
    "",
    "Détail des signalements :",
    "",
    reportsBlock,
    "",
    "Ces signalements sont issus d’une collecte terrain structurée via l’application VivreIci.",
    "",
    "Une interface dédiée permet également :",
    "- de suivre les signalements en continu",
    "- de visualiser les zones actives",
    "- d’accéder à l’historique complet",
    "",
    "Je reste disponible pour toute précision.",
    "",
    "Cordialement,",
    "VivreIci",
    CONTACT_EMAIL,
  ].join("\n")
}

async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string | string[]
  subject: string
  text: string
}) {
  const resendApiKey = process.env.RESEND_API_KEY

  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY est manquante.")
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `VivreIci <${FROM_EMAIL}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      text,
      reply_to: CONTACT_EMAIL,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Resend a rejeté l’email: ${errorText}`)
  }

  return response.json()
}

async function insertEmailLog({
  audience,
  recipient,
  subject,
  status,
  dryRun,
  payload,
  trigger,
  errorMessage,
}: {
  audience: WeeklyEmailAudience
  recipient: string
  subject: string
  status: WeeklyEmailStatus
  dryRun: boolean
  payload: WeeklyDigestPayload
  trigger: string
  errorMessage?: string
}) {
  const supabase = createAdminClient()

  await supabase.from("weekly_email_logs").insert({
    audience,
    recipient_email: recipient,
    subject,
    status,
    dry_run: dryRun,
    trigger_source: trigger,
    week_start: payload.periodStart,
    week_end: payload.periodEnd,
    reports_count: payload.reportsCount,
    payload,
    error_message: errorMessage ?? null,
  })
}

async function fetchWeeklyDigestPayload() {
  const supabase = createAdminClient()
  const { start, end, weekLabel } = getPreviousWeekRange()

  const archivedQuery = await supabase
    .from("reports")
    .select(REPORT_SELECT_WITH_ARCHIVE)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  const historyQuery =
    archivedQuery.error
      ? await supabase
          .from("reports")
          .select(REPORT_SELECT_WITH_HISTORY)
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString())
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
      : null

  const reportsData = archivedQuery.error ? historyQuery?.data : archivedQuery.data
  const reportsError = archivedQuery.error ? historyQuery?.error : archivedQuery.error

  if (reportsError) {
    throw reportsError
  }

  const reports = (reportsData ?? []) as WeeklyReportDigestItem[]
  const reportIds = reports.map((report) => report.id)

  const { data: mediaData, error: mediaError } = reportIds.length
    ? await supabase
        .from("report_media")
        .select("report_id, url, sort_order")
        .in("report_id", reportIds)
        .order("sort_order", { ascending: true })
    : { data: [], error: null }

  if (mediaError) {
    throw mediaError
  }

  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("id, first_name, email, email_notifications")

  if (profilesError) {
    throw profilesError
  }

  const mediaByReportId = new Map<string, string[]>()

  for (const media of mediaData ?? []) {
    const current = mediaByReportId.get(media.report_id) ?? []
    current.push(media.url)
    mediaByReportId.set(media.report_id, current)
  }

  const digestReports = reports.map((report) =>
    buildDigestReport(report, mediaByReportId.get(report.id) ?? [])
  )

  const payload: WeeklyDigestPayload = {
    weekLabel,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    reportsCount: reports.length,
    activeCount: reports.filter((report) =>
      ["open", "in_progress"].includes(report.status ?? "")
    ).length,
    resolvedCount: reports.filter((report) => report.status === "resolved").length,
    archivedCount: reports.filter((report) => report.status === "archived").length,
    reports: digestReports,
  }

  const userRecipients: WeeklyUserRecipient[] = Array.from(
    new Map(
      (profilesData ?? [])
        .filter((profile) => Boolean(profile.email))
        .map((profile) => [
          profile.email as string,
          {
            email: profile.email as string,
            firstName: profile.first_name,
          },
        ])
    ).values()
  )

  return { payload, userRecipients }
}

export async function sendWeeklyReportsDigest(
  options: SendWeeklyDigestOptions = {}
) {
  const { payload, userRecipients } = await fetchWeeklyDigestPayload()
  const dryRun = options.dryRun ?? false
  const trigger = options.trigger ?? "manual"
  const userSubject = "Cette semaine autour de vous avec VivreIci"
  const citySubject = `[VivreIci] Signalements hebdomadaires — semaine du ${payload.weekLabel}`
  const cityRecipient =
    TEST_MODE
      ? SUPERADMIN_USER ?? process.env.WEEKLY_REPORTS_TEST_EMAIL
      : process.env.WEEKLY_REPORTS_CITY_EMAIL

  if (!cityRecipient) {
    throw new Error(
      "SUPERADMIN_USER, WEEKLY_REPORTS_TEST_EMAIL ou WEEKLY_REPORTS_CITY_EMAIL est manquante."
    )
  }

  const results = {
    testMode: TEST_MODE,
    dryRun,
    weekLabel: payload.weekLabel,
    reportsCount: payload.reportsCount,
    userRecipients: userRecipients.length,
    cityRecipient,
    userPreview: userRecipients.slice(0, 3).map((recipient) => recipient.email),
  }

  const userEmailsToSend = TEST_MODE
    ? []
    : userRecipients

  for (const recipient of userEmailsToSend) {
    const text = buildUserEmailText(recipient, payload)

    try {
      if (!dryRun) {
        await sendEmail({
          to: recipient.email,
          subject: userSubject,
          text,
        })
      }

      await insertEmailLog({
        audience: "users",
        recipient: recipient.email,
        subject: userSubject,
        status: dryRun ? "dry_run" : "sent",
        dryRun,
        payload,
        trigger,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue"

      await insertEmailLog({
        audience: "users",
        recipient: recipient.email,
        subject: userSubject,
        status: "failed",
        dryRun,
        payload,
        trigger,
        errorMessage: message,
      })
    }
  }

  if (TEST_MODE && userRecipients.length > 0) {
    await insertEmailLog({
      audience: "users",
      recipient: cityRecipient,
      subject: `[TEST] ${userSubject}`,
      status: dryRun ? "dry_run" : "skipped",
      dryRun,
      payload,
      trigger,
    })
  }

  const cityText = buildCityEmailText(payload)

  try {
    if (!dryRun) {
      await sendEmail({
        to: cityRecipient,
        subject: citySubject,
        text: cityText,
      })
    }

    await insertEmailLog({
      audience: "city",
      recipient: cityRecipient,
      subject: citySubject,
      status: dryRun ? "dry_run" : "sent",
      dryRun,
      payload,
      trigger,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue"

    await insertEmailLog({
      audience: "city",
      recipient: cityRecipient,
      subject: citySubject,
      status: "failed",
      dryRun,
      payload,
      trigger,
      errorMessage: message,
    })

    throw error
  }

  return {
    ...results,
    payload,
  }
}
