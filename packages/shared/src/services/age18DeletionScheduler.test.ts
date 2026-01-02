/**
 * Age18DeletionScheduler Tests - Story 38.5 Task 5
 *
 * Tests for scheduled daily birthdate checks.
 * AC7: Scheduled function executes daily to check birthdates
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  executeDailyAge18Check,
  sendPreDeletionNotifications,
  retryFailedDeletions,
  getLastSchedulerRun,
  getSchedulerStats,
  clearSchedulerData,
} from './age18DeletionScheduler'
import { setBirthdate, clearAllBirthdateData } from './birthdateService'
import {
  clearAllAge18DeletionData,
  executeAge18Deletion,
  markDeletionFailed,
} from './age18DeletionService'
import { clearAllNotificationData } from './age18NotificationService'
import { PRE_DELETION_NOTICE_DAYS } from '../contracts/age18Deletion'

describe('Age18DeletionScheduler', () => {
  beforeEach(() => {
    clearAllBirthdateData()
    clearAllAge18DeletionData()
    clearAllNotificationData()
    clearSchedulerData()
  })

  // ============================================
  // Daily Check Execution Tests (AC7)
  // ============================================

  describe('executeDailyAge18Check', () => {
    it('should find and process children turning 18 today', () => {
      // Set up a child who turns 18 today
      const eighteenYearsAgo = new Date()
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18)

      setBirthdate('child-turning-18', 'family-123', eighteenYearsAgo)

      const result = executeDailyAge18Check()

      expect(result.childrenChecked).toBeGreaterThanOrEqual(1)
      expect(result.deletionsTriggered).toBe(1)
    })

    it('should return zero deletions when no children turning 18', () => {
      // Set up a child who is not 18 yet
      const tenYearsAgo = new Date()
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10)

      setBirthdate('child-10', 'family-123', tenYearsAgo)

      const result = executeDailyAge18Check()

      expect(result.deletionsTriggered).toBe(0)
    })

    it('should process multiple children turning 18', () => {
      const eighteenYearsAgo = new Date()
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18)

      setBirthdate('child-1', 'family-1', eighteenYearsAgo)
      setBirthdate('child-2', 'family-2', eighteenYearsAgo)
      setBirthdate('child-3', 'family-3', eighteenYearsAgo)

      const result = executeDailyAge18Check()

      expect(result.deletionsTriggered).toBe(3)
    })

    it('should send notifications after deletion', () => {
      const eighteenYearsAgo = new Date()
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18)

      setBirthdate('child-turning-18', 'family-123', eighteenYearsAgo)

      const result = executeDailyAge18Check()

      expect(result.notificationsSent).toBe(1)
    })

    it('should update scheduler stats', () => {
      const eighteenYearsAgo = new Date()
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18)

      setBirthdate('child-18', 'family-123', eighteenYearsAgo)

      executeDailyAge18Check()

      const stats = getSchedulerStats()
      expect(stats.totalRuns).toBe(1)
      expect(stats.totalDeletions).toBe(1)
    })
  })

  // ============================================
  // Pre-Deletion Notification Tests
  // ============================================

  describe('sendPreDeletionNotifications', () => {
    it('should send notifications to children 30 days from 18', () => {
      // Set up a child who turns 18 in 30 days
      const almostEighteen = new Date()
      almostEighteen.setFullYear(almostEighteen.getFullYear() - 18)
      almostEighteen.setDate(almostEighteen.getDate() + PRE_DELETION_NOTICE_DAYS)

      setBirthdate('child-almost-18', 'family-123', almostEighteen)

      const count = sendPreDeletionNotifications()

      expect(count).toBe(1)
    })

    it('should return 0 when no children approaching 18', () => {
      const tenYearsAgo = new Date()
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10)

      setBirthdate('child-10', 'family-123', tenYearsAgo)

      const count = sendPreDeletionNotifications()

      expect(count).toBe(0)
    })
  })

  // ============================================
  // Failed Deletion Retry Tests
  // ============================================

  describe('retryFailedDeletions', () => {
    it('should retry failed deletions', () => {
      const eighteenYearsAgo = new Date()
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18)

      setBirthdate('child-18', 'family-123', eighteenYearsAgo)

      // Execute and mark as failed
      executeAge18Deletion('child-18', 'family-123')
      markDeletionFailed('child-18')

      const result = retryFailedDeletions()

      expect(result.retried).toBe(1)
    })

    it('should return 0 when no failed deletions', () => {
      const result = retryFailedDeletions()

      expect(result.retried).toBe(0)
      expect(result.succeeded).toBe(0)
      expect(result.failed).toBe(0)
    })
  })

  // ============================================
  // Scheduler Status Tests
  // ============================================

  describe('getLastSchedulerRun', () => {
    it('should return null before first run', () => {
      const lastRun = getLastSchedulerRun()
      expect(lastRun).toBeNull()
    })

    it('should return last run info after execution', () => {
      executeDailyAge18Check()

      const lastRun = getLastSchedulerRun()
      expect(lastRun).not.toBeNull()
      expect(lastRun?.timestamp).toBeInstanceOf(Date)
      expect(lastRun?.result).toBeDefined()
    })
  })

  describe('getSchedulerStats', () => {
    it('should return initial stats', () => {
      const stats = getSchedulerStats()

      expect(stats.totalRuns).toBe(0)
      expect(stats.totalDeletions).toBe(0)
      expect(stats.failedDeletions).toBe(0)
      expect(stats.lastRunAt).toBeNull()
    })

    it('should accumulate stats over multiple runs', () => {
      const eighteenYearsAgo = new Date()
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18)

      setBirthdate('child-1', 'family-1', eighteenYearsAgo)

      executeDailyAge18Check()

      // Clear birthdates and add new ones for second run
      clearAllBirthdateData()
      setBirthdate('child-2', 'family-2', eighteenYearsAgo)

      executeDailyAge18Check()

      const stats = getSchedulerStats()
      expect(stats.totalRuns).toBe(2)
      expect(stats.totalDeletions).toBe(2)
    })
  })
})
