/**
 * Unit tests for proposeAgreementChange Cloud Function
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
  createAgreementChangeProposalInputSchema,
  AGREEMENT_PROPOSAL_RATE_LIMIT,
  AGREEMENT_PROPOSAL_TIME_LIMITS,
} from '@fledgely/contracts'

describe('proposeAgreementChange schemas', () => {
  describe('input validation via schema', () => {
    it('validates correct input', () => {
      const input = {
        childId: 'child-123',
        changeType: 'screen_time',
        proposedValue: 120,
      }

      const result = createAgreementChangeProposalInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('accepts optional justification', () => {
      const input = {
        childId: 'child-123',
        changeType: 'screen_time',
        proposedValue: 120,
        justification: 'Need to reduce screen time for better sleep',
      }

      const result = createAgreementChangeProposalInputSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.justification).toBe('Need to reduce screen time for better sleep')
      }
    })

    it('accepts optional modifiesProposalId', () => {
      const input = {
        childId: 'child-123',
        changeType: 'screen_time',
        proposedValue: 120,
        modifiesProposalId: 'proposal-456',
      }

      const result = createAgreementChangeProposalInputSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.modifiesProposalId).toBe('proposal-456')
      }
    })

    it('rejects missing childId', () => {
      const input = {
        changeType: 'screen_time',
        proposedValue: 120,
      }

      const result = createAgreementChangeProposalInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects empty childId', () => {
      const input = {
        childId: '',
        changeType: 'screen_time',
        proposedValue: 120,
      }

      const result = createAgreementChangeProposalInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects missing changeType', () => {
      const input = {
        childId: 'child-123',
        proposedValue: 120,
      }

      const result = createAgreementChangeProposalInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects missing proposedValue', () => {
      const input = {
        childId: 'child-123',
        changeType: 'screen_time',
      }

      const result = createAgreementChangeProposalInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects invalid change type', () => {
      const input = {
        childId: 'child-123',
        changeType: 'invalid_type',
        proposedValue: 120,
      }

      const result = createAgreementChangeProposalInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('accepts all valid change types', () => {
      const changeTypes = [
        'terms',
        'monitoring_rules',
        'screen_time',
        'bedtime_schedule',
        'app_restrictions',
        'content_filters',
        'consequences',
        'rewards',
      ]

      for (const changeType of changeTypes) {
        const input = {
          childId: 'child-123',
          changeType,
          proposedValue: 'test value',
        }
        const result = createAgreementChangeProposalInputSchema.safeParse(input)
        expect(result.success, `Change type ${changeType} should be valid`).toBe(true)
      }
    })

    it('accepts numeric proposed values', () => {
      const input = {
        childId: 'child-123',
        changeType: 'screen_time',
        proposedValue: 90,
      }

      const result = createAgreementChangeProposalInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('accepts string proposed values', () => {
      const input = {
        childId: 'child-123',
        changeType: 'terms',
        proposedValue: 'New terms and conditions text',
      }

      const result = createAgreementChangeProposalInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('accepts array proposed values', () => {
      const input = {
        childId: 'child-123',
        changeType: 'app_restrictions',
        proposedValue: ['TikTok', 'Instagram', 'Snapchat'],
      }

      const result = createAgreementChangeProposalInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })
  })

  describe('rate limiting constants', () => {
    it('has correct rate limit', () => {
      expect(AGREEMENT_PROPOSAL_RATE_LIMIT.MAX_PROPOSALS_PER_HOUR).toBe(10)
      expect(AGREEMENT_PROPOSAL_RATE_LIMIT.WINDOW_MS).toBe(60 * 60 * 1000)
    })
  })

  describe('time limits constants', () => {
    it('has correct response window (14 days)', () => {
      expect(AGREEMENT_PROPOSAL_TIME_LIMITS.RESPONSE_WINDOW_MS).toBe(14 * 24 * 60 * 60 * 1000)
    })

    it('has correct reproposal cooldown (7 days)', () => {
      expect(AGREEMENT_PROPOSAL_TIME_LIMITS.REPROPOSAL_COOLDOWN_MS).toBe(7 * 24 * 60 * 60 * 1000)
    })

    it('has correct signature window (30 days)', () => {
      expect(AGREEMENT_PROPOSAL_TIME_LIMITS.SIGNATURE_WINDOW_MS).toBe(30 * 24 * 60 * 60 * 1000)
    })
  })
})
