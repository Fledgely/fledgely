import { z } from 'zod'

/**
 * Family Audit Schema - Defines audit log entries for family actions
 *
 * This schema is the source of truth for all FamilyAuditEntry types in the application.
 * Per project guidelines: Types are always derived from Zod schemas.
 *
 * Story 2.5: Edit Child Profile (introduces audit trail)
 */

/**
 * Types of auditable actions in the family
 */
export const auditActionTypeSchema = z.enum([
  'child_profile_created',
  'child_profile_updated',
  'child_removed',
  'custody_declared',
  'custody_updated',
  'guardian_added',
  'guardian_removed',
  'family_created',
  'family_updated',
])

export type AuditActionType = z.infer<typeof auditActionTypeSchema>

/**
 * Entity types that can be audited
 */
export const auditEntityTypeSchema = z.enum(['child', 'guardian', 'family', 'custody'])

export type AuditEntityType = z.infer<typeof auditEntityTypeSchema>

/**
 * Record of a single field change
 */
export const profileFieldChangeSchema = z.object({
  /** Field name that was changed */
  field: z.string().min(1, 'Field name is required'),

  /** Value before the change (null if new) */
  previousValue: z.unknown().nullable(),

  /** Value after the change (null if deleted) */
  newValue: z.unknown().nullable(),
})

export type ProfileFieldChange = z.infer<typeof profileFieldChangeSchema>

/**
 * Family audit log entry - immutable record of an action
 */
export const familyAuditEntrySchema = z.object({
  /** Unique audit entry ID (Firestore document ID) */
  id: z.string().min(1, 'Audit entry ID is required'),

  /** Type of action performed */
  action: auditActionTypeSchema,

  /** ID of the entity affected (childId, guardianId, etc.) */
  entityId: z.string().min(1, 'Entity ID is required'),

  /** Type of entity affected */
  entityType: auditEntityTypeSchema,

  /** Changes made (for update actions) */
  changes: z.array(profileFieldChangeSchema).optional(),

  /** User who performed the action */
  performedBy: z.string().min(1, 'Performer ID is required'),

  /** When the action was performed */
  performedAt: z.date(),

  /** Additional context (optional) */
  metadata: z.record(z.unknown()).optional(),
})

export type FamilyAuditEntry = z.infer<typeof familyAuditEntrySchema>

/**
 * Firestore-compatible audit entry schema (uses Timestamp)
 */
export const familyAuditEntryFirestoreSchema = z.object({
  id: z.string().min(1),
  action: auditActionTypeSchema,
  entityId: z.string().min(1),
  entityType: auditEntityTypeSchema,
  changes: z.array(profileFieldChangeSchema).optional(),
  performedBy: z.string().min(1),
  performedAt: z.custom<{ toDate: () => Date }>(
    (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
  ),
  metadata: z.record(z.unknown()).optional(),
})

export type FamilyAuditEntryFirestore = z.infer<typeof familyAuditEntryFirestoreSchema>

/**
 * Input schema for creating an audit entry
 */
export const createAuditEntryInputSchema = z.object({
  action: auditActionTypeSchema,
  entityId: z.string().min(1, 'Entity ID is required'),
  entityType: auditEntityTypeSchema,
  changes: z.array(profileFieldChangeSchema).optional(),
  metadata: z.record(z.unknown()).optional(),
})

export type CreateAuditEntryInput = z.infer<typeof createAuditEntryInputSchema>

/**
 * Convert Firestore audit entry to domain type
 */
export function convertFirestoreToAuditEntry(data: FamilyAuditEntryFirestore): FamilyAuditEntry {
  return familyAuditEntrySchema.parse({
    id: data.id,
    action: data.action,
    entityId: data.entityId,
    entityType: data.entityType,
    changes: data.changes,
    performedBy: data.performedBy,
    performedAt: data.performedAt.toDate(),
    metadata: data.metadata,
  })
}

/**
 * Safely parse audit entry data, returning null if invalid
 */
export function safeParseAuditEntry(data: unknown): FamilyAuditEntry | null {
  const result = familyAuditEntrySchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Human-readable labels for audit action types
 */
export const AUDIT_ACTION_LABELS: Record<AuditActionType, string> = {
  child_profile_created: 'Child profile created',
  child_profile_updated: 'Child profile updated',
  child_removed: 'Child removed from family',
  custody_declared: 'Custody arrangement declared',
  custody_updated: 'Custody arrangement updated',
  guardian_added: 'Guardian added to family',
  guardian_removed: 'Guardian removed from family',
  family_created: 'Family created',
  family_updated: 'Family updated',
}

/**
 * Get human-readable label for an audit action
 */
export function getAuditActionLabel(action: AuditActionType): string {
  return AUDIT_ACTION_LABELS[action]
}

/**
 * Build changes array by comparing previous and new values
 */
export function buildChangesArray<T extends Record<string, unknown>>(
  previousData: T,
  newData: Partial<T>,
  fieldsToTrack: (keyof T)[]
): ProfileFieldChange[] {
  const changes: ProfileFieldChange[] = []

  for (const field of fieldsToTrack) {
    const fieldName = String(field)
    if (fieldName in newData) {
      const prevValue = previousData[field]
      const newValue = newData[field]

      // Handle Date comparison
      const prevComparable =
        prevValue instanceof Date ? prevValue.toISOString() : prevValue
      const newComparable = newValue instanceof Date ? newValue.toISOString() : newValue

      if (prevComparable !== newComparable) {
        changes.push({
          field: fieldName,
          previousValue: prevValue ?? null,
          newValue: newValue ?? null,
        })
      }
    }
  }

  return changes
}
