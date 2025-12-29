/**
 * EmergencyCodeModal Tests - Story 13.2 Task 3.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { EmergencyCodeModal } from './EmergencyCodeModal'

// Mock the TOTP utils
vi.mock('../../lib/totp-utils', () => ({
  generateTotpCode: vi.fn(() => Promise.resolve('123456')),
  getTotpRemainingSeconds: vi.fn(() => 25),
  TOTP_PERIOD_SECONDS: 30,
}))

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn(() => Promise.resolve()),
}
Object.defineProperty(navigator, 'clipboard', {
  value: mockClipboard,
  writable: true,
})

describe('EmergencyCodeModal - Story 13.2', () => {
  const mockOnClose = vi.fn()
  const testSecret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <EmergencyCodeModal
          secret={testSecret}
          deviceName="Test Device"
          isOpen={false}
          onClose={mockOnClose}
        />
      )

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should render when isOpen is true', async () => {
      render(
        <EmergencyCodeModal
          secret={testSecret}
          deviceName="Test Device"
          isOpen={true}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Emergency Unlock Code')).toBeInTheDocument()
      expect(screen.getByText('Test Device')).toBeInTheDocument()
    })

    it('should show device name', async () => {
      render(
        <EmergencyCodeModal
          secret={testSecret}
          deviceName="Chromebook ABC"
          isOpen={true}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText('Chromebook ABC')).toBeInTheDocument()
    })
  })

  describe('AC2: TOTP Code Display', () => {
    it('should display 6-digit code with space separator', async () => {
      render(
        <EmergencyCodeModal
          secret={testSecret}
          deviceName="Test Device"
          isOpen={true}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        // Code is split with space: "123 456"
        expect(screen.getByText(/123/)).toBeInTheDocument()
      })
    })
  })

  describe('AC3: Countdown Timer', () => {
    it('should display countdown timer', async () => {
      render(
        <EmergencyCodeModal
          secret={testSecret}
          deviceName="Test Device"
          isOpen={true}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Code expires in')).toBeInTheDocument()
        expect(screen.getByText(/\d+ seconds/)).toBeInTheDocument()
      })
    })
  })

  describe('AC6: Copy to Clipboard', () => {
    it('should copy code when Copy button is clicked', async () => {
      render(
        <EmergencyCodeModal
          secret={testSecret}
          deviceName="Test Device"
          isOpen={true}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Copy Code')).toBeInTheDocument()
      })

      await act(async () => {
        fireEvent.click(screen.getByText('Copy Code'))
      })

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith('123456')
        expect(screen.getByText('Copied!')).toBeInTheDocument()
      })
    })
  })

  describe('Modal Behavior', () => {
    it('should call onClose when Close button is clicked', async () => {
      render(
        <EmergencyCodeModal
          secret={testSecret}
          deviceName="Test Device"
          isOpen={true}
          onClose={mockOnClose}
        />
      )

      fireEvent.click(screen.getByText('Close'))
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should call onClose when clicking overlay', async () => {
      render(
        <EmergencyCodeModal
          secret={testSecret}
          deviceName="Test Device"
          isOpen={true}
          onClose={mockOnClose}
        />
      )

      const dialog = screen.getByRole('dialog')
      fireEvent.click(dialog)
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should call onClose when Escape is pressed', async () => {
      render(
        <EmergencyCodeModal
          secret={testSecret}
          deviceName="Test Device"
          isOpen={true}
          onClose={mockOnClose}
        />
      )

      fireEvent.keyDown(window, { key: 'Escape' })
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Warning Message', () => {
    it('should display security warning', async () => {
      render(
        <EmergencyCodeModal
          secret={testSecret}
          deviceName="Test Device"
          isOpen={true}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText(/Only share this code with your child/)).toBeInTheDocument()
    })
  })
})
