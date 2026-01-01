/**
 * Calendar Integration Schema Tests - Story 33.4
 *
 * Tests for calendar integration data models.
 */

import { describe, it, expect } from 'vitest'
import {
  calendarProviderSchema,
  calendarSyncFrequencySchema,
  calendarConnectionStatusSchema,
  calendarIntegrationConfigSchema,
  calendarEventSchema,
  cachedCalendarEventsSchema,
  focusModeTriggerTypeSchema,
  focusModeSessionWithCalendarSchema,
  CALENDAR_SYNC_FREQUENCIES,
  CALENDAR_FOCUS_TRIGGER_KEYWORDS,
  CALENDAR_INTEGRATION_MESSAGES,
} from './index'

describe('Calendar Integration Schemas', () => {
  describe('calendarProviderSchema', () => {
    it('should accept google provider', () => {
      expect(calendarProviderSchema.parse('google')).toBe('google')
    })

    it('should reject invalid provider', () => {
      expect(() => calendarProviderSchema.parse('apple')).toThrow()
      expect(() => calendarProviderSchema.parse('outlook')).toThrow()
      expect(() => calendarProviderSchema.parse('')).toThrow()
    })
  })

  describe('calendarSyncFrequencySchema', () => {
    it('should accept valid frequencies', () => {
      expect(calendarSyncFrequencySchema.parse('15')).toBe('15')
      expect(calendarSyncFrequencySchema.parse('30')).toBe('30')
      expect(calendarSyncFrequencySchema.parse('60')).toBe('60')
    })

    it('should reject invalid frequencies', () => {
      expect(() => calendarSyncFrequencySchema.parse('5')).toThrow()
      expect(() => calendarSyncFrequencySchema.parse('45')).toThrow()
      expect(() => calendarSyncFrequencySchema.parse(30)).toThrow() // must be string
    })
  })

  describe('calendarConnectionStatusSchema', () => {
    it('should accept all valid statuses', () => {
      expect(calendarConnectionStatusSchema.parse('connected')).toBe('connected')
      expect(calendarConnectionStatusSchema.parse('disconnected')).toBe('disconnected')
      expect(calendarConnectionStatusSchema.parse('error')).toBe('error')
      expect(calendarConnectionStatusSchema.parse('pending')).toBe('pending')
    })

    it('should reject invalid status', () => {
      expect(() => calendarConnectionStatusSchema.parse('active')).toThrow()
    })
  })

  describe('calendarIntegrationConfigSchema', () => {
    const validConfig = {
      childId: 'child-123',
      familyId: 'family-456',
      isEnabled: true,
      provider: 'google',
      connectionStatus: 'connected',
      connectedEmail: 'child@example.com',
      connectedAt: Date.now(),
      syncFrequencyMinutes: 30,
      autoActivateFocusMode: true,
      focusTriggerKeywords: ['study', 'homework'],
      lastSyncAt: Date.now() - 60000,
      lastSyncError: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    it('should accept valid config', () => {
      const result = calendarIntegrationConfigSchema.parse(validConfig)
      expect(result.childId).toBe('child-123')
      expect(result.familyId).toBe('family-456')
      expect(result.isEnabled).toBe(true)
      expect(result.provider).toBe('google')
      expect(result.connectionStatus).toBe('connected')
      expect(result.connectedEmail).toBe('child@example.com')
    })

    it('should apply defaults for optional fields', () => {
      const minimalConfig = {
        childId: 'child-123',
        familyId: 'family-456',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      const result = calendarIntegrationConfigSchema.parse(minimalConfig)
      expect(result.isEnabled).toBe(false)
      expect(result.provider).toBeNull()
      expect(result.connectionStatus).toBe('disconnected')
      expect(result.connectedEmail).toBeNull()
      expect(result.syncFrequencyMinutes).toBe(30)
      expect(result.autoActivateFocusMode).toBe(false)
      expect(result.focusTriggerKeywords).toEqual([...CALENDAR_FOCUS_TRIGGER_KEYWORDS])
    })

    it('should require childId and familyId', () => {
      expect(() =>
        calendarIntegrationConfigSchema.parse({
          ...validConfig,
          childId: undefined,
        })
      ).toThrow()

      expect(() =>
        calendarIntegrationConfigSchema.parse({
          ...validConfig,
          familyId: undefined,
        })
      ).toThrow()
    })

    it('should accept null provider when disconnected', () => {
      const disconnectedConfig = {
        ...validConfig,
        provider: null,
        connectionStatus: 'disconnected',
        connectedEmail: null,
        connectedAt: null,
      }
      const result = calendarIntegrationConfigSchema.parse(disconnectedConfig)
      expect(result.provider).toBeNull()
      expect(result.connectedEmail).toBeNull()
    })
  })

  describe('calendarEventSchema', () => {
    const validEvent = {
      id: 'event-123',
      title: 'Math Homework',
      startTime: Date.now(),
      endTime: Date.now() + 3600000,
      description: 'Complete chapter 5 exercises',
      isFocusEligible: true,
      matchedKeywords: ['homework'],
      isAllDay: false,
      processed: false,
    }

    it('should accept valid event', () => {
      const result = calendarEventSchema.parse(validEvent)
      expect(result.id).toBe('event-123')
      expect(result.title).toBe('Math Homework')
      expect(result.isFocusEligible).toBe(true)
      expect(result.matchedKeywords).toEqual(['homework'])
    })

    it('should apply defaults', () => {
      const minimalEvent = {
        id: 'event-456',
        title: 'Doctor Appointment',
        startTime: Date.now(),
        endTime: Date.now() + 1800000,
      }
      const result = calendarEventSchema.parse(minimalEvent)
      expect(result.description).toBeNull()
      expect(result.isFocusEligible).toBe(false)
      expect(result.matchedKeywords).toEqual([])
      expect(result.isAllDay).toBe(false)
      expect(result.processed).toBe(false)
    })

    it('should support all-day events', () => {
      const allDayEvent = {
        ...validEvent,
        isAllDay: true,
      }
      const result = calendarEventSchema.parse(allDayEvent)
      expect(result.isAllDay).toBe(true)
    })

    it('should require id, title, startTime, endTime', () => {
      expect(() => calendarEventSchema.parse({ ...validEvent, id: undefined })).toThrow()
      expect(() => calendarEventSchema.parse({ ...validEvent, title: undefined })).toThrow()
      expect(() => calendarEventSchema.parse({ ...validEvent, startTime: undefined })).toThrow()
      expect(() => calendarEventSchema.parse({ ...validEvent, endTime: undefined })).toThrow()
    })
  })

  describe('cachedCalendarEventsSchema', () => {
    const validCache = {
      childId: 'child-123',
      familyId: 'family-456',
      events: [
        {
          id: 'event-1',
          title: 'Study Session',
          startTime: Date.now(),
          endTime: Date.now() + 3600000,
          isFocusEligible: true,
          matchedKeywords: ['study'],
        },
      ],
      fetchedAt: Date.now(),
      expiresAt: Date.now() + 1800000,
      updatedAt: Date.now(),
    }

    it('should accept valid cache', () => {
      const result = cachedCalendarEventsSchema.parse(validCache)
      expect(result.childId).toBe('child-123')
      expect(result.events).toHaveLength(1)
      expect(result.events[0].title).toBe('Study Session')
    })

    it('should accept empty events array', () => {
      const emptyCache = {
        ...validCache,
        events: [],
      }
      const result = cachedCalendarEventsSchema.parse(emptyCache)
      expect(result.events).toEqual([])
    })

    it('should require all fields', () => {
      expect(() =>
        cachedCalendarEventsSchema.parse({
          ...validCache,
          childId: undefined,
        })
      ).toThrow()
      expect(() =>
        cachedCalendarEventsSchema.parse({
          ...validCache,
          fetchedAt: undefined,
        })
      ).toThrow()
    })
  })

  describe('focusModeTriggerTypeSchema', () => {
    it('should accept manual and calendar triggers', () => {
      expect(focusModeTriggerTypeSchema.parse('manual')).toBe('manual')
      expect(focusModeTriggerTypeSchema.parse('calendar')).toBe('calendar')
    })

    it('should reject invalid triggers', () => {
      expect(() => focusModeTriggerTypeSchema.parse('scheduled')).toThrow()
      expect(() => focusModeTriggerTypeSchema.parse('auto')).toThrow()
    })
  })

  describe('focusModeSessionWithCalendarSchema', () => {
    const baseSession = {
      id: 'session-123',
      childId: 'child-123',
      familyId: 'family-456',
      status: 'active',
      durationType: 'oneHour',
      durationMs: 3600000,
      startedAt: Date.now(),
      endedAt: null,
      completedFully: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    it('should accept manual session without calendar fields', () => {
      const result = focusModeSessionWithCalendarSchema.parse(baseSession)
      expect(result.triggeredBy).toBe('manual')
      expect(result.calendarEventId).toBeNull()
      expect(result.calendarEventTitle).toBeNull()
    })

    it('should accept calendar-triggered session', () => {
      const calendarSession = {
        ...baseSession,
        triggeredBy: 'calendar',
        calendarEventId: 'event-123',
        calendarEventTitle: 'Math Homework',
      }
      const result = focusModeSessionWithCalendarSchema.parse(calendarSession)
      expect(result.triggeredBy).toBe('calendar')
      expect(result.calendarEventId).toBe('event-123')
      expect(result.calendarEventTitle).toBe('Math Homework')
    })

    it('should inherit all base session fields', () => {
      const result = focusModeSessionWithCalendarSchema.parse(baseSession)
      expect(result.id).toBe('session-123')
      expect(result.childId).toBe('child-123')
      expect(result.durationType).toBe('oneHour')
      expect(result.status).toBe('active')
    })
  })
})

describe('Calendar Integration Constants', () => {
  describe('CALENDAR_SYNC_FREQUENCIES', () => {
    it('should have correct frequency values', () => {
      expect(CALENDAR_SYNC_FREQUENCIES['15']).toBe(15)
      expect(CALENDAR_SYNC_FREQUENCIES['30']).toBe(30)
      expect(CALENDAR_SYNC_FREQUENCIES['60']).toBe(60)
    })
  })

  describe('CALENDAR_FOCUS_TRIGGER_KEYWORDS', () => {
    it('should include essential keywords', () => {
      expect(CALENDAR_FOCUS_TRIGGER_KEYWORDS).toContain('study')
      expect(CALENDAR_FOCUS_TRIGGER_KEYWORDS).toContain('homework')
      expect(CALENDAR_FOCUS_TRIGGER_KEYWORDS).toContain('focus')
      expect(CALENDAR_FOCUS_TRIGGER_KEYWORDS).toContain('work')
      expect(CALENDAR_FOCUS_TRIGGER_KEYWORDS).toContain('exam')
      expect(CALENDAR_FOCUS_TRIGGER_KEYWORDS).toContain('test')
    })

    it('should be an array of strings', () => {
      expect(Array.isArray(CALENDAR_FOCUS_TRIGGER_KEYWORDS)).toBe(true)
      CALENDAR_FOCUS_TRIGGER_KEYWORDS.forEach((keyword) => {
        expect(typeof keyword).toBe('string')
      })
    })
  })

  describe('CALENDAR_INTEGRATION_MESSAGES', () => {
    it('should have static connection messages', () => {
      expect(typeof CALENDAR_INTEGRATION_MESSAGES.connectPrompt).toBe('string')
      expect(typeof CALENDAR_INTEGRATION_MESSAGES.connecting).toBe('string')
      expect(typeof CALENDAR_INTEGRATION_MESSAGES.disconnected).toBe('string')
      expect(typeof CALENDAR_INTEGRATION_MESSAGES.connectionError).toBe('string')
    })

    it('should have connected message function', () => {
      expect(CALENDAR_INTEGRATION_MESSAGES.connected('test@example.com')).toBe(
        'Connected to test@example.com'
      )
    })

    it('should have focus mode trigger messages', () => {
      expect(CALENDAR_INTEGRATION_MESSAGES.focusModeStarting('Math Homework')).toBe(
        'Focus mode starting for "Math Homework"'
      )
      expect(CALENDAR_INTEGRATION_MESSAGES.focusModeEnding('Math Homework')).toBe(
        'Focus mode ending for "Math Homework"'
      )
      expect(CALENDAR_INTEGRATION_MESSAGES.focusModeEndedEarly('Math Homework', 15)).toBe(
        'Focus mode for "Math Homework" ended 15 minutes early'
      )
    })

    it('should have sync status messages', () => {
      expect(typeof CALENDAR_INTEGRATION_MESSAGES.syncSuccess).toBe('string')
      expect(typeof CALENDAR_INTEGRATION_MESSAGES.syncError).toBe('string')
    })

    it('should format lastSynced correctly', () => {
      const now = Date.now()
      expect(CALENDAR_INTEGRATION_MESSAGES.lastSynced(now)).toBe('Synced just now')
      expect(CALENDAR_INTEGRATION_MESSAGES.lastSynced(now - 60000)).toBe('Synced 1 minute ago')
      expect(CALENDAR_INTEGRATION_MESSAGES.lastSynced(now - 300000)).toBe('Synced 5 minutes ago')
      expect(CALENDAR_INTEGRATION_MESSAGES.lastSynced(now - 3600000)).toBe('Synced 1 hour ago')
      expect(CALENDAR_INTEGRATION_MESSAGES.lastSynced(now - 7200000)).toBe('Synced 2 hours ago')
    })

    it('should have parent notification messages', () => {
      expect(
        CALENDAR_INTEGRATION_MESSAGES.parentCalendarConnected('Emma', 'emma@example.com')
      ).toBe('Emma connected their calendar (emma@example.com) for auto focus mode')
      expect(CALENDAR_INTEGRATION_MESSAGES.parentCalendarDisconnected('Emma')).toBe(
        'Emma disconnected their calendar'
      )
      expect(CALENDAR_INTEGRATION_MESSAGES.parentCalendarFocusStarted('Emma', 'Math Study')).toBe(
        'Emma started focus mode for "Math Study" (calendar-triggered)'
      )
    })
  })
})
