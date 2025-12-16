/**
 * Tests for Allowlist Sync Monitor
 *
 * Story 7.7: Allowlist Distribution & Sync - Task 8.6
 *
 * Tests the scheduled monitoring function that checks for stale allowlist
 * caches across all platforms.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ALLOWLIST_SYNC_CONSTANTS } from '@fledgely/contracts'

// Mock firebase-admin/firestore
const mockDoc = vi.fn()
const mockGet = vi.fn()
const mockSet = vi.fn().mockResolvedValue({ id: 'alert-id' })
const mockAdd = vi.fn().mockResolvedValue({ id: 'audit-id' })
const mockWhere = vi.fn()
const mockLimit = vi.fn()

const mockCollection = vi.fn().mockImplementation((name: string) => {
  if (name === ALLOWLIST_SYNC_CONSTANTS.SYNC_ALERTS_COLLECTION) {
    return {
      doc: vi.fn().mockImplementation(() => ({
        set: mockSet,
      })),
      where: mockWhere.mockReturnThis(),
      limit: mockLimit.mockReturnThis(),
      get: mockGet,
    }
  }
  if (name === ALLOWLIST_SYNC_CONSTANTS.SYNC_STATUS_COLLECTION) {
    return {
      doc: mockDoc.mockImplementation(() => ({
        get: mockGet,
      })),
    }
  }
  return {
    add: mockAdd,
  }
})

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: mockCollection,
  })),
  Timestamp: {
    now: vi.fn(() => ({
      toDate: () => new Date('2025-12-15T10:00:00Z'),
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

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-v4'),
}))

describe('allowlistSyncMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-12-15T10:00:00Z'))
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  describe('checkAllPlatforms', () => {
    it('returns stale=true for missing platform data', async () => {
      // Reset mocks for this test
      vi.resetModules()

      // Setup mock for missing document
      const localMockGet = vi.fn().mockResolvedValue({ exists: false })
      const localMockDoc = vi.fn().mockImplementation(() => ({
        get: localMockGet,
      }))
      const localMockCollection = vi.fn().mockImplementation(() => ({
        doc: localMockDoc,
      }))

      vi.doMock('firebase-admin/firestore', () => ({
        getFirestore: vi.fn(() => ({
          collection: localMockCollection,
        })),
        Timestamp: {
          now: vi.fn(() => ({ toDate: () => new Date() })),
        },
        FieldValue: {
          serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
        },
      }))

      const { checkAllPlatforms } = await import('./allowlistSyncMonitor')
      const mockDb = {
        collection: localMockCollection,
      } as unknown as FirebaseFirestore.Firestore

      const results = await checkAllPlatforms(mockDb)

      // All platforms should be considered stale (no data)
      expect(results).toHaveLength(4)
      results.forEach((result) => {
        expect(result.isStale).toBe(true)
        expect(result.hasData).toBe(false)
      })
    })

    it('returns stale=false for recently synced platform', async () => {
      vi.resetModules()

      const recentSync = new Date('2025-12-15T08:00:00Z').toISOString() // 2 hours ago
      const mockStatus = {
        platform: 'web',
        version: '1.0.0',
        lastSyncAt: recentSync,
        isStale: false,
        cacheAge: 1000,
        isEmergency: false,
      }

      const localMockGet = vi.fn().mockResolvedValue({
        exists: true,
        data: () => mockStatus,
      })
      const localMockDoc = vi.fn().mockImplementation(() => ({
        get: localMockGet,
      }))
      const localMockCollection = vi.fn().mockImplementation(() => ({
        doc: localMockDoc,
      }))

      vi.doMock('firebase-admin/firestore', () => ({
        getFirestore: vi.fn(() => ({
          collection: localMockCollection,
        })),
        Timestamp: {
          now: vi.fn(() => ({ toDate: () => new Date() })),
        },
        FieldValue: {
          serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
        },
      }))

      const { checkAllPlatforms } = await import('./allowlistSyncMonitor')
      const mockDb = {
        collection: localMockCollection,
      } as unknown as FirebaseFirestore.Firestore

      const results = await checkAllPlatforms(mockDb)

      expect(results).toHaveLength(4)
      // First result (web) should not be stale since we mocked all platforms to return same data
      expect(results[0].isStale).toBe(false)
      expect(results[0].hasData).toBe(true)
    })

    it('returns stale=true for platform synced >48h ago', async () => {
      vi.resetModules()

      const staleSync = new Date('2025-12-12T08:00:00Z').toISOString() // 3 days ago
      const mockStatus = {
        platform: 'web',
        version: '1.0.0',
        lastSyncAt: staleSync,
        isStale: true,
        cacheAge: 72 * 60 * 60 * 1000, // 72 hours
        isEmergency: false,
      }

      const localMockGet = vi.fn().mockResolvedValue({
        exists: true,
        data: () => mockStatus,
      })
      const localMockDoc = vi.fn().mockImplementation(() => ({
        get: localMockGet,
      }))
      const localMockCollection = vi.fn().mockImplementation(() => ({
        doc: localMockDoc,
      }))

      vi.doMock('firebase-admin/firestore', () => ({
        getFirestore: vi.fn(() => ({
          collection: localMockCollection,
        })),
        Timestamp: {
          now: vi.fn(() => ({ toDate: () => new Date() })),
        },
        FieldValue: {
          serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
        },
      }))

      const { checkAllPlatforms } = await import('./allowlistSyncMonitor')
      const mockDb = {
        collection: localMockCollection,
      } as unknown as FirebaseFirestore.Firestore

      const results = await checkAllPlatforms(mockDb)

      expect(results).toHaveLength(4)
      expect(results[0].isStale).toBe(true)
      expect(results[0].hasData).toBe(true)
    })
  })

  describe('createStaleAlert', () => {
    it('creates alert for stale platform', async () => {
      vi.resetModules()

      const localMockSet = vi.fn().mockResolvedValue({})
      const localMockGet = vi.fn().mockResolvedValue({ empty: true })
      const localMockWhere = vi.fn().mockReturnThis()
      const localMockLimit = vi.fn().mockReturnThis()
      const localMockCollection = vi.fn().mockImplementation(() => ({
        doc: vi.fn().mockImplementation(() => ({
          set: localMockSet,
        })),
        where: localMockWhere,
        limit: localMockLimit,
        get: localMockGet,
      }))

      vi.doMock('firebase-admin/firestore', () => ({
        getFirestore: vi.fn(() => ({
          collection: localMockCollection,
        })),
        Timestamp: {
          now: vi.fn(() => ({ toDate: () => new Date() })),
        },
        FieldValue: {
          serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
        },
      }))

      const { createStaleAlert, PlatformCheckResult } = await import(
        './allowlistSyncMonitor'
      )
      const mockDb = {
        collection: localMockCollection,
      } as unknown as FirebaseFirestore.Firestore

      const staleResult: PlatformCheckResult = {
        platform: 'android',
        status: {
          platform: 'android',
          version: '1.0.0',
          lastSyncAt: '2025-12-12T08:00:00Z',
          isStale: true,
          cacheAge: 72 * 60 * 60 * 1000,
          isEmergency: false,
        },
        isStale: true,
        staleDuration: 72 * 60 * 60 * 1000,
        hasData: true,
      }

      const alert = await createStaleAlert(mockDb, staleResult)

      expect(alert).not.toBeNull()
      expect(alert?.platform).toBe('android')
      expect(alert?.resolved).toBe(false)
      expect(localMockSet).toHaveBeenCalled()
    })

    it('does not create duplicate alert', async () => {
      vi.resetModules()

      const localMockSet = vi.fn().mockResolvedValue({})
      // Existing unresolved alert
      const localMockGet = vi.fn().mockResolvedValue({
        empty: false,
        docs: [{ data: () => ({ platform: 'android', resolved: false }) }],
      })
      const localMockWhere = vi.fn().mockReturnThis()
      const localMockLimit = vi.fn().mockReturnThis()
      const localMockCollection = vi.fn().mockImplementation(() => ({
        doc: vi.fn().mockImplementation(() => ({
          set: localMockSet,
        })),
        where: localMockWhere,
        limit: localMockLimit,
        get: localMockGet,
      }))

      vi.doMock('firebase-admin/firestore', () => ({
        getFirestore: vi.fn(() => ({
          collection: localMockCollection,
        })),
        Timestamp: {
          now: vi.fn(() => ({ toDate: () => new Date() })),
        },
        FieldValue: {
          serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
        },
      }))

      const { createStaleAlert, PlatformCheckResult } = await import(
        './allowlistSyncMonitor'
      )
      const mockDb = {
        collection: localMockCollection,
      } as unknown as FirebaseFirestore.Firestore

      const staleResult: PlatformCheckResult = {
        platform: 'android',
        status: null,
        isStale: true,
        staleDuration: null,
        hasData: false,
      }

      const alert = await createStaleAlert(mockDb, staleResult)

      // Should not create duplicate
      expect(alert).toBeNull()
      expect(localMockSet).not.toHaveBeenCalled()
    })
  })

  describe('runMonitoringCheck', () => {
    it('returns success with all platforms current', async () => {
      vi.resetModules()

      const recentSync = new Date('2025-12-15T08:00:00Z').toISOString()
      const mockStatus = {
        platform: 'web',
        version: '1.0.0',
        lastSyncAt: recentSync,
        isStale: false,
        cacheAge: 1000,
        isEmergency: false,
      }

      const localMockGet = vi.fn()
        .mockResolvedValueOnce({ exists: true, data: () => mockStatus })
        .mockResolvedValueOnce({ exists: true, data: () => ({ ...mockStatus, platform: 'chrome-extension' }) })
        .mockResolvedValueOnce({ exists: true, data: () => ({ ...mockStatus, platform: 'android' }) })
        .mockResolvedValueOnce({ exists: true, data: () => ({ ...mockStatus, platform: 'ios' }) })

      const localMockDoc = vi.fn().mockImplementation(() => ({
        get: localMockGet,
      }))
      const localMockCollection = vi.fn().mockImplementation(() => ({
        doc: localMockDoc,
      }))

      vi.doMock('firebase-admin/firestore', () => ({
        getFirestore: vi.fn(() => ({
          collection: localMockCollection,
        })),
        Timestamp: {
          now: vi.fn(() => ({ toDate: () => new Date() })),
        },
        FieldValue: {
          serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
        },
      }))

      const { runMonitoringCheck } = await import('./allowlistSyncMonitor')
      const mockDb = {
        collection: localMockCollection,
      } as unknown as FirebaseFirestore.Firestore

      const result = await runMonitoringCheck(mockDb)

      expect(result.success).toBe(true)
      expect(result.totalPlatforms).toBe(4)
      expect(result.stalePlatforms).toHaveLength(0)
      expect(result.missingPlatforms).toHaveLength(0)
    })

    it('identifies stale platforms correctly', async () => {
      vi.resetModules()

      const recentSync = new Date('2025-12-15T08:00:00Z').toISOString()
      const staleSync = new Date('2025-12-12T08:00:00Z').toISOString()

      const webStatus = {
        platform: 'web',
        version: '1.0.0',
        lastSyncAt: recentSync,
        isStale: false,
        cacheAge: 1000,
        isEmergency: false,
      }
      const chromeStatus = {
        platform: 'chrome-extension',
        version: '1.0.0',
        lastSyncAt: recentSync,
        isStale: false,
        cacheAge: 1000,
        isEmergency: false,
      }
      const androidStatus = {
        platform: 'android',
        version: '1.0.0',
        lastSyncAt: staleSync, // Stale
        isStale: true,
        cacheAge: 72 * 60 * 60 * 1000,
        isEmergency: false,
      }
      const iosStatus = {
        platform: 'ios',
        version: '1.0.0',
        lastSyncAt: recentSync,
        isStale: false,
        cacheAge: 1000,
        isEmergency: false,
      }

      const statusMap: Record<string, unknown> = {
        web: webStatus,
        'chrome-extension': chromeStatus,
        android: androidStatus,
        ios: iosStatus,
      }

      // Mock for alerts collection (createStaleAlert)
      const alertsMock = {
        doc: vi.fn().mockImplementation(() => ({
          set: vi.fn().mockResolvedValue({}),
        })),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ empty: true }), // No existing alerts
      }

      // Mock for status collection (checkAllPlatforms)
      const statusMock = {
        doc: vi.fn().mockImplementation((platform: string) => ({
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => statusMap[platform],
          }),
        })),
      }

      const localMockCollection = vi.fn().mockImplementation((name: string) => {
        if (name === ALLOWLIST_SYNC_CONSTANTS.SYNC_ALERTS_COLLECTION) {
          return alertsMock
        }
        if (name === ALLOWLIST_SYNC_CONSTANTS.SYNC_STATUS_COLLECTION) {
          return statusMock
        }
        return { add: vi.fn().mockResolvedValue({ id: 'audit-id' }) }
      })

      vi.doMock('firebase-admin/firestore', () => ({
        getFirestore: vi.fn(() => ({
          collection: localMockCollection,
        })),
        Timestamp: {
          now: vi.fn(() => ({ toDate: () => new Date() })),
        },
        FieldValue: {
          serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
        },
      }))

      const { runMonitoringCheck } = await import('./allowlistSyncMonitor')
      const mockDb = {
        collection: localMockCollection,
      } as unknown as FirebaseFirestore.Firestore

      const result = await runMonitoringCheck(mockDb)

      expect(result.success).toBe(true)
      expect(result.stalePlatforms).toHaveLength(1)
      expect(result.stalePlatforms[0].platform).toBe('android')
    })

    it('handles errors gracefully', async () => {
      vi.resetModules()

      const localMockGet = vi.fn().mockRejectedValue(new Error('Firestore unavailable'))
      const localMockDoc = vi.fn().mockImplementation(() => ({
        get: localMockGet,
      }))
      const localMockCollection = vi.fn().mockImplementation(() => ({
        doc: localMockDoc,
      }))

      vi.doMock('firebase-admin/firestore', () => ({
        getFirestore: vi.fn(() => ({
          collection: localMockCollection,
        })),
        Timestamp: {
          now: vi.fn(() => ({ toDate: () => new Date() })),
        },
        FieldValue: {
          serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
        },
      }))

      const { runMonitoringCheck } = await import('./allowlistSyncMonitor')
      const mockDb = {
        collection: localMockCollection,
      } as unknown as FirebaseFirestore.Firestore

      const result = await runMonitoringCheck(mockDb)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Firestore unavailable')
    })
  })

  describe('scheduled function', () => {
    it('logs warning when stale platforms detected', async () => {
      vi.resetModules()

      const staleSync = new Date('2025-12-12T08:00:00Z').toISOString()
      const mockStatus = {
        platform: 'web',
        version: '1.0.0',
        lastSyncAt: staleSync, // All stale
        isStale: true,
        cacheAge: 72 * 60 * 60 * 1000,
        isEmergency: false,
      }

      const localMockAdd = vi.fn().mockResolvedValue({ id: 'audit-id' })
      const localMockSet = vi.fn().mockResolvedValue({})
      const localMockGet = vi.fn()
        .mockResolvedValueOnce({ exists: true, data: () => mockStatus })
        .mockResolvedValueOnce({ exists: true, data: () => ({ ...mockStatus, platform: 'chrome-extension' }) })
        .mockResolvedValueOnce({ exists: true, data: () => ({ ...mockStatus, platform: 'android' }) })
        .mockResolvedValueOnce({ exists: true, data: () => ({ ...mockStatus, platform: 'ios' }) })
        // For createStaleAlert checks
        .mockResolvedValue({ empty: true })

      const localMockDoc = vi.fn().mockImplementation(() => ({
        get: localMockGet,
        set: localMockSet,
      }))
      const localMockWhere = vi.fn().mockReturnThis()
      const localMockLimit = vi.fn().mockReturnThis()
      const localMockCollection = vi.fn().mockImplementation((name: string) => {
        if (name === ALLOWLIST_SYNC_CONSTANTS.SYNC_ALERTS_COLLECTION) {
          return {
            doc: localMockDoc,
            where: localMockWhere,
            limit: localMockLimit,
            get: localMockGet,
          }
        }
        if (name === ALLOWLIST_SYNC_CONSTANTS.SYNC_STATUS_COLLECTION) {
          return {
            doc: localMockDoc,
          }
        }
        return {
          add: localMockAdd,
        }
      })

      vi.doMock('firebase-admin/firestore', () => ({
        getFirestore: vi.fn(() => ({
          collection: localMockCollection,
        })),
        Timestamp: {
          now: vi.fn(() => ({ toDate: () => new Date() })),
        },
        FieldValue: {
          serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
        },
      }))

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { allowlistSyncMonitor } = await import('./allowlistSyncMonitor')

      await allowlistSyncMonitor({} as never)

      // Should log audit entry
      expect(localMockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'allowlist-sync-check',
        })
      )

      // Should output warning
      expect(consoleSpy).toHaveBeenCalledWith(
        'ALERT: Stale allowlist platforms detected',
        expect.objectContaining({
          stalePlatformCount: 4,
        })
      )

      consoleSpy.mockRestore()
    })
  })
})
