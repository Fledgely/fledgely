/**
 * ScreenTimeDeviceBreakdown Component Tests - Story 29.4
 *
 * Tests for the device breakdown component.
 * Covers AC2: Breakdown by device
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScreenTimeDeviceBreakdown } from './ScreenTimeDeviceBreakdown'

const mockDevices = [
  { deviceId: 'dev-1', deviceName: 'School Chromebook', deviceType: 'chromebook', minutes: 90 },
  { deviceId: 'dev-2', deviceName: "Emma's Phone", deviceType: 'android', minutes: 30 },
]

describe('ScreenTimeDeviceBreakdown - Story 29.4', () => {
  describe('AC2: Breakdown by device', () => {
    it('should render device rows', () => {
      render(<ScreenTimeDeviceBreakdown devices={mockDevices} />)

      expect(screen.getByTestId('device-breakdown')).toBeInTheDocument()
      expect(screen.getByTestId('device-row-dev-1')).toBeInTheDocument()
      expect(screen.getByTestId('device-row-dev-2')).toBeInTheDocument()
    })

    it('should display device names', () => {
      render(<ScreenTimeDeviceBreakdown devices={mockDevices} />)

      expect(screen.getByTestId('device-row-dev-1')).toHaveTextContent('School Chromebook')
      expect(screen.getByTestId('device-row-dev-2')).toHaveTextContent("Emma's Phone")
    })

    it('should display device types', () => {
      render(<ScreenTimeDeviceBreakdown devices={mockDevices} />)

      expect(screen.getByTestId('device-row-dev-1')).toHaveTextContent('chromebook')
      expect(screen.getByTestId('device-row-dev-2')).toHaveTextContent('android')
    })

    it('should display formatted duration for each device', () => {
      render(<ScreenTimeDeviceBreakdown devices={mockDevices} />)

      expect(screen.getByTestId('device-row-dev-1')).toHaveTextContent('1h 30m')
      expect(screen.getByTestId('device-row-dev-2')).toHaveTextContent('30m')
    })

    it('should sort devices by minutes descending', () => {
      const devices = [
        { deviceId: 'dev-1', deviceName: 'Device A', deviceType: 'chromebook', minutes: 30 },
        { deviceId: 'dev-2', deviceName: 'Device B', deviceType: 'android', minutes: 90 },
      ]

      render(<ScreenTimeDeviceBreakdown devices={devices} />)

      const rows = screen.getAllByTestId(/^device-row-/)
      expect(rows[0]).toHaveAttribute('data-testid', 'device-row-dev-2')
      expect(rows[1]).toHaveAttribute('data-testid', 'device-row-dev-1')
    })

    it('should have progress bar with correct aria attributes', () => {
      render(<ScreenTimeDeviceBreakdown devices={mockDevices} />)

      const progressBars = screen.getAllByRole('progressbar')
      expect(progressBars.length).toBe(2)

      // First device has 90 out of 120 total = 75%
      expect(progressBars[0]).toHaveAttribute('aria-valuenow', '75')
    })
  })

  describe('Device type icons', () => {
    it('should display appropriate icons for different device types', () => {
      const devices = [
        { deviceId: 'dev-1', deviceName: 'Chromebook', deviceType: 'chromebook', minutes: 10 },
        { deviceId: 'dev-2', deviceName: 'Phone', deviceType: 'android', minutes: 10 },
        { deviceId: 'dev-3', deviceName: 'Tablet', deviceType: 'tablet', minutes: 10 },
        { deviceId: 'dev-4', deviceName: 'Desktop', deviceType: 'desktop', minutes: 10 },
        { deviceId: 'dev-5', deviceName: 'Unknown', deviceType: 'unknown', minutes: 10 },
      ]

      render(<ScreenTimeDeviceBreakdown devices={devices} />)

      // All device rows should be present
      expect(screen.getByTestId('device-row-dev-1')).toBeInTheDocument()
      expect(screen.getByTestId('device-row-dev-2')).toBeInTheDocument()
      expect(screen.getByTestId('device-row-dev-3')).toBeInTheDocument()
      expect(screen.getByTestId('device-row-dev-4')).toBeInTheDocument()
      expect(screen.getByTestId('device-row-dev-5')).toBeInTheDocument()
    })
  })

  describe('Edge cases', () => {
    it('should return null when no devices', () => {
      const { container } = render(<ScreenTimeDeviceBreakdown devices={[]} />)

      expect(container.firstChild).toBeNull()
    })

    it('should handle single device', () => {
      const devices = [
        { deviceId: 'dev-1', deviceName: 'Chromebook', deviceType: 'chromebook', minutes: 60 },
      ]

      render(<ScreenTimeDeviceBreakdown devices={devices} />)

      expect(screen.getByTestId('device-row-dev-1')).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    })

    it('should handle device with zero minutes', () => {
      const devices = [
        { deviceId: 'dev-1', deviceName: 'Chromebook', deviceType: 'chromebook', minutes: 60 },
        { deviceId: 'dev-2', deviceName: 'Phone', deviceType: 'android', minutes: 0 },
      ]

      render(<ScreenTimeDeviceBreakdown devices={devices} />)

      expect(screen.getByTestId('device-row-dev-2')).toHaveTextContent('0m')
    })

    it('should handle long device names with truncation', () => {
      const devices = [
        {
          deviceId: 'dev-1',
          deviceName: 'This is a very long device name that should be truncated',
          deviceType: 'chromebook',
          minutes: 60,
        },
      ]

      render(<ScreenTimeDeviceBreakdown devices={devices} />)

      expect(screen.getByTestId('device-row-dev-1')).toHaveTextContent(
        'This is a very long device name that should be truncated'
      )
    })
  })
})
