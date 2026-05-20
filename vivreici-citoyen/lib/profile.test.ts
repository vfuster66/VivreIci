import { describe, expect, it } from "vitest"
import {
  buildDisplayName,
  formatConsentDate,
  getProfileInitials,
  isAnonymousUser,
} from "./profile"

describe("buildDisplayName", () => {
  it("privilégie le display name", () => {
    expect(
      buildDisplayName({
        display_name: "Virginie L.",
        first_name: "Virginie",
        last_name: "Lopez",
      })
    ).toBe("Virginie L.")
  })

  it("compose le prénom et le nom sinon", () => {
    expect(
      buildDisplayName({
        first_name: "Virginie",
        last_name: "Lopez",
      })
    ).toBe("Virginie Lopez")
  })
})

describe("getProfileInitials", () => {
  it("retourne les initiales du nom affiché", () => {
    expect(
      getProfileInitials({
        first_name: "Virginie",
        last_name: "Lopez",
      })
    ).toBe("VL")
  })
})

describe("isAnonymousUser", () => {
  it("détecte le provider anonymous", () => {
    expect(
      isAnonymousUser({
        app_metadata: {
          provider: "anonymous",
        },
      })
    ).toBe(true)
  })
})

describe("formatConsentDate", () => {
  it("gère les dates absentes", () => {
    expect(formatConsentDate(null)).toBe("Non renseigné")
  })
})
