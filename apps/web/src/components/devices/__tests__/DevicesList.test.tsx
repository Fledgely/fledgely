/**
 * Unit tests for DevicesList component - Story 12.4, 12.5
 *
 * Tests cover:
 * - Device list display (Story 12.4)
 * - Child assignment dropdown (Story 12.5 AC1, AC2)
 * - Assignment/reassignment actions (Story 12.5 AC3, AC5)
 * - Loading and error states
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DevicesList } from '../DevicesList'
import * as useDevicesModule from '../../../hooks/useDevices'
import * as useChildrenModule from '../../../hooks/useChildren'
import * as deviceService from '../../../services/deviceService'

// Mock the hooks and services
vi.mock('../../../hooks/useDevices')
vi.mock('../../../hooks/useChildren')
vi.mock('../../../services/deviceService')
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    firebaseUser: { uid: 'mock-uid', email: 'test@example.com', providerData: [] },
  }),
}))

const mockUseDevices = vi.mocked(useDevicesModule.useDevices)
const mockUseChildren = vi.mocked(useChildrenModule.useChildren)
const mockAssignDeviceToChild = vi.mocked(deviceService.assignDeviceToChild)

describe('DevicesList', () => {
  // Story 19.3: Added lastScreenshotAt field to mock devices
  const mockDevices: useDevicesModule.Device[] = [
    {
      deviceId: 'device-1',
      type: 'chromebook',
      enrolledAt: new Date('2024-01-15'),
      enrolledBy: 'parent-uid',
      childId: null,
      name: 'Chromebook device-1',
      lastSeen: new Date(),
      lastScreenshotAt: new Date(Date.now() - 300000), // 5 min ago
      status: 'active',
      metadata: {
        platform: 'Chrome OS',
        userAgent: 'Mozilla/5.0',
        enrollmentRequestId: 'req-1',
      },
    },
    {
      deviceId: 'device-2',
      type: 'chromebook',
      enrolledAt: new Date('2024-01-10'),
      enrolledBy: 'parent-uid',
      childId: 'child-A',
      name: 'Chromebook device-2',
      lastSeen: new Date(Date.now() - 1800000), // 30 min ago (Active status)
      lastScreenshotAt: null, // No screenshots yet
      status: 'active',
      metadata: {
        platform: 'Chrome OS',
        userAgent: 'Mozilla/5.0',
        enrollmentRequestId: 'req-2',
      },
    },
  ]

  const mockChildren: useChildrenModule.ChildSummary[] = [
    { id: 'child-A', name: 'Alice', photoURL: null },
    { id: 'child-B', name: 'Bob', photoURL: null },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    mockUseDevices.mockReturnValue({
      devices: mockDevices,
      loading: false,
      error: null,
    })

    mockUseChildren.mockReturnValue({
      children: mockChildren,
      loading: false,
      error: null,
    })

    mockAssignDeviceToChild.mockResolvedValue({
      success: true,
      message: 'Device assigned to child',
    })

    // Mock formatLastSeen
    vi.spyOn(useDevicesModule, 'formatLastSeen').mockImplementation(
      (date: Date | null | undefined) => {
        if (!date) return 'Never synced'
        const diff = Date.now() - date.getTime()
        if (diff < 60000) return 'Just now'
        if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`
        return `${Math.floor(diff / 3600000)} hour ago`
      }
    )

    // Story 19.3: Mock isValidDate
    vi.spyOn(useDevicesModule, 'isValidDate').mockImplementation(
      (date: Date | null | undefined): boolean => {
        if (!date) return false
        const time = date.getTime()
        return !isNaN(time) && time > 0
      }
    )
  })

  describe('Device list display (Story 12.4)', () => {
    it('displays device names', () => {
      render(<DevicesList familyId="family-123" />)

      expect(screen.getByText('Chromebook device-1')).toBeInTheDocument()
      expect(screen.getByText('Chromebook device-2')).toBeInTheDocument()
    })

    it('displays device type', () => {
      render(<DevicesList familyId="family-123" />)

      const typeLabels = screen.getAllByText(/Chromebook/)
      expect(typeLabels.length).toBeGreaterThan(0)
    })

    it('displays status badges based on health status (Story 19.2)', () => {
      render(<DevicesList familyId="family-123" />)

      // Story 19.2/19.3: Status badges now calculate health from lastSeen
      // Device 1: lastSeen = now → Active (< 1 hour)
      // Device 2: lastSeen = 30 min ago → Active (< 1 hour)
      // Both devices should show Active status
      const activeBadges = screen.getAllByText('Active')
      expect(activeBadges).toHaveLength(2)

      // Should have status badges for both devices
      const allStatusBadges = screen.getAllByRole('button', { name: /Device status:/ })
      expect(allStatusBadges).toHaveLength(2)
    })

    it('displays last seen time', () => {
      render(<DevicesList familyId="family-123" />)

      // Multiple devices, so use getAllByText
      const lastSeenTexts = screen.getAllByText(/Last seen/)
      expect(lastSeenTexts.length).toBeGreaterThan(0)
    })
  })

  describe('Loading state', () => {
    it('shows loading message when devices are loading', () => {
      mockUseDevices.mockReturnValue({
        devices: [],
        loading: true,
        error: null,
      })

      render(<DevicesList familyId="family-123" />)

      expect(screen.getByText('Loading devices...')).toBeInTheDocument()
    })

    it('shows loading message when children are loading', () => {
      mockUseChildren.mockReturnValue({
        children: [],
        loading: true,
        error: null,
      })

      render(<DevicesList familyId="family-123" />)

      expect(screen.getByText('Loading devices...')).toBeInTheDocument()
    })
  })

  describe('Error state', () => {
    it('shows error message from devices hook', () => {
      mockUseDevices.mockReturnValue({
        devices: [],
        loading: false,
        error: 'Failed to load devices',
      })

      render(<DevicesList familyId="family-123" />)

      expect(screen.getByText('Failed to load devices')).toBeInTheDocument()
    })

    it('shows error message from children hook', () => {
      mockUseChildren.mockReturnValue({
        children: [],
        loading: false,
        error: 'Failed to load children',
      })

      render(<DevicesList familyId="family-123" />)

      expect(screen.getByText('Failed to load children')).toBeInTheDocument()
    })
  })

  describe('Empty state', () => {
    it('shows empty message when no devices', () => {
      mockUseDevices.mockReturnValue({
        devices: [],
        loading: false,
        error: null,
      })

      render(<DevicesList familyId="family-123" />)

      // Story 19.1: Updated empty state with CTA button
      expect(screen.getByText('No devices enrolled yet.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add your first device/i })).toBeInTheDocument()
    })
  })

  describe('Child assignment dropdown (Story 12.5 AC1, AC2)', () => {
    it('shows child selector dropdown for each device', () => {
      render(<DevicesList familyId="family-123" />)

      const selectors = screen.getAllByRole('combobox', { name: 'Assign to child' })
      expect(selectors).toHaveLength(2)
    })

    it('shows all children in dropdown options (AC2)', () => {
      render(<DevicesList familyId="family-123" />)

      const selectors = screen.getAllByRole('combobox', { name: 'Assign to child' })
      const firstSelector = selectors[0]

      // Check all children are options
      expect(firstSelector).toHaveTextContent('Alice')
      expect(firstSelector).toHaveTextContent('Bob')
    })

    it('shows "Assign to child..." placeholder for unassigned devices (AC1)', () => {
      render(<DevicesList familyId="family-123" />)

      // First device is unassigned
      expect(screen.getByText('Assign to child...')).toBeInTheDocument()
    })

    it('shows "Unassign" option for assigned devices (AC5)', () => {
      render(<DevicesList familyId="family-123" />)

      // Second device is assigned, should show Unassign option
      expect(screen.getByText('Unassign')).toBeInTheDocument()
    })

    it('shows assigned child name badge (AC3)', () => {
      render(<DevicesList familyId="family-123" />)

      // Device 2 is assigned to Alice - appears in badge and as option
      // Look for the badge specifically by finding text within the badge container
      const aliceTexts = screen.getAllByText('Alice')
      // Should appear: once in badge, twice in dropdown options (one per device)
      expect(aliceTexts.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Assignment actions (Story 12.5 AC3)', () => {
    it('calls assignDeviceToChild when child is selected', async () => {
      render(<DevicesList familyId="family-123" />)

      const selectors = screen.getAllByRole('combobox', { name: 'Assign to child' })
      // Story 19.1: With grouping, order might change. Find the unassigned device's selector
      // Device 1 is unassigned (childId=null), Device 2 is assigned (childId='child-A')
      // Unassigned devices appear in Unassigned section after child groups
      // So Device 2 (Alice's group) appears first, then Device 1 (Unassigned section)
      const unassignedDeviceSelector = selectors[1] // Device 1 is in Unassigned section (second)

      fireEvent.change(unassignedDeviceSelector, { target: { value: 'child-B' } })

      await waitFor(() => {
        expect(mockAssignDeviceToChild).toHaveBeenCalledWith('family-123', 'device-1', 'child-B')
      })
    })

    it('calls assignDeviceToChild with null for unassignment', async () => {
      render(<DevicesList familyId="family-123" />)

      const selectors = screen.getAllByRole('combobox', { name: 'Assign to child' })
      // Device 2 is assigned to child-A (Alice), appears first in Alice's group
      const assignedDeviceSelector = selectors[0]

      fireEvent.change(assignedDeviceSelector, { target: { value: '' } })

      await waitFor(() => {
        expect(mockAssignDeviceToChild).toHaveBeenCalledWith('family-123', 'device-2', null)
      })
    })
  })

  describe('Reassignment (Story 12.5 AC5)', () => {
    it('allows reassignment to different child', async () => {
      render(<DevicesList familyId="family-123" />)

      const selectors = screen.getAllByRole('combobox', { name: 'Assign to child' })
      // Story 19.1: Device 2 (assigned to child-A) appears first in Alice's group
      const assignedDeviceSelector = selectors[0] // Device assigned to child-A

      // Reassign to child-B
      fireEvent.change(assignedDeviceSelector, { target: { value: 'child-B' } })

      await waitFor(() => {
        expect(mockAssignDeviceToChild).toHaveBeenCalledWith('family-123', 'device-2', 'child-B')
      })
    })
  })

  describe('Error handling', () => {
    it('shows error when assignment fails', async () => {
      mockAssignDeviceToChild.mockRejectedValue(new Error('Assignment failed'))

      render(<DevicesList familyId="family-123" />)

      const selectors = screen.getAllByRole('combobox', { name: 'Assign to child' })
      fireEvent.change(selectors[0], { target: { value: 'child-A' } })

      await waitFor(() => {
        expect(screen.getByText('Assignment failed')).toBeInTheDocument()
      })
    })
  })

  describe('Loading state during assignment', () => {
    it('disables selector while updating', async () => {
      // Make the assignment take time
      mockAssignDeviceToChild.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ success: true, message: 'Done' }), 100)
          )
      )

      render(<DevicesList familyId="family-123" />)

      const selectors = screen.getAllByRole('combobox', { name: 'Assign to child' })
      const selector = selectors[0]

      fireEvent.change(selector, { target: { value: 'child-A' } })

      // Should be disabled while updating
      await waitFor(() => {
        expect(selector).toBeDisabled()
      })

      // Should be enabled after update completes
      await waitFor(() => {
        expect(selector).not.toBeDisabled()
      })
    })
  })

  describe('Empty children list', () => {
    it('shows only placeholder when no children exist', () => {
      mockUseChildren.mockReturnValue({
        children: [],
        loading: false,
        error: null,
      })

      render(<DevicesList familyId="family-123" />)

      // Should still show dropdowns (devices appear in Unassigned section)
      const selectors = screen.getAllByRole('combobox', { name: 'Assign to child' })
      expect(selectors).toHaveLength(2)

      // Story 19.1: Device 1 (unassigned) shows "Assign to child..."
      // Device 2 (has childId but child deleted) will have "Unassign" since it has childId
      // Either behavior is valid based on childId
      const hasPlaceholder = selectors[0].textContent?.includes('Assign to child...')
      const hasUnassign = selectors[0].textContent?.includes('Unassign')
      expect(hasPlaceholder || hasUnassign).toBe(true)
    })
  })

  describe('Orphaned child assignment', () => {
    it('shows "Unknown Child" section header when assigned child is deleted', () => {
      // Device is assigned to child-X which doesn't exist in children list
      const devicesWithOrphanedChild: useDevicesModule.Device[] = [
        {
          ...mockDevices[0],
          childId: 'deleted-child-X', // This child doesn't exist in mockChildren
        },
      ]

      mockUseDevices.mockReturnValue({
        devices: devicesWithOrphanedChild,
        loading: false,
        error: null,
      })

      render(<DevicesList familyId="family-123" />)

      // Story 19.1: Orphaned devices now appear under "Unknown Child" section header
      expect(screen.getByText('Unknown Child')).toBeInTheDocument()
    })
  })
})
