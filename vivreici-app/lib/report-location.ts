import { formatCompactAddress } from "./report-form"

export type ReportCoordinates = {
  lat: number
  lng: number
}

export const PERPIGNAN_WORLD_CENTER: ReportCoordinates = {
  lat: 42.696236,
  lng: 2.879456,
}

export async function reverseGeocode({ lat, lng }: ReportCoordinates) {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(lat),
    lon: String(lng),
    addressdetails: "1",
  })

  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
    {
      headers: {
        Accept: "application/json",
      },
    }
  )

  if (!response.ok) {
    throw new Error("La recherche d'adresse a échoué.")
  }

  const data = (await response.json()) as {
    address?: {
      house_number?: string
      road?: string
      postcode?: string
      city?: string
      town?: string
      village?: string
      municipality?: string
    }
  }

  return formatCompactAddress(data.address)
}

export async function geocodeAddress(query: string) {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1",
    countrycodes: "fr",
    addressdetails: "1",
  })

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      headers: {
        Accept: "application/json",
      },
    }
  )

  if (!response.ok) {
    throw new Error("La recherche d'adresse a échoué.")
  }

  const data = (await response.json()) as Array<{
    lat: string
    lon: string
  }>

  const firstMatch = data[0]

  if (!firstMatch) {
    return null
  }

  return {
    lat: Number(firstMatch.lat),
    lng: Number(firstMatch.lon),
  }
}
