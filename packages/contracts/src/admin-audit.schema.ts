import { z } from 'zod'

/**
 * Admin Audit Schema - Defines audit log entries for admin-level events
 *
 * This schema is the source of truth for all AdminAuditEntry types.
 * Per project guidelines: Types are always derived from Zod schemas.
 *
 * Story 3A.6: Co-Parent Removal Prevention
 *
 * CRITICAL: Admin audit entries are NOT visible to family members.
 * Only admin/support team can read these entries. They are used to
 * detect potential abuse patterns (e.g., repeated removal attempts).
 */

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum field lengths for admin audit entries
 */
export const ADMIN_AUDIT_FIELD_LIMITS = {
  /** Max length for user/guardian ID */
  userId: 128,
  /** Max length for family ID */
  familyId: 128,
  /** Max length for child ID */
  childId: 128,
  /** Max length for action string */
  action: 100,
  /** Max length for notes */
  notes: 2000,
} as const

// ============================================================================
// Schemas
// ============================================================================

/**
 * Admin-level audit action types
 * These are events logged for admin review, NOT visible to family members
 */
export const adminAuditActionTypeSchema = z.enum([
  // Story 3A.6: Guardian removal prevention
  'guardian_removal_blocked', // Attempted to remove co-parent in shared custody
  'role_change_blocked', // Attempted to downgrade co-parent role
  'permission_change_blocked', // Attempted to reduce co-parent permissions

  // Story 3.6: Legal petition actions (admin-visible only)
  'legal_petition_submitted', // New legal petition received
  'legal_petition_reviewed', // Admin reviewed petition
  'legal_petition_verified', // Petition verified by admin
  'legal_petition_denied', // Petition denied by admin

  // Safety team actions (referenced in firestore.rules)
  'safety_request_reviewed', // Safety request was reviewed
  'safety_action_taken', // Action taken on safety request

  // Future admin actions can be added here
])

export type AdminAuditActionType = z.infer<typeof adminAuditActionTypeSchema>

/**
 * Admin audit entry - stored in adminAuditLog collection
 * Only readable by admin/support team
 */
export const adminAuditEntrySchema = z.object({
  /** Unique entry ID (Firestore document ID) */
  id: z.string().min(1).max(ADMIN_AUDIT_FIELD_LIMITS.userId),

  /** Type of admin action */
  action: adminAuditActionTypeSchema,

  /** User who triggered the event (not always the admin) */
  triggeredBy: z.string().min(1).max(ADMIN_AUDIT_FIELD_LIMITS.userId),

  /** Family ID if applicable */
  familyId: z.string().min(1).max(ADMIN_AUDIT_FIELD_LIMITS.familyId).optional(),

  /** Child ID if applicable */
  childId: z.string().min(1).max(ADMIN_AUDIT_FIELD_LIMITS.childId).optional(),

  /** When the event occurred */
  occurredAt: z.date(),

  /** Additional event-specific metadata */
  metadata: z.record(z.unknown()).optional(),
})

export type AdminAuditEntry = z.infer<typeof adminAuditEntrySchema>

/**
 * Firestore-compatible admin audit entry schema (uses Timestamp)
 */
export const adminAuditEntryFirestoreSchema = z.object({
  id: z.string().min(1).max(ADMIN_AUDIT_FIELD_LIMITS.userId),
  action: adminAuditActionTypeSchema,
  triggeredBy: z.string().min(1).max(ADMIN_AUDIT_FIELD_LIMITS.userId),
  familyId: z.string().min(1).max(ADMIN_AUDIT_FIELD_LIMITS.familyId).optional(),
  childId: z.string().min(1).max(ADMIN_AUDIT_FIELD_LIMITS.childId).optional(),
  occurredAt: z.custom<{ toDate: () => Date }>(
    (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
  ),
  metadata: z.record(z.unknown()).optional(),
})

export type AdminAuditEntryFirestore = z.infer<typeof adminAuditEntryFirestoreSchema>

/**
 * Input schema for creating an admin audit entry
 * Used by Cloud Functions to log admin events
 */
export const createAdminAuditEntryInputSchema = z.object({
  /** Type of admin action */
  action: adminAuditActionTypeSchema,

  /** User who triggered the event */
  triggeredBy: z.string().min(1).max(ADMIN_AUDIT_FIELD_LIMITS.userId),

  /** Family ID if applicable */
  familyId: z.string().min(1).max(ADMIN_AUDIT_FIELD_LIMITS.familyId).optional(),

  /** Child ID if applicable */
  childId: z.string().min(1).max(ADMIN_AUDIT_FIELD_LIMITS.childId).optional(),

  /** Additional metadata */
  metadata: z.record(z.unknown()).optional(),
})

export type CreateAdminAuditEntryInput = z.infer<typeof createAdminAuditEntryInputSchema>

/**
 * Metadata schema for guardian removal blocked events
 */
export const guardianRemovalBlockedMetadataSchema = z.object({
  /** Guardian who was targeted for removal */
  targetGuardian: z.string().min(1),
  /** Custody type that triggered protection */
  custodyType: z.enum(['shared', 'complex']),
  /** Type of blocked operation */
  blockedOperation: z.enum(['guardian_removal', 'role_downgrade', 'permission_downgrade']),
  /** Additional details */
  requestedChange: z.string().optional(),
})

export type GuardianRemovalBlockedMetadata = z.infer<typeof guardianRemovalBlockedMetadataSchema>

// ============================================================================
// Human-Readable Labels
// ============================================================================

/**
 * Human-readable labels for admin audit action types
 */
export const ADMIN_AUDIT_ACTION_LABELS: Record<AdminAuditActionType, string> = {
  // Story 3A.6: Guardian removal prevention
  guardian_removal_blocked: 'Guardian removal blocked (shared custody)',
  role_change_blocked: 'Role change blocked (shared custody)',
  permission_change_blocked: 'Permission change blocked (shared custody)',

  // Story 3.6: Legal petition actions
  legal_petition_submitted: 'Legal petition submitted',
  legal_petition_reviewed: 'Legal petition reviewed',
  legal_petition_verified: 'Legal petition verified',
  legal_petition_denied: 'Legal petition denied',

  // Safety team actions
  safety_request_reviewed: 'Safety request reviewed',
  safety_action_taken: 'Safety action taken',
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get human-readable label for admin audit action
 */
export function getAdminAuditActionLabel(action: AdminAuditActionType): string {
  return ADMIN_AUDIT_ACTION_LABELS[action]
}

/**
 * Convert Firestore admin audit entry to domain type
 */
export function convertFirestoreToAdminAuditEntry(
  data: AdminAuditEntryFirestore
): AdminAuditEntry {
  return adminAuditEntrySchema.parse({
    id: data.id,
    action: data.action,
    triggeredBy: data.triggeredBy,
    familyId: data.familyId,
    childId: data.childId,
    occurredAt: data.occurredAt.toDate(),
    metadata: data.metadata,
  })
}

/**
 * Safely parse admin audit entry data
 */
export function safeParseAdminAuditEntry(data: unknown): AdminAuditEntry | null {
  const result = adminAuditEntrySchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Validate create admin audit entry input
 */
export function validateCreateAdminAuditEntryInput(data: unknown): CreateAdminAuditEntryInput {
  return createAdminAuditEntryInputSchema.parse(data)
}

/**
 * Create admin audit entry for guardian removal blocked event
 */
export function createGuardianRemovalBlockedAuditInput(
  attemptedBy: string,
  targetGuardian: string,
  familyId: string,
  childId: string,
  custodyType: 'shared' | 'complex',
  blockedOperation: 'guardian_removal' | 'role_downgrade' | 'permission_downgrade'
): CreateAdminAuditEntryInput {
  const actionMap = {
    guardian_removal: 'guardian_removal_blocked' as const,
    role_downgrade: 'role_change_blocked' as const,
    permission_downgrade: 'permission_change_blocked' as const,
  }

  return {
    action: actionMap[blockedOperation],
    triggeredBy: attemptedBy,
    familyId,
    childId,
    metadata: {
      targetGuardian,
      custodyType,
      blockedOperation,
    },
  }
}
