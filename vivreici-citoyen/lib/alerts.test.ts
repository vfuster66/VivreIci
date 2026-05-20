import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { __test__ } from "./alerts"

describe("alerts severity mappings", () => {
  it("mappe correctement les niveaux pollen", () => {
    expect(__test__.getPollenSeverity(1)).toBe("none")
    expect(__test__.getPollenSeverity(2)).toBe("low")
    expect(__test__.getPollenSeverity(4)).toBe("medium")
    expect(__test__.getPollenSeverity(5)).toBe("high")
    expect(__test__.getPollenSeverity(6)).toBe("critical")

    expect(__test__.getPollenOfficialLevel(2)).toBe("green")
    expect(__test__.getPollenOfficialLevel(3)).toBe("yellow")
    expect(__test__.getPollenOfficialLevel(4)).toBe("orange")
    expect(__test__.getPollenOfficialLevel(5)).toBe("red")
  })

  it("mappe correctement les niveaux qualité de l’air", () => {
    expect(__test__.getAirSeverity(1)).toBe("none")
    expect(__test__.getAirSeverity(2)).toBe("low")
    expect(__test__.getAirSeverity(3)).toBe("medium")
    expect(__test__.getAirSeverity(4)).toBe("high")
    expect(__test__.getAirSeverity(5)).toBe("critical")

    expect(__test__.getAirOfficialLevel(1)).toBe("green")
    expect(__test__.getAirOfficialLevel(2)).toBe("yellow")
    expect(__test__.getAirOfficialLevel(3)).toBe("orange")
    expect(__test__.getAirOfficialLevel(5)).toBe("red")
    expect(__test__.getAirOfficialLevel(7)).toBe("black")

    expect(__test__.getAirQualityLabel(1)).toBe("Bon")
    expect(__test__.getAirQualityLabel(4)).toBe("Mauvais")
    expect(__test__.getAirQualityLabel(7)).toBe("Épisode")
  })

  it("mappe correctement les couleurs de vigilance", () => {
    expect(__test__.getSeverityFromColorId(1)).toBe("none")
    expect(__test__.getSeverityFromColorId(2)).toBe("medium")
    expect(__test__.getSeverityFromColorId(3)).toBe("high")
    expect(__test__.getSeverityFromColorId(4)).toBe("critical")
    expect(__test__.getSeverityFromColorId(5)).toBe("critical")

    expect(__test__.getOfficialLevelFromColorId(1)).toBe("green")
    expect(__test__.getOfficialLevelFromColorId(2)).toBe("yellow")
    expect(__test__.getOfficialLevelFromColorId(3)).toBe("orange")
    expect(__test__.getOfficialLevelFromColorId(4)).toBe("red")
    expect(__test__.getOfficialLevelFromColorId(5)).toBe("black")

    expect(__test__.getOfficialLevelLabelFromColorId(2)).toBe("Jaune")
    expect(__test__.getOfficialLevelLabelFromColorId(5)).toBe("Noir")
  })
})

describe("alerts météo parsing", () => {
  it("mappe les phénomènes météo connus vers les bonnes catégories", () => {
    expect(__test__.getPhenomenonConfig("1")).toEqual({
      category: "Météo",
      title: "Vent violent",
    })
    expect(__test__.getPhenomenonConfig("2")).toEqual({
      category: "Pluies",
      title: "Pluie-inondation",
    })
    expect(__test__.getPhenomenonConfig("4")).toEqual({
      category: "Crues",
      title: "Crues",
    })
    expect(__test__.getPhenomenonConfig("9")).toEqual({
      category: "Littoral",
      title: "Vagues-submersion",
    })
    expect(__test__.getPhenomenonConfig("99")).toBeNull()
  })

  it("construit les alertes par domaine pour J et J+1", () => {
    const payload = {
      product: {
        periods: [
          {
            echeance: "J",
            timelaps: {
              domain_ids: [
                {
                  domain_id: "66",
                  max_color_id: 3,
                  phenomenon_items: [
                    { phenomenon_id: "2", phenomenon_max_color_id: 3 },
                    { phenomenon_id: "1", phenomenon_max_color_id: 1 },
                  ],
                },
              ],
            },
          },
          {
            echeance: "J1",
            timelaps: {
              domain_ids: [
                {
                  domain_id: "66",
                  max_color_id: 2,
                  phenomenon_items: [
                    { phenomenon_id: "3", phenomenon_max_color_id: 2 },
                  ],
                },
              ],
            },
          },
        ],
      },
    }

    expect(__test__.buildDomainAlertMap(payload, ["66"], "J")).toEqual([
      {
        domainId: "66",
        maxColorId: 3,
        phenomenonItems: [{ phenomenonId: "2", maxColorId: 3 }],
      },
    ])

    expect(__test__.buildDomainAlertMap(payload, ["66"], "J1")).toEqual([
      {
        domainId: "66",
        maxColorId: 2,
        phenomenonItems: [{ phenomenonId: "3", maxColorId: 2 }],
      },
    ])
  })

  it("extrait le texte de vigilance adapté au bon aléa et niveau", () => {
    const payload = {
      product: {
        text_bloc_items: [
          {
            domain_id: "66",
            bloc_items: [
              {
                text_items: [
                  {
                    hazard_name: "Pluie-inondation",
                    term_items: [
                      {
                        risk_code: 3,
                        subdivision_text: [{ text: ["Restez prudents près des cours d'eau."] }],
                      },
                    ],
                  },
                  {
                    hazard_name: "Vent violent",
                    term_items: [
                      {
                        risk_code: 2,
                        subdivision_text: [{ text: ["Attachez les objets exposés."] }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    }

    expect(__test__.extractVigilanceText(payload, "66", 3, "Pluie-inondation")).toBe(
      "Restez prudents près des cours d'eau."
    )
    expect(__test__.extractVigilanceText(payload, "66", 2, "Vent violent")).toBe(
      "Attachez les objets exposés."
    )
    expect(__test__.extractVigilanceText(payload, "66", 4, "Canicule")).toBeNull()
  })
})

describe("alerts outre-mer plain text parsing", () => {
  it("détecte le niveau officiel depuis un bulletin texte", () => {
    expect(__test__.parsePlainTextOfficialLevel("Le territoire est en vigilance rouge.")).toBe(4)
    expect(__test__.parsePlainTextOfficialLevel("Passage en vigilance orange dans la nuit.")).toBe(3)
    expect(__test__.parsePlainTextOfficialLevel("Maintien en vigilance jaune.")).toBe(2)
    expect(__test__.parsePlainTextOfficialLevel("Retour en vigilance vert.")).toBe(1)
    expect(__test__.parsePlainTextOfficialLevel("Pas de vigilance particulière.")).toBeNull()
  })

  it("extrait les phénomènes depuis une ligne Type d'évènement", () => {
    expect(
      __test__.extractPlainTextPhenomena(
        "Type d'évènement : Fortes pluies / Orages, Mer dangereuse\nSituation actuelle : ..."
      )
    ).toEqual(["Fortes pluies / Orages", "Mer dangereuse"])
  })
})
