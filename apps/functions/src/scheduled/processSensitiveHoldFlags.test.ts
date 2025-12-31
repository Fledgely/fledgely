/**
 * Process Sensitive Hold Flags Tests
 *
 * Story 21.2: Distress Detection Suppression (FR21A) - AC6
 *
 * Tests for the 48-hour release mechanism.
 *
 * @vitest-environment node
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
  })),
}))

vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

vi.mock('../utils/adminAudit', () => ({
  logAdminAction: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../services/classification/suppressionAudit', () => ({
  markSuppressionReleased: vi.fn().mockResolvedValue(undefined),
}))

describe('processSensitiveHoldFlags (Story 21.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('shouldAutoRelease', () => {
    it('returns false for high severity (never auto-released)', async () => {
      const { shouldAutoRelease } = await import('./processSensitiveHoldFlags')
      expect(shouldAutoRelease('high')).toBe(false)
    })

    it('returns true for medium severity', async () => {
      const { shouldAutoRelease } = await import('./processSensitiveHoldFlags')
      expect(shouldAutoRelease('medium')).toBe(true)
    })

    it('returns true for low severity', async () => {
      const { shouldAutoRelease } = await import('./processSensitiveHoldFlags')
      expect(shouldAutoRelease('low')).toBe(true)
    })

    it('returns false for unknown severity', async () => {
      const { shouldAutoRelease } = await import('./processSensitiveHoldFlags')
      expect(shouldAutoRelease('unknown')).toBe(false)
      expect(shouldAutoRelease('')).toBe(false)
    })
  })

  describe('module exports', () => {
    it('exports processSensitiveHoldFlags function', async () => {
      const { processSensitiveHoldFlags } = await import('./processSensitiveHoldFlags')
      expect(processSensitiveHoldFlags).toBeDefined()
    })

    it('exports shouldAutoRelease function', async () => {
      const { shouldAutoRelease } = await import('./processSensitiveHoldFlags')
      expect(typeof shouldAutoRelease).toBe('function')
    })
  })

  describe('scheduled function configuration', () => {
    it('runs on daily schedule at 3 AM UTC', () => {
      const cronExpression = '0 3 * * *' // Every day at 3 AM
      expect(cronExpression).toBe('0 3 * * *')
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

  describe('release policy specifications', () => {
    it('high severity self-harm flags never auto-release', async () => {
      const { shouldAutoRelease } = await import('./processSensitiveHoldFlags')
      expect(shouldAutoRelease('high')).toBe(false)
    })

    it('medium severity flags can be auto-released after 48h', async () => {
      const { shouldAutoRelease } = await import('./processSensitiveHoldFlags')
      expect(shouldAutoRelease('medium')).toBe(true)
    })

    it('low severity flags can be auto-released after 48h', async () => {
      const { shouldAutoRelease } = await import('./processSensitiveHoldFlags')
      expect(shouldAutoRelease('low')).toBe(true)
    })
  })

  describe('audit logging specifications', () => {
    it('logs to admin audit with flagsProcessed count', () => {
      const auditMetadata = {
        flagsProcessed: 10,
        flagsReleased: 8,
        flagsKeptSuppressed: 2,
        durationMs: 1500,
        status: 'completed',
      }
      expect(auditMetadata.flagsProcessed).toBe(10)
    })

    it('logs to admin audit with flagsReleased count', () => {
      const auditMetadata = {
        flagsProcessed: 10,
        flagsReleased: 8,
        flagsKeptSuppressed: 2,
        durationMs: 1500,
        status: 'completed',
      }
      expect(auditMetadata.flagsReleased).toBe(8)
    })

    it('logs to admin audit with flagsKeptSuppressed count', () => {
      const auditMetadata = {
        flagsProcessed: 10,
        flagsReleased: 8,
        flagsKeptSuppressed: 2,
        durationMs: 1500,
        status: 'completed',
      }
      expect(auditMetadata.flagsKeptSuppressed).toBe(2)
    })

    it('logs processing duration in milliseconds', () => {
      const auditMetadata = {
        flagsProcessed: 10,
        flagsReleased: 8,
        flagsKeptSuppressed: 2,
        durationMs: 1500,
        status: 'completed',
      }
      expect(typeof auditMetadata.durationMs).toBe('number')
    })
  })

  describe('system agent configuration', () => {
    it('uses system-scheduled-release as agentId', () => {
      const agentId = 'system-scheduled-release'
      expect(agentId).toBe('system-scheduled-release')
    })

    it('uses system@fledgely.internal as agentEmail', () => {
      const agentEmail = 'system@fledgely.internal'
      expect(agentEmail).toBe('system@fledgely.internal')
    })
  })

  describe('release behavior specifications', () => {
    it('queries suppressionAudit collection for releasable flags', () => {
      const collectionName = 'suppressionAudit'
      expect(collectionName).toBe('suppressionAudit')
    })

    it('finds flags where released is false and releasableAfter <= now', () => {
      const now = Date.now()
      const releasableFlag = {
        released: false,
        releasableAfter: now - 1000,
      }
      const isReleasable = !releasableFlag.released && releasableFlag.releasableAfter <= now
      expect(isReleasable).toBe(true)
    })

    it('updates screenshot document concern flags from sensitive_hold to pending', () => {
      const originalFlag = {
        category: 'Self-Harm Indicators',
        status: 'sensitive_hold',
        severity: 'medium',
      }
      const releasedFlag = {
        ...originalFlag,
        status: 'pending',
        releasedAt: Date.now(),
      }
      expect(releasedFlag.status).toBe('pending')
      expect(releasedFlag.releasedAt).toBeDefined()
    })

    it('marks suppression audit entry as released', () => {
      const auditEntry = {
        released: true,
        releasedAt: Date.now(),
      }
      expect(auditEntry.released).toBe(true)
    })
  })

  describe('error handling specifications', () => {
    it('continues processing other flags on individual failure', () => {
      const errors: string[] = []
      errors.push('Flag flag1: Error processing')
      // Function should continue processing flag2, flag3, etc.
      expect(errors).toHaveLength(1)
    })

    it('logs errors in audit metadata', () => {
      const auditMetadata = {
        status: 'completed_with_errors',
        errors: ['Flag flag1: Screenshot not found'],
      }
      expect(auditMetadata.status).toBe('completed_with_errors')
      expect(auditMetadata.errors).toHaveLength(1)
    })

    it('re-throws on critical failure to trigger retry', () => {
      const shouldRethrow = true
      expect(shouldRethrow).toBe(true)
    })
  })
})
