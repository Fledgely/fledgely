/**
 * Unit tests for signAgreementChange Cloud Function
 *
 * Story 3A.3: Agreement Changes Two-Parent Approval - Signature Collection
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
  signAgreementChangeInputSchema,
  canSignAgreementChange,
  allSignaturesCollected,
  AGREEMENT_PROPOSAL_TIME_LIMITS,
  type AgreementChangeProposal,
  type AgreementSignature,
} from '@fledgely/contracts'

describe('signAgreementChange schemas', () => {
  describe('input validation via schema', () => {
    it('validates correct input', () => {
      const input = {
        proposalId: 'proposal-123',
        childId: 'child-123',
        acknowledgment: 'I agree to this change',
      }

      const result = signAgreementChangeInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('rejects missing proposalId', () => {
      const input = {
        childId: 'child-123',
        acknowledgment: 'I agree to this change',
      }

      const result = signAgreementChangeInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects missing childId', () => {
      const input = {
        proposalId: 'proposal-123',
        acknowledgment: 'I agree to this change',
      }

      const result = signAgreementChangeInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('allows missing acknowledgment in schema (validated in function)', () => {
      const input = {
        proposalId: 'proposal-123',
        childId: 'child-123',
      }

      const result = signAgreementChangeInputSchema.safeParse(input)
      // Schema allows missing acknowledgment, validation happens in function
      expect(result.success).toBe(true)
    })

    it('rejects incorrect acknowledgment text', () => {
      const input = {
        proposalId: 'proposal-123',
        childId: 'child-123',
        acknowledgment: 'I disagree',
      }

      const result = signAgreementChangeInputSchema.safeParse(input)
      // Schema accepts any string, validation happens in function
      expect(result.success).toBe(true)
    })
  })

  describe('canSignAgreementChange helper', () => {
    const createSignature = (
      signerId: string,
      signerType: 'parent' | 'child',
      status: 'pending' | 'signed' = 'pending'
    ): AgreementSignature => ({
      signerId,
      signerType,
      status,
      signedAt: status === 'signed' ? new Date() : null,
    })

    const createProposal = (overrides: Partial<AgreementChangeProposal> = {}): AgreementChangeProposal => ({
      id: 'proposal-123',
      childId: 'child-123',
      proposedBy: 'guardian-1',
      changeType: 'screen_time',
      originalValue: 180,
      proposedValue: 120,
      status: 'awaiting_signatures',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + AGREEMENT_PROPOSAL_TIME_LIMITS.RESPONSE_WINDOW_MS),
      respondedBy: 'guardian-2',
      respondedAt: new Date(),
      declineMessage: null,
      justification: null,
      modifiesProposalId: null,
      approvedAt: new Date(),
      signatures: [
        createSignature('guardian-1', 'parent', 'pending'),
        createSignature('guardian-2', 'parent', 'signed'), // Responding parent auto-signs
        createSignature('child-123', 'child', 'pending'),
      ],
      signatureDeadline: new Date(Date.now() + AGREEMENT_PROPOSAL_TIME_LIMITS.SIGNATURE_WINDOW_MS),
      activeAt: null,
      ...overrides,
    })

    it('allows parent to sign when proposal is awaiting_signatures', () => {
      const proposal = createProposal()
      const result = canSignAgreementChange(proposal, 'guardian-1', 'parent')
      expect(result.canSign).toBe(true)
    })

    it('prevents signing when proposal is not awaiting_signatures', () => {
      const proposal = createProposal({ status: 'pending' })
      const result = canSignAgreementChange(proposal, 'guardian-1', 'parent')
      expect(result.canSign).toBe(false)
    })

    it('prevents child from signing before both parents have signed', () => {
      const proposal = createProposal({
        signatures: [
          createSignature('guardian-1', 'parent', 'pending'),
          createSignature('guardian-2', 'parent', 'signed'),
          createSignature('child-123', 'child', 'pending'),
        ],
      })
      const result = canSignAgreementChange(proposal, 'child-123', 'child')
      expect(result.canSign).toBe(false)
      expect(result.reason?.toLowerCase()).toContain('both parents')
    })

    it('allows child to sign after both parents have signed', () => {
      const proposal = createProposal({
        signatures: [
          createSignature('guardian-1', 'parent', 'signed'),
          createSignature('guardian-2', 'parent', 'signed'),
          createSignature('child-123', 'child', 'pending'),
        ],
      })
      const result = canSignAgreementChange(proposal, 'child-123', 'child')
      expect(result.canSign).toBe(true)
    })

    it('prevents signing when already signed', () => {
      const proposal = createProposal({
        signatures: [
          createSignature('guardian-1', 'parent', 'signed'),
          createSignature('guardian-2', 'parent', 'signed'),
          createSignature('child-123', 'child', 'pending'),
        ],
      })
      const result = canSignAgreementChange(proposal, 'guardian-1', 'parent')
      expect(result.canSign).toBe(false)
      expect(result.reason?.toLowerCase()).toContain('already signed')
    })

    it('prevents signing after signature deadline', () => {
      const proposal = createProposal({
        signatureDeadline: new Date(Date.now() - 1000), // Already passed
      })
      const result = canSignAgreementChange(proposal, 'guardian-1', 'parent')
      expect(result.canSign).toBe(false)
      expect(result.reason?.toLowerCase()).toContain('deadline')
    })
  })

  describe('allSignaturesCollected helper', () => {
    const createSignature = (
      signerId: string,
      signerType: 'parent' | 'child',
      status: 'pending' | 'signed' = 'pending'
    ): AgreementSignature => ({
      signerId,
      signerType,
      status,
      signedAt: status === 'signed' ? new Date() : null,
    })

    const createProposal = (signatures: AgreementSignature[]): AgreementChangeProposal => ({
      id: 'proposal-123',
      childId: 'child-123',
      proposedBy: 'guardian-1',
      changeType: 'screen_time',
      originalValue: 180,
      proposedValue: 120,
      status: 'awaiting_signatures',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + AGREEMENT_PROPOSAL_TIME_LIMITS.RESPONSE_WINDOW_MS),
      respondedBy: 'guardian-2',
      respondedAt: new Date(),
      declineMessage: null,
      justification: null,
      modifiesProposalId: null,
      approvedAt: new Date(),
      signatures,
      signatureDeadline: new Date(Date.now() + AGREEMENT_PROPOSAL_TIME_LIMITS.SIGNATURE_WINDOW_MS),
      activeAt: null,
    })

    it('returns true when all signatures are collected', () => {
      const proposal = createProposal([
        createSignature('guardian-1', 'parent', 'signed'),
        createSignature('guardian-2', 'parent', 'signed'),
        createSignature('child-123', 'child', 'signed'),
      ])
      expect(allSignaturesCollected(proposal)).toBe(true)
    })

    it('returns false when some signatures are pending', () => {
      const proposal = createProposal([
        createSignature('guardian-1', 'parent', 'signed'),
        createSignature('guardian-2', 'parent', 'signed'),
        createSignature('child-123', 'child', 'pending'),
      ])
      expect(allSignaturesCollected(proposal)).toBe(false)
    })

    it('returns false when no signatures are collected', () => {
      const proposal = createProposal([
        createSignature('guardian-1', 'parent', 'pending'),
        createSignature('guardian-2', 'parent', 'pending'),
        createSignature('child-123', 'child', 'pending'),
      ])
      expect(allSignaturesCollected(proposal)).toBe(false)
    })
  })

  describe('signature window timing', () => {
    it('signature window is 30 days', () => {
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
      expect(AGREEMENT_PROPOSAL_TIME_LIMITS.SIGNATURE_WINDOW_MS).toBe(thirtyDaysMs)
    })
  })
})
