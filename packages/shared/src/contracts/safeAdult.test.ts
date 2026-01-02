/**
 * Safe Adult Contracts Tests - Story 7.5.4 Task 1
 *
 * Tests for safe adult designation data models.
 * AC1: Safe adult notification option
 * AC3: Pre-configured safe adult
 * AC4: Safe adult data isolation
 * AC6: Phone and email support
 *
 * CRITICAL: Safe adult data must be completely isolated from family access.
 * TDD approach: Write tests first, then implementation.
 */

import { describe, it, expect } from 'vitest'
import {
  // Constants
  SAFE_ADULT_CONTACT_METHOD,
  NOTIFICATION_DELIVERY_STATUS,
  SAFE_ADULT_DEFAULTS,
  // Schemas
  contactMethodSchema,
  deliveryStatusSchema,
  safeAdultDesignationSchema,
  safeAdultNotificationSchema,
  safeAdultContactInputSchema,
  // Factory functions
  generateSafeAdultId,
  generateNotificationId,
  generateEncryptionKeyId,
  createSafeAdultDesignation,
  createSafeAdultNotification,
  createPreConfiguredSafeAdult,
  createSignalTimeSafeAdult,
  // Validation functions
  validateSafeAdultDesignation,
  validateSafeAdultNotification,
  isSafeAdultDesignation,
  isSafeAdultNotification,
  validateContactInput,
  // Type guards
  hasPhoneContact,
  hasEmailContact,
  hasValidContact,
  // Types
  type SafeAdultDesignation,
} from './safeAdult'

describe('Safe Adult Contracts', () => {
  // ============================================
  // Constants Tests
  // ============================================

  describe('SAFE_ADULT_CONTACT_METHOD', () => {
    it('should have SMS contact method', () => {
      expect(SAFE_ADULT_CONTACT_METHOD.SMS).toBe('sms')
    })

    it('should have EMAIL contact method', () => {
      expect(SAFE_ADULT_CONTACT_METHOD.EMAIL).toBe('email')
    })
  })

  describe('NOTIFICATION_DELIVERY_STATUS', () => {
    it('should have pending status', () => {
      expect(NOTIFICATION_DELIVERY_STATUS.PENDING).toBe('pending')
    })

    it('should have sent status', () => {
      expect(NOTIFICATION_DELIVERY_STATUS.SENT).toBe('sent')
    })

    it('should have delivered status', () => {
      expect(NOTIFICATION_DELIVERY_STATUS.DELIVERED).toBe('delivered')
    })

    it('should have failed status', () => {
      expect(NOTIFICATION_DELIVERY_STATUS.FAILED).toBe('failed')
    })
  })

  describe('SAFE_ADULT_DEFAULTS', () => {
    it('should have default preferred method', () => {
      expect(SAFE_ADULT_DEFAULTS.PREFERRED_METHOD).toBe('sms')
    })

    it('should have max display name length', () => {
      expect(SAFE_ADULT_DEFAULTS.MAX_DISPLAY_NAME_LENGTH).toBe(50)
    })
  })

  // ============================================
  // Schema Tests
  // ============================================

  describe('contactMethodSchema', () => {
    it('should accept sms', () => {
      expect(contactMethodSchema.safeParse('sms').success).toBe(true)
    })

    it('should accept email', () => {
      expect(contactMethodSchema.safeParse('email').success).toBe(true)
    })

    it('should reject invalid method', () => {
      expect(contactMethodSchema.safeParse('phone').success).toBe(false)
      expect(contactMethodSchema.safeParse('text').success).toBe(false)
    })
  })

  describe('deliveryStatusSchema', () => {
    it('should accept all valid statuses', () => {
      expect(deliveryStatusSchema.safeParse('pending').success).toBe(true)
      expect(deliveryStatusSchema.safeParse('sent').success).toBe(true)
      expect(deliveryStatusSchema.safeParse('delivered').success).toBe(true)
      expect(deliveryStatusSchema.safeParse('failed').success).toBe(true)
    })

    it('should reject invalid status', () => {
      expect(deliveryStatusSchema.safeParse('queued').success).toBe(false)
      expect(deliveryStatusSchema.safeParse('cancelled').success).toBe(false)
    })
  })

  describe('safeAdultDesignationSchema', () => {
    const validDesignation = {
      id: 'sa_123',
      childId: 'child_456',
      phoneNumber: '+15551234567',
      email: null,
      preferredMethod: 'sms',
      displayName: 'Aunt Jane',
      createdAt: new Date(),
      updatedAt: new Date(),
      isPreConfigured: true,
      encryptionKeyId: 'key_789',
    }

    it('should accept valid designation with phone', () => {
      const result = safeAdultDesignationSchema.safeParse(validDesignation)
      expect(result.success).toBe(true)
    })

    it('should accept valid designation with email', () => {
      const emailDesignation = {
        ...validDesignation,
        phoneNumber: null,
        email: 'aunt@example.com',
        preferredMethod: 'email',
      }
      const result = safeAdultDesignationSchema.safeParse(emailDesignation)
      expect(result.success).toBe(true)
    })

    it('should accept designation with both phone and email', () => {
      const bothDesignation = {
        ...validDesignation,
        email: 'aunt@example.com',
      }
      const result = safeAdultDesignationSchema.safeParse(bothDesignation)
      expect(result.success).toBe(true)
    })

    it('should require non-empty id', () => {
      const result = safeAdultDesignationSchema.safeParse({ ...validDesignation, id: '' })
      expect(result.success).toBe(false)
    })

    it('should require non-empty childId', () => {
      const result = safeAdultDesignationSchema.safeParse({ ...validDesignation, childId: '' })
      expect(result.success).toBe(false)
    })

    it('should require non-empty displayName', () => {
      const result = safeAdultDesignationSchema.safeParse({ ...validDesignation, displayName: '' })
      expect(result.success).toBe(false)
    })

    it('should require non-empty encryptionKeyId', () => {
      const result = safeAdultDesignationSchema.safeParse({
        ...validDesignation,
        encryptionKeyId: '',
      })
      expect(result.success).toBe(false)
    })

    it('should allow null phoneNumber', () => {
      const result = safeAdultDesignationSchema.safeParse({
        ...validDesignation,
        phoneNumber: null,
        email: 'test@example.com',
      })
      expect(result.success).toBe(true)
    })

    it('should allow null email', () => {
      const result = safeAdultDesignationSchema.safeParse({ ...validDesignation, email: null })
      expect(result.success).toBe(true)
    })

    it('should require valid preferredMethod', () => {
      const result = safeAdultDesignationSchema.safeParse({
        ...validDesignation,
        preferredMethod: 'phone',
      })
      expect(result.success).toBe(false)
    })

    it('should require boolean isPreConfigured', () => {
      const result = safeAdultDesignationSchema.safeParse({
        ...validDesignation,
        isPreConfigured: 'yes',
      })
      expect(result.success).toBe(false)
    })

    it('should require Date createdAt', () => {
      const result = safeAdultDesignationSchema.safeParse({
        ...validDesignation,
        createdAt: '2024-01-01',
      })
      expect(result.success).toBe(false)
    })

    it('should require Date updatedAt', () => {
      const result = safeAdultDesignationSchema.safeParse({
        ...validDesignation,
        updatedAt: '2024-01-01',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('safeAdultNotificationSchema', () => {
    const validNotification = {
      id: 'notif_123',
      designationId: 'sa_456',
      signalId: 'sig_789',
      childName: 'Emma',
      sentAt: new Date(),
      deliveryStatus: 'pending',
      deliveredAt: null,
      failureReason: null,
      retryCount: 0,
    }

    it('should accept valid notification', () => {
      const result = safeAdultNotificationSchema.safeParse(validNotification)
      expect(result.success).toBe(true)
    })

    it('should require non-empty id', () => {
      const result = safeAdultNotificationSchema.safeParse({ ...validNotification, id: '' })
      expect(result.success).toBe(false)
    })

    it('should require non-empty designationId', () => {
      const result = safeAdultNotificationSchema.safeParse({
        ...validNotification,
        designationId: '',
      })
      expect(result.success).toBe(false)
    })

    it('should require non-empty signalId', () => {
      const result = safeAdultNotificationSchema.safeParse({ ...validNotification, signalId: '' })
      expect(result.success).toBe(false)
    })

    it('should require non-empty childName', () => {
      const result = safeAdultNotificationSchema.safeParse({ ...validNotification, childName: '' })
      expect(result.success).toBe(false)
    })

    it('should require valid deliveryStatus', () => {
      const result = safeAdultNotificationSchema.safeParse({
        ...validNotification,
        deliveryStatus: 'queued',
      })
      expect(result.success).toBe(false)
    })

    it('should allow null deliveredAt', () => {
      const result = safeAdultNotificationSchema.safeParse({
        ...validNotification,
        deliveredAt: null,
      })
      expect(result.success).toBe(true)
    })

    it('should allow Date deliveredAt', () => {
      const result = safeAdultNotificationSchema.safeParse({
        ...validNotification,
        deliveredAt: new Date(),
      })
      expect(result.success).toBe(true)
    })

    it('should allow null failureReason', () => {
      const result = safeAdultNotificationSchema.safeParse({
        ...validNotification,
        failureReason: null,
      })
      expect(result.success).toBe(true)
    })

    it('should allow string failureReason', () => {
      const result = safeAdultNotificationSchema.safeParse({
        ...validNotification,
        failureReason: 'Network error',
      })
      expect(result.success).toBe(true)
    })

    it('should require non-negative retryCount', () => {
      const result = safeAdultNotificationSchema.safeParse({
        ...validNotification,
        retryCount: -1,
      })
      expect(result.success).toBe(false)
    })

    it('should accept zero retryCount', () => {
      const result = safeAdultNotificationSchema.safeParse({
        ...validNotification,
        retryCount: 0,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('safeAdultContactInputSchema', () => {
    it('should accept phone only', () => {
      const result = safeAdultContactInputSchema.safeParse({ phone: '+15551234567' })
      expect(result.success).toBe(true)
    })

    it('should accept email only', () => {
      const result = safeAdultContactInputSchema.safeParse({ email: 'test@example.com' })
      expect(result.success).toBe(true)
    })

    it('should accept both phone and email', () => {
      const result = safeAdultContactInputSchema.safeParse({
        phone: '+15551234567',
        email: 'test@example.com',
      })
      expect(result.success).toBe(true)
    })

    it('should accept empty phone with email', () => {
      const result = safeAdultContactInputSchema.safeParse({ phone: '', email: 'test@example.com' })
      expect(result.success).toBe(true)
    })

    it('should accept empty email with phone', () => {
      const result = safeAdultContactInputSchema.safeParse({ phone: '+15551234567', email: '' })
      expect(result.success).toBe(true)
    })
  })

  // ============================================
  // Factory Function Tests
  // ============================================

  describe('generateSafeAdultId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateSafeAdultId()
      const id2 = generateSafeAdultId()
      expect(id1).not.toBe(id2)
    })

    it('should start with sa_ prefix', () => {
      const id = generateSafeAdultId()
      expect(id.startsWith('sa_')).toBe(true)
    })

    it('should have sufficient length for uniqueness', () => {
      const id = generateSafeAdultId()
      expect(id.length).toBeGreaterThan(10)
    })
  })

  describe('generateNotificationId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateNotificationId()
      const id2 = generateNotificationId()
      expect(id1).not.toBe(id2)
    })

    it('should start with notif_ prefix', () => {
      const id = generateNotificationId()
      expect(id.startsWith('notif_')).toBe(true)
    })
  })

  describe('generateEncryptionKeyId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateEncryptionKeyId()
      const id2 = generateEncryptionKeyId()
      expect(id1).not.toBe(id2)
    })

    it('should start with sakey_ prefix', () => {
      const id = generateEncryptionKeyId()
      expect(id.startsWith('sakey_')).toBe(true)
    })
  })

  describe('createSafeAdultDesignation', () => {
    it('should create valid designation with phone', () => {
      const designation = createSafeAdultDesignation(
        'child_123',
        '+15551234567',
        null,
        'Aunt Jane',
        true,
        'sms'
      )

      expect(designation.childId).toBe('child_123')
      expect(designation.phoneNumber).toBe('+15551234567')
      expect(designation.email).toBeNull()
      expect(designation.displayName).toBe('Aunt Jane')
      expect(designation.isPreConfigured).toBe(true)
      expect(designation.preferredMethod).toBe('sms')
      expect(designation.id).toBeTruthy()
      expect(designation.encryptionKeyId).toBeTruthy()
      expect(designation.createdAt).toBeInstanceOf(Date)
      expect(designation.updatedAt).toBeInstanceOf(Date)
    })

    it('should create valid designation with email', () => {
      const designation = createSafeAdultDesignation(
        'child_123',
        null,
        'aunt@example.com',
        'Aunt Jane',
        false,
        'email'
      )

      expect(designation.phoneNumber).toBeNull()
      expect(designation.email).toBe('aunt@example.com')
      expect(designation.isPreConfigured).toBe(false)
      expect(designation.preferredMethod).toBe('email')
    })

    it('should create valid designation with both contacts', () => {
      const designation = createSafeAdultDesignation(
        'child_123',
        '+15551234567',
        'aunt@example.com',
        'Aunt Jane',
        true,
        'sms'
      )

      expect(designation.phoneNumber).toBe('+15551234567')
      expect(designation.email).toBe('aunt@example.com')
    })

    it('should default preferredMethod to sms if not provided', () => {
      const designation = createSafeAdultDesignation(
        'child_123',
        '+15551234567',
        null,
        'Aunt Jane',
        true
      )

      expect(designation.preferredMethod).toBe('sms')
    })

    it('should pass schema validation', () => {
      const designation = createSafeAdultDesignation(
        'child_123',
        '+15551234567',
        null,
        'Aunt Jane',
        true
      )

      const result = safeAdultDesignationSchema.safeParse(designation)
      expect(result.success).toBe(true)
    })
  })

  describe('createPreConfiguredSafeAdult', () => {
    it('should create designation with isPreConfigured true', () => {
      const designation = createPreConfiguredSafeAdult(
        'child_123',
        { phone: '+15551234567' },
        'Uncle Bob'
      )

      expect(designation.isPreConfigured).toBe(true)
      expect(designation.phoneNumber).toBe('+15551234567')
      expect(designation.displayName).toBe('Uncle Bob')
    })

    it('should accept email contact', () => {
      const designation = createPreConfiguredSafeAdult(
        'child_123',
        { email: 'uncle@example.com' },
        'Uncle Bob'
      )

      expect(designation.email).toBe('uncle@example.com')
      expect(designation.preferredMethod).toBe('email')
    })

    it('should prefer sms when both contacts provided', () => {
      const designation = createPreConfiguredSafeAdult(
        'child_123',
        { phone: '+15551234567', email: 'uncle@example.com' },
        'Uncle Bob'
      )

      expect(designation.phoneNumber).toBe('+15551234567')
      expect(designation.email).toBe('uncle@example.com')
      expect(designation.preferredMethod).toBe('sms')
    })
  })

  describe('createSignalTimeSafeAdult', () => {
    it('should create designation with isPreConfigured false', () => {
      const designation = createSignalTimeSafeAdult('child_123', { phone: '+15551234567' })

      expect(designation.isPreConfigured).toBe(false)
      expect(designation.phoneNumber).toBe('+15551234567')
      expect(designation.displayName).toBe('Trusted Adult')
    })

    it('should use default display name', () => {
      const designation = createSignalTimeSafeAdult('child_123', { email: 'help@example.com' })

      expect(designation.displayName).toBe('Trusted Adult')
    })

    it('should accept custom display name', () => {
      const designation = createSignalTimeSafeAdult(
        'child_123',
        { phone: '+15551234567' },
        'My Teacher'
      )

      expect(designation.displayName).toBe('My Teacher')
    })
  })

  describe('createSafeAdultNotification', () => {
    it('should create valid notification', () => {
      const notification = createSafeAdultNotification('sa_123', 'sig_456', 'Emma')

      expect(notification.designationId).toBe('sa_123')
      expect(notification.signalId).toBe('sig_456')
      expect(notification.childName).toBe('Emma')
      expect(notification.deliveryStatus).toBe('pending')
      expect(notification.id).toBeTruthy()
      expect(notification.sentAt).toBeInstanceOf(Date)
      expect(notification.deliveredAt).toBeNull()
      expect(notification.failureReason).toBeNull()
      expect(notification.retryCount).toBe(0)
    })

    it('should pass schema validation', () => {
      const notification = createSafeAdultNotification('sa_123', 'sig_456', 'Emma')

      const result = safeAdultNotificationSchema.safeParse(notification)
      expect(result.success).toBe(true)
    })
  })

  // ============================================
  // Validation Function Tests
  // ============================================

  describe('validateSafeAdultDesignation', () => {
    it('should return valid designation', () => {
      const input = createSafeAdultDesignation('child_123', '+15551234567', null, 'Aunt Jane', true)
      const result = validateSafeAdultDesignation(input)
      expect(result.childId).toBe('child_123')
    })

    it('should throw on invalid input', () => {
      expect(() => validateSafeAdultDesignation({ invalid: true })).toThrow()
    })
  })

  describe('validateSafeAdultNotification', () => {
    it('should return valid notification', () => {
      const input = createSafeAdultNotification('sa_123', 'sig_456', 'Emma')
      const result = validateSafeAdultNotification(input)
      expect(result.designationId).toBe('sa_123')
    })

    it('should throw on invalid input', () => {
      expect(() => validateSafeAdultNotification({ invalid: true })).toThrow()
    })
  })

  describe('isSafeAdultDesignation', () => {
    it('should return true for valid designation', () => {
      const designation = createSafeAdultDesignation(
        'child_123',
        '+15551234567',
        null,
        'Aunt Jane',
        true
      )
      expect(isSafeAdultDesignation(designation)).toBe(true)
    })

    it('should return false for invalid data', () => {
      expect(isSafeAdultDesignation({ invalid: true })).toBe(false)
      expect(isSafeAdultDesignation(null)).toBe(false)
      expect(isSafeAdultDesignation(undefined)).toBe(false)
    })
  })

  describe('isSafeAdultNotification', () => {
    it('should return true for valid notification', () => {
      const notification = createSafeAdultNotification('sa_123', 'sig_456', 'Emma')
      expect(isSafeAdultNotification(notification)).toBe(true)
    })

    it('should return false for invalid data', () => {
      expect(isSafeAdultNotification({ invalid: true })).toBe(false)
      expect(isSafeAdultNotification(null)).toBe(false)
    })
  })

  describe('validateContactInput', () => {
    it('should accept valid phone', () => {
      const result = validateContactInput({ phone: '+15551234567' })
      expect(result.valid).toBe(true)
      expect(result.hasPhone).toBe(true)
      expect(result.hasEmail).toBe(false)
    })

    it('should accept valid email', () => {
      const result = validateContactInput({ email: 'test@example.com' })
      expect(result.valid).toBe(true)
      expect(result.hasPhone).toBe(false)
      expect(result.hasEmail).toBe(true)
    })

    it('should accept both contacts', () => {
      const result = validateContactInput({ phone: '+15551234567', email: 'test@example.com' })
      expect(result.valid).toBe(true)
      expect(result.hasPhone).toBe(true)
      expect(result.hasEmail).toBe(true)
    })

    it('should reject empty input', () => {
      const result = validateContactInput({})
      expect(result.valid).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('should reject both empty strings', () => {
      const result = validateContactInput({ phone: '', email: '' })
      expect(result.valid).toBe(false)
    })

    it('should accept phone with empty email', () => {
      const result = validateContactInput({ phone: '+15551234567', email: '' })
      expect(result.valid).toBe(true)
      expect(result.hasPhone).toBe(true)
    })

    it('should accept email with empty phone', () => {
      const result = validateContactInput({ phone: '', email: 'test@example.com' })
      expect(result.valid).toBe(true)
      expect(result.hasEmail).toBe(true)
    })
  })

  // ============================================
  // Type Guard Tests
  // ============================================

  describe('hasPhoneContact', () => {
    it('should return true when phone exists', () => {
      const designation = createSafeAdultDesignation(
        'child_123',
        '+15551234567',
        null,
        'Aunt Jane',
        true
      )
      expect(hasPhoneContact(designation)).toBe(true)
    })

    it('should return false when phone is null', () => {
      const designation = createSafeAdultDesignation(
        'child_123',
        null,
        'test@example.com',
        'Aunt Jane',
        true,
        'email'
      )
      expect(hasPhoneContact(designation)).toBe(false)
    })

    it('should return false when phone is empty string', () => {
      const designation = {
        ...createSafeAdultDesignation('child_123', null, 'test@example.com', 'Aunt Jane', true),
        phoneNumber: '',
      }
      expect(hasPhoneContact(designation as SafeAdultDesignation)).toBe(false)
    })
  })

  describe('hasEmailContact', () => {
    it('should return true when email exists', () => {
      const designation = createSafeAdultDesignation(
        'child_123',
        null,
        'test@example.com',
        'Aunt Jane',
        true,
        'email'
      )
      expect(hasEmailContact(designation)).toBe(true)
    })

    it('should return false when email is null', () => {
      const designation = createSafeAdultDesignation(
        'child_123',
        '+15551234567',
        null,
        'Aunt Jane',
        true
      )
      expect(hasEmailContact(designation)).toBe(false)
    })
  })

  describe('hasValidContact', () => {
    it('should return true when phone exists', () => {
      const designation = createSafeAdultDesignation(
        'child_123',
        '+15551234567',
        null,
        'Aunt Jane',
        true
      )
      expect(hasValidContact(designation)).toBe(true)
    })

    it('should return true when email exists', () => {
      const designation = createSafeAdultDesignation(
        'child_123',
        null,
        'test@example.com',
        'Aunt Jane',
        true,
        'email'
      )
      expect(hasValidContact(designation)).toBe(true)
    })

    it('should return true when both exist', () => {
      const designation = createSafeAdultDesignation(
        'child_123',
        '+15551234567',
        'test@example.com',
        'Aunt Jane',
        true
      )
      expect(hasValidContact(designation)).toBe(true)
    })

    it('should return false when neither exists', () => {
      // This is an edge case that shouldn't happen in practice
      const designation = {
        ...createSafeAdultDesignation('child_123', '+15551234567', null, 'Aunt Jane', true),
        phoneNumber: null,
        email: null,
      }
      expect(hasValidContact(designation as SafeAdultDesignation)).toBe(false)
    })
  })
})
