export type Coordinates = {
  lat: number
  lng: number
}

export async function geocodePlaceInFrance(query: string) {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1",
    countrycodes: "fr",
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
    throw new Error("La recherche de lieu a échoué.")
  }

  const results = (await response.json()) as Array<{
    lat: string
    lon: string
  }>

  const firstResult = results[0]

  if (!firstResult) {
    return null
  }

  return {
    lat: Number(firstResult.lat),
    lng: Number(firstResult.lon),
  } satisfies Coordinates
}
