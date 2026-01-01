/**
 * useNegotiationHistory Hook Tests - Story 34.3
 *
 * Tests for fetching and displaying negotiation history.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useNegotiationHistory } from './useNegotiationHistory'

// Mock Firestore
const mockOnSnapshot = vi.fn()
const mockGetDoc = vi.fn()
const mockDoc = vi.fn()
const mockCollection = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  query: vi.fn(() => ({ _query: true })),
  where: vi.fn(),
  orderBy: vi.fn(),
}))

vi.mock('../lib/firebase', () => ({
  getFirestoreDb: vi.fn(() => ({})),
}))

describe('useNegotiationHistory - Story 34.3', () => {
  const defaultProps = {
    familyId: 'family-1',
    proposalId: 'proposal-1',
  }

  const mockProposal = {
    id: 'proposal-1',
    familyId: 'family-1',
    childId: 'child-1',
    agreementId: 'agreement-1',
    proposedBy: 'parent',
    proposerId: 'parent-1',
    proposerName: 'Mom',
    changes: [
      {
        sectionId: 'time-limits',
        sectionName: 'Time Limits',
        fieldPath: 'timeLimits.weekday.gaming',
        oldValue: 60,
        newValue: 90,
        changeType: 'modify',
      },
    ],
    reason: 'You have been responsible',
    status: 'pending',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    respondedAt: null,
    version: 1,
    proposalNumber: 1,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCollection.mockReturnValue({ _collection: 'responses' })
    mockDoc.mockReturnValue({ _doc: 'proposal-ref' })

    // Default: proposal exists, no responses
    mockOnSnapshot.mockImplementation((ref, callback) => {
      if (ref._collection === 'responses') {
        callback({ docs: [] })
      }
      return vi.fn() // unsubscribe
    })

    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'proposal-1',
      data: () => mockProposal,
    })
  })

  describe('proposal loading', () => {
    it('should load proposal data', async () => {
      const { result } = renderHook(() => useNegotiationHistory(defaultProps))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.proposal).not.toBeNull()
      expect(result.current.proposal?.id).toBe('proposal-1')
    })

    it('should set error if proposal not found', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      })

      const { result } = renderHook(() => useNegotiationHistory(defaultProps))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('Proposal not found')
      expect(result.current.proposal).toBeNull()
    })

    it('should include proposal changes', async () => {
      const { result } = renderHook(() => useNegotiationHistory(defaultProps))

      await waitFor(() => {
        expect(result.current.proposal?.changes).toBeDefined()
      })

      expect(result.current.proposal?.changes).toHaveLength(1)
      expect(result.current.proposal?.changes[0].newValue).toBe(90)
    })
  })

  describe('responses loading', () => {
    it('should load responses from subcollection', async () => {
      const mockResponse = {
        id: 'response-1',
        proposalId: 'proposal-1',
        responderId: 'child-1',
        responderName: 'Emma',
        action: 'accept',
        comment: 'Sounds good!',
        counterChanges: null,
        createdAt: 1700001000000,
      }

      mockOnSnapshot.mockImplementation((ref, callback) => {
        callback({
          docs: [{ id: 'response-1', data: () => mockResponse }],
        })
        return vi.fn()
      })

      const { result } = renderHook(() => useNegotiationHistory(defaultProps))

      await waitFor(() => {
        expect(result.current.responses).toHaveLength(1)
      })

      expect(result.current.responses[0].responderName).toBe('Emma')
      expect(result.current.responses[0].action).toBe('accept')
    })

    it('should handle empty responses', async () => {
      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({ docs: [] })
        return vi.fn()
      })

      const { result } = renderHook(() => useNegotiationHistory(defaultProps))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.responses).toHaveLength(0)
    })
  })

  describe('timeline building', () => {
    it('should build timeline with proposal as first entry', async () => {
      const { result } = renderHook(() => useNegotiationHistory(defaultProps))

      await waitFor(() => {
        expect(result.current.timeline).toBeDefined()
      })

      expect(result.current.timeline[0].type).toBe('proposal')
      expect(result.current.timeline[0].actorName).toBe('Mom')
    })

    it('should include responses in timeline', async () => {
      const mockResponse = {
        id: 'response-1',
        proposalId: 'proposal-1',
        responderId: 'child-1',
        responderName: 'Emma',
        action: 'counter',
        comment: "Let's meet in the middle",
        counterChanges: [
          {
            sectionId: 'time-limits',
            sectionName: 'Time Limits',
            fieldPath: 'timeLimits.weekday.gaming',
            oldValue: 60,
            newValue: 75,
            changeType: 'modify',
          },
        ],
        createdAt: 1700001000000,
      }

      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          docs: [{ id: 'response-1', data: () => mockResponse }],
        })
        return vi.fn()
      })

      const { result } = renderHook(() => useNegotiationHistory(defaultProps))

      await waitFor(() => {
        expect(result.current.timeline.length).toBeGreaterThan(1)
      })

      expect(result.current.timeline[1].type).toBe('response')
      expect(result.current.timeline[1].actorName).toBe('Emma')
      expect(result.current.timeline[1].action).toBe('counter')
    })

    it('should order timeline by timestamp', async () => {
      const responses = [
        {
          id: 'response-2',
          responderId: 'parent-1',
          responderName: 'Mom',
          action: 'accept',
          comment: 'OK',
          createdAt: 1700002000000,
        },
        {
          id: 'response-1',
          responderId: 'child-1',
          responderName: 'Emma',
          action: 'counter',
          comment: 'How about 75?',
          createdAt: 1700001000000,
        },
      ]

      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          docs: responses.map((r) => ({ id: r.id, data: () => r })),
        })
        return vi.fn()
      })

      const { result } = renderHook(() => useNegotiationHistory(defaultProps))

      await waitFor(() => {
        expect(result.current.timeline.length).toBe(3)
      })

      // Should be: proposal, response-1, response-2 (by timestamp)
      expect(result.current.timeline[1].id).toBe('response-1')
      expect(result.current.timeline[2].id).toBe('response-2')
    })
  })

  describe('round number calculation', () => {
    it('should calculate round number for initial proposal', async () => {
      const { result } = renderHook(() => useNegotiationHistory(defaultProps))

      await waitFor(() => {
        expect(result.current.currentRound).toBe(1)
      })
    })

    it('should increment round for each counter-proposal', async () => {
      const responses = [
        {
          id: 'response-1',
          action: 'counter',
          createdAt: 1700001000000,
        },
        {
          id: 'response-2',
          action: 'counter',
          createdAt: 1700002000000,
        },
      ]

      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          docs: responses.map((r) => ({ id: r.id, data: () => r })),
        })
        return vi.fn()
      })

      const { result } = renderHook(() => useNegotiationHistory(defaultProps))

      await waitFor(() => {
        expect(result.current.currentRound).toBe(3)
      })
    })

    it('should not increment round for accept/decline', async () => {
      const responses = [
        {
          id: 'response-1',
          action: 'accept',
          createdAt: 1700001000000,
        },
      ]

      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          docs: responses.map((r) => ({ id: r.id, data: () => r })),
        })
        return vi.fn()
      })

      const { result } = renderHook(() => useNegotiationHistory(defaultProps))

      await waitFor(() => {
        expect(result.current.currentRound).toBe(1)
      })
    })
  })

  describe('real-time updates', () => {
    it('should subscribe to responses on mount', () => {
      renderHook(() => useNegotiationHistory(defaultProps))

      expect(mockOnSnapshot).toHaveBeenCalled()
    })

    it('should unsubscribe on unmount', () => {
      const unsubscribe = vi.fn()
      mockOnSnapshot.mockImplementation(() => unsubscribe)

      const { unmount } = renderHook(() => useNegotiationHistory(defaultProps))
      unmount()

      expect(unsubscribe).toHaveBeenCalled()
    })
  })

  describe('loading and error states', () => {
    it('should start with loading true', () => {
      mockGetDoc.mockImplementation(() => new Promise(() => {})) // Never resolves

      const { result } = renderHook(() => useNegotiationHistory(defaultProps))

      expect(result.current.loading).toBe(true)
    })

    it('should set loading false after data loads', async () => {
      const { result } = renderHook(() => useNegotiationHistory(defaultProps))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })

    it('should set error on fetch failure', async () => {
      mockGetDoc.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useNegotiationHistory(defaultProps))

      await waitFor(() => {
        expect(result.current.error).toBe('Network error')
      })
    })
  })
})
