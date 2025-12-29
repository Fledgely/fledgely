/**
 * TOTP Utilities Tests - Story 13.1
 *
 * Tests for RFC 6238 compliant TOTP implementation.
 *
 * Test Coverage:
 * - Task 5.1: TOTP secret generation (correct length, randomness) - tested in enrollment.test.ts
 * - Task 5.2: TOTP code generation (valid 6-digit codes)
 * - Task 5.3: TOTP code verification (correct validation)
 * - Task 5.4: Time drift tolerance
 * - Task 5.5: Extension storage encryption/decryption - tested separately
 */

import {
  base32Decode,
  getTotpCounter,
  generateTotpCode,
  verifyTotpCode,
  getTotpRemainingSeconds,
  generateTotpUri,
  TOTP_DIGITS,
  TOTP_PERIOD_SECONDS,
} from './totp-utils'

describe('TOTP Utilities - Story 13.1', () => {
  // RFC 6238 test vector secret (Base32 encoded "12345678901234567890")
  const TEST_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

  // RFC 6238 test vectors (Table 1)
  // These are the official test cases from the RFC
  const RFC_TEST_VECTORS = [
    { time: 59000, expected: '287082' }, // Counter: 1
    { time: 1111111109000, expected: '081804' }, // Counter: 37037036
    { time: 1111111111000, expected: '050471' }, // Counter: 37037037
    { time: 1234567890000, expected: '005924' }, // Counter: 41152263
    { time: 2000000000000, expected: '279037' }, // Counter: 66666666
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
      // "12345678901234567890" is 20 bytes
      expect(decoded.length).toBe(20)
      expect(String.fromCharCode(...decoded)).toBe('12345678901234567890')
    })

    it('should throw on invalid Base32 characters', () => {
      expect(() => base32Decode('INVALID1!')).toThrow('Invalid Base32 character')
    })
  })

  describe('getTotpCounter', () => {
    it('should calculate correct counter for timestamp', () => {
      // Counter = floor(timestamp_seconds / 30)
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
      // Test with a timestamp known to produce a code starting with 0
      // RFC test vector: time 1234567890000 produces "005924"
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

      // Codes should be different (statistically very unlikely to be same)
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

  describe('verifyTotpCode', () => {
    it('should verify valid code for current time', async () => {
      const timestamp = 59000 // RFC test case
      const code = await generateTotpCode(TEST_SECRET, timestamp)
      const isValid = await verifyTotpCode(TEST_SECRET, code, 1, timestamp)

      expect(isValid).toBe(true)
    })

    it('should reject invalid codes', async () => {
      const isValid = await verifyTotpCode(TEST_SECRET, '000000', 1, 59000)
      expect(isValid).toBe(false)
    })

    it('should accept codes within time window (drift tolerance)', async () => {
      // Current period is counter=2 (60-89 seconds)
      const timestamp = 60000 // Start of third period (counter=2)
      // Previous period is counter=1 (30-59 seconds)
      const previousCode = await generateTotpCode(TEST_SECRET, 45000) // Mid previous period

      // Should accept previous period's code with window=1
      // window=1 means we check counters 1, 2, 3 when current is 2
      const isValid = await verifyTotpCode(TEST_SECRET, previousCode, 1, timestamp)
      expect(isValid).toBe(true)
    })

    it('should accept codes from future window (clock ahead)', async () => {
      const timestamp = 29000 // End of first period
      const nextCode = await generateTotpCode(TEST_SECRET, 31000) // Next period

      // Should accept next period's code with window=1
      const isValid = await verifyTotpCode(TEST_SECRET, nextCode, 1, timestamp)
      expect(isValid).toBe(true)
    })

    it('should reject codes outside time window', async () => {
      const timestamp = 120000 // Third period (counter=4)
      const oldCode = await generateTotpCode(TEST_SECRET, 0) // First period (counter=0)

      // window=1 means only counter 3,4,5 are valid
      const isValid = await verifyTotpCode(TEST_SECRET, oldCode, 1, timestamp)
      expect(isValid).toBe(false)
    })

    it('should handle codes with spaces', async () => {
      const code = await generateTotpCode(TEST_SECRET, 59000)
      const codeWithSpaces = code.slice(0, 3) + ' ' + code.slice(3)

      const isValid = await verifyTotpCode(TEST_SECRET, codeWithSpaces, 1, 59000)
      expect(isValid).toBe(true)
    })

    it('should reject non-numeric codes', async () => {
      const isValid = await verifyTotpCode(TEST_SECRET, 'abcdef', 1, 59000)
      expect(isValid).toBe(false)
    })

    it('should reject codes of wrong length', async () => {
      const isValid = await verifyTotpCode(TEST_SECRET, '12345', 1, 59000)
      expect(isValid).toBe(false)
    })
  })

  describe('getTotpRemainingSeconds', () => {
    it('should return correct remaining seconds', () => {
      // At 0 seconds into period, 30 seconds remain
      expect(getTotpRemainingSeconds(0)).toBe(30)

      // At 15 seconds into period, 15 seconds remain
      expect(getTotpRemainingSeconds(15000)).toBe(15)

      // At 29 seconds into period, 1 second remains
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

  describe('generateTotpUri', () => {
    it('should generate valid otpauth URI', () => {
      const uri = generateTotpUri(TEST_SECRET, 'Test Device')

      expect(uri).toMatch(/^otpauth:\/\/totp\//)
      expect(uri).toContain(TEST_SECRET)
      expect(uri).toContain('issuer=Fledgely')
      expect(uri).toContain('algorithm=SHA1')
      expect(uri).toContain('digits=6')
      expect(uri).toContain('period=30')
    })

    it('should encode device name in label', () => {
      const uri = generateTotpUri(TEST_SECRET, 'My Chromebook')

      expect(uri).toContain('Fledgely%3AMy%20Chromebook')
    })

    it('should allow custom issuer', () => {
      const uri = generateTotpUri(TEST_SECRET, 'Device', 'CustomIssuer')

      expect(uri).toContain('issuer=CustomIssuer')
    })
  })

  describe('Constants', () => {
    it('should have correct TOTP parameters', () => {
      expect(TOTP_DIGITS).toBe(6)
      expect(TOTP_PERIOD_SECONDS).toBe(30)
    })
  })
})
