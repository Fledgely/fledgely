/**
 * useParentCompliance Hook Tests - Story 32.4
 *
 * Tests for parent compliance tracking hooks.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useParentCompliance, useParentComplianceByParent } from './useParentCompliance'
import type { ParentComplianceRecord } from '@fledgely/shared'
import { PARENT_COMPLIANCE_MESSAGES } from '@fledgely/shared'

// Mock Firebase
vi.mock('../lib/firebase', () => ({
  getFirestoreDb: vi.fn(() => ({})),
}))

// Create a mock function to control snapshot data
const mockSnapshotData: ParentComplianceRecord[] = []
const mockSnapshotCallback: ((callback: (snapshot: unknown) => void) => void)[] = []
let mockUnsubscribe: ReturnType<typeof vi.fn>

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'mock-collection-ref'),
  query: vi.fn(() => 'mock-query'),
  where: vi.fn(() => 'mock-where'),
  orderBy: vi.fn(() => 'mock-order'),
  limit: vi.fn(() => 'mock-limit'),
  onSnapshot: vi.fn((ref, callback) => {
    // Store callback for triggering later
    mockSnapshotCallback.push(callback)
    // Call with initial data
    callback({
      forEach: (fn: (doc: { data: () => ParentComplianceRecord }) => void) => {
        mockSnapshotData.forEach((record) => {
          fn({ data: () => record })
        })
      },
    })
    return mockUnsubscribe
  }),
}))

describe('useParentCompliance - Story 32.4', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSnapshotData.length = 0
    mockSnapshotCallback.length = 0
    mockUnsubscribe = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('basic hook behavior', () => {
    it('returns empty state when familyId is null', () => {
      const { result } = renderHook(() => useParentCompliance({ familyId: null }))

      expect(result.current.records).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.summary).toBeNull()
    })

    it('returns empty state when disabled', () => {
      const { result } = renderHook(() =>
        useParentCompliance({ familyId: 'family-123', enabled: false })
      )

      expect(result.current.records).toEqual([])
      expect(result.current.loading).toBe(false)
    })

    it('provides PARENT_COMPLIANCE_MESSAGES', () => {
      const { result } = renderHook(() => useParentCompliance({ familyId: 'family-123' }))

      expect(result.current.messages).toBe(PARENT_COMPLIANCE_MESSAGES)
    })
  })

  describe('getDisplayMessage - AC4: non-shaming language', () => {
    it('returns compliant message for compliant record', () => {
      const { result } = renderHook(() => useParentCompliance({ familyId: 'family-123' }))

      const compliantRecord: ParentComplianceRecord = {
        familyId: 'family-123',
        parentUid: 'parent-456',
        deviceId: 'device-789',
        parentDisplayName: 'Mom',
        offlineWindowStart: 1704067200000,
        offlineWindowEnd: 1704110400000,
        wasCompliant: true,
        activityEvents: [],
        createdAt: Date.now(),
      }

      const message = result.current.getDisplayMessage(compliantRecord)
      expect(message).toBe('Mom was offline for family time')
      // AC4: Should not contain shaming language
      expect(message.toLowerCase()).not.toContain('good')
      expect(message.toLowerCase()).not.toContain('bad')
      expect(message.toLowerCase()).not.toContain('failed')
    })

    it('returns non-compliant message without shaming', () => {
      const { result } = renderHook(() => useParentCompliance({ familyId: 'family-123' }))

      const nonCompliantRecord: ParentComplianceRecord = {
        familyId: 'family-123',
        parentUid: 'parent-456',
        deviceId: 'device-789',
        parentDisplayName: 'Dad',
        offlineWindowStart: 1704067200000,
        offlineWindowEnd: 1704110400000,
        wasCompliant: false,
        activityEvents: [{ timestamp: 1704080400000, type: 'navigation' }],
        createdAt: Date.now(),
      }

      const message = result.current.getDisplayMessage(nonCompliantRecord)
      expect(message).toBe('Dad used the phone during offline time')
      // AC4: Should not contain shaming language
      expect(message.toLowerCase()).not.toContain('broke')
      expect(message.toLowerCase()).not.toContain('failed')
      expect(message.toLowerCase()).not.toContain('bad')
    })

    it('uses "Parent" when displayName is missing', () => {
      const { result } = renderHook(() => useParentCompliance({ familyId: 'family-123' }))

      const recordWithoutName: ParentComplianceRecord = {
        familyId: 'family-123',
        parentUid: 'parent-456',
        deviceId: 'device-789',
        offlineWindowStart: 1704067200000,
        offlineWindowEnd: 1704110400000,
        wasCompliant: true,
        activityEvents: [],
        createdAt: Date.now(),
      }

      const message = result.current.getDisplayMessage(recordWithoutName)
      expect(message).toBe('Parent was offline for family time')
    })
  })

  describe('summary calculation', () => {
    it('calculates 100% compliance when all records are compliant', async () => {
      const records: ParentComplianceRecord[] = [
        {
          familyId: 'family-123',
          parentUid: 'parent-456',
          deviceId: 'device-789',
          parentDisplayName: 'Mom',
          offlineWindowStart: 1704067200000,
          offlineWindowEnd: 1704110400000,
          wasCompliant: true,
          activityEvents: [],
          createdAt: 1704067200000,
        },
        {
          familyId: 'family-123',
          parentUid: 'parent-456',
          deviceId: 'device-789',
          parentDisplayName: 'Mom',
          offlineWindowStart: 1704153600000,
          offlineWindowEnd: 1704196800000,
          wasCompliant: true,
          activityEvents: [],
          createdAt: 1704153600000,
        },
      ]

      mockSnapshotData.push(...records)

      const { result } = renderHook(() =>
        useParentCompliance({ familyId: 'family-123', parentUid: 'parent-456' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.summary).not.toBeNull()
      expect(result.current.summary?.compliancePercentage).toBe(100)
      expect(result.current.summary?.totalWindows).toBe(2)
      expect(result.current.summary?.compliantWindows).toBe(2)
    })

    it('calculates correct percentage with mixed compliance', async () => {
      const records: ParentComplianceRecord[] = [
        {
          familyId: 'family-123',
          parentUid: 'parent-456',
          deviceId: 'device-789',
          wasCompliant: true,
          offlineWindowStart: 1704067200000,
          offlineWindowEnd: 1704110400000,
          activityEvents: [],
          createdAt: 1704067200000,
        },
        {
          familyId: 'family-123',
          parentUid: 'parent-456',
          deviceId: 'device-789',
          wasCompliant: false,
          offlineWindowStart: 1704153600000,
          offlineWindowEnd: 1704196800000,
          activityEvents: [{ timestamp: 1704170000000, type: 'navigation' }],
          createdAt: 1704153600000,
        },
        {
          familyId: 'family-123',
          parentUid: 'parent-456',
          deviceId: 'device-789',
          wasCompliant: true,
          offlineWindowStart: 1704240000000,
          offlineWindowEnd: 1704283200000,
          activityEvents: [],
          createdAt: 1704240000000,
        },
        {
          familyId: 'family-123',
          parentUid: 'parent-456',
          deviceId: 'device-789',
          wasCompliant: false,
          offlineWindowStart: 1704326400000,
          offlineWindowEnd: 1704369600000,
          activityEvents: [{ timestamp: 1704340000000, type: 'browser_active' }],
          createdAt: 1704326400000,
        },
      ]

      mockSnapshotData.push(...records)

      const { result } = renderHook(() =>
        useParentCompliance({ familyId: 'family-123', parentUid: 'parent-456' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // 2 compliant out of 4 = 50%
      expect(result.current.summary?.compliancePercentage).toBe(50)
      expect(result.current.summary?.totalWindows).toBe(4)
      expect(result.current.summary?.compliantWindows).toBe(2)
    })

    it('returns zero summary for new users with no records', async () => {
      // No records in mockSnapshotData

      const { result } = renderHook(() =>
        useParentCompliance({ familyId: 'family-123', parentUid: 'parent-456' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.summary).toEqual({
        parentUid: 'parent-456',
        totalWindows: 0,
        compliantWindows: 0,
        compliancePercentage: 0,
        lastRecordDate: null,
      })
    })
  })
})

describe('useParentComplianceByParent - Story 32.4 AC2', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSnapshotData.length = 0
    mockSnapshotCallback.length = 0
    mockUnsubscribe = vi.fn()
  })

  it('groups records by parent', async () => {
    const records: ParentComplianceRecord[] = [
      {
        familyId: 'family-123',
        parentUid: 'mom-uid',
        deviceId: 'device-1',
        parentDisplayName: 'Mom',
        wasCompliant: true,
        offlineWindowStart: 1704067200000,
        offlineWindowEnd: 1704110400000,
        activityEvents: [],
        createdAt: 1704067200000,
      },
      {
        familyId: 'family-123',
        parentUid: 'dad-uid',
        deviceId: 'device-2',
        parentDisplayName: 'Dad',
        wasCompliant: false,
        offlineWindowStart: 1704067200000,
        offlineWindowEnd: 1704110400000,
        activityEvents: [{ timestamp: 1704080000000, type: 'navigation' }],
        createdAt: 1704067200000,
      },
      {
        familyId: 'family-123',
        parentUid: 'mom-uid',
        deviceId: 'device-1',
        parentDisplayName: 'Mom',
        wasCompliant: true,
        offlineWindowStart: 1704153600000,
        offlineWindowEnd: 1704196800000,
        activityEvents: [],
        createdAt: 1704153600000,
      },
    ]

    mockSnapshotData.push(...records)

    const { result } = renderHook(() => useParentComplianceByParent({ familyId: 'family-123' }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.byParent).toHaveLength(2)

    // Find Dad's records
    const dadGroup = result.current.byParent.find((p) => p.parentUid === 'dad-uid')
    expect(dadGroup).toBeDefined()
    expect(dadGroup?.records).toHaveLength(1)
    expect(dadGroup?.summary.compliancePercentage).toBe(0)

    // Find Mom's records
    const momGroup = result.current.byParent.find((p) => p.parentUid === 'mom-uid')
    expect(momGroup).toBeDefined()
    expect(momGroup?.records).toHaveLength(2)
    expect(momGroup?.summary.compliancePercentage).toBe(100)
  })

  it('sorts parents alphabetically by name', async () => {
    const records: ParentComplianceRecord[] = [
      {
        familyId: 'family-123',
        parentUid: 'parent-3',
        deviceId: 'device-3',
        parentDisplayName: 'Zach',
        wasCompliant: true,
        offlineWindowStart: 1704067200000,
        offlineWindowEnd: 1704110400000,
        activityEvents: [],
        createdAt: 1704067200000,
      },
      {
        familyId: 'family-123',
        parentUid: 'parent-1',
        deviceId: 'device-1',
        parentDisplayName: 'Alice',
        wasCompliant: true,
        offlineWindowStart: 1704067200000,
        offlineWindowEnd: 1704110400000,
        activityEvents: [],
        createdAt: 1704067200000,
      },
      {
        familyId: 'family-123',
        parentUid: 'parent-2',
        deviceId: 'device-2',
        parentDisplayName: 'Bob',
        wasCompliant: true,
        offlineWindowStart: 1704067200000,
        offlineWindowEnd: 1704110400000,
        activityEvents: [],
        createdAt: 1704067200000,
      },
    ]

    mockSnapshotData.push(...records)

    const { result } = renderHook(() => useParentComplianceByParent({ familyId: 'family-123' }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.byParent[0].parentDisplayName).toBe('Alice')
    expect(result.current.byParent[1].parentDisplayName).toBe('Bob')
    expect(result.current.byParent[2].parentDisplayName).toBe('Zach')
  })
})
