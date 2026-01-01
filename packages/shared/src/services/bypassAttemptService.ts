/**
 * BypassAttemptService - Story 36.5 Task 1
 *
 * Service for logging and retrieving bypass attempts.
 * AC1: Log bypass attempts with timestamp and context
 * AC3: Bypass attempts expire after configurable period
 * AC6: Distinguish between intentional bypass vs accidental
 */

// ============================================================================
// Constants
// ============================================================================

/** Default number of days before a bypass attempt expires */
export const BYPASS_EXPIRY_DAYS_DEFAULT = 30

/** Impact reduction factor when marked as unintentional */
const UNINTENTIONAL_IMPACT_REDUCTION = 0.5

// ============================================================================
// Types
// ============================================================================

export type BypassAttemptType =
  | 'extension-disable'
  | 'settings-change'
  | 'vpn-detected'
  | 'proxy-detected'
  | 'other'

export interface BypassAttempt {
  /** Unique identifier */
  id: string
  /** Child ID this attempt belongs to */
  childId: string
  /** Device ID where the attempt occurred */
  deviceId: string
  /** Type of bypass attempt */
  attemptType: BypassAttemptType
  /** Context/description of the attempt */
  context: string
  /** When the attempt occurred */
  occurredAt: Date
  /** When this attempt should expire from affecting score */
  expiresAt: Date
  /** Impact on trust score (negative number) */
  impactOnScore: number
  /** Whether the attempt was intentional (null = unknown) */
  wasIntentional: boolean | null
}

export interface CreateBypassAttemptInput {
  childId: string
  deviceId: string
  attemptType: BypassAttemptType
  context: string
  expiryDays?: number
}

export interface GetBypassAttemptsOptions {
  childId?: string
  includeExpired?: boolean
}

// ============================================================================
// Impact Calculation
// ============================================================================

const IMPACT_BY_TYPE: Record<BypassAttemptType, number> = {
  'extension-disable': -10,
  'settings-change': -8,
  'vpn-detected': -20,
  'proxy-detected': -20,
  other: -5,
}

/**
 * Calculate the impact on trust score for a bypass attempt type.
 * @param attemptType - The type of bypass attempt
 * @returns Negative number representing score impact
 */
export function calculateBypassImpact(attemptType: BypassAttemptType): number {
  return IMPACT_BY_TYPE[attemptType]
}

// ============================================================================
// ID Generation
// ============================================================================

let idCounter = 0

function generateId(): string {
  return `bypass-${Date.now()}-${++idCounter}-${Math.random().toString(36).substring(2, 9)}`
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Create a new bypass attempt record.
 * @param input - Bypass attempt data
 * @returns Created bypass attempt
 */
export function createBypassAttempt(input: CreateBypassAttemptInput): BypassAttempt {
  const now = new Date()
  const expiryDays = input.expiryDays ?? BYPASS_EXPIRY_DAYS_DEFAULT
  const expiresAt = new Date(now)
  expiresAt.setDate(expiresAt.getDate() + expiryDays)

  return {
    id: generateId(),
    childId: input.childId,
    deviceId: input.deviceId,
    attemptType: input.attemptType,
    context: input.context,
    occurredAt: now,
    expiresAt,
    impactOnScore: calculateBypassImpact(input.attemptType),
    wasIntentional: null,
  }
}

/**
 * Check if a bypass attempt has expired.
 * @param attempt - The bypass attempt to check
 * @returns True if expired
 */
export function isExpired(attempt: BypassAttempt): boolean {
  return new Date() > attempt.expiresAt
}

/**
 * Get only active (non-expired) bypass attempts.
 * @param attempts - Array of bypass attempts
 * @returns Filtered array of active attempts
 */
export function getActiveBypassAttempts(attempts: BypassAttempt[]): BypassAttempt[] {
  return attempts.filter((attempt) => !isExpired(attempt))
}

/**
 * Get bypass attempts with optional filtering.
 * @param attempts - Array of all bypass attempts
 * @param options - Filter options
 * @returns Filtered and sorted array of bypass attempts
 */
export function getBypassAttempts(
  attempts: BypassAttempt[],
  options: GetBypassAttemptsOptions = {}
): BypassAttempt[] {
  let filtered = attempts

  // Filter by child ID if provided
  if (options.childId) {
    filtered = filtered.filter((a) => a.childId === options.childId)
  }

  // Filter out expired unless includeExpired is true
  if (!options.includeExpired) {
    filtered = getActiveBypassAttempts(filtered)
  }

  // Sort by occurredAt descending (most recent first)
  return filtered.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
}

/**
 * Mark a bypass attempt as unintentional.
 * This reduces the impact on trust score.
 * @param attempt - The bypass attempt to update
 * @returns Updated bypass attempt
 */
export function markAsUnintentional(attempt: BypassAttempt): BypassAttempt {
  // Reduce the impact by half when marked as unintentional
  const reducedImpact = Math.round(attempt.impactOnScore * UNINTENTIONAL_IMPACT_REDUCTION)

  return {
    ...attempt,
    wasIntentional: false,
    impactOnScore: reducedImpact,
  }
}
