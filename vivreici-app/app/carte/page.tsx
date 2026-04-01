import MapHomeScreen from "@/components/MapHomeScreen"

type CartePageProps = {
  searchParams?: Promise<{
    lat?: string
    lng?: string
  }>
}

export default async function CartePage({ searchParams }: CartePageProps) {
  const resolvedSearchParams = await searchParams
  const lat = Number(resolvedSearchParams?.lat)
  const lng = Number(resolvedSearchParams?.lng)
  const initialFocusCoordinates =
    Number.isFinite(lat) && Number.isFinite(lng)
      ? { lat, lng }
      : null

  return <MapHomeScreen initialFocusCoordinates={initialFocusCoordinates} />
}
