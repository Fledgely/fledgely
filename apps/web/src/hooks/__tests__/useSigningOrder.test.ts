import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSigningOrder } from '../useSigningOrder'
import type { SigningStatus } from '@fledgely/contracts'

// Mock Firebase Firestore
const mockOnSnapshot = vi.fn()
const mockDoc = vi.fn()

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  onSnapshot: (docRef: unknown, callback: (snapshot: unknown) => void) => {
    mockOnSnapshot(docRef, callback)
    return vi.fn() // unsubscribe function
  },
}))

vi.mock('@/lib/firebase', () => ({
  db: {},
}))

describe('useSigningOrder', () => {
  const defaultOptions = {
    familyId: 'family-123',
    agreementId: 'agreement-456',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('canChildSign (Task 6.1)', () => {
    it('returns true when parent has signed', async () => {
      // Simulate Firestore snapshot with parent_signed status
      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          exists: () => true,
          data: () => ({
            signingStatus: 'parent_signed' as SigningStatus,
            signatures: {
              parent: { signature: { signedAt: '2025-12-16T10:00:00Z' } },
              child: null,
            },
          }),
        })
        return vi.fn()
      })

      const { result } = renderHook(() => useSigningOrder(defaultOptions))

      await waitFor(() => {
        expect(result.current.canChildSign).toBe(true)
      })
    })

    it('returns false when parent has not signed (pending)', async () => {
      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          exists: () => true,
          data: () => ({
            signingStatus: 'pending' as SigningStatus,
            signatures: {
              parent: null,
              child: null,
            },
          }),
        })
        return vi.fn()
      })

      const { result } = renderHook(() => useSigningOrder(defaultOptions))

      await waitFor(() => {
        expect(result.current.canChildSign).toBe(false)
      })
    })

    it('returns false when signing is already complete', async () => {
      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          exists: () => true,
          data: () => ({
            signingStatus: 'complete' as SigningStatus,
            signatures: {
              parent: { signature: { signedAt: '2025-12-16T10:00:00Z' } },
              child: { signature: { signedAt: '2025-12-16T11:00:00Z' } },
            },
          }),
        })
        return vi.fn()
      })

      const { result } = renderHook(() => useSigningOrder(defaultOptions))

      await waitFor(() => {
        expect(result.current.canChildSign).toBe(false)
      })
    })
  })

  describe('canParentSign (Task 6.2)', () => {
    it('returns true when status is pending', async () => {
      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          exists: () => true,
          data: () => ({
            signingStatus: 'pending' as SigningStatus,
            signatures: {
              parent: null,
              child: null,
            },
          }),
        })
        return vi.fn()
      })

      const { result } = renderHook(() => useSigningOrder(defaultOptions))

      await waitFor(() => {
        expect(result.current.canParentSign).toBe(true)
      })
    })

    it('returns false when parent has already signed', async () => {
      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          exists: () => true,
          data: () => ({
            signingStatus: 'parent_signed' as SigningStatus,
            signatures: {
              parent: { signature: { signedAt: '2025-12-16T10:00:00Z' } },
              child: null,
            },
          }),
        })
        return vi.fn()
      })

      const { result } = renderHook(() => useSigningOrder(defaultOptions))

      await waitFor(() => {
        expect(result.current.canParentSign).toBe(false)
      })
    })
  })

  describe('waitingMessage (Task 6.5)', () => {
    it('returns child-friendly message when waiting for parent', async () => {
      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          exists: () => true,
          data: () => ({
            signingStatus: 'pending' as SigningStatus,
            signatures: {
              parent: null,
              child: null,
            },
          }),
        })
        return vi.fn()
      })

      const { result } = renderHook(() => useSigningOrder(defaultOptions))

      await waitFor(() => {
        expect(result.current.waitingMessage).toContain('parent')
      })
    })

    it('returns null when child can sign', async () => {
      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          exists: () => true,
          data: () => ({
            signingStatus: 'parent_signed' as SigningStatus,
            signatures: {
              parent: { signature: { signedAt: '2025-12-16T10:00:00Z' } },
              child: null,
            },
          }),
        })
        return vi.fn()
      })

      const { result } = renderHook(() => useSigningOrder(defaultOptions))

      await waitFor(() => {
        expect(result.current.waitingMessage).toBeNull()
      })
    })
  })

  describe('signingStatus', () => {
    it('returns current signing status', async () => {
      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          exists: () => true,
          data: () => ({
            signingStatus: 'parent_signed' as SigningStatus,
            signatures: {
              parent: { signature: { signedAt: '2025-12-16T10:00:00Z' } },
              child: null,
            },
          }),
        })
        return vi.fn()
      })

      const { result } = renderHook(() => useSigningOrder(defaultOptions))

      await waitFor(() => {
        expect(result.current.signingStatus).toBe('parent_signed')
      })
    })
  })

  describe('isComplete', () => {
    it('returns true when signing is complete', async () => {
      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          exists: () => true,
          data: () => ({
            signingStatus: 'complete' as SigningStatus,
            signatures: {
              parent: { signature: { signedAt: '2025-12-16T10:00:00Z' } },
              child: { signature: { signedAt: '2025-12-16T11:00:00Z' } },
            },
          }),
        })
        return vi.fn()
      })

      const { result } = renderHook(() => useSigningOrder(defaultOptions))

      await waitFor(() => {
        expect(result.current.isComplete).toBe(true)
      })
    })

    it('returns false when signing is not complete', async () => {
      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          exists: () => true,
          data: () => ({
            signingStatus: 'pending' as SigningStatus,
            signatures: {
              parent: null,
              child: null,
            },
          }),
        })
        return vi.fn()
      })

      const { result } = renderHook(() => useSigningOrder(defaultOptions))

      await waitFor(() => {
        expect(result.current.isComplete).toBe(false)
      })
    })
  })

  describe('loading and error states', () => {
    it('starts with loading true', () => {
      mockOnSnapshot.mockImplementation(() => vi.fn())

      const { result } = renderHook(() => useSigningOrder(defaultOptions))

      expect(result.current.loading).toBe(true)
    })

    it('sets error when document does not exist', async () => {
      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          exists: () => false,
          data: () => null,
        })
        return vi.fn()
      })

      const { result } = renderHook(() => useSigningOrder(defaultOptions))

      await waitFor(() => {
        expect(result.current.error).toBeDefined()
      })
    })
  })
})
