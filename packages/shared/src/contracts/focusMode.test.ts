/**
 * Focus Mode Schema Tests - Story 33.1
 *
 * Tests for focus mode data model validation.
 */

import { describe, it, expect } from 'vitest'
import {
  FOCUS_MODE_DURATIONS,
  focusModeDurationSchema,
  focusModeStatusSchema,
  focusModeSessionSchema,
  focusModeStateSchema,
  FOCUS_MODE_DEFAULT_CATEGORIES,
  FOCUS_MODE_MESSAGES,
} from './index'

describe('Focus Mode Schemas - Story 33.1', () => {
  describe('FOCUS_MODE_DURATIONS', () => {
    it('has correct pomodoro duration (25 minutes)', () => {
      expect(FOCUS_MODE_DURATIONS.pomodoro).toBe(25 * 60 * 1000)
    })

    it('has correct one hour duration', () => {
      expect(FOCUS_MODE_DURATIONS.oneHour).toBe(60 * 60 * 1000)
    })

    it('has correct two hours duration', () => {
      expect(FOCUS_MODE_DURATIONS.twoHours).toBe(2 * 60 * 60 * 1000)
    })

    it('has null for untilOff (no time limit)', () => {
      expect(FOCUS_MODE_DURATIONS.untilOff).toBeNull()
    })
  })

  describe('focusModeDurationSchema', () => {
    it('accepts valid duration types', () => {
      expect(focusModeDurationSchema.parse('pomodoro')).toBe('pomodoro')
      expect(focusModeDurationSchema.parse('oneHour')).toBe('oneHour')
      expect(focusModeDurationSchema.parse('twoHours')).toBe('twoHours')
      expect(focusModeDurationSchema.parse('untilOff')).toBe('untilOff')
    })

    it('rejects invalid duration type', () => {
      expect(() => focusModeDurationSchema.parse('invalid')).toThrow()
    })
  })

  describe('focusModeStatusSchema', () => {
    it('accepts valid status values', () => {
      expect(focusModeStatusSchema.parse('inactive')).toBe('inactive')
      expect(focusModeStatusSchema.parse('active')).toBe('active')
      expect(focusModeStatusSchema.parse('paused')).toBe('paused')
    })

    it('rejects invalid status', () => {
      expect(() => focusModeStatusSchema.parse('running')).toThrow()
    })
  })

  describe('focusModeSessionSchema', () => {
    const validSession = {
      id: 'session-1',
      childId: 'child-1',
      familyId: 'family-1',
      status: 'active',
      durationType: 'pomodoro',
      durationMs: 25 * 60 * 1000,
      startedAt: Date.now(),
      endedAt: null,
      completedFully: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    it('accepts valid session', () => {
      const result = focusModeSessionSchema.parse(validSession)

      expect(result.id).toBe('session-1')
      expect(result.status).toBe('active')
      expect(result.durationType).toBe('pomodoro')
    })

    it('accepts session with null durationMs (untilOff)', () => {
      const result = focusModeSessionSchema.parse({
        ...validSession,
        durationType: 'untilOff',
        durationMs: null,
      })

      expect(result.durationMs).toBeNull()
    })

    it('accepts completed session with endedAt', () => {
      const result = focusModeSessionSchema.parse({
        ...validSession,
        status: 'inactive',
        endedAt: Date.now(),
        completedFully: true,
      })

      expect(result.endedAt).not.toBeNull()
      expect(result.completedFully).toBe(true)
    })

    it('defaults completedFully to false', () => {
      const { completedFully: _completedFully, ...sessionWithoutCompletedFully } = validSession
      const result = focusModeSessionSchema.parse(sessionWithoutCompletedFully)

      expect(result.completedFully).toBe(false)
    })

    it('rejects session without required fields', () => {
      expect(() =>
        focusModeSessionSchema.parse({
          id: 'session-1',
          // missing other fields
        })
      ).toThrow()
    })
  })

  describe('focusModeStateSchema', () => {
    const validState = {
      childId: 'child-1',
      familyId: 'family-1',
      isActive: true,
      currentSession: {
        id: 'session-1',
        childId: 'child-1',
        familyId: 'family-1',
        status: 'active',
        durationType: 'pomodoro',
        durationMs: 25 * 60 * 1000,
        startedAt: Date.now(),
        endedAt: null,
        completedFully: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      totalSessionsToday: 3,
      totalFocusTimeToday: 75 * 60 * 1000,
      updatedAt: Date.now(),
    }

    it('accepts valid state with active session', () => {
      const result = focusModeStateSchema.parse(validState)

      expect(result.isActive).toBe(true)
      expect(result.currentSession).not.toBeNull()
    })

    it('accepts state with null currentSession (no active session)', () => {
      const result = focusModeStateSchema.parse({
        ...validState,
        isActive: false,
        currentSession: null,
      })

      expect(result.currentSession).toBeNull()
    })

    it('defaults isActive to false', () => {
      const { isActive: _isActive, ...stateWithoutActive } = validState
      const result = focusModeStateSchema.parse({
        ...stateWithoutActive,
        currentSession: null,
      })

      expect(result.isActive).toBe(false)
    })

    it('defaults totalSessionsToday to 0', () => {
      const { totalSessionsToday: _totalSessionsToday, ...stateWithoutSessions } = validState
      const result = focusModeStateSchema.parse({
        ...stateWithoutSessions,
        currentSession: null,
      })

      expect(result.totalSessionsToday).toBe(0)
    })

    it('defaults totalFocusTimeToday to 0', () => {
      const { totalFocusTimeToday: _totalFocusTimeToday, ...stateWithoutTime } = validState
      const result = focusModeStateSchema.parse({
        ...stateWithoutTime,
        currentSession: null,
      })

      expect(result.totalFocusTimeToday).toBe(0)
    })
  })

  describe('FOCUS_MODE_DEFAULT_CATEGORIES', () => {
    it('has allowed categories for focus work', () => {
      expect(FOCUS_MODE_DEFAULT_CATEGORIES.allowed).toContain('education')
      expect(FOCUS_MODE_DEFAULT_CATEGORIES.allowed).toContain('productivity')
    })

    it('has blocked categories for distractions', () => {
      expect(FOCUS_MODE_DEFAULT_CATEGORIES.blocked).toContain('social_media')
      expect(FOCUS_MODE_DEFAULT_CATEGORIES.blocked).toContain('games')
      expect(FOCUS_MODE_DEFAULT_CATEGORIES.blocked).toContain('entertainment')
    })
  })

  describe('FOCUS_MODE_MESSAGES', () => {
    it('has child-friendly start prompt', () => {
      expect(FOCUS_MODE_MESSAGES.startPrompt).toContain('Ready to focus')
    })

    it('generates starting message with duration', () => {
      const message = FOCUS_MODE_MESSAGES.starting('25 minutes')
      expect(message).toContain('Focus mode starting')
      expect(message).toContain('25 minutes')
    })

    it('generates time remaining message for 1 minute', () => {
      expect(FOCUS_MODE_MESSAGES.timeRemaining(1)).toBe('1 minute left')
    })

    it('generates time remaining message for multiple minutes', () => {
      expect(FOCUS_MODE_MESSAGES.timeRemaining(5)).toBe('5 minutes left')
    })

    it('has encouraging completion message', () => {
      expect(FOCUS_MODE_MESSAGES.completed).toContain('Great job')
    })

    it('has non-punitive early end message', () => {
      expect(FOCUS_MODE_MESSAGES.endedEarly).toContain('start another anytime')
      expect(FOCUS_MODE_MESSAGES.endedEarly.toLowerCase()).not.toContain('fail')
    })

    it('has duration labels for all durations', () => {
      expect(FOCUS_MODE_MESSAGES.durationLabels.pomodoro).toContain('25')
      expect(FOCUS_MODE_MESSAGES.durationLabels.oneHour).toContain('1 hour')
      expect(FOCUS_MODE_MESSAGES.durationLabels.twoHours).toContain('2 hours')
      expect(FOCUS_MODE_MESSAGES.durationLabels.untilOff).toContain('Until')
    })
  })
})
