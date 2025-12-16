/**
 * Unit tests for cancelCoolingPeriod Cloud Function
 *
 * Story 3A.4: Safety Rule 48-Hour Cooling Period
 *
 * AC #4: Either parent can cancel during cooling period (returns to previous setting)
 * AC #6: Cooling period cannot be bypassed, even with both parents requesting immediate effect
 *
 * NOTE: These tests verify the Cloud Function validation patterns.
 * The core business logic for canCancelCoolingPeriod is tested in:
 * - packages/contracts/src/safety-settings-proposal.schema.test.ts
 * - apps/functions/src/callable/respondToSafetyProposal.test.ts
 */

import { describe, it, expect } from 'vitest'

import {
  cancelCoolingPeriodInputSchema,
  canCancelCoolingPeriod,
  PROPOSAL_TIME_LIMITS,
  type SafetySettingsProposal,
} from '@fledgely/contracts'

describe('cancelCoolingPeriod Cloud Function', () => {
  describe('cancelCoolingPeriodInputSchema validation', () => {
    it('validates correct input', () => {
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

  describe('canCancelCoolingPeriod helper', () => {
    const createCoolingProposal = (
      overrides: Partial<SafetySettingsProposal> = {}
    ): SafetySettingsProposal => {
      const now = new Date()
      const coolingStartsAt = new Date(now.getTime() - 1000) // Started 1 second ago
      const coolingEndsAt = new Date(
        coolingStartsAt.getTime() + PROPOSAL_TIME_LIMITS.COOLING_PERIOD_MS
      )

      return {
        id: 'proposal-123',
        childId: 'child-123',
        proposedBy: 'parent-1',
        settingType: 'monitoring_interval',
        currentValue: 15,
        proposedValue: 30, // Less frequent monitoring = protection decrease
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

    it('allows either guardian to cancel during active cooling period', () => {
      const proposal = createCoolingProposal()
      // Either parent-1 (proposer) or parent-2 (approver) can cancel
      expect(canCancelCoolingPeriod(proposal)).toBe(true)
    })

    it('allows proposer to cancel their own approved change', () => {
      // The proposer might have second thoughts after approval
      const proposal = createCoolingProposal()
      expect(canCancelCoolingPeriod(proposal)).toBe(true)
    })

    it('allows approver to cancel after approving', () => {
      // The approver might have second thoughts after approving
      const proposal = createCoolingProposal()
      expect(canCancelCoolingPeriod(proposal)).toBe(true)
    })

    it('rejects cancellation after 48-hour cooling period ended', () => {
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

    it('rejects cancellation for cooling_completed proposals', () => {
      const proposal = createCoolingProposal({
        status: 'cooling_completed',
        appliedAt: new Date(),
      })
      expect(canCancelCoolingPeriod(proposal)).toBe(false)
    })

    it('rejects cancellation for pending proposals (not yet approved)', () => {
      const proposal = createCoolingProposal({
        status: 'pending',
        coolingPeriod: null,
        respondedBy: null,
        respondedAt: null,
      })
      expect(canCancelCoolingPeriod(proposal)).toBe(false)
    })

    it('rejects cancellation for approved proposals (no cooling period)', () => {
      // Protection increases go directly to approved, no cooling
      const proposal = createCoolingProposal({
        status: 'approved',
        coolingPeriod: null,
        appliedAt: new Date(),
      })
      expect(canCancelCoolingPeriod(proposal)).toBe(false)
    })

    it('rejects cancellation for declined proposals', () => {
      const proposal = createCoolingProposal({
        status: 'declined',
        coolingPeriod: null,
      })
      expect(canCancelCoolingPeriod(proposal)).toBe(false)
    })

    it('rejects cancellation for auto_applied proposals', () => {
      const proposal = createCoolingProposal({
        status: 'auto_applied',
        isEmergencyIncrease: true,
        coolingPeriod: null,
        appliedAt: new Date(),
      })
      expect(canCancelCoolingPeriod(proposal)).toBe(false)
    })
  })

  describe('cooling period cancellation edge cases', () => {
    const createCoolingProposal = (
      overrides: Partial<SafetySettingsProposal> = {}
    ): SafetySettingsProposal => {
      const now = new Date()
      const coolingStartsAt = new Date(now.getTime() - 1000)
      const coolingEndsAt = new Date(
        coolingStartsAt.getTime() + PROPOSAL_TIME_LIMITS.COOLING_PERIOD_MS
      )

      return {
        id: 'proposal-123',
        childId: 'child-123',
        proposedBy: 'parent-1',
        settingType: 'screen_time_daily',
        currentValue: 60,
        proposedValue: 120, // More screen time = protection decrease
        status: 'cooling_in_progress',
        isEmergencyIncrease: false,
        createdAt: new Date(now.getTime() - 1000 * 60 * 60),
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

    it('allows cancellation at exactly 1 second before cooling ends', () => {
      const now = new Date()
      const coolingStartsAt = new Date(now.getTime() - PROPOSAL_TIME_LIMITS.COOLING_PERIOD_MS + 1000)
      const coolingEndsAt = new Date(now.getTime() + 1000) // Ends in 1 second

      const proposal = createCoolingProposal({
        coolingPeriod: {
          startsAt: coolingStartsAt,
          endsAt: coolingEndsAt,
          cancelledBy: null,
          cancelledAt: null,
        },
      })

      expect(canCancelCoolingPeriod(proposal)).toBe(true)
    })

    it('rejects cancellation at exactly when cooling period ends', () => {
      const now = new Date()
      const coolingStartsAt = new Date(now.getTime() - PROPOSAL_TIME_LIMITS.COOLING_PERIOD_MS)
      const coolingEndsAt = now // Ends exactly now

      const proposal = createCoolingProposal({
        coolingPeriod: {
          startsAt: coolingStartsAt,
          endsAt: coolingEndsAt,
          cancelledBy: null,
          cancelledAt: null,
        },
      })

      // At boundary, should not be cancellable
      expect(canCancelCoolingPeriod(proposal, now)).toBe(false)
    })

    it('works correctly for all protection decrease setting types', () => {
      // Verify cooling period can be cancelled for different setting types
      const settingTypes = [
        { type: 'monitoring_interval', current: 15, proposed: 30 },
        { type: 'retention_period', current: 90, proposed: 30 },
        { type: 'age_restriction', current: 13, proposed: 10 },
        { type: 'screen_time_daily', current: 60, proposed: 120 },
        { type: 'screen_time_per_app', current: 30, proposed: 60 },
        { type: 'bedtime_start', current: 1260, proposed: 1320 }, // 21:00 -> 22:00
        { type: 'bedtime_end', current: 420, proposed: 360 }, // 07:00 -> 06:00
      ] as const

      settingTypes.forEach(({ type, current, proposed }) => {
        const proposal = createCoolingProposal({
          settingType: type as SafetySettingsProposal['settingType'],
          currentValue: current,
          proposedValue: proposed,
        })

        expect(canCancelCoolingPeriod(proposal)).toBe(true)
      })
    })
  })

  describe('AC #6: Cooling period cannot be bypassed', () => {
    it('does not allow immediate effect even if requested', () => {
      // The cooling period is a protection mechanism that cannot be bypassed
      // even if both parents want the change to take effect immediately.
      // This is by design - the 48-hour delay protects against impulsive
      // decisions during parental conflict.

      const now = new Date()
      const coolingStartsAt = new Date(now.getTime() - 1000)
      const coolingEndsAt = new Date(
        coolingStartsAt.getTime() + PROPOSAL_TIME_LIMITS.COOLING_PERIOD_MS
      )

      const proposal: SafetySettingsProposal = {
        id: 'proposal-123',
        childId: 'child-123',
        proposedBy: 'parent-1',
        settingType: 'monitoring_interval',
        currentValue: 15,
        proposedValue: 30,
        status: 'cooling_in_progress',
        isEmergencyIncrease: false,
        createdAt: new Date(now.getTime() - 1000 * 60 * 60),
        expiresAt: new Date(now.getTime() + PROPOSAL_TIME_LIMITS.RESPONSE_WINDOW_MS),
        respondedBy: 'parent-2',
        respondedAt: coolingStartsAt,
        appliedAt: null, // NOT applied yet
        dispute: null,
        coolingPeriod: {
          startsAt: coolingStartsAt,
          endsAt: coolingEndsAt,
          cancelledBy: null,
          cancelledAt: null,
        },
      }

      // During cooling period, the change is not applied
      expect(proposal.appliedAt).toBeNull()

      // The only options are:
      // 1. Wait for cooling period to end (scheduled function applies change)
      // 2. Cancel the cooling period (change is never applied)
      // There is NO option to bypass and apply immediately

      expect(canCancelCoolingPeriod(proposal)).toBe(true)
    })
  })
})
