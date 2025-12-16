/**
 * Privacy Gap Schedule Generator Tests
 *
 * Story 7.8: Privacy Gaps Injection - Task 5.5
 *
 * Tests the scheduled Firebase function for generating privacy gap schedules.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PRIVACY_GAPS_CONSTANTS } from '@fledgely/contracts'

// Mock firebase-admin/firestore
const mockSet = vi.fn().mockResolvedValue({})
const mockGet = vi.fn()
const mockDelete = vi.fn().mockResolvedValue({})
const mockBatchDelete = vi.fn()
const mockBatchCommit = vi.fn().mockResolvedValue({})
const mockWhere = vi.fn()
const mockDoc = vi.fn()
const mockCollection = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: mockCollection,
    batch: vi.fn(() => ({
      delete: mockBatchDelete,
      commit: mockBatchCommit,
    })),
  })),
  Timestamp: {
    now: vi.fn(() => ({
      toDate: () => new Date('2025-12-16T00:00:00Z'),
    })),
    fromDate: vi.fn((date: Date) => ({
      toDate: () => date,
    })),
  },
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  },
}))

// Mock firebase-functions/v2/scheduler
vi.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: vi.fn((options, handler) => handler),
}))

// Mock firebase-functions/v2
vi.mock('firebase-functions/v2', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock @fledgely/shared - use importOriginal to preserve all exports
vi.mock('@fledgely/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@fledgely/shared')>()
  return {
    ...actual,
    generateDailyGapSchedule: vi.fn((childId: string, date: Date) => ({
      childId,
      date: date.toISOString().slice(0, 10),
      gaps: [
        {
          startTime: '2025-12-17T09:00:00.000Z',
          endTime: '2025-12-17T09:10:00.000Z',
          durationMs: 10 * 60 * 1000,
        },
        {
          startTime: '2025-12-17T14:00:00.000Z',
          endTime: '2025-12-17T14:08:00.000Z',
          durationMs: 8 * 60 * 1000,
        },
      ],
      generatedAt: new Date('2025-12-16T00:00:00Z'),
      expiresAt: new Date('2025-12-17T00:00:00Z'),
    })),
  }
})

describe('privacyGapScheduleGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-12-16T00:00:00Z'))

    // Setup mock chain for document operations
    mockDoc.mockReturnValue({
      set: mockSet,
      get: mockGet,
      collection: mockCollection,
    })

    mockCollection.mockReturnValue({
      doc: mockDoc,
      get: mockGet,
      where: mockWhere,
    })

    mockWhere.mockReturnValue({
      get: vi.fn().mockResolvedValue({
        forEach: vi.fn(),
      }),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getChildrenWithMonitoring', () => {
    it('returns all children from Firestore', async () => {
      const { __testing } = await import('./privacyGapScheduleGenerator')

      const mockChildren = [
        { id: 'child1', data: () => ({ privacyGapsConfig: { enabled: true } }) },
        { id: 'child2', data: () => ({ privacyGapsConfig: { enabled: false } }) },
        { id: 'child3', data: () => ({}) }, // No config = enabled by default
      ]

      mockGet.mockResolvedValueOnce({
        forEach: (callback: (doc: { id: string; data: () => unknown }) => void) => {
          mockChildren.forEach((child) => callback(child))
        },
      })

      const db = { collection: mockCollection } as unknown as FirebaseFirestore.Firestore
      const children = await __testing.getChildrenWithMonitoring(db)

      expect(children).toHaveLength(3)
      expect(children[0].id).toBe('child1')
      expect(children[1].privacyGapsConfig?.enabled).toBe(false)
    })
  })

  describe('storeSchedule', () => {
    it('stores schedule in correct Firestore path', async () => {
      const { __testing } = await import('./privacyGapScheduleGenerator')

      const schedule = {
        childId: 'test-child',
        date: '2025-12-17',
        gaps: [
          {
            startTime: '2025-12-17T09:00:00.000Z',
            endTime: '2025-12-17T09:10:00.000Z',
            durationMs: 10 * 60 * 1000,
          },
        ],
        generatedAt: new Date('2025-12-16T00:00:00Z'),
        expiresAt: new Date('2025-12-17T00:00:00Z'),
      }

      const db = { collection: mockCollection } as unknown as FirebaseFirestore.Firestore
      await __testing.storeSchedule(db, schedule)

      expect(mockCollection).toHaveBeenCalledWith(PRIVACY_GAPS_CONSTANTS.SCHEDULE_COLLECTION)
      expect(mockDoc).toHaveBeenCalledWith('test-child')
      expect(mockCollection).toHaveBeenCalledWith('schedules')
      expect(mockDoc).toHaveBeenCalledWith('2025-12-17')
      expect(mockSet).toHaveBeenCalled()
    })
  })

  describe('generateScheduleForChild', () => {
    it('generates and stores schedule for enabled child', async () => {
      const { __testing } = await import('./privacyGapScheduleGenerator')

      const child = {
        id: 'enabled-child',
        privacyGapsConfig: { enabled: true },
      }

      // Setup mock chain for this test
      mockWhere.mockReturnValue({
        get: vi.fn().mockResolvedValue({
          forEach: vi.fn(),
        }),
      })

      const db = {
        collection: mockCollection,
        batch: vi.fn(() => ({
          delete: mockBatchDelete,
          commit: mockBatchCommit,
        })),
      } as unknown as FirebaseFirestore.Firestore

      const result = await __testing.generateScheduleForChild(
        db,
        child,
        new Date('2025-12-17')
      )

      expect(result.success).toBe(true)
      expect(result.gapCount).toBe(2)
      expect(mockSet).toHaveBeenCalled()
    })

    it('skips schedule generation for disabled child', async () => {
      const { __testing } = await import('./privacyGapScheduleGenerator')

      const child = {
        id: 'disabled-child',
        privacyGapsConfig: { enabled: false },
      }

      const db = { collection: mockCollection } as unknown as FirebaseFirestore.Firestore
      const result = await __testing.generateScheduleForChild(
        db,
        child,
        new Date('2025-12-17')
      )

      expect(result.success).toBe(true)
      expect(result.gapCount).toBe(0)
      expect(result.error).toBe('Privacy gaps disabled')
    })

    it('generates schedule for child without config (default enabled)', async () => {
      const { __testing } = await import('./privacyGapScheduleGenerator')

      const child = {
        id: 'no-config-child',
        privacyGapsConfig: undefined,
      }

      // Setup mock chain for this test
      mockWhere.mockReturnValue({
        get: vi.fn().mockResolvedValue({
          forEach: vi.fn(),
        }),
      })

      const db = {
        collection: mockCollection,
        batch: vi.fn(() => ({
          delete: mockBatchDelete,
          commit: mockBatchCommit,
        })),
      } as unknown as FirebaseFirestore.Firestore

      const result = await __testing.generateScheduleForChild(
        db,
        child,
        new Date('2025-12-17')
      )

      expect(result.success).toBe(true)
      expect(result.gapCount).toBe(2)
    })

    it('handles errors gracefully', async () => {
      const { __testing } = await import('./privacyGapScheduleGenerator')

      mockSet.mockRejectedValueOnce(new Error('Firestore error'))

      const child = {
        id: 'error-child',
        privacyGapsConfig: { enabled: true },
      }

      const db = { collection: mockCollection } as unknown as FirebaseFirestore.Firestore
      const result = await __testing.generateScheduleForChild(
        db,
        child,
        new Date('2025-12-17')
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Firestore error')
    })
  })

  describe('generateAllSchedules', () => {
    it('generates schedules for all children', async () => {
      const { __testing } = await import('./privacyGapScheduleGenerator')

      const mockChildren = [
        { id: 'child1', data: () => ({ privacyGapsConfig: { enabled: true } }) },
        { id: 'child2', data: () => ({ privacyGapsConfig: { enabled: true } }) },
        { id: 'child3', data: () => ({ privacyGapsConfig: { enabled: false } }) },
      ]

      mockGet.mockResolvedValueOnce({
        forEach: (callback: (doc: { id: string; data: () => unknown }) => void) => {
          mockChildren.forEach((child) => callback(child))
        },
      })

      const db = {
        collection: mockCollection,
        batch: vi.fn(() => ({
          delete: mockBatchDelete,
          commit: mockBatchCommit,
        })),
      } as unknown as FirebaseFirestore.Firestore

      const result = await __testing.generateAllSchedules(db, new Date('2025-12-17'))

      expect(result.totalChildren).toBe(3)
      expect(result.successCount).toBe(2) // Two enabled
      expect(result.skippedCount).toBe(1) // One disabled
      expect(result.failureCount).toBe(0)
    })

    it('returns correct target date in ISO format', async () => {
      const { __testing } = await import('./privacyGapScheduleGenerator')

      mockGet.mockResolvedValueOnce({
        forEach: vi.fn(),
      })

      const db = {
        collection: mockCollection,
        batch: vi.fn(() => ({
          delete: mockBatchDelete,
          commit: mockBatchCommit,
        })),
      } as unknown as FirebaseFirestore.Firestore

      const result = await __testing.generateAllSchedules(db, new Date('2025-12-17'))

      expect(result.targetDate).toBe('2025-12-17')
    })
  })

  describe('getSchedule', () => {
    it('returns schedule when it exists', async () => {
      const { __testing } = await import('./privacyGapScheduleGenerator')

      const mockTimestamp = { toDate: () => new Date('2025-12-16T00:00:00Z') }
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          childId: 'test-child',
          date: '2025-12-17',
          gaps: [],
          generatedAt: mockTimestamp,
          expiresAt: mockTimestamp,
        }),
      })

      const db = { collection: mockCollection } as unknown as FirebaseFirestore.Firestore
      const schedule = await __testing.getSchedule(db, 'test-child', '2025-12-17')

      expect(schedule).not.toBeNull()
      expect(schedule?.childId).toBe('test-child')
      expect(schedule?.date).toBe('2025-12-17')
    })

    it('returns null when schedule does not exist', async () => {
      const { __testing } = await import('./privacyGapScheduleGenerator')

      mockGet.mockResolvedValueOnce({
        exists: false,
      })

      const db = { collection: mockCollection } as unknown as FirebaseFirestore.Firestore
      const schedule = await __testing.getSchedule(db, 'test-child', '2025-12-17')

      expect(schedule).toBeNull()
    })
  })

  describe('deleteExpiredSchedules', () => {
    it('deletes expired schedules', async () => {
      const { __testing } = await import('./privacyGapScheduleGenerator')

      const mockExpiredDocs = [
        { ref: { id: 'expired1' } },
        { ref: { id: 'expired2' } },
      ]

      mockWhere.mockReturnValueOnce({
        get: vi.fn().mockResolvedValue({
          forEach: (callback: (doc: { ref: unknown }) => void) => {
            mockExpiredDocs.forEach((doc) => callback(doc))
          },
        }),
      })

      const db = {
        collection: mockCollection,
        batch: vi.fn(() => ({
          delete: mockBatchDelete,
          commit: mockBatchCommit,
        })),
      } as unknown as FirebaseFirestore.Firestore

      const deletedCount = await __testing.deleteExpiredSchedules(db, 'test-child')

      expect(deletedCount).toBe(2)
      expect(mockBatchDelete).toHaveBeenCalledTimes(2)
      expect(mockBatchCommit).toHaveBeenCalled()
    })

    it('does not commit batch when no expired schedules', async () => {
      const { __testing } = await import('./privacyGapScheduleGenerator')

      mockWhere.mockReturnValueOnce({
        get: vi.fn().mockResolvedValue({
          forEach: vi.fn(),
        }),
      })

      const db = {
        collection: mockCollection,
        batch: vi.fn(() => ({
          delete: mockBatchDelete,
          commit: mockBatchCommit,
        })),
      } as unknown as FirebaseFirestore.Firestore

      const deletedCount = await __testing.deleteExpiredSchedules(db, 'test-child')

      expect(deletedCount).toBe(0)
      expect(mockBatchCommit).not.toHaveBeenCalled()
    })
  })
})
