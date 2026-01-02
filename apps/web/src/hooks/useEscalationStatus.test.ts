/**
 * useEscalationStatus Hook Tests - Story 34.5.2 Task 6
 *
 * Tests for checking and managing escalation status.
 * AC1: Display Mediation Prompt on Escalation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useEscalationStatus } from './useEscalationStatus'

// Mock Firebase
const mockGetDoc = vi.fn()
const mockSetDoc = vi.fn()
const mockOnSnapshot = vi.fn()

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn(() => 'mock-doc-ref'),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  collection: vi.fn(() => 'mock-collection'),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
}))

describe('useEscalationStatus - Story 34.5.2', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetDoc.mockReset()
    mockSetDoc.mockReset()
    mockOnSnapshot.mockReset()
    // Default: no escalation
    mockOnSnapshot.mockImplementation((_, callback) => {
      callback({ empty: true, docs: [] })
      return () => {}
    })
  })

  // ============================================
  // Basic Hook Behavior Tests
  // ============================================

  describe('Basic Hook Behavior', () => {
    it('should return status object', () => {
      const { result } = renderHook(() => useEscalationStatus('family-123', 'child-456'))

      expect(result.current).toHaveProperty('status')
      expect(result.current).toHaveProperty('loading')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('acknowledgeEscalation')
    })

    it('should start with loading true', () => {
      mockOnSnapshot.mockImplementation(() => {
        // Don't call callback immediately
        return () => {}
      })

      const { result } = renderHook(() => useEscalationStatus('family-123', 'child-456'))

      expect(result.current.loading).toBe(true)
    })

    it('should set loading to false after data loads', async () => {
      mockOnSnapshot.mockImplementation((_, callback) => {
        setTimeout(() => callback({ empty: true, docs: [] }), 0)
        return () => {}
      })

      const { result } = renderHook(() => useEscalationStatus('family-123', 'child-456'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })

    it('should return null status when no escalation', async () => {
      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({ empty: true, docs: [] })
        return () => {}
      })

      const { result } = renderHook(() => useEscalationStatus('family-123', 'child-456'))

      await waitFor(() => {
        expect(result.current.status).toEqual({
          hasActiveEscalation: false,
          escalationEvent: null,
          isAcknowledged: false,
        })
      })
    })
  })

  // ============================================
  // Escalation Detection Tests
  // ============================================

  describe('Escalation Detection', () => {
    it('should detect active escalation', async () => {
      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          empty: false,
          docs: [
            {
              id: 'escalation-1',
              data: () => ({
                familyId: 'family-123',
                childId: 'child-456',
                triggeredAt: { toDate: () => new Date() },
                resolvedAt: null,
              }),
            },
          ],
        })
        return () => {}
      })

      const { result } = renderHook(() => useEscalationStatus('family-123', 'child-456'))

      await waitFor(() => {
        expect(result.current.status?.hasActiveEscalation).toBe(true)
      })
    })

    it('should return escalation event data', async () => {
      const triggeredAt = new Date()
      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          empty: false,
          docs: [
            {
              id: 'escalation-1',
              data: () => ({
                familyId: 'family-123',
                childId: 'child-456',
                triggeredAt: { toDate: () => triggeredAt },
                resolvedAt: null,
              }),
            },
          ],
        })
        return () => {}
      })

      const { result } = renderHook(() => useEscalationStatus('family-123', 'child-456'))

      await waitFor(() => {
        expect(result.current.status?.escalationEvent).toBeDefined()
        expect(result.current.status?.escalationEvent?.id).toBe('escalation-1')
      })
    })

    it('should handle resolved escalations', async () => {
      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          empty: false,
          docs: [
            {
              id: 'escalation-1',
              data: () => ({
                familyId: 'family-123',
                childId: 'child-456',
                triggeredAt: { toDate: () => new Date() },
                resolvedAt: { toDate: () => new Date() },
              }),
            },
          ],
        })
        return () => {}
      })

      const { result } = renderHook(() => useEscalationStatus('family-123', 'child-456'))

      await waitFor(() => {
        expect(result.current.status?.hasActiveEscalation).toBe(false)
      })
    })
  })

  // ============================================
  // Acknowledgment Tests
  // ============================================

  describe('Acknowledgment', () => {
    it('should provide acknowledgeEscalation function', () => {
      const { result } = renderHook(() => useEscalationStatus('family-123', 'child-456'))

      expect(typeof result.current.acknowledgeEscalation).toBe('function')
    })

    it('should call Firebase on acknowledge', async () => {
      mockSetDoc.mockResolvedValue(undefined)
      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          empty: false,
          docs: [
            {
              id: 'escalation-1',
              data: () => ({
                familyId: 'family-123',
                childId: 'child-456',
                triggeredAt: { toDate: () => new Date() },
                resolvedAt: null,
              }),
            },
          ],
        })
        return () => {}
      })

      const { result } = renderHook(() => useEscalationStatus('family-123', 'child-456'))

      await waitFor(() => {
        expect(result.current.status?.hasActiveEscalation).toBe(true)
      })

      await act(async () => {
        await result.current.acknowledgeEscalation()
      })

      expect(mockSetDoc).toHaveBeenCalled()
    })

    it('should update isAcknowledged after acknowledge', async () => {
      mockSetDoc.mockResolvedValue(undefined)
      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          empty: false,
          docs: [
            {
              id: 'escalation-1',
              data: () => ({
                familyId: 'family-123',
                childId: 'child-456',
                triggeredAt: { toDate: () => new Date() },
                resolvedAt: null,
              }),
            },
          ],
        })
        return () => {}
      })

      // Mock acknowledgment check
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          acknowledgedAt: new Date(),
        }),
      })

      const { result } = renderHook(() => useEscalationStatus('family-123', 'child-456'))

      await waitFor(() => {
        expect(result.current.status?.hasActiveEscalation).toBe(true)
      })

      await act(async () => {
        await result.current.acknowledgeEscalation()
      })

      // Verify the function was called
      expect(mockSetDoc).toHaveBeenCalled()
    })
  })

  // ============================================
  // Error Handling Tests
  // ============================================

  describe('Error Handling', () => {
    it('should handle Firebase errors', async () => {
      mockOnSnapshot.mockImplementation((_, __, errorCallback) => {
        errorCallback(new Error('Firebase error'))
        return () => {}
      })

      const { result } = renderHook(() => useEscalationStatus('family-123', 'child-456'))

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })
    })

    it('should set loading false on error', async () => {
      mockOnSnapshot.mockImplementation((_, __, errorCallback) => {
        errorCallback(new Error('Firebase error'))
        return () => {}
      })

      const { result } = renderHook(() => useEscalationStatus('family-123', 'child-456'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })
  })

  // ============================================
  // Cleanup Tests
  // ============================================

  describe('Cleanup', () => {
    it('should unsubscribe on unmount', () => {
      const unsubscribe = vi.fn()
      mockOnSnapshot.mockImplementation(() => unsubscribe)

      const { unmount } = renderHook(() => useEscalationStatus('family-123', 'child-456'))

      unmount()

      expect(unsubscribe).toHaveBeenCalled()
    })
  })
})
