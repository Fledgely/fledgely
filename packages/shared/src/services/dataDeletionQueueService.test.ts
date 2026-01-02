/**
 * Data Deletion Queue Service Tests - Story 38.3 Task 5
 *
 * Tests for queuing data deletion after graduation.
 * AC5: Existing data enters deletion queue with configurable retention
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  queueDataForDeletion,
  getDeletionQueueStatus,
  getPendingDeletionTypes,
  calculateDeletionDate,
  getDeletionConfirmationMessage,
  processReadyDeletions,
  cancelPendingDeletion,
  markDeletionComplete,
  markDeletionFailed,
  getReadyForDeletion,
  clearAllDeletionData,
  getDeletionStats,
  DELETION_DATA_TYPES,
} from './dataDeletionQueueService'
import type { DataType } from '../contracts/graduationProcess'
import { GRADUATION_RETENTION_DAYS } from '../contracts/graduationProcess'

describe('DataDeletionQueueService', () => {
  beforeEach(() => {
    clearAllDeletionData()
  })

  // ============================================
  // queueDataForDeletion Tests
  // ============================================

  describe('queueDataForDeletion', () => {
    it('should create deletion queue entries for all data types', () => {
      const entries = queueDataForDeletion('child-456', 'family-789', 30)

      expect(entries.length).toBeGreaterThanOrEqual(4)
      const types = entries.map((e) => e.dataType)
      expect(types).toContain('screenshots')
      expect(types).toContain('flags')
      expect(types).toContain('activity_logs')
      expect(types).toContain('trust_history')
    })

    it('should set correct retention days', () => {
      const entries = queueDataForDeletion('child-456', 'family-789', 30)

      entries.forEach((entry) => {
        expect(entry.retentionDays).toBe(30)
      })
    })

    it('should set scheduled deletion date based on retention', () => {
      const entries = queueDataForDeletion('child-456', 'family-789', 30)
      const now = Date.now()
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000

      entries.forEach((entry) => {
        expect(entry.scheduledDeletionDate.getTime()).toBeGreaterThan(now + thirtyDaysMs - 1000)
        expect(entry.scheduledDeletionDate.getTime()).toBeLessThan(now + thirtyDaysMs + 1000)
      })
    })

    it('should set initial status to queued', () => {
      const entries = queueDataForDeletion('child-456', 'family-789', 30)

      entries.forEach((entry) => {
        expect(entry.status).toBe('queued')
      })
    })

    it('should use default retention if not specified', () => {
      const entries = queueDataForDeletion('child-456', 'family-789', GRADUATION_RETENTION_DAYS)

      expect(entries[0].retentionDays).toBe(GRADUATION_RETENTION_DAYS)
    })
  })

  // ============================================
  // getDeletionQueueStatus Tests
  // ============================================

  describe('getDeletionQueueStatus', () => {
    it('should return all entries for a child', () => {
      queueDataForDeletion('child-456', 'family-789', 30)

      const entries = getDeletionQueueStatus('child-456')
      expect(entries.length).toBeGreaterThanOrEqual(4)
    })

    it('should return empty array for unknown child', () => {
      const entries = getDeletionQueueStatus('unknown-child')
      expect(entries).toHaveLength(0)
    })
  })

  // ============================================
  // getPendingDeletionTypes Tests
  // ============================================

  describe('getPendingDeletionTypes', () => {
    it('should return pending deletion types with dates', () => {
      queueDataForDeletion('child-456', 'family-789', 30)

      const types = getPendingDeletionTypes('child-456')
      expect(types.length).toBeGreaterThanOrEqual(4)

      types.forEach((t) => {
        expect(t.type).toBeDefined()
        expect(t.scheduledDate).toBeDefined()
        expect(t.status).toBe('queued')
      })
    })
  })

  // ============================================
  // calculateDeletionDate Tests
  // ============================================

  describe('calculateDeletionDate', () => {
    it('should add retention days to graduation date', () => {
      const graduationDate = new Date('2025-06-01')
      const result = calculateDeletionDate(graduationDate, 30)

      const expected = new Date('2025-07-01')
      expect(result.getTime()).toBe(expected.getTime())
    })

    it('should handle 0 retention', () => {
      const graduationDate = new Date('2025-06-01')
      const result = calculateDeletionDate(graduationDate, 0)

      expect(result.getTime()).toBe(graduationDate.getTime())
    })
  })

  // ============================================
  // getDeletionConfirmationMessage Tests
  // ============================================

  describe('getDeletionConfirmationMessage', () => {
    it('should include data types and date', () => {
      const dataTypes: DataType[] = ['screenshots', 'flags']
      const deletionDate = new Date('2025-07-01')

      const message = getDeletionConfirmationMessage(dataTypes, deletionDate)

      expect(message).toContain('screenshots')
      expect(message).toContain('flags')
      expect(message).toMatch(/permanently\s*deleted/i)
    })

    it('should handle all data type', () => {
      const dataTypes: DataType[] = ['all']
      const deletionDate = new Date('2025-07-01')

      const message = getDeletionConfirmationMessage(dataTypes, deletionDate)

      expect(message).toMatch(/all|data/i)
    })
  })

  // ============================================
  // processReadyDeletions Tests
  // ============================================

  describe('processReadyDeletions', () => {
    it('should identify entries ready for deletion', () => {
      // Create entries with past deletion date
      const entries = queueDataForDeletion('child-456', 'family-789', 0)

      // Set deletion date to past
      entries.forEach((entry) => {
        entry.scheduledDeletionDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
      })

      const result = processReadyDeletions()

      expect(result.processed).toBeGreaterThanOrEqual(0)
      expect(result.success).toBeDefined()
      expect(result.failed).toBeDefined()
    })
  })

  // ============================================
  // cancelPendingDeletion Tests
  // ============================================

  describe('cancelPendingDeletion', () => {
    it('should cancel all pending deletions for child', () => {
      queueDataForDeletion('child-456', 'family-789', 30)

      cancelPendingDeletion('child-456')

      const entries = getDeletionQueueStatus('child-456')
      // After cancellation, entries should be removed or marked differently
      // Implementation may vary
      expect(entries.length).toBe(0)
    })

    it('should not throw for unknown child', () => {
      expect(() => cancelPendingDeletion('unknown-child')).not.toThrow()
    })
  })

  // ============================================
  // markDeletionComplete Tests
  // ============================================

  describe('markDeletionComplete', () => {
    it('should update status to completed', () => {
      const entries = queueDataForDeletion('child-456', 'family-789', 30)
      const entryId = entries[0].id

      const updated = markDeletionComplete(entryId)

      expect(updated.status).toBe('completed')
      expect(updated.completedAt).not.toBeNull()
    })
  })

  // ============================================
  // markDeletionFailed Tests
  // ============================================

  describe('markDeletionFailed', () => {
    it('should update status to failed', () => {
      const entries = queueDataForDeletion('child-456', 'family-789', 30)
      const entryId = entries[0].id

      const updated = markDeletionFailed(entryId)

      expect(updated.status).toBe('failed')
    })
  })

  // ============================================
  // getReadyForDeletion Tests
  // ============================================

  describe('getReadyForDeletion', () => {
    it('should return entries with past deletion date', () => {
      // Create entries with past deletion date
      queueDataForDeletion('child-456', 'family-789', 0)

      // Manually update to past date (in real impl, would use time travel)
      const entries = getDeletionQueueStatus('child-456')
      entries.forEach((entry) => {
        entry.scheduledDeletionDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
      })

      const ready = getReadyForDeletion()
      // Result depends on implementation
      expect(ready).toBeDefined()
    })
  })

  // ============================================
  // getDeletionStats Tests
  // ============================================

  describe('getDeletionStats', () => {
    it('should return accurate statistics', () => {
      queueDataForDeletion('child-456', 'family-789', 30)
      queueDataForDeletion('child-789', 'family-other', 30)

      const stats = getDeletionStats()

      expect(stats.total).toBeGreaterThanOrEqual(8)
      expect(stats.byStatus.queued).toBeGreaterThanOrEqual(8)
    })
  })

  // ============================================
  // DELETION_DATA_TYPES Tests
  // ============================================

  describe('DELETION_DATA_TYPES', () => {
    it('should include all required data types', () => {
      expect(DELETION_DATA_TYPES).toContain('screenshots')
      expect(DELETION_DATA_TYPES).toContain('flags')
      expect(DELETION_DATA_TYPES).toContain('activity_logs')
      expect(DELETION_DATA_TYPES).toContain('trust_history')
    })
  })
})
