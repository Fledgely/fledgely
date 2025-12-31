/**
 * Screen Time Tracking Tests - Story 29.2
 *
 * Tests for screen time tracking module.
 */

import { describe, it, expect } from 'vitest'
import {
  extractDomain,
  inferCategory,
  aggregateQueueEntries,
  type ScreenTimeQueueEntry,
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
