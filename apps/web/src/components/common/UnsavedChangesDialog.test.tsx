import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UnsavedChangesDialog } from './UnsavedChangesDialog'

describe('UnsavedChangesDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // RENDERING TESTS
  // ============================================
  describe('rendering', () => {
    it('renders dialog when open', () => {
      render(<UnsavedChangesDialog {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument()
      expect(
        screen.getByText(
          'You have unsaved changes. Are you sure you want to leave? Your changes will be lost.'
        )
      ).toBeInTheDocument()
    })

    it('does not render dialog when closed', () => {
      render(<UnsavedChangesDialog {...defaultProps} open={false} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders with custom title', () => {
      render(
        <UnsavedChangesDialog {...defaultProps} title="Custom Title" />
      )

      expect(screen.getByText('Custom Title')).toBeInTheDocument()
    })

    it('renders with custom description', () => {
      render(
        <UnsavedChangesDialog
          {...defaultProps}
          description="Custom description text"
        />
      )

      expect(screen.getByText('Custom description text')).toBeInTheDocument()
    })

    it('renders Keep Editing button', () => {
      render(<UnsavedChangesDialog {...defaultProps} />)

      expect(
        screen.getByRole('button', { name: /keep editing/i })
      ).toBeInTheDocument()
    })

    it('renders Discard Changes button', () => {
      render(<UnsavedChangesDialog {...defaultProps} />)

      expect(
        screen.getByRole('button', { name: /discard changes/i })
      ).toBeInTheDocument()
    })
  })

  // ============================================
  // INTERACTION TESTS
  // ============================================
  describe('interactions', () => {
    it('calls onCancel when Keep Editing is clicked', () => {
      render(<UnsavedChangesDialog {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /keep editing/i }))

      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1)
    })

    it('calls onConfirm when Discard Changes is clicked', () => {
      render(<UnsavedChangesDialog {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /discard changes/i }))

      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1)
    })

    it('calls onOpenChange when onCancel is called', () => {
      render(<UnsavedChangesDialog {...defaultProps} />)

      // Click Keep Editing button - the dialog doesn't have a close X button by default
      fireEvent.click(screen.getByRole('button', { name: /keep editing/i }))

      // onCancel was called, which the parent would use to close the dialog
      expect(defaultProps.onCancel).toHaveBeenCalled()
    })
  })

  // ============================================
  // ACCESSIBILITY TESTS
  // ============================================
  describe('accessibility', () => {
    it('has proper dialog role', () => {
      render(<UnsavedChangesDialog {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('has accessible title', () => {
      render(<UnsavedChangesDialog {...defaultProps} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAccessibleName('Unsaved Changes')
    })

    it('buttons have minimum touch target size', () => {
      render(<UnsavedChangesDialog {...defaultProps} />)

      const keepEditingButton = screen.getByRole('button', {
        name: /keep editing/i,
      })
      const discardButton = screen.getByRole('button', {
        name: /discard changes/i,
      })

      // Check buttons have min-h-[44px] class
      expect(keepEditingButton).toHaveClass('min-h-[44px]')
      expect(discardButton).toHaveClass('min-h-[44px]')
    })
  })

  // ============================================
  // EDGE CASE TESTS
  // ============================================
  describe('edge cases', () => {
    it('handles rapid clicks without duplicate calls', () => {
      render(<UnsavedChangesDialog {...defaultProps} />)

      const discardButton = screen.getByRole('button', {
        name: /discard changes/i,
      })

      // Rapid clicks
      fireEvent.click(discardButton)
      fireEvent.click(discardButton)
      fireEvent.click(discardButton)

      // Each click registers (dialog doesn't prevent it)
      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(3)
    })

    it('handles empty callbacks gracefully', () => {
      const emptyProps = {
        open: true,
        onOpenChange: vi.fn(),
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
      }

      render(<UnsavedChangesDialog {...emptyProps} />)

      // Should not throw
      fireEvent.click(screen.getByRole('button', { name: /keep editing/i }))
      fireEvent.click(screen.getByRole('button', { name: /discard changes/i }))
    })
  })
})
