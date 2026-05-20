import { redirect } from "next/navigation"

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
  const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng)

  if (hasCoordinates) {
    redirect(`/signalements?view=map&lat=${lat}&lng=${lng}`)
  }

  redirect("/signalements?view=map")
}
