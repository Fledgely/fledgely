/**
 * Tests for Child Notification Preferences Schema.
 *
 * Story 41.7: Child Notification Preferences
 */

import { describe, it, expect } from 'vitest'
import {
  childNotificationPreferencesSchema,
  childNotificationPreferencesUpdateSchema,
  getChildNotificationPreferencesInputSchema,
  updateChildNotificationPreferencesInputSchema,
  calculateAge,
  getAgeAppropriateDefaults,
  createDefaultChildNotificationPreferences,
  applyChildPreferencesUpdate,
  isInChildQuietHours,
  shouldDeliverChildNotification,
  isRequiredChildNotificationType,
  getChildPreferencesDescription,
  CHILD_NOTIFICATION_TYPES,
  CHILD_QUIET_HOURS_DEFAULTS,
  AGE_BRACKETS,
  REQUIRED_CHILD_NOTIFICATION_TYPES,
  OPTIONAL_CHILD_NOTIFICATION_TYPES,
  type ChildNotificationPreferences,
} from './childNotificationPreferences'

describe('childNotificationPreferences', () => {
  describe('childNotificationPreferencesSchema', () => {
    it('validates complete preferences object', () => {
      const now = new Date()
      const prefs = {
        id: 'child-123',
        childId: 'child-123',
        familyId: 'family-456',
        timeLimitWarningsEnabled: true,
        agreementChangesEnabled: true,
        trustScoreChangesEnabled: false,
        weeklySummaryEnabled: true,
        quietHoursEnabled: true,
        quietHoursStart: '21:00',
        quietHoursEnd: '07:00',
        updatedAt: now,
        createdAt: now,
      }

      const result = childNotificationPreferencesSchema.safeParse(prefs)
      expect(result.success).toBe(true)
    })

    it('enforces required notifications are always true', () => {
      const now = new Date()
      const prefs = {
        id: 'child-123',
        childId: 'child-123',
        familyId: 'family-456',
        timeLimitWarningsEnabled: false, // Invalid - must be true
        agreementChangesEnabled: true,
        trustScoreChangesEnabled: false,
        weeklySummaryEnabled: false,
        quietHoursEnabled: false,
        quietHoursStart: '21:00',
        quietHoursEnd: '07:00',
        updatedAt: now,
        createdAt: now,
      }

      const result = childNotificationPreferencesSchema.safeParse(prefs)
      expect(result.success).toBe(false)
    })

    it('validates time format for quiet hours', () => {
      const now = new Date()
      const prefs = {
        id: 'child-123',
        childId: 'child-123',
        familyId: 'family-456',
        timeLimitWarningsEnabled: true,
        agreementChangesEnabled: true,
        trustScoreChangesEnabled: false,
        weeklySummaryEnabled: false,
        quietHoursEnabled: true,
        quietHoursStart: '25:00', // Invalid time
        quietHoursEnd: '07:00',
        updatedAt: now,
        createdAt: now,
      }

      const result = childNotificationPreferencesSchema.safeParse(prefs)
      expect(result.success).toBe(false)
    })

    it('rejects invalid time format for quiet hours end', () => {
      const now = new Date()
      const prefs = {
        id: 'child-123',
        childId: 'child-123',
        familyId: 'family-456',
        timeLimitWarningsEnabled: true,
        agreementChangesEnabled: true,
        trustScoreChangesEnabled: false,
        weeklySummaryEnabled: false,
        quietHoursEnabled: true,
        quietHoursStart: '21:00',
        quietHoursEnd: '7:00', // Invalid - needs leading zero
        updatedAt: now,
        createdAt: now,
      }

      const result = childNotificationPreferencesSchema.safeParse(prefs)
      expect(result.success).toBe(false)
    })

    it('requires all mandatory fields', () => {
      const result = childNotificationPreferencesSchema.safeParse({
        id: 'child-123',
        // Missing other required fields
      })
      expect(result.success).toBe(false)
    })
  })

  describe('childNotificationPreferencesUpdateSchema', () => {
    it('validates partial update with optional fields only', () => {
      const update = {
        trustScoreChangesEnabled: true,
        weeklySummaryEnabled: false,
      }

      const result = childNotificationPreferencesUpdateSchema.safeParse(update)
      expect(result.success).toBe(true)
    })

    it('validates quiet hours update', () => {
      const update = {
        quietHoursEnabled: true,
        quietHoursStart: '20:00',
        quietHoursEnd: '08:00',
      }

      const result = childNotificationPreferencesUpdateSchema.safeParse(update)
      expect(result.success).toBe(true)
    })

    it('accepts empty update (no changes)', () => {
      const result = childNotificationPreferencesUpdateSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('does not include required notification fields', () => {
      // These fields should not be in the update schema
      const update = {
        timeLimitWarningsEnabled: false, // Should be ignored/not validated
      }

      const result = childNotificationPreferencesUpdateSchema.safeParse(update)
      // Should still succeed but field will be stripped
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('timeLimitWarningsEnabled')
      }
    })
  })

  describe('getChildNotificationPreferencesInputSchema', () => {
    it('validates valid input', () => {
      const result = getChildNotificationPreferencesInputSchema.safeParse({
        childId: 'child-123',
        familyId: 'family-456',
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty childId', () => {
      const result = getChildNotificationPreferencesInputSchema.safeParse({
        childId: '',
        familyId: 'family-456',
      })
      expect(result.success).toBe(false)
    })

    it('rejects empty familyId', () => {
      const result = getChildNotificationPreferencesInputSchema.safeParse({
        childId: 'child-123',
        familyId: '',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateChildNotificationPreferencesInputSchema', () => {
    it('validates valid input with preferences', () => {
      const result = updateChildNotificationPreferencesInputSchema.safeParse({
        childId: 'child-123',
        familyId: 'family-456',
        preferences: {
          trustScoreChangesEnabled: true,
        },
      })
      expect(result.success).toBe(true)
    })

    it('rejects missing preferences', () => {
      const result = updateChildNotificationPreferencesInputSchema.safeParse({
        childId: 'child-123',
        familyId: 'family-456',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('calculateAge', () => {
    it('calculates age correctly for birthday passed this year', () => {
      const birthDate = new Date('2010-01-15')
      const now = new Date('2024-06-15')
      expect(calculateAge(birthDate, now)).toBe(14)
    })

    it('calculates age correctly for birthday not yet passed this year', () => {
      const birthDate = new Date('2010-08-15')
      const now = new Date('2024-06-15')
      expect(calculateAge(birthDate, now)).toBe(13)
    })

    it('calculates age correctly on exact birthday', () => {
      const birthDate = new Date('2010-06-15')
      const now = new Date('2024-06-15')
      expect(calculateAge(birthDate, now)).toBe(14)
    })

    it('calculates age correctly day before birthday', () => {
      const birthDate = new Date('2010-06-15')
      const now = new Date('2024-06-14')
      expect(calculateAge(birthDate, now)).toBe(13)
    })
  })

  describe('getAgeAppropriateDefaults', () => {
    it('returns minimal defaults for ages 8-12', () => {
      // 10-year-old
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 10)

      const defaults = getAgeAppropriateDefaults(birthDate)
      expect(defaults.trustScoreChangesEnabled).toBe(false)
      expect(defaults.weeklySummaryEnabled).toBe(false)
    })

    it('returns moderate defaults for ages 13-15', () => {
      // 14-year-old
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 14)

      const defaults = getAgeAppropriateDefaults(birthDate)
      expect(defaults.trustScoreChangesEnabled).toBe(true)
      expect(defaults.weeklySummaryEnabled).toBe(false)
    })

    it('returns full defaults for ages 16+', () => {
      // 17-year-old
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 17)

      const defaults = getAgeAppropriateDefaults(birthDate)
      expect(defaults.trustScoreChangesEnabled).toBe(true)
      expect(defaults.weeklySummaryEnabled).toBe(true)
    })

    it('handles edge case at age 13 boundary', () => {
      // Exactly 13 years old
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 13)

      const defaults = getAgeAppropriateDefaults(birthDate)
      expect(defaults.trustScoreChangesEnabled).toBe(true)
      expect(defaults.weeklySummaryEnabled).toBe(false)
    })

    it('handles edge case at age 16 boundary', () => {
      // Exactly 16 years old
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 16)

      const defaults = getAgeAppropriateDefaults(birthDate)
      expect(defaults.trustScoreChangesEnabled).toBe(true)
      expect(defaults.weeklySummaryEnabled).toBe(true)
    })
  })

  describe('createDefaultChildNotificationPreferences', () => {
    it('creates preferences with age-appropriate defaults for young child', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 10)

      const prefs = createDefaultChildNotificationPreferences('child-123', 'family-456', birthDate)

      expect(prefs.id).toBe('child-123')
      expect(prefs.childId).toBe('child-123')
      expect(prefs.familyId).toBe('family-456')
      expect(prefs.timeLimitWarningsEnabled).toBe(true)
      expect(prefs.agreementChangesEnabled).toBe(true)
      expect(prefs.trustScoreChangesEnabled).toBe(false)
      expect(prefs.weeklySummaryEnabled).toBe(false)
      expect(prefs.quietHoursEnabled).toBe(false)
      expect(prefs.quietHoursStart).toBe(CHILD_QUIET_HOURS_DEFAULTS.start)
      expect(prefs.quietHoursEnd).toBe(CHILD_QUIET_HOURS_DEFAULTS.end)
    })

    it('creates preferences with age-appropriate defaults for older teen', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 17)

      const prefs = createDefaultChildNotificationPreferences('child-123', 'family-456', birthDate)

      expect(prefs.trustScoreChangesEnabled).toBe(true)
      expect(prefs.weeklySummaryEnabled).toBe(true)
    })

    it('sets timestamps', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 12)

      const before = new Date()
      const prefs = createDefaultChildNotificationPreferences('child-123', 'family-456', birthDate)
      const after = new Date()

      expect(prefs.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(prefs.createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
      expect(prefs.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(prefs.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('applyChildPreferencesUpdate', () => {
    const createTestPrefs = (): ChildNotificationPreferences => ({
      id: 'child-123',
      childId: 'child-123',
      familyId: 'family-456',
      timeLimitWarningsEnabled: true,
      agreementChangesEnabled: true,
      trustScoreChangesEnabled: false,
      weeklySummaryEnabled: false,
      quietHoursEnabled: false,
      quietHoursStart: '21:00',
      quietHoursEnd: '07:00',
      updatedAt: new Date('2024-01-01'),
      createdAt: new Date('2024-01-01'),
    })

    it('updates optional notification settings', () => {
      const existing = createTestPrefs()
      const updated = applyChildPreferencesUpdate(existing, {
        trustScoreChangesEnabled: true,
        weeklySummaryEnabled: true,
      })

      expect(updated.trustScoreChangesEnabled).toBe(true)
      expect(updated.weeklySummaryEnabled).toBe(true)
    })

    it('updates quiet hours settings', () => {
      const existing = createTestPrefs()
      const updated = applyChildPreferencesUpdate(existing, {
        quietHoursEnabled: true,
        quietHoursStart: '20:00',
        quietHoursEnd: '08:00',
      })

      expect(updated.quietHoursEnabled).toBe(true)
      expect(updated.quietHoursStart).toBe('20:00')
      expect(updated.quietHoursEnd).toBe('08:00')
    })

    it('preserves required notifications as true', () => {
      const existing = createTestPrefs()
      const updated = applyChildPreferencesUpdate(existing, {
        trustScoreChangesEnabled: true,
      })

      // Required fields should always remain true
      expect(updated.timeLimitWarningsEnabled).toBe(true)
      expect(updated.agreementChangesEnabled).toBe(true)
    })

    it('preserves unchanged optional fields', () => {
      const existing = createTestPrefs()
      existing.trustScoreChangesEnabled = true

      const updated = applyChildPreferencesUpdate(existing, {
        weeklySummaryEnabled: true,
      })

      expect(updated.trustScoreChangesEnabled).toBe(true) // Preserved
      expect(updated.weeklySummaryEnabled).toBe(true) // Updated
    })

    it('updates the updatedAt timestamp', () => {
      const existing = createTestPrefs()
      const originalUpdatedAt = existing.updatedAt

      const updated = applyChildPreferencesUpdate(existing, {
        trustScoreChangesEnabled: true,
      })

      expect(updated.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })

    it('preserves createdAt timestamp', () => {
      const existing = createTestPrefs()
      const originalCreatedAt = existing.createdAt

      const updated = applyChildPreferencesUpdate(existing, {
        trustScoreChangesEnabled: true,
      })

      expect(updated.createdAt).toEqual(originalCreatedAt)
    })
  })

  describe('isInChildQuietHours', () => {
    const createPrefsWithQuietHours = (
      enabled: boolean,
      start: string,
      end: string
    ): ChildNotificationPreferences => ({
      id: 'child-123',
      childId: 'child-123',
      familyId: 'family-456',
      timeLimitWarningsEnabled: true,
      agreementChangesEnabled: true,
      trustScoreChangesEnabled: false,
      weeklySummaryEnabled: false,
      quietHoursEnabled: enabled,
      quietHoursStart: start,
      quietHoursEnd: end,
      updatedAt: new Date(),
      createdAt: new Date(),
    })

    it('returns false when quiet hours are disabled', () => {
      const prefs = createPrefsWithQuietHours(false, '21:00', '07:00')
      const result = isInChildQuietHours(prefs, new Date('2024-01-01T22:00:00'))
      expect(result).toBe(false)
    })

    it('returns true when in overnight quiet hours (before midnight)', () => {
      const prefs = createPrefsWithQuietHours(true, '21:00', '07:00')
      const result = isInChildQuietHours(prefs, new Date('2024-01-01T22:00:00'))
      expect(result).toBe(true)
    })

    it('returns true when in overnight quiet hours (after midnight)', () => {
      const prefs = createPrefsWithQuietHours(true, '21:00', '07:00')
      const result = isInChildQuietHours(prefs, new Date('2024-01-01T05:00:00'))
      expect(result).toBe(true)
    })

    it('returns false when outside overnight quiet hours', () => {
      const prefs = createPrefsWithQuietHours(true, '21:00', '07:00')
      const result = isInChildQuietHours(prefs, new Date('2024-01-01T12:00:00'))
      expect(result).toBe(false)
    })

    it('returns true when in same-day quiet hours (school hours)', () => {
      const prefs = createPrefsWithQuietHours(true, '08:00', '15:00')
      const result = isInChildQuietHours(prefs, new Date('2024-01-01T10:00:00'))
      expect(result).toBe(true)
    })

    it('returns false when outside same-day quiet hours', () => {
      const prefs = createPrefsWithQuietHours(true, '08:00', '15:00')
      const result = isInChildQuietHours(prefs, new Date('2024-01-01T16:00:00'))
      expect(result).toBe(false)
    })

    it('handles boundary at start of quiet hours', () => {
      const prefs = createPrefsWithQuietHours(true, '21:00', '07:00')
      const result = isInChildQuietHours(prefs, new Date('2024-01-01T21:00:00'))
      expect(result).toBe(true)
    })

    it('handles boundary at end of quiet hours', () => {
      const prefs = createPrefsWithQuietHours(true, '21:00', '07:00')
      const result = isInChildQuietHours(prefs, new Date('2024-01-01T07:00:00'))
      expect(result).toBe(false) // End time is exclusive
    })
  })

  describe('shouldDeliverChildNotification', () => {
    const createPrefs = (
      options: Partial<ChildNotificationPreferences> = {}
    ): ChildNotificationPreferences => ({
      id: 'child-123',
      childId: 'child-123',
      familyId: 'family-456',
      timeLimitWarningsEnabled: true,
      agreementChangesEnabled: true,
      trustScoreChangesEnabled: false,
      weeklySummaryEnabled: false,
      quietHoursEnabled: false,
      quietHoursStart: '21:00',
      quietHoursEnd: '07:00',
      updatedAt: new Date(),
      createdAt: new Date(),
      ...options,
    })

    it('always delivers required time_limit_warning notifications', () => {
      const prefs = createPrefs({ quietHoursEnabled: true })
      const result = shouldDeliverChildNotification(
        prefs,
        CHILD_NOTIFICATION_TYPES.TIME_LIMIT_WARNING,
        new Date('2024-01-01T23:00:00') // During quiet hours
      )
      expect(result.deliver).toBe(true)
    })

    it('always delivers required agreement_change notifications', () => {
      const prefs = createPrefs({ quietHoursEnabled: true })
      const result = shouldDeliverChildNotification(
        prefs,
        CHILD_NOTIFICATION_TYPES.AGREEMENT_CHANGE,
        new Date('2024-01-01T23:00:00') // During quiet hours
      )
      expect(result.deliver).toBe(true)
    })

    it('always delivers required device_removed notifications (Story 19.6)', () => {
      const prefs = createPrefs({ quietHoursEnabled: true })
      const result = shouldDeliverChildNotification(
        prefs,
        CHILD_NOTIFICATION_TYPES.DEVICE_REMOVED,
        new Date('2024-01-01T23:00:00') // During quiet hours
      )
      expect(result.deliver).toBe(true)
    })

    it('does not deliver trust_score_change when disabled', () => {
      const prefs = createPrefs({ trustScoreChangesEnabled: false })
      const result = shouldDeliverChildNotification(
        prefs,
        CHILD_NOTIFICATION_TYPES.TRUST_SCORE_CHANGE
      )
      expect(result.deliver).toBe(false)
      expect(result.reason).toBe('trust_score_disabled')
    })

    it('delivers trust_score_change when enabled', () => {
      const prefs = createPrefs({ trustScoreChangesEnabled: true })
      const result = shouldDeliverChildNotification(
        prefs,
        CHILD_NOTIFICATION_TYPES.TRUST_SCORE_CHANGE,
        new Date('2024-01-01T12:00:00') // Not in quiet hours
      )
      expect(result.deliver).toBe(true)
    })

    it('does not deliver weekly_summary when disabled', () => {
      const prefs = createPrefs({ weeklySummaryEnabled: false })
      const result = shouldDeliverChildNotification(prefs, CHILD_NOTIFICATION_TYPES.WEEKLY_SUMMARY)
      expect(result.deliver).toBe(false)
      expect(result.reason).toBe('weekly_summary_disabled')
    })

    it('delivers weekly_summary when enabled', () => {
      const prefs = createPrefs({ weeklySummaryEnabled: true })
      const result = shouldDeliverChildNotification(
        prefs,
        CHILD_NOTIFICATION_TYPES.WEEKLY_SUMMARY,
        new Date('2024-01-01T12:00:00') // Not in quiet hours
      )
      expect(result.deliver).toBe(true)
    })

    it('respects quiet hours for optional notifications', () => {
      const prefs = createPrefs({
        trustScoreChangesEnabled: true,
        quietHoursEnabled: true,
      })
      const result = shouldDeliverChildNotification(
        prefs,
        CHILD_NOTIFICATION_TYPES.TRUST_SCORE_CHANGE,
        new Date('2024-01-01T23:00:00') // During quiet hours
      )
      expect(result.deliver).toBe(false)
      expect(result.reason).toBe('quiet_hours')
    })
  })

  describe('isRequiredChildNotificationType', () => {
    it('returns true for time_limit_warning', () => {
      expect(isRequiredChildNotificationType(CHILD_NOTIFICATION_TYPES.TIME_LIMIT_WARNING)).toBe(
        true
      )
    })

    it('returns true for agreement_change', () => {
      expect(isRequiredChildNotificationType(CHILD_NOTIFICATION_TYPES.AGREEMENT_CHANGE)).toBe(true)
    })

    it('returns true for device_removed (Story 19.6)', () => {
      expect(isRequiredChildNotificationType(CHILD_NOTIFICATION_TYPES.DEVICE_REMOVED)).toBe(true)
    })

    it('returns false for trust_score_change', () => {
      expect(isRequiredChildNotificationType(CHILD_NOTIFICATION_TYPES.TRUST_SCORE_CHANGE)).toBe(
        false
      )
    })

    it('returns false for weekly_summary', () => {
      expect(isRequiredChildNotificationType(CHILD_NOTIFICATION_TYPES.WEEKLY_SUMMARY)).toBe(false)
    })
  })

  describe('getChildPreferencesDescription', () => {
    it('generates descriptions for preferences', () => {
      const prefs: ChildNotificationPreferences = {
        id: 'child-123',
        childId: 'child-123',
        familyId: 'family-456',
        timeLimitWarningsEnabled: true,
        agreementChangesEnabled: true,
        trustScoreChangesEnabled: true,
        weeklySummaryEnabled: false,
        quietHoursEnabled: true,
        quietHoursStart: '21:00',
        quietHoursEnd: '07:00',
        updatedAt: new Date(),
        createdAt: new Date(),
      }

      const descriptions = getChildPreferencesDescription(prefs)

      expect(descriptions).toContain('Time limit warnings: Always on (required)')
      expect(descriptions).toContain('Agreement changes: Always on (required)')
      expect(descriptions).toContain('Trust score changes: Enabled')
      expect(descriptions).toContain('Weekly summary: Disabled')
      expect(descriptions).toContain('Quiet hours: 21:00 - 07:00')
    })

    it('shows disabled quiet hours', () => {
      const prefs: ChildNotificationPreferences = {
        id: 'child-123',
        childId: 'child-123',
        familyId: 'family-456',
        timeLimitWarningsEnabled: true,
        agreementChangesEnabled: true,
        trustScoreChangesEnabled: false,
        weeklySummaryEnabled: false,
        quietHoursEnabled: false,
        quietHoursStart: '21:00',
        quietHoursEnd: '07:00',
        updatedAt: new Date(),
        createdAt: new Date(),
      }

      const descriptions = getChildPreferencesDescription(prefs)

      expect(descriptions).toContain('Quiet hours: Disabled')
    })
  })

  describe('constants', () => {
    it('has correct quiet hours defaults', () => {
      expect(CHILD_QUIET_HOURS_DEFAULTS.start).toBe('21:00')
      expect(CHILD_QUIET_HOURS_DEFAULTS.end).toBe('07:00')
    })

    it('has correct notification type values', () => {
      expect(CHILD_NOTIFICATION_TYPES.TIME_LIMIT_WARNING).toBe('time_limit_warning')
      expect(CHILD_NOTIFICATION_TYPES.AGREEMENT_CHANGE).toBe('agreement_change')
      expect(CHILD_NOTIFICATION_TYPES.DEVICE_REMOVED).toBe('device_removed')
      expect(CHILD_NOTIFICATION_TYPES.TRUST_SCORE_CHANGE).toBe('trust_score_change')
      expect(CHILD_NOTIFICATION_TYPES.WEEKLY_SUMMARY).toBe('weekly_summary')
    })

    it('has correct age brackets', () => {
      expect(AGE_BRACKETS.YOUNG).toEqual({ min: 8, max: 12 })
      expect(AGE_BRACKETS.TEEN).toEqual({ min: 13, max: 15 })
      expect(AGE_BRACKETS.OLDER_TEEN).toEqual({ min: 16, max: 99 })
    })

    it('separates required and optional notification types correctly', () => {
      expect(REQUIRED_CHILD_NOTIFICATION_TYPES).toContain(
        CHILD_NOTIFICATION_TYPES.TIME_LIMIT_WARNING
      )
      expect(REQUIRED_CHILD_NOTIFICATION_TYPES).toContain(CHILD_NOTIFICATION_TYPES.AGREEMENT_CHANGE)
      expect(REQUIRED_CHILD_NOTIFICATION_TYPES).toContain(CHILD_NOTIFICATION_TYPES.DEVICE_REMOVED)
      expect(REQUIRED_CHILD_NOTIFICATION_TYPES).toHaveLength(3)

      expect(OPTIONAL_CHILD_NOTIFICATION_TYPES).toContain(
        CHILD_NOTIFICATION_TYPES.TRUST_SCORE_CHANGE
      )
      expect(OPTIONAL_CHILD_NOTIFICATION_TYPES).toContain(CHILD_NOTIFICATION_TYPES.WEEKLY_SUMMARY)
      expect(OPTIONAL_CHILD_NOTIFICATION_TYPES).toHaveLength(2)
    })
  })
})
