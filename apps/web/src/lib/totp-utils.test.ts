/**
 * TOTP Utilities Tests - Story 13.2
 *
 * Tests for RFC 6238 compliant TOTP implementation in web dashboard.
 */

import { describe, it, expect } from 'vitest'
import {
  base32Decode,
  getTotpCounter,
  generateTotpCode,
  getTotpRemainingSeconds,
  TOTP_DIGITS,
  TOTP_PERIOD_SECONDS,
} from './totp-utils'

describe('TOTP Utilities - Story 13.2', () => {
  // RFC 6238 test vector secret (Base32 encoded "12345678901234567890")
  const TEST_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

  // RFC 6238 test vectors (Table 1)
  const RFC_TEST_VECTORS = [
    { time: 59000, expected: '287082' },
    { time: 1111111109000, expected: '081804' },
    { time: 1111111111000, expected: '050471' },
    { time: 1234567890000, expected: '005924' },
    { time: 2000000000000, expected: '279037' },
  ]

  describe('base32Decode', () => {
    it('should decode valid Base32 strings', () => {
      // "Hello" in Base32 is "JBSWY3DP"
      const decoded = base32Decode('JBSWY3DP')
      expect(decoded).toEqual(new Uint8Array([72, 101, 108, 108, 111]))
    })

    it('should handle lowercase input', () => {
      const decoded = base32Decode('jbswy3dp')
      expect(decoded).toEqual(new Uint8Array([72, 101, 108, 108, 111]))
    })

    it('should handle padding', () => {
      const decoded = base32Decode('JBSWY3DP======')
      expect(decoded).toEqual(new Uint8Array([72, 101, 108, 108, 111]))
    })

    it('should decode the test secret correctly', () => {
      const decoded = base32Decode(TEST_SECRET)
      expect(decoded.length).toBe(20)
      expect(String.fromCharCode(...decoded)).toBe('12345678901234567890')
    })

    it('should throw on invalid Base32 characters', () => {
      expect(() => base32Decode('INVALID1!')).toThrow('Invalid Base32 character')
    })
  })

  describe('getTotpCounter', () => {
    it('should calculate correct counter for timestamp', () => {
      expect(getTotpCounter(0)).toBe(0)
      expect(getTotpCounter(30000)).toBe(1)
      expect(getTotpCounter(59000)).toBe(1)
      expect(getTotpCounter(60000)).toBe(2)
    })

    it('should use current time when no timestamp provided', () => {
      const now = Date.now()
      const expected = Math.floor(now / 1000 / 30)
      expect(getTotpCounter()).toBe(expected)
    })
  })

  describe('generateTotpCode', () => {
    it('should generate 6-digit codes', async () => {
      const code = await generateTotpCode(TEST_SECRET)
      expect(code).toMatch(/^\d{6}$/)
    })

    it('should pad codes with leading zeros', async () => {
      const code = await generateTotpCode(TEST_SECRET, 1234567890000)
      expect(code).toBe('005924')
      expect(code.length).toBe(6)
    })

    it('should match RFC 6238 test vectors', async () => {
      for (const vector of RFC_TEST_VECTORS) {
        const code = await generateTotpCode(TEST_SECRET, vector.time)
        expect(code).toBe(vector.expected)
      }
    })

    it('should generate different codes for different time periods', async () => {
      const code1 = await generateTotpCode(TEST_SECRET, 0)
      const code2 = await generateTotpCode(TEST_SECRET, 30000)
      const code3 = await generateTotpCode(TEST_SECRET, 60000)

      expect(code1).not.toBe(code2)
      expect(code2).not.toBe(code3)
    })

    it('should generate same code within the same time period', async () => {
      const code1 = await generateTotpCode(TEST_SECRET, 15000)
      const code2 = await generateTotpCode(TEST_SECRET, 29000)

      expect(code1).toBe(code2)
    })

    it('should throw on invalid Base32 secret', async () => {
      await expect(generateTotpCode('INVALID!')).rejects.toThrow()
    })
  })

  describe('getTotpRemainingSeconds', () => {
    it('should return correct remaining seconds', () => {
      expect(getTotpRemainingSeconds(0)).toBe(30)
      expect(getTotpRemainingSeconds(15000)).toBe(15)
      expect(getTotpRemainingSeconds(29000)).toBe(1)
    })

    it('should return value between 1 and 30', () => {
      for (let i = 0; i < 60; i++) {
        const remaining = getTotpRemainingSeconds(i * 1000)
        expect(remaining).toBeGreaterThanOrEqual(1)
        expect(remaining).toBeLessThanOrEqual(30)
      }
    })
  })

  describe('Constants', () => {
    it('should have correct TOTP parameters', () => {
      expect(TOTP_DIGITS).toBe(6)
      expect(TOTP_PERIOD_SECONDS).toBe(30)
    })
  })
})
