import "server-only"

import type { User } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase-admin"

const USERS_PAGE_SIZE = 200
const MAX_USER_PAGES = 20

export async function listAllAuthUsers() {
  const supabase = createAdminClient()
  const users: User[] = []

  for (let page = 1; page <= MAX_USER_PAGES; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: USERS_PAGE_SIZE,
    })

    if (error) {
      throw error
    }

    const pageUsers = data.users ?? []
    users.push(...pageUsers)

    if (pageUsers.length < USERS_PAGE_SIZE) {
      break
    }
  }

  return users
}
