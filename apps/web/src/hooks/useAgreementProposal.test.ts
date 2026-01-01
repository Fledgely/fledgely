/**
 * useAgreementProposal Hook Tests - Story 34.1
 *
 * Tests for creating and managing agreement change proposals.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAgreementProposal } from './useAgreementProposal'

// Mock Firestore
const mockAddDoc = vi.fn()
const mockUpdateDoc = vi.fn()
const mockOnSnapshot = vi.fn()
const mockDoc = vi.fn()
const mockCollection = vi.fn()
const mockGetDocs = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  serverTimestamp: () => ({ _serverTimestamp: true }),
  query: vi.fn(() => ({ _query: true })),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
}))

vi.mock('../lib/firebase', () => ({
  getFirestoreDb: vi.fn(() => ({})),
}))

describe('useAgreementProposal - Story 34.1', () => {
  const defaultProps = {
    familyId: 'family-1',
    childId: 'child-1',
    agreementId: 'agreement-1',
    proposerId: 'parent-1',
    proposerName: 'Mom',
    proposedBy: 'parent' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock collection to return a reference object
    mockCollection.mockReturnValue({ _collection: 'agreementProposals' })
    // Mock doc to return a reference object
    mockDoc.mockReturnValue({ _doc: 'proposal-ref' })
    mockAddDoc.mockResolvedValue({ id: 'proposal-123' })
    mockUpdateDoc.mockResolvedValue(undefined)
    // Mock getDocs for proposal number query (empty = first proposal)
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] })
    // Default onSnapshot behavior - no existing proposals
    mockOnSnapshot.mockImplementation((_, callback) => {
      callback({ docs: [] })
      return vi.fn() // unsubscribe
    })
  })

  describe('createProposal', () => {
    it('should create a proposal with changes and reason', async () => {
      const { result } = renderHook(() => useAgreementProposal(defaultProps))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const changes = [
        {
          sectionId: 'time-limits',
          sectionName: 'Time Limits',
          fieldPath: 'timeLimits.weekday.gaming',
          oldValue: 60,
          newValue: 90,
          changeType: 'modify' as const,
        },
      ]

      await result.current.createProposal(changes, "You've been responsible")

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          familyId: 'family-1',
          childId: 'child-1',
          agreementId: 'agreement-1',
          proposedBy: 'parent',
          proposerId: 'parent-1',
          proposerName: 'Mom',
          changes,
          reason: "You've been responsible",
          status: 'pending',
        })
      )
    })

    it('should create a proposal with null reason', async () => {
      const { result } = renderHook(() => useAgreementProposal(defaultProps))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const changes = [
        {
          sectionId: 'time-limits',
          sectionName: 'Time Limits',
          fieldPath: 'timeLimits.weekday.gaming',
          oldValue: 60,
          newValue: 90,
          changeType: 'modify' as const,
        },
      ]

      await result.current.createProposal(changes, null)

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          reason: null,
        })
      )
    })

    it('should return proposal ID after creation', async () => {
      mockAddDoc.mockResolvedValue({ id: 'new-proposal-id' })

      const { result } = renderHook(() => useAgreementProposal(defaultProps))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const proposalId = await result.current.createProposal([], null)

      expect(proposalId).toBe('new-proposal-id')
    })

    it('should handle creation error', async () => {
      mockAddDoc.mockRejectedValue(new Error('Firestore error'))

      const { result } = renderHook(() => useAgreementProposal(defaultProps))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await expect(result.current.createProposal([], null)).rejects.toThrow('Firestore error')
    })
  })

  describe('withdrawProposal', () => {
    it('should update proposal status to withdrawn', async () => {
      const { result } = renderHook(() => useAgreementProposal(defaultProps))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await result.current.withdrawProposal('proposal-123')

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'withdrawn',
        })
      )
    })

    it('should handle withdraw error', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('Withdraw failed'))

      const { result } = renderHook(() => useAgreementProposal(defaultProps))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await expect(result.current.withdrawProposal('proposal-123')).rejects.toThrow(
        'Withdraw failed'
      )
    })
  })

  describe('real-time sync', () => {
    it('should subscribe to proposals on mount', () => {
      renderHook(() => useAgreementProposal(defaultProps))

      expect(mockOnSnapshot).toHaveBeenCalled()
    })

    it('should unsubscribe on unmount', () => {
      const unsubscribe = vi.fn()
      mockOnSnapshot.mockImplementation(() => unsubscribe)

      const { unmount } = renderHook(() => useAgreementProposal(defaultProps))
      unmount()

      expect(unsubscribe).toHaveBeenCalled()
    })

    it('should update pendingProposal when data changes', async () => {
      const mockProposal = {
        id: 'proposal-1',
        familyId: 'family-1',
        childId: 'child-1',
        status: 'pending',
        proposedBy: 'parent',
        changes: [],
      }

      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          docs: [{ id: 'proposal-1', data: () => mockProposal }],
        })
        return vi.fn()
      })

      const { result } = renderHook(() => useAgreementProposal(defaultProps))

      await waitFor(() => {
        expect(result.current.pendingProposal).not.toBeNull()
      })

      expect(result.current.pendingProposal?.id).toBe('proposal-1')
    })

    it('should set pendingProposal to null when no pending proposals', async () => {
      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({ docs: [] })
        return vi.fn()
      })

      const { result } = renderHook(() => useAgreementProposal(defaultProps))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.pendingProposal).toBeNull()
    })
  })

  describe('loading and error states', () => {
    it('should start with loading true', () => {
      mockOnSnapshot.mockImplementation(() => vi.fn())

      const { result } = renderHook(() => useAgreementProposal(defaultProps))

      expect(result.current.loading).toBe(true)
    })

    it('should set loading false after data loads', async () => {
      const { result } = renderHook(() => useAgreementProposal(defaultProps))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })

    it('should set error on snapshot error', async () => {
      mockOnSnapshot.mockImplementation((_, __, errorCallback) => {
        errorCallback(new Error('Snapshot error'))
        return vi.fn()
      })

      const { result } = renderHook(() => useAgreementProposal(defaultProps))

      await waitFor(() => {
        expect(result.current.error).toBe('Snapshot error')
      })
    })
  })
})
