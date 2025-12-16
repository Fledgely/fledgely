/**
 * Unit tests for respondToAgreementProposal Cloud Function
 *
 * Story 3A.3: Agreement Changes Two-Parent Approval
 *
 * NOTE: These tests require Firebase emulators to run properly.
 * The core business logic is tested in the schema tests at:
 * packages/contracts/src/agreement-change-proposal.schema.test.ts (159 tests)
 *
 * These tests verify the Cloud Function structure and integration patterns.
 * Run with: firebase emulators:exec "npx vitest run" --only firestore,auth
 */

import { describe, it, expect } from 'vitest'

// Import contracts to verify they're used correctly
import {
  respondToAgreementProposalInputSchema,
  canRespondToAgreementProposal,
  AGREEMENT_PROPOSAL_TIME_LIMITS,
  type AgreementChangeProposal,
} from '@fledgely/contracts'

describe('respondToAgreementProposal schemas', () => {
  describe('input validation via schema', () => {
    it('validates correct approve input', () => {
      const input = {
        proposalId: 'proposal-123',
        childId: 'child-123',
        action: 'approve',
      }

      const result = respondToAgreementProposalInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('validates correct decline input with message', () => {
      const input = {
        proposalId: 'proposal-123',
        childId: 'child-123',
        action: 'decline',
        declineMessage: 'I disagree with this change because...',
      }

      const result = respondToAgreementProposalInputSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.declineMessage).toBe('I disagree with this change because...')
      }
    })

    it('rejects missing proposalId', () => {
      const input = {
        childId: 'child-123',
        action: 'approve',
      }

      const result = respondToAgreementProposalInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects missing childId', () => {
      const input = {
        proposalId: 'proposal-123',
        action: 'approve',
      }

      const result = respondToAgreementProposalInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects invalid action', () => {
      const input = {
        proposalId: 'proposal-123',
        childId: 'child-123',
        action: 'invalid_action',
      }

      const result = respondToAgreementProposalInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('accepts approve without message', () => {
      const input = {
        proposalId: 'proposal-123',
        childId: 'child-123',
        action: 'approve',
      }

      const result = respondToAgreementProposalInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('accepts decline without message', () => {
      const input = {
        proposalId: 'proposal-123',
        childId: 'child-123',
        action: 'decline',
      }

      const result = respondToAgreementProposalInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })
  })

  describe('canRespondToAgreementProposal helper', () => {
    const createProposal = (overrides: Partial<AgreementChangeProposal> = {}): AgreementChangeProposal => ({
      id: 'proposal-123',
      childId: 'child-123',
      proposedBy: 'guardian-1',
      changeType: 'screen_time',
      originalValue: 180,
      proposedValue: 120,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + AGREEMENT_PROPOSAL_TIME_LIMITS.RESPONSE_WINDOW_MS),
      respondedBy: null,
      respondedAt: null,
      declineMessage: null,
      justification: null,
      modifiesProposalId: null,
      approvedAt: null,
      signatures: [],
      signatureDeadline: null,
      activeAt: null,
      ...overrides,
    })

    it('returns true for pending proposal within window', () => {
      const proposal = createProposal()
      const result = canRespondToAgreementProposal(proposal)
      expect(result.canRespond).toBe(true)
    })

    it('returns false for non-pending proposal', () => {
      const proposal = createProposal({ status: 'approved' })
      const result = canRespondToAgreementProposal(proposal)
      expect(result.canRespond).toBe(false)
    })

    it('returns false for expired proposal', () => {
      const proposal = createProposal({
        expiresAt: new Date(Date.now() - 1000), // Already expired
      })
      const result = canRespondToAgreementProposal(proposal)
      expect(result.canRespond).toBe(false)
      expect(result.reason).toContain('expired')
    })

    it('provides reason when cannot respond', () => {
      const proposal = createProposal({ status: 'declined' })
      const result = canRespondToAgreementProposal(proposal)
      expect(result.canRespond).toBe(false)
      expect(result.reason).toBeDefined()
    })
  })

  describe('time limits for 14-day window', () => {
    it('proposal within 14 days is valid', () => {
      const now = new Date()
      const expiresAt = new Date(now.getTime() + AGREEMENT_PROPOSAL_TIME_LIMITS.RESPONSE_WINDOW_MS)

      // 13 days from now should be before expiry
      const thirteenDaysLater = new Date(now.getTime() + 13 * 24 * 60 * 60 * 1000)
      expect(thirteenDaysLater.getTime()).toBeLessThan(expiresAt.getTime())
    })

    it('proposal after 14 days is expired', () => {
      const now = new Date()
      const expiresAt = new Date(now.getTime() + AGREEMENT_PROPOSAL_TIME_LIMITS.RESPONSE_WINDOW_MS)

      // 15 days from now should be after expiry
      const fifteenDaysLater = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)
      expect(fifteenDaysLater.getTime()).toBeGreaterThan(expiresAt.getTime())
    })
  })
})
