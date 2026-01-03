/**
 * Tests for Notification Preferences Schema
 *
 * Story 41.1: Notification Preferences Configuration
 */

import { describe, it, expect } from 'vitest'
import {
  parentNotificationPreferencesSchema,
  notificationPreferencesUpdateSchema,
  getNotificationPreferencesInputSchema,
  updateNotificationPreferencesInputSchema,
  mediumFlagsModeSchema,
  syncThresholdHoursSchema,
  createDefaultNotificationPreferences,
  applyPreferencesUpdate,
  isInQuietHours,
  shouldSendNotification,
  getPreferencesDescription,
  NOTIFICATION_DEFAULTS,
  QUIET_HOURS_DEFAULTS,
  SYNC_THRESHOLD_OPTIONS,
  MEDIUM_FLAGS_MODE_OPTIONS,
} from './notificationPreferences'

describe('notificationPreferences', () => {
  describe('Constants', () => {
    it('has correct default values', () => {
      expect(NOTIFICATION_DEFAULTS.criticalFlagsEnabled).toBe(true)
      expect(NOTIFICATION_DEFAULTS.mediumFlagsMode).toBe('digest')
      expect(NOTIFICATION_DEFAULTS.lowFlagsEnabled).toBe(false)
      expect(NOTIFICATION_DEFAULTS.timeLimitWarningsEnabled).toBe(true)
      expect(NOTIFICATION_DEFAULTS.limitReachedEnabled).toBe(true)
      expect(NOTIFICATION_DEFAULTS.extensionRequestsEnabled).toBe(true)
      expect(NOTIFICATION_DEFAULTS.syncAlertsEnabled).toBe(true)
      expect(NOTIFICATION_DEFAULTS.syncThresholdHours).toBe(4)
      expect(NOTIFICATION_DEFAULTS.quietHoursEnabled).toBe(false)
    })

    it('has correct quiet hours defaults', () => {
      expect(QUIET_HOURS_DEFAULTS.start).toBe('22:00')
      expect(QUIET_HOURS_DEFAULTS.end).toBe('07:00')
    })

    it('has correct sync threshold options', () => {
      expect(SYNC_THRESHOLD_OPTIONS).toEqual([1, 4, 12, 24])
    })

    it('has correct medium flags mode options', () => {
      expect(MEDIUM_FLAGS_MODE_OPTIONS).toEqual(['immediate', 'digest', 'off'])
    })
  })

  describe('mediumFlagsModeSchema', () => {
    it('accepts immediate', () => {
      expect(mediumFlagsModeSchema.parse('immediate')).toBe('immediate')
    })

    it('accepts digest', () => {
      expect(mediumFlagsModeSchema.parse('digest')).toBe('digest')
    })

    it('accepts off', () => {
      expect(mediumFlagsModeSchema.parse('off')).toBe('off')
    })

    it('rejects invalid mode', () => {
      expect(() => mediumFlagsModeSchema.parse('invalid')).toThrow()
    })
  })

  describe('syncThresholdHoursSchema', () => {
    it('accepts 1 hour', () => {
      expect(syncThresholdHoursSchema.parse(1)).toBe(1)
    })

    it('accepts 4 hours', () => {
      expect(syncThresholdHoursSchema.parse(4)).toBe(4)
    })

    it('accepts 12 hours', () => {
      expect(syncThresholdHoursSchema.parse(12)).toBe(12)
    })

    it('accepts 24 hours', () => {
      expect(syncThresholdHoursSchema.parse(24)).toBe(24)
    })

    it('rejects invalid hours', () => {
      expect(() => syncThresholdHoursSchema.parse(2)).toThrow()
      expect(() => syncThresholdHoursSchema.parse(6)).toThrow()
    })
  })

  describe('parentNotificationPreferencesSchema', () => {
    const validPrefs = {
      id: 'user-123-child-456',
      userId: 'user-123',
      familyId: 'family-123',
      childId: 'child-456',
      criticalFlagsEnabled: true,
      mediumFlagsMode: 'digest' as const,
      lowFlagsEnabled: false,
      timeLimitWarningsEnabled: true,
      limitReachedEnabled: true,
      extensionRequestsEnabled: true,
      syncAlertsEnabled: true,
      syncThresholdHours: 4 as const,
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      quietHoursWeekendDifferent: false,
      quietHoursWeekendStart: null,
      quietHoursWeekendEnd: null,
      updatedAt: new Date(),
      createdAt: new Date(),
    }

    it('validates complete preferences', () => {
      const result = parentNotificationPreferencesSchema.parse(validPrefs)
      expect(result.id).toBe('user-123-child-456')
      expect(result.userId).toBe('user-123')
      expect(result.familyId).toBe('family-123')
      expect(result.childId).toBe('child-456')
    })

    it('accepts null childId for family defaults', () => {
      const prefs = { ...validPrefs, childId: null, id: 'user-123-default' }
      const result = parentNotificationPreferencesSchema.parse(prefs)
      expect(result.childId).toBeNull()
    })

    it('validates time format for quiet hours', () => {
      expect(() => {
        parentNotificationPreferencesSchema.parse({
          ...validPrefs,
          quietHoursStart: '25:00',
        })
      }).toThrow()
    })

    it('validates time format - valid times', () => {
      const prefs = { ...validPrefs, quietHoursStart: '00:00', quietHoursEnd: '23:59' }
      const result = parentNotificationPreferencesSchema.parse(prefs)
      expect(result.quietHoursStart).toBe('00:00')
      expect(result.quietHoursEnd).toBe('23:59')
    })

    it('rejects invalid time format', () => {
      expect(() => {
        parentNotificationPreferencesSchema.parse({
          ...validPrefs,
          quietHoursStart: '9:30',
        })
      }).toThrow()
    })

    it('requires id', () => {
      const { id: _id, ...noId } = validPrefs
      expect(() => parentNotificationPreferencesSchema.parse(noId)).toThrow()
    })

    it('requires userId', () => {
      const { userId: _userId, ...noUserId } = validPrefs
      expect(() => parentNotificationPreferencesSchema.parse(noUserId)).toThrow()
    })

    it('requires familyId', () => {
      const { familyId: _familyId, ...noFamilyId } = validPrefs
      expect(() => parentNotificationPreferencesSchema.parse(noFamilyId)).toThrow()
    })

    it('validates weekend quiet hours when different', () => {
      const prefs = {
        ...validPrefs,
        quietHoursWeekendDifferent: true,
        quietHoursWeekendStart: '23:00',
        quietHoursWeekendEnd: '09:00',
      }
      const result = parentNotificationPreferencesSchema.parse(prefs)
      expect(result.quietHoursWeekendStart).toBe('23:00')
      expect(result.quietHoursWeekendEnd).toBe('09:00')
    })
  })

  describe('notificationPreferencesUpdateSchema', () => {
    it('accepts partial update', () => {
      const update = { criticalFlagsEnabled: false }
      const result = notificationPreferencesUpdateSchema.parse(update)
      expect(result.criticalFlagsEnabled).toBe(false)
    })

    it('accepts all fields', () => {
      const update = {
        childId: 'child-123',
        applyToAllChildren: true,
        criticalFlagsEnabled: false,
        mediumFlagsMode: 'immediate' as const,
        lowFlagsEnabled: true,
        timeLimitWarningsEnabled: false,
        limitReachedEnabled: false,
        extensionRequestsEnabled: false,
        syncAlertsEnabled: false,
        syncThresholdHours: 1 as const,
        quietHoursEnabled: true,
        quietHoursStart: '21:00',
        quietHoursEnd: '08:00',
        quietHoursWeekendDifferent: true,
        quietHoursWeekendStart: '22:00',
        quietHoursWeekendEnd: '10:00',
      }
      const result = notificationPreferencesUpdateSchema.parse(update)
      expect(result.applyToAllChildren).toBe(true)
    })

    it('accepts empty update', () => {
      const result = notificationPreferencesUpdateSchema.parse({})
      expect(result).toEqual({})
    })
  })

  describe('getNotificationPreferencesInputSchema', () => {
    it('validates with familyId only', () => {
      const input = { familyId: 'family-123' }
      const result = getNotificationPreferencesInputSchema.parse(input)
      expect(result.familyId).toBe('family-123')
    })

    it('validates with familyId and childId', () => {
      const input = { familyId: 'family-123', childId: 'child-456' }
      const result = getNotificationPreferencesInputSchema.parse(input)
      expect(result.childId).toBe('child-456')
    })

    it('accepts null childId', () => {
      const input = { familyId: 'family-123', childId: null }
      const result = getNotificationPreferencesInputSchema.parse(input)
      expect(result.childId).toBeNull()
    })

    it('requires familyId', () => {
      expect(() => getNotificationPreferencesInputSchema.parse({})).toThrow()
    })
  })

  describe('updateNotificationPreferencesInputSchema', () => {
    it('validates input', () => {
      const input = {
        familyId: 'family-123',
        preferences: { criticalFlagsEnabled: false },
      }
      const result = updateNotificationPreferencesInputSchema.parse(input)
      expect(result.familyId).toBe('family-123')
      expect(result.preferences.criticalFlagsEnabled).toBe(false)
    })

    it('requires familyId', () => {
      expect(() =>
        updateNotificationPreferencesInputSchema.parse({
          preferences: {},
        })
      ).toThrow()
    })
  })

  describe('createDefaultNotificationPreferences', () => {
    it('creates preferences with defaults', () => {
      const prefs = createDefaultNotificationPreferences('user-123', 'family-123')
      expect(prefs.id).toBe('user-123-default')
      expect(prefs.userId).toBe('user-123')
      expect(prefs.familyId).toBe('family-123')
      expect(prefs.childId).toBeNull()
      expect(prefs.criticalFlagsEnabled).toBe(true)
      expect(prefs.mediumFlagsMode).toBe('digest')
      expect(prefs.syncThresholdHours).toBe(4)
    })

    it('creates child-specific preferences', () => {
      const prefs = createDefaultNotificationPreferences('user-123', 'family-123', 'child-456')
      expect(prefs.id).toBe('user-123-child-456')
      expect(prefs.childId).toBe('child-456')
    })

    it('sets timestamps', () => {
      const before = new Date()
      const prefs = createDefaultNotificationPreferences('user-123', 'family-123')
      const after = new Date()

      expect(prefs.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(prefs.createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
      expect(prefs.updatedAt.getTime()).toEqual(prefs.createdAt.getTime())
    })
  })

  describe('applyPreferencesUpdate', () => {
    const existingPrefs = createDefaultNotificationPreferences('user-123', 'family-123')

    it('applies partial update', () => {
      const updated = applyPreferencesUpdate(existingPrefs, { criticalFlagsEnabled: false })
      expect(updated.criticalFlagsEnabled).toBe(false)
      expect(updated.mediumFlagsMode).toBe('digest') // unchanged
    })

    it('updates timestamp', () => {
      const oldDate = existingPrefs.updatedAt
      const updated = applyPreferencesUpdate(existingPrefs, { lowFlagsEnabled: true })
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(oldDate.getTime())
    })

    it('preserves existing values when not updated', () => {
      const prefs = {
        ...existingPrefs,
        criticalFlagsEnabled: false,
        syncThresholdHours: 1 as const,
      }
      const updated = applyPreferencesUpdate(prefs, { lowFlagsEnabled: true })
      expect(updated.criticalFlagsEnabled).toBe(false)
      expect(updated.syncThresholdHours).toBe(1)
    })

    it('handles null values for weekend hours', () => {
      const updated = applyPreferencesUpdate(existingPrefs, { quietHoursWeekendStart: null })
      expect(updated.quietHoursWeekendStart).toBeNull()
    })
  })

  describe('isInQuietHours', () => {
    const basePrefs = createDefaultNotificationPreferences('user-123', 'family-123')

    it('returns false when quiet hours disabled', () => {
      const prefs = { ...basePrefs, quietHoursEnabled: false }
      const result = isInQuietHours(prefs, new Date('2026-01-03T23:00:00'))
      expect(result).toBe(false)
    })

    it('returns true when in quiet hours (overnight)', () => {
      const prefs = {
        ...basePrefs,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      }
      // 23:00 is between 22:00 and 07:00
      const result = isInQuietHours(prefs, new Date('2026-01-03T23:00:00'))
      expect(result).toBe(true)
    })

    it('returns true when in quiet hours (early morning)', () => {
      const prefs = {
        ...basePrefs,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      }
      // 05:00 is between 22:00 and 07:00
      const result = isInQuietHours(prefs, new Date('2026-01-03T05:00:00'))
      expect(result).toBe(true)
    })

    it('returns false when outside quiet hours', () => {
      const prefs = {
        ...basePrefs,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      }
      // 12:00 is outside 22:00-07:00
      const result = isInQuietHours(prefs, new Date('2026-01-03T12:00:00'))
      expect(result).toBe(false)
    })

    it('handles same-day quiet hours', () => {
      const prefs = {
        ...basePrefs,
        quietHoursEnabled: true,
        quietHoursStart: '12:00',
        quietHoursEnd: '14:00',
      }
      expect(isInQuietHours(prefs, new Date('2026-01-03T13:00:00'))).toBe(true)
      expect(isInQuietHours(prefs, new Date('2026-01-03T11:00:00'))).toBe(false)
      expect(isInQuietHours(prefs, new Date('2026-01-03T15:00:00'))).toBe(false)
    })

    it('uses weekend hours on Saturday', () => {
      const prefs = {
        ...basePrefs,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        quietHoursWeekendDifferent: true,
        quietHoursWeekendStart: '23:00',
        quietHoursWeekendEnd: '10:00',
      }
      // Saturday at 22:30 - outside weekend quiet hours (23:00-10:00)
      // Use a known Saturday: Jan 10, 2026
      const knownSaturday = new Date('2026-01-10T22:30:00')
      expect(isInQuietHours(prefs, knownSaturday)).toBe(false) // 22:30 < 23:00
    })

    it('uses weekday hours on Wednesday', () => {
      const prefs = {
        ...basePrefs,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        quietHoursWeekendDifferent: true,
        quietHoursWeekendStart: '23:00',
        quietHoursWeekendEnd: '10:00',
      }
      // Wednesday at 22:30 - inside weekday quiet hours (22:00-07:00)
      const wednesday = new Date('2026-01-07T22:30:00') // Jan 7, 2026 is Wednesday
      expect(isInQuietHours(prefs, wednesday)).toBe(true)
    })
  })

  describe('shouldSendNotification', () => {
    const prefs = createDefaultNotificationPreferences('user-123', 'family-123')

    it('checks critical flag preference', () => {
      expect(shouldSendNotification(prefs, 'critical_flag')).toBe(true)
      const disabled = { ...prefs, criticalFlagsEnabled: false }
      expect(shouldSendNotification(disabled, 'critical_flag')).toBe(false)
    })

    it('checks medium flag preference', () => {
      expect(shouldSendNotification(prefs, 'medium_flag')).toBe(true) // digest mode
      const off = { ...prefs, mediumFlagsMode: 'off' as const }
      expect(shouldSendNotification(off, 'medium_flag')).toBe(false)
    })

    it('checks low flag preference', () => {
      expect(shouldSendNotification(prefs, 'low_flag')).toBe(false) // default off
      const enabled = { ...prefs, lowFlagsEnabled: true }
      expect(shouldSendNotification(enabled, 'low_flag')).toBe(true)
    })

    it('checks time warning preference', () => {
      expect(shouldSendNotification(prefs, 'time_warning')).toBe(true)
      const disabled = { ...prefs, timeLimitWarningsEnabled: false }
      expect(shouldSendNotification(disabled, 'time_warning')).toBe(false)
    })

    it('checks limit reached preference', () => {
      expect(shouldSendNotification(prefs, 'limit_reached')).toBe(true)
      const disabled = { ...prefs, limitReachedEnabled: false }
      expect(shouldSendNotification(disabled, 'limit_reached')).toBe(false)
    })

    it('checks extension request preference', () => {
      expect(shouldSendNotification(prefs, 'extension_request')).toBe(true)
      const disabled = { ...prefs, extensionRequestsEnabled: false }
      expect(shouldSendNotification(disabled, 'extension_request')).toBe(false)
    })

    it('checks sync alert preference', () => {
      expect(shouldSendNotification(prefs, 'sync_alert')).toBe(true)
      const disabled = { ...prefs, syncAlertsEnabled: false }
      expect(shouldSendNotification(disabled, 'sync_alert')).toBe(false)
    })
  })

  describe('getPreferencesDescription', () => {
    it('describes default preferences', () => {
      const prefs = createDefaultNotificationPreferences('user-123', 'family-123')
      const descriptions = getPreferencesDescription(prefs)

      expect(descriptions).toContain('Critical flags: Immediate notification')
      expect(descriptions).toContain('Medium flags: Hourly digest')
      expect(descriptions).toContain('Time limit warnings: Enabled')
      expect(descriptions).toContain('Sync alerts: After 4h')
    })

    it('includes quiet hours when enabled', () => {
      const prefs = {
        ...createDefaultNotificationPreferences('user-123', 'family-123'),
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      }
      const descriptions = getPreferencesDescription(prefs)

      expect(descriptions).toContain('Quiet hours: 22:00 - 07:00')
    })

    it('shows low flags when enabled', () => {
      const prefs = {
        ...createDefaultNotificationPreferences('user-123', 'family-123'),
        lowFlagsEnabled: true,
      }
      const descriptions = getPreferencesDescription(prefs)

      expect(descriptions).toContain('Low flags: Enabled')
    })

    it('shows immediate mode for medium flags', () => {
      const prefs = {
        ...createDefaultNotificationPreferences('user-123', 'family-123'),
        mediumFlagsMode: 'immediate' as const,
      }
      const descriptions = getPreferencesDescription(prefs)

      expect(descriptions).toContain('Medium flags: Immediate notification')
    })

    it('shows off mode for medium flags', () => {
      const prefs = {
        ...createDefaultNotificationPreferences('user-123', 'family-123'),
        mediumFlagsMode: 'off' as const,
      }
      const descriptions = getPreferencesDescription(prefs)

      expect(descriptions).toContain('Medium flags: Off')
    })
  })
})
