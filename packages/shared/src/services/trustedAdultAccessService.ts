/**
 * Trusted Adult Access Service - Story 52.5
 *
 * Service functions for trusted adult data access validation and filtering.
 *
 * AC1: View Shared Data Dashboard
 * AC2: Read-Only Access
 * AC3: Respect Reverse Mode Settings
 * AC4: Notification Support
 * AC5: Access Logging (NFR42)
 * AC6: Teen Revocation Visibility
 */

import {
  type TrustedAdult,
  TrustedAdultStatus,
  isTrustedAdultActive,
} from '../contracts/trustedAdult'
import {
  type ReverseModeSettings,
  isReverseModeActive,
  DEFAULT_REVERSE_MODE_SHARING,
} from '../contracts/reverseMode'

// ============================================
// Types
// ============================================

export interface TrustedAdultAccessResult {
  hasAccess: boolean
  accessDeniedReason?: string
  trustedAdult?: TrustedAdult
}

export interface SharedDataFilter {
  screenTime: boolean
  screenTimeDetail: 'none' | 'summary' | 'full'
  flags: boolean
  screenshots: boolean
  location: boolean
  timeLimitStatus: boolean
  sharedCategories: string[]
}

export interface TrustedAdultAccessEvent {
  id: string
  trustedAdultId: string
  childId: string
  familyId: string
  accessType: TrustedAdultAccessType
  timestamp: Date
  dataCategories: string[]
  ipAddress?: string
  userAgent?: string
}

export type TrustedAdultAccessType =
  | 'dashboard_view'
  | 'screen_time_view'
  | 'flags_view'
  | 'screenshots_view'
  | 'location_view'
  | 'activity_view'

// ============================================
// Access Validation Functions
// ============================================

/**
 * Validate if a trusted adult has access to a child's data.
 * AC1: Dashboard limited to what teen shares
 * AC6: Clear message on revocation
 *
 * @param trustedAdult - The trusted adult record
 * @returns Access validation result
 */
export function validateTrustedAdultAccess(
  trustedAdult: TrustedAdult | null | undefined
): TrustedAdultAccessResult {
  if (!trustedAdult) {
    return {
      hasAccess: false,
      accessDeniedReason: 'Trusted adult relationship not found',
    }
  }

  if (trustedAdult.status === TrustedAdultStatus.REVOKED) {
    return {
      hasAccess: false,
      accessDeniedReason: 'Access has been revoked',
      trustedAdult,
    }
  }

  if (trustedAdult.status === TrustedAdultStatus.EXPIRED) {
    return {
      hasAccess: false,
      accessDeniedReason: 'Invitation has expired',
      trustedAdult,
    }
  }

  if (trustedAdult.status === TrustedAdultStatus.PENDING_INVITATION) {
    return {
      hasAccess: false,
      accessDeniedReason: 'Please accept the invitation first',
      trustedAdult,
    }
  }

  if (trustedAdult.status === TrustedAdultStatus.PENDING_TEEN_APPROVAL) {
    return {
      hasAccess: false,
      accessDeniedReason: 'Waiting for teen approval',
      trustedAdult,
    }
  }

  if (!isTrustedAdultActive(trustedAdult)) {
    return {
      hasAccess: false,
      accessDeniedReason: 'Access is not active',
      trustedAdult,
    }
  }

  return {
    hasAccess: true,
    trustedAdult,
  }
}

/**
 * Check if a user ID matches an active trusted adult.
 *
 * @param userId - Firebase UID of the user
 * @param trustedAdults - List of trusted adults for a child
 * @returns The matching trusted adult or null
 */
export function findActiveTrustedAdultByUserId(
  userId: string,
  trustedAdults: TrustedAdult[]
): TrustedAdult | null {
  return trustedAdults.find((ta) => ta.userId === userId && isTrustedAdultActive(ta)) || null
}

/**
 * Get all children a trusted adult can view.
 *
 * @param userId - Firebase UID of the trusted adult
 * @param allTrustedAdults - All trusted adult relationships
 * @returns List of child IDs the user can view
 */
export function getChildrenForTrustedAdult(
  userId: string,
  allTrustedAdults: TrustedAdult[]
): string[] {
  return allTrustedAdults
    .filter((ta) => ta.userId === userId && isTrustedAdultActive(ta))
    .map((ta) => ta.childId)
}

// ============================================
// Data Filtering Functions
// ============================================

/**
 * Get the data filter for a trusted adult based on reverse mode settings.
 * AC3: Respect reverse mode settings
 *
 * @param reverseModeSettings - Child's reverse mode settings
 * @returns Filter specifying what data can be shared
 */
export function getSharedDataFilter(
  reverseModeSettings: ReverseModeSettings | null | undefined
): SharedDataFilter {
  // If reverse mode is not active, share all data (normal monitoring)
  if (!isReverseModeActive(reverseModeSettings)) {
    return {
      screenTime: true,
      screenTimeDetail: 'full',
      flags: true,
      screenshots: true,
      location: true,
      timeLimitStatus: true,
      sharedCategories: ['all'],
    }
  }

  // Apply teen's sharing preferences
  const prefs = reverseModeSettings?.sharingPreferences || DEFAULT_REVERSE_MODE_SHARING

  return {
    screenTime: prefs.screenTime,
    screenTimeDetail: prefs.screenTimeDetail,
    flags: prefs.flags,
    screenshots: prefs.screenshots,
    location: prefs.location,
    timeLimitStatus: prefs.timeLimitStatus,
    sharedCategories: prefs.sharedCategories,
  }
}

/**
 * Check if any data is shared with trusted adults.
 *
 * @param filter - The data filter to check
 * @returns True if at least one data type is shared
 */
export function hasAnySharedData(filter: SharedDataFilter): boolean {
  return (
    filter.screenTime ||
    filter.flags ||
    filter.screenshots ||
    filter.location ||
    filter.timeLimitStatus ||
    filter.sharedCategories.length > 0
  )
}

/**
 * Get a list of shared data categories for display.
 *
 * @param filter - The data filter
 * @returns List of human-readable category names
 */
export function getSharedCategoriesList(filter: SharedDataFilter): string[] {
  const categories: string[] = []

  if (filter.screenTime) {
    if (filter.screenTimeDetail === 'summary') {
      categories.push('Screen Time (Summary)')
    } else if (filter.screenTimeDetail === 'full') {
      categories.push('Screen Time (Full)')
    } else {
      categories.push('Screen Time')
    }
  }

  if (filter.flags) {
    categories.push('Flagged Content')
  }

  if (filter.screenshots) {
    categories.push('Screenshots')
  }

  if (filter.location) {
    categories.push('Location')
  }

  if (filter.timeLimitStatus) {
    categories.push('Time Limit Status')
  }

  return categories
}

// ============================================
// Access Logging Functions
// ============================================

/**
 * Generate a unique access event ID.
 */
export function generateAccessEventId(): string {
  return `ta-access-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Create an access logging event.
 * AC5: All access logged for audit
 *
 * @param trustedAdultId - ID of the trusted adult
 * @param childId - ID of the child whose data was accessed
 * @param familyId - ID of the family
 * @param accessType - Type of data accessed
 * @param dataCategories - Specific categories accessed
 * @param ipAddress - Optional IP address
 * @param userAgent - Optional user agent
 * @returns Access event for logging
 */
export function createAccessEvent(
  trustedAdultId: string,
  childId: string,
  familyId: string,
  accessType: TrustedAdultAccessType,
  dataCategories: string[] = [],
  ipAddress?: string,
  userAgent?: string
): TrustedAdultAccessEvent {
  return {
    id: generateAccessEventId(),
    trustedAdultId,
    childId,
    familyId,
    accessType,
    timestamp: new Date(),
    dataCategories,
    ipAddress,
    userAgent,
  }
}

// ============================================
// Dashboard Helper Functions
// ============================================

/**
 * Get the dashboard label for shared data.
 * AC1: Clearly labeled "Shared by [Teen Name]"
 *
 * @param teenName - Name of the teen sharing the data
 * @returns Formatted label string
 */
export function getSharedByLabel(teenName: string): string {
  return `Shared by ${teenName}`
}

/**
 * Get empty state message when no data is shared.
 *
 * @param teenName - Name of the teen
 * @returns Empty state message
 */
export function getNoDataSharedMessage(teenName: string): string {
  return `${teenName} hasn't chosen to share any data with you yet.`
}

/**
 * Get revoked access message.
 * AC6: Clear message on revocation
 *
 * @returns Revoked access message
 */
export function getRevokedAccessMessage(): string {
  return 'Access has been revoked. You no longer have access to view this data.'
}

/**
 * Get last access display text.
 * AC5: Teen can see when trusted adult last accessed data
 *
 * @param lastAccessAt - Timestamp of last access
 * @returns Formatted last access text
 */
export function getLastAccessText(lastAccessAt: Date | null | undefined): string {
  if (!lastAccessAt) {
    return 'Never accessed'
  }

  const now = new Date()
  const diffMs = now.getTime() - lastAccessAt.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) {
    return 'Just now'
  }

  if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  }

  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  }

  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  }

  return lastAccessAt.toLocaleDateString()
}

// ============================================
// Audit Event Privacy Functions
// ============================================

/**
 * Access types that are private to the teen and hidden from parents.
 * Story 52.6 AC7: Parents cannot see removal activity
 */
export const TEEN_PRIVATE_ACCESS_TYPES: TrustedAdultAccessType[] = []

/**
 * Audit event types that are private to the teen and hidden from parents.
 * Story 52.6 AC7: Parents cannot see removal activity
 */
export const TEEN_PRIVATE_AUDIT_EVENT_TYPES = [
  'REVOKED_BY_TEEN', // Teen-initiated revocation
  'trusted_adult_removed', // Teen removed trusted adult
] as const

/**
 * Check if an audit event should be hidden from parents.
 * Story 52.6 AC7: Parents cannot see teen removal activity
 *
 * @param eventType - The audit event type
 * @param revokedByRole - Role of person who revoked (if applicable)
 * @returns True if event should be hidden from parents
 */
export function isAuditEventHiddenFromParents(
  eventType: string,
  revokedByRole?: 'parent' | 'teen'
): boolean {
  // Hide teen-initiated revocations from parents
  if (eventType === 'REVOKED_BY_TEEN') {
    return true
  }

  // For generic revocation events, check the revoker role
  if (eventType === 'trusted_adult_removed' && revokedByRole === 'teen') {
    return true
  }

  return TEEN_PRIVATE_AUDIT_EVENT_TYPES.includes(
    eventType as (typeof TEEN_PRIVATE_AUDIT_EVENT_TYPES)[number]
  )
}

/**
 * Filter audit events to remove those that should be hidden from parents.
 * Story 52.6 AC7: Parents cannot see removal activity
 *
 * @param events - Array of audit events
 * @returns Filtered array with teen-private events removed
 */
export function filterAuditEventsForParent<
  T extends { changeType?: string; actorRole?: string; eventType?: string },
>(events: T[]): T[] {
  return events.filter((event) => {
    const eventType = event.changeType || event.eventType || ''
    const actorRole = event.actorRole as 'parent' | 'teen' | undefined
    return !isAuditEventHiddenFromParents(eventType, actorRole)
  })
}

// ============================================
// Export convenience
// ============================================

export { isTrustedAdultActive } from '../contracts/trustedAdult'
export { isReverseModeActive } from '../contracts/reverseMode'
