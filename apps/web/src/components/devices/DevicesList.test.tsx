/**
 * DevicesList Component Tests
 * Story 19.1: Device List View
 *
 * Tests for:
 * - AC1: All enrolled devices listed
 * - AC2: Device information display
 * - AC3: Devices grouped by child
 * - AC4: Unassigned devices section
 * - AC5: Real-time updates (via hooks)
 * - AC6: Empty state
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { groupDevicesByChild } from './DevicesList'
import type { Device } from '../../hooks/useDevices'
import type { ChildSummary } from '../../hooks/useChildren'

// Mock device data factory
function createDevice(overrides: Partial<Device> = {}): Device {
  return {
    deviceId: `device-${Math.random().toString(36).slice(2, 8)}`,
    type: 'chromebook',
    enrolledAt: new Date('2024-01-15'),
    enrolledBy: 'parent-123',
    childId: null,
    name: 'Test Device',
    lastSeen: new Date(),
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
  formatLastSeen: vi.fn((_date: Date) => '2 hours ago'),
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
    it('should filter out unenrolled devices', () => {
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

      expect(screen.getByText('Active Device')).toBeInTheDocument()
      expect(screen.queryByText('Unenrolled Device')).not.toBeInTheDocument()
    })

    it('should show empty state when all devices are unenrolled', () => {
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

      // Should show empty state even though devices array is not empty
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
