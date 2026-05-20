import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getAdminMembershipForRequest } from "@/lib/admin-access"
import { buildCitizenAppUrl } from "@/lib/citizen-app-url"
import { createAdminClient } from "@/lib/supabase-admin"
import { buildAdminUsersData } from "@/lib/admin-users"

function createPublicAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    throw new Error("Configuration Supabase publique manquante.")
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function buildTemporaryPassword() {
  return `Tmp-${crypto.randomUUID()}-A1!`
}

async function buildUsersPayload(request: Request) {
  const membership = await getAdminMembershipForRequest(request)

  if (!membership || membership.role !== "superadmin") {
    throw new Error("Accès superadmin requis.")
  }

  return buildAdminUsersData(membership)
}

export async function GET(request: Request) {
  try {
    const payload = await buildUsersPayload(request)
    return NextResponse.json(payload)
  } catch {
    return NextResponse.json(
      {
        error: "Impossible de charger les utilisateurs.",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const membership = await getAdminMembershipForRequest(request)

    if (!membership || membership.role !== "superadmin") {
      return NextResponse.json(
        { error: "Accès superadmin requis." },
        { status: 403 }
      )
    }

    const body = (await request.json()) as {
      email?: string
      displayName?: string
    }

    if (!body.email?.trim()) {
      return NextResponse.json(
        { error: "Email requis." },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const email = body.email.trim()
    const displayName = body.displayName?.trim() || null
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: buildTemporaryPassword(),
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
      },
    })

    if (error || !data.user) {
      throw error ?? new Error("Création utilisateur impossible.")
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: data.user.id,
      email,
      display_name: displayName,
    })

    if (profileError) {
      throw profileError
    }

    const publicAuth = createPublicAuthClient()
    const { error: resetError } = await publicAuth.auth.resetPasswordForEmail(email, {
      redirectTo: buildCitizenAppUrl("/reinitialisation-mot-de-passe"),
    })

    if (resetError) {
      throw resetError
    }

    const { error: auditError } = await supabase.from("admin_audit_logs").insert({
      actor_user_id: membership.userId,
      target_user_id: data.user.id,
      action: "user_created",
      previous_role: membership.role,
      next_role: membership.role,
      organization_name: membership.organizationName,
      territory_label: membership.territoryLabel,
      metadata: {
        email,
        title: displayName || email,
        passwordSetup: "reset_email_sent",
      },
    })

    if (auditError) {
      throw auditError
    }

    return NextResponse.json({ success: true, id: data.user.id })
  } catch {
    return NextResponse.json(
      {
        error: "Impossible de créer cet utilisateur.",
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const membership = await getAdminMembershipForRequest(request)

    if (!membership || membership.role !== "superadmin") {
      return NextResponse.json(
        { error: "Accès superadmin requis." },
        { status: 403 }
      )
    }

    const body = (await request.json()) as {
      userId?: string
      email?: string
      displayName?: string
      action?: "update" | "reset_password"
    }

    if (!body.userId) {
      return NextResponse.json({ error: "Utilisateur manquant." }, { status: 400 })
    }

    const supabase = createAdminClient()

    if (body.action === "reset_password") {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
        body.userId
      )

      if (userError || !userData.user?.email) {
        throw userError ?? new Error("Email utilisateur introuvable.")
      }

      const publicAuth = createPublicAuthClient()
      const { data: membershipRow } = await supabase
        .from("app_admins")
        .select("role")
        .eq("user_id", body.userId)
        .maybeSingle()
      const redirectTo =
        membershipRow?.role === "superadmin" ||
        membershipRow?.role === "admin" ||
        membershipRow?.role === "mairie"
          ? new URL("/reinitialisation-mot-de-passe", request.url).toString()
          : buildCitizenAppUrl("/reinitialisation-mot-de-passe")
      const { error: resetError } = await publicAuth.auth.resetPasswordForEmail(
        userData.user.email,
        { redirectTo }
      )

      if (resetError) {
        throw resetError
      }

      const { error: auditError } = await supabase.from("admin_audit_logs").insert({
        actor_user_id: membership.userId,
        target_user_id: body.userId,
        action: "user_password_reset_requested",
        previous_role: membership.role,
        next_role: membership.role,
        organization_name: membership.organizationName,
        territory_label: membership.territoryLabel,
        metadata: {
          email: userData.user.email,
          title: userData.user.email,
        },
      })

      if (auditError) {
        throw auditError
      }

      return NextResponse.json({ success: true })
    }

    if (!body.email?.trim()) {
      return NextResponse.json({ error: "Email manquant." }, { status: 400 })
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(body.userId, {
      email: body.email.trim(),
      user_metadata: {
        display_name: body.displayName?.trim() || null,
      },
    })

    if (updateError) {
      throw updateError
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: body.userId,
      email: body.email.trim(),
      display_name: body.displayName?.trim() || null,
    })

    if (profileError) {
      throw profileError
    }

    const { error: auditError } = await supabase.from("admin_audit_logs").insert({
      actor_user_id: membership.userId,
      target_user_id: body.userId,
      action: "user_updated",
      previous_role: membership.role,
      next_role: membership.role,
      organization_name: membership.organizationName,
      territory_label: membership.territoryLabel,
      metadata: {
        email: body.email.trim(),
        title: body.displayName?.trim() || body.email.trim(),
      },
    })

    if (auditError) {
      throw auditError
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      {
        error: "Impossible de mettre à jour cet utilisateur.",
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const membership = await getAdminMembershipForRequest(request)

    if (!membership || membership.role !== "superadmin") {
      return NextResponse.json(
        { error: "Accès superadmin requis." },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "Utilisateur manquant." }, { status: 400 })
    }

    if (userId === membership.userId) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas supprimer votre propre compte ici." },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const { data: adminRows, error: adminError } = await supabase
      .from("app_admins")
      .select("user_id, role")
      .in("role", ["superadmin"])

    if (adminError) {
      throw adminError
    }

    const isLastSuperadmin =
      (adminRows ?? []).filter((row) => row.role === "superadmin").length <= 1 &&
      (adminRows ?? []).some((row) => row.user_id === userId)

    if (isLastSuperadmin) {
      return NextResponse.json(
        { error: "Le dernier superadmin ne peut pas être supprimé." },
        { status: 400 }
      )
    }

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)

    if (userError) {
      throw userError
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)

    if (deleteError) {
      throw deleteError
    }

    const { error: auditError } = await supabase.from("admin_audit_logs").insert({
      actor_user_id: membership.userId,
      target_user_id: userId,
      action: "user_deleted",
      previous_role: membership.role,
      next_role: membership.role,
      organization_name: membership.organizationName,
      territory_label: membership.territoryLabel,
      metadata: {
        email: userData.user?.email ?? null,
        title: userData.user?.email ?? userId,
      },
    })

    if (auditError) {
      throw auditError
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      {
        error: "Impossible de supprimer cet utilisateur.",
      },
      { status: 500 }
    )
  }
}
