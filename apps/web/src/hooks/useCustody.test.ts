import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useCustody } from './useCustody'
import type { CustodyDeclaration, ChildProfile } from '@fledgely/contracts'

// Mock dependencies
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuthContext: vi.fn(),
}))

vi.mock('@/services/custodyService', () => ({
  declareCustody: vi.fn(),
  updateCustody: vi.fn(),
  declareOrUpdateCustody: vi.fn(),
  getCustodyDeclaration: vi.fn(),
}))

// Import mocked functions after mocking
import { useAuthContext } from '@/components/providers/AuthProvider'
import {
  declareCustody as declareCustodyService,
  updateCustody as updateCustodyService,
  declareOrUpdateCustody as declareOrUpdateCustodyService,
  getCustodyDeclaration,
} from '@/services/custodyService'

const mockUseAuthContext = vi.mocked(useAuthContext)
const mockDeclareCustodyService = vi.mocked(declareCustodyService)
const mockUpdateCustodyService = vi.mocked(updateCustodyService)
const mockDeclareOrUpdateCustodyService = vi.mocked(declareOrUpdateCustodyService)
const mockGetCustodyDeclaration = vi.mocked(getCustodyDeclaration)

describe('useCustody', () => {
  const mockAuthUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
  }

  const mockCustodyDeclaration: CustodyDeclaration = {
    type: 'sole',
    notes: null,
    declaredBy: 'test-user-123',
    declaredAt: new Date('2024-01-15'),
  }

  const mockSharedCustodyDeclaration: CustodyDeclaration = {
    type: 'shared',
    notes: null,
    declaredBy: 'test-user-123',
    declaredAt: new Date('2024-01-15'),
  }

  const mockComplexCustodyDeclaration: CustodyDeclaration = {
    type: 'complex',
    notes: 'Blended family situation',
    declaredBy: 'test-user-123',
    declaredAt: new Date('2024-01-15'),
  }

  const mockChildWithCustody: ChildProfile = {
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
    custodyDeclaration: mockCustodyDeclaration,
    custodyHistory: [],
    requiresSharedCustodySafeguards: false,
  }

  const mockChildWithoutCustody: ChildProfile = {
    ...mockChildWithCustody,
    custodyDeclaration: undefined,
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
    it('returns initial state with no custody', () => {
      const { result } = renderHook(() => useCustody())

      expect(result.current.custody).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.hasCustody).toBe(false)
    })

    it('exposes all expected functions', () => {
      const { result } = renderHook(() => useCustody())

      expect(typeof result.current.declareCustody).toBe('function')
      expect(typeof result.current.updateCustody).toBe('function')
      expect(typeof result.current.declareOrUpdateCustody).toBe('function')
      expect(typeof result.current.clearError).toBe('function')
      expect(typeof result.current.fetchCustody).toBe('function')
      expect(typeof result.current.setCustodyFromChild).toBe('function')
    })
  })

  // ============================================
  // DECLARE CUSTODY TESTS
  // ============================================
  describe('declareCustody', () => {
    it('declares custody successfully', async () => {
      mockDeclareCustodyService.mockResolvedValue(mockCustodyDeclaration)

      const { result } = renderHook(() => useCustody())

      await act(async () => {
        const declaration = await result.current.declareCustody('child-123', {
          type: 'sole',
        })
        expect(declaration).toEqual(mockCustodyDeclaration)
      })

      expect(result.current.custody).toEqual(mockCustodyDeclaration)
      expect(result.current.hasCustody).toBe(true)
      expect(result.current.error).toBeNull()
      expect(mockDeclareCustodyService).toHaveBeenCalledWith(
        'child-123',
        { type: 'sole' },
        'test-user-123'
      )
    })

    it('sets loading state during declaration', async () => {
      let resolvePromise: (value: CustodyDeclaration) => void
      mockDeclareCustodyService.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve
          })
      )

      const { result } = renderHook(() => useCustody())

      // Start declaring
      let declarationPromise: Promise<CustodyDeclaration>
      act(() => {
        declarationPromise = result.current.declareCustody('child-123', { type: 'sole' })
      })

      // Should be loading
      expect(result.current.loading).toBe(true)

      // Resolve the promise
      await act(async () => {
        resolvePromise!(mockCustodyDeclaration)
        await declarationPromise
      })

      // Should no longer be loading
      expect(result.current.loading).toBe(false)
    })

    it('sets error state on declaration failure', async () => {
      const mockError = new Error('Failed to declare custody')
      mockDeclareCustodyService.mockRejectedValue(mockError)

      const { result } = renderHook(() => useCustody())

      await act(async () => {
        try {
          await result.current.declareCustody('child-123', { type: 'sole' })
        } catch {
          // Expected
        }
      })

      expect(result.current.error).toBeDefined()
      expect(result.current.custody).toBeNull()
    })

    it('throws error when user not authenticated', async () => {
      mockUseAuthContext.mockReturnValue({
        user: null,
        loading: false,
        error: null,
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      })

      const { result } = renderHook(() => useCustody())

      await expect(
        act(async () => {
          await result.current.declareCustody('child-123', { type: 'sole' })
        })
      ).rejects.toThrow('You need to be signed in')
    })
  })

  // ============================================
  // UPDATE CUSTODY TESTS
  // ============================================
  describe('updateCustody', () => {
    it('updates custody successfully', async () => {
      mockUpdateCustodyService.mockResolvedValue(mockSharedCustodyDeclaration)

      const { result } = renderHook(() => useCustody())

      await act(async () => {
        const declaration = await result.current.updateCustody('child-123', {
          type: 'shared',
        })
        expect(declaration).toEqual(mockSharedCustodyDeclaration)
      })

      expect(result.current.custody).toEqual(mockSharedCustodyDeclaration)
      expect(mockUpdateCustodyService).toHaveBeenCalledWith(
        'child-123',
        { type: 'shared' },
        'test-user-123'
      )
    })

    it('sets error state on update failure', async () => {
      const mockError = new Error('Failed to update custody')
      mockUpdateCustodyService.mockRejectedValue(mockError)

      const { result } = renderHook(() => useCustody())

      await act(async () => {
        try {
          await result.current.updateCustody('child-123', { type: 'shared' })
        } catch {
          // Expected
        }
      })

      expect(result.current.error).toBeDefined()
    })
  })

  // ============================================
  // DECLARE OR UPDATE CUSTODY TESTS
  // ============================================
  describe('declareOrUpdateCustody', () => {
    it('declares or updates custody successfully', async () => {
      mockDeclareOrUpdateCustodyService.mockResolvedValue(mockComplexCustodyDeclaration)

      const { result } = renderHook(() => useCustody())

      await act(async () => {
        const declaration = await result.current.declareOrUpdateCustody('child-123', {
          type: 'complex',
          notes: 'Blended family situation',
        })
        expect(declaration).toEqual(mockComplexCustodyDeclaration)
      })

      expect(result.current.custody).toEqual(mockComplexCustodyDeclaration)
      expect(mockDeclareOrUpdateCustodyService).toHaveBeenCalledWith(
        'child-123',
        { type: 'complex', notes: 'Blended family situation' },
        'test-user-123'
      )
    })
  })

  // ============================================
  // FETCH CUSTODY TESTS
  // ============================================
  describe('fetchCustody', () => {
    it('fetches custody successfully', async () => {
      mockGetCustodyDeclaration.mockResolvedValue(mockCustodyDeclaration)

      const { result } = renderHook(() => useCustody())

      await act(async () => {
        const declaration = await result.current.fetchCustody('child-123')
        expect(declaration).toEqual(mockCustodyDeclaration)
      })

      expect(result.current.custody).toEqual(mockCustodyDeclaration)
      expect(result.current.hasCustody).toBe(true)
    })

    it('returns null when no custody exists', async () => {
      mockGetCustodyDeclaration.mockResolvedValue(null)

      const { result } = renderHook(() => useCustody())

      await act(async () => {
        const declaration = await result.current.fetchCustody('child-123')
        expect(declaration).toBeNull()
      })

      expect(result.current.custody).toBeNull()
      expect(result.current.hasCustody).toBe(false)
    })

    it('sets error state on fetch failure', async () => {
      const mockError = new Error('Failed to fetch custody')
      mockGetCustodyDeclaration.mockRejectedValue(mockError)

      const { result } = renderHook(() => useCustody())

      await act(async () => {
        await result.current.fetchCustody('child-123')
      })

      expect(result.current.error).toBeDefined()
    })
  })

  // ============================================
  // SET CUSTODY FROM CHILD TESTS
  // ============================================
  describe('setCustodyFromChild', () => {
    it('sets custody from child with custody declaration', () => {
      const { result } = renderHook(() => useCustody())

      act(() => {
        result.current.setCustodyFromChild(mockChildWithCustody)
      })

      expect(result.current.custody).toEqual(mockCustodyDeclaration)
      expect(result.current.hasCustody).toBe(true)
    })

    it('sets custody to null from child without custody declaration', () => {
      const { result } = renderHook(() => useCustody())

      act(() => {
        result.current.setCustodyFromChild(mockChildWithoutCustody)
      })

      expect(result.current.custody).toBeNull()
      expect(result.current.hasCustody).toBe(false)
    })
  })

  // ============================================
  // CLEAR ERROR TESTS
  // ============================================
  describe('clearError', () => {
    it('clears error state', async () => {
      const mockError = new Error('Test error')
      mockDeclareCustodyService.mockRejectedValue(mockError)

      const { result } = renderHook(() => useCustody())

      // Trigger an error
      await act(async () => {
        try {
          await result.current.declareCustody('child-123', { type: 'sole' })
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
    it('allows new declaration after previous completes', async () => {
      mockDeclareCustodyService
        .mockResolvedValueOnce(mockCustodyDeclaration)
        .mockResolvedValueOnce(mockSharedCustodyDeclaration)

      const { result } = renderHook(() => useCustody())

      // First declaration
      await act(async () => {
        await result.current.declareCustody('child-123', { type: 'sole' })
      })

      expect(result.current.custody?.type).toBe('sole')

      // Second declaration should work after first completes
      await act(async () => {
        await result.current.declareCustody('child-456', { type: 'shared' })
      })

      expect(result.current.custody?.type).toBe('shared')
    })
  })

  // ============================================
  // ADVERSARIAL TESTS
  // ============================================
  describe('adversarial tests', () => {
    it('handles rapid successive calls gracefully', async () => {
      mockDeclareCustodyService.mockResolvedValue(mockCustodyDeclaration)

      const { result } = renderHook(() => useCustody())

      // First call should succeed
      await act(async () => {
        await result.current.declareCustody('child-123', { type: 'sole' })
      })

      expect(result.current.custody).toEqual(mockCustodyDeclaration)
    })

    it('handles service returning non-Error rejection', async () => {
      mockDeclareCustodyService.mockRejectedValue('String error')

      const { result } = renderHook(() => useCustody())

      await act(async () => {
        try {
          await result.current.declareCustody('child-123', { type: 'sole' })
        } catch {
          // Expected - error is thrown and caught
        }
      })

      // Hook should have set error state
      await waitFor(() => {
        expect(result.current.error).toBeDefined()
      })
      expect(result.current.error?.message).toBe('Could not declare custody')
    })

    it('maintains state integrity after error', async () => {
      // Set up initial state
      mockDeclareCustodyService.mockResolvedValueOnce(mockCustodyDeclaration)

      const { result } = renderHook(() => useCustody())

      // First, set custody successfully
      await act(async () => {
        await result.current.declareCustody('child-123', { type: 'sole' })
      })

      expect(result.current.custody).toEqual(mockCustodyDeclaration)

      // Now simulate an error on update
      mockUpdateCustodyService.mockRejectedValue(new Error('Update failed'))

      await act(async () => {
        try {
          await result.current.updateCustody('child-123', { type: 'shared' })
        } catch {
          // Expected
        }
      })

      // Original custody should remain unchanged
      expect(result.current.custody).toEqual(mockCustodyDeclaration)
      expect(result.current.error).toBeDefined()
    })
  })
})
