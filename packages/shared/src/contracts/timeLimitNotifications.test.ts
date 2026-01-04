/**
 * Tests for Time Limit Notification Schemas
 *
 * Story 41.3: Time Limit Notifications
 */

import { describe, it, expect } from 'vitest'
import {
  timeLimitNotificationEventSchema,
  timeLimitNotificationContentSchema,
  childTimeLimitNotificationPreferencesSchema,
  extensionRequestNotificationParamsSchema,
  timeLimitWarningParamsSchema,
  limitReachedParamsSchema,
  buildParentWarningContent,
  buildParentLimitReachedContent,
  buildExtensionRequestContent,
  buildChildWarningContent,
  buildChildLimitReachedContent,
  formatMinutesShort,
  type TimeLimitNotificationEvent,
  type TimeLimitWarningParams,
  type LimitReachedParams,
  type ExtensionRequestNotificationParams,
} from './timeLimitNotifications'

describe('timeLimitNotificationEventSchema', () => {
  const validEvent: TimeLimitNotificationEvent = {
    id: 'event-123',
    type: 'warning',
    childId: 'child-456',
    childName: 'Emma',
    familyId: 'family-789',
    limitType: 'daily_total',
    currentMinutes: 105,
    allowedMinutes: 120,
    remainingMinutes: 15,
    createdAt: Date.now(),
  }

  it('validates a complete warning event', () => {
    const result = timeLimitNotificationEventSchema.safeParse(validEvent)
    expect(result.success).toBe(true)
  })

  it('validates a limit_reached event', () => {
    const event = { ...validEvent, type: 'limit_reached' as const }
    const result = timeLimitNotificationEventSchema.safeParse(event)
    expect(result.success).toBe(true)
  })

  it('validates an extension_request event', () => {
    const event = {
      ...validEvent,
      type: 'extension_request' as const,
      extensionRequestId: 'req-123',
      extensionMinutesRequested: 30,
      extensionReason: 'Need to finish homework',
    }
    const result = timeLimitNotificationEventSchema.safeParse(event)
    expect(result.success).toBe(true)
  })

  it('validates device-specific event', () => {
    const event = {
      ...validEvent,
      limitType: 'device' as const,
      deviceId: 'device-123',
      deviceName: 'Chromebook',
    }
    const result = timeLimitNotificationEventSchema.safeParse(event)
    expect(result.success).toBe(true)
  })

  it('validates category-specific event', () => {
    const event = {
      ...validEvent,
      limitType: 'category' as const,
      categoryId: 'gaming',
      categoryName: 'Gaming',
    }
    const result = timeLimitNotificationEventSchema.safeParse(event)
    expect(result.success).toBe(true)
  })

  it('rejects invalid notification type', () => {
    const event = { ...validEvent, type: 'invalid' }
    const result = timeLimitNotificationEventSchema.safeParse(event)
    expect(result.success).toBe(false)
  })

  it('rejects invalid limit type', () => {
    const event = { ...validEvent, limitType: 'invalid' }
    const result = timeLimitNotificationEventSchema.safeParse(event)
    expect(result.success).toBe(false)
  })

  it('rejects negative currentMinutes', () => {
    const event = { ...validEvent, currentMinutes: -5 }
    const result = timeLimitNotificationEventSchema.safeParse(event)
    expect(result.success).toBe(false)
  })

  it('rejects zero allowedMinutes', () => {
    const event = { ...validEvent, allowedMinutes: 0 }
    const result = timeLimitNotificationEventSchema.safeParse(event)
    expect(result.success).toBe(false)
  })

  it('rejects missing required fields', () => {
    const event = { id: 'test', type: 'warning' }
    const result = timeLimitNotificationEventSchema.safeParse(event)
    expect(result.success).toBe(false)
  })
})

describe('timeLimitNotificationContentSchema', () => {
  it('validates warning notification content', () => {
    const content = {
      title: 'Screen Time Warning',
      body: "Emma's screen time: 15 minutes remaining",
      data: {
        type: 'time_warning' as const,
        childId: 'child-456',
        familyId: 'family-789',
        limitType: 'daily_total' as const,
        action: 'view_time' as const,
      },
    }
    const result = timeLimitNotificationContentSchema.safeParse(content)
    expect(result.success).toBe(true)
  })

  it('validates extension request content', () => {
    const content = {
      title: 'Time Extension Request',
      body: 'Emma is requesting 30 more minutes',
      data: {
        type: 'extension_request' as const,
        childId: 'child-456',
        familyId: 'family-789',
        extensionRequestId: 'req-123',
        action: 'respond_extension' as const,
      },
    }
    const result = timeLimitNotificationContentSchema.safeParse(content)
    expect(result.success).toBe(true)
  })

  it('rejects empty title', () => {
    const content = {
      title: '',
      body: 'Test body',
      data: {
        type: 'time_warning' as const,
        childId: 'child-456',
        familyId: 'family-789',
        action: 'view_time' as const,
      },
    }
    const result = timeLimitNotificationContentSchema.safeParse(content)
    expect(result.success).toBe(false)
  })
})

describe('childTimeLimitNotificationPreferencesSchema', () => {
  it('validates with defaults', () => {
    const result = childTimeLimitNotificationPreferencesSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.warningNotificationsEnabled).toBe(true)
      expect(result.data.limitReachedNotificationsEnabled).toBe(true)
    }
  })

  it('warningNotificationsEnabled must always be true', () => {
    const result = childTimeLimitNotificationPreferencesSchema.safeParse({
      warningNotificationsEnabled: false,
    })
    expect(result.success).toBe(false)
  })

  it('allows toggling limitReachedNotificationsEnabled', () => {
    const result = childTimeLimitNotificationPreferencesSchema.safeParse({
      limitReachedNotificationsEnabled: false,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limitReachedNotificationsEnabled).toBe(false)
    }
  })
})

describe('extensionRequestNotificationParamsSchema', () => {
  const validParams: ExtensionRequestNotificationParams = {
    requestId: 'req-123',
    childId: 'child-456',
    childName: 'Emma',
    familyId: 'family-789',
    minutesRequested: 30,
    currentMinutes: 120,
    allowedMinutes: 120,
  }

  it('validates complete params', () => {
    const result = extensionRequestNotificationParamsSchema.safeParse(validParams)
    expect(result.success).toBe(true)
  })

  it('validates with optional reason', () => {
    const params = { ...validParams, reason: 'Need to finish homework' }
    const result = extensionRequestNotificationParamsSchema.safeParse(params)
    expect(result.success).toBe(true)
  })

  it('rejects reason over 500 characters', () => {
    const params = { ...validParams, reason: 'a'.repeat(501) }
    const result = extensionRequestNotificationParamsSchema.safeParse(params)
    expect(result.success).toBe(false)
  })

  it('rejects zero minutesRequested', () => {
    const params = { ...validParams, minutesRequested: 0 }
    const result = extensionRequestNotificationParamsSchema.safeParse(params)
    expect(result.success).toBe(false)
  })

  it('rejects minutesRequested over 480 (8 hours)', () => {
    const params = { ...validParams, minutesRequested: 481 }
    const result = extensionRequestNotificationParamsSchema.safeParse(params)
    expect(result.success).toBe(false)
  })
})

describe('timeLimitWarningParamsSchema', () => {
  const validParams: TimeLimitWarningParams = {
    childId: 'child-456',
    childName: 'Emma',
    familyId: 'family-789',
    limitType: 'daily_total',
    currentMinutes: 105,
    allowedMinutes: 120,
    remainingMinutes: 15,
  }

  it('validates daily total warning', () => {
    const result = timeLimitWarningParamsSchema.safeParse(validParams)
    expect(result.success).toBe(true)
  })

  it('validates device warning with device info', () => {
    const params = {
      ...validParams,
      limitType: 'device' as const,
      deviceId: 'device-123',
      deviceName: 'Chromebook',
    }
    const result = timeLimitWarningParamsSchema.safeParse(params)
    expect(result.success).toBe(true)
  })

  it('validates category warning with category info', () => {
    const params = {
      ...validParams,
      limitType: 'category' as const,
      categoryId: 'gaming',
      categoryName: 'Gaming',
    }
    const result = timeLimitWarningParamsSchema.safeParse(params)
    expect(result.success).toBe(true)
  })
})

describe('limitReachedParamsSchema', () => {
  const validParams: LimitReachedParams = {
    childId: 'child-456',
    childName: 'Emma',
    familyId: 'family-789',
    limitType: 'daily_total',
    currentMinutes: 120,
    allowedMinutes: 120,
  }

  it('validates limit reached params', () => {
    const result = limitReachedParamsSchema.safeParse(validParams)
    expect(result.success).toBe(true)
  })
})

describe('buildParentWarningContent', () => {
  const baseParams: TimeLimitWarningParams = {
    childId: 'child-456',
    childName: 'Emma',
    familyId: 'family-789',
    limitType: 'daily_total',
    currentMinutes: 105,
    allowedMinutes: 120,
    remainingMinutes: 15,
  }

  it('builds daily total warning content', () => {
    const content = buildParentWarningContent(baseParams)

    expect(content.title).toBe('Screen Time Warning')
    expect(content.body).toContain('Emma')
    expect(content.body).toContain('15 minutes remaining')
    expect(content.data.type).toBe('time_warning')
    expect(content.data.action).toBe('view_time')
  })

  it('builds device warning content', () => {
    const params = {
      ...baseParams,
      limitType: 'device' as const,
      deviceName: 'Chromebook',
    }
    const content = buildParentWarningContent(params)

    expect(content.body).toContain('on Chromebook')
  })

  it('builds category warning content', () => {
    const params = {
      ...baseParams,
      limitType: 'category' as const,
      categoryName: 'Gaming',
    }
    const content = buildParentWarningContent(params)

    expect(content.body).toContain('for Gaming')
  })
})

describe('buildParentLimitReachedContent', () => {
  const baseParams: LimitReachedParams = {
    childId: 'child-456',
    childName: 'Emma',
    familyId: 'family-789',
    limitType: 'daily_total',
    currentMinutes: 120,
    allowedMinutes: 120,
  }

  it('builds daily limit reached content', () => {
    const content = buildParentLimitReachedContent(baseParams)

    expect(content.title).toBe('Screen Time Limit Reached')
    expect(content.body).toContain('Emma')
    expect(content.body).toContain('daily')
    expect(content.body).toContain('2h used of 2h allowed')
    expect(content.data.type).toBe('limit_reached')
  })

  it('formats mixed hours and minutes correctly', () => {
    const params = { ...baseParams, currentMinutes: 95, allowedMinutes: 90 }
    const content = buildParentLimitReachedContent(params)

    expect(content.body).toContain('1h 35m')
    expect(content.body).toContain('1h 30m')
  })

  it('formats minutes only correctly', () => {
    const params = { ...baseParams, currentMinutes: 45, allowedMinutes: 45 }
    const content = buildParentLimitReachedContent(params)

    expect(content.body).toContain('45m used of 45m allowed')
  })
})

describe('buildExtensionRequestContent', () => {
  const baseParams: ExtensionRequestNotificationParams = {
    requestId: 'req-123',
    childId: 'child-456',
    childName: 'Emma',
    familyId: 'family-789',
    minutesRequested: 30,
    currentMinutes: 120,
    allowedMinutes: 120,
  }

  it('builds extension request content without reason', () => {
    const content = buildExtensionRequestContent(baseParams)

    expect(content.title).toBe('Time Extension Request')
    expect(content.body).toContain('Emma')
    expect(content.body).toContain('30 more minutes')
    expect(content.body).not.toContain('-')
    expect(content.data.type).toBe('extension_request')
    expect(content.data.extensionRequestId).toBe('req-123')
    expect(content.data.action).toBe('respond_extension')
  })

  it('builds extension request content with reason', () => {
    const params = { ...baseParams, reason: 'Need to finish homework' }
    const content = buildExtensionRequestContent(params)

    expect(content.body).toContain('Need to finish homework')
    expect(content.body).toContain('-')
  })
})

describe('buildChildWarningContent', () => {
  it('builds child warning content', () => {
    const content = buildChildWarningContent(15)

    expect(content.title).toBe('Screen Time Reminder')
    expect(content.body).toContain('15 minutes')
  })

  it('handles single minute', () => {
    const content = buildChildWarningContent(1)

    expect(content.body).toContain('1 minutes')
  })
})

describe('buildChildLimitReachedContent', () => {
  it('builds child limit reached content', () => {
    const content = buildChildLimitReachedContent()

    expect(content.title).toBe('Screen Time Done')
    expect(content.body).toContain('complete')
  })
})

describe('formatMinutesShort', () => {
  it('formats hours only', () => {
    expect(formatMinutesShort(120)).toBe('2h')
    expect(formatMinutesShort(60)).toBe('1h')
  })

  it('formats minutes only', () => {
    expect(formatMinutesShort(45)).toBe('45m')
    expect(formatMinutesShort(5)).toBe('5m')
  })

  it('formats hours and minutes', () => {
    expect(formatMinutesShort(90)).toBe('1h 30m')
    expect(formatMinutesShort(125)).toBe('2h 5m')
  })

  it('handles zero', () => {
    expect(formatMinutesShort(0)).toBe('0m')
  })
})
