import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddChildForm } from './AddChildForm'

describe('AddChildForm', () => {
  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders all form fields', () => {
      render(<AddChildForm onSubmit={mockOnSubmit} />)

      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/photo url/i)).toBeInTheDocument()
    })

    it('renders required indicators for required fields', () => {
      render(<AddChildForm onSubmit={mockOnSubmit} />)

      const firstNameLabel = screen.getByText(/first name/i)
      const birthdateLabel = screen.getByText(/date of birth/i)

      expect(firstNameLabel.closest('label')).toHaveTextContent('*')
      expect(birthdateLabel.closest('label')).toHaveTextContent('*')
    })

    it('renders optional indicators for optional fields', () => {
      render(<AddChildForm onSubmit={mockOnSubmit} />)

      expect(screen.getByText(/last name/i).closest('label')).toHaveTextContent('(optional)')
      expect(screen.getByText(/photo url/i).closest('label')).toHaveTextContent('(optional)')
    })

    it('renders submit button', () => {
      render(<AddChildForm onSubmit={mockOnSubmit} />)

      expect(screen.getByRole('button', { name: /add child/i })).toBeInTheDocument()
    })

    it('renders cancel button when onCancel is provided', () => {
      render(<AddChildForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('does not render cancel button when onCancel is not provided', () => {
      render(<AddChildForm onSubmit={mockOnSubmit} />)

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    })

    it('focuses first name input on mount', async () => {
      render(<AddChildForm onSubmit={mockOnSubmit} />)

      await waitFor(() => {
        expect(screen.getByLabelText(/first name/i)).toHaveFocus()
      })
    })
  })

  describe('validation', () => {
    it('shows error when first name is empty', async () => {
      const user = userEvent.setup()
      render(<AddChildForm onSubmit={mockOnSubmit} />)

      const submitButton = screen.getByRole('button', { name: /add child/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument()
      })
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('shows error when birthdate is empty', async () => {
      const user = userEvent.setup()
      render(<AddChildForm onSubmit={mockOnSubmit} />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.type(firstNameInput, 'Emma')

      const submitButton = screen.getByRole('button', { name: /add child/i })
      await user.click(submitButton)

      await waitFor(() => {
        // Zod shows "Required" for missing dates
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('shows error when first name exceeds max length', async () => {
      const user = userEvent.setup()
      render(<AddChildForm onSubmit={mockOnSubmit} />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.type(firstNameInput, 'A'.repeat(51))

      const submitButton = screen.getByRole('button', { name: /add child/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/cannot be more than 50 characters/i)).toBeInTheDocument()
      })
    })

    it('shows error for invalid photo URL', async () => {
      const user = userEvent.setup()
      render(<AddChildForm onSubmit={mockOnSubmit} />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.type(firstNameInput, 'Emma')

      const birthdateInput = screen.getByLabelText(/date of birth/i)
      await user.type(birthdateInput, '2015-06-15')

      const photoUrlInput = screen.getByLabelText(/photo url/i)
      await user.type(photoUrlInput, 'not-a-url')

      const submitButton = screen.getByRole('button', { name: /add child/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/valid url/i)).toBeInTheDocument()
      })
    })

    it('shows hint about age requirement', () => {
      render(<AddChildForm onSubmit={mockOnSubmit} />)

      expect(screen.getByText(/under 18 years old/i)).toBeInTheDocument()
    })
  })

  describe('submission', () => {
    it('calls onSubmit with valid data', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockResolvedValue(undefined)
      render(<AddChildForm onSubmit={mockOnSubmit} />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.type(firstNameInput, 'Emma')

      const birthdateInput = screen.getByLabelText(/date of birth/i)
      await user.type(birthdateInput, '2015-06-15')

      const submitButton = screen.getByRole('button', { name: /add child/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1)
      })

      const callArg = mockOnSubmit.mock.calls[0][0]
      expect(callArg.firstName).toBe('Emma')
      expect(callArg.birthdate).toBeInstanceOf(Date)
    })

    it('includes lastName when provided', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockResolvedValue(undefined)
      render(<AddChildForm onSubmit={mockOnSubmit} />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.type(firstNameInput, 'Emma')

      const lastNameInput = screen.getByLabelText(/last name/i)
      await user.type(lastNameInput, 'Smith')

      const birthdateInput = screen.getByLabelText(/date of birth/i)
      await user.type(birthdateInput, '2015-06-15')

      const submitButton = screen.getByRole('button', { name: /add child/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1)
      })

      const callArg = mockOnSubmit.mock.calls[0][0]
      expect(callArg.lastName).toBe('Smith')
    })

    it('shows loading state when submitting', async () => {
      render(<AddChildForm onSubmit={mockOnSubmit} isSubmitting={true} />)

      expect(screen.getByRole('button', { name: /adding/i })).toBeInTheDocument()
    })

    it('disables buttons when submitting', () => {
      render(
        <AddChildForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isSubmitting={true}
        />
      )

      expect(screen.getByRole('button', { name: /adding/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
    })

    it('shows error message when submission fails', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockRejectedValue(new Error('Could not add child'))
      render(<AddChildForm onSubmit={mockOnSubmit} />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.type(firstNameInput, 'Emma')

      const birthdateInput = screen.getByLabelText(/date of birth/i)
      await user.type(birthdateInput, '2015-06-15')

      const submitButton = screen.getByRole('button', { name: /add child/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/could not add child/i)
      })
    })

    it('shows generic error message for non-Error exceptions', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockRejectedValue('Unknown error')
      render(<AddChildForm onSubmit={mockOnSubmit} />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.type(firstNameInput, 'Emma')

      const birthdateInput = screen.getByLabelText(/date of birth/i)
      await user.type(birthdateInput, '2015-06-15')

      const submitButton = screen.getByRole('button', { name: /add child/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i)
      })
    })
  })

  describe('cancel action', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(<AddChildForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })

    it('does not submit form when cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<AddChildForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.type(firstNameInput, 'Emma')

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('has accessible labels for all inputs', () => {
      render(<AddChildForm onSubmit={mockOnSubmit} />)

      expect(screen.getByRole('textbox', { name: /first name/i })).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: /last name/i })).toBeInTheDocument()
    })

    it('marks required fields with aria-required', () => {
      render(<AddChildForm onSubmit={mockOnSubmit} />)

      expect(screen.getByLabelText(/first name/i)).toHaveAttribute('aria-required', 'true')
      expect(screen.getByLabelText(/date of birth/i)).toHaveAttribute('aria-required', 'true')
    })

    it('sets aria-invalid on fields with errors', async () => {
      const user = userEvent.setup()
      render(<AddChildForm onSubmit={mockOnSubmit} />)

      const submitButton = screen.getByRole('button', { name: /add child/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByLabelText(/first name/i)).toHaveAttribute('aria-invalid', 'true')
      })
    })

    it('associates error messages with inputs via aria-describedby', async () => {
      const user = userEvent.setup()
      render(<AddChildForm onSubmit={mockOnSubmit} />)

      const submitButton = screen.getByRole('button', { name: /add child/i })
      await user.click(submitButton)

      await waitFor(() => {
        const firstNameInput = screen.getByLabelText(/first name/i)
        expect(firstNameInput).toHaveAttribute('aria-describedby', 'firstName-error')
      })
    })

    it('has aria-live region for screen reader announcements', () => {
      render(<AddChildForm onSubmit={mockOnSubmit} />)

      const liveRegion = document.querySelector('[aria-live="polite"]')
      expect(liveRegion).toBeInTheDocument()
    })

    it('buttons meet minimum touch target size (44x44px)', () => {
      render(<AddChildForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      const submitButton = screen.getByRole('button', { name: /add child/i })
      const cancelButton = screen.getByRole('button', { name: /cancel/i })

      expect(submitButton).toHaveClass('min-h-[44px]')
      expect(cancelButton).toHaveClass('min-h-[44px]')
    })
  })

  describe('keyboard navigation', () => {
    it('allows tab navigation through all fields', async () => {
      const user = userEvent.setup()
      render(<AddChildForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      // Focus is on firstName initially
      await waitFor(() => {
        expect(screen.getByLabelText(/first name/i)).toHaveFocus()
      })

      // Tab to lastName
      await user.tab()
      expect(screen.getByLabelText(/last name/i)).toHaveFocus()

      // Tab to birthdate
      await user.tab()
      expect(screen.getByLabelText(/date of birth/i)).toHaveFocus()

      // Tab to photoUrl
      await user.tab()
      expect(screen.getByLabelText(/photo url/i)).toHaveFocus()

      // Tab to cancel button
      await user.tab()
      expect(screen.getByRole('button', { name: /cancel/i })).toHaveFocus()

      // Tab to submit button
      await user.tab()
      expect(screen.getByRole('button', { name: /add child/i })).toHaveFocus()
    })

    it('can submit form with Enter key', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockResolvedValue(undefined)
      render(<AddChildForm onSubmit={mockOnSubmit} />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.type(firstNameInput, 'Emma')

      const birthdateInput = screen.getByLabelText(/date of birth/i)
      await user.type(birthdateInput, '2015-06-15')

      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })
    })
  })
})
