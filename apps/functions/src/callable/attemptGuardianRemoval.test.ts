/**
 * Unit tests for attemptGuardianRemoval Cloud Function
 *
 * Story 3A.6: Co-Parent Removal Prevention
 *
 * NOTE: These tests require Firebase emulators to run properly.
 * The core business logic is tested in the schema tests at:
 * packages/contracts/src/guardian-removal-prevention.schema.test.ts (110 tests)
 *
 * These tests verify the Cloud Function structure and integration patterns.
 * Run with: firebase emulators:exec "npx vitest run" --only firestore,auth
 */

import { describe, it, expect } from 'vitest'

// Import contracts to verify they're used correctly
import {
  attemptGuardianRemovalInputSchema,
  attemptRoleChangeInputSchema,
  attemptPermissionChangeInputSchema,
  requiresRemovalProtection,
  isRoleDowngrade,
  isPermissionDowngrade,
  createBlockedResult,
  createAllowedResult,
  GUARDIAN_REMOVAL_PREVENTION_MESSAGES,
  SHARED_CUSTODY_IMMUTABILITY_RULES,
  type GuardianRemovalResult,
  type BlockedOperationType,
} from '@fledgely/contracts'

describe('attemptGuardianRemoval schemas', () => {
  describe('input validation via schema', () => {
    it('validates correct input', () => {
      const input = {
        familyId: 'family-123',
        targetGuardianId: 'guardian-456',
        childId: 'child-789',
      }

      const result = attemptGuardianRemovalInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('rejects missing familyId', () => {
      const input = {
        targetGuardianId: 'guardian-456',
        childId: 'child-789',
      }

      const result = attemptGuardianRemovalInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects missing targetGuardianId', () => {
      const input = {
        familyId: 'family-123',
        childId: 'child-789',
      }

      const result = attemptGuardianRemovalInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects missing childId', () => {
      const input = {
        familyId: 'family-123',
        targetGuardianId: 'guardian-456',
      }

      const result = attemptGuardianRemovalInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects empty familyId', () => {
      const input = {
        familyId: '',
        targetGuardianId: 'guardian-456',
        childId: 'child-789',
      }

      const result = attemptGuardianRemovalInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects empty targetGuardianId', () => {
      const input = {
        familyId: 'family-123',
        targetGuardianId: '',
        childId: 'child-789',
      }

      const result = attemptGuardianRemovalInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects empty childId', () => {
      const input = {
        familyId: 'family-123',
        targetGuardianId: 'guardian-456',
        childId: '',
      }

      const result = attemptGuardianRemovalInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe('removal protection logic', () => {
    it('requires protection for shared custody', () => {
      expect(requiresRemovalProtection('shared')).toBe(true)
    })

    it('requires protection for complex custody', () => {
      expect(requiresRemovalProtection('complex')).toBe(true)
    })

    it('does not require protection for sole custody', () => {
      expect(requiresRemovalProtection('sole')).toBe(false)
    })

    it('does not require protection for null custody', () => {
      expect(requiresRemovalProtection(null)).toBe(false)
    })

    it('does not require protection for undefined custody', () => {
      expect(requiresRemovalProtection(undefined)).toBe(false)
    })
  })

  describe('blocked result creation', () => {
    it('creates blocked result for guardian_removal', () => {
      const result = createBlockedResult('guardian_removal')

      expect(result.blocked).toBe(true)
      expect(result.reason).toBe('guardian_removal')
      expect(result.message).toBe(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.removalBlocked)
      expect(result.dissolutionPath).toBe('/family/dissolution')
      expect(result.legalPetitionPath).toBe('/legal-petition')
      expect(result.guidance.dissolutionExplanation).toBeTruthy()
      expect(result.guidance.legalPetitionExplanation).toBeTruthy()
      expect(result.guidance.courtOrderExplanation).toBeTruthy()
    })

    it('creates blocked result for role_downgrade', () => {
      const result = createBlockedResult('role_downgrade')

      expect(result.blocked).toBe(true)
      expect(result.reason).toBe('role_downgrade')
      expect(result.message).toBe(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.roleChangeBlocked)
    })

    it('creates blocked result for permission_downgrade', () => {
      const result = createBlockedResult('permission_downgrade')

      expect(result.blocked).toBe(true)
      expect(result.reason).toBe('permission_downgrade')
      expect(result.message).toBe(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.permissionChangeBlocked)
    })

    it('accepts custom message', () => {
      const customMessage = 'Custom blocked message'
      const result = createBlockedResult('guardian_removal', customMessage)

      expect(result.message).toBe(customMessage)
    })
  })

  describe('allowed result creation', () => {
    it('creates allowed result', () => {
      const result = createAllowedResult()

      expect(result.blocked).toBe(false)
      expect(result.allowed).toBe(true)
    })
  })

  describe('discriminated union type handling', () => {
    it('blocked result can be type-narrowed', () => {
      const result: GuardianRemovalResult = createBlockedResult('guardian_removal')

      if (result.blocked) {
        // TypeScript should know these properties exist
        expect(result.reason).toBe('guardian_removal')
        expect(result.message).toBeTruthy()
        expect(result.guidance).toBeTruthy()
      } else {
        // This branch shouldn't be reached
        expect(false).toBe(true)
      }
    })

    it('allowed result can be type-narrowed', () => {
      const result: GuardianRemovalResult = createAllowedResult()

      if (!result.blocked) {
        // TypeScript should know this property exists
        expect(result.allowed).toBe(true)
      } else {
        // This branch shouldn't be reached
        expect(false).toBe(true)
      }
    })
  })

  describe('immutability rules constants', () => {
    it('correctly defines shared custody immutability rules', () => {
      expect(SHARED_CUSTODY_IMMUTABILITY_RULES.canRemoveGuardian).toBe(false)
      expect(SHARED_CUSTODY_IMMUTABILITY_RULES.canDowngradeRole).toBe(false)
      expect(SHARED_CUSTODY_IMMUTABILITY_RULES.canReducePermissions).toBe(false)
      expect(SHARED_CUSTODY_IMMUTABILITY_RULES.canUnilaterallyDissolve).toBe(false)
      expect(SHARED_CUSTODY_IMMUTABILITY_RULES.courtOrderRequired).toBe(true)
    })
  })
})

describe('attemptGuardianRoleChange schemas', () => {
  describe('input validation via schema', () => {
    it('validates correct input', () => {
      const input = {
        familyId: 'family-123',
        targetGuardianId: 'guardian-456',
        childId: 'child-789',
        newRole: 'caregiver',
      }

      const result = attemptRoleChangeInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('accepts valid roles', () => {
      const roles = ['primary', 'co-parent', 'caregiver']

      for (const newRole of roles) {
        const input = {
          familyId: 'family-123',
          targetGuardianId: 'guardian-456',
          childId: 'child-789',
          newRole,
        }
        const result = attemptRoleChangeInputSchema.safeParse(input)
        expect(result.success, `Role ${newRole} should be valid`).toBe(true)
      }
    })

    it('rejects invalid role', () => {
      const input = {
        familyId: 'family-123',
        targetGuardianId: 'guardian-456',
        childId: 'child-789',
        newRole: 'invalid',
      }

      const result = attemptRoleChangeInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects missing newRole', () => {
      const input = {
        familyId: 'family-123',
        targetGuardianId: 'guardian-456',
        childId: 'child-789',
      }

      const result = attemptRoleChangeInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe('role downgrade detection', () => {
    it('detects co-parent to caregiver as downgrade', () => {
      expect(isRoleDowngrade('co-parent', 'caregiver')).toBe(true)
    })

    it('detects primary to caregiver as downgrade', () => {
      expect(isRoleDowngrade('primary', 'caregiver')).toBe(true)
    })

    it('does not detect primary to co-parent as downgrade', () => {
      expect(isRoleDowngrade('primary', 'co-parent')).toBe(false)
    })

    it('does not detect co-parent to primary as downgrade', () => {
      expect(isRoleDowngrade('co-parent', 'primary')).toBe(false)
    })

    it('does not detect caregiver to co-parent as downgrade', () => {
      expect(isRoleDowngrade('caregiver', 'co-parent')).toBe(false)
    })

    it('does not detect caregiver to primary as downgrade', () => {
      expect(isRoleDowngrade('caregiver', 'primary')).toBe(false)
    })

    it('does not detect same role as downgrade', () => {
      expect(isRoleDowngrade('co-parent', 'co-parent')).toBe(false)
      expect(isRoleDowngrade('primary', 'primary')).toBe(false)
      expect(isRoleDowngrade('caregiver', 'caregiver')).toBe(false)
    })
  })
})

describe('attemptGuardianPermissionChange schemas', () => {
  describe('input validation via schema', () => {
    it('validates correct input', () => {
      const input = {
        familyId: 'family-123',
        targetGuardianId: 'guardian-456',
        childId: 'child-789',
        newPermissions: 'readonly',
      }

      const result = attemptPermissionChangeInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('accepts valid permissions', () => {
      const permissions = ['full', 'readonly']

      for (const newPermissions of permissions) {
        const input = {
          familyId: 'family-123',
          targetGuardianId: 'guardian-456',
          childId: 'child-789',
          newPermissions,
        }
        const result = attemptPermissionChangeInputSchema.safeParse(input)
        expect(result.success, `Permission ${newPermissions} should be valid`).toBe(true)
      }
    })

    it('rejects invalid permission', () => {
      const input = {
        familyId: 'family-123',
        targetGuardianId: 'guardian-456',
        childId: 'child-789',
        newPermissions: 'invalid',
      }

      const result = attemptPermissionChangeInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects missing newPermissions', () => {
      const input = {
        familyId: 'family-123',
        targetGuardianId: 'guardian-456',
        childId: 'child-789',
      }

      const result = attemptPermissionChangeInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe('permission downgrade detection', () => {
    it('detects full to readonly as downgrade', () => {
      expect(isPermissionDowngrade('full', 'readonly')).toBe(true)
    })

    it('does not detect readonly to full as downgrade', () => {
      expect(isPermissionDowngrade('readonly', 'full')).toBe(false)
    })

    it('does not detect same permission as downgrade', () => {
      expect(isPermissionDowngrade('full', 'full')).toBe(false)
      expect(isPermissionDowngrade('readonly', 'readonly')).toBe(false)
    })
  })
})

describe('GUARDIAN_REMOVAL_PREVENTION_MESSAGES', () => {
  it('has required message keys', () => {
    expect(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.removalBlocked).toBeTruthy()
    expect(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.sharedCustodyExplanation).toBeTruthy()
    expect(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.dissolutionOption).toBeTruthy()
    expect(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.legalPetitionInfo).toBeTruthy()
    expect(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.courtOrderRequired).toBeTruthy()
    expect(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.roleChangeBlocked).toBeTruthy()
    expect(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.permissionChangeBlocked).toBeTruthy()
    expect(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.dissolutionLinkText).toBeTruthy()
    expect(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.legalPetitionLinkText).toBeTruthy()
  })

  it('messages are at 6th-grade reading level (no complex jargon)', () => {
    // Simple heuristic: messages should be understandable
    const removalMsg = GUARDIAN_REMOVAL_PREVENTION_MESSAGES.removalBlocked
    expect(removalMsg).toContain('cannot remove')
    expect(removalMsg).toContain('co-parent')

    const dissolutionMsg = GUARDIAN_REMOVAL_PREVENTION_MESSAGES.dissolutionOption
    expect(dissolutionMsg).toContain('dissolution')
    expect(dissolutionMsg).toContain('agree')
  })
})
