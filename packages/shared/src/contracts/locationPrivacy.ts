/**
 * Location Privacy schemas.
 *
 * Story 40.5: Location Privacy Controls
 * - AC1: Clear Privacy Explanation (child understands data collection)
 * - AC2: Current Location Status Display
 * - AC3: Location History Access (bilateral transparency)
 * - AC4: Data Sharing Limits (only family, never third-party)
 * - AC5: Data Deletion at 18
 * - AC6: Request Disable Feature
 *
 * Child-facing location transparency and privacy controls.
 */

import { z } from 'zod'

// ============================================
// Story 40.5: Location Privacy Controls
// ============================================

/**
 * Child location status schema.
 * Story 40.5: AC2 - Current location status display
 *
 * This is computed from deviceLocations, not stored.
 */
export const childLocationStatusSchema = z.object({
  /** Current zone ID (null if unknown/outside all zones) */
  currentZoneId: z.string().min(1).nullable(),
  /** Current zone name for display */
  currentZoneName: z.string().nullable(),
  /** Zone owner name (e.g., "Mom" or "Dad") for context */
  zoneOwnerName: z.string().nullable(),
  /** When location was last updated */
  lastUpdatedAt: z.date(),
  /** Whether location features are enabled for the family */
  locationFeaturesEnabled: z.boolean(),
})
export type ChildLocationStatus = z.infer<typeof childLocationStatusSchema>

/**
 * Location disable request status.
 * Story 40.5: AC6 - Child can request location features be disabled
 */
export const locationDisableRequestStatusSchema = z.enum([
  'pending', // Awaiting guardian response
  'approved', // Guardian approved, location disabled
  'declined', // Guardian declined request
])
export type LocationDisableRequestStatus = z.infer<typeof locationDisableRequestStatusSchema>

/**
 * Location disable request schema.
 * Story 40.5: AC6 - Child's request to disable location tracking
 *
 * Stored at: families/{familyId}/locationDisableRequests/{requestId}
 */
export const locationDisableRequestSchema = z.object({
  /** Unique request identifier */
  id: z.string().min(1),
  /** Child who made the request */
  childId: z.string().min(1),
  /** Family ID */
  familyId: z.string().min(1),
  /** Optional reason from child (why they want it disabled) */
  reason: z.string().max(500).nullable(),
  /** Current request status */
  status: locationDisableRequestStatusSchema,
  /** When request was created */
  createdAt: z.date(),
  /** When request was resolved (null if pending) */
  resolvedAt: z.date().nullable(),
  /** UID of guardian who resolved the request */
  resolvedByUid: z.string().nullable(),
  /** Response message from guardian (optional) */
  responseMessage: z.string().max(500).nullable(),
})
export type LocationDisableRequest = z.infer<typeof locationDisableRequestSchema>

/**
 * Cloud function input: Request location disable.
 * Story 40.5: AC6 - Child requests location features be disabled
 */
export const requestLocationDisableInputSchema = z.object({
  /** Family ID */
  familyId: z.string().min(1),
  /** Optional reason for the request */
  reason: z.string().max(500).optional(),
})
export type RequestLocationDisableInput = z.infer<typeof requestLocationDisableInputSchema>

/**
 * Cloud function input: Get child location status.
 * Story 40.5: AC2
 */
export const getChildLocationStatusInputSchema = z.object({
  /** Family ID */
  familyId: z.string().min(1),
  /** Child ID */
  childId: z.string().min(1),
})
export type GetChildLocationStatusInput = z.infer<typeof getChildLocationStatusInputSchema>

/**
 * Cloud function input: Get child location history.
 * Story 40.5: AC3 - Same history parents see (bilateral transparency)
 */
export const getChildLocationHistoryInputSchema = z.object({
  /** Family ID */
  familyId: z.string().min(1),
  /** Child ID */
  childId: z.string().min(1),
  /** Pagination: page number */
  page: z.number().min(1).default(1),
  /** Pagination: items per page */
  pageSize: z.number().min(1).max(50).default(20),
})
export type GetChildLocationHistoryInput = z.infer<typeof getChildLocationHistoryInputSchema>

/**
 * Location history item for child view.
 * Story 40.5: AC3
 */
export const childLocationHistoryItemSchema = z.object({
  /** Transition ID */
  id: z.string().min(1),
  /** Zone transitioned from (null if first or unknown) */
  fromZoneName: z.string().nullable(),
  /** Zone transitioned to (null if unknown) */
  toZoneName: z.string().nullable(),
  /** When transition occurred */
  detectedAt: z.date(),
  /** Time spent in previous zone (null if first) */
  durationMinutes: z.number().nullable(),
  /** Child-friendly time description ("2 hours ago", "yesterday") */
  timeDescription: z.string(),
})
export type ChildLocationHistoryItem = z.infer<typeof childLocationHistoryItemSchema>

/**
 * Response schema for child location history.
 * Story 40.5: AC3
 */
export const getChildLocationHistoryResponseSchema = z.object({
  /** List of history items */
  history: z.array(childLocationHistoryItemSchema),
  /** Total count for pagination */
  totalCount: z.number(),
  /** Current page */
  page: z.number(),
  /** Items per page */
  pageSize: z.number(),
  /** Whether there are more pages */
  hasMore: z.boolean(),
  /** Bilateral transparency message */
  transparencyNote: z.string(),
})
export type GetChildLocationHistoryResponse = z.infer<typeof getChildLocationHistoryResponseSchema>

/**
 * Child-friendly privacy messages (NFR65: 6th-grade reading level).
 * Story 40.5: AC1, AC4, AC5
 */
export const LOCATION_PRIVACY_MESSAGES = {
  /** What location data is collected */
  whatWeCollect:
    "We only check which zone you're in - like 'at home' or 'at school'. We don't track every step you take.",
  /** Who can see the location data */
  whoCanSee: 'Only your family can see where you are. We never share this with anyone else.',
  /** What happens at age 18 */
  atEighteen: 'When you turn 18, all your location history is automatically deleted.',
  /** Child's rights regarding location */
  yourRights:
    'If location tracking makes you uncomfortable, you can ask your parents to turn it off.',
  /** Confirmation when request is sent */
  requestSent: "Your request has been sent to your parents. They'll talk with you about it.",
  /** Current location display format */
  currentLocation: (zone: string, owner: string) => `At: ${zone} (${owner}'s)`,
  /** Unknown location message */
  unknownLocation: "We're not sure where you are right now.",
  /** Location features disabled message */
  locationOff: 'Location features are turned off for your family.',
  /** Bilateral transparency note */
  transparencyNote: 'This is the same history your parents see. No secrets!',
  /** Pending request status */
  pendingRequest: 'Your request is waiting for your parents to respond.',
  /** Approved request message */
  requestApproved: 'Your parents turned off location features for you.',
  /** Declined request message */
  requestDeclined:
    'Your parents decided to keep location features on. Talk to them if you have concerns.',
} as const

/**
 * Adult messages for guardian notification about child's disable request.
 * Story 40.5: AC6
 */
export const LOCATION_DISABLE_REQUEST_MESSAGES = {
  /** Notification to guardians */
  requestReceived: (childName: string) =>
    `${childName} has asked for location features to be turned off. Please discuss this with them.`,
  /** When child provides reason */
  withReason: (childName: string, reason: string) =>
    `${childName} has asked for location features to be turned off. Their reason: "${reason}"`,
  /** Reminder if not addressed */
  reminder: (childName: string) =>
    `Reminder: ${childName}'s request to disable location features is still pending.`,
} as const

/**
 * Format time description for child-friendly display.
 * Story 40.5: AC3 - Child-friendly time format
 */
export function formatTimeDescription(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (60 * 1000))
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000))
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))

  if (diffMinutes < 1) {
    return 'just now'
  } else if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`
  } else if (diffDays === 1) {
    return 'yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else {
    // Format as date for older entries
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

/**
 * Calculate duration in minutes between two dates.
 */
export function calculateDurationMinutes(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime()
  return Math.floor(diffMs / (60 * 1000))
}
