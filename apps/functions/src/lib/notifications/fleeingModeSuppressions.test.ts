/**
 * Tests for Fleeing Mode Notification Suppressions
 *
 * Story 41.8: Fleeing Mode Notification Suppression - AC1, AC2, AC3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock isInFleeingMode
const mockIsInFleeingMode = vi.fn()
vi.mock('./loginNotification', () => ({
  isInFleeingMode: (...args: unknown[]) => mockIsInFleeingMode(...args),
}))

// Mock safety audit logging
const mockLogFleeingModeSuppression = vi.fn().mockResolvedValue(undefined)
vi.mock('../safety/fleeingModeAudit', () => ({
  isFleeingModeSuppressedType: (type: string) =>
    [
      'location_transition',
      'geofence_entry',
      'geofence_exit',
      'location_paused',
      'location_disabled',
      'location_zone_change',
    ].includes(type),
  logFleeingModeSuppression: (...args: unknown[]) => mockLogFleeingModeSuppression(...args),
}))

// Mock firebase-functions/logger
vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  error: vi.fn(),
}))

import {
  shouldSuppressForFleeingMode,
  suppressLocationNotification,
  canSendNotification,
} from './fleeingModeSuppressions'

describe('fleeingModeSuppressions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsInFleeingMode.mockResolvedValue(false)
  })

  describe('shouldSuppressForFleeingMode', () => {
    describe('AC1: Location notification suppression', () => {
      it('suppresses location_transition when fleeing mode active', async () => {
        mockIsInFleeingMode.mockResolvedValue(true)

        const result = await shouldSuppressForFleeingMode('family-123', 'location_transition')

        expect(result.suppressed).toBe(true)
        expect(result.reason).toBe('fleeing_mode')
      })

      it('suppresses geofence_entry when fleeing mode active', async () => {
        mockIsInFleeingMode.mockResolvedValue(true)

        const result = await shouldSuppressForFleeingMode('family-123', 'geofence_entry')

        expect(result.suppressed).toBe(true)
        expect(result.reason).toBe('fleeing_mode')
      })

      it('suppresses geofence_exit when fleeing mode active', async () => {
        mockIsInFleeingMode.mockResolvedValue(true)

        const result = await shouldSuppressForFleeingMode('family-123', 'geofence_exit')

        expect(result.suppressed).toBe(true)
        expect(result.reason).toBe('fleeing_mode')
      })
    })

    describe('AC2: Location feature pause suppression', () => {
      it('suppresses location_paused when fleeing mode active', async () => {
        mockIsInFleeingMode.mockResolvedValue(true)

        const result = await shouldSuppressForFleeingMode('family-123', 'location_paused')

        expect(result.suppressed).toBe(true)
        expect(result.reason).toBe('fleeing_mode')
      })

      it('suppresses location_disabled when fleeing mode active', async () => {
        mockIsInFleeingMode.mockResolvedValue(true)

        const result = await shouldSuppressForFleeingMode('family-123', 'location_disabled')

        expect(result.suppressed).toBe(true)
        expect(result.reason).toBe('fleeing_mode')
      })
    })

    describe('AC3: Regular notifications continue', () => {
      it('does NOT suppress flag_created notifications', async () => {
        mockIsInFleeingMode.mockResolvedValue(true)

        const result = await shouldSuppressForFleeingMode('family-123', 'flag_created')

        expect(result.suppressed).toBe(false)
      })

      it('does NOT suppress time_limit_warning notifications', async () => {
        mockIsInFleeingMode.mockResolvedValue(true)

        const result = await shouldSuppressForFleeingMode('family-123', 'time_limit_warning')

        expect(result.suppressed).toBe(false)
      })

      it('does NOT suppress device_sync notifications', async () => {
        mockIsInFleeingMode.mockResolvedValue(true)

        const result = await shouldSuppressForFleeingMode('family-123', 'device_sync')

        expect(result.suppressed).toBe(false)
      })

      it('does NOT suppress login_alert notifications', async () => {
        mockIsInFleeingMode.mockResolvedValue(true)

        const result = await shouldSuppressForFleeingMode('family-123', 'login_alert')

        expect(result.suppressed).toBe(false)
      })
    })

    describe('when fleeing mode is NOT active', () => {
      it('does NOT suppress location notifications', async () => {
        mockIsInFleeingMode.mockResolvedValue(false)

        const result = await shouldSuppressForFleeingMode('family-123', 'location_transition')

        expect(result.suppressed).toBe(false)
      })

      it('does NOT suppress any notifications', async () => {
        mockIsInFleeingMode.mockResolvedValue(false)

        const types = [
          'location_transition',
          'geofence_entry',
          'location_paused',
          'flag_created',
          'time_limit_warning',
        ]

        for (const type of types) {
          const result = await shouldSuppressForFleeingMode('family-123', type)
          expect(result.suppressed).toBe(false)
        }
      })
    })
  })

  describe('suppressLocationNotification', () => {
    it('logs suppression to safety audit when suppressed', async () => {
      mockIsInFleeingMode.mockResolvedValue(true)

      const suppressed = await suppressLocationNotification('family-123', 'location_transition', {
        childId: 'child-456',
        deviceId: 'device-789',
      })

      expect(suppressed).toBe(true)
      expect(mockLogFleeingModeSuppression).toHaveBeenCalledWith({
        familyId: 'family-123',
        notificationType: 'location_transition',
        eventData: {
          childId: 'child-456',
          deviceId: 'device-789',
        },
      })
    })

    it('does NOT log when notification is allowed', async () => {
      mockIsInFleeingMode.mockResolvedValue(false)

      const suppressed = await suppressLocationNotification('family-123', 'location_transition', {
        childId: 'child-456',
      })

      expect(suppressed).toBe(false)
      expect(mockLogFleeingModeSuppression).not.toHaveBeenCalled()
    })

    it('does NOT log for non-location notification types', async () => {
      mockIsInFleeingMode.mockResolvedValue(true)

      const suppressed = await suppressLocationNotification('family-123', 'flag_created', {
        childId: 'child-456',
      })

      expect(suppressed).toBe(false)
      expect(mockLogFleeingModeSuppression).not.toHaveBeenCalled()
    })
  })

  describe('canSendNotification', () => {
    it('returns false when notification should be suppressed', async () => {
      mockIsInFleeingMode.mockResolvedValue(true)

      const canSend = await canSendNotification('family-123', 'location_transition')

      expect(canSend).toBe(false)
    })

    it('returns true when notification should NOT be suppressed', async () => {
      mockIsInFleeingMode.mockResolvedValue(false)

      const canSend = await canSendNotification('family-123', 'location_transition')

      expect(canSend).toBe(true)
    })

    it('returns true for non-location types even during fleeing mode', async () => {
      mockIsInFleeingMode.mockResolvedValue(true)

      const canSend = await canSendNotification('family-123', 'flag_created')

      expect(canSend).toBe(true)
    })
  })
})
