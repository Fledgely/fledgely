/**
 * Child Flag Notification Service Tests - Story 23.1
 *
 * Tests for child notification functionality including:
 * - Distress suppression check (AC #6)
 * - Timer calculations (AC #5)
 * - Notification status management (AC #1, #4)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FlagDocument } from '@fledgely/shared'
import { ANNOTATION_WINDOW_MS } from '@fledgely/shared'
import {
  isDistressSuppressed,
  calculateAnnotationDeadline,
  getRemainingTime,
  formatRemainingTime,
  isWaitingForAnnotation,
  hasAnnotationWindowExpired,
} from './childFlagNotificationService'

// Mock Firebase
vi.mock('../lib/firebase', () => ({
  getFirestoreDb: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  updateDoc: vi.fn(),
  getDoc: vi.fn(),
}))

const createMockFlag = (overrides: Partial<FlagDocument> = {}): FlagDocument => ({
  id: 'flag-123',
  childId: 'child-456',
  familyId: 'family-789',
  screenshotRef: 'children/child-456/screenshots/ss-123',
  screenshotId: 'ss-123',
  category: 'Violence',
  severity: 'medium',
  confidence: 75,
  reasoning: 'Test reasoning',
  status: 'pending',
  createdAt: Date.now(),
  throttled: false,
  ...overrides,
})

describe('childFlagNotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isDistressSuppressed', () => {
    it('should return true for distress-suppressed flags (AC6)', () => {
      const flag = createMockFlag({
        status: 'sensitive_hold',
        suppressionReason: 'distress_content',
      })

      expect(isDistressSuppressed(flag)).toBe(true)
    })

    it('should return false for regular pending flags', () => {
      const flag = createMockFlag({ status: 'pending' })

      expect(isDistressSuppressed(flag)).toBe(false)
    })

    it('should return false for sensitive_hold without suppressionReason', () => {
      const flag = createMockFlag({
        status: 'sensitive_hold',
        suppressionReason: undefined,
      })

      expect(isDistressSuppressed(flag)).toBe(false)
    })

    it('should return false for reviewed flags', () => {
      const flag = createMockFlag({ status: 'reviewed' })

      expect(isDistressSuppressed(flag)).toBe(false)
    })

    it('should return false for dismissed flags', () => {
      const flag = createMockFlag({ status: 'dismissed' })

      expect(isDistressSuppressed(flag)).toBe(false)
    })
  })

  describe('calculateAnnotationDeadline', () => {
    it('should return timestamp 30 minutes from now (AC5)', () => {
      const now = Date.now()
      const deadline = calculateAnnotationDeadline(now)

      expect(deadline).toBe(now + ANNOTATION_WINDOW_MS)
      expect(deadline - now).toBe(30 * 60 * 1000)
    })

    it('should use current time when no timestamp provided', () => {
      const before = Date.now()
      const deadline = calculateAnnotationDeadline()
      const after = Date.now()

      // Deadline should be 30 minutes from roughly now
      expect(deadline).toBeGreaterThanOrEqual(before + ANNOTATION_WINDOW_MS)
      expect(deadline).toBeLessThanOrEqual(after + ANNOTATION_WINDOW_MS)
    })
  })

  describe('getRemainingTime', () => {
    it('should return positive value for future deadline', () => {
      const futureDeadline = Date.now() + 15 * 60 * 1000 // 15 minutes from now
      const remaining = getRemainingTime(futureDeadline)

      expect(remaining).toBeGreaterThan(0)
      expect(remaining).toBeLessThanOrEqual(15 * 60 * 1000)
    })

    it('should return 0 for past deadline', () => {
      const pastDeadline = Date.now() - 5 * 60 * 1000 // 5 minutes ago
      const remaining = getRemainingTime(pastDeadline)

      expect(remaining).toBe(0)
    })

    it('should return 0 for current time deadline', () => {
      const currentDeadline = Date.now()
      const remaining = getRemainingTime(currentDeadline)

      expect(remaining).toBe(0)
    })
  })

  describe('formatRemainingTime', () => {
    it('should format 25 minutes remaining (AC5)', () => {
      const result = formatRemainingTime(25 * 60 * 1000)
      expect(result).toBe('25 minutes to add your explanation')
    })

    it('should format 1 minute remaining (singular)', () => {
      const result = formatRemainingTime(1 * 60 * 1000)
      expect(result).toBe('1 minute to add your explanation')
    })

    it('should format 0 milliseconds as expired', () => {
      const result = formatRemainingTime(0)
      expect(result).toBe('Time expired')
    })

    it('should format negative time as expired', () => {
      const result = formatRemainingTime(-5000)
      expect(result).toBe('Time expired')
    })

    it('should round up partial minutes', () => {
      // 2.5 minutes should show as 3 minutes
      const result = formatRemainingTime(2.5 * 60 * 1000)
      expect(result).toBe('3 minutes to add your explanation')
    })

    it('should round up small amounts to 1 minute', () => {
      // 30 seconds should show as 1 minute
      const result = formatRemainingTime(30 * 1000)
      expect(result).toBe('1 minute to add your explanation')
    })
  })

  describe('isWaitingForAnnotation', () => {
    it('should return true when notified and deadline is in future', () => {
      const flag = createMockFlag({
        childNotificationStatus: 'notified',
        annotationDeadline: Date.now() + 15 * 60 * 1000,
      })

      expect(isWaitingForAnnotation(flag)).toBe(true)
    })

    it('should return false when not notified', () => {
      const flag = createMockFlag({
        childNotificationStatus: 'pending',
        annotationDeadline: Date.now() + 15 * 60 * 1000,
      })

      expect(isWaitingForAnnotation(flag)).toBe(false)
    })

    it('should return false when notification was skipped', () => {
      const flag = createMockFlag({
        childNotificationStatus: 'skipped',
        annotationDeadline: Date.now() + 15 * 60 * 1000,
      })

      expect(isWaitingForAnnotation(flag)).toBe(false)
    })

    it('should return false when deadline has passed', () => {
      const flag = createMockFlag({
        childNotificationStatus: 'notified',
        annotationDeadline: Date.now() - 5 * 60 * 1000,
      })

      expect(isWaitingForAnnotation(flag)).toBe(false)
    })

    it('should return false when no annotation deadline set', () => {
      const flag = createMockFlag({
        childNotificationStatus: 'notified',
        annotationDeadline: undefined,
      })

      expect(isWaitingForAnnotation(flag)).toBe(false)
    })
  })

  describe('hasAnnotationWindowExpired', () => {
    it('should return true when notified and deadline passed', () => {
      const flag = createMockFlag({
        childNotificationStatus: 'notified',
        annotationDeadline: Date.now() - 5 * 60 * 1000,
      })

      expect(hasAnnotationWindowExpired(flag)).toBe(true)
    })

    it('should return false when deadline is in future', () => {
      const flag = createMockFlag({
        childNotificationStatus: 'notified',
        annotationDeadline: Date.now() + 15 * 60 * 1000,
      })

      expect(hasAnnotationWindowExpired(flag)).toBe(false)
    })

    it('should return false when not notified', () => {
      const flag = createMockFlag({
        childNotificationStatus: 'pending',
        annotationDeadline: Date.now() - 5 * 60 * 1000,
      })

      expect(hasAnnotationWindowExpired(flag)).toBe(false)
    })

    it('should return false when skipped', () => {
      const flag = createMockFlag({
        childNotificationStatus: 'skipped',
        annotationDeadline: Date.now() - 5 * 60 * 1000,
      })

      expect(hasAnnotationWindowExpired(flag)).toBe(false)
    })

    it('should return false when no deadline set', () => {
      const flag = createMockFlag({
        childNotificationStatus: 'notified',
        annotationDeadline: undefined,
      })

      expect(hasAnnotationWindowExpired(flag)).toBe(false)
    })
  })
})
