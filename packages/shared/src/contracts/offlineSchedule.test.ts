/**
 * Tests for Family Offline Schedule schemas
 * Story 32.1: Family Offline Schedule Configuration
 */

import { describe, it, expect } from 'vitest'
import {
  offlineSchedulePresetSchema,
  offlineTimeWindowSchema,
  familyOfflineScheduleSchema,
  OFFLINE_SCHEDULE_PRESETS,
  OFFLINE_PRESET_LABELS,
  type OfflineTimeWindow,
  type FamilyOfflineSchedule,
} from './index'

describe('offlineSchedulePresetSchema', () => {
  it('accepts valid preset values', () => {
    expect(offlineSchedulePresetSchema.parse('custom')).toBe('custom')
    expect(offlineSchedulePresetSchema.parse('dinner_time')).toBe('dinner_time')
    expect(offlineSchedulePresetSchema.parse('bedtime')).toBe('bedtime')
  })

  it('rejects invalid preset values', () => {
    expect(() => offlineSchedulePresetSchema.parse('invalid')).toThrow()
    expect(() => offlineSchedulePresetSchema.parse('')).toThrow()
    expect(() => offlineSchedulePresetSchema.parse(123)).toThrow()
  })
})

describe('offlineTimeWindowSchema', () => {
  it('validates complete time window', () => {
    const window: OfflineTimeWindow = {
      startTime: '20:00',
      endTime: '07:00',
      timezone: 'America/New_York',
    }
    expect(() => offlineTimeWindowSchema.parse(window)).not.toThrow()
  })

  it('accepts valid HH:MM time format', () => {
    const validTimes = ['00:00', '23:59', '12:30', '06:15', '18:00', '07:00']
    validTimes.forEach((time) => {
      const window = { startTime: time, endTime: '20:00', timezone: 'UTC' }
      expect(() => offlineTimeWindowSchema.parse(window)).not.toThrow()
    })
  })

  it('rejects invalid time formats', () => {
    // Regex validates format HH:MM, not value ranges
    const invalidTimes = ['8:00', '08:0', 'noon', '8pm', '08:00:00', '1200', '']
    invalidTimes.forEach((time) => {
      const window = { startTime: time, endTime: '20:00', timezone: 'UTC' }
      expect(() => offlineTimeWindowSchema.parse(window)).toThrow()
    })
  })

  it('requires all fields', () => {
    expect(() => offlineTimeWindowSchema.parse({})).toThrow()
    expect(() => offlineTimeWindowSchema.parse({ startTime: '20:00' })).toThrow()
    expect(() => offlineTimeWindowSchema.parse({ startTime: '20:00', endTime: '07:00' })).toThrow()
  })
})

describe('familyOfflineScheduleSchema', () => {
  const validSchedule: FamilyOfflineSchedule = {
    familyId: 'family-123',
    enabled: true,
    preset: 'custom',
    weekdaySchedule: {
      startTime: '20:00',
      endTime: '07:00',
      timezone: 'America/New_York',
    },
    weekendSchedule: {
      startTime: '21:00',
      endTime: '08:00',
      timezone: 'America/New_York',
    },
    appliesToParents: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  it('validates complete schedule', () => {
    expect(() => familyOfflineScheduleSchema.parse(validSchedule)).not.toThrow()
  })

  it('allows minimal schedule with defaults', () => {
    const minimalSchedule = {
      familyId: 'family-123',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    const parsed = familyOfflineScheduleSchema.parse(minimalSchedule)
    expect(parsed.enabled).toBe(false) // default
    expect(parsed.preset).toBe('custom') // default
    expect(parsed.appliesToParents).toBe(true) // default
  })

  it('allows schedule without weekday/weekend (optional)', () => {
    const schedule = {
      familyId: 'family-123',
      enabled: true,
      preset: 'custom' as const,
      appliesToParents: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    expect(() => familyOfflineScheduleSchema.parse(schedule)).not.toThrow()
  })

  it('validates preset enum', () => {
    const scheduleWithPreset = {
      ...validSchedule,
      preset: 'dinner_time',
    }
    expect(() => familyOfflineScheduleSchema.parse(scheduleWithPreset)).not.toThrow()

    const scheduleWithInvalidPreset = {
      ...validSchedule,
      preset: 'invalid_preset',
    }
    expect(() => familyOfflineScheduleSchema.parse(scheduleWithInvalidPreset)).toThrow()
  })

  it('requires familyId', () => {
    const { familyId: _familyId, ...scheduleWithoutFamily } = validSchedule
    expect(() => familyOfflineScheduleSchema.parse(scheduleWithoutFamily)).toThrow()
  })

  it('requires timestamps', () => {
    const { createdAt: _createdAt, ...scheduleWithoutCreated } = validSchedule
    expect(() => familyOfflineScheduleSchema.parse(scheduleWithoutCreated)).toThrow()

    const { updatedAt: _updatedAt, ...scheduleWithoutUpdated } = validSchedule
    expect(() => familyOfflineScheduleSchema.parse(scheduleWithoutUpdated)).toThrow()
  })

  it('validates nested time windows', () => {
    const scheduleWithInvalidWindow = {
      ...validSchedule,
      weekdaySchedule: {
        startTime: 'invalid',
        endTime: '07:00',
        timezone: 'UTC',
      },
    }
    expect(() => familyOfflineScheduleSchema.parse(scheduleWithInvalidWindow)).toThrow()
  })
})

describe('OFFLINE_SCHEDULE_PRESETS', () => {
  it('has dinner_time preset with correct times', () => {
    const preset = OFFLINE_SCHEDULE_PRESETS.dinner_time
    expect(preset.weekday.startTime).toBe('18:00')
    expect(preset.weekday.endTime).toBe('19:00')
    expect(preset.weekend.startTime).toBe('18:00')
    expect(preset.weekend.endTime).toBe('19:00')
  })

  it('has bedtime preset with correct times', () => {
    const preset = OFFLINE_SCHEDULE_PRESETS.bedtime
    expect(preset.weekday.startTime).toBe('21:00')
    expect(preset.weekday.endTime).toBe('07:00')
    expect(preset.weekend.startTime).toBe('22:00') // Later on weekends
    expect(preset.weekend.endTime).toBe('08:00')
  })
})

describe('OFFLINE_PRESET_LABELS', () => {
  it('has labels for all presets', () => {
    expect(OFFLINE_PRESET_LABELS.custom).toBe('Custom')
    expect(OFFLINE_PRESET_LABELS.dinner_time).toBe('Dinner Time')
    expect(OFFLINE_PRESET_LABELS.bedtime).toBe('Bedtime')
  })
})
