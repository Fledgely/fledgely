/**
 * Agreement Renewal Service Tests - Story 35.3
 *
 * Tests for renewal flow service logic.
 * AC1: Renewal mode options
 * AC2: Renew as-is logic
 * AC5: Both signatures required
 * AC6: New expiry date calculation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  initiateRenewal,
  getRenewalStatus,
  processParentConsent,
  processChildConsent,
  completeRenewal,
  cancelRenewal,
  canCompleteRenewal,
  getRenewalModeOptions,
  getNextRenewalStep,
  type RenewalState,
} from './agreementRenewalService'

describe('Agreement Renewal Service - Story 35.3', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-01'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initiateRenewal', () => {
    it('should create a new renewal with renew-as-is mode', () => {
      const renewal = initiateRenewal({
        agreementId: 'agreement-123',
        mode: 'renew-as-is',
        duration: '1-year',
      })

      expect(renewal.agreementId).toBe('agreement-123')
      expect(renewal.mode).toBe('renew-as-is')
      expect(renewal.status).toBe('parent-initiated')
      expect(renewal.initiatedAt).toBeDefined()
    })

    it('should create a new renewal with renew-with-changes mode', () => {
      const renewal = initiateRenewal({
        agreementId: 'agreement-123',
        mode: 'renew-with-changes',
        duration: '6-months',
      })

      expect(renewal.mode).toBe('renew-with-changes')
      expect(renewal.status).toBe('parent-initiated')
    })

    it('should calculate new expiry date for as-is renewal', () => {
      const renewal = initiateRenewal({
        agreementId: 'agreement-123',
        mode: 'renew-as-is',
        duration: '1-year',
        currentExpiryDate: new Date('2024-07-01'),
      })

      expect(renewal.newExpiryDate).toBeDefined()
      expect(renewal.newExpiryDate?.getFullYear()).toBe(2025)
      expect(renewal.newExpiryDate?.getMonth()).toBe(6) // July
    })

    it('should return null expiry for no-expiry duration', () => {
      const renewal = initiateRenewal({
        agreementId: 'agreement-123',
        mode: 'renew-as-is',
        duration: 'no-expiry',
      })

      expect(renewal.newExpiryDate).toBeNull()
    })
  })

  describe('getRenewalStatus', () => {
    it('should return pending for new renewal', () => {
      const renewal: RenewalState = {
        agreementId: 'agreement-123',
        mode: 'renew-as-is',
        status: 'pending',
        initiatedAt: new Date(),
        parentConsent: null,
        childConsent: null,
        newExpiryDate: new Date('2025-06-01'),
      }

      const status = getRenewalStatus(renewal)
      expect(status.status).toBe('pending')
      expect(status.parentSigned).toBe(false)
      expect(status.childSigned).toBe(false)
    })

    it('should show parent signed when consent present', () => {
      const renewal: RenewalState = {
        agreementId: 'agreement-123',
        mode: 'renew-as-is',
        status: 'child-consenting',
        initiatedAt: new Date(),
        parentConsent: { signature: 'Parent', signedAt: new Date() },
        childConsent: null,
        newExpiryDate: new Date('2025-06-01'),
      }

      const status = getRenewalStatus(renewal)
      expect(status.parentSigned).toBe(true)
      expect(status.childSigned).toBe(false)
    })

    it('should show both signed when complete', () => {
      const renewal: RenewalState = {
        agreementId: 'agreement-123',
        mode: 'renew-as-is',
        status: 'completed',
        initiatedAt: new Date(),
        parentConsent: { signature: 'Parent', signedAt: new Date() },
        childConsent: { signature: 'Child', signedAt: new Date() },
        newExpiryDate: new Date('2025-06-01'),
      }

      const status = getRenewalStatus(renewal)
      expect(status.parentSigned).toBe(true)
      expect(status.childSigned).toBe(true)
    })
  })

  describe('processParentConsent (AC5)', () => {
    it('should record parent signature', () => {
      const renewal: RenewalState = {
        agreementId: 'agreement-123',
        mode: 'renew-as-is',
        status: 'parent-initiated',
        initiatedAt: new Date(),
        parentConsent: null,
        childConsent: null,
        newExpiryDate: new Date('2025-06-01'),
      }

      const updated = processParentConsent(renewal, 'Parent Signature')

      expect(updated.parentConsent).not.toBeNull()
      expect(updated.parentConsent?.signature).toBe('Parent Signature')
      expect(updated.status).toBe('child-consenting')
    })

    it('should not overwrite existing parent consent', () => {
      const existingConsent = { signature: 'Original', signedAt: new Date('2024-05-01') }
      const renewal: RenewalState = {
        agreementId: 'agreement-123',
        mode: 'renew-as-is',
        status: 'child-consenting',
        initiatedAt: new Date(),
        parentConsent: existingConsent,
        childConsent: null,
        newExpiryDate: new Date('2025-06-01'),
      }

      const updated = processParentConsent(renewal, 'New Signature')

      expect(updated.parentConsent?.signature).toBe('Original')
    })
  })

  describe('processChildConsent (AC4, AC5)', () => {
    it('should record child signature', () => {
      const renewal: RenewalState = {
        agreementId: 'agreement-123',
        mode: 'renew-as-is',
        status: 'child-consenting',
        initiatedAt: new Date(),
        parentConsent: { signature: 'Parent', signedAt: new Date() },
        childConsent: null,
        newExpiryDate: new Date('2025-06-01'),
      }

      const updated = processChildConsent(renewal, 'Child Signature')

      expect(updated.childConsent).not.toBeNull()
      expect(updated.childConsent?.signature).toBe('Child Signature')
    })

    it('should not record child consent before parent', () => {
      const renewal: RenewalState = {
        agreementId: 'agreement-123',
        mode: 'renew-as-is',
        status: 'parent-initiated',
        initiatedAt: new Date(),
        parentConsent: null,
        childConsent: null,
        newExpiryDate: new Date('2025-06-01'),
      }

      const updated = processChildConsent(renewal, 'Child Signature')

      expect(updated.childConsent).toBeNull()
    })
  })

  describe('completeRenewal (AC6)', () => {
    it('should complete renewal when both signatures present', () => {
      const renewal: RenewalState = {
        agreementId: 'agreement-123',
        mode: 'renew-as-is',
        status: 'child-consenting',
        initiatedAt: new Date(),
        parentConsent: { signature: 'Parent', signedAt: new Date() },
        childConsent: { signature: 'Child', signedAt: new Date() },
        newExpiryDate: new Date('2025-06-01'),
      }

      const completed = completeRenewal(renewal)

      expect(completed.status).toBe('completed')
      expect(completed.completedAt).toBeDefined()
    })

    it('should not complete without parent signature', () => {
      const renewal: RenewalState = {
        agreementId: 'agreement-123',
        mode: 'renew-as-is',
        status: 'child-consenting',
        initiatedAt: new Date(),
        parentConsent: null,
        childConsent: { signature: 'Child', signedAt: new Date() },
        newExpiryDate: new Date('2025-06-01'),
      }

      const completed = completeRenewal(renewal)

      expect(completed.status).not.toBe('completed')
    })

    it('should not complete without child signature', () => {
      const renewal: RenewalState = {
        agreementId: 'agreement-123',
        mode: 'renew-as-is',
        status: 'child-consenting',
        initiatedAt: new Date(),
        parentConsent: { signature: 'Parent', signedAt: new Date() },
        childConsent: null,
        newExpiryDate: new Date('2025-06-01'),
      }

      const completed = completeRenewal(renewal)

      expect(completed.status).not.toBe('completed')
    })
  })

  describe('cancelRenewal', () => {
    it('should cancel pending renewal', () => {
      const renewal: RenewalState = {
        agreementId: 'agreement-123',
        mode: 'renew-as-is',
        status: 'parent-initiated',
        initiatedAt: new Date(),
        parentConsent: null,
        childConsent: null,
        newExpiryDate: new Date('2025-06-01'),
      }

      const cancelled = cancelRenewal(renewal)

      expect(cancelled.status).toBe('cancelled')
      expect(cancelled.cancelledAt).toBeDefined()
    })

    it('should not cancel completed renewal', () => {
      const renewal: RenewalState = {
        agreementId: 'agreement-123',
        mode: 'renew-as-is',
        status: 'completed',
        initiatedAt: new Date(),
        parentConsent: { signature: 'Parent', signedAt: new Date() },
        childConsent: { signature: 'Child', signedAt: new Date() },
        newExpiryDate: new Date('2025-06-01'),
        completedAt: new Date(),
      }

      const cancelled = cancelRenewal(renewal)

      expect(cancelled.status).toBe('completed')
    })
  })

  describe('canCompleteRenewal', () => {
    it('should return true when both signatures present', () => {
      const renewal: RenewalState = {
        agreementId: 'agreement-123',
        mode: 'renew-as-is',
        status: 'child-consenting',
        initiatedAt: new Date(),
        parentConsent: { signature: 'Parent', signedAt: new Date() },
        childConsent: { signature: 'Child', signedAt: new Date() },
        newExpiryDate: new Date('2025-06-01'),
      }

      expect(canCompleteRenewal(renewal)).toBe(true)
    })

    it('should return false when parent signature missing', () => {
      const renewal: RenewalState = {
        agreementId: 'agreement-123',
        mode: 'renew-as-is',
        status: 'child-consenting',
        initiatedAt: new Date(),
        parentConsent: null,
        childConsent: { signature: 'Child', signedAt: new Date() },
        newExpiryDate: new Date('2025-06-01'),
      }

      expect(canCompleteRenewal(renewal)).toBe(false)
    })

    it('should return false when child signature missing', () => {
      const renewal: RenewalState = {
        agreementId: 'agreement-123',
        mode: 'renew-as-is',
        status: 'child-consenting',
        initiatedAt: new Date(),
        parentConsent: { signature: 'Parent', signedAt: new Date() },
        childConsent: null,
        newExpiryDate: new Date('2025-06-01'),
      }

      expect(canCompleteRenewal(renewal)).toBe(false)
    })
  })

  describe('getRenewalModeOptions (AC1)', () => {
    it('should return both mode options', () => {
      const options = getRenewalModeOptions()

      expect(options).toHaveLength(2)
      expect(options[0].mode).toBe('renew-as-is')
      expect(options[1].mode).toBe('renew-with-changes')
    })

    it('should have titles and descriptions', () => {
      const options = getRenewalModeOptions()

      options.forEach((option) => {
        expect(option.title).toBeDefined()
        expect(option.description).toBeDefined()
      })
    })
  })

  describe('getNextRenewalStep', () => {
    it('should return parent-sign for parent-initiated status', () => {
      const renewal: RenewalState = {
        agreementId: 'agreement-123',
        mode: 'renew-as-is',
        status: 'parent-initiated',
        initiatedAt: new Date(),
        parentConsent: null,
        childConsent: null,
        newExpiryDate: new Date('2025-06-01'),
      }

      expect(getNextRenewalStep(renewal)).toBe('parent-sign')
    })

    it('should return child-consent for child-consenting status', () => {
      const renewal: RenewalState = {
        agreementId: 'agreement-123',
        mode: 'renew-as-is',
        status: 'child-consenting',
        initiatedAt: new Date(),
        parentConsent: { signature: 'Parent', signedAt: new Date() },
        childConsent: null,
        newExpiryDate: new Date('2025-06-01'),
      }

      expect(getNextRenewalStep(renewal)).toBe('child-consent')
    })

    it('should return complete when both signed', () => {
      const renewal: RenewalState = {
        agreementId: 'agreement-123',
        mode: 'renew-as-is',
        status: 'child-consenting',
        initiatedAt: new Date(),
        parentConsent: { signature: 'Parent', signedAt: new Date() },
        childConsent: { signature: 'Child', signedAt: new Date() },
        newExpiryDate: new Date('2025-06-01'),
      }

      expect(getNextRenewalStep(renewal)).toBe('complete')
    })

    it('should return done for completed renewal', () => {
      const renewal: RenewalState = {
        agreementId: 'agreement-123',
        mode: 'renew-as-is',
        status: 'completed',
        initiatedAt: new Date(),
        parentConsent: { signature: 'Parent', signedAt: new Date() },
        childConsent: { signature: 'Child', signedAt: new Date() },
        newExpiryDate: new Date('2025-06-01'),
        completedAt: new Date(),
      }

      expect(getNextRenewalStep(renewal)).toBe('done')
    })
  })
})
