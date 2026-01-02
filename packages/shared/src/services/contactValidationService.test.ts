/**
 * ContactValidationService Tests - Story 7.5.4 Task 8
 *
 * Tests for validating safe adult contact information.
 * AC6: Phone and email support
 *
 * Validates phone numbers and email addresses for safe adult designation.
 * TDD approach: Write tests first, then implementation.
 */

import { describe, it, expect } from 'vitest'
import {
  // Phone validation
  isValidPhoneNumber,
  normalizePhoneNumber,
  getPhoneNumberType,
  // Email validation
  isValidEmail,
  normalizeEmail,
  // Combined validation
  validateContactInput,
  validateSafeAdultContact,
  // Phone parsing
  parsePhoneNumber,
  formatPhoneNumber,
  // Types
  type PhoneValidationResult,
  type EmailValidationResult,
  type ContactValidationResult,
} from './contactValidationService'

describe('ContactValidationService', () => {
  // ============================================
  // Phone Number Validation Tests
  // ============================================

  describe('isValidPhoneNumber', () => {
    it('should accept 10-digit phone number', () => {
      expect(isValidPhoneNumber('5551234567')).toBe(true)
    })

    it('should accept phone with dashes', () => {
      expect(isValidPhoneNumber('555-123-4567')).toBe(true)
    })

    it('should accept phone with parentheses', () => {
      expect(isValidPhoneNumber('(555) 123-4567')).toBe(true)
    })

    it('should accept phone with spaces', () => {
      expect(isValidPhoneNumber('555 123 4567')).toBe(true)
    })

    it('should accept phone with dots', () => {
      expect(isValidPhoneNumber('555.123.4567')).toBe(true)
    })

    it('should accept phone with country code', () => {
      expect(isValidPhoneNumber('+1 555 123 4567')).toBe(true)
    })

    it('should accept 11-digit phone with leading 1', () => {
      expect(isValidPhoneNumber('15551234567')).toBe(true)
    })

    it('should reject short phone number', () => {
      expect(isValidPhoneNumber('555123')).toBe(false)
    })

    it('should reject phone with letters', () => {
      expect(isValidPhoneNumber('555-ABC-4567')).toBe(false)
    })

    it('should reject empty string', () => {
      expect(isValidPhoneNumber('')).toBe(false)
    })

    it('should reject only whitespace', () => {
      expect(isValidPhoneNumber('   ')).toBe(false)
    })

    it('should accept international format', () => {
      expect(isValidPhoneNumber('+44 20 7946 0958')).toBe(true)
    })
  })

  // ============================================
  // Phone Normalization Tests
  // ============================================

  describe('normalizePhoneNumber', () => {
    it('should normalize to E.164 format', () => {
      expect(normalizePhoneNumber('555-123-4567')).toBe('+15551234567')
    })

    it('should preserve existing country code', () => {
      expect(normalizePhoneNumber('+1 555-123-4567')).toBe('+15551234567')
    })

    it('should add +1 to 10-digit number', () => {
      expect(normalizePhoneNumber('5551234567')).toBe('+15551234567')
    })

    it('should handle 11-digit with leading 1', () => {
      expect(normalizePhoneNumber('15551234567')).toBe('+15551234567')
    })

    it('should return null for invalid phone', () => {
      expect(normalizePhoneNumber('abc')).toBeNull()
    })

    it('should strip all formatting', () => {
      expect(normalizePhoneNumber('(555) 123-4567')).toBe('+15551234567')
    })
  })

  // ============================================
  // Phone Type Detection Tests
  // ============================================

  describe('getPhoneNumberType', () => {
    it('should detect mobile number', () => {
      const result = getPhoneNumberType('+15551234567')
      expect(result).toBe('mobile')
    })

    it('should return unknown for invalid', () => {
      const result = getPhoneNumberType('abc')
      expect(result).toBe('unknown')
    })

    it('should default to mobile for US numbers', () => {
      const result = getPhoneNumberType('+15551234567')
      expect(['mobile', 'landline', 'unknown']).toContain(result)
    })
  })

  // ============================================
  // Phone Parsing Tests
  // ============================================

  describe('parsePhoneNumber', () => {
    it('should parse formatted phone number', () => {
      const result = parsePhoneNumber('(555) 123-4567')
      expect(result.isValid).toBe(true)
      expect(result.normalized).toBe('+15551234567')
    })

    it('should return invalid for bad input', () => {
      const result = parsePhoneNumber('abc')
      expect(result.isValid).toBe(false)
    })

    it('should include country code info', () => {
      const result = parsePhoneNumber('+1 555 123 4567')
      expect(result.countryCode).toBe('1')
    })

    it('should extract area code', () => {
      const result = parsePhoneNumber('(555) 123-4567')
      if (result.isValid) {
        expect(result.areaCode).toBe('555')
      }
    })
  })

  // ============================================
  // Phone Formatting Tests
  // ============================================

  describe('formatPhoneNumber', () => {
    it('should format for display', () => {
      const result = formatPhoneNumber('+15551234567')
      expect(result).toMatch(/555.*123.*4567/)
    })

    it('should format E.164 to readable', () => {
      const result = formatPhoneNumber('+15551234567', 'national')
      expect(result).toMatch(/555.*123.*4567/)
    })

    it('should preserve international format option', () => {
      const result = formatPhoneNumber('+15551234567', 'international')
      expect(result).toMatch(/\+1/)
    })

    it('should return original for invalid', () => {
      const result = formatPhoneNumber('abc')
      expect(result).toBe('abc')
    })
  })

  // ============================================
  // Email Validation Tests
  // ============================================

  describe('isValidEmail', () => {
    it('should accept valid email', () => {
      expect(isValidEmail('user@example.com')).toBe(true)
    })

    it('should accept email with subdomain', () => {
      expect(isValidEmail('user@mail.example.com')).toBe(true)
    })

    it('should accept email with plus sign', () => {
      expect(isValidEmail('user+tag@example.com')).toBe(true)
    })

    it('should accept email with dots', () => {
      expect(isValidEmail('first.last@example.com')).toBe(true)
    })

    it('should reject email without @', () => {
      expect(isValidEmail('userexample.com')).toBe(false)
    })

    it('should reject email without domain', () => {
      expect(isValidEmail('user@')).toBe(false)
    })

    it('should reject email without local part', () => {
      expect(isValidEmail('@example.com')).toBe(false)
    })

    it('should reject empty string', () => {
      expect(isValidEmail('')).toBe(false)
    })

    it('should reject email with spaces', () => {
      expect(isValidEmail('user @example.com')).toBe(false)
    })

    it('should reject email without TLD', () => {
      expect(isValidEmail('user@example')).toBe(false)
    })
  })

  // ============================================
  // Email Normalization Tests
  // ============================================

  describe('normalizeEmail', () => {
    it('should lowercase email', () => {
      expect(normalizeEmail('User@Example.COM')).toBe('user@example.com')
    })

    it('should trim whitespace', () => {
      expect(normalizeEmail('  user@example.com  ')).toBe('user@example.com')
    })

    it('should return null for invalid', () => {
      expect(normalizeEmail('invalid')).toBeNull()
    })

    it('should handle mixed case domain', () => {
      expect(normalizeEmail('user@Example.Com')).toBe('user@example.com')
    })
  })

  // ============================================
  // Combined Validation Tests
  // ============================================

  describe('validateContactInput', () => {
    it('should validate phone input', () => {
      const result = validateContactInput('555-123-4567', 'phone')
      expect(result.isValid).toBe(true)
      expect(result.normalized).toBe('+15551234567')
    })

    it('should validate email input', () => {
      const result = validateContactInput('user@example.com', 'email')
      expect(result.isValid).toBe(true)
      expect(result.normalized).toBe('user@example.com')
    })

    it('should return error for invalid phone', () => {
      const result = validateContactInput('abc', 'phone')
      expect(result.isValid).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('should return error for invalid email', () => {
      const result = validateContactInput('invalid', 'email')
      expect(result.isValid).toBe(false)
      expect(result.error).toBeTruthy()
    })
  })

  // ============================================
  // Safe Adult Contact Validation Tests
  // ============================================

  describe('validateSafeAdultContact', () => {
    it('should validate phone only', () => {
      const result = validateSafeAdultContact({ phone: '555-123-4567' })
      expect(result.isValid).toBe(true)
      expect(result.normalizedPhone).toBe('+15551234567')
    })

    it('should validate email only', () => {
      const result = validateSafeAdultContact({ email: 'user@example.com' })
      expect(result.isValid).toBe(true)
      expect(result.normalizedEmail).toBe('user@example.com')
    })

    it('should validate both contacts', () => {
      const result = validateSafeAdultContact({
        phone: '555-123-4567',
        email: 'user@example.com',
      })
      expect(result.isValid).toBe(true)
      expect(result.normalizedPhone).toBe('+15551234567')
      expect(result.normalizedEmail).toBe('user@example.com')
    })

    it('should require at least one contact', () => {
      const result = validateSafeAdultContact({})
      expect(result.isValid).toBe(false)
      expect(result.error).toMatch(/at least one/i)
    })

    it('should fail if phone is invalid', () => {
      const result = validateSafeAdultContact({ phone: 'abc' })
      expect(result.isValid).toBe(false)
      expect(result.phoneError).toBeTruthy()
    })

    it('should fail if email is invalid', () => {
      const result = validateSafeAdultContact({ email: 'invalid' })
      expect(result.isValid).toBe(false)
      expect(result.emailError).toBeTruthy()
    })

    it('should allow valid phone with invalid email', () => {
      const result = validateSafeAdultContact({
        phone: '555-123-4567',
        email: 'invalid',
      })
      expect(result.isValid).toBe(false)
      expect(result.emailError).toBeTruthy()
    })

    it('should determine preferred method from phone', () => {
      const result = validateSafeAdultContact({ phone: '555-123-4567' })
      expect(result.preferredMethod).toBe('sms')
    })

    it('should determine preferred method from email', () => {
      const result = validateSafeAdultContact({ email: 'user@example.com' })
      expect(result.preferredMethod).toBe('email')
    })

    it('should prefer SMS when both provided', () => {
      const result = validateSafeAdultContact({
        phone: '555-123-4567',
        email: 'user@example.com',
      })
      expect(result.preferredMethod).toBe('sms')
    })
  })

  // ============================================
  // Type Export Tests
  // ============================================

  describe('types', () => {
    it('should export PhoneValidationResult', () => {
      const result: PhoneValidationResult = {
        isValid: true,
        normalized: '+15551234567',
        countryCode: '1',
        areaCode: '555',
      }
      expect(result.isValid).toBe(true)
    })

    it('should export EmailValidationResult', () => {
      const result: EmailValidationResult = {
        isValid: true,
        normalized: 'user@example.com',
      }
      expect(result.isValid).toBe(true)
    })

    it('should export ContactValidationResult', () => {
      const result: ContactValidationResult = {
        isValid: true,
        normalized: 'user@example.com',
      }
      expect(result.isValid).toBe(true)
    })
  })
})
