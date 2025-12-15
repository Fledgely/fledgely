import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useEditChild } from './useEditChild'
import type { ChildProfile } from '@fledgely/contracts'

// Mock dependencies
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuthContext: vi.fn(),
}))

vi.mock('@/services/childService', () => ({
  updateChild: vi.fn(),
}))

// Import mocked functions after mocking
import { useAuthContext } from '@/components/providers/AuthProvider'
import { updateChild as updateChildService } from '@/services/childService'

const mockUseAuthContext = vi.mocked(useAuthContext)
const mockUpdateChildService = vi.mocked(updateChildService)

describe('useEditChild', () => {
  const mockAuthUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
  }

  const mockChild: ChildProfile = {
    id: 'test-child-456',
    familyId: 'test-family-789',
    firstName: 'Emma',
    lastName: 'Smith',
    nickname: null,
    birthdate: new Date('2015-06-15'),
    photoUrl: null,
    guardians: [
      {
        uid: 'test-user-123',
        permissions: 'full',
        grantedAt: new Date(),
      },
    ],
    createdAt: new Date(),
    createdBy: 'test-user-123',
    updatedAt: null,
    updatedBy: null,
    custodyDeclaration: null,
    custodyHistory: [],
    requiresSharedCustodySafeguards: false,
  }

  const mockUpdatedChild: ChildProfile = {
    ...mockChild,
    firstName: 'Emily',
    updatedAt: new Date(),
    updatedBy: 'test-user-123',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuthContext.mockReturnValue({
      user: mockAuthUser as ReturnType<typeof useAuthContext>['user'],
      loading: false,
      error: null,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // ============================================
  // INITIAL STATE TESTS
  // ============================================
  describe('initial state', () => {
    it('returns initial state correctly', () => {
      const { result } = renderHook(() => useEditChild())

      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(typeof result.current.updateChild).toBe('function')
      expect(typeof result.current.clearError).toBe('function')
    })
  })

  // ============================================
  // UPDATE CHILD TESTS
  // ============================================
  describe('updateChild', () => {
    it('updates child successfully', async () => {
      mockUpdateChildService.mockResolvedValue(mockUpdatedChild)

      const { result } = renderHook(() => useEditChild())

      await act(async () => {
        const updated = await result.current.updateChild('test-child-456', {
          firstName: 'Emily',
        })
        expect(updated).toEqual(mockUpdatedChild)
      })

      expect(result.current.error).toBeNull()
      expect(mockUpdateChildService).toHaveBeenCalledWith(
        'test-child-456',
        { firstName: 'Emily' },
        'test-user-123'
      )
    })

    it('sets loading state during update', async () => {
      let resolvePromise: (value: ChildProfile) => void
      mockUpdateChildService.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve
          })
      )

      const { result } = renderHook(() => useEditChild())

      // Start update
      let updatePromise: Promise<ChildProfile>
      act(() => {
        updatePromise = result.current.updateChild('test-child-456', {
          firstName: 'Emily',
        })
      })

      // Should be loading
      expect(result.current.loading).toBe(true)

      // Resolve the promise
      await act(async () => {
        resolvePromise!(mockUpdatedChild)
        await updatePromise
      })

      // Should no longer be loading
      expect(result.current.loading).toBe(false)
    })

    it('sets error state on update failure', async () => {
      const mockError = new Error('Failed to update child')
      mockUpdateChildService.mockRejectedValue(mockError)

      const { result } = renderHook(() => useEditChild())

      await act(async () => {
        try {
          await result.current.updateChild('test-child-456', {
            firstName: 'Emily',
          })
        } catch {
          // Expected
        }
      })

      expect(result.current.error).toBeDefined()
      expect(result.current.error?.message).toBe('Failed to update child')
    })

    it('throws error when user not authenticated', async () => {
      mockUseAuthContext.mockReturnValue({
        user: null,
        loading: false,
        error: null,
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      })

      const { result } = renderHook(() => useEditChild())

      await act(async () => {
        try {
          await result.current.updateChild('test-child-456', {
            firstName: 'Emily',
          })
        } catch {
          // Expected error
        }
      })

      await waitFor(() => {
        expect(result.current.error?.message).toBe('You need to be signed in to edit a profile')
      })
    })

    it('handles multiple field updates', async () => {
      const multiFieldUpdate: ChildProfile = {
        ...mockChild,
        firstName: 'Emily',
        lastName: 'Johnson',
        nickname: 'Emmy',
        updatedAt: new Date(),
        updatedBy: 'test-user-123',
      }
      mockUpdateChildService.mockResolvedValue(multiFieldUpdate)

      const { result } = renderHook(() => useEditChild())

      await act(async () => {
        const updated = await result.current.updateChild('test-child-456', {
          firstName: 'Emily',
          lastName: 'Johnson',
          nickname: 'Emmy',
        })
        expect(updated.firstName).toBe('Emily')
        expect(updated.lastName).toBe('Johnson')
        expect(updated.nickname).toBe('Emmy')
      })
    })
  })

  // ============================================
  // CLEAR ERROR TESTS
  // ============================================
  describe('clearError', () => {
    it('clears error state', async () => {
      const mockError = new Error('Test error')
      mockUpdateChildService.mockRejectedValue(mockError)

      const { result } = renderHook(() => useEditChild())

      // Trigger an error
      await act(async () => {
        try {
          await result.current.updateChild('test-child-456', {
            firstName: 'Emily',
          })
        } catch {
          // Expected
        }
      })

      expect(result.current.error).toBeDefined()

      // Clear the error
      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  // ============================================
  // IDEMPOTENCY GUARD TESTS
  // ============================================
  describe('idempotency guard', () => {
    it('allows new update after previous completes', async () => {
      mockUpdateChildService
        .mockResolvedValueOnce(mockUpdatedChild)
        .mockResolvedValueOnce({ ...mockUpdatedChild, firstName: 'Emma' })

      const { result } = renderHook(() => useEditChild())

      // First update
      await act(async () => {
        await result.current.updateChild('test-child-456', {
          firstName: 'Emily',
        })
      })

      expect(mockUpdateChildService).toHaveBeenCalledTimes(1)

      // Second update should work after first completes
      await act(async () => {
        await result.current.updateChild('test-child-456', {
          firstName: 'Emma',
        })
      })

      expect(mockUpdateChildService).toHaveBeenCalledTimes(2)
    })

    it('resets loading state after error', async () => {
      mockUpdateChildService.mockRejectedValue(new Error('Test error'))

      const { result } = renderHook(() => useEditChild())

      await act(async () => {
        try {
          await result.current.updateChild('test-child-456', {
            firstName: 'Emily',
          })
        } catch {
          // Expected
        }
      })

      // Should not be loading after error
      expect(result.current.loading).toBe(false)
    })
  })

  // ============================================
  // ADVERSARIAL TESTS
  // ============================================
  describe('adversarial tests', () => {
    it('handles service returning non-Error rejection', async () => {
      mockUpdateChildService.mockRejectedValue('String error')

      const { result } = renderHook(() => useEditChild())

      await act(async () => {
        try {
          await result.current.updateChild('test-child-456', {
            firstName: 'Emily',
          })
        } catch {
          // Expected - error is thrown and caught
        }
      })

      // Hook should have set error state
      await waitFor(() => {
        expect(result.current.error).toBeDefined()
      })
      expect(result.current.error?.message).toBe('Could not update profile')
    })

    it('maintains state integrity after error', async () => {
      // First, do a successful update
      mockUpdateChildService.mockResolvedValueOnce(mockUpdatedChild)

      const { result } = renderHook(() => useEditChild())

      await act(async () => {
        await result.current.updateChild('test-child-456', {
          firstName: 'Emily',
        })
      })

      expect(result.current.error).toBeNull()

      // Now simulate an error on second update
      mockUpdateChildService.mockRejectedValueOnce(new Error('Update failed'))

      await act(async () => {
        try {
          await result.current.updateChild('test-child-456', {
            firstName: 'Test',
          })
        } catch {
          // Expected
        }
      })

      // Error should be set
      expect(result.current.error).toBeDefined()
      // Loading should be false
      expect(result.current.loading).toBe(false)
    })

    it('handles empty update input', async () => {
      mockUpdateChildService.mockResolvedValue(mockChild)

      const { result } = renderHook(() => useEditChild())

      await act(async () => {
        const updated = await result.current.updateChild('test-child-456', {})
        expect(updated).toEqual(mockChild)
      })
    })

    it('handles undefined user uid gracefully', async () => {
      mockUseAuthContext.mockReturnValue({
        user: { email: 'test@example.com' } as ReturnType<typeof useAuthContext>['user'],
        loading: false,
        error: null,
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      })

      const { result } = renderHook(() => useEditChild())

      await expect(
        act(async () => {
          await result.current.updateChild('test-child-456', {
            firstName: 'Emily',
          })
        })
      ).rejects.toThrow('You need to be signed in')
    })
  })
})
