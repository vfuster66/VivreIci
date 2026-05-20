const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
const PHONE_REGEX = /(?:\+|00)?33[\s./-]*[1-9](?:[\s./-]*\d{2}){4}\b|\b0[1-9](?:[\s./-]*\d{2}){4}\b/

export function containsPrivateContact(text: string | null | undefined) {
  const value = text?.trim() ?? ""

  if (!value) {
    return false
  }

  return EMAIL_REGEX.test(value) || PHONE_REGEX.test(value)
}

export function getPrivateContactErrorLabel(value: string | null | undefined) {
  if (!value?.trim()) {
    return null
  }

  if (EMAIL_REGEX.test(value)) {
    return "adresse email"
  }

  if (PHONE_REGEX.test(value)) {
    return "numéro de téléphone"
  }

  return null
}

export function validatePublicTextFields(fields: Array<{ label: string; value: string }>) {
  for (const field of fields) {
    const match = getPrivateContactErrorLabel(field.value)

    if (match) {
      return `Retire toute ${match} du champ « ${field.label} ». Les coordonnées doivent rester privées jusqu'à l'acceptation.`
    }
  }

  return null
}

export function isValidContactEmail(value: string | null | undefined) {
  const normalized = value?.trim() ?? ""

  if (!normalized) {
    return false
  }

  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(normalized)
}

export function isValidContactPhone(value: string | null | undefined) {
  const normalized = value?.trim() ?? ""

  if (!normalized) {
    return false
  }

  return PHONE_REGEX.test(normalized)
}
