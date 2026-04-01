import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"

const RESOLVED_VISIBILITY_DAYS = 14

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    throw new Error("CRON_SECRET est manquante.")
  }

  const authorization = request.headers.get("authorization")
  return authorization === `Bearer ${cronSecret}`
}

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const now = new Date().toISOString()
    const resolvedArchiveThreshold = new Date(
      Date.now() - RESOLVED_VISIBILITY_DAYS * 24 * 60 * 60 * 1000
    ).toISOString()

    const { data: archivedReports, error: archiveError } = await supabase
      .from("reports")
      .update({
        status: "archived",
        archived_at: now,
      })
      .eq("status", "resolved")
      .lte("updated_at", resolvedArchiveThreshold)
      .is("deleted_at", null)
      .select("id")

    if (archiveError) {
      throw archiveError
    }

    const { data: deletedReports, error: deleteError } = await supabase
      .from("reports")
      .update({
        deleted_at: now,
      })
      .eq("status", "archived")
      .lte("expires_at", now)
      .is("deleted_at", null)
      .select("id")

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({
      ok: true,
      archivedCount: archivedReports?.length ?? 0,
      archivedReportIds: (archivedReports ?? []).map((report) => report.id),
      deletedCount: deletedReports?.length ?? 0,
      deletedReportIds: (deletedReports ?? []).map((report) => report.id),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible d'exécuter la rétention des signalements.",
      },
      { status: 500 }
    )
  }
}
