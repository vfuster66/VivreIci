import { NextResponse } from "next/server"
import { getAdminMembershipForRequest } from "@/lib/admin-access"
import { buildAdminJournalData } from "@/lib/admin-journal"

export async function GET(request: Request) {
  try {
    const membership = await getAdminMembershipForRequest(request)

    if (!membership || membership.role !== "superadmin") {
      return NextResponse.json(
        { error: "Accès superadmin requis." },
        { status: 403 }
      )
    }

    return NextResponse.json(await buildAdminJournalData(membership))
  } catch {
    return NextResponse.json(
      {
        error: "Impossible de charger le journal admin.",
      },
      { status: 500 }
    )
  }
}
