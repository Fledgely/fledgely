/**
 * Privacy Gaps Schema Tests
 *
 * Story 7.8: Privacy Gaps Injection - Task 1.7
 *
 * Tests the Zod schemas for privacy gap configuration, scheduling, and events.
 */

import { describe, it, expect } from 'vitest'
import {
  privacyGapConfigSchema,
  privacyGapScheduleSchema,
  privacyGapScheduleFirestoreSchema,
  privacyGapEventSchema,
  scheduledGapSchema,
  childPrivacyGapsConfigSchema,
  DEFAULT_PRIVACY_GAP_CONFIG,
  PRIVACY_GAPS_CONSTANTS,
  isPrivacyGapsEnabled,
  validatePrivacyGapConfig,
  safeParsePrivacyGapConfig,
  safeParsePrivacyGapSchedule,
  safeParsePrivacyGapEvent,
  isGapDurationValid,
  isGapCountValid,
  isWithinWakingHours,
  type PrivacyGapConfig,
  type PrivacyGapSchedule,
  type ScheduledGap,
} from './privacyGaps.schema'

describe('privacyGaps.schema', () => {
  describe('privacyGapConfigSchema', () => {
    it('validates valid configuration with all fields', () => {
      const config = {
        enabled: true,
        minGapDurationMs: 5 * 60 * 1000,
        maxGapDurationMs: 15 * 60 * 1000,
        minDailyGaps: 2,
        maxDailyGaps: 4,
        wakingHoursStart: 7,
        wakingHoursEnd: 22,
        minGapSpacingMs: 2 * 60 * 60 * 1000,
      }

      const result = privacyGapConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.enabled).toBe(true)
        expect(result.data.minDailyGaps).toBe(2)
        expect(result.data.maxDailyGaps).toBe(4)
      }
    })

    it('rejects configuration with minDailyGaps > maxDailyGaps', () => {
      const config = {
        enabled: true,
        minGapDurationMs: 5 * 60 * 1000,
        maxGapDurationMs: 15 * 60 * 1000,
        minDailyGaps: 5, // Greater than max
        maxDailyGaps: 2,
        wakingHoursStart: 7,
        wakingHoursEnd: 22,
        minGapSpacingMs: 2 * 60 * 60 * 1000,
      }

      const result = privacyGapConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })

    it('rejects configuration with minGapDurationMs > maxGapDurationMs', () => {
      const config = {
        enabled: true,
        minGapDurationMs: 20 * 60 * 1000, // Greater than max
        maxGapDurationMs: 10 * 60 * 1000,
        minDailyGaps: 2,
        maxDailyGaps: 4,
        wakingHoursStart: 7,
        wakingHoursEnd: 22,
        minGapSpacingMs: 2 * 60 * 60 * 1000,
      }

      const result = privacyGapConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })

    it('rejects waking hours end before start', () => {
      const config = {
        enabled: true,
        minGapDurationMs: 5 * 60 * 1000,
        maxGapDurationMs: 15 * 60 * 1000,
        minDailyGaps: 2,
        maxDailyGaps: 4,
        wakingHoursStart: 22,
        wakingHoursEnd: 7, // End before start
        minGapSpacingMs: 2 * 60 * 60 * 1000,
      }

      const result = privacyGapConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })

    it('rejects invalid hour values', () => {
      const config = {
        enabled: true,
        minGapDurationMs: 5 * 60 * 1000,
        maxGapDurationMs: 15 * 60 * 1000,
        minDailyGaps: 2,
        maxDailyGaps: 4,
        wakingHoursStart: -1, // Invalid hour
        wakingHoursEnd: 25, // Invalid hour
        minGapSpacingMs: 2 * 60 * 60 * 1000,
      }

      const result = privacyGapConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })
  })

  describe('DEFAULT_PRIVACY_GAP_CONFIG', () => {
    it('provides sensible defaults', () => {
      expect(DEFAULT_PRIVACY_GAP_CONFIG.enabled).toBe(true)
      expect(DEFAULT_PRIVACY_GAP_CONFIG.minGapDurationMs).toBe(5 * 60 * 1000) // 5 minutes
      expect(DEFAULT_PRIVACY_GAP_CONFIG.maxGapDurationMs).toBe(15 * 60 * 1000) // 15 minutes
      expect(DEFAULT_PRIVACY_GAP_CONFIG.minDailyGaps).toBe(2)
      expect(DEFAULT_PRIVACY_GAP_CONFIG.maxDailyGaps).toBe(4)
      expect(DEFAULT_PRIVACY_GAP_CONFIG.wakingHoursStart).toBe(7) // 7am
      expect(DEFAULT_PRIVACY_GAP_CONFIG.wakingHoursEnd).toBe(22) // 10pm
      expect(DEFAULT_PRIVACY_GAP_CONFIG.minGapSpacingMs).toBe(2 * 60 * 60 * 1000) // 2 hours
    })

    it('validates against its own schema', () => {
      const result = privacyGapConfigSchema.safeParse(DEFAULT_PRIVACY_GAP_CONFIG)
      expect(result.success).toBe(true)
    })
  })

  describe('scheduledGapSchema', () => {
    it('validates a valid scheduled gap', () => {
      const gap = {
        startTime: '2025-12-16T09:00:00.000Z',
        endTime: '2025-12-16T09:10:00.000Z',
        durationMs: 10 * 60 * 1000,
      }

      const result = scheduledGapSchema.safeParse(gap)
      expect(result.success).toBe(true)
    })

    it('rejects negative duration', () => {
      const gap = {
        startTime: '2025-12-16T09:00:00.000Z',
        endTime: '2025-12-16T09:10:00.000Z',
        durationMs: -1000, // Negative
      }

      const result = scheduledGapSchema.safeParse(gap)
      expect(result.success).toBe(false)
    })

    it('rejects invalid ISO timestamps', () => {
      const gap = {
        startTime: 'not-a-timestamp',
        endTime: '2025-12-16T09:10:00.000Z',
        durationMs: 10 * 60 * 1000,
      }

      const result = scheduledGapSchema.safeParse(gap)
      expect(result.success).toBe(false)
    })
  })

  describe('privacyGapScheduleSchema', () => {
    it('validates a complete schedule', () => {
      const schedule = {
        childId: 'child123',
        date: '2025-12-16',
        gaps: [
          {
            startTime: '2025-12-16T09:00:00.000Z',
            endTime: '2025-12-16T09:10:00.000Z',
            durationMs: 10 * 60 * 1000,
          },
          {
            startTime: '2025-12-16T14:00:00.000Z',
            endTime: '2025-12-16T14:15:00.000Z',
            durationMs: 15 * 60 * 1000,
          },
        ],
        generatedAt: new Date('2025-12-16T00:00:00.000Z'),
        expiresAt: new Date('2025-12-17T00:00:00.000Z'),
      }

      const result = privacyGapScheduleSchema.safeParse(schedule)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.childId).toBe('child123')
        expect(result.data.gaps).toHaveLength(2)
      }
    })

    it('rejects schedule with empty childId', () => {
      const schedule = {
        childId: '', // Empty
        date: '2025-12-16',
        gaps: [],
        generatedAt: new Date(),
        expiresAt: new Date(),
      }

      const result = privacyGapScheduleSchema.safeParse(schedule)
      expect(result.success).toBe(false)
    })

    it('rejects invalid date format', () => {
      const schedule = {
        childId: 'child123',
        date: '12/16/2025', // Wrong format
        gaps: [],
        generatedAt: new Date(),
        expiresAt: new Date(),
      }

      const result = privacyGapScheduleSchema.safeParse(schedule)
      expect(result.success).toBe(false)
    })

    it('enforces max gaps limit', () => {
      const schedule = {
        childId: 'child123',
        date: '2025-12-16',
        gaps: Array(20).fill({
          startTime: '2025-12-16T09:00:00.000Z',
          endTime: '2025-12-16T09:10:00.000Z',
          durationMs: 10 * 60 * 1000,
        }), // Too many gaps
        generatedAt: new Date(),
        expiresAt: new Date(),
      }

      const result = privacyGapScheduleSchema.safeParse(schedule)
      expect(result.success).toBe(false)
    })
  })

  describe('privacyGapEventSchema', () => {
    it('validates a gap event (no PII)', () => {
      const event = {
        childId: 'child123',
        timestamp: new Date('2025-12-16T09:00:00.000Z'),
        durationMs: 10 * 60 * 1000,
        gapType: 'scheduled' as const,
      }

      const result = privacyGapEventSchema.safeParse(event)
      expect(result.success).toBe(true)
    })

    it('accepts crisis gap type', () => {
      const event = {
        childId: 'child123',
        timestamp: new Date('2025-12-16T09:00:00.000Z'),
        durationMs: 10 * 60 * 1000,
        gapType: 'crisis' as const,
      }

      const result = privacyGapEventSchema.safeParse(event)
      expect(result.success).toBe(true)
    })

    it('rejects invalid gap type', () => {
      const event = {
        childId: 'child123',
        timestamp: new Date(),
        durationMs: 10 * 60 * 1000,
        gapType: 'unknown',
      }

      const result = privacyGapEventSchema.safeParse(event)
      expect(result.success).toBe(false)
    })
  })

  describe('childPrivacyGapsConfigSchema', () => {
    it('validates config with enabled flag', () => {
      const config = {
        enabled: true,
      }

      const result = childPrivacyGapsConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
    })

    it('validates config with custom config override', () => {
      const config = {
        enabled: true,
        customConfig: {
          enabled: true,
          minGapDurationMs: 5 * 60 * 1000,
          maxGapDurationMs: 10 * 60 * 1000,
          minDailyGaps: 3,
          maxDailyGaps: 5,
          wakingHoursStart: 8,
          wakingHoursEnd: 21,
          minGapSpacingMs: 1.5 * 60 * 60 * 1000,
        },
      }

      const result = childPrivacyGapsConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
    })
  })

  describe('PRIVACY_GAPS_CONSTANTS', () => {
    it('provides expected constants', () => {
      expect(PRIVACY_GAPS_CONSTANTS.MIN_GAP_DURATION_MS).toBe(5 * 60 * 1000)
      expect(PRIVACY_GAPS_CONSTANTS.MAX_GAP_DURATION_MS).toBe(15 * 60 * 1000)
      expect(PRIVACY_GAPS_CONSTANTS.MIN_DAILY_GAPS).toBe(2)
      expect(PRIVACY_GAPS_CONSTANTS.MAX_DAILY_GAPS).toBe(4)
      expect(PRIVACY_GAPS_CONSTANTS.SCHEDULE_COLLECTION).toBe('privacy-gap-schedules')
      expect(PRIVACY_GAPS_CONSTANTS.SCHEDULE_TTL_HOURS).toBe(24)
    })
  })

  describe('helper functions', () => {
    describe('isPrivacyGapsEnabled', () => {
      it('returns true when config is enabled', () => {
        const config = { enabled: true }
        expect(isPrivacyGapsEnabled(config)).toBe(true)
      })

      it('returns false when config is disabled', () => {
        const config = { enabled: false }
        expect(isPrivacyGapsEnabled(config)).toBe(false)
      })

      it('returns true for undefined config (default enabled)', () => {
        expect(isPrivacyGapsEnabled(undefined)).toBe(true)
      })

      it('returns true for null config (default enabled)', () => {
        expect(isPrivacyGapsEnabled(null)).toBe(true)
      })
    })

    describe('validatePrivacyGapConfig', () => {
      it('returns valid config', () => {
        const config = {
          enabled: true,
          minGapDurationMs: 5 * 60 * 1000,
          maxGapDurationMs: 15 * 60 * 1000,
          minDailyGaps: 2,
          maxDailyGaps: 4,
          wakingHoursStart: 7,
          wakingHoursEnd: 22,
          minGapSpacingMs: 2 * 60 * 60 * 1000,
        }

        expect(() => validatePrivacyGapConfig(config)).not.toThrow()
      })

      it('throws on invalid config', () => {
        const config = {
          enabled: 'yes', // Wrong type
        }

        expect(() => validatePrivacyGapConfig(config)).toThrow()
      })
    })

    describe('safeParsePrivacyGapConfig', () => {
      it('returns config on valid input', () => {
        const config = DEFAULT_PRIVACY_GAP_CONFIG
        const result = safeParsePrivacyGapConfig(config)
        expect(result).not.toBeNull()
        expect(result?.enabled).toBe(true)
      })

      it('returns null on invalid input', () => {
        const result = safeParsePrivacyGapConfig({ enabled: 'invalid' })
        expect(result).toBeNull()
      })
    })

    describe('safeParsePrivacyGapSchedule', () => {
      it('returns schedule on valid input', () => {
        const schedule = {
          childId: 'child123',
          date: '2025-12-16',
          gaps: [],
          generatedAt: new Date(),
          expiresAt: new Date(),
        }
        const result = safeParsePrivacyGapSchedule(schedule)
        expect(result).not.toBeNull()
        expect(result?.childId).toBe('child123')
      })

      it('returns null on invalid input', () => {
        const result = safeParsePrivacyGapSchedule({ childId: '' })
        expect(result).toBeNull()
      })
    })

    describe('safeParsePrivacyGapEvent', () => {
      it('returns event on valid input', () => {
        const event = {
          childId: 'child123',
          timestamp: new Date(),
          durationMs: 600000,
          gapType: 'scheduled' as const,
        }
        const result = safeParsePrivacyGapEvent(event)
        expect(result).not.toBeNull()
      })

      it('returns null on invalid input', () => {
        const result = safeParsePrivacyGapEvent({})
        expect(result).toBeNull()
      })
    })

    describe('isGapDurationValid', () => {
      it('returns true for valid duration in range', () => {
        expect(isGapDurationValid(10 * 60 * 1000, DEFAULT_PRIVACY_GAP_CONFIG)).toBe(true)
      })

      it('returns false for duration below minimum', () => {
        expect(isGapDurationValid(1 * 60 * 1000, DEFAULT_PRIVACY_GAP_CONFIG)).toBe(false)
      })

      it('returns false for duration above maximum', () => {
        expect(isGapDurationValid(20 * 60 * 1000, DEFAULT_PRIVACY_GAP_CONFIG)).toBe(false)
      })
    })

    describe('isGapCountValid', () => {
      it('returns true for valid gap count in range', () => {
        expect(isGapCountValid(3, DEFAULT_PRIVACY_GAP_CONFIG)).toBe(true)
      })

      it('returns false for gap count below minimum', () => {
        expect(isGapCountValid(1, DEFAULT_PRIVACY_GAP_CONFIG)).toBe(false)
      })

      it('returns false for gap count above maximum', () => {
        expect(isGapCountValid(10, DEFAULT_PRIVACY_GAP_CONFIG)).toBe(false)
      })
    })

    describe('isWithinWakingHours', () => {
      it('returns true for hour within waking hours', () => {
        expect(isWithinWakingHours(12, DEFAULT_PRIVACY_GAP_CONFIG)).toBe(true)
      })

      it('returns false for hour before waking hours start', () => {
        expect(isWithinWakingHours(6, DEFAULT_PRIVACY_GAP_CONFIG)).toBe(false)
      })

      it('returns false for hour at or after waking hours end', () => {
        expect(isWithinWakingHours(22, DEFAULT_PRIVACY_GAP_CONFIG)).toBe(false)
      })

      it('returns true for boundary start hour', () => {
        expect(isWithinWakingHours(7, DEFAULT_PRIVACY_GAP_CONFIG)).toBe(true)
      })
    })
  })

  describe('Firestore schema conversion', () => {
    it('validates schedule with Firestore timestamps', () => {
      const firestoreSchedule = {
        childId: 'child123',
        date: '2025-12-16',
        gaps: [
          {
            startTime: '2025-12-16T09:00:00.000Z',
            endTime: '2025-12-16T09:10:00.000Z',
            durationMs: 10 * 60 * 1000,
          },
        ],
        generatedAt: { toDate: () => new Date('2025-12-16T00:00:00.000Z') },
        expiresAt: { toDate: () => new Date('2025-12-17T00:00:00.000Z') },
      }

      const result = privacyGapScheduleFirestoreSchema.safeParse(firestoreSchedule)
      expect(result.success).toBe(true)
    })
  })
})
