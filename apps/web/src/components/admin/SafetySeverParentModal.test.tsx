/**
 * SafetySeverParentModal Component Tests
 *
 * Story 0.5.4: Parent Access Severing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SafetySeverParentModal, type VerificationStatus } from './SafetySeverParentModal'

// Mock the hook
vi.mock('../../hooks/useSeverParentAccess', () => ({
  useSeverParentAccess: vi.fn(() => ({
    severParentAccess: vi.fn().mockResolvedValue({ success: true, message: 'Severed' }),
    loading: false,
    error: null,
  })),
}))

describe('SafetySeverParentModal', () => {
  const defaultVerificationStatus: VerificationStatus = {
    phoneVerified: true,
    idDocumentVerified: true,
    accountMatchVerified: false,
    securityQuestionsVerified: false,
  }

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    ticketId: 'ticket-123',
    family: {
      id: 'family-123',
      name: 'Test Family',
      guardians: [
        { uid: 'parent-1', email: 'parent1@test.com', displayName: 'Parent One', role: 'primary' },
        { uid: 'parent-2', email: 'parent2@test.com', displayName: 'Parent Two', role: 'guardian' },
      ],
    },
    parentToSever: {
      uid: 'parent-2',
      email: 'parent2@test.com',
      displayName: 'Parent Two',
      role: 'guardian',
    },
    verificationStatus: defaultVerificationStatus,
    onSuccess: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders modal when isOpen is true', () => {
      render(<SafetySeverParentModal {...defaultProps} />)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('does not render when isOpen is false', () => {
      render(<SafetySeverParentModal {...defaultProps} isOpen={false} />)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('displays modal title', () => {
      render(<SafetySeverParentModal {...defaultProps} />)
      expect(screen.getByText('Sever Parent Access')).toBeInTheDocument()
    })

    it('displays warning about irreversibility', () => {
      render(<SafetySeverParentModal {...defaultProps} />)
      expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument()
    })

    it('displays family name', () => {
      render(<SafetySeverParentModal {...defaultProps} />)
      expect(screen.getByText('Test Family')).toBeInTheDocument()
    })

    it('displays parent email to sever', () => {
      render(<SafetySeverParentModal {...defaultProps} />)
      expect(screen.getByText('parent2@test.com')).toBeInTheDocument()
    })

    it('displays parent display name', () => {
      render(<SafetySeverParentModal {...defaultProps} />)
      expect(screen.getByText('Parent Two')).toBeInTheDocument()
    })
  })

  describe('verification status display', () => {
    it('shows verification count', () => {
      render(<SafetySeverParentModal {...defaultProps} />)
      expect(screen.getByText('Identity Verification (2/4)')).toBeInTheDocument()
    })

    it('shows phone verification status', () => {
      render(<SafetySeverParentModal {...defaultProps} />)
      expect(screen.getByText('Phone Verification')).toBeInTheDocument()
    })

    it('shows ID document verification status', () => {
      render(<SafetySeverParentModal {...defaultProps} />)
      expect(screen.getByText('ID Document Match')).toBeInTheDocument()
    })

    it('shows account match verification status', () => {
      render(<SafetySeverParentModal {...defaultProps} />)
      expect(screen.getByText('Account Match')).toBeInTheDocument()
    })

    it('shows security questions verification status', () => {
      render(<SafetySeverParentModal {...defaultProps} />)
      expect(screen.getByText('Security Questions')).toBeInTheDocument()
    })

    it('shows warning when less than 2 verifications', () => {
      const lowVerification: VerificationStatus = {
        phoneVerified: true,
        idDocumentVerified: false,
        accountMatchVerified: false,
        securityQuestionsVerified: false,
      }
      render(<SafetySeverParentModal {...defaultProps} verificationStatus={lowVerification} />)
      expect(
        screen.getByText(/Minimum 2 verification checks required before severing/i)
      ).toBeInTheDocument()
    })
  })

  describe('confirmation phrase', () => {
    it('displays expected confirmation phrase', () => {
      render(<SafetySeverParentModal {...defaultProps} />)
      expect(screen.getByText('SEVER parent2@test.com')).toBeInTheDocument()
    })

    it('has confirmation input field', () => {
      render(<SafetySeverParentModal {...defaultProps} />)
      expect(screen.getByPlaceholderText('Type confirmation phrase...')).toBeInTheDocument()
    })

    it('sever button is disabled when phrase does not match', () => {
      render(<SafetySeverParentModal {...defaultProps} />)
      const severButton = screen.getByText('Sever Access')
      expect(severButton).toBeDisabled()
    })

    it('sever button is enabled when phrase matches and verifications met', () => {
      render(<SafetySeverParentModal {...defaultProps} />)
      const input = screen.getByPlaceholderText('Type confirmation phrase...')
      fireEvent.change(input, { target: { value: 'SEVER parent2@test.com' } })
      const severButton = screen.getByText('Sever Access')
      expect(severButton).not.toBeDisabled()
    })
  })

  describe('buttons', () => {
    it('has cancel button', () => {
      render(<SafetySeverParentModal {...defaultProps} />)
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('has sever button', () => {
      render(<SafetySeverParentModal {...defaultProps} />)
      expect(screen.getByText('Sever Access')).toBeInTheDocument()
    })

    it('has close button', () => {
      render(<SafetySeverParentModal {...defaultProps} />)
      expect(screen.getByLabelText('Close modal')).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onClose when cancel is clicked', () => {
      render(<SafetySeverParentModal {...defaultProps} />)
      const cancelButton = screen.getByText('Cancel')
      fireEvent.click(cancelButton)
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when close button is clicked', () => {
      render(<SafetySeverParentModal {...defaultProps} />)
      const closeButton = screen.getByLabelText('Close modal')
      fireEvent.click(closeButton)
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when overlay is clicked', () => {
      render(<SafetySeverParentModal {...defaultProps} />)
      const overlay = screen.getByRole('dialog')
      fireEvent.click(overlay)
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })

    it('does not close when modal content is clicked', () => {
      render(<SafetySeverParentModal {...defaultProps} />)
      const title = screen.getByText('Sever Parent Access')
      fireEvent.click(title)
      expect(defaultProps.onClose).not.toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('has accessible dialog role', () => {
      render(<SafetySeverParentModal {...defaultProps} />)
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    })

    it('has accessible label via aria-labelledby', () => {
      render(<SafetySeverParentModal {...defaultProps} />)
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'sever-modal-title')
    })

    it('confirmation input has accessible label', () => {
      render(<SafetySeverParentModal {...defaultProps} />)
      const input = screen.getByLabelText(/Type.*to confirm/i)
      expect(input).toBeInTheDocument()
    })
  })

  describe('keyboard navigation', () => {
    it('closes on Escape key', () => {
      render(<SafetySeverParentModal {...defaultProps} />)
      const dialog = screen.getByRole('dialog')
      fireEvent.keyDown(dialog, { key: 'Escape' })
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('verification threshold enforcement', () => {
    it('disables sever button when verification count is 0', () => {
      const noVerification: VerificationStatus = {
        phoneVerified: false,
        idDocumentVerified: false,
        accountMatchVerified: false,
        securityQuestionsVerified: false,
      }
      render(<SafetySeverParentModal {...defaultProps} verificationStatus={noVerification} />)
      const input = screen.getByPlaceholderText('Type confirmation phrase...')
      fireEvent.change(input, { target: { value: 'SEVER parent2@test.com' } })
      const severButton = screen.getByText('Sever Access')
      expect(severButton).toBeDisabled()
    })

    it('disables sever button when verification count is 1', () => {
      const oneVerification: VerificationStatus = {
        phoneVerified: true,
        idDocumentVerified: false,
        accountMatchVerified: false,
        securityQuestionsVerified: false,
      }
      render(<SafetySeverParentModal {...defaultProps} verificationStatus={oneVerification} />)
      const input = screen.getByPlaceholderText('Type confirmation phrase...')
      fireEvent.change(input, { target: { value: 'SEVER parent2@test.com' } })
      const severButton = screen.getByText('Sever Access')
      expect(severButton).toBeDisabled()
    })

    it('enables sever button when verification count is 2 and phrase matches', () => {
      const twoVerification: VerificationStatus = {
        phoneVerified: true,
        idDocumentVerified: true,
        accountMatchVerified: false,
        securityQuestionsVerified: false,
      }
      render(<SafetySeverParentModal {...defaultProps} verificationStatus={twoVerification} />)
      const input = screen.getByPlaceholderText('Type confirmation phrase...')
      fireEvent.change(input, { target: { value: 'SEVER parent2@test.com' } })
      const severButton = screen.getByText('Sever Access')
      expect(severButton).not.toBeDisabled()
    })
  })
})
