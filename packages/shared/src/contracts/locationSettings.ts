/**
 * Location Feature Settings schemas.
 *
 * Story 40.1: Location-Based Rule Opt-In
 * - AC1: Explicit Dual-Guardian Opt-In (both parents must consent)
 * - AC4: Default Disabled (location features off by default)
 * - AC5: Instant Disable by Any Guardian (single guardian can disable)
 * - AC6: Fleeing Mode Integration (72-hour notification suppression)
 *
 * Location features allow rules to vary based on child's location
 * (e.g., different time limits at home vs school vs other parent's house).
 */

import { z } from 'zod'

// ============================================
// Story 40.1: Location-Based Rule Opt-In
// ============================================

/**
 * Location feature opt-in status.
 * Story 40.1: AC4 - Default disabled, must actively enable
 */
export const locationOptInStatusSchema = z.enum(['disabled', 'pending', 'enabled'])
export type LocationOptInStatus = z.infer<typeof locationOptInStatusSchema>

/**
 * Location settings stored on family document.
 * Story 40.1: AC1, AC4, AC5
 *
 * Stored at: families/{familyId} (embedded in family document)
 */
export const locationSettingsSchema = z.object({
  /** Whether location features are currently enabled (default: false per AC4) */
  locationFeaturesEnabled: z.boolean().default(false),
  /** When location features were enabled (null if never enabled) */
  locationEnabledAt: z.date().nullable(),
  /** UIDs of guardians who approved opt-in (both required per AC1) */
  locationEnabledByUids: z.array(z.string()),
  /** When location features were disabled (null if currently enabled or never enabled) */
  locationDisabledAt: z.date().nullable(),
  /** UID of guardian who disabled (single guardian can disable per AC5) */
  locationDisabledByUid: z.string().nullable(),
  /** When child was notified about location features (AC3) */
  childNotifiedAt: z.date().nullable(),
})
export type LocationSettings = z.infer<typeof locationSettingsSchema>

/** Default location settings - disabled by default per AC4 */
export const DEFAULT_LOCATION_SETTINGS: LocationSettings = {
  locationFeaturesEnabled: false,
  locationEnabledAt: null,
  locationEnabledByUids: [],
  locationDisabledAt: null,
  locationDisabledByUid: null,
  childNotifiedAt: null,
}

/**
 * Location opt-in request status.
 * Story 40.1: AC1 - Dual-guardian approval workflow
 */
export const locationOptInRequestStatusSchema = z.enum([
  'pending', // Awaiting second guardian approval
  'approved', // Both guardians approved
  'declined', // Second guardian declined
  'expired', // 72-hour window expired
])
export type LocationOptInRequestStatus = z.infer<typeof locationOptInRequestStatusSchema>

/** Opt-in request expiry time in milliseconds (72 hours) */
export const LOCATION_OPT_IN_EXPIRY_MS = 72 * 60 * 60 * 1000

/**
 * Location opt-in request schema.
 * Story 40.1: AC1 - Pending opt-in request requiring second guardian approval
 *
 * Stored at: families/{familyId}/locationOptInRequests/{requestId}
 */
export const locationOptInRequestSchema = z.object({
  /** Unique request identifier */
  id: z.string().min(1),
  /** Family ID */
  familyId: z.string().min(1),
  /** UID of guardian who initiated the request */
  requestedByUid: z.string().min(1),
  /** Current request status */
  status: locationOptInRequestStatusSchema,
  /** UID of guardian who approved (null if pending/declined/expired) */
  approvedByUid: z.string().nullable(),
  /** When request was created */
  createdAt: z.date(),
  /** When request expires (72 hours from creation) */
  expiresAt: z.date(),
  /** When request was resolved (approved/declined/expired) */
  resolvedAt: z.date().nullable(),
})
export type LocationOptInRequest = z.infer<typeof locationOptInRequestSchema>

/**
 * Cloud function input: Request location opt-in.
 * Story 40.1: AC1 - First guardian requests opt-in
 */
export const requestLocationOptInInputSchema = z.object({
  /** Family ID */
  familyId: z.string().min(1),
})
export type RequestLocationOptInInput = z.infer<typeof requestLocationOptInInputSchema>

/**
 * Cloud function input: Approve location opt-in.
 * Story 40.1: AC1 - Second guardian approves request
 */
export const approveLocationOptInInputSchema = z.object({
  /** Family ID */
  familyId: z.string().min(1),
  /** Request ID to approve */
  requestId: z.string().min(1),
})
export type ApproveLocationOptInInput = z.infer<typeof approveLocationOptInInputSchema>

/**
 * Cloud function input: Disable location features.
 * Story 40.1: AC5, AC6 - Single guardian can disable
 */
export const disableLocationFeaturesInputSchema = z.object({
  /** Family ID */
  familyId: z.string().min(1),
  /** Whether triggered by fleeing mode (AC6: suppresses notifications for 72 hours) */
  isFleeingMode: z.boolean().default(false),
})
export type DisableLocationFeaturesInput = z.infer<typeof disableLocationFeaturesInputSchema>
