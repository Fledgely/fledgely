/**
 * Screen Time Data Model Tests - Story 29.1
 *
 * Tests for screen time schemas and type validations.
 */

import { describe, it, expect } from 'vitest'
import {
  screenTimeDeviceTypeSchema,
  screenTimeCategorySchema,
  appTimeEntrySchema,
  categoryTimeEntrySchema,
  deviceTimeEntrySchema,
  screenTimeDailySummarySchema,
  screenTimeWeeklySummarySchema,
  screenTimeEntrySchema,
  MAX_SCREEN_TIME_MINUTES_PER_DAY,
  MAX_SCREEN_TIME_MINUTES_PER_WEEK,
} from './index'

describe('Screen Time Data Model - Story 29.1', () => {
  // Test fixtures
  const validAppTimeEntry = {
    appName: 'Minecraft',
    minutes: 45,
  }

  const validCategoryTimeEntry = {
    category: 'gaming' as const,
    minutes: 60,
    topApps: [validAppTimeEntry],
  }

  const validDeviceTimeEntry = {
    deviceId: 'device-123',
    deviceName: 'School Chromebook',
    deviceType: 'chromebook' as const,
    minutes: 120,
    categories: [validCategoryTimeEntry],
  }

  const validDailySummary = {
    childId: 'child-123',
    date: '2025-12-31',
    timezone: 'America/New_York',
    totalMinutes: 180,
    devices: [validDeviceTimeEntry],
    categories: [validCategoryTimeEntry],
    updatedAt: Date.now(),
  }

  const validWeeklySummary = {
    childId: 'child-123',
    weekStartDate: '2025-12-29',
    timezone: 'America/New_York',
    totalMinutes: 1260,
    dailyTotals: [120, 180, 200, 150, 180, 250, 180],
    averageDaily: 180,
    categories: [validCategoryTimeEntry],
  }

  const validScreenTimeEntry = {
    childId: 'child-123',
    deviceId: 'device-123',
    date: '2025-12-31',
    timezone: 'America/New_York',
    appCategory: 'gaming' as const,
    minutes: 30,
    appName: 'Minecraft',
    recordedAt: Date.now(),
  }

  describe('AC1: Schema includes required fields', () => {
    describe('screenTimeDeviceTypeSchema', () => {
      it('accepts valid device types', () => {
        const deviceTypes = [
          'chromebook',
          'android',
          'ios',
          'windows',
          'macos',
          'fire_tv',
          'switch',
        ]
        deviceTypes.forEach((type) => {
          expect(() => screenTimeDeviceTypeSchema.parse(type)).not.toThrow()
        })
      })

      it('rejects invalid device type', () => {
        expect(() => screenTimeDeviceTypeSchema.parse('playstation')).toThrow()
      })
    })

    describe('screenTimeCategorySchema', () => {
      it('accepts valid categories', () => {
        const categories = [
          'education',
          'social_media',
          'gaming',
          'entertainment',
          'productivity',
          'communication',
          'news',
          'shopping',
          'other',
        ]
        categories.forEach((category) => {
          expect(() => screenTimeCategorySchema.parse(category)).not.toThrow()
        })
      })

      it('rejects invalid category', () => {
        expect(() => screenTimeCategorySchema.parse('unknown')).toThrow()
      })
    })

    describe('screenTimeEntrySchema - required fields', () => {
      it('validates entry with required fields: childId, deviceId, date, appCategory, minutes', () => {
        const entry = screenTimeEntrySchema.parse(validScreenTimeEntry)
        expect(entry.childId).toBe('child-123')
        expect(entry.deviceId).toBe('device-123')
        expect(entry.date).toBe('2025-12-31')
        expect(entry.appCategory).toBe('gaming')
        expect(entry.minutes).toBe(30)
      })

      it('rejects entry without childId', () => {
        const invalid = { ...validScreenTimeEntry }
        delete (invalid as Record<string, unknown>).childId
        expect(() => screenTimeEntrySchema.parse(invalid)).toThrow()
      })

      it('rejects entry without deviceId', () => {
        const invalid = { ...validScreenTimeEntry }
        delete (invalid as Record<string, unknown>).deviceId
        expect(() => screenTimeEntrySchema.parse(invalid)).toThrow()
      })
    })
  })

  describe('AC2: Per-day granularity', () => {
    it('validates date in YYYY-MM-DD format', () => {
      const result = screenTimeDailySummarySchema.parse(validDailySummary)
      expect(result.date).toBe('2025-12-31')
    })

    it('rejects invalid date format MM/DD/YYYY', () => {
      const invalid = { ...validDailySummary, date: '12/31/2025' }
      expect(() => screenTimeDailySummarySchema.parse(invalid)).toThrow()
    })

    it('rejects invalid date format DD-MM-YYYY', () => {
      const invalid = { ...validDailySummary, date: '31-12-2025' }
      expect(() => screenTimeDailySummarySchema.parse(invalid)).toThrow()
    })

    it('rejects date with time component', () => {
      const invalid = { ...validDailySummary, date: '2025-12-31T00:00:00Z' }
      expect(() => screenTimeDailySummarySchema.parse(invalid)).toThrow()
    })
  })

  describe('AC3: Zod schema creation', () => {
    it('screenTimeEntrySchema is a valid Zod schema', () => {
      expect(screenTimeEntrySchema).toBeDefined()
      expect(typeof screenTimeEntrySchema.parse).toBe('function')
    })

    it('screenTimeDailySummarySchema is a valid Zod schema', () => {
      expect(screenTimeDailySummarySchema).toBeDefined()
      expect(typeof screenTimeDailySummarySchema.parse).toBe('function')
    })

    it('screenTimeWeeklySummarySchema is a valid Zod schema', () => {
      expect(screenTimeWeeklySummarySchema).toBeDefined()
      expect(typeof screenTimeWeeklySummarySchema.parse).toBe('function')
    })
  })

  describe('AC4: Aggregation support', () => {
    describe('Daily aggregation by device', () => {
      it('validates daily summary with device breakdown', () => {
        const result = screenTimeDailySummarySchema.parse(validDailySummary)
        expect(result.devices).toHaveLength(1)
        expect(result.devices[0].deviceId).toBe('device-123')
        expect(result.devices[0].minutes).toBe(120)
      })

      it('supports multiple devices', () => {
        const multiDevice = {
          ...validDailySummary,
          devices: [
            validDeviceTimeEntry,
            { ...validDeviceTimeEntry, deviceId: 'device-456', deviceType: 'android' as const },
          ],
        }
        const result = screenTimeDailySummarySchema.parse(multiDevice)
        expect(result.devices).toHaveLength(2)
      })
    })

    describe('Daily aggregation by category', () => {
      it('validates daily summary with category breakdown', () => {
        const result = screenTimeDailySummarySchema.parse(validDailySummary)
        expect(result.categories).toHaveLength(1)
        expect(result.categories[0].category).toBe('gaming')
        expect(result.categories[0].minutes).toBe(60)
      })

      it('supports multiple categories', () => {
        const multiCategory = {
          ...validDailySummary,
          categories: [
            validCategoryTimeEntry,
            { ...validCategoryTimeEntry, category: 'education' as const },
          ],
        }
        const result = screenTimeDailySummarySchema.parse(multiCategory)
        expect(result.categories).toHaveLength(2)
      })
    })

    describe('Weekly aggregation', () => {
      it('validates weekly summary with 7 daily totals', () => {
        const result = screenTimeWeeklySummarySchema.parse(validWeeklySummary)
        expect(result.dailyTotals).toHaveLength(7)
      })

      it('rejects weekly summary with wrong number of daily totals', () => {
        const invalid = { ...validWeeklySummary, dailyTotals: [100, 200, 300] }
        expect(() => screenTimeWeeklySummarySchema.parse(invalid)).toThrow()
      })

      it('validates average daily calculation', () => {
        const result = screenTimeWeeklySummarySchema.parse(validWeeklySummary)
        expect(result.averageDaily).toBe(180)
      })
    })
  })

  describe('AC5: Timezone handling', () => {
    it('stores timezone with daily summary', () => {
      const result = screenTimeDailySummarySchema.parse(validDailySummary)
      expect(result.timezone).toBe('America/New_York')
    })

    it('stores timezone with weekly summary', () => {
      const result = screenTimeWeeklySummarySchema.parse(validWeeklySummary)
      expect(result.timezone).toBe('America/New_York')
    })

    it('stores timezone with screen time entry', () => {
      const result = screenTimeEntrySchema.parse(validScreenTimeEntry)
      expect(result.timezone).toBe('America/New_York')
    })

    it('accepts various IANA timezone formats', () => {
      const timezones = [
        'America/New_York',
        'Europe/London',
        'Asia/Tokyo',
        'Australia/Sydney',
        'Pacific/Auckland',
      ]
      timezones.forEach((tz) => {
        const entry = { ...validDailySummary, timezone: tz }
        const result = screenTimeDailySummarySchema.parse(entry)
        expect(result.timezone).toBe(tz)
      })
    })

    it('requires timezone field (not optional)', () => {
      const noTimezone = { ...validDailySummary }
      delete (noTimezone as Record<string, unknown>).timezone
      expect(() => screenTimeDailySummarySchema.parse(noTimezone)).toThrow()
    })
  })

  describe('AC6: Retention policy', () => {
    it('includes optional expiresAt field in daily summary', () => {
      const withExpiry = { ...validDailySummary, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 }
      const result = screenTimeDailySummarySchema.parse(withExpiry)
      expect(result.expiresAt).toBeDefined()
    })

    it('allows daily summary without expiresAt (optional)', () => {
      const result = screenTimeDailySummarySchema.parse(validDailySummary)
      expect(result.expiresAt).toBeUndefined()
    })
  })

  describe('Data validation', () => {
    it('rejects negative minutes', () => {
      const negative = { ...validScreenTimeEntry, minutes: -10 }
      expect(() => screenTimeEntrySchema.parse(negative)).toThrow()
    })

    it('rejects non-integer minutes', () => {
      const nonInteger = { ...validScreenTimeEntry, minutes: 30.5 }
      expect(() => screenTimeEntrySchema.parse(nonInteger)).toThrow()
    })

    it('accepts zero minutes', () => {
      const zero = { ...validScreenTimeEntry, minutes: 0 }
      const result = screenTimeEntrySchema.parse(zero)
      expect(result.minutes).toBe(0)
    })

    it('validates app time entry', () => {
      const result = appTimeEntrySchema.parse(validAppTimeEntry)
      expect(result.appName).toBe('Minecraft')
      expect(result.minutes).toBe(45)
    })

    it('validates category time entry with topApps', () => {
      const result = categoryTimeEntrySchema.parse(validCategoryTimeEntry)
      expect(result.topApps).toHaveLength(1)
      expect(result.topApps![0].appName).toBe('Minecraft')
    })

    it('allows category time entry without topApps', () => {
      const noTopApps = { category: 'education' as const, minutes: 60 }
      const result = categoryTimeEntrySchema.parse(noTopApps)
      expect(result.topApps).toBeUndefined()
    })

    it('validates device time entry', () => {
      const result = deviceTimeEntrySchema.parse(validDeviceTimeEntry)
      expect(result.deviceId).toBe('device-123')
      expect(result.deviceType).toBe('chromebook')
    })
  })

  describe('Type exports', () => {
    it('exports all required types', () => {
      // Type-level tests - just verify imports work
      // These would fail at compile time if types don't exist
      const deviceType = 'chromebook' as const
      const category = 'gaming' as const

      expect(screenTimeDeviceTypeSchema.parse(deviceType)).toBe('chromebook')
      expect(screenTimeCategorySchema.parse(category)).toBe('gaming')
    })
  })

  describe('Edge cases - maximum minutes validation', () => {
    it('exports MAX_SCREEN_TIME_MINUTES_PER_DAY constant as 1440', () => {
      expect(MAX_SCREEN_TIME_MINUTES_PER_DAY).toBe(1440)
    })

    it('exports MAX_SCREEN_TIME_MINUTES_PER_WEEK constant as 10080', () => {
      expect(MAX_SCREEN_TIME_MINUTES_PER_WEEK).toBe(10080)
    })

    it('accepts maximum daily minutes (1440 = 24 hours)', () => {
      const maxMinutes = { ...validScreenTimeEntry, minutes: 1440 }
      const result = screenTimeEntrySchema.parse(maxMinutes)
      expect(result.minutes).toBe(1440)
    })

    it('rejects minutes exceeding 24 hours (1441)', () => {
      const tooMany = { ...validScreenTimeEntry, minutes: 1441 }
      expect(() => screenTimeEntrySchema.parse(tooMany)).toThrow()
    })

    it('rejects excessive minutes in app time entry', () => {
      const tooMany = { appName: 'Test', minutes: 1441 }
      expect(() => appTimeEntrySchema.parse(tooMany)).toThrow()
    })

    it('rejects excessive minutes in category time entry', () => {
      const tooMany = { category: 'gaming' as const, minutes: 1441 }
      expect(() => categoryTimeEntrySchema.parse(tooMany)).toThrow()
    })

    it('rejects excessive minutes in device time entry', () => {
      const tooMany = { ...validDeviceTimeEntry, minutes: 1441 }
      expect(() => deviceTimeEntrySchema.parse(tooMany)).toThrow()
    })

    it('rejects excessive totalMinutes in daily summary', () => {
      const tooMany = { ...validDailySummary, totalMinutes: 1441 }
      expect(() => screenTimeDailySummarySchema.parse(tooMany)).toThrow()
    })

    it('accepts maximum weekly minutes (10080 = 7 days)', () => {
      const maxWeekly = { ...validWeeklySummary, totalMinutes: 10080 }
      const result = screenTimeWeeklySummarySchema.parse(maxWeekly)
      expect(result.totalMinutes).toBe(10080)
    })

    it('rejects weekly minutes exceeding 7 days (10081)', () => {
      const tooMany = { ...validWeeklySummary, totalMinutes: 10081 }
      expect(() => screenTimeWeeklySummarySchema.parse(tooMany)).toThrow()
    })

    it('rejects daily total exceeding 1440 in weekly summary', () => {
      const tooMany = { ...validWeeklySummary, dailyTotals: [1441, 0, 0, 0, 0, 0, 0] }
      expect(() => screenTimeWeeklySummarySchema.parse(tooMany)).toThrow()
    })

    it('rejects averageDaily exceeding 1440 in weekly summary', () => {
      const tooMany = { ...validWeeklySummary, averageDaily: 1441 }
      expect(() => screenTimeWeeklySummarySchema.parse(tooMany)).toThrow()
    })
  })

  describe('Edge cases - empty arrays', () => {
    it('accepts daily summary with empty devices array', () => {
      const empty = { ...validDailySummary, devices: [] }
      const result = screenTimeDailySummarySchema.parse(empty)
      expect(result.devices).toHaveLength(0)
    })

    it('accepts daily summary with empty categories array', () => {
      const empty = { ...validDailySummary, categories: [] }
      const result = screenTimeDailySummarySchema.parse(empty)
      expect(result.categories).toHaveLength(0)
    })

    it('accepts category time entry with empty topApps array', () => {
      const empty = { category: 'gaming' as const, minutes: 60, topApps: [] }
      const result = categoryTimeEntrySchema.parse(empty)
      expect(result.topApps).toHaveLength(0)
    })

    it('accepts device time entry with empty categories array', () => {
      const empty = { ...validDeviceTimeEntry, categories: [] }
      const result = deviceTimeEntrySchema.parse(empty)
      expect(result.categories).toHaveLength(0)
    })

    it('accepts weekly summary with empty categories array', () => {
      const empty = { ...validWeeklySummary, categories: [] }
      const result = screenTimeWeeklySummarySchema.parse(empty)
      expect(result.categories).toHaveLength(0)
    })
  })

  describe('Edge cases - boundary values', () => {
    it('accepts exactly 0 minutes for all time fields', () => {
      const zeroEntry = {
        ...validScreenTimeEntry,
        minutes: 0,
      }
      const result = screenTimeEntrySchema.parse(zeroEntry)
      expect(result.minutes).toBe(0)
    })

    it('accepts 0 totalMinutes in daily summary', () => {
      const zero = { ...validDailySummary, totalMinutes: 0 }
      const result = screenTimeDailySummarySchema.parse(zero)
      expect(result.totalMinutes).toBe(0)
    })

    it('accepts all zero dailyTotals in weekly summary', () => {
      const zeros = { ...validWeeklySummary, dailyTotals: [0, 0, 0, 0, 0, 0, 0] }
      const result = screenTimeWeeklySummarySchema.parse(zeros)
      expect(result.dailyTotals.every((v) => v === 0)).toBe(true)
    })

    it('accepts 0 averageDaily in weekly summary', () => {
      const zero = { ...validWeeklySummary, averageDaily: 0 }
      const result = screenTimeWeeklySummarySchema.parse(zero)
      expect(result.averageDaily).toBe(0)
    })
  })
})
