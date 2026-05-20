import { NextResponse } from "next/server"
import { getAdminMembershipForRequest } from "@/lib/admin-access"
import { buildAdminOverviewData } from "@/lib/admin-overview"

export async function GET(request: Request) {
  try {
    const membership = await getAdminMembershipForRequest(request)

    if (!membership) {
      return NextResponse.json(
        { error: "Accès administration refusé." },
        { status: 403 }
      )
    }

    return NextResponse.json(await buildAdminOverviewData(membership))
  } catch {
    return NextResponse.json(
      {
        error: "Impossible de charger la vue d'ensemble admin.",
      },
      { status: 500 }
    )
  }
}
