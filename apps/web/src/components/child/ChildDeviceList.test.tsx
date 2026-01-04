/**
 * Tests for ChildDeviceList Component - Story 19.7
 *
 * Story 19.7: Child Device Visibility
 * - AC1: Child sees list of their monitored devices
 * - AC2: Each device shows name, status, last capture time
 * - AC3: Same status indicators as parent
 * - AC4: No remove button (read-only)
 * - AC5: Click navigates to filtered screenshots
 * - AC6: "Need help?" link visible
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChildDeviceList } from './ChildDeviceList'
import type { Device } from '../../hooks/useDevices'

const createMockDevice = (overrides: Partial<Device> = {}): Device => ({
  deviceId: 'device-001',
  type: 'chromebook',
  name: 'Test Chromebook',
  childId: 'child-123',
  status: 'active',
  enrolledAt: new Date('2024-01-01'),
  enrolledBy: 'parent-uid',
  lastSeen: new Date(), // Recent = active
  lastScreenshotAt: new Date('2024-01-15T10:30:00'),
  metadata: {
    platform: 'Chrome OS',
    userAgent: 'Mozilla/5.0',
    enrollmentRequestId: 'req-001',
  },
  ...overrides,
})

describe('ChildDeviceList', () => {
  describe('AC1: Device List Display', () => {
    it('renders list of devices', () => {
      const devices = [
        createMockDevice({ deviceId: 'device-001', name: 'My Chromebook' }),
        createMockDevice({ deviceId: 'device-002', name: 'My Phone', type: 'android' }),
      ]

      render(<ChildDeviceList devices={devices} />)

      expect(screen.getByText('My Chromebook')).toBeInTheDocument()
      expect(screen.getByText('My Phone')).toBeInTheDocument()
      expect(screen.getByText('2 devices being monitored')).toBeInTheDocument()
    })

    it('shows empty state when no devices', () => {
      render(<ChildDeviceList devices={[]} />)

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      expect(screen.getByText('No Devices Yet')).toBeInTheDocument()
      expect(screen.getByText(/When your parent adds a device/)).toBeInTheDocument()
    })

    it('shows loading state', () => {
      render(<ChildDeviceList devices={[]} loading={true} />)

      const container = screen.getByTestId('child-device-list')
      expect(container).toHaveStyle({ opacity: '0.6' })
    })

    it('shows error state', () => {
      render(<ChildDeviceList devices={[]} error="Failed to load devices" />)

      expect(screen.getByTestId('child-device-list-error')).toBeInTheDocument()
      expect(screen.getByText('Failed to load devices')).toBeInTheDocument()
    })
  })

  describe('AC2: Device Details', () => {
    it('shows device name', () => {
      const devices = [createMockDevice({ name: 'School Chromebook' })]

      render(<ChildDeviceList devices={devices} />)

      expect(screen.getByText('School Chromebook')).toBeInTheDocument()
    })

    it('shows last capture time', () => {
      const devices = [
        createMockDevice({
          lastScreenshotAt: new Date('2024-01-15T10:30:00'),
        }),
      ]

      render(<ChildDeviceList devices={devices} />)

      expect(screen.getByText(/Last capture:/)).toBeInTheDocument()
    })

    it('shows "No captures yet" when no screenshots', () => {
      const devices = [createMockDevice({ lastScreenshotAt: null })]

      render(<ChildDeviceList devices={devices} />)

      expect(screen.getByText('No captures yet')).toBeInTheDocument()
    })

    it('shows correct device icon for chromebook', () => {
      const devices = [createMockDevice({ type: 'chromebook' })]

      render(<ChildDeviceList devices={devices} />)

      expect(screen.getByText('💻')).toBeInTheDocument()
    })

    it('shows correct device icon for android', () => {
      const devices = [createMockDevice({ type: 'android' })]

      render(<ChildDeviceList devices={devices} />)

      expect(screen.getByText('📱')).toBeInTheDocument()
    })
  })

  describe('AC3: Status Transparency', () => {
    it('shows Online status for recently synced device', () => {
      const devices = [
        createMockDevice({
          status: 'active',
          lastSeen: new Date(), // Just now
        }),
      ]

      render(<ChildDeviceList devices={devices} />)

      expect(screen.getByText('Online')).toBeInTheDocument()
    })

    it('shows Warning status for device not synced in hours', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
      const devices = [
        createMockDevice({
          status: 'active',
          lastSeen: twoHoursAgo,
        }),
      ]

      render(<ChildDeviceList devices={devices} />)

      expect(screen.getByText('Warning')).toBeInTheDocument()
    })

    it('shows Issue status for device not synced in days', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      const devices = [
        createMockDevice({
          status: 'active',
          lastSeen: twoDaysAgo,
        }),
      ]

      render(<ChildDeviceList devices={devices} />)

      expect(screen.getByText('Issue')).toBeInTheDocument()
    })

    it('shows Offline status for offline device', () => {
      const devices = [
        createMockDevice({
          status: 'offline',
          lastSeen: new Date(),
        }),
      ]

      render(<ChildDeviceList devices={devices} />)

      expect(screen.getByText('Offline')).toBeInTheDocument()
    })

    it('has status indicator with correct test id', () => {
      const devices = [createMockDevice()]

      render(<ChildDeviceList devices={devices} />)

      expect(screen.getByTestId('status-indicator')).toBeInTheDocument()
    })
  })

  describe('AC4: Read-Only Access', () => {
    it('does NOT render remove button', () => {
      const devices = [createMockDevice()]

      render(<ChildDeviceList devices={devices} />)

      expect(screen.queryByText(/remove/i)).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    })

    it('does NOT render any action buttons on device card', () => {
      const devices = [createMockDevice()]

      render(<ChildDeviceList devices={devices} />)

      const deviceCard = screen.getByTestId('device-card')
      const buttons = deviceCard.querySelectorAll('button')
      expect(buttons.length).toBe(0)
    })
  })

  describe('AC5: Capture History Link', () => {
    it('calls onDeviceClick when device card is clicked', () => {
      const onDeviceClick = vi.fn()
      const devices = [createMockDevice({ deviceId: 'device-123' })]

      render(<ChildDeviceList devices={devices} onDeviceClick={onDeviceClick} />)

      fireEvent.click(screen.getByTestId('device-card'))

      expect(onDeviceClick).toHaveBeenCalledWith('device-123')
    })

    it('supports keyboard navigation with Enter', () => {
      const onDeviceClick = vi.fn()
      const devices = [createMockDevice({ deviceId: 'device-123' })]

      render(<ChildDeviceList devices={devices} onDeviceClick={onDeviceClick} />)

      const deviceCard = screen.getByTestId('device-card')
      fireEvent.keyDown(deviceCard, { key: 'Enter' })

      expect(onDeviceClick).toHaveBeenCalledWith('device-123')
    })

    it('supports keyboard navigation with Space', () => {
      const onDeviceClick = vi.fn()
      const devices = [createMockDevice({ deviceId: 'device-123' })]

      render(<ChildDeviceList devices={devices} onDeviceClick={onDeviceClick} />)

      const deviceCard = screen.getByTestId('device-card')
      fireEvent.keyDown(deviceCard, { key: ' ' })

      expect(onDeviceClick).toHaveBeenCalledWith('device-123')
    })

    it('device card is focusable', () => {
      const devices = [createMockDevice()]

      render(<ChildDeviceList devices={devices} />)

      const deviceCard = screen.getByTestId('device-card')
      expect(deviceCard).toHaveAttribute('tabIndex', '0')
    })

    it('device card has accessible label', () => {
      const devices = [createMockDevice({ name: 'My Chromebook' })]

      render(<ChildDeviceList devices={devices} />)

      const deviceCard = screen.getByTestId('device-card')
      expect(deviceCard).toHaveAttribute('aria-label')
      expect(deviceCard.getAttribute('aria-label')).toContain('My Chromebook')
    })

    it('shows chevron indicator for clickable cards', () => {
      const devices = [createMockDevice()]

      render(<ChildDeviceList devices={devices} />)

      expect(screen.getByText('›')).toBeInTheDocument()
    })
  })

  describe('AC6: Crisis Resources', () => {
    it('shows "Need help?" link', () => {
      render(<ChildDeviceList devices={[]} />)

      expect(screen.getByTestId('help-link')).toBeInTheDocument()
      expect(screen.getByText(/Need help\?/)).toBeInTheDocument()
    })

    it('help link has correct href', () => {
      render(<ChildDeviceList devices={[]} />)

      const helpLink = screen.getByTestId('help-link')
      expect(helpLink).toHaveAttribute('href', '/child/help')
    })

    it('help link is visible with devices', () => {
      const devices = [createMockDevice()]

      render(<ChildDeviceList devices={devices} />)

      expect(screen.getByTestId('help-link')).toBeInTheDocument()
    })

    it('help link contains supportive message', () => {
      render(<ChildDeviceList devices={[]} />)

      expect(screen.getByText(/Talk to a trusted adult/)).toBeInTheDocument()
    })
  })

  describe('Sorting and Display', () => {
    it('sorts active devices before inactive', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      const devices = [
        createMockDevice({
          deviceId: 'inactive-device',
          name: 'Inactive Device',
          lastSeen: twoDaysAgo,
        }),
        createMockDevice({
          deviceId: 'active-device',
          name: 'Active Device',
          lastSeen: new Date(),
        }),
      ]

      render(<ChildDeviceList devices={devices} />)

      const deviceCards = screen.getAllByTestId('device-card')
      expect(deviceCards[0]).toHaveTextContent('Active Device')
      expect(deviceCards[1]).toHaveTextContent('Inactive Device')
    })

    it('shows singular "device" for one device', () => {
      const devices = [createMockDevice()]

      render(<ChildDeviceList devices={devices} />)

      expect(screen.getByText('1 device being monitored')).toBeInTheDocument()
    })

    it('shows plural "devices" for multiple devices', () => {
      const devices = [
        createMockDevice({ deviceId: 'device-1' }),
        createMockDevice({ deviceId: 'device-2' }),
        createMockDevice({ deviceId: 'device-3' }),
      ]

      render(<ChildDeviceList devices={devices} />)

      expect(screen.getByText('3 devices being monitored')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('device list has role="list"', () => {
      const devices = [createMockDevice()]

      render(<ChildDeviceList devices={devices} />)

      expect(screen.getByRole('list')).toBeInTheDocument()
    })

    it('device cards have role="listitem"', () => {
      const devices = [createMockDevice()]

      render(<ChildDeviceList devices={devices} />)

      expect(screen.getByRole('listitem')).toBeInTheDocument()
    })

    it('header shows "My Devices" title', () => {
      render(<ChildDeviceList devices={[]} />)

      expect(screen.getByText('My Devices')).toBeInTheDocument()
    })
  })
})
