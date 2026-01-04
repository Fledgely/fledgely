/**
 * Tests for Fleeing Mode Safety Audit Logging
 *
 * Story 41.8: Fleeing Mode Notification Suppression - AC5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock firebase-admin/firestore with hoisted mock functions
const mockSet = vi.fn().mockResolvedValue(undefined)
const mockDoc = vi.fn(() => ({
  id: 'log-123',
  set: mockSet,
}))
const mockInnerCollection = vi.fn(() => ({
  doc: mockDoc,
}))
const mockDocMiddle = vi.fn(() => ({
  collection: mockInnerCollection,
}))
const mockCollection = vi.fn(() => ({
  doc: mockDocMiddle,
}))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: mockCollection,
  })),
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  },
  Timestamp: {
    now: vi.fn(() => ({ toMillis: () => Date.now() })),
  },
}))

// Mock firebase-functions/logger
vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}))

import {
  logFleeingModeSuppression,
  logFleeingModeExpiry,
  isFleeingModeSuppressedType,
  FLEEING_MODE_SUPPRESSED_TYPES,
  _resetDbForTesting,
} from './fleeingModeAudit'

describe('fleeingModeAudit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetDbForTesting()
  })

  describe('logFleeingModeSuppression', () => {
    it('logs suppression to safetyAudit collection', async () => {
      await logFleeingModeSuppression({
        familyId: 'family-123',
        notificationType: 'location_transition',
        eventData: {
          childId: 'child-456',
          deviceId: 'device-789',
          transitionId: 'trans-001',
        },
      })

      expect(mockCollection).toHaveBeenCalledWith('safetyAudit')
      expect(mockDocMiddle).toHaveBeenCalledWith('family-123')
      expect(mockInnerCollection).toHaveBeenCalledWith('fleeingModeLogs')
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'log-123',
          familyId: 'family-123',
          notificationType: 'location_transition',
          eventData: {
            childId: 'child-456',
            deviceId: 'device-789',
            transitionId: 'trans-001',
          },
        })
      )
    })

    it('sanitizes event data to remove sensitive information', async () => {
      await logFleeingModeSuppression({
        familyId: 'family-123',
        notificationType: 'location_transition',
        eventData: {
          childId: 'child-456',
          latitude: 37.7749, // Should be removed
          longitude: -122.4194, // Should be removed
          address: '123 Secret St', // Should be removed
          transitionId: 'trans-001', // Should be kept
        },
      })

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          eventData: {
            childId: 'child-456',
            transitionId: 'trans-001',
            // No latitude, longitude, address
          },
        })
      )
    })

    it('handles errors gracefully without throwing', async () => {
      mockSet.mockRejectedValueOnce(new Error('Database error'))

      // Should not throw
      await expect(
        logFleeingModeSuppression({
          familyId: 'family-123',
          notificationType: 'location_transition',
          eventData: {},
        })
      ).resolves.toBeUndefined()
    })
  })

  describe('logFleeingModeExpiry', () => {
    it('logs expiry event to safetyAudit collection', async () => {
      await logFleeingModeExpiry('family-123')

      expect(mockCollection).toHaveBeenCalledWith('safetyAudit')
      expect(mockDocMiddle).toHaveBeenCalledWith('family-123')
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'log-123',
          familyId: 'family-123',
          eventType: 'fleeing_mode_expired',
          expiryNotificationSent: true,
        })
      )
    })

    it('handles errors gracefully', async () => {
      mockSet.mockRejectedValueOnce(new Error('Database error'))

      // Should not throw
      await expect(logFleeingModeExpiry('family-123')).resolves.toBeUndefined()
    })
  })

  describe('isFleeingModeSuppressedType', () => {
    it('returns true for suppressed notification types', () => {
      expect(isFleeingModeSuppressedType('location_transition')).toBe(true)
      expect(isFleeingModeSuppressedType('geofence_entry')).toBe(true)
      expect(isFleeingModeSuppressedType('geofence_exit')).toBe(true)
      expect(isFleeingModeSuppressedType('location_paused')).toBe(true)
      expect(isFleeingModeSuppressedType('location_disabled')).toBe(true)
      expect(isFleeingModeSuppressedType('location_zone_change')).toBe(true)
    })

    it('returns false for non-location notification types', () => {
      expect(isFleeingModeSuppressedType('flag_created')).toBe(false)
      expect(isFleeingModeSuppressedType('time_limit_warning')).toBe(false)
      expect(isFleeingModeSuppressedType('device_sync')).toBe(false)
      expect(isFleeingModeSuppressedType('login_alert')).toBe(false)
    })
  })

  describe('FLEEING_MODE_SUPPRESSED_TYPES', () => {
    it('includes all location-related notification types', () => {
      expect(FLEEING_MODE_SUPPRESSED_TYPES).toContain('location_transition')
      expect(FLEEING_MODE_SUPPRESSED_TYPES).toContain('geofence_entry')
      expect(FLEEING_MODE_SUPPRESSED_TYPES).toContain('geofence_exit')
      expect(FLEEING_MODE_SUPPRESSED_TYPES).toContain('location_paused')
      expect(FLEEING_MODE_SUPPRESSED_TYPES).toContain('location_disabled')
      expect(FLEEING_MODE_SUPPRESSED_TYPES).toContain('location_zone_change')
    })
  })
})
