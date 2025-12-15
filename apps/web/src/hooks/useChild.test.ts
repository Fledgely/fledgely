import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useChild } from './useChild'
import type { ChildProfile, CreateChildInput, Family } from '@fledgely/contracts'

// Mock dependencies
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuthContext: vi.fn(),
}))

vi.mock('@/hooks/useFamily', () => ({
  useFamily: vi.fn(),
}))

vi.mock('@/services/childService', () => ({
  addChildToFamily: vi.fn(),
  getChildrenForFamily: vi.fn(),
}))

// Import mocked functions after mocking
import { useAuthContext } from '@/components/providers/AuthProvider'
import { useFamily } from '@/hooks/useFamily'
import { addChildToFamily, getChildrenForFamily } from '@/services/childService'

const mockUseAuthContext = vi.mocked(useAuthContext)
const mockUseFamily = vi.mocked(useFamily)
const mockAddChildToFamily = vi.mocked(addChildToFamily)
const mockGetChildrenForFamily = vi.mocked(getChildrenForFamily)

describe('useChild', () => {
  const mockAuthUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
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

  const mockChild: ChildProfile = {
    id: 'test-child-789',
    familyId: 'test-family-456',
    firstName: 'Emma',
    lastName: null,
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
  }

  const mockCreateChildInput: CreateChildInput = {
    firstName: 'Emma',
    birthdate: new Date('2015-06-15'),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('initial state', () => {
    it('returns loading true while family is loading', () => {
      mockUseAuthContext.mockReturnValue({
        user: mockAuthUser as ReturnType<typeof useAuthContext>['user'],
        loading: false,
        error: null,
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      })
      mockUseFamily.mockReturnValue({
        family: null,
        loading: true,
        error: null,
        hasFamily: false,
        createNewFamily: vi.fn(),
        clearError: vi.fn(),
        refreshFamily: vi.fn(),
      })

      const { result } = renderHook(() => useChild())

      expect(result.current.loading).toBe(true)
      expect(result.current.children).toEqual([])
      expect(result.current.hasChildren).toBe(false)
    })

    it('returns loading false and empty children when no family', async () => {
      mockUseAuthContext.mockReturnValue({
        user: mockAuthUser as ReturnType<typeof useAuthContext>['user'],
        loading: false,
        error: null,
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      })
      mockUseFamily.mockReturnValue({
        family: null,
        loading: false,
        error: null,
        hasFamily: false,
        createNewFamily: vi.fn(),
        clearError: vi.fn(),
        refreshFamily: vi.fn(),
      })

      const { result } = renderHook(() => useChild())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.children).toEqual([])
      expect(result.current.hasChildren).toBe(false)
    })
  })

  describe('fetching children', () => {
    it('fetches children when family is available', async () => {
      mockUseAuthContext.mockReturnValue({
        user: mockAuthUser as ReturnType<typeof useAuthContext>['user'],
        loading: false,
        error: null,
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      })
      mockUseFamily.mockReturnValue({
        family: mockFamily,
        loading: false,
        error: null,
        hasFamily: true,
        createNewFamily: vi.fn(),
        clearError: vi.fn(),
        refreshFamily: vi.fn(),
      })
      mockGetChildrenForFamily.mockResolvedValue([mockChild])

      const { result } = renderHook(() => useChild())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.children).toEqual([mockChild])
      expect(result.current.hasChildren).toBe(true)
      expect(mockGetChildrenForFamily).toHaveBeenCalledWith('test-family-456')
    })

    it('returns hasChildren false when family has no children', async () => {
      mockUseAuthContext.mockReturnValue({
        user: mockAuthUser as ReturnType<typeof useAuthContext>['user'],
        loading: false,
        error: null,
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      })
      mockUseFamily.mockReturnValue({
        family: mockFamily,
        loading: false,
        error: null,
        hasFamily: true,
        createNewFamily: vi.fn(),
        clearError: vi.fn(),
        refreshFamily: vi.fn(),
      })
      mockGetChildrenForFamily.mockResolvedValue([])

      const { result } = renderHook(() => useChild())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.children).toEqual([])
      expect(result.current.hasChildren).toBe(false)
    })

    it('sets error when fetch fails', async () => {
      mockUseAuthContext.mockReturnValue({
        user: mockAuthUser as ReturnType<typeof useAuthContext>['user'],
        loading: false,
        error: null,
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      })
      mockUseFamily.mockReturnValue({
        family: mockFamily,
        loading: false,
        error: null,
        hasFamily: true,
        createNewFamily: vi.fn(),
        clearError: vi.fn(),
        refreshFamily: vi.fn(),
      })
      mockGetChildrenForFamily.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useChild())

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })

      expect(result.current.error?.message).toBe('Network error')
      expect(result.current.children).toEqual([])
    })
  })

  describe('addChild', () => {
    it('adds child and updates state', async () => {
      mockUseAuthContext.mockReturnValue({
        user: mockAuthUser as ReturnType<typeof useAuthContext>['user'],
        loading: false,
        error: null,
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      })
      mockUseFamily.mockReturnValue({
        family: mockFamily,
        loading: false,
        error: null,
        hasFamily: true,
        createNewFamily: vi.fn(),
        clearError: vi.fn(),
        refreshFamily: vi.fn(),
      })
      mockGetChildrenForFamily.mockResolvedValue([])
      mockAddChildToFamily.mockResolvedValue(mockChild)

      const { result } = renderHook(() => useChild())

      // Wait for initial fetch to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.hasChildren).toBe(false)

      // Add child
      let addedChild: ChildProfile | undefined
      await act(async () => {
        addedChild = await result.current.addChild(mockCreateChildInput)
      })

      expect(addedChild).toEqual(mockChild)
      expect(result.current.children).toContainEqual(mockChild)
      expect(result.current.hasChildren).toBe(true)
      expect(mockAddChildToFamily).toHaveBeenCalledWith(
        'test-family-456',
        mockCreateChildInput,
        'test-user-123'
      )
    })

    it('throws error when not authenticated', async () => {
      mockUseAuthContext.mockReturnValue({
        user: null,
        loading: false,
        error: null,
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      })
      mockUseFamily.mockReturnValue({
        family: mockFamily,
        loading: false,
        error: null,
        hasFamily: true,
        createNewFamily: vi.fn(),
        clearError: vi.fn(),
        refreshFamily: vi.fn(),
      })
      mockGetChildrenForFamily.mockResolvedValue([])

      const { result } = renderHook(() => useChild())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await expect(result.current.addChild(mockCreateChildInput)).rejects.toThrow(
        'You need to be signed in to add a child'
      )
    })

    it('throws error when no family exists', async () => {
      mockUseAuthContext.mockReturnValue({
        user: mockAuthUser as ReturnType<typeof useAuthContext>['user'],
        loading: false,
        error: null,
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      })
      mockUseFamily.mockReturnValue({
        family: null,
        loading: false,
        error: null,
        hasFamily: false,
        createNewFamily: vi.fn(),
        clearError: vi.fn(),
        refreshFamily: vi.fn(),
      })

      const { result } = renderHook(() => useChild())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await expect(result.current.addChild(mockCreateChildInput)).rejects.toThrow(
        'You need to create a family first'
      )
    })

    it('sets error when add fails', async () => {
      mockUseAuthContext.mockReturnValue({
        user: mockAuthUser as ReturnType<typeof useAuthContext>['user'],
        loading: false,
        error: null,
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      })
      mockUseFamily.mockReturnValue({
        family: mockFamily,
        loading: false,
        error: null,
        hasFamily: true,
        createNewFamily: vi.fn(),
        clearError: vi.fn(),
        refreshFamily: vi.fn(),
      })
      mockGetChildrenForFamily.mockResolvedValue([])
      mockAddChildToFamily.mockRejectedValue(new Error('Could not add child'))

      const { result } = renderHook(() => useChild())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Call addChild and expect it to throw
      await act(async () => {
        try {
          await result.current.addChild(mockCreateChildInput)
        } catch {
          // Expected to throw
        }
      })

      // Now check that error state was set
      await waitFor(() => {
        expect(result.current.error?.message).toBe('Could not add child')
      })
    })

    it('adds multiple children successfully', async () => {
      mockUseAuthContext.mockReturnValue({
        user: mockAuthUser as ReturnType<typeof useAuthContext>['user'],
        loading: false,
        error: null,
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      })
      mockUseFamily.mockReturnValue({
        family: mockFamily,
        loading: false,
        error: null,
        hasFamily: true,
        createNewFamily: vi.fn(),
        clearError: vi.fn(),
        refreshFamily: vi.fn(),
      })
      mockGetChildrenForFamily.mockResolvedValue([])

      const child1 = { ...mockChild, id: 'child-1', firstName: 'Emma' }
      const child2 = { ...mockChild, id: 'child-2', firstName: 'Oliver' }

      mockAddChildToFamily
        .mockResolvedValueOnce(child1)
        .mockResolvedValueOnce(child2)

      const { result } = renderHook(() => useChild())

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Add first child
      await act(async () => {
        await result.current.addChild({ firstName: 'Emma', birthdate: new Date('2015-06-15') })
      })

      // Add second child
      await act(async () => {
        await result.current.addChild({ firstName: 'Oliver', birthdate: new Date('2017-03-20') })
      })

      expect(result.current.children).toHaveLength(2)
      expect(result.current.children[0].firstName).toBe('Emma')
      expect(result.current.children[1].firstName).toBe('Oliver')
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
      mockUseFamily.mockReturnValue({
        family: mockFamily,
        loading: false,
        error: null,
        hasFamily: true,
        createNewFamily: vi.fn(),
        clearError: vi.fn(),
        refreshFamily: vi.fn(),
      })
      mockGetChildrenForFamily.mockRejectedValue(new Error('Test error'))

      const { result } = renderHook(() => useChild())

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('refreshChildren', () => {
    it('refetches children data', async () => {
      mockUseAuthContext.mockReturnValue({
        user: mockAuthUser as ReturnType<typeof useAuthContext>['user'],
        loading: false,
        error: null,
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      })
      mockUseFamily.mockReturnValue({
        family: mockFamily,
        loading: false,
        error: null,
        hasFamily: true,
        createNewFamily: vi.fn(),
        clearError: vi.fn(),
        refreshFamily: vi.fn(),
      })

      // First call returns empty, second call returns children
      mockGetChildrenForFamily
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockChild])

      const { result } = renderHook(() => useChild())

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.hasChildren).toBe(false)

      // Refresh
      await act(async () => {
        await result.current.refreshChildren()
      })

      expect(result.current.hasChildren).toBe(true)
      expect(result.current.children).toEqual([mockChild])
      expect(mockGetChildrenForFamily).toHaveBeenCalledTimes(2)
    })
  })

  describe('edge cases', () => {
    it('handles rapid family changes without errors', async () => {
      mockUseAuthContext.mockReturnValue({
        user: mockAuthUser as ReturnType<typeof useAuthContext>['user'],
        loading: false,
        error: null,
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      })

      const mockUseFamily1 = {
        family: mockFamily,
        loading: false,
        error: null,
        hasFamily: true,
        createNewFamily: vi.fn(),
        clearError: vi.fn(),
        refreshFamily: vi.fn(),
      }

      mockUseFamily.mockReturnValue(mockUseFamily1)
      mockGetChildrenForFamily.mockResolvedValue([mockChild])

      const { result, rerender } = renderHook(() => useChild())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Switch to no family
      mockUseFamily.mockReturnValue({
        ...mockUseFamily1,
        family: null,
        hasFamily: false,
      })

      rerender()

      await waitFor(() => {
        expect(result.current.children).toEqual([])
      })
    })

    it('does not fetch twice for same family', async () => {
      mockUseAuthContext.mockReturnValue({
        user: mockAuthUser as ReturnType<typeof useAuthContext>['user'],
        loading: false,
        error: null,
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      })
      mockUseFamily.mockReturnValue({
        family: mockFamily,
        loading: false,
        error: null,
        hasFamily: true,
        createNewFamily: vi.fn(),
        clearError: vi.fn(),
        refreshFamily: vi.fn(),
      })
      mockGetChildrenForFamily.mockResolvedValue([mockChild])

      const { rerender } = renderHook(() => useChild())

      await waitFor(() => {
        expect(mockGetChildrenForFamily).toHaveBeenCalledTimes(1)
      })

      // Rerender should not trigger another fetch
      rerender()
      rerender()

      expect(mockGetChildrenForFamily).toHaveBeenCalledTimes(1)
    })
  })
})
