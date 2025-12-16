import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDissolution } from './useDissolution'

// Mock dissolution service
vi.mock('@/services/dissolutionService', () => ({
  initiateDissolution: vi.fn(),
  acknowledgeDissolution: vi.fn(),
  cancelDissolution: vi.fn(),
  getDissolutionStatus: vi.fn(),
}))

// Mock auth context
const mockUser = { uid: 'test-user-123', email: 'test@example.com' }
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuthContext: vi.fn(() => ({ user: mockUser })),
}))

// Import mocked functions
import {
  initiateDissolution as initiateDissolutionService,
  acknowledgeDissolution as acknowledgeDissolutionService,
  cancelDissolution as cancelDissolutionService,
  getDissolutionStatus as getDissolutionStatusService,
} from '@/services/dissolutionService'
import { useAuthContext } from '@/components/providers/AuthProvider'
import type { FamilyDissolution } from '@fledgely/contracts'

describe('useDissolution', () => {
  const mockFamilyId = 'test-family-456'
  const mockReauthToken = 'mock-reauth-token-12345'

  const now = new Date()
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const mockDissolutionResult: FamilyDissolution = {
    status: 'cooling_period',
    initiatedBy: mockUser.uid,
    initiatedAt: now,
    dataHandlingOption: 'delete_all',
    acknowledgments: [],
    allAcknowledgedAt: now,
    scheduledDeletionAt: thirtyDaysLater,
    cancelledBy: null,
    cancelledAt: null,
  }

  const mockPendingDissolution: FamilyDissolution = {
    status: 'pending_acknowledgment',
    initiatedBy: 'initiator-user',
    initiatedAt: now,
    dataHandlingOption: 'delete_all',
    acknowledgments: [],
    allAcknowledgedAt: null,
    scheduledDeletionAt: null,
    cancelledBy: null,
    cancelledAt: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mocks to success state
    vi.mocked(initiateDissolutionService).mockResolvedValue(mockDissolutionResult)
    vi.mocked(acknowledgeDissolutionService).mockResolvedValue(mockDissolutionResult)
    vi.mocked(cancelDissolutionService).mockResolvedValue({
      ...mockDissolutionResult,
      status: 'cancelled',
      cancelledBy: mockUser.uid,
      cancelledAt: now,
    })
    vi.mocked(getDissolutionStatusService).mockResolvedValue(mockDissolutionResult)
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
    it('returns initial state correctly', () => {
      const { result } = renderHook(() => useDissolution())

      expect(result.current.dissolution).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.requiresReauth).toBe(true)
      expect(typeof result.current.initiateDissolution).toBe('function')
      expect(typeof result.current.acknowledgeDissolution).toBe('function')
      expect(typeof result.current.cancelDissolution).toBe('function')
      expect(typeof result.current.getDissolutionStatus).toBe('function')
      expect(typeof result.current.clearError).toBe('function')
      expect(typeof result.current.getDaysRemaining).toBe('function')
      expect(typeof result.current.userNeedsToAcknowledge).toBe('function')
      expect(typeof result.current.canCancel).toBe('function')
    })
  })

  // ============================================================================
  // initiateDissolution Tests
  // ============================================================================

  describe('initiateDissolution', () => {
    it('initiates dissolution successfully', async () => {
      const { result } = renderHook(() => useDissolution())

      let initiateResult: FamilyDissolution | undefined

      await act(async () => {
        initiateResult = await result.current.initiateDissolution(
          mockFamilyId,
          'delete_all',
          mockReauthToken
        )
      })

      expect(initiateResult?.status).toBe('cooling_period')
      expect(initiateResult?.initiatedBy).toBe(mockUser.uid)
      expect(result.current.dissolution).toEqual(mockDissolutionResult)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.requiresReauth).toBe(false) // Reset after success
    })

    it('calls service with correct parameters', async () => {
      const { result } = renderHook(() => useDissolution())

      await act(async () => {
        await result.current.initiateDissolution(mockFamilyId, 'export_first', mockReauthToken)
      })

      expect(initiateDissolutionService).toHaveBeenCalledWith(
        mockFamilyId,
        mockUser.uid,
        'export_first',
        mockReauthToken
      )
    })

    it('sets loading state during initiation', async () => {
      vi.mocked(initiateDissolutionService).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockDissolutionResult), 100)
          })
      )

      const { result } = renderHook(() => useDissolution())

      let initiatePromise: Promise<unknown>
      act(() => {
        initiatePromise = result.current.initiateDissolution(
          mockFamilyId,
          'delete_all',
          mockReauthToken
        )
      })

      expect(result.current.loading).toBe(true)

      await act(async () => {
        await initiatePromise
      })

      expect(result.current.loading).toBe(false)
    })

    it('handles error during initiation', async () => {
      vi.mocked(initiateDissolutionService).mockRejectedValue(
        new Error('This family is already being dissolved.')
      )

      const { result } = renderHook(() => useDissolution())

      await act(async () => {
        try {
          await result.current.initiateDissolution(mockFamilyId, 'delete_all', mockReauthToken)
        } catch {
          // Expected to throw
        }
      })

      expect(result.current.error).toBeDefined()
      expect(result.current.error?.message).toBe('This family is already being dissolved.')
      expect(result.current.loading).toBe(false)
    })

    it('throws error when user is not authenticated', async () => {
      vi.mocked(useAuthContext).mockReturnValue({ user: null } as ReturnType<
        typeof useAuthContext
      >)

      const { result } = renderHook(() => useDissolution())

      await act(async () => {
        try {
          await result.current.initiateDissolution(mockFamilyId, 'delete_all', mockReauthToken)
        } catch (err) {
          expect((err as Error).message).toContain('sign in again')
        }
      })

      expect(result.current.error).toBeDefined()
    })

    it('prevents duplicate submissions with idempotency guard', async () => {
      vi.mocked(initiateDissolutionService).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockDissolutionResult), 200)
          })
      )

      const { result } = renderHook(() => useDissolution())

      let firstCall: Promise<unknown>
      let secondCallError: Error | undefined

      act(() => {
        firstCall = result.current.initiateDissolution(mockFamilyId, 'delete_all', mockReauthToken)
      })

      // Try to call again while first is in progress
      await act(async () => {
        try {
          await result.current.initiateDissolution(mockFamilyId, 'delete_all', mockReauthToken)
        } catch (err) {
          secondCallError = err as Error
        }
      })

      expect(secondCallError?.message).toContain('already being dissolved')

      // Wait for first call to complete
      await act(async () => {
        await firstCall
      })
    })

    it('sets requiresReauth when reauth error occurs', async () => {
      vi.mocked(initiateDissolutionService).mockRejectedValue(
        new Error('Please sign in again to confirm this action')
      )

      const { result } = renderHook(() => useDissolution())

      // First set to false
      act(() => {
        result.current.setRequiresReauth(false)
      })

      expect(result.current.requiresReauth).toBe(false)

      await act(async () => {
        try {
          await result.current.initiateDissolution(mockFamilyId, 'delete_all', mockReauthToken)
        } catch {
          // Expected
        }
      })

      expect(result.current.requiresReauth).toBe(true)
    })
  })

  // ============================================================================
  // acknowledgeDissolution Tests
  // ============================================================================

  describe('acknowledgeDissolution', () => {
    it('acknowledges dissolution successfully', async () => {
      const { result } = renderHook(() => useDissolution())

      let ackResult: FamilyDissolution | undefined

      await act(async () => {
        ackResult = await result.current.acknowledgeDissolution(mockFamilyId)
      })

      expect(ackResult?.status).toBe('cooling_period')
      expect(result.current.dissolution).toEqual(mockDissolutionResult)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('calls service with correct parameters', async () => {
      const { result } = renderHook(() => useDissolution())

      await act(async () => {
        await result.current.acknowledgeDissolution(mockFamilyId)
      })

      expect(acknowledgeDissolutionService).toHaveBeenCalledWith(mockFamilyId, mockUser.uid)
    })

    it('handles error during acknowledgment', async () => {
      vi.mocked(acknowledgeDissolutionService).mockRejectedValue(
        new Error('You started this dissolution. You do not need to acknowledge.')
      )

      const { result } = renderHook(() => useDissolution())

      await act(async () => {
        try {
          await result.current.acknowledgeDissolution(mockFamilyId)
        } catch {
          // Expected
        }
      })

      expect(result.current.error?.message).toBe(
        'You started this dissolution. You do not need to acknowledge.'
      )
    })

    it('throws error when user is not authenticated', async () => {
      vi.mocked(useAuthContext).mockReturnValue({ user: null } as ReturnType<
        typeof useAuthContext
      >)

      const { result } = renderHook(() => useDissolution())

      await act(async () => {
        try {
          await result.current.acknowledgeDissolution(mockFamilyId)
        } catch (err) {
          expect((err as Error).message).toContain('sign in again')
        }
      })
    })
  })

  // ============================================================================
  // cancelDissolution Tests
  // ============================================================================

  describe('cancelDissolution', () => {
    it('cancels dissolution successfully', async () => {
      const { result } = renderHook(() => useDissolution())

      let cancelResult: FamilyDissolution | undefined

      await act(async () => {
        cancelResult = await result.current.cancelDissolution(mockFamilyId)
      })

      expect(cancelResult?.status).toBe('cancelled')
      expect(cancelResult?.cancelledBy).toBe(mockUser.uid)
      expect(result.current.dissolution?.status).toBe('cancelled')
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('calls service with correct parameters', async () => {
      const { result } = renderHook(() => useDissolution())

      await act(async () => {
        await result.current.cancelDissolution(mockFamilyId)
      })

      expect(cancelDissolutionService).toHaveBeenCalledWith(mockFamilyId, mockUser.uid)
    })

    it('handles error during cancellation', async () => {
      vi.mocked(cancelDissolutionService).mockRejectedValue(
        new Error('This dissolution cannot be cancelled right now.')
      )

      const { result } = renderHook(() => useDissolution())

      await act(async () => {
        try {
          await result.current.cancelDissolution(mockFamilyId)
        } catch {
          // Expected
        }
      })

      expect(result.current.error?.message).toBe('This dissolution cannot be cancelled right now.')
    })
  })

  // ============================================================================
  // getDissolutionStatus Tests
  // ============================================================================

  describe('getDissolutionStatus', () => {
    it('gets dissolution status successfully', async () => {
      const { result } = renderHook(() => useDissolution())

      let statusResult: FamilyDissolution | null | undefined

      await act(async () => {
        statusResult = await result.current.getDissolutionStatus(mockFamilyId)
      })

      expect(statusResult?.status).toBe('cooling_period')
      expect(result.current.dissolution).toEqual(mockDissolutionResult)
    })

    it('returns null when no dissolution exists', async () => {
      vi.mocked(getDissolutionStatusService).mockResolvedValue(null)

      const { result } = renderHook(() => useDissolution())

      let statusResult: FamilyDissolution | null | undefined

      await act(async () => {
        statusResult = await result.current.getDissolutionStatus(mockFamilyId)
      })

      expect(statusResult).toBeNull()
      expect(result.current.dissolution).toBeNull()
    })
  })

  // ============================================================================
  // Helper Function Tests
  // ============================================================================

  describe('clearError', () => {
    it('clears error when called', async () => {
      vi.mocked(initiateDissolutionService).mockRejectedValue(new Error('Test error'))

      const { result } = renderHook(() => useDissolution())

      await act(async () => {
        try {
          await result.current.initiateDissolution(mockFamilyId, 'delete_all', mockReauthToken)
        } catch {
          // Expected
        }
      })

      expect(result.current.error).toBeDefined()

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('getDaysRemaining', () => {
    it('returns null when no dissolution', () => {
      const { result } = renderHook(() => useDissolution())

      expect(result.current.getDaysRemaining()).toBeNull()
    })

    it('returns days remaining when dissolution has scheduled deletion', async () => {
      const { result } = renderHook(() => useDissolution())

      await act(async () => {
        await result.current.getDissolutionStatus(mockFamilyId)
      })

      const daysRemaining = result.current.getDaysRemaining()
      expect(daysRemaining).toBeGreaterThanOrEqual(29)
      expect(daysRemaining).toBeLessThanOrEqual(30)
    })
  })

  describe('userNeedsToAcknowledge', () => {
    it('returns false when no dissolution', () => {
      const { result } = renderHook(() => useDissolution())

      expect(result.current.userNeedsToAcknowledge(['user-1', 'user-2'])).toBe(false)
    })

    it('returns true when user needs to acknowledge', async () => {
      vi.mocked(getDissolutionStatusService).mockResolvedValue(mockPendingDissolution)

      const { result } = renderHook(() => useDissolution())

      await act(async () => {
        await result.current.getDissolutionStatus(mockFamilyId)
      })

      // Current user (mockUser.uid) is not the initiator and has not acknowledged
      const needsAck = result.current.userNeedsToAcknowledge([
        'initiator-user',
        mockUser.uid,
      ])
      expect(needsAck).toBe(true)
    })

    it('returns false when user is initiator', async () => {
      vi.mocked(getDissolutionStatusService).mockResolvedValue({
        ...mockPendingDissolution,
        initiatedBy: mockUser.uid,
      })

      const { result } = renderHook(() => useDissolution())

      await act(async () => {
        await result.current.getDissolutionStatus(mockFamilyId)
      })

      const needsAck = result.current.userNeedsToAcknowledge([mockUser.uid, 'other-user'])
      expect(needsAck).toBe(false)
    })
  })

  describe('canCancel', () => {
    it('returns false when no dissolution', () => {
      const { result } = renderHook(() => useDissolution())

      expect(result.current.canCancel()).toBe(false)
    })

    it('returns true for pending_acknowledgment status', async () => {
      vi.mocked(getDissolutionStatusService).mockResolvedValue(mockPendingDissolution)

      const { result } = renderHook(() => useDissolution())

      await act(async () => {
        await result.current.getDissolutionStatus(mockFamilyId)
      })

      expect(result.current.canCancel()).toBe(true)
    })

    it('returns true for cooling_period status', async () => {
      const { result } = renderHook(() => useDissolution())

      await act(async () => {
        await result.current.getDissolutionStatus(mockFamilyId)
      })

      expect(result.current.canCancel()).toBe(true)
    })

    it('returns false for cancelled status', async () => {
      vi.mocked(getDissolutionStatusService).mockResolvedValue({
        ...mockDissolutionResult,
        status: 'cancelled',
        cancelledBy: mockUser.uid,
        cancelledAt: now,
      })

      const { result } = renderHook(() => useDissolution())

      await act(async () => {
        await result.current.getDissolutionStatus(mockFamilyId)
      })

      expect(result.current.canCancel()).toBe(false)
    })
  })

  describe('setRequiresReauth', () => {
    it('allows direct manipulation of requiresReauth state', () => {
      const { result } = renderHook(() => useDissolution())

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
