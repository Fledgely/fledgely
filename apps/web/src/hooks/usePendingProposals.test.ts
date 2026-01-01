/**
 * usePendingProposals Hook Tests - Story 34.1
 *
 * Tests for querying and subscribing to pending agreement proposals.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { usePendingProposals } from './usePendingProposals'

// Mock Firestore
const mockOnSnapshot = vi.fn()
const mockCollection = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  query: vi.fn(() => ({ _query: true })),
  where: vi.fn(),
  orderBy: vi.fn(),
}))

vi.mock('../lib/firebase', () => ({
  getFirestoreDb: vi.fn(() => ({})),
}))

describe('usePendingProposals - Story 34.1', () => {
  const defaultProps = {
    familyId: 'family-1',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCollection.mockReturnValue({ _collection: 'agreementProposals' })
    // Default - no pending proposals
    mockOnSnapshot.mockImplementation((_, callback) => {
      callback({ docs: [] })
      return vi.fn() // unsubscribe
    })
  })

  describe('subscription', () => {
    it('should subscribe to pending proposals on mount', () => {
      renderHook(() => usePendingProposals(defaultProps))

      expect(mockOnSnapshot).toHaveBeenCalled()
    })

    it('should unsubscribe on unmount', () => {
      const unsubscribe = vi.fn()
      mockOnSnapshot.mockImplementation(() => unsubscribe)

      const { unmount } = renderHook(() => usePendingProposals(defaultProps))
      unmount()

      expect(unsubscribe).toHaveBeenCalled()
    })
  })

  describe('proposals list', () => {
    it('should return empty array when no pending proposals', async () => {
      const { result } = renderHook(() => usePendingProposals(defaultProps))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.proposals).toEqual([])
    })

    it('should return pending proposals when they exist', async () => {
      const mockProposals = [
        {
          id: 'proposal-1',
          familyId: 'family-1',
          childId: 'child-1',
          status: 'pending',
          proposedBy: 'parent',
          proposerName: 'Mom',
          changes: [],
          createdAt: Date.now(),
        },
        {
          id: 'proposal-2',
          familyId: 'family-1',
          childId: 'child-2',
          status: 'pending',
          proposedBy: 'child',
          proposerName: 'Alex',
          changes: [],
          createdAt: Date.now(),
        },
      ]

      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          docs: mockProposals.map((p) => ({
            id: p.id,
            data: () => p,
          })),
        })
        return vi.fn()
      })

      const { result } = renderHook(() => usePendingProposals(defaultProps))

      await waitFor(() => {
        expect(result.current.proposals).toHaveLength(2)
      })

      expect(result.current.proposals[0].id).toBe('proposal-1')
      expect(result.current.proposals[1].id).toBe('proposal-2')
    })

    it('should filter by childId when provided', async () => {
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

      const { result } = renderHook(() =>
        usePendingProposals({ ...defaultProps, childId: 'child-1' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.proposals).toHaveLength(1)
    })
  })

  describe('loading and error states', () => {
    it('should start with loading true', () => {
      mockOnSnapshot.mockImplementation(() => vi.fn())

      const { result } = renderHook(() => usePendingProposals(defaultProps))

      expect(result.current.loading).toBe(true)
    })

    it('should set loading false after data loads', async () => {
      const { result } = renderHook(() => usePendingProposals(defaultProps))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })

    it('should set error on snapshot error', async () => {
      mockOnSnapshot.mockImplementation((_, __, errorCallback) => {
        errorCallback(new Error('Snapshot error'))
        return vi.fn()
      })

      const { result } = renderHook(() => usePendingProposals(defaultProps))

      await waitFor(() => {
        expect(result.current.error).toBe('Snapshot error')
      })
    })
  })

  describe('proposal counts', () => {
    it('should return count of pending proposals', async () => {
      const mockProposals = [
        { id: '1', status: 'pending' },
        { id: '2', status: 'pending' },
        { id: '3', status: 'pending' },
      ]

      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          docs: mockProposals.map((p) => ({
            id: p.id,
            data: () => p,
          })),
        })
        return vi.fn()
      })

      const { result } = renderHook(() => usePendingProposals(defaultProps))

      await waitFor(() => {
        expect(result.current.count).toBe(3)
      })
    })

    it('should return 0 count when no pending proposals', async () => {
      const { result } = renderHook(() => usePendingProposals(defaultProps))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.count).toBe(0)
    })
  })
})
