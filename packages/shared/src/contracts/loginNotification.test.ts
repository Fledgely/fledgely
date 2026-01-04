/**
 * Tests for login notification schemas.
 *
 * Story 41.5: New Login Notifications - AC1, AC3
 */

import { describe, it, expect } from 'vitest'
import {
  loginNotificationActionSchema,
  loginNotificationEventSchema,
  loginNotificationContentSchema,
  loginNotificationStatusSchema,
  buildLoginNotificationContent,
  buildSuspiciousLoginContent,
  DEFAULT_LOGIN_NOTIFICATION_STATUS,
  type LoginNotificationParams,
} from './loginNotification'

describe('loginNotificationActionSchema', () => {
  it('accepts valid actions', () => {
    expect(loginNotificationActionSchema.parse('review_sessions')).toBe('review_sessions')
    expect(loginNotificationActionSchema.parse('dismiss')).toBe('dismiss')
  })

  it('rejects invalid actions', () => {
    expect(() => loginNotificationActionSchema.parse('invalid')).toThrow()
    expect(() => loginNotificationActionSchema.parse('')).toThrow()
  })
})

describe('loginNotificationEventSchema', () => {
  const validEvent = {
    id: 'notif-123',
    type: 'new_login' as const,
    userId: 'user-456',
    userDisplayName: 'John Doe',
    familyId: 'family-789',
    sessionId: 'session-abc',
    deviceType: 'desktop',
    browser: 'Chrome',
    approximateLocation: 'San Francisco, CA',
    isFleeingMode: false,
    createdAt: Date.now(),
  }

  it('accepts valid event with location', () => {
    const result = loginNotificationEventSchema.parse(validEvent)
    expect(result.id).toBe('notif-123')
    expect(result.type).toBe('new_login')
    expect(result.approximateLocation).toBe('San Francisco, CA')
    expect(result.isFleeingMode).toBe(false)
  })

  it('accepts event with null location (fleeing mode)', () => {
    const event = { ...validEvent, approximateLocation: null, isFleeingMode: true }
    const result = loginNotificationEventSchema.parse(event)
    expect(result.approximateLocation).toBeNull()
    expect(result.isFleeingMode).toBe(true)
  })

  it('rejects event with missing required fields', () => {
    const { userId: _userId, ...incomplete } = validEvent
    expect(() => loginNotificationEventSchema.parse(incomplete)).toThrow()
  })

  it('rejects event with wrong type', () => {
    expect(() =>
      loginNotificationEventSchema.parse({ ...validEvent, type: 'wrong_type' })
    ).toThrow()
  })
})

describe('loginNotificationContentSchema', () => {
  const validContent = {
    title: 'New Login Detected',
    body: 'New login from Chrome on computer near San Francisco',
    data: {
      type: 'new_login' as const,
      sessionId: 'session-123',
      familyId: 'family-456',
      userId: 'user-789',
      action: 'review_sessions' as const,
    },
  }

  it('accepts valid content', () => {
    const result = loginNotificationContentSchema.parse(validContent)
    expect(result.title).toBe('New Login Detected')
    expect(result.data.type).toBe('new_login')
    expect(result.data.action).toBe('review_sessions')
  })

  it('rejects content with invalid action', () => {
    expect(() =>
      loginNotificationContentSchema.parse({
        ...validContent,
        data: { ...validContent.data, action: 'invalid_action' },
      })
    ).toThrow()
  })

  it('rejects content with missing sessionId', () => {
    const { sessionId: _sessionId, ...incompleteData } = validContent.data
    expect(() =>
      loginNotificationContentSchema.parse({
        ...validContent,
        data: incompleteData,
      })
    ).toThrow()
  })
})

describe('buildLoginNotificationContent', () => {
  const baseParams: LoginNotificationParams = {
    sessionId: 'session-123',
    familyId: 'family-456',
    userId: 'user-789',
    userDisplayName: 'John Doe',
    deviceType: 'desktop',
    browser: 'Chrome',
    approximateLocation: 'San Francisco, CA',
    isFleeingMode: false,
  }

  it('builds content for desktop with location (AC1)', () => {
    const content = buildLoginNotificationContent(baseParams)
    expect(content.title).toBe('New Login Detected')
    expect(content.body).toContain('Chrome')
    expect(content.body).toContain('computer')
    expect(content.body).toContain('San Francisco')
    expect(content.body).toContain('John Doe')
    expect(content.data.action).toBe('review_sessions')
  })

  it('builds content for mobile device', () => {
    const params = { ...baseParams, deviceType: 'mobile' as const }
    const content = buildLoginNotificationContent(params)
    expect(content.body).toContain('phone')
  })

  it('builds content for tablet device', () => {
    const params = { ...baseParams, deviceType: 'tablet' as const }
    const content = buildLoginNotificationContent(params)
    expect(content.body).toContain('tablet')
  })

  it('builds content for unknown device', () => {
    const params = { ...baseParams, deviceType: 'unknown' as const }
    const content = buildLoginNotificationContent(params)
    expect(content.body).toContain('device')
  })

  it('omits location when null', () => {
    const params = { ...baseParams, approximateLocation: null }
    const content = buildLoginNotificationContent(params)
    expect(content.body).not.toContain('near')
    expect(content.body).not.toContain('San Francisco')
  })

  it('omits location during fleeing mode (AC3/FR160)', () => {
    const params = { ...baseParams, isFleeingMode: true }
    const content = buildLoginNotificationContent(params)
    expect(content.body).not.toContain('San Francisco')
    expect(content.body).not.toContain('near')
    expect(content.body).toContain('Chrome')
    expect(content.body).toContain('computer')
  })

  it('includes correct data payload', () => {
    const content = buildLoginNotificationContent(baseParams)
    expect(content.data.type).toBe('new_login')
    expect(content.data.sessionId).toBe('session-123')
    expect(content.data.familyId).toBe('family-456')
    expect(content.data.userId).toBe('user-789')
  })
})

describe('buildSuspiciousLoginContent', () => {
  const baseParams: LoginNotificationParams = {
    sessionId: 'session-123',
    familyId: 'family-456',
    userId: 'user-789',
    userDisplayName: 'Jane Doe',
    deviceType: 'mobile',
    browser: 'Safari',
    approximateLocation: 'New York, NY',
    isFleeingMode: false,
  }

  it('builds suspicious login content with emphasis', () => {
    const content = buildSuspiciousLoginContent(baseParams)
    expect(content.title).toContain('🔔')
    expect(content.body).toContain("Wasn't you?")
    expect(content.body).toContain('Tap to review')
  })

  it('includes base login info', () => {
    const content = buildSuspiciousLoginContent(baseParams)
    expect(content.body).toContain('Safari')
    expect(content.body).toContain('phone')
    expect(content.body).toContain('New York')
  })

  it('respects fleeing mode (AC3/FR160)', () => {
    const params = { ...baseParams, isFleeingMode: true }
    const content = buildSuspiciousLoginContent(params)
    expect(content.body).not.toContain('New York')
    expect(content.body).toContain("Wasn't you?")
  })
})

describe('loginNotificationStatusSchema', () => {
  const validStatus = {
    userId: 'user-123',
    lastNotificationSentAt: Date.now(),
    lastNotifiedSessionId: 'session-456',
    lastNotifiedFingerprintId: 'fp-789',
    updatedAt: Date.now(),
  }

  it('accepts valid status', () => {
    const result = loginNotificationStatusSchema.parse(validStatus)
    expect(result.userId).toBe('user-123')
    expect(result.lastNotifiedSessionId).toBe('session-456')
  })

  it('accepts status with null values', () => {
    const status = {
      ...validStatus,
      lastNotificationSentAt: null,
      lastNotifiedSessionId: null,
      lastNotifiedFingerprintId: null,
    }
    const result = loginNotificationStatusSchema.parse(status)
    expect(result.lastNotificationSentAt).toBeNull()
    expect(result.lastNotifiedSessionId).toBeNull()
  })

  it('rejects status with missing userId', () => {
    const { userId: _userId, ...incomplete } = validStatus
    expect(() => loginNotificationStatusSchema.parse(incomplete)).toThrow()
  })
})

describe('DEFAULT_LOGIN_NOTIFICATION_STATUS', () => {
  it('has correct default values', () => {
    expect(DEFAULT_LOGIN_NOTIFICATION_STATUS.userId).toBe('')
    expect(DEFAULT_LOGIN_NOTIFICATION_STATUS.lastNotificationSentAt).toBeNull()
    expect(DEFAULT_LOGIN_NOTIFICATION_STATUS.lastNotifiedSessionId).toBeNull()
    expect(DEFAULT_LOGIN_NOTIFICATION_STATUS.lastNotifiedFingerprintId).toBeNull()
    expect(typeof DEFAULT_LOGIN_NOTIFICATION_STATUS.updatedAt).toBe('number')
  })
})
