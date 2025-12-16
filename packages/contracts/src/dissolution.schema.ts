import { z } from 'zod'

/**
 * Family Dissolution Schema - Defines dissolution request types and validation
 *
 * This schema is the source of truth for all dissolution types in the application.
 * Per project guidelines: Types are always derived from Zod schemas.
 *
 * Story 2.7: Family Dissolution Initiation
 */

/**
 * Data handling options for family dissolution
 * Controls what happens to family data after dissolution
 */
export const dataHandlingOptionSchema = z.enum([
  'delete_all', // Immediate queue for deletion after cooling period
  'export_first', // Trigger data export before deletion
  'retain_90_days', // Keep data accessible for 90 days after dissolution
])

export type DataHandlingOption = z.infer<typeof dataHandlingOptionSchema>

/**
 * Human-readable labels for data handling options (6th-grade reading level)
 */
export const DATA_HANDLING_OPTION_LABELS: Record<DataHandlingOption, string> = {
  delete_all: 'Delete everything',
  export_first: 'Export my data first, then delete',
  retain_90_days: 'Keep my data for 90 more days',
}

/**
 * Descriptions for data handling options (6th-grade reading level)
 */
export const DATA_HANDLING_OPTION_DESCRIPTIONS: Record<DataHandlingOption, string> = {
  delete_all:
    'All family data will be deleted after 30 days. This cannot be undone.',
  export_first:
    'Download all your data first. After you confirm, data will be deleted in 30 days.',
  retain_90_days:
    'Your data stays available for 90 days. This gives you more time to export or reconsider.',
}

/**
 * Dissolution status tracking
 * Represents the current state of a dissolution request
 */
export const dissolutionStatusSchema = z.enum([
  'pending_acknowledgment', // Waiting for other guardians to acknowledge
  'cooling_period', // All acknowledged, 30-day countdown active
  'cancelled', // Dissolution was cancelled by a guardian
  'completed', // Family was dissolved and data deleted
])

export type DissolutionStatus = z.infer<typeof dissolutionStatusSchema>

/**
 * Human-readable labels for dissolution status (6th-grade reading level)
 */
export const DISSOLUTION_STATUS_LABELS: Record<DissolutionStatus, string> = {
  pending_acknowledgment: 'Waiting for other family members',
  cooling_period: 'Waiting period active',
  cancelled: 'Dissolution cancelled',
  completed: 'Family dissolved',
}

/**
 * Guardian acknowledgment record
 * Tracks when each guardian acknowledged the dissolution request
 */
export const dissolutionAcknowledgmentSchema = z.object({
  /** Guardian user ID */
  guardianId: z.string().min(1, 'Guardian ID is required'),

  /** When the guardian acknowledged */
  acknowledgedAt: z.date(),
})

export type DissolutionAcknowledgment = z.infer<typeof dissolutionAcknowledgmentSchema>

/**
 * Firestore-compatible acknowledgment schema
 */
export const dissolutionAcknowledgmentFirestoreSchema = z.object({
  guardianId: z.string().min(1),
  acknowledgedAt: z.custom<{ toDate: () => Date }>(
    (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
  ),
})

export type DissolutionAcknowledgmentFirestore = z.infer<
  typeof dissolutionAcknowledgmentFirestoreSchema
>

/**
 * Family dissolution request stored in family document
 * This is a subdocument of the family document
 */
export const familyDissolutionSchema = z.object({
  /** Current status of the dissolution process */
  status: dissolutionStatusSchema,

  /** Guardian who initiated the dissolution */
  initiatedBy: z.string().min(1, 'Initiator ID is required'),

  /** When dissolution was initiated */
  initiatedAt: z.date(),

  /** Selected data handling option */
  dataHandlingOption: dataHandlingOptionSchema,

  /** List of guardian acknowledgments (for shared custody families) */
  acknowledgments: z.array(dissolutionAcknowledgmentSchema),

  /** When all acknowledgments were received (null if still waiting) */
  allAcknowledgedAt: z.date().nullable(),

  /** When the cooling period ends and deletion will occur */
  scheduledDeletionAt: z.date().nullable(),

  /** Who cancelled the dissolution (null if not cancelled) */
  cancelledBy: z.string().nullable(),

  /** When dissolution was cancelled (null if not cancelled) */
  cancelledAt: z.date().nullable(),
})

export type FamilyDissolution = z.infer<typeof familyDissolutionSchema>

/**
 * Firestore-compatible dissolution schema
 */
export const familyDissolutionFirestoreSchema = z.object({
  status: dissolutionStatusSchema,
  initiatedBy: z.string().min(1),
  initiatedAt: z.custom<{ toDate: () => Date }>(
    (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
  ),
  dataHandlingOption: dataHandlingOptionSchema,
  acknowledgments: z.array(dissolutionAcknowledgmentFirestoreSchema),
  allAcknowledgedAt: z
    .custom<{ toDate: () => Date } | null>(
      (val) =>
        val === null ||
        (val && typeof (val as { toDate?: () => Date }).toDate === 'function')
    )
    .nullable(),
  scheduledDeletionAt: z
    .custom<{ toDate: () => Date } | null>(
      (val) =>
        val === null ||
        (val && typeof (val as { toDate?: () => Date }).toDate === 'function')
    )
    .nullable(),
  cancelledBy: z.string().nullable(),
  cancelledAt: z
    .custom<{ toDate: () => Date } | null>(
      (val) =>
        val === null ||
        (val && typeof (val as { toDate?: () => Date }).toDate === 'function')
    )
    .nullable(),
})

export type FamilyDissolutionFirestore = z.infer<typeof familyDissolutionFirestoreSchema>

/**
 * Input schema for initiating dissolution
 */
export const initiateDissolutionInputSchema = z.object({
  /** Family ID to dissolve */
  familyId: z.string().min(1, 'Family ID is required'),

  /** Selected data handling option */
  dataHandlingOption: dataHandlingOptionSchema,

  /** Fresh re-authentication token */
  reauthToken: z.string().min(1, 'Re-authentication is required'),
})

export type InitiateDissolutionInput = z.infer<typeof initiateDissolutionInputSchema>

/**
 * Input schema for acknowledging dissolution
 */
export const acknowledgeDissolutionInputSchema = z.object({
  /** Family ID */
  familyId: z.string().min(1, 'Family ID is required'),
})

export type AcknowledgeDissolutionInput = z.infer<typeof acknowledgeDissolutionInputSchema>

/**
 * Input schema for cancelling dissolution
 */
export const cancelDissolutionInputSchema = z.object({
  /** Family ID */
  familyId: z.string().min(1, 'Family ID is required'),
})

export type CancelDissolutionInput = z.infer<typeof cancelDissolutionInputSchema>

/**
 * Audit metadata for dissolution events
 */
export const dissolutionAuditMetadataSchema = z.object({
  /** Data handling option selected */
  dataHandlingOption: dataHandlingOptionSchema.optional(),

  /** Whether this is a shared custody family */
  isSharedCustody: z.boolean().optional(),

  /** Number of guardians in the family */
  guardianCount: z.number().int().positive().optional(),

  /** Scheduled deletion date */
  scheduledDeletionAt: z.string().optional(),

  /** Who acknowledged (for acknowledgment events) */
  acknowledgedBy: z.string().optional(),

  /** Who cancelled (for cancellation events) */
  cancelledBy: z.string().optional(),

  /** Reason for cancellation (optional) */
  cancellationReason: z.string().optional(),
})

export type DissolutionAuditMetadata = z.infer<typeof dissolutionAuditMetadataSchema>

// ============================================================================
// Constants
// ============================================================================

/**
 * Cooling period before final deletion (in days)
 */
export const COOLING_PERIOD_DAYS = 30

/**
 * Extended retention period for 'retain_90_days' option (in days)
 */
export const EXTENDED_RETENTION_DAYS = 90

/**
 * Time to wait for acknowledgments before proceeding anyway (in days)
 */
export const ACKNOWLEDGMENT_TIMEOUT_DAYS = 14

/**
 * Days before scheduled deletion to send reminder notifications
 */
export const REMINDER_START_DAYS = 7

/**
 * Error messages at 6th-grade reading level (NFR65)
 */
export const DISSOLUTION_ERROR_MESSAGES: Record<string, string> = {
  'family-not-found': 'We could not find this family.',
  'not-a-guardian': 'You are not a member of this family.',
  'reauth-required': 'Please sign in again to confirm this action.',
  'reauth-expired': 'Your sign-in has expired. Please try again.',
  'already-dissolving': 'This family is already being dissolved.',
  'not-pending': 'This family is not being dissolved.',
  'already-acknowledged': 'You have already acknowledged this.',
  'cannot-acknowledge-own': 'You started this dissolution. You do not need to acknowledge.',
  'cannot-cancel': 'This dissolution cannot be cancelled right now.',
  'dissolution-failed': 'Could not start dissolution. Please try again.',
  'acknowledgment-failed': 'Could not record your acknowledgment. Please try again.',
  'cancellation-failed': 'Could not cancel dissolution. Please try again.',
  'network-error': 'Connection problem. Please check your internet and try again.',
  default: 'Something went wrong. Please try again.',
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get human-readable error message for dissolution errors
 * @param code Error code
 * @returns User-friendly error message at 6th-grade reading level
 */
export function getDissolutionErrorMessage(code: string): string {
  return DISSOLUTION_ERROR_MESSAGES[code] || DISSOLUTION_ERROR_MESSAGES.default
}

/**
 * Get human-readable label for data handling option
 */
export function getDataHandlingOptionLabel(option: DataHandlingOption): string {
  return DATA_HANDLING_OPTION_LABELS[option]
}

/**
 * Get description for data handling option
 */
export function getDataHandlingOptionDescription(option: DataHandlingOption): string {
  return DATA_HANDLING_OPTION_DESCRIPTIONS[option]
}

/**
 * Get human-readable label for dissolution status
 */
export function getDissolutionStatusLabel(status: DissolutionStatus): string {
  return DISSOLUTION_STATUS_LABELS[status]
}

/**
 * Convert Firestore dissolution to domain type
 */
export function convertFirestoreToDissolution(
  data: FamilyDissolutionFirestore
): FamilyDissolution {
  return familyDissolutionSchema.parse({
    status: data.status,
    initiatedBy: data.initiatedBy,
    initiatedAt: data.initiatedAt.toDate(),
    dataHandlingOption: data.dataHandlingOption,
    acknowledgments: data.acknowledgments.map((ack) => ({
      guardianId: ack.guardianId,
      acknowledgedAt: ack.acknowledgedAt.toDate(),
    })),
    allAcknowledgedAt: data.allAcknowledgedAt?.toDate() ?? null,
    scheduledDeletionAt: data.scheduledDeletionAt?.toDate() ?? null,
    cancelledBy: data.cancelledBy,
    cancelledAt: data.cancelledAt?.toDate() ?? null,
  })
}

/**
 * Safely parse dissolution data, returning null if invalid
 */
export function safeParseDissolution(data: unknown): FamilyDissolution | null {
  const result = familyDissolutionSchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Validate initiate dissolution input
 * @throws ZodError if validation fails
 */
export function validateInitiateDissolutionInput(data: unknown): InitiateDissolutionInput {
  return initiateDissolutionInputSchema.parse(data)
}

/**
 * Safely parse initiate dissolution input
 */
export function safeParseInitiateDissolutionInput(
  data: unknown
): InitiateDissolutionInput | null {
  const result = initiateDissolutionInputSchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Calculate scheduled deletion date based on data handling option
 */
export function calculateScheduledDeletionDate(
  dataHandlingOption: DataHandlingOption,
  fromDate: Date = new Date()
): Date {
  const days =
    dataHandlingOption === 'retain_90_days'
      ? EXTENDED_RETENTION_DAYS
      : COOLING_PERIOD_DAYS

  return new Date(fromDate.getTime() + days * 24 * 60 * 60 * 1000)
}

/**
 * Calculate days remaining until scheduled deletion
 */
export function calculateDaysRemaining(scheduledDeletionAt: Date | null): number | null {
  if (!scheduledDeletionAt) return null

  const now = new Date()
  const diffMs = scheduledDeletionAt.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000))

  return Math.max(0, diffDays)
}

/**
 * Check if dissolution can be cancelled
 * Dissolution can be cancelled during pending_acknowledgment or cooling_period
 */
export function canCancelDissolution(status: DissolutionStatus | null): boolean {
  return status === 'pending_acknowledgment' || status === 'cooling_period'
}

/**
 * Check if guardian needs to acknowledge
 * Returns true if dissolution is pending and guardian hasn't acknowledged
 */
export function needsAcknowledgment(
  dissolution: FamilyDissolution | null,
  guardianId: string
): boolean {
  if (!dissolution) return false
  if (dissolution.status !== 'pending_acknowledgment') return false
  if (dissolution.initiatedBy === guardianId) return false // Initiator doesn't need to acknowledge

  return !dissolution.acknowledgments.some((ack) => ack.guardianId === guardianId)
}

/**
 * Get list of guardians who still need to acknowledge
 */
export function getPendingAcknowledgments(
  dissolution: FamilyDissolution | null,
  guardianIds: string[]
): string[] {
  if (!dissolution) return []
  if (dissolution.status !== 'pending_acknowledgment') return []

  const acknowledgedIds = new Set([
    dissolution.initiatedBy, // Initiator implicitly acknowledged
    ...dissolution.acknowledgments.map((ack) => ack.guardianId),
  ])

  return guardianIds.filter((id) => !acknowledgedIds.has(id))
}

/**
 * Check if all guardians have acknowledged
 */
export function allGuardiansAcknowledged(
  dissolution: FamilyDissolution | null,
  guardianIds: string[]
): boolean {
  return getPendingAcknowledgments(dissolution, guardianIds).length === 0
}
