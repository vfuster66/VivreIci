import "server-only"

import { canAccessModeration } from "@/lib/admin-access"
import type { AdminHelpPostsData, AdminMembership } from "@/lib/admin-types"
import { createAdminClient } from "@/lib/supabase-admin"

export async function buildAdminHelpPostsData(
  membership: AdminMembership
): Promise<AdminHelpPostsData> {
  if (!canAccessModeration(membership.role)) {
    throw new Error("Accès administration refusé.")
  }

  const supabase = createAdminClient()
  const { data: posts, error: postsError } = await supabase
    .from("help_posts")
    .select(
      "id, kind, category, priority, title, summary, city, author_label, status, workflow_state, created_at, confidence_score, confidence_level, confidence_reasons"
    )
    .order("created_at", { ascending: false })
    .limit(250)

  if (postsError) {
    throw postsError
  }

  const postIds = (posts ?? []).map((post) => post.id)
  const { data: responses, error: responsesError } = postIds.length
    ? await supabase
        .from("help_post_responses")
        .select("post_id")
        .in("post_id", postIds)
    : { data: [], error: null }

  if (responsesError) {
    throw responsesError
  }

  const responseCounts = (responses ?? []).reduce<Record<string, number>>(
    (accumulator, item) => {
      accumulator[item.post_id] = (accumulator[item.post_id] ?? 0) + 1
      return accumulator
    },
    {}
  )

  const rows = (posts ?? []).map((post) => ({
    id: post.id,
    kind: post.kind,
    category: post.category,
    priority: post.priority,
    title: post.title,
    summary: post.summary,
    city: post.city,
    authorLabel: post.author_label ?? null,
    status: post.status,
    workflowState: post.workflow_state,
    responseCount: responseCounts[post.id] ?? 0,
    createdAt: post.created_at,
    confidenceScore:
      typeof post.confidence_score === "number" ? post.confidence_score : null,
    confidenceLevel:
      post.confidence_level === "low" ||
      post.confidence_level === "medium" ||
      post.confidence_level === "high"
        ? post.confidence_level
        : null,
    confidenceReasons: Array.isArray(post.confidence_reasons)
      ? post.confidence_reasons.filter(
          (item): item is string => typeof item === "string"
        )
      : [],
  }))

  return {
    membership,
    stats: {
      total: rows.length,
      open: rows.filter((post) => post.status === "open").length,
      urgent: rows.filter((post) => post.priority === "urgent").length,
      solved: rows.filter((post) => post.workflowState === "found").length,
      highConfidence: rows.filter((post) => (post.confidenceScore ?? 0) >= 75).length,
    },
    posts: rows,
  }
}
