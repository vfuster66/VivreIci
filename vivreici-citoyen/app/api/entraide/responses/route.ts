import { NextResponse } from "next/server"
import { buildDisplayName } from "@/lib/profile"
import { createNotifications } from "@/lib/notifications"
import { createAdminClient } from "@/lib/supabase-admin"
import { createServerAuthClient } from "@/lib/supabase-server"
import {
  isValidContactEmail,
  isValidContactPhone,
  validatePublicTextFields,
} from "@/lib/contact-guard"

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

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request)

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const postId = url.searchParams.get("postId")?.trim()

    if (!postId) {
      return NextResponse.json({ error: "postId manquant" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: post, error: postError } = await supabase
      .from("help_posts")
      .select("id, user_id, accepted_response_id")
      .eq("id", postId)
      .maybeSingle()

    if (postError || !post) {
      return NextResponse.json({ error: "Annonce introuvable" }, { status: 404 })
    }

    if (post.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data, error } = await supabase
      .from("help_post_responses")
      .select(
        "id, message, responder_label, responder_avatar_url, status, created_at, contact_email, contact_phone"
      )
      .eq("post_id", postId)
      .order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({
      responses: (data ?? []).map((item) => ({
        id: item.id,
        message: item.message,
        responderLabel: item.responder_label,
        responderAvatarUrl: item.responder_avatar_url,
        status: item.status,
        createdAt: item.created_at,
        contactEmail: item.status === "accepted" ? item.contact_email : null,
        contactPhone: item.status === "accepted" ? item.contact_phone : null,
      })),
      acceptedResponseId: post.accepted_response_id ?? null,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de charger les réponses à cette annonce.",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request)

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json()) as
      | {
          action: "create"
          postId: string
          message: string
          contactEmail: string
          contactPhone: string
        }
      | {
          action: "accept"
          responseId: string
        }

    const supabase = createAdminClient()

    if (body.action === "create") {
      const publicTextError = validatePublicTextFields([
        { label: "Message", value: body.message },
      ])

      if (publicTextError) {
        return NextResponse.json({ error: publicTextError }, { status: 400 })
      }

      if (!isValidContactEmail(body.contactEmail)) {
        return NextResponse.json(
          { error: "Ajoutez une adresse email valide pour être recontacté(e)." },
          { status: 400 }
        )
      }

      if (!isValidContactPhone(body.contactPhone)) {
        return NextResponse.json(
          { error: "Ajoutez un numéro de téléphone valide pour être recontacté(e)." },
          { status: 400 }
        )
      }

      const { data: post, error: postError } = await supabase
        .from("help_posts")
        .select("id, title, user_id, status, priority")
        .eq("id", body.postId)
        .maybeSingle()

      if (postError || !post) {
        return NextResponse.json({ error: "Annonce introuvable" }, { status: 404 })
      }

      if (post.user_id === userId) {
        return NextResponse.json(
          { error: "Impossible de répondre à sa propre annonce." },
          { status: 400 }
        )
      }

      if (post.status !== "open") {
        return NextResponse.json(
          { error: "Cette annonce n'est plus ouverte." },
          { status: 400 }
        )
      }

      const { data: responderProfile, error: responderProfileError } = await supabase
        .from("profiles")
        .select("display_name, first_name, last_name, avatar_url")
        .eq("id", userId)
        .maybeSingle()

      if (responderProfileError) {
        throw responderProfileError
      }

      const responderLabel = buildDisplayName(responderProfile, "Habitant local")

      const { data, error } = await supabase
        .from("help_post_responses")
        .insert({
          post_id: post.id,
          post_owner_user_id: post.user_id,
          responder_user_id: userId,
          message: body.message.trim(),
          contact_email: body.contactEmail.trim(),
          contact_phone: body.contactPhone.trim(),
          responder_label: responderLabel,
          responder_avatar_url: responderProfile?.avatar_url ?? null,
        })
        .select("id, message, responder_label, responder_avatar_url, status, created_at")
        .single()

      if (error) {
        throw error
      }

      await createNotifications([
        {
          userId: post.user_id,
          type: "help_post_response_received",
          title: "Nouvelle réponse à votre annonce",
          message: `${responderLabel} est intéressé(e) par « ${post.title} ». Ouvrez l'annonce pour choisir.`,
          link: `/entraide?view=mine&postId=${post.id}`,
          metadata: {
            postId: post.id,
            responseId: data.id,
            actorName: responderLabel,
            actorAvatarUrl: responderProfile?.avatar_url ?? null,
          },
        },
      ])

      return NextResponse.json({
        response: {
          id: data.id,
          message: data.message,
          responderLabel: data.responder_label,
          responderAvatarUrl: data.responder_avatar_url,
          status: data.status,
          createdAt: data.created_at,
        },
      })
    }

    if (body.action === "accept") {
      const { data: responseRow, error: responseError } = await supabase
        .from("help_post_responses")
        .select(
          "id, post_id, post_owner_user_id, responder_user_id, responder_label, responder_avatar_url, contact_email, contact_phone"
        )
        .eq("id", body.responseId)
        .maybeSingle()

      if (responseError || !responseRow) {
        return NextResponse.json({ error: "Réponse introuvable" }, { status: 404 })
      }

      if (responseRow.post_owner_user_id !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      await supabase
        .from("help_post_responses")
        .update({ status: "pending", accepted_at: null })
        .eq("post_id", responseRow.post_id)
        .eq("status", "accepted")

      const { error: acceptError } = await supabase
        .from("help_post_responses")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", responseRow.id)

      if (acceptError) {
        throw acceptError
      }

      const { data: currentPost, error: currentPostError } = await supabase
        .from("help_posts")
        .select("id, priority")
        .eq("id", responseRow.post_id)
        .eq("user_id", userId)
        .maybeSingle()

      if (currentPostError || !currentPost) {
        throw currentPostError ?? new Error("Annonce introuvable.")
      }

      const followUpDelayHours = currentPost.priority === "urgent" ? 12 : 48

      const { data: post, error: postError } = await supabase
        .from("help_posts")
        .update({
          accepted_response_id: responseRow.id,
          workflow_state: "searching",
          follow_up_scheduled_at: new Date(
            Date.now() + followUpDelayHours * 60 * 60 * 1000
          ).toISOString(),
          follow_up_notified_at: null,
        })
        .eq("id", responseRow.post_id)
        .eq("user_id", userId)
        .select("id, title")
        .single()

      if (postError || !post) {
        throw postError ?? new Error("Annonce introuvable.")
      }

      await createNotifications([
        {
          userId,
          type: "help_post_contact_unlocked",
          title: "Coordonnées débloquées",
          message: `${responseRow.responder_label} a été retenu(e). Email : ${responseRow.contact_email}. Téléphone : ${responseRow.contact_phone}.`,
          link: `/entraide?view=mine&postId=${post.id}`,
          metadata: {
            postId: post.id,
            responseId: responseRow.id,
            actorName: responseRow.responder_label,
            actorAvatarUrl: responseRow.responder_avatar_url ?? null,
          },
        },
      ])

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de traiter cette réponse d'entraide.",
      },
      { status: 500 }
    )
  }
}
