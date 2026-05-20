import MapHomeScreen from "@/components/MapHomeScreen"
import SignalementsListView from "@/components/SignalementsListView"
import SignalementsTabs from "@/components/SignalementsTabs"

type SignalementsPageProps = {
  searchParams?: Promise<{
    lat?: string
    lng?: string
    view?: string
  }>
}

export default async function SignalementsPage({
  searchParams,
}: SignalementsPageProps) {
  const resolvedSearchParams = await searchParams
  const lat = Number(resolvedSearchParams?.lat)
  const lng = Number(resolvedSearchParams?.lng)
  const initialFocusCoordinates =
    Number.isFinite(lat) && Number.isFinite(lng)
      ? { lat, lng }
      : null
  const currentView = resolvedSearchParams?.view === "map" ? "map" : "list"
  const mapHref = initialFocusCoordinates
    ? `/signalements?view=map&lat=${lat}&lng=${lng}`
    : "/signalements?view=map"
  const listHref = "/signalements?view=list"
  const tabs = (
    <SignalementsTabs
      currentView={currentView}
      mapHref={mapHref}
      listHref={listHref}
    />
  )

  if (currentView === "map") {
    return (
      <MapHomeScreen
        initialFocusCoordinates={initialFocusCoordinates}
        title="Signalements"
        tabsSlot={tabs}
      />
    )
  }

  return <SignalementsListView tabsSlot={tabs} />
}
