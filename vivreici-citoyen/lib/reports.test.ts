import { describe, expect, it } from "vitest"
import {
  buildReportTimeline,
  canTransitionReportStatus,
  filterReports,
  formatReportDate,
  getDisplayReportReference,
  isReportVisibleOnMap,
  getReportSearchText,
  parseStoredReportMetadata,
  getPrimaryReportText,
  getReportReference,
  getReportStatusLabel,
  type ReportRecord,
} from "./reports"

const REPORTS_FIXTURE: ReportRecord[] = [
  {
    id: "1",
    report_number: 12,
    report_type_number: 4,
    type: "Voirie",
    status: "open",
    description:
      "Nid-de-poule\n\nAdresse indiquée : 12 Rue Pasteur, 66000 Perpignan",
    lat: 42.68,
    lng: 2.93,
    photo_url: null,
    created_at: "2026-03-31T08:30:00.000Z",
  },
  {
    id: "2",
    report_number: 13,
    report_type_number: 2,
    type: "Déchets",
    status: "resolved",
    description: "Dépôt sauvage",
    lat: 42.69,
    lng: 2.94,
    photo_url: null,
    created_at: "2026-03-30T10:00:00.000Z",
    updated_at: "2026-03-30T11:00:00.000Z",
  },
  {
    id: "3",
    report_number: 14,
    report_type_number: 1,
    type: "Éclairage",
    status: "archived",
    description: "Panne clôturée",
    lat: 42.7,
    lng: 2.95,
    photo_url: null,
    created_at: "2026-03-01T10:00:00.000Z",
    updated_at: "2026-03-03T10:00:00.000Z",
    archived_at: "2026-03-05T10:00:00.000Z",
  },
]

describe("filterReports", () => {
  it("filtre par type", () => {
    expect(
      filterReports(REPORTS_FIXTURE, {
        query: "",
        typeFilter: "Voirie",
        statusFilter: "all",
      })
    ).toHaveLength(1)
  })

  it("filtre par statut", () => {
    expect(
      filterReports(REPORTS_FIXTURE, {
        query: "",
        typeFilter: "all",
        statusFilter: "resolved",
      })
    ).toEqual([REPORTS_FIXTURE[1]])
  })

  it("retourne tout sans filtre", () => {
    expect(
      filterReports(REPORTS_FIXTURE, {
        query: "",
        typeFilter: "all",
        statusFilter: "all",
      })
    ).toHaveLength(3)
  })

  it("exclut les archivés quand le filtre actif est utilisé", () => {
    expect(
      filterReports(REPORTS_FIXTURE, {
        query: "",
        typeFilter: "all",
        statusFilter: "active",
      })
    ).toEqual([REPORTS_FIXTURE[0]])
  })

  it("filtre par recherche texte", () => {
    expect(
      filterReports(REPORTS_FIXTURE, {
        query: "nid",
        typeFilter: "all",
        statusFilter: "all",
      })
    ).toEqual([REPORTS_FIXTURE[0]])
  })

  it("cherche aussi dans l'adresse et la référence", () => {
    expect(
      filterReports(REPORTS_FIXTURE, {
        query: "pasteur",
        typeFilter: "all",
        statusFilter: "all",
      })
    ).toEqual([REPORTS_FIXTURE[0]])

    expect(
      filterReports(REPORTS_FIXTURE, {
        query: "VOI-00004",
        typeFilter: "all",
        statusFilter: "all",
      })
    ).toEqual([REPORTS_FIXTURE[0]])
  })
})

describe("getReportStatusLabel", () => {
  it("traduit les statuts", () => {
    expect(getReportStatusLabel("open")).toBe("Ouvert")
    expect(getReportStatusLabel("in_progress")).toBe("En cours")
    expect(getReportStatusLabel("resolved")).toBe("Résolu")
    expect(getReportStatusLabel("archived")).toBe("Archivé")
  })
})

describe("canTransitionReportStatus", () => {
  it("autorise les transitions métier prévues", () => {
    expect(canTransitionReportStatus("resolved", "archived")).toBe(true)
    expect(canTransitionReportStatus("open", "resolved")).toBe(true)
  })

  it("bloque les transitions non prévues", () => {
    expect(canTransitionReportStatus("open", "archived")).toBe(false)
    expect(canTransitionReportStatus("archived", "resolved")).toBe(false)
  })
})

describe("getReportReference", () => {
  it("génère une référence lisible à partir du type et de l'id", () => {
    expect(
      getReportReference({
        id: "abc123ef-4567",
        type: "Voirie",
      })
    ).toBe("VOI-ABC123")
  })
})

describe("getDisplayReportReference", () => {
  it("privilégie un numéro ascendant persisté quand il existe", () => {
    expect(
      getDisplayReportReference({
        id: "abc123ef-4567",
        type: "Voirie",
        report_number: 12,
        report_type_number: 4,
      })
    ).toBe("VOI-00004")
  })

  it("retombe sur le compteur global si le compteur par type n'est pas encore présent", () => {
    expect(
      getDisplayReportReference({
        id: "abc123ef-4567",
        type: "Voirie",
        report_number: 12,
        report_type_number: null,
      })
    ).toBe("VOI-00012")
  })

  it("retombe sur la référence dérivée si aucun numéro n'est présent", () => {
    expect(
      getDisplayReportReference({
        id: "abc123ef-4567",
        type: "Voirie",
        report_number: null,
        report_type_number: null,
      })
    ).toBe("VOI-ABC123")
  })
})

describe("getPrimaryReportText", () => {
  it("retourne seulement la description utile sans les métadonnées stockées", () => {
    expect(
      getPrimaryReportText(
        "Nid de poule important\n\nAdresse indiquée : 12 Rue Pasteur, 66000 Perpignan\n\nMédias joints : https://cdn.test/photo.jpg"
      )
    ).toBe("Nid de poule important")
  })

  it("gère une description absente", () => {
    expect(getPrimaryReportText(null)).toBe("Aucune description fournie.")
  })
})

describe("getReportSearchText", () => {
  it("inclut le type, le statut, l'adresse et la référence", () => {
    expect(getReportSearchText(REPORTS_FIXTURE[0])).toContain("voi-00004")
    expect(getReportSearchText(REPORTS_FIXTURE[0])).toContain("12 rue pasteur")
    expect(getReportSearchText(REPORTS_FIXTURE[0])).toContain("ouvert")
  })
})

describe("parseStoredReportMetadata", () => {
  it("extrait l'adresse et les médias stockés dans la description", () => {
    expect(
      parseStoredReportMetadata(
        "Nid de poule important\n\nAdresse indiquée : 12 Rue Pasteur, 66000 Perpignan\n\nMédias joints : https://cdn.test/photo.jpg, https://cdn.test/video.mp4"
      )
    ).toEqual({
      primaryText: "Nid de poule important",
      address: "12 Rue Pasteur, 66000 Perpignan",
      mediaUrls: [
        "https://cdn.test/photo.jpg",
        "https://cdn.test/video.mp4",
      ],
    })
  })
})

describe("formatReportDate", () => {
  it("formate une date lisible", () => {
    expect(formatReportDate("2026-03-31T08:30:00.000Z")).toContain("2026")
  })

  it("gère les dates absentes", () => {
    expect(formatReportDate(null)).toBe("Date inconnue")
  })
})

describe("isReportVisibleOnMap", () => {
  it("masque toujours les archivés", () => {
    expect(isReportVisibleOnMap(REPORTS_FIXTURE[2])).toBe(false)
  })
})

describe("buildReportTimeline", () => {
  it("reconstruit une timeline lisible à partir de report_history", () => {
    const timeline = buildReportTimeline(
      {
        ...REPORTS_FIXTURE[2],
        status: "archived",
        archived_at: "2026-03-31T10:00:00.000Z",
        updated_at: "2026-03-31T10:00:00.000Z",
      },
      [
        {
          id: "h1",
          action: "update",
          created_at: "2026-03-30T10:00:00.000Z",
          snapshot: {
            ...REPORTS_FIXTURE[0],
            status: "open",
          },
        },
        {
          id: "h2",
          action: "update",
          created_at: "2026-03-31T09:00:00.000Z",
          snapshot: {
            ...REPORTS_FIXTURE[0],
            status: "in_progress",
          },
        },
        {
          id: "h3",
          action: "update",
          created_at: "2026-03-31T10:00:00.000Z",
          snapshot: {
            ...REPORTS_FIXTURE[1],
            status: "resolved",
          },
        },
      ]
    )

    expect(timeline[0].title).toBe("Signalement archivé")
    expect(timeline[1].title).toContain("Résolu")
    expect(timeline[timeline.length - 1].title).toBe("Signalement créé")
  })
})
