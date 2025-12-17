/**
 * Safe Adult Schema Tests
 *
 * Story 7.5.4: Safe Adult Designation - Task 1
 *
 * Tests for safe adult contact schemas, validation, and helpers.
 */

import { describe, it, expect } from 'vitest'
import {
  // Constants
  SAFE_ADULT_CONSTANTS,
  VALIDATION_ERROR_MESSAGES,

  // Contact type
  contactTypeSchema,
  type ContactType,

  // Phone validation
  extractPhoneDigits,
  validatePhoneNumber,
  isValidPhoneNumber,
  phoneNumberSchema,

  // Email validation
  validateEmailAddress,
  isValidEmailAddress,
  emailAddressSchema,

  // Contact validation
  validateContact,
  isValidContact,

  // Masking
  maskPhoneNumber,
  maskEmailAddress,
  maskContact,

  // Schemas
  safeAdultContactSchema,
  safeAdultContactInputSchema,
  safeAdultDesignationSchema,
  safeAdultDesignationInputSchema,
  safeAdultNotificationRequestSchema,
  safeAdultNotificationResponseSchema,

  // Helpers
  getContactTypeLabel,
  formatNotificationMessage,
  getSmsNotificationMessage,
  getEmailNotificationSubject,
  getEmailNotificationBody,
  safeParseSafeAdultContact,
  safeParseSafeAdultDesignation,
  safeParseSafeAdultNotificationRequest,
  createSafeAdultContactInput,
  normalizePhoneNumber,
  normalizeEmailAddress,
  normalizeContact,
} from './safeAdult.schema'

// ============================================================================
// Constants Tests
// ============================================================================

describe('SAFE_ADULT_CONSTANTS', () => {
  it('should have correct collection name', () => {
    expect(SAFE_ADULT_CONSTANTS.COLLECTION).toBe('safe-adult-designations')
  })

  it('should have valid phone digit constraints', () => {
    expect(SAFE_ADULT_CONSTANTS.MIN_PHONE_DIGITS).toBe(10)
    expect(SAFE_ADULT_CONSTANTS.MAX_PHONE_DIGITS).toBe(15)
  })

  it('should have max notifications per signal', () => {
    expect(SAFE_ADULT_CONSTANTS.MAX_NOTIFICATIONS_PER_SIGNAL).toBe(3)
  })

  it('should have generic message templates (no app mention)', () => {
    expect(SAFE_ADULT_CONSTANTS.SMS_TEMPLATE).not.toContain('fledgely')
    expect(SAFE_ADULT_CONSTANTS.SMS_TEMPLATE).not.toContain('Fledgely')
    expect(SAFE_ADULT_CONSTANTS.EMAIL_TEMPLATE).not.toContain('fledgely')
    expect(SAFE_ADULT_CONSTANTS.EMAIL_TEMPLATE).not.toContain('Fledgely')
    expect(SAFE_ADULT_CONSTANTS.EMAIL_SUBJECT).not.toContain('fledgely')
  })

  it('should have templates with firstName placeholder', () => {
    expect(SAFE_ADULT_CONSTANTS.SMS_TEMPLATE).toContain('{firstName}')
    expect(SAFE_ADULT_CONSTANTS.EMAIL_TEMPLATE).toContain('{firstName}')
  })
})

describe('VALIDATION_ERROR_MESSAGES', () => {
  it('should have child-friendly phone error messages', () => {
    expect(VALIDATION_ERROR_MESSAGES.phone.empty).toBeTruthy()
    expect(VALIDATION_ERROR_MESSAGES.phone.tooShort).toContain('area code')
    expect(VALIDATION_ERROR_MESSAGES.phone.tooLong).toContain('extra')
    expect(VALIDATION_ERROR_MESSAGES.phone.invalidFormat).toContain('Try again')
  })

  it('should have child-friendly email error messages', () => {
    expect(VALIDATION_ERROR_MESSAGES.email.empty).toBeTruthy()
    expect(VALIDATION_ERROR_MESSAGES.email.missingAt).toContain('@')
    expect(VALIDATION_ERROR_MESSAGES.email.missingDomain).toContain('domain')
    expect(VALIDATION_ERROR_MESSAGES.email.invalidFormat).toContain('Try again')
  })
})

// ============================================================================
// Contact Type Tests
// ============================================================================

describe('contactTypeSchema', () => {
  it('should accept phone type', () => {
    expect(contactTypeSchema.parse('phone')).toBe('phone')
  })

  it('should accept email type', () => {
    expect(contactTypeSchema.parse('email')).toBe('email')
  })

  it('should reject invalid types', () => {
    expect(() => contactTypeSchema.parse('sms')).toThrow()
    expect(() => contactTypeSchema.parse('text')).toThrow()
    expect(() => contactTypeSchema.parse('')).toThrow()
  })
})

// ============================================================================
// Phone Validation Tests
// ============================================================================

describe('extractPhoneDigits', () => {
  it('should extract digits from formatted phone', () => {
    expect(extractPhoneDigits('(555) 123-4567')).toBe('5551234567')
    expect(extractPhoneDigits('555-123-4567')).toBe('5551234567')
    expect(extractPhoneDigits('+1 555 123 4567')).toBe('15551234567')
  })

  it('should return only digits', () => {
    expect(extractPhoneDigits('abc123def456')).toBe('123456')
  })

  it('should handle empty string', () => {
    expect(extractPhoneDigits('')).toBe('')
  })
})

describe('validatePhoneNumber', () => {
  it('should return null for valid phone numbers', () => {
    expect(validatePhoneNumber('5551234567')).toBeNull()
    expect(validatePhoneNumber('(555) 123-4567')).toBeNull()
    expect(validatePhoneNumber('555-123-4567')).toBeNull()
    expect(validatePhoneNumber('+1 555 123 4567')).toBeNull()
    expect(validatePhoneNumber('15551234567')).toBeNull()
  })

  it('should return error for empty phone', () => {
    expect(validatePhoneNumber('')).toBe(VALIDATION_ERROR_MESSAGES.phone.empty)
    expect(validatePhoneNumber('   ')).toBe(VALIDATION_ERROR_MESSAGES.phone.empty)
  })

  it('should return error for too short phone', () => {
    expect(validatePhoneNumber('123')).toBe(VALIDATION_ERROR_MESSAGES.phone.tooShort)
    expect(validatePhoneNumber('123456789')).toBe(VALIDATION_ERROR_MESSAGES.phone.tooShort) // 9 digits
  })

  it('should return error for too long phone', () => {
    expect(validatePhoneNumber('1234567890123456')).toBe(VALIDATION_ERROR_MESSAGES.phone.tooLong) // 16 digits
  })
})

describe('isValidPhoneNumber', () => {
  it('should return true for valid phones', () => {
    expect(isValidPhoneNumber('5551234567')).toBe(true)
    expect(isValidPhoneNumber('(555) 123-4567')).toBe(true)
  })

  it('should return false for invalid phones', () => {
    expect(isValidPhoneNumber('')).toBe(false)
    expect(isValidPhoneNumber('123')).toBe(false)
  })
})

describe('phoneNumberSchema', () => {
  it('should parse valid phone numbers', () => {
    expect(phoneNumberSchema.safeParse('5551234567').success).toBe(true)
    expect(phoneNumberSchema.safeParse('(555) 123-4567').success).toBe(true)
  })

  it('should reject invalid phone numbers', () => {
    expect(phoneNumberSchema.safeParse('123').success).toBe(false)
    expect(phoneNumberSchema.safeParse('').success).toBe(false)
  })
})

// ============================================================================
// Email Validation Tests
// ============================================================================

describe('validateEmailAddress', () => {
  it('should return null for valid emails', () => {
    expect(validateEmailAddress('test@example.com')).toBeNull()
    expect(validateEmailAddress('user.name@domain.org')).toBeNull()
    expect(validateEmailAddress('user+tag@gmail.com')).toBeNull()
    expect(validateEmailAddress('test@sub.domain.com')).toBeNull()
  })

  it('should return error for empty email', () => {
    expect(validateEmailAddress('')).toBe(VALIDATION_ERROR_MESSAGES.email.empty)
    expect(validateEmailAddress('   ')).toBe(VALIDATION_ERROR_MESSAGES.email.empty)
  })

  it('should return error for missing @', () => {
    expect(validateEmailAddress('testexample.com')).toBe(VALIDATION_ERROR_MESSAGES.email.missingAt)
  })

  it('should return error for missing domain', () => {
    expect(validateEmailAddress('test@')).toBe(VALIDATION_ERROR_MESSAGES.email.missingDomain)
    expect(validateEmailAddress('test@domain')).toBe(VALIDATION_ERROR_MESSAGES.email.missingDomain)
  })

  it('should return error for invalid format', () => {
    expect(validateEmailAddress('test @example.com')).toBe(VALIDATION_ERROR_MESSAGES.email.invalidFormat)
  })
})

describe('isValidEmailAddress', () => {
  it('should return true for valid emails', () => {
    expect(isValidEmailAddress('test@example.com')).toBe(true)
    expect(isValidEmailAddress('user@domain.org')).toBe(true)
  })

  it('should return false for invalid emails', () => {
    expect(isValidEmailAddress('')).toBe(false)
    expect(isValidEmailAddress('invalid')).toBe(false)
    expect(isValidEmailAddress('test@')).toBe(false)
  })
})

describe('emailAddressSchema', () => {
  it('should parse valid emails', () => {
    expect(emailAddressSchema.safeParse('test@example.com').success).toBe(true)
  })

  it('should reject invalid emails', () => {
    expect(emailAddressSchema.safeParse('invalid').success).toBe(false)
    expect(emailAddressSchema.safeParse('').success).toBe(false)
  })
})

// ============================================================================
// Contact Validation Tests
// ============================================================================

describe('validateContact', () => {
  it('should validate phone contacts', () => {
    expect(validateContact('phone', '5551234567')).toBeNull()
    expect(validateContact('phone', '123')).toBe(VALIDATION_ERROR_MESSAGES.phone.tooShort)
  })

  it('should validate email contacts', () => {
    expect(validateContact('email', 'test@example.com')).toBeNull()
    expect(validateContact('email', 'invalid')).toBe(VALIDATION_ERROR_MESSAGES.email.missingAt)
  })
})

describe('isValidContact', () => {
  it('should return true for valid contacts', () => {
    expect(isValidContact('phone', '5551234567')).toBe(true)
    expect(isValidContact('email', 'test@example.com')).toBe(true)
  })

  it('should return false for invalid contacts', () => {
    expect(isValidContact('phone', '123')).toBe(false)
    expect(isValidContact('email', 'invalid')).toBe(false)
  })
})

// ============================================================================
// Masking Tests
// ============================================================================

describe('maskPhoneNumber', () => {
  it('should mask phone number showing last 4 digits', () => {
    expect(maskPhoneNumber('5551234567')).toBe('***-***-4567')
    expect(maskPhoneNumber('(555) 123-4567')).toBe('***-***-4567')
    expect(maskPhoneNumber('+1 555 123 4567')).toBe('***-***-4567')
  })

  it('should handle empty phone', () => {
    expect(maskPhoneNumber('')).toBe('')
  })
})

describe('maskEmailAddress', () => {
  it('should mask email showing first char and domain', () => {
    expect(maskEmailAddress('test@example.com')).toBe('t***@example.com')
    expect(maskEmailAddress('john.doe@gmail.com')).toBe('j***@gmail.com')
  })

  it('should handle empty email', () => {
    expect(maskEmailAddress('')).toBe('')
  })

  it('should handle email without @', () => {
    expect(maskEmailAddress('invalid')).toBe('')
  })
})

describe('maskContact', () => {
  it('should mask phone contacts', () => {
    expect(maskContact('phone', '5551234567')).toBe('***-***-4567')
  })

  it('should mask email contacts', () => {
    expect(maskContact('email', 'test@example.com')).toBe('t***@example.com')
  })
})

// ============================================================================
// Safe Adult Contact Schema Tests
// ============================================================================

describe('safeAdultContactSchema', () => {
  it('should parse valid contact', () => {
    const validContact = {
      type: 'phone',
      value: '5551234567',
      validatedAt: '2024-01-01T00:00:00.000Z',
    }
    expect(safeAdultContactSchema.safeParse(validContact).success).toBe(true)
  })

  it('should parse email contact', () => {
    const validContact = {
      type: 'email',
      value: 'test@example.com',
      validatedAt: '2024-01-01T00:00:00.000Z',
    }
    expect(safeAdultContactSchema.safeParse(validContact).success).toBe(true)
  })

  it('should reject missing fields', () => {
    expect(safeAdultContactSchema.safeParse({}).success).toBe(false)
    expect(safeAdultContactSchema.safeParse({ type: 'phone' }).success).toBe(false)
    expect(safeAdultContactSchema.safeParse({ type: 'phone', value: '' }).success).toBe(false)
  })
})

describe('safeAdultContactInputSchema', () => {
  it('should parse valid input', () => {
    const validInput = {
      type: 'phone',
      value: '5551234567',
    }
    expect(safeAdultContactInputSchema.safeParse(validInput).success).toBe(true)
  })

  it('should reject empty value', () => {
    expect(safeAdultContactInputSchema.safeParse({ type: 'phone', value: '' }).success).toBe(false)
  })
})

// ============================================================================
// Safe Adult Designation Schema Tests
// ============================================================================

describe('safeAdultDesignationSchema', () => {
  it('should parse valid designation', () => {
    const validDesignation = {
      childId: 'child-123',
      childFirstName: 'Alex',
      contact: {
        type: 'phone',
        value: 'encrypted-value',
        validatedAt: '2024-01-01T00:00:00.000Z',
      },
      encryptedAt: '2024-01-01T00:00:00.000Z',
      encryptionKeyId: 'key-123',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    }
    expect(safeAdultDesignationSchema.safeParse(validDesignation).success).toBe(true)
  })

  it('should reject missing required fields', () => {
    expect(safeAdultDesignationSchema.safeParse({}).success).toBe(false)
    expect(safeAdultDesignationSchema.safeParse({ childId: 'child-123' }).success).toBe(false)
  })
})

describe('safeAdultDesignationInputSchema', () => {
  it('should parse valid input', () => {
    const validInput = {
      childId: 'child-123',
      childFirstName: 'Alex',
      contact: {
        type: 'phone',
        value: '5551234567',
      },
    }
    expect(safeAdultDesignationInputSchema.safeParse(validInput).success).toBe(true)
  })
})

// ============================================================================
// Notification Schema Tests
// ============================================================================

describe('safeAdultNotificationRequestSchema', () => {
  it('should parse valid request', () => {
    const validRequest = {
      childFirstName: 'Alex',
      encryptedContact: 'base64-encrypted-data',
      contactType: 'phone',
      encryptionKeyId: 'key-123',
      signalId: 'signal-456',
    }
    expect(safeAdultNotificationRequestSchema.safeParse(validRequest).success).toBe(true)
  })

  it('should reject missing fields', () => {
    expect(safeAdultNotificationRequestSchema.safeParse({}).success).toBe(false)
    expect(safeAdultNotificationRequestSchema.safeParse({ childFirstName: 'Alex' }).success).toBe(false)
  })
})

describe('safeAdultNotificationResponseSchema', () => {
  it('should parse success response', () => {
    const successResponse = {
      success: true,
      error: null,
      sentAt: '2024-01-01T00:00:00.000Z',
    }
    expect(safeAdultNotificationResponseSchema.safeParse(successResponse).success).toBe(true)
  })

  it('should parse error response', () => {
    const errorResponse = {
      success: false,
      error: 'Failed to send notification',
      sentAt: null,
    }
    expect(safeAdultNotificationResponseSchema.safeParse(errorResponse).success).toBe(true)
  })
})

// ============================================================================
// Helper Function Tests
// ============================================================================

describe('getContactTypeLabel', () => {
  it('should return correct labels', () => {
    expect(getContactTypeLabel('phone')).toBe('Phone Number')
    expect(getContactTypeLabel('email')).toBe('Email Address')
  })
})

describe('formatNotificationMessage', () => {
  it('should replace firstName placeholder', () => {
    expect(formatNotificationMessage('{firstName} needs help.', 'Alex')).toBe('Alex needs help.')
  })

  it('should handle template without placeholder', () => {
    expect(formatNotificationMessage('Help needed.', 'Alex')).toBe('Help needed.')
  })
})

describe('getSmsNotificationMessage', () => {
  it('should return message with first name', () => {
    const message = getSmsNotificationMessage('Alex')
    expect(message).toContain('Alex')
    expect(message).toContain('needs help')
    expect(message).not.toContain('fledgely')
  })
})

describe('getEmailNotificationSubject', () => {
  it('should return generic subject without app mention', () => {
    const subject = getEmailNotificationSubject()
    expect(subject).toBeTruthy()
    expect(subject).not.toContain('fledgely')
    expect(subject).not.toContain('Fledgely')
  })
})

describe('getEmailNotificationBody', () => {
  it('should return body with first name', () => {
    const body = getEmailNotificationBody('Alex')
    expect(body).toContain('Alex')
    expect(body).toContain('need help')
    expect(body).not.toContain('fledgely')
  })
})

describe('safeParseSafeAdultContact', () => {
  it('should parse valid contact', () => {
    const result = safeParseSafeAdultContact({
      type: 'phone',
      value: '5551234567',
      validatedAt: '2024-01-01T00:00:00.000Z',
    })
    expect(result).not.toBeNull()
    expect(result?.type).toBe('phone')
  })

  it('should return null for invalid input', () => {
    expect(safeParseSafeAdultContact({})).toBeNull()
    expect(safeParseSafeAdultContact(null)).toBeNull()
    expect(safeParseSafeAdultContact('invalid')).toBeNull()
  })
})

describe('safeParseSafeAdultDesignation', () => {
  it('should parse valid designation', () => {
    const result = safeParseSafeAdultDesignation({
      childId: 'child-123',
      childFirstName: 'Alex',
      contact: {
        type: 'phone',
        value: 'encrypted',
        validatedAt: '2024-01-01T00:00:00.000Z',
      },
      encryptedAt: '2024-01-01T00:00:00.000Z',
      encryptionKeyId: 'key-123',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    })
    expect(result).not.toBeNull()
  })

  it('should return null for invalid input', () => {
    expect(safeParseSafeAdultDesignation({})).toBeNull()
  })
})

describe('safeParseSafeAdultNotificationRequest', () => {
  it('should parse valid request', () => {
    const result = safeParseSafeAdultNotificationRequest({
      childFirstName: 'Alex',
      encryptedContact: 'encrypted',
      contactType: 'phone',
      encryptionKeyId: 'key-123',
      signalId: 'signal-456',
    })
    expect(result).not.toBeNull()
  })

  it('should return null for invalid input', () => {
    expect(safeParseSafeAdultNotificationRequest({})).toBeNull()
  })
})

describe('createSafeAdultContactInput', () => {
  it('should create valid phone contact input', () => {
    const result = createSafeAdultContactInput('phone', '5551234567')
    expect(result).not.toBeNull()
    expect(result?.type).toBe('phone')
    expect(result?.value).toBe('5551234567')
  })

  it('should create valid email contact input', () => {
    const result = createSafeAdultContactInput('email', 'test@example.com')
    expect(result).not.toBeNull()
    expect(result?.type).toBe('email')
  })

  it('should return null for invalid phone', () => {
    expect(createSafeAdultContactInput('phone', '123')).toBeNull()
  })

  it('should return null for invalid email', () => {
    expect(createSafeAdultContactInput('email', 'invalid')).toBeNull()
  })
})

describe('normalizePhoneNumber', () => {
  it('should extract digits only', () => {
    expect(normalizePhoneNumber('(555) 123-4567')).toBe('5551234567')
    expect(normalizePhoneNumber('+1 555 123 4567')).toBe('15551234567')
  })
})

describe('normalizeEmailAddress', () => {
  it('should lowercase and trim', () => {
    expect(normalizeEmailAddress('TEST@Example.com')).toBe('test@example.com')
    expect(normalizeEmailAddress('  test@example.com  ')).toBe('test@example.com')
  })
})

describe('normalizeContact', () => {
  it('should normalize phone contacts', () => {
    expect(normalizeContact('phone', '(555) 123-4567')).toBe('5551234567')
  })

  it('should normalize email contacts', () => {
    expect(normalizeContact('email', 'TEST@Example.com')).toBe('test@example.com')
  })
})

// ============================================================================
// INV-002 Compliance Tests
// ============================================================================

describe('INV-002: Safe adult data isolation', () => {
  it('notification templates should not mention fledgely', () => {
    const smsMessage = getSmsNotificationMessage('Test')
    const emailBody = getEmailNotificationBody('Test')
    const emailSubject = getEmailNotificationSubject()

    // Check SMS message
    expect(smsMessage.toLowerCase()).not.toContain('fledgely')
    expect(smsMessage.toLowerCase()).not.toContain('monitoring')
    expect(smsMessage.toLowerCase()).not.toContain('parental')
    expect(smsMessage.toLowerCase()).not.toContain('app')

    // Check email body
    expect(emailBody.toLowerCase()).not.toContain('fledgely')
    expect(emailBody.toLowerCase()).not.toContain('monitoring')
    expect(emailBody.toLowerCase()).not.toContain('parental')

    // Check email subject
    expect(emailSubject.toLowerCase()).not.toContain('fledgely')
  })

  it('collection should be isolated from family data', () => {
    expect(SAFE_ADULT_CONSTANTS.COLLECTION).not.toContain('family')
    expect(SAFE_ADULT_CONSTANTS.COLLECTION).not.toContain('families')
  })

  it('notification request should not include family identifiers', () => {
    // The schema explicitly does NOT include familyId, parentId, or any family data
    const schema = safeAdultNotificationRequestSchema
    const shape = schema._def.shape()

    // Verify shape doesn't have family-related fields
    expect(Object.keys(shape)).not.toContain('familyId')
    expect(Object.keys(shape)).not.toContain('parentId')
    expect(Object.keys(shape)).not.toContain('parentContact')
    expect(Object.keys(shape)).not.toContain('familyKey')
  })
})
