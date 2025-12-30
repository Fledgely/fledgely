/**
 * ChildStatusRow Component Tests - Story 19A.2
 *
 * Tests for the Per-Child Status Row component.
 * Covers all acceptance criteria:
 * - AC1: Each child shown as a row with status indicator
 * - AC2: Row shows child name, avatar, status color, last activity, device count
 * - AC3: Tap to expand shows device details
 * - AC6: Keyboard accessible with aria-expanded
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChildStatusRow, ChildStatusRowProps } from './ChildStatusRow'
import * as useDevicesModule from '../../hooks/useDevices'
import type { Device } from '../../hooks/useDevices'

// Mock formatLastSeen
vi.mock('../../hooks/useDevices', async () => {
  const actual = await vi.importActual<typeof useDevicesModule>('../../hooks/useDevices')
  return {
    ...actual,
    formatLastSeen: vi.fn((date) => {
      if (!date) return 'Never synced'
      return '5 min ago'
    }),
  }
})

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

/**
 * Default props for testing
 */
function getDefaultProps(overrides: Partial<ChildStatusRowProps> = {}): ChildStatusRowProps {
  return {
    childId: 'child-1',
    childName: 'Emma',
    photoURL: null,
    status: 'good',
    deviceCount: 2,
    activeDeviceCount: 2,
    lastActivity: new Date(),
    devices: [],
    ...overrides,
  }
}

describe('ChildStatusRow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AC1: Row with status indicator', () => {
    it('should render a row for a child', () => {
      render(<ChildStatusRow {...getDefaultProps()} />)

      expect(screen.getByTestId('child-status-row-child-1')).toBeInTheDocument()
    })

    it('should show status dot for good status', () => {
      render(<ChildStatusRow {...getDefaultProps({ status: 'good' })} />)

      expect(screen.getByText('All Good')).toBeInTheDocument()
    })

    it('should show status dot for attention status', () => {
      render(<ChildStatusRow {...getDefaultProps({ status: 'attention' })} />)

      expect(screen.getByText('Needs Attention')).toBeInTheDocument()
    })

    it('should show status dot for action status', () => {
      render(<ChildStatusRow {...getDefaultProps({ status: 'action' })} />)

      expect(screen.getByText('Action Required')).toBeInTheDocument()
    })
  })

  describe('AC2: Row displays child info', () => {
    it('should display child name', () => {
      render(<ChildStatusRow {...getDefaultProps({ childName: 'Emma' })} />)

      expect(screen.getByText('Emma')).toBeInTheDocument()
    })

    it('should display avatar with initials when no photo', () => {
      const { container } = render(
        <ChildStatusRow {...getDefaultProps({ childName: 'Emma Smith', photoURL: null })} />
      )

      // Avatar should show initials
      expect(container.textContent).toContain('ES')
    })

    it('should display photo when provided', () => {
      render(
        <ChildStatusRow
          {...getDefaultProps({
            childName: 'Emma',
            photoURL: 'https://example.com/photo.jpg',
          })}
        />
      )

      const img = screen.getByRole('img', { hidden: true })
      expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg')
    })

    it('should display device count when all active', () => {
      render(<ChildStatusRow {...getDefaultProps({ deviceCount: 3, activeDeviceCount: 3 })} />)

      expect(screen.getByText('3 devices')).toBeInTheDocument()
    })

    it('should display active/total when some devices inactive', () => {
      render(<ChildStatusRow {...getDefaultProps({ deviceCount: 3, activeDeviceCount: 2 })} />)

      expect(screen.getByText('2/3 active')).toBeInTheDocument()
    })

    it('should use singular form for 1 device', () => {
      render(<ChildStatusRow {...getDefaultProps({ deviceCount: 1, activeDeviceCount: 1 })} />)

      expect(screen.getByText('1 device')).toBeInTheDocument()
    })

    it('should show "No devices" when device count is 0', () => {
      render(<ChildStatusRow {...getDefaultProps({ deviceCount: 0 })} />)

      expect(screen.getByText('No devices')).toBeInTheDocument()
    })

    it('should display last activity time', () => {
      render(<ChildStatusRow {...getDefaultProps({ lastActivity: new Date() })} />)

      expect(screen.getByText('5 min ago')).toBeInTheDocument()
    })

    it('should display "No activity" when no last activity', () => {
      render(<ChildStatusRow {...getDefaultProps({ lastActivity: null })} />)

      expect(screen.getByText('No activity')).toBeInTheDocument()
    })
  })

  describe('AC3: Tap to expand device details', () => {
    it('should expand on click to show device list', () => {
      const devices = [
        createMockDevice({ deviceId: 'dev-1', name: 'Chromebook', status: 'active' }),
        createMockDevice({ deviceId: 'dev-2', name: 'Tablet', status: 'active' }),
      ]

      render(<ChildStatusRow {...getDefaultProps({ devices })} />)

      const rowButton = screen.getByTestId('child-row-button-child-1')

      // Initially not expanded
      expect(rowButton).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByTestId('device-list')).not.toBeInTheDocument()

      // Click to expand
      fireEvent.click(rowButton)

      expect(rowButton).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByTestId('device-list')).toBeInTheDocument()
      expect(screen.getByText('Chromebook')).toBeInTheDocument()
      expect(screen.getByText('Tablet')).toBeInTheDocument()
    })

    it('should collapse on second click', () => {
      const devices = [
        createMockDevice({ deviceId: 'dev-1', name: 'Chromebook', status: 'active' }),
      ]

      render(<ChildStatusRow {...getDefaultProps({ devices })} />)

      const rowButton = screen.getByTestId('child-row-button-child-1')

      // Expand
      fireEvent.click(rowButton)
      expect(rowButton).toHaveAttribute('aria-expanded', 'true')

      // Collapse
      fireEvent.click(rowButton)
      expect(rowButton).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByTestId('device-list')).not.toBeInTheDocument()
    })

    it('should show "No devices enrolled" when expanded with no devices', () => {
      render(<ChildStatusRow {...getDefaultProps({ devices: [] })} />)

      const rowButton = screen.getByTestId('child-row-button-child-1')
      fireEvent.click(rowButton)

      expect(screen.getByText('No devices enrolled')).toBeInTheDocument()
    })

    it('should display device status indicators in expanded view', () => {
      const devices = [
        createMockDevice({ deviceId: 'dev-1', name: 'Active Device', status: 'active' }),
        createMockDevice({ deviceId: 'dev-2', name: 'Offline Device', status: 'offline' }),
      ]

      render(<ChildStatusRow {...getDefaultProps({ devices })} />)

      const rowButton = screen.getByTestId('child-row-button-child-1')
      fireEvent.click(rowButton)

      expect(screen.getByText('Active Device')).toBeInTheDocument()
      expect(screen.getByText('Offline Device')).toBeInTheDocument()
    })
  })

  describe('AC6: Keyboard accessibility', () => {
    it('should be focusable', () => {
      render(<ChildStatusRow {...getDefaultProps()} />)

      const rowButton = screen.getByTestId('child-row-button-child-1')
      expect(rowButton).toHaveAttribute('tabIndex', '0')
    })

    it('should expand with Enter key', () => {
      render(<ChildStatusRow {...getDefaultProps()} />)

      const rowButton = screen.getByTestId('child-row-button-child-1')

      fireEvent.keyDown(rowButton, { key: 'Enter' })

      expect(rowButton).toHaveAttribute('aria-expanded', 'true')
    })

    it('should expand with Space key', () => {
      render(<ChildStatusRow {...getDefaultProps()} />)

      const rowButton = screen.getByTestId('child-row-button-child-1')

      fireEvent.keyDown(rowButton, { key: ' ' })

      expect(rowButton).toHaveAttribute('aria-expanded', 'true')
    })

    it('should have proper ARIA label for screen readers', () => {
      render(
        <ChildStatusRow
          {...getDefaultProps({
            childName: 'Emma',
            status: 'good',
            deviceCount: 2,
          })}
        />
      )

      const rowButton = screen.getByTestId('child-row-button-child-1')
      const ariaLabel = rowButton.getAttribute('aria-label')

      expect(ariaLabel).toContain('Emma')
      expect(ariaLabel).toContain('Status: All Good')
      expect(ariaLabel).toContain('2 devices')
    })

    it('should have role="button"', () => {
      render(<ChildStatusRow {...getDefaultProps()} />)

      const rowButton = screen.getByTestId('child-row-button-child-1')
      expect(rowButton).toHaveAttribute('role', 'button')
    })
  })

  describe('Edge cases', () => {
    it('should handle single word name for initials', () => {
      const { container } = render(
        <ChildStatusRow {...getDefaultProps({ childName: 'Emma', photoURL: null })} />
      )

      expect(container.textContent).toContain('E')
    })

    it('should handle long names gracefully', () => {
      render(
        <ChildStatusRow
          {...getDefaultProps({
            childName: 'Emma Elizabeth Smith-Johnson',
          })}
        />
      )

      expect(screen.getByText('Emma Elizabeth Smith-Johnson')).toBeInTheDocument()
    })

    it('should handle many devices in expanded view', () => {
      const devices = Array.from({ length: 5 }, (_, i) =>
        createMockDevice({ deviceId: `dev-${i}`, name: `Device ${i + 1}`, status: 'active' })
      )

      render(<ChildStatusRow {...getDefaultProps({ devices })} />)

      const rowButton = screen.getByTestId('child-row-button-child-1')
      fireEvent.click(rowButton)

      for (let i = 1; i <= 5; i++) {
        expect(screen.getByText(`Device ${i}`)).toBeInTheDocument()
      }
    })
  })
})
