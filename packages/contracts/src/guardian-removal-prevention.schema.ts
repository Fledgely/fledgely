import { z } from 'zod'

/**
 * Guardian Removal Prevention Schema - Defines types for blocking co-parent removal
 *
 * This schema is the source of truth for all guardian removal prevention types.
 * Per project guidelines: Types are always derived from Zod schemas.
 *
 * Story 3A.6: Co-Parent Removal Prevention
 *
 * CRITICAL ANTI-WEAPONIZATION FEATURE: In shared custody families, neither parent
 * can unilaterally remove the other. This prevents monitoring rights from being
 * weaponized during custody disputes.
 */

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum field lengths for audit entries (prevent DoS via large payloads)
 */
export const REMOVAL_AUDIT_FIELD_LIMITS = {
  /** Max length for guardian UID */
  guardianId: 128,
  /** Max length for child ID */
  childId: 128,
  /** Max length for family ID */
  familyId: 128,
  /** Max length for role strings */
  role: 50,
  /** Max length for permission strings */
  permissions: 50,
  /** Max length for explanation text */
  explanation: 1000,
} as const

/**
 * Types of blocked operations in shared custody
 */
export const BLOCKED_OPERATION_TYPES = [
  'guardian_removal', // Attempting to remove another guardian
  'role_downgrade', // Attempting to downgrade co-parent to caregiver
  'permission_downgrade', // Attempting to change full -> readonly permissions
] as const

/**
 * User-friendly messages explaining why removal is blocked (6th-grade reading level)
 * NFR65 compliance
 */
export const GUARDIAN_REMOVAL_PREVENTION_MESSAGES = {
  /** Main message when removal is blocked */
  removalBlocked:
    'In shared custody families, you cannot remove your co-parent. Both parents have equal rights to monitor your child.',

  /** Explanation of shared custody immutability */
  sharedCustodyExplanation:
    'When custody is shared, neither parent can remove the other. This protects both parents\' access to their child\'s safety information.',

  /** Reference to dissolution flow (Story 2.7) */
  dissolutionOption:
    'If you want to end the family monitoring relationship, you can start a family dissolution. Both parents must agree, and there is a 30-day waiting period.',

  /** Reference to legal petition (Story 3.6) */
  legalPetitionInfo:
    'If you have a court order changing custody, you can submit a legal petition with your documentation. Our team will review it.',

  /** Court order explanation */
  courtOrderRequired:
    'A court order is the only way to forcibly remove a verified legal parent from a shared custody family.',

  /** Role change blocked message */
  roleChangeBlocked:
    'In shared custody families, you cannot change your co-parent\'s role. Both parents have equal standing.',

  /** Permission change blocked message */
  permissionChangeBlocked:
    'In shared custody families, you cannot reduce your co-parent\'s permissions. Both parents have full access.',

  /** Link to dissolution (for UI) */
  dissolutionLinkText: 'Start family dissolution',

  /** Link to legal petition (for UI) */
  legalPetitionLinkText: 'Submit legal documentation',
} as const

/**
 * Shared custody immutability rules - operations blocked in shared custody
 */
export const SHARED_CUSTODY_IMMUTABILITY_RULES = {
  /** Cannot remove another guardian */
  canRemoveGuardian: false,
  /** Cannot downgrade co-parent role */
  canDowngradeRole: false,
  /** Cannot reduce co-parent permissions */
  canReducePermissions: false,
  /** Cannot dissolve without dual acknowledgment */
  canUnilaterallyDissolve: false,
  /** Only court orders can force removal */
  courtOrderRequired: true,
} as const

// ============================================================================
// Schemas
// ============================================================================

/**
 * Types of blocked operations
 */
export const blockedOperationTypeSchema = z.enum([
  'guardian_removal',
  'role_downgrade',
  'permission_downgrade',
])

export type BlockedOperationType = z.infer<typeof blockedOperationTypeSchema>

/**
 * Guardian roles that can be targets of removal/downgrade
 */
export const targetGuardianRoleSchema = z.enum(['primary', 'co-parent', 'caregiver'])

export type TargetGuardianRole = z.infer<typeof targetGuardianRoleSchema>

/**
 * Guardian permissions
 */
export const guardianPermissionsSchema = z.enum(['full', 'readonly'])

export type GuardianPermissions = z.infer<typeof guardianPermissionsSchema>

/**
 * Custody types that trigger protection
 */
export const protectedCustodyTypeSchema = z.enum(['shared', 'complex'])

export type ProtectedCustodyType = z.infer<typeof protectedCustodyTypeSchema>

/**
 * Guardian removal attempt - logged when removal is blocked
 * This is stored in adminAuditLog for support team review
 */
export const guardianRemovalAttemptSchema = z.object({
  /** Unique entry ID (Firestore document ID) */
  id: z.string().min(1).max(REMOVAL_AUDIT_FIELD_LIMITS.guardianId),

  /** Guardian who attempted the action */
  attemptedBy: z.string().min(1).max(REMOVAL_AUDIT_FIELD_LIMITS.guardianId),

  /** Guardian they tried to affect */
  targetGuardian: z.string().min(1).max(REMOVAL_AUDIT_FIELD_LIMITS.guardianId),

  /** Child with shared custody that triggered protection */
  childId: z.string().min(1).max(REMOVAL_AUDIT_FIELD_LIMITS.childId),

  /** Family ID */
  familyId: z.string().min(1).max(REMOVAL_AUDIT_FIELD_LIMITS.familyId),

  /** Custody type that triggered protection (always shared or complex) */
  custodyType: protectedCustodyTypeSchema,

  /** Type of operation that was blocked */
  blockedOperation: blockedOperationTypeSchema,

  /** When the attempt was blocked */
  blockedAt: z.date(),

  /** Additional metadata for role/permission changes */
  metadata: z
    .object({
      /** For role changes: what role they tried to set */
      requestedRole: targetGuardianRoleSchema.optional(),
      /** For permission changes: what permissions they tried to set */
      requestedPermissions: guardianPermissionsSchema.optional(),
      /** Current role of target guardian */
      currentRole: targetGuardianRoleSchema.optional(),
      /** Current permissions of target guardian */
      currentPermissions: guardianPermissionsSchema.optional(),
    })
    .optional(),
})

export type GuardianRemovalAttempt = z.infer<typeof guardianRemovalAttemptSchema>

/**
 * Firestore-compatible guardian removal attempt schema (uses Timestamp)
 */
export const guardianRemovalAttemptFirestoreSchema = z.object({
  id: z.string().min(1).max(REMOVAL_AUDIT_FIELD_LIMITS.guardianId),
  attemptedBy: z.string().min(1).max(REMOVAL_AUDIT_FIELD_LIMITS.guardianId),
  targetGuardian: z.string().min(1).max(REMOVAL_AUDIT_FIELD_LIMITS.guardianId),
  childId: z.string().min(1).max(REMOVAL_AUDIT_FIELD_LIMITS.childId),
  familyId: z.string().min(1).max(REMOVAL_AUDIT_FIELD_LIMITS.familyId),
  custodyType: protectedCustodyTypeSchema,
  blockedOperation: blockedOperationTypeSchema,
  blockedAt: z.custom<{ toDate: () => Date }>(
    (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
  ),
  metadata: z
    .object({
      requestedRole: targetGuardianRoleSchema.optional(),
      requestedPermissions: guardianPermissionsSchema.optional(),
      currentRole: targetGuardianRoleSchema.optional(),
      currentPermissions: guardianPermissionsSchema.optional(),
    })
    .optional(),
})

export type GuardianRemovalAttemptFirestore = z.infer<typeof guardianRemovalAttemptFirestoreSchema>

/**
 * Input schema for attempting guardian removal
 */
export const attemptGuardianRemovalInputSchema = z.object({
  /** Family ID */
  familyId: z.string().min(1).max(REMOVAL_AUDIT_FIELD_LIMITS.familyId),

  /** Guardian to remove */
  targetGuardianId: z.string().min(1).max(REMOVAL_AUDIT_FIELD_LIMITS.guardianId),

  /** Child ID (to check custody type) */
  childId: z.string().min(1).max(REMOVAL_AUDIT_FIELD_LIMITS.childId),
})

export type AttemptGuardianRemovalInput = z.infer<typeof attemptGuardianRemovalInputSchema>

/**
 * Input schema for attempting role change
 */
export const attemptRoleChangeInputSchema = z.object({
  /** Family ID */
  familyId: z.string().min(1).max(REMOVAL_AUDIT_FIELD_LIMITS.familyId),

  /** Guardian whose role to change */
  targetGuardianId: z.string().min(1).max(REMOVAL_AUDIT_FIELD_LIMITS.guardianId),

  /** Child ID (to check custody type) */
  childId: z.string().min(1).max(REMOVAL_AUDIT_FIELD_LIMITS.childId),

  /** New role to assign */
  newRole: targetGuardianRoleSchema,
})

export type AttemptRoleChangeInput = z.infer<typeof attemptRoleChangeInputSchema>

/**
 * Input schema for attempting permission change
 */
export const attemptPermissionChangeInputSchema = z.object({
  /** Family ID */
  familyId: z.string().min(1).max(REMOVAL_AUDIT_FIELD_LIMITS.familyId),

  /** Guardian whose permissions to change */
  targetGuardianId: z.string().min(1).max(REMOVAL_AUDIT_FIELD_LIMITS.guardianId),

  /** Child ID (to check custody type) */
  childId: z.string().min(1).max(REMOVAL_AUDIT_FIELD_LIMITS.childId),

  /** New permissions to assign */
  newPermissions: guardianPermissionsSchema,
})

export type AttemptPermissionChangeInput = z.infer<typeof attemptPermissionChangeInputSchema>

/**
 * Result when an operation is blocked
 */
export const removalBlockedResultSchema = z.object({
  /** Whether operation was blocked */
  blocked: z.literal(true),

  /** Why the operation was blocked */
  reason: blockedOperationTypeSchema,

  /** User-friendly message explaining the block */
  message: z.string().max(REMOVAL_AUDIT_FIELD_LIMITS.explanation),

  /** Path to dissolution flow */
  dissolutionPath: z.string().optional(),

  /** Path to legal petition flow */
  legalPetitionPath: z.string().optional(),

  /** Additional guidance */
  guidance: z.object({
    dissolutionExplanation: z.string(),
    legalPetitionExplanation: z.string(),
    courtOrderExplanation: z.string(),
  }),
})

export type RemovalBlockedResult = z.infer<typeof removalBlockedResultSchema>

/**
 * Result when an operation is allowed (non-shared custody)
 */
export const removalAllowedResultSchema = z.object({
  /** Operation was allowed */
  blocked: z.literal(false),

  /** Operation can proceed */
  allowed: z.literal(true),
})

export type RemovalAllowedResult = z.infer<typeof removalAllowedResultSchema>

/**
 * Combined result schema for removal attempts
 */
export const guardianRemovalResultSchema = z.discriminatedUnion('blocked', [
  removalBlockedResultSchema,
  removalAllowedResultSchema,
])

export type GuardianRemovalResult = z.infer<typeof guardianRemovalResultSchema>

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if custody type requires removal protection
 * Shared and complex custody both require protection
 */
export function requiresRemovalProtection(
  custodyType: string | null | undefined
): custodyType is 'shared' | 'complex' {
  return custodyType === 'shared' || custodyType === 'complex'
}

/**
 * Check if a role change is a downgrade in shared custody context
 * co-parent -> caregiver is a downgrade
 * primary -> co-parent is NOT a downgrade (equal standing)
 */
export function isRoleDowngrade(currentRole: string, newRole: string): boolean {
  // Downgrade: co-parent -> caregiver
  if (currentRole === 'co-parent' && newRole === 'caregiver') {
    return true
  }
  // Downgrade: primary -> caregiver
  if (currentRole === 'primary' && newRole === 'caregiver') {
    return true
  }
  return false
}

/**
 * Check if a permission change is a downgrade
 * full -> readonly is a downgrade
 */
export function isPermissionDowngrade(
  currentPermissions: string,
  newPermissions: string
): boolean {
  return currentPermissions === 'full' && newPermissions === 'readonly'
}

/**
 * Create a blocked result with all required guidance
 */
export function createBlockedResult(
  reason: BlockedOperationType,
  customMessage?: string
): RemovalBlockedResult {
  const messageMap: Record<BlockedOperationType, string> = {
    guardian_removal: GUARDIAN_REMOVAL_PREVENTION_MESSAGES.removalBlocked,
    role_downgrade: GUARDIAN_REMOVAL_PREVENTION_MESSAGES.roleChangeBlocked,
    permission_downgrade: GUARDIAN_REMOVAL_PREVENTION_MESSAGES.permissionChangeBlocked,
  }

  return {
    blocked: true,
    reason,
    message: customMessage || messageMap[reason],
    dissolutionPath: '/family/dissolution',
    legalPetitionPath: '/legal-petition',
    guidance: {
      dissolutionExplanation: GUARDIAN_REMOVAL_PREVENTION_MESSAGES.dissolutionOption,
      legalPetitionExplanation: GUARDIAN_REMOVAL_PREVENTION_MESSAGES.legalPetitionInfo,
      courtOrderExplanation: GUARDIAN_REMOVAL_PREVENTION_MESSAGES.courtOrderRequired,
    },
  }
}

/**
 * Create an allowed result
 */
export function createAllowedResult(): RemovalAllowedResult {
  return {
    blocked: false,
    allowed: true,
  }
}

/**
 * Get explanation for why removal is blocked (for UI display)
 */
export function getRemovalBlockedExplanation(): {
  title: string
  message: string
  options: Array<{ label: string; description: string; path: string }>
} {
  return {
    title: 'Cannot Remove Co-Parent',
    message: GUARDIAN_REMOVAL_PREVENTION_MESSAGES.sharedCustodyExplanation,
    options: [
      {
        label: GUARDIAN_REMOVAL_PREVENTION_MESSAGES.dissolutionLinkText,
        description: GUARDIAN_REMOVAL_PREVENTION_MESSAGES.dissolutionOption,
        path: '/family/dissolution',
      },
      {
        label: GUARDIAN_REMOVAL_PREVENTION_MESSAGES.legalPetitionLinkText,
        description: GUARDIAN_REMOVAL_PREVENTION_MESSAGES.legalPetitionInfo,
        path: '/legal-petition',
      },
    ],
  }
}

/**
 * Convert Firestore guardian removal attempt to domain type
 */
export function convertFirestoreToGuardianRemovalAttempt(
  data: GuardianRemovalAttemptFirestore
): GuardianRemovalAttempt {
  return guardianRemovalAttemptSchema.parse({
    id: data.id,
    attemptedBy: data.attemptedBy,
    targetGuardian: data.targetGuardian,
    childId: data.childId,
    familyId: data.familyId,
    custodyType: data.custodyType,
    blockedOperation: data.blockedOperation,
    blockedAt: data.blockedAt.toDate(),
    metadata: data.metadata,
  })
}

/**
 * Safely parse guardian removal attempt
 */
export function safeParseGuardianRemovalAttempt(data: unknown): GuardianRemovalAttempt | null {
  const result = guardianRemovalAttemptSchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Validate attempt guardian removal input
 */
export function validateAttemptGuardianRemovalInput(data: unknown): AttemptGuardianRemovalInput {
  return attemptGuardianRemovalInputSchema.parse(data)
}

/**
 * Validate attempt role change input
 */
export function validateAttemptRoleChangeInput(data: unknown): AttemptRoleChangeInput {
  return attemptRoleChangeInputSchema.parse(data)
}

/**
 * Validate attempt permission change input
 */
export function validateAttemptPermissionChangeInput(data: unknown): AttemptPermissionChangeInput {
  return attemptPermissionChangeInputSchema.parse(data)
}
