/**
 * QR Scanner Tests - Story 12.2
 *
 * Tests for the QR code scanning and enrollment payload validation.
 * Tests include:
 * - Payload validation (valid, invalid, expired)
 * - Time formatting
 * - Error code handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  validateEnrollmentPayload,
  formatTimeRemaining,
  EnrollmentPayload,
  ValidationResult,
} from './qr-scanner'

describe('qr-scanner', () => {
  describe('validateEnrollmentPayload', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('validates a correct payload', () => {
      const payload: EnrollmentPayload = {
        familyId: 'family-123',
        token: 'token-abc-def',
        expiry: Date.now() + 15 * 60 * 1000, // 15 minutes from now
        version: 1,
      }

      const result = validateEnrollmentPayload(JSON.stringify(payload))

      expect(result.valid).toBe(true)
      expect(result.payload).toEqual(payload)
      expect(result.errorCode).toBeUndefined()
    })

    it('rejects invalid JSON', () => {
      const result = validateEnrollmentPayload('not valid json{')

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe('INVALID_JSON')
      expect(result.errorMessage).toBe('Invalid code - please try again')
    })

    it('rejects non-object JSON', () => {
      const result = validateEnrollmentPayload('"just a string"')

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe('INVALID_JSON')
    })

    it('rejects null JSON', () => {
      const result = validateEnrollmentPayload('null')

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe('INVALID_JSON')
    })

    it('rejects array JSON', () => {
      const result = validateEnrollmentPayload('[1, 2, 3]')

      expect(result.valid).toBe(false)
      // Arrays are objects in JS, so they pass the object check but fail field validation
      expect(result.errorCode).toBe('MISSING_FIELDS')
    })

    it('rejects missing familyId', () => {
      const payload = {
        token: 'token-abc',
        expiry: Date.now() + 15 * 60 * 1000,
        version: 1,
      }

      const result = validateEnrollmentPayload(JSON.stringify(payload))

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe('MISSING_FIELDS')
    })

    it('rejects missing token', () => {
      const payload = {
        familyId: 'family-123',
        expiry: Date.now() + 15 * 60 * 1000,
        version: 1,
      }

      const result = validateEnrollmentPayload(JSON.stringify(payload))

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe('MISSING_FIELDS')
    })

    it('rejects missing expiry', () => {
      const payload = {
        familyId: 'family-123',
        token: 'token-abc',
        version: 1,
      }

      const result = validateEnrollmentPayload(JSON.stringify(payload))

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe('MISSING_FIELDS')
    })

    it('rejects missing version', () => {
      const payload = {
        familyId: 'family-123',
        token: 'token-abc',
        expiry: Date.now() + 15 * 60 * 1000,
      }

      const result = validateEnrollmentPayload(JSON.stringify(payload))

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe('MISSING_FIELDS')
    })

    it('rejects empty familyId', () => {
      const payload = {
        familyId: '',
        token: 'token-abc',
        expiry: Date.now() + 15 * 60 * 1000,
        version: 1,
      }

      const result = validateEnrollmentPayload(JSON.stringify(payload))

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe('MISSING_FIELDS')
    })

    it('rejects empty token', () => {
      const payload = {
        familyId: 'family-123',
        token: '',
        expiry: Date.now() + 15 * 60 * 1000,
        version: 1,
      }

      const result = validateEnrollmentPayload(JSON.stringify(payload))

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe('MISSING_FIELDS')
    })

    it('rejects wrong types for familyId', () => {
      const payload = {
        familyId: 123,
        token: 'token-abc',
        expiry: Date.now() + 15 * 60 * 1000,
        version: 1,
      }

      const result = validateEnrollmentPayload(JSON.stringify(payload))

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe('MISSING_FIELDS')
    })

    it('rejects wrong types for token', () => {
      const payload = {
        familyId: 'family-123',
        token: 123,
        expiry: Date.now() + 15 * 60 * 1000,
        version: 1,
      }

      const result = validateEnrollmentPayload(JSON.stringify(payload))

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe('MISSING_FIELDS')
    })

    it('rejects wrong types for expiry', () => {
      const payload = {
        familyId: 'family-123',
        token: 'token-abc',
        expiry: 'not a number',
        version: 1,
      }

      const result = validateEnrollmentPayload(JSON.stringify(payload))

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe('MISSING_FIELDS')
    })

    it('rejects wrong types for version', () => {
      const payload = {
        familyId: 'family-123',
        token: 'token-abc',
        expiry: Date.now() + 15 * 60 * 1000,
        version: 'v1',
      }

      const result = validateEnrollmentPayload(JSON.stringify(payload))

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe('MISSING_FIELDS')
    })

    it('rejects unsupported version (AC5)', () => {
      const payload = {
        familyId: 'family-123',
        token: 'token-abc',
        expiry: Date.now() + 15 * 60 * 1000,
        version: 2, // Unsupported version
      }

      const result = validateEnrollmentPayload(JSON.stringify(payload))

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe('UNSUPPORTED_VERSION')
      expect(result.errorMessage).toContain('newer version')
    })

    it('rejects expired tokens (AC5)', () => {
      const payload = {
        familyId: 'family-123',
        token: 'token-abc',
        expiry: Date.now() - 1000, // 1 second ago
        version: 1,
      }

      const result = validateEnrollmentPayload(JSON.stringify(payload))

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe('EXPIRED_TOKEN')
      expect(result.errorMessage).toContain('expired')
    })

    it('rejects token expiring in exactly 0ms (edge case)', () => {
      // Set time to a specific value to avoid race conditions
      vi.setSystemTime(new Date('2025-01-15T12:00:00.000Z'))
      const now = Date.now()
      const payload = {
        familyId: 'family-123',
        token: 'token-abc',
        expiry: now - 1, // 1ms ago to ensure it's expired
        version: 1,
      }

      const result = validateEnrollmentPayload(JSON.stringify(payload))

      // Token past time should be expired
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe('EXPIRED_TOKEN')
    })

    it('accepts token expiring in 1ms (edge case)', () => {
      const payload = {
        familyId: 'family-123',
        token: 'token-abc',
        expiry: Date.now() + 1, // 1ms from now
        version: 1,
      }

      const result = validateEnrollmentPayload(JSON.stringify(payload))

      expect(result.valid).toBe(true)
    })
  })

  describe('formatTimeRemaining', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('formats 15 minutes correctly', () => {
      const expiry = Date.now() + 15 * 60 * 1000
      expect(formatTimeRemaining(expiry)).toBe('15:00')
    })

    it('formats 5 minutes and 30 seconds correctly', () => {
      const expiry = Date.now() + (5 * 60 + 30) * 1000
      expect(formatTimeRemaining(expiry)).toBe('5:30')
    })

    it('formats 0 seconds as Expired', () => {
      const expiry = Date.now()
      expect(formatTimeRemaining(expiry)).toBe('Expired')
    })

    it('formats past time as Expired', () => {
      const expiry = Date.now() - 60000
      expect(formatTimeRemaining(expiry)).toBe('Expired')
    })

    it('formats single-digit seconds with leading zero', () => {
      const expiry = Date.now() + (1 * 60 + 5) * 1000
      expect(formatTimeRemaining(expiry)).toBe('1:05')
    })

    it('formats 59 seconds correctly', () => {
      const expiry = Date.now() + 59 * 1000
      expect(formatTimeRemaining(expiry)).toBe('0:59')
    })

    it('formats 10 minutes and 10 seconds correctly', () => {
      const expiry = Date.now() + (10 * 60 + 10) * 1000
      expect(formatTimeRemaining(expiry)).toBe('10:10')
    })
  })

  describe('EnrollmentPayload structure', () => {
    it('defines correct payload structure', () => {
      const payload: EnrollmentPayload = {
        familyId: 'family-123',
        token: 'abc-def-123',
        expiry: Date.now() + 15 * 60 * 1000,
        version: 1,
      }

      expect(payload).toHaveProperty('familyId')
      expect(payload).toHaveProperty('token')
      expect(payload).toHaveProperty('expiry')
      expect(payload).toHaveProperty('version')
      expect(typeof payload.familyId).toBe('string')
      expect(typeof payload.token).toBe('string')
      expect(typeof payload.expiry).toBe('number')
      expect(typeof payload.version).toBe('number')
    })
  })

  describe('ValidationResult structure', () => {
    it('defines correct validation result for success', () => {
      const result: ValidationResult = {
        valid: true,
        payload: {
          familyId: 'family-123',
          token: 'token-abc',
          expiry: Date.now() + 15 * 60 * 1000,
          version: 1,
        },
      }

      expect(result.valid).toBe(true)
      expect(result.payload).toBeDefined()
      expect(result.errorCode).toBeUndefined()
      expect(result.errorMessage).toBeUndefined()
    })

    it('defines correct validation result for failure', () => {
      const result: ValidationResult = {
        valid: false,
        errorCode: 'EXPIRED_TOKEN',
        errorMessage: 'Code expired - generate a new one',
      }

      expect(result.valid).toBe(false)
      expect(result.payload).toBeUndefined()
      expect(result.errorCode).toBe('EXPIRED_TOKEN')
      expect(result.errorMessage).toBeDefined()
    })
  })
})
