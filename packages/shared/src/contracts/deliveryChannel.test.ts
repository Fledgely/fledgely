/**
 * Tests for delivery channel schemas.
 *
 * Story 41.6: Notification Delivery Channels - AC4, AC7
 */

import { describe, it, expect } from 'vitest'
import {
  deliveryChannelTypeSchema,
  deliveryStatusSchema,
  notificationTypeSchema,
  channelSettingsSchema,
  lockedChannelSettingsSchema,
  notificationChannelPreferencesSchema,
  deliveryLogSchema,
  emailUnsubscribeTokenSchema,
  updateChannelPreferencesInputSchema,
  channelPreferencesOutputSchema,
  handleUnsubscribeInputSchema,
  handleUnsubscribeOutputSchema,
  notificationContentSchema,
  notificationPrioritySchema,
  deliverNotificationInputSchema,
  channelDeliveryResultSchema,
  deliveryResultSchema,
  isSecurityNotificationType,
  getDefaultChannels,
  defaultChannelPreferences,
  securityNotificationTypes,
} from './deliveryChannel'

describe('deliveryChannelTypeSchema', () => {
  it('accepts valid channel types', () => {
    expect(deliveryChannelTypeSchema.parse('push')).toBe('push')
    expect(deliveryChannelTypeSchema.parse('email')).toBe('email')
    expect(deliveryChannelTypeSchema.parse('sms')).toBe('sms')
  })

  it('rejects invalid channel types', () => {
    expect(() => deliveryChannelTypeSchema.parse('invalid')).toThrow()
    expect(() => deliveryChannelTypeSchema.parse('')).toThrow()
  })
})

describe('deliveryStatusSchema', () => {
  it('accepts valid status types', () => {
    expect(deliveryStatusSchema.parse('sent')).toBe('sent')
    expect(deliveryStatusSchema.parse('delivered')).toBe('delivered')
    expect(deliveryStatusSchema.parse('failed')).toBe('failed')
    expect(deliveryStatusSchema.parse('fallback')).toBe('fallback')
  })

  it('rejects invalid status types', () => {
    expect(() => deliveryStatusSchema.parse('pending')).toThrow()
  })
})

describe('notificationTypeSchema', () => {
  it('accepts valid notification types', () => {
    expect(notificationTypeSchema.parse('criticalFlags')).toBe('criticalFlags')
    expect(notificationTypeSchema.parse('timeLimitWarnings')).toBe('timeLimitWarnings')
    expect(notificationTypeSchema.parse('deviceSyncAlerts')).toBe('deviceSyncAlerts')
    expect(notificationTypeSchema.parse('loginAlerts')).toBe('loginAlerts')
    expect(notificationTypeSchema.parse('flagDigest')).toBe('flagDigest')
  })

  it('rejects invalid notification types', () => {
    expect(() => notificationTypeSchema.parse('unknown')).toThrow()
  })
})

describe('channelSettingsSchema', () => {
  it('accepts valid channel settings', () => {
    const result = channelSettingsSchema.parse({
      push: true,
      email: false,
      sms: true,
    })
    expect(result.push).toBe(true)
    expect(result.email).toBe(false)
    expect(result.sms).toBe(true)
  })

  it('applies default for sms', () => {
    const result = channelSettingsSchema.parse({
      push: true,
      email: true,
    })
    expect(result.sms).toBe(false)
  })

  it('rejects missing required fields', () => {
    expect(() => channelSettingsSchema.parse({ push: true })).toThrow()
  })
})

describe('lockedChannelSettingsSchema', () => {
  it('accepts locked settings with both true', () => {
    const result = lockedChannelSettingsSchema.parse({
      push: true,
      email: true,
    })
    expect(result.push).toBe(true)
    expect(result.email).toBe(true)
  })

  it('rejects push = false', () => {
    expect(() =>
      lockedChannelSettingsSchema.parse({
        push: false,
        email: true,
      })
    ).toThrow()
  })

  it('rejects email = false', () => {
    expect(() =>
      lockedChannelSettingsSchema.parse({
        push: true,
        email: false,
      })
    ).toThrow()
  })
})

describe('notificationChannelPreferencesSchema', () => {
  it('accepts complete preferences', () => {
    const result = notificationChannelPreferencesSchema.parse({
      criticalFlags: { push: true, email: true, sms: true },
      timeLimitWarnings: { push: true, email: false },
      deviceSyncAlerts: { push: true, email: false },
      loginAlerts: { push: true, email: true },
      flagDigest: { push: false, email: true },
      extensionRequest: { push: true, email: true },
      agreementChange: { push: true, email: true },
      verifiedEmail: 'test@example.com',
      verifiedPhone: '+1234567890',
    })
    expect(result.criticalFlags.sms).toBe(true)
    expect(result.verifiedEmail).toBe('test@example.com')
  })

  it('applies defaults for missing fields', () => {
    const result = notificationChannelPreferencesSchema.parse({})
    expect(result.criticalFlags.push).toBe(true)
    expect(result.criticalFlags.email).toBe(true)
    expect(result.criticalFlags.sms).toBe(false)
    expect(result.loginAlerts.push).toBe(true)
    expect(result.loginAlerts.email).toBe(true)
  })

  it('validates email format', () => {
    expect(() =>
      notificationChannelPreferencesSchema.parse({
        verifiedEmail: 'invalid-email',
      })
    ).toThrow()
  })
})

describe('deliveryLogSchema', () => {
  const validLog = {
    id: 'log-123',
    notificationId: 'notif-456',
    userId: 'user-789',
    familyId: 'family-abc',
    notificationType: 'criticalFlags' as const,
    channel: 'push' as const,
    status: 'sent' as const,
    createdAt: Date.now(),
  }

  it('accepts valid delivery log', () => {
    const result = deliveryLogSchema.parse(validLog)
    expect(result.id).toBe('log-123')
    expect(result.status).toBe('sent')
  })

  it('accepts log with optional fields', () => {
    const result = deliveryLogSchema.parse({
      ...validLog,
      failureReason: 'Invalid token',
      fallbackChannel: 'email',
      messageId: 'msg-123',
    })
    expect(result.failureReason).toBe('Invalid token')
    expect(result.fallbackChannel).toBe('email')
  })

  it('rejects log with missing required fields', () => {
    const { userId: _userId, ...incomplete } = validLog
    expect(() => deliveryLogSchema.parse(incomplete)).toThrow()
  })

  it('rejects log with empty id', () => {
    expect(() => deliveryLogSchema.parse({ ...validLog, id: '' })).toThrow()
  })
})

describe('emailUnsubscribeTokenSchema', () => {
  const validToken = {
    userId: 'user-123',
    notificationType: 'flagDigest' as const,
    createdAt: Date.now(),
    expiresAt: Date.now() + 86400000,
  }

  it('accepts valid unsubscribe token', () => {
    const result = emailUnsubscribeTokenSchema.parse(validToken)
    expect(result.userId).toBe('user-123')
    expect(result.notificationType).toBe('flagDigest')
  })

  it('rejects token with empty userId', () => {
    expect(() => emailUnsubscribeTokenSchema.parse({ ...validToken, userId: '' })).toThrow()
  })

  it('rejects token with invalid notification type', () => {
    expect(() =>
      emailUnsubscribeTokenSchema.parse({ ...validToken, notificationType: 'invalid' })
    ).toThrow()
  })
})

describe('updateChannelPreferencesInputSchema', () => {
  it('accepts partial updates', () => {
    const result = updateChannelPreferencesInputSchema.parse({
      criticalFlags: { push: true, email: false, sms: true },
    })
    expect(result.criticalFlags?.email).toBe(false)
    expect(result.timeLimitWarnings).toBeUndefined()
  })

  it('accepts empty input (no changes)', () => {
    const result = updateChannelPreferencesInputSchema.parse({})
    expect(result).toEqual({})
  })

  it('does not include loginAlerts (locked)', () => {
    const input = {
      loginAlerts: { push: false, email: false },
    }
    const result = updateChannelPreferencesInputSchema.parse(input)
    expect(result).not.toHaveProperty('loginAlerts')
  })
})

describe('channelPreferencesOutputSchema', () => {
  it('accepts valid output', () => {
    const result = channelPreferencesOutputSchema.parse({
      success: true,
      preferences: {
        criticalFlags: { push: true, email: true, sms: false },
        timeLimitWarnings: { push: true, email: true },
        deviceSyncAlerts: { push: true },
        loginAlerts: { push: true, email: true },
        flagDigest: { push: true, email: true },
        extensionRequest: { push: true, email: false },
        agreementChange: { push: true, email: true },
      },
    })
    expect(result.success).toBe(true)
  })
})

describe('handleUnsubscribeInputSchema', () => {
  it('accepts valid token input', () => {
    const result = handleUnsubscribeInputSchema.parse({ token: 'jwt-token-here' })
    expect(result.token).toBe('jwt-token-here')
  })

  it('rejects empty token', () => {
    expect(() => handleUnsubscribeInputSchema.parse({ token: '' })).toThrow()
  })
})

describe('handleUnsubscribeOutputSchema', () => {
  it('accepts success output', () => {
    const result = handleUnsubscribeOutputSchema.parse({
      success: true,
      message: 'Unsubscribed successfully',
      notificationType: 'flagDigest',
    })
    expect(result.success).toBe(true)
  })

  it('accepts failure output without notification type', () => {
    const result = handleUnsubscribeOutputSchema.parse({
      success: false,
      message: 'Token expired',
    })
    expect(result.success).toBe(false)
    expect(result.notificationType).toBeUndefined()
  })
})

describe('notificationContentSchema', () => {
  it('accepts valid content', () => {
    const result = notificationContentSchema.parse({
      title: 'Alert',
      body: 'Something happened',
      actionUrl: 'https://app.fledgely.com/dashboard',
      data: { type: 'flag', flagId: '123' },
    })
    expect(result.title).toBe('Alert')
    expect(result.data?.type).toBe('flag')
  })

  it('accepts content without optional fields', () => {
    const result = notificationContentSchema.parse({
      title: 'Alert',
      body: 'Something happened',
    })
    expect(result.actionUrl).toBeUndefined()
  })

  it('rejects empty title', () => {
    expect(() =>
      notificationContentSchema.parse({
        title: '',
        body: 'Something happened',
      })
    ).toThrow()
  })
})

describe('notificationPrioritySchema', () => {
  it('accepts valid priorities', () => {
    expect(notificationPrioritySchema.parse('critical')).toBe('critical')
    expect(notificationPrioritySchema.parse('high')).toBe('high')
    expect(notificationPrioritySchema.parse('normal')).toBe('normal')
  })

  it('rejects invalid priority', () => {
    expect(() => notificationPrioritySchema.parse('low')).toThrow()
  })
})

describe('deliverNotificationInputSchema', () => {
  it('accepts valid delivery input', () => {
    const result = deliverNotificationInputSchema.parse({
      userId: 'user-123',
      familyId: 'family-456',
      notificationType: 'criticalFlags',
      content: {
        title: 'Flag Alert',
        body: 'New flag detected',
      },
      priority: 'critical',
    })
    expect(result.userId).toBe('user-123')
    expect(result.priority).toBe('critical')
  })

  it('applies default priority', () => {
    const result = deliverNotificationInputSchema.parse({
      userId: 'user-123',
      familyId: 'family-456',
      notificationType: 'flagDigest',
      content: {
        title: 'Daily Digest',
        body: '5 flags to review',
      },
    })
    expect(result.priority).toBe('normal')
  })
})

describe('channelDeliveryResultSchema', () => {
  it('accepts success result', () => {
    const result = channelDeliveryResultSchema.parse({
      channel: 'push',
      success: true,
      messageId: 'fcm-msg-123',
    })
    expect(result.success).toBe(true)
    expect(result.messageId).toBe('fcm-msg-123')
  })

  it('accepts failure result', () => {
    const result = channelDeliveryResultSchema.parse({
      channel: 'email',
      success: false,
      failureReason: 'Invalid email address',
    })
    expect(result.success).toBe(false)
    expect(result.failureReason).toBe('Invalid email address')
  })
})

describe('deliveryResultSchema', () => {
  it('accepts complete delivery result', () => {
    const result = deliveryResultSchema.parse({
      notificationId: 'notif-123',
      channels: [
        { channel: 'push', success: false, failureReason: 'No tokens' },
        { channel: 'email', success: true, messageId: 'email-456' },
      ],
      primaryChannel: 'push',
      fallbackUsed: true,
      fallbackChannel: 'email',
      allDelivered: true,
    })
    expect(result.fallbackUsed).toBe(true)
    expect(result.channels).toHaveLength(2)
  })

  it('accepts result without fallback', () => {
    const result = deliveryResultSchema.parse({
      notificationId: 'notif-123',
      channels: [{ channel: 'push', success: true, messageId: 'fcm-123' }],
      primaryChannel: 'push',
      fallbackUsed: false,
      allDelivered: true,
    })
    expect(result.fallbackUsed).toBe(false)
    expect(result.fallbackChannel).toBeUndefined()
  })
})

describe('isSecurityNotificationType', () => {
  it('returns true for login alerts', () => {
    expect(isSecurityNotificationType('loginAlerts')).toBe(true)
  })

  it('returns false for non-security types', () => {
    expect(isSecurityNotificationType('criticalFlags')).toBe(false)
    expect(isSecurityNotificationType('flagDigest')).toBe(false)
    expect(isSecurityNotificationType('timeLimitWarnings')).toBe(false)
  })
})

describe('getDefaultChannels', () => {
  it('returns correct defaults for criticalFlags', () => {
    const defaults = getDefaultChannels('criticalFlags')
    expect(defaults.push).toBe(true)
    expect(defaults.email).toBe(true)
    expect(defaults.sms).toBe(false)
  })

  it('returns correct defaults for deviceSyncAlerts', () => {
    const defaults = getDefaultChannels('deviceSyncAlerts')
    expect(defaults.push).toBe(true)
    expect(defaults.email).toBe(false)
  })

  it('returns correct defaults for loginAlerts', () => {
    const defaults = getDefaultChannels('loginAlerts')
    expect(defaults.push).toBe(true)
    expect(defaults.email).toBe(true)
  })
})

describe('defaultChannelPreferences', () => {
  it('has all notification types', () => {
    expect(defaultChannelPreferences.criticalFlags).toBeDefined()
    expect(defaultChannelPreferences.timeLimitWarnings).toBeDefined()
    expect(defaultChannelPreferences.deviceSyncAlerts).toBeDefined()
    expect(defaultChannelPreferences.loginAlerts).toBeDefined()
    expect(defaultChannelPreferences.flagDigest).toBeDefined()
  })

  it('has login alerts always enabled', () => {
    expect(defaultChannelPreferences.loginAlerts.push).toBe(true)
    expect(defaultChannelPreferences.loginAlerts.email).toBe(true)
  })
})

describe('securityNotificationTypes', () => {
  it('includes loginAlerts', () => {
    expect(securityNotificationTypes).toContain('loginAlerts')
  })

  it('does not include regular notification types', () => {
    expect(securityNotificationTypes).not.toContain('criticalFlags')
    expect(securityNotificationTypes).not.toContain('flagDigest')
  })
})
