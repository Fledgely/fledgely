/**
 * SafetyLocationDisableSection Component Tests
 *
 * Story 0.5.6: Location Feature Emergency Disable
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import {
  SafetyLocationDisableSection,
  type VerificationStatus,
} from './SafetyLocationDisableSection'

// Mock the hook
const mockDisableLocationFeatures = vi.fn()

vi.mock('../../hooks/useDisableLocationFeatures', () => ({
  useDisableLocationFeatures: vi.fn(() => ({
    loading: false,
    error: null,
    disableLocationFeatures: mockDisableLocationFeatures,
    clearError: vi.fn(),
  })),
}))

describe('SafetyLocationDisableSection', () => {
  const defaultVerificationStatus: VerificationStatus = {
    phoneVerified: true,
    idDocumentVerified: true,
    accountMatchVerified: false,
    securityQuestionsVerified: false,
  }

  const defaultProps = {
    ticketId: 'ticket-123',
    familyId: 'family-123',
    verificationStatus: defaultVerificationStatus,
    onSuccess: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockDisableLocationFeatures.mockResolvedValue({
      success: true,
      message: 'Location features disabled',
      featuresDisabledCount: 3,
      notificationsDeleted: 0,
    })
  })

  describe('rendering', () => {
    it('renders section title', () => {
      render(<SafetyLocationDisableSection {...defaultProps} />)
      expect(screen.getByText('Location Feature Disable')).toBeInTheDocument()
    })

    it('renders feature list', () => {
      render(<SafetyLocationDisableSection {...defaultProps} />)
      expect(screen.getByText('FR139')).toBeInTheDocument()
      expect(screen.getByText('FR145')).toBeInTheDocument()
      expect(screen.getByText('FR160')).toBeInTheDocument()
    })

    it('renders feature names', () => {
      render(<SafetyLocationDisableSection {...defaultProps} />)
      expect(screen.getByText('Location-based rules')).toBeInTheDocument()
      expect(screen.getByText('Location-based work mode')).toBeInTheDocument()
      expect(screen.getByText('New location alerts')).toBeInTheDocument()
    })

    it('renders feature descriptions', () => {
      render(<SafetyLocationDisableSection {...defaultProps} />)
      expect(screen.getByText(/Rules that vary based on device location/)).toBeInTheDocument()
      expect(screen.getByText(/Automatic work mode activation/)).toBeInTheDocument()
      expect(screen.getByText(/Alerts when account is accessed/)).toBeInTheDocument()
    })

    it('renders disable button', () => {
      render(<SafetyLocationDisableSection {...defaultProps} />)
      expect(screen.getByText('Disable Location Features')).toBeInTheDocument()
    })
  })

  describe('no family handling', () => {
    it('shows no family message when familyId is null', () => {
      render(<SafetyLocationDisableSection {...defaultProps} familyId={null} />)
      expect(screen.getByText('No family associated with this ticket.')).toBeInTheDocument()
    })
  })

  describe('verification threshold', () => {
    it('enables button when verification count is 2+', () => {
      render(<SafetyLocationDisableSection {...defaultProps} />)
      const button = screen.getByText('Disable Location Features')
      expect(button).not.toBeDisabled()
    })

    it('disables button when verification count is below 2', () => {
      const lowVerification: VerificationStatus = {
        phoneVerified: true,
        idDocumentVerified: false,
        accountMatchVerified: false,
        securityQuestionsVerified: false,
      }
      render(
        <SafetyLocationDisableSection {...defaultProps} verificationStatus={lowVerification} />
      )
      const button = screen.getByText('Disable Location Features')
      expect(button).toBeDisabled()
    })

    it('shows warning when verification count is below 2', () => {
      const lowVerification: VerificationStatus = {
        phoneVerified: true,
        idDocumentVerified: false,
        accountMatchVerified: false,
        securityQuestionsVerified: false,
      }
      render(
        <SafetyLocationDisableSection {...defaultProps} verificationStatus={lowVerification} />
      )
      expect(screen.getByText(/Minimum 2 verification checks required/)).toBeInTheDocument()
    })
  })

  describe('confirmation flow', () => {
    it('shows confirmation when button is clicked', async () => {
      render(<SafetyLocationDisableSection {...defaultProps} />)
      const button = screen.getByText('Disable Location Features')
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText(/Are you sure/)).toBeInTheDocument()
      })
    })

    it('has Cancel button in confirmation', async () => {
      render(<SafetyLocationDisableSection {...defaultProps} />)
      const button = screen.getByText('Disable Location Features')
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument()
      })
    })

    it('has Confirm Disable button', async () => {
      render(<SafetyLocationDisableSection {...defaultProps} />)
      const button = screen.getByText('Disable Location Features')
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Confirm Disable')).toBeInTheDocument()
      })
    })

    it('calls disableLocationFeatures on confirm', async () => {
      render(<SafetyLocationDisableSection {...defaultProps} />)
      const button = screen.getByText('Disable Location Features')
      fireEvent.click(button)

      await waitFor(() => {
        const confirmButton = screen.getByText('Confirm Disable')
        fireEvent.click(confirmButton)
      })

      await waitFor(() => {
        expect(mockDisableLocationFeatures).toHaveBeenCalledWith({
          ticketId: 'ticket-123',
          familyId: 'family-123',
          userId: undefined,
        })
      })
    })

    it('hides confirmation when Cancel is clicked', async () => {
      render(<SafetyLocationDisableSection {...defaultProps} />)
      const button = screen.getByText('Disable Location Features')
      fireEvent.click(button)

      await waitFor(() => {
        const cancelButton = screen.getByText('Cancel')
        fireEvent.click(cancelButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Disable Location Features')).toBeInTheDocument()
        expect(screen.queryByText('Confirm Disable')).not.toBeInTheDocument()
      })
    })
  })

  describe('success state', () => {
    it('shows success message after disable', async () => {
      render(<SafetyLocationDisableSection {...defaultProps} />)
      fireEvent.click(screen.getByText('Disable Location Features'))

      await waitFor(() => {
        fireEvent.click(screen.getByText('Confirm Disable'))
      })

      await waitFor(() => {
        expect(screen.getByText(/Location features disabled successfully/)).toBeInTheDocument()
      })
    })

    it('hides feature list after success', async () => {
      render(<SafetyLocationDisableSection {...defaultProps} />)
      fireEvent.click(screen.getByText('Disable Location Features'))

      await waitFor(() => {
        fireEvent.click(screen.getByText('Confirm Disable'))
      })

      await waitFor(() => {
        expect(screen.queryByText('Features that will be disabled:')).not.toBeInTheDocument()
      })
    })

    it('calls onSuccess callback', async () => {
      const onSuccess = vi.fn()
      render(<SafetyLocationDisableSection {...defaultProps} onSuccess={onSuccess} />)
      fireEvent.click(screen.getByText('Disable Location Features'))

      await waitFor(() => {
        fireEvent.click(screen.getByText('Confirm Disable'))
      })

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled()
      })
    })
  })

  describe('accessibility', () => {
    it('buttons have proper text', () => {
      render(<SafetyLocationDisableSection {...defaultProps} />)
      expect(screen.getByText('Disable Location Features')).toBeInTheDocument()
    })

    it('section has proper heading', () => {
      render(<SafetyLocationDisableSection {...defaultProps} />)
      expect(screen.getByRole('heading', { name: 'Location Feature Disable' })).toBeInTheDocument()
    })
  })
})
