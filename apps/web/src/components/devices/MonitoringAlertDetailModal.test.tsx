/**
 * Tests for MonitoringAlertDetailModal component
 *
 * Story 19.5: Monitoring Disabled Alert (AC: #3)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MonitoringAlertDetailModal } from './MonitoringAlertDetailModal'
import { Device } from '../../hooks/useDevices'

// Mock device data
const createMockDevice = (overrides: Partial<Device> = {}): Device => ({
  deviceId: 'device-123',
  type: 'chromebook',
  enrolledAt: new Date('2024-01-01'),
  enrolledBy: 'user-123',
  childId: 'child-123',
  name: 'Test Device',
  lastSeen: new Date('2024-01-15T10:30:00Z'),
  lastScreenshotAt: new Date('2024-01-15'),
  status: 'unenrolled',
  metadata: {
    platform: 'chromebook',
    userAgent: 'Chrome Extension',
    enrollmentRequestId: 'request-123',
  },
  ...overrides,
})

describe('MonitoringAlertDetailModal', () => {
  const mockOnClose = vi.fn()
  const mockOnReEnroll = vi.fn()
  const mockOnRemoveDevice = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the modal with device name in title', () => {
      const device = createMockDevice({ name: 'Emma Chromebook' })

      render(<MonitoringAlertDetailModal device={device} onClose={mockOnClose} />)

      // Use the title element specifically
      const title = screen.getByRole('heading', { level: 2 })
      expect(title).toHaveTextContent(/monitoring stopped/i)
      expect(title).toHaveTextContent(/Emma Chromebook/i)
    })

    it('displays what changed section', () => {
      const device = createMockDevice()

      render(<MonitoringAlertDetailModal device={device} onClose={mockOnClose} />)

      expect(screen.getByText(/what happened/i)).toBeInTheDocument()
      // Check the section content specifically
      expect(screen.getByText(/the extension may have been disabled/i)).toBeInTheDocument()
    })

    it('displays when it happened with timestamp', () => {
      const device = createMockDevice({
        lastSeen: new Date('2024-01-15T10:30:00Z'),
      })

      render(<MonitoringAlertDetailModal device={device} onClose={mockOnClose} />)

      expect(screen.getByText(/when/i)).toBeInTheDocument()
      // Should show the last seen time
      expect(screen.getByTestId('when-timestamp')).toBeInTheDocument()
    })

    it('displays possible reasons', () => {
      const device = createMockDevice()

      render(<MonitoringAlertDetailModal device={device} onClose={mockOnClose} />)

      expect(screen.getByText(/possible reasons/i)).toBeInTheDocument()
      // Check specific list items - use exact text to avoid duplicate matches
      expect(screen.getByText('Extension was disabled in browser settings')).toBeInTheDocument()
      expect(screen.getByText('Extension was uninstalled')).toBeInTheDocument()
      expect(screen.getByText('Browser permissions were revoked')).toBeInTheDocument()
    })

    it('displays suggested actions', () => {
      const device = createMockDevice()

      render(<MonitoringAlertDetailModal device={device} onClose={mockOnClose} />)

      expect(screen.getByText(/suggested actions/i)).toBeInTheDocument()
      expect(screen.getByText(/check if the extension/i)).toBeInTheDocument()
    })

    it('renders Re-enroll Device button when onReEnroll provided', () => {
      const device = createMockDevice()

      render(
        <MonitoringAlertDetailModal
          device={device}
          onClose={mockOnClose}
          onReEnroll={mockOnReEnroll}
        />
      )

      expect(screen.getByRole('button', { name: /re-enroll device/i })).toBeInTheDocument()
    })

    it('renders Remove Device button when onRemoveDevice provided', () => {
      const device = createMockDevice()

      render(
        <MonitoringAlertDetailModal
          device={device}
          onClose={mockOnClose}
          onRemoveDevice={mockOnRemoveDevice}
        />
      )

      expect(screen.getByRole('button', { name: /remove device/i })).toBeInTheDocument()
    })

    it('does not render action buttons if callbacks not provided', () => {
      const device = createMockDevice()

      render(<MonitoringAlertDetailModal device={device} onClose={mockOnClose} />)

      expect(screen.queryByRole('button', { name: /re-enroll device/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /remove device/i })).not.toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onClose when close button is clicked', () => {
      const device = createMockDevice()

      render(<MonitoringAlertDetailModal device={device} onClose={mockOnClose} />)

      fireEvent.click(screen.getByTestId('alert-modal-close'))
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when backdrop is clicked', () => {
      const device = createMockDevice()

      render(<MonitoringAlertDetailModal device={device} onClose={mockOnClose} />)

      fireEvent.click(screen.getByTestId('alert-modal-backdrop'))
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('does not close when modal content is clicked', () => {
      const device = createMockDevice()

      render(<MonitoringAlertDetailModal device={device} onClose={mockOnClose} />)

      fireEvent.click(screen.getByTestId('alert-modal'))
      expect(mockOnClose).not.toHaveBeenCalled()
    })

    it('calls onReEnroll when Re-enroll Device button is clicked', () => {
      const device = createMockDevice()

      render(
        <MonitoringAlertDetailModal
          device={device}
          onClose={mockOnClose}
          onReEnroll={mockOnReEnroll}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /re-enroll device/i }))
      expect(mockOnReEnroll).toHaveBeenCalledTimes(1)
    })

    it('calls onRemoveDevice when Remove Device button is clicked', () => {
      const device = createMockDevice()

      render(
        <MonitoringAlertDetailModal
          device={device}
          onClose={mockOnClose}
          onRemoveDevice={mockOnRemoveDevice}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /remove device/i }))
      expect(mockOnRemoveDevice).toHaveBeenCalledTimes(1)
    })
  })

  describe('accessibility', () => {
    it('has proper ARIA dialog role', () => {
      const device = createMockDevice()

      render(<MonitoringAlertDetailModal device={device} onClose={mockOnClose} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('has proper aria-labelledby for the title', () => {
      const device = createMockDevice()

      render(<MonitoringAlertDetailModal device={device} onClose={mockOnClose} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby', 'alert-modal-title')
    })

    it('close button has aria-label', () => {
      const device = createMockDevice()

      render(<MonitoringAlertDetailModal device={device} onClose={mockOnClose} />)

      expect(screen.getByTestId('alert-modal-close')).toHaveAttribute('aria-label', 'Close')
    })

    it('is keyboard accessible via Escape key', () => {
      const device = createMockDevice()

      render(<MonitoringAlertDetailModal device={device} onClose={mockOnClose} />)

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('styling', () => {
    it('has modal overlay styling', () => {
      const device = createMockDevice()

      render(<MonitoringAlertDetailModal device={device} onClose={mockOnClose} />)

      const backdrop = screen.getByTestId('alert-modal-backdrop')
      expect(backdrop).toHaveStyle({ position: 'fixed' })
    })

    it('has warning/alert visual styling', () => {
      const device = createMockDevice()

      render(<MonitoringAlertDetailModal device={device} onClose={mockOnClose} />)

      // Check for warning icon
      expect(screen.getByTestId('alert-warning-icon')).toBeInTheDocument()
    })
  })
})
