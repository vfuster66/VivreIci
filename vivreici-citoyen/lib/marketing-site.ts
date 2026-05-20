/**
 * URL du site marketing (vivreici-site-vitrine), sans slash final.
 * Définir NEXT_PUBLIC_MARKETING_SITE_URL en production (ex. https://www.vivreici.fr).
 * En développement, si la variable est absente, défaut http://localhost:3002 (port du site marketing).
 */
export function getMarketingSiteBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_MARKETING_SITE_URL?.trim()
  if (raw) return raw.replace(/\/$/, "")
  if (process.env.NODE_ENV === "development") return "http://localhost:3002"
  return ""
}

export const MARKETING_LEGAL_PATHS = {
  privacy: "/politique-de-confidentialite",
  terms: "/conditions-generales-d-utilisation",
  cookies: "/politique-cookies",
  legal: "/mentions-legales",
} as const

export type MarketingLegalPage = keyof typeof MARKETING_LEGAL_PATHS

/**
 * Lien vers une page légale : URL absolue si le site marketing est configuré ou en dev (localhost:3002),
 * sinon pour la confidentialité uniquement le parcours in-app `/confidentialite`.
 */
export function marketingLegalHref(page: MarketingLegalPage): string {
  const base = getMarketingSiteBaseUrl()
  const path = MARKETING_LEGAL_PATHS[page]
  if (base) return `${base}${path}`
  if (page === "privacy") return "/confidentialite"
  return path
}

export function isAbsoluteHttpUrl(href: string): boolean {
  return href.startsWith("http://") || href.startsWith("https://")
}
