import { beforeEach, describe, expect, it, vi } from "vitest"

const fromMock = vi.fn()
const createNotificationsMock = vi.fn()

vi.mock("server-only", () => ({}))

vi.mock("@/lib/supabase-admin", () => ({
  createAdminClient: () => ({
    from: fromMock,
  }),
}))

vi.mock("@/lib/notifications", () => ({
  createNotifications: createNotificationsMock,
}))

describe("monitorHelpPostFollowUps", () => {
  beforeEach(() => {
    fromMock.mockReset()
    createNotificationsMock.mockReset()
  })

  it("crée des notifications de suivi pour les annonces dues", async () => {
    const posts = [
      {
        id: "post-1",
        user_id: "user-1",
        title: "Besoin de courses",
        priority: "urgent",
        status: "open",
        accepted_response_id: "resp-1",
        follow_up_scheduled_at: "2026-04-02T08:00:00.000Z",
        follow_up_notified_at: null,
      },
    ]

    const profiles = [{ id: "user-1", in_app_notifications: true }]

    const postsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      lte: vi.fn().mockResolvedValue({ data: posts, error: null }),
    }

    const profilesChain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: profiles, error: null }),
    }

    const updateChain = {
      update: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ error: null }),
    }

    fromMock
      .mockReturnValueOnce(postsChain)
      .mockReturnValueOnce(profilesChain)
      .mockReturnValueOnce(updateChain)

    const { monitorHelpPostFollowUps } = await import("./help-post-follow-up")
    const result = await monitorHelpPostFollowUps()

    expect(result.notificationsCreated).toBe(1)
    expect(createNotificationsMock).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: "user-1",
        type: "help_post_follow_up",
        title: "Suivi rapide de votre annonce urgente",
        link: "/entraide?view=mine&postId=post-1",
      }),
    ])
  })

  it("ne crée rien en dryRun", async () => {
    const posts = [
      {
        id: "post-2",
        user_id: "user-2",
        title: "Besoin d'un trajet",
        priority: "normal",
        status: "open",
        accepted_response_id: "resp-2",
        follow_up_scheduled_at: "2026-04-02T08:00:00.000Z",
        follow_up_notified_at: null,
      },
    ]

    const profiles = [{ id: "user-2", in_app_notifications: true }]

    const postsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      lte: vi.fn().mockResolvedValue({ data: posts, error: null }),
    }

    const profilesChain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: profiles, error: null }),
    }

    fromMock.mockReturnValueOnce(postsChain).mockReturnValueOnce(profilesChain)

    const { monitorHelpPostFollowUps } = await import("./help-post-follow-up")
    const result = await monitorHelpPostFollowUps({ dryRun: true })

    expect(result.notificationsCreated).toBe(1)
    expect(createNotificationsMock).not.toHaveBeenCalled()
  })
})
