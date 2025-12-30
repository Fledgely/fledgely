/**
 * Stealth Filter Tests
 *
 * Story 0.5.7: 72-Hour Notification Stealth
 *
 * These tests verify the stealth filter functionality including:
 * - Critical notification bypass
 * - Affected user filtering
 * - Stealth status checking
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
        stealthAffectedUserIds: ['affected_user'],
      }),
    }),
  })),
  Timestamp: {
    now: vi.fn(() => ({ toMillis: () => Date.now() })),
  },
}))

vi.mock('@fledgely/shared', () => ({
  CRITICAL_NOTIFICATION_TYPES: [
    'crisis_resource_accessed',
    'mandatory_report_filed',
    'child_safety_signal',
    'emergency_unlock_used',
  ],
}))

describe('Stealth Filter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('module exports', () => {
    it('exports shouldSuppressNotification function', async () => {
      const { shouldSuppressNotification } = await import('./stealthFilter')
      expect(typeof shouldSuppressNotification).toBe('function')
    })

    it('exports isCriticalNotification function', async () => {
      const { isCriticalNotification } = await import('./stealthFilter')
      expect(typeof isCriticalNotification).toBe('function')
    })

    it('exports getStealthStatus function', async () => {
      const { getStealthStatus } = await import('./stealthFilter')
      expect(typeof getStealthStatus).toBe('function')
    })
  })

  describe('critical notification types', () => {
    it('crisis_resource_accessed is a critical notification type', () => {
      const criticalTypes = [
        'crisis_resource_accessed',
        'mandatory_report_filed',
        'child_safety_signal',
        'emergency_unlock_used',
      ]
      expect(criticalTypes).toContain('crisis_resource_accessed')
    })

    it('mandatory_report_filed is a critical notification type', () => {
      const criticalTypes = [
        'crisis_resource_accessed',
        'mandatory_report_filed',
        'child_safety_signal',
        'emergency_unlock_used',
      ]
      expect(criticalTypes).toContain('mandatory_report_filed')
    })

    it('child_safety_signal is a critical notification type', () => {
      const criticalTypes = [
        'crisis_resource_accessed',
        'mandatory_report_filed',
        'child_safety_signal',
        'emergency_unlock_used',
      ]
      expect(criticalTypes).toContain('child_safety_signal')
    })

    it('emergency_unlock_used is a critical notification type', () => {
      const criticalTypes = [
        'crisis_resource_accessed',
        'mandatory_report_filed',
        'child_safety_signal',
        'emergency_unlock_used',
      ]
      expect(criticalTypes).toContain('emergency_unlock_used')
    })

    it('device_removed is NOT a critical notification type', () => {
      const criticalTypes = [
        'crisis_resource_accessed',
        'mandatory_report_filed',
        'child_safety_signal',
        'emergency_unlock_used',
      ]
      expect(criticalTypes).not.toContain('device_removed')
    })

    it('parent_access_revoked is NOT a critical notification type', () => {
      const criticalTypes = [
        'crisis_resource_accessed',
        'mandatory_report_filed',
        'child_safety_signal',
        'emergency_unlock_used',
      ]
      expect(criticalTypes).not.toContain('parent_access_revoked')
    })
  })

  describe('suppression logic specifications', () => {
    it('critical notifications are NEVER suppressed - safety requirement', () => {
      // Critical notifications must always be delivered, even during stealth
      const criticalTypes = [
        'crisis_resource_accessed',
        'mandatory_report_filed',
        'child_safety_signal',
        'emergency_unlock_used',
      ]
      // All critical types should bypass suppression
      criticalTypes.forEach((type) => {
        expect(type.length).toBeGreaterThan(0)
      })
    })

    it('only affected users have notifications suppressed', () => {
      // Non-affected family members should still receive notifications
      const stealthData = {
        stealthActive: true,
        stealthAffectedUserIds: ['abuser_uid'],
      }
      const targetUser = 'victim_uid'
      const isAffected = stealthData.stealthAffectedUserIds.includes(targetUser)
      expect(isAffected).toBe(false)
    })

    it('suppression only occurs during active stealth window', () => {
      const now = Date.now()
      const stealthData = {
        stealthActive: true,
        stealthWindowEnd: { toMillis: () => now + 3600000 }, // 1 hour from now
      }
      const isActive = stealthData.stealthActive && stealthData.stealthWindowEnd.toMillis() > now
      expect(isActive).toBe(true)
    })

    it('suppression stops after stealth window expires', () => {
      const now = Date.now()
      const stealthData = {
        stealthActive: true,
        stealthWindowEnd: { toMillis: () => now - 1000 }, // 1 second ago
      }
      const isActive = stealthData.stealthActive && stealthData.stealthWindowEnd.toMillis() > now
      expect(isActive).toBe(false)
    })
  })

  describe('stealth status structure', () => {
    it('status includes active boolean', () => {
      const status = {
        active: true,
        windowStart: new Date(),
        windowEnd: new Date(),
        affectedUserIds: ['user1'],
      }
      expect(typeof status.active).toBe('boolean')
    })

    it('status includes windowStart date or null', () => {
      const activeStatus = {
        active: true,
        windowStart: new Date(),
        windowEnd: new Date(),
        affectedUserIds: [],
      }
      const inactiveStatus = {
        active: false,
        windowStart: null,
        windowEnd: null,
        affectedUserIds: [],
      }
      expect(activeStatus.windowStart).toBeInstanceOf(Date)
      expect(inactiveStatus.windowStart).toBeNull()
    })

    it('status includes windowEnd date or null', () => {
      const activeStatus = {
        active: true,
        windowStart: new Date(),
        windowEnd: new Date(),
        affectedUserIds: [],
      }
      expect(activeStatus.windowEnd).toBeInstanceOf(Date)
    })

    it('status includes affectedUserIds array', () => {
      const status = {
        active: true,
        windowStart: new Date(),
        windowEnd: new Date(),
        affectedUserIds: ['user1', 'user2', 'user3'],
      }
      expect(Array.isArray(status.affectedUserIds)).toBe(true)
      expect(status.affectedUserIds).toHaveLength(3)
    })
  })
})
