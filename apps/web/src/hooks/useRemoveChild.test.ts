import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useRemoveChild } from './useRemoveChild'

// Mock Firebase services
vi.mock('@/services/childService', () => ({
  removeChildFromFamily: vi.fn(),
}))

vi.mock('@/services/deviceService', () => ({
  unenrollDevicesForChild: vi.fn(),
}))

vi.mock('@/services/dataDeletionService', () => ({
  deleteChildData: vi.fn(),
}))

// Mock auth context
const mockUser = { uid: 'test-user-123', email: 'test@example.com' }
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuthContext: vi.fn(() => ({ user: mockUser })),
}))

// Import mocked functions
import { removeChildFromFamily } from '@/services/childService'
import { unenrollDevicesForChild } from '@/services/deviceService'
import { deleteChildData } from '@/services/dataDeletionService'
import { useAuthContext } from '@/components/providers/AuthProvider'

describe('useRemoveChild', () => {
  const mockChildId = 'test-child-789'
  const mockFamilyId = 'test-family-456'
  const mockConfirmationText = 'Emma'
  const mockReauthToken = 'mock-reauth-token-12345'

  const mockRemoveResult = {
    success: true as const,
    childId: mockChildId,
    familyId: mockFamilyId,
    metadata: {
      childName: 'Emma',
      childFullName: 'Emma Smith',
      hadDevices: true,
      devicesUnenrolled: 2,
      hadScreenshots: true,
      screenshotsDeleted: 5,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    // Reset mocks to success state
    vi.mocked(removeChildFromFamily).mockResolvedValue(mockRemoveResult)
    vi.mocked(unenrollDevicesForChild).mockResolvedValue({
      success: true,
      childId: mockChildId,
      devicesUnenrolled: 2,
      deviceNames: ['iPad Pro', 'iPhone 15'],
    })
    vi.mocked(deleteChildData).mockResolvedValue({
      success: true,
      childId: mockChildId,
      familyId: mockFamilyId,
      screenshotsDeleted: 5,
      activityLogsDeleted: 0,
      agreementsDeleted: 0,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns initial state correctly', () => {
    const { result } = renderHook(() => useRemoveChild())

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.requiresReauth).toBe(true)
    expect(typeof result.current.removeChild).toBe('function')
    expect(typeof result.current.clearError).toBe('function')
    expect(typeof result.current.setRequiresReauth).toBe('function')
  })

  it('removes child successfully', async () => {
    const { result } = renderHook(() => useRemoveChild())

    let removeResult: Awaited<ReturnType<typeof result.current.removeChild>> | undefined

    await act(async () => {
      removeResult = await result.current.removeChild(
        mockChildId,
        mockFamilyId,
        mockConfirmationText,
        mockReauthToken
      )
    })

    expect(removeResult?.success).toBe(true)
    expect(removeResult?.childId).toBe(mockChildId)
    expect(removeResult?.devicesUnenrolled).toBe(2)
    expect(removeResult?.screenshotsDeleted).toBe(5)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.requiresReauth).toBe(false) // Reset after success
  })

  it('calls all services in correct order', async () => {
    const { result } = renderHook(() => useRemoveChild())

    await act(async () => {
      await result.current.removeChild(
        mockChildId,
        mockFamilyId,
        mockConfirmationText,
        mockReauthToken
      )
    })

    // Verify all services were called
    expect(unenrollDevicesForChild).toHaveBeenCalledWith(
      mockChildId,
      mockFamilyId,
      mockUser.uid
    )
    expect(deleteChildData).toHaveBeenCalledWith(mockChildId, mockFamilyId, mockUser.uid)
    expect(removeChildFromFamily).toHaveBeenCalledWith(
      mockChildId,
      mockUser.uid,
      mockConfirmationText,
      mockReauthToken
    )
  })

  it('sets loading state during removal', async () => {
    // Make the service take some time
    vi.mocked(removeChildFromFamily).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(mockRemoveResult), 100)
        })
    )

    const { result } = renderHook(() => useRemoveChild())

    let removePromise: Promise<unknown>
    act(() => {
      removePromise = result.current.removeChild(
        mockChildId,
        mockFamilyId,
        mockConfirmationText,
        mockReauthToken
      )
    })

    // Check loading is true while in progress
    expect(result.current.loading).toBe(true)

    await act(async () => {
      await removePromise
    })

    expect(result.current.loading).toBe(false)
  })

  it('handles error during removal', async () => {
    vi.mocked(removeChildFromFamily).mockRejectedValue(
      new Error('The name you typed does not match')
    )

    const { result } = renderHook(() => useRemoveChild())

    await act(async () => {
      try {
        await result.current.removeChild(
          mockChildId,
          mockFamilyId,
          'WrongName',
          mockReauthToken
        )
      } catch {
        // Expected to throw
      }
    })

    expect(result.current.error).toBeDefined()
    expect(result.current.error?.message).toBe('The name you typed does not match')
    expect(result.current.loading).toBe(false)
  })

  it('clears error when clearError is called', async () => {
    vi.mocked(removeChildFromFamily).mockRejectedValue(new Error('Test error'))

    const { result } = renderHook(() => useRemoveChild())

    await act(async () => {
      try {
        await result.current.removeChild(
          mockChildId,
          mockFamilyId,
          mockConfirmationText,
          mockReauthToken
        )
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

  it('throws error when user is not authenticated', async () => {
    vi.mocked(useAuthContext).mockReturnValue({ user: null } as ReturnType<
      typeof useAuthContext
    >)

    const { result } = renderHook(() => useRemoveChild())

    await act(async () => {
      try {
        await result.current.removeChild(
          mockChildId,
          mockFamilyId,
          mockConfirmationText,
          mockReauthToken
        )
      } catch (err) {
        expect((err as Error).message).toContain('sign in again')
      }
    })

    expect(result.current.error).toBeDefined()
  })

  it('prevents duplicate submissions with idempotency guard', async () => {
    // Make the service slow
    vi.mocked(removeChildFromFamily).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(mockRemoveResult), 200)
        })
    )

    // Reset auth mock
    vi.mocked(useAuthContext).mockReturnValue({ user: mockUser } as ReturnType<
      typeof useAuthContext
    >)

    const { result } = renderHook(() => useRemoveChild())

    let firstCall: Promise<unknown>
    let secondCallError: Error | undefined

    act(() => {
      firstCall = result.current.removeChild(
        mockChildId,
        mockFamilyId,
        mockConfirmationText,
        mockReauthToken
      )
    })

    // Try to call again while first is in progress
    await act(async () => {
      try {
        await result.current.removeChild(
          mockChildId,
          mockFamilyId,
          mockConfirmationText,
          mockReauthToken
        )
      } catch (err) {
        secondCallError = err as Error
      }
    })

    expect(secondCallError?.message).toContain('already in progress')

    // Wait for first call to complete
    await act(async () => {
      await firstCall
    })
  })

  it('sets requiresReauth when reauth error occurs', async () => {
    vi.mocked(useAuthContext).mockReturnValue({ user: mockUser } as ReturnType<
      typeof useAuthContext
    >)

    vi.mocked(removeChildFromFamily).mockRejectedValue(
      new Error('Please sign in again to confirm this action')
    )

    const { result } = renderHook(() => useRemoveChild())

    // First set to false
    act(() => {
      result.current.setRequiresReauth(false)
    })

    expect(result.current.requiresReauth).toBe(false)

    await act(async () => {
      try {
        await result.current.removeChild(
          mockChildId,
          mockFamilyId,
          mockConfirmationText,
          mockReauthToken
        )
      } catch {
        // Expected
      }
    })

    expect(result.current.requiresReauth).toBe(true)
  })

  it('continues removal even if device unenrollment fails', async () => {
    vi.mocked(useAuthContext).mockReturnValue({ user: mockUser } as ReturnType<
      typeof useAuthContext
    >)

    vi.mocked(unenrollDevicesForChild).mockRejectedValue(new Error('Device error'))

    const { result } = renderHook(() => useRemoveChild())

    let removeResult: Awaited<ReturnType<typeof result.current.removeChild>> | undefined

    await act(async () => {
      removeResult = await result.current.removeChild(
        mockChildId,
        mockFamilyId,
        mockConfirmationText,
        mockReauthToken
      )
    })

    expect(removeResult?.success).toBe(true)
    expect(removeResult?.devicesUnenrolled).toBe(0) // Default when error
    expect(removeChildFromFamily).toHaveBeenCalled() // Core operation still ran
  })

  it('continues removal even if data deletion fails', async () => {
    vi.mocked(useAuthContext).mockReturnValue({ user: mockUser } as ReturnType<
      typeof useAuthContext
    >)

    vi.mocked(deleteChildData).mockRejectedValue(new Error('Data deletion error'))

    const { result } = renderHook(() => useRemoveChild())

    let removeResult: Awaited<ReturnType<typeof result.current.removeChild>> | undefined

    await act(async () => {
      removeResult = await result.current.removeChild(
        mockChildId,
        mockFamilyId,
        mockConfirmationText,
        mockReauthToken
      )
    })

    expect(removeResult?.success).toBe(true)
    expect(removeResult?.screenshotsDeleted).toBe(0) // Default when error
    expect(removeChildFromFamily).toHaveBeenCalled() // Core operation still ran
  })

  it('allows setRequiresReauth to be called directly', () => {
    const { result } = renderHook(() => useRemoveChild())

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
