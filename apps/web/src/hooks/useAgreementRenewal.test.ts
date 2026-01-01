/**
 * useAgreementRenewal Hook Tests - Story 35.3
 *
 * Tests for managing renewal state and actions.
 * AC1: Mode selection
 * AC4: Child consent required
 * AC5: Both signatures required
 * AC6: New expiry date
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAgreementRenewal } from './useAgreementRenewal'

describe('useAgreementRenewal - Story 35.3', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-01'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should initialize with null state', () => {
      const { result } = renderHook(() =>
        useAgreementRenewal({
          agreementId: 'agreement-123',
          currentExpiryDate: new Date('2024-07-01'),
          currentDuration: '1-year',
        })
      )

      expect(result.current.renewalState).toBeNull()
      expect(result.current.isRenewing).toBe(false)
    })

    it('should provide mode options', () => {
      const { result } = renderHook(() =>
        useAgreementRenewal({
          agreementId: 'agreement-123',
          currentExpiryDate: new Date('2024-07-01'),
          currentDuration: '1-year',
        })
      )

      expect(result.current.modeOptions).toHaveLength(2)
      expect(result.current.modeOptions[0].mode).toBe('renew-as-is')
      expect(result.current.modeOptions[1].mode).toBe('renew-with-changes')
    })
  })

  describe('startRenewal (AC1)', () => {
    it('should start renewal with renew-as-is mode', () => {
      const { result } = renderHook(() =>
        useAgreementRenewal({
          agreementId: 'agreement-123',
          currentExpiryDate: new Date('2024-07-01'),
          currentDuration: '1-year',
        })
      )

      act(() => {
        result.current.startRenewal('renew-as-is')
      })

      expect(result.current.isRenewing).toBe(true)
      expect(result.current.renewalState?.mode).toBe('renew-as-is')
      expect(result.current.renewalState?.status).toBe('parent-initiated')
    })

    it('should start renewal with renew-with-changes mode', () => {
      const { result } = renderHook(() =>
        useAgreementRenewal({
          agreementId: 'agreement-123',
          currentExpiryDate: new Date('2024-07-01'),
          currentDuration: '6-months',
        })
      )

      act(() => {
        result.current.startRenewal('renew-with-changes')
      })

      expect(result.current.renewalState?.mode).toBe('renew-with-changes')
    })

    it('should calculate new expiry date', () => {
      const { result } = renderHook(() =>
        useAgreementRenewal({
          agreementId: 'agreement-123',
          currentExpiryDate: new Date('2024-07-01'),
          currentDuration: '1-year',
        })
      )

      act(() => {
        result.current.startRenewal('renew-as-is')
      })

      expect(result.current.renewalState?.newExpiryDate).not.toBeNull()
      expect(result.current.newExpiryDate?.getFullYear()).toBe(2025)
    })
  })

  describe('signAsParent (AC5)', () => {
    it('should record parent signature', () => {
      const { result } = renderHook(() =>
        useAgreementRenewal({
          agreementId: 'agreement-123',
          currentExpiryDate: new Date('2024-07-01'),
          currentDuration: '1-year',
        })
      )

      act(() => {
        result.current.startRenewal('renew-as-is')
      })

      act(() => {
        result.current.signAsParent('Parent Signature')
      })

      expect(result.current.parentSigned).toBe(true)
      expect(result.current.renewalState?.status).toBe('child-consenting')
    })
  })

  describe('signAsChild (AC4, AC5)', () => {
    it('should record child signature after parent', () => {
      const { result } = renderHook(() =>
        useAgreementRenewal({
          agreementId: 'agreement-123',
          currentExpiryDate: new Date('2024-07-01'),
          currentDuration: '1-year',
        })
      )

      act(() => {
        result.current.startRenewal('renew-as-is')
      })

      act(() => {
        result.current.signAsParent('Parent Signature')
      })

      act(() => {
        result.current.signAsChild('Child Signature')
      })

      expect(result.current.childSigned).toBe(true)
    })

    it('should not record child signature before parent', () => {
      const { result } = renderHook(() =>
        useAgreementRenewal({
          agreementId: 'agreement-123',
          currentExpiryDate: new Date('2024-07-01'),
          currentDuration: '1-year',
        })
      )

      act(() => {
        result.current.startRenewal('renew-as-is')
      })

      act(() => {
        result.current.signAsChild('Child Signature')
      })

      expect(result.current.childSigned).toBe(false)
    })
  })

  describe('completeRenewal (AC5, AC6)', () => {
    it('should complete when both signatures present', () => {
      const onComplete = vi.fn()
      const { result } = renderHook(() =>
        useAgreementRenewal({
          agreementId: 'agreement-123',
          currentExpiryDate: new Date('2024-07-01'),
          currentDuration: '1-year',
          onComplete,
        })
      )

      act(() => {
        result.current.startRenewal('renew-as-is')
      })

      act(() => {
        result.current.signAsParent('Parent Signature')
      })

      act(() => {
        result.current.signAsChild('Child Signature')
      })

      act(() => {
        result.current.completeRenewal()
      })

      expect(result.current.renewalState?.status).toBe('completed')
      expect(onComplete).toHaveBeenCalled()
    })

    it('should not complete without both signatures', () => {
      const { result } = renderHook(() =>
        useAgreementRenewal({
          agreementId: 'agreement-123',
          currentExpiryDate: new Date('2024-07-01'),
          currentDuration: '1-year',
        })
      )

      act(() => {
        result.current.startRenewal('renew-as-is')
      })

      act(() => {
        result.current.signAsParent('Parent Signature')
      })

      act(() => {
        result.current.completeRenewal()
      })

      expect(result.current.renewalState?.status).not.toBe('completed')
    })
  })

  describe('cancelRenewal', () => {
    it('should cancel in-progress renewal', () => {
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
        result.current.cancelRenewal()
      })

      expect(result.current.renewalState?.status).toBe('cancelled')
      expect(onCancel).toHaveBeenCalled()
    })
  })

  describe('canComplete', () => {
    it('should return false initially', () => {
      const { result } = renderHook(() =>
        useAgreementRenewal({
          agreementId: 'agreement-123',
          currentExpiryDate: new Date('2024-07-01'),
          currentDuration: '1-year',
        })
      )

      expect(result.current.canComplete).toBe(false)
    })

    it('should return true when both signed', () => {
      const { result } = renderHook(() =>
        useAgreementRenewal({
          agreementId: 'agreement-123',
          currentExpiryDate: new Date('2024-07-01'),
          currentDuration: '1-year',
        })
      )

      act(() => {
        result.current.startRenewal('renew-as-is')
      })

      act(() => {
        result.current.signAsParent('Parent')
      })

      act(() => {
        result.current.signAsChild('Child')
      })

      expect(result.current.canComplete).toBe(true)
    })
  })

  describe('currentStep', () => {
    it('should return null when not renewing', () => {
      const { result } = renderHook(() =>
        useAgreementRenewal({
          agreementId: 'agreement-123',
          currentExpiryDate: new Date('2024-07-01'),
          currentDuration: '1-year',
        })
      )

      expect(result.current.currentStep).toBeNull()
    })

    it('should return parent-sign when started', () => {
      const { result } = renderHook(() =>
        useAgreementRenewal({
          agreementId: 'agreement-123',
          currentExpiryDate: new Date('2024-07-01'),
          currentDuration: '1-year',
        })
      )

      act(() => {
        result.current.startRenewal('renew-as-is')
      })

      expect(result.current.currentStep).toBe('parent-sign')
    })

    it('should return child-consent after parent signs', () => {
      const { result } = renderHook(() =>
        useAgreementRenewal({
          agreementId: 'agreement-123',
          currentExpiryDate: new Date('2024-07-01'),
          currentDuration: '1-year',
        })
      )

      act(() => {
        result.current.startRenewal('renew-as-is')
      })

      act(() => {
        result.current.signAsParent('Parent')
      })

      expect(result.current.currentStep).toBe('child-consent')
    })
  })

  describe('reset', () => {
    it('should reset all state', () => {
      const { result } = renderHook(() =>
        useAgreementRenewal({
          agreementId: 'agreement-123',
          currentExpiryDate: new Date('2024-07-01'),
          currentDuration: '1-year',
        })
      )

      act(() => {
        result.current.startRenewal('renew-as-is')
      })

      act(() => {
        result.current.signAsParent('Parent')
      })

      act(() => {
        result.current.reset()
      })

      expect(result.current.renewalState).toBeNull()
      expect(result.current.isRenewing).toBe(false)
    })
  })
})
