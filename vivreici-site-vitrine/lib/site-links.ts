const citizenAppUrl = process.env.NEXT_PUBLIC_CITIZEN_APP_URL?.trim()
const collectivitesUrl = process.env.NEXT_PUBLIC_COLLECTIVITES_URL?.trim()
const contactMailto = process.env.NEXT_PUBLIC_CONTACT_MAILTO?.trim()

function mailtoHref(raw: string): string {
  if (raw.startsWith("mailto:")) return raw
  return `mailto:${raw}`
}

export const SITE_LINKS = {
  citizenAppUrl:
    citizenAppUrl && citizenAppUrl.length > 0 ? citizenAppUrl : "http://localhost:3000",
  collectivitesUrl:
    collectivitesUrl && collectivitesUrl.length > 0
      ? collectivitesUrl
      : "http://localhost:3003",
  /** Lien contact (mailto ou URL). Défaut `#` si non configuré. */
  contactHref:
    contactMailto && contactMailto.length > 0 ? mailtoHref(contactMailto) : "#",
}
