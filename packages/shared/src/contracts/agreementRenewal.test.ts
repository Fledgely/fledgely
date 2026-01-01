/**
 * Agreement Renewal Types Tests - Story 35.3
 *
 * Tests for renewal flow types, schemas, and utilities.
 * AC1: Renewal mode options
 * AC2: Renew as-is logic
 * AC6: New expiry date calculation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  renewalModeSchema,
  renewalStatusSchema,
  renewalRequestSchema,
  renewalConsentSchema,
  RENEWAL_MODES,
  RENEWAL_STATUS,
  RENEWAL_MESSAGES,
  calculateRenewalExpiryDate,
  isEligibleForRenewal,
  canRenewAsIs,
  getRenewalModeConfig,
  isRenewalComplete,
} from './agreementRenewal'

describe('Agreement Renewal Types - Story 35.3', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-01'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('renewalModeSchema', () => {
    it('should accept "renew-as-is"', () => {
      const result = renewalModeSchema.safeParse('renew-as-is')
      expect(result.success).toBe(true)
      expect(result.data).toBe('renew-as-is')
    })

    it('should accept "renew-with-changes"', () => {
      const result = renewalModeSchema.safeParse('renew-with-changes')
      expect(result.success).toBe(true)
      expect(result.data).toBe('renew-with-changes')
    })

    it('should reject invalid mode', () => {
      const result = renewalModeSchema.safeParse('invalid-mode')
      expect(result.success).toBe(false)
    })
  })

  describe('renewalStatusSchema', () => {
    it('should accept "pending"', () => {
      const result = renewalStatusSchema.safeParse('pending')
      expect(result.success).toBe(true)
    })

    it('should accept "parent-initiated"', () => {
      const result = renewalStatusSchema.safeParse('parent-initiated')
      expect(result.success).toBe(true)
    })

    it('should accept "child-consenting"', () => {
      const result = renewalStatusSchema.safeParse('child-consenting')
      expect(result.success).toBe(true)
    })

    it('should accept "completed"', () => {
      const result = renewalStatusSchema.safeParse('completed')
      expect(result.success).toBe(true)
    })

    it('should accept "cancelled"', () => {
      const result = renewalStatusSchema.safeParse('cancelled')
      expect(result.success).toBe(true)
    })

    it('should reject invalid status', () => {
      const result = renewalStatusSchema.safeParse('invalid')
      expect(result.success).toBe(false)
    })
  })

  describe('renewalRequestSchema', () => {
    it('should validate a valid renewal request', () => {
      const request = {
        agreementId: 'agreement-123',
        mode: 'renew-as-is',
        initiatedBy: 'parent',
        initiatedAt: new Date('2024-06-01'),
      }

      const result = renewalRequestSchema.safeParse(request)
      expect(result.success).toBe(true)
    })

    it('should validate request with new expiry date', () => {
      const request = {
        agreementId: 'agreement-123',
        mode: 'renew-as-is',
        initiatedBy: 'parent',
        initiatedAt: new Date('2024-06-01'),
        newExpiryDate: new Date('2025-06-01'),
      }

      const result = renewalRequestSchema.safeParse(request)
      expect(result.success).toBe(true)
    })

    it('should reject request without agreementId', () => {
      const request = {
        mode: 'renew-as-is',
        initiatedBy: 'parent',
        initiatedAt: new Date(),
      }

      const result = renewalRequestSchema.safeParse(request)
      expect(result.success).toBe(false)
    })

    it('should accept system-initiated renewal', () => {
      const request = {
        agreementId: 'agreement-123',
        mode: 'renew-as-is',
        initiatedBy: 'system',
        initiatedAt: new Date(),
      }

      const result = renewalRequestSchema.safeParse(request)
      expect(result.success).toBe(true)
    })
  })

  describe('renewalConsentSchema', () => {
    it('should validate parent consent', () => {
      const consent = {
        renewalId: 'renewal-123',
        role: 'parent',
        consentedAt: new Date(),
        signature: 'Parent Signature',
      }

      const result = renewalConsentSchema.safeParse(consent)
      expect(result.success).toBe(true)
    })

    it('should validate child consent', () => {
      const consent = {
        renewalId: 'renewal-123',
        role: 'child',
        consentedAt: new Date(),
        signature: 'Child Signature',
      }

      const result = renewalConsentSchema.safeParse(consent)
      expect(result.success).toBe(true)
    })
  })

  describe('RENEWAL_MODES constant', () => {
    it('should have RENEW_AS_IS', () => {
      expect(RENEWAL_MODES.RENEW_AS_IS).toBe('renew-as-is')
    })

    it('should have RENEW_WITH_CHANGES', () => {
      expect(RENEWAL_MODES.RENEW_WITH_CHANGES).toBe('renew-with-changes')
    })
  })

  describe('RENEWAL_STATUS constant', () => {
    it('should have all status values', () => {
      expect(RENEWAL_STATUS.PENDING).toBe('pending')
      expect(RENEWAL_STATUS.PARENT_INITIATED).toBe('parent-initiated')
      expect(RENEWAL_STATUS.CHILD_CONSENTING).toBe('child-consenting')
      expect(RENEWAL_STATUS.COMPLETED).toBe('completed')
      expect(RENEWAL_STATUS.CANCELLED).toBe('cancelled')
    })
  })

  describe('RENEWAL_MESSAGES constant', () => {
    it('should have mode descriptions', () => {
      expect(RENEWAL_MESSAGES.modes['renew-as-is'].title).toBeDefined()
      expect(RENEWAL_MESSAGES.modes['renew-as-is'].description).toBeDefined()
      expect(RENEWAL_MESSAGES.modes['renew-with-changes'].title).toBeDefined()
      expect(RENEWAL_MESSAGES.modes['renew-with-changes'].description).toBeDefined()
    })

    it('should have status messages', () => {
      expect(RENEWAL_MESSAGES.status['pending']).toBeDefined()
      expect(RENEWAL_MESSAGES.status['completed']).toBeDefined()
    })
  })

  describe('calculateRenewalExpiryDate', () => {
    it('should calculate 3-month renewal expiry', () => {
      const currentExpiry = new Date('2024-06-01')
      const newExpiry = calculateRenewalExpiryDate(currentExpiry, '3-months')

      expect(newExpiry.getFullYear()).toBe(2024)
      expect(newExpiry.getMonth()).toBe(8) // September (0-indexed)
      expect(newExpiry.getDate()).toBe(1)
    })

    it('should calculate 6-month renewal expiry', () => {
      const currentExpiry = new Date('2024-06-01')
      const newExpiry = calculateRenewalExpiryDate(currentExpiry, '6-months')

      expect(newExpiry.getFullYear()).toBe(2024)
      expect(newExpiry.getMonth()).toBe(11) // December (0-indexed)
      expect(newExpiry.getDate()).toBe(1)
    })

    it('should calculate 1-year renewal expiry', () => {
      const currentExpiry = new Date('2024-06-01')
      const newExpiry = calculateRenewalExpiryDate(currentExpiry, '1-year')

      expect(newExpiry.getFullYear()).toBe(2025)
      expect(newExpiry.getMonth()).toBe(5) // June (0-indexed)
      expect(newExpiry.getDate()).toBe(1)
    })

    it('should return null for no-expiry', () => {
      const currentExpiry = new Date('2024-06-01')
      const newExpiry = calculateRenewalExpiryDate(currentExpiry, 'no-expiry')

      expect(newExpiry).toBeNull()
    })

    it('should calculate from today if current expiry is past', () => {
      const pastExpiry = new Date('2024-05-01') // In the past
      const newExpiry = calculateRenewalExpiryDate(pastExpiry, '3-months')

      // Should calculate from today (June 1) not the past expiry
      expect(newExpiry?.getFullYear()).toBe(2024)
      expect(newExpiry?.getMonth()).toBe(8) // September
    })
  })

  describe('isEligibleForRenewal', () => {
    it('should return true for valid active agreement', () => {
      const agreement = {
        status: 'active',
        expiryDate: new Date('2024-07-01'),
      }

      expect(isEligibleForRenewal(agreement)).toBe(true)
    })

    it('should return true for expiring soon agreement', () => {
      const agreement = {
        status: 'active',
        expiryDate: new Date('2024-06-15'), // 14 days away
      }

      expect(isEligibleForRenewal(agreement)).toBe(true)
    })

    it('should return false for expired agreement', () => {
      const agreement = {
        status: 'expired',
        expiryDate: new Date('2024-05-01'),
      }

      expect(isEligibleForRenewal(agreement)).toBe(false)
    })

    it('should return false for pending agreement', () => {
      const agreement = {
        status: 'pending',
        expiryDate: new Date('2024-07-01'),
      }

      expect(isEligibleForRenewal(agreement)).toBe(false)
    })

    it('should return false for no-expiry agreement', () => {
      const agreement = {
        status: 'active',
        expiryDate: null,
      }

      expect(isEligibleForRenewal(agreement)).toBe(false)
    })
  })

  describe('canRenewAsIs', () => {
    it('should return true for agreement without pending changes', () => {
      const agreement = {
        status: 'active',
        hasPendingChanges: false,
      }

      expect(canRenewAsIs(agreement)).toBe(true)
    })

    it('should return false for agreement with pending changes', () => {
      const agreement = {
        status: 'active',
        hasPendingChanges: true,
      }

      expect(canRenewAsIs(agreement)).toBe(false)
    })

    it('should return true for undefined hasPendingChanges', () => {
      const agreement = {
        status: 'active',
      }

      expect(canRenewAsIs(agreement)).toBe(true)
    })
  })

  describe('getRenewalModeConfig', () => {
    it('should return config for renew-as-is', () => {
      const config = getRenewalModeConfig('renew-as-is')

      expect(config.mode).toBe('renew-as-is')
      expect(config.title).toBeDefined()
      expect(config.description).toBeDefined()
      expect(config.requiresModificationFlow).toBe(false)
    })

    it('should return config for renew-with-changes', () => {
      const config = getRenewalModeConfig('renew-with-changes')

      expect(config.mode).toBe('renew-with-changes')
      expect(config.title).toBeDefined()
      expect(config.description).toBeDefined()
      expect(config.requiresModificationFlow).toBe(true)
    })
  })

  describe('isRenewalComplete', () => {
    it('should return true when both consents present', () => {
      const renewal = {
        status: 'child-consenting',
        parentConsent: { signature: 'Parent', consentedAt: new Date() },
        childConsent: { signature: 'Child', consentedAt: new Date() },
      }

      expect(isRenewalComplete(renewal)).toBe(true)
    })

    it('should return false when parent consent missing', () => {
      const renewal = {
        status: 'child-consenting',
        parentConsent: null,
        childConsent: { signature: 'Child', consentedAt: new Date() },
      }

      expect(isRenewalComplete(renewal)).toBe(false)
    })

    it('should return false when child consent missing', () => {
      const renewal = {
        status: 'parent-initiated',
        parentConsent: { signature: 'Parent', consentedAt: new Date() },
        childConsent: null,
      }

      expect(isRenewalComplete(renewal)).toBe(false)
    })

    it('should return false when both consents missing', () => {
      const renewal = {
        status: 'pending',
        parentConsent: null,
        childConsent: null,
      }

      expect(isRenewalComplete(renewal)).toBe(false)
    })
  })
})
