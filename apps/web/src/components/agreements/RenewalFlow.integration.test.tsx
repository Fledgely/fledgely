/**
 * Renewal Flow Integration Tests - Story 35.3
 *
 * Integration tests for complete renewal flow.
 * Tests all ACs working together.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAgreementRenewal } from '../../hooks/useAgreementRenewal'
import {
  initiateRenewal,
  processParentConsent,
  processChildConsent,
  completeRenewal,
  cancelRenewal,
  getRenewalModeOptions,
} from '../../services/agreementRenewalService'
import {
  calculateRenewalExpiryDate,
  isEligibleForRenewal,
  canRenewAsIs,
  isRenewalComplete,
} from '@fledgely/shared'

describe('Renewal Flow Integration - Story 35.3', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-01'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('complete renew-as-is flow (AC1, AC2, AC4, AC5, AC6)', () => {
    it('should complete full renewal flow with both signatures', () => {
      // AC1: Start with renew-as-is mode
      let renewal = initiateRenewal({
        agreementId: 'agreement-123',
        mode: 'renew-as-is',
        duration: '1-year',
        currentExpiryDate: new Date('2024-07-01'),
      })

      expect(renewal.mode).toBe('renew-as-is')
      expect(renewal.status).toBe('parent-initiated')

      // AC5: Parent signs
      renewal = processParentConsent(renewal, 'Parent Signature')
      expect(renewal.parentConsent).not.toBeNull()
      expect(renewal.status).toBe('child-consenting')

      // AC4: Child must consent
      renewal = processChildConsent(renewal, 'Child Signature')
      expect(renewal.childConsent).not.toBeNull()

      // AC5: Both signatures required for completion
      expect(isRenewalComplete(renewal)).toBe(true)

      // AC6: Complete and set new expiry
      const completed = completeRenewal(renewal)
      expect(completed.status).toBe('completed')
      expect(completed.newExpiryDate).not.toBeNull()
      expect(completed.completedAt).toBeDefined()
    })

    it('should calculate correct new expiry date', () => {
      const currentExpiry = new Date('2024-07-01')

      // AC6: New expiry calculated correctly
      const newExpiry = calculateRenewalExpiryDate(currentExpiry, '1-year')

      expect(newExpiry?.getFullYear()).toBe(2025)
      expect(newExpiry?.getMonth()).toBe(6) // July
    })
  })

  describe('renew-with-changes flow (AC3)', () => {
    it('should initiate renew-with-changes and indicate modification needed', () => {
      const options = getRenewalModeOptions()
      const changesOption = options.find((o) => o.mode === 'renew-with-changes')

      // AC3: Should indicate modification flow
      expect(changesOption?.requiresModificationFlow).toBe(true)

      // Can still initiate renewal
      const renewal = initiateRenewal({
        agreementId: 'agreement-123',
        mode: 'renew-with-changes',
        duration: '6-months',
      })

      expect(renewal.mode).toBe('renew-with-changes')
    })
  })

  describe('hook-driven flow', () => {
    it('should manage complete flow through hook', () => {
      const onComplete = vi.fn()

      const { result } = renderHook(() =>
        useAgreementRenewal({
          agreementId: 'agreement-123',
          currentExpiryDate: new Date('2024-07-01'),
          currentDuration: '1-year',
          onComplete,
        })
      )

      // Mode options available
      expect(result.current.modeOptions).toHaveLength(2)

      // Start renewal
      act(() => {
        result.current.startRenewal('renew-as-is')
      })

      expect(result.current.isRenewing).toBe(true)
      expect(result.current.currentStep).toBe('parent-sign')

      // Parent signs
      act(() => {
        result.current.signAsParent('Parent')
      })

      expect(result.current.parentSigned).toBe(true)
      expect(result.current.currentStep).toBe('child-consent')

      // Child signs
      act(() => {
        result.current.signAsChild('Child')
      })

      expect(result.current.childSigned).toBe(true)
      expect(result.current.canComplete).toBe(true)
      expect(result.current.currentStep).toBe('complete')

      // Complete
      act(() => {
        result.current.completeRenewal()
      })

      expect(result.current.renewalState?.status).toBe('completed')
      expect(onComplete).toHaveBeenCalled()
    })
  })

  describe('eligibility checks', () => {
    it('should check agreement eligibility for renewal', () => {
      const activeAgreement = {
        status: 'active',
        expiryDate: new Date('2024-07-01'),
      }

      expect(isEligibleForRenewal(activeAgreement)).toBe(true)

      const expiredAgreement = {
        status: 'expired',
        expiryDate: new Date('2024-05-01'),
      }

      expect(isEligibleForRenewal(expiredAgreement)).toBe(false)
    })

    it('should check if can renew as-is', () => {
      const cleanAgreement = {
        status: 'active',
        hasPendingChanges: false,
      }

      expect(canRenewAsIs(cleanAgreement)).toBe(true)

      const dirtyAgreement = {
        status: 'active',
        hasPendingChanges: true,
      }

      expect(canRenewAsIs(dirtyAgreement)).toBe(false)
    })
  })

  describe('cancellation flow', () => {
    it('should allow cancellation before completion', () => {
      const onCancel = vi.fn()

      const { result } = renderHook(() =>
        useAgreementRenewal({
          agreementId: 'agreement-123',
          currentExpiryDate: new Date('2024-07-01'),
          currentDuration: '1-year',
          onCancel,
        })
      )

      act(() => {
        result.current.startRenewal('renew-as-is')
      })

      act(() => {
        result.current.signAsParent('Parent')
      })

      // Cancel before child signs
      act(() => {
        result.current.cancelRenewal()
      })

      expect(result.current.renewalState?.status).toBe('cancelled')
      expect(onCancel).toHaveBeenCalled()
    })

    it('should not allow cancellation after completion', () => {
      let renewal = initiateRenewal({
        agreementId: 'agreement-123',
        mode: 'renew-as-is',
        duration: '1-year',
      })

      renewal = processParentConsent(renewal, 'Parent')
      renewal = processChildConsent(renewal, 'Child')
      renewal = completeRenewal(renewal)

      // Try to cancel completed renewal
      const result = cancelRenewal(renewal)

      expect(result.status).toBe('completed') // Should remain completed
    })
  })

  describe('signature order enforcement (AC4, AC5)', () => {
    it('should require parent to sign before child', () => {
      let renewal = initiateRenewal({
        agreementId: 'agreement-123',
        mode: 'renew-as-is',
        duration: '1-year',
      })

      // Try child before parent
      renewal = processChildConsent(renewal, 'Child Signature')
      expect(renewal.childConsent).toBeNull()

      // Now parent signs
      renewal = processParentConsent(renewal, 'Parent Signature')
      expect(renewal.parentConsent).not.toBeNull()

      // Now child can sign
      renewal = processChildConsent(renewal, 'Child Signature')
      expect(renewal.childConsent).not.toBeNull()
    })

    it('should not overwrite existing signatures', () => {
      let renewal = initiateRenewal({
        agreementId: 'agreement-123',
        mode: 'renew-as-is',
        duration: '1-year',
      })

      renewal = processParentConsent(renewal, 'Original Parent')

      // Try to change parent signature
      renewal = processParentConsent(renewal, 'New Parent')

      expect(renewal.parentConsent?.signature).toBe('Original Parent')
    })
  })

  describe('expiry date scenarios (AC6)', () => {
    it('should handle 3-month renewal', () => {
      const expiry = calculateRenewalExpiryDate(new Date('2024-06-01'), '3-months')
      expect(expiry?.getMonth()).toBe(8) // September
    })

    it('should handle 6-month renewal', () => {
      const expiry = calculateRenewalExpiryDate(new Date('2024-06-01'), '6-months')
      expect(expiry?.getMonth()).toBe(11) // December
    })

    it('should handle 1-year renewal', () => {
      const expiry = calculateRenewalExpiryDate(new Date('2024-06-01'), '1-year')
      expect(expiry?.getFullYear()).toBe(2025)
    })

    it('should handle no-expiry renewal', () => {
      const expiry = calculateRenewalExpiryDate(new Date('2024-06-01'), 'no-expiry')
      expect(expiry).toBeNull()
    })

    it('should calculate from today if current expiry is past', () => {
      // Current expiry is in the past
      const expiry = calculateRenewalExpiryDate(new Date('2024-05-01'), '3-months')

      // Should calculate from today (June 1), not the past date
      expect(expiry?.getMonth()).toBe(8) // September
    })
  })
})
