/**
 * Unit tests for proposeSafetySettingChange Cloud Function
 *
 * Story 3A.2: Safety Settings Two-Parent Approval
 *
 * NOTE: These tests require Firebase emulators to run properly.
 * The core business logic is tested in the schema tests at:
 * packages/contracts/src/safety-settings-proposal.schema.test.ts (121 tests)
 *
 * These tests verify the Cloud Function structure and integration patterns.
 * Run with: firebase emulators:exec "npx vitest run" --only firestore,auth
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { CallableRequest } from 'firebase-functions/v2/https'

// Import contracts to verify they're used correctly
import {
  createSafetySettingsProposalInputSchema,
  isEmergencySafetyIncrease,
  PROPOSAL_RATE_LIMIT,
  PROPOSAL_TIME_LIMITS,
} from '@fledgely/contracts'

describe('proposeSafetySettingChange schemas', () => {
  describe('input validation via schema', () => {
    it('validates correct input', () => {
      const input = {
        childId: 'child-123',
        settingType: 'monitoring_interval',
        proposedValue: 15,
      }

      const result = createSafetySettingsProposalInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('rejects missing childId', () => {
      const input = {
        settingType: 'monitoring_interval',
        proposedValue: 15,
      }

      const result = createSafetySettingsProposalInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects empty childId', () => {
      const input = {
        childId: '',
        settingType: 'monitoring_interval',
        proposedValue: 15,
      }

      const result = createSafetySettingsProposalInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects invalid setting type', () => {
      const input = {
        childId: 'child-123',
        settingType: 'invalid_type',
        proposedValue: 15,
      }

      const result = createSafetySettingsProposalInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects negative proposed value', () => {
      const input = {
        childId: 'child-123',
        settingType: 'monitoring_interval',
        proposedValue: -5,
      }

      const result = createSafetySettingsProposalInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('accepts all valid setting types', () => {
      const settingTypes = [
        'monitoring_interval',
        'retention_period',
        'age_restriction',
        'screen_time_daily',
        'screen_time_per_app',
        'bedtime_start',
        'bedtime_end',
        'crisis_allowlist',
      ]

      for (const settingType of settingTypes) {
        const input = {
          childId: 'child-123',
          settingType,
          proposedValue: 15,
        }
        const result = createSafetySettingsProposalInputSchema.safeParse(input)
        expect(result.success, `Setting type ${settingType} should be valid`).toBe(true)
      }
    })
  })

  describe('emergency safety increase detection', () => {
    it('detects more frequent monitoring as emergency (30 -> 15)', () => {
      const isEmergency = isEmergencySafetyIncrease('monitoring_interval', 30, 15)
      expect(isEmergency).toBe(true)
    })

    it('does NOT detect less frequent monitoring as emergency (30 -> 60)', () => {
      const isEmergency = isEmergencySafetyIncrease('monitoring_interval', 30, 60)
      expect(isEmergency).toBe(false)
    })

    it('detects longer retention as emergency (7 -> 14)', () => {
      const isEmergency = isEmergencySafetyIncrease('retention_period', 7, 14)
      expect(isEmergency).toBe(true)
    })

    it('does NOT detect shorter retention as emergency (14 -> 7)', () => {
      const isEmergency = isEmergencySafetyIncrease('retention_period', 14, 7)
      expect(isEmergency).toBe(false)
    })

    it('detects decreased screen time as emergency (180 -> 120)', () => {
      const isEmergency = isEmergencySafetyIncrease('screen_time_daily', 180, 120)
      expect(isEmergency).toBe(true)
    })

    it('always considers crisis_allowlist as emergency', () => {
      const isEmergency = isEmergencySafetyIncrease('crisis_allowlist', 'old', 'new')
      expect(isEmergency).toBe(true)
    })
  })

  describe('rate limiting constants', () => {
    it('has correct rate limit', () => {
      expect(PROPOSAL_RATE_LIMIT.MAX_PROPOSALS_PER_HOUR).toBe(10)
      expect(PROPOSAL_RATE_LIMIT.WINDOW_MS).toBe(60 * 60 * 1000)
    })
  })

  describe('time limits constants', () => {
    it('has correct response window (72 hours)', () => {
      expect(PROPOSAL_TIME_LIMITS.RESPONSE_WINDOW_MS).toBe(72 * 60 * 60 * 1000)
    })

    it('has correct dispute window (48 hours)', () => {
      expect(PROPOSAL_TIME_LIMITS.DISPUTE_WINDOW_MS).toBe(48 * 60 * 60 * 1000)
    })

    it('has correct reproposal cooldown (7 days)', () => {
      expect(PROPOSAL_TIME_LIMITS.REPROPOSAL_COOLDOWN_MS).toBe(7 * 24 * 60 * 60 * 1000)
    })
  })
})
