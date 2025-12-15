import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import { useAuth } from './useAuth'
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  setPersistence,
  getRedirectResult,
  User,
} from 'firebase/auth'

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  onAuthStateChanged: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  getRedirectResult: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn(() => ({
    addScope: vi.fn(),
  })),
  browserLocalPersistence: {},
  setPersistence: vi.fn(),
}))

vi.mock('@/lib/firebase', () => ({
  auth: {},
}))

describe('useAuth', () => {
  let authStateCallback: ((user: User | null) => void) | null = null
  let unsubscribeMock: Mock

  beforeEach(() => {
    vi.clearAllMocks()
    authStateCallback = null
    unsubscribeMock = vi.fn()

    // Setup default mocks
    ;(setPersistence as Mock).mockResolvedValue(undefined)
    ;(getRedirectResult as Mock).mockResolvedValue(null)
    ;(onAuthStateChanged as Mock).mockImplementation((_auth, callback) => {
      authStateCallback = callback
      // Simulate initial auth check - no user
      setTimeout(() => callback(null), 0)
      return unsubscribeMock
    })
  })

  it('initializes with loading state', () => {
    const { result } = renderHook(() => useAuth())

    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBe(null)
    expect(result.current.error).toBe(null)
  })

  it('sets loading to false after auth state resolves', async () => {
    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toBe(null)
  })

  it('updates user state when auth state changes', async () => {
    const mockUser = {
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
    } as User

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Simulate user sign-in
    act(() => {
      if (authStateCallback) {
        authStateCallback(mockUser)
      }
    })

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(null)
  })

  it('sets LOCAL persistence on mount', async () => {
    renderHook(() => useAuth())

    await waitFor(() => {
      expect(setPersistence).toHaveBeenCalled()
    })
  })

  it('unsubscribes from auth state on unmount', async () => {
    const { unmount } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(onAuthStateChanged).toHaveBeenCalled()
    })

    unmount()

    expect(unsubscribeMock).toHaveBeenCalled()
  })

  describe('signInWithGoogle', () => {
    it('calls signInWithPopup with GoogleAuthProvider', async () => {
      ;(signInWithPopup as Mock).mockResolvedValue({
        user: { uid: 'test-uid' },
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.signInWithGoogle()
      })

      expect(signInWithPopup).toHaveBeenCalled()
    })

    it('sets loading state during sign-in', async () => {
      let resolveSignIn: (value: unknown) => void
      ;(signInWithPopup as Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveSignIn = resolve
          })
      )

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Start sign-in
      act(() => {
        result.current.signInWithGoogle()
      })

      expect(result.current.loading).toBe(true)

      // Complete sign-in
      await act(async () => {
        resolveSignIn!({ user: { uid: 'test-uid' } })
      })
    })

    it('falls back to redirect when popup is blocked', async () => {
      const popupBlockedError = new Error('popup blocked')
      ;(popupBlockedError as unknown as { code: string }).code = 'auth/popup-blocked'
      ;(signInWithPopup as Mock).mockRejectedValue(popupBlockedError)
      ;(signInWithRedirect as Mock).mockResolvedValue(undefined)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.signInWithGoogle()
      })

      expect(signInWithRedirect).toHaveBeenCalled()
    })

    it('sets error state on sign-in failure', async () => {
      const networkError = new Error('network error')
      ;(networkError as unknown as { code: string }).code = 'auth/network-request-failed'
      ;(signInWithPopup as Mock).mockRejectedValue(networkError)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.signInWithGoogle()
      })

      expect(result.current.error?.message).toBe(
        'Could not connect. Please check your internet and try again.'
      )
    })

    it('shows user-friendly message when popup is closed by user', async () => {
      const closedError = new Error('popup closed')
      ;(closedError as unknown as { code: string }).code = 'auth/popup-closed-by-user'
      ;(signInWithPopup as Mock).mockRejectedValue(closedError)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.signInWithGoogle()
      })

      expect(result.current.error?.message).toBe(
        'Sign-in was cancelled. Please try again when ready.'
      )
    })
  })

  describe('signOut', () => {
    it('calls Firebase signOut', async () => {
      ;(signOut as Mock).mockResolvedValue(undefined)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.signOut()
      })

      expect(signOut).toHaveBeenCalled()
    })

    it('sets error state on sign-out failure', async () => {
      const error = new Error('sign out failed')
      ;(error as unknown as { code: string }).code = 'default'
      ;(signOut as Mock).mockRejectedValue(error)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.signOut()
      })

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('clearError', () => {
    it('clears the error state', async () => {
      const networkError = new Error('network error')
      ;(networkError as unknown as { code: string }).code = 'auth/network-request-failed'
      ;(signInWithPopup as Mock).mockRejectedValue(networkError)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Create an error
      await act(async () => {
        await result.current.signInWithGoogle()
      })

      expect(result.current.error).toBeTruthy()

      // Clear the error
      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBe(null)
    })
  })

  describe('redirect result handling', () => {
    it('processes redirect result on mount', async () => {
      const mockUser = { uid: 'redirect-user' } as User
      ;(getRedirectResult as Mock).mockResolvedValue({ user: mockUser })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(getRedirectResult).toHaveBeenCalled()
      })
    })
  })
})
