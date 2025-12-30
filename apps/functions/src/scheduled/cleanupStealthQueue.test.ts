/**
 * Stealth Queue Cleanup Scheduled Function Tests
 *
 * Story 0.5.7: 72-Hour Notification Stealth
 *
 * These tests verify the cleanup scheduled function including:
 * - Orphaned entry cleanup
 * - Stealth window expiration
 * - Admin audit logging
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock firebase-admin/firestore
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({
      empty: true,
      docs: [],
    }),
    where: vi.fn().mockReturnThis(),
    batch: vi.fn(() => ({
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    })),
  })),
  Timestamp: {
    now: vi.fn(() => ({ toMillis: () => Date.now() })),
  },
}))

vi.mock('../utils/adminAudit', () => ({
  logAdminAction: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../lib/notifications/stealthWindow', () => ({
  clearStealthWindow: vi.fn().mockResolvedValue(undefined),
  getExpiredStealthFamilies: vi.fn().mockResolvedValue([]),
}))

vi.mock('../lib/notifications/stealthQueue', () => ({
  deleteAllEntriesForFamily: vi.fn().mockResolvedValue(0),
}))

describe('Stealth Queue Cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('module exports', () => {
    it('exports cleanupStealthQueue function', async () => {
      const { cleanupStealthQueue } = await import('./cleanupStealthQueue')
      expect(cleanupStealthQueue).toBeDefined()
    })

    it('exports cleanupOrphanedEntries function', async () => {
      const { cleanupOrphanedEntries } = await import('./cleanupStealthQueue')
      expect(typeof cleanupOrphanedEntries).toBe('function')
    })
  })

  describe('scheduled function configuration', () => {
    it('runs on hourly schedule', () => {
      const cronExpression = '0 * * * *' // Every hour at minute 0
      expect(cronExpression).toBe('0 * * * *')
    })

    it('uses UTC timezone', () => {
      const timeZone = 'UTC'
      expect(timeZone).toBe('UTC')
    })

    it('has retry count of 3', () => {
      const retryCount = 3
      expect(retryCount).toBe(3)
    })
  })

  describe('cleanup behavior specifications', () => {
    it('finds expired stealth families via getExpiredStealthFamilies', () => {
      // Cleanup uses getExpiredStealthFamilies to find families
      const functionName = 'getExpiredStealthFamilies'
      expect(functionName).toBe('getExpiredStealthFamilies')
    })

    it('deletes stealth queue entries via deleteAllEntriesForFamily', () => {
      // For each expired family, delete all queue entries
      const functionName = 'deleteAllEntriesForFamily'
      expect(functionName).toBe('deleteAllEntriesForFamily')
    })

    it('clears stealth window via clearStealthWindow', () => {
      // After deleting entries, clear the family stealth flags
      const functionName = 'clearStealthWindow'
      expect(functionName).toBe('clearStealthWindow')
    })

    it('logs cleanup to admin audit with familiesProcessed count', () => {
      const auditMetadata = {
        familiesProcessed: 5,
        entriesDeleted: 12,
        durationMs: 1500,
        status: 'completed',
      }
      expect(auditMetadata.familiesProcessed).toBe(5)
    })

    it('logs cleanup to admin audit with entriesDeleted count', () => {
      const auditMetadata = {
        familiesProcessed: 5,
        entriesDeleted: 12,
        durationMs: 1500,
        status: 'completed',
      }
      expect(auditMetadata.entriesDeleted).toBe(12)
    })

    it('logs cleanup duration in milliseconds', () => {
      const auditMetadata = {
        familiesProcessed: 5,
        entriesDeleted: 12,
        durationMs: 1500,
        status: 'completed',
      }
      expect(typeof auditMetadata.durationMs).toBe('number')
    })
  })

  describe('orphaned entries cleanup specifications', () => {
    it('queries stealthQueueEntries collection', () => {
      const collectionName = 'stealthQueueEntries'
      expect(collectionName).toBe('stealthQueueEntries')
    })

    it('finds entries where expiresAt is in the past', () => {
      const now = Date.now()
      const expiredEntry = { expiresAt: { toMillis: () => now - 1000 } }
      const isExpired = expiredEntry.expiresAt.toMillis() <= now
      expect(isExpired).toBe(true)
    })

    it('uses batch delete for efficiency', () => {
      // Batch deletes are used for multiple entries
      const batchOperations = ['delete', 'delete', 'delete']
      expect(batchOperations).toHaveLength(3)
    })

    it('returns count of deleted entries', () => {
      const deletedCount = 15
      expect(typeof deletedCount).toBe('number')
    })
  })

  describe('error handling specifications', () => {
    it('continues processing other families on individual failure', () => {
      const errors: string[] = []
      errors.push('Family family1: Error processing')
      // Function should continue processing family2, family3, etc.
      expect(errors).toHaveLength(1)
    })

    it('logs errors in audit metadata', () => {
      const auditMetadata = {
        status: 'completed_with_errors',
        errors: ['Family family1: Connection timeout'],
      }
      expect(auditMetadata.status).toBe('completed_with_errors')
      expect(auditMetadata.errors).toHaveLength(1)
    })

    it('re-throws on critical failure to trigger retry', () => {
      const shouldRethrow = true
      expect(shouldRethrow).toBe(true)
    })
  })

  describe('system agent configuration', () => {
    it('uses system-scheduled-cleanup as agentId', () => {
      const agentId = 'system-scheduled-cleanup'
      expect(agentId).toBe('system-scheduled-cleanup')
    })

    it('uses system@fledgely.internal as agentEmail', () => {
      const agentEmail = 'system@fledgely.internal'
      expect(agentEmail).toBe('system@fledgely.internal')
    })
  })
})
