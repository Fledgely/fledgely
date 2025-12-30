/**
 * Tests for MonitoringDisabledBanner component
 *
 * Story 19.5: Monitoring Disabled Alert (AC: #2)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MonitoringDisabledBanner } from './MonitoringDisabledBanner'
import { Device } from '../../hooks/useDevices'

// Mock device data
const createMockDevice = (overrides: Partial<Device> = {}): Device => ({
  deviceId: 'device-123',
  type: 'chromebook',
  enrolledAt: new Date('2024-01-01'),
  enrolledBy: 'user-123',
  childId: 'child-123',
  name: 'Test Device',
  lastSeen: new Date('2024-01-15'),
  lastScreenshotAt: new Date('2024-01-15'),
  status: 'unenrolled',
  metadata: {
    platform: 'chromebook',
    userAgent: 'Chrome Extension',
    enrollmentRequestId: 'request-123',
  },
  ...overrides,
})

describe('MonitoringDisabledBanner', () => {
  const mockOnViewDetails = vi.fn()
  const mockOnReEnroll = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the banner with device name', () => {
      const device = createMockDevice({ name: 'Emma Chromebook' })

      render(<MonitoringDisabledBanner device={device} onViewDetails={mockOnViewDetails} />)

      expect(screen.getByText(/monitoring stopped/i)).toBeInTheDocument()
      expect(screen.getByText(/Emma Chromebook/i)).toBeInTheDocument()
    })

    it('renders with prominent red styling', () => {
      const device = createMockDevice()

      render(<MonitoringDisabledBanner device={device} onViewDetails={mockOnViewDetails} />)

      const banner = screen.getByTestId('monitoring-disabled-banner')
      expect(banner).toHaveStyle({ backgroundColor: '#fee2e2' })
    })

    it('renders warning icon', () => {
      const device = createMockDevice()

      render(<MonitoringDisabledBanner device={device} onViewDetails={mockOnViewDetails} />)

      expect(screen.getByTestId('warning-icon')).toBeInTheDocument()
    })

    it('renders View Details button', () => {
      const device = createMockDevice()

      render(<MonitoringDisabledBanner device={device} onViewDetails={mockOnViewDetails} />)

      expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onViewDetails when View Details button is clicked', () => {
      const device = createMockDevice()

      render(<MonitoringDisabledBanner device={device} onViewDetails={mockOnViewDetails} />)

      fireEvent.click(screen.getByRole('button', { name: /view details/i }))
      expect(mockOnViewDetails).toHaveBeenCalledTimes(1)
    })

    it('calls onReEnroll when Re-enroll button is clicked if provided', () => {
      const device = createMockDevice()

      render(
        <MonitoringDisabledBanner
          device={device}
          onViewDetails={mockOnViewDetails}
          onReEnroll={mockOnReEnroll}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /re-enroll/i }))
      expect(mockOnReEnroll).toHaveBeenCalledTimes(1)
    })

    it('does not render Re-enroll button if onReEnroll is not provided', () => {
      const device = createMockDevice()

      render(<MonitoringDisabledBanner device={device} onViewDetails={mockOnViewDetails} />)

      expect(screen.queryByRole('button', { name: /re-enroll/i })).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has proper ARIA role for alert', () => {
      const device = createMockDevice()

      render(<MonitoringDisabledBanner device={device} onViewDetails={mockOnViewDetails} />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('buttons are keyboard accessible (focusable and have proper button role)', () => {
      const device = createMockDevice()

      render(
        <MonitoringDisabledBanner
          device={device}
          onViewDetails={mockOnViewDetails}
          onReEnroll={vi.fn()}
        />
      )

      // Both buttons should be focusable
      const viewDetailsButton = screen.getByRole('button', { name: /view details/i })
      const reEnrollButton = screen.getByRole('button', { name: /re-enroll/i })

      // Verify buttons can receive focus
      viewDetailsButton.focus()
      expect(document.activeElement).toBe(viewDetailsButton)

      reEnrollButton.focus()
      expect(document.activeElement).toBe(reEnrollButton)

      // Native buttons handle Enter/Space natively, so click works for keyboard activation
      fireEvent.click(viewDetailsButton)
      expect(mockOnViewDetails).toHaveBeenCalled()
    })
  })
})
