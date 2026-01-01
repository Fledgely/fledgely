/**
 * useAgreementHistory Hook Tests - Story 34.6
 *
 * Tests for the agreement history fetching hook.
 * AC1: Timeline shows all versions with dates
 * AC2: Each change shows who proposed, who accepted, what changed
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAgreementHistory } from './useAgreementHistory'
import type { HistoryVersion } from '@fledgely/shared'

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn(),
}))

// Mock firebase lib
vi.mock('../lib/firebase', () => ({
  getFirestoreDb: vi.fn(() => ({})),
}))

import { collection, orderBy, getDocs } from 'firebase/firestore'

describe('useAgreementHistory - Story 34.6', () => {
  const mockVersions: HistoryVersion[] = [
    {
      id: 'v3',
      versionNumber: 3,
      proposerId: 'parent-1',
      proposerName: 'Mom',
      accepterId: 'parent-2',
      accepterName: 'Dad',
      changes: [
        {
          fieldPath: 'bedtime.weekday',
          fieldLabel: 'Weekday Bedtime',
          previousValue: '8:30 PM',
          newValue: '9:00 PM',
        },
      ],
      createdAt: new Date('2024-03-01'),
    },
    {
      id: 'v2',
      versionNumber: 2,
      proposerId: 'parent-2',
      proposerName: 'Dad',
      accepterId: 'parent-1',
      accepterName: 'Mom',
      changes: [
        {
          fieldPath: 'screenTime.weekday',
          fieldLabel: 'Weekday Screen Time',
          previousValue: '1 hour',
          newValue: '2 hours',
        },
      ],
      createdAt: new Date('2024-02-15'),
    },
    {
      id: 'v1',
      versionNumber: 1,
      proposerId: 'parent-1',
      proposerName: 'Mom',
      accepterId: 'parent-2',
      accepterName: 'Dad',
      changes: [],
      createdAt: new Date('2024-01-01'),
      note: 'Initial agreement',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('fetching versions', () => {
    it('should fetch agreement versions from Firestore', async () => {
      const mockDocs = mockVersions.map((v) => ({
        id: v.id,
        data: () => ({
          ...v,
          createdAt: { toDate: () => v.createdAt },
        }),
      }))

      vi.mocked(getDocs).mockResolvedValue({
        docs: mockDocs,
        empty: false,
      } as never)

      const { result } = renderHook(() =>
        useAgreementHistory({
          familyId: 'family-1',
          agreementId: 'agreement-1',
        })
      )

      expect(result.current.loading).toBe(true)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.versions).toHaveLength(3)
      expect(collection).toHaveBeenCalledWith(
        expect.anything(),
        'families',
        'family-1',
        'agreements',
        'agreement-1',
        'versions'
      )
    })

    it('should order versions by versionNumber descending (AC1: timeline)', async () => {
      vi.mocked(getDocs).mockResolvedValue({
        docs: [],
        empty: true,
      } as never)

      renderHook(() =>
        useAgreementHistory({
          familyId: 'family-1',
          agreementId: 'agreement-1',
        })
      )

      await waitFor(() => {
        expect(orderBy).toHaveBeenCalledWith('versionNumber', 'desc')
      })
    })

    it('should include proposer and accepter info (AC2)', async () => {
      const mockDocs = mockVersions.slice(0, 1).map((v) => ({
        id: v.id,
        data: () => ({
          ...v,
          createdAt: { toDate: () => v.createdAt },
        }),
      }))

      vi.mocked(getDocs).mockResolvedValue({
        docs: mockDocs,
        empty: false,
      } as never)

      const { result } = renderHook(() =>
        useAgreementHistory({
          familyId: 'family-1',
          agreementId: 'agreement-1',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const version = result.current.versions[0]
      expect(version.proposerId).toBe('parent-1')
      expect(version.proposerName).toBe('Mom')
      expect(version.accepterId).toBe('parent-2')
      expect(version.accepterName).toBe('Dad')
    })

    it('should include changes array (AC2: what changed)', async () => {
      const mockDocs = mockVersions.slice(0, 1).map((v) => ({
        id: v.id,
        data: () => ({
          ...v,
          createdAt: { toDate: () => v.createdAt },
        }),
      }))

      vi.mocked(getDocs).mockResolvedValue({
        docs: mockDocs,
        empty: false,
      } as never)

      const { result } = renderHook(() =>
        useAgreementHistory({
          familyId: 'family-1',
          agreementId: 'agreement-1',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const version = result.current.versions[0]
      expect(version.changes).toHaveLength(1)
      expect(version.changes[0].fieldPath).toBe('bedtime.weekday')
      expect(version.changes[0].previousValue).toBe('8:30 PM')
      expect(version.changes[0].newValue).toBe('9:00 PM')
    })
  })

  describe('loading and error states', () => {
    it('should start in loading state', () => {
      vi.mocked(getDocs).mockResolvedValue({
        docs: [],
        empty: true,
      } as never)

      const { result } = renderHook(() =>
        useAgreementHistory({
          familyId: 'family-1',
          agreementId: 'agreement-1',
        })
      )

      expect(result.current.loading).toBe(true)
      expect(result.current.versions).toEqual([])
      expect(result.current.error).toBeNull()
    })

    it('should handle empty history', async () => {
      vi.mocked(getDocs).mockResolvedValue({
        docs: [],
        empty: true,
      } as never)

      const { result } = renderHook(() =>
        useAgreementHistory({
          familyId: 'family-1',
          agreementId: 'agreement-1',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.versions).toEqual([])
      expect(result.current.versionCount).toBe(0)
    })

    it('should handle fetch errors', async () => {
      vi.mocked(getDocs).mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() =>
        useAgreementHistory({
          familyId: 'family-1',
          agreementId: 'agreement-1',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('Network error')
      expect(result.current.versions).toEqual([])
    })

    it('should not fetch if familyId is missing', () => {
      const { result } = renderHook(() =>
        useAgreementHistory({
          familyId: '',
          agreementId: 'agreement-1',
        })
      )

      expect(result.current.loading).toBe(false)
      expect(getDocs).not.toHaveBeenCalled()
    })

    it('should not fetch if agreementId is missing', () => {
      const { result } = renderHook(() =>
        useAgreementHistory({
          familyId: 'family-1',
          agreementId: '',
        })
      )

      expect(result.current.loading).toBe(false)
      expect(getDocs).not.toHaveBeenCalled()
    })
  })

  describe('computed values', () => {
    it('should compute versionCount', async () => {
      const mockDocs = mockVersions.map((v) => ({
        id: v.id,
        data: () => ({
          ...v,
          createdAt: { toDate: () => v.createdAt },
        }),
      }))

      vi.mocked(getDocs).mockResolvedValue({
        docs: mockDocs,
        empty: false,
      } as never)

      const { result } = renderHook(() =>
        useAgreementHistory({
          familyId: 'family-1',
          agreementId: 'agreement-1',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.versionCount).toBe(3)
    })

    it('should provide latestVersion', async () => {
      const mockDocs = mockVersions.map((v) => ({
        id: v.id,
        data: () => ({
          ...v,
          createdAt: { toDate: () => v.createdAt },
        }),
      }))

      vi.mocked(getDocs).mockResolvedValue({
        docs: mockDocs,
        empty: false,
      } as never)

      const { result } = renderHook(() =>
        useAgreementHistory({
          familyId: 'family-1',
          agreementId: 'agreement-1',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.latestVersion?.versionNumber).toBe(3)
    })

    it('should provide getVersionById helper', async () => {
      const mockDocs = mockVersions.map((v) => ({
        id: v.id,
        data: () => ({
          ...v,
          createdAt: { toDate: () => v.createdAt },
        }),
      }))

      vi.mocked(getDocs).mockResolvedValue({
        docs: mockDocs,
        empty: false,
      } as never)

      const { result } = renderHook(() =>
        useAgreementHistory({
          familyId: 'family-1',
          agreementId: 'agreement-1',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const v2 = result.current.getVersionById('v2')
      expect(v2?.versionNumber).toBe(2)
      expect(v2?.proposerName).toBe('Dad')
    })
  })

  describe('refetch', () => {
    it('should provide refetch function', async () => {
      vi.mocked(getDocs).mockResolvedValue({
        docs: [],
        empty: true,
      } as never)

      const { result } = renderHook(() =>
        useAgreementHistory({
          familyId: 'family-1',
          agreementId: 'agreement-1',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(typeof result.current.refetch).toBe('function')
    })
  })
})
