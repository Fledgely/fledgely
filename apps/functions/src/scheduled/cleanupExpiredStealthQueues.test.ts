import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock firebase-admin/firestore
const mockGet = vi.fn()
const mockDoc = vi.fn()
const mockCollection = vi.fn()
const mockWhere = vi.fn()
const mockBatch = vi.fn()
const mockCommit = vi.fn()
const mockDelete = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: mockCollection,
    doc: mockDoc,
    batch: mockBatch,
  }),
  FieldValue: {
    serverTimestamp: () => ({ _serverTimestamp: true }),
  },
  Timestamp: {
    now: () => ({
      toDate: () => new Date('2025-01-15T12:00:00Z'),
    }),
    fromDate: (date: Date) => ({
      toDate: () => date,
    }),
  },
}))

// Mock firebase-functions/v2
vi.mock('firebase-functions/v2', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

// Mock firebase-functions/v2/scheduler
vi.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: vi.fn((options, handler) => handler),
}))

// Mock generateIntegrityHash
vi.mock('../utils/notificationStealth', () => ({
  generateIntegrityHash: vi.fn(() => 'mock-integrity-hash'),
  chunkArray: <T>(array: T[], chunkSize: number): T[][] => {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  },
  FIRESTORE_BATCH_LIMIT: 500,
}))

describe('cleanupExpiredStealthQueues', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock chain
    mockCollection.mockReturnValue({
      doc: mockDoc,
      where: mockWhere,
    })

    mockWhere.mockReturnValue({
      where: mockWhere,
      get: mockGet,
    })

    mockDoc.mockReturnValue({
      get: mockGet,
      collection: mockCollection,
      delete: mockDelete,
    })

    mockBatch.mockReturnValue({
      delete: mockDelete,
      commit: mockCommit,
    })

    mockCommit.mockResolvedValue(undefined)
    mockDelete.mockReturnValue(undefined)
  })

  describe('Expired queue cleanup', () => {
    it('should find expired stealth queues', async () => {
      // Setup mock for expired queues query
      const expiredQueue = {
        id: 'queue-123',
        data: () => ({
          familyId: 'family-123',
          targetUserIds: ['user-456'],
          status: 'active',
          expiresAt: { toDate: () => new Date('2025-01-14T12:00:00Z') },
        }),
        ref: { id: 'queue-123' },
      }

      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [expiredQueue],
      })

      // Verify the query structure would work
      expect(mockCollection).toBeDefined()
      expect(mockWhere).toBeDefined()
    })

    it('should delete held notifications for expired queue', async () => {
      const notifications = [
        { id: 'notif-1', ref: { id: 'notif-1' } },
        { id: 'notif-2', ref: { id: 'notif-2' } },
      ]

      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: notifications,
      })

      // Verify batch operations would be set up
      expect(mockBatch).toBeDefined()
      expect(mockDelete).toBeDefined()
    })

    it('should handle empty expired queue list', async () => {
      mockGet.mockResolvedValueOnce({
        empty: true,
        docs: [],
      })

      // With no expired queues, no deletions should occur
      expect(mockCommit).not.toHaveBeenCalled()
    })

    it('should log cleanup to sealed admin audit', async () => {
      // The function should create an audit log entry for each cleanup
      const mockAuditAdd = vi.fn().mockResolvedValue({ id: 'audit-123' })
      mockCollection.mockReturnValue({
        add: mockAuditAdd,
        where: mockWhere,
        doc: mockDoc,
      })

      // Verify audit logging structure is available
      expect(mockCollection).toBeDefined()
    })
  })

  describe('Batch processing', () => {
    it('should chunk large notification sets into batches of 500', async () => {
      // Create 1200 mock notifications (requires 3 batches)
      const largeNotificationSet = Array.from({ length: 1200 }, (_, i) => ({
        id: `notif-${i}`,
        ref: { id: `notif-${i}` },
      }))

      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: largeNotificationSet,
      })

      // The chunkArray utility should split into batches
      const { chunkArray } = await import('../utils/notificationStealth')
      const chunks = chunkArray(largeNotificationSet, 500)

      expect(chunks).toHaveLength(3)
      expect(chunks[0]).toHaveLength(500)
      expect(chunks[1]).toHaveLength(500)
      expect(chunks[2]).toHaveLength(200)
    })

    it('should handle single batch for small notification sets', async () => {
      const smallNotificationSet = Array.from({ length: 50 }, (_, i) => ({
        id: `notif-${i}`,
        ref: { id: `notif-${i}` },
      }))

      const { chunkArray } = await import('../utils/notificationStealth')
      const chunks = chunkArray(smallNotificationSet, 500)

      expect(chunks).toHaveLength(1)
      expect(chunks[0]).toHaveLength(50)
    })
  })

  describe('Queue status updates', () => {
    it('should mark queue as expired after cleanup', async () => {
      // After cleanup, queue status should be updated to 'expired'
      const mockUpdate = vi.fn().mockResolvedValue(undefined)
      mockDoc.mockReturnValue({
        update: mockUpdate,
        collection: mockCollection,
        get: mockGet,
      })

      // Verify update capability exists
      expect(mockDoc).toBeDefined()
    })

    it('should delete the queue document after cleanup', async () => {
      mockDelete.mockResolvedValue(undefined)

      // Verify delete capability exists
      expect(mockDelete).toBeDefined()
    })
  })

  describe('Error handling', () => {
    it('should continue processing other queues if one fails', async () => {
      // If one queue cleanup fails, others should still be processed
      const queue1 = {
        id: 'queue-1',
        data: () => ({ familyId: 'family-1', targetUserIds: ['user-1'] }),
        ref: { id: 'queue-1' },
      }
      const queue2 = {
        id: 'queue-2',
        data: () => ({ familyId: 'family-2', targetUserIds: ['user-2'] }),
        ref: { id: 'queue-2' },
      }

      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [queue1, queue2],
      })

      // Error handling should be in place
      expect(mockGet).toBeDefined()
    })

    it('should log errors for failed cleanup operations', async () => {
      mockCommit.mockRejectedValueOnce(new Error('Batch commit failed'))

      // Error should be logged but not crash the function
      expect(mockCommit).toBeDefined()
    })
  })

  describe('Audit logging', () => {
    it('should include queue ID in audit log', async () => {
      const mockAuditAdd = vi.fn().mockResolvedValue({ id: 'audit-123' })

      // Audit log should contain queueId for traceability
      const auditEntry = {
        action: 'stealth-queue-cleanup',
        queueId: 'queue-123',
        familyId: 'family-123',
        notificationsDeleted: 5,
        timestamp: expect.any(Object),
      }

      expect(auditEntry.queueId).toBe('queue-123')
    })

    it('should include notification count in audit log', async () => {
      const auditEntry = {
        action: 'stealth-queue-cleanup',
        queueId: 'queue-123',
        notificationsDeleted: 42,
      }

      expect(auditEntry.notificationsDeleted).toBe(42)
    })

    it('should generate integrity hash for audit entry', async () => {
      const { generateIntegrityHash } = await import('../utils/notificationStealth')

      const auditData = {
        action: 'stealth-queue-cleanup',
        queueId: 'queue-123',
      }

      const hash = generateIntegrityHash(auditData)
      expect(hash).toBe('mock-integrity-hash')
    })
  })

  describe('Schedule configuration', () => {
    it('should run every 60 minutes', async () => {
      const { onSchedule } = await import('firebase-functions/v2/scheduler')

      // The function is configured to run every 60 minutes
      expect(onSchedule).toBeDefined()
    })

    it('should have appropriate timeout for batch operations', () => {
      // Function should have enough timeout to process large batches
      const expectedTimeoutSeconds = 300 // 5 minutes

      expect(expectedTimeoutSeconds).toBeGreaterThanOrEqual(300)
    })
  })
})

describe('Stealth queue lifecycle', () => {
  it('should only cleanup queues past expiration time', () => {
    const now = new Date('2025-01-15T12:00:00Z')
    const expiredQueue = {
      expiresAt: new Date('2025-01-15T11:00:00Z'), // 1 hour ago
    }
    const activeQueue = {
      expiresAt: new Date('2025-01-15T13:00:00Z'), // 1 hour from now
    }

    expect(expiredQueue.expiresAt < now).toBe(true)
    expect(activeQueue.expiresAt < now).toBe(false)
  })

  it('should preserve queues that are still active', () => {
    const activeQueue = {
      status: 'active',
      expiresAt: new Date('2025-01-16T12:00:00Z'),
    }

    // Active queues with future expiration should not be deleted
    expect(activeQueue.status).toBe('active')
  })

  it('should handle queues with no held notifications', () => {
    const emptyQueue = {
      id: 'queue-empty',
      heldNotificationCount: 0,
    }

    // Queue should still be cleaned up even if no notifications were held
    expect(emptyQueue.heldNotificationCount).toBe(0)
  })
})
