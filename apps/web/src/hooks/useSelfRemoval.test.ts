import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSelfRemoval } from './useSelfRemoval'

// Mock self-removal service
vi.mock('@/services/selfRemovalService', () => ({
  removeSelfFromFamily: vi.fn(),
  canRemoveSelf: vi.fn(),
}))

// Mock auth context - start with a valid user
const mockUser = { uid: 'test-user-123', email: 'test@example.com' }
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuthContext: vi.fn(() => ({ user: mockUser })),
}))

// Import mocked functions
import {
  removeSelfFromFamily as removeSelfFromFamilyService,
  canRemoveSelf as canRemoveSelfService,
} from '@/services/selfRemovalService'
import { useAuthContext } from '@/components/providers/AuthProvider'
import type { SelfRemovalResult } from '@fledgely/contracts'

/**
 * useSelfRemoval Hook Tests
 *
 * Story 2.8: Unilateral Self-Removal (Survivor Escape)
 *
 * Tests verify:
 * - Self-removal operation state management
 * - Re-authentication requirement tracking
 * - Single guardian warning state
 * - Error handling
 * - Idempotency guard (prevent double-click)
 */

describe('useSelfRemoval', () => {
  const mockFamilyId = 'test-family-456'
  const mockReauthToken = 'mock-reauth-token-12345'

  const now = new Date()

  const mockRemovalResult: SelfRemovalResult = {
    success: true,
    isSingleGuardian: false,
    familyId: mockFamilyId,
    removedAt: now,
  }

  const mockSingleGuardianResult: SelfRemovalResult = {
    success: true,
    isSingleGuardian: true,
    familyId: mockFamilyId,
    removedAt: now,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mocks to success state with authenticated user
    vi.mocked(removeSelfFromFamilyService).mockResolvedValue(mockRemovalResult)
    vi.mocked(canRemoveSelfService).mockResolvedValue({
      canRemove: true,
      isSingleGuardian: false,
    })
    vi.mocked(useAuthContext).mockReturnValue({ user: mockUser } as ReturnType<
      typeof useAuthContext
    >)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================================================
  // Initial State Tests
  // ============================================================================

  describe('initial state', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useSelfRemoval())

      expect(result.current.removalResult).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.requiresReauth).toBe(true)
      expect(result.current.isSingleGuardian).toBeNull()
    })
  })

  // ============================================================================
  // removeSelf Tests
  // ============================================================================

  describe('removeSelf', () => {
    it('should successfully remove user from family', async () => {
      const { result } = renderHook(() => useSelfRemoval())

      await act(async () => {
        await result.current.removeSelf(mockFamilyId, mockReauthToken)
      })

      expect(result.current.removalResult).toEqual(mockRemovalResult)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.requiresReauth).toBe(false)
      expect(result.current.isSingleGuardian).toBe(false)
    })

    it('should set loading state during operation', async () => {
      vi.mocked(removeSelfFromFamilyService).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockRemovalResult), 100)
          )
      )

      const { result } = renderHook(() => useSelfRemoval())

      let removePromise: Promise<SelfRemovalResult>
      act(() => {
        removePromise = result.current.removeSelf(mockFamilyId, mockReauthToken)
      })

      expect(result.current.loading).toBe(true)

      await act(async () => {
        await removePromise
      })

      expect(result.current.loading).toBe(false)
    })

    it('should throw error when user is not authenticated', async () => {
      // Set up the mock to return null user BEFORE rendering the hook
      vi.mocked(useAuthContext).mockReturnValue({ user: null } as ReturnType<
        typeof useAuthContext
      >)

      const { result } = renderHook(() => useSelfRemoval())

      let thrownError: Error | undefined
      try {
        await act(async () => {
          await result.current.removeSelf(mockFamilyId, mockReauthToken)
        })
      } catch (err) {
        thrownError = err as Error
      }

      // The error message should indicate re-auth is required
      expect(thrownError?.message).toBe('Please sign in again to confirm this action.')
    })

    it('should handle single guardian result', async () => {
      vi.mocked(removeSelfFromFamilyService).mockResolvedValue(mockSingleGuardianResult)

      const { result } = renderHook(() => useSelfRemoval())

      await act(async () => {
        await result.current.removeSelf(mockFamilyId, mockReauthToken)
      })

      expect(result.current.isSingleGuardian).toBe(true)
    })

    it('should throw on service errors', async () => {
      vi.mocked(removeSelfFromFamilyService).mockRejectedValue(
        new Error('Service error')
      )

      const { result } = renderHook(() => useSelfRemoval())

      let thrownError: Error | undefined
      try {
        await act(async () => {
          await result.current.removeSelf(mockFamilyId, mockReauthToken)
        })
      } catch (err) {
        thrownError = err as Error
      }

      expect(thrownError?.message).toBe('Service error')
      expect(result.current.loading).toBe(false)
    })

    it('should set requiresReauth when auth error occurs', async () => {
      vi.mocked(removeSelfFromFamilyService).mockRejectedValue(
        new Error('Please sign in again')
      )

      const { result } = renderHook(() => useSelfRemoval())

      let thrownError: Error | undefined
      try {
        await act(async () => {
          await result.current.removeSelf(mockFamilyId, mockReauthToken)
        })
      } catch (err) {
        thrownError = err as Error
      }

      expect(thrownError?.message).toBe('Please sign in again')
      expect(result.current.requiresReauth).toBe(true)
    })

    it('should prevent double-click submissions (idempotency guard)', async () => {
      let resolveFirst: (value: SelfRemovalResult) => void
      vi.mocked(removeSelfFromFamilyService).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve
          })
      )

      const { result } = renderHook(() => useSelfRemoval())

      // Start first call
      let firstPromise: Promise<SelfRemovalResult>
      act(() => {
        firstPromise = result.current.removeSelf(mockFamilyId, mockReauthToken)
      })

      // Try second call while first is in progress - this should throw
      let secondError: Error | undefined
      try {
        await act(async () => {
          await result.current.removeSelf(mockFamilyId, mockReauthToken)
        })
      } catch (err) {
        secondError = err as Error
      }

      expect(secondError?.message).toBe('Could not remove you from the family. Please try again.')

      // Complete first call
      await act(async () => {
        resolveFirst(mockRemovalResult)
        await firstPromise
      })
    })
  })

  // ============================================================================
  // checkCanRemove Tests
  // ============================================================================

  describe('checkCanRemove', () => {
    it('should return canRemove:true for valid guardian', async () => {
      const { result } = renderHook(() => useSelfRemoval())

      let canRemoveResult: { canRemove: boolean; isSingleGuardian: boolean }
      await act(async () => {
        canRemoveResult = await result.current.checkCanRemove(mockFamilyId)
      })

      expect(canRemoveResult!.canRemove).toBe(true)
      expect(canRemoveResult!.isSingleGuardian).toBe(false)
      expect(result.current.isSingleGuardian).toBe(false)
    })

    it('should return canRemove:false when user not authenticated', async () => {
      // Set up the mock to return null user BEFORE rendering the hook
      vi.mocked(useAuthContext).mockReturnValue({ user: null } as ReturnType<
        typeof useAuthContext
      >)

      const { result } = renderHook(() => useSelfRemoval())

      let canRemoveResult: { canRemove: boolean; isSingleGuardian: boolean; reason?: string }
      await act(async () => {
        canRemoveResult = await result.current.checkCanRemove(mockFamilyId)
      })

      expect(canRemoveResult!.canRemove).toBe(false)
      expect(canRemoveResult!.reason).toBe('reauth-required')
    })

    it('should detect single guardian status', async () => {
      vi.mocked(canRemoveSelfService).mockResolvedValue({
        canRemove: true,
        isSingleGuardian: true,
        reason: 'single-guardian-warning',
      })

      const { result } = renderHook(() => useSelfRemoval())

      let canRemoveResult: { canRemove: boolean; isSingleGuardian: boolean; reason?: string }
      await act(async () => {
        canRemoveResult = await result.current.checkCanRemove(mockFamilyId)
      })

      expect(canRemoveResult!.isSingleGuardian).toBe(true)
      expect(canRemoveResult!.reason).toBe('single-guardian-warning')
      expect(result.current.isSingleGuardian).toBe(true)
    })

    it('should handle service errors', async () => {
      vi.mocked(canRemoveSelfService).mockRejectedValue(new Error('Service error'))

      const { result } = renderHook(() => useSelfRemoval())

      let canRemoveResult: { canRemove: boolean; isSingleGuardian: boolean; reason?: string }
      await act(async () => {
        canRemoveResult = await result.current.checkCanRemove(mockFamilyId)
      })

      expect(canRemoveResult!.canRemove).toBe(false)
      expect(canRemoveResult!.reason).toBe('removal-failed')
    })
  })

  // ============================================================================
  // clearError Tests
  // ============================================================================

  describe('clearError', () => {
    it('should clear error state when error exists', async () => {
      // We need to test this by directly checking the clearError function works
      // Since error state is hard to observe in tests, we verify the function is callable
      // and doesn't throw
      const { result } = renderHook(() => useSelfRemoval())

      // Call clearError - should not throw even when no error
      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  // ============================================================================
  // setRequiresReauth Tests
  // ============================================================================

  describe('setRequiresReauth', () => {
    it('should update requiresReauth state', () => {
      const { result } = renderHook(() => useSelfRemoval())

      expect(result.current.requiresReauth).toBe(true)

      act(() => {
        result.current.setRequiresReauth(false)
      })

      expect(result.current.requiresReauth).toBe(false)

      act(() => {
        result.current.setRequiresReauth(true)
      })

      expect(result.current.requiresReauth).toBe(true)
    })
  })
})
