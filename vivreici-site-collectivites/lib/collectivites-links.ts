/** URL de l’app espace collectivité (mairie), ex. http://localhost:3004 */
const collectivitesAppUrl =
  process.env.NEXT_PUBLIC_COLLECTIVITES_APP_URL?.trim() ||
  process.env.NEXT_PUBLIC_ADMIN_APP_URL?.trim()
const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim()
const marketingSiteUrl = process.env.NEXT_PUBLIC_MARKETING_SITE_URL?.trim()

export const COLLECTIVITES_LINKS = {
  adminAppUrl:
    collectivitesAppUrl && collectivitesAppUrl.length > 0
      ? collectivitesAppUrl
      : "http://localhost:3004",
  contactEmail:
    contactEmail && contactEmail.length > 0 ? contactEmail : "contact@vivreici.app",
  /** Site vitrine (mentions légales, etc.). Vide si non configuré. */
  marketingSiteBase:
    marketingSiteUrl && marketingSiteUrl.length > 0 ? marketingSiteUrl.replace(/\/$/, "") : "",
}

export function mailtoDemoCollectivites(): string {
  const q = new URLSearchParams({
    subject: "Demande de démo VivreIci Collectivités",
  })
  return `mailto:${COLLECTIVITES_LINKS.contactEmail}?${q.toString()}`
}

export function mailtoContactCollectivites(): string {
  const q = new URLSearchParams({
    subject: "Prise de contact VivreIci Collectivités",
  })
  return `mailto:${COLLECTIVITES_LINKS.contactEmail}?${q.toString()}`
}
