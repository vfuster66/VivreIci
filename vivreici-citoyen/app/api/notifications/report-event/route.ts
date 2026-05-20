import { NextResponse } from "next/server"
import {
  handleReportCreatedNotification,
  handleReportStatusChangedNotification,
} from "@/lib/notifications"
import type { ReportStatus } from "@/lib/reports"
import { createAdminClient } from "@/lib/supabase-admin"
import { createServerAuthClient } from "@/lib/supabase-server"

async function getAuthenticatedUserId(request: Request) {
  const authorization = request.headers.get("authorization")

  if (!authorization?.startsWith("Bearer ")) {
    return null
  }

  const accessToken = authorization.slice("Bearer ".length).trim()

  if (!accessToken) {
    return null
  }

  const supabase = createServerAuthClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken)

  if (error || !user) {
    return null
  }

  return user.id
}

async function isSuperadminUser(userId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("app_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return Boolean(data?.user_id)
}

export async function POST(request: Request) {
  try {
    const authenticatedUserId = await getAuthenticatedUserId(request)

    if (!authenticatedUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json()) as
      | {
          event: "report_created"
          reportId: string
        }
      | {
          event: "report_status_changed"
          reportId: string
          nextStatus: ReportStatus
        }

    const supabase = createAdminClient()
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("id, user_id")
      .eq("id", body.reportId)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ error: "Signalement introuvable" }, { status: 404 })
    }

    if (body.event === "report_created") {
      if (report.user_id !== authenticatedUserId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      await handleReportCreatedNotification({
        reportId: body.reportId,
        actorUserId: authenticatedUserId,
      })

      return NextResponse.json({ ok: true })
    }

    if (body.event === "report_status_changed") {
      const canUpdate =
        report.user_id === authenticatedUserId ||
        (await isSuperadminUser(authenticatedUserId))

      if (!canUpdate) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      await handleReportStatusChangedNotification({
        reportId: body.reportId,
        ownerUserId: report.user_id ?? null,
        actorUserId: authenticatedUserId,
        nextStatus: body.nextStatus,
      })

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "Unsupported event" }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de créer les notifications.",
      },
      { status: 500 }
    )
  }
}
