export type AnimalAlertType =
  | "processionnaires"
  | "epillets"
  | "tiques"
  | "puces"
  | "plantes_toxiques"
  | "cyanobacteries"
  | "chaleur"
  | "autre"

export type AnimalAlertSeverity = "medium" | "high"
export type AnimalAlertSourceType = "community" | "official" | "system"
export type AnimalAlertStatus = "active" | "resolved" | "expired"
export type AnimalSpeciesScope = "all" | "cat" | "dog" | "bird" | "nac" | "multiple"

export type AnimalAlertRecord = {
  id: string
  user_id: string
  alert_type: AnimalAlertType
  title: string
  description: string
  city: string
  lat: number
  lng: number
  radius_meters: number
  severity: AnimalAlertSeverity
  status: AnimalAlertStatus
  source_type: AnimalAlertSourceType
  species_scope: AnimalSpeciesScope
  observed_at: string | null
  expires_at: string | null
  is_verified: boolean
  author_label: string
  author_avatar_url: string | null
  created_at: string
  updated_at: string
}

export type AnimalAlertConfirmationVote = "confirm" | "clear"

export type AnimalAlertConfirmationRecord = {
  id: string
  alert_id: string
  user_id: string
  vote: AnimalAlertConfirmationVote
  created_at: string
  updated_at: string
}

export type AnimalSeasonalAlertCard = {
  id: string
  type: AnimalAlertType
  title: string
  severity: AnimalAlertSeverity
  summary: string
  seasonLabel: string
  actions: string[]
}

export const ANIMAL_ALERT_TYPE_OPTIONS: Array<{
  value: AnimalAlertType
  label: string
}> = [
  { value: "processionnaires", label: "Chenilles processionnaires" },
  { value: "epillets", label: "Épillets" },
  { value: "tiques", label: "Tiques" },
  { value: "puces", label: "Puces" },
  { value: "plantes_toxiques", label: "Plantes toxiques" },
  { value: "cyanobacteries", label: "Cyanobactéries" },
  { value: "chaleur", label: "Chaleur" },
  { value: "autre", label: "Autre risque" },
]

export const ANIMAL_ALERT_SEVERITY_OPTIONS: Array<{
  value: AnimalAlertSeverity
  label: string
}> = [
  { value: "high", label: "Vigilance forte" },
  { value: "medium", label: "À surveiller" },
]

export const ANIMAL_ALERT_RADIUS_OPTIONS = [
  { value: 250, label: "250 m" },
  { value: 500, label: "500 m" },
  { value: 1000, label: "1 km" },
  { value: 2000, label: "2 km" },
] as const

export const ANIMAL_SPECIES_SCOPE_OPTIONS: Array<{
  value: AnimalSpeciesScope
  label: string
}> = [
  { value: "all", label: "Tous les animaux" },
  { value: "dog", label: "Chiens" },
  { value: "cat", label: "Chats" },
  { value: "bird", label: "Oiseaux" },
  { value: "nac", label: "NAC" },
  { value: "multiple", label: "Plusieurs espèces" },
]

export function getAnimalAlertTypeLabel(type: AnimalAlertType) {
  return (
    ANIMAL_ALERT_TYPE_OPTIONS.find((option) => option.value === type)?.label ??
    "Risque animalier"
  )
}

export function getAnimalAlertSourceLabel(sourceType: AnimalAlertSourceType) {
  switch (sourceType) {
    case "official":
      return "Officielle"
    case "system":
      return "Automatique"
    default:
      return "Communautaire"
  }
}

export function getAnimalSpeciesScopeLabel(scope: AnimalSpeciesScope) {
  return (
    ANIMAL_SPECIES_SCOPE_OPTIONS.find((option) => option.value === scope)?.label ??
    "Tous les animaux"
  )
}

export function getAnimalSeasonalAlerts(preferredCity?: string | null) {
  const month = new Date().getMonth()
  const territoryLabel = preferredCity?.trim()
    ? `Autour de ${preferredCity.trim()}`
    : "Dans votre secteur"
  const alerts: AnimalSeasonalAlertCard[] = []

  if (month >= 0 && month <= 4) {
    alerts.push({
      id: "processionnaires",
      type: "processionnaires",
      title: "Chenilles processionnaires",
      severity: "high",
      seasonLabel: "Hiver · printemps",
      summary: `${territoryLabel}, restez vigilant pendant les promenades dans les pins, cèdres et zones boisées.`,
      actions: [
        "Évitez le contact avec les nids, files au sol et zones suspectes.",
        "Tenez votre chien en laisse courte près des arbres à risque.",
        "En cas de contact, rincez sans frotter et contactez vite un vétérinaire.",
      ],
    })
  }

  if (month >= 3 && month <= 7) {
    alerts.push({
      id: "epillets",
      type: "epillets",
      title: "Épillets et herbes sèches",
      severity: "high",
      seasonLabel: "Printemps · été",
      summary: `${territoryLabel}, les épillets sont fréquents dans les herbes hautes, bords de chemins et terrains secs.`,
      actions: [
        "Inspectez pattes, oreilles, yeux et truffe après chaque sortie.",
        "Évitez les hautes herbes sèches si l’animal a un pelage long.",
        "Boiterie, éternuements ou gêne soudaine: vétérinaire sans attendre.",
      ],
    })
  }

  if (month >= 3 && month <= 9) {
    alerts.push({
      id: "tiques",
      type: "tiques",
      title: "Tiques et parasites saisonniers",
      severity: "medium",
      seasonLabel: "Printemps · automne",
      summary: `${territoryLabel}, les zones végétalisées et humides augmentent le risque après promenade.`,
      actions: [
        "Vérifiez le pelage après sortie, surtout cou, aisselles et ventre.",
        "Retirez rapidement toute tique avec un tire-tique adapté.",
        "Gardez à jour la prévention antiparasitaire avec votre vétérinaire.",
      ],
    })
  }

  if (month >= 3 && month <= 8) {
    alerts.push({
      id: "plantes-toxiques",
      type: "plantes_toxiques",
      title: "Plantes et jardins toxiques",
      severity: "medium",
      seasonLabel: "Printemps · été",
      summary: `${territoryLabel}, jardins, balcons et parcs peuvent contenir des plantes irritantes ou toxiques.`,
      actions: [
        "Surveillez les jeunes animaux qui mâchent feuilles, fleurs ou graines.",
        "Évitez l’accès aux lauriers, lys, muguet, ricin et engrais de jardin.",
        "Vomissements, salivation ou abattement: centre antipoison vétérinaire ou vétérinaire.",
      ],
    })
  }

  if (month >= 5 && month <= 8) {
    alerts.push({
      id: "cyanobacteries",
      type: "cyanobacteries",
      title: "Eaux stagnantes et cyanobactéries",
      severity: "high",
      seasonLabel: "Été",
      summary: `${territoryLabel}, plans d’eau chauds ou stagnants peuvent devenir dangereux pour les chiens.`,
      actions: [
        "Évitez les baignades quand l’eau est trouble, verte ou avec amas en surface.",
        "Empêchez l’animal de boire l’eau d’étang ou de mare.",
        "Après ingestion suspecte: urgence vétérinaire immédiate.",
      ],
    })
  }

  if (month >= 5 && month <= 8) {
    alerts.push({
      id: "chaleur",
      type: "chaleur",
      title: "Chaleur et sols brûlants",
      severity: "medium",
      seasonLabel: "Été",
      summary: `${territoryLabel}, limitez les sorties en pleine journée et surveillez les surfaces très chaudes.`,
      actions: [
        "Sortez tôt le matin ou en soirée, avec de l’eau disponible.",
        "Testez le sol avec la main avant de marcher longtemps sur le bitume.",
        "Halètement intense, fatigue ou vomissements: urgence vétérinaire.",
      ],
    })
  }

  return alerts.slice(0, 4)
}
