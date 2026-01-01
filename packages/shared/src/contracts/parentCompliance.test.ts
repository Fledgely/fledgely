/**
 * Parent Compliance Tracking Tests - Story 32.4
 *
 * Tests for parent compliance schemas and messages.
 */

import { describe, it, expect } from 'vitest'
import {
  parentActivityEventSchema,
  parentComplianceRecordSchema,
  parentComplianceSummarySchema,
  PARENT_COMPLIANCE_MESSAGES,
  type ParentActivityEvent,
  type ParentComplianceRecord,
  type ParentComplianceSummary,
} from './index'

describe('parentCompliance - Story 32.4', () => {
  describe('parentActivityEventSchema', () => {
    it('validates navigation event', () => {
      const event: ParentActivityEvent = {
        timestamp: Date.now(),
        type: 'navigation',
      }
      expect(parentActivityEventSchema.safeParse(event).success).toBe(true)
    })

    it('validates browser_active event', () => {
      const event: ParentActivityEvent = {
        timestamp: Date.now(),
        type: 'browser_active',
      }
      expect(parentActivityEventSchema.safeParse(event).success).toBe(true)
    })

    it('rejects invalid event type', () => {
      const event = {
        timestamp: Date.now(),
        type: 'invalid_type',
      }
      expect(parentActivityEventSchema.safeParse(event).success).toBe(false)
    })

    it('rejects missing timestamp', () => {
      const event = {
        type: 'navigation',
      }
      expect(parentActivityEventSchema.safeParse(event).success).toBe(false)
    })
  })

  describe('parentComplianceRecordSchema', () => {
    const validRecord: ParentComplianceRecord = {
      familyId: 'family-123',
      parentUid: 'parent-456',
      deviceId: 'device-789',
      parentDisplayName: 'Mom',
      offlineWindowStart: 1704067200000, // Jan 1, 2024 00:00
      offlineWindowEnd: 1704110400000, // Jan 1, 2024 12:00
      wasCompliant: true,
      activityEvents: [],
      createdAt: Date.now(),
    }

    it('validates compliant record with no events (AC1)', () => {
      expect(parentComplianceRecordSchema.safeParse(validRecord).success).toBe(true)
    })

    it('validates non-compliant record with events (AC5)', () => {
      const nonCompliantRecord: ParentComplianceRecord = {
        ...validRecord,
        wasCompliant: false,
        activityEvents: [
          { timestamp: 1704080400000, type: 'navigation' },
          { timestamp: 1704084000000, type: 'browser_active' },
        ],
      }
      expect(parentComplianceRecordSchema.safeParse(nonCompliantRecord).success).toBe(true)
    })

    it('allows optional parentDisplayName', () => {
      const recordWithoutName = {
        ...validRecord,
        parentDisplayName: undefined,
      }
      delete (recordWithoutName as Record<string, unknown>).parentDisplayName
      expect(parentComplianceRecordSchema.safeParse(recordWithoutName).success).toBe(true)
    })

    it('defaults activityEvents to empty array', () => {
      const recordWithoutEvents = {
        familyId: 'family-123',
        parentUid: 'parent-456',
        deviceId: 'device-789',
        offlineWindowStart: 1704067200000,
        offlineWindowEnd: 1704110400000,
        wasCompliant: true,
        createdAt: Date.now(),
      }
      const result = parentComplianceRecordSchema.safeParse(recordWithoutEvents)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.activityEvents).toEqual([])
      }
    })

    it('rejects missing required fields', () => {
      const incompleteRecord = {
        familyId: 'family-123',
        // missing other required fields
      }
      expect(parentComplianceRecordSchema.safeParse(incompleteRecord).success).toBe(false)
    })
  })

  describe('parentComplianceSummarySchema', () => {
    it('validates complete summary (AC3)', () => {
      const summary: ParentComplianceSummary = {
        parentUid: 'parent-123',
        totalWindows: 10,
        compliantWindows: 8,
        compliancePercentage: 80,
        lastRecordDate: Date.now(),
      }
      expect(parentComplianceSummarySchema.safeParse(summary).success).toBe(true)
    })

    it('allows null lastRecordDate for new users', () => {
      const summary: ParentComplianceSummary = {
        parentUid: 'parent-123',
        totalWindows: 0,
        compliantWindows: 0,
        compliancePercentage: 0,
        lastRecordDate: null,
      }
      expect(parentComplianceSummarySchema.safeParse(summary).success).toBe(true)
    })

    it('allows 100% compliance', () => {
      const summary: ParentComplianceSummary = {
        parentUid: 'parent-123',
        totalWindows: 5,
        compliantWindows: 5,
        compliancePercentage: 100,
        lastRecordDate: Date.now(),
      }
      expect(parentComplianceSummarySchema.safeParse(summary).success).toBe(true)
    })
  })

  describe('PARENT_COMPLIANCE_MESSAGES - AC4: Transparency without shaming', () => {
    it('generates compliant message with name', () => {
      const message = PARENT_COMPLIANCE_MESSAGES.compliant('Mom')
      expect(message).toBe('Mom was offline for family time')
      // Should NOT contain shaming language
      expect(message.toLowerCase()).not.toContain('good')
      expect(message.toLowerCase()).not.toContain('bad')
      expect(message.toLowerCase()).not.toContain('failed')
    })

    it('generates non-compliant message without shaming', () => {
      const message = PARENT_COMPLIANCE_MESSAGES.nonCompliant('Dad')
      expect(message).toBe('Dad used the phone during offline time')
      // Should NOT contain shaming language
      expect(message.toLowerCase()).not.toContain('broke')
      expect(message.toLowerCase()).not.toContain('failed')
      expect(message.toLowerCase()).not.toContain('bad')
    })

    it('has encouraging summary messages', () => {
      expect(PARENT_COMPLIANCE_MESSAGES.encouragement).toBe('Every family moment counts!')
      expect(PARENT_COMPLIANCE_MESSAGES.greatJob).toBe('Great job leading by example!')
    })

    it('has header messages', () => {
      expect(PARENT_COMPLIANCE_MESSAGES.summaryHeader).toBe('Family Offline Time')
      expect(PARENT_COMPLIANCE_MESSAGES.yourStats).toBe('Your Compliance')
    })
  })
})
