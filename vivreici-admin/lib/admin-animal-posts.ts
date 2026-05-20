import "server-only"

import { canAccessModeration } from "@/lib/admin-access"
import type { AdminAnimalPostsData, AdminMembership } from "@/lib/admin-types"
import { createAdminClient } from "@/lib/supabase-admin"

export async function buildAdminAnimalPostsData(
  membership: AdminMembership
): Promise<AdminAnimalPostsData> {
  if (!canAccessModeration(membership.role)) {
    throw new Error("Accès administration refusé.")
  }

  const supabase = createAdminClient()
  const { data: posts, error: postsError } = await supabase
    .from("lost_pets")
    .select(
      "id, user_id, pet_name, animal_type, city, status, description, lat, lng, last_seen_at, is_found, photo_url, created_at, accepted_response_id, confidence_score, confidence_level, confidence_reasons"
    )
    .order("created_at", { ascending: false })
    .limit(250)

  if (postsError) {
    throw postsError
  }

  const postIds = (posts ?? []).map((post) => post.id)
  const userIds = Array.from(
    new Set(
      (posts ?? [])
        .map((post) => post.user_id)
        .filter(
          (userId): userId is string =>
            typeof userId === "string" && userId.length > 0
        )
    )
  )

  const { data: responses, error: responsesError } = postIds.length
    ? await supabase.from("lost_pet_responses").select("pet_id").in("pet_id", postIds)
    : { data: [], error: null }

  const { data: profiles, error: profilesError } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name, first_name, last_name, email")
        .in("id", userIds)
    : { data: [], error: null }

  if (responsesError) {
    throw responsesError
  }

  if (profilesError) {
    throw profilesError
  }

  const responseCounts = (responses ?? []).reduce<Record<string, number>>(
    (accumulator, item) => {
      accumulator[item.pet_id] = (accumulator[item.pet_id] ?? 0) + 1
      return accumulator
    },
    {}
  )

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      profile.display_name?.trim() ||
        [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() ||
        profile.email?.trim() ||
        "Habitant local",
    ])
  )

  const rows = (posts ?? []).map((post) => ({
    id: post.id,
    petName: post.pet_name ?? null,
    animalType: post.animal_type ?? null,
    city: post.city ?? null,
    lat: post.lat,
    lng: post.lng,
    description: post.description ?? null,
    lastSeenAt: post.last_seen_at ?? null,
    status: post.status,
    isFound: Boolean(post.is_found),
    authorLabel: profileMap.get(post.user_id ?? "") ?? "Habitant local",
    createdAt: post.created_at,
    responseCount: responseCounts[post.id] ?? 0,
    acceptedResponse: Boolean(post.accepted_response_id),
    hasPhoto: Boolean(post.photo_url),
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
      active: rows.filter((post) => !post.isFound).length,
      resolved: rows.filter((post) => post.isFound).length,
      withLead: rows.filter((post) => post.acceptedResponse).length,
      highConfidence: rows.filter((post) => (post.confidenceScore ?? 0) >= 75).length,
    },
    posts: rows,
  }
}
