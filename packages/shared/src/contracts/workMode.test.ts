/**
 * Work Mode Schema Tests - Story 33.3
 *
 * Tests for work mode data model validation.
 */

import { describe, it, expect } from 'vitest'
import {
  dayOfWeekSchema,
  workScheduleSchema,
  workModeStatusSchema,
  workModeActivationTypeSchema,
  workModeSessionSchema,
  workModeStateSchema,
  workModeAppEntrySchema,
  workModeConfigSchema,
  WORK_MODE_DEFAULT_APPS,
  WORK_MODE_MESSAGES,
} from './index'

describe('Work Mode Schemas - Story 33.3', () => {
  describe('dayOfWeekSchema', () => {
    it('accepts all valid days of week', () => {
      expect(dayOfWeekSchema.parse('sunday')).toBe('sunday')
      expect(dayOfWeekSchema.parse('monday')).toBe('monday')
      expect(dayOfWeekSchema.parse('tuesday')).toBe('tuesday')
      expect(dayOfWeekSchema.parse('wednesday')).toBe('wednesday')
      expect(dayOfWeekSchema.parse('thursday')).toBe('thursday')
      expect(dayOfWeekSchema.parse('friday')).toBe('friday')
      expect(dayOfWeekSchema.parse('saturday')).toBe('saturday')
    })

    it('rejects invalid day', () => {
      expect(() => dayOfWeekSchema.parse('invalid')).toThrow()
      expect(() => dayOfWeekSchema.parse('Sunday')).toThrow() // Case-sensitive
    })
  })

  describe('workScheduleSchema', () => {
    const validSchedule = {
      id: 'schedule-1',
      name: 'Coffee Shop Job',
      days: ['saturday', 'sunday'],
      startTime: '10:00',
      endTime: '16:00',
      isEnabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    it('accepts valid schedule', () => {
      const result = workScheduleSchema.parse(validSchedule)

      expect(result.id).toBe('schedule-1')
      expect(result.name).toBe('Coffee Shop Job')
      expect(result.days).toEqual(['saturday', 'sunday'])
      expect(result.startTime).toBe('10:00')
      expect(result.endTime).toBe('16:00')
    })

    it('accepts schedule with single day', () => {
      const result = workScheduleSchema.parse({
        ...validSchedule,
        days: ['friday'],
      })

      expect(result.days).toHaveLength(1)
    })

    it('defaults isEnabled to true', () => {
      const { isEnabled: _isEnabled, ...scheduleWithoutEnabled } = validSchedule
      const result = workScheduleSchema.parse(scheduleWithoutEnabled)

      expect(result.isEnabled).toBe(true)
    })

    it('rejects empty days array', () => {
      expect(() =>
        workScheduleSchema.parse({
          ...validSchedule,
          days: [],
        })
      ).toThrow()
    })

    it('rejects invalid time format', () => {
      expect(() =>
        workScheduleSchema.parse({
          ...validSchedule,
          startTime: '10am',
        })
      ).toThrow()

      expect(() =>
        workScheduleSchema.parse({
          ...validSchedule,
          startTime: '25:00', // Invalid hour
        })
      ).toThrow()

      expect(() =>
        workScheduleSchema.parse({
          ...validSchedule,
          endTime: '10:60', // Invalid minutes
        })
      ).toThrow()
    })

    it('accepts valid edge time formats', () => {
      const result = workScheduleSchema.parse({
        ...validSchedule,
        startTime: '00:00',
        endTime: '23:59',
      })

      expect(result.startTime).toBe('00:00')
      expect(result.endTime).toBe('23:59')
    })

    it('rejects empty name', () => {
      expect(() =>
        workScheduleSchema.parse({
          ...validSchedule,
          name: '',
        })
      ).toThrow()
    })
  })

  describe('workModeStatusSchema', () => {
    it('accepts valid status values', () => {
      expect(workModeStatusSchema.parse('inactive')).toBe('inactive')
      expect(workModeStatusSchema.parse('active')).toBe('active')
    })

    it('rejects invalid status', () => {
      expect(() => workModeStatusSchema.parse('paused')).toThrow()
    })
  })

  describe('workModeActivationTypeSchema', () => {
    it('accepts valid activation types', () => {
      expect(workModeActivationTypeSchema.parse('scheduled')).toBe('scheduled')
      expect(workModeActivationTypeSchema.parse('manual')).toBe('manual')
    })

    it('rejects invalid activation type', () => {
      expect(() => workModeActivationTypeSchema.parse('automatic')).toThrow()
    })
  })

  describe('workModeSessionSchema', () => {
    const validSession = {
      id: 'session-1',
      childId: 'child-1',
      familyId: 'family-1',
      status: 'active',
      activationType: 'scheduled',
      scheduleId: 'schedule-1',
      scheduleName: 'Coffee Shop Job',
      startedAt: Date.now(),
      scheduledEndAt: Date.now() + 6 * 60 * 60 * 1000, // 6 hours
      endedAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    it('accepts valid scheduled session', () => {
      const result = workModeSessionSchema.parse(validSession)

      expect(result.id).toBe('session-1')
      expect(result.status).toBe('active')
      expect(result.activationType).toBe('scheduled')
      expect(result.scheduleId).toBe('schedule-1')
    })

    it('accepts valid manual session', () => {
      const result = workModeSessionSchema.parse({
        ...validSession,
        activationType: 'manual',
        scheduleId: null,
        scheduleName: null,
        scheduledEndAt: null,
      })

      expect(result.activationType).toBe('manual')
      expect(result.scheduleId).toBeNull()
    })

    it('accepts completed session with endedAt', () => {
      const result = workModeSessionSchema.parse({
        ...validSession,
        status: 'inactive',
        endedAt: Date.now(),
      })

      expect(result.status).toBe('inactive')
      expect(result.endedAt).not.toBeNull()
    })

    it('rejects session without required fields', () => {
      expect(() =>
        workModeSessionSchema.parse({
          id: 'session-1',
          // missing other fields
        })
      ).toThrow()
    })
  })

  describe('workModeStateSchema', () => {
    const validSession = {
      id: 'session-1',
      childId: 'child-1',
      familyId: 'family-1',
      status: 'active',
      activationType: 'scheduled',
      scheduleId: 'schedule-1',
      scheduleName: 'Coffee Shop Job',
      startedAt: Date.now(),
      scheduledEndAt: Date.now() + 6 * 60 * 60 * 1000,
      endedAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    const validState = {
      childId: 'child-1',
      familyId: 'family-1',
      isActive: true,
      currentSession: validSession,
      totalSessionsThisWeek: 3,
      totalWorkTimeThisWeek: 18 * 60 * 60 * 1000, // 18 hours
      weekStartDate: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
      updatedAt: Date.now(),
    }

    it('accepts valid state with active session', () => {
      const result = workModeStateSchema.parse(validState)

      expect(result.isActive).toBe(true)
      expect(result.currentSession).not.toBeNull()
      expect(result.totalSessionsThisWeek).toBe(3)
    })

    it('accepts state with null currentSession', () => {
      const result = workModeStateSchema.parse({
        ...validState,
        isActive: false,
        currentSession: null,
      })

      expect(result.currentSession).toBeNull()
    })

    it('defaults isActive to false', () => {
      const { isActive: _isActive, ...stateWithoutActive } = validState
      const result = workModeStateSchema.parse({
        ...stateWithoutActive,
        currentSession: null,
      })

      expect(result.isActive).toBe(false)
    })

    it('defaults totalSessionsThisWeek to 0', () => {
      const { totalSessionsThisWeek: _total, ...stateWithoutSessions } = validState
      const result = workModeStateSchema.parse({
        ...stateWithoutSessions,
        currentSession: null,
      })

      expect(result.totalSessionsThisWeek).toBe(0)
    })

    it('defaults totalWorkTimeThisWeek to 0', () => {
      const { totalWorkTimeThisWeek: _total, ...stateWithoutTime } = validState
      const result = workModeStateSchema.parse({
        ...stateWithoutTime,
        currentSession: null,
      })

      expect(result.totalWorkTimeThisWeek).toBe(0)
    })
  })

  describe('workModeAppEntrySchema', () => {
    const validEntry = {
      pattern: 'slack.com',
      name: 'Slack',
      isWildcard: false,
      addedAt: Date.now(),
      addedByUid: 'parent-1',
    }

    it('accepts valid app entry', () => {
      const result = workModeAppEntrySchema.parse(validEntry)

      expect(result.pattern).toBe('slack.com')
      expect(result.name).toBe('Slack')
    })

    it('accepts wildcard pattern', () => {
      const result = workModeAppEntrySchema.parse({
        ...validEntry,
        pattern: '*.slack.com',
        isWildcard: true,
      })

      expect(result.isWildcard).toBe(true)
    })

    it('defaults isWildcard to false', () => {
      const { isWildcard: _isWildcard, ...entryWithoutWildcard } = validEntry
      const result = workModeAppEntrySchema.parse(entryWithoutWildcard)

      expect(result.isWildcard).toBe(false)
    })

    it('rejects empty pattern', () => {
      expect(() =>
        workModeAppEntrySchema.parse({
          ...validEntry,
          pattern: '',
        })
      ).toThrow()
    })

    it('rejects empty name', () => {
      expect(() =>
        workModeAppEntrySchema.parse({
          ...validEntry,
          name: '',
        })
      ).toThrow()
    })
  })

  describe('workModeConfigSchema', () => {
    const validSchedule = {
      id: 'schedule-1',
      name: 'Coffee Shop Job',
      days: ['saturday', 'sunday'],
      startTime: '10:00',
      endTime: '16:00',
      isEnabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    const validConfig = {
      childId: 'child-1',
      familyId: 'family-1',
      schedules: [validSchedule],
      useDefaultWorkApps: true,
      customWorkApps: [],
      pauseScreenshots: true,
      suspendTimeLimits: true,
      allowManualActivation: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    it('accepts valid config with schedules', () => {
      const result = workModeConfigSchema.parse(validConfig)

      expect(result.childId).toBe('child-1')
      expect(result.schedules).toHaveLength(1)
      expect(result.useDefaultWorkApps).toBe(true)
    })

    it('accepts config without schedules', () => {
      const result = workModeConfigSchema.parse({
        ...validConfig,
        schedules: [],
      })

      expect(result.schedules).toHaveLength(0)
    })

    it('defaults schedules to empty array', () => {
      const { schedules: _schedules, ...configWithoutSchedules } = validConfig
      const result = workModeConfigSchema.parse(configWithoutSchedules)

      expect(result.schedules).toEqual([])
    })

    it('defaults useDefaultWorkApps to true', () => {
      const { useDefaultWorkApps: _use, ...configWithoutDefault } = validConfig
      const result = workModeConfigSchema.parse(configWithoutDefault)

      expect(result.useDefaultWorkApps).toBe(true)
    })

    it('defaults pauseScreenshots to true', () => {
      const { pauseScreenshots: _pause, ...configWithoutPause } = validConfig
      const result = workModeConfigSchema.parse(configWithoutPause)

      expect(result.pauseScreenshots).toBe(true)
    })

    it('defaults suspendTimeLimits to true', () => {
      const { suspendTimeLimits: _suspend, ...configWithoutSuspend } = validConfig
      const result = workModeConfigSchema.parse(configWithoutSuspend)

      expect(result.suspendTimeLimits).toBe(true)
    })

    it('defaults allowManualActivation to true', () => {
      const { allowManualActivation: _allow, ...configWithoutManual } = validConfig
      const result = workModeConfigSchema.parse(configWithoutManual)

      expect(result.allowManualActivation).toBe(true)
    })

    it('accepts custom work apps', () => {
      const result = workModeConfigSchema.parse({
        ...validConfig,
        customWorkApps: [
          {
            pattern: 'customapp.com',
            name: 'Custom App',
            isWildcard: false,
            addedAt: Date.now(),
            addedByUid: 'parent-1',
          },
        ],
      })

      expect(result.customWorkApps).toHaveLength(1)
    })
  })

  describe('WORK_MODE_DEFAULT_APPS', () => {
    it('has scheduling apps', () => {
      expect(WORK_MODE_DEFAULT_APPS.scheduling).toBeDefined()
      expect(WORK_MODE_DEFAULT_APPS.scheduling.length).toBeGreaterThan(0)
      expect(WORK_MODE_DEFAULT_APPS.scheduling.some((app) => app.pattern === 'when2work.com')).toBe(
        true
      )
    })

    it('has communication apps', () => {
      expect(WORK_MODE_DEFAULT_APPS.communication).toBeDefined()
      expect(WORK_MODE_DEFAULT_APPS.communication.length).toBeGreaterThan(0)
      expect(WORK_MODE_DEFAULT_APPS.communication.some((app) => app.pattern === 'slack.com')).toBe(
        true
      )
    })

    it('has business apps', () => {
      expect(WORK_MODE_DEFAULT_APPS.business).toBeDefined()
      expect(WORK_MODE_DEFAULT_APPS.business.length).toBeGreaterThan(0)
    })

    it('has productivity apps', () => {
      expect(WORK_MODE_DEFAULT_APPS.productivity).toBeDefined()
      expect(WORK_MODE_DEFAULT_APPS.productivity.length).toBeGreaterThan(0)
    })

    it('all apps have pattern and name', () => {
      const allApps = [
        ...WORK_MODE_DEFAULT_APPS.scheduling,
        ...WORK_MODE_DEFAULT_APPS.communication,
        ...WORK_MODE_DEFAULT_APPS.business,
        ...WORK_MODE_DEFAULT_APPS.productivity,
      ]

      for (const app of allApps) {
        expect(app.pattern).toBeDefined()
        expect(app.name).toBeDefined()
        expect(app.pattern.length).toBeGreaterThan(0)
        expect(app.name.length).toBeGreaterThan(0)
      }
    })
  })

  describe('WORK_MODE_MESSAGES', () => {
    it('generates scheduled start message', () => {
      const message = WORK_MODE_MESSAGES.scheduledStart('Coffee Shop')
      expect(message).toContain('Work mode starting')
      expect(message).toContain('Coffee Shop')
    })

    it('has manual start message', () => {
      expect(WORK_MODE_MESSAGES.manualStart).toContain('Work mode started')
    })

    it('generates scheduled end message', () => {
      const message = WORK_MODE_MESSAGES.scheduledEnd('Coffee Shop')
      expect(message).toContain('Work mode ended')
      expect(message).toContain('Coffee Shop')
    })

    it('has manual end message', () => {
      expect(WORK_MODE_MESSAGES.manualEnd).toContain('Work mode ended')
    })

    it('generates active message with schedule name', () => {
      const message = WORK_MODE_MESSAGES.active('Coffee Shop')
      expect(message).toContain('Work mode active')
      expect(message).toContain('Coffee Shop')
    })

    it('generates active message for manual mode', () => {
      const message = WORK_MODE_MESSAGES.active(null)
      expect(message).toContain('manual')
    })

    it('generates time remaining message for 1 minute', () => {
      expect(WORK_MODE_MESSAGES.timeRemaining(1)).toBe('1 minute until work ends')
    })

    it('generates time remaining message for multiple minutes', () => {
      expect(WORK_MODE_MESSAGES.timeRemaining(30)).toBe('30 minutes until work ends')
    })

    it('generates parent notification for manual activation', () => {
      const message = WORK_MODE_MESSAGES.parentNotification('Jake', true)
      expect(message).toContain('Jake')
      expect(message).toContain('manually')
    })

    it('generates parent notification for scheduled activation', () => {
      const message = WORK_MODE_MESSAGES.parentNotification('Jake', false)
      expect(message).toContain('Jake')
      expect(message).toContain('scheduled')
    })

    it('has labels for all days of week', () => {
      expect(WORK_MODE_MESSAGES.scheduleLabels.sunday).toBe('Sunday')
      expect(WORK_MODE_MESSAGES.scheduleLabels.monday).toBe('Monday')
      expect(WORK_MODE_MESSAGES.scheduleLabels.tuesday).toBe('Tuesday')
      expect(WORK_MODE_MESSAGES.scheduleLabels.wednesday).toBe('Wednesday')
      expect(WORK_MODE_MESSAGES.scheduleLabels.thursday).toBe('Thursday')
      expect(WORK_MODE_MESSAGES.scheduleLabels.friday).toBe('Friday')
      expect(WORK_MODE_MESSAGES.scheduleLabels.saturday).toBe('Saturday')
    })
  })
})
