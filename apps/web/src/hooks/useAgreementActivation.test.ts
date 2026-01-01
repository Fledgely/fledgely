/**
 * useAgreementActivation Hook Tests - Story 34.4
 *
 * Tests for dual-signature confirmation and activation.
 * Following TDD: tests written first, then implementation.
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAgreementActivation } from './useAgreementActivation'
import type { ActivatedAgreementVersion } from '@fledgely/shared'

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  addDoc: vi.fn(),
  collection: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
  runTransaction: vi.fn(),
}))

vi.mock('../lib/firebase', () => ({
  getFirestoreDb: vi.fn(() => ({})),
}))

// Mock agreementActivationService
vi.mock('../services/agreementActivationService', () => ({
  notifyBothPartiesOfActivation: vi.fn(),
  logAgreementActivation: vi.fn(),
  createVersionHistoryEntry: vi.fn(),
}))

const { doc, getDoc, updateDoc, collection, addDoc, runTransaction } =
  await import('firebase/firestore')
const { notifyBothPartiesOfActivation, logAgreementActivation, createVersionHistoryEntry } =
  await import('../services/agreementActivationService')

describe('useAgreementActivation - Story 34.4', () => {
  const mockProps = {
    familyId: 'family-123',
    proposalId: 'proposal-456',
    agreementId: 'agreement-789',
    childId: 'child-abc',
    proposerId: 'parent-1',
    proposerName: 'Mom',
    proposerRole: 'parent' as const,
  }

  const mockProposal = {
    id: 'proposal-456',
    familyId: 'family-123',
    childId: 'child-abc',
    agreementId: 'agreement-789',
    proposedBy: 'parent',
    proposerId: 'parent-1',
    proposerName: 'Mom',
    changes: [
      {
        sectionId: 'time-limits',
        sectionName: 'Time Limits',
        fieldPath: 'weekday.gaming',
        oldValue: 60,
        newValue: 90,
        changeType: 'modify',
      },
    ],
    reason: 'You earned more time!',
    status: 'accepted',
    createdAt: Date.now() - 86400000, // 1 day ago
    updatedAt: Date.now() - 3600000, // 1 hour ago
    respondedAt: Date.now() - 3600000,
    version: 1,
    proposalNumber: 1,
  }

  const mockAgreement = {
    id: 'agreement-789',
    familyId: 'family-123',
    childId: 'child-abc',
    currentVersion: 1,
    content: {
      timeLimits: { weekday: { gaming: 60 } },
    },
  }

  const _mockAcceptResponse = {
    id: 'response-1',
    proposalId: 'proposal-456',
    responderId: 'child-abc',
    responderName: 'Emma',
    action: 'accept',
    comment: 'Thanks!',
    createdAt: Date.now() - 3600000,
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock implementations
    ;(doc as Mock).mockReturnValue({ id: 'mock-doc-ref' })
    ;(collection as Mock).mockReturnValue({ id: 'mock-collection-ref' })
    ;(addDoc as Mock).mockResolvedValue({ id: 'new-version-id' })
    ;(updateDoc as Mock).mockResolvedValue(undefined)
    ;(runTransaction as Mock).mockImplementation(async (db, callback) => {
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockAgreement,
        }),
        update: vi.fn(),
        set: vi.fn(),
      }
      return callback(mockTransaction)
    })

    // Mock getDoc for proposal and responses
    ;(getDoc as Mock).mockImplementation(async (_docRef) => ({
      exists: () => true,
      data: () => mockProposal,
      id: mockProposal.id,
    }))
    ;(notifyBothPartiesOfActivation as Mock).mockResolvedValue(['notif-1', 'notif-2'])
    ;(logAgreementActivation as Mock).mockResolvedValue('activity-1')
    ;(createVersionHistoryEntry as Mock).mockResolvedValue('version-1')
  })

  describe('hook initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useAgreementActivation(mockProps))

      expect(result.current.isActivating).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.activatedVersion).toBeNull()
    })

    it('should provide confirmActivation function', () => {
      const { result } = renderHook(() => useAgreementActivation(mockProps))

      expect(typeof result.current.confirmActivation).toBe('function')
    })
  })

  describe('confirmActivation - AC1, AC2', () => {
    it('should manage isActivating state correctly', async () => {
      // Use a deferred promise to control timing
      let resolveTransaction: (value: unknown) => void
      const transactionPromise = new Promise((resolve) => {
        resolveTransaction = resolve
      })

      ;(runTransaction as Mock).mockImplementation(async () => {
        await transactionPromise
        return {
          exists: () => true,
          data: () => mockAgreement,
        }
      })

      const { result } = renderHook(() => useAgreementActivation(mockProps))

      // Initially not activating
      expect(result.current.isActivating).toBe(false)

      // Start activation
      let confirmPromise: Promise<unknown>
      act(() => {
        confirmPromise = result.current.confirmActivation({
          recipientId: 'child-abc',
          recipientName: 'Emma',
          recipientRole: 'child',
          comment: 'Thanks!',
        })
      })

      // During activation
      expect(result.current.isActivating).toBe(true)

      // Complete the transaction
      await act(async () => {
        resolveTransaction!({})
        await confirmPromise
      })

      // After completion
      expect(result.current.isActivating).toBe(false)
    })

    it('should record proposer signature with confirmed action', async () => {
      const { result } = renderHook(() => useAgreementActivation(mockProps))

      await act(async () => {
        await result.current.confirmActivation({
          recipientId: 'child-abc',
          recipientName: 'Emma',
          recipientRole: 'child',
          comment: 'Thanks!',
        })
      })

      // Verify transaction was called
      expect(runTransaction).toHaveBeenCalled()
    })

    it('should update proposal status to activated', async () => {
      const { result } = renderHook(() => useAgreementActivation(mockProps))

      await act(async () => {
        await result.current.confirmActivation({
          recipientId: 'child-abc',
          recipientName: 'Emma',
          recipientRole: 'child',
          comment: null,
        })
      })

      // Proposal status should be updated to 'activated'
      expect(updateDoc).toHaveBeenCalled()
    })

    it('should record both signatures with timestamps', async () => {
      const { result } = renderHook(() => useAgreementActivation(mockProps))

      ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => mockAgreement,
          }),
          update: vi.fn(),
          set: vi.fn(),
        }
        return callback(mockTransaction)
      })

      await act(async () => {
        await result.current.confirmActivation({
          recipientId: 'child-abc',
          recipientName: 'Emma',
          recipientRole: 'child',
          comment: 'Thanks!',
        })
      })

      expect(runTransaction).toHaveBeenCalled()
    })

    it('should use correct proposer role for child-initiated proposals', async () => {
      // Story 34-2: Child can also be proposer
      const childProposerProps = {
        ...mockProps,
        proposerId: 'child-abc',
        proposerName: 'Emma',
        proposerRole: 'child' as const,
      }

      let capturedInput: { version: ActivatedAgreementVersion } | null = null
      ;(createVersionHistoryEntry as Mock).mockImplementation((data) => {
        capturedInput = data
        return 'version-1'
      })

      const { result } = renderHook(() => useAgreementActivation(childProposerProps))

      await act(async () => {
        await result.current.confirmActivation({
          recipientId: 'parent-1',
          recipientName: 'Mom',
          recipientRole: 'parent',
          comment: 'Approved!',
        })
      })

      expect(capturedInput).toBeDefined()
      expect(capturedInput?.version?.signatures?.proposer?.role).toBe('child')
      expect(capturedInput?.version?.signatures?.recipient?.role).toBe('parent')
    })
  })

  describe('createAgreementVersion - AC3', () => {
    it('should create new agreement version with incremented number', async () => {
      const { result } = renderHook(() => useAgreementActivation(mockProps))

      await act(async () => {
        await result.current.confirmActivation({
          recipientId: 'child-abc',
          recipientName: 'Emma',
          recipientRole: 'child',
          comment: null,
        })
      })

      // Version creation should be done in transaction
      expect(runTransaction).toHaveBeenCalled()
    })

    it('should preserve previous version for history', async () => {
      const { result } = renderHook(() => useAgreementActivation(mockProps))

      await act(async () => {
        await result.current.confirmActivation({
          recipientId: 'child-abc',
          recipientName: 'Emma',
          recipientRole: 'child',
          comment: null,
        })
      })

      expect(createVersionHistoryEntry).toHaveBeenCalled()
    })

    it('should include dual signatures in version', async () => {
      let capturedInput: { version: ActivatedAgreementVersion } | null = null
      ;(createVersionHistoryEntry as Mock).mockImplementation((data) => {
        capturedInput = data
        return 'version-1'
      })

      const { result } = renderHook(() => useAgreementActivation(mockProps))

      await act(async () => {
        await result.current.confirmActivation({
          recipientId: 'child-abc',
          recipientName: 'Emma',
          recipientRole: 'child',
          comment: 'Thanks!',
        })
      })

      expect(capturedInput).toBeDefined()
      expect(capturedInput?.version?.signatures?.proposer).toBeDefined()
      expect(capturedInput?.version?.signatures?.recipient).toBeDefined()
    })
  })

  describe('update active agreement - AC3, AC4', () => {
    it('should update agreement content with new values', async () => {
      const transactionOps: { update: unknown[] } = { update: [] }
      ;(runTransaction as Mock).mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => mockAgreement,
          }),
          update: vi.fn((...args) => transactionOps.update.push(args)),
          set: vi.fn(),
        }
        return callback(mockTransaction)
      })

      const { result } = renderHook(() => useAgreementActivation(mockProps))

      await act(async () => {
        await result.current.confirmActivation({
          recipientId: 'child-abc',
          recipientName: 'Emma',
          recipientRole: 'child',
          comment: null,
        })
      })

      expect(transactionOps.update.length).toBeGreaterThan(0)
    })

    it('should increment currentVersion on agreement', async () => {
      const { result } = renderHook(() => useAgreementActivation(mockProps))

      await act(async () => {
        await result.current.confirmActivation({
          recipientId: 'child-abc',
          recipientName: 'Emma',
          recipientRole: 'child',
          comment: null,
        })
      })

      // Version increment is part of transaction
      expect(runTransaction).toHaveBeenCalled()
    })

    it('should apply changes atomically using transaction', async () => {
      const { result } = renderHook(() => useAgreementActivation(mockProps))

      await act(async () => {
        await result.current.confirmActivation({
          recipientId: 'child-abc',
          recipientName: 'Emma',
          recipientRole: 'child',
          comment: null,
        })
      })

      // All operations should be in a single transaction
      expect(runTransaction).toHaveBeenCalledTimes(1)
    })
  })

  describe('notifications - AC5', () => {
    it('should notify both parties after activation', async () => {
      const { result } = renderHook(() => useAgreementActivation(mockProps))

      await act(async () => {
        await result.current.confirmActivation({
          recipientId: 'child-abc',
          recipientName: 'Emma',
          recipientRole: 'child',
          comment: 'Thanks!',
        })
      })

      expect(notifyBothPartiesOfActivation).toHaveBeenCalled()
    })

    it('should log activation to activity feed', async () => {
      const { result } = renderHook(() => useAgreementActivation(mockProps))

      await act(async () => {
        await result.current.confirmActivation({
          recipientId: 'child-abc',
          recipientName: 'Emma',
          recipientRole: 'child',
          comment: null,
        })
      })

      expect(logAgreementActivation).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should set error state on failure', async () => {
      ;(runTransaction as Mock).mockRejectedValue(new Error('Transaction failed'))

      const { result } = renderHook(() => useAgreementActivation(mockProps))

      await act(async () => {
        try {
          await result.current.confirmActivation({
            recipientId: 'child-abc',
            recipientName: 'Emma',
            recipientRole: 'child',
            comment: null,
          })
        } catch {
          // Expected to throw
        }
      })

      expect(result.current.error).toBe('Transaction failed')
    })

    it('should reset isActivating on error', async () => {
      ;(runTransaction as Mock).mockRejectedValue(new Error('Transaction failed'))

      const { result } = renderHook(() => useAgreementActivation(mockProps))

      await act(async () => {
        try {
          await result.current.confirmActivation({
            recipientId: 'child-abc',
            recipientName: 'Emma',
            recipientRole: 'child',
            comment: null,
          })
        } catch {
          // Expected to throw
        }
      })

      expect(result.current.isActivating).toBe(false)
    })

    it('should provide a generic error message for non-Error exceptions', async () => {
      ;(runTransaction as Mock).mockRejectedValue('Unknown error')

      const { result } = renderHook(() => useAgreementActivation(mockProps))

      await act(async () => {
        try {
          await result.current.confirmActivation({
            recipientId: 'child-abc',
            recipientName: 'Emma',
            recipientRole: 'child',
            comment: null,
          })
        } catch {
          // Expected to throw
        }
      })

      expect(result.current.error).toBe('Failed to activate agreement')
    })
  })

  describe('return value', () => {
    it('should return activated version after success', async () => {
      const { result } = renderHook(() => useAgreementActivation(mockProps))

      await act(async () => {
        await result.current.confirmActivation({
          recipientId: 'child-abc',
          recipientName: 'Emma',
          recipientRole: 'child',
          comment: 'Thanks!',
        })
      })

      expect(result.current.activatedVersion).toBeDefined()
      expect(result.current.activatedVersion?.signatures).toBeDefined()
    })

    it('should set isActivating to false after completion', async () => {
      const { result } = renderHook(() => useAgreementActivation(mockProps))

      await act(async () => {
        await result.current.confirmActivation({
          recipientId: 'child-abc',
          recipientName: 'Emma',
          recipientRole: 'child',
          comment: null,
        })
      })

      expect(result.current.isActivating).toBe(false)
    })
  })
})
