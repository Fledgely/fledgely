/**
 * Pattern Signal Detection Tests
 *
 * Story 8.10: Adult Pattern Detection - AC5: Metadata-Only Detection
 *
 * Tests for adult pattern signal detection functions.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest'
import {
  detectWorkAppPatterns,
  detectFinancialSitePatterns,
  detectAdultSchedulePatterns,
  detectCommunicationPatterns,
  type ScreenshotMetadataForAnalysis,
} from './patternSignals'

describe('patternSignals (Story 8.10)', () => {
  describe('detectWorkAppPatterns', () => {
    it('returns 0 confidence when no work apps detected', () => {
      const metadata: ScreenshotMetadataForAnalysis[] = [
        { url: 'https://youtube.com/watch?v=123', timestamp: Date.now() },
        { url: 'https://reddit.com/r/gaming', timestamp: Date.now() },
        { url: 'https://instagram.com', timestamp: Date.now() },
      ]

      const result = detectWorkAppPatterns(metadata)

      expect(result.signalType).toBe('work_apps')
      expect(result.confidence).toBe(0)
      expect(result.instanceCount).toBe(0)
      expect(result.triggers).toHaveLength(0)
    })

    it('detects slack.com as work app', () => {
      const metadata: ScreenshotMetadataForAnalysis[] = [
        { url: 'https://app.slack.com/workspace/123', timestamp: Date.now() },
        { url: 'https://youtube.com/watch?v=123', timestamp: Date.now() },
      ]

      const result = detectWorkAppPatterns(metadata)

      expect(result.confidence).toBeGreaterThan(0)
      expect(result.instanceCount).toBe(1)
      expect(result.triggers).toContain('app.slack.com')
    })

    it('detects linkedin.com as work app', () => {
      const metadata: ScreenshotMetadataForAnalysis[] = [
        { url: 'https://www.linkedin.com/feed/', timestamp: Date.now() },
      ]

      const result = detectWorkAppPatterns(metadata)

      expect(result.instanceCount).toBe(1)
      expect(result.triggers).toContain('www.linkedin.com')
    })

    it('detects multiple work apps with diversity bonus', () => {
      const metadata: ScreenshotMetadataForAnalysis[] = [
        { url: 'https://slack.com/messages', timestamp: Date.now() },
        { url: 'https://trello.com/board', timestamp: Date.now() },
        { url: 'https://salesforce.com/dashboard', timestamp: Date.now() },
        { url: 'https://asana.com/project', timestamp: Date.now() },
      ]

      const result = detectWorkAppPatterns(metadata)

      expect(result.instanceCount).toBe(4)
      expect(result.triggers.length).toBe(4)
      // Diversity bonus adds to confidence
      expect(result.confidence).toBeGreaterThan(50)
    })

    it('returns high confidence for >20% work app usage', () => {
      const metadata: ScreenshotMetadataForAnalysis[] = [
        { url: 'https://slack.com/messages', timestamp: Date.now() },
        { url: 'https://slack.com/channels', timestamp: Date.now() },
        { url: 'https://slack.com/threads', timestamp: Date.now() },
        { url: 'https://youtube.com/watch', timestamp: Date.now() },
        { url: 'https://reddit.com', timestamp: Date.now() },
      ]

      // 3/5 = 60% work app usage
      const result = detectWorkAppPatterns(metadata)

      expect(result.confidence).toBeGreaterThanOrEqual(90)
    })

    it('handles empty metadata array', () => {
      const result = detectWorkAppPatterns([])

      expect(result.confidence).toBe(0)
      expect(result.instanceCount).toBe(0)
    })

    it('handles invalid URLs gracefully', () => {
      const metadata: ScreenshotMetadataForAnalysis[] = [
        { url: 'not-a-valid-url', timestamp: Date.now() },
        { url: 'https://slack.com/messages', timestamp: Date.now() },
      ]

      const result = detectWorkAppPatterns(metadata)

      expect(result.instanceCount).toBe(1)
    })
  })

  describe('detectFinancialSitePatterns', () => {
    it('returns 0 confidence when no financial sites detected', () => {
      const metadata: ScreenshotMetadataForAnalysis[] = [
        { url: 'https://youtube.com/watch?v=123', timestamp: Date.now() },
        { url: 'https://amazon.com/product', timestamp: Date.now() },
      ]

      const result = detectFinancialSitePatterns(metadata)

      expect(result.signalType).toBe('financial_sites')
      expect(result.confidence).toBe(0)
      expect(result.instanceCount).toBe(0)
    })

    it('detects chase.com as financial site', () => {
      const metadata: ScreenshotMetadataForAnalysis[] = [
        { url: 'https://secure.chase.com/account', timestamp: Date.now() },
      ]

      const result = detectFinancialSitePatterns(metadata)

      expect(result.instanceCount).toBe(1)
      // Single visit = 35% + 10 diversity bonus = 45%
      expect(result.confidence).toBe(45)
    })

    it('detects fidelity.com as investment platform', () => {
      const metadata: ScreenshotMetadataForAnalysis[] = [
        { url: 'https://www.fidelity.com/portfolio', timestamp: Date.now() },
      ]

      const result = detectFinancialSitePatterns(metadata)

      expect(result.instanceCount).toBe(1)
      expect(result.triggers).toContain('www.fidelity.com')
    })

    it('returns high confidence for multiple financial visits', () => {
      const metadata: ScreenshotMetadataForAnalysis[] = [
        { url: 'https://chase.com/account', timestamp: Date.now() },
        { url: 'https://chase.com/bill-pay', timestamp: Date.now() },
        { url: 'https://chase.com/transfer', timestamp: Date.now() },
        { url: 'https://fidelity.com/portfolio', timestamp: Date.now() },
        { url: 'https://fidelity.com/positions', timestamp: Date.now() },
        { url: 'https://youtube.com', timestamp: Date.now() },
      ]

      const result = detectFinancialSitePatterns(metadata)

      expect(result.instanceCount).toBe(5)
      // 2 different financial services = diversity bonus
      expect(result.confidence).toBeGreaterThan(80)
    })

    it('gives highest confidence for 10+ financial visits', () => {
      const timestamps = Array.from({ length: 15 }, (_, i) => ({
        url: `https://chase.com/page${i}`,
        timestamp: Date.now() + i * 1000,
      }))

      const result = detectFinancialSitePatterns(timestamps)

      expect(result.confidence).toBeGreaterThanOrEqual(95)
    })

    it('detects robinhood as trading platform', () => {
      const metadata: ScreenshotMetadataForAnalysis[] = [
        { url: 'https://robinhood.com/stocks/AAPL', timestamp: Date.now() },
        { url: 'https://robinhood.com/portfolio', timestamp: Date.now() },
      ]

      const result = detectFinancialSitePatterns(metadata)

      expect(result.instanceCount).toBe(2)
      expect(result.triggers).toContain('robinhood.com')
    })

    it('detects turbotax for tax preparation', () => {
      const metadata: ScreenshotMetadataForAnalysis[] = [
        { url: 'https://turbotax.intuit.com/taxes', timestamp: Date.now() },
      ]

      const result = detectFinancialSitePatterns(metadata)

      expect(result.instanceCount).toBe(1)
    })
  })

  describe('detectAdultSchedulePatterns', () => {
    it('returns 0 confidence for empty metadata', () => {
      const result = detectAdultSchedulePatterns([])

      expect(result.signalType).toBe('adult_schedule')
      expect(result.confidence).toBe(0)
      expect(result.description).toBe('No activity data available')
    })

    it('detects 9-5 workday pattern', () => {
      // Create activity during weekday work hours (9am-5pm)
      const monday9am = new Date('2024-01-08T09:00:00') // Monday
      const metadata: ScreenshotMetadataForAnalysis[] = []

      // Add 20 screenshots during work hours (9-17)
      for (let hour = 9; hour <= 16; hour++) {
        for (let i = 0; i < 3; i++) {
          const time = new Date(monday9am)
          time.setHours(hour)
          time.setMinutes(i * 20)
          metadata.push({
            url: 'https://example.com',
            timestamp: time.getTime(),
          })
        }
      }

      const result = detectAdultSchedulePatterns(metadata)

      expect(result.confidence).toBeGreaterThan(0)
      expect(result.triggers.some((t) => t.includes('9-5'))).toBe(true)
    })

    it('detects late night usage pattern', () => {
      // Create activity at 11pm-2am consistently
      const metadata: ScreenshotMetadataForAnalysis[] = []

      for (let day = 0; day < 7; day++) {
        const base = new Date('2024-01-08T00:00:00')
        base.setDate(base.getDate() + day)

        // Add late night activity
        for (const hour of [23, 0, 1]) {
          const time = new Date(base)
          time.setHours(hour)
          metadata.push({
            url: 'https://example.com',
            timestamp: time.getTime(),
          })
        }

        // Add some daytime activity too
        const daytime = new Date(base)
        daytime.setHours(14)
        metadata.push({
          url: 'https://example.com',
          timestamp: daytime.getTime(),
        })
      }

      const result = detectAdultSchedulePatterns(metadata)

      // Should detect late night pattern (case-insensitive check)
      expect(result.triggers.some((t) => t.toLowerCase().includes('late night'))).toBe(true)
    })

    it('detects weekday-heavy activity pattern', () => {
      const metadata: ScreenshotMetadataForAnalysis[] = []

      // Add heavy weekday activity
      for (let day = 1; day <= 5; day++) {
        // Monday-Friday
        const base = new Date('2024-01-08T12:00:00') // Start on Monday
        base.setDate(base.getDate() + day - 1)

        for (let i = 0; i < 20; i++) {
          metadata.push({
            url: 'https://example.com',
            timestamp: base.getTime() + i * 60000,
          })
        }
      }

      // Add minimal weekend activity
      const saturday = new Date('2024-01-13T12:00:00')
      const sunday = new Date('2024-01-14T12:00:00')
      metadata.push(
        { url: 'https://example.com', timestamp: saturday.getTime() },
        { url: 'https://example.com', timestamp: sunday.getTime() }
      )

      const result = detectAdultSchedulePatterns(metadata)

      // Normalized weekday activity is much higher than weekend
      expect(result.triggers.some((t) => t.includes('Weekday-heavy'))).toBe(true)
    })
  })

  describe('detectCommunicationPatterns', () => {
    it('returns 0 confidence for empty metadata', () => {
      const result = detectCommunicationPatterns([])

      expect(result.signalType).toBe('communication_patterns')
      expect(result.confidence).toBe(0)
    })

    it('detects high volume usage', () => {
      // 100+ screenshots per day average
      const metadata: ScreenshotMetadataForAnalysis[] = []
      const baseTime = Date.now()

      for (let i = 0; i < 200; i++) {
        metadata.push({
          url: 'https://example.com',
          timestamp: baseTime + i * 60000, // 1 minute apart, all in one day
        })
      }

      const result = detectCommunicationPatterns(metadata)

      expect(result.confidence).toBeGreaterThan(0)
      expect(result.triggers.some((t) => t.includes('volume'))).toBe(true)
    })

    it('detects school hour activity', () => {
      const metadata: ScreenshotMetadataForAnalysis[] = []

      // Add activity during school hours (9am-3pm) on weekdays
      const monday = new Date('2024-01-08T10:00:00') // Monday 10am

      for (let i = 0; i < 10; i++) {
        const time = new Date(monday)
        time.setMinutes(time.getMinutes() + i * 30)
        metadata.push({
          url: 'https://example.com',
          timestamp: time.getTime(),
        })
      }

      const result = detectCommunicationPatterns(metadata)

      // All activity is during school hours
      expect(result.triggers.some((t) => t.includes('school hour'))).toBe(true)
    })

    it('handles single day of data', () => {
      const metadata: ScreenshotMetadataForAnalysis[] = [
        { url: 'https://example.com', timestamp: Date.now() },
      ]

      const result = detectCommunicationPatterns(metadata)

      // Should not crash with minimal data
      expect(result.signalType).toBe('communication_patterns')
    })
  })
})
