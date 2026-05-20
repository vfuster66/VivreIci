import { afterEach, describe, expect, it, vi } from "vitest"

import {
  getMarketingSiteBaseUrl,
  marketingLegalHref,
  MARKETING_LEGAL_PATHS,
} from "./marketing-site"

describe("marketing-site", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("utilise NEXT_PUBLIC_MARKETING_SITE_URL et retire le slash final", () => {
    vi.stubEnv("NEXT_PUBLIC_MARKETING_SITE_URL", "https://vivreici.example/")
    vi.stubEnv("NODE_ENV", "production")
    expect(getMarketingSiteBaseUrl()).toBe("https://vivreici.example")
  })

  it("en développement sans variable, pointe vers localhost:3002", () => {
    vi.stubEnv("NEXT_PUBLIC_MARKETING_SITE_URL", "")
    vi.stubEnv("NODE_ENV", "development")
    expect(getMarketingSiteBaseUrl()).toBe("http://localhost:3002")
  })

  it("en production sans variable, base vide", () => {
    vi.stubEnv("NEXT_PUBLIC_MARKETING_SITE_URL", "")
    vi.stubEnv("NODE_ENV", "production")
    expect(getMarketingSiteBaseUrl()).toBe("")
  })

  it("construit les URLs légales avec la base", () => {
    vi.stubEnv("NEXT_PUBLIC_MARKETING_SITE_URL", "https://site.test")
    vi.stubEnv("NODE_ENV", "production")
    expect(marketingLegalHref("privacy")).toBe(
      `https://site.test${MARKETING_LEGAL_PATHS.privacy}`,
    )
    expect(marketingLegalHref("legal")).toBe(`https://site.test${MARKETING_LEGAL_PATHS.legal}`)
  })

  it("sans base, la confidentialité reste in-app", () => {
    vi.stubEnv("NEXT_PUBLIC_MARKETING_SITE_URL", "")
    vi.stubEnv("NODE_ENV", "production")
    expect(marketingLegalHref("privacy")).toBe("/confidentialite")
  })

  it("sans base, les autres pages renvoient le chemin relatif du site marketing", () => {
    vi.stubEnv("NEXT_PUBLIC_MARKETING_SITE_URL", "")
    vi.stubEnv("NODE_ENV", "production")
    expect(marketingLegalHref("terms")).toBe(MARKETING_LEGAL_PATHS.terms)
  })
})
