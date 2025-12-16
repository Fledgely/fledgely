import { describe, it, expect } from 'vitest'
import {
  // Schemas
  adminAuditActionTypeSchema,
  adminAuditEntrySchema,
  adminAuditEntryFirestoreSchema,
  createAdminAuditEntryInputSchema,
  guardianRemovalBlockedMetadataSchema,
  // Constants
  ADMIN_AUDIT_FIELD_LIMITS,
  ADMIN_AUDIT_ACTION_LABELS,
  // Helper functions
  getAdminAuditActionLabel,
  convertFirestoreToAdminAuditEntry,
  safeParseAdminAuditEntry,
  validateCreateAdminAuditEntryInput,
  createGuardianRemovalBlockedAuditInput,
  // Types
  type AdminAuditActionType,
  type AdminAuditEntry,
} from './admin-audit.schema'

describe('Admin Audit Schema', () => {
  // ============================================================================
  // Constants Tests
  // ============================================================================

  describe('Constants', () => {
    describe('ADMIN_AUDIT_FIELD_LIMITS', () => {
      it('has reasonable user ID limit', () => {
        expect(ADMIN_AUDIT_FIELD_LIMITS.userId).toBe(128)
      })

      it('has reasonable family ID limit', () => {
        expect(ADMIN_AUDIT_FIELD_LIMITS.familyId).toBe(128)
      })

      it('has reasonable child ID limit', () => {
        expect(ADMIN_AUDIT_FIELD_LIMITS.childId).toBe(128)
      })

      it('has notes limit', () => {
        expect(ADMIN_AUDIT_FIELD_LIMITS.notes).toBe(2000)
      })
    })

    describe('ADMIN_AUDIT_ACTION_LABELS', () => {
      it('has label for guardian_removal_blocked', () => {
        expect(ADMIN_AUDIT_ACTION_LABELS.guardian_removal_blocked).toBeTruthy()
        expect(ADMIN_AUDIT_ACTION_LABELS.guardian_removal_blocked).toContain('blocked')
      })

      it('has label for role_change_blocked', () => {
        expect(ADMIN_AUDIT_ACTION_LABELS.role_change_blocked).toBeTruthy()
      })

      it('has label for permission_change_blocked', () => {
        expect(ADMIN_AUDIT_ACTION_LABELS.permission_change_blocked).toBeTruthy()
      })

      it('has label for legal_petition_submitted', () => {
        expect(ADMIN_AUDIT_ACTION_LABELS.legal_petition_submitted).toBeTruthy()
      })

      it('has label for safety_request_reviewed', () => {
        expect(ADMIN_AUDIT_ACTION_LABELS.safety_request_reviewed).toBeTruthy()
      })
    })
  })

  // ============================================================================
  // Enum Schema Tests
  // ============================================================================

  describe('adminAuditActionTypeSchema', () => {
    const validActions: AdminAuditActionType[] = [
      'guardian_removal_blocked',
      'role_change_blocked',
      'permission_change_blocked',
      'legal_petition_submitted',
      'legal_petition_reviewed',
      'legal_petition_verified',
      'legal_petition_denied',
      'safety_request_reviewed',
      'safety_action_taken',
    ]

    it.each(validActions)('accepts %s', (action) => {
      expect(adminAuditActionTypeSchema.parse(action)).toBe(action)
    })

    it('rejects invalid action', () => {
      expect(() => adminAuditActionTypeSchema.parse('invalid_action')).toThrow()
    })
  })

  // ============================================================================
  // adminAuditEntrySchema Tests
  // ============================================================================

  describe('adminAuditEntrySchema', () => {
    const validEntry: AdminAuditEntry = {
      id: 'audit-123',
      action: 'guardian_removal_blocked',
      triggeredBy: 'guardian-a-uid',
      familyId: 'family-123',
      childId: 'child-123',
      occurredAt: new Date('2024-01-15T10:00:00Z'),
      metadata: {
        targetGuardian: 'guardian-b-uid',
        custodyType: 'shared',
      },
    }

    it('accepts valid admin audit entry', () => {
      const result = adminAuditEntrySchema.parse(validEntry)
      expect(result.id).toBe('audit-123')
      expect(result.action).toBe('guardian_removal_blocked')
    })

    it('accepts entry without optional fields', () => {
      const minimalEntry = {
        id: 'audit-123',
        action: 'guardian_removal_blocked' as const,
        triggeredBy: 'guardian-a-uid',
        occurredAt: new Date(),
      }
      const result = adminAuditEntrySchema.parse(minimalEntry)
      expect(result.familyId).toBeUndefined()
      expect(result.childId).toBeUndefined()
      expect(result.metadata).toBeUndefined()
    })

    it('accepts all valid action types', () => {
      const actions: AdminAuditActionType[] = [
        'guardian_removal_blocked',
        'role_change_blocked',
        'permission_change_blocked',
      ]
      for (const action of actions) {
        const entry = { ...validEntry, action }
        const result = adminAuditEntrySchema.parse(entry)
        expect(result.action).toBe(action)
      }
    })

    it('rejects empty id', () => {
      expect(() => adminAuditEntrySchema.parse({ ...validEntry, id: '' })).toThrow()
    })

    it('rejects empty triggeredBy', () => {
      expect(() => adminAuditEntrySchema.parse({ ...validEntry, triggeredBy: '' })).toThrow()
    })

    it('rejects id exceeding max length', () => {
      const longId = 'a'.repeat(ADMIN_AUDIT_FIELD_LIMITS.userId + 1)
      expect(() => adminAuditEntrySchema.parse({ ...validEntry, id: longId })).toThrow()
    })

    it('rejects invalid date', () => {
      expect(() => adminAuditEntrySchema.parse({ ...validEntry, occurredAt: 'invalid' })).toThrow()
    })
  })

  // ============================================================================
  // Firestore Schema Tests
  // ============================================================================

  describe('adminAuditEntryFirestoreSchema', () => {
    const validFirestoreEntry = {
      id: 'audit-123',
      action: 'guardian_removal_blocked' as const,
      triggeredBy: 'guardian-a-uid',
      familyId: 'family-123',
      occurredAt: { toDate: () => new Date('2024-01-15T10:00:00Z') },
    }

    it('accepts valid Firestore document', () => {
      const result = adminAuditEntryFirestoreSchema.parse(validFirestoreEntry)
      expect(result.id).toBe('audit-123')
    })

    it('accepts document with metadata', () => {
      const withMetadata = {
        ...validFirestoreEntry,
        metadata: { targetGuardian: 'guardian-b' },
      }
      const result = adminAuditEntryFirestoreSchema.parse(withMetadata)
      expect(result.metadata?.targetGuardian).toBe('guardian-b')
    })

    it('rejects document without toDate function', () => {
      const invalidDoc = { ...validFirestoreEntry, occurredAt: '2024-01-15' }
      expect(() => adminAuditEntryFirestoreSchema.parse(invalidDoc)).toThrow()
    })
  })

  // ============================================================================
  // Input Schema Tests
  // ============================================================================

  describe('createAdminAuditEntryInputSchema', () => {
    const validInput = {
      action: 'guardian_removal_blocked' as const,
      triggeredBy: 'guardian-a-uid',
      familyId: 'family-123',
      childId: 'child-123',
    }

    it('accepts valid input', () => {
      const result = createAdminAuditEntryInputSchema.parse(validInput)
      expect(result.action).toBe('guardian_removal_blocked')
    })

    it('accepts input without optional fields', () => {
      const minimalInput = {
        action: 'guardian_removal_blocked' as const,
        triggeredBy: 'guardian-a-uid',
      }
      const result = createAdminAuditEntryInputSchema.parse(minimalInput)
      expect(result.familyId).toBeUndefined()
    })

    it('accepts input with metadata', () => {
      const withMetadata = {
        ...validInput,
        metadata: { key: 'value' },
      }
      const result = createAdminAuditEntryInputSchema.parse(withMetadata)
      expect(result.metadata?.key).toBe('value')
    })

    it('rejects empty triggeredBy', () => {
      expect(() =>
        createAdminAuditEntryInputSchema.parse({ ...validInput, triggeredBy: '' })
      ).toThrow()
    })
  })

  // ============================================================================
  // Metadata Schema Tests
  // ============================================================================

  describe('guardianRemovalBlockedMetadataSchema', () => {
    const validMetadata = {
      targetGuardian: 'guardian-b-uid',
      custodyType: 'shared' as const,
      blockedOperation: 'guardian_removal' as const,
    }

    it('accepts valid metadata', () => {
      const result = guardianRemovalBlockedMetadataSchema.parse(validMetadata)
      expect(result.targetGuardian).toBe('guardian-b-uid')
      expect(result.custodyType).toBe('shared')
    })

    it('accepts complex custody type', () => {
      const complexMeta = { ...validMetadata, custodyType: 'complex' as const }
      const result = guardianRemovalBlockedMetadataSchema.parse(complexMeta)
      expect(result.custodyType).toBe('complex')
    })

    it('accepts all blocked operation types', () => {
      const operations = ['guardian_removal', 'role_downgrade', 'permission_downgrade'] as const
      for (const op of operations) {
        const meta = { ...validMetadata, blockedOperation: op }
        const result = guardianRemovalBlockedMetadataSchema.parse(meta)
        expect(result.blockedOperation).toBe(op)
      }
    })

    it('accepts optional requestedChange', () => {
      const withChange = { ...validMetadata, requestedChange: 'caregiver' }
      const result = guardianRemovalBlockedMetadataSchema.parse(withChange)
      expect(result.requestedChange).toBe('caregiver')
    })

    it('rejects invalid custody type', () => {
      expect(() =>
        guardianRemovalBlockedMetadataSchema.parse({ ...validMetadata, custodyType: 'sole' })
      ).toThrow()
    })

    it('rejects invalid blocked operation', () => {
      expect(() =>
        guardianRemovalBlockedMetadataSchema.parse({ ...validMetadata, blockedOperation: 'delete' })
      ).toThrow()
    })
  })

  // ============================================================================
  // Helper Function Tests
  // ============================================================================

  describe('Helper Functions', () => {
    describe('getAdminAuditActionLabel', () => {
      it('returns label for guardian_removal_blocked', () => {
        const label = getAdminAuditActionLabel('guardian_removal_blocked')
        expect(label).toBeTruthy()
        expect(label).toContain('Guardian')
      })

      it('returns label for role_change_blocked', () => {
        const label = getAdminAuditActionLabel('role_change_blocked')
        expect(label).toBeTruthy()
        expect(label).toContain('Role')
      })

      it('returns label for all action types', () => {
        const actions: AdminAuditActionType[] = [
          'guardian_removal_blocked',
          'role_change_blocked',
          'permission_change_blocked',
          'legal_petition_submitted',
          'legal_petition_reviewed',
          'legal_petition_verified',
          'legal_petition_denied',
          'safety_request_reviewed',
          'safety_action_taken',
        ]
        for (const action of actions) {
          const label = getAdminAuditActionLabel(action)
          expect(label).toBeTruthy()
          expect(typeof label).toBe('string')
        }
      })
    })

    describe('convertFirestoreToAdminAuditEntry', () => {
      it('converts Firestore document to domain type', () => {
        const firestoreDoc = {
          id: 'audit-123',
          action: 'guardian_removal_blocked' as const,
          triggeredBy: 'guardian-a',
          familyId: 'family-123',
          occurredAt: { toDate: () => new Date('2024-01-15T10:00:00Z') },
          metadata: { key: 'value' },
        }

        const result = convertFirestoreToAdminAuditEntry(firestoreDoc)
        expect(result.id).toBe('audit-123')
        expect(result.occurredAt).toBeInstanceOf(Date)
        expect(result.occurredAt.toISOString()).toBe('2024-01-15T10:00:00.000Z')
      })
    })

    describe('safeParseAdminAuditEntry', () => {
      it('returns parsed data for valid input', () => {
        const validData = {
          id: 'audit-123',
          action: 'guardian_removal_blocked',
          triggeredBy: 'guardian-a',
          occurredAt: new Date(),
        }
        const result = safeParseAdminAuditEntry(validData)
        expect(result).not.toBeNull()
        expect(result?.id).toBe('audit-123')
      })

      it('returns null for invalid input', () => {
        const invalidData = { id: '' }
        const result = safeParseAdminAuditEntry(invalidData)
        expect(result).toBeNull()
      })
    })

    describe('validateCreateAdminAuditEntryInput', () => {
      it('validates correct input', () => {
        const input = {
          action: 'guardian_removal_blocked' as const,
          triggeredBy: 'guardian-a',
        }
        const result = validateCreateAdminAuditEntryInput(input)
        expect(result.action).toBe('guardian_removal_blocked')
      })

      it('throws for invalid action', () => {
        const input = {
          action: 'invalid_action',
          triggeredBy: 'guardian-a',
        }
        expect(() => validateCreateAdminAuditEntryInput(input)).toThrow()
      })
    })

    describe('createGuardianRemovalBlockedAuditInput', () => {
      it('creates input for guardian_removal', () => {
        const result = createGuardianRemovalBlockedAuditInput(
          'guardian-a',
          'guardian-b',
          'family-123',
          'child-123',
          'shared',
          'guardian_removal'
        )
        expect(result.action).toBe('guardian_removal_blocked')
        expect(result.triggeredBy).toBe('guardian-a')
        expect(result.familyId).toBe('family-123')
        expect(result.childId).toBe('child-123')
        expect(result.metadata?.targetGuardian).toBe('guardian-b')
        expect(result.metadata?.custodyType).toBe('shared')
      })

      it('creates input for role_downgrade', () => {
        const result = createGuardianRemovalBlockedAuditInput(
          'guardian-a',
          'guardian-b',
          'family-123',
          'child-123',
          'shared',
          'role_downgrade'
        )
        expect(result.action).toBe('role_change_blocked')
      })

      it('creates input for permission_downgrade', () => {
        const result = createGuardianRemovalBlockedAuditInput(
          'guardian-a',
          'guardian-b',
          'family-123',
          'child-123',
          'complex',
          'permission_downgrade'
        )
        expect(result.action).toBe('permission_change_blocked')
        expect(result.metadata?.custodyType).toBe('complex')
      })

      it('produces valid input schema', () => {
        const result = createGuardianRemovalBlockedAuditInput(
          'guardian-a',
          'guardian-b',
          'family-123',
          'child-123',
          'shared',
          'guardian_removal'
        )
        // Should not throw
        const validated = createAdminAuditEntryInputSchema.parse(result)
        expect(validated.action).toBe('guardian_removal_blocked')
      })
    })
  })
})
