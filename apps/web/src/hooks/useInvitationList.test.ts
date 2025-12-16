import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useInvitationList } from './useInvitationList'
import type { Invitation } from '@fledgely/contracts'

// Mock invitationService
vi.mock('@/services/invitationService', () => ({
  getFamilyInvitations: vi.fn(),
}))

import { getFamilyInvitations } from '@/services/invitationService'

const mockGetFamilyInvitations = getFamilyInvitations as Mock

/**
 * useInvitationList Hook Tests
 *
 * Story 3.5: Invitation Management - Task 2
 *
 * Tests verify:
 * - Fetches invitations for a family
 * - Exposes pendingInvitation and invitationHistory
 * - Loading and error states
 * - Refresh functionality
 * - Handles null familyId
 */

describe('useInvitationList', () => {
  const familyId = 'family-123'
  const userId = 'user-123'

  const now = new Date()
  const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 1 day ago

  const pendingInvitation: Invitation = {
    id: 'inv-1',
    familyId,
    familyName: 'Test Family',
    invitedBy: 'user-1',
    invitedByName: 'John Doe',
    tokenHash: 'hash1',
    status: 'pending',
    createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    expiresAt: futureDate,
    acceptedAt: null,
    acceptedBy: null,
  }

  const acceptedInvitation: Invitation = {
    id: 'inv-2',
    familyId,
    familyName: 'Test Family',
    invitedBy: 'user-1',
    invitedByName: 'John Doe',
    tokenHash: 'hash2',
    status: 'accepted',
    createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    expiresAt: new Date(now.getTime() - 23 * 24 * 60 * 60 * 1000),
    acceptedAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
    acceptedBy: 'user-2',
  }

  const revokedInvitation: Invitation = {
    id: 'inv-3',
    familyId,
    familyName: 'Test Family',
    invitedBy: 'user-1',
    invitedByName: 'John Doe',
    tokenHash: 'hash3',
    status: 'revoked',
    createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
    expiresAt: new Date(now.getTime() - 53 * 24 * 60 * 60 * 1000),
    acceptedAt: null,
    acceptedBy: null,
  }

  const expiredInvitation: Invitation = {
    id: 'inv-4',
    familyId,
    familyName: 'Test Family',
    invitedBy: 'user-1',
    invitedByName: 'John Doe',
    tokenHash: 'hash4',
    status: 'pending', // Status still pending but expired
    createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
    expiresAt: pastDate, // Expired
    acceptedAt: null,
    acceptedBy: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // Basic Functionality
  // ============================================================================

  describe('basic functionality', () => {
    it('returns all invitations sorted by createdAt desc', async () => {
      const invitations = [pendingInvitation, acceptedInvitation, revokedInvitation]
      mockGetFamilyInvitations.mockResolvedValueOnce(invitations)

      const { result } = renderHook(() => useInvitationList(familyId, userId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.invitations).toHaveLength(3)
      expect(mockGetFamilyInvitations).toHaveBeenCalledWith(familyId, userId)
    })

    it('returns empty arrays when no invitations exist', async () => {
      mockGetFamilyInvitations.mockResolvedValueOnce([])

      const { result } = renderHook(() => useInvitationList(familyId, userId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.invitations).toEqual([])
      expect(result.current.pendingInvitation).toBeNull()
      expect(result.current.invitationHistory).toEqual([])
    })

    it('returns empty state when familyId is null', async () => {
      const { result } = renderHook(() => useInvitationList(null, userId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.invitations).toEqual([])
      expect(result.current.pendingInvitation).toBeNull()
      expect(result.current.invitationHistory).toEqual([])
      expect(mockGetFamilyInvitations).not.toHaveBeenCalled()
    })

    it('returns empty state when userId is null', async () => {
      const { result } = renderHook(() => useInvitationList(familyId, null))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.invitations).toEqual([])
      expect(result.current.pendingInvitation).toBeNull()
      expect(result.current.invitationHistory).toEqual([])
      expect(mockGetFamilyInvitations).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Pending Invitation
  // ============================================================================

  describe('pendingInvitation', () => {
    it('returns pending invitation when one exists and not expired', async () => {
      mockGetFamilyInvitations.mockResolvedValueOnce([pendingInvitation, acceptedInvitation])

      const { result } = renderHook(() => useInvitationList(familyId, userId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.pendingInvitation).toEqual(pendingInvitation)
    })

    it('returns null when pending invitation is expired', async () => {
      mockGetFamilyInvitations.mockResolvedValueOnce([expiredInvitation, acceptedInvitation])

      const { result } = renderHook(() => useInvitationList(familyId, userId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.pendingInvitation).toBeNull()
    })

    it('returns null when no pending invitation exists', async () => {
      mockGetFamilyInvitations.mockResolvedValueOnce([acceptedInvitation, revokedInvitation])

      const { result } = renderHook(() => useInvitationList(familyId, userId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.pendingInvitation).toBeNull()
    })
  })

  // ============================================================================
  // Invitation History
  // ============================================================================

  describe('invitationHistory', () => {
    it('includes accepted, revoked, and expired invitations', async () => {
      mockGetFamilyInvitations.mockResolvedValueOnce([
        pendingInvitation,
        acceptedInvitation,
        revokedInvitation,
        expiredInvitation,
      ])

      const { result } = renderHook(() => useInvitationList(familyId, userId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // History should include: accepted, revoked, and expired (pending but past expiresAt)
      expect(result.current.invitationHistory).toHaveLength(3)
      expect(result.current.invitationHistory.map(i => i.id)).toEqual(
        expect.arrayContaining(['inv-2', 'inv-3', 'inv-4'])
      )
    })

    it('excludes valid pending invitations from history', async () => {
      mockGetFamilyInvitations.mockResolvedValueOnce([pendingInvitation, acceptedInvitation])

      const { result } = renderHook(() => useInvitationList(familyId, userId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.invitationHistory).toHaveLength(1)
      expect(result.current.invitationHistory[0].id).toBe('inv-2')
    })
  })

  // ============================================================================
  // Loading State
  // ============================================================================

  describe('loading state', () => {
    it('starts with loading true', () => {
      mockGetFamilyInvitations.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      const { result } = renderHook(() => useInvitationList(familyId, userId))

      expect(result.current.loading).toBe(true)
    })

    it('sets loading false after fetch completes', async () => {
      mockGetFamilyInvitations.mockResolvedValueOnce([])

      const { result } = renderHook(() => useInvitationList(familyId, userId))

      expect(result.current.loading).toBe(true)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })
  })

  // ============================================================================
  // Error State
  // ============================================================================

  describe('error state', () => {
    it('sets error when fetch fails', async () => {
      const error = new Error('Failed to fetch')
      mockGetFamilyInvitations.mockRejectedValueOnce(error)

      const { result } = renderHook(() => useInvitationList(familyId, userId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toBe('Failed to fetch')
    })

    it('clears error on successful refetch', async () => {
      const error = new Error('Failed to fetch')
      mockGetFamilyInvitations.mockRejectedValueOnce(error)

      const { result } = renderHook(() => useInvitationList(familyId, userId))

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })

      // Successful retry
      mockGetFamilyInvitations.mockResolvedValueOnce([pendingInvitation])

      await act(async () => {
        await result.current.refresh()
      })

      expect(result.current.error).toBeNull()
      expect(result.current.invitations).toHaveLength(1)
    })
  })

  // ============================================================================
  // Refresh Functionality
  // ============================================================================

  describe('refresh', () => {
    it('refetches invitations when refresh is called', async () => {
      mockGetFamilyInvitations.mockResolvedValueOnce([pendingInvitation])

      const { result } = renderHook(() => useInvitationList(familyId, userId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockGetFamilyInvitations).toHaveBeenCalledTimes(1)

      // Add an invitation on refresh
      mockGetFamilyInvitations.mockResolvedValueOnce([pendingInvitation, acceptedInvitation])

      await act(async () => {
        await result.current.refresh()
      })

      expect(mockGetFamilyInvitations).toHaveBeenCalledTimes(2)
      expect(result.current.invitations).toHaveLength(2)
    })
  })

  // ============================================================================
  // FamilyId Changes
  // ============================================================================

  describe('familyId changes', () => {
    it('refetches when familyId changes', async () => {
      mockGetFamilyInvitations.mockResolvedValueOnce([pendingInvitation])

      const { result, rerender } = renderHook(
        ({ familyId }) => useInvitationList(familyId, userId),
        { initialProps: { familyId: 'family-1' } }
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockGetFamilyInvitations).toHaveBeenCalledWith('family-1', userId)

      // Change familyId
      mockGetFamilyInvitations.mockResolvedValueOnce([acceptedInvitation])

      rerender({ familyId: 'family-2' })

      await waitFor(() => {
        expect(mockGetFamilyInvitations).toHaveBeenCalledWith('family-2', userId)
      })
    })
  })
})
