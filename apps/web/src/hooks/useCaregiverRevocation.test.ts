/**
 * useCaregiverRevocation Hook Tests - Story 19D.5
 *
 * Tests for the caregiver revocation hook.
 *
 * Story 19D.5 Acceptance Criteria:
 * - AC1: Revoke access within 5 minutes (NFR62)
 * - AC2: Terminate caregiver's current session
 * - AC5: Revocation logged in audit trail
 * - AC6: Parent can re-invite same caregiver later
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCaregiverRevocation } from './useCaregiverRevocation'
import * as firebase from 'firebase/firestore'

// Mock Firebase Firestore
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore')
  return {
    ...actual,
    doc: vi.fn(),
    getDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    runTransaction: vi.fn(),
    arrayRemove: vi.fn((item) => ({ _type: 'arrayRemove', item })),
  }
})

// Mock Firebase initialization
vi.mock('../lib/firebase', () => ({
  getFirestoreDb: vi.fn(() => ({})),
}))

// Mock audit service
vi.mock('../services/dataViewAuditService', () => ({
  logDataViewNonBlocking: vi.fn(),
}))

import { logDataViewNonBlocking } from '../services/dataViewAuditService'

describe('useCaregiverRevocation', () => {
  const mockFamilyId = 'family-123'
  const mockParentUid = 'parent-456'
  const mockCaregiverId = 'caregiver-789'
  const mockCaregiverEmail = 'grandpa@example.com'

  const mockCaregiverObject = {
    uid: mockCaregiverId,
    email: mockCaregiverEmail,
    displayName: 'Grandpa Joe',
    role: 'viewer',
    childIds: ['child-1'],
    addedAt: new Date(),
    addedByUid: mockParentUid,
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock for runTransaction (success case)
    vi.mocked(firebase.runTransaction).mockImplementation(async (_db, callback) => {
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            guardianUids: [mockParentUid],
            caregivers: [mockCaregiverObject],
          }),
        }),
        update: vi.fn(),
      }
      return callback(mockTransaction as any)
    })

    // Setup default mock for getDoc (for invitation lookup)
    vi.mocked(firebase.getDoc).mockResolvedValue({
      exists: () => false,
      data: () => null,
    } as any)

    // Setup default mock for deleteDoc (success)
    vi.mocked(firebase.deleteDoc).mockResolvedValue(undefined)
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

      let revocationResult: any
      await act(async () => {
        revocationResult = await result.current.revokeCaregiver(mockCaregiverId, mockCaregiverEmail)
      })

      expect(revocationResult.success).toBe(true)
      expect(result.current.error).toBeNull()
    })

    it('removes caregiver from family document via transaction', async () => {
      const mockUpdate = vi.fn()
      vi.mocked(firebase.runTransaction).mockImplementation(async (_db, callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({
              guardianUids: [mockParentUid],
              caregivers: [mockCaregiverObject],
            }),
          }),
          update: mockUpdate,
        }
        return callback(mockTransaction as any)
      })

      const { result } = renderHook(() => useCaregiverRevocation(mockFamilyId, mockParentUid))

      await act(async () => {
        await result.current.revokeCaregiver(mockCaregiverId, mockCaregiverEmail)
      })

      expect(mockUpdate).toHaveBeenCalled()
      expect(firebase.arrayRemove).toHaveBeenCalledWith(mockCaregiverObject)
    })

    it('attempts to delete invitation document when it exists', async () => {
      // getDoc is now only used for invitation lookup (transaction.get is used for family)
      vi.mocked(firebase.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({}),
      } as any)

      const { result } = renderHook(() => useCaregiverRevocation(mockFamilyId, mockParentUid))

      await act(async () => {
        await result.current.revokeCaregiver(mockCaregiverId, mockCaregiverEmail)
      })

      // deleteDoc should be called for the invitation
      expect(firebase.deleteDoc).toHaveBeenCalled()
    })

    it('sets loading to true during revocation', async () => {
      // Create a controllable promise for runTransaction
      let resolveTransaction: ((value: unknown) => void) | undefined
      const transactionPromise = new Promise((resolve) => {
        resolveTransaction = resolve
      })
      vi.mocked(firebase.runTransaction).mockReturnValue(transactionPromise as any)

      const { result } = renderHook(() => useCaregiverRevocation(mockFamilyId, mockParentUid))

      // Start revocation (don't await)
      let revokePromise: Promise<any>
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
        resolveTransaction?.(mockCaregiverObject)
        await revokePromise
      })

      expect(result.current.loading).toBe(false)
    })
  })

  describe('Audit logging (AC5)', () => {
    it('logs revocation to audit trail', async () => {
      const { result } = renderHook(() => useCaregiverRevocation(mockFamilyId, mockParentUid))

      await act(async () => {
        await result.current.revokeCaregiver(mockCaregiverId, mockCaregiverEmail)
      })

      expect(logDataViewNonBlocking).toHaveBeenCalledWith({
        viewerUid: mockParentUid,
        childId: null,
        familyId: mockFamilyId,
        dataType: 'caregiver_revoked',
        metadata: {
          action: 'revoke',
          revokedCaregiverId: mockCaregiverId,
          revokedCaregiverEmail: mockCaregiverEmail,
        },
      })
    })
  })

  describe('Error handling', () => {
    it('returns error when family not found', async () => {
      vi.mocked(firebase.runTransaction).mockImplementation(async (_db, callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => false,
            data: () => null,
          }),
          update: vi.fn(),
        }
        return callback(mockTransaction as any)
      })

      const { result } = renderHook(() => useCaregiverRevocation(mockFamilyId, mockParentUid))

      let revocationResult: any
      await act(async () => {
        revocationResult = await result.current.revokeCaregiver(mockCaregiverId, mockCaregiverEmail)
      })

      expect(revocationResult.success).toBe(false)
      expect(revocationResult.error).toBe('Family not found')
      expect(result.current.error).toBe('Family not found')
    })

    it('returns error when caregiver not in family', async () => {
      vi.mocked(firebase.runTransaction).mockImplementation(async (_db, callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({
              guardianUids: [mockParentUid],
              caregivers: [], // Empty - caregiver not found
            }),
          }),
          update: vi.fn(),
        }
        return callback(mockTransaction as any)
      })

      const { result } = renderHook(() => useCaregiverRevocation(mockFamilyId, mockParentUid))

      let revocationResult: any
      await act(async () => {
        revocationResult = await result.current.revokeCaregiver(mockCaregiverId, mockCaregiverEmail)
      })

      expect(revocationResult.success).toBe(false)
      expect(revocationResult.error).toBe('Caregiver not found in family')
    })

    it('returns error when caller is not a guardian', async () => {
      vi.mocked(firebase.runTransaction).mockImplementation(async (_db, callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({
              guardianUids: ['other-parent-id'], // Caller not in list
              caregivers: [mockCaregiverObject],
            }),
          }),
          update: vi.fn(),
        }
        return callback(mockTransaction as any)
      })

      const { result } = renderHook(() => useCaregiverRevocation(mockFamilyId, mockParentUid))

      let revocationResult: any
      await act(async () => {
        revocationResult = await result.current.revokeCaregiver(mockCaregiverId, mockCaregiverEmail)
      })

      expect(revocationResult.success).toBe(false)
      expect(revocationResult.error).toBe('Only family guardians can revoke caregiver access')
    })

    it('returns error when no family ID', async () => {
      const { result } = renderHook(() => useCaregiverRevocation(null, mockParentUid))

      let revocationResult: any
      await act(async () => {
        revocationResult = await result.current.revokeCaregiver(mockCaregiverId, mockCaregiverEmail)
      })

      expect(revocationResult.success).toBe(false)
      expect(revocationResult.error).toBe('No family ID provided')
    })

    it('returns error when not authenticated', async () => {
      const { result } = renderHook(() => useCaregiverRevocation(mockFamilyId, null))

      let revocationResult: any
      await act(async () => {
        revocationResult = await result.current.revokeCaregiver(mockCaregiverId, mockCaregiverEmail)
      })

      expect(revocationResult.success).toBe(false)
      expect(revocationResult.error).toBe('Not authenticated')
    })

    it('handles Firestore errors gracefully', async () => {
      vi.mocked(firebase.runTransaction).mockRejectedValue(new Error('Firestore error'))

      const { result } = renderHook(() => useCaregiverRevocation(mockFamilyId, mockParentUid))

      let revocationResult: any
      await act(async () => {
        revocationResult = await result.current.revokeCaregiver(mockCaregiverId, mockCaregiverEmail)
      })

      expect(revocationResult.success).toBe(false)
      expect(revocationResult.error).toBe('Firestore error')
      expect(result.current.loading).toBe(false)
    })
  })

  describe('clearError', () => {
    it('clears error state', async () => {
      vi.mocked(firebase.runTransaction).mockImplementation(async (_db, callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => false,
            data: () => null,
          }),
          update: vi.fn(),
        }
        return callback(mockTransaction as any)
      })

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
})
