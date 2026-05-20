import { load } from "cheerio";
import { appendFile, readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type CollectiviteCommuneData = {
  requestedUrl: string;
  url: string;
  emails: string[];
  tels: string[];
  websites: string[];
  addressLines: string[];
};

function uniqSorted(values: Iterable<string>): string[] {
  return [...new Set([...values].map((v) => v.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "fr"),
  );
}

function normalizeTel(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeEmail(value: string): string {
  return value.trim();
}

function stripQuery(value: string): string {
  const idx = value.indexOf("?");
  return idx === -1 ? value : value.slice(0, idx);
}

function extractTextLines(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export function parseCollectiviteCommunePage(
  html: string,
  requestedUrl: string,
  finalUrl: string,
): CollectiviteCommuneData {
  const $ = load(html);

  const mairieHeading = $("h1")
    .filter((_, el) => /mairie\s*-\s*/i.test($(el).text()))
    .first();

  if (mairieHeading.length === 0) {
    return { requestedUrl, url: finalUrl, emails: [], tels: [], websites: [], addressLines: [] };
  }

  // On essaye de trouver le plus petit conteneur autour de "Mairie - ..."
  // qui contient effectivement des liens mailto/tel. Ça évite de récupérer
  // tous les mails/liens "contacts utiles" et le footer.
  let scope = $("body");
  if (mairieHeading.length > 0) {
    let cursor = mairieHeading;
    while (cursor.length > 0 && cursor[0]?.tagName !== "body") {
      const hasContact =
        cursor.find('a[href^="mailto:" i], a[href^="tel:" i]').length > 0;
      const hasPostalCity = /\b\d{5}\s+[A-Za-zÀ-ÿ'’ -]{2,}\b/.test(
        cursor.text().replace(/\s+/g, " "),
      );
      if (hasContact) {
        scope = cursor;
        break;
      }
      // Si pas de contact, on accepte quand même le conteneur le plus proche
      // contenant un code postal + ville (souvent l'adresse).
      if (scope[0]?.tagName === "body" && hasPostalCity) scope = cursor;
      cursor = cursor.parent();
    }
  }

  // Si on n'a pas réussi à isoler un conteneur utile, on se limite au parent direct du h1.
  if (scope[0]?.tagName === "body") {
    scope = mairieHeading.parent();
  }

  const emails = new Set<string>();
  scope.find('a[href^="mailto:" i]').each((_, a) => {
    const href = $(a).attr("href") ?? "";
    const raw = stripQuery(href.replace(/^mailto:/i, ""));
    const email = normalizeEmail(raw);
    if (email) emails.add(email);
  });

  const tels = new Set<string>();
  scope.find('a[href^="tel:" i]').each((_, a) => {
    const href = $(a).attr("href") ?? "";
    const raw = stripQuery(href.replace(/^tel:/i, ""));
    const tel = normalizeTel(raw);
    if (tel) tels.add(tel);
  });

  const websites = new Set<string>();
  const collectiviteHost = (() => {
    try {
      return new URL(finalUrl).host;
    } catch {
      return "";
    }
  })();
  scope.find('a[href^="http" i]').each((_, a) => {
    const href = ($(a).attr("href") ?? "").trim();
    if (!href) return;
    try {
      const host = new URL(href).host;
      if (collectiviteHost && host === collectiviteHost) return;
    } catch {
      // ignore URL parse errors
    }
    websites.add(href);
  });

  const addressLines = new Set<string>();
  const blockText = scope.text().replace(/\s+/g, " ").trim();

  // Extractions par regex (plus fiable que les "\n" inexistants dans .text()).
  const streetRe =
    /\b\d+\s+(?:bis\s+)?(?:rue|avenue|boulevard|place|chemin|impasse)\b[^]{0,120}?(?=\b\d{5}\b|$)/gi;
  const postalCityRe = /\b\d{5}\s+[A-Za-zÀ-ÿ'’ -]{2,}\b/g;

  for (const m of blockText.matchAll(streetRe)) addressLines.add(m[0].trim());
  for (const m of blockText.matchAll(postalCityRe)) addressLines.add(m[0].trim());

  // Fallback léger si aucune regex ne matche.
  if (addressLines.size === 0) {
    for (const line of extractTextLines(blockText)) {
      if (
        /^\d{5}\s+/i.test(line) ||
        /place|rue|avenue|boulevard|chemin|impasse/i.test(line)
      ) {
        addressLines.add(line);
      }
    }
  }

  return {
    requestedUrl,
    url: finalUrl,
    emails: uniqSorted(emails),
    tels: uniqSorted(tels),
    websites: uniqSorted(websites),
    addressLines: uniqSorted(addressLines),
  };
}

type CliArgs = {
  url?: string;
  input?: string;
  communesCsv?: string;
  hexaCsv?: string;
  sitemapIndexUrl?: string;
  out?: string;
  json?: string;
  delayMs: number;
  max?: number;
  progressEvery: number;
  progressMs: number;
  resume: boolean;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { delayMs: 800, progressEvery: 100, progressMs: 15000, resume: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--url") args.url = argv[++i];
    else if (a === "--input") args.input = argv[++i];
    else if (a === "--communes-csv") args.communesCsv = argv[++i];
    else if (a === "--hexa-csv") args.hexaCsv = argv[++i];
    else if (a === "--sitemap-index") args.sitemapIndexUrl = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--json") args.json = argv[++i];
    else if (a === "--delay-ms") args.delayMs = Number(argv[++i] ?? "800");
    else if (a === "--max") args.max = Number(argv[++i]);
    else if (a === "--progress-every") args.progressEvery = Number(argv[++i] ?? "100");
    else if (a === "--progress-ms") args.progressMs = Number(argv[++i] ?? "15000");
    else if (a === "--no-resume") args.resume = false;
  }
  return args;
}

function toCsvCell(value: string): string {
  const needsQuotes = /[",\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function toCsvRow(values: string[]): string {
  return values.map(toCsvCell).join(",") + "\n";
}

async function safeReadFile(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

async function ensureCsvHeader(outCsv: string, header: string[]): Promise<void> {
  const existing = await safeReadFile(outCsv);
  if (existing && existing.trim().length > 0) return;
  await writeFile(outCsv, toCsvRow(header), "utf-8");
}

function groupKey(u: string): string {
  const m = u.match(/^https:\/\/collectivite\.fr\/(.+)$/);
  const slug = m?.[1] ?? u;
  return slug.replace(/-\d{2,3}$/i, "");
}

async function readProcessedGroupsFromCsv(outCsv: string): Promise<Set<string>> {
  const content = await safeReadFile(outCsv);
  if (!content) return new Set();
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return new Set();

  const header = parseCsvLine(lines[0]!);
  const idxRequested = header.findIndex((h) => h === "requestedUrl");
  if (idxRequested === -1) return new Set();

  const groups = new Set<string>();
  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    const requestedUrl = cols[idxRequested] ?? "";
    if (requestedUrl) groups.add(groupKey(requestedUrl));
  }
  return groups;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function readUrlsFromInput(filePath: string): Promise<string[]> {
  const raw = await readFile(filePath, "utf-8");
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

export function slugifyCommuneName(value: string): string {
  // NFKD sépare les accents, puis on supprime les diacritiques.
  const noAccents = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  return noAccents
    .toLowerCase()
    .replace(/['’]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"') {
        const next = line[i + 1];
        if (next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === ",") {
        out.push(cur);
        cur = "";
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

type CommuneCsvRow = {
  commune: string;
  departementNumero: string;
  departementNom: string;
  region: string;
};

function normalizeCommuneForMatch(value: string): string {
  const noAccents = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  return noAccents
    .toUpperCase()
    .replace(/['’]/g, " ")
    .replace(/-/g, " ")
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type HexaRow = {
  codeCommuneInsee: string;
  nomCommune: string;
  codePostal: string;
};

function guessDepartementFromInsee(codeCommuneInsee: string): string {
  // INSEE : 2 caractères (01..95), 2A/2B, ou 3 caractères (971..989)
  const c = codeCommuneInsee.trim().toUpperCase();
  if (c.startsWith("97") || c.startsWith("98")) return c.slice(0, 3);
  if (c.startsWith("2A") || c.startsWith("2B")) return c.slice(0, 2);
  return c.slice(0, 2);
}

async function readHexaCsv(filePath: string): Promise<HexaRow[]> {
  const raw = await readFile(filePath, "utf-8");
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const dataLines = lines.filter((l) => !l.startsWith("#"));
  if (dataLines.length === 0) return [];

  // Format attendu : Code_commune_INSEE;Nom_de_la_commune;Code_postal;...
  const rows: HexaRow[] = [];
  for (const line of dataLines) {
    const cols = line.split(";");
    const codeCommuneInsee = (cols[0] ?? "").trim();
    const nomCommune = (cols[1] ?? "").trim();
    const codePostal = (cols[2] ?? "").trim();
    if (!codeCommuneInsee || !nomCommune || !codePostal) continue;
    rows.push({ codeCommuneInsee, nomCommune, codePostal });
  }
  return rows;
}

type PostalIndex = Map<string, Set<string>>; // key = `${dep}|${normalizedName}`

async function buildPostalIndex(hexaCsvPath: string): Promise<PostalIndex> {
  const rows = await readHexaCsv(hexaCsvPath);
  const idx: PostalIndex = new Map();
  for (const r of rows) {
    const dep = guessDepartementFromInsee(r.codeCommuneInsee);
    const name = normalizeCommuneForMatch(r.nomCommune);
    const key = `${dep}|${name}`;
    if (!idx.has(key)) idx.set(key, new Set());
    idx.get(key)!.add(r.codePostal);
  }
  return idx;
}

async function readCommunesCsv(filePath: string): Promise<CommuneCsvRow[]> {
  const raw = await readFile(filePath, "utf-8");
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const header = parseCsvLine(lines[0]!);
  const idxCommune = header.findIndex((h) => h.toLowerCase() === "commune");
  const idxDepNum = header.findIndex((h) => h.toLowerCase().includes("département") && h.toLowerCase().includes("numéro"));
  const idxDepNom = header.findIndex((h) => h.toLowerCase().includes("département") && h.toLowerCase().includes("nom"));
  const idxRegion = header.findIndex((h) => h.toLowerCase() === "région" || h.toLowerCase() === "region");

  if (idxCommune === -1 || idxDepNum === -1 || idxDepNom === -1 || idxRegion === -1) {
    throw new Error(`CSV header inattendu: ${header.join(", ")}`);
  }

  const rows: CommuneCsvRow[] = [];
  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    const commune = cols[idxCommune] ?? "";
    const departementNumero = cols[idxDepNum] ?? "";
    const departementNom = cols[idxDepNom] ?? "";
    const region = cols[idxRegion] ?? "";
    if (!commune || !departementNumero) continue;
    rows.push({ commune, departementNumero, departementNom, region });
  }
  return rows;
}

async function urlsFromCommunesCsv(
  filePath: string,
  postalIndex?: PostalIndex,
): Promise<string[]> {
  const rows = await readCommunesCsv(filePath);
  const counts = new Map<string, number>();
  for (const r of rows) {
    counts.set(r.commune, (counts.get(r.commune) ?? 0) + 1);
  }

  const urls: string[] = [];
  for (const r of rows) {
    const base = slugifyCommuneName(r.commune);
    if (!base) continue;
    const isDupe = (counts.get(r.commune) ?? 0) > 1;
    // Codes postaux (si on a l'index La Poste). On les utilise en priorité pour les doublons :
    // ex: abancourt-59268
    const dep = r.departementNumero.trim().toUpperCase();
    const depKey = dep.length === 1 ? `0${dep}` : dep;
    const nameKey = normalizeCommuneForMatch(r.commune);
    const key = `${depKey}|${nameKey}`;
    const postals = postalIndex ? [...(postalIndex.get(key) ?? [])].sort() : [];

    const candidates: string[] = [];
    if (isDupe && postals.length > 0) {
      // Doublons: le format du site est généralement slug-<code_postal>.
      // On évite slug-<dept> qui génère souvent des 404 / pages vides.
      for (const cp of postals) candidates.push(`${base}-${cp}`);
      candidates.push(base);
    } else if (postals.length > 0) {
      // communes non dupliquées : on n'ajoute pas base-<cp> (ça crée surtout des 404)
      candidates.push(base);
      candidates.push(`${base}-${depKey}`);
    } else {
      const primary = isDupe ? `${base}-${depKey}` : base;
      const secondary = isDupe ? base : `${base}-${depKey}`;
      candidates.push(primary);
      if (secondary !== primary) candidates.push(secondary);
    }

    for (const c of candidates) urls.push(`https://collectivite.fr/${c}`);
  }
  return urls;
}

function extractLocsFromSitemapXml(xml: string): string[] {
  const locs: string[] = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  for (const m of xml.matchAll(re)) {
    const u = m[1]?.trim();
    if (u) locs.push(u);
  }
  return locs;
}

function isLikelyCommuneUrl(u: string): boolean {
  try {
    const url = new URL(u);
    if (url.host !== "collectivite.fr") return false;
    const pathName = url.pathname.replace(/^\/+/, "");
    if (!pathName) return false;
    if (pathName === "403") return false;
    // Les pages communes sont des slugs (avec parfois -<code postal>).
    return /^[a-z0-9][a-z0-9-]*$/.test(pathName);
  } catch {
    return false;
  }
}

async function urlsFromSitemaps(sitemapIndexUrl: string): Promise<string[]> {
  const startedAt = Date.now();
  console.log(`Sitemap: téléchargement de l’index ${sitemapIndexUrl}`);
  const indexRes = await fetch(sitemapIndexUrl, {
    headers: { "user-agent": "VivreIciBot/1.0 (+contact)" },
  });
  if (!indexRes.ok) throw new Error(`HTTP ${indexRes.status} for ${sitemapIndexUrl}`);
  const indexXml = await indexRes.text();
  const sitemapUrls = extractLocsFromSitemapXml(indexXml).filter((u) => u.includes("sitemap-"));
  console.log(`Sitemap: ${sitemapUrls.length} fichier(s) à parcourir`);
  const all: string[] = [];
  for (let i = 0; i < sitemapUrls.length; i++) {
    const sm = sitemapUrls[i]!;
    console.log(`Sitemap: ${i + 1}/${sitemapUrls.length} ${sm}`);
    const res = await fetch(sm, { headers: { "user-agent": "VivreIciBot/1.0 (+contact)" } });
    if (!res.ok) continue;
    const xml = await res.text();
    for (const u of extractLocsFromSitemapXml(xml)) {
      if (isLikelyCommuneUrl(u)) all.push(u);
    }
  }
  const unique = [...new Set(all)];
  console.log(
    `Sitemap: ${unique.length} URL(s) communes trouvée(s) en ${Math.round(
      (Date.now() - startedAt) / 1000,
    )}s`,
  );
  return unique;
}

function resolvePath(repoRoot: string, maybePath: string): string {
  if (path.isAbsolute(maybePath)) return maybePath;
  // Si l'utilisateur passe ./ ou ../, on respecte le cwd (souvent vivreici-app/).
  if (maybePath.startsWith("./") || maybePath.startsWith("../")) {
    return path.resolve(process.cwd(), maybePath);
  }
  // Sinon, on considère que c'est relatif au repo root.
  return path.join(repoRoot, maybePath);
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, "..", "..");

  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  const outCsv = args.out ?? path.join(repoRoot, "data", "collectivite-communes.csv");
  const outJson = args.json ?? path.join(repoRoot, "data", "collectivite-communes.json");

  const urls: string[] = args.url
    ? [args.url]
    : args.input
      ? await readUrlsFromInput(resolvePath(repoRoot, args.input))
      : args.communesCsv
        ? await (async (communesCsvPath: string) => {
            const communesPath = resolvePath(repoRoot, communesCsvPath);
            const hexaPath =
              args.hexaCsv ? resolvePath(repoRoot, args.hexaCsv) : path.join(repoRoot, "data", "019HexaSmal.csv");
            let idx: PostalIndex | undefined;
            try {
              idx = await buildPostalIndex(hexaPath);
            } catch {
              idx = undefined;
            }
            return urlsFromCommunesCsv(communesPath, idx);
          })(args.communesCsv)
        : args.sitemapIndexUrl
          ? await urlsFromSitemaps(args.sitemapIndexUrl)
      : [];

  if (urls.length === 0) {
    console.error(
      [
        "Usage:",
        "  pnpm scrape:collectivite -- --url https://collectivite.fr/cabestany",
        "  pnpm scrape:collectivite -- --input data/urls.txt",
        "  pnpm scrape:collectivite -- --communes-csv data/communes-francaises.csv",
        "  pnpm scrape:collectivite -- --communes-csv data/communes-francaises.csv --hexa-csv data/019HexaSmal.csv",
        "  pnpm scrape:collectivite -- --sitemap-index https://collectivite.fr/sitemap-index.xml",
        "Options:",
        "  --out data/out.csv",
        "  --json data/out.json",
        "  --delay-ms 800",
        "  --max 100",
        "  --progress-every 100",
        "  --progress-ms 15000",
      ].join("\n"),
    );
    process.exitCode = 2;
    return;
  }

  await mkdir(path.dirname(outCsv), { recursive: true });

  const header = ["requestedUrl", "url", "emails", "tels", "websites", "addressLines"];
  await ensureCsvHeader(outCsv, header);
  const results: CollectiviteCommuneData[] = [];

  const alreadyDone = args.resume ? await readProcessedGroupsFromCsv(outCsv) : new Set<string>();
  if (alreadyDone.size > 0) {
    console.log(`Reprise: ${alreadyDone.size} groupe(s) déjà présents dans ${path.basename(outCsv)}`);
  }

  const take = typeof args.max === "number" ? urls.slice(0, Math.max(0, args.max)) : urls;

  // Dédupe simple sur la liste d'URLs à visiter.
  const planned = [...new Set(take)];
  console.log(`Extraction: ${planned.length} URL(s) candidates (avant groupage)`);

  const visitedByGroup = new Map<string, CollectiviteCommuneData>();
  const startedAt = Date.now();
  let lastProgressAt = 0;
  let processedGroups = 0;

  for (let i = 0; i < planned.length; i++) {
    const requestedUrl = planned[i]!;
    const key = groupKey(requestedUrl);
    if (alreadyDone.has(key)) continue;
    if (visitedByGroup.has(key)) continue;

    const candidates = planned.filter((u) => groupKey(u) === key);

    let best: CollectiviteCommuneData | undefined;
    for (const u of candidates) {
      const res = await fetch(u, {
      headers: { "user-agent": "VivreIciBot/1.0 (+contact)" },
    });
      if (!res.ok) continue;
      const html = await res.text();
      const data = parseCollectiviteCommunePage(html, u, res.url);
      const score =
        data.emails.length * 3 +
        data.tels.length * 2 +
        data.websites.length +
        data.addressLines.length;
      const bestScore =
        (best?.emails.length ?? 0) * 3 +
        (best?.tels.length ?? 0) * 2 +
        (best?.websites.length ?? 0) +
        (best?.addressLines.length ?? 0);

      if (!best || score > bestScore) best = data;
      // Si on a déjà au moins un email ou un tel ou une adresse, c'est suffisant.
      if (data.emails.length > 0 || data.tels.length > 0 || data.addressLines.length > 0) {
        best = data;
        break;
      }
      if (args.delayMs > 0) await sleep(Math.min(args.delayMs, 200));
    }

    if (!best) {
      console.warn(`SKIP group ${key} (no 2xx)`);
      continue;
    }

    visitedByGroup.set(key, best);
    results.push(best);
    processedGroups++;

    await appendFile(
      outCsv,
      toCsvRow([
        best.requestedUrl,
        best.url,
        best.emails.join(";"),
        best.tels.join(";"),
        best.websites.join(";"),
        best.addressLines.join(" | "),
      ]),
      "utf-8",
    );
    alreadyDone.add(key);

    const now = Date.now();
    const shouldLogByCount = args.progressEvery > 0 && processedGroups % args.progressEvery === 0;
    const shouldLogByTime = args.progressMs > 0 && now - lastProgressAt >= args.progressMs;
    if (shouldLogByCount || shouldLogByTime) {
      lastProgressAt = now;
      const elapsedS = Math.max(1, Math.round((now - startedAt) / 1000));
      const rate = processedGroups / elapsedS; // groups / s
      const remaining = Math.max(0, planned.length - (i + 1));
      const etaS = rate > 0 ? Math.round(remaining / rate) : 0;
      console.log(
        `Progression: ${processedGroups} groupes | ${i + 1}/${planned.length} URL candidates traitées | ${elapsedS}s écoulées | ETA ~${etaS}s`,
      );
    }

    if (i < planned.length - 1) await sleep(args.delayMs);
  }

  await writeFile(outJson, JSON.stringify(results, null, 2), "utf-8");

  console.log(
    `OK: +${results.length} pages (session) -> ${path.relative(repoRoot, outCsv)} + ${path.relative(repoRoot, outJson)}`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
