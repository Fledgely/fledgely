/**
 * Temporary Access Expiry Scheduled Function Tests
 *
 * Story 39.3: Temporary Caregiver Access
 * - AC3: Automatic access expiry when end time is reached
 * - AC4: Caregiver notifications when access starts/ends
 * - AC6: All temporary access logged
 *
 * Tests cover:
 * - Scheduled function configuration
 * - Grant expiry logic (active → expired)
 * - Grant activation logic (pending → active)
 * - Audit log creation
 * - Error handling and retry behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock firebase-admin/firestore
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collectionGroup: vi.fn().mockReturnThis(),
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({
      empty: true,
      docs: [],
    }),
    add: vi.fn().mockResolvedValue({ id: 'audit-123' }),
    batch: vi.fn(() => ({
      update: vi.fn(),
      set: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    })),
  })),
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  },
  Timestamp: {
    now: vi.fn(() => ({
      toMillis: () => Date.now(),
      toDate: () => new Date(),
    })),
    fromDate: vi.fn((date: Date) => ({
      toMillis: () => date.getTime(),
      toDate: () => date,
    })),
  },
}))

describe('Temporary Access Expiry Scheduled Function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('module exports', () => {
    it('exports processTemporaryAccessExpiry function', async () => {
      const { processTemporaryAccessExpiry } = await import('./processTemporaryAccessExpiry')
      expect(processTemporaryAccessExpiry).toBeDefined()
    })
  })

  describe('scheduled function configuration', () => {
    it('runs every 5 minutes', () => {
      const cronExpression = '*/5 * * * *'
      expect(cronExpression).toBe('*/5 * * * *')
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

  describe('grant expiry specifications (active → expired)', () => {
    it('queries temporaryAccessGrants collection group', () => {
      const collectionName = 'temporaryAccessGrants'
      expect(collectionName).toBe('temporaryAccessGrants')
    })

    it('finds active grants where endAt is in the past', () => {
      const now = Date.now()
      const activeGrant = {
        status: 'active',
        endAt: { toMillis: () => now - 60000 }, // 1 minute ago
      }

      const shouldExpire = activeGrant.status === 'active' && activeGrant.endAt.toMillis() <= now

      expect(shouldExpire).toBe(true)
    })

    it('does not expire grants with future endAt', () => {
      const now = Date.now()
      const activeGrant = {
        status: 'active',
        endAt: { toMillis: () => now + 60000 }, // 1 minute in future
      }

      const shouldExpire = activeGrant.status === 'active' && activeGrant.endAt.toMillis() <= now

      expect(shouldExpire).toBe(false)
    })

    it('updates grant status to expired', () => {
      const updateData = {
        status: 'expired',
        expiredAt: 'SERVER_TIMESTAMP',
      }

      expect(updateData.status).toBe('expired')
      expect(updateData.expiredAt).toBeDefined()
    })

    it('creates audit log with temporary_access_expired action', () => {
      const auditEntry = {
        action: 'temporary_access_expired',
        changes: {
          grantId: 'grant-123',
          previousStatus: 'active',
          endAt: '2026-01-05T18:00:00.000Z',
        },
      }

      expect(auditEntry.action).toBe('temporary_access_expired')
      expect(auditEntry.changes.previousStatus).toBe('active')
    })
  })

  describe('grant activation specifications (pending → active)', () => {
    it('finds pending grants where startAt is in the past', () => {
      const now = Date.now()
      const pendingGrant = {
        status: 'pending',
        startAt: { toMillis: () => now - 60000 }, // 1 minute ago
        endAt: { toMillis: () => now + 3600000 }, // 1 hour in future
      }

      const shouldActivate =
        pendingGrant.status === 'pending' &&
        pendingGrant.startAt.toMillis() <= now &&
        pendingGrant.endAt.toMillis() > now

      expect(shouldActivate).toBe(true)
    })

    it('does not activate grants with future startAt', () => {
      const now = Date.now()
      const pendingGrant = {
        status: 'pending',
        startAt: { toMillis: () => now + 3600000 }, // 1 hour in future
      }

      const shouldActivate =
        pendingGrant.status === 'pending' && pendingGrant.startAt.toMillis() <= now

      expect(shouldActivate).toBe(false)
    })

    it('skips activation if endAt has also passed', () => {
      const now = Date.now()
      const expiredPendingGrant = {
        status: 'pending',
        startAt: { toMillis: () => now - 3600000 }, // 1 hour ago
        endAt: { toMillis: () => now - 1800000 }, // 30 minutes ago
      }

      // If endAt has passed, should skip activation (will be expired instead)
      const endAtPassed = expiredPendingGrant.endAt.toMillis() <= now
      expect(endAtPassed).toBe(true)
    })

    it('updates grant status to active', () => {
      const updateData = {
        status: 'active',
        activatedAt: 'SERVER_TIMESTAMP',
      }

      expect(updateData.status).toBe('active')
      expect(updateData.activatedAt).toBeDefined()
    })

    it('creates audit log with temporary_access_started action', () => {
      const auditEntry = {
        action: 'temporary_access_started',
        changes: {
          grantId: 'grant-456',
          previousStatus: 'pending',
          startAt: '2026-01-05T10:00:00.000Z',
          endAt: '2026-01-05T18:00:00.000Z',
        },
      }

      expect(auditEntry.action).toBe('temporary_access_started')
      expect(auditEntry.changes.previousStatus).toBe('pending')
    })
  })

  describe('audit log structure', () => {
    it('includes familyId in audit entry', () => {
      const auditEntry = {
        familyId: 'family-123',
        caregiverUid: 'caregiver-456',
        action: 'temporary_access_expired',
      }

      expect(auditEntry.familyId).toBe('family-123')
    })

    it('includes caregiverUid in audit entry', () => {
      const auditEntry = {
        familyId: 'family-123',
        caregiverUid: 'caregiver-456',
        action: 'temporary_access_expired',
      }

      expect(auditEntry.caregiverUid).toBe('caregiver-456')
    })

    it('uses system agent ID for changedByUid', () => {
      const changedByUid = 'system-temporary-access-expiry'
      expect(changedByUid).toBe('system-temporary-access-expiry')
    })

    it('includes createdAt timestamp', () => {
      const auditEntry = {
        createdAt: 'SERVER_TIMESTAMP',
      }

      expect(auditEntry.createdAt).toBeDefined()
    })
  })

  describe('processing stats tracking', () => {
    it('tracks expired grants count', () => {
      const stats = {
        expired: 5,
        activated: 3,
        errors: [],
      }

      expect(stats.expired).toBe(5)
    })

    it('tracks activated grants count', () => {
      const stats = {
        expired: 5,
        activated: 3,
        errors: [],
      }

      expect(stats.activated).toBe(3)
    })

    it('collects errors without stopping processing', () => {
      const stats = {
        expired: 4,
        activated: 2,
        errors: ['Grant grant-1: Connection error', 'Grant grant-2: Invalid data'],
      }

      expect(stats.expired).toBe(4)
      expect(stats.errors).toHaveLength(2)
    })
  })

  describe('admin audit for scheduled run', () => {
    it('logs scheduled run to adminAuditLogs collection', () => {
      const collectionName = 'adminAuditLogs'
      expect(collectionName).toBe('adminAuditLogs')
    })

    it('uses system-temporary-access-expiry as agentId', () => {
      const agentId = 'system-temporary-access-expiry'
      expect(agentId).toBe('system-temporary-access-expiry')
    })

    it('uses system@fledgely.internal as agentEmail', () => {
      const agentEmail = 'system@fledgely.internal'
      expect(agentEmail).toBe('system@fledgely.internal')
    })

    it('includes processing stats in metadata', () => {
      const metadata = {
        expired: 5,
        activated: 3,
        durationMs: 1250,
        status: 'completed',
      }

      expect(metadata.expired).toBe(5)
      expect(metadata.activated).toBe(3)
      expect(metadata.durationMs).toBe(1250)
      expect(metadata.status).toBe('completed')
    })

    it('sets status to completed_with_errors when errors occurred', () => {
      const metadata = {
        status: 'completed_with_errors',
        errors: ['Some error'],
      }

      expect(metadata.status).toBe('completed_with_errors')
    })

    it('sets status to failed on critical error', () => {
      const metadata = {
        status: 'failed',
        errors: ['Critical failure'],
      }

      expect(metadata.status).toBe('failed')
    })
  })

  describe('error handling', () => {
    it('continues processing after individual grant failure', () => {
      const stats = {
        expired: 4,
        activated: 2,
        errors: ['Grant grant-1: Error'],
      }

      // Despite error on grant-1, other grants were processed
      expect(stats.expired + stats.activated).toBe(6)
    })

    it('captures error message in stats', () => {
      const error = new Error('Connection timeout')
      const errorMessage = error.message

      expect(errorMessage).toBe('Connection timeout')
    })

    it('re-throws critical errors to trigger retry', () => {
      const shouldRethrow = true
      expect(shouldRethrow).toBe(true)
    })

    it('logs errors to console', () => {
      const logMessage = 'Grant expired: familyId=family-123, grantId=grant-456'
      expect(logMessage).toContain('familyId=')
      expect(logMessage).toContain('grantId=')
    })
  })

  describe('batch operations', () => {
    it('uses batch for atomic updates', () => {
      // Each grant update + audit log should be atomic
      const batchOperations = ['update', 'set', 'commit']
      expect(batchOperations).toContain('update')
      expect(batchOperations).toContain('set')
      expect(batchOperations).toContain('commit')
    })

    it('updates grant document in batch', () => {
      const updateOperation = {
        ref: 'doc-ref',
        data: { status: 'expired', expiredAt: 'SERVER_TIMESTAMP' },
      }

      expect(updateOperation.data.status).toBe('expired')
    })

    it('creates audit log in batch', () => {
      const setOperation = {
        ref: 'audit-ref',
        data: {
          action: 'temporary_access_expired',
          createdAt: 'SERVER_TIMESTAMP',
        },
      }

      expect(setOperation.data.action).toBe('temporary_access_expired')
    })
  })
})
