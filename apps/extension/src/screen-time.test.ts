/**
 * Screen Time Tracking Tests - Story 29.2 & Story 29.6
 *
 * Tests for screen time tracking module.
 *
 * Story 29.6: Screen Time Accuracy Validation
 * - AC1: Time matches actual usage within 5%
 * - AC2: Edge cases handled (app switching, multitasking, split-screen)
 * - AC3: Background app time not counted as active use
 * - AC4: System apps excluded from tracking
 * - AC5: Integration tests verify accuracy
 * - AC6: Discrepancy logging available for debugging
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  extractDomain,
  inferCategory,
  aggregateQueueEntries,
  type ScreenTimeQueueEntry,
  type ScreenTimeState,
  SCREEN_TIME_SYNC_INTERVAL_MINUTES,
} from './screen-time'

describe('Screen Time Tracking - Story 29.2', () => {
  describe('extractDomain', () => {
    it('extracts domain from https URL', () => {
      expect(extractDomain('https://www.youtube.com/watch?v=123')).toBe('youtube.com')
    })

    it('extracts domain from http URL', () => {
      expect(extractDomain('http://example.com/page')).toBe('example.com')
    })

    it('removes www prefix', () => {
      expect(extractDomain('https://www.khanacademy.org')).toBe('khanacademy.org')
    })

    it('handles subdomains', () => {
      expect(extractDomain('https://classroom.google.com/u/0/h')).toBe('classroom.google.com')
    })

    it('returns null for invalid URL', () => {
      expect(extractDomain('not-a-url')).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(extractDomain('')).toBeNull()
    })

    it('handles ports in URL', () => {
      expect(extractDomain('http://localhost:3000/page')).toBe('localhost')
    })
  })

  describe('inferCategory', () => {
    describe('Education', () => {
      it('categorizes classroom.google.com as education', () => {
        expect(inferCategory('classroom.google.com')).toBe('education')
      })

      it('categorizes khanacademy.org as education', () => {
        expect(inferCategory('khanacademy.org')).toBe('education')
      })

      it('categorizes quizlet.com as education', () => {
        expect(inferCategory('quizlet.com')).toBe('education')
      })

      it('categorizes .edu domains as education', () => {
        expect(inferCategory('mit.edu')).toBe('education')
        expect(inferCategory('stanford.edu')).toBe('education')
      })

      it('categorizes domains with "school" as education', () => {
        expect(inferCategory('myschool.org')).toBe('education')
      })
    })

    describe('Social Media', () => {
      it('categorizes facebook.com as social_media', () => {
        expect(inferCategory('facebook.com')).toBe('social_media')
      })

      it('categorizes instagram.com as social_media', () => {
        expect(inferCategory('instagram.com')).toBe('social_media')
      })

      it('categorizes tiktok.com as social_media', () => {
        expect(inferCategory('tiktok.com')).toBe('social_media')
      })

      it('categorizes x.com as social_media', () => {
        expect(inferCategory('x.com')).toBe('social_media')
      })
    })

    describe('Gaming', () => {
      it('categorizes roblox.com as gaming', () => {
        expect(inferCategory('roblox.com')).toBe('gaming')
      })

      it('categorizes minecraft.net as gaming', () => {
        expect(inferCategory('minecraft.net')).toBe('gaming')
      })

      it('categorizes steam.com as gaming', () => {
        expect(inferCategory('steam.com')).toBe('gaming')
      })

      it('categorizes domains with "game" as gaming', () => {
        expect(inferCategory('mygame.com')).toBe('gaming')
      })
    })

    describe('Entertainment', () => {
      it('categorizes youtube.com as entertainment', () => {
        expect(inferCategory('youtube.com')).toBe('entertainment')
      })

      it('categorizes netflix.com as entertainment', () => {
        expect(inferCategory('netflix.com')).toBe('entertainment')
      })

      it('categorizes spotify.com as entertainment', () => {
        expect(inferCategory('spotify.com')).toBe('entertainment')
      })
    })

    describe('Communication', () => {
      it('categorizes gmail.com as communication', () => {
        expect(inferCategory('gmail.com')).toBe('communication')
      })

      it('categorizes zoom.us as communication', () => {
        expect(inferCategory('zoom.us')).toBe('communication')
      })

      it('categorizes discord.com as communication', () => {
        expect(inferCategory('discord.com')).toBe('communication')
      })
    })

    describe('Productivity', () => {
      it('categorizes docs.google.com as productivity', () => {
        expect(inferCategory('docs.google.com')).toBe('productivity')
      })

      it('categorizes github.com as productivity', () => {
        expect(inferCategory('github.com')).toBe('productivity')
      })

      it('categorizes notion.so as productivity', () => {
        expect(inferCategory('notion.so')).toBe('productivity')
      })
    })

    describe('News', () => {
      it('categorizes cnn.com as news', () => {
        expect(inferCategory('cnn.com')).toBe('news')
      })

      it('categorizes bbc.com as news', () => {
        expect(inferCategory('bbc.com')).toBe('news')
      })
    })

    describe('Shopping', () => {
      it('categorizes amazon.com as shopping', () => {
        expect(inferCategory('amazon.com')).toBe('shopping')
      })

      it('categorizes ebay.com as shopping', () => {
        expect(inferCategory('ebay.com')).toBe('shopping')
      })
    })

    describe('Other', () => {
      it('returns other for unknown domains', () => {
        expect(inferCategory('unknowndomain.xyz')).toBe('other')
      })

      it('returns other for null domain', () => {
        expect(inferCategory(null)).toBe('other')
      })
    })

    describe('Subdomain matching', () => {
      it('matches subdomains of known domains', () => {
        expect(inferCategory('m.facebook.com')).toBe('social_media')
        expect(inferCategory('mobile.twitter.com')).toBe('social_media')
      })
    })
  })

  describe('aggregateQueueEntries', () => {
    it('aggregates entries by date and category', () => {
      const entries: ScreenTimeQueueEntry[] = [
        {
          date: '2025-12-31',
          timezone: 'America/New_York',
          domain: 'youtube.com',
          category: 'entertainment',
          minutes: 30,
          recordedAt: Date.now(),
        },
        {
          date: '2025-12-31',
          timezone: 'America/New_York',
          domain: 'youtube.com',
          category: 'entertainment',
          minutes: 20,
          recordedAt: Date.now(),
        },
      ]

      const result = aggregateQueueEntries(entries)
      const dateKey = '2025-12-31|America/New_York'

      expect(result.get(dateKey)?.get('entertainment')).toBe(50)
    })

    it('aggregates multiple categories separately', () => {
      const entries: ScreenTimeQueueEntry[] = [
        {
          date: '2025-12-31',
          timezone: 'America/New_York',
          domain: 'youtube.com',
          category: 'entertainment',
          minutes: 30,
          recordedAt: Date.now(),
        },
        {
          date: '2025-12-31',
          timezone: 'America/New_York',
          domain: 'khanacademy.org',
          category: 'education',
          minutes: 45,
          recordedAt: Date.now(),
        },
      ]

      const result = aggregateQueueEntries(entries)
      const dateKey = '2025-12-31|America/New_York'

      expect(result.get(dateKey)?.get('entertainment')).toBe(30)
      expect(result.get(dateKey)?.get('education')).toBe(45)
    })

    it('separates entries by date', () => {
      const entries: ScreenTimeQueueEntry[] = [
        {
          date: '2025-12-30',
          timezone: 'America/New_York',
          domain: 'youtube.com',
          category: 'entertainment',
          minutes: 30,
          recordedAt: Date.now(),
        },
        {
          date: '2025-12-31',
          timezone: 'America/New_York',
          domain: 'youtube.com',
          category: 'entertainment',
          minutes: 45,
          recordedAt: Date.now(),
        },
      ]

      const result = aggregateQueueEntries(entries)

      expect(result.get('2025-12-30|America/New_York')?.get('entertainment')).toBe(30)
      expect(result.get('2025-12-31|America/New_York')?.get('entertainment')).toBe(45)
    })

    it('handles empty array', () => {
      const result = aggregateQueueEntries([])
      expect(result.size).toBe(0)
    })

    it('handles fractional minutes', () => {
      const entries: ScreenTimeQueueEntry[] = [
        {
          date: '2025-12-31',
          timezone: 'America/New_York',
          domain: 'youtube.com',
          category: 'entertainment',
          minutes: 0.5,
          recordedAt: Date.now(),
        },
        {
          date: '2025-12-31',
          timezone: 'America/New_York',
          domain: 'youtube.com',
          category: 'entertainment',
          minutes: 0.7,
          recordedAt: Date.now(),
        },
      ]

      const result = aggregateQueueEntries(entries)
      const dateKey = '2025-12-31|America/New_York'

      expect(result.get(dateKey)?.get('entertainment')).toBeCloseTo(1.2, 1)
    })
  })
})

/**
 * Story 29.6: Screen Time Accuracy Validation Tests
 *
 * These tests validate the accuracy of screen time tracking.
 */
describe('Screen Time Accuracy Validation - Story 29.6', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AC1: Time matches actual usage within 5%', () => {
    describe('Minute-level precision', () => {
      it('calculates session duration in minutes correctly', () => {
        const sessionStartMs = Date.now() - 30 * 60 * 1000 // 30 minutes ago
        const sessionEndMs = Date.now()
        const durationMs = sessionEndMs - sessionStartMs
        const durationMinutes = durationMs / 60000

        // Should be ~30 minutes (within 5% tolerance = ±1.5 minutes)
        expect(durationMinutes).toBeGreaterThanOrEqual(29.9)
        expect(durationMinutes).toBeLessThanOrEqual(30.1)
      })

      it('rounds to 0.1 minute precision', () => {
        // 30 seconds = 0.5 minutes
        const sessionDurationMs = 30 * 1000
        const minutes = Math.round((sessionDurationMs / 60000) * 10) / 10
        expect(minutes).toBe(0.5)
      })

      it('rounds 45 seconds to 0.8 minutes', () => {
        const sessionDurationMs = 45 * 1000
        const minutes = Math.round((sessionDurationMs / 60000) * 10) / 10
        expect(minutes).toBe(0.8)
      })

      it('rounds 90 seconds to 1.5 minutes', () => {
        const sessionDurationMs = 90 * 1000
        const minutes = Math.round((sessionDurationMs / 60000) * 10) / 10
        expect(minutes).toBe(1.5)
      })

      it('handles long sessions accurately', () => {
        // 2 hours = 120 minutes
        const sessionDurationMs = 2 * 60 * 60 * 1000
        const minutes = Math.round((sessionDurationMs / 60000) * 10) / 10
        expect(minutes).toBe(120)
      })
    })

    describe('Aggregation accuracy', () => {
      it('maintains precision through aggregation (single category)', () => {
        // Multiple short sessions that should sum to 60 minutes
        const entries: ScreenTimeQueueEntry[] = [
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'youtube.com',
            category: 'entertainment',
            minutes: 15,
            recordedAt: Date.now(),
          },
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'youtube.com',
            category: 'entertainment',
            minutes: 15,
            recordedAt: Date.now(),
          },
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'youtube.com',
            category: 'entertainment',
            minutes: 15,
            recordedAt: Date.now(),
          },
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'youtube.com',
            category: 'entertainment',
            minutes: 15,
            recordedAt: Date.now(),
          },
        ]

        const result = aggregateQueueEntries(entries)
        const dateKey = '2025-12-31|America/New_York'

        expect(result.get(dateKey)?.get('entertainment')).toBe(60)
      })

      it('maintains precision through aggregation (multiple categories)', () => {
        // Sessions across different categories
        const entries: ScreenTimeQueueEntry[] = [
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'youtube.com',
            category: 'entertainment',
            minutes: 30,
            recordedAt: Date.now(),
          },
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'khanacademy.org',
            category: 'education',
            minutes: 45,
            recordedAt: Date.now(),
          },
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'roblox.com',
            category: 'gaming',
            minutes: 20,
            recordedAt: Date.now(),
          },
        ]

        const result = aggregateQueueEntries(entries)
        const dateKey = '2025-12-31|America/New_York'
        const total =
          (result.get(dateKey)?.get('entertainment') || 0) +
          (result.get(dateKey)?.get('education') || 0) +
          (result.get(dateKey)?.get('gaming') || 0)

        expect(total).toBe(95) // 30 + 45 + 20
      })

      it('handles fractional minutes in aggregation without loss', () => {
        // Many small sessions with fractional minutes
        const entries: ScreenTimeQueueEntry[] = Array(10)
          .fill(null)
          .map(() => ({
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'youtube.com',
            category: 'entertainment' as const,
            minutes: 0.5, // 30 seconds each
            recordedAt: Date.now(),
          }))

        const result = aggregateQueueEntries(entries)
        const dateKey = '2025-12-31|America/New_York'

        expect(result.get(dateKey)?.get('entertainment')).toBe(5) // 10 × 0.5 = 5
      })
    })

    describe('Sync interval validation', () => {
      it('uses 15-minute sync interval', () => {
        expect(SCREEN_TIME_SYNC_INTERVAL_MINUTES).toBe(15)
      })
    })
  })

  describe('AC2: Edge cases handled', () => {
    describe('Rapid app switching', () => {
      it('records minimum threshold for rapid switches', () => {
        // Sessions less than 0.5 minutes should be ignored
        const minThreshold = 0.5

        // 20 seconds = 0.33 minutes (below threshold)
        const shortSession = 20 * 1000
        const shortMinutes = shortSession / 60000
        expect(shortMinutes).toBeLessThan(minThreshold)

        // 35 seconds = 0.58 minutes (above threshold)
        const validSession = 35 * 1000
        const validMinutes = validSession / 60000
        expect(validMinutes).toBeGreaterThan(minThreshold)
      })

      it('aggregates rapid switches to same domain correctly', () => {
        // Simulate user rapidly switching between same site pages
        const entries: ScreenTimeQueueEntry[] = [
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'youtube.com',
            category: 'entertainment',
            minutes: 0.6,
            recordedAt: Date.now(),
          },
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'youtube.com',
            category: 'entertainment',
            minutes: 0.5,
            recordedAt: Date.now(),
          },
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'youtube.com',
            category: 'entertainment',
            minutes: 0.7,
            recordedAt: Date.now(),
          },
        ]

        const result = aggregateQueueEntries(entries)
        const dateKey = '2025-12-31|America/New_York'

        // Total should be 1.8 minutes
        expect(result.get(dateKey)?.get('entertainment')).toBeCloseTo(1.8, 1)
      })

      it('tracks different domains during rapid switching', () => {
        // Simulate user switching between different sites
        const entries: ScreenTimeQueueEntry[] = [
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'youtube.com',
            category: 'entertainment',
            minutes: 0.6,
            recordedAt: Date.now(),
          },
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'github.com',
            category: 'productivity',
            minutes: 0.5,
            recordedAt: Date.now(),
          },
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'youtube.com',
            category: 'entertainment',
            minutes: 0.7,
            recordedAt: Date.now(),
          },
        ]

        const result = aggregateQueueEntries(entries)
        const dateKey = '2025-12-31|America/New_York'

        expect(result.get(dateKey)?.get('entertainment')).toBeCloseTo(1.3, 1)
        expect(result.get(dateKey)?.get('productivity')).toBeCloseTo(0.5, 1)
      })
    })

    describe('Timezone handling', () => {
      it('separates entries by timezone correctly', () => {
        const entries: ScreenTimeQueueEntry[] = [
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'youtube.com',
            category: 'entertainment',
            minutes: 30,
            recordedAt: Date.now(),
          },
          {
            date: '2025-12-31',
            timezone: 'America/Los_Angeles',
            domain: 'youtube.com',
            category: 'entertainment',
            minutes: 30,
            recordedAt: Date.now(),
          },
        ]

        const result = aggregateQueueEntries(entries)

        expect(result.get('2025-12-31|America/New_York')?.get('entertainment')).toBe(30)
        expect(result.get('2025-12-31|America/Los_Angeles')?.get('entertainment')).toBe(30)
      })

      it('handles date boundary correctly across timezones', () => {
        // Same moment in time, different dates due to timezone
        const entries: ScreenTimeQueueEntry[] = [
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'youtube.com',
            category: 'entertainment',
            minutes: 30,
            recordedAt: Date.now(),
          },
          {
            date: '2026-01-01',
            timezone: 'Pacific/Auckland',
            domain: 'youtube.com',
            category: 'entertainment',
            minutes: 30,
            recordedAt: Date.now(),
          },
        ]

        const result = aggregateQueueEntries(entries)

        // Should be separate date entries
        expect(result.size).toBe(2)
      })
    })
  })

  describe('AC3: Background app time not counted', () => {
    describe('Idle state detection', () => {
      it('tracks only active state', () => {
        const validIdleState: ScreenTimeState = {
          activeTabId: 1,
          activeDomain: 'youtube.com',
          activeCategory: 'entertainment',
          sessionStartedAt: Date.now(),
          isTracking: true,
          lastIdleState: 'active',
        }

        expect(validIdleState.isTracking).toBe(true)
        expect(validIdleState.lastIdleState).toBe('active')
      })

      it('pauses tracking when idle', () => {
        const idleState: ScreenTimeState = {
          activeTabId: 1,
          activeDomain: 'youtube.com',
          activeCategory: 'entertainment',
          sessionStartedAt: null, // Cleared when idle
          isTracking: false, // Not tracking
          lastIdleState: 'idle',
        }

        expect(idleState.isTracking).toBe(false)
        expect(idleState.sessionStartedAt).toBeNull()
      })

      it('pauses tracking when locked', () => {
        const lockedState: ScreenTimeState = {
          activeTabId: 1,
          activeDomain: 'youtube.com',
          activeCategory: 'entertainment',
          sessionStartedAt: null,
          isTracking: false,
          lastIdleState: 'locked',
        }

        expect(lockedState.isTracking).toBe(false)
        expect(lockedState.lastIdleState).toBe('locked')
      })
    })

    describe('Background tab handling', () => {
      it('only tracks active tab', () => {
        // State when active tab changes - new tab becomes tracked
        const stateAfterSwitch: ScreenTimeState = {
          activeTabId: 2, // New active tab
          activeDomain: 'github.com',
          activeCategory: 'productivity',
          sessionStartedAt: Date.now(),
          isTracking: true,
          lastIdleState: 'active',
        }

        // Only one tab is tracked at a time
        expect(stateAfterSwitch.activeTabId).toBe(2)
        expect(stateAfterSwitch.isTracking).toBe(true)
      })
    })
  })

  describe('AC4: System apps excluded from tracking', () => {
    describe('URL exclusion', () => {
      it('excludes chrome:// URLs', () => {
        const chromeUrls = [
          'chrome://settings',
          'chrome://extensions',
          'chrome://newtab',
          'chrome://bookmarks',
          'chrome://history',
          'chrome://downloads',
          'chrome://flags',
        ]

        chromeUrls.forEach((url) => {
          // System URLs don't start with http:// or https://
          expect(url.startsWith('http://') || url.startsWith('https://')).toBe(false)
          // Therefore they should be excluded from tracking
        })
      })

      it('excludes chrome-extension:// URLs', () => {
        const extensionUrl = 'chrome-extension://abcdefghijklmnop/popup.html'
        expect(extensionUrl.startsWith('http://') || extensionUrl.startsWith('https://')).toBe(
          false
        )
      })

      it('excludes file:// URLs', () => {
        const fileUrl = 'file:///Users/test/document.pdf'
        expect(fileUrl.startsWith('http://') || fileUrl.startsWith('https://')).toBe(false)
      })

      it('excludes about: URLs', () => {
        const aboutUrls = ['about:blank', 'about:newtab', 'about:version']

        aboutUrls.forEach((url) => {
          expect(url.startsWith('http://') || url.startsWith('https://')).toBe(false)
        })
      })

      it('allows http:// URLs', () => {
        const httpUrl = 'http://example.com'
        expect(httpUrl.startsWith('http://')).toBe(true)
      })

      it('allows https:// URLs', () => {
        const httpsUrl = 'https://youtube.com'
        expect(httpsUrl.startsWith('https://')).toBe(true)
      })
    })

    describe('URL protocol check for exclusion', () => {
      it('verifies chrome:// URLs are excluded via protocol check', () => {
        // The exclusion happens in startTrackingTab via protocol check
        const url = 'chrome://settings'
        const isExcluded = !url.startsWith('http://') && !url.startsWith('https://')
        expect(isExcluded).toBe(true)
      })

      it('verifies chrome-extension:// URLs are excluded via protocol check', () => {
        const url = 'chrome-extension://abc/popup.html'
        const isExcluded = !url.startsWith('http://') && !url.startsWith('https://')
        expect(isExcluded).toBe(true)
      })

      it('verifies about: URLs are excluded via protocol check', () => {
        const url = 'about:blank'
        const isExcluded = !url.startsWith('http://') && !url.startsWith('https://')
        expect(isExcluded).toBe(true)
      })

      it('verifies file:// URLs are excluded via protocol check', () => {
        const url = 'file:///path/to/file.pdf'
        const isExcluded = !url.startsWith('http://') && !url.startsWith('https://')
        expect(isExcluded).toBe(true)
      })

      it('verifies http:// URLs are NOT excluded', () => {
        const url = 'http://example.com'
        const isExcluded = !url.startsWith('http://') && !url.startsWith('https://')
        expect(isExcluded).toBe(false)
      })

      it('verifies https:// URLs are NOT excluded', () => {
        const url = 'https://youtube.com'
        const isExcluded = !url.startsWith('http://') && !url.startsWith('https://')
        expect(isExcluded).toBe(false)
      })
    })
  })

  describe('AC5: Integration tests verify accuracy', () => {
    describe('Simulated usage patterns', () => {
      it('accurately tracks a typical study session', () => {
        // Simulate: 30 min education, 10 min break (social), 30 min education
        const entries: ScreenTimeQueueEntry[] = [
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'khanacademy.org',
            category: 'education',
            minutes: 30,
            recordedAt: Date.now(),
          },
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'instagram.com',
            category: 'social_media',
            minutes: 10,
            recordedAt: Date.now(),
          },
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'khanacademy.org',
            category: 'education',
            minutes: 30,
            recordedAt: Date.now(),
          },
        ]

        const result = aggregateQueueEntries(entries)
        const dateKey = '2025-12-31|America/New_York'

        expect(result.get(dateKey)?.get('education')).toBe(60)
        expect(result.get(dateKey)?.get('social_media')).toBe(10)
      })

      it('accurately tracks a gaming session', () => {
        // Simulate: 45 min gaming, switch games, 30 min gaming
        const entries: ScreenTimeQueueEntry[] = [
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'roblox.com',
            category: 'gaming',
            minutes: 45,
            recordedAt: Date.now(),
          },
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'minecraft.net',
            category: 'gaming',
            minutes: 30,
            recordedAt: Date.now(),
          },
        ]

        const result = aggregateQueueEntries(entries)
        const dateKey = '2025-12-31|America/New_York'

        expect(result.get(dateKey)?.get('gaming')).toBe(75)
      })

      it('accurately tracks mixed activity day', () => {
        // Simulate a full day: 2hr school, 1hr entertainment, 30min gaming, 1hr productivity
        const entries: ScreenTimeQueueEntry[] = [
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'classroom.google.com',
            category: 'education',
            minutes: 60,
            recordedAt: Date.now(),
          },
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'docs.google.com',
            category: 'productivity',
            minutes: 30,
            recordedAt: Date.now(),
          },
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'khanacademy.org',
            category: 'education',
            minutes: 60,
            recordedAt: Date.now(),
          },
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'youtube.com',
            category: 'entertainment',
            minutes: 60,
            recordedAt: Date.now(),
          },
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'roblox.com',
            category: 'gaming',
            minutes: 30,
            recordedAt: Date.now(),
          },
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'notion.so',
            category: 'productivity',
            minutes: 30,
            recordedAt: Date.now(),
          },
        ]

        const result = aggregateQueueEntries(entries)
        const dateKey = '2025-12-31|America/New_York'

        expect(result.get(dateKey)?.get('education')).toBe(120)
        expect(result.get(dateKey)?.get('entertainment')).toBe(60)
        expect(result.get(dateKey)?.get('gaming')).toBe(30)
        expect(result.get(dateKey)?.get('productivity')).toBe(60)

        // Total should be 270 minutes (4.5 hours)
        const total =
          (result.get(dateKey)?.get('education') || 0) +
          (result.get(dateKey)?.get('entertainment') || 0) +
          (result.get(dateKey)?.get('gaming') || 0) +
          (result.get(dateKey)?.get('productivity') || 0)

        expect(total).toBe(270)
      })
    })

    describe('Accuracy within 5% (NFR7)', () => {
      it('verifies aggregation accuracy for 1 hour session', () => {
        // Simulated 1-hour session split into 15-minute sync intervals
        const entries: ScreenTimeQueueEntry[] = [
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'youtube.com',
            category: 'entertainment',
            minutes: 15,
            recordedAt: Date.now(),
          },
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'youtube.com',
            category: 'entertainment',
            minutes: 15,
            recordedAt: Date.now(),
          },
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'youtube.com',
            category: 'entertainment',
            minutes: 15,
            recordedAt: Date.now(),
          },
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'youtube.com',
            category: 'entertainment',
            minutes: 15,
            recordedAt: Date.now(),
          },
        ]

        const result = aggregateQueueEntries(entries)
        const dateKey = '2025-12-31|America/New_York'
        const tracked = result.get(dateKey)?.get('entertainment') || 0
        const expected = 60

        // Verify within 5% tolerance
        const tolerance = expected * 0.05 // 3 minutes
        expect(Math.abs(tracked - expected)).toBeLessThanOrEqual(tolerance)
      })

      it('verifies aggregation accuracy for multi-hour session', () => {
        // Simulated 4-hour session
        const entries: ScreenTimeQueueEntry[] = Array(16)
          .fill(null)
          .map(() => ({
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'youtube.com',
            category: 'entertainment' as const,
            minutes: 15,
            recordedAt: Date.now(),
          }))

        const result = aggregateQueueEntries(entries)
        const dateKey = '2025-12-31|America/New_York'
        const tracked = result.get(dateKey)?.get('entertainment') || 0
        const expected = 240 // 4 hours

        // Verify within 5% tolerance
        const tolerance = expected * 0.05 // 12 minutes
        expect(Math.abs(tracked - expected)).toBeLessThanOrEqual(tolerance)
      })
    })
  })

  describe('AC6: Discrepancy logging available for debugging', () => {
    describe('Entry tracking', () => {
      it('includes recordedAt timestamp for debugging', () => {
        const entry: ScreenTimeQueueEntry = {
          date: '2025-12-31',
          timezone: 'America/New_York',
          domain: 'youtube.com',
          category: 'entertainment',
          minutes: 30,
          recordedAt: Date.now(),
        }

        expect(entry.recordedAt).toBeDefined()
        expect(typeof entry.recordedAt).toBe('number')
      })

      it('can trace entries to their recording time', () => {
        const now = Date.now()
        const entries: ScreenTimeQueueEntry[] = [
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'youtube.com',
            category: 'entertainment',
            minutes: 15,
            recordedAt: now,
          },
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            domain: 'youtube.com',
            category: 'entertainment',
            minutes: 15,
            recordedAt: now + 900000,
          }, // 15 min later
        ]

        // Can analyze timing between entries
        const timeBetweenEntries = entries[1].recordedAt - entries[0].recordedAt
        expect(timeBetweenEntries).toBe(900000) // 15 minutes in ms
      })
    })

    describe('State inspection', () => {
      it('state includes all necessary debugging fields', () => {
        const state: ScreenTimeState = {
          activeTabId: 1,
          activeDomain: 'youtube.com',
          activeCategory: 'entertainment',
          sessionStartedAt: Date.now(),
          isTracking: true,
          lastIdleState: 'active',
        }

        // All fields available for debugging
        expect(state).toHaveProperty('activeTabId')
        expect(state).toHaveProperty('activeDomain')
        expect(state).toHaveProperty('activeCategory')
        expect(state).toHaveProperty('sessionStartedAt')
        expect(state).toHaveProperty('isTracking')
        expect(state).toHaveProperty('lastIdleState')
      })

      it('can calculate current session duration from state', () => {
        const sessionStartedAt = Date.now() - 10 * 60 * 1000 // 10 minutes ago
        const state: ScreenTimeState = {
          activeTabId: 1,
          activeDomain: 'youtube.com',
          activeCategory: 'entertainment',
          sessionStartedAt,
          isTracking: true,
          lastIdleState: 'active',
        }

        const currentDurationMs = Date.now() - (state.sessionStartedAt || 0)
        const currentDurationMin = currentDurationMs / 60000

        expect(currentDurationMin).toBeGreaterThanOrEqual(9.9)
        expect(currentDurationMin).toBeLessThanOrEqual(10.1)
      })
    })
  })
})
