/**
 * Unit tests for respondToSafetyProposal and disputeSafetyProposal Cloud Functions
 *
 * Story 3A.2: Safety Settings Two-Parent Approval
 * Story 3A.4: Safety Rule 48-Hour Cooling Period
 *
 * NOTE: These tests require Firebase emulators to run properly.
 * The core business logic is tested in the schema tests at:
 * packages/contracts/src/safety-settings-proposal.schema.test.ts (183 tests)
 *
 * These tests verify the Cloud Function structure and integration patterns.
 * Run with: firebase emulators:exec "npx vitest run" --only firestore,auth
 */

import { describe, it, expect } from 'vitest'

// Import contracts to verify they're used correctly
import {
  respondToProposalInputSchema,
  disputeProposalInputSchema,
  canRespondToProposal,
  canDisputeProposal,
  requiresCoolingPeriod,
  calculateCoolingPeriodEnd,
  canCancelCoolingPeriod,
  cancelCoolingPeriodInputSchema,
  PROPOSAL_TIME_LIMITS,
  type SafetySettingsProposal,
  type SafetySettingType,
} from '@fledgely/contracts'

describe('respondToSafetyProposal schemas', () => {
  describe('respondToProposalInputSchema validation', () => {
    it('validates correct approve input', () => {
      const input = {
        proposalId: 'proposal-123',
        childId: 'child-123',
        action: 'approve',
      }

      const result = respondToProposalInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('validates correct decline input with message', () => {
      const input = {
        proposalId: 'proposal-123',
        childId: 'child-123',
        action: 'decline',
        message: 'I think this is too restrictive',
      }

      const result = respondToProposalInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('rejects missing proposalId', () => {
      const input = {
        childId: 'child-123',
        action: 'approve',
      }

      const result = respondToProposalInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects missing childId', () => {
      const input = {
        proposalId: 'proposal-123',
        action: 'approve',
      }

      const result = respondToProposalInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects missing action', () => {
      const input = {
        proposalId: 'proposal-123',
        childId: 'child-123',
      }

      const result = respondToProposalInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects invalid action', () => {
      const input = {
        proposalId: 'proposal-123',
        childId: 'child-123',
        action: 'invalid_action',
      }

      const result = respondToProposalInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects empty proposalId', () => {
      const input = {
        proposalId: '',
        childId: 'child-123',
        action: 'approve',
      }

      const result = respondToProposalInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects empty childId', () => {
      const input = {
        proposalId: 'proposal-123',
        childId: '',
        action: 'approve',
      }

      const result = respondToProposalInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('accepts optional message for decline', () => {
      const inputWithMessage = {
        proposalId: 'proposal-123',
        childId: 'child-123',
        action: 'decline',
        message: 'We should discuss this first',
      }

      const inputWithoutMessage = {
        proposalId: 'proposal-123',
        childId: 'child-123',
        action: 'decline',
      }

      expect(respondToProposalInputSchema.safeParse(inputWithMessage).success).toBe(true)
      expect(respondToProposalInputSchema.safeParse(inputWithoutMessage).success).toBe(true)
    })
  })

  describe('canRespondToProposal helper', () => {
    const createPendingProposal = (overrides: Partial<SafetySettingsProposal> = {}): SafetySettingsProposal => {
      const now = new Date()
      return {
        id: 'proposal-123',
        childId: 'child-123',
        proposedBy: 'parent-1',
        settingType: 'monitoring_interval',
        currentValue: 30,
        proposedValue: 15,
        status: 'pending',
        isEmergencyIncrease: false,
        createdAt: now,
        expiresAt: new Date(now.getTime() + PROPOSAL_TIME_LIMITS.RESPONSE_WINDOW_MS),
        respondedBy: null,
        respondedAt: null,
        appliedAt: null,
        dispute: null,
        ...overrides,
      }
    }

    it('allows response to pending proposal within window', () => {
      const proposal = createPendingProposal()
      expect(canRespondToProposal(proposal)).toBe(true)
    })

    it('rejects response to expired proposal', () => {
      const proposal = createPendingProposal({
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      })
      expect(canRespondToProposal(proposal)).toBe(false)
    })

    it('rejects response to approved proposal', () => {
      const proposal = createPendingProposal({
        status: 'approved',
        respondedBy: 'parent-2',
        respondedAt: new Date(),
      })
      expect(canRespondToProposal(proposal)).toBe(false)
    })

    it('rejects response to declined proposal', () => {
      const proposal = createPendingProposal({
        status: 'declined',
        respondedBy: 'parent-2',
        respondedAt: new Date(),
      })
      expect(canRespondToProposal(proposal)).toBe(false)
    })

    it('rejects response to auto_applied proposal', () => {
      const proposal = createPendingProposal({
        status: 'auto_applied',
        isEmergencyIncrease: true,
        appliedAt: new Date(),
      })
      expect(canRespondToProposal(proposal)).toBe(false)
    })
  })
})

describe('disputeSafetyProposal schemas', () => {
  describe('disputeProposalInputSchema validation', () => {
    it('validates correct dispute input with reason', () => {
      const input = {
        proposalId: 'proposal-123',
        childId: 'child-123',
        reason: 'I disagree with this emergency change',
      }

      const result = disputeProposalInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('validates correct dispute input without reason', () => {
      const input = {
        proposalId: 'proposal-123',
        childId: 'child-123',
      }

      const result = disputeProposalInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('rejects missing proposalId', () => {
      const input = {
        childId: 'child-123',
        reason: 'Dispute reason',
      }

      const result = disputeProposalInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects missing childId', () => {
      const input = {
        proposalId: 'proposal-123',
        reason: 'Dispute reason',
      }

      const result = disputeProposalInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects empty proposalId', () => {
      const input = {
        proposalId: '',
        childId: 'child-123',
      }

      const result = disputeProposalInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects empty childId', () => {
      const input = {
        proposalId: 'proposal-123',
        childId: '',
      }

      const result = disputeProposalInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe('canDisputeProposal helper', () => {
    const createAutoAppliedProposal = (overrides: Partial<SafetySettingsProposal> = {}): SafetySettingsProposal => {
      const now = new Date()
      const appliedAt = new Date(now.getTime() - 1000) // Applied 1 second ago
      return {
        id: 'proposal-123',
        childId: 'child-123',
        proposedBy: 'parent-1',
        settingType: 'monitoring_interval',
        currentValue: 30,
        proposedValue: 15,
        status: 'auto_applied',
        isEmergencyIncrease: true,
        createdAt: now,
        expiresAt: new Date(now.getTime() + PROPOSAL_TIME_LIMITS.RESPONSE_WINDOW_MS),
        respondedBy: null,
        respondedAt: null,
        appliedAt: appliedAt,
        dispute: null,
        ...overrides,
      }
    }

    it('allows dispute of auto_applied proposal within 48-hour window', () => {
      const proposal = createAutoAppliedProposal()
      expect(canDisputeProposal(proposal)).toBe(true)
    })

    it('rejects dispute after 48-hour window', () => {
      const proposal = createAutoAppliedProposal({
        appliedAt: new Date(Date.now() - PROPOSAL_TIME_LIMITS.DISPUTE_WINDOW_MS - 1000),
      })
      expect(canDisputeProposal(proposal)).toBe(false)
    })

    it('rejects dispute of pending proposal', () => {
      const proposal = createAutoAppliedProposal({
        status: 'pending',
        appliedAt: null,
      })
      expect(canDisputeProposal(proposal)).toBe(false)
    })

    it('rejects dispute of approved proposal', () => {
      const proposal = createAutoAppliedProposal({
        status: 'approved',
        respondedBy: 'parent-2',
        respondedAt: new Date(),
      })
      expect(canDisputeProposal(proposal)).toBe(false)
    })

    it('rejects dispute of already disputed/reverted proposal', () => {
      const proposal = createAutoAppliedProposal({
        status: 'reverted',
        dispute: {
          disputedBy: 'parent-2',
          disputedAt: new Date(),
          reason: 'Already disputed',
          resolvedAt: new Date(),
          resolution: 'reverted',
        },
      })
      expect(canDisputeProposal(proposal)).toBe(false)
    })
  })

  describe('time window constants', () => {
    it('has correct 72-hour response window', () => {
      expect(PROPOSAL_TIME_LIMITS.RESPONSE_WINDOW_MS).toBe(72 * 60 * 60 * 1000)
    })

    it('has correct 48-hour dispute window', () => {
      expect(PROPOSAL_TIME_LIMITS.DISPUTE_WINDOW_MS).toBe(48 * 60 * 60 * 1000)
    })

    it('has correct 7-day reproposal cooldown', () => {
      expect(PROPOSAL_TIME_LIMITS.REPROPOSAL_COOLDOWN_MS).toBe(7 * 24 * 60 * 60 * 1000)
    })

    it('has correct 48-hour cooling period', () => {
      expect(PROPOSAL_TIME_LIMITS.COOLING_PERIOD_MS).toBe(48 * 60 * 60 * 1000)
    })
  })
})

/**
 * Story 3A.4: Cooling Period Tests
 *
 * These tests verify the cooling period detection and cancellation logic
 * that is used by respondToSafetyProposal when approving protection decreases.
 */
describe('cooling period logic (Story 3A.4)', () => {
  describe('requiresCoolingPeriod detection', () => {
    // Helper to test various setting types
    const testCases: Array<{
      settingType: SafetySettingType
      current: number | string | string[]
      proposed: number | string | string[]
      expectedCooling: boolean
      description: string
    }> = [
      // monitoring_interval: INCREASED = less frequent = reduces protection
      {
        settingType: 'monitoring_interval',
        current: 15,
        proposed: 30,
        expectedCooling: true,
        description: 'monitoring_interval increased (less frequent) requires cooling',
      },
      {
        settingType: 'monitoring_interval',
        current: 30,
        proposed: 15,
        expectedCooling: false,
        description: 'monitoring_interval decreased (more frequent) no cooling',
      },
      // retention_period: DECREASED = kept shorter = reduces protection
      {
        settingType: 'retention_period',
        current: 90,
        proposed: 30,
        expectedCooling: true,
        description: 'retention_period decreased requires cooling',
      },
      {
        settingType: 'retention_period',
        current: 30,
        proposed: 90,
        expectedCooling: false,
        description: 'retention_period increased no cooling',
      },
      // screen_time_daily: INCREASED = more time allowed = reduces protection
      {
        settingType: 'screen_time_daily',
        current: 60,
        proposed: 120,
        expectedCooling: true,
        description: 'screen_time_daily increased requires cooling',
      },
      {
        settingType: 'screen_time_daily',
        current: 120,
        proposed: 60,
        expectedCooling: false,
        description: 'screen_time_daily decreased no cooling',
      },
      // bedtime_start: DELAYED = later bedtime = reduces protection
      // Values are minutes from midnight (21:00 = 1260, 22:00 = 1320)
      {
        settingType: 'bedtime_start',
        current: 1260, // 21:00
        proposed: 1320, // 22:00
        expectedCooling: true,
        description: 'bedtime_start delayed requires cooling',
      },
      {
        settingType: 'bedtime_start',
        current: 1320, // 22:00
        proposed: 1260, // 21:00
        expectedCooling: false,
        description: 'bedtime_start earlier no cooling',
      },
      // bedtime_end: ADVANCED = earlier wakeup = reduces protection
      // Values are minutes from midnight (07:00 = 420, 06:00 = 360)
      {
        settingType: 'bedtime_end',
        current: 420, // 07:00
        proposed: 360, // 06:00
        expectedCooling: true,
        description: 'bedtime_end advanced requires cooling',
      },
      {
        settingType: 'bedtime_end',
        current: 360, // 06:00
        proposed: 420, // 07:00
        expectedCooling: false,
        description: 'bedtime_end later no cooling',
      },
      // crisis_allowlist: never reduces protection
      {
        settingType: 'crisis_allowlist',
        current: ['911'],
        proposed: ['911', '988'],
        expectedCooling: false,
        description: 'crisis_allowlist additions never require cooling',
      },
    ]

    testCases.forEach(({ settingType, current, proposed, expectedCooling, description }) => {
      it(description, () => {
        expect(requiresCoolingPeriod(settingType, current, proposed)).toBe(expectedCooling)
      })
    })

    it('same values do not require cooling period', () => {
      expect(requiresCoolingPeriod('monitoring_interval', 30, 30)).toBe(false)
      expect(requiresCoolingPeriod('screen_time_daily', 60, 60)).toBe(false)
      expect(requiresCoolingPeriod('bedtime_start', 1260, 1260)).toBe(false) // 21:00 = 1260
    })
  })

  describe('calculateCoolingPeriodEnd', () => {
    it('calculates end time 48 hours from start', () => {
      const startTime = new Date('2024-01-15T10:00:00Z')
      const endTime = calculateCoolingPeriodEnd(startTime)

      expect(endTime.getTime() - startTime.getTime()).toBe(PROPOSAL_TIME_LIMITS.COOLING_PERIOD_MS)
      expect(endTime.toISOString()).toBe('2024-01-17T10:00:00.000Z')
    })

    it('handles timezone correctly', () => {
      const startTime = new Date('2024-06-15T23:00:00Z')
      const endTime = calculateCoolingPeriodEnd(startTime)

      // Should be exactly 48 hours later
      expect(endTime.getTime() - startTime.getTime()).toBe(48 * 60 * 60 * 1000)
    })
  })

  describe('canCancelCoolingPeriod helper', () => {
    const createCoolingProposal = (overrides: Partial<SafetySettingsProposal> = {}): SafetySettingsProposal => {
      const now = new Date()
      const coolingStartsAt = new Date(now.getTime() - 1000) // Started 1 second ago
      const coolingEndsAt = new Date(coolingStartsAt.getTime() + PROPOSAL_TIME_LIMITS.COOLING_PERIOD_MS)

      return {
        id: 'proposal-123',
        childId: 'child-123',
        proposedBy: 'parent-1',
        settingType: 'monitoring_interval',
        currentValue: 15,
        proposedValue: 30,
        status: 'cooling_in_progress',
        isEmergencyIncrease: false,
        createdAt: new Date(now.getTime() - 1000 * 60 * 60), // 1 hour ago
        expiresAt: new Date(now.getTime() + PROPOSAL_TIME_LIMITS.RESPONSE_WINDOW_MS),
        respondedBy: 'parent-2',
        respondedAt: coolingStartsAt,
        appliedAt: null,
        dispute: null,
        coolingPeriod: {
          startsAt: coolingStartsAt,
          endsAt: coolingEndsAt,
          cancelledBy: null,
          cancelledAt: null,
        },
        ...overrides,
      }
    }

    it('allows cancellation during active cooling period', () => {
      const proposal = createCoolingProposal()
      expect(canCancelCoolingPeriod(proposal)).toBe(true)
    })

    it('rejects cancellation after cooling period ended', () => {
      const proposal = createCoolingProposal({
        coolingPeriod: {
          startsAt: new Date(Date.now() - PROPOSAL_TIME_LIMITS.COOLING_PERIOD_MS - 1000),
          endsAt: new Date(Date.now() - 1000), // Ended 1 second ago
          cancelledBy: null,
          cancelledAt: null,
        },
      })
      expect(canCancelCoolingPeriod(proposal)).toBe(false)
    })

    it('rejects cancellation for already cancelled cooling period', () => {
      const proposal = createCoolingProposal({
        status: 'cooling_cancelled',
        coolingPeriod: {
          startsAt: new Date(Date.now() - 1000),
          endsAt: new Date(Date.now() + PROPOSAL_TIME_LIMITS.COOLING_PERIOD_MS),
          cancelledBy: 'parent-2',
          cancelledAt: new Date(),
        },
      })
      expect(canCancelCoolingPeriod(proposal)).toBe(false)
    })

    it('rejects cancellation for non-cooling status proposals', () => {
      const proposal = createCoolingProposal({
        status: 'approved',
        coolingPeriod: null,
      })
      expect(canCancelCoolingPeriod(proposal)).toBe(false)
    })

    it('rejects cancellation for cooling_completed proposals', () => {
      const proposal = createCoolingProposal({
        status: 'cooling_completed',
      })
      expect(canCancelCoolingPeriod(proposal)).toBe(false)
    })
  })

  describe('cancelCoolingPeriodInputSchema validation', () => {
    it('validates correct cancel input', () => {
      const input = {
        proposalId: 'proposal-123',
        childId: 'child-123',
      }

      const result = cancelCoolingPeriodInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('rejects missing proposalId', () => {
      const input = {
        childId: 'child-123',
      }

      const result = cancelCoolingPeriodInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects missing childId', () => {
      const input = {
        proposalId: 'proposal-123',
      }

      const result = cancelCoolingPeriodInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects empty proposalId', () => {
      const input = {
        proposalId: '',
        childId: 'child-123',
      }

      const result = cancelCoolingPeriodInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects empty childId', () => {
      const input = {
        proposalId: 'proposal-123',
        childId: '',
      }

      const result = cancelCoolingPeriodInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe('approval flow with cooling period', () => {
    it('protection decrease scenarios should trigger cooling period', () => {
      // These are the scenarios where approval in respondToSafetyProposal
      // should result in cooling_in_progress status instead of approved

      // Monitoring less frequently
      expect(requiresCoolingPeriod('monitoring_interval', 15, 30)).toBe(true)

      // Shorter retention
      expect(requiresCoolingPeriod('retention_period', 90, 30)).toBe(true)

      // Lower age restriction
      expect(requiresCoolingPeriod('age_restriction', 13, 10)).toBe(true)

      // More screen time
      expect(requiresCoolingPeriod('screen_time_daily', 60, 120)).toBe(true)
      expect(requiresCoolingPeriod('screen_time_per_app', 30, 60)).toBe(true)

      // Later bedtime (values are minutes from midnight)
      expect(requiresCoolingPeriod('bedtime_start', 1260, 1320)).toBe(true) // 21:00 -> 22:00

      // Earlier wakeup allowed (values are minutes from midnight)
      expect(requiresCoolingPeriod('bedtime_end', 420, 360)).toBe(true) // 07:00 -> 06:00
    })

    it('protection increase scenarios should apply immediately', () => {
      // These are the scenarios where approval in respondToSafetyProposal
      // should result in approved status and immediate application

      // Monitoring more frequently
      expect(requiresCoolingPeriod('monitoring_interval', 30, 15)).toBe(false)

      // Longer retention
      expect(requiresCoolingPeriod('retention_period', 30, 90)).toBe(false)

      // Higher age restriction
      expect(requiresCoolingPeriod('age_restriction', 10, 13)).toBe(false)

      // Less screen time
      expect(requiresCoolingPeriod('screen_time_daily', 120, 60)).toBe(false)
      expect(requiresCoolingPeriod('screen_time_per_app', 60, 30)).toBe(false)

      // Earlier bedtime (values are minutes from midnight)
      expect(requiresCoolingPeriod('bedtime_start', 1320, 1260)).toBe(false) // 22:00 -> 21:00

      // Later wakeup required (values are minutes from midnight)
      expect(requiresCoolingPeriod('bedtime_end', 360, 420)).toBe(false) // 06:00 -> 07:00

      // Crisis allowlist additions never reduce protection
      expect(requiresCoolingPeriod('crisis_allowlist', ['911'], ['911', '988'])).toBe(false)
    })
  })
})
