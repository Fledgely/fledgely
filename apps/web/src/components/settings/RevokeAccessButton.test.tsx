/**
 * RevokeAccessButton Component Tests - Story 19D.5, extended by Story 39.7
 *
 * Tests for the revoke access button with confirmation dialog.
 *
 * Story 19D.5 Acceptance Criteria:
 * - AC1: Parent clicks "Remove Access" in settings
 * - AC1: Revoke access within 5 minutes (NFR62) - immediate in practice
 *
 * Story 39.7 Acceptance Criteria:
 * - AC6: Optional removal reason stored in audit log
 *
 * @vitest-environment jsdom
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RevokeAccessButton } from './RevokeAccessButton'

describe('RevokeAccessButton', () => {
  const mockOnRevoke = vi.fn()
  const defaultProps = {
    caregiverName: 'Grandpa Joe',
    onRevoke: mockOnRevoke,
    showReasonStep: false, // For backward compatibility in existing tests
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnRevoke.mockResolvedValue(undefined)
  })

  describe('Basic rendering (AC1)', () => {
    it('renders Remove Access button', () => {
      render(<RevokeAccessButton {...defaultProps} />)

      expect(screen.getByTestId('revoke-access-button')).toBeInTheDocument()
      expect(screen.getByText('Remove Access')).toBeInTheDocument()
    })

    it('displays icon in button', () => {
      render(<RevokeAccessButton {...defaultProps} />)

      expect(screen.getByText('🚫')).toBeInTheDocument()
    })

    it('has correct aria-label with caregiver name', () => {
      render(<RevokeAccessButton {...defaultProps} />)

      const button = screen.getByTestId('revoke-access-button')
      expect(button).toHaveAttribute('aria-label', "Remove Grandpa Joe's access")
    })

    it('does not show confirmation dialog initially', () => {
      render(<RevokeAccessButton {...defaultProps} />)

      expect(screen.queryByTestId('revoke-confirm-dialog')).not.toBeInTheDocument()
    })
  })

  describe('Confirmation dialog', () => {
    it('shows confirmation dialog when button clicked', () => {
      render(<RevokeAccessButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('revoke-access-button'))

      expect(screen.getByTestId('revoke-confirm-dialog')).toBeInTheDocument()
    })

    it('displays caregiver name in confirmation message', () => {
      render(<RevokeAccessButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('revoke-access-button'))

      expect(screen.getByText('Grandpa Joe')).toBeInTheDocument()
    })

    it('has dialog role and aria-modal', () => {
      render(<RevokeAccessButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('revoke-access-button'))

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
    })

    it('shows cancel and confirm buttons', () => {
      render(<RevokeAccessButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('revoke-access-button'))

      expect(screen.getByTestId('revoke-cancel-button')).toBeInTheDocument()
      expect(screen.getByTestId('revoke-confirm-button')).toBeInTheDocument()
    })

    it('closes dialog when cancel clicked', () => {
      render(<RevokeAccessButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('revoke-access-button'))
      expect(screen.getByTestId('revoke-confirm-dialog')).toBeInTheDocument()

      fireEvent.click(screen.getByTestId('revoke-cancel-button'))
      expect(screen.queryByTestId('revoke-confirm-dialog')).not.toBeInTheDocument()
    })
  })

  describe('Revocation action (AC1)', () => {
    it('calls onRevoke when confirm clicked', async () => {
      render(<RevokeAccessButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('revoke-access-button'))
      fireEvent.click(screen.getByTestId('revoke-confirm-button'))

      await waitFor(() => {
        expect(mockOnRevoke).toHaveBeenCalledTimes(1)
      })
    })

    it('closes dialog after successful revocation', async () => {
      render(<RevokeAccessButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('revoke-access-button'))
      fireEvent.click(screen.getByTestId('revoke-confirm-button'))

      await waitFor(() => {
        expect(screen.queryByTestId('revoke-confirm-dialog')).not.toBeInTheDocument()
      })
    })

    it('shows error when revocation fails', async () => {
      mockOnRevoke.mockRejectedValue(new Error('Network error'))

      render(<RevokeAccessButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('revoke-access-button'))
      fireEvent.click(screen.getByTestId('revoke-confirm-button'))

      await waitFor(() => {
        expect(screen.getByTestId('revoke-error')).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('keeps dialog open on error', async () => {
      mockOnRevoke.mockRejectedValue(new Error('Failed'))

      render(<RevokeAccessButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('revoke-access-button'))
      fireEvent.click(screen.getByTestId('revoke-confirm-button'))

      await waitFor(() => {
        expect(screen.getByTestId('revoke-confirm-dialog')).toBeInTheDocument()
      })
    })

    it('clears error when dialog cancelled', async () => {
      mockOnRevoke.mockRejectedValue(new Error('Failed'))

      render(<RevokeAccessButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('revoke-access-button'))
      fireEvent.click(screen.getByTestId('revoke-confirm-button'))

      await waitFor(() => {
        expect(screen.getByTestId('revoke-error')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('revoke-cancel-button'))
      fireEvent.click(screen.getByTestId('revoke-access-button'))

      expect(screen.queryByTestId('revoke-error')).not.toBeInTheDocument()
    })
  })

  describe('Loading state', () => {
    it('disables main button when loading', () => {
      render(<RevokeAccessButton {...defaultProps} loading />)

      const button = screen.getByTestId('revoke-access-button')
      expect(button).toBeDisabled()
    })

    it('shows loading text in confirm button when loading and dialog open', () => {
      const { rerender } = render(<RevokeAccessButton {...defaultProps} />)

      // First open the dialog
      fireEvent.click(screen.getByTestId('revoke-access-button'))
      expect(screen.getByTestId('revoke-confirm-dialog')).toBeInTheDocument()

      // Then set loading state
      rerender(<RevokeAccessButton {...defaultProps} loading />)

      expect(screen.getByText('Removing...')).toBeInTheDocument()
    })

    it('disables confirm button when loading and dialog open', () => {
      const { rerender } = render(<RevokeAccessButton {...defaultProps} />)

      // First open the dialog
      fireEvent.click(screen.getByTestId('revoke-access-button'))

      // Then set loading state
      rerender(<RevokeAccessButton {...defaultProps} loading />)

      const confirmButton = screen.getByTestId('revoke-confirm-button')
      expect(confirmButton).toBeDisabled()
    })

    it('disables cancel button when loading and dialog open', () => {
      const { rerender } = render(<RevokeAccessButton {...defaultProps} />)

      // First open the dialog
      fireEvent.click(screen.getByTestId('revoke-access-button'))

      // Then set loading state
      rerender(<RevokeAccessButton {...defaultProps} loading />)

      const cancelButton = screen.getByTestId('revoke-cancel-button')
      expect(cancelButton).toBeDisabled()
    })
  })

  describe('Disabled state', () => {
    it('disables button when disabled prop is true', () => {
      render(<RevokeAccessButton {...defaultProps} disabled />)

      const button = screen.getByTestId('revoke-access-button')
      expect(button).toBeDisabled()
    })

    it('does not open dialog when disabled', () => {
      render(<RevokeAccessButton {...defaultProps} disabled />)

      fireEvent.click(screen.getByTestId('revoke-access-button'))

      expect(screen.queryByTestId('revoke-confirm-dialog')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('confirm button has descriptive aria-label', () => {
      render(<RevokeAccessButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('revoke-access-button'))

      const confirmButton = screen.getByTestId('revoke-confirm-button')
      expect(confirmButton).toHaveAttribute('aria-label', "Confirm removal of Grandpa Joe's access")
    })

    it('dialog has aria-labelledby', () => {
      render(<RevokeAccessButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('revoke-access-button'))

      const dialog = screen.getByTestId('revoke-confirm-dialog')
      expect(dialog).toHaveAttribute('aria-labelledby', 'revoke-dialog-heading')
    })

    it('error message has alert role', async () => {
      mockOnRevoke.mockRejectedValue(new Error('Failed'))

      render(<RevokeAccessButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('revoke-access-button'))
      fireEvent.click(screen.getByTestId('revoke-confirm-button'))

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })

    it('closes dialog when Escape key is pressed', () => {
      render(<RevokeAccessButton {...defaultProps} />)

      // Open dialog
      fireEvent.click(screen.getByTestId('revoke-access-button'))
      expect(screen.getByTestId('revoke-confirm-dialog')).toBeInTheDocument()

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' })

      expect(screen.queryByTestId('revoke-confirm-dialog')).not.toBeInTheDocument()
    })

    it('does not close dialog with Escape when loading', () => {
      const { rerender } = render(<RevokeAccessButton {...defaultProps} />)

      // Open dialog
      fireEvent.click(screen.getByTestId('revoke-access-button'))
      expect(screen.getByTestId('revoke-confirm-dialog')).toBeInTheDocument()

      // Set loading
      rerender(<RevokeAccessButton {...defaultProps} loading />)

      // Press Escape - should not close
      fireEvent.keyDown(document, { key: 'Escape' })

      expect(screen.getByTestId('revoke-confirm-dialog')).toBeInTheDocument()
    })
  })

  describe('Reason step (Story 39.7 AC6)', () => {
    const propsWithReasonStep = {
      ...defaultProps,
      showReasonStep: true,
    }

    it('shows reason dialog when button clicked with showReasonStep', () => {
      render(<RevokeAccessButton {...propsWithReasonStep} />)

      fireEvent.click(screen.getByTestId('revoke-access-button'))

      expect(screen.getByTestId('revoke-reason-dialog')).toBeInTheDocument()
      expect(screen.queryByTestId('revoke-confirm-dialog')).not.toBeInTheDocument()
    })

    it('shows RemovalReasonInput in reason dialog', () => {
      render(<RevokeAccessButton {...propsWithReasonStep} />)

      fireEvent.click(screen.getByTestId('revoke-access-button'))

      expect(screen.getByTestId('removal-reason-input')).toBeInTheDocument()
    })

    it('shows continue and cancel buttons in reason dialog', () => {
      render(<RevokeAccessButton {...propsWithReasonStep} />)

      fireEvent.click(screen.getByTestId('revoke-access-button'))

      expect(screen.getByTestId('reason-continue-button')).toBeInTheDocument()
      expect(screen.getByTestId('reason-cancel-button')).toBeInTheDocument()
    })

    it('closes reason dialog when cancel clicked', () => {
      render(<RevokeAccessButton {...propsWithReasonStep} />)

      fireEvent.click(screen.getByTestId('revoke-access-button'))
      expect(screen.getByTestId('revoke-reason-dialog')).toBeInTheDocument()

      fireEvent.click(screen.getByTestId('reason-cancel-button'))
      expect(screen.queryByTestId('revoke-reason-dialog')).not.toBeInTheDocument()
    })

    it('moves to confirm dialog when continue clicked', () => {
      render(<RevokeAccessButton {...propsWithReasonStep} />)

      fireEvent.click(screen.getByTestId('revoke-access-button'))
      fireEvent.click(screen.getByTestId('reason-continue-button'))

      expect(screen.queryByTestId('revoke-reason-dialog')).not.toBeInTheDocument()
      expect(screen.getByTestId('revoke-confirm-dialog')).toBeInTheDocument()
    })

    it('skips to confirm dialog when skip button clicked', () => {
      render(<RevokeAccessButton {...propsWithReasonStep} />)

      fireEvent.click(screen.getByTestId('revoke-access-button'))
      fireEvent.click(screen.getByTestId('skip-button'))

      expect(screen.queryByTestId('revoke-reason-dialog')).not.toBeInTheDocument()
      expect(screen.getByTestId('revoke-confirm-dialog')).toBeInTheDocument()
    })

    it('passes reason to onRevoke when provided', async () => {
      render(<RevokeAccessButton {...propsWithReasonStep} />)

      fireEvent.click(screen.getByTestId('revoke-access-button'))
      fireEvent.change(screen.getByTestId('reason-textarea'), {
        target: { value: 'Moving out of state' },
      })
      fireEvent.click(screen.getByTestId('reason-continue-button'))
      fireEvent.click(screen.getByTestId('revoke-confirm-button'))

      await waitFor(() => {
        expect(mockOnRevoke).toHaveBeenCalledWith('Moving out of state')
      })
    })

    it('passes undefined reason when skipped', async () => {
      render(<RevokeAccessButton {...propsWithReasonStep} />)

      fireEvent.click(screen.getByTestId('revoke-access-button'))
      fireEvent.click(screen.getByTestId('skip-button'))
      fireEvent.click(screen.getByTestId('revoke-confirm-button'))

      await waitFor(() => {
        expect(mockOnRevoke).toHaveBeenCalledWith(undefined)
      })
    })

    it('displays reason in confirmation dialog', () => {
      render(<RevokeAccessButton {...propsWithReasonStep} />)

      fireEvent.click(screen.getByTestId('revoke-access-button'))
      fireEvent.change(screen.getByTestId('reason-textarea'), {
        target: { value: 'Moving away' },
      })
      fireEvent.click(screen.getByTestId('reason-continue-button'))

      expect(screen.getByText(/Moving away/)).toBeInTheDocument()
    })

    it('closes reason dialog when Escape pressed', () => {
      render(<RevokeAccessButton {...propsWithReasonStep} />)

      fireEvent.click(screen.getByTestId('revoke-access-button'))
      expect(screen.getByTestId('revoke-reason-dialog')).toBeInTheDocument()

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(screen.queryByTestId('revoke-reason-dialog')).not.toBeInTheDocument()
    })
  })
})
