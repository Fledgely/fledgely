/**
 * useProposalCooldown Hook Tests - Story 34.5
 *
 * Tests for 7-day cooldown checking on declined proposals.
 * AC4: 7-day cooldown for same change
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useProposalCooldown } from './useProposalCooldown'

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ toMillis: () => Date.now() })),
    fromMillis: vi.fn((ms: number) => ({ toMillis: () => ms })),
  },
}))

vi.mock('../lib/firebase', () => ({
  getFirestoreDb: vi.fn(() => ({})),
}))

const { getDocs, query, where, collection } = await import('firebase/firestore')

describe('useProposalCooldown - Story 34.5', () => {
  const mockProps = {
    familyId: 'family-123',
    childId: 'child-abc',
    sectionId: 'time-limits',
    fieldPath: 'weekday.gaming',
  }

  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

  beforeEach(() => {
    vi.clearAllMocks()
    ;(collection as Mock).mockReturnValue('mock-collection')
    ;(query as Mock).mockReturnValue('mock-query')
    ;(where as Mock).mockReturnValue('mock-where')
  })

  describe('hook initialization', () => {
    it('should initialize with loading state', () => {
      ;(getDocs as Mock).mockResolvedValue({ docs: [] })
      const { result } = renderHook(() => useProposalCooldown(mockProps))

      expect(result.current.isLoading).toBe(true)
    })

    it('should provide cooldown check result', async () => {
      ;(getDocs as Mock).mockResolvedValue({ docs: [] })
      const { result } = renderHook(() => useProposalCooldown(mockProps))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isOnCooldown).toBe(false)
    })
  })

  describe('no cooldown cases', () => {
    it('should return isOnCooldown=false when no declined proposals', async () => {
      ;(getDocs as Mock).mockResolvedValue({ docs: [] })

      const { result } = renderHook(() => useProposalCooldown(mockProps))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isOnCooldown).toBe(false)
      expect(result.current.daysRemaining).toBe(0)
      expect(result.current.cooldownEndDate).toBeNull()
    })

    it('should return isOnCooldown=false when decline was more than 7 days ago', async () => {
      const oldDeclineDate = Date.now() - (SEVEN_DAYS_MS + 1000) // 7 days + 1 second ago

      ;(getDocs as Mock).mockResolvedValue({
        docs: [
          {
            id: 'proposal-1',
            data: () => ({
              status: 'declined',
              changes: [{ sectionId: 'time-limits', fieldPath: 'weekday.gaming' }],
              respondedAt: { toMillis: () => oldDeclineDate },
            }),
          },
        ],
      })

      const { result } = renderHook(() => useProposalCooldown(mockProps))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isOnCooldown).toBe(false)
    })

    it('should return isOnCooldown=false when declined proposal is for different section', async () => {
      const recentDecline = Date.now() - 3 * 24 * 60 * 60 * 1000 // 3 days ago

      ;(getDocs as Mock).mockResolvedValue({
        docs: [
          {
            id: 'proposal-1',
            data: () => ({
              status: 'declined',
              changes: [{ sectionId: 'app-restrictions', fieldPath: 'blocked.apps' }],
              respondedAt: { toMillis: () => recentDecline },
            }),
          },
        ],
      })

      const { result } = renderHook(() => useProposalCooldown(mockProps))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isOnCooldown).toBe(false)
    })
  })

  describe('cooldown active cases', () => {
    it('should return isOnCooldown=true when same change declined within 7 days', async () => {
      const recentDecline = Date.now() - 3 * 24 * 60 * 60 * 1000 // 3 days ago

      ;(getDocs as Mock).mockResolvedValue({
        docs: [
          {
            id: 'proposal-1',
            data: () => ({
              status: 'declined',
              changes: [{ sectionId: 'time-limits', fieldPath: 'weekday.gaming' }],
              respondedAt: { toMillis: () => recentDecline },
            }),
          },
        ],
      })

      const { result } = renderHook(() => useProposalCooldown(mockProps))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isOnCooldown).toBe(true)
    })

    it('should calculate daysRemaining correctly', async () => {
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000

      ;(getDocs as Mock).mockResolvedValue({
        docs: [
          {
            id: 'proposal-1',
            data: () => ({
              status: 'declined',
              changes: [{ sectionId: 'time-limits', fieldPath: 'weekday.gaming' }],
              respondedAt: { toMillis: () => threeDaysAgo },
            }),
          },
        ],
      })

      const { result } = renderHook(() => useProposalCooldown(mockProps))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // 7 days - 3 days = 4 days remaining
      expect(result.current.daysRemaining).toBe(4)
    })

    it('should provide cooldownEndDate', async () => {
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000

      ;(getDocs as Mock).mockResolvedValue({
        docs: [
          {
            id: 'proposal-1',
            data: () => ({
              status: 'declined',
              changes: [{ sectionId: 'time-limits', fieldPath: 'weekday.gaming' }],
              respondedAt: { toMillis: () => threeDaysAgo },
            }),
          },
        ],
      })

      const { result } = renderHook(() => useProposalCooldown(mockProps))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.cooldownEndDate).not.toBeNull()
      // Should be 4 days from now (7 - 3 = 4)
      const expectedEnd = threeDaysAgo + SEVEN_DAYS_MS
      expect(result.current.cooldownEndDate?.getTime()).toBeCloseTo(expectedEnd, -3)
    })

    it('should provide declinedProposalId', async () => {
      const recentDecline = Date.now() - 2 * 24 * 60 * 60 * 1000

      ;(getDocs as Mock).mockResolvedValue({
        docs: [
          {
            id: 'proposal-xyz',
            data: () => ({
              status: 'declined',
              changes: [{ sectionId: 'time-limits', fieldPath: 'weekday.gaming' }],
              respondedAt: { toMillis: () => recentDecline },
            }),
          },
        ],
      })

      const { result } = renderHook(() => useProposalCooldown(mockProps))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.declinedProposalId).toBe('proposal-xyz')
    })
  })

  describe('edge cases', () => {
    it('should use most recent declined proposal when multiple exist', async () => {
      const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000
      const fiveDaysAgo = Date.now() - 5 * 24 * 60 * 60 * 1000

      ;(getDocs as Mock).mockResolvedValue({
        docs: [
          {
            id: 'proposal-older',
            data: () => ({
              status: 'declined',
              changes: [{ sectionId: 'time-limits', fieldPath: 'weekday.gaming' }],
              respondedAt: { toMillis: () => fiveDaysAgo },
            }),
          },
          {
            id: 'proposal-newer',
            data: () => ({
              status: 'declined',
              changes: [{ sectionId: 'time-limits', fieldPath: 'weekday.gaming' }],
              respondedAt: { toMillis: () => twoDaysAgo },
            }),
          },
        ],
      })

      const { result } = renderHook(() => useProposalCooldown(mockProps))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should use most recent (2 days ago), so 5 days remaining
      expect(result.current.daysRemaining).toBe(5)
      expect(result.current.declinedProposalId).toBe('proposal-newer')
    })

    it('should match section and field correctly', async () => {
      const recentDecline = Date.now() - 1 * 24 * 60 * 60 * 1000

      // Same section but different field - should not match
      ;(getDocs as Mock).mockResolvedValue({
        docs: [
          {
            id: 'proposal-1',
            data: () => ({
              status: 'declined',
              changes: [{ sectionId: 'time-limits', fieldPath: 'weekend.gaming' }], // Different field
              respondedAt: { toMillis: () => recentDecline },
            }),
          },
        ],
      })

      const { result } = renderHook(() => useProposalCooldown(mockProps))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isOnCooldown).toBe(false)
    })
  })

  describe('error handling', () => {
    it('should handle query errors gracefully', async () => {
      ;(getDocs as Mock).mockRejectedValue(new Error('Firestore error'))

      const { result } = renderHook(() => useProposalCooldown(mockProps))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('Firestore error')
      expect(result.current.isOnCooldown).toBe(false)
    })
  })
})
