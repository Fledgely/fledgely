/**
 * Agreement Activation Schema Tests - Story 34.4
 *
 * Tests for dual-signature activation schemas.
 */

import { describe, it, expect } from 'vitest'
import {
  proposalStatusSchema,
  signatureRecordSchema,
  activatedAgreementVersionSchema,
  SignatureRecord,
  ActivatedAgreementVersion,
} from './index'

describe('Agreement Activation Schemas - Story 34.4', () => {
  describe('proposalStatusSchema', () => {
    it('should accept "activated" status', () => {
      const result = proposalStatusSchema.safeParse('activated')
      expect(result.success).toBe(true)
    })

    it('should accept all existing statuses', () => {
      const statuses = [
        'pending',
        'accepted',
        'declined',
        'withdrawn',
        'counter-proposed',
        'activated',
      ]
      for (const status of statuses) {
        const result = proposalStatusSchema.safeParse(status)
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid status', () => {
      const result = proposalStatusSchema.safeParse('invalid-status')
      expect(result.success).toBe(false)
    })
  })

  describe('signatureRecordSchema', () => {
    const validSignature: SignatureRecord = {
      userId: 'user-123',
      userName: 'Mom',
      role: 'parent',
      signedAt: Date.now(),
      action: 'confirmed',
    }

    it('should validate a valid signature record', () => {
      const result = signatureRecordSchema.safeParse(validSignature)
      expect(result.success).toBe(true)
    })

    it('should accept "proposed" action', () => {
      const signature = { ...validSignature, action: 'proposed' }
      const result = signatureRecordSchema.safeParse(signature)
      expect(result.success).toBe(true)
    })

    it('should accept "accepted" action', () => {
      const signature = { ...validSignature, action: 'accepted' }
      const result = signatureRecordSchema.safeParse(signature)
      expect(result.success).toBe(true)
    })

    it('should accept "confirmed" action', () => {
      const signature = { ...validSignature, action: 'confirmed' }
      const result = signatureRecordSchema.safeParse(signature)
      expect(result.success).toBe(true)
    })

    it('should accept "parent" role', () => {
      const signature = { ...validSignature, role: 'parent' }
      const result = signatureRecordSchema.safeParse(signature)
      expect(result.success).toBe(true)
    })

    it('should accept "child" role', () => {
      const signature = { ...validSignature, role: 'child' }
      const result = signatureRecordSchema.safeParse(signature)
      expect(result.success).toBe(true)
    })

    it('should reject invalid role', () => {
      const signature = { ...validSignature, role: 'caregiver' }
      const result = signatureRecordSchema.safeParse(signature)
      expect(result.success).toBe(false)
    })

    it('should reject invalid action', () => {
      const signature = { ...validSignature, action: 'invalid' }
      const result = signatureRecordSchema.safeParse(signature)
      expect(result.success).toBe(false)
    })
  })

  describe('activatedAgreementVersionSchema', () => {
    const validVersion: ActivatedAgreementVersion = {
      id: 'version-123',
      agreementId: 'agreement-456',
      familyId: 'family-789',
      childId: 'child-abc',
      versionNumber: 2,
      content: { timeLimits: { weekday: { gaming: 90 } } },
      changedFromVersion: 1,
      proposalId: 'proposal-xyz',
      signatures: {
        proposer: {
          userId: 'parent-1',
          userName: 'Mom',
          role: 'parent',
          signedAt: Date.now() - 1000,
          action: 'proposed',
        },
        recipient: {
          userId: 'child-1',
          userName: 'Emma',
          role: 'child',
          signedAt: Date.now(),
          action: 'accepted',
        },
      },
      createdAt: Date.now(),
      activatedAt: Date.now(),
    }

    it('should validate a valid activated agreement version', () => {
      const result = activatedAgreementVersionSchema.safeParse(validVersion)
      expect(result.success).toBe(true)
    })

    it('should accept null changedFromVersion for initial version', () => {
      const version = { ...validVersion, changedFromVersion: null, versionNumber: 1 }
      const result = activatedAgreementVersionSchema.safeParse(version)
      expect(result.success).toBe(true)
    })

    it('should accept null proposalId for initial version', () => {
      const version = { ...validVersion, proposalId: null, versionNumber: 1 }
      const result = activatedAgreementVersionSchema.safeParse(version)
      expect(result.success).toBe(true)
    })

    it('should require all signature fields', () => {
      const version = {
        ...validVersion,
        signatures: {
          proposer: validVersion.signatures.proposer,
          // missing recipient
        },
      }
      const result = activatedAgreementVersionSchema.safeParse(version)
      expect(result.success).toBe(false)
    })

    it('should require versionNumber to be positive', () => {
      const version = { ...validVersion, versionNumber: 0 }
      const result = activatedAgreementVersionSchema.safeParse(version)
      expect(result.success).toBe(false)
    })

    it('should allow any content shape', () => {
      const version = {
        ...validVersion,
        content: { customSection: { customField: 'value' } },
      }
      const result = activatedAgreementVersionSchema.safeParse(version)
      expect(result.success).toBe(true)
    })
  })
})
