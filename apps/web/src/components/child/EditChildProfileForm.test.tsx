import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditChildProfileForm } from './EditChildProfileForm'
import type { ChildProfile } from '@fledgely/contracts'

describe('EditChildProfileForm', () => {
  const mockChild: ChildProfile = {
    id: 'test-child-123',
    familyId: 'test-family-456',
    firstName: 'Emma',
    lastName: 'Smith',
    nickname: 'Emmy',
    birthdate: new Date('2015-06-15'),
    photoUrl: null,
    guardians: [
      {
        uid: 'test-user-789',
        permissions: 'full',
        grantedAt: new Date(),
      },
    ],
    createdAt: new Date(),
    createdBy: 'test-user-789',
    updatedAt: null,
    updatedBy: null,
    custodyDeclaration: null,
    custodyHistory: [],
    requiresSharedCustodySafeguards: false,
  }

  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()
  const mockOnDirtyStateChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnSubmit.mockResolvedValue(undefined)
  })

  // ============================================
  // RENDERING TESTS
  // ============================================
  describe('rendering', () => {
    it('renders all form fields', () => {
      render(<EditChildProfileForm child={mockChild} onSubmit={mockOnSubmit} />)

      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/nickname/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/photo url/i)).toBeInTheDocument()
    })

    it('pre-fills form with child data', () => {
      render(<EditChildProfileForm child={mockChild} onSubmit={mockOnSubmit} />)

      expect(screen.getByLabelText(/first name/i)).toHaveValue('Emma')
      expect(screen.getByLabelText(/last name/i)).toHaveValue('Smith')
      expect(screen.getByLabelText(/nickname/i)).toHaveValue('Emmy')
    })

    it('shows calculated age', () => {
      render(<EditChildProfileForm child={mockChild} onSubmit={mockOnSubmit} />)

      // The age should be calculated from birthdate
      expect(screen.getByText(/years old/i)).toBeInTheDocument()
    })

    it('renders Save Changes button', () => {
      render(<EditChildProfileForm child={mockChild} onSubmit={mockOnSubmit} />)

      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
    })

    it('renders Cancel button when onCancel provided', () => {
      render(
        <EditChildProfileForm
          child={mockChild}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('does not render Cancel button when onCancel not provided', () => {
      render(<EditChildProfileForm child={mockChild} onSubmit={mockOnSubmit} />)

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    })
  })

  // ============================================
  // FORM SUBMISSION TESTS
  // ============================================
  describe('form submission', () => {
    it('calls onSubmit with updated data', async () => {
      const user = userEvent.setup()
      render(<EditChildProfileForm child={mockChild} onSubmit={mockOnSubmit} />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.clear(firstNameInput)
      await user.type(firstNameInput, 'Emily')

      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: 'Emily',
          })
        )
      })
    })

    it('shows Saving... text when submitting', async () => {
      render(
        <EditChildProfileForm
          child={mockChild}
          onSubmit={mockOnSubmit}
          isSubmitting={true}
        />
      )

      expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument()
    })

    it('disables button when submitting', () => {
      render(
        <EditChildProfileForm
          child={mockChild}
          onSubmit={mockOnSubmit}
          isSubmitting={true}
        />
      )

      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
    })

    it('disables save button when form is not dirty', () => {
      render(<EditChildProfileForm child={mockChild} onSubmit={mockOnSubmit} />)

      expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
    })

    it('enables save button when form is dirty', async () => {
      const user = userEvent.setup()
      render(<EditChildProfileForm child={mockChild} onSubmit={mockOnSubmit} />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.clear(firstNameInput)
      await user.type(firstNameInput, 'Emily')

      expect(screen.getByRole('button', { name: /save changes/i })).toBeEnabled()
    })
  })

  // ============================================
  // VALIDATION TESTS
  // ============================================
  describe('validation', () => {
    it('shows error for empty first name', async () => {
      const user = userEvent.setup()
      render(<EditChildProfileForm child={mockChild} onSubmit={mockOnSubmit} />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.clear(firstNameInput)
      // Trigger validation by trying to submit
      // First make the form dirty with another field
      const nicknameInput = screen.getByLabelText(/nickname/i)
      await user.clear(nicknameInput)
      await user.type(nicknameInput, 'Test')

      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument()
      })
    })

    it('shows error for invalid photo URL', async () => {
      const user = userEvent.setup()
      render(<EditChildProfileForm child={mockChild} onSubmit={mockOnSubmit} />)

      const photoUrlInput = screen.getByLabelText(/photo url/i)
      await user.type(photoUrlInput, 'not-a-valid-url')

      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(screen.getByText(/valid url/i)).toBeInTheDocument()
      })
    })
  })

  // ============================================
  // ERROR HANDLING TESTS
  // ============================================
  describe('error handling', () => {
    it('displays submit error when onSubmit throws', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Failed to update profile'
      mockOnSubmit.mockRejectedValue(new Error(errorMessage))

      render(<EditChildProfileForm child={mockChild} onSubmit={mockOnSubmit} />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.clear(firstNameInput)
      await user.type(firstNameInput, 'Emily')

      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(errorMessage)
      })
    })

    it('displays generic error for non-Error throws', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockRejectedValue('String error')

      render(<EditChildProfileForm child={mockChild} onSubmit={mockOnSubmit} />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.clear(firstNameInput)
      await user.type(firstNameInput, 'Emily')

      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i)
      })
    })
  })

  // ============================================
  // CANCEL TESTS
  // ============================================
  describe('cancel functionality', () => {
    it('calls onCancel when Cancel button clicked', async () => {
      const user = userEvent.setup()
      render(
        <EditChildProfileForm
          child={mockChild}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(mockOnCancel).toHaveBeenCalled()
    })

    it('disables Cancel button when submitting', () => {
      render(
        <EditChildProfileForm
          child={mockChild}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isSubmitting={true}
        />
      )

      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
    })
  })

  // ============================================
  // DIRTY STATE TESTS
  // ============================================
  describe('dirty state', () => {
    it('calls onDirtyStateChange when form becomes dirty', async () => {
      const user = userEvent.setup()
      render(
        <EditChildProfileForm
          child={mockChild}
          onSubmit={mockOnSubmit}
          onDirtyStateChange={mockOnDirtyStateChange}
        />
      )

      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.clear(firstNameInput)
      await user.type(firstNameInput, 'Emily')

      await waitFor(() => {
        expect(mockOnDirtyStateChange).toHaveBeenCalledWith(true)
      })
    })

    it('shows unsaved changes message when dirty', async () => {
      const user = userEvent.setup()
      render(<EditChildProfileForm child={mockChild} onSubmit={mockOnSubmit} />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.clear(firstNameInput)
      await user.type(firstNameInput, 'Emily')

      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // ACCESSIBILITY TESTS
  // ============================================
  describe('accessibility', () => {
    it('has accessible form fields with proper labels', () => {
      render(<EditChildProfileForm child={mockChild} onSubmit={mockOnSubmit} />)

      // All inputs should be accessible by their labels
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/nickname/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/photo url/i)).toBeInTheDocument()
    })

    it('marks required fields with asterisk', () => {
      render(<EditChildProfileForm child={mockChild} onSubmit={mockOnSubmit} />)

      // Required fields should have * indicator
      const firstNameLabel = screen.getByText(/first name/i).closest('label')
      expect(firstNameLabel).toHaveTextContent('*')

      const birthdateLabel = screen.getByText(/date of birth/i).closest('label')
      expect(birthdateLabel).toHaveTextContent('*')
    })

    it('has aria-live region for error announcements', () => {
      render(<EditChildProfileForm child={mockChild} onSubmit={mockOnSubmit} />)

      expect(screen.getByRole('status', { hidden: true })).toHaveAttribute(
        'aria-live',
        'polite'
      )
    })

    it('sets aria-invalid on fields with errors', async () => {
      const user = userEvent.setup()
      render(<EditChildProfileForm child={mockChild} onSubmit={mockOnSubmit} />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.clear(firstNameInput)

      // Make form dirty with another field
      const nicknameInput = screen.getByLabelText(/nickname/i)
      await user.clear(nicknameInput)
      await user.type(nicknameInput, 'Test')

      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(firstNameInput).toHaveAttribute('aria-invalid', 'true')
      })
    })

    it('buttons meet 44x44px touch target requirement', () => {
      render(
        <EditChildProfileForm
          child={mockChild}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      const cancelButton = screen.getByRole('button', { name: /cancel/i })

      // Check that min-h-[44px] class is applied
      expect(saveButton).toHaveClass('min-h-[44px]')
      expect(cancelButton).toHaveClass('min-h-[44px]')
    })
  })

  // ============================================
  // EDGE CASE TESTS
  // ============================================
  describe('edge cases', () => {
    it('handles child with null lastName', () => {
      const childWithNullLastName = { ...mockChild, lastName: null }
      render(
        <EditChildProfileForm child={childWithNullLastName} onSubmit={mockOnSubmit} />
      )

      expect(screen.getByLabelText(/last name/i)).toHaveValue('')
    })

    it('handles child with null nickname', () => {
      const childWithNullNickname = { ...mockChild, nickname: null }
      render(
        <EditChildProfileForm child={childWithNullNickname} onSubmit={mockOnSubmit} />
      )

      expect(screen.getByLabelText(/nickname/i)).toHaveValue('')
    })

    it('handles child with null photoUrl', () => {
      render(<EditChildProfileForm child={mockChild} onSubmit={mockOnSubmit} />)

      expect(screen.getByLabelText(/photo url/i)).toHaveValue('')
    })

    it('handles rapid submit clicks (idempotency)', async () => {
      const user = userEvent.setup()
      let resolveSubmit: () => void
      mockOnSubmit.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveSubmit = resolve
          })
      )

      render(<EditChildProfileForm child={mockChild} onSubmit={mockOnSubmit} />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.clear(firstNameInput)
      await user.type(firstNameInput, 'Emily')

      const saveButton = screen.getByRole('button', { name: /save changes/i })

      // Click submit multiple times rapidly
      await user.click(saveButton)
      await user.click(saveButton)
      await user.click(saveButton)

      // Form should be in submitting state after first click
      // Additional clicks should be ignored
      expect(mockOnSubmit).toHaveBeenCalledTimes(1)

      // Resolve the submission
      resolveSubmit!()
    })
  })
})
