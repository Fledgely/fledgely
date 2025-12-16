import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock the entire modules before importing useReauthentication
const mockReauthenticateWithPopup = vi.fn()
const mockGetIdToken = vi.fn()

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class MockGoogleAuthProvider {
    setCustomParameters = vi.fn()
  },
  reauthenticateWithPopup: () => mockReauthenticateWithPopup(),
  getIdToken: (_user: unknown, forceRefresh: boolean) => mockGetIdToken(_user, forceRefresh),
}))

vi.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: { uid: 'test-user-123', email: 'test@example.com' },
  },
}))

// Import after mocks are set up
import { useReauthentication } from './useReauthentication'

describe('useReauthentication', () => {
  const mockToken = 'mock-fresh-token-12345'

  beforeEach(() => {
    vi.clearAllMocks()
    mockReauthenticateWithPopup.mockResolvedValue({ user: { uid: 'test-user-123' } })
    mockGetIdToken.mockResolvedValue(mockToken)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns initial state correctly', () => {
    const { result } = renderHook(() => useReauthentication())

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.lastReauthAt).toBeNull()
    expect(result.current.isReauthValid()).toBe(false)
    expect(typeof result.current.reauthenticate).toBe('function')
    expect(typeof result.current.clearError).toBe('function')
  })

  it('reauthenticates successfully and returns token', async () => {
    const { result } = renderHook(() => useReauthentication())

    let token: string | undefined

    await act(async () => {
      token = await result.current.reauthenticate()
    })

    expect(token).toBe(mockToken)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.lastReauthAt).not.toBeNull()
    expect(result.current.isReauthValid()).toBe(true)
  })

  it('handles popup-closed-by-user error', async () => {
    const popupClosedError = new Error('Popup closed')
    ;(popupClosedError as { code?: string }).code = 'auth/popup-closed-by-user'
    mockReauthenticateWithPopup.mockRejectedValueOnce(popupClosedError)

    const { result } = renderHook(() => useReauthentication())

    await act(async () => {
      try {
        await result.current.reauthenticate()
      } catch {
        // Expected
      }
    })

    expect(result.current.error).toBeDefined()
    expect(result.current.error?.message).toContain('cancelled')
  })

  it('handles popup-blocked error', async () => {
    const popupBlockedError = new Error('Popup blocked')
    ;(popupBlockedError as { code?: string }).code = 'auth/popup-blocked'
    mockReauthenticateWithPopup.mockRejectedValueOnce(popupBlockedError)

    const { result } = renderHook(() => useReauthentication())

    await act(async () => {
      try {
        await result.current.reauthenticate()
      } catch {
        // Expected
      }
    })

    expect(result.current.error).toBeDefined()
    expect(result.current.error?.message).toContain('cancelled')
  })

  it('handles requires-recent-login error', async () => {
    const requiresLoginError = new Error('Requires recent login')
    ;(requiresLoginError as { code?: string }).code = 'auth/requires-recent-login'
    mockReauthenticateWithPopup.mockRejectedValueOnce(requiresLoginError)

    const { result } = renderHook(() => useReauthentication())

    await act(async () => {
      try {
        await result.current.reauthenticate()
      } catch {
        // Expected
      }
    })

    expect(result.current.error).toBeDefined()
    expect(result.current.error?.message).toContain('expired')
  })

  it('handles user-mismatch error', async () => {
    const userMismatchError = new Error('User mismatch')
    ;(userMismatchError as { code?: string }).code = 'auth/user-mismatch'
    mockReauthenticateWithPopup.mockRejectedValueOnce(userMismatchError)

    const { result } = renderHook(() => useReauthentication())

    await act(async () => {
      try {
        await result.current.reauthenticate()
      } catch {
        // Expected
      }
    })

    expect(result.current.error).toBeDefined()
    expect(result.current.error?.message).toContain('sign in again')
  })

  it('handles network error', async () => {
    const networkError = new Error('Network error')
    ;(networkError as { code?: string }).code = 'auth/network-request-failed'
    mockReauthenticateWithPopup.mockRejectedValueOnce(networkError)

    const { result } = renderHook(() => useReauthentication())

    await act(async () => {
      try {
        await result.current.reauthenticate()
      } catch {
        // Expected
      }
    })

    expect(result.current.error).toBeDefined()
    expect(result.current.error?.message).toContain('Connection')
  })

  it('clears error when clearError is called', async () => {
    const testError = new Error('Test error')
    mockReauthenticateWithPopup.mockRejectedValueOnce(testError)

    const { result } = renderHook(() => useReauthentication())

    await act(async () => {
      try {
        await result.current.reauthenticate()
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

  it('isReauthValid returns true within 5 minute window', async () => {
    const { result } = renderHook(() => useReauthentication())

    // Initially should be false
    expect(result.current.isReauthValid()).toBe(false)

    await act(async () => {
      await result.current.reauthenticate()
    })

    // Immediately after reauth should be true
    expect(result.current.isReauthValid()).toBe(true)
  })

  it('isReauthValid returns false after 5 minutes', async () => {
    vi.useFakeTimers()

    const { result } = renderHook(() => useReauthentication())

    await act(async () => {
      await result.current.reauthenticate()
    })

    expect(result.current.isReauthValid()).toBe(true)

    // Advance time past 5 minutes
    act(() => {
      vi.advanceTimersByTime(6 * 60 * 1000) // 6 minutes
    })

    expect(result.current.isReauthValid()).toBe(false)

    vi.useRealTimers()
  })

  it('forces token refresh after reauthentication', async () => {
    const { result } = renderHook(() => useReauthentication())

    await act(async () => {
      await result.current.reauthenticate()
    })

    // Verify getIdToken was called with forceRefresh=true
    expect(mockGetIdToken).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'test-user-123' }),
      true
    )
  })
})
