import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useInvitation } from './useInvitation'
import type { Invitation } from '@fledgely/contracts'

// Mock dependencies
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuthContext: vi.fn(),
}))

vi.mock('@/services/invitationService', () => ({
  createCoParentInvitation: vi.fn(),
  getExistingPendingInvitation: vi.fn(),
  revokeInvitation: vi.fn(),
}))

// Import mocked functions after mocking
import { useAuthContext } from '@/components/providers/AuthProvider'
import {
  createCoParentInvitation,
  getExistingPendingInvitation,
  revokeInvitation as revokeInvitationService,
} from '@/services/invitationService'

const mockUseAuthContext = vi.mocked(useAuthContext)
const mockCreateCoParentInvitation = vi.mocked(createCoParentInvitation)
const mockGetExistingPendingInvitation = vi.mocked(getExistingPendingInvitation)
const mockRevokeInvitation = vi.mocked(revokeInvitationService)

/**
 * useInvitation Hook Tests
 *
 * Story 3.1: Co-Parent Invitation Generation
 *
 * Tests verify:
 * - Initial state
 * - createInvitation function
 * - checkExistingInvitation function
 * - revokeInvitation function
 * - Error handling
 * - Idempotency guard
 */

describe('useInvitation', () => {
  const mockAuthUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
  }

  const mockInvitation: Invitation = {
    id: 'invitation-456',
    familyId: 'family-789',
    familyName: 'Smith Family',
    invitedBy: 'test-user-123',
    invitedByName: 'Jane Smith',
    tokenHash: 'hash-abc',
    status: 'pending',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    acceptedAt: null,
    acceptedBy: null,
  }

  const mockCreateResult = {
    invitation: mockInvitation,
    token: 'unhashed-token-xyz',
    invitationLink: 'https://fledgely.app/join/invitation-456?token=unhashed-token-xyz',
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock: authenticated user
    mockUseAuthContext.mockReturnValue({
      user: mockAuthUser,
      loading: false,
      error: null,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
    } as ReturnType<typeof useAuthContext>)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('initial state', () => {
    it('returns initial state with null invitation', () => {
      const { result } = renderHook(() => useInvitation())

      expect(result.current.invitation).toBeNull()
      expect(result.current.existingInvitation).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.checkingExisting).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('createInvitation', () => {
    it('creates invitation successfully', async () => {
      mockCreateCoParentInvitation.mockResolvedValue(mockCreateResult)

      const { result } = renderHook(() => useInvitation())

      let createResult: typeof mockCreateResult | null = null
      await act(async () => {
        createResult = await result.current.createInvitation('family-789', '7')
      })

      expect(createResult).toEqual(mockCreateResult)
      expect(result.current.invitation).toEqual(mockCreateResult)
      expect(result.current.existingInvitation).toEqual(mockInvitation)
      expect(result.current.error).toBeNull()
      expect(mockCreateCoParentInvitation).toHaveBeenCalledWith(
        { familyId: 'family-789', expiryDays: '7' },
        'test-user-123'
      )
    })

    it('uses default expiry of 7 days when not specified', async () => {
      mockCreateCoParentInvitation.mockResolvedValue(mockCreateResult)

      const { result } = renderHook(() => useInvitation())

      await act(async () => {
        await result.current.createInvitation('family-789')
      })

      expect(mockCreateCoParentInvitation).toHaveBeenCalledWith(
        { familyId: 'family-789', expiryDays: '7' },
        'test-user-123'
      )
    })

    it('handles creation error', async () => {
      const error = new Error('Creation failed')
      ;(error as { code?: string }).code = 'creation-failed'
      mockCreateCoParentInvitation.mockRejectedValue(error)

      const { result } = renderHook(() => useInvitation())

      await act(async () => {
        try {
          await result.current.createInvitation('family-789')
        } catch {
          // Expected error
        }
      })

      expect(result.current.invitation).toBeNull()
      expect(result.current.error).toBe('Could not create invitation. Please try again.')
    })

    it('throws error when not authenticated', async () => {
      mockUseAuthContext.mockReturnValue({
        user: null,
        loading: false,
        error: null,
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      } as ReturnType<typeof useAuthContext>)

      const { result } = renderHook(() => useInvitation())

      await expect(
        act(async () => {
          await result.current.createInvitation('family-789')
        })
      ).rejects.toThrow('Must be logged in to create an invitation')
    })

    it('sets loading state during creation', async () => {
      let resolveCreate: (value: typeof mockCreateResult) => void
      mockCreateCoParentInvitation.mockImplementation(
        () => new Promise((resolve) => {
          resolveCreate = resolve
        })
      )

      const { result } = renderHook(() => useInvitation())

      let createPromise: Promise<typeof mockCreateResult>
      act(() => {
        createPromise = result.current.createInvitation('family-789')
      })

      // Should be loading
      expect(result.current.loading).toBe(true)

      // Resolve the promise
      await act(async () => {
        resolveCreate!(mockCreateResult)
        await createPromise
      })

      // Should not be loading
      expect(result.current.loading).toBe(false)
    })
  })

  describe('checkExistingInvitation', () => {
    it('returns existing invitation when found', async () => {
      mockGetExistingPendingInvitation.mockResolvedValue({
        exists: true,
        invitation: mockInvitation,
      })

      const { result } = renderHook(() => useInvitation())

      let checkResult: { exists: boolean; invitation: Invitation | null }
      await act(async () => {
        checkResult = await result.current.checkExistingInvitation('family-789')
      })

      expect(checkResult!.exists).toBe(true)
      expect(checkResult!.invitation).toEqual(mockInvitation)
      expect(result.current.existingInvitation).toEqual(mockInvitation)
    })

    it('returns no invitation when none exists', async () => {
      mockGetExistingPendingInvitation.mockResolvedValue({
        exists: false,
        invitation: null,
      })

      const { result } = renderHook(() => useInvitation())

      let checkResult: { exists: boolean; invitation: Invitation | null }
      await act(async () => {
        checkResult = await result.current.checkExistingInvitation('family-789')
      })

      expect(checkResult!.exists).toBe(false)
      expect(checkResult!.invitation).toBeNull()
      expect(result.current.existingInvitation).toBeNull()
    })

    it('returns empty result when not authenticated', async () => {
      mockUseAuthContext.mockReturnValue({
        user: null,
        loading: false,
        error: null,
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      } as ReturnType<typeof useAuthContext>)

      const { result } = renderHook(() => useInvitation())

      let checkResult: { exists: boolean; invitation: Invitation | null }
      await act(async () => {
        checkResult = await result.current.checkExistingInvitation('family-789')
      })

      expect(checkResult!.exists).toBe(false)
      expect(mockGetExistingPendingInvitation).not.toHaveBeenCalled()
    })

    it('sets checkingExisting state during check', async () => {
      let resolveCheck: (value: { exists: boolean; invitation: Invitation | null }) => void
      mockGetExistingPendingInvitation.mockImplementation(
        () => new Promise((resolve) => {
          resolveCheck = resolve
        })
      )

      const { result } = renderHook(() => useInvitation())

      let checkPromise: Promise<{ exists: boolean; invitation: Invitation | null }>
      act(() => {
        checkPromise = result.current.checkExistingInvitation('family-789')
      })

      // Should be checking
      expect(result.current.checkingExisting).toBe(true)

      // Resolve the promise
      await act(async () => {
        resolveCheck!({ exists: false, invitation: null })
        await checkPromise
      })

      // Should not be checking
      expect(result.current.checkingExisting).toBe(false)
    })
  })

  describe('revokeInvitation', () => {
    it('revokes invitation successfully', async () => {
      // First set up existing invitation
      mockGetExistingPendingInvitation.mockResolvedValue({
        exists: true,
        invitation: mockInvitation,
      })
      mockRevokeInvitation.mockResolvedValue({
        ...mockInvitation,
        status: 'revoked',
      })

      const { result } = renderHook(() => useInvitation())

      // Check for existing first
      await act(async () => {
        await result.current.checkExistingInvitation('family-789')
      })

      expect(result.current.existingInvitation).toEqual(mockInvitation)

      // Revoke
      await act(async () => {
        await result.current.revokeInvitation('invitation-456')
      })

      expect(result.current.existingInvitation).toBeNull()
      expect(result.current.invitation).toBeNull()
      expect(mockRevokeInvitation).toHaveBeenCalledWith(
        'invitation-456',
        'test-user-123'
      )
    })

    it('handles revoke error', async () => {
      const error = new Error('Revoke failed')
      ;(error as { code?: string }).code = 'invitation-not-found'
      mockRevokeInvitation.mockRejectedValue(error)

      const { result } = renderHook(() => useInvitation())

      await act(async () => {
        try {
          await result.current.revokeInvitation('invitation-456')
        } catch {
          // Expected error
        }
      })

      expect(result.current.error).toBe('This invitation no longer exists.')
    })

    it('throws error when not authenticated', async () => {
      mockUseAuthContext.mockReturnValue({
        user: null,
        loading: false,
        error: null,
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      } as ReturnType<typeof useAuthContext>)

      const { result } = renderHook(() => useInvitation())

      await expect(
        act(async () => {
          await result.current.revokeInvitation('invitation-456')
        })
      ).rejects.toThrow('Must be logged in to revoke an invitation')
    })
  })

  describe('clearError', () => {
    it('clears error state', async () => {
      const error = new Error('Test error')
      ;(error as { code?: string }).code = 'creation-failed'
      mockCreateCoParentInvitation.mockRejectedValue(error)

      const { result } = renderHook(() => useInvitation())

      // Create an error state
      await act(async () => {
        try {
          await result.current.createInvitation('family-789')
        } catch {
          // Expected
        }
      })

      expect(result.current.error).not.toBeNull()

      // Clear error
      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('resetInvitation', () => {
    it('resets invitation state', async () => {
      mockCreateCoParentInvitation.mockResolvedValue(mockCreateResult)

      const { result } = renderHook(() => useInvitation())

      // Create an invitation
      await act(async () => {
        await result.current.createInvitation('family-789')
      })

      expect(result.current.invitation).not.toBeNull()

      // Reset
      act(() => {
        result.current.resetInvitation()
      })

      expect(result.current.invitation).toBeNull()
    })
  })
})
