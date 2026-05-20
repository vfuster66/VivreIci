const FALLBACK_CITIZEN_APP_URL = "http://localhost:3000"

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_CITIZEN_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    FALLBACK_CITIZEN_APP_URL
  ).replace(/\/+$/, "")
}

export function buildCitizenAppUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${getBaseUrl()}${normalizedPath}`
}
