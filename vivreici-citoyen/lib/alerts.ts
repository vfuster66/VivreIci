import "server-only"
import { inflateRawSync } from "node:zlib"

const DEFAULT_CITY_NAME = process.env.VIVREICI_DEFAULT_CITY?.trim() || "Cabestany"
const METEOFRANCE_VIGILANCE_TOKEN =
  process.env.METEOFRANCE_VIGILANCE_TOKEN?.trim() ||
  process.env.METEOFRANCE_API_TOKEN?.trim() ||
  null
const SHORT_CACHE_TTL_MS = 5 * 60 * 1000
const memoryCache = new Map<string, { expiresAt: number; value: unknown }>()

export type AlertSeverity = "none" | "low" | "medium" | "high" | "critical"
export type AlertOfficialLevel = "green" | "yellow" | "orange" | "red" | "black"

export type DepartmentContext = {
  city: string
  departmentCode: string
  departmentName: string
  communeCode: string | null
  coordinates: {
    lat: number
    lng: number
  } | null
}

export type AlertItem = {
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

export type AlertsPayload = {
  context: DepartmentContext
  alerts: AlertItem[]
  generatedAt: string
}

type GeoApiCommune = {
  nom: string
  code: string
  centre?: {
    coordinates?: [number, number]
  }
  departement?: {
    code: string
    nom: string
  }
}

type PollenFeatureCollection = {
  features?: Array<{
    properties?: {
      date_maj?: string | null
      code_qual?: number | null
      lib_qual?: string | null
      lib_zone?: string | null
      pollen_resp?: string | null
      alerte?: boolean | null
      date_ech?: string | null
      code_zone?: string | null
    }
  }>
}

type AirFeatureCollection = {
  features?: Array<{
    properties?: {
      date_maj?: string | null
      code_no2?: number | null
      code_o3?: number | null
      code_pm10?: number | null
      code_pm25?: number | null
      code_qual?: number | null
      code_so2?: number | null
      code_zone?: string | null
      date_ech?: string | null
      lib_qual?: string | null
      lib_zone?: string | null
      source?: string | null
      type_zone?: string | null
    }
  }>
}

type MeteoFranceZoneMap = Record<
  string,
  {
    id?: string
    name?: string
    link?: string
  }
>

type MeteoFranceVigilanceMapResponse = {
  product?: {
    update_time?: string
    periods?: Array<{
      echeance?: string
      text_items?: {
        title?: string
        text?: string[]
      }
      timelaps?: {
        domain_ids?: Array<{
          domain_id?: string
          max_color_id?: number | string | null
          phenomenon_items?: Array<{
            phenomenon_id?: string | null
            phenomenon_max_color_id?: number | string | null
            timelaps_items?: Array<{
              begin_time?: string | null
              end_time?: string | null
              color_id?: number | string | null
            }>
          }>
        }>
      }
    }>
    meta?: {
      product_datetime?: string
      generation_timestamp?: string
    }
  }
}

type MeteoFranceVigilanceTextsResponse = {
  product?: {
    text_bloc_items?: Array<{
      domain_id?: string
      domain_name?: string
      bloc_items?: Array<{
        type_name?: string
        text_items?: Array<{
          type_code?: string | null
          hazard_code?: string | null
          hazard_name?: string | null
          term_items?: Array<{
            term_names?: string | null
            risk_name?: string | null
            risk_code?: string | number | null
            subdivision_text?: Array<{
              text?: string[]
            }>
          }>
        }>
      }>
    }>
    meta?: {
      product_datetime?: string
      generation_timestamp?: string
    }
  }
}

type PolynesiaVigilanceMapResponse = {
  warning_type?: string
  update_time?: string
  end_validity_time?: string | null
  timelaps?: {
    domain_ids?: Array<{
      domain_id?: string
      max_color_id?: number | string | null
      phenomenon_items?: Array<{
        phenomenon_id?: number | string | null
        phenomenon_max_color_id?: number | string | null
      }>
    }>
  }
}

type PolynesiaVigilanceTextsResponse = {
  report_type?: string
  report_subtype?: string
  domain_id?: string
  update_time?: string
  end_validity_time?: string | null
  text_bloc_items?: Array<{
    bloc_title?: string | null
    begin_time?: string | null
    end_time?: string | null
    text_items?: Array<{
      title?: string | null
      text?: string[] | null
    }>
  }>
}

type MeteoFranceDomainAlert = {
  domainId: string
  maxColorId: number
  phenomenonItems: Array<{
    phenomenonId: string
    maxColorId: number
  }>
}

type OverseasZipEntry = {
  name: string
  data: Buffer
}

function getCachedValue<T>(key: string): T | null {
  const cached = memoryCache.get(key)

  if (!cached) {
    return null
  }

  if (cached.expiresAt <= Date.now()) {
    memoryCache.delete(key)
    return null
  }

  return cached.value as T
}

function setCachedValue<T>(key: string, value: T, ttlMs = SHORT_CACHE_TTL_MS) {
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  })

  return value
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&eacute;/g, "e")
    .replace(/&egrave;/g, "e")
    .replace(/&ecirc;/g, "e")
    .replace(/&agrave;/g, "a")
    .replace(/&ccedil;/g, "c")
    .replace(/&ocirc;/g, "o")
    .replace(/&ucirc;/g, "u")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
}

function getPollenSeverity(code: number | null | undefined): AlertSeverity {
  if (!code || code <= 1) {
    return "none"
  }

  if (code === 2) {
    return "low"
  }

  if (code === 3 || code === 4) {
    return "medium"
  }

  if (code === 5) {
    return "high"
  }

  return "critical"
}

function getPollenOfficialLevel(code: number | null | undefined): AlertOfficialLevel {
  if (!code || code <= 2) {
    return "green"
  }

  if (code === 3) {
    return "yellow"
  }

  if (code === 4) {
    return "orange"
  }

  return "red"
}

function getAirSeverity(code: number | null | undefined): AlertSeverity {
  if (!code || code <= 1) {
    return "none"
  }

  if (code === 2) {
    return "low"
  }

  if (code === 3) {
    return "medium"
  }

  if (code === 4) {
    return "high"
  }

  return "critical"
}

function getAirOfficialLevel(code: number | null | undefined): AlertOfficialLevel {
  if (!code || code <= 1) {
    return "green"
  }

  if (code === 2) {
    return "yellow"
  }

  if (code === 3) {
    return "orange"
  }

  if (code >= 7) {
    return "black"
  }

  return "red"
}

function getAirQualityLabel(code: number | null | undefined) {
  switch (code) {
    case 1:
      return "Bon"
    case 2:
      return "Moyen"
    case 3:
      return "Dégradé"
    case 4:
      return "Mauvais"
    case 5:
      return "Très mauvais"
    case 6:
      return "Extrêmement mauvais"
    case 7:
      return "Épisode"
    default:
      return "Non disponible"
  }
}

function getSeverityFromColorId(colorId: number): AlertSeverity {
  if (colorId >= 5) {
    return "critical"
  }

  if (colorId === 4) {
    return "critical"
  }

  if (colorId === 3) {
    return "high"
  }

  if (colorId === 2) {
    return "medium"
  }

  return "none"
}

function getOfficialLevelFromColorId(colorId: number): AlertOfficialLevel {
  if (colorId >= 5) {
    return "black"
  }

  if (colorId === 4) {
    return "red"
  }

  if (colorId === 3) {
    return "orange"
  }

  if (colorId === 2) {
    return "yellow"
  }

  return "green"
}

function getOfficialLevelLabelFromColorId(colorId: number) {
  return {
    1: "Vert",
    2: "Jaune",
    3: "Orange",
    4: "Rouge",
    5: "Noir",
  }[colorId] ?? "Niveau inconnu"
}

function getPhenomenonConfig(
  phenomenonId: string
): Pick<AlertItem, "category" | "title"> | null {
  const config = {
    "1": { category: "Météo", title: "Vent violent" },
    "2": { category: "Pluies", title: "Pluie-inondation" },
    "3": { category: "Météo", title: "Orages" },
    "4": { category: "Crues", title: "Crues" },
    "5": { category: "Météo", title: "Neige-verglas" },
    "6": { category: "Météo", title: "Canicule" },
    "7": { category: "Météo", title: "Grand froid" },
    "8": { category: "Météo", title: "Avalanches" },
    "9": { category: "Littoral", title: "Vagues-submersion" },
  } as const

  return config[phenomenonId as keyof typeof config] ?? null
}

function sanitizeText(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function readUInt16LE(buffer: Buffer, offset: number) {
  return buffer.readUInt16LE(offset)
}

function readUInt32LE(buffer: Buffer, offset: number) {
  return buffer.readUInt32LE(offset)
}

function extractZipEntries(buffer: Buffer) {
  const entries: OverseasZipEntry[] = []
  const endSignature = 0x06054b50
  let endOffset = -1

  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 66000); offset -= 1) {
    if (readUInt32LE(buffer, offset) === endSignature) {
      endOffset = offset
      break
    }
  }

  if (endOffset < 0) {
    throw new Error("Archive ZIP vigilance OM invalide.")
  }

  const centralDirectorySize = readUInt32LE(buffer, endOffset + 12)
  const centralDirectoryOffset = readUInt32LE(buffer, endOffset + 16)
  let cursor = centralDirectoryOffset
  const centralEnd = centralDirectoryOffset + centralDirectorySize

  while (cursor < centralEnd) {
    if (readUInt32LE(buffer, cursor) !== 0x02014b50) {
      break
    }

    const compressionMethod = readUInt16LE(buffer, cursor + 10)
    const compressedSize = readUInt32LE(buffer, cursor + 20)
    const fileNameLength = readUInt16LE(buffer, cursor + 28)
    const extraLength = readUInt16LE(buffer, cursor + 30)
    const commentLength = readUInt16LE(buffer, cursor + 32)
    const localHeaderOffset = readUInt32LE(buffer, cursor + 42)
    const fileName = buffer
      .subarray(cursor + 46, cursor + 46 + fileNameLength)
      .toString("utf8")

    const localHeaderNameLength = readUInt16LE(buffer, localHeaderOffset + 26)
    const localHeaderExtraLength = readUInt16LE(buffer, localHeaderOffset + 28)
    const dataOffset = localHeaderOffset + 30 + localHeaderNameLength + localHeaderExtraLength
    const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize)

    let data: Buffer

    if (compressionMethod === 0) {
      data = Buffer.from(compressed)
    } else if (compressionMethod === 8) {
      data = inflateRawSync(compressed)
    } else {
      cursor += 46 + fileNameLength + extraLength + commentLength
      continue
    }

    entries.push({ name: fileName, data })
    cursor += 46 + fileNameLength + extraLength + commentLength
  }

  return entries
}

function extractVigilanceText(
  payload: MeteoFranceVigilanceTextsResponse | null,
  domainId: string,
  colorId: number,
  hazardName?: string | null
) {
  const domainBlock = payload?.product?.text_bloc_items?.find(
    (item) => item.domain_id === domainId
  )

  if (!domainBlock) {
    return null
  }

  const normalizedHazard = normalizeText(hazardName ?? "")

  for (const bloc of domainBlock.bloc_items ?? []) {
    for (const textItem of bloc.text_items ?? []) {
      if (
        normalizedHazard &&
        textItem.hazard_name &&
        normalizeText(textItem.hazard_name) !== normalizedHazard &&
        normalizeText(textItem.hazard_name) !== "tous aleas"
      ) {
        continue
      }

      const matchingTerm =
        textItem.term_items?.find(
          (term) => Number(term.risk_code ?? 0) === colorId && term.subdivision_text?.length
        ) ?? textItem.term_items?.find((term) => term.subdivision_text?.length)

      const text = matchingTerm?.subdivision_text
        ?.flatMap((item) => item.text ?? [])
        .map(sanitizeText)
        .filter(Boolean)
        .slice(0, 4)
        .join(" ")

      if (text) {
        return text
      }
    }
  }

  return null
}

async function fetchMeteoFranceVigilanceProduct<T>(path: string) {
  if (!METEOFRANCE_VIGILANCE_TOKEN) {
    return null
  }

  const cacheKey = `mf:${path}`
  const cached = getCachedValue<T | null>(cacheKey)

  if (cached) {
    return cached
  }

  const response = await fetch(
    `https://public-api.meteofrance.fr/public/DPVigilance/v1/${path}`,
    {
      headers: {
        Accept: "application/json",
        apikey: METEOFRANCE_VIGILANCE_TOKEN,
        "User-Agent": "VivreIci/1.0 (+https://vivreici.app)",
      },
      cache: "no-store",
    }
  )

  if (!response.ok) {
    throw new Error(`API Vigilance indisponible (${response.status})`)
  }

  return setCachedValue(cacheKey, (await response.json()) as T)
}

async function fetchOverseasVigilanceZipEntries() {
  if (!METEOFRANCE_VIGILANCE_TOKEN) {
    return []
  }

  const cacheKey = "mf:vigilanceom:zip"
  const cached = getCachedValue<OverseasZipEntry[]>(cacheKey)

  if (cached) {
    return cached
  }

  const response = await fetch(
    "https://public-api.meteofrance.fr/public/DPVigilance/v1/vigilanceom/flux/dernier",
    {
      headers: {
        apikey: METEOFRANCE_VIGILANCE_TOKEN,
        "User-Agent": "VivreIci/1.0 (+https://vivreici.app)",
      },
      cache: "no-store",
    }
  )

  if (!response.ok) {
    throw new Error(`Flux vigilance OM indisponible (${response.status})`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  return setCachedValue(cacheKey, extractZipEntries(buffer))
}

function getCoastalDomainIds(departmentCode: string) {
  return [`${departmentCode}10`, `${departmentCode}11`, `${departmentCode}12`, `${departmentCode}13`]
}

function buildDomainAlertMap(
  payload: MeteoFranceVigilanceMapResponse | null,
  domainIds: string[],
  echeance: "J" | "J1" = "J"
): MeteoFranceDomainAlert[] {
  const domains = payload?.product?.periods
    ?.find((period) => period.echeance === echeance)
    ?.timelaps?.domain_ids

  if (!domains?.length) {
    return []
  }

  return domains
    .filter((domain): domain is NonNullable<typeof domain> => Boolean(domain))
    .filter((domain) => domain.domain_id && domainIds.includes(domain.domain_id))
    .map((domain) => ({
      domainId: domain.domain_id ?? "",
      maxColorId: Number(domain.max_color_id ?? 1),
      phenomenonItems: (domain.phenomenon_items ?? [])
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .map((item) => ({
          phenomenonId: item.phenomenon_id ?? "",
          maxColorId: Number(item.phenomenon_max_color_id ?? 1),
        }))
        .filter((item) => item.phenomenonId.length > 0 && item.maxColorId > 1),
    }))
    .filter((item) => item.domainId.length > 0 && item.maxColorId > 1)
}

function getEarthquakeSeverity(maxMagnitude: number): AlertSeverity {
  if (maxMagnitude >= 5.5) {
    return "critical"
  }

  if (maxMagnitude >= 4.5) {
    return "high"
  }

  if (maxMagnitude >= 3.8) {
    return "medium"
  }

  if (maxMagnitude >= 3) {
    return "low"
  }

  return "none"
}

function formatSeverityLabel(severity: AlertSeverity) {
  switch (severity) {
    case "critical":
      return "Très élevé"
    case "high":
      return "Élevé"
    case "medium":
      return "Modéré"
    case "low":
      return "Faible"
    default:
      return "Aucune alerte"
  }
}

function getDepartmentPrefix(departmentCode: string) {
  if (departmentCode === "2A" || departmentCode === "2B") {
    return departmentCode
  }

  return departmentCode
}

function isOverseasDepartmentCode(departmentCode: string) {
  return /^(97|98)/.test(departmentCode)
}

function getOverseasDomainMatchers(departmentCode: string) {
  switch (departmentCode) {
    case "977":
    case "978":
      return ["VIGI978-977", "977", "978"]
    default:
      return [`VIGI${departmentCode}`, departmentCode]
  }
}

function getOverseasSourceUrl() {
  return "https://meteofrance.com/actualites-et-dossiers/la-vigilance-meteorologique-en-outre-mer"
}

function getOverseasSourceMeta(departmentCode: string) {
  switch (departmentCode) {
    case "975":
      return {
        sourceName: "Météo-France Saint-Pierre-et-Miquelon",
        sourceUrl: "https://www.meteospm.org/parametres.php",
      }
    case "988":
      return {
        sourceName: "Météo-France Nouvelle-Calédonie",
        sourceUrl: getOverseasSourceUrl(),
      }
    case "987":
      return {
        sourceName: "Météo-France Polynésie française",
        sourceUrl: getOverseasSourceUrl(),
      }
    default:
      return {
        sourceName: "Météo-France Outre-mer",
        sourceUrl: getOverseasSourceUrl(),
      }
  }
}

function getOverseasPhenomenonTitle(
  phenomenonId: number | string | null | undefined
): string | null {
  switch (Number(phenomenonId ?? 0)) {
    case 1:
      return "Vent violent"
    case 2:
      return "Fortes pluies / Orages"
    case 3:
      return "Orages"
    case 4:
      return "Crues"
    case 5:
      return "Neige-verglas"
    case 6:
      return "Canicule"
    case 7:
      return "Grand froid"
    case 8:
      return "Avalanches"
    case 9:
      return "Vagues-submersion"
    case 10:
      return "Mer dangereuse"
    default:
      return null
  }
}

function formatDateRangeStart(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return {
    day: String(date.getDate()).padStart(2, "0"),
    month: String(date.getMonth() + 1).padStart(2, "0"),
    year: String(date.getFullYear()),
  }
}

function getLocalDateKey(offset = 0) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")
}

async function fetchText(url: string, init?: RequestInit) {
  const canCache = !init?.method || init.method === "GET"
  const cacheKey = canCache ? `text:${url}` : null

  if (cacheKey) {
    const cached = getCachedValue<string>(cacheKey)

    if (cached) {
      return cached
    }
  }

  const response = await fetch(url, {
    ...init,
    headers: {
      "User-Agent": "VivreIci/1.0 (+https://vivreici.app)",
      Accept:
        init?.headers && typeof init.headers === "object"
          ? "text/html,application/json,text/plain"
          : "text/html,application/json,text/plain",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Réponse distante invalide (${response.status})`)
  }

  const text = await response.text()

  if (cacheKey) {
    return setCachedValue(cacheKey, text)
  }

  return text
}

export async function resolveDepartmentContext(rawCity?: string | null) {
  const city = rawCity?.trim() || DEFAULT_CITY_NAME
  const endpoint = `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(
    city
  )}&fields=nom,code,centre,departement&boost=population&limit=1`

  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      "User-Agent": "VivreIci/1.0 (+https://vivreici.app)",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Impossible de résoudre votre département.")
  }

  const communes = ((await response.json()) as GeoApiCommune[]) ?? []
  const commune = communes[0]

  if (!commune?.departement) {
    throw new Error("Impossible de déterminer le département de cette ville.")
  }

  return {
    city: commune.nom,
    departmentCode: commune.departement.code,
    departmentName: commune.departement.nom,
    communeCode: commune.code ?? null,
    coordinates: commune.centre?.coordinates
      ? {
          lng: commune.centre.coordinates[0],
          lat: commune.centre.coordinates[1],
        }
      : null,
  } satisfies DepartmentContext
}

async function fetchMeteoFranceZones() {
  const html = await fetchText("https://vigilance.meteofrance.fr/fr")
  const match = html.match(
    /"mf_carte_vigilance_zones":(\{[\s\S]*?\}),"mf_carte_vigilance_url_index":/
  )

  if (!match) {
    return null
  }

  try {
    return JSON.parse(match[1]) as MeteoFranceZoneMap
  } catch {
    return null
  }
}

async function buildWeatherAlerts(context: DepartmentContext) {
  if (context.departmentCode === "987") {
    return buildPolynesiaWeatherAlerts(context)
  }

  if (isOverseasDepartmentCode(context.departmentCode)) {
    return buildOverseasWeatherAlerts(context)
  }

  if (METEOFRANCE_VIGILANCE_TOKEN) {
    const [mapPayload, textsPayload, zones] = await Promise.all([
      fetchMeteoFranceVigilanceProduct<MeteoFranceVigilanceMapResponse>(
        "cartevigilance/encours"
      ).catch(() => null),
      fetchMeteoFranceVigilanceProduct<MeteoFranceVigilanceTextsResponse>(
        "textesvigilance/encours"
      ).catch(() => null),
      fetchMeteoFranceZones().catch(() => null),
    ])

    const departmentLink = zones?.[context.departmentCode]?.link
    const alerts: AlertItem[] = []

    for (const period of ["J", "J1"] as const) {
      const departmentDomains = buildDomainAlertMap(
        mapPayload,
        [context.departmentCode],
        period
      )
      const coastalDomains = buildDomainAlertMap(
        mapPayload,
        getCoastalDomainIds(context.departmentCode),
        period
      )

      for (const domain of [...departmentDomains, ...coastalDomains]) {
        for (const phenomenon of domain.phenomenonItems) {
          const config = getPhenomenonConfig(phenomenon.phenomenonId)

          if (!config) {
            continue
          }

          const colorId = phenomenon.maxColorId
          const officialLevel = getOfficialLevelFromColorId(colorId)
          const details = extractVigilanceText(
            textsPayload,
            domain.domainId,
            colorId,
            config.title
          )

          alerts.push({
            id: `vigilance-${period}-${domain.domainId}-${phenomenon.phenomenonId}`,
            period,
            category: config.category,
            title: config.title,
            severity: getSeverityFromColorId(colorId),
            statusLabel: getOfficialLevelLabelFromColorId(colorId),
            officialLevel,
            summary:
              domain.domainId === context.departmentCode
                ? `${config.title} en vigilance ${getOfficialLevelLabelFromColorId(colorId).toLowerCase()} ${
                    period === "J" ? "aujourd’hui" : "demain"
                  } pour ${context.departmentName}.`
                : `${config.title} en vigilance ${getOfficialLevelLabelFromColorId(colorId).toLowerCase()} ${
                    period === "J" ? "aujourd’hui" : "demain"
                  } sur le littoral du département.`,
            details:
              details ??
              "Consultez le bulletin officiel Météo-France pour le détail de la situation et l'évolution attendue.",
            sourceName: "Météo-France Vigilance",
            sourceUrl: departmentLink
              ? `https://vigilance.meteofrance.fr${departmentLink}`
              : "https://vigilance.meteofrance.fr/fr",
            updatedAt:
              mapPayload?.product?.meta?.generation_timestamp ??
              mapPayload?.product?.update_time ??
              null,
            tags: [
              "vigilance",
              context.departmentCode,
              period === "J" ? "aujourdhui" : "demain",
              domain.domainId === context.departmentCode ? "departement" : "littoral",
            ],
          })
        }
      }
    }

    if (alerts.length > 0) {
      return alerts
    }
  }

  const zones = await fetchMeteoFranceZones().catch(() => null)
  const departmentZone = zones?.[context.departmentCode]
  const coastalZone = zones?.[`${context.departmentCode}10`]
  const alerts: AlertItem[] = []

  if (departmentZone?.link) {
    alerts.push({
      id: "meteo-vigilance",
      period: "J",
      category: "Météo",
      title: `Vigilance météo ${context.departmentName}`,
      severity: "none",
      statusLabel: "Source officielle",
      officialLevel: null,
      summary:
        "Consultez la vigilance Météo-France du département pour vent, orages, pluie-inondation, canicule, grand froid, neige-verglas et crues.",
      sourceName: "Météo-France",
      sourceUrl: `https://vigilance.meteofrance.fr${departmentZone.link}`,
      tags: ["département", "vigilance", context.departmentCode],
    })
  }

  alerts.push({
    id: "meteo-pluies-intenses",
    period: "J",
    category: "Pluies",
    title: "Pluies intenses",
    severity: "none",
    statusLabel: "Surveillance",
    officialLevel: null,
    summary:
      "Le service APIC de Météo-France complète la vigilance avec les épisodes de pluies intenses.",
    sourceName: "Météo-France APIC",
    sourceUrl: "https://apic.meteofrance.fr/?mode=apic&area=fr",
    tags: ["pluie", "orages"],
  })

  if (coastalZone?.link) {
    alerts.push({
      id: "meteo-littoral",
      period: "J",
      category: "Littoral",
      title: "Littoral et vagues-submersion",
      severity: "none",
      statusLabel: "Source officielle",
      officialLevel: null,
      summary:
        "Surveillez la zone littorale du département pour vagues-submersion, vent et conditions marines.",
      sourceName: "Météo-France",
      sourceUrl: `https://vigilance.meteofrance.fr${coastalZone.link}`,
      tags: ["littoral", "vagues-submersion"],
    })
  }

  return alerts
}

function extractPolynesiaVigilanceDetails(payload: PolynesiaVigilanceTextsResponse | null) {
  if (!payload?.text_bloc_items?.length) {
    return null
  }

  const lines = payload.text_bloc_items
    .flatMap((bloc) => {
      const zone = bloc.bloc_title?.trim()
      return (bloc.text_items ?? [])
        .map((item) => {
          const text = (item.text ?? []).map(sanitizeText).filter(Boolean).join(" ")

          if (!text || normalizeText(text).includes("pas de bulletin de suivi en cours")) {
            return null
          }

          const title = item.title?.trim()
          return [zone, title, text].filter(Boolean).join(" : ")
        })
        .filter((item): item is string => Boolean(item))
    })
    .slice(0, 3)

  if (lines.length === 0) {
    return null
  }

  return lines.join(" ")
}

function extractOverseasTextDetailsFromJson(value: unknown) {
  if (!value || typeof value !== "object") {
    return null
  }

  const payload = value as {
    text_bloc_items?: Array<{
      bloc_title?: string | null
      text_items?: Array<{
        title?: string | null
        text?: string[] | null
      }>
    }>
  }

  const lines = (payload.text_bloc_items ?? [])
    .flatMap((bloc) =>
      (bloc.text_items ?? [])
        .map((item) => {
          const text = (item.text ?? []).map(sanitizeText).filter(Boolean).join(" ")

          if (!text || normalizeText(text).includes("pas de vigilance particuliere")) {
            return null
          }

          return [bloc.bloc_title?.trim(), item.title?.trim(), text].filter(Boolean).join(" : ")
        })
        .filter((item): item is string => Boolean(item))
    )
    .slice(0, 3)

  return lines.length > 0 ? lines.join(" ") : null
}

function extractOverseasTextDetailsFromPlainText(text: string) {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => sanitizeText(line))
    .filter(Boolean)

  const detailStart = lines.findIndex(
    (line) => line.toLowerCase() === "description" || line.toLowerCase().startsWith("situation actuelle")
  )

  if (detailStart >= 0) {
    return lines.slice(detailStart, detailStart + 6).join(" ")
  }

  return lines.slice(0, 6).join(" ")
}

function parsePlainTextOfficialLevel(text: string): number | null {
  const normalized = normalizeText(text)

  if (normalized.includes("vigilance rouge")) {
    return 4
  }

  if (normalized.includes("vigilance orange")) {
    return 3
  }

  if (normalized.includes("vigilance jaune")) {
    return 2
  }

  if (normalized.includes("vigilance vert")) {
    return 1
  }

  return null
}

function extractPlainTextPhenomena(text: string) {
  const eventLineMatch = text.match(/Type d['’]évènement\s*:\s*([^\n]+)/i)

  if (!eventLineMatch?.[1]) {
    return []
  }

  return eventLineMatch[1]
    .split(/,|;/)
    .map((item) => sanitizeText(item))
    .filter(Boolean)
}

async function buildPolynesiaWeatherAlerts(context: DepartmentContext) {
  if (!METEOFRANCE_VIGILANCE_TOKEN) {
    return []
  }

  const [mapPayload, textsPayload] = await Promise.all([
    fetchMeteoFranceVigilanceProduct<PolynesiaVigilanceMapResponse>(
      "polynesie/cartevigilance/encours"
    ).catch(() => null),
    fetchMeteoFranceVigilanceProduct<PolynesiaVigilanceTextsResponse>(
      "polynesie/textesvigilance/encours"
    ).catch(() => null),
  ])

  const domains = mapPayload?.timelaps?.domain_ids ?? []
  const activePhenomena = Array.from(
    new Set(
      domains.flatMap((domain) =>
        (domain.phenomenon_items ?? [])
          .filter((item) => Number(item.phenomenon_max_color_id ?? 1) > 1)
          .map((item) => getOverseasPhenomenonTitle(item.phenomenon_id))
          .filter((item): item is string => Boolean(item))
      )
    )
  )
  const maxColorId = Math.max(
    1,
    ...domains
      .map((domain) => Number(domain.max_color_id ?? 1))
      .filter((value) => Number.isFinite(value) && value > 0)
  )

  if (maxColorId <= 1) {
    return []
  }

  const details = extractPolynesiaVigilanceDetails(textsPayload)
  const source = getOverseasSourceMeta(context.departmentCode)

  return [
    {
      id: "vigilance-polynesie",
      period: "J",
      category: "Météo",
      title: "Vigilance météo Polynésie française",
      severity: getSeverityFromColorId(maxColorId),
      statusLabel: getOfficialLevelLabelFromColorId(maxColorId),
      officialLevel: getOfficialLevelFromColorId(maxColorId),
      summary:
        activePhenomena.length > 0
          ? `${activePhenomena.slice(0, 3).join(", ")} en vigilance ${getOfficialLevelLabelFromColorId(maxColorId).toLowerCase()} sur au moins une zone de Polynésie française.`
          : `Vigilance ${getOfficialLevelLabelFromColorId(maxColorId).toLowerCase()} en cours sur au moins une zone de Polynésie française.`,
      details:
        details ??
        "Consultez le bulletin officiel de vigilance outre-mer pour le détail par archipel et l’évolution attendue.",
      sourceName: source.sourceName,
      sourceUrl: source.sourceUrl,
      updatedAt: mapPayload?.update_time ?? textsPayload?.update_time ?? null,
      tags: ["vigilance", "outre-mer", "polynesie", context.departmentCode],
    } satisfies AlertItem,
  ]
}

async function buildOverseasWeatherAlerts(context: DepartmentContext) {
  if (!METEOFRANCE_VIGILANCE_TOKEN) {
    return []
  }

  const entries = await fetchOverseasVigilanceZipEntries().catch(() => [])

  if (entries.length === 0) {
    return []
  }

  const matchers = getOverseasDomainMatchers(context.departmentCode)
  const source = getOverseasSourceMeta(context.departmentCode)
  let maxColorId = 1
  let updatedAt: string | null = null
  let details: string | null = null
  const activePhenomena = new Set<string>()

  for (const entry of entries) {
    const text = entry.data.toString("utf8")

    if (!matchers.some((matcher) => text.includes(matcher))) {
      continue
    }

    if (entry.name.endsWith(".txt") || entry.name.endsWith(".xml")) {
      const parsedLevel = parsePlainTextOfficialLevel(text)

      if (parsedLevel && parsedLevel > maxColorId) {
        maxColorId = parsedLevel
      }
    }

    if (text.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(text) as {
          update_time?: string
          timelaps?: {
            domain_ids?: Array<{
              domain_id?: string
              max_color_id?: number | string | null
              phenomenon_items?: Array<{
                phenomenon_id?: number | string | null
                phenomenon_max_color_id?: number | string | null
              }>
            }>
          }
        }

        const matchedDomains = (parsed.timelaps?.domain_ids ?? []).filter((domain) =>
          matchers.some((matcher) => (domain.domain_id ?? "").includes(matcher))
        )

        const domainMaxColor = Math.max(
          1,
          ...matchedDomains
            .map((domain) => Number(domain.max_color_id ?? 1))
            .filter((value) => Number.isFinite(value) && value > 0)
        )

        if (domainMaxColor > maxColorId) {
          maxColorId = domainMaxColor
        }

        for (const domain of matchedDomains) {
          for (const phenomenon of domain.phenomenon_items ?? []) {
            if (Number(phenomenon.phenomenon_max_color_id ?? 1) <= 1) {
              continue
            }

            const label = getOverseasPhenomenonTitle(phenomenon.phenomenon_id)

            if (label) {
              activePhenomena.add(label)
            }
          }
        }

        updatedAt = parsed.update_time ?? updatedAt
        details = details ?? extractOverseasTextDetailsFromJson(parsed)
      } catch {
        details = details ?? extractOverseasTextDetailsFromPlainText(text)
      }
    } else if (!details) {
      details = extractOverseasTextDetailsFromPlainText(text)
    }

    for (const phenomenon of extractPlainTextPhenomena(text)) {
      activePhenomena.add(phenomenon)
    }
  }

  if (maxColorId <= 1) {
    return []
  }

  return [
    {
      id: `vigilance-om-${context.departmentCode}`,
      period: "J",
      category: "Météo",
      title: `Vigilance météo ${context.departmentName}`,
      severity: getSeverityFromColorId(maxColorId),
      statusLabel: getOfficialLevelLabelFromColorId(maxColorId),
      officialLevel: getOfficialLevelFromColorId(maxColorId),
      summary:
        activePhenomena.size > 0
          ? `${Array.from(activePhenomena).slice(0, 3).join(", ")} en vigilance ${getOfficialLevelLabelFromColorId(maxColorId).toLowerCase()} pour ${context.departmentName}.`
          : `${context.departmentName} est en vigilance ${getOfficialLevelLabelFromColorId(maxColorId).toLowerCase()} sur le flux officiel outre-mer de Météo-France.`,
      details:
        details ??
        "Consultez le bulletin officiel de vigilance outre-mer pour le détail par zone et l’évolution attendue.",
      sourceName: source.sourceName,
      sourceUrl: source.sourceUrl,
      updatedAt,
      tags: ["vigilance", "outre-mer", context.departmentCode],
    } satisfies AlertItem,
  ]
}

async function buildPollenAlert(context: DepartmentContext) {
  const prefix = getDepartmentPrefix(context.departmentCode)
  const endpoint =
    "https://data.atmo-france.org/geoserver/ind_pol/wfs" +
    "?service=WFS" +
    "&version=2.0.0" +
    "&request=GetFeature" +
    "&typeName=ind_pol:ind_national_pol" +
    "&outputFormat=application/json" +
    "&propertyName=code_zone,lib_zone,code_qual,lib_qual,pollen_resp,alerte,date_ech,date_maj" +
    `&CQL_FILTER=${encodeURIComponent(`code_zone LIKE '${prefix}%'`)}`

  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      "User-Agent": "VivreIci/1.0 (+https://vivreici.app)",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Impossible de charger les données pollen.")
  }

  const payload = (await response.json()) as PollenFeatureCollection
  const items = (payload.features ?? [])
    .map((feature) => feature.properties)
    .filter((item): item is NonNullable<typeof item> => Boolean(item))

  if (items.length === 0) {
    return null
  }

  const sorted = [...items].sort(
    (first, second) => (second.code_qual ?? 0) - (first.code_qual ?? 0)
  )
  const highest = sorted[0]
  const communesOnAlert = items.filter((item) => item.alerte).length
  const strongestCommunes = sorted
    .slice(0, 3)
    .map((item) => item.lib_zone)
    .filter(Boolean)
  const topPollens = Array.from(
    new Set(
      sorted
        .slice(0, 5)
        .flatMap((item) =>
          (item.pollen_resp ?? "")
            .split(/\s+/)
            .map((value) => value.trim())
            .filter(Boolean)
        )
    )
  )

  return {
    id: "pollen",
    period: "J",
    category: "Pollen",
    title: "Indice pollen départemental",
    severity: getPollenSeverity(highest.code_qual ?? null),
    statusLabel: highest.lib_qual ?? formatSeverityLabel("none"),
    officialLevel: getPollenOfficialLevel(highest.code_qual ?? null),
    summary:
      communesOnAlert > 0
        ? `${communesOnAlert} commune(s) en alerte pollen aujourd'hui ou à très court terme dans le département.`
        : `Niveau maximal observé : ${highest.lib_qual?.toLowerCase() ?? "non précisé"} dans le département.`,
    details:
      [
        strongestCommunes.length > 0
          ? `Communes les plus exposées : ${strongestCommunes.join(", ")}.`
          : null,
        topPollens.length > 0
          ? `Pollens dominants : ${topPollens.slice(0, 4).join(", ")}.`
          : null,
      ]
        .filter(Boolean)
        .join(" "),
    sourceName: "Atmo France / AASQA",
    sourceUrl:
      "https://www.data.gouv.fr/fr/datasets/indice-pollen/",
    updatedAt: highest.date_maj ?? null,
    tags: ["santé", "allergies", context.departmentCode],
  } satisfies AlertItem
}

async function buildAirQualityAlerts(context: DepartmentContext) {
  if (context.departmentCode === "974" || context.departmentCode === "988") {
    return []
  }

  const prefix = getDepartmentPrefix(context.departmentCode)
  const endpoint =
    "https://data.atmo-france.org/geoserver/ind/ows" +
    "?service=WFS" +
    "&version=2.0.0" +
    "&request=GetFeature" +
    "&typeNames=ind_atmo_2021" +
    "&outputFormat=application/json" +
    "&propertyName=date_maj,code_no2,code_o3,code_pm10,code_pm25,code_qual,code_so2,code_zone,date_ech,lib_qual,lib_zone,source,type_zone" +
    `&CQL_FILTER=${encodeURIComponent(
      `type_zone='commune' AND code_zone LIKE '${prefix}%'`
    )}`

  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      "User-Agent": "VivreIci/1.0 (+https://vivreici.app)",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Impossible de charger la qualité de l’air.")
  }

  const payload = (await response.json()) as AirFeatureCollection
  const items = (payload.features ?? [])
    .map((feature) => feature.properties)
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => (item.code_zone ?? "").startsWith(prefix))

  if (items.length === 0) {
    return []
  }

  const periodMap = [
    { period: "J" as const, dateKey: getLocalDateKey(0) },
    { period: "J1" as const, dateKey: getLocalDateKey(1) },
  ]

  return periodMap.flatMap(({ period, dateKey }) => {
    const periodItems = items
      .filter((item) => item.date_ech === dateKey)
      .sort((first, second) => (second.code_qual ?? 0) - (first.code_qual ?? 0))

    if (periodItems.length === 0) {
      return []
    }

    const highest = periodItems[0]
    const impactedCommunes = periodItems.filter((item) => (item.code_qual ?? 0) >= 3)
    const topCommunes = periodItems
      .slice(0, 3)
      .map((item) => item.lib_zone)
      .filter(Boolean)

    const pollutantLabels = [
      { key: "code_o3", label: "ozone" },
      { key: "code_no2", label: "dioxyde d’azote" },
      { key: "code_pm10", label: "PM10" },
      { key: "code_pm25", label: "PM2.5" },
      { key: "code_so2", label: "dioxyde de soufre" },
    ] as const

    const dominantPollutants = pollutantLabels
      .map(({ key, label }) => ({
        label,
        score: Math.max(
          ...periodItems.map((item) => Number(item[key] ?? 0)).filter(Number.isFinite),
          0
        ),
      }))
      .filter((item) => item.score >= 3)
      .sort((first, second) => second.score - first.score)
      .slice(0, 3)
      .map((item) => item.label)

    return [
      {
        id: `air-${period.toLowerCase()}`,
        period,
        category: "Air",
        title: "Qualité de l’air",
        severity: getAirSeverity(highest.code_qual ?? null),
        statusLabel:
          highest.lib_qual?.trim() || getAirQualityLabel(highest.code_qual ?? null),
        officialLevel: getAirOfficialLevel(highest.code_qual ?? null),
        summary:
          impactedCommunes.length > 0
            ? `${impactedCommunes.length} commune(s) avec un indice dégradé ou plus ${
                period === "J" ? "aujourd’hui" : "demain"
              } dans le département.`
            : `Indice maximal ${period === "J" ? "aujourd’hui" : "demain"} : ${(
                highest.lib_qual?.toLowerCase() ??
                getAirQualityLabel(highest.code_qual ?? null).toLowerCase()
              )}.`,
        details: [
          topCommunes.length > 0
            ? `Communes les plus exposées : ${topCommunes.join(", ")}.`
            : null,
          dominantPollutants.length > 0
            ? `Polluants dominants : ${dominantPollutants.join(", ")}.`
            : null,
        ]
          .filter(Boolean)
          .join(" "),
        sourceName: highest.source?.trim() || "Atmo France / AASQA",
        sourceUrl:
          "https://www.data.gouv.fr/fr/datasets/indice-de-la-qualite-de-lair-quotidien-par-commune/",
        updatedAt: highest.date_maj ?? null,
        tags: ["air", "pollution", context.departmentCode, period === "J" ? "aujourdhui" : "demain"],
      } satisfies AlertItem,
    ]
  })
}

type EarthquakeItem = {
  location: string
  date: string
  time: string
  magnitude: number
  detailUrl: string | null
}

async function buildEarthquakeAlert(context: DepartmentContext) {
  const start = formatDateRangeStart(60)
  const body = new URLSearchParams({
    jour_deb: start.day,
    mois_deb: start.month,
    an_deb: start.year,
    jour_fin: String(new Date().getDate()).padStart(2, "0"),
    mois_fin: String(new Date().getMonth() + 1).padStart(2, "0"),
    an_fin: String(new Date().getFullYear()),
    depts: context.departmentCode,
    int_min: "0",
    int_max: "10",
    submit: "Rechercher",
  })

  const html = await fetchText("https://www.franceseisme.fr/alertes-fr.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  })

  const rows = Array.from(
    html.matchAll(
      /<tr style="border: 1px solid black"><td[^>]*><center><strong>([\s\S]*?)<\/strong>[\s\S]*?<td[^>]*><center>([^<]+)<\/center><\/td><td[^>]*><center>([^<]+)<\/center><\/td><td[^>]*><center>([^<]+)<\/center><\/td><td[^>]*>([\s\S]*?)<\/td><\/tr>/g
    )
  )

  const earthquakes: EarthquakeItem[] = rows
    .map((match) => {
      const location = stripHtml(match[1])
      const magnitude = Number.parseFloat(match[4].replace(",", "."))
      const detailId = match[5].match(/IdSei=(\d+)/)?.[1] ?? null

      return {
        location,
        date: stripHtml(match[2]),
        time: stripHtml(match[3]),
        magnitude: Number.isFinite(magnitude) ? magnitude : 0,
        detailUrl: detailId
          ? `https://www.franceseisme.fr/donnees/intensites/details_seisme.php?IdSei=${detailId}`
          : null,
      }
    })
    .filter((item) => item.location.length > 0)

  if (earthquakes.length === 0) {
    return null
  }

  const maxMagnitude = Math.max(...earthquakes.map((item) => item.magnitude))
  const topItems = earthquakes.slice(0, 3)

  return {
    id: "seismes",
    period: "J",
    category: "Séismes",
    title: "Derniers séismes signalés",
    severity: getEarthquakeSeverity(maxMagnitude),
    statusLabel:
      maxMagnitude >= 3
        ? `Magnitude max ${maxMagnitude.toFixed(1)}`
        : "Microsismicité",
    officialLevel: null,
    summary: `${earthquakes.length} séisme(s) listé(s) sur les 60 derniers jours pour le département.`,
    details: topItems
      .map(
        (item) =>
          `${item.date} à ${item.time} : ${item.location} (M ${item.magnitude.toFixed(1)}).`
      )
      .join(" "),
    sourceName: "BCSF / France Séisme",
    sourceUrl:
      earthquakes[0]?.detailUrl ?? "https://www.franceseisme.fr/alertes-fr.php",
    tags: ["sismologie", context.departmentCode],
  } satisfies AlertItem
}

async function buildFloodAlert(context: DepartmentContext) {
  const html = await fetchText("https://www.vigicrues.gouv.fr/bulletin_national")
  const text = normalizeText(stripHtml(html))
  const deptName = normalizeText(context.departmentName)
  const deptCode = context.departmentCode.toLowerCase()
  const matchesDepartment =
    text.includes(deptName) ||
    text.includes(`(${deptCode})`) ||
    text.includes(`dep. ${deptCode}`)

  return {
    id: "crues",
    period: "J",
    category: "Crues",
    title: "Vigilance crues",
    severity: matchesDepartment ? "medium" : "none",
    statusLabel: matchesDepartment ? "Mention détectée" : "À surveiller",
    officialLevel: null,
    summary: matchesDepartment
      ? `Le bulletin national Vigicrues mentionne ${context.departmentName} ou son code départemental.`
      : "Aucune mention explicite du département trouvée dans le bulletin national au moment du relevé.",
    details:
      "Consultez le bulletin national et la carte Vigicrues pour les tronçons surveillés et les niveaux de vigilance en cours.",
    sourceName: "Vigicrues",
    sourceUrl: "https://www.vigicrues.gouv.fr/bulletin_national",
    tags: ["inondation", "rivière"],
  } satisfies AlertItem
}

export async function fetchDepartmentAlerts(rawCity?: string | null) {
  const context = await resolveDepartmentContext(rawCity)

  const [weatherAlerts, airQualityAlerts, pollenAlert, earthquakeAlert, floodAlert] =
    await Promise.all([
      buildWeatherAlerts(context).catch(() => []),
      buildAirQualityAlerts(context).catch(() => []),
      buildPollenAlert(context).catch(() => null),
      buildEarthquakeAlert(context).catch(() => null),
      buildFloodAlert(context).catch(() => null),
    ])

  const alerts = [
    ...weatherAlerts,
    ...airQualityAlerts,
    pollenAlert,
    earthquakeAlert,
    floodAlert,
  ].filter((item): item is AlertItem => Boolean(item))

  return {
    context,
    alerts,
    generatedAt: new Date().toISOString(),
  } satisfies AlertsPayload
}

export const __test__ = {
  buildDomainAlertMap,
  extractPlainTextPhenomena,
  extractVigilanceText,
  getAirOfficialLevel,
  getAirQualityLabel,
  getAirSeverity,
  getOfficialLevelFromColorId,
  getOfficialLevelLabelFromColorId,
  getPhenomenonConfig,
  getPollenOfficialLevel,
  getPollenSeverity,
  getSeverityFromColorId,
  parsePlainTextOfficialLevel,
}
