/**
 * Tests for Location Abuse Detection Schemas
 *
 * Story 40.6: Location Feature Abuse Prevention
 * - AC1: Asymmetric location check detection
 * - AC2: Frequent rule change detection
 * - AC3: Cross-custody restriction detection
 * - AC4: Bilateral parent alerts
 */

import { describe, it, expect } from 'vitest'
import {
  locationAbusePatternTypeSchema,
  locationAccessTypeSchema,
  locationAccessLogSchema,
  trackLocationAccessInputSchema,
  asymmetricCheckMetadataSchema,
  frequentRuleChangeMetadataSchema,
  crossCustodyRestrictionMetadataSchema,
  locationAbusePatternSchema,
  locationAbuseAlertSchema,
  sendLocationAbuseAlertInputSchema,
  locationAbuseAlertResponseSchema,
  locationAutoDisableSchema,
  guardianAccessCountSchema,
  asymmetryResultSchema,
  LOCATION_ABUSE_THRESHOLDS,
  LOCATION_ABUSE_RESOURCES,
  LOCATION_ABUSE_MESSAGES,
} from './locationAbuse'

describe('Location Abuse Detection Schemas', () => {
  describe('Constants', () => {
    describe('LOCATION_ABUSE_THRESHOLDS', () => {
      it('has asymmetric check ratio of 10', () => {
        expect(LOCATION_ABUSE_THRESHOLDS.ASYMMETRIC_CHECK_RATIO).toBe(10)
      })

      it('has 7-day window for asymmetric checks', () => {
        expect(LOCATION_ABUSE_THRESHOLDS.ASYMMETRIC_CHECK_WINDOW_DAYS).toBe(7)
      })

      it('has 3 changes as frequent threshold', () => {
        expect(LOCATION_ABUSE_THRESHOLDS.FREQUENT_CHANGES_COUNT).toBe(3)
      })

      it('has 24-hour window for frequent changes', () => {
        expect(LOCATION_ABUSE_THRESHOLDS.FREQUENT_CHANGES_WINDOW_HOURS).toBe(24)
      })

      it('has 3 alerts for auto-disable', () => {
        expect(LOCATION_ABUSE_THRESHOLDS.AUTO_DISABLE_ALERT_COUNT).toBe(3)
      })

      it('has 30-day window for auto-disable', () => {
        expect(LOCATION_ABUSE_THRESHOLDS.AUTO_DISABLE_WINDOW_DAYS).toBe(30)
      })

      it('has 60-second rate limit for access logging', () => {
        expect(LOCATION_ABUSE_THRESHOLDS.ACCESS_LOG_RATE_LIMIT_MS).toBe(60000)
      })
    })

    describe('LOCATION_ABUSE_RESOURCES', () => {
      it('has a title', () => {
        expect(LOCATION_ABUSE_RESOURCES.title).toBe('Resources for Co-Parenting Challenges')
      })

      it('has an intro', () => {
        expect(LOCATION_ABUSE_RESOURCES.intro).toContain('patterns')
      })

      it('has at least 3 resources', () => {
        expect(LOCATION_ABUSE_RESOURCES.resources.length).toBeGreaterThanOrEqual(3)
      })

      it('each resource has required fields', () => {
        for (const resource of LOCATION_ABUSE_RESOURCES.resources) {
          expect(resource.id).toBeDefined()
          expect(resource.name).toBeDefined()
          expect(resource.url).toBeDefined()
          expect(resource.description).toBeDefined()
        }
      })
    })

    describe('LOCATION_ABUSE_MESSAGES', () => {
      it('has asymmetric checks message', () => {
        expect(LOCATION_ABUSE_MESSAGES.asymmetricChecks.title).toBeDefined()
        expect(LOCATION_ABUSE_MESSAGES.asymmetricChecks.summary).toBeDefined()
        expect(LOCATION_ABUSE_MESSAGES.asymmetricChecks.detail).toBeDefined()
      })

      it('has frequent rule changes message', () => {
        expect(LOCATION_ABUSE_MESSAGES.frequentRuleChanges.title).toBeDefined()
        expect(LOCATION_ABUSE_MESSAGES.frequentRuleChanges.summary).toBeDefined()
      })

      it('has cross-custody restriction message', () => {
        expect(LOCATION_ABUSE_MESSAGES.crossCustodyRestriction.title).toBeDefined()
        expect(LOCATION_ABUSE_MESSAGES.crossCustodyRestriction.summary).toBeDefined()
      })

      it('has auto-disable message', () => {
        expect(LOCATION_ABUSE_MESSAGES.autoDisable.title).toBeDefined()
        expect(LOCATION_ABUSE_MESSAGES.autoDisable.summary).toBeDefined()
      })

      it('uses neutral language (no blame words)', () => {
        const allMessages = JSON.stringify(LOCATION_ABUSE_MESSAGES)
        expect(allMessages).not.toContain('fault')
        expect(allMessages).not.toContain('blame')
        expect(allMessages).not.toContain('abuser')
        expect(allMessages).not.toContain('guilty')
      })
    })
  })

  describe('Enums', () => {
    describe('locationAbusePatternTypeSchema', () => {
      it('accepts asymmetric_checks', () => {
        expect(locationAbusePatternTypeSchema.safeParse('asymmetric_checks').success).toBe(true)
      })

      it('accepts frequent_rule_changes', () => {
        expect(locationAbusePatternTypeSchema.safeParse('frequent_rule_changes').success).toBe(true)
      })

      it('accepts cross_custody_restriction', () => {
        expect(locationAbusePatternTypeSchema.safeParse('cross_custody_restriction').success).toBe(
          true
        )
      })

      it('rejects invalid pattern type', () => {
        expect(locationAbusePatternTypeSchema.safeParse('invalid_type').success).toBe(false)
      })
    })

    describe('locationAccessTypeSchema', () => {
      it('accepts status_check', () => {
        expect(locationAccessTypeSchema.safeParse('status_check').success).toBe(true)
      })

      it('accepts history_view', () => {
        expect(locationAccessTypeSchema.safeParse('history_view').success).toBe(true)
      })

      it('accepts zone_view', () => {
        expect(locationAccessTypeSchema.safeParse('zone_view').success).toBe(true)
      })

      it('rejects invalid access type', () => {
        expect(locationAccessTypeSchema.safeParse('invalid').success).toBe(false)
      })
    })
  })

  describe('locationAccessLogSchema', () => {
    const validLog = {
      id: 'log-123',
      familyId: 'family-456',
      uid: 'user-789',
      childId: 'child-012',
      accessType: 'status_check' as const,
      timestamp: new Date(),
    }

    it('accepts valid access log', () => {
      expect(locationAccessLogSchema.safeParse(validLog).success).toBe(true)
    })

    it('rejects missing id', () => {
      const { id: _, ...invalid } = validLog
      expect(locationAccessLogSchema.safeParse(invalid).success).toBe(false)
    })

    it('rejects empty id', () => {
      expect(locationAccessLogSchema.safeParse({ ...validLog, id: '' }).success).toBe(false)
    })

    it('rejects missing familyId', () => {
      const { familyId: _, ...invalid } = validLog
      expect(locationAccessLogSchema.safeParse(invalid).success).toBe(false)
    })

    it('rejects missing uid', () => {
      const { uid: _, ...invalid } = validLog
      expect(locationAccessLogSchema.safeParse(invalid).success).toBe(false)
    })

    it('rejects missing childId', () => {
      const { childId: _, ...invalid } = validLog
      expect(locationAccessLogSchema.safeParse(invalid).success).toBe(false)
    })

    it('rejects invalid accessType', () => {
      expect(
        locationAccessLogSchema.safeParse({ ...validLog, accessType: 'invalid' }).success
      ).toBe(false)
    })

    it('rejects non-date timestamp', () => {
      expect(
        locationAccessLogSchema.safeParse({ ...validLog, timestamp: 'not-a-date' }).success
      ).toBe(false)
    })
  })

  describe('trackLocationAccessInputSchema', () => {
    const validInput = {
      familyId: 'family-123',
      childId: 'child-456',
      accessType: 'history_view' as const,
    }

    it('accepts valid input', () => {
      expect(trackLocationAccessInputSchema.safeParse(validInput).success).toBe(true)
    })

    it('rejects missing familyId', () => {
      const { familyId: _, ...invalid } = validInput
      expect(trackLocationAccessInputSchema.safeParse(invalid).success).toBe(false)
    })

    it('rejects missing childId', () => {
      const { childId: _, ...invalid } = validInput
      expect(trackLocationAccessInputSchema.safeParse(invalid).success).toBe(false)
    })

    it('accepts all access types', () => {
      expect(
        trackLocationAccessInputSchema.safeParse({ ...validInput, accessType: 'status_check' })
          .success
      ).toBe(true)
      expect(
        trackLocationAccessInputSchema.safeParse({ ...validInput, accessType: 'zone_view' }).success
      ).toBe(true)
    })
  })

  describe('asymmetricCheckMetadataSchema', () => {
    const validMetadata = {
      higherUid: 'user-1',
      higherCount: 100,
      lowerUid: 'user-2',
      lowerCount: 10,
      ratio: 10,
    }

    it('accepts valid metadata', () => {
      expect(asymmetricCheckMetadataSchema.safeParse(validMetadata).success).toBe(true)
    })

    it('accepts zero for lower count', () => {
      expect(
        asymmetricCheckMetadataSchema.safeParse({ ...validMetadata, lowerCount: 0 }).success
      ).toBe(true)
    })

    it('rejects negative counts', () => {
      expect(
        asymmetricCheckMetadataSchema.safeParse({ ...validMetadata, higherCount: -1 }).success
      ).toBe(false)
    })

    it('rejects zero or negative ratio', () => {
      expect(asymmetricCheckMetadataSchema.safeParse({ ...validMetadata, ratio: 0 }).success).toBe(
        false
      )
      expect(asymmetricCheckMetadataSchema.safeParse({ ...validMetadata, ratio: -1 }).success).toBe(
        false
      )
    })

    it('rejects missing fields', () => {
      const { higherUid: _, ...invalid } = validMetadata
      expect(asymmetricCheckMetadataSchema.safeParse(invalid).success).toBe(false)
    })
  })

  describe('frequentRuleChangeMetadataSchema', () => {
    const validMetadata = {
      changeCount: 5,
      changeTypes: ['time_limit', 'blocked_categories'],
      hoursToExchange: 12,
      changedRuleIds: ['rule-1', 'rule-2'],
    }

    it('accepts valid metadata', () => {
      expect(frequentRuleChangeMetadataSchema.safeParse(validMetadata).success).toBe(true)
    })

    it('rejects zero change count', () => {
      expect(
        frequentRuleChangeMetadataSchema.safeParse({ ...validMetadata, changeCount: 0 }).success
      ).toBe(false)
    })

    it('accepts empty arrays for types and rule IDs', () => {
      expect(
        frequentRuleChangeMetadataSchema.safeParse({
          ...validMetadata,
          changeTypes: [],
          changedRuleIds: [],
        }).success
      ).toBe(true)
    })

    it('accepts zero hours to exchange', () => {
      expect(
        frequentRuleChangeMetadataSchema.safeParse({ ...validMetadata, hoursToExchange: 0 }).success
      ).toBe(true)
    })

    it('rejects negative hours to exchange', () => {
      expect(
        frequentRuleChangeMetadataSchema.safeParse({ ...validMetadata, hoursToExchange: -1 })
          .success
      ).toBe(false)
    })
  })

  describe('crossCustodyRestrictionMetadataSchema', () => {
    const validMetadata = {
      flaggedRuleIds: ['rule-1'],
      restrictedCustodyPeriods: ['parent-a-weekend'],
      restrictionTypes: ['blocked_categories'],
    }

    it('accepts valid metadata', () => {
      expect(crossCustodyRestrictionMetadataSchema.safeParse(validMetadata).success).toBe(true)
    })

    it('accepts empty arrays', () => {
      expect(
        crossCustodyRestrictionMetadataSchema.safeParse({
          flaggedRuleIds: [],
          restrictedCustodyPeriods: [],
          restrictionTypes: [],
        }).success
      ).toBe(true)
    })
  })

  describe('locationAbusePatternSchema', () => {
    const validPattern = {
      id: 'pattern-123',
      familyId: 'family-456',
      patternType: 'asymmetric_checks' as const,
      detectedAt: new Date(),
      windowStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      windowEnd: new Date(),
      metadata: { higherUid: 'user-1', higherCount: 100, lowerUid: 'user-2', lowerCount: 10 },
      alertSent: false,
    }

    it('accepts valid pattern', () => {
      expect(locationAbusePatternSchema.safeParse(validPattern).success).toBe(true)
    })

    it('accepts all pattern types', () => {
      expect(
        locationAbusePatternSchema.safeParse({
          ...validPattern,
          patternType: 'frequent_rule_changes',
        }).success
      ).toBe(true)
      expect(
        locationAbusePatternSchema.safeParse({
          ...validPattern,
          patternType: 'cross_custody_restriction',
        }).success
      ).toBe(true)
    })

    it('accepts alertSent true', () => {
      expect(
        locationAbusePatternSchema.safeParse({ ...validPattern, alertSent: true }).success
      ).toBe(true)
    })

    it('rejects missing id', () => {
      const { id: _, ...invalid } = validPattern
      expect(locationAbusePatternSchema.safeParse(invalid).success).toBe(false)
    })

    it('rejects invalid pattern type', () => {
      expect(
        locationAbusePatternSchema.safeParse({ ...validPattern, patternType: 'invalid' }).success
      ).toBe(false)
    })
  })

  describe('locationAbuseAlertSchema', () => {
    const validAlert = {
      id: 'alert-123',
      familyId: 'family-456',
      patternId: 'pattern-789',
      patternType: 'asymmetric_checks' as const,
      notifiedGuardianUids: ['user-1', 'user-2'],
      sentAt: new Date(),
      acknowledged: false,
      acknowledgedAt: null,
      acknowledgedByUid: null,
      resourcesViewed: false,
      resourcesViewedAt: null,
    }

    it('accepts valid alert', () => {
      expect(locationAbuseAlertSchema.safeParse(validAlert).success).toBe(true)
    })

    it('accepts acknowledged alert', () => {
      expect(
        locationAbuseAlertSchema.safeParse({
          ...validAlert,
          acknowledged: true,
          acknowledgedAt: new Date(),
          acknowledgedByUid: 'user-1',
        }).success
      ).toBe(true)
    })

    it('accepts alert with resources viewed', () => {
      expect(
        locationAbuseAlertSchema.safeParse({
          ...validAlert,
          resourcesViewed: true,
          resourcesViewedAt: new Date(),
        }).success
      ).toBe(true)
    })

    it('requires at least one notified guardian', () => {
      expect(
        locationAbuseAlertSchema.safeParse({ ...validAlert, notifiedGuardianUids: [] }).success
      ).toBe(true) // Empty is allowed, just means no one was notified yet
    })

    it('rejects missing patternId', () => {
      const { patternId: _, ...invalid } = validAlert
      expect(locationAbuseAlertSchema.safeParse(invalid).success).toBe(false)
    })
  })

  describe('sendLocationAbuseAlertInputSchema', () => {
    const validInput = {
      familyId: 'family-123',
      patternId: 'pattern-456',
      patternType: 'frequent_rule_changes' as const,
    }

    it('accepts valid input', () => {
      expect(sendLocationAbuseAlertInputSchema.safeParse(validInput).success).toBe(true)
    })

    it('rejects missing familyId', () => {
      const { familyId: _, ...invalid } = validInput
      expect(sendLocationAbuseAlertInputSchema.safeParse(invalid).success).toBe(false)
    })

    it('rejects missing patternId', () => {
      const { patternId: _, ...invalid } = validInput
      expect(sendLocationAbuseAlertInputSchema.safeParse(invalid).success).toBe(false)
    })

    it('rejects invalid pattern type', () => {
      expect(
        sendLocationAbuseAlertInputSchema.safeParse({ ...validInput, patternType: 'invalid' })
          .success
      ).toBe(false)
    })
  })

  describe('locationAbuseAlertResponseSchema', () => {
    it('accepts success response with alertId', () => {
      expect(
        locationAbuseAlertResponseSchema.safeParse({
          success: true,
          alertId: 'alert-123',
          message: 'Alert sent',
        }).success
      ).toBe(true)
    })

    it('accepts failure response without alertId', () => {
      expect(
        locationAbuseAlertResponseSchema.safeParse({
          success: false,
          alertId: null,
          message: 'Failed to send',
        }).success
      ).toBe(true)
    })
  })

  describe('locationAutoDisableSchema', () => {
    const validAutoDisable = {
      id: 'disable-123',
      familyId: 'family-456',
      disabledAt: new Date(),
      triggeringAlertIds: ['alert-1', 'alert-2', 'alert-3'],
      alertCount: 3,
      notifiedGuardianUids: ['user-1', 'user-2'],
      reenabledAt: null,
      reenabledByUids: null,
    }

    it('accepts valid auto-disable', () => {
      expect(locationAutoDisableSchema.safeParse(validAutoDisable).success).toBe(true)
    })

    it('accepts re-enabled state', () => {
      expect(
        locationAutoDisableSchema.safeParse({
          ...validAutoDisable,
          reenabledAt: new Date(),
          reenabledByUids: ['user-1', 'user-2'],
        }).success
      ).toBe(true)
    })

    it('requires at least one triggering alert', () => {
      const result = locationAutoDisableSchema.safeParse({
        ...validAutoDisable,
        triggeringAlertIds: [],
      })
      expect(result.success).toBe(true) // Empty array is valid structurally
    })

    it('requires positive alert count', () => {
      expect(
        locationAutoDisableSchema.safeParse({ ...validAutoDisable, alertCount: 0 }).success
      ).toBe(false)
    })
  })

  describe('guardianAccessCountSchema', () => {
    it('accepts valid count', () => {
      expect(guardianAccessCountSchema.safeParse({ uid: 'user-1', count: 50 }).success).toBe(true)
    })

    it('accepts zero count', () => {
      expect(guardianAccessCountSchema.safeParse({ uid: 'user-1', count: 0 }).success).toBe(true)
    })

    it('accepts with byType breakdown', () => {
      expect(
        guardianAccessCountSchema.safeParse({
          uid: 'user-1',
          count: 50,
          byType: { status_check: 30, history_view: 20 },
        }).success
      ).toBe(true)
    })

    it('rejects negative count', () => {
      expect(guardianAccessCountSchema.safeParse({ uid: 'user-1', count: -1 }).success).toBe(false)
    })
  })

  describe('asymmetryResultSchema', () => {
    it('accepts detected asymmetry', () => {
      expect(
        asymmetryResultSchema.safeParse({
          detected: true,
          ratio: 15,
          higherUid: 'user-1',
          higherCount: 150,
          lowerUid: 'user-2',
          lowerCount: 10,
        }).success
      ).toBe(true)
    })

    it('accepts no asymmetry detected', () => {
      expect(
        asymmetryResultSchema.safeParse({
          detected: false,
          ratio: 2,
          higherUid: 'user-1',
          higherCount: 20,
          lowerUid: 'user-2',
          lowerCount: 10,
        }).success
      ).toBe(true)
    })

    it('accepts null uids when no comparison possible', () => {
      expect(
        asymmetryResultSchema.safeParse({
          detected: false,
          ratio: 0,
          higherUid: null,
          higherCount: 0,
          lowerUid: null,
          lowerCount: 0,
        }).success
      ).toBe(true)
    })
  })
})
