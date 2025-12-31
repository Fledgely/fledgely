/**
 * Time Limit Data Model Tests - Story 30.1
 *
 * Tests for time limit schemas and type validations.
 */

import { describe, it, expect } from 'vitest'
import {
  timeLimitTypeSchema,
  dayOfWeekSchema,
  scheduleTypeSchema,
  timeLimitScheduleSchema,
  categoryLimitSchema,
  deviceLimitSchema,
  timeLimitSchema,
  childTimeLimitsSchema,
  MAX_SCREEN_TIME_MINUTES_PER_DAY,
} from './index'

describe('Time Limit Data Model - Story 30.1', () => {
  // Test fixtures
  const now = Date.now()

  const validSchedule = {
    scheduleType: 'weekdays' as const,
    weekdayMinutes: 120,
    weekendMinutes: 180,
  }

  const validCategoryLimit = {
    category: 'gaming' as const,
    schedule: validSchedule,
  }

  const validDeviceLimit = {
    deviceId: 'device-123',
    deviceName: 'School Chromebook',
    deviceType: 'chromebook' as const,
    schedule: validSchedule,
  }

  const validTimeLimit = {
    limitType: 'daily_total' as const,
    schedule: validSchedule,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }

  const validChildTimeLimits = {
    childId: 'child-123',
    familyId: 'family-456',
    dailyTotal: validSchedule,
    categoryLimits: [validCategoryLimit],
    deviceLimits: [validDeviceLimit],
    updatedAt: now,
    version: 1,
  }

  describe('AC1: Schema includes required fields (childId, limitType, category, minutes, schedule)', () => {
    describe('childTimeLimitsSchema', () => {
      it('accepts valid child time limits configuration', () => {
        expect(() => childTimeLimitsSchema.parse(validChildTimeLimits)).not.toThrow()
      })

      it('requires childId field', () => {
        const { childId: _childId, ...withoutChildId } = validChildTimeLimits
        expect(() => childTimeLimitsSchema.parse(withoutChildId)).toThrow()
      })

      it('requires familyId field', () => {
        const { familyId: _familyId, ...withoutFamilyId } = validChildTimeLimits
        expect(() => childTimeLimitsSchema.parse(withoutFamilyId)).toThrow()
      })

      it('requires updatedAt field', () => {
        const { updatedAt: _updatedAt, ...withoutUpdatedAt } = validChildTimeLimits
        expect(() => childTimeLimitsSchema.parse(withoutUpdatedAt)).toThrow()
      })

      it('defaults version to 1', () => {
        const { version: _version, ...withoutVersion } = validChildTimeLimits
        const result = childTimeLimitsSchema.parse(withoutVersion)
        expect(result.version).toBe(1)
      })
    })

    describe('timeLimitSchema', () => {
      it('accepts valid time limit with all required fields', () => {
        expect(() => timeLimitSchema.parse(validTimeLimit)).not.toThrow()
      })

      it('requires limitType field', () => {
        const { limitType: _limitType, ...withoutLimitType } = validTimeLimit
        expect(() => timeLimitSchema.parse(withoutLimitType)).toThrow()
      })

      it('requires schedule field', () => {
        const { schedule: _schedule, ...withoutSchedule } = validTimeLimit
        expect(() => timeLimitSchema.parse(withoutSchedule)).toThrow()
      })

      it('requires createdAt field', () => {
        const { createdAt: _createdAt, ...withoutCreatedAt } = validTimeLimit
        expect(() => timeLimitSchema.parse(withoutCreatedAt)).toThrow()
      })

      it('requires updatedAt field', () => {
        const { updatedAt: _updatedAt, ...withoutUpdatedAt } = validTimeLimit
        expect(() => timeLimitSchema.parse(withoutUpdatedAt)).toThrow()
      })

      it('accepts category for per_category limits', () => {
        const categoryLimit = {
          ...validTimeLimit,
          limitType: 'per_category' as const,
          category: 'gaming' as const,
        }
        expect(() => timeLimitSchema.parse(categoryLimit)).not.toThrow()
      })

      it('accepts deviceId for per_device limits', () => {
        const deviceLimit = {
          ...validTimeLimit,
          limitType: 'per_device' as const,
          deviceId: 'device-123',
        }
        expect(() => timeLimitSchema.parse(deviceLimit)).not.toThrow()
      })
    })

    describe('categoryLimitSchema', () => {
      it('accepts valid category limit', () => {
        expect(() => categoryLimitSchema.parse(validCategoryLimit)).not.toThrow()
      })

      it('requires category field', () => {
        const { category: _category, ...withoutCategory } = validCategoryLimit
        expect(() => categoryLimitSchema.parse(withoutCategory)).toThrow()
      })

      it('requires schedule field', () => {
        const { schedule: _schedule, ...withoutSchedule } = validCategoryLimit
        expect(() => categoryLimitSchema.parse(withoutSchedule)).toThrow()
      })
    })

    describe('deviceLimitSchema', () => {
      it('accepts valid device limit', () => {
        expect(() => deviceLimitSchema.parse(validDeviceLimit)).not.toThrow()
      })

      it('requires deviceId field', () => {
        const { deviceId: _deviceId, ...withoutDeviceId } = validDeviceLimit
        expect(() => deviceLimitSchema.parse(withoutDeviceId)).toThrow()
      })

      it('requires deviceName field', () => {
        const { deviceName: _deviceName, ...withoutDeviceName } = validDeviceLimit
        expect(() => deviceLimitSchema.parse(withoutDeviceName)).toThrow()
      })

      it('requires schedule field', () => {
        const { schedule: _schedule, ...withoutSchedule } = validDeviceLimit
        expect(() => deviceLimitSchema.parse(withoutSchedule)).toThrow()
      })

      it('accepts optional categoryOverrides', () => {
        const withOverrides = {
          ...validDeviceLimit,
          categoryOverrides: [validCategoryLimit],
        }
        expect(() => deviceLimitSchema.parse(withOverrides)).not.toThrow()
      })
    })

    describe('timeLimitScheduleSchema', () => {
      it('accepts valid schedule with weekday/weekend minutes', () => {
        expect(() => timeLimitScheduleSchema.parse(validSchedule)).not.toThrow()
      })

      it('requires scheduleType field', () => {
        const { scheduleType: _scheduleType, ...withoutScheduleType } = validSchedule
        expect(() => timeLimitScheduleSchema.parse(withoutScheduleType)).toThrow()
      })

      it('accepts minutes up to MAX_SCREEN_TIME_MINUTES_PER_DAY (1440)', () => {
        const maxSchedule = {
          scheduleType: 'all_days' as const,
          weekdayMinutes: MAX_SCREEN_TIME_MINUTES_PER_DAY,
          weekendMinutes: MAX_SCREEN_TIME_MINUTES_PER_DAY,
        }
        expect(() => timeLimitScheduleSchema.parse(maxSchedule)).not.toThrow()
      })

      it('rejects minutes exceeding 24 hours (1440 minutes)', () => {
        const exceededSchedule = {
          scheduleType: 'all_days' as const,
          weekdayMinutes: 1500,
        }
        expect(() => timeLimitScheduleSchema.parse(exceededSchedule)).toThrow()
      })

      it('rejects negative minutes', () => {
        const negativeSchedule = {
          scheduleType: 'all_days' as const,
          weekdayMinutes: -60,
        }
        expect(() => timeLimitScheduleSchema.parse(negativeSchedule)).toThrow()
      })

      it('requires integer minutes', () => {
        const floatSchedule = {
          scheduleType: 'all_days' as const,
          weekdayMinutes: 120.5,
        }
        expect(() => timeLimitScheduleSchema.parse(floatSchedule)).toThrow()
      })

      it('accepts unlimited flag', () => {
        const unlimitedSchedule = {
          scheduleType: 'all_days' as const,
          unlimited: true,
        }
        const result = timeLimitScheduleSchema.parse(unlimitedSchedule)
        expect(result.unlimited).toBe(true)
      })
    })
  })

  describe('AC2: Limit types supported (daily_total, per_device, per_category)', () => {
    describe('timeLimitTypeSchema', () => {
      it('accepts daily_total limit type', () => {
        expect(() => timeLimitTypeSchema.parse('daily_total')).not.toThrow()
        expect(timeLimitTypeSchema.parse('daily_total')).toBe('daily_total')
      })

      it('accepts per_device limit type', () => {
        expect(() => timeLimitTypeSchema.parse('per_device')).not.toThrow()
        expect(timeLimitTypeSchema.parse('per_device')).toBe('per_device')
      })

      it('accepts per_category limit type', () => {
        expect(() => timeLimitTypeSchema.parse('per_category')).not.toThrow()
        expect(timeLimitTypeSchema.parse('per_category')).toBe('per_category')
      })

      it('rejects invalid limit types', () => {
        expect(() => timeLimitTypeSchema.parse('hourly')).toThrow()
        expect(() => timeLimitTypeSchema.parse('monthly')).toThrow()
        expect(() => timeLimitTypeSchema.parse('per_app')).toThrow()
        expect(() => timeLimitTypeSchema.parse('')).toThrow()
      })
    })

    it('validates all limit types in timeLimitSchema with required fields', () => {
      // daily_total - no extra fields needed
      const dailyTotal = {
        ...validTimeLimit,
        limitType: 'daily_total' as const,
      }
      expect(() => timeLimitSchema.parse(dailyTotal)).not.toThrow()

      // per_device - requires deviceId
      const perDevice = {
        ...validTimeLimit,
        limitType: 'per_device' as const,
        deviceId: 'device-123',
      }
      expect(() => timeLimitSchema.parse(perDevice)).not.toThrow()

      // per_category - requires category
      const perCategory = {
        ...validTimeLimit,
        limitType: 'per_category' as const,
        category: 'gaming' as const,
      }
      expect(() => timeLimitSchema.parse(perCategory)).not.toThrow()
    })
  })

  describe('AC3: Schedule support (weekday vs weekend different limits)', () => {
    describe('scheduleTypeSchema', () => {
      it('accepts weekdays schedule type', () => {
        expect(() => scheduleTypeSchema.parse('weekdays')).not.toThrow()
      })

      it('accepts weekends schedule type', () => {
        expect(() => scheduleTypeSchema.parse('weekends')).not.toThrow()
      })

      it('accepts school_days schedule type', () => {
        expect(() => scheduleTypeSchema.parse('school_days')).not.toThrow()
      })

      it('accepts all_days schedule type', () => {
        expect(() => scheduleTypeSchema.parse('all_days')).not.toThrow()
      })

      it('accepts custom schedule type', () => {
        expect(() => scheduleTypeSchema.parse('custom')).not.toThrow()
      })

      it('rejects invalid schedule types', () => {
        expect(() => scheduleTypeSchema.parse('holidays')).toThrow()
        expect(() => scheduleTypeSchema.parse('summer')).toThrow()
        expect(() => scheduleTypeSchema.parse('')).toThrow()
      })
    })

    describe('dayOfWeekSchema', () => {
      it('accepts all days of the week', () => {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        days.forEach((day) => {
          expect(() => dayOfWeekSchema.parse(day)).not.toThrow()
        })
      })

      it('rejects invalid day names', () => {
        expect(() => dayOfWeekSchema.parse('Sun')).toThrow()
        expect(() => dayOfWeekSchema.parse('MONDAY')).toThrow()
        expect(() => dayOfWeekSchema.parse('')).toThrow()
      })
    })

    describe('schedule with weekday/weekend differentiation', () => {
      it('allows different weekday and weekend limits', () => {
        const schedule = {
          scheduleType: 'weekdays' as const,
          weekdayMinutes: 60, // 1 hour on weekdays
          weekendMinutes: 180, // 3 hours on weekends
        }
        const result = timeLimitScheduleSchema.parse(schedule)
        expect(result.weekdayMinutes).toBe(60)
        expect(result.weekendMinutes).toBe(180)
      })

      it('allows only weekday minutes (stricter weekday policy)', () => {
        const schedule = {
          scheduleType: 'weekdays' as const,
          weekdayMinutes: 30,
        }
        expect(() => timeLimitScheduleSchema.parse(schedule)).not.toThrow()
      })

      it('allows only weekend minutes (unlimited weekdays)', () => {
        const schedule = {
          scheduleType: 'weekends' as const,
          weekendMinutes: 120,
        }
        expect(() => timeLimitScheduleSchema.parse(schedule)).not.toThrow()
      })

      it('supports custom per-day limits', () => {
        const customSchedule = {
          scheduleType: 'custom' as const,
          customDays: {
            monday: 60,
            tuesday: 60,
            wednesday: 90,
            thursday: 60,
            friday: 120,
            saturday: 180,
            sunday: 180,
          },
        }
        const result = timeLimitScheduleSchema.parse(customSchedule)
        expect(result.customDays?.monday).toBe(60)
        expect(result.customDays?.saturday).toBe(180)
      })

      it('validates custom day minutes bounds', () => {
        const invalidCustom = {
          scheduleType: 'custom' as const,
          customDays: {
            monday: 2000, // Exceeds 1440
          },
        }
        expect(() => timeLimitScheduleSchema.parse(invalidCustom)).toThrow()
      })
    })
  })

  describe('AC4: Zod schema creation (timeLimitSchema in @fledgely/shared/contracts)', () => {
    it('exports timeLimitTypeSchema', () => {
      expect(timeLimitTypeSchema).toBeDefined()
      expect(typeof timeLimitTypeSchema.parse).toBe('function')
    })

    it('exports dayOfWeekSchema', () => {
      expect(dayOfWeekSchema).toBeDefined()
      expect(typeof dayOfWeekSchema.parse).toBe('function')
    })

    it('exports scheduleTypeSchema', () => {
      expect(scheduleTypeSchema).toBeDefined()
      expect(typeof scheduleTypeSchema.parse).toBe('function')
    })

    it('exports timeLimitScheduleSchema', () => {
      expect(timeLimitScheduleSchema).toBeDefined()
      expect(typeof timeLimitScheduleSchema.parse).toBe('function')
    })

    it('exports categoryLimitSchema', () => {
      expect(categoryLimitSchema).toBeDefined()
      expect(typeof categoryLimitSchema.parse).toBe('function')
    })

    it('exports deviceLimitSchema', () => {
      expect(deviceLimitSchema).toBeDefined()
      expect(typeof deviceLimitSchema.parse).toBe('function')
    })

    it('exports timeLimitSchema', () => {
      expect(timeLimitSchema).toBeDefined()
      expect(typeof timeLimitSchema.parse).toBe('function')
    })

    it('exports childTimeLimitsSchema', () => {
      expect(childTimeLimitsSchema).toBeDefined()
      expect(typeof childTimeLimitsSchema.parse).toBe('function')
    })
  })

  describe('AC5: Agreement linkage (limits linked to family agreement)', () => {
    it('accepts optional agreementId field', () => {
      const withAgreement = {
        ...validChildTimeLimits,
        agreementId: 'agreement-789',
      }
      const result = childTimeLimitsSchema.parse(withAgreement)
      expect(result.agreementId).toBe('agreement-789')
    })

    it('allows limits without agreement (draft limits)', () => {
      const withoutAgreement = {
        ...validChildTimeLimits,
        agreementId: undefined,
      }
      expect(() => childTimeLimitsSchema.parse(withoutAgreement)).not.toThrow()
    })

    it('validates agreementId is a string when provided', () => {
      const invalidAgreement = {
        ...validChildTimeLimits,
        agreementId: 123,
      }
      expect(() => childTimeLimitsSchema.parse(invalidAgreement)).toThrow()
    })
  })

  describe('AC6: Effective dates (support future-dated changes)', () => {
    describe('timeLimitSchema effective dates', () => {
      it('accepts effectiveFrom for future-dated limits', () => {
        const futureLimit = {
          ...validTimeLimit,
          effectiveFrom: now + 86400000, // Tomorrow
        }
        const result = timeLimitSchema.parse(futureLimit)
        expect(result.effectiveFrom).toBe(now + 86400000)
      })

      it('accepts effectiveUntil for temporary limits', () => {
        const temporaryLimit = {
          ...validTimeLimit,
          effectiveUntil: now + 604800000, // One week from now
        }
        const result = timeLimitSchema.parse(temporaryLimit)
        expect(result.effectiveUntil).toBe(now + 604800000)
      })

      it('accepts both effectiveFrom and effectiveUntil', () => {
        const boundedLimit = {
          ...validTimeLimit,
          effectiveFrom: now + 86400000, // Tomorrow
          effectiveUntil: now + 604800000, // One week from now
        }
        const result = timeLimitSchema.parse(boundedLimit)
        expect(result.effectiveFrom).toBe(now + 86400000)
        expect(result.effectiveUntil).toBe(now + 604800000)
      })

      it('allows immediate limits (no effectiveFrom)', () => {
        expect(() => timeLimitSchema.parse(validTimeLimit)).not.toThrow()
        const result = timeLimitSchema.parse(validTimeLimit)
        expect(result.effectiveFrom).toBeUndefined()
      })

      it('allows permanent limits (no effectiveUntil)', () => {
        expect(() => timeLimitSchema.parse(validTimeLimit)).not.toThrow()
        const result = timeLimitSchema.parse(validTimeLimit)
        expect(result.effectiveUntil).toBeUndefined()
      })
    })

    describe('childTimeLimitsSchema effective dates', () => {
      it('accepts effectiveFrom for configuration changes', () => {
        const futureConfig = {
          ...validChildTimeLimits,
          effectiveFrom: now + 86400000, // Tomorrow
        }
        const result = childTimeLimitsSchema.parse(futureConfig)
        expect(result.effectiveFrom).toBe(now + 86400000)
      })

      it('allows immediate configuration (no effectiveFrom)', () => {
        const result = childTimeLimitsSchema.parse(validChildTimeLimits)
        expect(result.effectiveFrom).toBeUndefined()
      })
    })

    it('validates effective dates are numbers (epoch milliseconds)', () => {
      const invalidDate = {
        ...validTimeLimit,
        effectiveFrom: '2025-01-01',
      }
      expect(() => timeLimitSchema.parse(invalidDate)).toThrow()
    })

    it('rejects effectiveUntil before effectiveFrom', () => {
      const invalidDates = {
        ...validTimeLimit,
        effectiveFrom: now + 604800000, // One week from now
        effectiveUntil: now + 86400000, // Tomorrow (before effectiveFrom)
      }
      expect(() => timeLimitSchema.parse(invalidDates)).toThrow(
        /effectiveFrom must be before effectiveUntil/
      )
    })
  })

  describe('Limit type field validation', () => {
    it('rejects per_category limit without category', () => {
      const invalidLimit = {
        limitType: 'per_category' as const,
        schedule: validSchedule,
        createdAt: now,
        updatedAt: now,
      }
      expect(() => timeLimitSchema.parse(invalidLimit)).toThrow(
        /per_category limits require category/
      )
    })

    it('rejects per_device limit without deviceId', () => {
      const invalidLimit = {
        limitType: 'per_device' as const,
        schedule: validSchedule,
        createdAt: now,
        updatedAt: now,
      }
      expect(() => timeLimitSchema.parse(invalidLimit)).toThrow(
        /per_device limits require deviceId/
      )
    })

    it('rejects daily_total with category field', () => {
      const invalidLimit = {
        limitType: 'daily_total' as const,
        category: 'gaming' as const,
        schedule: validSchedule,
        createdAt: now,
        updatedAt: now,
      }
      expect(() => timeLimitSchema.parse(invalidLimit)).toThrow(/should not specify category/)
    })

    it('rejects daily_total with deviceId field', () => {
      const invalidLimit = {
        limitType: 'daily_total' as const,
        deviceId: 'device-123',
        schedule: validSchedule,
        createdAt: now,
        updatedAt: now,
      }
      expect(() => timeLimitSchema.parse(invalidLimit)).toThrow(/should not specify category/)
    })
  })

  describe('Schedule type validation', () => {
    it('rejects custom scheduleType without customDays', () => {
      const invalidSchedule = {
        scheduleType: 'custom' as const,
        weekdayMinutes: 120,
      }
      expect(() => timeLimitScheduleSchema.parse(invalidSchedule)).toThrow(/requires customDays/)
    })

    it('rejects custom scheduleType with empty customDays', () => {
      const invalidSchedule = {
        scheduleType: 'custom' as const,
        customDays: {},
      }
      expect(() => timeLimitScheduleSchema.parse(invalidSchedule)).toThrow(/requires customDays/)
    })

    it('accepts custom scheduleType with at least one day defined', () => {
      const validCustomSchedule = {
        scheduleType: 'custom' as const,
        customDays: {
          monday: 60,
        },
      }
      expect(() => timeLimitScheduleSchema.parse(validCustomSchedule)).not.toThrow()
    })

    it('rejects weekdays scheduleType without any minutes or unlimited', () => {
      const invalidSchedule = {
        scheduleType: 'weekdays' as const,
      }
      expect(() => timeLimitScheduleSchema.parse(invalidSchedule)).toThrow(/require weekdayMinutes/)
    })

    it('accepts weekdays scheduleType with unlimited flag', () => {
      const unlimitedSchedule = {
        scheduleType: 'weekdays' as const,
        unlimited: true,
      }
      expect(() => timeLimitScheduleSchema.parse(unlimitedSchedule)).not.toThrow()
    })
  })

  describe('Integration tests - complete configurations', () => {
    it('validates complete child time limits with all limit types', () => {
      const completeConfig = {
        childId: 'child-abc',
        familyId: 'family-xyz',
        agreementId: 'agreement-123',
        dailyTotal: {
          scheduleType: 'weekdays' as const,
          weekdayMinutes: 120,
          weekendMinutes: 240,
        },
        categoryLimits: [
          {
            category: 'gaming' as const,
            schedule: {
              scheduleType: 'weekdays' as const,
              weekdayMinutes: 30,
              weekendMinutes: 60,
            },
          },
          {
            category: 'social_media' as const,
            schedule: {
              scheduleType: 'weekdays' as const,
              weekdayMinutes: 30,
              weekendMinutes: 45,
            },
          },
          {
            category: 'education' as const,
            schedule: {
              scheduleType: 'all_days' as const,
              unlimited: true,
            },
          },
        ],
        deviceLimits: [
          {
            deviceId: 'chromebook-001',
            deviceName: 'School Chromebook',
            deviceType: 'chromebook' as const,
            schedule: {
              scheduleType: 'weekdays' as const,
              weekdayMinutes: 180,
              weekendMinutes: 60,
            },
            categoryOverrides: [
              {
                category: 'gaming' as const,
                schedule: {
                  scheduleType: 'weekdays' as const,
                  weekdayMinutes: 0, // No gaming on school device during weekdays
                  weekendMinutes: 30,
                },
              },
            ],
          },
        ],
        effectiveFrom: now + 86400000,
        updatedAt: now,
        version: 1,
      }

      expect(() => childTimeLimitsSchema.parse(completeConfig)).not.toThrow()
      const result = childTimeLimitsSchema.parse(completeConfig)
      expect(result.categoryLimits).toHaveLength(3)
      expect(result.deviceLimits).toHaveLength(1)
      expect(result.deviceLimits?.[0].categoryOverrides).toHaveLength(1)
    })

    it('validates minimal child time limits (daily total only)', () => {
      const minimalConfig = {
        childId: 'child-123',
        familyId: 'family-456',
        dailyTotal: {
          scheduleType: 'all_days' as const,
          weekdayMinutes: 120,
        },
        updatedAt: now,
      }

      expect(() => childTimeLimitsSchema.parse(minimalConfig)).not.toThrow()
    })

    it('validates summer vs school year configurations', () => {
      const schoolYearLimits = {
        childId: 'child-123',
        familyId: 'family-456',
        dailyTotal: {
          scheduleType: 'school_days' as const,
          weekdayMinutes: 60,
          weekendMinutes: 180,
        },
        effectiveFrom: Date.UTC(2025, 8, 1), // September 1, 2025
        updatedAt: now,
      }

      expect(() => childTimeLimitsSchema.parse(schoolYearLimits)).not.toThrow()
    })

    it('validates zero-limit configuration (no screen time allowed)', () => {
      const noScreenTime = {
        childId: 'child-123',
        familyId: 'family-456',
        dailyTotal: {
          scheduleType: 'all_days' as const,
          weekdayMinutes: 0,
          weekendMinutes: 0,
        },
        updatedAt: now,
      }

      expect(() => childTimeLimitsSchema.parse(noScreenTime)).not.toThrow()
    })
  })

  describe('Edge cases and boundary conditions', () => {
    it('accepts empty category limits array', () => {
      const config = {
        ...validChildTimeLimits,
        categoryLimits: [],
      }
      expect(() => childTimeLimitsSchema.parse(config)).not.toThrow()
    })

    it('accepts empty device limits array', () => {
      const config = {
        ...validChildTimeLimits,
        deviceLimits: [],
      }
      expect(() => childTimeLimitsSchema.parse(config)).not.toThrow()
    })

    it('accepts exactly 0 minutes (no time allowed)', () => {
      const schedule = {
        scheduleType: 'all_days' as const,
        weekdayMinutes: 0,
      }
      expect(() => timeLimitScheduleSchema.parse(schedule)).not.toThrow()
    })

    it('accepts exactly 1440 minutes (24 hours)', () => {
      const schedule = {
        scheduleType: 'all_days' as const,
        weekdayMinutes: 1440,
      }
      expect(() => timeLimitScheduleSchema.parse(schedule)).not.toThrow()
    })

    it('rejects 1441 minutes (exceeds 24 hours)', () => {
      const schedule = {
        scheduleType: 'all_days' as const,
        weekdayMinutes: 1441,
      }
      expect(() => timeLimitScheduleSchema.parse(schedule)).toThrow()
    })

    it('accepts high version number', () => {
      const config = {
        ...validChildTimeLimits,
        version: 999,
      }
      expect(() => childTimeLimitsSchema.parse(config)).not.toThrow()
    })

    it('rejects non-string childId', () => {
      const config = {
        ...validChildTimeLimits,
        childId: 123,
      }
      expect(() => childTimeLimitsSchema.parse(config)).toThrow()
    })

    it('validates isActive defaults to true', () => {
      const limitWithoutActive = {
        limitType: 'daily_total' as const,
        schedule: validSchedule,
        createdAt: now,
        updatedAt: now,
      }
      const result = timeLimitSchema.parse(limitWithoutActive)
      expect(result.isActive).toBe(true)
    })
  })
})
