import "server-only"

import { createNotifications } from "@/lib/notifications"
import { createAdminClient } from "@/lib/supabase-admin"

export async function monitorHelpPostFollowUps({ dryRun = false }: { dryRun?: boolean } = {}) {
  const supabase = createAdminClient()
  const nowIso = new Date().toISOString()

  const { data: posts, error } = await supabase
    .from("help_posts")
    .select(
      "id, user_id, title, priority, status, accepted_response_id, follow_up_scheduled_at, follow_up_notified_at"
    )
    .eq("status", "open")
    .not("accepted_response_id", "is", null)
    .not("follow_up_scheduled_at", "is", null)
    .lte("follow_up_scheduled_at", nowIso)

  if (error) {
    throw error
  }

  const duePosts = (posts ?? []).filter((post) => {
    if (!post.follow_up_scheduled_at) {
      return false
    }

    if (!post.follow_up_notified_at) {
      return true
    }

    return post.follow_up_notified_at < post.follow_up_scheduled_at
  })

  if (duePosts.length === 0) {
    return {
      ok: true,
      dryRun,
      postsChecked: 0,
      notificationsCreated: 0,
    }
  }

  const userIds = [...new Set(duePosts.map((post) => post.user_id))]
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, in_app_notifications")
    .in("id", userIds)

  if (profilesError) {
    throw profilesError
  }

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  const notifications = duePosts
    .filter((post) => profileMap.get(post.user_id)?.in_app_notifications !== false)
    .map((post) => ({
      userId: post.user_id,
      type: "help_post_follow_up" as const,
      title:
        post.priority === "urgent"
          ? "Suivi rapide de votre annonce urgente"
          : "Mise à jour de votre annonce d’entraide",
      message:
        post.priority === "urgent"
          ? "Annonce urgente: avez-vous trouvé une solution ? Clôturez-la si c’est réglé, ou laissez-la active si vous cherchez encore."
          : "Avez-vous trouvé une solution ? Clôturez l’annonce si c’est bon, ou laissez-la active si vous cherchez encore.",
      link: `/entraide?view=mine&postId=${post.id}`,
      metadata: {
        postId: post.id,
      },
    }))

  if (!dryRun && notifications.length > 0) {
    await createNotifications(notifications)

    const postIds = duePosts.map((post) => post.id)
    const { error: updateError } = await supabase
      .from("help_posts")
      .update({ follow_up_notified_at: nowIso })
      .in("id", postIds)

    if (updateError) {
      throw updateError
    }
  }

  return {
    ok: true,
    dryRun,
    postsChecked: duePosts.length,
    notificationsCreated: notifications.length,
  }
}
