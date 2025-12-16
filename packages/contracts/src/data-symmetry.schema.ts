import { z } from 'zod'

/**
 * Data Symmetry Schema - Story 3A.1: Data Symmetry Enforcement
 *
 * This schema defines types for enforcing data symmetry in shared custody families.
 * Both co-parents must see identical data with identical timestamps - no parent
 * should have an information advantage in custody situations.
 *
 * Security invariants:
 * 1. Both parents see identical data with identical timestamps
 * 2. No data is filtered, delayed, or modified based on which parent is viewing
 * 3. Firestore Security Rules enforce read equality (both or neither)
 * 4. Viewing timestamps are logged per-parent in audit trail
 * 5. New data visible to both parents simultaneously (no "first viewer" advantage)
 * 6. If one parent's access is revoked, data becomes inaccessible to both
 */

// ============================================
// DATA VIEW TYPES
// ============================================

/**
 * Types of data that can be viewed by guardians
 */
export const dataViewTypeSchema = z.enum([
  'child_profile',
  'screenshot',
  'screenshot_list',
  'activity_log',
  'activity_summary',
  'device_status',
  'flag',
  'flag_list',
  'agreement',
  'trust_score',
])

export type DataViewType = z.infer<typeof dataViewTypeSchema>

/**
 * Human-readable labels for data view types
 */
export const DATA_VIEW_TYPE_LABELS: Record<DataViewType, string> = {
  child_profile: 'Child profile',
  screenshot: 'Screenshot',
  screenshot_list: 'Screenshot list',
  activity_log: 'Activity log',
  activity_summary: 'Activity summary',
  device_status: 'Device status',
  flag: 'Flag',
  flag_list: 'Flag list',
  agreement: 'Agreement',
  trust_score: 'Trust score',
}

// ============================================
// DATA VIEW AUDIT ENTRY
// ============================================

/**
 * Maximum string lengths for audit entry fields
 * Prevents storage bloat from malicious inputs
 */
export const AUDIT_FIELD_LIMITS = {
  id: 128,
  childId: 128,
  viewedBy: 128,
  resourceId: 256,
  sessionId: 128,
  userAgent: 512,
  platform: 64,
  appVersion: 32,
} as const

/**
 * Audit entry for a data view action
 * Records when a guardian views child data for symmetry enforcement
 */
export const dataViewAuditEntrySchema = z.object({
  /** Unique audit entry ID (Firestore document ID) */
  id: z.string().min(1, 'Audit entry ID is required').max(AUDIT_FIELD_LIMITS.id),

  /** Child ID whose data was viewed */
  childId: z.string().min(1, 'Child ID is required').max(AUDIT_FIELD_LIMITS.childId),

  /** Guardian who viewed the data */
  viewedBy: z.string().min(1, 'Viewer ID is required').max(AUDIT_FIELD_LIMITS.viewedBy),

  /** Type of data viewed */
  dataType: dataViewTypeSchema,

  /** Specific resource ID if applicable (e.g., screenshot ID) */
  resourceId: z.string().max(AUDIT_FIELD_LIMITS.resourceId).optional().nullable(),

  /** When the view occurred */
  viewedAt: z.date(),

  /** Number of items viewed (for list views) */
  itemCount: z.number().int().min(0).optional(),

  /** Session ID for grouping related views */
  sessionId: z.string().max(AUDIT_FIELD_LIMITS.sessionId).optional(),

  /** Client metadata (device, browser, etc.) */
  clientInfo: z
    .object({
      userAgent: z.string().max(AUDIT_FIELD_LIMITS.userAgent).optional(),
      platform: z.string().max(AUDIT_FIELD_LIMITS.platform).optional(),
      appVersion: z.string().max(AUDIT_FIELD_LIMITS.appVersion).optional(),
    })
    .optional(),
})

export type DataViewAuditEntry = z.infer<typeof dataViewAuditEntrySchema>

/**
 * Firestore-compatible data view audit entry schema (uses Timestamp)
 */
export const dataViewAuditEntryFirestoreSchema = z.object({
  id: z.string().min(1).max(AUDIT_FIELD_LIMITS.id),
  childId: z.string().min(1).max(AUDIT_FIELD_LIMITS.childId),
  viewedBy: z.string().min(1).max(AUDIT_FIELD_LIMITS.viewedBy),
  dataType: dataViewTypeSchema,
  resourceId: z.string().max(AUDIT_FIELD_LIMITS.resourceId).optional().nullable(),
  viewedAt: z.custom<{ toDate: () => Date }>(
    (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
  ),
  itemCount: z.number().int().min(0).optional(),
  sessionId: z.string().max(AUDIT_FIELD_LIMITS.sessionId).optional(),
  clientInfo: z
    .object({
      userAgent: z.string().max(AUDIT_FIELD_LIMITS.userAgent).optional(),
      platform: z.string().max(AUDIT_FIELD_LIMITS.platform).optional(),
      appVersion: z.string().max(AUDIT_FIELD_LIMITS.appVersion).optional(),
    })
    .optional(),
})

export type DataViewAuditEntryFirestore = z.infer<typeof dataViewAuditEntryFirestoreSchema>

/**
 * Input schema for logging a data view
 */
export const logDataViewInputSchema = z.object({
  /** Child ID whose data is being viewed */
  childId: z.string().min(1, 'Child ID is required').max(AUDIT_FIELD_LIMITS.childId),

  /** Type of data being viewed */
  dataType: dataViewTypeSchema,

  /** Specific resource ID if applicable */
  resourceId: z.string().max(AUDIT_FIELD_LIMITS.resourceId).optional().nullable(),

  /** Number of items viewed (for list views) */
  itemCount: z.number().int().min(0).optional(),

  /** Session ID for grouping related views */
  sessionId: z.string().max(AUDIT_FIELD_LIMITS.sessionId).optional(),

  /** Client metadata */
  clientInfo: z
    .object({
      userAgent: z.string().max(AUDIT_FIELD_LIMITS.userAgent).optional(),
      platform: z.string().max(AUDIT_FIELD_LIMITS.platform).optional(),
      appVersion: z.string().max(AUDIT_FIELD_LIMITS.appVersion).optional(),
    })
    .optional(),
})

export type LogDataViewInput = z.infer<typeof logDataViewInputSchema>

// ============================================
// SYMMETRY STATUS
// ============================================

/**
 * Access status for a guardian
 */
export const guardianAccessStatusSchema = z.enum([
  'active', // Guardian has full access
  'suspended', // Guardian access temporarily suspended
  'revoked', // Guardian access permanently revoked
  'pending', // Guardian access pending approval
])

export type GuardianAccessStatus = z.infer<typeof guardianAccessStatusSchema>

/**
 * Symmetry status for a shared custody child
 */
export const symmetryStatusSchema = z.object({
  /** Child ID */
  childId: z.string().min(1),

  /** Whether symmetry enforcement is active (requiresSharedCustodySafeguards = true) */
  isEnforced: z.boolean(),

  /** Guardian access statuses */
  guardianStatuses: z.array(
    z.object({
      guardianId: z.string().min(1),
      status: guardianAccessStatusSchema,
      lastViewedAt: z.date().optional().nullable(),
    })
  ),

  /** Whether all guardians have equal access currently */
  isSymmetric: z.boolean(),

  /** Reason for asymmetry if not symmetric */
  asymmetryReason: z.string().optional().nullable(),

  /** When symmetry status was last checked */
  lastCheckedAt: z.date(),
})

export type SymmetryStatus = z.infer<typeof symmetryStatusSchema>

// ============================================
// SYMMETRY VIOLATION
// ============================================

/**
 * Types of symmetry violations
 */
export const symmetryViolationTypeSchema = z.enum([
  'access_revoked_one_parent', // One parent lost access but not the other
  'data_delay', // Data shown to one parent before the other
  'data_filtering', // Data filtered differently for different parents
  'excessive_viewing', // One parent viewing excessively (potential weaponization)
])

export type SymmetryViolationType = z.infer<typeof symmetryViolationTypeSchema>

/**
 * Record of a symmetry violation detection
 */
export const symmetryViolationSchema = z.object({
  /** Unique violation ID */
  id: z.string().min(1),

  /** Child ID affected */
  childId: z.string().min(1),

  /** Type of violation */
  violationType: symmetryViolationTypeSchema,

  /** Description of the violation */
  description: z.string().min(1),

  /** Guardian(s) affected */
  affectedGuardians: z.array(z.string().min(1)),

  /** When the violation was detected */
  detectedAt: z.date(),

  /** Whether the violation has been resolved */
  resolved: z.boolean(),

  /** When the violation was resolved */
  resolvedAt: z.date().optional().nullable(),

  /** How the violation was resolved */
  resolution: z.string().optional().nullable(),
})

export type SymmetryViolation = z.infer<typeof symmetryViolationSchema>

// ============================================
// CONVERSION UTILITIES
// ============================================

/**
 * Convert Firestore data view audit entry to domain type
 */
export function convertFirestoreToDataViewAuditEntry(
  data: DataViewAuditEntryFirestore
): DataViewAuditEntry {
  return dataViewAuditEntrySchema.parse({
    id: data.id,
    childId: data.childId,
    viewedBy: data.viewedBy,
    dataType: data.dataType,
    resourceId: data.resourceId,
    viewedAt: data.viewedAt.toDate(),
    itemCount: data.itemCount,
    sessionId: data.sessionId,
    clientInfo: data.clientInfo,
  })
}

/**
 * Safely parse data view audit entry, returning null if invalid
 */
export function safeParseDataViewAuditEntry(data: unknown): DataViewAuditEntry | null {
  const result = dataViewAuditEntrySchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Get human-readable label for a data view type
 * @param dataType - The data view type enum value
 * @returns Human-readable string label for the data type (e.g., 'Screenshot' for 'screenshot')
 */
export function getDataViewTypeLabel(dataType: DataViewType): string {
  return DATA_VIEW_TYPE_LABELS[dataType]
}

// ============================================
// SYMMETRY CHECK UTILITIES
// ============================================

/**
 * Check if a child requires shared custody safeguards
 * Used to determine if symmetry enforcement should be applied
 */
export function requiresSymmetryEnforcement(
  requiresSharedCustodySafeguards: boolean,
  guardianCount: number
): boolean {
  // Symmetry enforcement requires:
  // 1. The child is marked as requiring shared custody safeguards
  // 2. There are at least 2 guardians
  return requiresSharedCustodySafeguards && guardianCount >= 2
}

/**
 * Check if all guardians have equal access status
 */
export function checkGuardianAccessSymmetry(
  guardianStatuses: Array<{ guardianId: string; status: GuardianAccessStatus }>
): { isSymmetric: boolean; asymmetryReason: string | null } {
  if (guardianStatuses.length < 2) {
    return { isSymmetric: true, asymmetryReason: null }
  }

  const activeCount = guardianStatuses.filter((g) => g.status === 'active').length
  const totalCount = guardianStatuses.length

  // All active or all non-active is symmetric
  if (activeCount === totalCount || activeCount === 0) {
    return { isSymmetric: true, asymmetryReason: null }
  }

  // Some active, some not = asymmetric
  const inactiveGuardians = guardianStatuses
    .filter((g) => g.status !== 'active')
    .map((g) => g.guardianId)

  return {
    isSymmetric: false,
    asymmetryReason: `Access asymmetry: ${inactiveGuardians.length} guardian(s) do not have active access`,
  }
}

// ============================================
// ERROR MESSAGES
// ============================================

/**
 * Error messages for symmetry operations (6th-grade reading level)
 */
export const SYMMETRY_ERROR_MESSAGES: Record<string, string> = {
  'not-found': 'Could not find the child information.',
  'not-guardian': 'You must be a guardian to view this data.',
  'access-suspended': 'Your access to this data is currently suspended.',
  'symmetry-violation': 'Both parents must have equal access. Please contact support.',
  'invalid-data-type': 'The data type you requested is not valid.',
  unknown: 'Something went wrong. Please try again.',
}

/**
 * Get user-friendly error message for symmetry operations
 */
export function getSymmetryErrorMessage(
  code: keyof typeof SYMMETRY_ERROR_MESSAGES | string
): string {
  return SYMMETRY_ERROR_MESSAGES[code] || SYMMETRY_ERROR_MESSAGES.unknown
}

// ============================================
// SCREENSHOT VIEWING RATE ALERT
// Story 3A.5: Screenshot Viewing Rate Alert
// ============================================

/**
 * Screenshot viewing rate limits - NOT user-configurable
 *
 * Rationale for non-configurability (AC6):
 * 1. Gaming prevention: Abusive parent could set to 1000 to avoid alerts
 * 2. Weaponization prevention: Low threshold could generate constant alerts
 * 3. Simplicity: One clear standard for all families
 * 4. Consistency: Same behavior for all shared custody situations
 */
export const SCREENSHOT_VIEWING_RATE_LIMITS = Object.freeze({
  /** Maximum screenshots viewable per hour before alert (AC1: 50 screenshots) */
  THRESHOLD_PER_HOUR: 50,
  /** Time window for rate calculation (1 hour in milliseconds) */
  WINDOW_MS: 60 * 60 * 1000,
  /** Minimum time between alerts for same guardian (1 hour cooldown) */
  ALERT_COOLDOWN_MS: 60 * 60 * 1000,
} as const)

/**
 * Screenshot viewing rate alert - triggered when one parent views excessively
 *
 * Stored in: children/{childId}/screenshotRateAlerts/{alertId}
 *
 * Security/privacy design:
 * - Does NOT include which screenshots were viewed (AC2)
 * - Alert goes to OTHER parent only, NOT the triggering parent
 * - Child is NEVER notified (AC7 - prevent triangulation)
 * - Informational only - does NOT block viewing (AC4)
 */
export const screenshotViewingRateAlertSchema = z.object({
  /** Unique alert ID (Firestore document ID) */
  id: z.string().min(1, 'Alert ID is required').max(AUDIT_FIELD_LIMITS.id),

  /** Child ID whose screenshots were viewed */
  childId: z.string().min(1, 'Child ID is required').max(AUDIT_FIELD_LIMITS.childId),

  /** Guardian who triggered the alert by viewing excessively */
  triggeredBy: z.string().min(1, 'Triggered by is required').max(AUDIT_FIELD_LIMITS.viewedBy),

  /** Guardian(s) who were alerted (other parent(s), NOT the triggering parent)
   * Note: May be empty for single-parent families (alert still created for audit purposes)
   */
  alertedTo: z.array(z.string().min(1).max(AUDIT_FIELD_LIMITS.viewedBy)),

  /** Number of screenshots viewed in the window (>= THRESHOLD_PER_HOUR) */
  screenshotCount: z.number().int().min(SCREENSHOT_VIEWING_RATE_LIMITS.THRESHOLD_PER_HOUR),

  /** Start of the 1-hour window when counting began */
  windowStart: z.date(),

  /** End of the 1-hour window (when threshold was exceeded) */
  windowEnd: z.date(),

  /** When the alert was created */
  createdAt: z.date(),
})

export type ScreenshotViewingRateAlert = z.infer<typeof screenshotViewingRateAlertSchema>

/**
 * Firestore-compatible screenshot viewing rate alert schema (uses Timestamp)
 */
export const screenshotViewingRateAlertFirestoreSchema = z.object({
  id: z.string().min(1).max(AUDIT_FIELD_LIMITS.id),
  childId: z.string().min(1).max(AUDIT_FIELD_LIMITS.childId),
  triggeredBy: z.string().min(1).max(AUDIT_FIELD_LIMITS.viewedBy),
  // Note: alertedTo may be empty for single-parent families
  alertedTo: z.array(z.string().min(1).max(AUDIT_FIELD_LIMITS.viewedBy)),
  screenshotCount: z.number().int().min(SCREENSHOT_VIEWING_RATE_LIMITS.THRESHOLD_PER_HOUR),
  windowStart: z.custom<{ toDate: () => Date }>(
    (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
  ),
  windowEnd: z.custom<{ toDate: () => Date }>(
    (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
  ),
  createdAt: z.custom<{ toDate: () => Date }>(
    (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
  ),
})

export type ScreenshotViewingRateAlertFirestore = z.infer<
  typeof screenshotViewingRateAlertFirestoreSchema
>

/**
 * Input schema for checking screenshot viewing rate
 * Used by checkScreenshotViewingRate Cloud Function
 */
export const checkScreenshotViewingRateInputSchema = z.object({
  /** Child ID to check viewing rate for */
  childId: z.string().min(1, 'Child ID is required').max(AUDIT_FIELD_LIMITS.childId),
})

export type CheckScreenshotViewingRateInput = z.infer<typeof checkScreenshotViewingRateInputSchema>

/**
 * Response schema for screenshot viewing rate check
 */
export const checkScreenshotViewingRateResponseSchema = z.object({
  /** Whether rate limit was exceeded */
  exceedsLimit: z.boolean(),
  /** Number of screenshots viewed in the current window */
  currentCount: z.number().int().min(0),
  /** Threshold for triggering alert */
  threshold: z.literal(SCREENSHOT_VIEWING_RATE_LIMITS.THRESHOLD_PER_HOUR),
  /** Whether an alert was created (only if exceedsLimit and no recent alert) */
  alertCreated: z.boolean(),
  /** Alert ID if one was created */
  alertId: z.string().nullable(),
})

export type CheckScreenshotViewingRateResponse = z.infer<
  typeof checkScreenshotViewingRateResponseSchema
>

/**
 * Convert Firestore screenshot viewing rate alert to domain type
 */
export function convertFirestoreToScreenshotViewingRateAlert(
  data: ScreenshotViewingRateAlertFirestore
): ScreenshotViewingRateAlert {
  return screenshotViewingRateAlertSchema.parse({
    id: data.id,
    childId: data.childId,
    triggeredBy: data.triggeredBy,
    alertedTo: data.alertedTo,
    screenshotCount: data.screenshotCount,
    windowStart: data.windowStart.toDate(),
    windowEnd: data.windowEnd.toDate(),
    createdAt: data.createdAt.toDate(),
  })
}

/**
 * Safely parse screenshot viewing rate alert, returning null if invalid
 */
export function safeParseScreenshotViewingRateAlert(
  data: unknown
): ScreenshotViewingRateAlert | null {
  const result = screenshotViewingRateAlertSchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Check if a guardian has exceeded the screenshot viewing rate limit
 * Returns the count and whether an alert should be triggered
 *
 * @param viewTimestamps - Array of timestamps when screenshots were viewed by the guardian
 * @returns Object with exceedsLimit boolean and current count
 */
export function checkScreenshotViewingRate(viewTimestamps: Date[]): {
  exceedsLimit: boolean
  currentCount: number
  windowStart: Date
  windowEnd: Date
} {
  const now = new Date()
  const windowStart = new Date(now.getTime() - SCREENSHOT_VIEWING_RATE_LIMITS.WINDOW_MS)

  // Count views within the window
  const viewsInWindow = viewTimestamps.filter((ts) => ts >= windowStart && ts <= now)

  return {
    exceedsLimit: viewsInWindow.length >= SCREENSHOT_VIEWING_RATE_LIMITS.THRESHOLD_PER_HOUR,
    currentCount: viewsInWindow.length,
    windowStart,
    windowEnd: now,
  }
}

/**
 * Check if a guardian has a recent rate alert (within cooldown period)
 * Used to prevent alert spam
 *
 * @param lastAlertCreatedAt - When the last alert was created for this guardian
 * @returns true if within cooldown period (should NOT create new alert)
 */
export function isWithinAlertCooldown(lastAlertCreatedAt: Date | null): boolean {
  if (!lastAlertCreatedAt) {
    return false
  }

  const now = new Date()
  const cooldownEnd = new Date(
    lastAlertCreatedAt.getTime() + SCREENSHOT_VIEWING_RATE_LIMITS.ALERT_COOLDOWN_MS
  )

  return now < cooldownEnd
}

/**
 * Calculate time remaining in cooldown period
 *
 * @param lastAlertCreatedAt - When the last alert was created
 * @returns Milliseconds remaining in cooldown, or 0 if cooldown has passed
 */
export function getAlertCooldownRemaining(lastAlertCreatedAt: Date | null): number {
  if (!lastAlertCreatedAt) {
    return 0
  }

  const now = new Date()
  const cooldownEnd = new Date(
    lastAlertCreatedAt.getTime() + SCREENSHOT_VIEWING_RATE_LIMITS.ALERT_COOLDOWN_MS
  )

  const remaining = cooldownEnd.getTime() - now.getTime()
  return Math.max(0, remaining)
}

/**
 * Format a screenshot rate alert message for display
 * Uses 6th-grade reading level language (per NFR65)
 *
 * @param screenshotCount - Number of screenshots viewed
 * @returns Human-readable alert message (does NOT mention which screenshots)
 */
export function formatScreenshotRateAlertMessage(screenshotCount: number): string {
  return `Your co-parent viewed ${screenshotCount} screenshots in the past hour.`
}

/**
 * Error messages for screenshot rate alert operations (6th-grade reading level)
 */
export const SCREENSHOT_RATE_ALERT_ERROR_MESSAGES: Record<string, string> = {
  'not-found': 'Could not find the child information.',
  'not-guardian': 'You must be a guardian to check viewing rates.',
  'rate-limit': 'Too many requests. Please wait a moment.',
  unknown: 'Something went wrong. Please try again.',
}

/**
 * Get user-friendly error message for screenshot rate alert operations
 */
export function getScreenshotRateAlertErrorMessage(code: string): string {
  return SCREENSHOT_RATE_ALERT_ERROR_MESSAGES[code] || SCREENSHOT_RATE_ALERT_ERROR_MESSAGES.unknown
}
