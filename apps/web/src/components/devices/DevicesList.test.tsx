/**
 * DevicesList Component Tests
 * Story 19.1: Device List View
 * Story 19.2: Device Status Indicators
 *
 * Tests for:
 * Story 19.1:
 * - AC1: All enrolled devices listed
 * - AC2: Device information display
 * - AC3: Devices grouped by child
 * - AC4: Unassigned devices section
 * - AC5: Real-time updates (via hooks)
 * - AC6: Empty state
 *
 * Story 19.2:
 * - AC1: Colored status indicator
 * - AC2: Green = Active (< 1 hour)
 * - AC3: Yellow = Warning (1-24 hours)
 * - AC4: Red = Critical (24+ hours)
 * - AC5: Gray = Offline/Removed
 * - AC6: Status tooltip with last sync
 * - AC7: Click for health details
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { groupDevicesByChild, getDeviceHealthStatus } from './DevicesList'
import type { Device } from '../../hooks/useDevices'
import type { ChildSummary } from '../../hooks/useChildren'

// Mock device data factory
// Story 19.3: Added lastScreenshotAt field
function createDevice(overrides: Partial<Device> = {}): Device {
  return {
    deviceId: `device-${Math.random().toString(36).slice(2, 8)}`,
    type: 'chromebook',
    enrolledAt: new Date('2024-01-15'),
    enrolledBy: 'parent-123',
    childId: null,
    name: 'Test Device',
    lastSeen: new Date(),
    lastScreenshotAt: null,
    status: 'active',
    metadata: {
      platform: 'Chrome OS',
      userAgent: 'Mozilla/5.0',
      enrollmentRequestId: 'req-123',
    },
    ...overrides,
  }
}

// Mock child data factory
function createChild(overrides: Partial<ChildSummary> = {}): ChildSummary {
  return {
    id: `child-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Test Child',
    photoURL: null,
    ...overrides,
  }
}

describe('groupDevicesByChild', () => {
  describe('Task 1.1: Grouping utility function', () => {
    it('should return empty groups when no devices exist', () => {
      const result = groupDevicesByChild([], [])

      expect(result.childGroups).toEqual([])
      expect(result.unassigned).toEqual([])
      expect(result.orphaned).toEqual([])
    })

    it('should return empty groups when devices array is empty', () => {
      const children = [createChild({ id: 'child-1', name: 'Alice' })]

      const result = groupDevicesByChild([], children)

      expect(result.childGroups).toEqual([])
      expect(result.unassigned).toEqual([])
    })
  })

  describe('Task 1.2: Group devices by childId', () => {
    it('should group devices by their assigned child', () => {
      const child1 = createChild({ id: 'child-1', name: 'Alice' })
      const child2 = createChild({ id: 'child-2', name: 'Bob' })
      const children = [child1, child2]

      const device1 = createDevice({ deviceId: 'dev-1', childId: 'child-1' })
      const device2 = createDevice({ deviceId: 'dev-2', childId: 'child-1' })
      const device3 = createDevice({ deviceId: 'dev-3', childId: 'child-2' })
      const devices = [device1, device2, device3]

      const result = groupDevicesByChild(devices, children)

      expect(result.childGroups).toHaveLength(2)
      // Alice has 2 devices
      const aliceGroup = result.childGroups.find((g) => g.child.id === 'child-1')
      expect(aliceGroup?.devices).toHaveLength(2)
      // Bob has 1 device
      const bobGroup = result.childGroups.find((g) => g.child.id === 'child-2')
      expect(bobGroup?.devices).toHaveLength(1)
    })

    it('should not create groups for children without devices', () => {
      const child1 = createChild({ id: 'child-1', name: 'Alice' })
      const child2 = createChild({ id: 'child-2', name: 'Bob' }) // No devices assigned
      const children = [child1, child2]

      const device1 = createDevice({ deviceId: 'dev-1', childId: 'child-1' })
      const devices = [device1]

      const result = groupDevicesByChild(devices, children)

      expect(result.childGroups).toHaveLength(1)
      expect(result.childGroups[0].child.id).toBe('child-1')
    })
  })

  describe('Task 1.3: Sort children alphabetically', () => {
    it('should sort child groups alphabetically by name', () => {
      const childZoe = createChild({ id: 'child-z', name: 'Zoe' })
      const childAlice = createChild({ id: 'child-a', name: 'Alice' })
      const childMike = createChild({ id: 'child-m', name: 'Mike' })
      const children = [childZoe, childAlice, childMike] // Not sorted

      const devices = [
        createDevice({ childId: 'child-z' }),
        createDevice({ childId: 'child-a' }),
        createDevice({ childId: 'child-m' }),
      ]

      const result = groupDevicesByChild(devices, children)

      expect(result.childGroups).toHaveLength(3)
      expect(result.childGroups[0].child.name).toBe('Alice')
      expect(result.childGroups[1].child.name).toBe('Mike')
      expect(result.childGroups[2].child.name).toBe('Zoe')
    })
  })

  describe('Task 1.4: Unassigned devices', () => {
    it('should collect unassigned devices (childId === null)', () => {
      const child = createChild({ id: 'child-1', name: 'Alice' })
      const children = [child]

      const assignedDevice = createDevice({ deviceId: 'dev-1', childId: 'child-1' })
      const unassignedDevice1 = createDevice({ deviceId: 'dev-2', childId: null })
      const unassignedDevice2 = createDevice({ deviceId: 'dev-3', childId: null })
      const devices = [assignedDevice, unassignedDevice1, unassignedDevice2]

      const result = groupDevicesByChild(devices, children)

      expect(result.unassigned).toHaveLength(2)
      expect(result.unassigned.map((d) => d.deviceId)).toContain('dev-2')
      expect(result.unassigned.map((d) => d.deviceId)).toContain('dev-3')
    })

    it('should handle all devices being unassigned', () => {
      const children = [createChild({ id: 'child-1', name: 'Alice' })]

      const devices = [
        createDevice({ deviceId: 'dev-1', childId: null }),
        createDevice({ deviceId: 'dev-2', childId: null }),
      ]

      const result = groupDevicesByChild(devices, children)

      expect(result.childGroups).toHaveLength(0)
      expect(result.unassigned).toHaveLength(2)
    })
  })

  describe('Task 1.5: Orphaned assignments', () => {
    it('should identify orphaned devices (childId exists but child deleted)', () => {
      const existingChild = createChild({ id: 'child-1', name: 'Alice' })
      const children = [existingChild] // child-2 was deleted

      const normalDevice = createDevice({ deviceId: 'dev-1', childId: 'child-1' })
      const orphanedDevice = createDevice({ deviceId: 'dev-2', childId: 'child-deleted' })
      const devices = [normalDevice, orphanedDevice]

      const result = groupDevicesByChild(devices, children)

      expect(result.childGroups).toHaveLength(1)
      expect(result.orphaned).toHaveLength(1)
      expect(result.orphaned[0].deviceId).toBe('dev-2')
    })

    it('should handle multiple orphaned devices', () => {
      const children: ChildSummary[] = [] // All children deleted

      const devices = [
        createDevice({ deviceId: 'dev-1', childId: 'deleted-child-1' }),
        createDevice({ deviceId: 'dev-2', childId: 'deleted-child-2' }),
      ]

      const result = groupDevicesByChild(devices, children)

      expect(result.childGroups).toHaveLength(0)
      expect(result.orphaned).toHaveLength(2)
    })
  })

  describe('Mixed scenarios', () => {
    it('should correctly categorize devices into all three categories', () => {
      const alice = createChild({ id: 'child-alice', name: 'Alice' })
      const bob = createChild({ id: 'child-bob', name: 'Bob' })
      const children = [bob, alice] // Not alphabetical order

      const devices = [
        createDevice({ deviceId: 'dev-1', childId: 'child-alice', name: "Alice's Chromebook" }),
        createDevice({ deviceId: 'dev-2', childId: 'child-bob', name: "Bob's Laptop" }),
        createDevice({ deviceId: 'dev-3', childId: null, name: 'Spare Device' }),
        createDevice({ deviceId: 'dev-4', childId: 'deleted-child', name: 'Orphaned Device' }),
      ]

      const result = groupDevicesByChild(devices, children)

      // Children sorted alphabetically
      expect(result.childGroups).toHaveLength(2)
      expect(result.childGroups[0].child.name).toBe('Alice')
      expect(result.childGroups[1].child.name).toBe('Bob')

      // Unassigned
      expect(result.unassigned).toHaveLength(1)
      expect(result.unassigned[0].name).toBe('Spare Device')

      // Orphaned
      expect(result.orphaned).toHaveLength(1)
      expect(result.orphaned[0].name).toBe('Orphaned Device')
    })
  })
})

// Mock the hooks for component rendering tests
vi.mock('../../hooks/useDevices', () => ({
  useDevices: vi.fn(),
  formatLastSeen: vi.fn((_date: Date | null | undefined) => '2 hours ago'),
  // Story 19.3: Add isValidDate mock - check if date is valid
  isValidDate: vi.fn((date: Date | null | undefined): boolean => {
    if (!date) return false
    const time = date.getTime()
    return !isNaN(time) && time > 0
  }),
}))

vi.mock('../../hooks/useChildren', () => ({
  useChildren: vi.fn(),
}))

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ firebaseUser: { uid: 'test-user' } })),
}))

vi.mock('../../services/deviceService', () => ({
  assignDeviceToChild: vi.fn(),
  removeDevice: vi.fn(),
  getDeviceTotpSecret: vi.fn(),
  logEmergencyCodeView: vi.fn(),
  resetTotpSecret: vi.fn(),
}))

vi.mock('../auth/ReauthModal', () => ({
  ReauthModal: vi.fn(() => null),
}))

vi.mock('./EmergencyCodeModal', () => ({
  EmergencyCodeModal: vi.fn(() => null),
}))

import { useDevices } from '../../hooks/useDevices'
import { useChildren } from '../../hooks/useChildren'
import { DevicesList } from './DevicesList'

describe('DevicesList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AC6: Empty state', () => {
    it('should display empty state with CTA when no devices', () => {
      vi.mocked(useDevices).mockReturnValue({
        devices: [],
        loading: false,
        error: null,
      })
      vi.mocked(useChildren).mockReturnValue({
        children: [],
        loading: false,
        error: null,
      })

      render(<DevicesList familyId="family-123" />)

      expect(screen.getByText('No devices enrolled yet.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add your first device/i })).toBeInTheDocument()
    })
  })

  describe('Loading and error states', () => {
    it('should display loading state', () => {
      vi.mocked(useDevices).mockReturnValue({
        devices: [],
        loading: true,
        error: null,
      })
      vi.mocked(useChildren).mockReturnValue({
        children: [],
        loading: true,
        error: null,
      })

      render(<DevicesList familyId="family-123" />)

      expect(screen.getByText('Loading devices...')).toBeInTheDocument()
    })

    it('should display error state', () => {
      vi.mocked(useDevices).mockReturnValue({
        devices: [],
        loading: false,
        error: 'Failed to load devices',
      })
      vi.mocked(useChildren).mockReturnValue({
        children: [],
        loading: false,
        error: null,
      })

      render(<DevicesList familyId="family-123" />)

      expect(screen.getByText('Failed to load devices')).toBeInTheDocument()
    })
  })

  describe('AC3: Devices grouped by child', () => {
    it('should display child group headers', () => {
      const child = createChild({ id: 'child-1', name: 'Emma' })
      const device = createDevice({
        deviceId: 'dev-1',
        childId: 'child-1',
        name: "Emma's Chromebook",
        status: 'active',
      })

      vi.mocked(useDevices).mockReturnValue({
        devices: [device],
        loading: false,
        error: null,
      })
      vi.mocked(useChildren).mockReturnValue({
        children: [child],
        loading: false,
        error: null,
      })

      render(<DevicesList familyId="family-123" />)

      // Child group header should be visible (multiple 'Emma' due to assignment badge)
      const emmaElements = screen.getAllByText('Emma')
      expect(emmaElements.length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('(1 device)')).toBeInTheDocument()
      // Device should be visible
      expect(screen.getByText("Emma's Chromebook")).toBeInTheDocument()
    })

    it('should show correct device count in header', () => {
      const child = createChild({ id: 'child-1', name: 'Alice' })
      const devices = [
        createDevice({ deviceId: 'dev-1', childId: 'child-1', name: 'Device 1', status: 'active' }),
        createDevice({ deviceId: 'dev-2', childId: 'child-1', name: 'Device 2', status: 'active' }),
        createDevice({ deviceId: 'dev-3', childId: 'child-1', name: 'Device 3', status: 'active' }),
      ]

      vi.mocked(useDevices).mockReturnValue({
        devices,
        loading: false,
        error: null,
      })
      vi.mocked(useChildren).mockReturnValue({
        children: [child],
        loading: false,
        error: null,
      })

      render(<DevicesList familyId="family-123" />)

      expect(screen.getByText('(3 devices)')).toBeInTheDocument()
    })
  })

  describe('AC4: Unassigned devices section', () => {
    it('should display unassigned devices in separate section', () => {
      const unassignedDevice = createDevice({
        deviceId: 'dev-unassigned',
        childId: null,
        name: 'Spare Chromebook',
        status: 'active',
      })

      vi.mocked(useDevices).mockReturnValue({
        devices: [unassignedDevice],
        loading: false,
        error: null,
      })
      vi.mocked(useChildren).mockReturnValue({
        children: [],
        loading: false,
        error: null,
      })

      render(<DevicesList familyId="family-123" />)

      expect(screen.getByText('Unassigned Devices')).toBeInTheDocument()
      expect(screen.getByText('Spare Chromebook')).toBeInTheDocument()
    })
  })

  describe('AC1: All enrolled devices listed', () => {
    it('should show unenrolled devices with monitoring disabled banner (Story 19.5)', () => {
      const activeDevice = createDevice({
        deviceId: 'dev-active',
        name: 'Active Device',
        status: 'active',
        childId: null,
      })
      const unenrolledDevice = createDevice({
        deviceId: 'dev-unenrolled',
        name: 'Unenrolled Device',
        status: 'unenrolled',
        childId: null,
      })

      vi.mocked(useDevices).mockReturnValue({
        devices: [activeDevice, unenrolledDevice],
        loading: false,
        error: null,
      })
      vi.mocked(useChildren).mockReturnValue({
        children: [],
        loading: false,
        error: null,
      })

      render(<DevicesList familyId="family-123" />)

      // Active device shows in the device list
      expect(screen.getByText('Active Device')).toBeInTheDocument()
      // Unenrolled device shows in the monitoring disabled banner (Story 19.5)
      expect(screen.getByText('Unenrolled Device')).toBeInTheDocument()
      expect(screen.getByTestId('monitoring-disabled-banner')).toBeInTheDocument()
    })

    it('should show monitoring disabled banners when all devices are unenrolled (Story 19.5)', () => {
      const unenrolledDevice1 = createDevice({
        deviceId: 'dev-unenrolled-1',
        name: 'Unenrolled Device 1',
        status: 'unenrolled',
        childId: null,
      })
      const unenrolledDevice2 = createDevice({
        deviceId: 'dev-unenrolled-2',
        name: 'Unenrolled Device 2',
        status: 'unenrolled',
        childId: null,
      })

      vi.mocked(useDevices).mockReturnValue({
        devices: [unenrolledDevice1, unenrolledDevice2],
        loading: false,
        error: null,
      })
      vi.mocked(useChildren).mockReturnValue({
        children: [],
        loading: false,
        error: null,
      })

      render(<DevicesList familyId="family-123" />)

      // Story 19.5: Should show monitoring disabled banners for unenrolled devices
      const banners = screen.getAllByTestId('monitoring-disabled-banner')
      expect(banners).toHaveLength(2)
      expect(screen.getByText('Unenrolled Device 1')).toBeInTheDocument()
      expect(screen.getByText('Unenrolled Device 2')).toBeInTheDocument()
    })

    it('should show empty state only when no devices at all', () => {
      vi.mocked(useDevices).mockReturnValue({
        devices: [],
        loading: false,
        error: null,
      })
      vi.mocked(useChildren).mockReturnValue({
        children: [],
        loading: false,
        error: null,
      })

      render(<DevicesList familyId="family-123" />)

      // Empty state should only show when there are truly no devices
      expect(screen.getByText('No devices enrolled yet.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add your first device/i })).toBeInTheDocument()
    })
  })

  describe('AC2: Device information display', () => {
    it('should display device name and type', () => {
      const chromebook = createDevice({
        deviceId: 'dev-cb',
        name: "Kid's Chromebook",
        type: 'chromebook',
        status: 'active',
        childId: null,
      })
      const android = createDevice({
        deviceId: 'dev-android',
        name: "Kid's Phone",
        type: 'android',
        status: 'active',
        childId: null,
      })

      vi.mocked(useDevices).mockReturnValue({
        devices: [chromebook, android],
        loading: false,
        error: null,
      })
      vi.mocked(useChildren).mockReturnValue({
        children: [],
        loading: false,
        error: null,
      })

      render(<DevicesList familyId="family-123" />)

      expect(screen.getByText("Kid's Chromebook")).toBeInTheDocument()
      expect(screen.getByText("Kid's Phone")).toBeInTheDocument()
      // Device types shown in metadata (each device has type in metadata text)
      expect(screen.getAllByText(/Chromebook/).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/Android/).length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Orphaned devices', () => {
    it('should display orphaned devices with warning header', () => {
      const orphanedDevice = createDevice({
        deviceId: 'dev-orphan',
        childId: 'deleted-child-id',
        name: 'Orphaned Device',
        status: 'active',
      })

      vi.mocked(useDevices).mockReturnValue({
        devices: [orphanedDevice],
        loading: false,
        error: null,
      })
      vi.mocked(useChildren).mockReturnValue({
        children: [], // Child was deleted
        loading: false,
        error: null,
      })

      render(<DevicesList familyId="family-123" />)

      expect(screen.getByText('Unknown Child')).toBeInTheDocument()
      expect(screen.getByText('Orphaned Device')).toBeInTheDocument()
    })
  })
})

/**
 * Story 19.2: Device Status Indicators
 * Tests for getDeviceHealthStatus utility function
 */
describe('getDeviceHealthStatus - Story 19.2', () => {
  const HOUR_MS = 60 * 60 * 1000
  const DAY_MS = 24 * HOUR_MS

  describe('AC2: Green = Active (synced within 1 hour)', () => {
    it('should return active for device synced just now', () => {
      const device = createDevice({
        lastSeen: new Date(),
        status: 'active',
      })

      expect(getDeviceHealthStatus(device)).toBe('active')
    })

    it('should return active for device synced 30 minutes ago', () => {
      const device = createDevice({
        lastSeen: new Date(Date.now() - 30 * 60 * 1000),
        status: 'active',
      })

      expect(getDeviceHealthStatus(device)).toBe('active')
    })

    it('should return active for device synced 59 minutes ago', () => {
      const device = createDevice({
        lastSeen: new Date(Date.now() - 59 * 60 * 1000),
        status: 'active',
      })

      expect(getDeviceHealthStatus(device)).toBe('active')
    })
  })

  describe('AC3: Yellow = Warning (synced 1-24 hours ago)', () => {
    it('should return warning for device synced exactly 1 hour ago', () => {
      const device = createDevice({
        lastSeen: new Date(Date.now() - HOUR_MS),
        status: 'active',
      })

      expect(getDeviceHealthStatus(device)).toBe('warning')
    })

    it('should return warning for device synced 6 hours ago', () => {
      const device = createDevice({
        lastSeen: new Date(Date.now() - 6 * HOUR_MS),
        status: 'active',
      })

      expect(getDeviceHealthStatus(device)).toBe('warning')
    })

    it('should return warning for device synced 23 hours ago', () => {
      const device = createDevice({
        lastSeen: new Date(Date.now() - 23 * HOUR_MS),
        status: 'active',
      })

      expect(getDeviceHealthStatus(device)).toBe('warning')
    })
  })

  describe('AC4: Red = Critical (synced 24+ hours ago)', () => {
    it('should return critical for device synced exactly 24 hours ago', () => {
      const device = createDevice({
        lastSeen: new Date(Date.now() - DAY_MS),
        status: 'active',
      })

      expect(getDeviceHealthStatus(device)).toBe('critical')
    })

    it('should return critical for device synced 2 days ago', () => {
      const device = createDevice({
        lastSeen: new Date(Date.now() - 2 * DAY_MS),
        status: 'active',
      })

      expect(getDeviceHealthStatus(device)).toBe('critical')
    })

    it('should return critical for device synced 1 week ago', () => {
      const device = createDevice({
        lastSeen: new Date(Date.now() - 7 * DAY_MS),
        status: 'active',
      })

      expect(getDeviceHealthStatus(device)).toBe('critical')
    })
  })

  describe('AC5: Gray = Offline/Removed', () => {
    it('should return offline for device with status offline', () => {
      const device = createDevice({
        lastSeen: new Date(), // Recent, but offline status takes precedence
        status: 'offline',
      })

      expect(getDeviceHealthStatus(device)).toBe('offline')
    })

    it('should return offline for unenrolled device', () => {
      const device = createDevice({
        lastSeen: new Date(),
        status: 'unenrolled',
      })

      expect(getDeviceHealthStatus(device)).toBe('offline')
    })
  })

  describe('Edge cases', () => {
    it('should handle future timestamp (clock skew) as active', () => {
      const device = createDevice({
        lastSeen: new Date(Date.now() + HOUR_MS), // 1 hour in the future
        status: 'active',
      })

      expect(getDeviceHealthStatus(device)).toBe('active')
    })

    it('should handle very old lastSeen as critical', () => {
      const device = createDevice({
        lastSeen: new Date('2020-01-01'),
        status: 'active',
      })

      expect(getDeviceHealthStatus(device)).toBe('critical')
    })
  })
})

describe('StatusBadge Component - Story 19.2', () => {
  describe('AC1: Colored status indicator', () => {
    it('should render status badge with colored dot', () => {
      const device = createDevice({
        deviceId: 'dev-1',
        name: 'Test Device',
        lastSeen: new Date(),
        status: 'active',
        childId: null,
      })

      vi.mocked(useDevices).mockReturnValue({
        devices: [device],
        loading: false,
        error: null,
      })
      vi.mocked(useChildren).mockReturnValue({
        children: [],
        loading: false,
        error: null,
      })

      render(<DevicesList familyId="family-123" />)

      // Status badge should be a button with proper aria-label
      const statusBadge = screen.getByRole('button', { name: /Device status:/ })
      expect(statusBadge).toBeInTheDocument()
    })
  })

  describe('AC6: Status tooltip with last sync', () => {
    it('should show tooltip on hover with last sync time', () => {
      const device = createDevice({
        deviceId: 'dev-1',
        name: 'Test Device',
        lastSeen: new Date(),
        status: 'active',
        childId: null,
      })

      vi.mocked(useDevices).mockReturnValue({
        devices: [device],
        loading: false,
        error: null,
      })
      vi.mocked(useChildren).mockReturnValue({
        children: [],
        loading: false,
        error: null,
      })

      render(<DevicesList familyId="family-123" />)

      const statusBadge = screen.getByRole('button', { name: /Device status:/ })

      // Hover to show tooltip
      fireEvent.mouseEnter(statusBadge)

      // Tooltip should appear with "Last sync:" text
      expect(screen.getByRole('tooltip')).toBeInTheDocument()
      expect(screen.getByText(/Last sync:/)).toBeInTheDocument()
    })

    it('should hide tooltip on mouse leave', () => {
      const device = createDevice({
        deviceId: 'dev-1',
        name: 'Test Device',
        lastSeen: new Date(),
        status: 'active',
        childId: null,
      })

      vi.mocked(useDevices).mockReturnValue({
        devices: [device],
        loading: false,
        error: null,
      })
      vi.mocked(useChildren).mockReturnValue({
        children: [],
        loading: false,
        error: null,
      })

      render(<DevicesList familyId="family-123" />)

      const statusBadge = screen.getByRole('button', { name: /Device status:/ })

      // Hover and unhover
      fireEvent.mouseEnter(statusBadge)
      expect(screen.getByRole('tooltip')).toBeInTheDocument()

      fireEvent.mouseLeave(statusBadge)
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })
  })

  describe('AC7: Click for health details', () => {
    it('should open health modal when status badge is clicked', () => {
      const device = createDevice({
        deviceId: 'dev-1',
        name: 'Test Device',
        lastSeen: new Date(),
        status: 'active',
        childId: null,
      })

      vi.mocked(useDevices).mockReturnValue({
        devices: [device],
        loading: false,
        error: null,
      })
      vi.mocked(useChildren).mockReturnValue({
        children: [],
        loading: false,
        error: null,
      })

      render(<DevicesList familyId="family-123" />)

      // Verify health modal is not initially visible
      expect(screen.queryByTestId('health-modal')).not.toBeInTheDocument()

      const statusBadge = screen.getByRole('button', { name: /Device status:/ })
      fireEvent.click(statusBadge)

      // Story 19.4: Clicking status badge should open the health details modal
      expect(screen.getByTestId('health-modal')).toBeInTheDocument()
      expect(screen.getByText('Device Health: Test Device')).toBeInTheDocument()
    })

    it('should close health modal when close button is clicked', () => {
      const device = createDevice({
        deviceId: 'dev-1',
        name: 'Test Device',
        lastSeen: new Date(),
        status: 'active',
        childId: null,
      })

      vi.mocked(useDevices).mockReturnValue({
        devices: [device],
        loading: false,
        error: null,
      })
      vi.mocked(useChildren).mockReturnValue({
        children: [],
        loading: false,
        error: null,
      })

      render(<DevicesList familyId="family-123" />)

      // Open the modal
      const statusBadge = screen.getByRole('button', { name: /Device status:/ })
      fireEvent.click(statusBadge)
      expect(screen.getByTestId('health-modal')).toBeInTheDocument()

      // Close the modal
      const closeButton = screen.getByTestId('health-modal-close')
      fireEvent.click(closeButton)
      expect(screen.queryByTestId('health-modal')).not.toBeInTheDocument()
    })
  })

  describe('Status label display', () => {
    it('should show Active label for recently synced device', () => {
      const device = createDevice({
        deviceId: 'dev-1',
        name: 'Test Device',
        lastSeen: new Date(),
        status: 'active',
        childId: null,
      })

      vi.mocked(useDevices).mockReturnValue({
        devices: [device],
        loading: false,
        error: null,
      })
      vi.mocked(useChildren).mockReturnValue({
        children: [],
        loading: false,
        error: null,
      })

      render(<DevicesList familyId="family-123" />)

      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('should show Offline label for offline device', () => {
      const device = createDevice({
        deviceId: 'dev-1',
        name: 'Test Device',
        lastSeen: new Date(),
        status: 'offline',
        childId: null,
      })

      vi.mocked(useDevices).mockReturnValue({
        devices: [device],
        loading: false,
        error: null,
      })
      vi.mocked(useChildren).mockReturnValue({
        children: [],
        loading: false,
        error: null,
      })

      render(<DevicesList familyId="family-123" />)

      expect(screen.getByText('Offline')).toBeInTheDocument()
    })
  })
})

/**
 * Story 19.3: Last Sync Timestamp Display
 * Tests for handling null/undefined dates and never-synced devices
 */
describe('Story 19.3 - Last Sync Timestamp Display', () => {
  describe('AC4: getDeviceHealthStatus - Never-synced devices', () => {
    it('should return critical for device with null lastSeen', () => {
      const device = createDevice({
        lastSeen: null as unknown as Date, // Force null for test
        status: 'active',
      })

      expect(getDeviceHealthStatus(device)).toBe('critical')
    })

    it('should return critical for device with epoch 0 lastSeen', () => {
      const device = createDevice({
        lastSeen: new Date(0), // Epoch 0 represents invalid date
        status: 'active',
      })

      expect(getDeviceHealthStatus(device)).toBe('critical')
    })

    it('should return critical for device with invalid date (NaN timestamp)', () => {
      const device = createDevice({
        lastSeen: new Date('invalid'), // Creates Invalid Date
        status: 'active',
      })

      expect(getDeviceHealthStatus(device)).toBe('critical')
    })
  })

  describe('AC5: Screenshot timestamp display', () => {
    it('should display screenshot timestamp in device metadata', () => {
      const device = createDevice({
        deviceId: 'dev-1',
        name: 'Test Device',
        lastSeen: new Date(),
        lastScreenshotAt: new Date(Date.now() - 300000), // 5 min ago
        status: 'active',
        childId: null,
      })

      vi.mocked(useDevices).mockReturnValue({
        devices: [device],
        loading: false,
        error: null,
      })
      vi.mocked(useChildren).mockReturnValue({
        children: [],
        loading: false,
        error: null,
      })

      render(<DevicesList familyId="family-123" />)

      // Should show Screenshot in metadata
      expect(screen.getByText(/Screenshot/)).toBeInTheDocument()
    })

    it('should show "No screenshots yet" for device without screenshots', () => {
      const device = createDevice({
        deviceId: 'dev-1',
        name: 'Test Device',
        lastSeen: new Date(),
        lastScreenshotAt: null,
        status: 'active',
        childId: null,
      })

      vi.mocked(useDevices).mockReturnValue({
        devices: [device],
        loading: false,
        error: null,
      })
      vi.mocked(useChildren).mockReturnValue({
        children: [],
        loading: false,
        error: null,
      })

      render(<DevicesList familyId="family-123" />)

      expect(screen.getByText(/No screenshots yet/)).toBeInTheDocument()
    })
  })

  describe('AC6: Warning icon for delayed sync', () => {
    it('should show warning icon for device with warning status', () => {
      const device = createDevice({
        deviceId: 'dev-1',
        name: 'Test Device',
        lastSeen: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago = warning
        status: 'active',
        childId: null,
      })

      vi.mocked(useDevices).mockReturnValue({
        devices: [device],
        loading: false,
        error: null,
      })
      vi.mocked(useChildren).mockReturnValue({
        children: [],
        loading: false,
        error: null,
      })

      render(<DevicesList familyId="family-123" />)

      // Warning icon should be present with aria-label
      expect(screen.getByRole('img', { name: /sync delayed/i })).toBeInTheDocument()
    })

    it('should show warning icon for device with critical status', () => {
      const device = createDevice({
        deviceId: 'dev-1',
        name: 'Test Device',
        lastSeen: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago = critical
        status: 'active',
        childId: null,
      })

      vi.mocked(useDevices).mockReturnValue({
        devices: [device],
        loading: false,
        error: null,
      })
      vi.mocked(useChildren).mockReturnValue({
        children: [],
        loading: false,
        error: null,
      })

      render(<DevicesList familyId="family-123" />)

      // Warning icon should be present
      expect(screen.getByRole('img', { name: /sync delayed/i })).toBeInTheDocument()
    })

    it('should NOT show warning icon for device with active status', () => {
      const device = createDevice({
        deviceId: 'dev-1',
        name: 'Test Device',
        lastSeen: new Date(), // Just now = active
        status: 'active',
        childId: null,
      })

      vi.mocked(useDevices).mockReturnValue({
        devices: [device],
        loading: false,
        error: null,
      })
      vi.mocked(useChildren).mockReturnValue({
        children: [],
        loading: false,
        error: null,
      })

      render(<DevicesList familyId="family-123" />)

      // Warning icon should NOT be present
      expect(screen.queryByRole('img', { name: /sync delayed/i })).not.toBeInTheDocument()
    })
  })
})

/**
 * Story 19.5: Monitoring Disabled Alert Integration Tests
 */
describe('Story 19.5 - MonitoringDisabledBanner and Modal Integration', () => {
  it('should open MonitoringAlertDetailModal when View Details is clicked on banner', () => {
    const unenrolledDevice = createDevice({
      deviceId: 'dev-unenrolled',
      name: 'Stopped Device',
      status: 'unenrolled',
      childId: null,
    })

    vi.mocked(useDevices).mockReturnValue({
      devices: [unenrolledDevice],
      loading: false,
      error: null,
    })
    vi.mocked(useChildren).mockReturnValue({
      children: [],
      loading: false,
      error: null,
    })

    render(<DevicesList familyId="family-123" />)

    // Banner should be visible
    expect(screen.getByTestId('monitoring-disabled-banner')).toBeInTheDocument()

    // Modal should NOT be visible initially
    expect(screen.queryByTestId('alert-modal')).not.toBeInTheDocument()

    // Click View Details button on the banner
    const viewDetailsButton = screen.getByRole('button', { name: /view details/i })
    fireEvent.click(viewDetailsButton)

    // Modal should now be visible with proper dialog role
    const modal = screen.getByTestId('alert-modal')
    expect(modal).toBeInTheDocument()
    expect(modal).toHaveAttribute('role', 'dialog')
    // Check modal title contains the device name
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/Stopped Device/i)
  })

  it('should close MonitoringAlertDetailModal when close button is clicked', () => {
    const unenrolledDevice = createDevice({
      deviceId: 'dev-unenrolled',
      name: 'Stopped Device',
      status: 'unenrolled',
      childId: null,
    })

    vi.mocked(useDevices).mockReturnValue({
      devices: [unenrolledDevice],
      loading: false,
      error: null,
    })
    vi.mocked(useChildren).mockReturnValue({
      children: [],
      loading: false,
      error: null,
    })

    render(<DevicesList familyId="family-123" />)

    // Open the modal
    const viewDetailsButton = screen.getByRole('button', { name: /view details/i })
    fireEvent.click(viewDetailsButton)
    expect(screen.getByTestId('alert-modal')).toBeInTheDocument()

    // Close the modal
    const closeButton = screen.getByTestId('alert-modal-close')
    fireEvent.click(closeButton)

    // Modal should be closed
    expect(screen.queryByTestId('alert-modal')).not.toBeInTheDocument()
  })

  it('should trigger remove device flow from modal Remove Device button', () => {
    const unenrolledDevice = createDevice({
      deviceId: 'dev-unenrolled',
      name: 'Stopped Device',
      status: 'unenrolled',
      childId: null,
    })

    vi.mocked(useDevices).mockReturnValue({
      devices: [unenrolledDevice],
      loading: false,
      error: null,
    })
    vi.mocked(useChildren).mockReturnValue({
      children: [],
      loading: false,
      error: null,
    })

    render(<DevicesList familyId="family-123" />)

    // Open the alert modal
    const viewDetailsButton = screen.getByRole('button', { name: /view details/i })
    fireEvent.click(viewDetailsButton)

    // Click Remove Device in the modal
    const removeButton = screen.getByRole('button', { name: /remove device/i })
    fireEvent.click(removeButton)

    // Alert modal should close and remove confirmation should open
    expect(screen.queryByTestId('alert-modal')).not.toBeInTheDocument()
    expect(screen.getByText(/Remove Device\?/i)).toBeInTheDocument()
  })
})
