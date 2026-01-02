/**
 * Safety Signal Service Tests - Story 7.5.1 Task 2
 *
 * Tests for safety signal service with offline queuing.
 * AC3: Works offline (queues signal for delivery)
 * AC6: Signal queuing infrastructure
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createSafetySignal,
  queueOfflineSignal,
  processOfflineQueue,
  getOfflineQueueCount,
  getOfflineQueueEntries,
  getPendingSignals,
  getSignalById,
  getSignalsByChildId,
  getSignalsByStatus,
  updateSignalStatus,
  markSignalDelivered,
  markSignalAcknowledged,
  incrementRetryCount,
  getFailedOfflineEntries,
  clearAllSignalData,
  getSignalCount,
  getOfflineQueueSize,
} from './safetySignalService'
import { SIGNAL_STATUS } from '../contracts/safetySignal'

describe('Safety Signal Service', () => {
  beforeEach(() => {
    clearAllSignalData()
  })

  // ============================================
  // Signal Creation Tests (AC3, AC6)
  // ============================================

  describe('createSafetySignal', () => {
    it('should create a signal with all required fields (AC6)', () => {
      const signal = createSafetySignal('child_123', 'family_456', 'logo_tap', 'web', false)

      expect(signal.childId).toBe('child_123')
      expect(signal.familyId).toBe('family_456')
      expect(signal.triggerMethod).toBe('logo_tap')
      expect(signal.platform).toBe('web')
      expect(signal.offlineQueued).toBe(false)
      expect(signal.triggeredAt).toBeInstanceOf(Date)
    })

    it('should set status to pending when online', () => {
      const signal = createSafetySignal('child', 'family', 'logo_tap', 'web', false)
      expect(signal.status).toBe(SIGNAL_STATUS.PENDING)
    })

    it('should set status to queued when offline (AC3)', () => {
      const signal = createSafetySignal('child', 'family', 'logo_tap', 'web', true)
      expect(signal.status).toBe(SIGNAL_STATUS.QUEUED)
      expect(signal.offlineQueued).toBe(true)
    })

    it('should automatically queue offline signal (AC3)', () => {
      createSafetySignal('child', 'family', 'logo_tap', 'web', true)
      expect(getOfflineQueueSize()).toBe(1)
    })

    it('should not queue online signal', () => {
      createSafetySignal('child', 'family', 'logo_tap', 'web', false)
      expect(getOfflineQueueSize()).toBe(0)
    })

    it('should store signal in signal store', () => {
      createSafetySignal('child', 'family', 'logo_tap', 'web', false)
      expect(getSignalCount()).toBe(1)
    })

    it('should accept deviceId parameter', () => {
      const signal = createSafetySignal(
        'child',
        'family',
        'keyboard_shortcut',
        'chrome_extension',
        false,
        'device_123'
      )
      expect(signal.deviceId).toBe('device_123')
    })
  })

  // ============================================
  // Offline Queue Tests (AC3)
  // ============================================

  describe('queueOfflineSignal', () => {
    it('should add signal to offline queue', () => {
      const signal = createSafetySignal('child', 'family', 'logo_tap', 'web', false)
      queueOfflineSignal(signal)
      expect(getOfflineQueueSize()).toBe(1)
    })

    it('should not duplicate signals in queue', () => {
      const signal = createSafetySignal('child', 'family', 'logo_tap', 'web', false)
      queueOfflineSignal(signal)
      queueOfflineSignal(signal)
      expect(getOfflineQueueSize()).toBe(1)
    })
  })

  describe('processOfflineQueue', () => {
    it('should process queued signals when online (AC3)', () => {
      createSafetySignal('child_1', 'family', 'logo_tap', 'web', true)
      createSafetySignal('child_1', 'family', 'keyboard_shortcut', 'web', true)

      const processed = processOfflineQueue('child_1')

      expect(processed).toHaveLength(2)
      expect(processed[0].status).toBe(SIGNAL_STATUS.PENDING)
      expect(processed[1].status).toBe(SIGNAL_STATUS.PENDING)
    })

    it('should remove processed signals from queue', () => {
      createSafetySignal('child', 'family', 'logo_tap', 'web', true)

      expect(getOfflineQueueSize()).toBe(1)
      processOfflineQueue('child')
      expect(getOfflineQueueSize()).toBe(0)
    })

    it('should only process signals for specified child', () => {
      createSafetySignal('child_1', 'family', 'logo_tap', 'web', true)
      createSafetySignal('child_2', 'family', 'logo_tap', 'web', true)

      processOfflineQueue('child_1')

      expect(getOfflineQueueCount('child_1')).toBe(0)
      expect(getOfflineQueueCount('child_2')).toBe(1)
    })

    it('should return empty array if no queued signals', () => {
      const processed = processOfflineQueue('child')
      expect(processed).toHaveLength(0)
    })
  })

  describe('getOfflineQueueCount', () => {
    it('should return count of queued signals for child', () => {
      createSafetySignal('child_1', 'family', 'logo_tap', 'web', true)
      createSafetySignal('child_1', 'family', 'keyboard_shortcut', 'web', true)
      createSafetySignal('child_2', 'family', 'logo_tap', 'web', true)

      expect(getOfflineQueueCount('child_1')).toBe(2)
      expect(getOfflineQueueCount('child_2')).toBe(1)
    })

    it('should return 0 if no queued signals', () => {
      expect(getOfflineQueueCount('child')).toBe(0)
    })
  })

  describe('getOfflineQueueEntries', () => {
    it('should return queue entries for child', () => {
      createSafetySignal('child', 'family', 'logo_tap', 'web', true)

      const entries = getOfflineQueueEntries('child')

      expect(entries).toHaveLength(1)
      expect(entries[0].signal.childId).toBe('child')
      expect(entries[0].retryCount).toBe(0)
      expect(entries[0].queuedAt).toBeInstanceOf(Date)
    })
  })

  // ============================================
  // Signal Query Tests
  // ============================================

  describe('getPendingSignals', () => {
    it('should return queued, pending, and sent signals', () => {
      const sig1 = createSafetySignal('child', 'family', 'logo_tap', 'web', true) // queued
      const sig2 = createSafetySignal('child', 'family', 'logo_tap', 'web', false) // pending

      const pending = getPendingSignals('child')

      expect(pending).toHaveLength(2)
      expect(pending.some((s) => s.id === sig1.id)).toBe(true)
      expect(pending.some((s) => s.id === sig2.id)).toBe(true)
    })

    it('should not return delivered or acknowledged signals', () => {
      const signal = createSafetySignal('child', 'family', 'logo_tap', 'web', false)
      updateSignalStatus(signal.id, SIGNAL_STATUS.SENT)
      updateSignalStatus(signal.id, SIGNAL_STATUS.DELIVERED)

      const pending = getPendingSignals('child')
      expect(pending).toHaveLength(0)
    })

    it('should only return signals for specified child', () => {
      createSafetySignal('child_1', 'family', 'logo_tap', 'web', false)
      createSafetySignal('child_2', 'family', 'logo_tap', 'web', false)

      const pending = getPendingSignals('child_1')
      expect(pending).toHaveLength(1)
      expect(pending[0].childId).toBe('child_1')
    })
  })

  describe('getSignalById', () => {
    it('should return signal by ID', () => {
      const signal = createSafetySignal('child', 'family', 'logo_tap', 'web', false)
      const found = getSignalById(signal.id)
      expect(found).toEqual(signal)
    })

    it('should return null for non-existent ID', () => {
      expect(getSignalById('non_existent')).toBeNull()
    })
  })

  describe('getSignalsByChildId', () => {
    it('should return all signals for child', () => {
      createSafetySignal('child', 'family', 'logo_tap', 'web', false)
      createSafetySignal('child', 'family', 'keyboard_shortcut', 'web', false)

      const signals = getSignalsByChildId('child')
      expect(signals).toHaveLength(2)
    })
  })

  describe('getSignalsByStatus', () => {
    it('should return signals with specified status', () => {
      createSafetySignal('child_1', 'family', 'logo_tap', 'web', true) // queued
      createSafetySignal('child_2', 'family', 'logo_tap', 'web', false) // pending

      const queued = getSignalsByStatus(SIGNAL_STATUS.QUEUED)
      const pending = getSignalsByStatus(SIGNAL_STATUS.PENDING)

      expect(queued).toHaveLength(1)
      expect(pending).toHaveLength(1)
    })
  })

  // ============================================
  // Status Update Tests
  // ============================================

  describe('updateSignalStatus', () => {
    it('should update status for valid transition', () => {
      const signal = createSafetySignal('child', 'family', 'logo_tap', 'web', true)
      const updated = updateSignalStatus(signal.id, SIGNAL_STATUS.PENDING)

      expect(updated).not.toBeNull()
      expect(updated!.status).toBe(SIGNAL_STATUS.PENDING)
    })

    it('should return null for invalid transition', () => {
      const signal = createSafetySignal('child', 'family', 'logo_tap', 'web', true)
      const updated = updateSignalStatus(signal.id, SIGNAL_STATUS.DELIVERED)

      expect(updated).toBeNull()
    })

    it('should return null for non-existent signal', () => {
      const updated = updateSignalStatus('non_existent', SIGNAL_STATUS.PENDING)
      expect(updated).toBeNull()
    })

    it('should set deliveredAt when transitioning to delivered', () => {
      const signal = createSafetySignal('child', 'family', 'logo_tap', 'web', false)
      updateSignalStatus(signal.id, SIGNAL_STATUS.SENT)
      const updated = updateSignalStatus(signal.id, SIGNAL_STATUS.DELIVERED)

      expect(updated!.deliveredAt).toBeInstanceOf(Date)
    })
  })

  describe('markSignalDelivered', () => {
    it('should mark pending signal as delivered', () => {
      const signal = createSafetySignal('child', 'family', 'logo_tap', 'web', false)
      const delivered = markSignalDelivered(signal.id)

      expect(delivered).not.toBeNull()
      expect(delivered!.status).toBe(SIGNAL_STATUS.DELIVERED)
      expect(delivered!.deliveredAt).toBeInstanceOf(Date)
    })

    it('should return null for queued signal', () => {
      const signal = createSafetySignal('child', 'family', 'logo_tap', 'web', true)
      const delivered = markSignalDelivered(signal.id)

      expect(delivered).toBeNull()
    })
  })

  describe('markSignalAcknowledged', () => {
    it('should mark delivered signal as acknowledged', () => {
      const signal = createSafetySignal('child', 'family', 'logo_tap', 'web', false)
      markSignalDelivered(signal.id)
      const acknowledged = markSignalAcknowledged(signal.id)

      expect(acknowledged).not.toBeNull()
      expect(acknowledged!.status).toBe(SIGNAL_STATUS.ACKNOWLEDGED)
    })

    it('should return null for non-delivered signal', () => {
      const signal = createSafetySignal('child', 'family', 'logo_tap', 'web', false)
      const acknowledged = markSignalAcknowledged(signal.id)

      expect(acknowledged).toBeNull()
    })
  })

  // ============================================
  // Retry Tests
  // ============================================

  describe('incrementRetryCount', () => {
    it('should increment retry count', () => {
      const signal = createSafetySignal('child', 'family', 'logo_tap', 'web', true)
      const updated = incrementRetryCount(signal.id)

      expect(updated).not.toBeNull()
      expect(updated!.retryCount).toBe(1)
      expect(updated!.lastRetryAt).toBeInstanceOf(Date)
    })

    it('should return null for non-queued signal', () => {
      const signal = createSafetySignal('child', 'family', 'logo_tap', 'web', false)
      const updated = incrementRetryCount(signal.id)

      expect(updated).toBeNull()
    })
  })

  describe('getFailedOfflineEntries', () => {
    it('should return entries with retry count > 0', () => {
      const signal = createSafetySignal('child', 'family', 'logo_tap', 'web', true)
      incrementRetryCount(signal.id)

      const failed = getFailedOfflineEntries('child')
      expect(failed).toHaveLength(1)
      expect(failed[0].retryCount).toBe(1)
    })

    it('should not return entries with no retries', () => {
      createSafetySignal('child', 'family', 'logo_tap', 'web', true)

      const failed = getFailedOfflineEntries('child')
      expect(failed).toHaveLength(0)
    })
  })

  // ============================================
  // Testing Utility Tests
  // ============================================

  describe('clearAllSignalData', () => {
    it('should clear all signals and queue', () => {
      createSafetySignal('child', 'family', 'logo_tap', 'web', true)
      createSafetySignal('child', 'family', 'logo_tap', 'web', false)

      clearAllSignalData()

      expect(getSignalCount()).toBe(0)
      expect(getOfflineQueueSize()).toBe(0)
    })
  })
})
