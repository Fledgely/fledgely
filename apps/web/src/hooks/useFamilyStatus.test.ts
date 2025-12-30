/**
 * useFamilyStatus Hook Tests - Story 19A.1
 *
 * Tests for the family status aggregation hook.
 * Covers status calculation rules and edge cases.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useFamilyStatus } from './useFamilyStatus'
import * as useDevicesModule from './useDevices'
import * as useChildrenModule from './useChildren'
import type { Device } from './useDevices'

// Mock the hooks
vi.mock('./useDevices')
vi.mock('./useChildren')

const mockUseDevices = vi.mocked(useDevicesModule.useDevices)
const mockUseChildren = vi.mocked(useChildrenModule.useChildren)

/**
 * Helper to create a mock device
 */
function createMockDevice(overrides: Partial<Device> = {}): Device {
  return {
    deviceId: 'dev-1',
    type: 'chromebook',
    enrolledAt: new Date(),
    enrolledBy: 'user-1',
    childId: 'child-1',
    name: 'Test Device',
    lastSeen: new Date(),
    lastScreenshotAt: new Date(),
    status: 'active',
    metadata: {
      platform: 'Chrome OS',
      userAgent: 'Mozilla/5.0',
      enrollmentRequestId: 'req-1',
    },
    healthMetrics: undefined,
    ...overrides,
  }
}

describe('useFamilyStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mocks
    mockUseDevices.mockReturnValue({
      devices: [],
      loading: false,
      error: null,
    })
    mockUseChildren.mockReturnValue({
      children: [],
      loading: false,
      error: null,
    })
  })

  describe('Loading state', () => {
    it('should return loading=true when devices are loading', () => {
      mockUseDevices.mockReturnValue({
        devices: [],
        loading: true,
        error: null,
      })

      const { result } = renderHook(() => useFamilyStatus('family-123'))

      expect(result.current.loading).toBe(true)
    })

    it('should return loading=true when children are loading', () => {
      mockUseChildren.mockReturnValue({
        children: [],
        loading: true,
        error: null,
      })

      const { result } = renderHook(() => useFamilyStatus('family-123'))

      expect(result.current.loading).toBe(true)
    })
  })

  describe('Error state', () => {
    it('should return error when devices fail to load', () => {
      mockUseDevices.mockReturnValue({
        devices: [],
        loading: false,
        error: 'Failed to load devices',
      })

      const { result } = renderHook(() => useFamilyStatus('family-123'))

      expect(result.current.error).toBe('Failed to load devices')
    })

    it('should return error when children fail to load', () => {
      mockUseChildren.mockReturnValue({
        children: [],
        loading: false,
        error: 'Failed to load children',
      })

      const { result } = renderHook(() => useFamilyStatus('family-123'))

      expect(result.current.error).toBe('Failed to load children')
    })
  })

  describe('Green status (good)', () => {
    it('should return good status when all devices are healthy', () => {
      const healthyDevice = createMockDevice({
        status: 'active',
        lastSeen: new Date(),
        healthMetrics: {
          captureSuccessRate24h: 95,
          uploadQueueSize: 0,
          networkStatus: 'online',
          batteryLevel: 80,
          batteryCharging: false,
          appVersion: '1.0.0',
          updateAvailable: false,
          collectedAt: Date.now(),
          lastHealthSync: new Date(),
        },
      })

      mockUseDevices.mockReturnValue({
        devices: [healthyDevice],
        loading: false,
        error: null,
      })
      mockUseChildren.mockReturnValue({
        children: [{ id: 'child-1', name: 'Emma', photoURL: null }],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useFamilyStatus('family-123'))

      expect(result.current.status).toBe('good')
      expect(result.current.message).toBe('All Good')
      expect(result.current.issues).toHaveLength(0)
    })

    it('should return good status with no devices and show enroll message', () => {
      mockUseDevices.mockReturnValue({
        devices: [],
        loading: false,
        error: null,
      })
      mockUseChildren.mockReturnValue({
        children: [{ id: 'child-1', name: 'Emma', photoURL: null }],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useFamilyStatus('family-123'))

      expect(result.current.status).toBe('good')
      expect(result.current.message).toBe('Ready to enroll devices')
      expect(result.current.deviceCount).toBe(0)
    })
  })

  describe('Yellow status (attention)', () => {
    it('should return attention status when sync delay > 1 hour', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
      const delayedDevice = createMockDevice({
        name: 'Chromebook',
        status: 'active',
        healthMetrics: {
          captureSuccessRate24h: 95,
          uploadQueueSize: 0,
          networkStatus: 'online',
          batteryLevel: 80,
          batteryCharging: false,
          appVersion: '1.0.0',
          updateAvailable: false,
          collectedAt: Date.now(),
          lastHealthSync: twoHoursAgo,
        },
      })

      mockUseDevices.mockReturnValue({
        devices: [delayedDevice],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useFamilyStatus('family-123'))

      expect(result.current.status).toBe('attention')
      expect(result.current.issues).toHaveLength(1)
      expect(result.current.issues[0].type).toBe('warning')
    })

    it('should return attention status when battery < 20%', () => {
      const lowBatteryDevice = createMockDevice({
        name: 'Tablet',
        status: 'active',
        healthMetrics: {
          captureSuccessRate24h: 95,
          uploadQueueSize: 0,
          networkStatus: 'online',
          batteryLevel: 15,
          batteryCharging: false,
          appVersion: '1.0.0',
          updateAvailable: false,
          collectedAt: Date.now(),
          lastHealthSync: new Date(),
        },
      })

      mockUseDevices.mockReturnValue({
        devices: [lowBatteryDevice],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useFamilyStatus('family-123'))

      expect(result.current.status).toBe('attention')
      expect(result.current.issues[0].message).toContain('battery low (15%)')
    })

    it('should return attention status when device is briefly offline', () => {
      const brieflyOfflineDevice = createMockDevice({
        name: 'Phone',
        status: 'offline',
        lastSeen: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      })

      mockUseDevices.mockReturnValue({
        devices: [brieflyOfflineDevice],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useFamilyStatus('family-123'))

      expect(result.current.status).toBe('attention')
      expect(result.current.issues[0].type).toBe('warning')
      expect(result.current.issues[0].message).toContain('is offline')
    })
  })

  describe('Red status (action)', () => {
    it('should return action status when device offline > 24 hours', () => {
      const longOfflineDevice = createMockDevice({
        name: 'Chromebook',
        status: 'offline',
        lastSeen: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago
      })

      mockUseDevices.mockReturnValue({
        devices: [longOfflineDevice],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useFamilyStatus('family-123'))

      expect(result.current.status).toBe('action')
      expect(result.current.issues[0].type).toBe('critical')
      expect(result.current.issues[0].message).toContain('offline for 48 hours')
    })

    it('should return action status when monitoring stopped (unenrolled)', () => {
      const unenrolledDevice = createMockDevice({
        name: 'Tablet',
        status: 'unenrolled',
      })

      mockUseDevices.mockReturnValue({
        devices: [unenrolledDevice],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useFamilyStatus('family-123'))

      expect(result.current.status).toBe('action')
      expect(result.current.issues[0].type).toBe('critical')
      expect(result.current.issues[0].message).toContain('Monitoring stopped')
    })
  })

  describe('Counts', () => {
    it('should return correct child and device counts', () => {
      mockUseDevices.mockReturnValue({
        devices: [
          createMockDevice({ deviceId: 'dev-1', status: 'active' }),
          createMockDevice({ deviceId: 'dev-2', status: 'active' }),
          createMockDevice({ deviceId: 'dev-3', status: 'offline' }),
        ],
        loading: false,
        error: null,
      })
      mockUseChildren.mockReturnValue({
        children: [
          { id: 'child-1', name: 'Emma', photoURL: null },
          { id: 'child-2', name: 'Liam', photoURL: null },
        ],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useFamilyStatus('family-123'))

      expect(result.current.childCount).toBe(2)
      expect(result.current.deviceCount).toBe(3)
      expect(result.current.activeDeviceCount).toBe(2)
    })

    it('should exclude unenrolled devices from count', () => {
      mockUseDevices.mockReturnValue({
        devices: [
          createMockDevice({ deviceId: 'dev-1', status: 'active' }),
          createMockDevice({ deviceId: 'dev-2', status: 'unenrolled' }),
        ],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useFamilyStatus('family-123'))

      expect(result.current.deviceCount).toBe(1)
    })
  })

  describe('Issue sorting', () => {
    it('should sort critical issues before warnings', () => {
      mockUseDevices.mockReturnValue({
        devices: [
          createMockDevice({
            deviceId: 'dev-1',
            name: 'Aardvark Device',
            status: 'offline',
            lastSeen: new Date(Date.now() - 30 * 60 * 1000), // 30 min = warning
          }),
          createMockDevice({
            deviceId: 'dev-2',
            name: 'Zebra Device',
            status: 'offline',
            lastSeen: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours = critical
          }),
        ],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useFamilyStatus('family-123'))

      expect(result.current.issues[0].type).toBe('critical')
      expect(result.current.issues[0].deviceName).toBe('Zebra Device')
      expect(result.current.issues[1].type).toBe('warning')
      expect(result.current.issues[1].deviceName).toBe('Aardvark Device')
    })
  })

  describe('Network status warnings', () => {
    it('should return attention status when device network is offline', () => {
      const networkOfflineDevice = createMockDevice({
        name: 'Tablet',
        status: 'active',
        healthMetrics: {
          captureSuccessRate24h: 95,
          uploadQueueSize: 0,
          networkStatus: 'offline',
          batteryLevel: 80,
          batteryCharging: false,
          appVersion: '1.0.0',
          updateAvailable: false,
          collectedAt: Date.now(),
          lastHealthSync: new Date(),
        },
      })

      mockUseDevices.mockReturnValue({
        devices: [networkOfflineDevice],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useFamilyStatus('family-123'))

      expect(result.current.status).toBe('attention')
      expect(result.current.issues[0].message).toContain('network offline')
    })
  })

  describe('Null familyId handling', () => {
    it('should handle null familyId gracefully', () => {
      mockUseDevices.mockReturnValue({
        devices: [],
        loading: false,
        error: null,
      })
      mockUseChildren.mockReturnValue({
        children: [],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useFamilyStatus(null))

      expect(result.current.status).toBe('good')
      expect(result.current.deviceCount).toBe(0)
      expect(result.current.childCount).toBe(0)
    })
  })

  describe('Last updated', () => {
    it('should return most recent update time across devices', () => {
      const olderTime = new Date(Date.now() - 60 * 60 * 1000)
      const newerTime = new Date(Date.now() - 5 * 60 * 1000)

      mockUseDevices.mockReturnValue({
        devices: [
          createMockDevice({
            deviceId: 'dev-1',
            lastSeen: olderTime,
            healthMetrics: {
              captureSuccessRate24h: 95,
              uploadQueueSize: 0,
              networkStatus: 'online',
              batteryLevel: 80,
              batteryCharging: false,
              appVersion: '1.0.0',
              updateAvailable: false,
              collectedAt: Date.now(),
              lastHealthSync: newerTime,
            },
          }),
        ],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useFamilyStatus('family-123'))

      expect(result.current.lastUpdated.getTime()).toBe(newerTime.getTime())
    })
  })
})
