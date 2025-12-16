import { describe, it, expect } from 'vitest'
import {
  // Schemas
  sealedAuditActionSchema,
  sealedAuditEntrySchema,
  sealedAuditEntryFirestoreSchema,
  createSealedAuditInputSchema,
  selfRemovalConfirmationSchema,
  selfRemovalResultSchema,
  selfRemovalResultFirestoreSchema,
  // Helper functions
  getSelfRemovalErrorMessage,
  convertFirestoreToSealedAuditEntry,
  safeParseSealedAuditEntry,
  validateSelfRemovalConfirmation,
  safeParseSelfRemovalConfirmation,
  safeParseSelfRemovalResult,
  convertFirestoreToSelfRemovalResult,
  isReauthError,
  // Classes
  SelfRemovalError,
  // Constants
  SELF_REMOVAL_ERROR_MESSAGES,
  // Types
  type SealedAuditEntry,
  type SealedAuditEntryFirestore,
  type SelfRemovalConfirmation,
  type SelfRemovalResult,
} from './selfRemoval.schema'

/**
 * Self-Removal Schema Tests
 *
 * Story 2.8: Unilateral Self-Removal (Survivor Escape)
 *
 * Tests verify:
 * - Schema validation for sealed audit entries
 * - Schema validation for self-removal confirmation
 * - Schema validation for self-removal results
 * - Error message helpers at 6th-grade reading level
 * - Firestore conversion functions
 */

describe('selfRemoval.schema', () => {
  // ============================================================================
  // Sealed Audit Action Schema Tests
  // ============================================================================

  describe('sealedAuditActionSchema', () => {
    it('should accept valid action types', () => {
      expect(sealedAuditActionSchema.parse('guardian_self_removed')).toBe('guardian_self_removed')
      expect(sealedAuditActionSchema.parse('safety_escape_initiated')).toBe(
        'safety_escape_initiated'
      )
    })

    it('should reject invalid action types', () => {
      expect(() => sealedAuditActionSchema.parse('invalid_action')).toThrow()
      expect(() => sealedAuditActionSchema.parse('')).toThrow()
      expect(() => sealedAuditActionSchema.parse(null)).toThrow()
    })
  })

  // ============================================================================
  // Sealed Audit Entry Schema Tests
  // ============================================================================

  describe('sealedAuditEntrySchema', () => {
    const validEntry: SealedAuditEntry = {
      id: 'audit-123',
      action: 'guardian_self_removed',
      userId: 'user-456',
      familyId: 'family-789',
      performedAt: new Date('2024-01-15T10:00:00Z'),
      metadata: { wasOnlyGuardian: true },
    }

    it('should accept valid sealed audit entry', () => {
      const result = sealedAuditEntrySchema.parse(validEntry)
      expect(result.id).toBe('audit-123')
      expect(result.action).toBe('guardian_self_removed')
      expect(result.userId).toBe('user-456')
      expect(result.familyId).toBe('family-789')
      expect(result.performedAt).toEqual(new Date('2024-01-15T10:00:00Z'))
      expect(result.metadata).toEqual({ wasOnlyGuardian: true })
    })

    it('should accept entry without metadata', () => {
      const entryWithoutMetadata = { ...validEntry }
      delete entryWithoutMetadata.metadata

      const result = sealedAuditEntrySchema.parse(entryWithoutMetadata)
      expect(result.metadata).toBeUndefined()
    })

    it('should reject entry with missing required fields', () => {
      expect(() => sealedAuditEntrySchema.parse({ ...validEntry, id: '' })).toThrow()
      expect(() => sealedAuditEntrySchema.parse({ ...validEntry, userId: '' })).toThrow()
      expect(() => sealedAuditEntrySchema.parse({ ...validEntry, familyId: '' })).toThrow()
    })

    it('should reject entry with invalid action', () => {
      expect(() =>
        sealedAuditEntrySchema.parse({ ...validEntry, action: 'invalid' })
      ).toThrow()
    })

    it('should reject entry with invalid date', () => {
      expect(() =>
        sealedAuditEntrySchema.parse({ ...validEntry, performedAt: 'not-a-date' })
      ).toThrow()
    })
  })

  // ============================================================================
  // Create Sealed Audit Input Schema Tests
  // ============================================================================

  describe('createSealedAuditInputSchema', () => {
    it('should accept valid input', () => {
      const input = {
        action: 'guardian_self_removed' as const,
        userId: 'user-123',
        familyId: 'family-456',
        metadata: { test: true },
      }

      const result = createSealedAuditInputSchema.parse(input)
      expect(result.action).toBe('guardian_self_removed')
      expect(result.userId).toBe('user-123')
      expect(result.familyId).toBe('family-456')
    })

    it('should reject input with missing required fields', () => {
      expect(() =>
        createSealedAuditInputSchema.parse({
          action: 'guardian_self_removed',
          userId: '',
          familyId: 'family-456',
        })
      ).toThrow()
    })
  })

  // ============================================================================
  // Self-Removal Confirmation Schema Tests
  // ============================================================================

  describe('selfRemovalConfirmationSchema', () => {
    const validConfirmation: SelfRemovalConfirmation = {
      familyId: 'family-123',
      reauthToken: 'fresh-token-abc',
      acknowledgeNoReturn: true,
    }

    it('should accept valid confirmation', () => {
      const result = selfRemovalConfirmationSchema.parse(validConfirmation)
      expect(result.familyId).toBe('family-123')
      expect(result.reauthToken).toBe('fresh-token-abc')
      expect(result.acknowledgeNoReturn).toBe(true)
    })

    it('should reject confirmation without familyId', () => {
      expect(() =>
        selfRemovalConfirmationSchema.parse({
          ...validConfirmation,
          familyId: '',
        })
      ).toThrow()
    })

    it('should reject confirmation without reauthToken', () => {
      expect(() =>
        selfRemovalConfirmationSchema.parse({
          ...validConfirmation,
          reauthToken: '',
        })
      ).toThrow()
    })

    it('should reject confirmation without acknowledgment', () => {
      expect(() =>
        selfRemovalConfirmationSchema.parse({
          familyId: 'family-123',
          reauthToken: 'token',
          acknowledgeNoReturn: false,
        })
      ).toThrow()
    })

    it('should reject confirmation with acknowledgment as non-boolean', () => {
      expect(() =>
        selfRemovalConfirmationSchema.parse({
          familyId: 'family-123',
          reauthToken: 'token',
          acknowledgeNoReturn: 'true',
        })
      ).toThrow()
    })
  })

  // ============================================================================
  // Self-Removal Result Schema Tests
  // ============================================================================

  describe('selfRemovalResultSchema', () => {
    const validResult: SelfRemovalResult = {
      success: true,
      isSingleGuardian: false,
      familyId: 'family-123',
      removedAt: new Date('2024-01-15T10:00:00Z'),
    }

    it('should accept valid result', () => {
      const result = selfRemovalResultSchema.parse(validResult)
      expect(result.success).toBe(true)
      expect(result.isSingleGuardian).toBe(false)
      expect(result.familyId).toBe('family-123')
      expect(result.removedAt).toEqual(new Date('2024-01-15T10:00:00Z'))
    })

    it('should accept result for single guardian', () => {
      const singleGuardianResult = { ...validResult, isSingleGuardian: true }
      const result = selfRemovalResultSchema.parse(singleGuardianResult)
      expect(result.isSingleGuardian).toBe(true)
    })

    it('should reject result with missing familyId', () => {
      expect(() =>
        selfRemovalResultSchema.parse({ ...validResult, familyId: '' })
      ).toThrow()
    })
  })

  // ============================================================================
  // Error Message Helper Tests
  // ============================================================================

  describe('getSelfRemovalErrorMessage', () => {
    it('should return correct message for known error codes', () => {
      expect(getSelfRemovalErrorMessage('family-not-found')).toBe(
        'We could not find this family.'
      )
      expect(getSelfRemovalErrorMessage('not-a-guardian')).toBe(
        'You are not a member of this family.'
      )
      expect(getSelfRemovalErrorMessage('reauth-required')).toBe(
        'Please sign in again to confirm this action.'
      )
      expect(getSelfRemovalErrorMessage('reauth-expired')).toBe(
        'Your sign-in has expired. Please try again.'
      )
      expect(getSelfRemovalErrorMessage('removal-failed')).toBe(
        'Could not remove you from the family. Please try again.'
      )
    })

    it('should return default message for unknown error codes', () => {
      expect(getSelfRemovalErrorMessage('unknown-code')).toBe(
        'Something went wrong. Please try again.'
      )
      expect(getSelfRemovalErrorMessage('')).toBe('Something went wrong. Please try again.')
    })

    it('error messages should be at 6th-grade reading level', () => {
      // Verify messages are simple and clear
      Object.values(SELF_REMOVAL_ERROR_MESSAGES).forEach((message) => {
        // Messages should be short (less than 80 characters)
        expect(message.length).toBeLessThan(100)
        // Messages should not contain technical jargon
        expect(message).not.toMatch(/unauthorized|forbidden|exception|null|undefined/)
        // Messages should end with proper punctuation
        expect(message).toMatch(/[.!?]$/)
      })
    })
  })

  // ============================================================================
  // Firestore Conversion Tests
  // ============================================================================

  describe('convertFirestoreToSealedAuditEntry', () => {
    it('should convert Firestore data to domain type', () => {
      const firestoreData: SealedAuditEntryFirestore = {
        id: 'audit-123',
        action: 'guardian_self_removed',
        userId: 'user-456',
        familyId: 'family-789',
        performedAt: {
          toDate: () => new Date('2024-01-15T10:00:00Z'),
        } as unknown as { toDate: () => Date },
        metadata: { wasOnlyGuardian: true },
      }

      const result = convertFirestoreToSealedAuditEntry(firestoreData)
      expect(result.id).toBe('audit-123')
      expect(result.action).toBe('guardian_self_removed')
      expect(result.performedAt).toEqual(new Date('2024-01-15T10:00:00Z'))
    })
  })

  describe('safeParseSealedAuditEntry', () => {
    it('should return parsed entry for valid data', () => {
      const validEntry = {
        id: 'audit-123',
        action: 'guardian_self_removed',
        userId: 'user-456',
        familyId: 'family-789',
        performedAt: new Date(),
      }

      const result = safeParseSealedAuditEntry(validEntry)
      expect(result).not.toBeNull()
      expect(result?.id).toBe('audit-123')
    })

    it('should return null for invalid data', () => {
      const result = safeParseSealedAuditEntry({ invalid: 'data' })
      expect(result).toBeNull()
    })
  })

  // ============================================================================
  // Validation Helper Tests
  // ============================================================================

  describe('validateSelfRemovalConfirmation', () => {
    it('should return validated input for valid data', () => {
      const input = {
        familyId: 'family-123',
        reauthToken: 'token',
        acknowledgeNoReturn: true,
      }

      const result = validateSelfRemovalConfirmation(input)
      expect(result.familyId).toBe('family-123')
    })

    it('should throw for invalid data', () => {
      expect(() =>
        validateSelfRemovalConfirmation({
          familyId: '',
          reauthToken: 'token',
          acknowledgeNoReturn: true,
        })
      ).toThrow()
    })
  })

  describe('safeParseSelfRemovalConfirmation', () => {
    it('should return parsed confirmation for valid data', () => {
      const input = {
        familyId: 'family-123',
        reauthToken: 'token',
        acknowledgeNoReturn: true,
      }

      const result = safeParseSelfRemovalConfirmation(input)
      expect(result).not.toBeNull()
      expect(result?.familyId).toBe('family-123')
    })

    it('should return null for invalid data', () => {
      const result = safeParseSelfRemovalConfirmation({ invalid: 'data' })
      expect(result).toBeNull()
    })
  })

  describe('safeParseSelfRemovalResult', () => {
    it('should return parsed result for valid data', () => {
      const result = {
        success: true,
        isSingleGuardian: false,
        familyId: 'family-123',
        removedAt: new Date(),
      }

      const parsed = safeParseSelfRemovalResult(result)
      expect(parsed).not.toBeNull()
      expect(parsed?.success).toBe(true)
    })

    it('should return null for invalid data', () => {
      const result = safeParseSelfRemovalResult({ invalid: 'data' })
      expect(result).toBeNull()
    })
  })

  describe('convertFirestoreToSelfRemovalResult', () => {
    it('should convert Firestore result to domain type', () => {
      const firestoreData = {
        success: true,
        isSingleGuardian: true,
        familyId: 'family-123',
        removedAt: {
          toDate: () => new Date('2024-01-15T10:00:00Z'),
        } as unknown as { toDate: () => Date },
      }

      const result = convertFirestoreToSelfRemovalResult(firestoreData)
      expect(result.success).toBe(true)
      expect(result.isSingleGuardian).toBe(true)
      expect(result.removedAt).toEqual(new Date('2024-01-15T10:00:00Z'))
    })
  })

  // ============================================================================
  // Re-auth Error Detection Tests
  // ============================================================================

  describe('isReauthError', () => {
    it('should return true for re-auth related errors', () => {
      expect(isReauthError(new Error('Please sign in again'))).toBe(true)
      expect(isReauthError(new Error('Reauth required'))).toBe(true)
      expect(isReauthError(new Error('Token expired'))).toBe(true)
      expect(isReauthError(new Error('Authentication failed'))).toBe(true)
    })

    it('should return false for non-reauth errors', () => {
      expect(isReauthError(new Error('Family not found'))).toBe(false)
      expect(isReauthError(new Error('Network error'))).toBe(false)
      expect(isReauthError(new Error('Permission denied'))).toBe(false)
    })

    it('should return false for non-Error values', () => {
      expect(isReauthError('string error')).toBe(false)
      expect(isReauthError(null)).toBe(false)
      expect(isReauthError(undefined)).toBe(false)
      expect(isReauthError({ message: 'reauth' })).toBe(false)
    })
  })

  // ============================================================================
  // SelfRemovalError Class Tests
  // ============================================================================

  describe('SelfRemovalError', () => {
    it('should create error with code and default message', () => {
      const error = new SelfRemovalError('family-not-found')
      expect(error.code).toBe('family-not-found')
      expect(error.message).toBe('We could not find this family.')
      expect(error.name).toBe('SelfRemovalError')
    })

    it('should create error with custom message', () => {
      const error = new SelfRemovalError('family-not-found', 'Custom message')
      expect(error.code).toBe('family-not-found')
      expect(error.message).toBe('Custom message')
    })

    it('should be instanceof Error', () => {
      const error = new SelfRemovalError('test')
      expect(error instanceof Error).toBe(true)
      expect(error instanceof SelfRemovalError).toBe(true)
    })
  })
})
