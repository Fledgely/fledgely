/**
 * Unit tests for Location Zone schemas.
 *
 * Story 40.2: Location-Specific Rule Configuration
 * - AC1: Location Definitions
 * - AC4: Geofence Configuration
 */

import { describe, it, expect } from 'vitest'
import {
  locationZoneTypeSchema,
  locationZoneSchema,
  createLocationZoneInputSchema,
  updateLocationZoneInputSchema,
  deleteLocationZoneInputSchema,
  type LocationZone,
  type CreateLocationZoneInput,
  DEFAULT_GEOFENCE_RADIUS_METERS,
  MIN_GEOFENCE_RADIUS_METERS,
  MAX_GEOFENCE_RADIUS_METERS,
} from './index'

describe('locationZoneTypeSchema', () => {
  it('accepts valid zone types (AC1: Home 1, Home 2, School, Other)', () => {
    const validTypes = ['home_1', 'home_2', 'school', 'other']

    validTypes.forEach((type) => {
      const result = locationZoneTypeSchema.safeParse(type)
      expect(result.success).toBe(true)
    })
  })

  it('rejects invalid zone types', () => {
    const result = locationZoneTypeSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })

  it('rejects uppercase zone types', () => {
    const result = locationZoneTypeSchema.safeParse('HOME_1')
    expect(result.success).toBe(false)
  })
})

describe('locationZoneSchema', () => {
  const validZone: LocationZone = {
    id: 'zone-123',
    familyId: 'family-456',
    name: "Mom's House",
    type: 'home_1',
    latitude: 40.7128,
    longitude: -74.006,
    radiusMeters: 500,
    address: '123 Main St, New York, NY 10001',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  it('validates a complete zone with all fields', () => {
    const result = locationZoneSchema.safeParse(validZone)
    expect(result.success).toBe(true)
  })

  it('validates a zone with null address', () => {
    const zoneWithNullAddress: LocationZone = {
      ...validZone,
      address: null,
    }

    const result = locationZoneSchema.safeParse(zoneWithNullAddress)
    expect(result.success).toBe(true)
  })

  it('validates zone type home_2', () => {
    const zone: LocationZone = {
      ...validZone,
      type: 'home_2',
      name: "Dad's House",
    }

    const result = locationZoneSchema.safeParse(zone)
    expect(result.success).toBe(true)
  })

  it('validates zone type school', () => {
    const zone: LocationZone = {
      ...validZone,
      type: 'school',
      name: 'Lincoln Elementary',
    }

    const result = locationZoneSchema.safeParse(zone)
    expect(result.success).toBe(true)
  })

  it('validates zone type other', () => {
    const zone: LocationZone = {
      ...validZone,
      type: 'other',
      name: 'Grandma House',
    }

    const result = locationZoneSchema.safeParse(zone)
    expect(result.success).toBe(true)
  })

  describe('geofence radius (AC4)', () => {
    it('accepts default radius of 500m', () => {
      expect(DEFAULT_GEOFENCE_RADIUS_METERS).toBe(500)

      const zone: LocationZone = {
        ...validZone,
        radiusMeters: DEFAULT_GEOFENCE_RADIUS_METERS,
      }

      const result = locationZoneSchema.safeParse(zone)
      expect(result.success).toBe(true)
    })

    it('accepts minimum radius of 100m', () => {
      expect(MIN_GEOFENCE_RADIUS_METERS).toBe(100)

      const zone: LocationZone = {
        ...validZone,
        radiusMeters: MIN_GEOFENCE_RADIUS_METERS,
      }

      const result = locationZoneSchema.safeParse(zone)
      expect(result.success).toBe(true)
    })

    it('accepts maximum radius of 2000m', () => {
      expect(MAX_GEOFENCE_RADIUS_METERS).toBe(2000)

      const zone: LocationZone = {
        ...validZone,
        radiusMeters: MAX_GEOFENCE_RADIUS_METERS,
      }

      const result = locationZoneSchema.safeParse(zone)
      expect(result.success).toBe(true)
    })

    it('rejects radius below minimum (99m)', () => {
      const zone = {
        ...validZone,
        radiusMeters: 99,
      }

      const result = locationZoneSchema.safeParse(zone)
      expect(result.success).toBe(false)
    })

    it('rejects radius above maximum (2001m)', () => {
      const zone = {
        ...validZone,
        radiusMeters: 2001,
      }

      const result = locationZoneSchema.safeParse(zone)
      expect(result.success).toBe(false)
    })
  })

  describe('coordinate validation', () => {
    it('accepts valid latitude (-90 to 90)', () => {
      const validLatitudes = [-90, -45, 0, 45, 90]

      validLatitudes.forEach((lat) => {
        const zone = { ...validZone, latitude: lat }
        const result = locationZoneSchema.safeParse(zone)
        expect(result.success).toBe(true)
      })
    })

    it('rejects latitude below -90', () => {
      const zone = { ...validZone, latitude: -91 }
      const result = locationZoneSchema.safeParse(zone)
      expect(result.success).toBe(false)
    })

    it('rejects latitude above 90', () => {
      const zone = { ...validZone, latitude: 91 }
      const result = locationZoneSchema.safeParse(zone)
      expect(result.success).toBe(false)
    })

    it('accepts valid longitude (-180 to 180)', () => {
      const validLongitudes = [-180, -90, 0, 90, 180]

      validLongitudes.forEach((lng) => {
        const zone = { ...validZone, longitude: lng }
        const result = locationZoneSchema.safeParse(zone)
        expect(result.success).toBe(true)
      })
    })

    it('rejects longitude below -180', () => {
      const zone = { ...validZone, longitude: -181 }
      const result = locationZoneSchema.safeParse(zone)
      expect(result.success).toBe(false)
    })

    it('rejects longitude above 180', () => {
      const zone = { ...validZone, longitude: 181 }
      const result = locationZoneSchema.safeParse(zone)
      expect(result.success).toBe(false)
    })
  })

  describe('required fields', () => {
    it('requires id to be a non-empty string', () => {
      const zone = { ...validZone, id: '' }
      const result = locationZoneSchema.safeParse(zone)
      expect(result.success).toBe(false)
    })

    it('requires familyId to be a non-empty string', () => {
      const zone = { ...validZone, familyId: '' }
      const result = locationZoneSchema.safeParse(zone)
      expect(result.success).toBe(false)
    })

    it('requires name to be a non-empty string', () => {
      const zone = { ...validZone, name: '' }
      const result = locationZoneSchema.safeParse(zone)
      expect(result.success).toBe(false)
    })

    it('rejects name longer than 100 characters', () => {
      const zone = { ...validZone, name: 'x'.repeat(101) }
      const result = locationZoneSchema.safeParse(zone)
      expect(result.success).toBe(false)
    })

    it('rejects address longer than 500 characters', () => {
      const zone = { ...validZone, address: 'x'.repeat(501) }
      const result = locationZoneSchema.safeParse(zone)
      expect(result.success).toBe(false)
    })

    it('requires createdAt to be a date', () => {
      const zone = { ...validZone, createdAt: 'not-a-date' }
      const result = locationZoneSchema.safeParse(zone)
      expect(result.success).toBe(false)
    })

    it('requires updatedAt to be a date', () => {
      const zone = { ...validZone, updatedAt: 'not-a-date' }
      const result = locationZoneSchema.safeParse(zone)
      expect(result.success).toBe(false)
    })
  })
})

describe('createLocationZoneInputSchema', () => {
  const validInput: CreateLocationZoneInput = {
    familyId: 'family-456',
    name: "Mom's House",
    type: 'home_1',
    latitude: 40.7128,
    longitude: -74.006,
  }

  it('validates input with required fields only', () => {
    const result = createLocationZoneInputSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('validates input with optional radiusMeters', () => {
    const input = {
      ...validInput,
      radiusMeters: 750,
    }

    const result = createLocationZoneInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('validates input with optional address', () => {
    const input = {
      ...validInput,
      address: '123 Main St, New York, NY 10001',
    }

    const result = createLocationZoneInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('rejects empty familyId', () => {
    const input = { ...validInput, familyId: '' }
    const result = createLocationZoneInputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const input = { ...validInput, name: '' }
    const result = createLocationZoneInputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects invalid coordinates', () => {
    const input = { ...validInput, latitude: 100 }
    const result = createLocationZoneInputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects radius outside allowed range', () => {
    const input = { ...validInput, radiusMeters: 50 }
    const result = createLocationZoneInputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })
})

describe('updateLocationZoneInputSchema', () => {
  it('validates input with only required fields', () => {
    const input = {
      familyId: 'family-456',
      zoneId: 'zone-123',
    }

    const result = updateLocationZoneInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('validates input with name update', () => {
    const input = {
      familyId: 'family-456',
      zoneId: 'zone-123',
      name: 'Updated Name',
    }

    const result = updateLocationZoneInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('validates input with type update', () => {
    const input = {
      familyId: 'family-456',
      zoneId: 'zone-123',
      type: 'school' as const,
    }

    const result = updateLocationZoneInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('validates input with coordinates update', () => {
    const input = {
      familyId: 'family-456',
      zoneId: 'zone-123',
      latitude: 35.6762,
      longitude: 139.6503,
    }

    const result = updateLocationZoneInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('validates input with radius update', () => {
    const input = {
      familyId: 'family-456',
      zoneId: 'zone-123',
      radiusMeters: 1000,
    }

    const result = updateLocationZoneInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('validates input with address set to null', () => {
    const input = {
      familyId: 'family-456',
      zoneId: 'zone-123',
      address: null,
    }

    const result = updateLocationZoneInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('rejects empty familyId', () => {
    const input = {
      familyId: '',
      zoneId: 'zone-123',
    }

    const result = updateLocationZoneInputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects empty zoneId', () => {
    const input = {
      familyId: 'family-456',
      zoneId: '',
    }

    const result = updateLocationZoneInputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })
})

describe('deleteLocationZoneInputSchema', () => {
  it('validates valid input', () => {
    const input = {
      familyId: 'family-456',
      zoneId: 'zone-123',
    }

    const result = deleteLocationZoneInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('rejects empty familyId', () => {
    const input = {
      familyId: '',
      zoneId: 'zone-123',
    }

    const result = deleteLocationZoneInputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects empty zoneId', () => {
    const input = {
      familyId: 'family-456',
      zoneId: '',
    }

    const result = deleteLocationZoneInputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects missing zoneId', () => {
    const input = { familyId: 'family-456' }
    const result = deleteLocationZoneInputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })
})
