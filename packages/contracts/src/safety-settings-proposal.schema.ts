import { z } from 'zod'

/**
 * Safety Settings Proposal Schema - Story 3A.2: Safety Settings Two-Parent Approval
 *
 * This schema defines types for dual-approval of safety setting changes in shared custody families.
 * One parent cannot unilaterally weaken protections - both must approve.
 *
 * Security invariants:
 * 1. Safety setting changes are proposed, not immediately applied (shared custody)
 * 2. Other parent must approve within 72 hours or change expires
 * 3. Declined changes can be re-proposed after 7-day cooldown
 * 4. Emergency safety increases take effect immediately (subject to 48-hour review)
 * 5. All proposals are immutable audit trail entries
 */

// ============================================
// SAFETY SETTING TYPES
// ============================================

/**
 * Types of safety settings that require dual-approval in shared custody
 */
export const safetySettingTypeSchema = z.enum([
  'monitoring_interval', // How often screenshots are captured (in minutes)
  'retention_period', // How long screenshots are kept (in days)
  'age_restriction', // Content filtering level based on age category
  'screen_time_daily', // Daily total screen time limit (in minutes)
  'screen_time_per_app', // Per-app time limit (in minutes)
  'bedtime_start', // Bedtime lockout start time
  'bedtime_end', // Bedtime lockout end time
  'crisis_allowlist', // Crisis resource allowlist additions
])

export type SafetySettingType = z.infer<typeof safetySettingTypeSchema>

/**
 * Human-readable labels for safety setting types
 */
export const SAFETY_SETTING_TYPE_LABELS: Record<SafetySettingType, string> = {
  monitoring_interval: 'Monitoring interval',
  retention_period: 'Screenshot retention period',
  age_restriction: 'Content age restriction',
  screen_time_daily: 'Daily screen time limit',
  screen_time_per_app: 'Per-app time limit',
  bedtime_start: 'Bedtime start time',
  bedtime_end: 'Bedtime end time',
  crisis_allowlist: 'Crisis resource allowlist',
}

/**
 * Get human-readable label for a safety setting type
 */
export function getSafetySettingTypeLabel(settingType: SafetySettingType): string {
  return SAFETY_SETTING_TYPE_LABELS[settingType]
}

// ============================================
// PROPOSAL STATUS
// ============================================

/**
 * Status of a safety settings proposal
 *
 * Story 3A.4 adds cooling period statuses for protection decreases:
 * - cooling_in_progress: Approved but in 48-hour cooling period before taking effect
 * - cooling_cancelled: Cooling period was cancelled by a guardian, change reverted
 * - cooling_completed: Cooling period finished, change now applied
 */
export const proposalStatusSchema = z.enum([
  'pending', // Waiting for other parent's response
  'approved', // Other parent approved, change applied (protection increase or no cooling needed)
  'declined', // Other parent declined
  'expired', // 72 hours passed without response
  'auto_applied', // Emergency safety increase, applied immediately
  'disputed', // Auto-applied change disputed within 48 hours
  'reverted', // Disputed auto-applied change reverted to original
  'cooling_in_progress', // Story 3A.4: Approved protection decrease in 48-hour cooling period
  'cooling_cancelled', // Story 3A.4: Cooling period cancelled, change not applied
  'cooling_completed', // Story 3A.4: Cooling period finished, change applied
])

export type ProposalStatus = z.infer<typeof proposalStatusSchema>

/**
 * Human-readable labels for proposal statuses
 */
export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  pending: 'Waiting for approval',
  approved: 'Approved and applied',
  declined: 'Declined by co-parent',
  expired: 'Expired (no response)',
  auto_applied: 'Applied immediately (emergency)',
  disputed: 'Under dispute review',
  reverted: 'Reverted to original',
  cooling_in_progress: 'In 48-hour cooling period',
  cooling_cancelled: 'Cancelled during cooling period',
  cooling_completed: 'Cooling period complete, applied',
}

/**
 * Get human-readable label for a proposal status
 */
export function getProposalStatusLabel(status: ProposalStatus): string {
  return PROPOSAL_STATUS_LABELS[status]
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Maximum string lengths for proposal fields
 * Prevents storage bloat from malicious inputs
 */
export const PROPOSAL_FIELD_LIMITS = {
  id: 128,
  childId: 128,
  proposedBy: 128,
  respondedBy: 128,
  declineMessage: 500,
  disputeReason: 500,
} as const

/**
 * Time limits for proposal workflows (in milliseconds)
 */
export const PROPOSAL_TIME_LIMITS = {
  /** 72 hours for other parent to respond */
  RESPONSE_WINDOW_MS: 72 * 60 * 60 * 1000,
  /** 48 hours to dispute emergency auto-applied changes */
  DISPUTE_WINDOW_MS: 48 * 60 * 60 * 1000,
  /** 7 days before a declined proposal can be re-proposed */
  REPROPOSAL_COOLDOWN_MS: 7 * 24 * 60 * 60 * 1000,
  /** Story 3A.4: 48 hours cooling period before protection decreases take effect */
  COOLING_PERIOD_MS: 48 * 60 * 60 * 1000,
} as const

/**
 * Rate limiting for proposals
 */
export const PROPOSAL_RATE_LIMIT = {
  MAX_PROPOSALS_PER_HOUR: 10,
  WINDOW_MS: 60 * 60 * 1000,
} as const

// ============================================
// SAFETY SETTINGS PROPOSAL
// ============================================

/**
 * A safety setting value (can be number, string, or boolean depending on setting type)
 */
export const safetySettingValueSchema = z.union([
  z.number().int().min(0),
  z.string().max(256),
  z.boolean(),
])

export type SafetySettingValue = z.infer<typeof safetySettingValueSchema>

/**
 * A proposed safety setting change
 */
export const safetySettingsProposalSchema = z.object({
  /** Unique proposal ID (Firestore document ID) */
  id: z.string().min(1, 'Proposal ID is required').max(PROPOSAL_FIELD_LIMITS.id),

  /** Child ID whose settings are being changed */
  childId: z.string().min(1, 'Child ID is required').max(PROPOSAL_FIELD_LIMITS.childId),

  /** Guardian who proposed the change */
  proposedBy: z.string().min(1, 'Proposer ID is required').max(PROPOSAL_FIELD_LIMITS.proposedBy),

  /** Type of safety setting being changed */
  settingType: safetySettingTypeSchema,

  /** Current value of the setting */
  currentValue: safetySettingValueSchema,

  /** Proposed new value */
  proposedValue: safetySettingValueSchema,

  /** Current status of the proposal */
  status: proposalStatusSchema,

  /** When the proposal was created */
  createdAt: z.date(),

  /** When the proposal expires (72 hours from creation for pending) */
  expiresAt: z.date(),

  /** Whether this is an emergency safety increase (auto-applies) */
  isEmergencyIncrease: z.boolean(),

  /** Guardian who responded (approved/declined) */
  respondedBy: z.string().max(PROPOSAL_FIELD_LIMITS.respondedBy).optional().nullable(),

  /** When the response was given */
  respondedAt: z.date().optional().nullable(),

  /** Message from declining parent (optional) */
  declineMessage: z.string().max(PROPOSAL_FIELD_LIMITS.declineMessage).optional().nullable(),

  /** When the change was applied (if approved or auto-applied) */
  appliedAt: z.date().optional().nullable(),

  /** Dispute details for auto-applied changes */
  dispute: z
    .object({
      /** Guardian who disputed */
      disputedBy: z.string().min(1).max(PROPOSAL_FIELD_LIMITS.respondedBy),
      /** When the dispute was filed */
      disputedAt: z.date(),
      /** Reason for dispute */
      reason: z.string().max(PROPOSAL_FIELD_LIMITS.disputeReason).optional(),
      /** When dispute was resolved */
      resolvedAt: z.date().optional().nullable(),
      /** Resolution outcome */
      resolution: z.enum(['confirmed', 'reverted']).optional().nullable(),
    })
    .optional()
    .nullable(),

  /**
   * Story 3A.4: Cooling period details for protection decreases
   * When an approved change reduces protections, it enters a 48-hour cooling period
   * before taking effect. Either parent can cancel during this window.
   */
  coolingPeriod: z
    .object({
      /** When the cooling period started */
      startsAt: z.date(),
      /** When the cooling period ends (startsAt + 48 hours) */
      endsAt: z.date(),
      /** Guardian who cancelled the cooling period (if cancelled) */
      cancelledBy: z.string().max(PROPOSAL_FIELD_LIMITS.respondedBy).optional().nullable(),
      /** When the cooling period was cancelled (if cancelled) */
      cancelledAt: z.date().optional().nullable(),
    })
    .optional()
    .nullable(),
})

export type SafetySettingsProposal = z.infer<typeof safetySettingsProposalSchema>

/**
 * Story 3A.4: Cooling period object type for typed access
 */
export type CoolingPeriod = NonNullable<SafetySettingsProposal['coolingPeriod']>

/**
 * Firestore-compatible safety settings proposal schema (uses Timestamp)
 */
export const safetySettingsProposalFirestoreSchema = z.object({
  id: z.string().min(1).max(PROPOSAL_FIELD_LIMITS.id),
  childId: z.string().min(1).max(PROPOSAL_FIELD_LIMITS.childId),
  proposedBy: z.string().min(1).max(PROPOSAL_FIELD_LIMITS.proposedBy),
  settingType: safetySettingTypeSchema,
  currentValue: safetySettingValueSchema,
  proposedValue: safetySettingValueSchema,
  status: proposalStatusSchema,
  createdAt: z.custom<{ toDate: () => Date }>(
    (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
  ),
  expiresAt: z.custom<{ toDate: () => Date }>(
    (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
  ),
  isEmergencyIncrease: z.boolean(),
  respondedBy: z.string().max(PROPOSAL_FIELD_LIMITS.respondedBy).optional().nullable(),
  respondedAt: z
    .custom<{ toDate: () => Date }>(
      (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
    )
    .optional()
    .nullable(),
  declineMessage: z.string().max(PROPOSAL_FIELD_LIMITS.declineMessage).optional().nullable(),
  appliedAt: z
    .custom<{ toDate: () => Date }>(
      (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
    )
    .optional()
    .nullable(),
  dispute: z
    .object({
      disputedBy: z.string().min(1).max(PROPOSAL_FIELD_LIMITS.respondedBy),
      disputedAt: z.custom<{ toDate: () => Date }>(
        (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
      ),
      reason: z.string().max(PROPOSAL_FIELD_LIMITS.disputeReason).optional(),
      resolvedAt: z
        .custom<{ toDate: () => Date }>(
          (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
        )
        .optional()
        .nullable(),
      resolution: z.enum(['confirmed', 'reverted']).optional().nullable(),
    })
    .optional()
    .nullable(),
  // Story 3A.4: Cooling period for protection decreases
  coolingPeriod: z
    .object({
      startsAt: z.custom<{ toDate: () => Date }>(
        (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
      ),
      endsAt: z.custom<{ toDate: () => Date }>(
        (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
      ),
      cancelledBy: z.string().max(PROPOSAL_FIELD_LIMITS.respondedBy).optional().nullable(),
      cancelledAt: z
        .custom<{ toDate: () => Date }>(
          (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
        )
        .optional()
        .nullable(),
    })
    .optional()
    .nullable(),
})

export type SafetySettingsProposalFirestore = z.infer<typeof safetySettingsProposalFirestoreSchema>

// ============================================
// INPUT SCHEMAS
// ============================================

/**
 * Input schema for creating a safety settings proposal
 */
export const createSafetySettingsProposalInputSchema = z.object({
  /** Child ID whose settings are being changed */
  childId: z.string().min(1, 'Child ID is required').max(PROPOSAL_FIELD_LIMITS.childId),

  /** Type of safety setting being changed */
  settingType: safetySettingTypeSchema,

  /** Proposed new value */
  proposedValue: safetySettingValueSchema,
})

export type CreateSafetySettingsProposalInput = z.infer<
  typeof createSafetySettingsProposalInputSchema
>

/**
 * Input schema for responding to a safety settings proposal
 */
export const respondToProposalInputSchema = z.object({
  /** Proposal ID to respond to */
  proposalId: z.string().min(1, 'Proposal ID is required').max(PROPOSAL_FIELD_LIMITS.id),

  /** Child ID (for validation) */
  childId: z.string().min(1, 'Child ID is required').max(PROPOSAL_FIELD_LIMITS.childId),

  /** Response action */
  action: z.enum(['approve', 'decline']),

  /** Optional message when declining */
  message: z.string().max(PROPOSAL_FIELD_LIMITS.declineMessage).optional(),
})

export type RespondToProposalInput = z.infer<typeof respondToProposalInputSchema>

/**
 * Input schema for disputing an auto-applied change
 */
export const disputeProposalInputSchema = z.object({
  /** Proposal ID to dispute */
  proposalId: z.string().min(1, 'Proposal ID is required').max(PROPOSAL_FIELD_LIMITS.id),

  /** Child ID (for validation) */
  childId: z.string().min(1, 'Child ID is required').max(PROPOSAL_FIELD_LIMITS.childId),

  /** Reason for dispute */
  reason: z.string().max(PROPOSAL_FIELD_LIMITS.disputeReason).optional(),
})

export type DisputeProposalInput = z.infer<typeof disputeProposalInputSchema>

/**
 * Story 3A.4: Input schema for cancelling a cooling period
 * Either guardian can cancel a cooling period, preventing the change from taking effect
 */
export const cancelCoolingPeriodInputSchema = z.object({
  /** Proposal ID with active cooling period */
  proposalId: z.string().min(1, 'Proposal ID is required').max(PROPOSAL_FIELD_LIMITS.id),

  /** Child ID (for validation) */
  childId: z.string().min(1, 'Child ID is required').max(PROPOSAL_FIELD_LIMITS.childId),
})

export type CancelCoolingPeriodInput = z.infer<typeof cancelCoolingPeriodInputSchema>

// ============================================
// CONVERSION UTILITIES
// ============================================

/**
 * Convert Firestore safety settings proposal to domain type
 */
export function convertFirestoreToSafetySettingsProposal(
  data: SafetySettingsProposalFirestore
): SafetySettingsProposal {
  return safetySettingsProposalSchema.parse({
    id: data.id,
    childId: data.childId,
    proposedBy: data.proposedBy,
    settingType: data.settingType,
    currentValue: data.currentValue,
    proposedValue: data.proposedValue,
    status: data.status,
    createdAt: data.createdAt.toDate(),
    expiresAt: data.expiresAt.toDate(),
    isEmergencyIncrease: data.isEmergencyIncrease,
    respondedBy: data.respondedBy,
    respondedAt: data.respondedAt?.toDate() ?? null,
    declineMessage: data.declineMessage,
    appliedAt: data.appliedAt?.toDate() ?? null,
    dispute: data.dispute
      ? {
          disputedBy: data.dispute.disputedBy,
          disputedAt: data.dispute.disputedAt.toDate(),
          reason: data.dispute.reason,
          resolvedAt: data.dispute.resolvedAt?.toDate() ?? null,
          resolution: data.dispute.resolution,
        }
      : null,
    // Story 3A.4: Cooling period conversion
    coolingPeriod: data.coolingPeriod
      ? {
          startsAt: data.coolingPeriod.startsAt.toDate(),
          endsAt: data.coolingPeriod.endsAt.toDate(),
          cancelledBy: data.coolingPeriod.cancelledBy ?? null,
          cancelledAt: data.coolingPeriod.cancelledAt?.toDate() ?? null,
        }
      : null,
  })
}

/**
 * Safely parse safety settings proposal, returning null if invalid
 */
export function safeParseSafetySettingsProposal(data: unknown): SafetySettingsProposal | null {
  const result = safetySettingsProposalSchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Validate create safety settings proposal input
 */
export function validateCreateSafetySettingsProposalInput(
  data: unknown
): CreateSafetySettingsProposalInput {
  return createSafetySettingsProposalInputSchema.parse(data)
}

/**
 * Safely parse create safety settings proposal input
 */
export function safeParseCreateSafetySettingsProposalInput(
  data: unknown
): CreateSafetySettingsProposalInput | null {
  const result = createSafetySettingsProposalInputSchema.safeParse(data)
  return result.success ? result.data : null
}

// ============================================
// EMERGENCY SAFETY INCREASE DETECTION
// ============================================

/**
 * Determine if a proposed change is an emergency safety increase (more restrictive)
 *
 * Emergency safety increases take effect immediately but can be disputed within 48 hours.
 *
 * More restrictive means:
 * - monitoring_interval: DECREASED (more frequent)
 * - retention_period: INCREASED (kept longer)
 * - age_restriction: higher value = more restrictive
 * - screen_time_daily: DECREASED (less time allowed)
 * - screen_time_per_app: DECREASED (less time allowed)
 * - bedtime_start: EARLIER (less evening time)
 * - bedtime_end: LATER (less morning time)
 * - crisis_allowlist: additions are always allowed (emergency protective)
 */
export function isEmergencySafetyIncrease(
  settingType: SafetySettingType,
  currentValue: SafetySettingValue,
  proposedValue: SafetySettingValue
): boolean {
  // Crisis allowlist additions are always emergency protective
  if (settingType === 'crisis_allowlist') {
    return true
  }

  // Handle numeric comparisons
  if (typeof currentValue === 'number' && typeof proposedValue === 'number') {
    switch (settingType) {
      case 'monitoring_interval':
        // More frequent = more restrictive = emergency increase
        return proposedValue < currentValue

      case 'retention_period':
        // Longer retention = more restrictive = emergency increase
        return proposedValue > currentValue

      case 'age_restriction':
        // Higher age restriction = more restrictive = emergency increase
        return proposedValue > currentValue

      case 'screen_time_daily':
      case 'screen_time_per_app':
        // Less time allowed = more restrictive = emergency increase
        return proposedValue < currentValue

      case 'bedtime_start':
        // Earlier bedtime = more restrictive = emergency increase (value is minutes from midnight)
        return proposedValue < currentValue

      case 'bedtime_end':
        // Later wake time = more restrictive = emergency increase (value is minutes from midnight)
        return proposedValue > currentValue
    }
  }

  // String or boolean comparisons - not considered emergency by default
  return false
}

// ============================================
// STORY 3A.4: COOLING PERIOD DETECTION
// ============================================

/**
 * Story 3A.4: Determine if an approved change requires a cooling period
 *
 * Cooling periods are required when a change REDUCES protections (opposite of emergency increase).
 * The child and both parents need 48 hours to reconsider before the change takes effect.
 *
 * IMPORTANT: This is the INVERSE of isEmergencySafetyIncrease:
 * - isEmergencySafetyIncrease === true → No cooling period (protection UP, auto-apply)
 * - requiresCoolingPeriod === true → Cooling period needed (protection DOWN, delay apply)
 *
 * Protection reductions:
 * - monitoring_interval: INCREASED (less frequent monitoring)
 * - retention_period: DECREASED (screenshots kept shorter)
 * - age_restriction: LOWERED (less content filtering)
 * - screen_time_daily: INCREASED (more time allowed)
 * - screen_time_per_app: INCREASED (more time allowed)
 * - bedtime_start: DELAYED (later bedtime = more evening time)
 * - bedtime_end: ADVANCED (earlier wake = less sleep requirement)
 * - crisis_allowlist: NEVER reduces protection (additions are always protective)
 */
export function requiresCoolingPeriod(
  settingType: SafetySettingType,
  currentValue: SafetySettingValue,
  proposedValue: SafetySettingValue
): boolean {
  // Crisis allowlist changes never reduce protection
  if (settingType === 'crisis_allowlist') {
    return false
  }

  // Handle numeric comparisons
  if (typeof currentValue === 'number' && typeof proposedValue === 'number') {
    switch (settingType) {
      case 'monitoring_interval':
        // Less frequent monitoring = reduces protection = cooling period required
        return proposedValue > currentValue

      case 'retention_period':
        // Shorter retention = reduces protection = cooling period required
        return proposedValue < currentValue

      case 'age_restriction':
        // Lower age restriction = reduces protection = cooling period required
        return proposedValue < currentValue

      case 'screen_time_daily':
      case 'screen_time_per_app':
        // More time allowed = reduces protection = cooling period required
        return proposedValue > currentValue

      case 'bedtime_start':
        // Later bedtime = reduces protection = cooling period required (value is minutes from midnight)
        return proposedValue > currentValue

      case 'bedtime_end':
        // Earlier wake time = reduces protection = cooling period required (value is minutes from midnight)
        return proposedValue < currentValue
    }
  }

  // String or boolean comparisons - default to no cooling period
  return false
}

// ============================================
// PROPOSAL WORKFLOW UTILITIES
// ============================================

/**
 * Check if a guardian can respond to a proposal (within 72-hour window)
 */
export function canRespondToProposal(proposal: SafetySettingsProposal, now: Date = new Date()): boolean {
  // Can only respond to pending proposals
  if (proposal.status !== 'pending') {
    return false
  }

  // Check if within the 72-hour window
  return now.getTime() < proposal.expiresAt.getTime()
}

/**
 * Check if a guardian can dispute an auto-applied proposal (within 48-hour window)
 */
export function canDisputeProposal(proposal: SafetySettingsProposal, now: Date = new Date()): boolean {
  // Can only dispute auto_applied proposals
  if (proposal.status !== 'auto_applied') {
    return false
  }

  // Must have an appliedAt date
  if (!proposal.appliedAt) {
    return false
  }

  // Check if within the 48-hour dispute window
  const disputeDeadline = new Date(
    proposal.appliedAt.getTime() + PROPOSAL_TIME_LIMITS.DISPUTE_WINDOW_MS
  )
  return now.getTime() < disputeDeadline.getTime()
}

/**
 * Check if a guardian can re-propose a declined setting (after 7-day cooldown)
 */
export function canRepropose(
  settingType: SafetySettingType,
  childId: string,
  declinedProposals: SafetySettingsProposal[],
  now: Date = new Date()
): boolean {
  // Find the most recent declined proposal for this setting type and child
  const recentDeclined = declinedProposals
    .filter(
      (p) =>
        p.childId === childId &&
        p.settingType === settingType &&
        p.status === 'declined' &&
        p.respondedAt
    )
    .sort((a, b) => (b.respondedAt?.getTime() ?? 0) - (a.respondedAt?.getTime() ?? 0))[0]

  // No declined proposals = can propose
  if (!recentDeclined || !recentDeclined.respondedAt) {
    return true
  }

  // Check if 7-day cooldown has passed
  const cooldownEnd = new Date(
    recentDeclined.respondedAt.getTime() + PROPOSAL_TIME_LIMITS.REPROPOSAL_COOLDOWN_MS
  )
  return now.getTime() >= cooldownEnd.getTime()
}

/**
 * Calculate proposal expiry date (72 hours from creation)
 */
export function calculateProposalExpiry(createdAt: Date): Date {
  return new Date(createdAt.getTime() + PROPOSAL_TIME_LIMITS.RESPONSE_WINDOW_MS)
}

/**
 * Calculate time remaining until proposal expires
 */
export function getProposalTimeUntilExpiry(proposal: SafetySettingsProposal, now: Date = new Date()): number {
  const remaining = proposal.expiresAt.getTime() - now.getTime()
  return Math.max(0, remaining)
}

/**
 * Calculate dispute deadline for auto-applied proposals
 */
export function calculateDisputeDeadline(appliedAt: Date): Date {
  return new Date(appliedAt.getTime() + PROPOSAL_TIME_LIMITS.DISPUTE_WINDOW_MS)
}

/**
 * Calculate re-proposal date after decline
 */
export function calculateReproposalDate(declinedAt: Date): Date {
  return new Date(declinedAt.getTime() + PROPOSAL_TIME_LIMITS.REPROPOSAL_COOLDOWN_MS)
}

// ============================================
// STORY 3A.4: COOLING PERIOD UTILITIES
// ============================================

/**
 * Story 3A.4: Calculate cooling period end date (48 hours from start)
 */
export function calculateCoolingPeriodEnd(startsAt: Date): Date {
  return new Date(startsAt.getTime() + PROPOSAL_TIME_LIMITS.COOLING_PERIOD_MS)
}

/**
 * Story 3A.4: Get milliseconds remaining in cooling period
 * Returns 0 if cooling period has ended or proposal not in cooling period
 */
export function getCoolingPeriodTimeRemaining(
  proposal: SafetySettingsProposal,
  now: Date = new Date()
): number {
  // Must be in cooling period status
  if (proposal.status !== 'cooling_in_progress') {
    return 0
  }

  // Must have cooling period data
  if (!proposal.coolingPeriod) {
    return 0
  }

  const remaining = proposal.coolingPeriod.endsAt.getTime() - now.getTime()
  return Math.max(0, remaining)
}

/**
 * Story 3A.4: Format cooling period countdown for display
 * Returns human-readable string like "23 hours, 45 minutes" or "Cooling period ended"
 */
export function formatCoolingPeriodCountdown(
  proposal: SafetySettingsProposal,
  now: Date = new Date()
): string {
  const remaining = getCoolingPeriodTimeRemaining(proposal, now)

  if (remaining === 0) {
    return 'Cooling period ended'
  }

  const hours = Math.floor(remaining / (60 * 60 * 1000))
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))

  if (hours === 0) {
    return minutes === 1 ? '1 minute' : `${minutes} minutes`
  }

  if (minutes === 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`
  }

  const hourStr = hours === 1 ? '1 hour' : `${hours} hours`
  const minStr = minutes === 1 ? '1 minute' : `${minutes} minutes`
  return `${hourStr}, ${minStr}`
}

/**
 * Story 3A.4: Check if proposal is currently in an active cooling period
 */
export function isCoolingPeriodActive(
  proposal: SafetySettingsProposal,
  now: Date = new Date()
): boolean {
  // Must be in cooling_in_progress status
  if (proposal.status !== 'cooling_in_progress') {
    return false
  }

  // Must have cooling period data
  if (!proposal.coolingPeriod) {
    return false
  }

  // Check if within the cooling window
  const { startsAt, endsAt } = proposal.coolingPeriod
  return now.getTime() >= startsAt.getTime() && now.getTime() < endsAt.getTime()
}

/**
 * Story 3A.4: Check if a guardian can cancel a cooling period
 * Returns true if proposal is in cooling_in_progress status and within the window
 */
export function canCancelCoolingPeriod(
  proposal: SafetySettingsProposal,
  now: Date = new Date()
): boolean {
  return isCoolingPeriodActive(proposal, now)
}

// ============================================
// DIFF FORMATTING
// ============================================

/**
 * Format a proposal diff for display
 * Shows current value vs proposed value in human-readable format
 */
export function formatProposalDiff(proposal: SafetySettingsProposal): string {
  const settingLabel = SAFETY_SETTING_TYPE_LABELS[proposal.settingType]
  const currentFormatted = formatSettingValue(proposal.settingType, proposal.currentValue)
  const proposedFormatted = formatSettingValue(proposal.settingType, proposal.proposedValue)

  return `${settingLabel}: ${currentFormatted} → ${proposedFormatted}`
}

/**
 * Format a setting value for human-readable display
 */
export function formatSettingValue(
  settingType: SafetySettingType,
  value: SafetySettingValue
): string {
  if (typeof value === 'boolean') {
    return value ? 'Enabled' : 'Disabled'
  }

  if (typeof value === 'string') {
    return value
  }

  // Handle numeric values with appropriate units
  switch (settingType) {
    case 'monitoring_interval':
      return value === 1 ? '1 minute' : `${value} minutes`

    case 'retention_period':
      return value === 1 ? '1 day' : `${value} days`

    case 'age_restriction':
      return `Age ${value}+`

    case 'screen_time_daily':
    case 'screen_time_per_app':
      if (value < 60) {
        return value === 1 ? '1 minute' : `${value} minutes`
      }
      const hours = Math.floor(value / 60)
      const minutes = value % 60
      if (minutes === 0) {
        return hours === 1 ? '1 hour' : `${hours} hours`
      }
      return `${hours}h ${minutes}m`

    case 'bedtime_start':
    case 'bedtime_end':
      // Value is minutes from midnight
      const h = Math.floor(value / 60)
      const m = value % 60
      const period = h >= 12 ? 'PM' : 'AM'
      const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h
      return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`

    default:
      return String(value)
  }
}

// ============================================
// ERROR MESSAGES
// ============================================

/**
 * Error messages for safety settings proposal operations (6th-grade reading level)
 */
export const SAFETY_PROPOSAL_ERROR_MESSAGES: Record<string, string> = {
  'not-found': 'Could not find the proposal.',
  'not-guardian': 'You must be a guardian of this child to make this change.',
  'not-shared-custody': 'This child is not in shared custody. Changes apply immediately.',
  'proposal-expired': 'This proposal has expired. You can create a new one.',
  'already-responded': 'Someone already responded to this proposal.',
  'cannot-respond-own': 'You cannot approve or decline your own proposal.',
  'cooldown-active':
    'This setting was recently declined. Please wait 7 days before proposing again.',
  'dispute-expired': 'The 48-hour dispute window has passed.',
  'cannot-dispute-own': 'You cannot dispute your own proposal.',
  'rate-limit': 'You have made too many proposals. Please wait an hour.',
  'invalid-setting': 'The setting type is not valid.',
  'invalid-value': 'The proposed value is not valid for this setting.',
  // Story 3A.4: Cooling period error messages
  'not-in-cooling-period': 'This change is not in a cooling period.',
  'cooling-period-expired': 'The cooling period has already ended.',
  'cooling-already-cancelled': 'This cooling period was already cancelled.',
  unknown: 'Something went wrong. Please try again.',
}

/**
 * Get user-friendly error message for safety proposal operations
 */
export function getSafetyProposalErrorMessage(
  code: keyof typeof SAFETY_PROPOSAL_ERROR_MESSAGES | string
): string {
  return SAFETY_PROPOSAL_ERROR_MESSAGES[code] || SAFETY_PROPOSAL_ERROR_MESSAGES.unknown
}
