import { NextResponse } from "next/server"
import { sendWeeklyReportsDigest } from "@/lib/weekly-reports"

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

    const { searchParams } = new URL(request.url)
    const dryRun = searchParams.get("dryRun") === "true"
    const result = await sendWeeklyReportsDigest({
      dryRun,
      trigger: "cron",
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de générer le résumé hebdomadaire.",
      },
      { status: 500 }
    )
  }
}
