"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ExternalLink, Loader2, Search, X } from "lucide-react"
import AppTopbar from "@/components/AppTopbar"
import FeedbackBanner from "@/components/FeedbackBanner"
import { useDialogFocusTrap } from "@/lib/use-dialog-focus-trap"
import { createClient, getCurrentSessionUser } from "@/lib/supabase"

type AlertSeverity = "none" | "low" | "medium" | "high" | "critical"
type AlertOfficialLevel = "green" | "yellow" | "orange" | "red" | "black"

type AlertItem = {
  id: string
  period?: "J" | "J1" | null
  category:
    | "Météo"
    | "Air"
    | "Pollen"
    | "Séismes"
    | "Crues"
    | "Pluies"
    | "Littoral"
  title: string
  severity: AlertSeverity
  statusLabel: string
  officialLevel?: AlertOfficialLevel | null
  summary: string
  details?: string | null
  sourceName: string
  sourceUrl: string
  updatedAt?: string | null
  tags?: string[]
}

type AlertsPayload = {
  context: {
    city: string
    departmentCode: string
    departmentName: string
  }
  alerts: AlertItem[]
  generatedAt: string
}

type TerritoryMode = "profile" | "manual" | "nearby"

const CATEGORY_FILTERS = [
  { value: "all", label: "Toutes" },
  { value: "Météo", label: "Météo" },
  { value: "Pluies", label: "Pluies" },
  { value: "Littoral", label: "Littoral" },
  { value: "Air", label: "Air" },
  { value: "Pollen", label: "Pollen" },
  { value: "Séismes", label: "Séismes" },
  { value: "Crues", label: "Crues" },
] as const

const PERIOD_FILTERS = [
  { value: "all", label: "Tout" },
  { value: "J", label: "Aujourd’hui" },
  { value: "J1", label: "Demain" },
] as const

function getAlertTone(officialLevel?: AlertOfficialLevel | null, severity?: AlertSeverity) {
  if (officialLevel === "black") {
    return {
      card: "border-[#1A1A1A] bg-[#111111]",
      badge: "bg-[#1A1A1A] text-white",
      title: "text-white",
      body: "text-white/85",
      meta: "text-white/70",
      divider: "border-white/10",
      action: "bg-white text-[#111111] ring-0",
      ghostAction: "bg-white/10 text-white ring-1 ring-white/20",
    }
  }

  switch (officialLevel ?? severity) {
    case "critical":
    case "red":
      return {
        card: "border-[#F9C7CB] bg-[#FFF5F5]",
        badge: "bg-[#E30613] text-white",
        title: "text-[#1A1A1A]",
        body: "text-[#4B5563]",
        meta: "text-[#666666]",
        divider: "border-black/5",
        action: "bg-white text-[#1A1A1A] ring-1 ring-gray-200",
        ghostAction: "bg-[#FDEBEC] text-[#8A1C23] ring-1 ring-[#F2C3C7]",
      }
    case "high":
    case "orange":
      return {
        card: "border-[#FFD4B8] bg-[#FFF8F2]",
        badge: "bg-[#F97316] text-white",
        title: "text-[#1A1A1A]",
        body: "text-[#4B5563]",
        meta: "text-[#666666]",
        divider: "border-black/5",
        action: "bg-white text-[#1A1A1A] ring-1 ring-gray-200",
        ghostAction: "bg-[#FFF1E5] text-[#9A3412] ring-1 ring-[#FED7AA]",
      }
    case "medium":
    case "yellow":
      return {
        card: "border-[#F7E3A0] bg-[#FFFDF3]",
        badge: "bg-[#D6A100] text-white",
        title: "text-[#1A1A1A]",
        body: "text-[#4B5563]",
        meta: "text-[#666666]",
        divider: "border-black/5",
        action: "bg-white text-[#1A1A1A] ring-1 ring-gray-200",
        ghostAction: "bg-[#FFF8DD] text-[#8A6A00] ring-1 ring-[#F6E4A6]",
      }
    case "green":
    case "low":
      return {
        card: "border-[#D9E7C3] bg-[#F8FCF2]",
        badge: "bg-[#6B8E23] text-white",
        title: "text-[#1A1A1A]",
        body: "text-[#4B5563]",
        meta: "text-[#666666]",
        divider: "border-black/5",
        action: "bg-white text-[#1A1A1A] ring-1 ring-gray-200",
        ghostAction: "bg-[#EEF7E1] text-[#4D6B14] ring-1 ring-[#D9E7C3]",
      }
    default:
      return {
        card: "border-gray-100 bg-white",
        badge: "bg-[#F3F4F6] text-[#4B5563]",
        title: "text-[#1A1A1A]",
        body: "text-[#4B5563]",
        meta: "text-[#666666]",
        divider: "border-black/5",
        action: "bg-white text-[#1A1A1A] ring-1 ring-gray-200",
        ghostAction: "bg-[#F8F8F8] text-[#1A1A1A] ring-1 ring-gray-200",
      }
  }
}

function getOfficialLevelLabel(level?: AlertOfficialLevel | null) {
  switch (level) {
    case "yellow":
      return "Jaune"
    case "orange":
      return "Orange"
    case "red":
      return "Rouge"
    case "black":
      return "Noir"
    case "green":
      return "Vert"
    default:
      return null
  }
}

function getPeriodLabel(period?: AlertItem["period"]) {
  return period === "J1" ? "Demain" : "Aujourd’hui"
}

function isOverseasDepartmentCode(departmentCode?: string | null) {
  return departmentCode ? /^(97|98)/.test(departmentCode) : false
}

function getTerritoryModeLabel(mode: TerritoryMode) {
  switch (mode) {
    case "manual":
      return "Ville saisie"
    case "nearby":
      return "Autour de moi"
    default:
      return "Ville de référence"
  }
}

function getAlertAdvice(alert: AlertItem) {
  switch (alert.category) {
    case "Air":
      return {
        title: "Conseils qualité de l’air",
        items: [
          "Réduisez l’effort physique intense en extérieur, surtout près des axes routiers.",
          "Aérez brièvement tôt le matin ou tard le soir si l’air extérieur est moins chargé.",
          "Surveillez les symptômes respiratoires, en particulier chez les enfants, seniors et personnes asthmatiques.",
          "Privilégiez les trajets doux éloignés du trafic dense quand c’est possible.",
        ],
      }
    case "Pollen":
      return {
        title: "Conseils allergies et pollen",
        items: [
          "Aérez tôt le matin ou après la pluie, plutôt qu'en pleine journée.",
          "Rincez les cheveux et changez de vêtements après une sortie prolongée.",
          "Évitez tonte, sport intense et séchage du linge dehors pendant les pics.",
          "Gardez votre traitement de fond et consultez si les symptômes s'aggravent.",
        ],
      }
    case "Crues":
    case "Pluies":
      return {
        title: "Conseils pluie et inondation",
        items: [
          "Évitez les déplacements non essentiels et ne prenez pas la voiture vers les points bas.",
          "Éloignez-vous des cours d'eau, ponts, parkings souterrains et sous-sols.",
          "Préparez lampe, téléphone chargé, papiers essentiels et kit d'urgence.",
          "Suivez les consignes des autorités locales et évacuez uniquement si demandé.",
        ],
      }
    case "Littoral":
      return {
        title: "Conseils littoral et vagues-submersion",
        items: [
          "Évitez digues, jetées, plages et zones exposées à la houle.",
          "Ne stationnez pas près du rivage ni dans les zones basses littorales.",
          "Reportez les activités nautiques et tenez-vous informé des fermetures locales.",
          "En cas d'ordre d'évacuation, rejoignez immédiatement une zone plus haute.",
        ],
      }
    case "Séismes":
      return {
        title: "Conseils en cas de séisme",
        items: [
          "Pendant la secousse, abritez-vous et éloignez-vous des vitres et objets qui tombent.",
          "Après la secousse, sortez avec prudence et méfiez-vous des répliques.",
          "N'utilisez pas l'ascenseur et coupez gaz ou électricité si nécessaire.",
          "Suivez les consignes officielles avant de réintégrer un bâtiment endommagé.",
        ],
      }
    default:
      return {
        title: "Conseils vigilance météo",
        items: [
          "Limitez vos déplacements et reportez les activités exposées.",
          "Protégez les biens sensibles et vérifiez vos moyens de contact et de secours.",
          "Surveillez l'évolution de la vigilance et les consignes locales.",
          "En cas d'aggravation, restez à l'abri et privilégiez les informations officielles.",
        ],
      }
  }
}

function formatUpdatedAt(value?: string | null) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export default function AlertesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [payload, setPayload] = useState<AlertsPayload | null>(null)
  const [query, setQuery] = useState("")
  const [cityInput, setCityInput] = useState("")
  const [activeCity, setActiveCity] = useState<string | null>(null)
  const [profileCity, setProfileCity] = useState<string | null>(null)
  const [territoryMode, setTerritoryMode] = useState<TerritoryMode>("profile")
  const [isLocating, setIsLocating] = useState(false)
  const [categoryFilter, setCategoryFilter] =
    useState<(typeof CATEGORY_FILTERS)[number]["value"]>("all")
  const [periodFilter, setPeriodFilter] =
    useState<(typeof PERIOD_FILTERS)[number]["value"]>("J")
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadNotice, setLoadNotice] = useState<string | null>(null)
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null)
  const alertDialogRef = useDialogFocusTrap(
    selectedAlert !== null,
    () => setSelectedAlert(null)
  )

  useEffect(() => {
    let mounted = true

    async function loadAlerts() {
      setIsLoading(true)
      setLoadError(null)

      try {
        let preferredCity =
          territoryMode === "manual" || territoryMode === "nearby"
            ? activeCity?.trim() || ""
            : ""

        if (territoryMode === "profile" || !preferredCity) {
          const user = await getCurrentSessionUser(supabase)

          if (user) {
            const { data } = await supabase
              .from("profiles")
              .select("preferred_city")
              .eq("id", user.id)
              .maybeSingle()

            preferredCity = data?.preferred_city?.trim() || ""

            if (mounted) {
              setProfileCity(preferredCity || null)
              if (!activeCity && territoryMode === "profile") {
                setCityInput(preferredCity || "")
              }
            }
          }
        }

        const endpoint =
          preferredCity.length > 0
            ? `/api/alerts?city=${encodeURIComponent(preferredCity)}`
            : "/api/alerts"

        const response = await fetch(endpoint, { cache: "no-store" })
        const nextPayload = (await response.json()) as AlertsPayload & {
          error?: string
        }

        if (!response.ok) {
          throw new Error(
            nextPayload.error || "Impossible de charger les alertes du département."
          )
        }

        if (mounted) {
          setPayload(nextPayload)
          setLoadNotice(
            territoryMode === "nearby" && activeCity?.trim()
              ? `Alertes chargées pour ${nextPayload.context.departmentName} depuis votre position autour de ${nextPayload.context.city}.`
              : territoryMode === "manual" && activeCity?.trim()
              ? `Alertes chargées pour ${nextPayload.context.departmentName} depuis la ville consultée ${nextPayload.context.city}.`
              : preferredCity.length > 0
              ? `Alertes chargées pour ${nextPayload.context.departmentName} depuis votre ville de référence ${nextPayload.context.city}.`
              : `Aucune ville enregistrée. Affichage basé sur ${nextPayload.context.city}.`
          )
        }
      } catch (error) {
        if (mounted) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Impossible de charger les alertes du département."
          )
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    void loadAlerts()

    return () => {
      mounted = false
    }
  }, [activeCity, supabase, territoryMode])

  useEffect(() => {
    if (!selectedAlert) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedAlert(null)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedAlert])

  const visibleAlerts = useMemo(() => {
    const alerts = payload?.alerts ?? []

    return alerts.filter((alert) => {
      if (alert.category === "Pollen") {
        return true
      }

      return (
        alert.severity !== "none" ||
        (alert.officialLevel != null && alert.officialLevel !== "green")
      )
    })
  }, [payload])

  const filteredAlerts = useMemo(() => {
    const alerts = visibleAlerts
    const normalizedQuery = query.trim().toLowerCase()

    return alerts.filter((alert) => {
      const matchesCategory =
        categoryFilter === "all" ? true : alert.category === categoryFilter
      const matchesPeriod =
        periodFilter === "all"
          ? true
          : (alert.period ?? "J") === periodFilter

      const haystack = [
        alert.title,
        alert.category,
        alert.summary,
        alert.details ?? "",
        ...(alert.tags ?? []),
      ]
        .join(" ")
        .toLowerCase()

      const matchesQuery =
        normalizedQuery.length === 0 || haystack.includes(normalizedQuery)

      return matchesCategory && matchesPeriod && matchesQuery
    })
  }, [visibleAlerts, categoryFilter, periodFilter, query])

  const alertsSummary = useMemo(() => {
    const todayCount = visibleAlerts.filter((alert) => (alert.period ?? "J") === "J").length
    const tomorrowCount = visibleAlerts.filter((alert) => alert.period === "J1").length

    return {
      todayCount,
      tomorrowCount,
    }
  }, [visibleAlerts])

  async function activateNearbyMode() {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLoadError("La géolocalisation n’est pas disponible sur cet appareil.")
      return
    }

    setIsLocating(true)
    setLoadError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const endpoint = `https://geo.api.gouv.fr/communes?lat=${position.coords.latitude}&lon=${position.coords.longitude}&fields=nom,code,departement&format=json&geometry=centre`
          const response = await fetch(endpoint, { cache: "no-store" })

          if (!response.ok) {
            throw new Error("Impossible de déterminer la commune autour de vous.")
          }

          const data = ((await response.json()) as Array<{ nom?: string }> | null) ?? []
          const city = data[0]?.nom?.trim()

          if (!city) {
            throw new Error("Aucune commune trouvée autour de votre position.")
          }

          setActiveCity(city)
          setCityInput(city)
          setTerritoryMode("nearby")
        } catch (error) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Impossible de déterminer la commune autour de vous."
          )
        } finally {
          setIsLocating(false)
        }
      },
      (error) => {
        setIsLocating(false)

        if (error.code === error.PERMISSION_DENIED) {
          setLoadError("L’accès à votre position a été refusé.")
          return
        }

        setLoadError("Impossible de récupérer votre position.")
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    )
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      <AppTopbar
        title="Alertes"
        filterPanel={
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#666666]">
                Catégories
              </p>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORY_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setCategoryFilter(filter.value)}
                    className={`min-h-11 rounded-2xl px-3 text-xs font-semibold ${
                      categoryFilter === filter.value
                        ? "bg-[#1A1A1A] text-white"
                        : "bg-[#F8F8F8] text-[#1A1A1A]"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#666666]">
                Période
              </p>
              <div className="grid grid-cols-3 gap-2">
                {PERIOD_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setPeriodFilter(filter.value)}
                    className={`min-h-11 rounded-2xl px-3 text-xs font-semibold ${
                      periodFilter === filter.value
                        ? "bg-[#1A1A1A] text-white"
                        : "bg-[#F8F8F8] text-[#1A1A1A]"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#666666]">
                    Territoire
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#1A1A1A]">
                    {getTerritoryModeLabel(territoryMode)}
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#4B5563] ring-1 ring-gray-200">
                  {payload?.context.city ?? activeCity ?? profileCity ?? "Détection"}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTerritoryMode("profile")
                    setActiveCity(null)
                    setCityInput(profileCity ?? "")
                  }}
                  className={`min-h-11 rounded-2xl px-3 text-xs font-semibold ${
                    territoryMode === "profile"
                      ? "bg-[#1A1A1A] text-white"
                      : "bg-white text-[#1A1A1A] ring-1 ring-gray-200"
                  }`}
                >
                  Référence
                </button>
                <button
                  type="button"
                  onClick={() => setTerritoryMode("manual")}
                  className={`min-h-11 rounded-2xl px-3 text-xs font-semibold ${
                    territoryMode === "manual"
                      ? "bg-[#1A1A1A] text-white"
                      : "bg-white text-[#1A1A1A] ring-1 ring-gray-200"
                  }`}
                >
                  Ville saisie
                </button>
                <button
                  type="button"
                  onClick={() => void activateNearbyMode()}
                  className={`min-h-11 rounded-2xl px-3 text-xs font-semibold ${
                    territoryMode === "nearby"
                      ? "bg-[#1A1A1A] text-white"
                      : "bg-white text-[#1A1A1A] ring-1 ring-gray-200"
                  }`}
                >
                  {isLocating ? "Localisation..." : "Autour de moi"}
                </button>
              </div>

              {territoryMode === "manual" ? (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-gray-200">
                    <Search className="h-4 w-4 shrink-0 text-gray-400" />
                    <input
                      value={cityInput}
                      onChange={(event) => setCityInput(event.target.value)}
                      aria-label="Consulter les alertes d'une autre ville"
                      placeholder="Consulter une autre ville..."
                      className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCity(cityInput.trim() || null)
                      setTerritoryMode("manual")
                    }}
                    className="min-h-11 shrink-0 rounded-2xl bg-[#1A1A1A] px-4 text-sm font-semibold text-white"
                  >
                    Voir
                  </button>
                </div>
              ) : null}

              {territoryMode === "nearby" ? (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-[#666666]">
                    {activeCity ? `Position actuelle autour de ${activeCity}` : "Utilise votre position pour afficher les alertes proches."}
                  </p>
                  <button
                    type="button"
                    onClick={() => void activateNearbyMode()}
                    className="text-sm font-semibold text-[#1A1A1A]"
                  >
                    Actualiser
                  </button>
                </div>
              ) : territoryMode === "manual" && activeCity ? (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-[#666666]">
                    Consultation active : <span className="font-medium text-[#1A1A1A]">{activeCity}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setTerritoryMode("profile")
                      setActiveCity(null)
                      setCityInput(profileCity ?? "")
                    }}
                    className="text-sm font-semibold text-[#1A1A1A]"
                  >
                    Revenir
                  </button>
                </div>
              ) : profileCity ? (
                <p className="mt-3 text-sm text-[#666666]">
                  Ville de référence : <span className="font-medium text-[#1A1A1A]">{profileCity}</span>
                </p>
              ) : null}
            </div>
          </div>
        }
        searchPanel={
          <div className="flex items-center gap-3 rounded-2xl bg-[#F8F8F8] px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Rechercher une alerte, un risque ou une source"
              placeholder="Rechercher une alerte, un risque, une source..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>
        }
      />

      <div className="mx-auto max-w-md px-4 pt-4">
        <div className="border-b border-gray-100 pb-4">
          <p className="text-sm font-semibold text-[#1A1A1A]">
            {payload
              ? `${payload.context.departmentName} (${payload.context.departmentCode})`
              : "Département en cours de résolution"}
          </p>
          {loadNotice ? (
            <p className="mt-1 text-sm text-[#666666]" role="status" aria-live="polite">
              {loadNotice}
            </p>
          ) : null}
        </div>

        {periodFilter === "J1" ? (
          <div className="mt-3 rounded-[24px] border border-gray-200 bg-[#FBFBFB] px-4 py-3.5 text-sm leading-6 text-[#666666]">
            Les prévisions à demain concernent surtout la vigilance météo et la
            qualité de l’air. Les autres sources restent principalement centrées
            sur aujourd’hui.
          </div>
        ) : null}

        {isOverseasDepartmentCode(payload?.context.departmentCode) ? (
          <div className="mt-3 rounded-[24px] border border-gray-200 bg-[#FBFBFB] px-4 py-3.5 text-sm leading-6 text-[#666666]">
            Pour l’outre-mer, certaines sources utilisent des flux spécifiques.
            La vigilance météo officielle reste prioritaire, tandis que le
            pollen, la qualité de l’air ou les crues peuvent varier selon le
            territoire.
          </div>
        ) : null}

        {loadError ? (
          <FeedbackBanner variant="error" className="mt-4">
            {loadError}
          </FeedbackBanner>
        ) : null}

        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="font-medium text-[#1A1A1A]">
            {filteredAlerts.length} alerte(s) affichée(s)
          </p>
          {payload?.generatedAt ? (
            <p className="text-[#666666]">
              {periodFilter === "all"
                ? `${alertsSummary.todayCount} aujourd’hui · ${alertsSummary.tomorrowCount} demain`
                : new Intl.DateTimeFormat("fr-FR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(payload.generatedAt))}
            </p>
          ) : null}
        </div>

        {isLoading ? (
          <div className="py-10 text-sm text-[#666666]">
            <div className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement des alertes départementales...
            </div>
          </div>
        ) : null}

        {!isLoading && filteredAlerts.length === 0 ? (
          <div className="mt-4 rounded-[24px] bg-[#FBFBFB] px-4 py-5 text-sm leading-6 text-[#666666] ring-1 ring-gray-100">
            Aucune alerte officielle active pour les filtres en cours. Le pollen
            reste affiché quand il est disponible.
          </div>
        ) : null}

        {!isLoading && filteredAlerts.length > 0 ? (
          <div className="mt-4 space-y-3">
            {filteredAlerts.map((alert) => {
              const styles = getAlertTone(alert.officialLevel, alert.severity)
              const updatedAt = formatUpdatedAt(alert.updatedAt)
              const officialLevelLabel = getOfficialLevelLabel(alert.officialLevel)
              const periodLabel = getPeriodLabel(alert.period)

              return (
                <article
                  key={alert.id}
                  className={`rounded-[24px] border px-4 py-4 ${styles.card}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className={`text-xs font-semibold uppercase tracking-[0.14em] ${styles.meta}`}
                      >
                        {alert.category} · {periodLabel}
                      </p>
                      <h2 className={`mt-1 text-base font-semibold ${styles.title}`}>
                        {alert.title}
                      </h2>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {officialLevelLabel ? (
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${styles.badge}`}
                        >
                          {officialLevelLabel}
                        </span>
                      ) : (
                        <span className={`text-xs font-medium ${styles.meta}`}>
                          {alert.statusLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className={`mt-3 text-sm leading-6 ${styles.body}`}>
                    {alert.summary}
                  </p>

                  <div className={`mt-4 flex items-center justify-between gap-3 border-t pt-3 ${styles.divider}`}>
                    <div className={`min-w-0 text-xs ${styles.meta}`}>
                      <p className="truncate">Source : {alert.sourceName}</p>
                      {updatedAt ? <p className="truncate">Maj : {updatedAt}</p> : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedAlert(alert)}
                        className={`inline-flex items-center rounded-full px-3 py-2 text-sm font-semibold ${styles.ghostAction}`}
                      >
                        Conseils
                      </button>
                      <Link
                        href={alert.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold ${styles.action}`}
                      >
                        Source
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : null}

      </div>

      {selectedAlert ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/45 p-4 sm:items-center sm:justify-center"
          onClick={() => setSelectedAlert(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="alert-modal-title"
            ref={alertDialogRef}
            tabIndex={-1}
            className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#666666]">
                    {selectedAlert.category}
                  </p>
                  <span className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[11px] font-semibold text-[#4B5563]">
                    {getPeriodLabel(selectedAlert.period)}
                  </span>
                  {getOfficialLevelLabel(selectedAlert.officialLevel) ? (
                    <span className="rounded-full bg-[#1A1A1A] px-2.5 py-1 text-[11px] font-semibold text-white">
                      {getOfficialLevelLabel(selectedAlert.officialLevel)}
                    </span>
                  ) : null}
                </div>
                <h2
                  id="alert-modal-title"
                  className="mt-1 text-lg font-semibold text-[#1A1A1A]"
                >
                  {selectedAlert.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#F8F8F8] text-[#1A1A1A]"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm font-semibold text-[#1A1A1A]">
                  {getAlertAdvice(selectedAlert).title}
                </p>
                <ul className="mt-2 space-y-2 text-sm leading-6 text-[#666666]">
                  {getAlertAdvice(selectedAlert).items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1A1A1A]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {selectedAlert.details ? (
                <div className="rounded-[20px] bg-[#FBFBFB] px-4 py-3 ring-1 ring-gray-100">
                  <p className="text-sm font-semibold text-[#1A1A1A]">Détail</p>
                  <p className="mt-1 text-sm leading-6 text-[#666666]">
                    {selectedAlert.details}
                  </p>
                </div>
              ) : null}

              <div className="flex justify-end">
                <Link
                  href={selectedAlert.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Consulter la source
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
