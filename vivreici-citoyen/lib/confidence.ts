export type ConfidenceLevel = "low" | "medium" | "high"

export type ConfidenceResult = {
  score: number
  level: ConfidenceLevel
  summary: string
  reasons: string[]
}

export const CONFIDENCE_VERSION = "v1"

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 75) {
    return "high"
  }

  if (score >= 45) {
    return "medium"
  }

  return "low"
}

export function getReportConfidence(input: {
  status: string | null
  confirmationCount: number
  abuseCount: number
  createdAt: string | null
}) {
  const ageDays = input.createdAt
    ? Math.max(
        0,
        Math.floor((Date.now() - new Date(input.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      )
    : 0

  let score = 45
  score += Math.min(30, input.confirmationCount * 12)
  score -= Math.min(40, input.abuseCount * 18)

  if (input.status === "in_progress") {
    score += 10
  } else if (input.status === "resolved") {
    score += 16
  } else if (input.status === "archived") {
    score += 4
  }

  if (ageDays > 30 && input.status === "open") {
    score -= 8
  }

  const normalizedScore = clampScore(score)

  const reasons = [
    input.confirmationCount > 0
      ? `${input.confirmationCount} confirmation(s) voisine(s)`
      : "Pas encore de retour voisin",
    input.abuseCount > 0
      ? `${input.abuseCount} abus signalé(s)`
      : "Aucun abus signalé",
    input.status === "resolved"
      ? "Signalement résolu"
      : input.status === "in_progress"
        ? "Signalement pris en charge"
        : input.status === "archived"
          ? "Signalement archivé"
          : "Signalement encore ouvert",
  ]

  return {
    score: normalizedScore,
    level: getConfidenceLevel(normalizedScore),
    summary:
      input.confirmationCount > 0
        ? `${input.confirmationCount} confirmation(s) · ${input.abuseCount} abus`
        : input.abuseCount > 0
          ? `${input.abuseCount} abus signalé(s)`
          : "Pas encore de retour voisin",
    reasons,
  } satisfies ConfidenceResult
}

export function getHelpPostConfidence(input: {
  responseCount: number
  acceptedResponse: boolean
  workflowState: "searching" | "found" | "closed"
  priority: "normal" | "urgent"
  createdAt: string
}) {
  const ageDays = Math.max(
    0,
    Math.floor((Date.now() - new Date(input.createdAt).getTime()) / (1000 * 60 * 60 * 24))
  )

  let score = 40
  score += Math.min(25, input.responseCount * 10)
  score += input.acceptedResponse ? 18 : 0
  score += input.workflowState === "found" ? 20 : input.workflowState === "closed" ? 8 : 0
  score += input.priority === "urgent" ? 6 : 0

  if (ageDays > 14 && input.workflowState === "searching") {
    score -= 10
  }

  const normalizedScore = clampScore(score)

  const reasons = [
    input.responseCount > 0
      ? `${input.responseCount} réponse(s) reçue(s)`
      : "Pas encore de réponse",
    input.acceptedResponse ? "Une proposition a été retenue" : "Aucune proposition retenue",
    input.workflowState === "found"
      ? "Solution trouvée"
      : input.workflowState === "closed"
        ? "Annonce clôturée"
        : "Recherche en cours",
  ]

  return {
    score: normalizedScore,
    level: getConfidenceLevel(normalizedScore),
    summary:
      input.responseCount > 0
        ? `${input.responseCount} réponse(s) · ${input.acceptedResponse ? "piste retenue" : "en cours"}`
        : "Pas encore de réponse",
    reasons,
  } satisfies ConfidenceResult
}

export function getAnimalPostConfidence(input: {
  responseCount: number
  acceptedResponse: boolean
  isResolved: boolean
  hasPhoto: boolean
  createdAt: string
}) {
  const ageDays = Math.max(
    0,
    Math.floor((Date.now() - new Date(input.createdAt).getTime()) / (1000 * 60 * 60 * 24))
  )

  let score = 42
  score += Math.min(24, input.responseCount * 8)
  score += input.acceptedResponse ? 18 : 0
  score += input.isResolved ? 20 : 0
  score += input.hasPhoto ? 8 : 0

  if (ageDays > 21 && !input.acceptedResponse && !input.isResolved) {
    score -= 10
  }

  const normalizedScore = clampScore(score)

  const reasons = [
    input.responseCount > 0
      ? `${input.responseCount} piste(s) reçue(s)`
      : "Pas encore de piste",
    input.acceptedResponse ? "Une piste a été retenue" : "Aucune piste retenue",
    input.hasPhoto ? "Photo présente" : "Sans photo",
    input.isResolved ? "Annonce clôturée avec issue connue" : "Annonce encore active",
  ]

  return {
    score: normalizedScore,
    level: getConfidenceLevel(normalizedScore),
    summary: input.isResolved
      ? "Annonce clôturée avec issue connue"
      : input.responseCount > 0
        ? `${input.responseCount} piste(s) · ${input.acceptedResponse ? "une retenue" : "à trier"}`
        : input.hasPhoto
          ? "Photo présente · pas encore de piste"
          : "Annonce récente sans piste pour le moment",
    reasons,
  } satisfies ConfidenceResult
}
