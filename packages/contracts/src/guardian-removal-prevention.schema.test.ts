import { describe, it, expect } from 'vitest'
import {
  // Schemas
  blockedOperationTypeSchema,
  targetGuardianRoleSchema,
  guardianPermissionsSchema,
  protectedCustodyTypeSchema,
  guardianRemovalAttemptSchema,
  guardianRemovalAttemptFirestoreSchema,
  attemptGuardianRemovalInputSchema,
  attemptRoleChangeInputSchema,
  attemptPermissionChangeInputSchema,
  removalBlockedResultSchema,
  removalAllowedResultSchema,
  guardianRemovalResultSchema,
  // Constants
  REMOVAL_AUDIT_FIELD_LIMITS,
  BLOCKED_OPERATION_TYPES,
  GUARDIAN_REMOVAL_PREVENTION_MESSAGES,
  SHARED_CUSTODY_IMMUTABILITY_RULES,
  // Helper functions
  requiresRemovalProtection,
  isRoleDowngrade,
  isPermissionDowngrade,
  createBlockedResult,
  createAllowedResult,
  getRemovalBlockedExplanation,
  convertFirestoreToGuardianRemovalAttempt,
  safeParseGuardianRemovalAttempt,
  validateAttemptGuardianRemovalInput,
  validateAttemptRoleChangeInput,
  validateAttemptPermissionChangeInput,
  // Types
  type BlockedOperationType,
  type GuardianRemovalAttempt,
  type RemovalBlockedResult,
} from './guardian-removal-prevention.schema'

describe('Guardian Removal Prevention Schema', () => {
  // ============================================================================
  // Constants Tests
  // ============================================================================

  describe('Constants', () => {
    describe('REMOVAL_AUDIT_FIELD_LIMITS', () => {
      it('has reasonable limits for guardian ID', () => {
        expect(REMOVAL_AUDIT_FIELD_LIMITS.guardianId).toBe(128)
      })

      it('has reasonable limits for child ID', () => {
        expect(REMOVAL_AUDIT_FIELD_LIMITS.childId).toBe(128)
      })

      it('has reasonable limits for family ID', () => {
        expect(REMOVAL_AUDIT_FIELD_LIMITS.familyId).toBe(128)
      })

      it('has limit for explanation text', () => {
        expect(REMOVAL_AUDIT_FIELD_LIMITS.explanation).toBe(1000)
      })
    })

    describe('BLOCKED_OPERATION_TYPES', () => {
      it('includes guardian_removal', () => {
        expect(BLOCKED_OPERATION_TYPES).toContain('guardian_removal')
      })

      it('includes role_downgrade', () => {
        expect(BLOCKED_OPERATION_TYPES).toContain('role_downgrade')
      })

      it('includes permission_downgrade', () => {
        expect(BLOCKED_OPERATION_TYPES).toContain('permission_downgrade')
      })

      it('has exactly 3 blocked operation types', () => {
        expect(BLOCKED_OPERATION_TYPES).toHaveLength(3)
      })
    })

    describe('GUARDIAN_REMOVAL_PREVENTION_MESSAGES', () => {
      it('has removal blocked message', () => {
        expect(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.removalBlocked).toBeTruthy()
        expect(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.removalBlocked).toContain('shared custody')
      })

      it('has shared custody explanation', () => {
        expect(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.sharedCustodyExplanation).toBeTruthy()
      })

      it('has dissolution option reference (Story 2.7)', () => {
        expect(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.dissolutionOption).toBeTruthy()
        expect(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.dissolutionOption).toContain('dissolution')
        expect(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.dissolutionOption).toContain('30-day')
      })

      it('has legal petition info reference (Story 3.6)', () => {
        expect(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.legalPetitionInfo).toBeTruthy()
        expect(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.legalPetitionInfo).toContain('court order')
      })

      it('has court order required message', () => {
        expect(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.courtOrderRequired).toBeTruthy()
        expect(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.courtOrderRequired).toContain('court order')
      })

      it('has role change blocked message', () => {
        expect(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.roleChangeBlocked).toBeTruthy()
      })

      it('has permission change blocked message', () => {
        expect(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.permissionChangeBlocked).toBeTruthy()
      })

      it('has link text for dissolution', () => {
        expect(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.dissolutionLinkText).toBeTruthy()
      })

      it('has link text for legal petition', () => {
        expect(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.legalPetitionLinkText).toBeTruthy()
      })

      it('messages are at 6th-grade reading level (no complex words)', () => {
        // Simple check: no words longer than 15 characters
        const allMessages = Object.values(GUARDIAN_REMOVAL_PREVENTION_MESSAGES).join(' ')
        const words = allMessages.split(/\s+/)
        const longWords = words.filter((w) => w.length > 15)
        // Allow a few technical terms
        expect(longWords.length).toBeLessThan(5)
      })
    })

    describe('SHARED_CUSTODY_IMMUTABILITY_RULES', () => {
      it('blocks guardian removal', () => {
        expect(SHARED_CUSTODY_IMMUTABILITY_RULES.canRemoveGuardian).toBe(false)
      })

      it('blocks role downgrade', () => {
        expect(SHARED_CUSTODY_IMMUTABILITY_RULES.canDowngradeRole).toBe(false)
      })

      it('blocks permission reduction', () => {
        expect(SHARED_CUSTODY_IMMUTABILITY_RULES.canReducePermissions).toBe(false)
      })

      it('blocks unilateral dissolution', () => {
        expect(SHARED_CUSTODY_IMMUTABILITY_RULES.canUnilaterallyDissolve).toBe(false)
      })

      it('requires court order for forced removal', () => {
        expect(SHARED_CUSTODY_IMMUTABILITY_RULES.courtOrderRequired).toBe(true)
      })
    })
  })

  // ============================================================================
  // Enum Schema Tests
  // ============================================================================

  describe('Enum Schemas', () => {
    describe('blockedOperationTypeSchema', () => {
      it('accepts guardian_removal', () => {
        expect(blockedOperationTypeSchema.parse('guardian_removal')).toBe('guardian_removal')
      })

      it('accepts role_downgrade', () => {
        expect(blockedOperationTypeSchema.parse('role_downgrade')).toBe('role_downgrade')
      })

      it('accepts permission_downgrade', () => {
        expect(blockedOperationTypeSchema.parse('permission_downgrade')).toBe(
          'permission_downgrade'
        )
      })

      it('rejects invalid operation type', () => {
        expect(() => blockedOperationTypeSchema.parse('invalid')).toThrow()
      })
    })

    describe('targetGuardianRoleSchema', () => {
      it('accepts primary', () => {
        expect(targetGuardianRoleSchema.parse('primary')).toBe('primary')
      })

      it('accepts co-parent', () => {
        expect(targetGuardianRoleSchema.parse('co-parent')).toBe('co-parent')
      })

      it('accepts caregiver', () => {
        expect(targetGuardianRoleSchema.parse('caregiver')).toBe('caregiver')
      })

      it('rejects invalid role', () => {
        expect(() => targetGuardianRoleSchema.parse('admin')).toThrow()
      })
    })

    describe('guardianPermissionsSchema', () => {
      it('accepts full', () => {
        expect(guardianPermissionsSchema.parse('full')).toBe('full')
      })

      it('accepts readonly', () => {
        expect(guardianPermissionsSchema.parse('readonly')).toBe('readonly')
      })

      it('rejects invalid permissions', () => {
        expect(() => guardianPermissionsSchema.parse('write')).toThrow()
      })
    })

    describe('protectedCustodyTypeSchema', () => {
      it('accepts shared', () => {
        expect(protectedCustodyTypeSchema.parse('shared')).toBe('shared')
      })

      it('accepts complex', () => {
        expect(protectedCustodyTypeSchema.parse('complex')).toBe('complex')
      })

      it('rejects sole custody (no protection needed)', () => {
        expect(() => protectedCustodyTypeSchema.parse('sole')).toThrow()
      })
    })
  })

  // ============================================================================
  // guardianRemovalAttemptSchema Tests
  // ============================================================================

  describe('guardianRemovalAttemptSchema', () => {
    const validAttempt: GuardianRemovalAttempt = {
      id: 'attempt-123',
      attemptedBy: 'guardian-a-uid',
      targetGuardian: 'guardian-b-uid',
      childId: 'child-123',
      familyId: 'family-123',
      custodyType: 'shared',
      blockedOperation: 'guardian_removal',
      blockedAt: new Date('2024-01-15T10:00:00Z'),
      metadata: {
        currentRole: 'co-parent',
        currentPermissions: 'full',
      },
    }

    it('accepts valid guardian removal attempt', () => {
      const result = guardianRemovalAttemptSchema.parse(validAttempt)
      expect(result.id).toBe('attempt-123')
      expect(result.attemptedBy).toBe('guardian-a-uid')
      expect(result.targetGuardian).toBe('guardian-b-uid')
      expect(result.blockedOperation).toBe('guardian_removal')
    })

    it('accepts attempt with shared custody', () => {
      const sharedAttempt = { ...validAttempt, custodyType: 'shared' as const }
      const result = guardianRemovalAttemptSchema.parse(sharedAttempt)
      expect(result.custodyType).toBe('shared')
    })

    it('accepts attempt with complex custody', () => {
      const complexAttempt = { ...validAttempt, custodyType: 'complex' as const }
      const result = guardianRemovalAttemptSchema.parse(complexAttempt)
      expect(result.custodyType).toBe('complex')
    })

    it('accepts role_downgrade operation', () => {
      const roleAttempt = {
        ...validAttempt,
        blockedOperation: 'role_downgrade' as const,
        metadata: { requestedRole: 'caregiver' as const },
      }
      const result = guardianRemovalAttemptSchema.parse(roleAttempt)
      expect(result.blockedOperation).toBe('role_downgrade')
    })

    it('accepts permission_downgrade operation', () => {
      const permAttempt = {
        ...validAttempt,
        blockedOperation: 'permission_downgrade' as const,
        metadata: { requestedPermissions: 'readonly' as const },
      }
      const result = guardianRemovalAttemptSchema.parse(permAttempt)
      expect(result.blockedOperation).toBe('permission_downgrade')
    })

    it('accepts attempt without metadata', () => {
      const { metadata: _, ...attemptWithoutMeta } = validAttempt
      const result = guardianRemovalAttemptSchema.parse(attemptWithoutMeta)
      expect(result.metadata).toBeUndefined()
    })

    it('rejects empty id', () => {
      const invalidAttempt = { ...validAttempt, id: '' }
      expect(() => guardianRemovalAttemptSchema.parse(invalidAttempt)).toThrow()
    })

    it('rejects empty attemptedBy', () => {
      const invalidAttempt = { ...validAttempt, attemptedBy: '' }
      expect(() => guardianRemovalAttemptSchema.parse(invalidAttempt)).toThrow()
    })

    it('rejects empty targetGuardian', () => {
      const invalidAttempt = { ...validAttempt, targetGuardian: '' }
      expect(() => guardianRemovalAttemptSchema.parse(invalidAttempt)).toThrow()
    })

    it('rejects id exceeding max length', () => {
      const longId = 'a'.repeat(REMOVAL_AUDIT_FIELD_LIMITS.guardianId + 1)
      const invalidAttempt = { ...validAttempt, id: longId }
      expect(() => guardianRemovalAttemptSchema.parse(invalidAttempt)).toThrow()
    })

    it('rejects invalid custody type', () => {
      const invalidAttempt = { ...validAttempt, custodyType: 'sole' }
      expect(() => guardianRemovalAttemptSchema.parse(invalidAttempt)).toThrow()
    })

    it('rejects invalid blocked operation', () => {
      const invalidAttempt = { ...validAttempt, blockedOperation: 'delete' }
      expect(() => guardianRemovalAttemptSchema.parse(invalidAttempt)).toThrow()
    })

    it('rejects invalid date', () => {
      const invalidAttempt = { ...validAttempt, blockedAt: 'not-a-date' }
      expect(() => guardianRemovalAttemptSchema.parse(invalidAttempt)).toThrow()
    })
  })

  // ============================================================================
  // Input Schema Tests
  // ============================================================================

  describe('attemptGuardianRemovalInputSchema', () => {
    const validInput = {
      familyId: 'family-123',
      targetGuardianId: 'guardian-b-uid',
      childId: 'child-123',
    }

    it('accepts valid input', () => {
      const result = attemptGuardianRemovalInputSchema.parse(validInput)
      expect(result.familyId).toBe('family-123')
      expect(result.targetGuardianId).toBe('guardian-b-uid')
      expect(result.childId).toBe('child-123')
    })

    it('rejects empty familyId', () => {
      expect(() =>
        attemptGuardianRemovalInputSchema.parse({ ...validInput, familyId: '' })
      ).toThrow()
    })

    it('rejects empty targetGuardianId', () => {
      expect(() =>
        attemptGuardianRemovalInputSchema.parse({ ...validInput, targetGuardianId: '' })
      ).toThrow()
    })

    it('rejects empty childId', () => {
      expect(() =>
        attemptGuardianRemovalInputSchema.parse({ ...validInput, childId: '' })
      ).toThrow()
    })
  })

  describe('attemptRoleChangeInputSchema', () => {
    const validInput = {
      familyId: 'family-123',
      targetGuardianId: 'guardian-b-uid',
      childId: 'child-123',
      newRole: 'caregiver' as const,
    }

    it('accepts valid input', () => {
      const result = attemptRoleChangeInputSchema.parse(validInput)
      expect(result.newRole).toBe('caregiver')
    })

    it('accepts co-parent role', () => {
      const result = attemptRoleChangeInputSchema.parse({ ...validInput, newRole: 'co-parent' })
      expect(result.newRole).toBe('co-parent')
    })

    it('rejects invalid role', () => {
      expect(() =>
        attemptRoleChangeInputSchema.parse({ ...validInput, newRole: 'admin' })
      ).toThrow()
    })
  })

  describe('attemptPermissionChangeInputSchema', () => {
    const validInput = {
      familyId: 'family-123',
      targetGuardianId: 'guardian-b-uid',
      childId: 'child-123',
      newPermissions: 'readonly' as const,
    }

    it('accepts valid input', () => {
      const result = attemptPermissionChangeInputSchema.parse(validInput)
      expect(result.newPermissions).toBe('readonly')
    })

    it('accepts full permissions', () => {
      const result = attemptPermissionChangeInputSchema.parse({
        ...validInput,
        newPermissions: 'full',
      })
      expect(result.newPermissions).toBe('full')
    })

    it('rejects invalid permissions', () => {
      expect(() =>
        attemptPermissionChangeInputSchema.parse({ ...validInput, newPermissions: 'write' })
      ).toThrow()
    })
  })

  // ============================================================================
  // Result Schema Tests
  // ============================================================================

  describe('removalBlockedResultSchema', () => {
    const validBlockedResult: RemovalBlockedResult = {
      blocked: true,
      reason: 'guardian_removal',
      message: 'Test message',
      dissolutionPath: '/family/dissolution',
      legalPetitionPath: '/legal-petition',
      guidance: {
        dissolutionExplanation: 'Dissolution info',
        legalPetitionExplanation: 'Legal info',
        courtOrderExplanation: 'Court info',
      },
    }

    it('accepts valid blocked result', () => {
      const result = removalBlockedResultSchema.parse(validBlockedResult)
      expect(result.blocked).toBe(true)
      expect(result.reason).toBe('guardian_removal')
    })

    it('accepts all blocked operation reasons', () => {
      const reasons: BlockedOperationType[] = [
        'guardian_removal',
        'role_downgrade',
        'permission_downgrade',
      ]
      for (const reason of reasons) {
        const result = removalBlockedResultSchema.parse({ ...validBlockedResult, reason })
        expect(result.reason).toBe(reason)
      }
    })

    it('requires blocked to be true', () => {
      expect(() =>
        removalBlockedResultSchema.parse({ ...validBlockedResult, blocked: false })
      ).toThrow()
    })

    it('requires guidance object', () => {
      const { guidance: _, ...withoutGuidance } = validBlockedResult
      expect(() => removalBlockedResultSchema.parse(withoutGuidance)).toThrow()
    })
  })

  describe('removalAllowedResultSchema', () => {
    it('accepts valid allowed result', () => {
      const result = removalAllowedResultSchema.parse({ blocked: false, allowed: true })
      expect(result.blocked).toBe(false)
      expect(result.allowed).toBe(true)
    })

    it('requires blocked to be false', () => {
      expect(() => removalAllowedResultSchema.parse({ blocked: true, allowed: true })).toThrow()
    })

    it('requires allowed to be true', () => {
      expect(() => removalAllowedResultSchema.parse({ blocked: false, allowed: false })).toThrow()
    })
  })

  describe('guardianRemovalResultSchema (discriminated union)', () => {
    it('accepts blocked result', () => {
      const blockedResult = createBlockedResult('guardian_removal')
      const result = guardianRemovalResultSchema.parse(blockedResult)
      expect(result.blocked).toBe(true)
    })

    it('accepts allowed result', () => {
      const allowedResult = createAllowedResult()
      const result = guardianRemovalResultSchema.parse(allowedResult)
      expect(result.blocked).toBe(false)
    })

    it('discriminates based on blocked field', () => {
      const blockedResult = guardianRemovalResultSchema.parse(createBlockedResult('role_downgrade'))
      const allowedResult = guardianRemovalResultSchema.parse(createAllowedResult())

      if (blockedResult.blocked) {
        expect(blockedResult.reason).toBe('role_downgrade')
      }
      if (!allowedResult.blocked) {
        expect(allowedResult.allowed).toBe(true)
      }
    })
  })

  // ============================================================================
  // Helper Function Tests
  // ============================================================================

  describe('Helper Functions', () => {
    describe('requiresRemovalProtection', () => {
      it('returns true for shared custody', () => {
        expect(requiresRemovalProtection('shared')).toBe(true)
      })

      it('returns true for complex custody', () => {
        expect(requiresRemovalProtection('complex')).toBe(true)
      })

      it('returns false for sole custody', () => {
        expect(requiresRemovalProtection('sole')).toBe(false)
      })

      it('returns false for null', () => {
        expect(requiresRemovalProtection(null)).toBe(false)
      })

      it('returns false for undefined', () => {
        expect(requiresRemovalProtection(undefined)).toBe(false)
      })

      it('returns false for invalid string', () => {
        expect(requiresRemovalProtection('invalid')).toBe(false)
      })
    })

    describe('isRoleDowngrade', () => {
      it('detects co-parent -> caregiver as downgrade', () => {
        expect(isRoleDowngrade('co-parent', 'caregiver')).toBe(true)
      })

      it('detects primary -> caregiver as downgrade', () => {
        expect(isRoleDowngrade('primary', 'caregiver')).toBe(true)
      })

      it('does not consider primary -> co-parent as downgrade', () => {
        expect(isRoleDowngrade('primary', 'co-parent')).toBe(false)
      })

      it('does not consider co-parent -> primary as downgrade', () => {
        expect(isRoleDowngrade('co-parent', 'primary')).toBe(false)
      })

      it('does not consider caregiver -> co-parent as downgrade', () => {
        expect(isRoleDowngrade('caregiver', 'co-parent')).toBe(false)
      })

      it('does not consider same role as downgrade', () => {
        expect(isRoleDowngrade('co-parent', 'co-parent')).toBe(false)
      })
    })

    describe('isPermissionDowngrade', () => {
      it('detects full -> readonly as downgrade', () => {
        expect(isPermissionDowngrade('full', 'readonly')).toBe(true)
      })

      it('does not consider readonly -> full as downgrade', () => {
        expect(isPermissionDowngrade('readonly', 'full')).toBe(false)
      })

      it('does not consider same permissions as downgrade', () => {
        expect(isPermissionDowngrade('full', 'full')).toBe(false)
        expect(isPermissionDowngrade('readonly', 'readonly')).toBe(false)
      })
    })

    describe('createBlockedResult', () => {
      it('creates blocked result for guardian_removal', () => {
        const result = createBlockedResult('guardian_removal')
        expect(result.blocked).toBe(true)
        expect(result.reason).toBe('guardian_removal')
        expect(result.message).toBe(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.removalBlocked)
      })

      it('creates blocked result for role_downgrade', () => {
        const result = createBlockedResult('role_downgrade')
        expect(result.reason).toBe('role_downgrade')
        expect(result.message).toBe(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.roleChangeBlocked)
      })

      it('creates blocked result for permission_downgrade', () => {
        const result = createBlockedResult('permission_downgrade')
        expect(result.reason).toBe('permission_downgrade')
        expect(result.message).toBe(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.permissionChangeBlocked)
      })

      it('allows custom message', () => {
        const customMessage = 'Custom blocked message'
        const result = createBlockedResult('guardian_removal', customMessage)
        expect(result.message).toBe(customMessage)
      })

      it('includes dissolution path', () => {
        const result = createBlockedResult('guardian_removal')
        expect(result.dissolutionPath).toBe('/family/dissolution')
      })

      it('includes legal petition path', () => {
        const result = createBlockedResult('guardian_removal')
        expect(result.legalPetitionPath).toBe('/legal-petition')
      })

      it('includes all guidance fields', () => {
        const result = createBlockedResult('guardian_removal')
        expect(result.guidance.dissolutionExplanation).toBeTruthy()
        expect(result.guidance.legalPetitionExplanation).toBeTruthy()
        expect(result.guidance.courtOrderExplanation).toBeTruthy()
      })
    })

    describe('createAllowedResult', () => {
      it('creates allowed result', () => {
        const result = createAllowedResult()
        expect(result.blocked).toBe(false)
        expect(result.allowed).toBe(true)
      })
    })

    describe('getRemovalBlockedExplanation', () => {
      it('returns title', () => {
        const explanation = getRemovalBlockedExplanation()
        expect(explanation.title).toBeTruthy()
        expect(explanation.title).toContain('Cannot Remove')
      })

      it('returns message', () => {
        const explanation = getRemovalBlockedExplanation()
        expect(explanation.message).toBeTruthy()
      })

      it('returns options array', () => {
        const explanation = getRemovalBlockedExplanation()
        expect(explanation.options).toBeInstanceOf(Array)
        expect(explanation.options.length).toBeGreaterThanOrEqual(2)
      })

      it('includes dissolution option', () => {
        const explanation = getRemovalBlockedExplanation()
        const dissolutionOption = explanation.options.find((opt) =>
          opt.path.includes('dissolution')
        )
        expect(dissolutionOption).toBeTruthy()
        expect(dissolutionOption?.label).toBeTruthy()
        expect(dissolutionOption?.description).toBeTruthy()
      })

      it('includes legal petition option', () => {
        const explanation = getRemovalBlockedExplanation()
        const legalOption = explanation.options.find((opt) => opt.path.includes('legal'))
        expect(legalOption).toBeTruthy()
        expect(legalOption?.label).toBeTruthy()
        expect(legalOption?.description).toBeTruthy()
      })
    })

    describe('convertFirestoreToGuardianRemovalAttempt', () => {
      it('converts Firestore document to domain type', () => {
        const firestoreDoc = {
          id: 'attempt-123',
          attemptedBy: 'guardian-a',
          targetGuardian: 'guardian-b',
          childId: 'child-123',
          familyId: 'family-123',
          custodyType: 'shared' as const,
          blockedOperation: 'guardian_removal' as const,
          blockedAt: { toDate: () => new Date('2024-01-15T10:00:00Z') },
          metadata: { currentRole: 'co-parent' as const },
        }

        const result = convertFirestoreToGuardianRemovalAttempt(firestoreDoc)
        expect(result.id).toBe('attempt-123')
        expect(result.blockedAt).toBeInstanceOf(Date)
        expect(result.blockedAt.toISOString()).toBe('2024-01-15T10:00:00.000Z')
      })
    })

    describe('safeParseGuardianRemovalAttempt', () => {
      it('returns parsed data for valid input', () => {
        const validData = {
          id: 'attempt-123',
          attemptedBy: 'guardian-a',
          targetGuardian: 'guardian-b',
          childId: 'child-123',
          familyId: 'family-123',
          custodyType: 'shared',
          blockedOperation: 'guardian_removal',
          blockedAt: new Date(),
        }
        const result = safeParseGuardianRemovalAttempt(validData)
        expect(result).not.toBeNull()
        expect(result?.id).toBe('attempt-123')
      })

      it('returns null for invalid input', () => {
        const invalidData = { id: '' }
        const result = safeParseGuardianRemovalAttempt(invalidData)
        expect(result).toBeNull()
      })
    })

    describe('validateAttemptGuardianRemovalInput', () => {
      it('validates correct input', () => {
        const input = {
          familyId: 'family-123',
          targetGuardianId: 'guardian-b',
          childId: 'child-123',
        }
        const result = validateAttemptGuardianRemovalInput(input)
        expect(result.familyId).toBe('family-123')
      })

      it('throws for invalid input', () => {
        expect(() => validateAttemptGuardianRemovalInput({ familyId: '' })).toThrow()
      })
    })

    describe('validateAttemptRoleChangeInput', () => {
      it('validates correct input', () => {
        const input = {
          familyId: 'family-123',
          targetGuardianId: 'guardian-b',
          childId: 'child-123',
          newRole: 'caregiver',
        }
        const result = validateAttemptRoleChangeInput(input)
        expect(result.newRole).toBe('caregiver')
      })

      it('throws for invalid role', () => {
        const input = {
          familyId: 'family-123',
          targetGuardianId: 'guardian-b',
          childId: 'child-123',
          newRole: 'invalid',
        }
        expect(() => validateAttemptRoleChangeInput(input)).toThrow()
      })
    })

    describe('validateAttemptPermissionChangeInput', () => {
      it('validates correct input', () => {
        const input = {
          familyId: 'family-123',
          targetGuardianId: 'guardian-b',
          childId: 'child-123',
          newPermissions: 'readonly',
        }
        const result = validateAttemptPermissionChangeInput(input)
        expect(result.newPermissions).toBe('readonly')
      })

      it('throws for invalid permissions', () => {
        const input = {
          familyId: 'family-123',
          targetGuardianId: 'guardian-b',
          childId: 'child-123',
          newPermissions: 'invalid',
        }
        expect(() => validateAttemptPermissionChangeInput(input)).toThrow()
      })
    })
  })

  // ============================================================================
  // Firestore Schema Tests
  // ============================================================================

  describe('guardianRemovalAttemptFirestoreSchema', () => {
    const validFirestoreAttempt = {
      id: 'attempt-123',
      attemptedBy: 'guardian-a-uid',
      targetGuardian: 'guardian-b-uid',
      childId: 'child-123',
      familyId: 'family-123',
      custodyType: 'shared' as const,
      blockedOperation: 'guardian_removal' as const,
      blockedAt: { toDate: () => new Date() },
    }

    it('accepts valid Firestore document', () => {
      const result = guardianRemovalAttemptFirestoreSchema.parse(validFirestoreAttempt)
      expect(result.id).toBe('attempt-123')
    })

    it('accepts document with metadata', () => {
      const withMetadata = {
        ...validFirestoreAttempt,
        metadata: {
          requestedRole: 'caregiver' as const,
          currentRole: 'co-parent' as const,
        },
      }
      const result = guardianRemovalAttemptFirestoreSchema.parse(withMetadata)
      expect(result.metadata?.requestedRole).toBe('caregiver')
    })

    it('rejects document without toDate function', () => {
      const invalidDoc = { ...validFirestoreAttempt, blockedAt: '2024-01-15' }
      expect(() => guardianRemovalAttemptFirestoreSchema.parse(invalidDoc)).toThrow()
    })
  })
})
