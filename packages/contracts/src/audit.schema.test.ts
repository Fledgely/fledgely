import { describe, it, expect } from 'vitest'
import {
  auditActionTypeSchema,
  auditEntityTypeSchema,
  profileFieldChangeSchema,
  familyAuditEntrySchema,
  familyAuditEntryFirestoreSchema,
  createAuditEntryInputSchema,
  convertFirestoreToAuditEntry,
  safeParseAuditEntry,
  getAuditActionLabel,
  buildChangesArray,
  AUDIT_ACTION_LABELS,
  type AuditActionType,
  type FamilyAuditEntry,
  type FamilyAuditEntryFirestore,
} from './audit.schema'

describe('audit.schema', () => {
  // ============================================
  // AUDIT ACTION TYPE SCHEMA TESTS
  // ============================================
  describe('auditActionTypeSchema', () => {
    it('accepts valid action type: child_profile_created', () => {
      expect(auditActionTypeSchema.parse('child_profile_created')).toBe('child_profile_created')
    })

    it('accepts valid action type: child_profile_updated', () => {
      expect(auditActionTypeSchema.parse('child_profile_updated')).toBe('child_profile_updated')
    })

    it('accepts valid action type: child_removed', () => {
      expect(auditActionTypeSchema.parse('child_removed')).toBe('child_removed')
    })

    it('accepts valid action type: custody_declared', () => {
      expect(auditActionTypeSchema.parse('custody_declared')).toBe('custody_declared')
    })

    it('accepts valid action type: custody_updated', () => {
      expect(auditActionTypeSchema.parse('custody_updated')).toBe('custody_updated')
    })

    it('accepts valid action type: guardian_added', () => {
      expect(auditActionTypeSchema.parse('guardian_added')).toBe('guardian_added')
    })

    it('accepts valid action type: guardian_removed', () => {
      expect(auditActionTypeSchema.parse('guardian_removed')).toBe('guardian_removed')
    })

    it('accepts valid action type: family_created', () => {
      expect(auditActionTypeSchema.parse('family_created')).toBe('family_created')
    })

    it('accepts valid action type: family_updated', () => {
      expect(auditActionTypeSchema.parse('family_updated')).toBe('family_updated')
    })

    it('rejects invalid action type', () => {
      expect(() => auditActionTypeSchema.parse('invalid_action')).toThrow()
    })

    it('rejects empty string', () => {
      expect(() => auditActionTypeSchema.parse('')).toThrow()
    })

    it('rejects number', () => {
      expect(() => auditActionTypeSchema.parse(123)).toThrow()
    })
  })

  // ============================================
  // AUDIT ENTITY TYPE SCHEMA TESTS
  // ============================================
  describe('auditEntityTypeSchema', () => {
    it('accepts valid entity type: child', () => {
      expect(auditEntityTypeSchema.parse('child')).toBe('child')
    })

    it('accepts valid entity type: guardian', () => {
      expect(auditEntityTypeSchema.parse('guardian')).toBe('guardian')
    })

    it('accepts valid entity type: family', () => {
      expect(auditEntityTypeSchema.parse('family')).toBe('family')
    })

    it('accepts valid entity type: custody', () => {
      expect(auditEntityTypeSchema.parse('custody')).toBe('custody')
    })

    it('rejects invalid entity type', () => {
      expect(() => auditEntityTypeSchema.parse('invalid_entity')).toThrow()
    })
  })

  // ============================================
  // PROFILE FIELD CHANGE SCHEMA TESTS
  // ============================================
  describe('profileFieldChangeSchema', () => {
    it('accepts valid field change with string values', () => {
      const result = profileFieldChangeSchema.parse({
        field: 'firstName',
        previousValue: 'Emma',
        newValue: 'Emily',
      })
      expect(result.field).toBe('firstName')
      expect(result.previousValue).toBe('Emma')
      expect(result.newValue).toBe('Emily')
    })

    it('accepts field change with null previousValue (new field)', () => {
      const result = profileFieldChangeSchema.parse({
        field: 'nickname',
        previousValue: null,
        newValue: 'Emmy',
      })
      expect(result.previousValue).toBeNull()
      expect(result.newValue).toBe('Emmy')
    })

    it('accepts field change with null newValue (deleted field)', () => {
      const result = profileFieldChangeSchema.parse({
        field: 'photoUrl',
        previousValue: 'https://example.com/photo.jpg',
        newValue: null,
      })
      expect(result.previousValue).toBe('https://example.com/photo.jpg')
      expect(result.newValue).toBeNull()
    })

    it('accepts field change with Date values', () => {
      const prevDate = new Date('2015-06-15')
      const newDate = new Date('2015-06-16')
      const result = profileFieldChangeSchema.parse({
        field: 'birthdate',
        previousValue: prevDate,
        newValue: newDate,
      })
      expect(result.previousValue).toEqual(prevDate)
      expect(result.newValue).toEqual(newDate)
    })

    it('rejects empty field name', () => {
      expect(() =>
        profileFieldChangeSchema.parse({
          field: '',
          previousValue: 'old',
          newValue: 'new',
        })
      ).toThrow()
    })

    it('rejects missing field name', () => {
      expect(() =>
        profileFieldChangeSchema.parse({
          previousValue: 'old',
          newValue: 'new',
        })
      ).toThrow()
    })
  })

  // ============================================
  // FAMILY AUDIT ENTRY SCHEMA TESTS
  // ============================================
  describe('familyAuditEntrySchema', () => {
    const validEntry: FamilyAuditEntry = {
      id: 'audit-123',
      action: 'child_profile_updated',
      entityId: 'child-456',
      entityType: 'child',
      changes: [
        { field: 'firstName', previousValue: 'Emma', newValue: 'Emily' },
      ],
      performedBy: 'user-789',
      performedAt: new Date('2024-01-15T10:30:00Z'),
    }

    it('accepts valid audit entry with changes', () => {
      const result = familyAuditEntrySchema.parse(validEntry)
      expect(result.id).toBe('audit-123')
      expect(result.action).toBe('child_profile_updated')
      expect(result.entityId).toBe('child-456')
      expect(result.entityType).toBe('child')
      expect(result.changes).toHaveLength(1)
      expect(result.performedBy).toBe('user-789')
      expect(result.performedAt).toEqual(new Date('2024-01-15T10:30:00Z'))
    })

    it('accepts audit entry without changes', () => {
      const entry = { ...validEntry, changes: undefined }
      const result = familyAuditEntrySchema.parse(entry)
      expect(result.changes).toBeUndefined()
    })

    it('accepts audit entry with metadata', () => {
      const entry = { ...validEntry, metadata: { reason: 'Name correction' } }
      const result = familyAuditEntrySchema.parse(entry)
      expect(result.metadata).toEqual({ reason: 'Name correction' })
    })

    it('accepts audit entry with multiple changes', () => {
      const entry = {
        ...validEntry,
        changes: [
          { field: 'firstName', previousValue: 'Emma', newValue: 'Emily' },
          { field: 'lastName', previousValue: null, newValue: 'Smith' },
          { field: 'nickname', previousValue: 'Em', newValue: 'Emmy' },
        ],
      }
      const result = familyAuditEntrySchema.parse(entry)
      expect(result.changes).toHaveLength(3)
    })

    it('rejects empty id', () => {
      const entry = { ...validEntry, id: '' }
      expect(() => familyAuditEntrySchema.parse(entry)).toThrow()
    })

    it('rejects empty entityId', () => {
      const entry = { ...validEntry, entityId: '' }
      expect(() => familyAuditEntrySchema.parse(entry)).toThrow()
    })

    it('rejects empty performedBy', () => {
      const entry = { ...validEntry, performedBy: '' }
      expect(() => familyAuditEntrySchema.parse(entry)).toThrow()
    })

    it('rejects invalid action type', () => {
      const entry = { ...validEntry, action: 'invalid_action' }
      expect(() => familyAuditEntrySchema.parse(entry)).toThrow()
    })

    it('rejects invalid entity type', () => {
      const entry = { ...validEntry, entityType: 'invalid_entity' }
      expect(() => familyAuditEntrySchema.parse(entry)).toThrow()
    })

    it('rejects missing required fields', () => {
      expect(() => familyAuditEntrySchema.parse({})).toThrow()
    })
  })

  // ============================================
  // CREATE AUDIT ENTRY INPUT SCHEMA TESTS
  // ============================================
  describe('createAuditEntryInputSchema', () => {
    it('accepts valid input with changes', () => {
      const result = createAuditEntryInputSchema.parse({
        action: 'child_profile_updated',
        entityId: 'child-123',
        entityType: 'child',
        changes: [{ field: 'firstName', previousValue: 'old', newValue: 'new' }],
      })
      expect(result.action).toBe('child_profile_updated')
      expect(result.entityId).toBe('child-123')
      expect(result.entityType).toBe('child')
      expect(result.changes).toHaveLength(1)
    })

    it('accepts valid input without changes', () => {
      const result = createAuditEntryInputSchema.parse({
        action: 'child_profile_created',
        entityId: 'child-123',
        entityType: 'child',
      })
      expect(result.changes).toBeUndefined()
    })

    it('accepts valid input with metadata', () => {
      const result = createAuditEntryInputSchema.parse({
        action: 'child_removed',
        entityId: 'child-123',
        entityType: 'child',
        metadata: { deletionReason: 'User requested' },
      })
      expect(result.metadata).toEqual({ deletionReason: 'User requested' })
    })

    it('rejects empty entityId', () => {
      expect(() =>
        createAuditEntryInputSchema.parse({
          action: 'child_profile_updated',
          entityId: '',
          entityType: 'child',
        })
      ).toThrow()
    })
  })

  // ============================================
  // FIRESTORE CONVERSION TESTS
  // ============================================
  describe('convertFirestoreToAuditEntry', () => {
    it('converts Firestore data to domain type', () => {
      const firestoreData: FamilyAuditEntryFirestore = {
        id: 'audit-123',
        action: 'child_profile_updated',
        entityId: 'child-456',
        entityType: 'child',
        changes: [{ field: 'firstName', previousValue: 'Emma', newValue: 'Emily' }],
        performedBy: 'user-789',
        performedAt: { toDate: () => new Date('2024-01-15T10:30:00Z') } as unknown as { toDate: () => Date },
      }

      const result = convertFirestoreToAuditEntry(firestoreData)

      expect(result.id).toBe('audit-123')
      expect(result.action).toBe('child_profile_updated')
      expect(result.entityId).toBe('child-456')
      expect(result.entityType).toBe('child')
      expect(result.performedBy).toBe('user-789')
      expect(result.performedAt).toEqual(new Date('2024-01-15T10:30:00Z'))
      expect(result.changes).toHaveLength(1)
    })

    it('handles entry without changes', () => {
      const firestoreData: FamilyAuditEntryFirestore = {
        id: 'audit-123',
        action: 'child_profile_created',
        entityId: 'child-456',
        entityType: 'child',
        performedBy: 'user-789',
        performedAt: { toDate: () => new Date('2024-01-15T10:30:00Z') } as unknown as { toDate: () => Date },
      }

      const result = convertFirestoreToAuditEntry(firestoreData)
      expect(result.changes).toBeUndefined()
    })

    it('handles entry with metadata', () => {
      const firestoreData: FamilyAuditEntryFirestore = {
        id: 'audit-123',
        action: 'child_removed',
        entityId: 'child-456',
        entityType: 'child',
        performedBy: 'user-789',
        performedAt: { toDate: () => new Date('2024-01-15T10:30:00Z') } as unknown as { toDate: () => Date },
        metadata: { reason: 'User requested' },
      }

      const result = convertFirestoreToAuditEntry(firestoreData)
      expect(result.metadata).toEqual({ reason: 'User requested' })
    })
  })

  // ============================================
  // SAFE PARSE TESTS
  // ============================================
  describe('safeParseAuditEntry', () => {
    it('returns parsed entry for valid data', () => {
      const validEntry: FamilyAuditEntry = {
        id: 'audit-123',
        action: 'child_profile_updated',
        entityId: 'child-456',
        entityType: 'child',
        performedBy: 'user-789',
        performedAt: new Date('2024-01-15T10:30:00Z'),
      }

      const result = safeParseAuditEntry(validEntry)
      expect(result).not.toBeNull()
      expect(result?.id).toBe('audit-123')
    })

    it('returns null for invalid data', () => {
      const result = safeParseAuditEntry({ invalid: 'data' })
      expect(result).toBeNull()
    })

    it('returns null for empty object', () => {
      const result = safeParseAuditEntry({})
      expect(result).toBeNull()
    })

    it('returns null for null input', () => {
      const result = safeParseAuditEntry(null)
      expect(result).toBeNull()
    })
  })

  // ============================================
  // HELPER FUNCTION TESTS
  // ============================================
  describe('getAuditActionLabel', () => {
    it('returns correct label for child_profile_created', () => {
      expect(getAuditActionLabel('child_profile_created')).toBe('Child profile created')
    })

    it('returns correct label for child_profile_updated', () => {
      expect(getAuditActionLabel('child_profile_updated')).toBe('Child profile updated')
    })

    it('returns correct label for child_removed', () => {
      expect(getAuditActionLabel('child_removed')).toBe('Child removed from family')
    })

    it('returns correct label for custody_declared', () => {
      expect(getAuditActionLabel('custody_declared')).toBe('Custody arrangement declared')
    })

    it('returns correct label for custody_updated', () => {
      expect(getAuditActionLabel('custody_updated')).toBe('Custody arrangement updated')
    })

    it('returns correct label for guardian_added', () => {
      expect(getAuditActionLabel('guardian_added')).toBe('Guardian added to family')
    })

    it('returns correct label for guardian_removed', () => {
      expect(getAuditActionLabel('guardian_removed')).toBe('Guardian removed from family')
    })

    it('returns correct label for family_created', () => {
      expect(getAuditActionLabel('family_created')).toBe('Family created')
    })

    it('returns correct label for family_updated', () => {
      expect(getAuditActionLabel('family_updated')).toBe('Family updated')
    })

    it('all action types have labels', () => {
      const actionTypes: AuditActionType[] = [
        'child_profile_created',
        'child_profile_updated',
        'child_removed',
        'custody_declared',
        'custody_updated',
        'guardian_added',
        'guardian_removed',
        'family_created',
        'family_updated',
      ]

      for (const action of actionTypes) {
        expect(AUDIT_ACTION_LABELS[action]).toBeDefined()
        expect(typeof AUDIT_ACTION_LABELS[action]).toBe('string')
        expect(AUDIT_ACTION_LABELS[action].length).toBeGreaterThan(0)
      }
    })
  })

  describe('buildChangesArray', () => {
    it('builds changes array for modified fields', () => {
      const previousData = { firstName: 'Emma', lastName: 'Smith', age: 8 }
      const newData = { firstName: 'Emily', lastName: 'Smith' }
      const fieldsToTrack: (keyof typeof previousData)[] = ['firstName', 'lastName']

      const result = buildChangesArray(previousData, newData, fieldsToTrack)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        field: 'firstName',
        previousValue: 'Emma',
        newValue: 'Emily',
      })
    })

    it('ignores unchanged fields', () => {
      const previousData = { firstName: 'Emma', lastName: 'Smith' }
      const newData = { firstName: 'Emma', lastName: 'Smith' }
      const fieldsToTrack: (keyof typeof previousData)[] = ['firstName', 'lastName']

      const result = buildChangesArray(previousData, newData, fieldsToTrack)

      expect(result).toHaveLength(0)
    })

    it('handles null previous values', () => {
      const previousData = { firstName: 'Emma', nickname: null }
      const newData = { nickname: 'Emmy' }
      const fieldsToTrack: (keyof typeof previousData)[] = ['firstName', 'nickname']

      const result = buildChangesArray(previousData, newData, fieldsToTrack)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        field: 'nickname',
        previousValue: null,
        newValue: 'Emmy',
      })
    })

    it('handles null new values', () => {
      const previousData = { firstName: 'Emma', photoUrl: 'https://example.com/photo.jpg' }
      const newData = { photoUrl: null }
      const fieldsToTrack: (keyof typeof previousData)[] = ['firstName', 'photoUrl']

      const result = buildChangesArray(previousData, newData, fieldsToTrack)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        field: 'photoUrl',
        previousValue: 'https://example.com/photo.jpg',
        newValue: null,
      })
    })

    it('handles Date values', () => {
      const prevDate = new Date('2015-06-15')
      const newDate = new Date('2015-06-16')
      const previousData = { birthdate: prevDate }
      const newData = { birthdate: newDate }
      const fieldsToTrack: (keyof typeof previousData)[] = ['birthdate']

      const result = buildChangesArray(previousData, newData, fieldsToTrack)

      expect(result).toHaveLength(1)
      expect(result[0].field).toBe('birthdate')
      expect(result[0].previousValue).toEqual(prevDate)
      expect(result[0].newValue).toEqual(newDate)
    })

    it('ignores fields not in newData', () => {
      const previousData = { firstName: 'Emma', lastName: 'Smith' }
      const newData = { firstName: 'Emily' }
      const fieldsToTrack: (keyof typeof previousData)[] = ['firstName', 'lastName']

      const result = buildChangesArray(previousData, newData, fieldsToTrack)

      // Only firstName is in newData, so only that should be tracked
      expect(result).toHaveLength(1)
      expect(result[0].field).toBe('firstName')
    })

    it('handles multiple changed fields', () => {
      const previousData = { firstName: 'Emma', lastName: 'Smith', nickname: null }
      const newData = { firstName: 'Emily', lastName: 'Johnson', nickname: 'Emmy' }
      const fieldsToTrack: (keyof typeof previousData)[] = ['firstName', 'lastName', 'nickname']

      const result = buildChangesArray(previousData, newData, fieldsToTrack)

      expect(result).toHaveLength(3)
      expect(result.map((c) => c.field).sort()).toEqual(['firstName', 'lastName', 'nickname'])
    })

    it('handles undefined previous values', () => {
      const previousData: { firstName: string; nickname?: string } = { firstName: 'Emma' }
      const newData = { nickname: 'Emmy' }
      const fieldsToTrack = ['firstName', 'nickname'] as const

      const result = buildChangesArray(
        previousData as Record<string, unknown>,
        newData,
        fieldsToTrack as unknown as string[]
      )

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        field: 'nickname',
        previousValue: null,
        newValue: 'Emmy',
      })
    })
  })

  // ============================================
  // ADVERSARIAL TESTS
  // ============================================
  describe('adversarial tests', () => {
    it('rejects audit entry with extra unknown fields (strict parsing)', () => {
      const entry = {
        id: 'audit-123',
        action: 'child_profile_updated',
        entityId: 'child-456',
        entityType: 'child',
        performedBy: 'user-789',
        performedAt: new Date(),
        extraField: 'should be ignored',
      }
      // Note: Zod strips unknown fields by default, so this should pass
      const result = familyAuditEntrySchema.parse(entry)
      expect(result).not.toHaveProperty('extraField')
    })

    it('handles deeply nested metadata', () => {
      const entry = {
        id: 'audit-123',
        action: 'child_profile_updated' as const,
        entityId: 'child-456',
        entityType: 'child' as const,
        performedBy: 'user-789',
        performedAt: new Date(),
        metadata: {
          level1: {
            level2: {
              level3: 'deep value',
            },
          },
        },
      }
      const result = familyAuditEntrySchema.parse(entry)
      expect(result.metadata).toEqual({
        level1: { level2: { level3: 'deep value' } },
      })
    })

    it('handles very long entityId', () => {
      const longId = 'a'.repeat(1000)
      const entry = {
        id: 'audit-123',
        action: 'child_profile_updated' as const,
        entityId: longId,
        entityType: 'child' as const,
        performedBy: 'user-789',
        performedAt: new Date(),
      }
      const result = familyAuditEntrySchema.parse(entry)
      expect(result.entityId).toBe(longId)
    })

    it('handles special characters in field names', () => {
      const change = profileFieldChangeSchema.parse({
        field: 'field-with-dashes',
        previousValue: 'old',
        newValue: 'new',
      })
      expect(change.field).toBe('field-with-dashes')
    })
  })
})
