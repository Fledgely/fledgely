import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useFamily } from './useFamily'
import type { Family } from '@fledgely/contracts'

// Mock dependencies
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuthContext: vi.fn(),
}))

vi.mock('@/hooks/useUser', () => ({
  useUser: vi.fn(),
}))

vi.mock('@/services/familyService', () => ({
  createFamily: vi.fn(),
  getFamilyForUser: vi.fn(),
}))

// Import mocked functions after mocking
import { useAuthContext } from '@/components/providers/AuthProvider'
import { useUser } from '@/hooks/useUser'
import { createFamily, getFamilyForUser } from '@/services/familyService'

const mockUseAuthContext = vi.mocked(useAuthContext)
const mockUseUser = vi.mocked(useUser)
const mockCreateFamily = vi.mocked(createFamily)
const mockGetFamilyForUser = vi.mocked(getFamilyForUser)

describe('useFamily', () => {
  const mockAuthUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
  }

  const mockUserProfile = {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: null,
    createdAt: new Date(),
    lastLoginAt: new Date(),
    familyId: undefined,
    role: undefined,
  }

  const mockFamily: Family = {
    id: 'test-family-456',
    createdAt: new Date(),
    createdBy: 'test-user-123',
    guardians: [
      {
        uid: 'test-user-123',
        role: 'primary',
        permissions: 'full',
        joinedAt: new Date(),
      },
    ],
    children: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('initial state', () => {
    it('returns loading true while auth is loading', () => {
      mockUseAuthContext.mockReturnValue({
        user: null,
        loading: true,
        error: null,
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      })
      mockUseUser.mockReturnValue({
        userProfile: null,
        isNewUser: false,
        loading: true,
        error: null,
        clearError: vi.fn(),
      })

      const { result } = renderHook(() => useFamily())

      expect(result.current.loading).toBe(true)
      expect(result.current.family).toBeNull()
      expect(result.current.hasFamily).toBe(false)
    })

    it('returns loading false and family null when not authenticated', async () => {
      mockUseAuthContext.mockReturnValue({
        user: null,
        loading: false,
        error: null,
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      })
      mockUseUser.mockReturnValue({
        userProfile: null,
        isNewUser: false,
        loading: false,
        error: null,
        clearError: vi.fn(),
      })

      const { result } = renderHook(() => useFamily())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.family).toBeNull()
      expect(result.current.hasFamily).toBe(false)
    })
  })

  describe('fetching family', () => {
    it('fetches family when user profile is available', async () => {
      mockUseAuthContext.mockReturnValue({
        user: mockAuthUser as ReturnType<typeof useAuthContext>['user'],
        loading: false,
        error: null,
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      })
      mockUseUser.mockReturnValue({
        userProfile: mockUserProfile,
        isNewUser: false,
        loading: false,
        error: null,
        clearError: vi.fn(),
      })
      mockGetFamilyForUser.mockResolvedValue(mockFamily)

      const { result } = renderHook(() => useFamily())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.family).toEqual(mockFamily)
      expect(result.current.hasFamily).toBe(true)
      expect(mockGetFamilyForUser).toHaveBeenCalledWith('test-user-123')
    })

    it('returns hasFamily false when user has no family', async () => {
      mockUseAuthContext.mockReturnValue({
        user: mockAuthUser as ReturnType<typeof useAuthContext>['user'],
        loading: false,
        error: null,
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      })
      mockUseUser.mockReturnValue({
        userProfile: mockUserProfile,
        isNewUser: false,
        loading: false,
        error: null,
        clearError: vi.fn(),
      })
      mockGetFamilyForUser.mockResolvedValue(null)

      const { result } = renderHook(() => useFamily())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.family).toBeNull()
      expect(result.current.hasFamily).toBe(false)
    })

    it('sets error when fetch fails', async () => {
      mockUseAuthContext.mockReturnValue({
        user: mockAuthUser as ReturnType<typeof useAuthContext>['user'],
        loading: false,
        error: null,
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      })
      mockUseUser.mockReturnValue({
        userProfile: mockUserProfile,
        isNewUser: false,
        loading: false,
        error: null,
        clearError: vi.fn(),
      })
      mockGetFamilyForUser.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useFamily())

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })

      expect(result.current.error?.message).toBe('Network error')
      expect(result.current.family).toBeNull()
    })
  })

  describe('createNewFamily', () => {
    it('creates family and updates state', async () => {
      mockUseAuthContext.mockReturnValue({
        user: mockAuthUser as ReturnType<typeof useAuthContext>['user'],
        loading: false,
        error: null,
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      })
      mockUseUser.mockReturnValue({
        userProfile: mockUserProfile,
        isNewUser: true,
        loading: false,
        error: null,
        clearError: vi.fn(),
      })
      mockGetFamilyForUser.mockResolvedValue(null) // Initially no family
      mockCreateFamily.mockResolvedValue(mockFamily)

      const { result } = renderHook(() => useFamily())

      // Wait for initial fetch to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.hasFamily).toBe(false)

      // Create family
      let createdFamily: Family | undefined
      await act(async () => {
        createdFamily = await result.current.createNewFamily()
      })

      expect(createdFamily).toEqual(mockFamily)
      expect(result.current.family).toEqual(mockFamily)
      expect(result.current.hasFamily).toBe(true)
      expect(mockCreateFamily).toHaveBeenCalledWith('test-user-123')
    })

    it('throws error when not authenticated', async () => {
      mockUseAuthContext.mockReturnValue({
        user: null,
        loading: false,
        error: null,
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      })
      mockUseUser.mockReturnValue({
        userProfile: null,
        isNewUser: false,
        loading: false,
        error: null,
        clearError: vi.fn(),
      })

      const { result } = renderHook(() => useFamily())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await expect(result.current.createNewFamily()).rejects.toThrow(
        'Must be logged in to create a family'
      )
    })

    it('sets error when creation fails', async () => {
      mockUseAuthContext.mockReturnValue({
        user: mockAuthUser as ReturnType<typeof useAuthContext>['user'],
        loading: false,
        error: null,
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      })
      mockUseUser.mockReturnValue({
        userProfile: mockUserProfile,
        isNewUser: true,
        loading: false,
        error: null,
        clearError: vi.fn(),
      })
      mockGetFamilyForUser.mockResolvedValue(null)
      mockCreateFamily.mockRejectedValue(new Error('Creation failed'))

      const { result } = renderHook(() => useFamily())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Call createNewFamily and expect it to throw
      await act(async () => {
        try {
          await result.current.createNewFamily()
        } catch {
          // Expected to throw
        }
      })

      // Now check that error state was set
      await waitFor(() => {
        expect(result.current.error?.message).toBe('Creation failed')
      })
    })
  })

  describe('clearError', () => {
    it('clears error state', async () => {
      mockUseAuthContext.mockReturnValue({
        user: mockAuthUser as ReturnType<typeof useAuthContext>['user'],
        loading: false,
        error: null,
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      })
      mockUseUser.mockReturnValue({
        userProfile: mockUserProfile,
        isNewUser: false,
        loading: false,
        error: null,
        clearError: vi.fn(),
      })
      mockGetFamilyForUser.mockRejectedValue(new Error('Test error'))

      const { result } = renderHook(() => useFamily())

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('refreshFamily', () => {
    it('refetches family data', async () => {
      mockUseAuthContext.mockReturnValue({
        user: mockAuthUser as ReturnType<typeof useAuthContext>['user'],
        loading: false,
        error: null,
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      })
      mockUseUser.mockReturnValue({
        userProfile: mockUserProfile,
        isNewUser: false,
        loading: false,
        error: null,
        clearError: vi.fn(),
      })

      // First call returns null, second call returns family
      mockGetFamilyForUser
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockFamily)

      const { result } = renderHook(() => useFamily())

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.hasFamily).toBe(false)

      // Refresh
      await act(async () => {
        await result.current.refreshFamily()
      })

      expect(result.current.hasFamily).toBe(true)
      expect(result.current.family).toEqual(mockFamily)
      expect(mockGetFamilyForUser).toHaveBeenCalledTimes(2)
    })
  })
})
