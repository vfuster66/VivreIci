import { NextResponse } from "next/server"
import { fetchDepartmentAlerts } from "@/lib/alerts"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const city = searchParams.get("city")

  try {
    const payload = await fetchDepartmentAlerts(city)
    return NextResponse.json(payload)
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de charger les alertes du département.",
      },
      { status: 500 }
    )
  }
}
