import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useUser } from './useUser'
import type { User } from '@fledgely/contracts'

// Mock the auth context
const mockAuthContext = {
  user: null as { uid: string; email: string } | null,
  loading: false,
  error: null,
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  clearError: vi.fn(),
}

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuthContext: () => mockAuthContext,
}))

// Mock the user service
const mockGetOrCreateUser = vi.fn()

vi.mock('@/services/userService', () => ({
  getOrCreateUser: (authUser: { uid: string }) => mockGetOrCreateUser(authUser),
}))

describe('useUser', () => {
  const mockUser: User = {
    uid: 'test-uid-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/photo.jpg',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    lastLoginAt: new Date('2025-01-01T00:00:00Z'),
  }

  const mockAuthUser = {
    uid: 'test-uid-123',
    email: 'test@example.com',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthContext.user = null
    mockAuthContext.loading = false
    mockAuthContext.error = null
  })

  it('returns initial loading state while auth is loading', () => {
    mockAuthContext.loading = true

    const { result } = renderHook(() => useUser())

    expect(result.current.loading).toBe(true)
    expect(result.current.userProfile).toBeNull()
    expect(result.current.isNewUser).toBe(false)
  })

  it('returns null userProfile when no auth user', async () => {
    mockAuthContext.user = null
    mockAuthContext.loading = false

    const { result } = renderHook(() => useUser())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.userProfile).toBeNull()
    expect(result.current.isNewUser).toBe(false)
  })

  it('fetches user profile when auth user exists', async () => {
    mockAuthContext.user = mockAuthUser
    mockAuthContext.loading = false

    mockGetOrCreateUser.mockResolvedValue({
      user: mockUser,
      isNewUser: false,
    })

    const { result } = renderHook(() => useUser())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.userProfile).toEqual(mockUser)
    expect(result.current.isNewUser).toBe(false)
    expect(mockGetOrCreateUser).toHaveBeenCalledWith(mockAuthUser)
  })

  it('sets isNewUser to true for new users', async () => {
    mockAuthContext.user = mockAuthUser
    mockAuthContext.loading = false

    mockGetOrCreateUser.mockResolvedValue({
      user: mockUser,
      isNewUser: true,
    })

    const { result } = renderHook(() => useUser())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.isNewUser).toBe(true)
  })

  it('handles errors from getOrCreateUser', async () => {
    mockAuthContext.user = mockAuthUser
    mockAuthContext.loading = false

    mockGetOrCreateUser.mockRejectedValue(new Error('Failed to load user'))

    const { result } = renderHook(() => useUser())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('Failed to load user')
    expect(result.current.userProfile).toBeNull()
  })

  it('clears error when clearError is called', async () => {
    mockAuthContext.user = mockAuthUser
    mockAuthContext.loading = false

    mockGetOrCreateUser.mockRejectedValue(new Error('Test error'))

    const { result } = renderHook(() => useUser())

    await waitFor(() => {
      expect(result.current.error).not.toBeNull()
    })

    act(() => {
      result.current.clearError()
    })

    expect(result.current.error).toBeNull()
  })

  it('does not re-fetch when auth user uid has not changed', async () => {
    mockAuthContext.user = mockAuthUser
    mockAuthContext.loading = false

    mockGetOrCreateUser.mockResolvedValue({
      user: mockUser,
      isNewUser: false,
    })

    const { result, rerender } = renderHook(() => useUser())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockGetOrCreateUser).toHaveBeenCalledTimes(1)

    // Rerender with same user
    rerender()

    // Should not call again
    expect(mockGetOrCreateUser).toHaveBeenCalledTimes(1)
  })

  it('resets state when user logs out', async () => {
    mockAuthContext.user = mockAuthUser
    mockAuthContext.loading = false

    mockGetOrCreateUser.mockResolvedValue({
      user: mockUser,
      isNewUser: false,
    })

    const { result, rerender } = renderHook(() => useUser())

    await waitFor(() => {
      expect(result.current.userProfile).toEqual(mockUser)
    })

    // Simulate logout
    mockAuthContext.user = null
    rerender()

    await waitFor(() => {
      expect(result.current.userProfile).toBeNull()
      expect(result.current.isNewUser).toBe(false)
    })
  })

  it('combines auth loading and user loading states', async () => {
    mockAuthContext.loading = true

    const { result } = renderHook(() => useUser())

    // Loading should be true when auth is loading
    expect(result.current.loading).toBe(true)

    // Simulate auth finishing but user fetch starting
    mockAuthContext.loading = false
    mockAuthContext.user = mockAuthUser

    // Create a promise that doesn't resolve immediately
    let resolvePromise: (value: { user: User; isNewUser: boolean }) => void
    mockGetOrCreateUser.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve
      })
    )

    const { result: result2, rerender } = renderHook(() => useUser())

    // Rerender to trigger the effect
    rerender()

    // Should still be loading during user fetch
    expect(result2.current.loading).toBe(true)

    // Resolve the promise
    await act(async () => {
      resolvePromise!({ user: mockUser, isNewUser: false })
    })

    await waitFor(() => {
      expect(result2.current.loading).toBe(false)
    })
  })
})
