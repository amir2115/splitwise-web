import { describe, expect, it } from 'vitest'
import { parseBooleanEnvValue } from '@/shared/config/env'

describe('parseBooleanEnvValue', () => {
  it('treats true-like values as enabled', () => {
    expect(parseBooleanEnvValue(true)).toBe(true)
    expect(parseBooleanEnvValue('true')).toBe(true)
    expect(parseBooleanEnvValue('TRUE')).toBe(true)
    expect(parseBooleanEnvValue('1')).toBe(true)
  })

  it('treats false-like and empty values as disabled', () => {
    expect(parseBooleanEnvValue(false)).toBe(false)
    expect(parseBooleanEnvValue('false')).toBe(false)
    expect(parseBooleanEnvValue('FALSE')).toBe(false)
    expect(parseBooleanEnvValue('0')).toBe(false)
    expect(parseBooleanEnvValue('')).toBe(false)
    expect(parseBooleanEnvValue(undefined)).toBe(false)
  })
})
