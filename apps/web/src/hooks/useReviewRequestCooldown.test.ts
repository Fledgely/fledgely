/**
 * useReviewRequestCooldown Hook Tests - Story 34.5.3 Task 5
 *
 * Tests for review request cooldown state management.
 * AC4: Rate Limiting (60-Day Cooldown)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useReviewRequestCooldown } from './useReviewRequestCooldown'
import type {
  CooldownStatus,
  AgreementReviewRequest,
} from '@fledgely/shared/contracts/agreementReviewRequest'

// ============================================
// Mock Services
// ============================================

const mockCheckCooldown = vi.fn()
const mockSubmitRequest = vi.fn()
const mockGetPendingRequest = vi.fn()

vi.mock('@fledgely/shared/services/agreementReviewRequestService', () => ({
  checkReviewRequestCooldown: (...args: unknown[]) => mockCheckCooldown(...args),
  submitReviewRequest: (...args: unknown[]) => mockSubmitRequest(...args),
  getPendingReviewRequest: (...args: unknown[]) => mockGetPendingRequest(...args),
}))

describe('useReviewRequestCooldown - Story 34.5.3', () => {
  const defaultProps = {
    familyId: 'family-123',
    childId: 'child-456',
    childName: 'Alex',
    agreementId: 'agreement-789',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckCooldown.mockResolvedValue({
      canRequest: true,
      lastRequestAt: null,
      nextAvailableAt: null,
      daysRemaining: 0,
    })
    mockGetPendingRequest.mockResolvedValue(null)
  })

  // ============================================
  // Initial State Tests
  // ============================================

  describe('initial state', () => {
    it('should start with loading true', () => {
      const { result } = renderHook(() =>
        useReviewRequestCooldown(
          defaultProps.familyId,
          defaultProps.childId,
          defaultProps.childName,
          defaultProps.agreementId
        )
      )

      expect(result.current.loading).toBe(true)
    })

    it('should fetch cooldown status on mount', async () => {
      renderHook(() =>
        useReviewRequestCooldown(
          defaultProps.familyId,
          defaultProps.childId,
          defaultProps.childName,
          defaultProps.agreementId
        )
      )

      await waitFor(() => {
        expect(mockCheckCooldown).toHaveBeenCalledWith(defaultProps.familyId, defaultProps.childId)
      })
    })

    it('should set loading to false after fetch', async () => {
      const { result } = renderHook(() =>
        useReviewRequestCooldown(
          defaultProps.familyId,
          defaultProps.childId,
          defaultProps.childName,
          defaultProps.agreementId
        )
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })
  })

  // ============================================
  // Cooldown Status Tests
  // ============================================

  describe('cooldown status', () => {
    it('should return canRequest true when no cooldown', async () => {
      mockCheckCooldown.mockResolvedValue({
        canRequest: true,
        lastRequestAt: null,
        nextAvailableAt: null,
        daysRemaining: 0,
      })

      const { result } = renderHook(() =>
        useReviewRequestCooldown(
          defaultProps.familyId,
          defaultProps.childId,
          defaultProps.childName,
          defaultProps.agreementId
        )
      )

      await waitFor(() => {
        expect(result.current.canRequest).toBe(true)
        expect(result.current.daysRemaining).toBe(0)
      })
    })

    it('should return canRequest false during cooldown', async () => {
      mockCheckCooldown.mockResolvedValue({
        canRequest: false,
        lastRequestAt: new Date(),
        nextAvailableAt: new Date(),
        daysRemaining: 30,
      })

      const { result } = renderHook(() =>
        useReviewRequestCooldown(
          defaultProps.familyId,
          defaultProps.childId,
          defaultProps.childName,
          defaultProps.agreementId
        )
      )

      await waitFor(() => {
        expect(result.current.canRequest).toBe(false)
        expect(result.current.daysRemaining).toBe(30)
      })
    })

    it('should return cooldownStatus object', async () => {
      const cooldownStatus: CooldownStatus = {
        canRequest: false,
        lastRequestAt: new Date(),
        nextAvailableAt: new Date(),
        daysRemaining: 45,
      }
      mockCheckCooldown.mockResolvedValue(cooldownStatus)

      const { result } = renderHook(() =>
        useReviewRequestCooldown(
          defaultProps.familyId,
          defaultProps.childId,
          defaultProps.childName,
          defaultProps.agreementId
        )
      )

      await waitFor(() => {
        expect(result.current.cooldownStatus).toEqual(cooldownStatus)
      })
    })
  })

  // ============================================
  // Submit Request Tests
  // ============================================

  describe('submitRequest', () => {
    it('should call service with correct parameters', async () => {
      const mockRequest: AgreementReviewRequest = {
        id: 'request-123',
        familyId: defaultProps.familyId,
        childId: defaultProps.childId,
        childName: defaultProps.childName,
        agreementId: defaultProps.agreementId,
        requestedAt: new Date(),
        status: 'pending',
        acknowledgedAt: null,
        reviewedAt: null,
        suggestedAreas: [],
        parentNotificationSent: true,
        expiresAt: new Date(),
      }
      mockSubmitRequest.mockResolvedValue(mockRequest)

      const { result } = renderHook(() =>
        useReviewRequestCooldown(
          defaultProps.familyId,
          defaultProps.childId,
          defaultProps.childName,
          defaultProps.agreementId
        )
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.submitRequest()
      })

      expect(mockSubmitRequest).toHaveBeenCalledWith(
        defaultProps.familyId,
        defaultProps.childId,
        defaultProps.childName,
        defaultProps.agreementId
      )
    })

    it('should return the created request on success', async () => {
      const mockRequest: AgreementReviewRequest = {
        id: 'request-123',
        familyId: defaultProps.familyId,
        childId: defaultProps.childId,
        childName: defaultProps.childName,
        agreementId: defaultProps.agreementId,
        requestedAt: new Date(),
        status: 'pending',
        acknowledgedAt: null,
        reviewedAt: null,
        suggestedAreas: [],
        parentNotificationSent: true,
        expiresAt: new Date(),
      }
      mockSubmitRequest.mockResolvedValue(mockRequest)

      const { result } = renderHook(() =>
        useReviewRequestCooldown(
          defaultProps.familyId,
          defaultProps.childId,
          defaultProps.childName,
          defaultProps.agreementId
        )
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let returnedRequest: AgreementReviewRequest | null = null
      await act(async () => {
        returnedRequest = await result.current.submitRequest()
      })

      expect(returnedRequest).toEqual(mockRequest)
    })

    it('should set isSubmitting while request is in progress', async () => {
      let resolveSubmit: (value: unknown) => void
      mockSubmitRequest.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveSubmit = resolve
          })
      )

      const { result } = renderHook(() =>
        useReviewRequestCooldown(
          defaultProps.familyId,
          defaultProps.childId,
          defaultProps.childName,
          defaultProps.agreementId
        )
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Start the request
      act(() => {
        result.current.submitRequest()
      })

      // Should be submitting
      expect(result.current.isSubmitting).toBe(true)

      // Complete the request
      await act(async () => {
        resolveSubmit!({})
      })

      // Should no longer be submitting
      expect(result.current.isSubmitting).toBe(false)
    })

    it('should return null on error', async () => {
      mockSubmitRequest.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() =>
        useReviewRequestCooldown(
          defaultProps.familyId,
          defaultProps.childId,
          defaultProps.childName,
          defaultProps.agreementId
        )
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let returnedRequest: AgreementReviewRequest | null = null
      await act(async () => {
        returnedRequest = await result.current.submitRequest()
      })

      expect(returnedRequest).toBeNull()
    })

    it('should set error on failure', async () => {
      mockSubmitRequest.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() =>
        useReviewRequestCooldown(
          defaultProps.familyId,
          defaultProps.childId,
          defaultProps.childName,
          defaultProps.agreementId
        )
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.submitRequest()
      })

      expect(result.current.error).not.toBeNull()
    })
  })

  // ============================================
  // Error Handling Tests
  // ============================================

  describe('error handling', () => {
    it('should set error when cooldown check fails', async () => {
      mockCheckCooldown.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() =>
        useReviewRequestCooldown(
          defaultProps.familyId,
          defaultProps.childId,
          defaultProps.childName,
          defaultProps.agreementId
        )
      )

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })
    })

    it('should still set loading to false on error', async () => {
      mockCheckCooldown.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() =>
        useReviewRequestCooldown(
          defaultProps.familyId,
          defaultProps.childId,
          defaultProps.childName,
          defaultProps.agreementId
        )
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })
  })
})
