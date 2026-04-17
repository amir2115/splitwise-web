import { digitsOnly, formatCardNumber } from '@/shared/utils/format'

export function splitCardNumberIntoChunks(cardNumber: string) {
  const digits = digitsOnly(cardNumber).slice(0, 16)
  return Array.from({ length: 4 }, (_, index) => digits.slice(index * 4, (index + 1) * 4))
}

export function mergeCardChunks(chunks: string[]) {
  return digitsOnly(chunks.join('')).slice(0, 16)
}

export function normalizeCardChunkInput(input: string) {
  return digitsOnly(input).slice(0, 4)
}

export function fillCardChunksFromInput(input: string) {
  return splitCardNumberIntoChunks(input)
}

export function formatReadableCardNumber(cardNumber: string) {
  return formatCardNumber(cardNumber)
}
