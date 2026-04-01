import { NextResponse } from "next/server"
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      eventName?: string
      pagePath?: string
      sessionId?: string
      metadata?: Record<string, unknown>
    }

    if (!body.eventName || !body.sessionId) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const userId = await getAuthenticatedUserId(request)
    const supabase = createAdminClient()
    const { error } = await supabase.from("analytics_events").insert({
      event_name: body.eventName,
      page_path: body.pagePath ?? null,
      session_id: body.sessionId,
      user_id: userId,
      metadata: body.metadata ?? {},
    })

    if (error) {
      throw error
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible d'enregistrer l'événement analytics.",
      },
      { status: 500 }
    )
  }
}
