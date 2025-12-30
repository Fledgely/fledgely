/**
 * useChildStatus Hook Tests - Story 19A.2
 *
 * Tests for the per-child status aggregation hook.
 * Covers status calculation rules and sorting by severity.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useChildStatus } from './useChildStatus'
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

describe('useChildStatus', () => {
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

      const { result } = renderHook(() => useChildStatus('family-123'))

      expect(result.current.loading).toBe(true)
    })

    it('should return loading=true when children are loading', () => {
      mockUseChildren.mockReturnValue({
        children: [],
        loading: true,
        error: null,
      })

      const { result } = renderHook(() => useChildStatus('family-123'))

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

      const { result } = renderHook(() => useChildStatus('family-123'))

      expect(result.current.error).toBe('Failed to load devices')
    })

    it('should return error when children fail to load', () => {
      mockUseChildren.mockReturnValue({
        children: [],
        loading: false,
        error: 'Failed to load children',
      })

      const { result } = renderHook(() => useChildStatus('family-123'))

      expect(result.current.error).toBe('Failed to load children')
    })
  })

  describe('Child status aggregation', () => {
    it('should return empty array when no children', () => {
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

      const { result } = renderHook(() => useChildStatus('family-123'))

      expect(result.current.childStatuses).toHaveLength(0)
    })

    it('should return child status with good status when all devices healthy', () => {
      const healthyDevice = createMockDevice({
        deviceId: 'dev-1',
        childId: 'child-1',
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

      const { result } = renderHook(() => useChildStatus('family-123'))

      expect(result.current.childStatuses).toHaveLength(1)
      expect(result.current.childStatuses[0].childId).toBe('child-1')
      expect(result.current.childStatuses[0].childName).toBe('Emma')
      expect(result.current.childStatuses[0].status).toBe('good')
      expect(result.current.childStatuses[0].deviceCount).toBe(1)
      expect(result.current.childStatuses[0].issues).toHaveLength(0)
    })

    it('should return child status with attention status when device has warning', () => {
      const lowBatteryDevice = createMockDevice({
        deviceId: 'dev-1',
        childId: 'child-1',
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
      mockUseChildren.mockReturnValue({
        children: [{ id: 'child-1', name: 'Emma', photoURL: null }],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useChildStatus('family-123'))

      expect(result.current.childStatuses[0].status).toBe('attention')
      expect(result.current.childStatuses[0].issues).toHaveLength(1)
      expect(result.current.childStatuses[0].issues[0].type).toBe('warning')
    })

    it('should return child status with action status when device has critical issue', () => {
      const longOfflineDevice = createMockDevice({
        deviceId: 'dev-1',
        childId: 'child-1',
        name: 'Chromebook',
        status: 'offline',
        lastSeen: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago
      })

      mockUseDevices.mockReturnValue({
        devices: [longOfflineDevice],
        loading: false,
        error: null,
      })
      mockUseChildren.mockReturnValue({
        children: [{ id: 'child-1', name: 'Emma', photoURL: null }],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useChildStatus('family-123'))

      expect(result.current.childStatuses[0].status).toBe('action')
      expect(result.current.childStatuses[0].issues[0].type).toBe('critical')
    })
  })

  describe('AC4: Sorting by severity', () => {
    it('should sort children by status severity (action first)', () => {
      mockUseDevices.mockReturnValue({
        devices: [
          createMockDevice({
            deviceId: 'dev-1',
            childId: 'child-1',
            name: 'Device 1',
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
              lastHealthSync: new Date(),
            },
          }),
          createMockDevice({
            deviceId: 'dev-2',
            childId: 'child-2',
            name: 'Device 2',
            status: 'offline',
            lastSeen: new Date(Date.now() - 48 * 60 * 60 * 1000), // critical
          }),
          createMockDevice({
            deviceId: 'dev-3',
            childId: 'child-3',
            name: 'Device 3',
            status: 'active',
            healthMetrics: {
              captureSuccessRate24h: 95,
              uploadQueueSize: 0,
              networkStatus: 'online',
              batteryLevel: 15, // warning
              batteryCharging: false,
              appVersion: '1.0.0',
              updateAvailable: false,
              collectedAt: Date.now(),
              lastHealthSync: new Date(),
            },
          }),
        ],
        loading: false,
        error: null,
      })
      mockUseChildren.mockReturnValue({
        children: [
          { id: 'child-1', name: 'Emma', photoURL: null }, // good
          { id: 'child-2', name: 'Liam', photoURL: null }, // action
          { id: 'child-3', name: 'Olivia', photoURL: null }, // attention
        ],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useChildStatus('family-123'))

      expect(result.current.childStatuses[0].childName).toBe('Liam') // action
      expect(result.current.childStatuses[0].status).toBe('action')
      expect(result.current.childStatuses[1].childName).toBe('Olivia') // attention
      expect(result.current.childStatuses[1].status).toBe('attention')
      expect(result.current.childStatuses[2].childName).toBe('Emma') // good
      expect(result.current.childStatuses[2].status).toBe('good')
    })

    it('should sort alphabetically within same severity', () => {
      mockUseDevices.mockReturnValue({
        devices: [
          createMockDevice({
            deviceId: 'dev-1',
            childId: 'child-1',
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
              lastHealthSync: new Date(),
            },
          }),
          createMockDevice({
            deviceId: 'dev-2',
            childId: 'child-2',
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
              lastHealthSync: new Date(),
            },
          }),
        ],
        loading: false,
        error: null,
      })
      mockUseChildren.mockReturnValue({
        children: [
          { id: 'child-1', name: 'Zoe', photoURL: null },
          { id: 'child-2', name: 'Alex', photoURL: null },
        ],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useChildStatus('family-123'))

      expect(result.current.childStatuses[0].childName).toBe('Alex')
      expect(result.current.childStatuses[1].childName).toBe('Zoe')
    })
  })

  describe('Device counts', () => {
    it('should count active devices correctly', () => {
      mockUseDevices.mockReturnValue({
        devices: [
          createMockDevice({ deviceId: 'dev-1', childId: 'child-1', status: 'active' }),
          createMockDevice({ deviceId: 'dev-2', childId: 'child-1', status: 'offline' }),
          createMockDevice({ deviceId: 'dev-3', childId: 'child-1', status: 'active' }),
        ],
        loading: false,
        error: null,
      })
      mockUseChildren.mockReturnValue({
        children: [{ id: 'child-1', name: 'Emma', photoURL: null }],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useChildStatus('family-123'))

      expect(result.current.childStatuses[0].deviceCount).toBe(3)
      expect(result.current.childStatuses[0].activeDeviceCount).toBe(2)
    })

    it('should exclude unenrolled devices from count', () => {
      mockUseDevices.mockReturnValue({
        devices: [
          createMockDevice({ deviceId: 'dev-1', childId: 'child-1', status: 'active' }),
          createMockDevice({ deviceId: 'dev-2', childId: 'child-1', status: 'unenrolled' }),
        ],
        loading: false,
        error: null,
      })
      mockUseChildren.mockReturnValue({
        children: [{ id: 'child-1', name: 'Emma', photoURL: null }],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useChildStatus('family-123'))

      expect(result.current.childStatuses[0].deviceCount).toBe(1)
    })
  })

  describe('Last activity', () => {
    it('should return most recent activity time for child devices', () => {
      const olderTime = new Date(Date.now() - 60 * 60 * 1000)
      const newerTime = new Date(Date.now() - 5 * 60 * 1000)

      mockUseDevices.mockReturnValue({
        devices: [
          createMockDevice({
            deviceId: 'dev-1',
            childId: 'child-1',
            lastSeen: olderTime,
          }),
          createMockDevice({
            deviceId: 'dev-2',
            childId: 'child-1',
            lastSeen: newerTime,
          }),
        ],
        loading: false,
        error: null,
      })
      mockUseChildren.mockReturnValue({
        children: [{ id: 'child-1', name: 'Emma', photoURL: null }],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useChildStatus('family-123'))

      expect(result.current.childStatuses[0].lastActivity?.getTime()).toBe(newerTime.getTime())
    })

    it('should return null when child has no devices', () => {
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

      const { result } = renderHook(() => useChildStatus('family-123'))

      expect(result.current.childStatuses[0].lastActivity).toBeNull()
    })
  })

  describe('Multiple children with different devices', () => {
    it('should correctly assign devices to each child', () => {
      mockUseDevices.mockReturnValue({
        devices: [
          createMockDevice({ deviceId: 'dev-1', childId: 'child-1', name: 'Emma Device 1' }),
          createMockDevice({ deviceId: 'dev-2', childId: 'child-1', name: 'Emma Device 2' }),
          createMockDevice({ deviceId: 'dev-3', childId: 'child-2', name: 'Liam Device' }),
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

      const { result } = renderHook(() => useChildStatus('family-123'))

      const emmaStatus = result.current.childStatuses.find((s) => s.childName === 'Emma')
      const liamStatus = result.current.childStatuses.find((s) => s.childName === 'Liam')

      expect(emmaStatus?.devices).toHaveLength(2)
      expect(liamStatus?.devices).toHaveLength(1)
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

      const { result } = renderHook(() => useChildStatus(null))

      expect(result.current.childStatuses).toHaveLength(0)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })
})
