/**
 * useChildAgreement Hook Tests - Story 19C.1
 *
 * Task 1.4: Add unit tests for the hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useChildAgreement } from './useChildAgreement'

// Mock Firebase - define Timestamp class inline to avoid hoisting issues
vi.mock('firebase/firestore', () => {
  class MockTimestamp {
    static now() {
      return new MockTimestamp()
    }
    toDate() {
      return new Date()
    }
  }
  return {
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    onSnapshot: vi.fn(),
    Timestamp: MockTimestamp,
  }
})

vi.mock('../lib/firebase', () => ({
  getFirestoreDb: vi.fn(() => ({})),
}))

import { onSnapshot } from 'firebase/firestore'

describe('useChildAgreement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return null agreement when childId is null', async () => {
    const { result } = renderHook(() => useChildAgreement({ childId: null, familyId: 'family-1' }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.agreement).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('should return null agreement when familyId is null', async () => {
    const { result } = renderHook(() => useChildAgreement({ childId: 'child-1', familyId: null }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.agreement).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('should return null agreement when disabled', async () => {
    const { result } = renderHook(() =>
      useChildAgreement({ childId: 'child-1', familyId: 'family-1', enabled: false })
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.agreement).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('should start in loading state when enabled with valid IDs', () => {
    vi.mocked(onSnapshot).mockImplementation(() => vi.fn())

    const { result } = renderHook(() =>
      useChildAgreement({ childId: 'child-1', familyId: 'family-1' })
    )

    expect(result.current.loading).toBe(true)
    expect(result.current.agreement).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('should return agreement when snapshot contains data', async () => {
    const mockAgreementData = {
      id: 'agreement-1',
      familyId: 'family-1',
      childId: 'child-1',
      version: 'v1.0',
      activatedAt: { toDate: () => new Date('2024-01-15') },
      terms: [
        {
          id: 'term-1',
          text: 'Screenshots are taken every 5 minutes',
          category: 'monitoring',
          party: 'parent',
          explanation: null,
          isDefault: true,
        },
        {
          id: 'term-2',
          text: 'Pictures are kept for 30 days',
          category: 'monitoring',
          party: 'parent',
          explanation: null,
          isDefault: true,
        },
      ],
      childSignature: {
        name: 'Alex',
        signedAt: { toDate: () => new Date('2024-01-15T10:00:00') },
      },
      parentSignatures: [
        {
          name: 'Mom',
          signedAt: { toDate: () => new Date('2024-01-15T09:00:00') },
        },
      ],
    }

    vi.mocked(onSnapshot).mockImplementation((_, onNext) => {
      // Call immediately for tests
      ;(onNext as (snapshot: unknown) => void)({
        empty: false,
        docs: [
          {
            id: 'agreement-1',
            data: () => mockAgreementData,
          },
        ],
      })
      return vi.fn()
    })

    const { result } = renderHook(() =>
      useChildAgreement({ childId: 'child-1', familyId: 'family-1' })
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.agreement).not.toBeNull()
    })

    expect(result.current.agreement?.id).toBe('agreement-1')
    expect(result.current.agreement?.version).toBe('v1.0')
    expect(result.current.agreement?.terms).toHaveLength(2)
    expect(result.current.agreement?.signatures).toHaveLength(2)
  })

  it('should return null agreement when snapshot is empty', async () => {
    vi.mocked(onSnapshot).mockImplementation((_, onNext) => {
      setTimeout(() => {
        ;(onNext as (snapshot: unknown) => void)({
          empty: true,
          docs: [],
        })
      }, 0)
      return vi.fn()
    })

    const { result } = renderHook(() =>
      useChildAgreement({ childId: 'child-1', familyId: 'family-1' })
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.agreement).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('should set error when snapshot listener fails', async () => {
    vi.mocked(onSnapshot).mockImplementation((_, __, onError) => {
      setTimeout(() => {
        ;(onError as unknown as (error: Error) => void)(new Error('Firebase error'))
      }, 0)
      return vi.fn()
    })

    const { result } = renderHook(() =>
      useChildAgreement({ childId: 'child-1', familyId: 'family-1' })
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.agreement).toBeNull()
    expect(result.current.error).toBe('Failed to load your agreement')
  })

  it('should extract monitoring settings from terms', async () => {
    const mockAgreementData = {
      id: 'agreement-1',
      familyId: 'family-1',
      childId: 'child-1',
      version: 'v1.0',
      activatedAt: { toDate: () => new Date() },
      terms: [
        {
          id: 'term-1',
          text: 'Screenshots are taken every 5 minutes',
          category: 'monitoring',
          party: 'parent',
        },
        {
          id: 'term-2',
          text: 'Pictures are kept for 30 days',
          category: 'monitoring',
          party: 'parent',
        },
      ],
      childSignature: null,
      parentSignatures: [],
    }

    vi.mocked(onSnapshot).mockImplementation((_, onNext) => {
      // Call immediately for tests
      ;(onNext as (snapshot: unknown) => void)({
        empty: false,
        docs: [{ id: 'agreement-1', data: () => mockAgreementData }],
      })
      return vi.fn()
    })

    const { result } = renderHook(() =>
      useChildAgreement({ childId: 'child-1', familyId: 'family-1' })
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.agreement).not.toBeNull()
    })

    expect(result.current.agreement?.monitoring.screenshotsEnabled).toBe(true)
    expect(result.current.agreement?.monitoring.captureFrequency).toBe('Every 5 minutes')
    expect(result.current.agreement?.monitoring.retentionPeriod).toBe('30 days')
  })

  it('should handle singular time units in monitoring settings', async () => {
    const mockAgreementData = {
      id: 'agreement-1',
      familyId: 'family-1',
      childId: 'child-1',
      version: 'v1.0',
      activatedAt: { toDate: () => new Date() },
      terms: [
        {
          id: 'term-1',
          text: 'Screenshots are taken every 1 hour',
          category: 'monitoring',
          party: 'parent',
        },
        {
          id: 'term-2',
          text: 'Pictures are kept for 1 week',
          category: 'monitoring',
          party: 'parent',
        },
      ],
      childSignature: null,
      parentSignatures: [],
    }

    vi.mocked(onSnapshot).mockImplementation((_, onNext) => {
      ;(onNext as (snapshot: unknown) => void)({
        empty: false,
        docs: [{ id: 'agreement-1', data: () => mockAgreementData }],
      })
      return vi.fn()
    })

    const { result } = renderHook(() =>
      useChildAgreement({ childId: 'child-1', familyId: 'family-1' })
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.agreement).not.toBeNull()
    })

    expect(result.current.agreement?.monitoring.captureFrequency).toBe('Every 1 hour')
    expect(result.current.agreement?.monitoring.retentionPeriod).toBe('1 week')
  })

  it('should sort signatures by date (earliest first)', async () => {
    const mockAgreementData = {
      id: 'agreement-1',
      familyId: 'family-1',
      childId: 'child-1',
      version: 'v1.0',
      activatedAt: { toDate: () => new Date() },
      terms: [],
      childSignature: {
        name: 'Alex',
        signedAt: { toDate: () => new Date('2024-01-15T12:00:00') }, // Signed last
      },
      parentSignatures: [
        {
          name: 'Mom',
          signedAt: { toDate: () => new Date('2024-01-15T10:00:00') }, // Signed first
        },
        {
          name: 'Dad',
          signedAt: { toDate: () => new Date('2024-01-15T11:00:00') }, // Signed second
        },
      ],
    }

    vi.mocked(onSnapshot).mockImplementation((_, onNext) => {
      // Call immediately for tests
      ;(onNext as (snapshot: unknown) => void)({
        empty: false,
        docs: [{ id: 'agreement-1', data: () => mockAgreementData }],
      })
      return vi.fn()
    })

    const { result } = renderHook(() =>
      useChildAgreement({ childId: 'child-1', familyId: 'family-1' })
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.agreement).not.toBeNull()
    })

    expect(result.current.agreement?.signatures).toHaveLength(3)
    expect(result.current.agreement?.signatures[0].name).toBe('Mom') // First
    expect(result.current.agreement?.signatures[1].name).toBe('Dad') // Second
    expect(result.current.agreement?.signatures[2].name).toBe('Alex') // Last
  })

  it('should unsubscribe on unmount', () => {
    const unsubscribeMock = vi.fn()
    vi.mocked(onSnapshot).mockReturnValue(unsubscribeMock)

    const { unmount } = renderHook(() =>
      useChildAgreement({ childId: 'child-1', familyId: 'family-1' })
    )

    unmount()

    expect(unsubscribeMock).toHaveBeenCalled()
  })
})
