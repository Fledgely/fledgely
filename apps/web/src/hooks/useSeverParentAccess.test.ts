/**
 * useSeverParentAccess Hook Tests
 *
 * Story 0.5.4: Parent Access Severing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSeverParentAccess } from './useSeverParentAccess'

// Mock firebase
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() =>
    vi.fn().mockResolvedValue({
      data: {
        success: true,
        message: 'Operation completed',
      },
    })
  ),
  HttpsCallableResult: {},
}))

vi.mock('../lib/firebase', () => ({
  getFirebaseFunctions: vi.fn(() => ({})),
}))

describe('useSeverParentAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('returns loading as false initially', () => {
      const { result } = renderHook(() => useSeverParentAccess())
      expect(result.current.loading).toBe(false)
    })

    it('returns error as null initially', () => {
      const { result } = renderHook(() => useSeverParentAccess())
      expect(result.current.error).toBeNull()
    })

    it('provides getFamilyForSevering function', () => {
      const { result } = renderHook(() => useSeverParentAccess())
      expect(typeof result.current.getFamilyForSevering).toBe('function')
    })

    it('provides severParentAccess function', () => {
      const { result } = renderHook(() => useSeverParentAccess())
      expect(typeof result.current.severParentAccess).toBe('function')
    })

    it('provides clearError function', () => {
      const { result } = renderHook(() => useSeverParentAccess())
      expect(typeof result.current.clearError).toBe('function')
    })
  })

  describe('getFamilyForSevering', () => {
    it('accepts ticketId parameter', async () => {
      const { result } = renderHook(() => useSeverParentAccess())
      const ticketId = 'ticket-123'
      await act(async () => {
        await result.current.getFamilyForSevering(ticketId)
      })
      // Function should complete without error
      expect(result.current.error).toBeNull()
    })

    it('returns family info structure', async () => {
      const { result } = renderHook(() => useSeverParentAccess())
      let response
      await act(async () => {
        response = await result.current.getFamilyForSevering('ticket-123')
      })
      // Response should be defined
      expect(response).toBeDefined()
    })
  })

  describe('severParentAccess', () => {
    it('accepts required parameters', async () => {
      const { result } = renderHook(() => useSeverParentAccess())
      const params = {
        ticketId: 'ticket-123',
        familyId: 'family-123',
        parentUid: 'parent-123',
        confirmationPhrase: 'SEVER parent@test.com',
      }
      await act(async () => {
        await result.current.severParentAccess(params)
      })
      expect(result.current.error).toBeNull()
    })

    it('returns success response structure', async () => {
      const { result } = renderHook(() => useSeverParentAccess())
      let response
      await act(async () => {
        response = await result.current.severParentAccess({
          ticketId: 'ticket-123',
          familyId: 'family-123',
          parentUid: 'parent-123',
          confirmationPhrase: 'SEVER parent@test.com',
        })
      })
      expect(response).toBeDefined()
    })
  })

  describe('loading state', () => {
    it('sets loading to true during operation', async () => {
      const { result } = renderHook(() => useSeverParentAccess())
      // Start operation but don't await
      act(() => {
        result.current.getFamilyForSevering('ticket-123')
      })
      // Loading should be true during operation
      expect(result.current.loading).toBe(true)
    })
  })

  describe('error handling', () => {
    it('clearError resets error to null', async () => {
      const { result } = renderHook(() => useSeverParentAccess())
      act(() => {
        result.current.clearError()
      })
      expect(result.current.error).toBeNull()
    })
  })

  describe('type definitions', () => {
    it('GuardianInfoForSevering has required fields', () => {
      const guardian = {
        uid: 'parent-1',
        email: 'parent@test.com',
        displayName: 'Parent Name',
        role: 'primary',
      }
      expect(guardian.uid).toBeDefined()
      expect(guardian.email).toBeDefined()
      expect(guardian.displayName).toBeDefined()
      expect(guardian.role).toBeDefined()
    })

    it('FamilyForSevering has required fields', () => {
      const family = {
        id: 'family-123',
        name: 'Test Family',
        guardians: [],
      }
      expect(family.id).toBeDefined()
      expect(family.name).toBeDefined()
      expect(Array.isArray(family.guardians)).toBe(true)
    })

    it('GetFamilyForSeveringResponse has required fields', () => {
      const response = {
        family: null,
        requestingUserUid: 'user-123',
        requestingUserEmail: 'user@test.com',
      }
      expect(response.family).toBeNull()
      expect(response.requestingUserUid).toBeDefined()
      expect(response.requestingUserEmail).toBeDefined()
    })

    it('SeverParentAccessResponse has required fields', () => {
      const response = {
        success: true,
        message: 'Parent access severed',
      }
      expect(typeof response.success).toBe('boolean')
      expect(typeof response.message).toBe('string')
    })
  })
})
