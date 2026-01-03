/**
 * Location Zone schemas.
 *
 * Story 40.2: Location-Specific Rule Configuration
 * - AC1: Location Definitions (Home 1, Home 2, School, Other)
 * - AC4: Geofence Configuration (radius 100-2000m, default 500m)
 *
 * Location zones define geographic areas where different rules can apply
 * (e.g., different time limits at home vs school vs other parent's house).
 */

import { z } from 'zod'

// ============================================
// Story 40.2: Location Zone Configuration
// ============================================

/**
 * Location zone type.
 * Story 40.2: AC1 - Predefined location types
 */
export const locationZoneTypeSchema = z.enum(['home_1', 'home_2', 'school', 'other'])
export type LocationZoneType = z.infer<typeof locationZoneTypeSchema>

/** Default geofence radius in meters */
export const DEFAULT_GEOFENCE_RADIUS_METERS = 500

/** Minimum geofence radius in meters */
export const MIN_GEOFENCE_RADIUS_METERS = 100

/** Maximum geofence radius in meters */
export const MAX_GEOFENCE_RADIUS_METERS = 2000

/**
 * Location zone schema.
 * Story 40.2: AC1, AC4 - Define location zones with geofence boundaries
 *
 * Stored at: families/{familyId}/locationZones/{zoneId}
 */
export const locationZoneSchema = z.object({
  /** Unique zone identifier */
  id: z.string().min(1),
  /** Family ID this zone belongs to */
  familyId: z.string().min(1),
  /** User-friendly zone name (e.g., "Mom's House", "Lincoln Elementary") */
  name: z.string().min(1).max(100),
  /** Zone type for categorization */
  type: locationZoneTypeSchema,
  /** Latitude coordinate */
  latitude: z.number().min(-90).max(90),
  /** Longitude coordinate */
  longitude: z.number().min(-180).max(180),
  /** Geofence radius in meters (default 500, min 100, max 2000 per AC4) */
  radiusMeters: z
    .number()
    .min(MIN_GEOFENCE_RADIUS_METERS)
    .max(MAX_GEOFENCE_RADIUS_METERS)
    .default(DEFAULT_GEOFENCE_RADIUS_METERS),
  /** Optional display address for user reference */
  address: z.string().max(500).nullable(),
  /** When zone was created */
  createdAt: z.date(),
  /** When zone was last updated */
  updatedAt: z.date(),
})
export type LocationZone = z.infer<typeof locationZoneSchema>

/**
 * Cloud function input: Create location zone.
 * Story 40.2: AC1 - Guardian creates a new location zone
 */
export const createLocationZoneInputSchema = z.object({
  /** Family ID */
  familyId: z.string().min(1),
  /** User-friendly zone name */
  name: z.string().min(1).max(100),
  /** Zone type */
  type: locationZoneTypeSchema,
  /** Latitude coordinate */
  latitude: z.number().min(-90).max(90),
  /** Longitude coordinate */
  longitude: z.number().min(-180).max(180),
  /** Optional geofence radius (defaults to 500m) */
  radiusMeters: z
    .number()
    .min(MIN_GEOFENCE_RADIUS_METERS)
    .max(MAX_GEOFENCE_RADIUS_METERS)
    .optional(),
  /** Optional display address */
  address: z.string().max(500).optional(),
})
export type CreateLocationZoneInput = z.infer<typeof createLocationZoneInputSchema>

/**
 * Cloud function input: Update location zone.
 * Story 40.2: AC1 - Guardian updates an existing location zone
 */
export const updateLocationZoneInputSchema = z.object({
  /** Family ID */
  familyId: z.string().min(1),
  /** Zone ID to update */
  zoneId: z.string().min(1),
  /** Updated zone name */
  name: z.string().min(1).max(100).optional(),
  /** Updated zone type */
  type: locationZoneTypeSchema.optional(),
  /** Updated latitude coordinate */
  latitude: z.number().min(-90).max(90).optional(),
  /** Updated longitude coordinate */
  longitude: z.number().min(-180).max(180).optional(),
  /** Updated geofence radius */
  radiusMeters: z
    .number()
    .min(MIN_GEOFENCE_RADIUS_METERS)
    .max(MAX_GEOFENCE_RADIUS_METERS)
    .optional(),
  /** Updated display address */
  address: z.string().max(500).nullable().optional(),
})
export type UpdateLocationZoneInput = z.infer<typeof updateLocationZoneInputSchema>

/**
 * Cloud function input: Delete location zone.
 * Story 40.2: AC1 - Guardian deletes a location zone
 */
export const deleteLocationZoneInputSchema = z.object({
  /** Family ID */
  familyId: z.string().min(1),
  /** Zone ID to delete */
  zoneId: z.string().min(1),
})
export type DeleteLocationZoneInput = z.infer<typeof deleteLocationZoneInputSchema>
