/**
 * Tests for onDeviceStatusChange trigger
 *
 * Story 19A.4: Status Push Notifications (AC: #1, #2)
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { calculateDeviceStatus, _resetDbForTesting } from './onDeviceStatusChange'
import { THRESHOLDS } from '../lib/notifications/statusTypes'

// Mock Firebase Admin
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({ exists: false }),
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: vi.fn().mockResolvedValue({ exists: false }),
          })),
        })),
      })),
    })),
  })),
}))

vi.mock('firebase-admin/messaging', () => ({
  getMessaging: vi.fn(() => ({
    sendEachForMulticast: vi.fn().mockResolvedValue({
      successCount: 0,
      failureCount: 0,
      responses: [],
    }),
  })),
}))

describe('onDeviceStatusChange', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetDbForTesting()
  })

  afterEach(() => {
    _resetDbForTesting()
  })

  describe('calculateDeviceStatus', () => {
    it('should return "good" for undefined data', () => {
      expect(calculateDeviceStatus(undefined)).toBe('good')
    })

    it('should return "action" for unenrolled device', () => {
      expect(
        calculateDeviceStatus({
          status: 'unenrolled',
        })
      ).toBe('action')
    })

    it('should return "action" for device offline > 24 hours', () => {
      const lastSyncTimestamp = {
        toDate: () => new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
      }

      expect(
        calculateDeviceStatus({
          status: 'offline',
          lastSyncTimestamp: lastSyncTimestamp as FirebaseFirestore.Timestamp,
        })
      ).toBe('action')
    })

    it('should return "attention" for device offline < 24 hours', () => {
      const lastSyncTimestamp = {
        toDate: () => new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      }

      expect(
        calculateDeviceStatus({
          status: 'offline',
          lastSyncTimestamp: lastSyncTimestamp as FirebaseFirestore.Timestamp,
        })
      ).toBe('attention')
    })

    it('should return "attention" for sync delay > 60 minutes', () => {
      const lastHealthSync = {
        toDate: () => new Date(Date.now() - 90 * 60 * 1000), // 90 minutes ago
      }

      expect(
        calculateDeviceStatus({
          status: 'active',
          healthMetrics: {
            lastHealthSync: lastHealthSync as FirebaseFirestore.Timestamp,
          },
        })
      ).toBe('attention')
    })

    it('should return "attention" for low battery < 20%', () => {
      expect(
        calculateDeviceStatus({
          status: 'active',
          healthMetrics: {
            batteryLevel: 15,
          },
        })
      ).toBe('attention')
    })

    it('should return "attention" for network offline', () => {
      expect(
        calculateDeviceStatus({
          status: 'active',
          healthMetrics: {
            networkStatus: 'offline',
          },
        })
      ).toBe('attention')
    })

    it('should return "good" for healthy device', () => {
      const recentSync = {
        toDate: () => new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      }

      expect(
        calculateDeviceStatus({
          status: 'active',
          healthMetrics: {
            lastHealthSync: recentSync as FirebaseFirestore.Timestamp,
            batteryLevel: 80,
            networkStatus: 'online',
          },
        })
      ).toBe('good')
    })

    it('should handle null battery level', () => {
      expect(
        calculateDeviceStatus({
          status: 'active',
          healthMetrics: {
            batteryLevel: null,
          },
        })
      ).toBe('good')
    })

    it('should prioritize critical status over warnings', () => {
      // Unenrolled takes priority
      expect(
        calculateDeviceStatus({
          status: 'unenrolled',
          healthMetrics: {
            batteryLevel: 5, // Would be warning
          },
        })
      ).toBe('action')
    })
  })

  describe('THRESHOLDS matching', () => {
    it('should use 24 hours for critical offline', () => {
      expect(THRESHOLDS.OFFLINE_CRITICAL_HOURS).toBe(24)
    })

    it('should use 60 minutes for sync warning', () => {
      expect(THRESHOLDS.SYNC_WARNING_MINUTES).toBe(60)
    })

    it('should use 20% for battery warning', () => {
      expect(THRESHOLDS.BATTERY_WARNING_PERCENT).toBe(20)
    })
  })
})
