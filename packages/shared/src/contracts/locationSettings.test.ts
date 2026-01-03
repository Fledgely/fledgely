/**
 * Unit tests for Location Feature Settings schemas.
 *
 * Story 40.1: Location-Based Rule Opt-In
 * - AC1: Explicit Dual-Guardian Opt-In
 * - AC4: Default Disabled
 */

import { describe, it, expect } from 'vitest'
import {
  locationOptInStatusSchema,
  locationSettingsSchema,
  locationOptInRequestSchema,
  locationOptInRequestStatusSchema,
  requestLocationOptInInputSchema,
  approveLocationOptInInputSchema,
  disableLocationFeaturesInputSchema,
  type LocationSettings,
  type LocationOptInRequest,
} from './index'

describe('locationOptInStatusSchema', () => {
  it('accepts valid status values', () => {
    const validStatuses = ['disabled', 'pending', 'enabled']

    validStatuses.forEach((status) => {
      const result = locationOptInStatusSchema.safeParse(status)
      expect(result.success).toBe(true)
    })
  })

  it('rejects invalid status values', () => {
    const result = locationOptInStatusSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })
})

describe('locationSettingsSchema', () => {
  it('validates settings when disabled (AC4: Default Disabled)', () => {
    const disabledSettings: LocationSettings = {
      locationFeaturesEnabled: false,
      locationEnabledAt: null,
      locationEnabledByUids: [],
      locationDisabledAt: null,
      locationDisabledByUid: null,
      childNotifiedAt: null,
    }

    const result = locationSettingsSchema.safeParse(disabledSettings)
    expect(result.success).toBe(true)
  })

  it('validates settings when enabled with both guardians (AC1: Dual-Guardian)', () => {
    const enabledSettings: LocationSettings = {
      locationFeaturesEnabled: true,
      locationEnabledAt: new Date(),
      locationEnabledByUids: ['guardian-1', 'guardian-2'],
      locationDisabledAt: null,
      locationDisabledByUid: null,
      childNotifiedAt: new Date(),
    }

    const result = locationSettingsSchema.safeParse(enabledSettings)
    expect(result.success).toBe(true)
  })

  it('validates settings when disabled by a guardian', () => {
    const disabledByGuardian: LocationSettings = {
      locationFeaturesEnabled: false,
      locationEnabledAt: new Date('2026-01-01'),
      locationEnabledByUids: ['guardian-1', 'guardian-2'],
      locationDisabledAt: new Date('2026-01-03'),
      locationDisabledByUid: 'guardian-1',
      childNotifiedAt: new Date('2026-01-01'),
    }

    const result = locationSettingsSchema.safeParse(disabledByGuardian)
    expect(result.success).toBe(true)
  })

  it('requires locationFeaturesEnabled to be boolean', () => {
    const invalid = {
      locationFeaturesEnabled: 'true', // string instead of boolean
      locationEnabledAt: null,
      locationEnabledByUids: [],
      locationDisabledAt: null,
      locationDisabledByUid: null,
      childNotifiedAt: null,
    }

    const result = locationSettingsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('requires locationEnabledByUids to be an array of strings', () => {
    const invalid = {
      locationFeaturesEnabled: true,
      locationEnabledAt: new Date(),
      locationEnabledByUids: 'guardian-1', // string instead of array
      locationDisabledAt: null,
      locationDisabledByUid: null,
      childNotifiedAt: null,
    }

    const result = locationSettingsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('allows empty locationEnabledByUids array when disabled', () => {
    const settings = {
      locationFeaturesEnabled: false,
      locationEnabledAt: null,
      locationEnabledByUids: [],
      locationDisabledAt: null,
      locationDisabledByUid: null,
      childNotifiedAt: null,
    }

    const result = locationSettingsSchema.safeParse(settings)
    expect(result.success).toBe(true)
  })
})

describe('locationOptInRequestStatusSchema', () => {
  it('accepts valid request status values', () => {
    const validStatuses = ['pending', 'approved', 'declined', 'expired']

    validStatuses.forEach((status) => {
      const result = locationOptInRequestStatusSchema.safeParse(status)
      expect(result.success).toBe(true)
    })
  })

  it('rejects invalid request status values', () => {
    const result = locationOptInRequestStatusSchema.safeParse('cancelled')
    expect(result.success).toBe(false)
  })
})

describe('locationOptInRequestSchema', () => {
  const validPendingRequest: LocationOptInRequest = {
    id: 'request-123',
    familyId: 'family-456',
    requestedByUid: 'guardian-1',
    status: 'pending',
    approvedByUid: null,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours
    resolvedAt: null,
  }

  it('validates a pending opt-in request', () => {
    const result = locationOptInRequestSchema.safeParse(validPendingRequest)
    expect(result.success).toBe(true)
  })

  it('validates an approved request with approver', () => {
    const approvedRequest: LocationOptInRequest = {
      ...validPendingRequest,
      status: 'approved',
      approvedByUid: 'guardian-2',
      resolvedAt: new Date(),
    }

    const result = locationOptInRequestSchema.safeParse(approvedRequest)
    expect(result.success).toBe(true)
  })

  it('validates a declined request', () => {
    const declinedRequest: LocationOptInRequest = {
      ...validPendingRequest,
      status: 'declined',
      approvedByUid: null,
      resolvedAt: new Date(),
    }

    const result = locationOptInRequestSchema.safeParse(declinedRequest)
    expect(result.success).toBe(true)
  })

  it('validates an expired request', () => {
    const expiredRequest: LocationOptInRequest = {
      ...validPendingRequest,
      status: 'expired',
      expiresAt: new Date(Date.now() - 1000), // Already expired
      resolvedAt: new Date(),
    }

    const result = locationOptInRequestSchema.safeParse(expiredRequest)
    expect(result.success).toBe(true)
  })

  it('requires id to be a non-empty string', () => {
    const invalid = { ...validPendingRequest, id: '' }
    const result = locationOptInRequestSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('requires familyId to be a non-empty string', () => {
    const invalid = { ...validPendingRequest, familyId: '' }
    const result = locationOptInRequestSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('requires requestedByUid to be a non-empty string', () => {
    const invalid = { ...validPendingRequest, requestedByUid: '' }
    const result = locationOptInRequestSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('requires createdAt to be a date', () => {
    const invalid = { ...validPendingRequest, createdAt: 'not-a-date' }
    const result = locationOptInRequestSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('requires expiresAt to be a date', () => {
    const invalid = { ...validPendingRequest, expiresAt: null }
    const result = locationOptInRequestSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})

describe('requestLocationOptInInputSchema', () => {
  it('validates valid input', () => {
    const input = {
      familyId: 'family-456',
    }

    const result = requestLocationOptInInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('rejects empty familyId', () => {
    const input = { familyId: '' }
    const result = requestLocationOptInInputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })
})

describe('approveLocationOptInInputSchema', () => {
  it('validates valid input', () => {
    const input = {
      familyId: 'family-456',
      requestId: 'request-123',
    }

    const result = approveLocationOptInInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('rejects missing requestId', () => {
    const input = { familyId: 'family-456' }
    const result = approveLocationOptInInputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })
})

describe('disableLocationFeaturesInputSchema', () => {
  it('validates valid input without fleeing mode', () => {
    const input = {
      familyId: 'family-456',
      isFleeingMode: false,
    }

    const result = disableLocationFeaturesInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('validates valid input with fleeing mode (AC6)', () => {
    const input = {
      familyId: 'family-456',
      isFleeingMode: true,
    }

    const result = disableLocationFeaturesInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('defaults isFleeingMode to false', () => {
    const input = { familyId: 'family-456' }
    const result = disableLocationFeaturesInputSchema.safeParse(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.isFleeingMode).toBe(false)
    }
  })
})
