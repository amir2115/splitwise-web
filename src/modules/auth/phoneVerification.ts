const PHONE_TRANSLATION_TABLE = new Map<string, string>([
  ['۰', '0'],
  ['۱', '1'],
  ['۲', '2'],
  ['۳', '3'],
  ['۴', '4'],
  ['۵', '5'],
  ['۶', '6'],
  ['۷', '7'],
  ['۸', '8'],
  ['۹', '9'],
  ['٠', '0'],
  ['١', '1'],
  ['٢', '2'],
  ['٣', '3'],
  ['٤', '4'],
  ['٥', '5'],
  ['٦', '6'],
  ['٧', '7'],
  ['٨', '8'],
  ['٩', '9'],
])

function normalizeLocalizedDigits(value: string) {
  return Array.from(value).map((char) => PHONE_TRANSLATION_TABLE.get(char) ?? char).join('')
}

const PHONE_CANDIDATE_PATTERN = /^[+\d۰-۹٠-٩()\-\s]+$/

export function normalizePhoneInput(value: string) {
  return normalizeLocalizedDigits(value).replace(/[^\d+]/g, '')
}

export function normalizePhoneCandidate(value: string) {
  const trimmed = value.trim()
  if (!trimmed || !PHONE_CANDIDATE_PATTERN.test(trimmed)) {
    return trimmed
  }
  return normalizePhoneInput(trimmed) || trimmed
}

export function normalizeOtpDigit(value: string) {
  return normalizeLocalizedDigits(value).replace(/\D/g, '').slice(0, 1)
}

export function fillOtpDigitsFromInput(value: string, length = 5) {
  const digits = normalizeLocalizedDigits(value).replace(/\D/g, '').slice(0, length)
  return Array.from({ length }, (_, index) => digits[index] ?? '')
}

export function mergeOtpDigits(digits: string[]) {
  return digits.map((digit) => normalizeOtpDigit(digit)).join('')
}
