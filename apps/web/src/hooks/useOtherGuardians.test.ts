import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useOtherGuardians } from './useOtherGuardians'
import type { FamilyGuardian } from '@fledgely/contracts'

// Mock userService
vi.mock('@/services/userService', () => ({
  getUser: vi.fn(),
}))

import { getUser } from '@/services/userService'

const mockGetUser = getUser as Mock

/**
 * useOtherGuardians Hook Tests
 *
 * Story 3.4: Equal Access Verification - Task 3
 *
 * Tests verify:
 * - Filters out current user from guardians array
 * - Fetches display names for other guardians
 * - Returns formatted name list for display
 * - Handles loading and error states
 * - Optimizes to avoid unnecessary re-fetches
 */

describe('useOtherGuardians', () => {
  const currentUserId = 'user-123'

  const guardians: FamilyGuardian[] = [
    {
      uid: 'user-123',
      role: 'primary',
      permissions: 'full',
      joinedAt: new Date(),
    },
    {
      uid: 'user-456',
      role: 'co-parent',
      permissions: 'full',
      joinedAt: new Date(),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // Basic Functionality
  // ============================================================================

  describe('basic functionality', () => {
    it('returns empty array when no other guardians exist', async () => {
      const singleGuardian = [guardians[0]] // Only current user

      const { result } = renderHook(() =>
        useOtherGuardians(singleGuardian, currentUserId)
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.otherGuardianNames).toEqual([])
      expect(mockGetUser).not.toHaveBeenCalled()
    })

    it('filters out current user from guardians', async () => {
      mockGetUser.mockResolvedValueOnce({
        uid: 'user-456',
        displayName: 'Jane Smith',
      })

      const { result } = renderHook(() =>
        useOtherGuardians(guardians, currentUserId)
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockGetUser).toHaveBeenCalledWith('user-456')
      expect(mockGetUser).not.toHaveBeenCalledWith('user-123')
    })

    it('returns display names of other guardians', async () => {
      mockGetUser.mockResolvedValueOnce({
        uid: 'user-456',
        displayName: 'Jane Smith',
      })

      const { result } = renderHook(() =>
        useOtherGuardians(guardians, currentUserId)
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.otherGuardianNames).toEqual(['Jane Smith'])
    })

    it('fetches multiple guardian names', async () => {
      const threeGuardians: FamilyGuardian[] = [
        ...guardians,
        {
          uid: 'user-789',
          role: 'co-parent',
          permissions: 'full',
          joinedAt: new Date(),
        },
      ]

      mockGetUser
        .mockResolvedValueOnce({ uid: 'user-456', displayName: 'Jane Smith' })
        .mockResolvedValueOnce({ uid: 'user-789', displayName: 'Bob Johnson' })

      const { result } = renderHook(() =>
        useOtherGuardians(threeGuardians, currentUserId)
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.otherGuardianNames).toContain('Jane Smith')
      expect(result.current.otherGuardianNames).toContain('Bob Johnson')
      expect(result.current.otherGuardianNames).toHaveLength(2)
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('handles null displayName with fallback', async () => {
      mockGetUser.mockResolvedValueOnce({
        uid: 'user-456',
        displayName: null,
      })

      const { result } = renderHook(() =>
        useOtherGuardians(guardians, currentUserId)
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should use fallback name
      expect(result.current.otherGuardianNames).toEqual(['Co-parent'])
    })

    it('handles undefined displayName with fallback', async () => {
      mockGetUser.mockResolvedValueOnce({
        uid: 'user-456',
      })

      const { result } = renderHook(() =>
        useOtherGuardians(guardians, currentUserId)
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.otherGuardianNames).toEqual(['Co-parent'])
    })

    it('handles user not found (null return)', async () => {
      mockGetUser.mockResolvedValueOnce(null)

      const { result } = renderHook(() =>
        useOtherGuardians(guardians, currentUserId)
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.otherGuardianNames).toEqual(['Co-parent'])
    })

    it('handles empty guardians array', async () => {
      const { result } = renderHook(() =>
        useOtherGuardians([], currentUserId)
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.otherGuardianNames).toEqual([])
      expect(mockGetUser).not.toHaveBeenCalled()
    })

    it('handles null guardians', async () => {
      const { result } = renderHook(() =>
        useOtherGuardians(null as unknown as FamilyGuardian[], currentUserId)
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.otherGuardianNames).toEqual([])
    })

    it('handles null currentUserId', async () => {
      const { result } = renderHook(() =>
        useOtherGuardians(guardians, null as unknown as string)
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.otherGuardianNames).toEqual([])
    })
  })

  // ============================================================================
  // Loading State
  // ============================================================================

  describe('loading state', () => {
    it('starts with loading true when fetching', () => {
      mockGetUser.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ displayName: 'Jane' }), 100))
      )

      const { result } = renderHook(() =>
        useOtherGuardians(guardians, currentUserId)
      )

      expect(result.current.isLoading).toBe(true)
    })

    it('sets loading false after fetch completes', async () => {
      mockGetUser.mockResolvedValueOnce({ displayName: 'Jane Smith' })

      const { result } = renderHook(() =>
        useOtherGuardians(guardians, currentUserId)
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('is not loading when no other guardians', () => {
      const singleGuardian = [guardians[0]]

      const { result } = renderHook(() =>
        useOtherGuardians(singleGuardian, currentUserId)
      )

      // Should immediately be false since no fetch needed
      expect(result.current.isLoading).toBe(false)
    })
  })

  // ============================================================================
  // Error Handling
  // ============================================================================

  describe('error handling', () => {
    it('handles fetch error gracefully', async () => {
      mockGetUser.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() =>
        useOtherGuardians(guardians, currentUserId)
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBeTruthy()
      expect(result.current.otherGuardianNames).toEqual([])
    })

    it('continues fetching other guardians if one fails', async () => {
      const threeGuardians: FamilyGuardian[] = [
        ...guardians,
        {
          uid: 'user-789',
          role: 'co-parent',
          permissions: 'full',
          joinedAt: new Date(),
        },
      ]

      mockGetUser
        .mockRejectedValueOnce(new Error('Failed for user-456'))
        .mockResolvedValueOnce({ uid: 'user-789', displayName: 'Bob Johnson' })

      const { result } = renderHook(() =>
        useOtherGuardians(threeGuardians, currentUserId)
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should still have the successful one with fallback for failed
      expect(result.current.otherGuardianNames).toContain('Bob Johnson')
    })
  })

  // ============================================================================
  // Optimization (Prevent Unnecessary Re-fetches)
  // ============================================================================

  describe('optimization', () => {
    it('does not re-fetch when guardians array reference changes but content is same', async () => {
      mockGetUser.mockResolvedValue({ displayName: 'Jane Smith' })

      const { result, rerender } = renderHook(
        ({ guardians, userId }) => useOtherGuardians(guardians, userId),
        {
          initialProps: { guardians, userId: currentUserId },
        }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const initialCallCount = mockGetUser.mock.calls.length

      // Rerender with same guardian UIDs but new array reference
      const newGuardians = guardians.map(g => ({ ...g }))
      rerender({ guardians: newGuardians, userId: currentUserId })

      // Should not trigger additional fetches
      await waitFor(() => {
        expect(mockGetUser.mock.calls.length).toBe(initialCallCount)
      })
    })

    it('re-fetches when guardian UIDs actually change', async () => {
      mockGetUser.mockResolvedValue({ displayName: 'Jane Smith' })

      const { result, rerender } = renderHook(
        ({ guardians, userId }) => useOtherGuardians(guardians, userId),
        {
          initialProps: { guardians, userId: currentUserId },
        }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const initialCallCount = mockGetUser.mock.calls.length

      // Add a new guardian
      const newGuardians: FamilyGuardian[] = [
        ...guardians,
        {
          uid: 'user-new',
          role: 'co-parent',
          permissions: 'full',
          joinedAt: new Date(),
        },
      ]
      rerender({ guardians: newGuardians, userId: currentUserId })

      await waitFor(() => {
        expect(mockGetUser.mock.calls.length).toBeGreaterThan(initialCallCount)
      })
    })
  })
})
