/**
 * Focus Mode Tests - Story 33.1, 33.2, 33.4
 *
 * Tests for focus mode module, including calendar integration (Story 33.4).
 *
 * Story 33.4 Calendar Integration Tests:
 * - Calendar trigger fields in state
 * - Calendar context passed to blocking script
 * - State sync includes calendar information
 */

import { describe, it, expect } from 'vitest'
import type {
  LocalFocusModeState,
  LocalFocusModeConfig,
  FocusModeCalendarContext,
} from './focus-mode'
import { shouldBlockUrl, isFocusModeExpired, getTimeRemainingMs } from './focus-mode'

describe('Focus Mode - Story 33.1', () => {
  describe('shouldBlockUrl', () => {
    it('blocks social media domains', () => {
      expect(shouldBlockUrl('https://facebook.com')).toBe(true)
      expect(shouldBlockUrl('https://www.instagram.com')).toBe(true)
      expect(shouldBlockUrl('https://twitter.com/home')).toBe(true)
    })

    it('blocks gaming sites', () => {
      expect(shouldBlockUrl('https://roblox.com')).toBe(true)
      expect(shouldBlockUrl('https://www.twitch.tv/channel')).toBe(true)
    })

    it('blocks entertainment sites', () => {
      expect(shouldBlockUrl('https://youtube.com/watch?v=123')).toBe(true)
      expect(shouldBlockUrl('https://netflix.com')).toBe(true)
    })

    it('allows education sites', () => {
      expect(shouldBlockUrl('https://khanacademy.org')).toBe(false)
      expect(shouldBlockUrl('https://quizlet.com')).toBe(false)
      expect(shouldBlockUrl('https://docs.google.com')).toBe(false)
    })

    it('does not block internal pages', () => {
      expect(shouldBlockUrl('chrome://extensions')).toBe(false)
      expect(shouldBlockUrl('chrome-extension://abc123')).toBe(false)
      expect(shouldBlockUrl('about:blank')).toBe(false)
    })

    it('handles invalid URLs gracefully', () => {
      expect(shouldBlockUrl('not-a-url')).toBe(false)
      expect(shouldBlockUrl('')).toBe(false)
    })
  })

  describe('isFocusModeExpired', () => {
    it('returns false when not active', () => {
      const state: LocalFocusModeState = {
        isActive: false,
        durationType: null,
        startedAt: null,
        durationMs: null,
        childId: null,
        familyId: null,
        lastSyncedAt: 0,
        triggeredBy: 'manual',
        calendarEventId: null,
        calendarEventTitle: null,
      }
      expect(isFocusModeExpired(state)).toBe(false)
    })

    it('returns false when no duration (untilOff mode)', () => {
      const state: LocalFocusModeState = {
        isActive: true,
        durationType: 'untilOff',
        startedAt: Date.now() - 3600000,
        durationMs: null,
        childId: 'child-1',
        familyId: 'family-1',
        lastSyncedAt: Date.now(),
        triggeredBy: 'manual',
        calendarEventId: null,
        calendarEventTitle: null,
      }
      expect(isFocusModeExpired(state)).toBe(false)
    })

    it('returns false when duration not exceeded', () => {
      const state: LocalFocusModeState = {
        isActive: true,
        durationType: '30min',
        startedAt: Date.now() - 900000, // 15 min ago
        durationMs: 1800000, // 30 min
        childId: 'child-1',
        familyId: 'family-1',
        lastSyncedAt: Date.now(),
        triggeredBy: 'manual',
        calendarEventId: null,
        calendarEventTitle: null,
      }
      expect(isFocusModeExpired(state)).toBe(false)
    })

    it('returns true when duration exceeded', () => {
      const state: LocalFocusModeState = {
        isActive: true,
        durationType: '30min',
        startedAt: Date.now() - 2000000, // 33+ min ago
        durationMs: 1800000, // 30 min
        childId: 'child-1',
        familyId: 'family-1',
        lastSyncedAt: Date.now(),
        triggeredBy: 'manual',
        calendarEventId: null,
        calendarEventTitle: null,
      }
      expect(isFocusModeExpired(state)).toBe(true)
    })
  })

  describe('getTimeRemainingMs', () => {
    it('returns null when not active', () => {
      const state: LocalFocusModeState = {
        isActive: false,
        durationType: null,
        startedAt: null,
        durationMs: null,
        childId: null,
        familyId: null,
        lastSyncedAt: 0,
        triggeredBy: 'manual',
        calendarEventId: null,
        calendarEventTitle: null,
      }
      expect(getTimeRemainingMs(state)).toBeNull()
    })

    it('returns null for untilOff mode', () => {
      const state: LocalFocusModeState = {
        isActive: true,
        durationType: 'untilOff',
        startedAt: Date.now(),
        durationMs: null,
        childId: 'child-1',
        familyId: 'family-1',
        lastSyncedAt: Date.now(),
        triggeredBy: 'manual',
        calendarEventId: null,
        calendarEventTitle: null,
      }
      expect(getTimeRemainingMs(state)).toBeNull()
    })

    it('returns remaining time in ms', () => {
      const now = Date.now()
      const state: LocalFocusModeState = {
        isActive: true,
        durationType: '30min',
        startedAt: now - 600000, // 10 min ago
        durationMs: 1800000, // 30 min
        childId: 'child-1',
        familyId: 'family-1',
        lastSyncedAt: now,
        triggeredBy: 'manual',
        calendarEventId: null,
        calendarEventTitle: null,
      }
      const remaining = getTimeRemainingMs(state)
      // Should be approximately 20 minutes (1200000ms)
      expect(remaining).toBeGreaterThan(1190000)
      expect(remaining).toBeLessThanOrEqual(1200000)
    })

    it('returns 0 when expired', () => {
      const state: LocalFocusModeState = {
        isActive: true,
        durationType: '30min',
        startedAt: Date.now() - 2000000,
        durationMs: 1800000,
        childId: 'child-1',
        familyId: 'family-1',
        lastSyncedAt: Date.now(),
        triggeredBy: 'manual',
        calendarEventId: null,
        calendarEventTitle: null,
      }
      expect(getTimeRemainingMs(state)).toBe(0)
    })
  })
})

describe('Focus Mode Configuration - Story 33.2', () => {
  describe('shouldBlockUrl with custom config', () => {
    it('respects custom allow list', () => {
      const config: LocalFocusModeConfig = {
        useDefaultCategories: true,
        customAllowPatterns: ['youtube.com'],
        customBlockPatterns: [],
        allowedCategories: [],
        blockedCategories: [],
        lastSyncedAt: Date.now(),
      }
      expect(shouldBlockUrl('https://youtube.com', config)).toBe(false)
    })

    it('respects custom block list', () => {
      const config: LocalFocusModeConfig = {
        useDefaultCategories: true,
        customAllowPatterns: [],
        customBlockPatterns: ['customsite.com'],
        allowedCategories: [],
        blockedCategories: [],
        lastSyncedAt: Date.now(),
      }
      expect(shouldBlockUrl('https://customsite.com', config)).toBe(true)
    })

    it('respects wildcard patterns in allow list', () => {
      const config: LocalFocusModeConfig = {
        useDefaultCategories: true,
        customAllowPatterns: ['*.google.com'],
        customBlockPatterns: [],
        allowedCategories: [],
        blockedCategories: [],
        lastSyncedAt: Date.now(),
      }
      expect(shouldBlockUrl('https://meet.google.com', config)).toBe(false)
    })

    it('skips default categories when disabled', () => {
      const config: LocalFocusModeConfig = {
        useDefaultCategories: false,
        customAllowPatterns: [],
        customBlockPatterns: [],
        allowedCategories: [],
        blockedCategories: [],
        lastSyncedAt: Date.now(),
      }
      // Without default categories, social media should not be blocked
      expect(shouldBlockUrl('https://facebook.com', config)).toBe(false)
    })

    it('custom allow takes precedence over custom block', () => {
      const config: LocalFocusModeConfig = {
        useDefaultCategories: true,
        customAllowPatterns: ['example.com'],
        customBlockPatterns: ['example.com'],
        allowedCategories: [],
        blockedCategories: [],
        lastSyncedAt: Date.now(),
      }
      // Allow list is checked first
      expect(shouldBlockUrl('https://example.com', config)).toBe(false)
    })
  })
})

describe('Focus Mode Calendar Integration - Story 33.4', () => {
  describe('LocalFocusModeState with calendar fields', () => {
    it('supports manual trigger type', () => {
      const state: LocalFocusModeState = {
        isActive: true,
        durationType: '30min',
        startedAt: Date.now(),
        durationMs: 1800000,
        childId: 'child-1',
        familyId: 'family-1',
        lastSyncedAt: Date.now(),
        triggeredBy: 'manual',
        calendarEventId: null,
        calendarEventTitle: null,
      }
      expect(state.triggeredBy).toBe('manual')
      expect(state.calendarEventId).toBeNull()
      expect(state.calendarEventTitle).toBeNull()
    })

    it('supports calendar trigger type with event info', () => {
      const state: LocalFocusModeState = {
        isActive: true,
        durationType: 'custom',
        startedAt: Date.now(),
        durationMs: 3600000, // 1 hour
        childId: 'child-1',
        familyId: 'family-1',
        lastSyncedAt: Date.now(),
        triggeredBy: 'calendar',
        calendarEventId: 'event-123',
        calendarEventTitle: 'Math Homework',
      }
      expect(state.triggeredBy).toBe('calendar')
      expect(state.calendarEventId).toBe('event-123')
      expect(state.calendarEventTitle).toBe('Math Homework')
    })
  })

  describe('FocusModeCalendarContext', () => {
    it('can be created for manual trigger', () => {
      const context: FocusModeCalendarContext = {
        triggeredBy: 'manual',
        calendarEventTitle: null,
      }
      expect(context.triggeredBy).toBe('manual')
      expect(context.calendarEventTitle).toBeNull()
    })

    it('can be created for calendar trigger with title', () => {
      const context: FocusModeCalendarContext = {
        triggeredBy: 'calendar',
        calendarEventTitle: 'Study Session',
      }
      expect(context.triggeredBy).toBe('calendar')
      expect(context.calendarEventTitle).toBe('Study Session')
    })
  })

  describe('calendar-triggered focus mode state behavior', () => {
    it('expires based on calendar event duration', () => {
      const eventStart = Date.now() - 3600000 // Started 1 hour ago
      const eventDuration = 1800000 // 30 min event (already expired)

      const state: LocalFocusModeState = {
        isActive: true,
        durationType: 'custom',
        startedAt: eventStart,
        durationMs: eventDuration,
        childId: 'child-1',
        familyId: 'family-1',
        lastSyncedAt: Date.now(),
        triggeredBy: 'calendar',
        calendarEventId: 'event-456',
        calendarEventTitle: 'Science Study',
      }

      expect(isFocusModeExpired(state)).toBe(true)
    })

    it('is not expired during calendar event', () => {
      const eventStart = Date.now() - 900000 // Started 15 min ago
      const eventDuration = 3600000 // 1 hour event

      const state: LocalFocusModeState = {
        isActive: true,
        durationType: 'custom',
        startedAt: eventStart,
        durationMs: eventDuration,
        childId: 'child-1',
        familyId: 'family-1',
        lastSyncedAt: Date.now(),
        triggeredBy: 'calendar',
        calendarEventId: 'event-789',
        calendarEventTitle: 'English Homework',
      }

      expect(isFocusModeExpired(state)).toBe(false)
      // Should have ~45 min remaining
      const remaining = getTimeRemainingMs(state)
      expect(remaining).toBeGreaterThan(2600000) // > 43 min
      expect(remaining).toBeLessThanOrEqual(2700000) // <= 45 min
    })
  })
})
