/**
 * Tests for SelfRemovalModal component.
 *
 * Story 2.8: Unilateral Self-Removal (Survivor Escape)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SelfRemovalModal from './SelfRemovalModal'
import type { Family } from '@fledgely/shared/contracts'

// Mock family data
const mockFamily: Family = {
  id: 'family-123',
  name: 'Test Family',
  createdAt: new Date(),
  updatedAt: new Date(),
  guardianUids: ['user-123', 'other-parent-456'],
  guardians: [
    {
      uid: 'user-123',
      role: 'guardian',
      addedAt: new Date(),
    },
    {
      uid: 'other-parent-456',
      role: 'guardian',
      addedAt: new Date(),
    },
  ],
  showDemoProfile: false,
}

describe('SelfRemovalModal', () => {
  const mockOnClose = vi.fn()
  const mockOnConfirm = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnConfirm.mockResolvedValue(undefined)
  })

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <SelfRemovalModal
          family={mockFamily}
          isOpen={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should render when isOpen is true', () => {
      render(
        <SelfRemovalModal
          family={mockFamily}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should display family name in title', () => {
      render(
        <SelfRemovalModal
          family={mockFamily}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByText(`Remove yourself from ${mockFamily.name}?`)).toBeInTheDocument()
    })
  })

  describe('Safety Resources (AC2)', () => {
    it('should display link to safety contact channel', () => {
      render(
        <SelfRemovalModal
          family={mockFamily}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const safetyLink = screen.getByText('support team is available')
      expect(safetyLink).toHaveAttribute('href', '/safety')
      expect(safetyLink).toHaveAttribute('target', '_blank')
    })

    it('should use neutral language (no abuse/escape terms)', () => {
      render(
        <SelfRemovalModal
          family={mockFamily}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const modalText = screen.getByRole('dialog').textContent || ''

      // Should NOT contain alarming terms
      expect(modalText.toLowerCase()).not.toContain('abuse')
      expect(modalText.toLowerCase()).not.toContain('escape')
      expect(modalText.toLowerCase()).not.toContain('danger')
      expect(modalText.toLowerCase()).not.toContain('emergency')
      expect(modalText.toLowerCase()).not.toContain('victim')
      expect(modalText.toLowerCase()).not.toContain('domestic')
    })
  })

  describe('Confirmation Requirements', () => {
    it('should require checkbox confirmation', async () => {
      render(
        <SelfRemovalModal
          family={mockFamily}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const checkbox = screen.getByLabelText(/I want to remove myself from this family/i)
      expect(checkbox).not.toBeChecked()

      fireEvent.click(checkbox)
      expect(checkbox).toBeChecked()
    })

    it('should require exact confirmation phrase', async () => {
      render(
        <SelfRemovalModal
          family={mockFamily}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const input = screen.getByPlaceholderText('I understand this is immediate')
      fireEvent.change(input, { target: { value: 'wrong phrase' } })

      const submitButton = screen.getByRole('button', { name: /remove myself/i })
      expect(submitButton).toBeDisabled()
    })

    it('should enable submit when checkbox checked and phrase matches', async () => {
      render(
        <SelfRemovalModal
          family={mockFamily}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      // Check checkbox
      const checkbox = screen.getByLabelText(/I want to remove myself from this family/i)
      fireEvent.click(checkbox)

      // Type confirmation phrase
      const input = screen.getByPlaceholderText('I understand this is immediate')
      fireEvent.change(input, { target: { value: 'I understand this is immediate' } })

      const submitButton = screen.getByRole('button', { name: /remove myself/i })
      expect(submitButton).not.toBeDisabled()
    })
  })

  describe('Form Submission', () => {
    it('should call onConfirm when form is submitted correctly', async () => {
      render(
        <SelfRemovalModal
          family={mockFamily}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      // Check checkbox
      const checkbox = screen.getByLabelText(/I want to remove myself from this family/i)
      fireEvent.click(checkbox)

      // Type confirmation phrase
      const input = screen.getByPlaceholderText('I understand this is immediate')
      fireEvent.change(input, { target: { value: 'I understand this is immediate' } })

      // Submit
      const submitButton = screen.getByRole('button', { name: /remove myself/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledTimes(1)
      })
    })

    it('should show error if checkbox not checked', async () => {
      render(
        <SelfRemovalModal
          family={mockFamily}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      // Type confirmation phrase without checking checkbox
      const input = screen.getByPlaceholderText('I understand this is immediate')
      fireEvent.change(input, { target: { value: 'I understand this is immediate' } })

      // Try to submit by pressing Enter (form submit)
      fireEvent.submit(input.closest('form')!)

      // Should show error
      await waitFor(() => {
        expect(screen.getByText('Please check the confirmation box')).toBeInTheDocument()
      })
      expect(mockOnConfirm).not.toHaveBeenCalled()
    })

    it('should show error if phrase incorrect', async () => {
      render(
        <SelfRemovalModal
          family={mockFamily}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      // Check checkbox
      const checkbox = screen.getByLabelText(/I want to remove myself from this family/i)
      fireEvent.click(checkbox)

      // Type wrong phrase
      const input = screen.getByPlaceholderText('I understand this is immediate')
      fireEvent.change(input, { target: { value: 'wrong phrase' } })

      // Submit form
      fireEvent.submit(input.closest('form')!)

      // Should show error
      await waitFor(() => {
        expect(
          screen.getByText(/please type "I understand this is immediate" exactly/i)
        ).toBeInTheDocument()
      })
      expect(mockOnConfirm).not.toHaveBeenCalled()
    })

    it('should show error on submission failure', async () => {
      mockOnConfirm.mockRejectedValueOnce(new Error('Network error'))

      render(
        <SelfRemovalModal
          family={mockFamily}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      // Check checkbox
      const checkbox = screen.getByLabelText(/I want to remove myself from this family/i)
      fireEvent.click(checkbox)

      // Type confirmation phrase
      const input = screen.getByPlaceholderText('I understand this is immediate')
      fireEvent.change(input, { target: { value: 'I understand this is immediate' } })

      // Submit
      const submitButton = screen.getByRole('button', { name: /remove myself/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('should show loading state during submission', async () => {
      // Make onConfirm hang to test loading state
      mockOnConfirm.mockImplementation(() => new Promise(() => {}))

      render(
        <SelfRemovalModal
          family={mockFamily}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      // Check checkbox
      const checkbox = screen.getByLabelText(/I want to remove myself from this family/i)
      fireEvent.click(checkbox)

      // Type confirmation phrase
      const input = screen.getByPlaceholderText('I understand this is immediate')
      fireEvent.change(input, { target: { value: 'I understand this is immediate' } })

      // Submit
      const submitButton = screen.getByRole('button', { name: /remove myself/i })
      fireEvent.click(submitButton)

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Removing...')).toBeInTheDocument()
      })
    })
  })

  describe('Cancel/Close Behavior', () => {
    it('should call onClose when cancel button clicked', async () => {
      render(
        <SelfRemovalModal
          family={mockFamily}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when Escape key pressed', async () => {
      render(
        <SelfRemovalModal
          family={mockFamily}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    it('should have proper dialog role and aria attributes', () => {
      render(
        <SelfRemovalModal
          family={mockFamily}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-labelledby', 'self-removal-title')
      expect(dialog).toHaveAttribute('aria-describedby', 'self-removal-description')
    })

    it('should have proper form labels', () => {
      render(
        <SelfRemovalModal
          family={mockFamily}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      // Checkbox should have label
      const checkbox = screen.getByLabelText(/I want to remove myself from this family/i)
      expect(checkbox).toBeInTheDocument()

      // Input should be labeled
      expect(
        screen.getByLabelText(/Type "I understand this is immediate" to confirm/i)
      ).toBeInTheDocument()
    })

    it('should indicate loading state on submit button', async () => {
      mockOnConfirm.mockImplementation(() => new Promise(() => {}))

      render(
        <SelfRemovalModal
          family={mockFamily}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      // Check checkbox and type phrase
      fireEvent.click(screen.getByLabelText(/I want to remove myself from this family/i))
      fireEvent.change(screen.getByPlaceholderText('I understand this is immediate'), {
        target: { value: 'I understand this is immediate' },
      })

      // Submit
      fireEvent.click(screen.getByRole('button', { name: /remove myself/i }))

      // Button should have aria-busy
      await waitFor(() => {
        const button = screen.getByText('Removing...').closest('button')
        expect(button).toHaveAttribute('aria-busy', 'true')
      })
    })
  })

  describe('State Reset', () => {
    it('should reset state when modal reopens', async () => {
      const { rerender } = render(
        <SelfRemovalModal
          family={mockFamily}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      // Check checkbox and type phrase
      fireEvent.click(screen.getByLabelText(/I want to remove myself from this family/i))
      fireEvent.change(screen.getByPlaceholderText('I understand this is immediate'), {
        target: { value: 'test input' },
      })

      // Close modal
      rerender(
        <SelfRemovalModal
          family={mockFamily}
          isOpen={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      // Reopen modal
      rerender(
        <SelfRemovalModal
          family={mockFamily}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      // State should be reset
      const checkbox = screen.getByLabelText(/I want to remove myself from this family/i)
      expect(checkbox).not.toBeChecked()

      const input = screen.getByPlaceholderText('I understand this is immediate')
      expect(input).toHaveValue('')
    })
  })
})
