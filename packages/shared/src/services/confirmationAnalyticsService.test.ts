/**
 * Confirmation Analytics Service Tests - Story 7.5.3 Task 8
 *
 * Tests for confirmation analytics tracking and reporting.
 * AC7: Analytics for continuous improvement (anonymized)
 *
 * CRITICAL: All analytics must be anonymized - no PII.
 * TDD approach: Write tests first, then implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  // Tracking functions
  trackConfirmationDisplayed,
  trackResourceClicked,
  trackChatInitiated,
  trackConfirmationDismissed,
  // Analytics retrieval
  getAnalyticsData,
  getResourceClickStats,
  getDisplayStats,
  // Reporting
  generateAnonymousReport,
  generateJurisdictionReport,
  // Analytics management
  clearAnalyticsData,
  getAnalyticsCount,
} from './confirmationAnalyticsService'

describe('Confirmation Analytics Service', () => {
  beforeEach(() => {
    clearAnalyticsData()
  })

  // ============================================
  // Tracking Tests
  // ============================================

  describe('trackConfirmationDisplayed', () => {
    it('should track confirmation display event', () => {
      trackConfirmationDisplayed('US', 'young_child')

      const data = getAnalyticsData()
      expect(data).toHaveLength(1)
      expect(data[0].eventType).toBe('confirmation_displayed')
    })

    it('should record jurisdiction', () => {
      trackConfirmationDisplayed('UK', 'teen')

      const data = getAnalyticsData()
      expect(data[0].jurisdiction).toBe('UK')
    })

    it('should record age group', () => {
      trackConfirmationDisplayed('US', 'middle_child')

      const data = getAnalyticsData()
      expect(data[0].ageGroup).toBe('middle_child')
    })

    it('should record timestamp', () => {
      const before = Date.now()
      trackConfirmationDisplayed('CA', 'teen')
      const after = Date.now()

      const data = getAnalyticsData()
      expect(data[0].timestamp).toBeGreaterThanOrEqual(before)
      expect(data[0].timestamp).toBeLessThanOrEqual(after)
    })

    it('should NOT record any PII', () => {
      trackConfirmationDisplayed('US', 'young_child')

      const data = getAnalyticsData()
      const eventString = JSON.stringify(data[0])

      // Should not contain any identifiable information
      expect(eventString).not.toContain('email')
      expect(eventString).not.toContain('name')
      expect(eventString).not.toContain('userId')
      expect(eventString).not.toContain('childId')
      expect(eventString).not.toContain('familyId')
    })

    it('should track multiple displays', () => {
      trackConfirmationDisplayed('US', 'young_child')
      trackConfirmationDisplayed('UK', 'teen')
      trackConfirmationDisplayed('AU', 'middle_child')

      const data = getAnalyticsData()
      expect(data).toHaveLength(3)
    })
  })

  describe('trackResourceClicked', () => {
    it('should track resource click event', () => {
      trackResourceClicked('resource-123', 'hotline', 'US')

      const data = getAnalyticsData()
      expect(data).toHaveLength(1)
      expect(data[0].eventType).toBe('resource_clicked')
    })

    it('should record resource ID', () => {
      trackResourceClicked('988-lifeline', 'hotline', 'US')

      const data = getAnalyticsData()
      expect(data[0].resourceId).toBe('988-lifeline')
    })

    it('should record resource type', () => {
      trackResourceClicked('crisis-text', 'chat', 'US')

      const data = getAnalyticsData()
      expect(data[0].resourceType).toBe('chat')
    })

    it('should record jurisdiction', () => {
      trackResourceClicked('samaritans', 'hotline', 'UK')

      const data = getAnalyticsData()
      expect(data[0].jurisdiction).toBe('UK')
    })
  })

  describe('trackChatInitiated', () => {
    it('should track chat initiation', () => {
      trackChatInitiated('crisis-text-line', 'US')

      const data = getAnalyticsData()
      expect(data).toHaveLength(1)
      expect(data[0].eventType).toBe('chat_initiated')
    })

    it('should record resource ID', () => {
      trackChatInitiated('childline-chat', 'UK')

      const data = getAnalyticsData()
      expect(data[0].resourceId).toBe('childline-chat')
    })
  })

  describe('trackConfirmationDismissed', () => {
    it('should track confirmation dismissal', () => {
      trackConfirmationDismissed('US', 1500)

      const data = getAnalyticsData()
      expect(data).toHaveLength(1)
      expect(data[0].eventType).toBe('confirmation_dismissed')
    })

    it('should record view duration', () => {
      trackConfirmationDismissed('CA', 3200)

      const data = getAnalyticsData()
      expect(data[0].viewDurationMs).toBe(3200)
    })
  })

  // ============================================
  // Analytics Retrieval Tests
  // ============================================

  describe('getAnalyticsData', () => {
    it('should return empty array when no data', () => {
      const data = getAnalyticsData()
      expect(data).toEqual([])
    })

    it('should filter by event type', () => {
      trackConfirmationDisplayed('US', 'teen')
      trackResourceClicked('resource-1', 'hotline', 'US')
      trackConfirmationDisplayed('UK', 'young_child')

      const displayEvents = getAnalyticsData('confirmation_displayed')
      expect(displayEvents).toHaveLength(2)
    })

    it('should filter by jurisdiction', () => {
      trackConfirmationDisplayed('US', 'teen')
      trackConfirmationDisplayed('UK', 'young_child')
      trackConfirmationDisplayed('US', 'middle_child')

      const usEvents = getAnalyticsData(undefined, 'US')
      expect(usEvents).toHaveLength(2)
    })

    it('should filter by both type and jurisdiction', () => {
      trackConfirmationDisplayed('US', 'teen')
      trackResourceClicked('resource-1', 'hotline', 'US')
      trackConfirmationDisplayed('UK', 'young_child')

      const usDisplays = getAnalyticsData('confirmation_displayed', 'US')
      expect(usDisplays).toHaveLength(1)
    })
  })

  describe('getResourceClickStats', () => {
    it('should return click counts by resource', () => {
      trackResourceClicked('988-lifeline', 'hotline', 'US')
      trackResourceClicked('988-lifeline', 'hotline', 'US')
      trackResourceClicked('crisis-text', 'chat', 'US')

      const stats = getResourceClickStats()

      expect(stats['988-lifeline']).toBe(2)
      expect(stats['crisis-text']).toBe(1)
    })

    it('should return empty object when no clicks', () => {
      const stats = getResourceClickStats()
      expect(stats).toEqual({})
    })
  })

  describe('getDisplayStats', () => {
    it('should return display counts by jurisdiction', () => {
      trackConfirmationDisplayed('US', 'teen')
      trackConfirmationDisplayed('US', 'young_child')
      trackConfirmationDisplayed('UK', 'teen')

      const stats = getDisplayStats()

      expect(stats.byJurisdiction['US']).toBe(2)
      expect(stats.byJurisdiction['UK']).toBe(1)
    })

    it('should return display counts by age group', () => {
      trackConfirmationDisplayed('US', 'teen')
      trackConfirmationDisplayed('US', 'young_child')
      trackConfirmationDisplayed('UK', 'teen')

      const stats = getDisplayStats()

      expect(stats.byAgeGroup['teen']).toBe(2)
      expect(stats.byAgeGroup['young_child']).toBe(1)
    })

    it('should return total count', () => {
      trackConfirmationDisplayed('US', 'teen')
      trackConfirmationDisplayed('US', 'young_child')
      trackConfirmationDisplayed('UK', 'teen')

      const stats = getDisplayStats()

      expect(stats.total).toBe(3)
    })
  })

  // ============================================
  // Reporting Tests
  // ============================================

  describe('generateAnonymousReport', () => {
    it('should generate report with display summary', () => {
      trackConfirmationDisplayed('US', 'teen')
      trackConfirmationDisplayed('US', 'young_child')
      trackResourceClicked('988-lifeline', 'hotline', 'US')

      const report = generateAnonymousReport()

      expect(report.displayCount).toBe(2)
    })

    it('should generate report with click summary', () => {
      trackResourceClicked('988-lifeline', 'hotline', 'US')
      trackResourceClicked('crisis-text', 'chat', 'US')

      const report = generateAnonymousReport()

      expect(report.resourceClickCount).toBe(2)
    })

    it('should include chat initiation count', () => {
      trackChatInitiated('crisis-text', 'US')
      trackChatInitiated('childline-chat', 'UK')

      const report = generateAnonymousReport()

      expect(report.chatInitiatedCount).toBe(2)
    })

    it('should NOT include any PII in report', () => {
      trackConfirmationDisplayed('US', 'teen')
      trackResourceClicked('resource-1', 'hotline', 'US')

      const report = generateAnonymousReport()
      const reportString = JSON.stringify(report)

      expect(reportString).not.toContain('email')
      expect(reportString).not.toContain('name')
      expect(reportString).not.toContain('userId')
    })

    it('should include time range', () => {
      const before = Date.now()
      trackConfirmationDisplayed('US', 'teen')
      const after = Date.now()

      const report = generateAnonymousReport()

      expect(report.startTime).toBeGreaterThanOrEqual(before)
      expect(report.endTime).toBeLessThanOrEqual(after)
    })

    it('should include resource type breakdown', () => {
      trackResourceClicked('hotline-1', 'hotline', 'US')
      trackResourceClicked('hotline-2', 'hotline', 'US')
      trackResourceClicked('chat-1', 'chat', 'UK')

      const report = generateAnonymousReport()

      expect(report.clicksByResourceType['hotline']).toBe(2)
      expect(report.clicksByResourceType['chat']).toBe(1)
    })
  })

  describe('generateJurisdictionReport', () => {
    it('should generate report for specific jurisdiction', () => {
      trackConfirmationDisplayed('US', 'teen')
      trackConfirmationDisplayed('US', 'young_child')
      trackConfirmationDisplayed('UK', 'teen')

      const usReport = generateJurisdictionReport('US')

      expect(usReport.jurisdiction).toBe('US')
      expect(usReport.displayCount).toBe(2)
    })

    it('should only include jurisdiction-specific data', () => {
      trackResourceClicked('988-lifeline', 'hotline', 'US')
      trackResourceClicked('samaritans', 'hotline', 'UK')

      const ukReport = generateJurisdictionReport('UK')

      expect(ukReport.resourceClickCount).toBe(1)
    })
  })

  // ============================================
  // Analytics Management Tests
  // ============================================

  describe('clearAnalyticsData', () => {
    it('should clear all analytics data', () => {
      trackConfirmationDisplayed('US', 'teen')
      trackResourceClicked('resource-1', 'hotline', 'US')

      clearAnalyticsData()
      const data = getAnalyticsData()

      expect(data).toHaveLength(0)
    })
  })

  describe('getAnalyticsCount', () => {
    it('should return total event count', () => {
      trackConfirmationDisplayed('US', 'teen')
      trackResourceClicked('resource-1', 'hotline', 'US')
      trackChatInitiated('chat-1', 'US')

      const count = getAnalyticsCount()

      expect(count).toBe(3)
    })

    it('should return 0 when no events', () => {
      const count = getAnalyticsCount()
      expect(count).toBe(0)
    })
  })
})
