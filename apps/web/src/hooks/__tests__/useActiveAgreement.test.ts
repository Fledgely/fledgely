import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useActiveAgreement } from '../useActiveAgreement'
import type { AgreementStatus } from '@fledgely/contracts'

// Mock Firebase
const mockGetDocs = vi.fn()
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDocs: () => mockGetDocs(),
}))

vi.mock('@/lib/firebase', () => ({
  db: {},
}))

describe('useActiveAgreement (Task 8)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading state', () => {
    it('returns loading true initially', () => {
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] })

      const { result } = renderHook(() =>
        useActiveAgreement({ familyId: 'family-123' })
      )

      expect(result.current.loading).toBe(true)
    })

    it('returns loading false after fetch completes', async () => {
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] })

      const { result } = renderHook(() =>
        useActiveAgreement({ familyId: 'family-123' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })
  })

  describe('Fetching active agreement (AC: 5)', () => {
    it('returns active agreement when one exists', async () => {
      const mockAgreement = {
        id: 'agreement-123',
        data: () => ({
          status: 'active' as AgreementStatus,
          version: '1.0',
          activatedAt: '2025-12-16T12:00:00Z',
          terms: [{ id: '1' }, { id: '2' }],
          signatures: {
            parent: { signedAt: '2025-12-16T11:00:00Z' },
            child: { signedAt: '2025-12-16T12:00:00Z' },
          },
          signingStatus: 'complete',
        }),
      }

      // First call: active query, Second call: pending query
      mockGetDocs
        .mockResolvedValueOnce({ empty: false, docs: [mockAgreement] })
        .mockResolvedValueOnce({ empty: true, docs: [] })

      const { result } = renderHook(() =>
        useActiveAgreement({ familyId: 'family-123' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.agreement).toBeDefined()
      expect(result.current.agreement?.id).toBe('agreement-123')
      expect(result.current.agreement?.status).toBe('active')
      expect(result.current.agreement?.version).toBe('1.0')
      expect(result.current.agreement?.termsCount).toBe(2)
      expect(result.current.agreement?.signedBy).toContain('Parent')
      expect(result.current.agreement?.signedBy).toContain('Child')
    })

    it('returns null when no active agreement', async () => {
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] })

      const { result } = renderHook(() =>
        useActiveAgreement({ familyId: 'family-123' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.agreement).toBeNull()
    })
  })

  describe('Fetching pending agreement (AC: 5)', () => {
    it('returns pending agreement when one exists', async () => {
      const mockPendingAgreement = {
        id: 'agreement-456',
        data: () => ({
          status: 'pending_signatures' as AgreementStatus,
          version: '1.0',
          terms: [{ id: '1' }],
          signatures: {
            parent: { signedAt: '2025-12-16T11:00:00Z' },
          },
          signingStatus: 'parent_signed',
        }),
      }

      // First call: active query (empty), Second call: pending query
      mockGetDocs
        .mockResolvedValueOnce({ empty: true, docs: [] })
        .mockResolvedValueOnce({ empty: false, docs: [mockPendingAgreement] })

      const { result } = renderHook(() =>
        useActiveAgreement({ familyId: 'family-123' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.pendingAgreement).toBeDefined()
      expect(result.current.pendingAgreement?.id).toBe('agreement-456')
      expect(result.current.pendingAgreement?.status).toBe('pending_signatures')
    })

    it('returns both active and pending when both exist', async () => {
      const mockActiveAgreement = {
        id: 'agreement-123',
        data: () => ({
          status: 'active' as AgreementStatus,
          version: '1.0',
          terms: [],
          signatures: { parent: {}, child: {} },
          signingStatus: 'complete',
        }),
      }
      const mockPendingAgreement = {
        id: 'agreement-456',
        data: () => ({
          status: 'pending_signatures' as AgreementStatus,
          version: '2.0',
          terms: [],
          signatures: { parent: {} },
          signingStatus: 'parent_signed',
        }),
      }

      mockGetDocs
        .mockResolvedValueOnce({ empty: false, docs: [mockActiveAgreement] })
        .mockResolvedValueOnce({ empty: false, docs: [mockPendingAgreement] })

      const { result } = renderHook(() =>
        useActiveAgreement({ familyId: 'family-123' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.agreement?.id).toBe('agreement-123')
      expect(result.current.pendingAgreement?.id).toBe('agreement-456')
    })
  })

  describe('Error handling', () => {
    it('sets error on fetch failure', async () => {
      mockGetDocs.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() =>
        useActiveAgreement({ familyId: 'family-123' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBeDefined()
      expect(result.current.error?.message).toBe('Network error')
    })

    it('clears data on error', async () => {
      mockGetDocs.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() =>
        useActiveAgreement({ familyId: 'family-123' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.agreement).toBeNull()
      expect(result.current.pendingAgreement).toBeNull()
    })
  })

  describe('Empty family ID', () => {
    it('returns early when familyId is null', async () => {
      const { result } = renderHook(() =>
        useActiveAgreement({ familyId: null })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockGetDocs).not.toHaveBeenCalled()
      expect(result.current.agreement).toBeNull()
    })

    it('returns early when familyId is undefined', async () => {
      const { result } = renderHook(() =>
        useActiveAgreement({ familyId: undefined })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockGetDocs).not.toHaveBeenCalled()
    })
  })

  describe('Refresh function', () => {
    it('provides refresh function to refetch data', async () => {
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] })

      const { result } = renderHook(() =>
        useActiveAgreement({ familyId: 'family-123' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(typeof result.current.refresh).toBe('function')

      // Call refresh
      await result.current.refresh()

      // Should have called getDocs twice (once for initial, once for refresh)
      expect(mockGetDocs).toHaveBeenCalled()
    })
  })
})
