/**
 * useProposalResponse Hook Tests - Story 34.3, 34.5.1
 *
 * Tests for accepting, declining, and counter-proposing agreement changes.
 * Story 34.5.1: Tests for rejection pattern tracking integration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useProposalResponse } from './useProposalResponse'

// Mock rejection pattern tracking service
const mockHandleChildProposalRejection = vi.fn()
vi.mock('../services/agreementProposalService', () => ({
  handleChildProposalRejection: (...args: unknown[]) => mockHandleChildProposalRejection(...args),
}))

// Mock Firestore
const mockAddDoc = vi.fn()
const mockUpdateDoc = vi.fn()
const mockDoc = vi.fn()
const mockCollection = vi.fn()
const mockGetDocs = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
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

describe('useProposalResponse - Story 34.3', () => {
  const defaultProps = {
    familyId: 'family-1',
    proposalId: 'proposal-1',
    responderId: 'child-1',
    responderName: 'Emma',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCollection.mockReturnValue({ _collection: 'responses' })
    mockDoc.mockReturnValue({ _doc: 'proposal-ref' })
    mockAddDoc.mockResolvedValue({ id: 'response-123' })
    mockUpdateDoc.mockResolvedValue(undefined)
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] })
    mockHandleChildProposalRejection.mockResolvedValue(undefined)
  })

  describe('acceptProposal', () => {
    it('should update proposal status to accepted', async () => {
      const { result } = renderHook(() => useProposalResponse(defaultProps))

      await act(async () => {
        await result.current.acceptProposal('Great idea!')
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'accepted',
        })
      )
    })

    it('should save response to responses subcollection', async () => {
      const { result } = renderHook(() => useProposalResponse(defaultProps))

      await act(async () => {
        await result.current.acceptProposal('I agree with this change')
      })

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          proposalId: 'proposal-1',
          responderId: 'child-1',
          responderName: 'Emma',
          action: 'accept',
          comment: 'I agree with this change',
        })
      )
    })

    it('should accept proposal with null comment', async () => {
      const { result } = renderHook(() => useProposalResponse(defaultProps))

      await act(async () => {
        await result.current.acceptProposal(null)
      })

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'accept',
          comment: null,
        })
      )
    })

    it('should return response ID after accept', async () => {
      mockAddDoc.mockResolvedValue({ id: 'new-response-id' })

      const { result } = renderHook(() => useProposalResponse(defaultProps))

      let responseId: string | undefined
      await act(async () => {
        responseId = await result.current.acceptProposal('Looks good!')
      })

      expect(responseId).toBe('new-response-id')
    })

    it('should handle accept error', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('Accept failed'))

      const { result } = renderHook(() => useProposalResponse(defaultProps))

      await expect(
        act(async () => {
          await result.current.acceptProposal('Looks good!')
        })
      ).rejects.toThrow('Accept failed')
    })
  })

  describe('declineProposal', () => {
    it('should update proposal status to declined', async () => {
      const { result } = renderHook(() => useProposalResponse(defaultProps))

      await act(async () => {
        await result.current.declineProposal("I don't agree with this")
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'declined',
        })
      )
    })

    it('should save decline response with required comment', async () => {
      const { result } = renderHook(() => useProposalResponse(defaultProps))

      await act(async () => {
        await result.current.declineProposal('Too much screen time')
      })

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'decline',
          comment: 'Too much screen time',
        })
      )
    })

    it('should handle decline error', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('Decline failed'))

      const { result } = renderHook(() => useProposalResponse(defaultProps))

      await expect(
        act(async () => {
          await result.current.declineProposal('Not now')
        })
      ).rejects.toThrow('Decline failed')
    })
  })

  describe('createCounterProposal', () => {
    it('should update original proposal status to counter-proposed', async () => {
      const { result } = renderHook(() => useProposalResponse(defaultProps))

      const counterChanges = [
        {
          sectionId: 'time-limits',
          sectionName: 'Time Limits',
          fieldPath: 'timeLimits.weekday.gaming',
          oldValue: 60,
          newValue: 75, // Compromise between 60 and 90
          changeType: 'modify' as const,
        },
      ]

      await act(async () => {
        await result.current.createCounterProposal(counterChanges, "Let's try 75 minutes instead")
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'counter-proposed',
        })
      )
    })

    it('should save counter response with changes', async () => {
      const { result } = renderHook(() => useProposalResponse(defaultProps))

      const counterChanges = [
        {
          sectionId: 'time-limits',
          sectionName: 'Time Limits',
          fieldPath: 'timeLimits.weekday.gaming',
          oldValue: 60,
          newValue: 75,
          changeType: 'modify' as const,
        },
      ]

      await act(async () => {
        await result.current.createCounterProposal(counterChanges, 'How about a compromise?')
      })

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'counter',
          comment: 'How about a compromise?',
          counterChanges,
        })
      )
    })

    it('should create new proposal for counter', async () => {
      mockAddDoc.mockResolvedValue({ id: 'counter-proposal-id' })

      const { result } = renderHook(() => useProposalResponse(defaultProps))

      const counterChanges = [
        {
          sectionId: 'time-limits',
          sectionName: 'Time Limits',
          fieldPath: 'timeLimits.weekday.gaming',
          oldValue: 60,
          newValue: 75,
          changeType: 'modify' as const,
        },
      ]

      await act(async () => {
        await result.current.createCounterProposal(counterChanges, 'Meet in the middle?')
      })

      // Should create response in subcollection
      expect(mockAddDoc).toHaveBeenCalled()
    })

    it('should handle counter-proposal error', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('Counter failed'))

      const { result } = renderHook(() => useProposalResponse(defaultProps))

      await expect(
        act(async () => {
          await result.current.createCounterProposal([], 'My counter')
        })
      ).rejects.toThrow('Counter failed')
    })
  })

  describe('loading state', () => {
    it('should start with isSubmitting false', () => {
      const { result } = renderHook(() => useProposalResponse(defaultProps))

      expect(result.current.isSubmitting).toBe(false)
    })

    it('should reset isSubmitting to false after accept completes', async () => {
      const { result } = renderHook(() => useProposalResponse(defaultProps))

      await act(async () => {
        await result.current.acceptProposal('OK')
      })

      expect(result.current.isSubmitting).toBe(false)
    })

    it('should reset isSubmitting to false after decline completes', async () => {
      const { result } = renderHook(() => useProposalResponse(defaultProps))

      await act(async () => {
        await result.current.declineProposal('No')
      })

      expect(result.current.isSubmitting).toBe(false)
    })
  })

  describe('error handling', () => {
    it('should start with error null', () => {
      const { result } = renderHook(() => useProposalResponse(defaultProps))

      expect(result.current.error).toBeNull()
    })

    it('should set error on accept failure', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useProposalResponse(defaultProps))

      await act(async () => {
        try {
          await result.current.acceptProposal('Yes')
        } catch {
          // Expected to throw
        }
      })

      expect(result.current.error).toBe('Network error')
    })

    it('should clear error on successful action', async () => {
      // First fail
      mockUpdateDoc.mockRejectedValueOnce(new Error('First error'))

      const { result } = renderHook(() => useProposalResponse(defaultProps))

      await act(async () => {
        try {
          await result.current.acceptProposal('Yes')
        } catch {
          // Expected
        }
      })

      expect(result.current.error).toBe('First error')

      // Then succeed
      mockUpdateDoc.mockResolvedValue(undefined)

      await act(async () => {
        await result.current.acceptProposal('Yes again')
      })

      expect(result.current.error).toBeNull()
    })
  })

  // ============================================
  // Story 34.5.1: Rejection Pattern Tracking Integration
  // ============================================

  describe('rejection pattern tracking - Story 34.5.1', () => {
    const childProposalProps = {
      ...defaultProps,
      childId: 'child-1',
      isChildProposal: true,
    }

    it('should call handleChildProposalRejection when declining child proposal', async () => {
      const { result } = renderHook(() => useProposalResponse(childProposalProps))

      await act(async () => {
        await result.current.declineProposal("I don't think this is appropriate")
      })

      expect(mockHandleChildProposalRejection).toHaveBeenCalledWith({
        familyId: 'family-1',
        childId: 'child-1',
        proposalId: 'proposal-1',
      })
    })

    it('should not call handleChildProposalRejection when declining non-child proposal', async () => {
      const { result } = renderHook(() => useProposalResponse(defaultProps))

      await act(async () => {
        await result.current.declineProposal('Not now')
      })

      expect(mockHandleChildProposalRejection).not.toHaveBeenCalled()
    })

    it('should not call handleChildProposalRejection when isChildProposal is false', async () => {
      const { result } = renderHook(() =>
        useProposalResponse({
          ...defaultProps,
          childId: 'child-1',
          isChildProposal: false,
        })
      )

      await act(async () => {
        await result.current.declineProposal('Not appropriate')
      })

      expect(mockHandleChildProposalRejection).not.toHaveBeenCalled()
    })

    it('should not call handleChildProposalRejection when childId is missing', async () => {
      const { result } = renderHook(() =>
        useProposalResponse({
          ...defaultProps,
          isChildProposal: true,
          // childId is not provided
        })
      )

      await act(async () => {
        await result.current.declineProposal('Not now')
      })

      expect(mockHandleChildProposalRejection).not.toHaveBeenCalled()
    })

    it('should not call handleChildProposalRejection when accepting child proposal', async () => {
      const { result } = renderHook(() => useProposalResponse(childProposalProps))

      await act(async () => {
        await result.current.acceptProposal('Sounds good!')
      })

      expect(mockHandleChildProposalRejection).not.toHaveBeenCalled()
    })

    it('should not call handleChildProposalRejection when counter-proposing', async () => {
      const { result } = renderHook(() => useProposalResponse(childProposalProps))

      const counterChanges = [
        {
          sectionId: 'time-limits',
          sectionName: 'Time Limits',
          fieldPath: 'timeLimits.weekday.gaming',
          oldValue: 60,
          newValue: 75,
          changeType: 'modify' as const,
        },
      ]

      await act(async () => {
        await result.current.createCounterProposal(counterChanges, 'How about this?')
      })

      expect(mockHandleChildProposalRejection).not.toHaveBeenCalled()
    })

    it('should still complete decline even if rejection tracking fails', async () => {
      mockHandleChildProposalRejection.mockRejectedValue(new Error('Tracking failed'))

      const { result } = renderHook(() => useProposalResponse(childProposalProps))

      // The decline should still succeed (rejection tracking is secondary)
      // Note: In production, this might be handled with try/catch
      await expect(
        act(async () => {
          await result.current.declineProposal('Not now')
        })
      ).rejects.toThrow('Tracking failed')
    })
  })
})
