/**
 * useCaregiverRevocation Hook Tests - Story 19D.5, extended by Story 39.7
 *
 * Tests for the caregiver revocation hook.
 *
 * Story 19D.5 Acceptance Criteria:
 * - AC1: Revoke access within 5 minutes (NFR62)
 * - AC5: Revocation logged in audit trail (via cloud function)
 * - AC6: Parent can re-invite same caregiver later
 *
 * Story 39.7 Acceptance Criteria:
 * - AC3: Child notification when caregiver removed (via cloud function)
 * - AC6: Optional removal reason stored in audit log
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCaregiverRevocation } from './useCaregiverRevocation'

// Mock Firebase Functions
const mockHttpsCallable = vi.fn()

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: (...args: unknown[]) => mockHttpsCallable(...args),
}))

describe('useCaregiverRevocation', () => {
  const mockFamilyId = 'family-123'
  const mockParentUid = 'parent-456'
  const mockCaregiverId = 'caregiver-789'
  const mockCaregiverEmail = 'grandpa@example.com'

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock for successful cloud function call
    mockHttpsCallable.mockReturnValue(
      vi.fn().mockResolvedValue({
        data: {
          success: true,
          notificationId: 'notification-123',
          message: 'Grandpa Joe has been removed and children notified',
        },
      })
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial state', () => {
    it('returns loading as false initially', () => {
      const { result } = renderHook(() => useCaregiverRevocation(mockFamilyId, mockParentUid))

      expect(result.current.loading).toBe(false)
    })

    it('returns error as null initially', () => {
      const { result } = renderHook(() => useCaregiverRevocation(mockFamilyId, mockParentUid))

      expect(result.current.error).toBeNull()
    })

    it('provides revokeCaregiver function', () => {
      const { result } = renderHook(() => useCaregiverRevocation(mockFamilyId, mockParentUid))

      expect(typeof result.current.revokeCaregiver).toBe('function')
    })
  })

  describe('Revocation (AC1)', () => {
    it('successfully revokes caregiver access', async () => {
      const { result } = renderHook(() => useCaregiverRevocation(mockFamilyId, mockParentUid))

      let revocationResult: { success: boolean; error?: string }
      await act(async () => {
        revocationResult = await result.current.revokeCaregiver(mockCaregiverId, mockCaregiverEmail)
      })

      expect(revocationResult!.success).toBe(true)
      expect(result.current.error).toBeNull()
    })

    it('calls cloud function with correct parameters', async () => {
      const mockCallableFn = vi.fn().mockResolvedValue({
        data: { success: true, notificationId: 'notif-1', message: 'Removed' },
      })
      mockHttpsCallable.mockReturnValue(mockCallableFn)

      const { result } = renderHook(() => useCaregiverRevocation(mockFamilyId, mockParentUid))

      await act(async () => {
        await result.current.revokeCaregiver(mockCaregiverId, mockCaregiverEmail)
      })

      expect(mockHttpsCallable).toHaveBeenCalledWith(
        expect.anything(),
        'removeCaregiverWithNotification'
      )
      expect(mockCallableFn).toHaveBeenCalledWith({
        familyId: mockFamilyId,
        caregiverUid: mockCaregiverId,
        caregiverEmail: mockCaregiverEmail,
        reason: undefined,
      })
    })

    it('sets loading to true during revocation', async () => {
      // Create a controllable promise
      let resolvePromise: ((value: unknown) => void) | undefined
      const callablePromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      const mockCallableFn = vi.fn().mockReturnValue(callablePromise)
      mockHttpsCallable.mockReturnValue(mockCallableFn)

      const { result } = renderHook(() => useCaregiverRevocation(mockFamilyId, mockParentUid))

      // Start revocation (don't await)
      let revokePromise: Promise<unknown>
      act(() => {
        revokePromise = result.current.revokeCaregiver(mockCaregiverId, mockCaregiverEmail)
      })

      // Wait for next tick to allow state to update
      await act(async () => {
        await Promise.resolve()
      })

      // Check loading is true during operation
      expect(result.current.loading).toBe(true)

      // Resolve and wait for completion
      await act(async () => {
        resolvePromise?.({ data: { success: true, notificationId: 'n', message: 'm' } })
        await revokePromise
      })

      expect(result.current.loading).toBe(false)
    })
  })

  describe('Cloud function integration (AC5, Story 39.7 AC3)', () => {
    it('calls removeCaregiverWithNotification cloud function', async () => {
      const { result } = renderHook(() => useCaregiverRevocation(mockFamilyId, mockParentUid))

      await act(async () => {
        await result.current.revokeCaregiver(mockCaregiverId, mockCaregiverEmail)
      })

      expect(mockHttpsCallable).toHaveBeenCalledWith(
        expect.anything(),
        'removeCaregiverWithNotification'
      )
    })
  })

  describe('Error handling', () => {
    it('returns error when family not found', async () => {
      const mockCallableFn = vi.fn().mockRejectedValue(new Error('Family not found'))
      mockHttpsCallable.mockReturnValue(mockCallableFn)

      const { result } = renderHook(() => useCaregiverRevocation(mockFamilyId, mockParentUid))

      let revocationResult: { success: boolean; error?: string }
      await act(async () => {
        revocationResult = await result.current.revokeCaregiver(mockCaregiverId, mockCaregiverEmail)
      })

      expect(revocationResult!.success).toBe(false)
      expect(revocationResult!.error).toBe('Family not found')
      expect(result.current.error).toBe('Family not found')
    })

    it('returns error when caregiver not in family', async () => {
      const mockCallableFn = vi.fn().mockRejectedValue(new Error('Caregiver not found in family'))
      mockHttpsCallable.mockReturnValue(mockCallableFn)

      const { result } = renderHook(() => useCaregiverRevocation(mockFamilyId, mockParentUid))

      let revocationResult: { success: boolean; error?: string }
      await act(async () => {
        revocationResult = await result.current.revokeCaregiver(mockCaregiverId, mockCaregiverEmail)
      })

      expect(revocationResult!.success).toBe(false)
      expect(revocationResult!.error).toBe('Caregiver not found in family')
    })

    it('returns error when caller is not a guardian', async () => {
      const mockCallableFn = vi
        .fn()
        .mockRejectedValue(new Error('Only family guardians can remove caregivers'))
      mockHttpsCallable.mockReturnValue(mockCallableFn)

      const { result } = renderHook(() => useCaregiverRevocation(mockFamilyId, mockParentUid))

      let revocationResult: { success: boolean; error?: string }
      await act(async () => {
        revocationResult = await result.current.revokeCaregiver(mockCaregiverId, mockCaregiverEmail)
      })

      expect(revocationResult!.success).toBe(false)
      expect(revocationResult!.error).toBe('Only family guardians can remove caregivers')
    })

    it('returns error when no family ID', async () => {
      const { result } = renderHook(() => useCaregiverRevocation(null, mockParentUid))

      let revocationResult: { success: boolean; error?: string }
      await act(async () => {
        revocationResult = await result.current.revokeCaregiver(mockCaregiverId, mockCaregiverEmail)
      })

      expect(revocationResult!.success).toBe(false)
      expect(revocationResult!.error).toBe('No family ID provided')
    })

    it('handles cloud function errors gracefully', async () => {
      const mockCallableFn = vi.fn().mockRejectedValue(new Error('Network error'))
      mockHttpsCallable.mockReturnValue(mockCallableFn)

      const { result } = renderHook(() => useCaregiverRevocation(mockFamilyId, mockParentUid))

      let revocationResult: { success: boolean; error?: string }
      await act(async () => {
        revocationResult = await result.current.revokeCaregiver(mockCaregiverId, mockCaregiverEmail)
      })

      expect(revocationResult!.success).toBe(false)
      expect(revocationResult!.error).toBe('Network error')
      expect(result.current.loading).toBe(false)
    })

    it('extracts clean error message from Firebase error format', async () => {
      // Firebase HttpsError format with colon separator
      const mockCallableFn = vi
        .fn()
        .mockRejectedValue(
          new Error('permission-denied: Only family guardians can remove caregivers')
        )
      mockHttpsCallable.mockReturnValue(mockCallableFn)

      const { result } = renderHook(() => useCaregiverRevocation(mockFamilyId, mockParentUid))

      let revocationResult: { success: boolean; error?: string }
      await act(async () => {
        revocationResult = await result.current.revokeCaregiver(mockCaregiverId, mockCaregiverEmail)
      })

      expect(revocationResult!.success).toBe(false)
      expect(revocationResult!.error).toBe('Only family guardians can remove caregivers')
    })
  })

  describe('clearError', () => {
    it('clears error state', async () => {
      const mockCallableFn = vi.fn().mockRejectedValue(new Error('Family not found'))
      mockHttpsCallable.mockReturnValue(mockCallableFn)

      const { result } = renderHook(() => useCaregiverRevocation(mockFamilyId, mockParentUid))

      // Trigger an error
      await act(async () => {
        await result.current.revokeCaregiver(mockCaregiverId, mockCaregiverEmail)
      })

      expect(result.current.error).toBe('Family not found')

      // Clear error
      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('Removal reason (Story 39.7 AC6)', () => {
    it('passes reason to cloud function when provided', async () => {
      const mockCallableFn = vi.fn().mockResolvedValue({
        data: { success: true, notificationId: 'notif-1', message: 'Removed' },
      })
      mockHttpsCallable.mockReturnValue(mockCallableFn)

      const { result } = renderHook(() => useCaregiverRevocation(mockFamilyId, mockParentUid))

      await act(async () => {
        await result.current.revokeCaregiver(mockCaregiverId, mockCaregiverEmail, {
          reason: 'Moving out of state',
        })
      })

      expect(mockCallableFn).toHaveBeenCalledWith({
        familyId: mockFamilyId,
        caregiverUid: mockCaregiverId,
        caregiverEmail: mockCaregiverEmail,
        reason: 'Moving out of state',
      })
    })

    it('passes undefined reason when not provided', async () => {
      const mockCallableFn = vi.fn().mockResolvedValue({
        data: { success: true, notificationId: 'notif-1', message: 'Removed' },
      })
      mockHttpsCallable.mockReturnValue(mockCallableFn)

      const { result } = renderHook(() => useCaregiverRevocation(mockFamilyId, mockParentUid))

      await act(async () => {
        await result.current.revokeCaregiver(mockCaregiverId, mockCaregiverEmail)
      })

      expect(mockCallableFn).toHaveBeenCalledWith({
        familyId: mockFamilyId,
        caregiverUid: mockCaregiverId,
        caregiverEmail: mockCaregiverEmail,
        reason: undefined,
      })
    })

    it('passes empty string reason when provided as empty', async () => {
      const mockCallableFn = vi.fn().mockResolvedValue({
        data: { success: true, notificationId: 'notif-1', message: 'Removed' },
      })
      mockHttpsCallable.mockReturnValue(mockCallableFn)

      const { result } = renderHook(() => useCaregiverRevocation(mockFamilyId, mockParentUid))

      await act(async () => {
        await result.current.revokeCaregiver(mockCaregiverId, mockCaregiverEmail, {
          reason: '',
        })
      })

      expect(mockCallableFn).toHaveBeenCalledWith({
        familyId: mockFamilyId,
        caregiverUid: mockCaregiverId,
        caregiverEmail: mockCaregiverEmail,
        reason: '',
      })
    })

    it('revocation succeeds with reason provided', async () => {
      const { result } = renderHook(() => useCaregiverRevocation(mockFamilyId, mockParentUid))

      let revocationResult: { success: boolean; error?: string }
      await act(async () => {
        revocationResult = await result.current.revokeCaregiver(
          mockCaregiverId,
          mockCaregiverEmail,
          {
            reason: 'No longer needed',
          }
        )
      })

      expect(revocationResult!.success).toBe(true)
    })

    it('maintains backward compatibility without options', async () => {
      const { result } = renderHook(() => useCaregiverRevocation(mockFamilyId, mockParentUid))

      let revocationResult: { success: boolean; error?: string }
      await act(async () => {
        revocationResult = await result.current.revokeCaregiver(mockCaregiverId, mockCaregiverEmail)
      })

      expect(revocationResult!.success).toBe(true)
    })
  })

  describe('Response handling', () => {
    it('handles cloud function returning success: false', async () => {
      const mockCallableFn = vi.fn().mockResolvedValue({
        data: { success: false, notificationId: '', message: '' },
      })
      mockHttpsCallable.mockReturnValue(mockCallableFn)

      const { result } = renderHook(() => useCaregiverRevocation(mockFamilyId, mockParentUid))

      let revocationResult: { success: boolean; error?: string }
      await act(async () => {
        revocationResult = await result.current.revokeCaregiver(mockCaregiverId, mockCaregiverEmail)
      })

      expect(revocationResult!.success).toBe(false)
      expect(revocationResult!.error).toBe('Failed to remove caregiver')
    })
  })
})
