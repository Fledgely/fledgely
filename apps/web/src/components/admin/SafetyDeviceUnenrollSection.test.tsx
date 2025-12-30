/**
 * SafetyDeviceUnenrollSection Component Tests
 *
 * Story 0.5.5: Remote Device Unenrollment
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SafetyDeviceUnenrollSection, type VerificationStatus } from './SafetyDeviceUnenrollSection'

// Mock the hooks
const mockFetchDevices = vi.fn()
const mockUnenrollDevices = vi.fn()

vi.mock('../../hooks/useDevicesForFamily', () => ({
  useDevicesForFamily: vi.fn(() => ({
    loading: false,
    error: null,
    devices: [
      {
        deviceId: 'device-1',
        name: 'Chrome Laptop',
        type: 'chromebook',
        childId: 'child-1',
        lastSeen: Date.now() - 60000,
        status: 'active',
      },
      {
        deviceId: 'device-2',
        name: 'Android Tablet',
        type: 'android',
        childId: null,
        lastSeen: null,
        status: 'offline',
      },
    ],
    familyId: 'family-123',
    familyName: 'Test Family',
    fetchDevices: mockFetchDevices,
    clearError: vi.fn(),
  })),
}))

vi.mock('../../hooks/useUnenrollDevices', () => ({
  useUnenrollDevices: vi.fn(() => ({
    loading: false,
    error: null,
    unenrollDevices: mockUnenrollDevices,
    clearError: vi.fn(),
  })),
}))

describe('SafetyDeviceUnenrollSection', () => {
  const defaultVerificationStatus: VerificationStatus = {
    phoneVerified: true,
    idDocumentVerified: true,
    accountMatchVerified: false,
    securityQuestionsVerified: false,
  }

  const defaultProps = {
    ticketId: 'ticket-123',
    verificationStatus: defaultVerificationStatus,
    onSuccess: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchDevices.mockResolvedValue({
      familyId: 'family-123',
      familyName: 'Test Family',
      devices: [],
    })
    mockUnenrollDevices.mockResolvedValue({
      success: true,
      message: 'Devices unenrolled',
      unenrolledCount: 1,
      skippedCount: 0,
    })
  })

  describe('rendering', () => {
    it('renders section title', () => {
      render(<SafetyDeviceUnenrollSection {...defaultProps} />)
      expect(screen.getByText('Device Unenrollment')).toBeInTheDocument()
    })

    it('renders family name', () => {
      render(<SafetyDeviceUnenrollSection {...defaultProps} />)
      expect(screen.getByText('Family: Test Family')).toBeInTheDocument()
    })

    it('renders device list as table', () => {
      render(<SafetyDeviceUnenrollSection {...defaultProps} />)
      expect(screen.getByText('Chrome Laptop')).toBeInTheDocument()
      expect(screen.getByText('Android Tablet')).toBeInTheDocument()
    })

    it('displays device type', () => {
      render(<SafetyDeviceUnenrollSection {...defaultProps} />)
      expect(screen.getByText('chromebook')).toBeInTheDocument()
      expect(screen.getByText('android')).toBeInTheDocument()
    })

    it('displays device status badges', () => {
      render(<SafetyDeviceUnenrollSection {...defaultProps} />)
      expect(screen.getByText('active')).toBeInTheDocument()
      expect(screen.getByText('offline')).toBeInTheDocument()
    })

    it('displays child assignment status', () => {
      render(<SafetyDeviceUnenrollSection {...defaultProps} />)
      expect(screen.getByText('Assigned')).toBeInTheDocument()
      expect(screen.getByText('Unassigned')).toBeInTheDocument()
    })
  })

  describe('device selection', () => {
    it('renders checkboxes for each device', () => {
      render(<SafetyDeviceUnenrollSection {...defaultProps} />)
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBeGreaterThanOrEqual(2)
    })

    it('allows selecting individual devices', () => {
      render(<SafetyDeviceUnenrollSection {...defaultProps} />)
      const checkbox = screen.getByLabelText('Select Chrome Laptop')
      fireEvent.click(checkbox)
      expect(checkbox).toBeChecked()
    })

    it('allows multi-select', () => {
      render(<SafetyDeviceUnenrollSection {...defaultProps} />)
      const checkbox1 = screen.getByLabelText('Select Chrome Laptop')
      const checkbox2 = screen.getByLabelText('Select Android Tablet')

      fireEvent.click(checkbox1)
      fireEvent.click(checkbox2)

      expect(checkbox1).toBeChecked()
      expect(checkbox2).toBeChecked()
    })

    it('has Select All button', () => {
      render(<SafetyDeviceUnenrollSection {...defaultProps} />)
      expect(screen.getByText('Select All')).toBeInTheDocument()
    })

    it('has Clear button', () => {
      render(<SafetyDeviceUnenrollSection {...defaultProps} />)
      expect(screen.getByText('Clear')).toBeInTheDocument()
    })

    it('shows selection count', () => {
      render(<SafetyDeviceUnenrollSection {...defaultProps} />)
      const checkbox = screen.getByLabelText('Select Chrome Laptop')
      fireEvent.click(checkbox)
      expect(screen.getByText('1 device(s) selected')).toBeInTheDocument()
    })
  })

  describe('unenroll button', () => {
    it('renders unenroll button', () => {
      render(<SafetyDeviceUnenrollSection {...defaultProps} />)
      expect(screen.getByText(/Unenroll Selected Devices/)).toBeInTheDocument()
    })

    it('button is disabled when no devices selected', () => {
      render(<SafetyDeviceUnenrollSection {...defaultProps} />)
      const button = screen.getByText(/Unenroll Selected Devices/)
      expect(button).toBeDisabled()
    })

    it('button is enabled when devices are selected', () => {
      render(<SafetyDeviceUnenrollSection {...defaultProps} />)
      const checkbox = screen.getByLabelText('Select Chrome Laptop')
      fireEvent.click(checkbox)
      const button = screen.getByText(/Unenroll Selected Devices/)
      expect(button).not.toBeDisabled()
    })

    it('shows confirmation when button is clicked', async () => {
      render(<SafetyDeviceUnenrollSection {...defaultProps} />)
      const checkbox = screen.getByLabelText('Select Chrome Laptop')
      fireEvent.click(checkbox)
      const button = screen.getByText(/Unenroll Selected Devices/)
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText(/Are you sure/)).toBeInTheDocument()
      })
    })
  })

  describe('confirmation flow', () => {
    it('shows confirmation message with device count', async () => {
      render(<SafetyDeviceUnenrollSection {...defaultProps} />)
      const checkbox = screen.getByLabelText('Select Chrome Laptop')
      fireEvent.click(checkbox)
      fireEvent.click(screen.getByText(/Unenroll Selected Devices/))

      await waitFor(() => {
        expect(screen.getByText(/Are you sure/)).toBeInTheDocument()
      })
    })

    it('has Cancel button in confirmation', async () => {
      render(<SafetyDeviceUnenrollSection {...defaultProps} />)
      const checkbox = screen.getByLabelText('Select Chrome Laptop')
      fireEvent.click(checkbox)
      fireEvent.click(screen.getByText(/Unenroll Selected Devices/))

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument()
      })
    })

    it('has Confirm Unenrollment button', async () => {
      render(<SafetyDeviceUnenrollSection {...defaultProps} />)
      const checkbox = screen.getByLabelText('Select Chrome Laptop')
      fireEvent.click(checkbox)
      fireEvent.click(screen.getByText(/Unenroll Selected Devices/))

      await waitFor(() => {
        expect(screen.getByText('Confirm Unenrollment')).toBeInTheDocument()
      })
    })

    it('calls unenrollDevices on confirm', async () => {
      render(<SafetyDeviceUnenrollSection {...defaultProps} />)
      const checkbox = screen.getByLabelText('Select Chrome Laptop')
      fireEvent.click(checkbox)
      fireEvent.click(screen.getByText(/Unenroll Selected Devices/))

      await waitFor(() => {
        const confirmButton = screen.getByText('Confirm Unenrollment')
        fireEvent.click(confirmButton)
      })

      await waitFor(() => {
        expect(mockUnenrollDevices).toHaveBeenCalledWith({
          ticketId: 'ticket-123',
          familyId: 'family-123',
          deviceIds: ['device-1'],
        })
      })
    })
  })

  describe('verification threshold', () => {
    it('enables selection when verification count is 2+', () => {
      render(<SafetyDeviceUnenrollSection {...defaultProps} />)
      const checkbox = screen.getByLabelText('Select Chrome Laptop')
      expect(checkbox).not.toBeDisabled()
    })

    it('disables selection when verification count is below 2', () => {
      const lowVerification: VerificationStatus = {
        phoneVerified: true,
        idDocumentVerified: false,
        accountMatchVerified: false,
        securityQuestionsVerified: false,
      }
      render(<SafetyDeviceUnenrollSection {...defaultProps} verificationStatus={lowVerification} />)
      const checkbox = screen.getByLabelText('Select Chrome Laptop')
      expect(checkbox).toBeDisabled()
    })

    it('shows warning when verification count is below 2', () => {
      const lowVerification: VerificationStatus = {
        phoneVerified: true,
        idDocumentVerified: false,
        accountMatchVerified: false,
        securityQuestionsVerified: false,
      }
      render(<SafetyDeviceUnenrollSection {...defaultProps} verificationStatus={lowVerification} />)
      expect(screen.getByText(/Minimum 2 verification checks required/)).toBeInTheDocument()
    })
  })

  describe('loading and error states', () => {
    it('fetches devices on mount', () => {
      render(<SafetyDeviceUnenrollSection {...defaultProps} />)
      expect(mockFetchDevices).toHaveBeenCalledWith('ticket-123')
    })
  })

  describe('accessibility', () => {
    it('checkboxes have accessible labels', () => {
      render(<SafetyDeviceUnenrollSection {...defaultProps} />)
      expect(screen.getByLabelText('Select Chrome Laptop')).toBeInTheDocument()
      expect(screen.getByLabelText('Select Android Tablet')).toBeInTheDocument()
    })

    it('table has proper structure', () => {
      render(<SafetyDeviceUnenrollSection {...defaultProps} />)
      expect(screen.getByRole('table')).toBeInTheDocument()
    })
  })
})
