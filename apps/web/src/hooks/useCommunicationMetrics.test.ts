/**
 * useCommunicationMetrics Hook Tests - Story 34.5.1 Task 5
 *
 * Tests for accessing communication health metrics.
 * AC5: Family Communication Metrics
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCommunicationMetrics } from './useCommunicationMetrics'

// Mock getRejectionPattern from shared
const mockGetRejectionPattern = vi.fn()
vi.mock('@fledgely/shared', () => ({
  getRejectionPattern: (...args: unknown[]) => mockGetRejectionPattern(...args),
  REJECTION_THRESHOLD: 3,
}))

describe('useCommunicationMetrics - Story 34.5.1 (AC5)', () => {
  const defaultProps = {
    familyId: 'family-1',
    childId: 'child-1',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetRejectionPattern.mockResolvedValue(null)
  })

  describe('loading state', () => {
    it('should start with loading true', () => {
      const { result } = renderHook(() =>
        useCommunicationMetrics(defaultProps.familyId, defaultProps.childId)
      )

      expect(result.current.loading).toBe(true)
    })

    it('should set loading false after fetch', async () => {
      mockGetRejectionPattern.mockResolvedValue({
        id: 'pattern-1',
        familyId: 'family-1',
        childId: 'child-1',
        totalProposals: 5,
        totalRejections: 2,
        rejectionsInWindow: 1,
        escalationTriggered: false,
      })

      const { result } = renderHook(() =>
        useCommunicationMetrics(defaultProps.familyId, defaultProps.childId)
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })
  })

  describe('metrics calculation', () => {
    it('should return null metrics when no pattern exists', async () => {
      mockGetRejectionPattern.mockResolvedValue(null)

      const { result } = renderHook(() =>
        useCommunicationMetrics(defaultProps.familyId, defaultProps.childId)
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.metrics).toBeNull()
    })

    it('should calculate metrics from pattern data', async () => {
      mockGetRejectionPattern.mockResolvedValue({
        id: 'pattern-1',
        familyId: 'family-1',
        childId: 'child-1',
        totalProposals: 10,
        totalRejections: 3,
        rejectionsInWindow: 2,
        escalationTriggered: false,
      })

      const { result } = renderHook(() =>
        useCommunicationMetrics(defaultProps.familyId, defaultProps.childId)
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.metrics).toEqual({
        totalProposals: 10,
        totalRejections: 3,
        rejectionsInWindow: 2,
        rejectionRate: 30, // 3/10 = 30%
        escalationTriggered: false,
        trend: 'stable',
      })
    })

    it('should calculate correct rejection rate', async () => {
      mockGetRejectionPattern.mockResolvedValue({
        totalProposals: 20,
        totalRejections: 5,
        rejectionsInWindow: 1,
        escalationTriggered: false,
      })

      const { result } = renderHook(() =>
        useCommunicationMetrics(defaultProps.familyId, defaultProps.childId)
      )

      await waitFor(() => {
        expect(result.current.metrics?.rejectionRate).toBe(25)
      })
    })

    it('should handle zero proposals without division error', async () => {
      mockGetRejectionPattern.mockResolvedValue({
        totalProposals: 0,
        totalRejections: 0,
        rejectionsInWindow: 0,
        escalationTriggered: false,
      })

      const { result } = renderHook(() =>
        useCommunicationMetrics(defaultProps.familyId, defaultProps.childId)
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.metrics?.rejectionRate).toBe(0)
    })
  })

  describe('trend calculation', () => {
    it('should return "needs-attention" when escalation is triggered', async () => {
      mockGetRejectionPattern.mockResolvedValue({
        totalProposals: 10,
        totalRejections: 5,
        rejectionsInWindow: 3,
        escalationTriggered: true,
      })

      const { result } = renderHook(() =>
        useCommunicationMetrics(defaultProps.familyId, defaultProps.childId)
      )

      await waitFor(() => {
        expect(result.current.metrics?.trend).toBe('needs-attention')
      })
    })

    it('should return "needs-attention" when rejection rate is high', async () => {
      mockGetRejectionPattern.mockResolvedValue({
        totalProposals: 10,
        totalRejections: 6, // 60% rejection rate
        rejectionsInWindow: 2,
        escalationTriggered: false,
      })

      const { result } = renderHook(() =>
        useCommunicationMetrics(defaultProps.familyId, defaultProps.childId)
      )

      await waitFor(() => {
        expect(result.current.metrics?.trend).toBe('needs-attention')
      })
    })

    it('should return "improving" when low rejections in window', async () => {
      mockGetRejectionPattern.mockResolvedValue({
        totalProposals: 10,
        totalRejections: 2,
        rejectionsInWindow: 0, // No recent rejections
        escalationTriggered: false,
      })

      const { result } = renderHook(() =>
        useCommunicationMetrics(defaultProps.familyId, defaultProps.childId)
      )

      await waitFor(() => {
        expect(result.current.metrics?.trend).toBe('improving')
      })
    })

    it('should return "stable" for normal rejection patterns', async () => {
      mockGetRejectionPattern.mockResolvedValue({
        totalProposals: 10,
        totalRejections: 2,
        rejectionsInWindow: 1,
        escalationTriggered: false,
      })

      const { result } = renderHook(() =>
        useCommunicationMetrics(defaultProps.familyId, defaultProps.childId)
      )

      await waitFor(() => {
        expect(result.current.metrics?.trend).toBe('stable')
      })
    })
  })

  describe('error handling', () => {
    it('should set error on fetch failure', async () => {
      mockGetRejectionPattern.mockRejectedValue(new Error('Failed to fetch'))

      const { result } = renderHook(() =>
        useCommunicationMetrics(defaultProps.familyId, defaultProps.childId)
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBeTruthy()
      expect(result.current.error?.message).toBe('Failed to fetch')
    })

    it('should clear error on successful refetch', async () => {
      mockGetRejectionPattern
        .mockRejectedValueOnce(new Error('First fetch failed'))
        .mockResolvedValueOnce({
          totalProposals: 5,
          totalRejections: 1,
          rejectionsInWindow: 0,
          escalationTriggered: false,
        })

      const { result } = renderHook(() =>
        useCommunicationMetrics(defaultProps.familyId, defaultProps.childId)
      )

      // Wait for first error
      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })

      // Refetch
      result.current.refetch()

      await waitFor(() => {
        expect(result.current.error).toBeNull()
      })
    })
  })

  describe('refetch', () => {
    it('should provide refetch function', async () => {
      mockGetRejectionPattern.mockResolvedValue({
        totalProposals: 5,
        totalRejections: 1,
        rejectionsInWindow: 0,
        escalationTriggered: false,
      })

      const { result } = renderHook(() =>
        useCommunicationMetrics(defaultProps.familyId, defaultProps.childId)
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(typeof result.current.refetch).toBe('function')
    })

    it('should refetch data when called', async () => {
      mockGetRejectionPattern.mockResolvedValue({
        totalProposals: 5,
        totalRejections: 1,
        rejectionsInWindow: 0,
        escalationTriggered: false,
      })

      const { result } = renderHook(() =>
        useCommunicationMetrics(defaultProps.familyId, defaultProps.childId)
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      mockGetRejectionPattern.mockResolvedValue({
        totalProposals: 6,
        totalRejections: 2,
        rejectionsInWindow: 1,
        escalationTriggered: false,
      })

      result.current.refetch()

      await waitFor(() => {
        expect(result.current.metrics?.totalProposals).toBe(6)
      })
    })
  })

  describe('childId dependency', () => {
    it('should fetch pattern for specific child', async () => {
      mockGetRejectionPattern.mockResolvedValue({
        totalProposals: 5,
        totalRejections: 1,
        rejectionsInWindow: 0,
        escalationTriggered: false,
      })

      renderHook(() => useCommunicationMetrics('family-1', 'specific-child'))

      await waitFor(() => {
        expect(mockGetRejectionPattern).toHaveBeenCalledWith('specific-child')
      })
    })
  })
})
