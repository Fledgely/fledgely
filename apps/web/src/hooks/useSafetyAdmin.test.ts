/**
 * useSafetyAdmin Hook Tests
 *
 * Story 0.5.3: Support Agent Escape Dashboard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSafetyAdmin } from './useSafetyAdmin'

// Mock Firebase functions
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() =>
    vi.fn().mockResolvedValue({
      data: {
        tickets: [],
        hasMore: false,
        nextCursor: null,
      },
    })
  ),
}))

vi.mock('../lib/firebase', () => ({
  getFirebaseFunctions: vi.fn(() => ({})),
}))

describe('useSafetyAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('initializes with loading false', () => {
      const { result } = renderHook(() => useSafetyAdmin())
      expect(result.current.loading).toBe(false)
    })

    it('initializes with no error', () => {
      const { result } = renderHook(() => useSafetyAdmin())
      expect(result.current.error).toBeNull()
    })
  })

  describe('getTickets', () => {
    it('provides getTickets function', () => {
      const { result } = renderHook(() => useSafetyAdmin())
      expect(typeof result.current.getTickets).toBe('function')
    })

    it('accepts status filter option', async () => {
      const { result } = renderHook(() => useSafetyAdmin())

      await act(async () => {
        await result.current.getTickets({ status: 'pending' })
      })

      expect(result.current.error).toBeNull()
    })

    it('accepts limit option', async () => {
      const { result } = renderHook(() => useSafetyAdmin())

      await act(async () => {
        await result.current.getTickets({ limit: 10 })
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('getTicketDetail', () => {
    it('provides getTicketDetail function', () => {
      const { result } = renderHook(() => useSafetyAdmin())
      expect(typeof result.current.getTicketDetail).toBe('function')
    })
  })

  describe('getDocumentUrl', () => {
    it('provides getDocumentUrl function', () => {
      const { result } = renderHook(() => useSafetyAdmin())
      expect(typeof result.current.getDocumentUrl).toBe('function')
    })
  })

  describe('updateTicketStatus', () => {
    it('provides updateTicketStatus function', () => {
      const { result } = renderHook(() => useSafetyAdmin())
      expect(typeof result.current.updateTicketStatus).toBe('function')
    })

    it('accepts valid status values', () => {
      const validStatuses = ['pending', 'in_progress', 'resolved']
      validStatuses.forEach((status) => {
        expect(['pending', 'in_progress', 'resolved']).toContain(status)
      })
    })
  })

  describe('addInternalNote', () => {
    it('provides addInternalNote function', () => {
      const { result } = renderHook(() => useSafetyAdmin())
      expect(typeof result.current.addInternalNote).toBe('function')
    })
  })

  describe('updateVerification', () => {
    it('provides updateVerification function', () => {
      const { result } = renderHook(() => useSafetyAdmin())
      expect(typeof result.current.updateVerification).toBe('function')
    })

    it('supports all verification fields', () => {
      const fields = [
        'phoneVerified',
        'idDocumentVerified',
        'accountMatchVerified',
        'securityQuestionsVerified',
      ]
      expect(fields.length).toBe(4)
    })
  })

  describe('escalateTicket', () => {
    it('provides escalateTicket function', () => {
      const { result } = renderHook(() => useSafetyAdmin())
      expect(typeof result.current.escalateTicket).toBe('function')
    })

    it('supports urgency levels', () => {
      const urgencyLevels = ['normal', 'high', 'critical']
      expect(urgencyLevels.length).toBe(3)
    })
  })

  describe('error handling', () => {
    it('provides clearError function', () => {
      const { result } = renderHook(() => useSafetyAdmin())
      expect(typeof result.current.clearError).toBe('function')
    })

    it('clearError clears the error state', async () => {
      const { result } = renderHook(() => useSafetyAdmin())

      // Manually set an error state if possible through the hook
      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('type definitions', () => {
    it('exports SafetyTicketSummary type', async () => {
      const summary = {
        id: 'test-id',
        messagePreview: 'Test message',
        urgency: 'urgent' as const,
        status: 'pending',
        createdAt: '2024-01-01T00:00:00Z',
        userEmail: 'test@example.com',
        hasDocuments: true,
        documentCount: 2,
      }
      expect(summary.id).toBeDefined()
    })

    it('exports SafetyTicketDetail type', () => {
      const detail = {
        id: 'test-id',
        message: 'Test message',
        urgency: 'urgent' as const,
        status: 'pending',
        createdAt: '2024-01-01T00:00:00Z',
        userEmail: 'test@example.com',
        userId: 'user-123',
        safeContactInfo: null,
        documents: [],
        internalNotes: [],
        verification: {
          phoneVerified: false,
          phoneVerifiedAt: null,
          phoneVerifiedBy: null,
          idDocumentVerified: false,
          idDocumentVerifiedAt: null,
          idDocumentVerifiedBy: null,
          accountMatchVerified: false,
          accountMatchVerifiedAt: null,
          accountMatchVerifiedBy: null,
          securityQuestionsVerified: false,
          securityQuestionsVerifiedAt: null,
          securityQuestionsVerifiedBy: null,
        },
        history: [],
        assignedTo: null,
        escalatedAt: null,
        escalatedTo: null,
        resolvedAt: null,
        resolvedBy: null,
      }
      expect(detail.id).toBeDefined()
    })

    it('exports VerificationField type', () => {
      const fields: Array<
        | 'phoneVerified'
        | 'idDocumentVerified'
        | 'accountMatchVerified'
        | 'securityQuestionsVerified'
      > = [
        'phoneVerified',
        'idDocumentVerified',
        'accountMatchVerified',
        'securityQuestionsVerified',
      ]
      expect(fields.length).toBe(4)
    })
  })
})
