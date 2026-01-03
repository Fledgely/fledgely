/**
 * Location Transition schemas.
 *
 * Story 40.4: Location Transition Handling
 * - AC1: Transition Detection
 * - AC2: 5-minute Grace Period
 * - AC3: Transition Notification
 * - AC5: Default Behavior (unclear locations)
 *
 * Location transitions track when a child moves between location zones
 * and manage the grace period before rules are applied.
 */

import { z } from 'zod'
import { categoryOverridesSchema } from './locationRules'

// ============================================
// Story 40.4: Location Transition Configuration
// ============================================

/** 5-minute grace period in milliseconds (AC2) */
export const LOCATION_TRANSITION_GRACE_PERIOD_MS = 5 * 60 * 1000

/** 5-minute grace period in seconds */
export const LOCATION_TRANSITION_GRACE_PERIOD_SECONDS = 5 * 60

/** Minimum time between location updates (rate limiting) */
export const LOCATION_UPDATE_MIN_INTERVAL_MS = 60 * 1000

/** Maximum location accuracy to consider valid (meters) */
export const LOCATION_MAX_ACCURACY_METERS = 500

/**
 * Applied rules snapshot.
 * Captures the rules that were applied after a transition.
 */
export const appliedRulesSchema = z.object({
  /** Daily time limit in minutes (null = use default) */
  dailyTimeLimitMinutes: z.number().min(0).max(1440).nullable(),
  /** Education-only mode */
  educationOnlyMode: z.boolean(),
  /** Category permission overrides */
  categoryOverrides: categoryOverridesSchema,
})
export type AppliedRules = z.infer<typeof appliedRulesSchema>

/**
 * Location transition schema.
 * Story 40.4: AC1, AC2 - Track zone transitions with grace period
 *
 * Stored at: families/{familyId}/locationTransitions/{transitionId}
 */
export const locationTransitionSchema = z.object({
  /** Unique transition identifier */
  id: z.string().min(1),
  /** Family ID */
  familyId: z.string().min(1),
  /** Child ID this transition is for */
  childId: z.string().min(1),
  /** Device ID that reported the location */
  deviceId: z.string().min(1),
  /** Previous zone ID (null if unknown/first location) */
  fromZoneId: z.string().min(1).nullable(),
  /** New zone ID (null if location unclear - AC5) */
  toZoneId: z.string().min(1).nullable(),
  /** When the transition was detected */
  detectedAt: z.date(),
  /** When the grace period ends (detectedAt + 5 min) */
  gracePeriodEndsAt: z.date(),
  /** When rules were actually applied (null if not yet applied) */
  appliedAt: z.date().nullable(),
  /** When notification was sent to child (null if not sent) */
  notificationSentAt: z.date().nullable(),
  /** Snapshot of rules that were applied */
  rulesApplied: appliedRulesSchema.nullable(),
})
export type LocationTransition = z.infer<typeof locationTransitionSchema>

/**
 * Device location schema.
 * Current location of a device.
 *
 * Stored at: families/{familyId}/deviceLocations/{deviceId}
 */
export const deviceLocationSchema = z.object({
  /** Device ID */
  deviceId: z.string().min(1),
  /** Family ID */
  familyId: z.string().min(1),
  /** Child ID using this device */
  childId: z.string().min(1),
  /** Latitude coordinate */
  latitude: z.number().min(-90).max(90),
  /** Longitude coordinate */
  longitude: z.number().min(-180).max(180),
  /** Location accuracy in meters */
  accuracyMeters: z.number().min(0),
  /** Matched zone ID (null if no match) */
  zoneId: z.string().min(1).nullable(),
  /** When location was last updated */
  updatedAt: z.date(),
})
export type DeviceLocation = z.infer<typeof deviceLocationSchema>

/**
 * Input schema for location update from device.
 * Story 40.4: AC6 - Device reports location via GPS + WiFi
 */
export const locationUpdateInputSchema = z.object({
  /** Device ID */
  deviceId: z.string().min(1),
  /** Latitude coordinate */
  latitude: z.number().min(-90).max(90),
  /** Longitude coordinate */
  longitude: z.number().min(-180).max(180),
  /** Location accuracy in meters */
  accuracyMeters: z.number().min(0),
  /** Optional: WiFi SSID for additional zone matching */
  wifiSsid: z.string().nullable().optional(),
})
export type LocationUpdateInput = z.infer<typeof locationUpdateInputSchema>

/**
 * Response schema for location update.
 */
export const locationUpdateResponseSchema = z.object({
  /** Whether update was accepted */
  success: z.boolean(),
  /** Matched zone ID (null if no match) */
  zoneId: z.string().min(1).nullable(),
  /** Matched zone name (for display) */
  zoneName: z.string().nullable(),
  /** Whether a transition was triggered */
  transitionTriggered: z.boolean(),
  /** Message to display */
  message: z.string(),
})
export type LocationUpdateResponse = z.infer<typeof locationUpdateResponseSchema>

/**
 * Input schema for getting location transitions.
 * Story 40.4: AC7 - Audit trail for parents
 */
export const getLocationTransitionsInputSchema = z.object({
  /** Family ID */
  familyId: z.string().min(1),
  /** Optional: Filter by child ID */
  childId: z.string().min(1).optional(),
  /** Optional: Start date filter */
  startDate: z.date().optional(),
  /** Optional: End date filter */
  endDate: z.date().optional(),
  /** Pagination: page number */
  page: z.number().min(1).default(1),
  /** Pagination: items per page */
  pageSize: z.number().min(1).max(100).default(20),
})
export type GetLocationTransitionsInput = z.infer<typeof getLocationTransitionsInputSchema>

/**
 * Response schema for location transitions list.
 */
export const getLocationTransitionsResponseSchema = z.object({
  /** List of transitions */
  transitions: z.array(
    locationTransitionSchema.extend({
      /** Zone name for fromZoneId */
      fromZoneName: z.string().nullable(),
      /** Zone name for toZoneId */
      toZoneName: z.string().nullable(),
    })
  ),
  /** Total count for pagination */
  totalCount: z.number(),
  /** Current page */
  page: z.number(),
  /** Items per page */
  pageSize: z.number(),
  /** Whether there are more pages */
  hasMore: z.boolean(),
})
export type GetLocationTransitionsResponse = z.infer<typeof getLocationTransitionsResponseSchema>

/**
 * Child-friendly transition messages (NFR65: 6th-grade reading level).
 * Story 40.4: AC3
 */
export const TRANSITION_CHILD_MESSAGES = {
  /** Message when entering a known zone */
  enteringZone: (zoneName: string, minutes: number) =>
    `You're now at ${zoneName}. Rules will change in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`,
  /** Message when leaving all zones (location unclear) */
  leavingZone: (fromZoneName: string) => `You left ${fromZoneName}. Using normal rules.`,
  /** Message when location unclear */
  unknownLocation: "We can't tell where you are. Using your normal rules.",
  /** Message when rules have been applied */
  rulesApplied: (zoneName: string) => `You're at ${zoneName}. Rules have been updated.`,
} as const

/**
 * Adult transition messages (for parent dashboard).
 * Story 40.4: AC3
 */
export const TRANSITION_ADULT_MESSAGES = {
  /** Message when entering a known zone */
  enteringZone: (zoneName: string, childName: string, minutes: number) =>
    `${childName} arrived at ${zoneName}. Location rules will apply in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`,
  /** Message when leaving all zones */
  leavingZone: (fromZoneName: string, childName: string) =>
    `${childName} left ${fromZoneName}. Default rules now apply.`,
  /** Message when location unclear */
  unknownLocation: (childName: string) =>
    `${childName}'s location is unclear. Using default (permissive) rules.`,
  /** Message when rules applied */
  rulesApplied: (zoneName: string, childName: string) =>
    `${childName}'s rules updated for ${zoneName}.`,
} as const

/**
 * Calculate distance between two coordinates using Haversine formula.
 * Returns distance in meters.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000 // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Check if a location is within a zone's geofence.
 */
export function isWithinZone(
  latitude: number,
  longitude: number,
  zoneLatitude: number,
  zoneLongitude: number,
  radiusMeters: number
): boolean {
  const distance = calculateDistanceMeters(latitude, longitude, zoneLatitude, zoneLongitude)
  return distance <= radiusMeters
}

/**
 * Calculate remaining grace period in minutes.
 */
export function calculateGracePeriodMinutes(gracePeriodEndsAt: Date): number {
  const now = new Date()
  const remainingMs = gracePeriodEndsAt.getTime() - now.getTime()
  return Math.max(0, Math.ceil(remainingMs / (60 * 1000)))
}

/**
 * Check if grace period has expired.
 */
export function isGracePeriodExpired(gracePeriodEndsAt: Date): boolean {
  return new Date() >= gracePeriodEndsAt
}
