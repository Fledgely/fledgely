/**
 * ChangeRequestForm Tests - Story 19C.5
 *
 * Task 7.1: Test form validation and submission
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChangeRequestForm } from './ChangeRequestForm'

describe('ChangeRequestForm', () => {
  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Task 1.1: Form component structure', () => {
    it('should render with correct test id', () => {
      render(<ChangeRequestForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)
      expect(screen.getByTestId('change-request-form')).toBeInTheDocument()
    })
  })

  describe('Task 1.2: What to change field', () => {
    it('should display "What would you like to change?" input field', () => {
      render(<ChangeRequestForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)
      expect(screen.getByTestId('what-to-change-input')).toBeInTheDocument()
      expect(screen.getByLabelText('What would you like to change?')).toBeInTheDocument()
    })

    it('should accept text input', () => {
      render(<ChangeRequestForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)
      const input = screen.getByTestId('what-to-change-input')
      fireEvent.change(input, { target: { value: 'I want more screen time' } })
      expect(input).toHaveValue('I want more screen time')
    })
  })

  describe('Task 1.3: Why field (optional)', () => {
    it('should display "Why?" input field marked as optional', () => {
      render(<ChangeRequestForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)
      expect(screen.getByTestId('why-input')).toBeInTheDocument()
      expect(screen.getByText('(optional)')).toBeInTheDocument()
    })

    it('should accept text input', () => {
      render(<ChangeRequestForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)
      const input = screen.getByTestId('why-input')
      fireEvent.change(input, { target: { value: 'Because I finished my homework' } })
      expect(input).toHaveValue('Because I finished my homework')
    })
  })

  describe('Task 1.4: Submit button', () => {
    it('should display submit button with child-friendly text', () => {
      render(<ChangeRequestForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)
      expect(screen.getByTestId('submit-button')).toHaveTextContent('Send to Parent')
    })

    it('should be disabled when what-to-change is empty', () => {
      render(<ChangeRequestForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)
      expect(screen.getByTestId('submit-button')).toBeDisabled()
    })

    it('should be enabled when what-to-change has content', () => {
      render(<ChangeRequestForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)
      fireEvent.change(screen.getByTestId('what-to-change-input'), {
        target: { value: 'More time' },
      })
      expect(screen.getByTestId('submit-button')).not.toBeDisabled()
    })
  })

  describe('Task 1.6: Data testid attributes', () => {
    it('should have data-testid on all key elements', () => {
      render(<ChangeRequestForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)
      expect(screen.getByTestId('change-request-form')).toBeInTheDocument()
      expect(screen.getByTestId('what-to-change-input')).toBeInTheDocument()
      expect(screen.getByTestId('why-input')).toBeInTheDocument()
      expect(screen.getByTestId('submit-button')).toBeInTheDocument()
      expect(screen.getByTestId('cancel-button')).toBeInTheDocument()
    })
  })

  describe('Form submission', () => {
    it('should call onSubmit with form data when submitted', async () => {
      render(<ChangeRequestForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      fireEvent.change(screen.getByTestId('what-to-change-input'), {
        target: { value: 'More screen time' },
      })
      fireEvent.change(screen.getByTestId('why-input'), {
        target: { value: 'I finished homework' },
      })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          whatToChange: 'More screen time',
          why: 'I finished homework',
        })
      })
    })

    it('should submit with null why if optional field is empty', async () => {
      render(<ChangeRequestForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      fireEvent.change(screen.getByTestId('what-to-change-input'), {
        target: { value: 'More time' },
      })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          whatToChange: 'More time',
          why: null,
        })
      })
    })

    it('should trim whitespace from inputs', async () => {
      render(<ChangeRequestForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      fireEvent.change(screen.getByTestId('what-to-change-input'), {
        target: { value: '  More time  ' },
      })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          whatToChange: 'More time',
          why: null,
        })
      })
    })

    it('should not submit when only whitespace in required field', () => {
      render(<ChangeRequestForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      fireEvent.change(screen.getByTestId('what-to-change-input'), {
        target: { value: '   ' },
      })

      expect(screen.getByTestId('submit-button')).toBeDisabled()
    })
  })

  describe('Cancel button', () => {
    it('should call onCancel when cancel button clicked', () => {
      render(<ChangeRequestForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)
      fireEvent.click(screen.getByTestId('cancel-button'))
      expect(mockOnCancel).toHaveBeenCalled()
    })

    it('should display child-friendly cancel text', () => {
      render(<ChangeRequestForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)
      expect(screen.getByTestId('cancel-button')).toHaveTextContent('Never mind')
    })
  })

  describe('Loading state', () => {
    it('should show "Sending..." when submitting', () => {
      render(
        <ChangeRequestForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} isSubmitting={true} />
      )
      expect(screen.getByTestId('submit-button')).toHaveTextContent('Sending...')
    })

    it('should disable all inputs when submitting', () => {
      render(
        <ChangeRequestForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} isSubmitting={true} />
      )
      expect(screen.getByTestId('what-to-change-input')).toBeDisabled()
      expect(screen.getByTestId('why-input')).toBeDisabled()
      expect(screen.getByTestId('submit-button')).toBeDisabled()
      expect(screen.getByTestId('cancel-button')).toBeDisabled()
    })
  })

  describe('Error state', () => {
    it('should display error message when error prop provided', () => {
      render(
        <ChangeRequestForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          error="Something went wrong"
        />
      )
      expect(screen.getByTestId('form-error')).toHaveTextContent('Something went wrong')
    })

    it('should not display error element when no error', () => {
      render(<ChangeRequestForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)
      expect(screen.queryByTestId('form-error')).not.toBeInTheDocument()
    })
  })
})
