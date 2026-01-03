/**
 * Tests for Device Sync Notification Schemas
 *
 * Story 41.4: Device Sync Status Notifications
 */

import { describe, it, expect } from 'vitest'
import {
  syncThresholdHoursSchema,
  DEFAULT_SYNC_THRESHOLD_HOURS,
  deviceSyncNotificationTypeSchema,
  deviceSyncNotificationEventSchema,
  deviceSyncNotificationContentSchema,
  deviceNotificationStatusSchema,
  buildSyncTimeoutContent,
  buildPermissionRevokedContent,
  buildSyncRestoredContent,
  buildDetailedSyncTimeoutContent,
  type SyncTimeoutParams,
  type PermissionRevokedParams,
  type SyncRestoredParams,
} from './deviceSyncNotifications'

describe('syncThresholdHoursSchema', () => {
  it('accepts valid threshold values', () => {
    expect(syncThresholdHoursSchema.safeParse(1).success).toBe(true)
    expect(syncThresholdHoursSchema.safeParse(4).success).toBe(true)
    expect(syncThresholdHoursSchema.safeParse(12).success).toBe(true)
    expect(syncThresholdHoursSchema.safeParse(24).success).toBe(true)
  })

  it('rejects invalid threshold values', () => {
    expect(syncThresholdHoursSchema.safeParse(2).success).toBe(false)
    expect(syncThresholdHoursSchema.safeParse(6).success).toBe(false)
    expect(syncThresholdHoursSchema.safeParse(0).success).toBe(false)
    expect(syncThresholdHoursSchema.safeParse(-1).success).toBe(false)
    expect(syncThresholdHoursSchema.safeParse('4').success).toBe(false)
  })

  it('has default threshold of 4 hours', () => {
    expect(DEFAULT_SYNC_THRESHOLD_HOURS).toBe(4)
  })
})

describe('deviceSyncNotificationTypeSchema', () => {
  it('accepts valid notification types', () => {
    expect(deviceSyncNotificationTypeSchema.safeParse('sync_timeout').success).toBe(true)
    expect(deviceSyncNotificationTypeSchema.safeParse('permission_revoked').success).toBe(true)
    expect(deviceSyncNotificationTypeSchema.safeParse('sync_restored').success).toBe(true)
  })

  it('rejects invalid notification types', () => {
    expect(deviceSyncNotificationTypeSchema.safeParse('invalid').success).toBe(false)
    expect(deviceSyncNotificationTypeSchema.safeParse('').success).toBe(false)
    expect(deviceSyncNotificationTypeSchema.safeParse(123).success).toBe(false)
  })
})

describe('deviceSyncNotificationEventSchema', () => {
  const validEvent = {
    id: 'notif-123',
    type: 'sync_timeout' as const,
    deviceId: 'device-456',
    deviceName: 'Chromebook',
    familyId: 'family-789',
    childId: 'child-101',
    lastSyncAt: Date.now() - 4 * 60 * 60 * 1000,
    thresholdHours: 4 as const,
    createdAt: Date.now(),
  }

  it('accepts valid event', () => {
    const result = deviceSyncNotificationEventSchema.safeParse(validEvent)
    expect(result.success).toBe(true)
  })

  it('accepts event without optional thresholdHours', () => {
    const { thresholdHours: _thresholdHours, ...eventWithoutThreshold } = validEvent
    const result = deviceSyncNotificationEventSchema.safeParse(eventWithoutThreshold)
    expect(result.success).toBe(true)
  })

  it('rejects event with missing required fields', () => {
    const { deviceName: _deviceName, ...incomplete } = validEvent
    const result = deviceSyncNotificationEventSchema.safeParse(incomplete)
    expect(result.success).toBe(false)
  })

  it('rejects event with invalid type', () => {
    const result = deviceSyncNotificationEventSchema.safeParse({
      ...validEvent,
      type: 'invalid_type',
    })
    expect(result.success).toBe(false)
  })
})

describe('deviceSyncNotificationContentSchema', () => {
  const validContent = {
    title: 'Device Sync Issue',
    body: "Chromebook hasn't synced in 4 hours",
    data: {
      type: 'sync_timeout' as const,
      deviceId: 'device-456',
      familyId: 'family-789',
      childId: 'child-101',
      action: 'view_device' as const,
    },
  }

  it('accepts valid content', () => {
    const result = deviceSyncNotificationContentSchema.safeParse(validContent)
    expect(result.success).toBe(true)
  })

  it('rejects content with invalid action', () => {
    const result = deviceSyncNotificationContentSchema.safeParse({
      ...validContent,
      data: { ...validContent.data, action: 'invalid_action' },
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid action types', () => {
    for (const action of ['view_device', 'check_permissions', 'dismiss'] as const) {
      const result = deviceSyncNotificationContentSchema.safeParse({
        ...validContent,
        data: { ...validContent.data, action },
      })
      expect(result.success).toBe(true)
    }
  })
})

describe('deviceNotificationStatusSchema', () => {
  const validStatus = {
    deviceId: 'device-456',
    isOffline: true,
    updatedAt: Date.now(),
  }

  it('accepts valid status with minimal fields', () => {
    const result = deviceNotificationStatusSchema.safeParse(validStatus)
    expect(result.success).toBe(true)
  })

  it('accepts status with all optional fields', () => {
    const fullStatus = {
      ...validStatus,
      lastSyncTimeoutNotifiedAt: Date.now() - 1000,
      lastSyncTimeoutThreshold: 4 as const,
      lastPermissionRevokedNotifiedAt: Date.now() - 2000,
      lastSyncRestoredNotifiedAt: Date.now() - 500,
    }
    const result = deviceNotificationStatusSchema.safeParse(fullStatus)
    expect(result.success).toBe(true)
  })

  it('rejects status with missing required fields', () => {
    const { isOffline: _isOffline, ...incomplete } = validStatus
    const result = deviceNotificationStatusSchema.safeParse(incomplete)
    expect(result.success).toBe(false)
  })
})

describe('buildSyncTimeoutContent', () => {
  const params: SyncTimeoutParams = {
    deviceId: 'device-456',
    deviceName: 'Chromebook',
    familyId: 'family-789',
    childId: 'child-101',
    lastSyncAt: Date.now() - 4 * 60 * 60 * 1000,
    thresholdHours: 4,
  }

  it('builds correct notification content', () => {
    const content = buildSyncTimeoutContent(params)

    expect(content.title).toBe('Device Sync Issue')
    expect(content.body).toContain('Chromebook')
    expect(content.body).toContain('4 hours')
    expect(content.data.type).toBe('sync_timeout')
    expect(content.data.deviceId).toBe('device-456')
    expect(content.data.action).toBe('view_device')
  })

  it('formats 1 hour correctly', () => {
    const content = buildSyncTimeoutContent({ ...params, thresholdHours: 1 })
    expect(content.body).toContain('1 hour')
    expect(content.body).not.toContain('1 hours')
  })

  it('formats multiple hours correctly', () => {
    const content = buildSyncTimeoutContent({ ...params, thresholdHours: 12 })
    expect(content.body).toContain('12 hours')
  })
})

describe('buildPermissionRevokedContent', () => {
  const params: PermissionRevokedParams = {
    deviceId: 'device-456',
    deviceName: 'Chromebook',
    familyId: 'family-789',
    childId: 'child-101',
  }

  it('builds correct notification content', () => {
    const content = buildPermissionRevokedContent(params)

    expect(content.title).toBe('Extension Permissions Changed')
    expect(content.body).toContain('Chromebook')
    expect(content.body).toContain('permissions')
    expect(content.data.type).toBe('permission_revoked')
    expect(content.data.action).toBe('check_permissions')
  })
})

describe('buildSyncRestoredContent', () => {
  const params: SyncRestoredParams = {
    deviceId: 'device-456',
    deviceName: 'Chromebook',
    familyId: 'family-789',
    childId: 'child-101',
  }

  it('builds correct notification content', () => {
    const content = buildSyncRestoredContent(params)

    expect(content.title).toBe('Device Back Online')
    expect(content.body).toContain('Chromebook')
    expect(content.body).toContain('syncing again')
    expect(content.data.type).toBe('sync_restored')
    expect(content.data.action).toBe('dismiss')
  })
})

describe('buildDetailedSyncTimeoutContent', () => {
  it('includes time since last sync in body', () => {
    const params: SyncTimeoutParams = {
      deviceId: 'device-456',
      deviceName: 'Chromebook',
      familyId: 'family-789',
      childId: 'child-101',
      lastSyncAt: Date.now() - 5 * 60 * 60 * 1000, // 5 hours ago
      thresholdHours: 4,
    }

    const content = buildDetailedSyncTimeoutContent(params)

    expect(content.title).toBe('Device Sync Issue')
    expect(content.body).toContain('Chromebook')
    expect(content.body).toContain('5 hours')
    expect(content.body).toContain('troubleshoot')
  })

  it('formats days correctly', () => {
    const params: SyncTimeoutParams = {
      deviceId: 'device-456',
      deviceName: 'Chromebook',
      familyId: 'family-789',
      childId: 'child-101',
      lastSyncAt: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
      thresholdHours: 24,
    }

    const content = buildDetailedSyncTimeoutContent(params)
    expect(content.body).toContain('2 days')
  })

  it('formats 1 day correctly', () => {
    const params: SyncTimeoutParams = {
      deviceId: 'device-456',
      deviceName: 'Chromebook',
      familyId: 'family-789',
      childId: 'child-101',
      lastSyncAt: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
      thresholdHours: 24,
    }

    const content = buildDetailedSyncTimeoutContent(params)
    expect(content.body).toContain('1 day')
    expect(content.body).not.toContain('1 days')
  })
})
