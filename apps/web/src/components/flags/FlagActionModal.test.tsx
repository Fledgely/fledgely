/**
 * FlagActionModal Tests - Story 22.3
 *
 * Tests for the flag action confirmation modal.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FlagActionModal } from './FlagActionModal'

describe('FlagActionModal', () => {
  const mockOnConfirm = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AC1: Action options', () => {
    it('should render dismiss action modal', () => {
      render(<FlagActionModal action="dismiss" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

      expect(screen.getByRole('heading', { name: 'Dismiss Flag' })).toBeInTheDocument()
      expect(screen.getByTestId('action-confirm')).toHaveTextContent('Dismiss Flag')
    })

    it('should render discuss action modal', () => {
      render(<FlagActionModal action="discuss" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

      expect(screen.getByText('Note for Discussion')).toBeInTheDocument()
      expect(screen.getByTestId('action-confirm')).toHaveTextContent('Save for Discussion')
    })

    it('should render escalate action modal', () => {
      render(
        <FlagActionModal action="escalate" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />
      )

      expect(screen.getByText('Requires Action')).toBeInTheDocument()
      expect(screen.getByTestId('action-confirm')).toHaveTextContent('Mark as Requiring Action')
    })
  })

  describe('AC5: Confirmation dialog', () => {
    it('should render modal container', () => {
      render(<FlagActionModal action="dismiss" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

      expect(screen.getByTestId('flag-action-modal')).toBeInTheDocument()
    })

    it('should have proper ARIA attributes', () => {
      render(<FlagActionModal action="dismiss" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

      const modal = screen.getByTestId('flag-action-modal')
      expect(modal).toHaveAttribute('role', 'dialog')
      expect(modal).toHaveAttribute('aria-modal', 'true')
    })

    it('should have cancel button', () => {
      render(<FlagActionModal action="dismiss" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

      expect(screen.getByTestId('action-cancel')).toHaveTextContent('Cancel')
    })

    it('should call onCancel when cancel button clicked', () => {
      render(<FlagActionModal action="dismiss" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

      fireEvent.click(screen.getByTestId('action-cancel'))
      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })

    it('should call onConfirm when confirm button clicked', () => {
      render(<FlagActionModal action="dismiss" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

      fireEvent.click(screen.getByTestId('action-confirm'))
      expect(mockOnConfirm).toHaveBeenCalledTimes(1)
    })

    it('should close on Escape key', () => {
      render(<FlagActionModal action="dismiss" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

      fireEvent.keyDown(document, { key: 'Escape' })
      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })

    it('should close on backdrop click', () => {
      render(<FlagActionModal action="dismiss" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

      const overlay = screen.getByTestId('flag-action-modal')
      fireEvent.click(overlay)
      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe('AC5: Optional note', () => {
    it('should render note input', () => {
      render(<FlagActionModal action="dismiss" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

      expect(screen.getByTestId('action-note-input')).toBeInTheDocument()
    })

    it('should pass note to onConfirm when provided', () => {
      render(<FlagActionModal action="dismiss" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

      const noteInput = screen.getByTestId('action-note-input')
      fireEvent.change(noteInput, { target: { value: 'This is a test note' } })

      fireEvent.click(screen.getByTestId('action-confirm'))
      expect(mockOnConfirm).toHaveBeenCalledWith('This is a test note')
    })

    it('should pass undefined when note is empty', () => {
      render(<FlagActionModal action="dismiss" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

      fireEvent.click(screen.getByTestId('action-confirm'))
      expect(mockOnConfirm).toHaveBeenCalledWith(undefined)
    })

    it('should trim whitespace from note', () => {
      render(<FlagActionModal action="dismiss" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

      const noteInput = screen.getByTestId('action-note-input')
      fireEvent.change(noteInput, { target: { value: '  note with spaces  ' } })

      fireEvent.click(screen.getByTestId('action-confirm'))
      expect(mockOnConfirm).toHaveBeenCalledWith('note with spaces')
    })
  })

  describe('Loading state', () => {
    it('should show loading text when isLoading is true', () => {
      render(
        <FlagActionModal
          action="dismiss"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      )

      expect(screen.getByTestId('action-confirm')).toHaveTextContent('Processing...')
    })

    it('should disable buttons when loading', () => {
      render(
        <FlagActionModal
          action="dismiss"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      )

      expect(screen.getByTestId('action-confirm')).toBeDisabled()
      expect(screen.getByTestId('action-cancel')).toBeDisabled()
    })

    it('should disable note input when loading', () => {
      render(
        <FlagActionModal
          action="dismiss"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      )

      expect(screen.getByTestId('action-note-input')).toBeDisabled()
    })

    it('should not close on Escape when loading', () => {
      render(
        <FlagActionModal
          action="dismiss"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      )

      fireEvent.keyDown(document, { key: 'Escape' })
      expect(mockOnCancel).not.toHaveBeenCalled()
    })

    it('should not close on backdrop click when loading', () => {
      render(
        <FlagActionModal
          action="dismiss"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      )

      const overlay = screen.getByTestId('flag-action-modal')
      fireEvent.click(overlay)
      expect(mockOnCancel).not.toHaveBeenCalled()
    })
  })

  describe('Action descriptions', () => {
    it('should show appropriate description for dismiss', () => {
      render(<FlagActionModal action="dismiss" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

      expect(
        screen.getByText(/false positives or situations that have been resolved/i)
      ).toBeInTheDocument()
    })

    it('should show appropriate description for discuss', () => {
      render(<FlagActionModal action="discuss" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

      expect(screen.getByText(/saved for a family conversation/i)).toBeInTheDocument()
    })

    it('should show appropriate description for escalate', () => {
      render(
        <FlagActionModal action="escalate" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />
      )

      expect(screen.getByText(/requires immediate attention/i)).toBeInTheDocument()
    })
  })
})
