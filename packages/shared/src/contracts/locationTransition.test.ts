/**
 * Tests for Location Transition Schema - Story 40.4
 *
 * Acceptance Criteria:
 * - AC1: Transition Detection
 * - AC2: 5-minute Grace Period
 * - AC3: Transition Notification
 * - AC5: Default Behavior (unclear locations)
 * - AC6: Location Detection (GPS + WiFi)
 */

import { describe, it, expect } from 'vitest'
import {
  locationTransitionSchema,
  deviceLocationSchema,
  locationUpdateInputSchema,
  locationUpdateResponseSchema,
  getLocationTransitionsInputSchema,
  getLocationTransitionsResponseSchema as _getLocationTransitionsResponseSchema,
  appliedRulesSchema,
  LOCATION_TRANSITION_GRACE_PERIOD_MS,
  LOCATION_TRANSITION_GRACE_PERIOD_SECONDS,
  LOCATION_UPDATE_MIN_INTERVAL_MS,
  LOCATION_MAX_ACCURACY_METERS,
  TRANSITION_CHILD_MESSAGES,
  TRANSITION_ADULT_MESSAGES,
  calculateDistanceMeters,
  isWithinZone,
  calculateGracePeriodMinutes,
  isGracePeriodExpired,
} from './locationTransition'

describe('Location Transition Schema', () => {
  describe('Constants', () => {
    it('defines 5-minute grace period in milliseconds (AC2)', () => {
      expect(LOCATION_TRANSITION_GRACE_PERIOD_MS).toBe(5 * 60 * 1000)
    })

    it('defines 5-minute grace period in seconds', () => {
      expect(LOCATION_TRANSITION_GRACE_PERIOD_SECONDS).toBe(5 * 60)
    })

    it('defines minimum update interval (rate limiting)', () => {
      expect(LOCATION_UPDATE_MIN_INTERVAL_MS).toBe(60 * 1000)
    })

    it('defines maximum accuracy for valid location', () => {
      expect(LOCATION_MAX_ACCURACY_METERS).toBe(500)
    })
  })

  describe('locationTransitionSchema', () => {
    const validTransition = {
      id: 'transition-123',
      familyId: 'family-456',
      childId: 'child-789',
      deviceId: 'device-abc',
      fromZoneId: 'zone-from',
      toZoneId: 'zone-to',
      detectedAt: new Date(),
      gracePeriodEndsAt: new Date(Date.now() + LOCATION_TRANSITION_GRACE_PERIOD_MS),
      appliedAt: null,
      notificationSentAt: null,
      rulesApplied: null,
    }

    it('validates a complete transition', () => {
      const result = locationTransitionSchema.safeParse(validTransition)
      expect(result.success).toBe(true)
    })

    it('allows null fromZoneId (first location or unknown)', () => {
      const result = locationTransitionSchema.safeParse({
        ...validTransition,
        fromZoneId: null,
      })
      expect(result.success).toBe(true)
    })

    it('allows null toZoneId (location unclear - AC5)', () => {
      const result = locationTransitionSchema.safeParse({
        ...validTransition,
        toZoneId: null,
      })
      expect(result.success).toBe(true)
    })

    it('allows null appliedAt (not yet applied)', () => {
      const result = locationTransitionSchema.safeParse({
        ...validTransition,
        appliedAt: null,
      })
      expect(result.success).toBe(true)
    })

    it('allows Date appliedAt (rules applied)', () => {
      const result = locationTransitionSchema.safeParse({
        ...validTransition,
        appliedAt: new Date(),
      })
      expect(result.success).toBe(true)
    })

    it('allows rulesApplied snapshot', () => {
      const result = locationTransitionSchema.safeParse({
        ...validTransition,
        rulesApplied: {
          dailyTimeLimitMinutes: 120,
          educationOnlyMode: false,
          categoryOverrides: { gaming: 'blocked' },
        },
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty id', () => {
      const result = locationTransitionSchema.safeParse({
        ...validTransition,
        id: '',
      })
      expect(result.success).toBe(false)
    })

    it('requires gracePeriodEndsAt', () => {
      const { gracePeriodEndsAt: _gracePeriodEndsAt, ...withoutGrace } = validTransition
      const result = locationTransitionSchema.safeParse(withoutGrace)
      expect(result.success).toBe(false)
    })
  })

  describe('deviceLocationSchema', () => {
    const validLocation = {
      deviceId: 'device-123',
      familyId: 'family-456',
      childId: 'child-789',
      latitude: 37.7749,
      longitude: -122.4194,
      accuracyMeters: 50,
      zoneId: 'zone-abc',
      updatedAt: new Date(),
    }

    it('validates a complete device location', () => {
      const result = deviceLocationSchema.safeParse(validLocation)
      expect(result.success).toBe(true)
    })

    it('allows null zoneId (no zone match)', () => {
      const result = deviceLocationSchema.safeParse({
        ...validLocation,
        zoneId: null,
      })
      expect(result.success).toBe(true)
    })

    it('validates latitude bounds (-90 to 90)', () => {
      expect(deviceLocationSchema.safeParse({ ...validLocation, latitude: -90 }).success).toBe(true)
      expect(deviceLocationSchema.safeParse({ ...validLocation, latitude: 90 }).success).toBe(true)
      expect(deviceLocationSchema.safeParse({ ...validLocation, latitude: -91 }).success).toBe(
        false
      )
      expect(deviceLocationSchema.safeParse({ ...validLocation, latitude: 91 }).success).toBe(false)
    })

    it('validates longitude bounds (-180 to 180)', () => {
      expect(deviceLocationSchema.safeParse({ ...validLocation, longitude: -180 }).success).toBe(
        true
      )
      expect(deviceLocationSchema.safeParse({ ...validLocation, longitude: 180 }).success).toBe(
        true
      )
      expect(deviceLocationSchema.safeParse({ ...validLocation, longitude: -181 }).success).toBe(
        false
      )
      expect(deviceLocationSchema.safeParse({ ...validLocation, longitude: 181 }).success).toBe(
        false
      )
    })

    it('rejects negative accuracy', () => {
      const result = deviceLocationSchema.safeParse({
        ...validLocation,
        accuracyMeters: -10,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('locationUpdateInputSchema', () => {
    const validInput = {
      deviceId: 'device-123',
      latitude: 37.7749,
      longitude: -122.4194,
      accuracyMeters: 50,
    }

    it('validates valid input', () => {
      const result = locationUpdateInputSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('allows optional wifiSsid', () => {
      const result = locationUpdateInputSchema.safeParse({
        ...validInput,
        wifiSsid: 'HomeNetwork',
      })
      expect(result.success).toBe(true)
    })

    it('allows null wifiSsid', () => {
      const result = locationUpdateInputSchema.safeParse({
        ...validInput,
        wifiSsid: null,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('locationUpdateResponseSchema', () => {
    it('validates response with matched zone', () => {
      const result = locationUpdateResponseSchema.safeParse({
        success: true,
        zoneId: 'zone-123',
        zoneName: "Mom's House",
        transitionTriggered: true,
        message: 'Location updated',
      })
      expect(result.success).toBe(true)
    })

    it('validates response with no zone match', () => {
      const result = locationUpdateResponseSchema.safeParse({
        success: true,
        zoneId: null,
        zoneName: null,
        transitionTriggered: false,
        message: 'No zone matched',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('getLocationTransitionsInputSchema', () => {
    it('validates basic input', () => {
      const result = getLocationTransitionsInputSchema.safeParse({
        familyId: 'family-123',
      })
      expect(result.success).toBe(true)
    })

    it('has default page of 1', () => {
      const result = getLocationTransitionsInputSchema.parse({
        familyId: 'family-123',
      })
      expect(result.page).toBe(1)
    })

    it('has default pageSize of 20', () => {
      const result = getLocationTransitionsInputSchema.parse({
        familyId: 'family-123',
      })
      expect(result.pageSize).toBe(20)
    })

    it('allows filtering by childId', () => {
      const result = getLocationTransitionsInputSchema.safeParse({
        familyId: 'family-123',
        childId: 'child-456',
      })
      expect(result.success).toBe(true)
    })

    it('allows filtering by date range', () => {
      const result = getLocationTransitionsInputSchema.safeParse({
        familyId: 'family-123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      })
      expect(result.success).toBe(true)
    })

    it('limits pageSize to 100', () => {
      const result = getLocationTransitionsInputSchema.safeParse({
        familyId: 'family-123',
        pageSize: 101,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('appliedRulesSchema', () => {
    it('validates complete rules', () => {
      const result = appliedRulesSchema.safeParse({
        dailyTimeLimitMinutes: 120,
        educationOnlyMode: true,
        categoryOverrides: { gaming: 'blocked', education: 'allowed' },
      })
      expect(result.success).toBe(true)
    })

    it('allows null dailyTimeLimitMinutes (use default)', () => {
      const result = appliedRulesSchema.safeParse({
        dailyTimeLimitMinutes: null,
        educationOnlyMode: false,
        categoryOverrides: {},
      })
      expect(result.success).toBe(true)
    })

    it('validates time limit bounds (0-1440 minutes)', () => {
      expect(
        appliedRulesSchema.safeParse({
          dailyTimeLimitMinutes: 0,
          educationOnlyMode: false,
          categoryOverrides: {},
        }).success
      ).toBe(true)
      expect(
        appliedRulesSchema.safeParse({
          dailyTimeLimitMinutes: 1440,
          educationOnlyMode: false,
          categoryOverrides: {},
        }).success
      ).toBe(true)
      expect(
        appliedRulesSchema.safeParse({
          dailyTimeLimitMinutes: -1,
          educationOnlyMode: false,
          categoryOverrides: {},
        }).success
      ).toBe(false)
      expect(
        appliedRulesSchema.safeParse({
          dailyTimeLimitMinutes: 1441,
          educationOnlyMode: false,
          categoryOverrides: {},
        }).success
      ).toBe(false)
    })
  })
})

describe('Child-Friendly Messages (AC3, NFR65)', () => {
  describe('TRANSITION_CHILD_MESSAGES', () => {
    it('provides entering zone message', () => {
      const message = TRANSITION_CHILD_MESSAGES.enteringZone("Dad's House", 5)
      expect(message).toBe("You're now at Dad's House. Rules will change in 5 minutes.")
    })

    it('uses singular minute for 1 minute', () => {
      const message = TRANSITION_CHILD_MESSAGES.enteringZone("Mom's House", 1)
      expect(message).toContain('1 minute.')
    })

    it('uses plural minutes for > 1', () => {
      const message = TRANSITION_CHILD_MESSAGES.enteringZone('School', 3)
      expect(message).toContain('3 minutes.')
    })

    it('provides leaving zone message', () => {
      const message = TRANSITION_CHILD_MESSAGES.leavingZone("Dad's House")
      expect(message).toBe("You left Dad's House. Using normal rules.")
    })

    it('provides unknown location message', () => {
      expect(TRANSITION_CHILD_MESSAGES.unknownLocation).toBe(
        "We can't tell where you are. Using your normal rules."
      )
    })

    it('provides rules applied message', () => {
      const message = TRANSITION_CHILD_MESSAGES.rulesApplied('School')
      expect(message).toBe("You're at School. Rules have been updated.")
    })
  })

  describe('TRANSITION_ADULT_MESSAGES', () => {
    it('provides entering zone message with child name', () => {
      const message = TRANSITION_ADULT_MESSAGES.enteringZone("Dad's House", 'Emma', 5)
      expect(message).toBe("Emma arrived at Dad's House. Location rules will apply in 5 minutes.")
    })

    it('uses singular minute for 1 minute', () => {
      const message = TRANSITION_ADULT_MESSAGES.enteringZone("Mom's House", 'Emma', 1)
      expect(message).toContain('1 minute.')
      expect(message).not.toContain('1 minutes')
    })

    it('uses plural minutes for > 1', () => {
      const message = TRANSITION_ADULT_MESSAGES.enteringZone('School', 'Emma', 3)
      expect(message).toContain('3 minutes.')
    })

    it('provides leaving zone message', () => {
      const message = TRANSITION_ADULT_MESSAGES.leavingZone("Mom's House", 'Alex')
      expect(message).toBe("Alex left Mom's House. Default rules now apply.")
    })

    it('provides unknown location message', () => {
      const message = TRANSITION_ADULT_MESSAGES.unknownLocation('Sam')
      expect(message).toBe("Sam's location is unclear. Using default (permissive) rules.")
    })
  })
})

describe('Geolocation Utilities', () => {
  describe('calculateDistanceMeters', () => {
    it('returns 0 for same coordinates', () => {
      const distance = calculateDistanceMeters(37.7749, -122.4194, 37.7749, -122.4194)
      expect(distance).toBe(0)
    })

    it('calculates distance between two points', () => {
      // San Francisco to Oakland (~13 km)
      const distance = calculateDistanceMeters(
        37.7749,
        -122.4194, // SF
        37.8044,
        -122.2712 // Oakland
      )
      // Should be approximately 13,000 meters (allowing some tolerance)
      expect(distance).toBeGreaterThan(12000)
      expect(distance).toBeLessThan(14000)
    })

    it('calculates short distances accurately', () => {
      // Two points ~100m apart
      const lat1 = 37.7749
      const lon1 = -122.4194
      const lat2 = 37.7758 // ~100m north
      const distance = calculateDistanceMeters(lat1, lon1, lat2, lon1)
      expect(distance).toBeGreaterThan(90)
      expect(distance).toBeLessThan(110)
    })
  })

  describe('isWithinZone', () => {
    const zoneCenter = { lat: 37.7749, lon: -122.4194 }
    const radiusMeters = 500

    it('returns true for location at zone center', () => {
      expect(
        isWithinZone(zoneCenter.lat, zoneCenter.lon, zoneCenter.lat, zoneCenter.lon, radiusMeters)
      ).toBe(true)
    })

    it('returns true for location within radius', () => {
      // ~100m away from center
      expect(isWithinZone(37.7758, -122.4194, zoneCenter.lat, zoneCenter.lon, radiusMeters)).toBe(
        true
      )
    })

    it('returns false for location outside radius', () => {
      // ~1km away from center
      expect(isWithinZone(37.7849, -122.4194, zoneCenter.lat, zoneCenter.lon, radiusMeters)).toBe(
        false
      )
    })

    it('returns true for location exactly at radius boundary', () => {
      // Calculate a point exactly 500m north
      const latOffset = 500 / 111320 // ~111km per degree latitude
      expect(
        isWithinZone(
          zoneCenter.lat + latOffset,
          zoneCenter.lon,
          zoneCenter.lat,
          zoneCenter.lon,
          radiusMeters
        )
      ).toBe(true)
    })
  })

  describe('calculateGracePeriodMinutes', () => {
    it('returns 5 for grace period just starting', () => {
      const gracePeriodEndsAt = new Date(Date.now() + 5 * 60 * 1000)
      expect(calculateGracePeriodMinutes(gracePeriodEndsAt)).toBe(5)
    })

    it('returns 1 for 30 seconds remaining (rounds up)', () => {
      const gracePeriodEndsAt = new Date(Date.now() + 30 * 1000)
      expect(calculateGracePeriodMinutes(gracePeriodEndsAt)).toBe(1)
    })

    it('returns 0 for expired grace period', () => {
      const gracePeriodEndsAt = new Date(Date.now() - 60 * 1000)
      expect(calculateGracePeriodMinutes(gracePeriodEndsAt)).toBe(0)
    })
  })

  describe('isGracePeriodExpired', () => {
    it('returns false for future grace period end', () => {
      const gracePeriodEndsAt = new Date(Date.now() + 5 * 60 * 1000)
      expect(isGracePeriodExpired(gracePeriodEndsAt)).toBe(false)
    })

    it('returns true for past grace period end', () => {
      const gracePeriodEndsAt = new Date(Date.now() - 60 * 1000)
      expect(isGracePeriodExpired(gracePeriodEndsAt)).toBe(true)
    })

    it('returns true for exactly now', () => {
      const gracePeriodEndsAt = new Date()
      expect(isGracePeriodExpired(gracePeriodEndsAt)).toBe(true)
    })
  })
})
