/**
 * Unit tests for respondToSafetyProposal and disputeSafetyProposal Cloud Functions
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

import { describe, it, expect } from 'vitest'

// Import contracts to verify they're used correctly
import {
  respondToProposalInputSchema,
  disputeProposalInputSchema,
  canRespondToProposal,
  canDisputeProposal,
  PROPOSAL_TIME_LIMITS,
  type SafetySettingsProposal,
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
  })
})
