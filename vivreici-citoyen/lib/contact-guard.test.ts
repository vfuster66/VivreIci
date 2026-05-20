import { describe, expect, it } from "vitest"
import {
  containsPrivateContact,
  getPrivateContactErrorLabel,
  isValidContactEmail,
  isValidContactPhone,
  validatePublicTextFields,
} from "./contact-guard"

describe("containsPrivateContact", () => {
  it("détecte un email", () => {
    expect(containsPrivateContact("Écris-moi à test@example.com")).toBe(true)
  })

  it("détecte un téléphone français", () => {
    expect(containsPrivateContact("Mon numéro 06 12 34 56 78")).toBe(true)
  })

  it("ignore un texte neutre", () => {
    expect(containsPrivateContact("Je peux passer demain matin.")).toBe(false)
  })
})

describe("getPrivateContactErrorLabel", () => {
  it("retourne le bon libellé pour un email", () => {
    expect(getPrivateContactErrorLabel("test@example.com")).toBe("adresse email")
  })

  it("retourne le bon libellé pour un téléphone", () => {
    expect(getPrivateContactErrorLabel("06 12 34 56 78")).toBe("numéro de téléphone")
  })
})

describe("validatePublicTextFields", () => {
  it("bloque un champ public avec coordonnées", () => {
    expect(
      validatePublicTextFields([
        { label: "Résumé", value: "Contacte-moi au 06 12 34 56 78" },
      ])
    ).toContain("numéro de téléphone")
  })

  it("laisse passer un contenu public normal", () => {
    expect(
      validatePublicTextFields([
        { label: "Résumé", value: "Je peux aider pour des courses vendredi." },
      ])
    ).toBeNull()
  })
})

describe("isValidContactEmail", () => {
  it("valide un email correct", () => {
    expect(isValidContactEmail("test@example.com")).toBe(true)
  })

  it("refuse un email incomplet", () => {
    expect(isValidContactEmail("test@example")).toBe(false)
  })
})

describe("isValidContactPhone", () => {
  it("valide un mobile français", () => {
    expect(isValidContactPhone("06 12 34 56 78")).toBe(true)
  })

  it("valide un format international fr", () => {
    expect(isValidContactPhone("+33 6 12 34 56 78")).toBe(true)
  })

  it("refuse une chaîne non téléphonique", () => {
    expect(isValidContactPhone("demain matin")).toBe(false)
  })
})
