import type { AppLanguage } from '@/shared/api/types'

export const MAX_AMOUNT_INPUT = 999_999_999_999

export function normalizeDigits(input: string) {
  return input
    .replace(/[٠-٩]/g, (char) => String(char.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (char) => String(char.charCodeAt(0) - 1776))
}

export function digitsOnly(input: string) {
  return normalizeDigits(input).replace(/\D+/g, '')
}

export function parseAmountInput(input: string) {
  const value = digitsOnly(input)
  return value ? Number.parseInt(value, 10) : 0
}

export function formatAmount(amount: number, language: AppLanguage) {
  const locale = language === 'fa' ? 'fa-IR' : 'en-US'
  return new Intl.NumberFormat(locale).format(amount)
}

export function formatAmountParts(amount: number, language: AppLanguage) {
  return {
    value: formatAmount(amount, language),
    currency: language === 'fa' ? 'تومان' : 'Toman',
  }
}

export function isAmountOverflow(input: string) {
  const value = digitsOnly(input)
  if (!value) return false
  if (value.length > String(MAX_AMOUNT_INPUT).length) return true
  return Number.parseInt(value, 10) > MAX_AMOUNT_INPUT
}

export function formatCompactCount(value: number, language: AppLanguage) {
  return formatAmount(value, language)
}

export function formatDate(input: string, language: AppLanguage) {
  const locale = language === 'fa' ? 'fa-IR' : 'en-US'
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(input))
}
