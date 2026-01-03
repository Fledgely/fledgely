/**
 * Tests for Location Privacy schemas.
 * Story 40.5: Location Privacy Controls
 */

import { describe, it, expect } from 'vitest'
import {
  childLocationStatusSchema,
  locationDisableRequestSchema,
  locationDisableRequestStatusSchema,
  requestLocationDisableInputSchema,
  getChildLocationStatusInputSchema,
  getChildLocationHistoryInputSchema,
  childLocationHistoryItemSchema,
  getChildLocationHistoryResponseSchema,
  LOCATION_PRIVACY_MESSAGES,
  LOCATION_DISABLE_REQUEST_MESSAGES,
  formatTimeDescription,
  calculateDurationMinutes,
} from './locationPrivacy'

describe('childLocationStatusSchema', () => {
  it('validates complete location status', () => {
    const status = {
      currentZoneId: 'zone-123',
      currentZoneName: 'Home',
      zoneOwnerName: 'Mom',
      lastUpdatedAt: new Date(),
      locationFeaturesEnabled: true,
    }
    expect(childLocationStatusSchema.parse(status)).toEqual(status)
  })

  it('validates status with null zone (unknown location)', () => {
    const status = {
      currentZoneId: null,
      currentZoneName: null,
      zoneOwnerName: null,
      lastUpdatedAt: new Date(),
      locationFeaturesEnabled: true,
    }
    expect(childLocationStatusSchema.parse(status)).toEqual(status)
  })

  it('validates status with location features disabled', () => {
    const status = {
      currentZoneId: null,
      currentZoneName: null,
      zoneOwnerName: null,
      lastUpdatedAt: new Date(),
      locationFeaturesEnabled: false,
    }
    expect(childLocationStatusSchema.parse(status)).toEqual(status)
  })

  it('rejects empty zone ID string', () => {
    const status = {
      currentZoneId: '',
      currentZoneName: 'Home',
      zoneOwnerName: 'Mom',
      lastUpdatedAt: new Date(),
      locationFeaturesEnabled: true,
    }
    expect(() => childLocationStatusSchema.parse(status)).toThrow()
  })
})

describe('locationDisableRequestStatusSchema', () => {
  it('validates pending status', () => {
    expect(locationDisableRequestStatusSchema.parse('pending')).toBe('pending')
  })

  it('validates approved status', () => {
    expect(locationDisableRequestStatusSchema.parse('approved')).toBe('approved')
  })

  it('validates declined status', () => {
    expect(locationDisableRequestStatusSchema.parse('declined')).toBe('declined')
  })

  it('rejects invalid status', () => {
    expect(() => locationDisableRequestStatusSchema.parse('invalid')).toThrow()
  })
})

describe('locationDisableRequestSchema', () => {
  const baseRequest = {
    id: 'req-123',
    childId: 'child-456',
    familyId: 'family-789',
    reason: null,
    status: 'pending' as const,
    createdAt: new Date(),
    resolvedAt: null,
    resolvedByUid: null,
    responseMessage: null,
  }

  it('validates pending request', () => {
    expect(locationDisableRequestSchema.parse(baseRequest)).toEqual(baseRequest)
  })

  it('validates request with reason', () => {
    const withReason = { ...baseRequest, reason: 'I feel uncomfortable being tracked' }
    expect(locationDisableRequestSchema.parse(withReason)).toEqual(withReason)
  })

  it('validates approved request', () => {
    const approved = {
      ...baseRequest,
      status: 'approved' as const,
      resolvedAt: new Date(),
      resolvedByUid: 'guardian-uid',
      responseMessage: 'We respect your feelings',
    }
    expect(locationDisableRequestSchema.parse(approved)).toEqual(approved)
  })

  it('validates declined request', () => {
    const declined = {
      ...baseRequest,
      status: 'declined' as const,
      resolvedAt: new Date(),
      resolvedByUid: 'guardian-uid',
      responseMessage: "Let's talk about this",
    }
    expect(locationDisableRequestSchema.parse(declined)).toEqual(declined)
  })

  it('rejects reason longer than 500 characters', () => {
    const longReason = { ...baseRequest, reason: 'x'.repeat(501) }
    expect(() => locationDisableRequestSchema.parse(longReason)).toThrow()
  })

  it('rejects empty child ID', () => {
    const invalid = { ...baseRequest, childId: '' }
    expect(() => locationDisableRequestSchema.parse(invalid)).toThrow()
  })
})

describe('requestLocationDisableInputSchema', () => {
  it('validates input without reason', () => {
    const input = { familyId: 'family-123' }
    expect(requestLocationDisableInputSchema.parse(input)).toEqual(input)
  })

  it('validates input with reason', () => {
    const input = { familyId: 'family-123', reason: 'I want privacy' }
    expect(requestLocationDisableInputSchema.parse(input)).toEqual(input)
  })

  it('rejects empty family ID', () => {
    expect(() => requestLocationDisableInputSchema.parse({ familyId: '' })).toThrow()
  })
})

describe('getChildLocationStatusInputSchema', () => {
  it('validates complete input', () => {
    const input = { familyId: 'family-123', childId: 'child-456' }
    expect(getChildLocationStatusInputSchema.parse(input)).toEqual(input)
  })

  it('rejects missing child ID', () => {
    expect(() => getChildLocationStatusInputSchema.parse({ familyId: 'family-123' })).toThrow()
  })
})

describe('getChildLocationHistoryInputSchema', () => {
  it('validates input with defaults', () => {
    const input = { familyId: 'family-123', childId: 'child-456' }
    const parsed = getChildLocationHistoryInputSchema.parse(input)
    expect(parsed.page).toBe(1)
    expect(parsed.pageSize).toBe(20)
  })

  it('validates input with custom pagination', () => {
    const input = { familyId: 'family-123', childId: 'child-456', page: 3, pageSize: 10 }
    expect(getChildLocationHistoryInputSchema.parse(input)).toEqual(input)
  })

  it('rejects page size over 50', () => {
    const input = { familyId: 'family-123', childId: 'child-456', pageSize: 51 }
    expect(() => getChildLocationHistoryInputSchema.parse(input)).toThrow()
  })

  it('rejects page 0', () => {
    const input = { familyId: 'family-123', childId: 'child-456', page: 0 }
    expect(() => getChildLocationHistoryInputSchema.parse(input)).toThrow()
  })
})

describe('childLocationHistoryItemSchema', () => {
  it('validates complete history item', () => {
    const item = {
      id: 'transition-123',
      fromZoneName: 'Home',
      toZoneName: 'School',
      detectedAt: new Date(),
      durationMinutes: 45,
      timeDescription: '2 hours ago',
    }
    expect(childLocationHistoryItemSchema.parse(item)).toEqual(item)
  })

  it('validates first transition (null from)', () => {
    const item = {
      id: 'transition-123',
      fromZoneName: null,
      toZoneName: 'Home',
      detectedAt: new Date(),
      durationMinutes: null,
      timeDescription: 'yesterday',
    }
    expect(childLocationHistoryItemSchema.parse(item)).toEqual(item)
  })

  it('validates unknown location transition (null to)', () => {
    const item = {
      id: 'transition-123',
      fromZoneName: 'School',
      toZoneName: null,
      detectedAt: new Date(),
      durationMinutes: 120,
      timeDescription: '3 days ago',
    }
    expect(childLocationHistoryItemSchema.parse(item)).toEqual(item)
  })
})

describe('getChildLocationHistoryResponseSchema', () => {
  it('validates complete response', () => {
    const response = {
      history: [
        {
          id: 'transition-1',
          fromZoneName: 'Home',
          toZoneName: 'School',
          detectedAt: new Date(),
          durationMinutes: 30,
          timeDescription: '2 hours ago',
        },
      ],
      totalCount: 1,
      page: 1,
      pageSize: 20,
      hasMore: false,
      transparencyNote: 'This is the same history your parents see.',
    }
    expect(getChildLocationHistoryResponseSchema.parse(response)).toEqual(response)
  })

  it('validates empty history', () => {
    const response = {
      history: [],
      totalCount: 0,
      page: 1,
      pageSize: 20,
      hasMore: false,
      transparencyNote: 'No location history yet.',
    }
    expect(getChildLocationHistoryResponseSchema.parse(response)).toEqual(response)
  })
})

describe('LOCATION_PRIVACY_MESSAGES', () => {
  it('has whatWeCollect message', () => {
    expect(LOCATION_PRIVACY_MESSAGES.whatWeCollect).toContain("zone you're in")
    expect(LOCATION_PRIVACY_MESSAGES.whatWeCollect).toContain("don't track every step")
  })

  it('has whoCanSee message', () => {
    expect(LOCATION_PRIVACY_MESSAGES.whoCanSee).toContain('Only your family')
    expect(LOCATION_PRIVACY_MESSAGES.whoCanSee).toContain('never share')
  })

  it('has atEighteen message', () => {
    expect(LOCATION_PRIVACY_MESSAGES.atEighteen).toContain('turn 18')
    expect(LOCATION_PRIVACY_MESSAGES.atEighteen).toContain('deleted')
  })

  it('has yourRights message', () => {
    expect(LOCATION_PRIVACY_MESSAGES.yourRights).toContain('uncomfortable')
    expect(LOCATION_PRIVACY_MESSAGES.yourRights).toContain('ask your parents')
  })

  it('formats currentLocation correctly', () => {
    expect(LOCATION_PRIVACY_MESSAGES.currentLocation('Home', 'Mom')).toBe("At: Home (Mom's)")
    expect(LOCATION_PRIVACY_MESSAGES.currentLocation('School', 'Dad')).toBe("At: School (Dad's)")
  })

  it('has unknownLocation message', () => {
    expect(LOCATION_PRIVACY_MESSAGES.unknownLocation).toContain('not sure')
  })

  it('has locationOff message', () => {
    expect(LOCATION_PRIVACY_MESSAGES.locationOff).toContain('turned off')
  })
})

describe('LOCATION_DISABLE_REQUEST_MESSAGES', () => {
  it('formats requestReceived correctly', () => {
    const message = LOCATION_DISABLE_REQUEST_MESSAGES.requestReceived('Emma')
    expect(message).toContain('Emma')
    expect(message).toContain('asked for location features')
  })

  it('formats withReason correctly', () => {
    const message = LOCATION_DISABLE_REQUEST_MESSAGES.withReason('Emma', 'I want more privacy')
    expect(message).toContain('Emma')
    expect(message).toContain('I want more privacy')
  })

  it('formats reminder correctly', () => {
    const message = LOCATION_DISABLE_REQUEST_MESSAGES.reminder('Emma')
    expect(message).toContain('Reminder')
    expect(message).toContain('Emma')
  })
})

describe('formatTimeDescription', () => {
  it('returns just now for less than 1 minute', () => {
    const now = new Date()
    expect(formatTimeDescription(now)).toBe('just now')
  })

  it('returns minutes ago for less than 1 hour', () => {
    const date = new Date(Date.now() - 30 * 60 * 1000)
    expect(formatTimeDescription(date)).toBe('30 minutes ago')
  })

  it('handles singular minute', () => {
    const date = new Date(Date.now() - 1 * 60 * 1000)
    expect(formatTimeDescription(date)).toBe('1 minute ago')
  })

  it('returns hours ago for less than 24 hours', () => {
    const date = new Date(Date.now() - 5 * 60 * 60 * 1000)
    expect(formatTimeDescription(date)).toBe('5 hours ago')
  })

  it('handles singular hour', () => {
    const date = new Date(Date.now() - 1 * 60 * 60 * 1000)
    expect(formatTimeDescription(date)).toBe('1 hour ago')
  })

  it('returns yesterday for 1 day ago', () => {
    const date = new Date(Date.now() - 24 * 60 * 60 * 1000)
    expect(formatTimeDescription(date)).toBe('yesterday')
  })

  it('returns days ago for less than 7 days', () => {
    const date = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    expect(formatTimeDescription(date)).toBe('3 days ago')
  })

  it('returns formatted date for 7+ days', () => {
    const date = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    const result = formatTimeDescription(date)
    // Should contain month and day (e.g., "Dec 24")
    expect(result).toMatch(/[A-Z][a-z]{2} \d{1,2}/)
  })
})

describe('calculateDurationMinutes', () => {
  it('calculates duration correctly', () => {
    const start = new Date('2024-01-01T10:00:00Z')
    const end = new Date('2024-01-01T10:45:00Z')
    expect(calculateDurationMinutes(start, end)).toBe(45)
  })

  it('returns 0 for same time', () => {
    const date = new Date()
    expect(calculateDurationMinutes(date, date)).toBe(0)
  })

  it('calculates hours as minutes', () => {
    const start = new Date('2024-01-01T10:00:00Z')
    const end = new Date('2024-01-01T12:30:00Z')
    expect(calculateDurationMinutes(start, end)).toBe(150)
  })

  it('floors partial minutes', () => {
    const start = new Date('2024-01-01T10:00:00Z')
    const end = new Date('2024-01-01T10:00:45Z') // 45 seconds
    expect(calculateDurationMinutes(start, end)).toBe(0)
  })
})
