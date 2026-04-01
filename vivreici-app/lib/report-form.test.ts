import { describe, expect, it } from "vitest"
import {
  ADDRESS_SEARCH_MIN_CHARS,
  APPROXIMATE_LOCATION_MESSAGE,
  MAX_REPORT_MEDIA_COUNT,
  MAX_REPORT_VIDEO_COUNT,
  appendSpeechTranscript,
  buildStoredDescription,
  formatCompactAddress,
  getSuggestedReportTypes,
  sanitizeFileName,
  shouldSearchAddress,
  suggestReportType,
  validateMediaSelection,
} from "./report-form"
import { REPORT_TYPE_DICTIONARY } from "./report-type-dictionary"

describe("sanitizeFileName", () => {
  it("normalise les accents et caracteres speciaux", () => {
    expect(sanitizeFileName("Chaussée abîmée!!.JPG")).toBe("chaussee-abimee-.jpg")
  })

  it("compacte les sequences de separateurs", () => {
    expect(sanitizeFileName("video   mairie ###.mp4")).toBe("video-mairie-.mp4")
  })
})

describe("buildStoredDescription", () => {
  it("assemble description, adresse et médias", () => {
    expect(
      buildStoredDescription({
        description: "Nid de poule important",
        address: "12 rue Pasteur, Perpignan",
        mediaUrls: ["https://cdn.test/photo1.jpg", "https://cdn.test/video1.mp4"],
      })
    ).toBe(
      "Nid de poule important\n\nAdresse indiquée : 12 rue Pasteur, Perpignan\n\nMédias joints : https://cdn.test/photo1.jpg, https://cdn.test/video1.mp4"
    )
  })

  it("retourne une chaîne vide si aucune information n'est fournie", () => {
    expect(
      buildStoredDescription({
        description: "   ",
        address: "   ",
        mediaUrls: [],
      })
    ).toBe("")
  })
})

describe("formatCompactAddress", () => {
  it("garde uniquement numero, rue, code postal et ville", () => {
    expect(
      formatCompactAddress({
        house_number: "12",
        road: "Rue Pasteur",
        postcode: "66000",
        city: "Perpignan",
        municipality: "Perpignan",
      })
    ).toBe("12 Rue Pasteur, 66000 Perpignan")
  })

  it("retourne une chaine vide si les donnees sont absentes", () => {
    expect(formatCompactAddress()).toBe("")
  })
})

describe("appendSpeechTranscript", () => {
  it("ajoute une transcription a une description existante", () => {
    expect(
      appendSpeechTranscript("Lampe en panne", "depuis trois jours")
    ).toBe("Lampe en panne depuis trois jours")
  })

  it("ignore une transcription vide", () => {
    expect(appendSpeechTranscript("Texte existant", "   ")).toBe("Texte existant")
  })
})

describe("shouldSearchAddress", () => {
  it("démarre la recherche à partir du seuil minimal", () => {
    expect(shouldSearchAddress("ab")).toBe(false)
    expect(shouldSearchAddress("abc")).toBe(true)
    expect(ADDRESS_SEARCH_MIN_CHARS).toBe(3)
  })
})

describe("validateMediaSelection", () => {
  it("refuse trop de médias", () => {
    const files = Array.from({ length: MAX_REPORT_MEDIA_COUNT + 1 }, (_, index) => ({
      kind: "image" as const,
      file: new File(["a"], `photo-${index}.jpg`, { type: "image/jpeg" }),
    }))

    expect(validateMediaSelection(files, 0, 0)).toContain("jusqu'à")
  })

  it("refuse trop de vidéos", () => {
    const files = Array.from({ length: MAX_REPORT_VIDEO_COUNT + 1 }, (_, index) => ({
      kind: "video" as const,
      file: new File(["a"], `video-${index}.mp4`, { type: "video/mp4" }),
    }))

    expect(validateMediaSelection(files, 0, 0)).toContain("vidéos")
  })
})

describe("suggestReportType", () => {
  it("propose un type a partir de mots-clés", () => {
    expect(
      suggestReportType("Le lampadaire de la rue est en panne depuis hier soir")
    ).toBe("Éclairage")
  })

  it("gère les variantes avec tirets et accents", () => {
    expect(
      suggestReportType("Gros nid-de-poule devant le collège")
    ).toBe("Voirie")
  })

  it("gère les formes plurielles et synonymes usuels", () => {
    expect(
      suggestReportType("Dépôt sauvage de gravats et encombrants")
    ).toBe("Déchets")
  })

  it("priorise une expression forte face à un mot faible d'un autre type", () => {
    expect(
      suggestReportType("Verre cassé sur le trottoir devant l'arrêt")
    ).toBe("Sécurité")
  })

  it("retourne null sans indice suffisant", () => {
    expect(suggestReportType("")).toBe(null)
  })
})

describe("getSuggestedReportTypes", () => {
  it("retourne une suggestion forte avec alternatives limitées", () => {
    const result = getSuggestedReportTypes(
      "Gros nid-de-poule et chaussée abîmée devant le collège"
    )

    expect(result.primary?.type).toBe("Voirie")
    expect(result.confidence).toBe("high")
    expect(result.alternatives.length).toBeLessThanOrEqual(2)
  })

  it("retourne une confiance faible sur un texte ambigu", () => {
    const result = getSuggestedReportTypes(
      "Verre et lampadaire cassé sur le trottoir"
    )

    expect(result.primary).not.toBeNull()
    expect(result.confidence).toBe("low")
  })
})

describe("APPROXIMATE_LOCATION_MESSAGE", () => {
  it("reste générique et multi-ville", () => {
    expect(APPROXIMATE_LOCATION_MESSAGE.toLowerCase()).not.toContain("cabestany")
  })
})

describe("REPORT_TYPE_DICTIONARY", () => {
  it("couvre tous les types métier sauf Autre", () => {
    expect(REPORT_TYPE_DICTIONARY.map((entry) => entry.type)).toEqual([
      "Voirie",
      "Déchets",
      "Éclairage",
      "Mobilier urbain",
      "Sécurité",
    ])
  })
})
