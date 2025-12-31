/**
 * ChangeRequestModal Tests - Story 19C.5
 *
 * Task 7.2: Test modal open/close behavior
 * Task 7.3: Test confirmation message display
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChangeRequestModal } from './ChangeRequestModal'

describe('ChangeRequestModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSubmitRequest = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnSubmitRequest.mockResolvedValue(undefined)
  })

  describe('Task 2.1: Modal wrapper', () => {
    it('should render modal when isOpen is true', () => {
      render(
        <ChangeRequestModal
          isOpen={true}
          onClose={mockOnClose}
          parentName="Mom"
          onSubmitRequest={mockOnSubmitRequest}
        />
      )
      expect(screen.getByTestId('change-request-modal')).toBeInTheDocument()
    })

    it('should not render modal when isOpen is false', () => {
      render(
        <ChangeRequestModal
          isOpen={false}
          onClose={mockOnClose}
          parentName="Mom"
          onSubmitRequest={mockOnSubmitRequest}
        />
      )
      expect(screen.queryByTestId('change-request-modal')).not.toBeInTheDocument()
    })

    it('should display modal title', () => {
      render(
        <ChangeRequestModal
          isOpen={true}
          onClose={mockOnClose}
          parentName="Mom"
          onSubmitRequest={mockOnSubmitRequest}
        />
      )
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Request a Change')
    })

    it('should close modal when overlay is clicked', () => {
      render(
        <ChangeRequestModal
          isOpen={true}
          onClose={mockOnClose}
          parentName="Mom"
          onSubmitRequest={mockOnSubmitRequest}
        />
      )
      fireEvent.click(screen.getByTestId('change-request-modal-overlay'))
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should not close modal when modal content is clicked', () => {
      render(
        <ChangeRequestModal
          isOpen={true}
          onClose={mockOnClose}
          parentName="Mom"
          onSubmitRequest={mockOnSubmitRequest}
        />
      )
      fireEvent.click(screen.getByTestId('change-request-modal'))
      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('Task 2.2: Form display', () => {
    it('should display the change request form', () => {
      render(
        <ChangeRequestModal
          isOpen={true}
          onClose={mockOnClose}
          parentName="Mom"
          onSubmitRequest={mockOnSubmitRequest}
        />
      )
      expect(screen.getByTestId('change-request-form')).toBeInTheDocument()
    })
  })

  describe('Task 2.3: Form submission handling', () => {
    it('should call onSubmitRequest when form is submitted', async () => {
      render(
        <ChangeRequestModal
          isOpen={true}
          onClose={mockOnClose}
          parentName="Mom"
          onSubmitRequest={mockOnSubmitRequest}
        />
      )

      fireEvent.change(screen.getByTestId('what-to-change-input'), {
        target: { value: 'More time' },
      })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(mockOnSubmitRequest).toHaveBeenCalledWith({
          whatToChange: 'More time',
          why: null,
        })
      })
    })

    it('should close modal when cancel button is clicked', () => {
      render(
        <ChangeRequestModal
          isOpen={true}
          onClose={mockOnClose}
          parentName="Mom"
          onSubmitRequest={mockOnSubmitRequest}
        />
      )
      fireEvent.click(screen.getByTestId('cancel-button'))
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Task 2.4: Confirmation message', () => {
    it('should show success state after successful submission', async () => {
      render(
        <ChangeRequestModal
          isOpen={true}
          onClose={mockOnClose}
          parentName="Mom"
          onSubmitRequest={mockOnSubmitRequest}
        />
      )

      fireEvent.change(screen.getByTestId('what-to-change-input'), {
        target: { value: 'More time' },
      })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('success-state')).toBeInTheDocument()
      })
    })

    it('should display "Request Sent!" title in success state', async () => {
      render(
        <ChangeRequestModal
          isOpen={true}
          onClose={mockOnClose}
          parentName="Mom"
          onSubmitRequest={mockOnSubmitRequest}
        />
      )

      fireEvent.change(screen.getByTestId('what-to-change-input'), {
        target: { value: 'More time' },
      })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('success-title')).toHaveTextContent('Request Sent!')
      })
    })

    it('should display parent name in success message (AC4)', async () => {
      render(
        <ChangeRequestModal
          isOpen={true}
          onClose={mockOnClose}
          parentName="Mom"
          onSubmitRequest={mockOnSubmitRequest}
        />
      )

      fireEvent.change(screen.getByTestId('what-to-change-input'), {
        target: { value: 'More time' },
      })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toHaveTextContent(
          'Request sent - talk to Mom about it'
        )
      })
    })

    it('should close modal when "Got it!" button is clicked in success state', async () => {
      render(
        <ChangeRequestModal
          isOpen={true}
          onClose={mockOnClose}
          parentName="Dad"
          onSubmitRequest={mockOnSubmitRequest}
        />
      )

      fireEvent.change(screen.getByTestId('what-to-change-input'), {
        target: { value: 'More time' },
      })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('close-button')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('close-button'))
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Loading and error states', () => {
    it('should pass isSubmitting to form', () => {
      render(
        <ChangeRequestModal
          isOpen={true}
          onClose={mockOnClose}
          parentName="Mom"
          onSubmitRequest={mockOnSubmitRequest}
          isSubmitting={true}
        />
      )
      expect(screen.getByTestId('submit-button')).toHaveTextContent('Sending...')
    })

    it('should pass error to form', () => {
      render(
        <ChangeRequestModal
          isOpen={true}
          onClose={mockOnClose}
          parentName="Mom"
          onSubmitRequest={mockOnSubmitRequest}
          error="Something went wrong"
        />
      )
      expect(screen.getByTestId('form-error')).toHaveTextContent('Something went wrong')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <ChangeRequestModal
          isOpen={true}
          onClose={mockOnClose}
          parentName="Mom"
          onSubmitRequest={mockOnSubmitRequest}
        />
      )
      const overlay = screen.getByTestId('change-request-modal-overlay')
      expect(overlay).toHaveAttribute('role', 'dialog')
      expect(overlay).toHaveAttribute('aria-modal', 'true')
    })
  })
})
