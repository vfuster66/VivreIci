export type TerritoryInfo = {
  addressText: string | null
  territoryName: string | null
  territoryKey: string | null
}

export function normalizeTerritoryLabel(value: string | null | undefined) {
  const normalized = (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")

  return normalized || null
}

export function extractTerritoryNameFromAddress(address: string | null | undefined) {
  const trimmed = address?.trim()

  if (!trimmed) {
    return null
  }

  const segments = trimmed
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean)

  const localitySegment = segments[segments.length - 1] ?? trimmed
  const territoryName = localitySegment
    .replace(/^[0-9]{4,5}\s+/, "")
    .trim()

  return territoryName || null
}

export function buildTerritoryInfo(address: string | null | undefined): TerritoryInfo {
  const addressText = address?.trim() || null
  const territoryName = extractTerritoryNameFromAddress(addressText)

  return {
    addressText,
    territoryName,
    territoryKey: normalizeTerritoryLabel(territoryName),
  }
}
