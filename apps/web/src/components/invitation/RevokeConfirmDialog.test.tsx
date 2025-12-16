import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RevokeConfirmDialog } from './RevokeConfirmDialog'

/**
 * RevokeConfirmDialog Component Tests
 *
 * Story 3.5: Invitation Management - Task 5
 *
 * Tests verify:
 * - Dialog displays warning text
 * - Cancel and Confirm buttons work
 * - Loading state during revocation
 * - Focus trap and accessibility
 */

describe('RevokeConfirmDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // Basic Display
  // ============================================================================

  describe('basic display', () => {
    it('renders dialog when open', () => {
      render(<RevokeConfirmDialog {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Cancel this invitation?')).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      render(<RevokeConfirmDialog {...defaultProps} open={false} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('shows warning text at 6th-grade reading level', () => {
      render(<RevokeConfirmDialog {...defaultProps} />)

      expect(
        screen.getByText(/This will cancel the invitation/i)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/The link will stop working right away/i)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/You can make a new invitation later if needed/i)
      ).toBeInTheDocument()
    })

    it('shows warning icon', () => {
      render(<RevokeConfirmDialog {...defaultProps} />)

      // Alert triangle icon should be present
      const iconContainer = document.querySelector('.bg-amber-100')
      expect(iconContainer).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Button Actions
  // ============================================================================

  describe('button actions', () => {
    it('renders Cancel and Confirm buttons', () => {
      render(<RevokeConfirmDialog {...defaultProps} />)

      expect(screen.getByText('Keep Invitation')).toBeInTheDocument()
      expect(screen.getByText('Yes, Cancel Invitation')).toBeInTheDocument()
    })

    it('calls onOpenChange(false) when Cancel is clicked', () => {
      render(<RevokeConfirmDialog {...defaultProps} />)

      fireEvent.click(screen.getByText('Keep Invitation'))

      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
    })

    it('calls onConfirm when Confirm is clicked', () => {
      render(<RevokeConfirmDialog {...defaultProps} />)

      fireEvent.click(screen.getByText('Yes, Cancel Invitation'))

      expect(defaultProps.onConfirm).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Loading State
  // ============================================================================

  describe('loading state', () => {
    it('shows loading indicator when loading', () => {
      render(<RevokeConfirmDialog {...defaultProps} loading={true} />)

      expect(screen.getByText('Cancelling...')).toBeInTheDocument()
    })

    it('disables buttons when loading', () => {
      render(<RevokeConfirmDialog {...defaultProps} loading={true} />)

      const keepButton = screen.getByText('Keep Invitation').closest('button')
      const cancellingButton = screen.getByText('Cancelling...').closest('button')

      expect(keepButton).toBeDisabled()
      expect(cancellingButton).toBeDisabled()
    })

    it('does not call onOpenChange when Cancel is clicked during loading', () => {
      render(<RevokeConfirmDialog {...defaultProps} loading={true} />)

      fireEvent.click(screen.getByText('Keep Invitation'))

      expect(defaultProps.onOpenChange).not.toHaveBeenCalled()
    })

    it('does not call onConfirm when Confirm is clicked during loading', () => {
      render(<RevokeConfirmDialog {...defaultProps} loading={true} />)

      fireEvent.click(screen.getByText('Cancelling...'))

      expect(defaultProps.onConfirm).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Accessibility
  // ============================================================================

  describe('accessibility', () => {
    it('has proper dialog role', () => {
      render(<RevokeConfirmDialog {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('has aria-describedby pointing to description', () => {
      render(<RevokeConfirmDialog {...defaultProps} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-describedby')
    })

    it('buttons have accessible aria-labels', () => {
      render(<RevokeConfirmDialog {...defaultProps} />)

      const keepButton = screen.getByText('Keep Invitation').closest('button')
      const confirmButton = screen.getByText('Yes, Cancel Invitation').closest('button')

      expect(keepButton).toHaveAttribute('aria-label', 'Keep the invitation active')
      expect(confirmButton).toHaveAttribute('aria-label', 'Confirm cancellation of invitation')
    })

    it('buttons meet 44x44px minimum touch target', () => {
      render(<RevokeConfirmDialog {...defaultProps} />)

      const keepButton = screen.getByText('Keep Invitation').closest('button')
      const confirmButton = screen.getByText('Yes, Cancel Invitation').closest('button')

      expect(keepButton).toHaveClass('min-h-[44px]')
      expect(keepButton).toHaveClass('min-w-[44px]')
      expect(confirmButton).toHaveClass('min-h-[44px]')
      expect(confirmButton).toHaveClass('min-w-[44px]')
    })

    it('has loading state accessible label', () => {
      render(<RevokeConfirmDialog {...defaultProps} loading={true} />)

      const cancellingButton = screen.getByText('Cancelling...').closest('button')
      expect(cancellingButton).toHaveAttribute('aria-label', 'Cancelling invitation')
    })
  })
})
