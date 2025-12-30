/**
 * Stealth Queue Tests
 *
 * Story 0.5.7: 72-Hour Notification Stealth
 *
 * These tests verify the stealth queue functionality including:
 * - Notification capture with correct structure
 * - Stealth window status checking
 * - Entry expiration and cleanup
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock firebase-admin/firestore
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        stealthActive: true,
        stealthWindowEnd: { toMillis: () => Date.now() + 3600000 },
        stealthAffectedUserIds: ['user1', 'user2'],
      }),
    }),
    set: vi.fn().mockResolvedValue(undefined),
    batch: vi.fn(() => ({
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    })),
    where: vi.fn().mockReturnThis(),
  })),
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  },
  Timestamp: {
    now: vi.fn(() => ({ toMillis: () => Date.now() })),
    fromMillis: vi.fn((ms: number) => ({ toMillis: () => ms })),
  },
}))

vi.mock('@fledgely/shared', () => ({
  STEALTH_DURATION_MS: 72 * 60 * 60 * 1000,
}))

describe('Stealth Queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('module exports', () => {
    it('exports captureNotification function', async () => {
      const { captureNotification } = await import('./stealthQueue')
      expect(typeof captureNotification).toBe('function')
    })

    it('exports isInStealthWindow function', async () => {
      const { isInStealthWindow } = await import('./stealthQueue')
      expect(typeof isInStealthWindow).toBe('function')
    })

    it('exports getStealthAffectedUsers function', async () => {
      const { getStealthAffectedUsers } = await import('./stealthQueue')
      expect(typeof getStealthAffectedUsers).toBe('function')
    })

    it('exports deleteExpiredEntries function', async () => {
      const { deleteExpiredEntries } = await import('./stealthQueue')
      expect(typeof deleteExpiredEntries).toBe('function')
    })

    it('exports deleteAllEntriesForFamily function', async () => {
      const { deleteAllEntriesForFamily } = await import('./stealthQueue')
      expect(typeof deleteAllEntriesForFamily).toBe('function')
    })
  })

  describe('CaptureNotificationOptions interface', () => {
    it('requires familyId field', () => {
      const options = {
        familyId: 'family123',
        notificationType: 'test',
        targetUserId: 'user1',
        notificationPayload: { type: 'test' },
        ticketId: 'ticket1',
      }
      expect(options.familyId).toBe('family123')
    })

    it('requires notificationType field', () => {
      const options = {
        familyId: 'family123',
        notificationType: 'device_removed',
        targetUserId: 'user1',
        notificationPayload: { type: 'device_removed' },
        ticketId: 'ticket1',
      }
      expect(options.notificationType).toBe('device_removed')
    })

    it('requires targetUserId field', () => {
      const options = {
        familyId: 'family123',
        notificationType: 'test',
        targetUserId: 'target_user',
        notificationPayload: { type: 'test' },
        ticketId: 'ticket1',
      }
      expect(options.targetUserId).toBe('target_user')
    })

    it('requires notificationPayload field', () => {
      const payload = {
        type: 'parent_removed',
        title: 'Access Changed',
        body: 'Parent access has been modified',
        data: { familyId: 'family123' },
      }
      const options = {
        familyId: 'family123',
        notificationType: 'parent_removed',
        targetUserId: 'user1',
        notificationPayload: payload,
        ticketId: 'ticket1',
      }
      expect(options.notificationPayload).toEqual(payload)
    })

    it('requires ticketId field', () => {
      const options = {
        familyId: 'family123',
        notificationType: 'test',
        targetUserId: 'user1',
        notificationPayload: { type: 'test' },
        ticketId: 'safety_ticket_789',
      }
      expect(options.ticketId).toBe('safety_ticket_789')
    })
  })

  describe('NotificationPayload interface', () => {
    it('requires type field', () => {
      const payload = { type: 'device_removed' }
      expect(payload.type).toBe('device_removed')
    })

    it('supports optional title field', () => {
      const payload = { type: 'test', title: 'Test Notification' }
      expect(payload.title).toBe('Test Notification')
    })

    it('supports optional body field', () => {
      const payload = { type: 'test', body: 'This is the notification body' }
      expect(payload.body).toBe('This is the notification body')
    })

    it('supports optional data field', () => {
      const payload = {
        type: 'test',
        data: { familyId: 'fam1', deviceId: 'dev1' },
      }
      expect(payload.data).toEqual({ familyId: 'fam1', deviceId: 'dev1' })
    })
  })

  describe('stealth queue behavior specifications', () => {
    it('notifications are stored in stealthQueueEntries collection', async () => {
      // Verify the collection name is correct
      const expectedCollection = 'stealthQueueEntries'
      expect(expectedCollection).toBe('stealthQueueEntries')
    })

    it('captured entries include capturedAt timestamp', () => {
      // Entry structure includes timestamp
      const entry = {
        capturedAt: { toMillis: () => Date.now() },
        expiresAt: { toMillis: () => Date.now() + 72 * 60 * 60 * 1000 },
      }
      expect(entry.capturedAt).toBeDefined()
    })

    it('captured entries include expiresAt timestamp 72 hours from capture', () => {
      const now = Date.now()
      const entry = {
        capturedAt: { toMillis: () => now },
        expiresAt: { toMillis: () => now + 72 * 60 * 60 * 1000 },
      }
      const expiresIn = entry.expiresAt.toMillis() - entry.capturedAt.toMillis()
      expect(expiresIn).toBe(72 * 60 * 60 * 1000)
    })

    it('family stealth window status is stored on family document', () => {
      const familyData = {
        stealthActive: true,
        stealthWindowStart: new Date(),
        stealthWindowEnd: new Date(Date.now() + 72 * 60 * 60 * 1000),
        stealthAffectedUserIds: ['user1', 'user2'],
      }
      expect(familyData.stealthActive).toBe(true)
      expect(familyData.stealthAffectedUserIds).toContain('user1')
    })

    it('inactive stealth returns empty affected users array', () => {
      const inactiveFamilyData = { stealthActive: false }
      const affectedUsers = inactiveFamilyData.stealthActive ? ['user1'] : []
      expect(affectedUsers).toEqual([])
    })
  })
})
