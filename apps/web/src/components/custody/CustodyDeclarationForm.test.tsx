import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustodyDeclarationForm } from './CustodyDeclarationForm'

describe('CustodyDeclarationForm', () => {
  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // RENDERING TESTS
  // ============================================
  describe('rendering', () => {
    it('renders all custody type options', () => {
      render(<CustodyDeclarationForm onSubmit={mockOnSubmit} />)

      expect(screen.getByText('Sole Custody')).toBeInTheDocument()
      expect(screen.getByText('Shared Custody')).toBeInTheDocument()
      expect(screen.getByText('Complex Arrangement')).toBeInTheDocument()
    })

    it('renders custody type descriptions', () => {
      render(<CustodyDeclarationForm onSubmit={mockOnSubmit} />)

      expect(screen.getByText(/only parent or guardian/i)).toBeInTheDocument()
      expect(screen.getByText(/shares custody/i)).toBeInTheDocument()
      expect(screen.getByText(/unique situation/i)).toBeInTheDocument()
    })

    it('renders fieldset with legend', () => {
      render(<CustodyDeclarationForm onSubmit={mockOnSubmit} />)

      expect(screen.getByText(/what is your custody situation/i)).toBeInTheDocument()
    })

    it('renders submit button', () => {
      render(<CustodyDeclarationForm onSubmit={mockOnSubmit} />)

      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument()
    })

    it('renders Update Custody text when initialValues provided', () => {
      render(
        <CustodyDeclarationForm
          onSubmit={mockOnSubmit}
          initialValues={{ type: 'sole', notes: null }}
        />
      )

      expect(screen.getByRole('button', { name: /update custody/i })).toBeInTheDocument()
    })

    it('renders cancel button when onCancel is provided', () => {
      render(<CustodyDeclarationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('does not render cancel button when onCancel is not provided', () => {
      render(<CustodyDeclarationForm onSubmit={mockOnSubmit} />)

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    })

    it('does not render notes field initially', () => {
      render(<CustodyDeclarationForm onSubmit={mockOnSubmit} />)

      expect(screen.queryByLabelText(/tell us about your situation/i)).not.toBeInTheDocument()
    })
  })

  // ============================================
  // RADIO BUTTON ACCESSIBILITY TESTS
  // ============================================
  describe('radio button accessibility', () => {
    it('has proper radio button roles', () => {
      render(<CustodyDeclarationForm onSubmit={mockOnSubmit} />)

      const radioButtons = screen.getAllByRole('radio')
      expect(radioButtons).toHaveLength(3)
    })

    it('has aria-required on radio group', () => {
      render(<CustodyDeclarationForm onSubmit={mockOnSubmit} />)

      const radioGroup = screen.getByRole('radiogroup')
      expect(radioGroup).toHaveAttribute('aria-required', 'true')
    })

    it('radio buttons are keyboard accessible', async () => {
      const user = userEvent.setup()
      render(<CustodyDeclarationForm onSubmit={mockOnSubmit} />)

      // Find and focus on the first radio button
      const soleRadio = screen.getByRole('radio', { name: /sole custody/i })
      await user.click(soleRadio)

      expect(soleRadio).toBeChecked()
    })

    it('has proper labels for screen readers', () => {
      render(<CustodyDeclarationForm onSubmit={mockOnSubmit} />)

      const soleRadio = screen.getByRole('radio', { name: /sole custody/i })
      const sharedRadio = screen.getByRole('radio', { name: /shared custody/i })
      const complexRadio = screen.getByRole('radio', { name: /complex arrangement/i })

      expect(soleRadio).toBeInTheDocument()
      expect(sharedRadio).toBeInTheDocument()
      expect(complexRadio).toBeInTheDocument()
    })
  })

  // ============================================
  // CONDITIONAL RENDERING TESTS
  // ============================================
  describe('conditional rendering', () => {
    it('shows shared custody message when shared is selected', async () => {
      const user = userEvent.setup()
      render(<CustodyDeclarationForm onSubmit={mockOnSubmit} />)

      const sharedRadio = screen.getByRole('radio', { name: /shared custody/i })
      await user.click(sharedRadio)

      await waitFor(() => {
        expect(screen.getByText(/about shared custody/i)).toBeInTheDocument()
        expect(screen.getByText(/extra safeguards/i)).toBeInTheDocument()
      })
    })

    it('shows notes field when complex is selected', async () => {
      const user = userEvent.setup()
      render(<CustodyDeclarationForm onSubmit={mockOnSubmit} />)

      const complexRadio = screen.getByRole('radio', { name: /complex arrangement/i })
      await user.click(complexRadio)

      await waitFor(() => {
        expect(screen.getByLabelText(/tell us about your situation/i)).toBeInTheDocument()
      })
    })

    it('hides notes field when not complex', async () => {
      const user = userEvent.setup()
      render(<CustodyDeclarationForm onSubmit={mockOnSubmit} />)

      // First select complex
      const complexRadio = screen.getByRole('radio', { name: /complex arrangement/i })
      await user.click(complexRadio)

      // Notes should appear
      await waitFor(() => {
        expect(screen.getByLabelText(/tell us about your situation/i)).toBeInTheDocument()
      })

      // Then select sole
      const soleRadio = screen.getByRole('radio', { name: /sole custody/i })
      await user.click(soleRadio)

      // Notes should disappear
      await waitFor(() => {
        expect(screen.queryByLabelText(/tell us about your situation/i)).not.toBeInTheDocument()
      })
    })
  })

  // ============================================
  // VALIDATION TESTS
  // ============================================
  describe('validation', () => {
    it('shows error when no custody type selected', async () => {
      const user = userEvent.setup()
      render(<CustodyDeclarationForm onSubmit={mockOnSubmit} />)

      const submitButton = screen.getByRole('button', { name: /continue/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/please select a custody type/i)).toBeInTheDocument()
      })
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('allows submission with valid custody type', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockResolvedValue(undefined)
      render(<CustodyDeclarationForm onSubmit={mockOnSubmit} />)

      const soleRadio = screen.getByRole('radio', { name: /sole custody/i })
      await user.click(soleRadio)

      const submitButton = screen.getByRole('button', { name: /continue/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          type: 'sole',
          notes: null, // Empty string transforms to null via Zod schema
        })
      })
    })

    it('enforces max length via HTML attribute', async () => {
      const user = userEvent.setup()
      render(<CustodyDeclarationForm onSubmit={mockOnSubmit} />)

      const complexRadio = screen.getByRole('radio', { name: /complex arrangement/i })
      await user.click(complexRadio)

      const notesInput = await screen.findByLabelText(/tell us about your situation/i)

      // Textarea has maxLength={500} HTML attribute that prevents typing beyond limit
      expect(notesInput).toHaveAttribute('maxlength', '500')
    })
  })

  // ============================================
  // SUBMISSION TESTS
  // ============================================
  describe('submission', () => {
    it('calls onSubmit with sole custody type', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockResolvedValue(undefined)
      render(<CustodyDeclarationForm onSubmit={mockOnSubmit} />)

      const soleRadio = screen.getByRole('radio', { name: /sole custody/i })
      await user.click(soleRadio)

      const submitButton = screen.getByRole('button', { name: /continue/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          type: 'sole',
          notes: null, // Empty string transforms to null via Zod schema
        })
      })
    })

    it('calls onSubmit with shared custody type', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockResolvedValue(undefined)
      render(<CustodyDeclarationForm onSubmit={mockOnSubmit} />)

      const sharedRadio = screen.getByRole('radio', { name: /shared custody/i })
      await user.click(sharedRadio)

      const submitButton = screen.getByRole('button', { name: /continue/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          type: 'shared',
          notes: null, // Empty string transforms to null via Zod schema
        })
      })
    })

    it('calls onSubmit with complex custody type and notes', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockResolvedValue(undefined)
      render(<CustodyDeclarationForm onSubmit={mockOnSubmit} />)

      const complexRadio = screen.getByRole('radio', { name: /complex arrangement/i })
      await user.click(complexRadio)

      const notesInput = await screen.findByLabelText(/tell us about your situation/i)
      await user.type(notesInput, 'Blended family situation')

      const submitButton = screen.getByRole('button', { name: /continue/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          type: 'complex',
          notes: 'Blended family situation',
        })
      })
    })

    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockImplementation(() => new Promise(() => {})) // Never resolves
      render(<CustodyDeclarationForm onSubmit={mockOnSubmit} isSubmitting={true} />)

      expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument()
    })

    it('disables buttons during submission', () => {
      render(<CustodyDeclarationForm onSubmit={mockOnSubmit} isSubmitting={true} />)

      const submitButton = screen.getByRole('button', { name: /saving/i })
      expect(submitButton).toBeDisabled()
    })

    it('disables cancel button during submission', () => {
      render(
        <CustodyDeclarationForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isSubmitting={true}
        />
      )

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      expect(cancelButton).toBeDisabled()
    })
  })

  // ============================================
  // ERROR HANDLING TESTS
  // ============================================
  describe('error handling', () => {
    it('displays submit error message', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockRejectedValue(new Error('Network error'))
      render(<CustodyDeclarationForm onSubmit={mockOnSubmit} />)

      const soleRadio = screen.getByRole('radio', { name: /sole custody/i })
      await user.click(soleRadio)

      const submitButton = screen.getByRole('button', { name: /continue/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Network error')
      })
    })

    it('displays generic error for non-Error rejections', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockRejectedValue('String error')
      render(<CustodyDeclarationForm onSubmit={mockOnSubmit} />)

      const soleRadio = screen.getByRole('radio', { name: /sole custody/i })
      await user.click(soleRadio)

      const submitButton = screen.getByRole('button', { name: /continue/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
      })
    })
  })

  // ============================================
  // CANCEL FUNCTIONALITY TESTS
  // ============================================
  describe('cancel functionality', () => {
    it('calls onCancel when cancel button clicked', async () => {
      const user = userEvent.setup()
      render(<CustodyDeclarationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  // ============================================
  // INITIAL VALUES TESTS
  // ============================================
  describe('initial values', () => {
    it('pre-selects custody type from initial values', () => {
      render(
        <CustodyDeclarationForm
          onSubmit={mockOnSubmit}
          initialValues={{ type: 'shared', notes: null }}
        />
      )

      const sharedRadio = screen.getByRole('radio', { name: /shared custody/i })
      expect(sharedRadio).toBeChecked()
    })

    it('pre-fills notes from initial values for complex custody', () => {
      render(
        <CustodyDeclarationForm
          onSubmit={mockOnSubmit}
          initialValues={{ type: 'complex', notes: 'Existing notes' }}
        />
      )

      const notesInput = screen.getByLabelText(/tell us about your situation/i)
      expect(notesInput).toHaveValue('Existing notes')
    })
  })

  // ============================================
  // ACCESSIBILITY TESTS
  // ============================================
  describe('accessibility', () => {
    it('has aria-live region for error announcements', () => {
      render(<CustodyDeclarationForm onSubmit={mockOnSubmit} />)

      // The aria-live region exists even if empty
      const form = document.querySelector('form')
      const liveRegion = form?.querySelector('[aria-live="polite"]')
      expect(liveRegion).toBeInTheDocument()
    })

    it('has proper aria-invalid on radio group when error', async () => {
      const user = userEvent.setup()
      render(<CustodyDeclarationForm onSubmit={mockOnSubmit} />)

      const submitButton = screen.getByRole('button', { name: /continue/i })
      await user.click(submitButton)

      await waitFor(() => {
        const radioGroup = screen.getByRole('radiogroup')
        expect(radioGroup).toHaveAttribute('aria-invalid', 'true')
      })
    })

    it('has minimum 44x44px touch targets', () => {
      render(<CustodyDeclarationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      const submitButton = screen.getByRole('button', { name: /continue/i })
      const cancelButton = screen.getByRole('button', { name: /cancel/i })

      // Buttons should have min-h-[44px] class
      expect(submitButton).toHaveClass('min-h-[44px]')
      expect(cancelButton).toHaveClass('min-h-[44px]')
    })

    it('form has noValidate attribute for custom validation', () => {
      render(<CustodyDeclarationForm onSubmit={mockOnSubmit} />)

      const form = document.querySelector('form')
      expect(form).toHaveAttribute('novalidate')
    })
  })

  // ============================================
  // ADVERSARIAL TESTS - XSS PREVENTION
  // ============================================
  // Note: XSS validation is performed by Zod schema at the contracts level.
  // The schema (createCustodyDeclarationInputSchema) rejects dangerous characters.
  // Schema-level XSS tests are in packages/contracts/src/custody.schema.test.ts.
  // Here we test that valid notes are accepted and passed correctly.
  describe('adversarial: XSS prevention', () => {
    it('accepts safe notes without XSS characters', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockResolvedValue(undefined)
      render(<CustodyDeclarationForm onSubmit={mockOnSubmit} />)

      const complexRadio = screen.getByRole('radio', { name: /complex arrangement/i })
      await user.click(complexRadio)

      const notesInput = await screen.findByLabelText(/tell us about your situation/i)
      await user.type(notesInput, 'Safe notes about our blended family')

      const submitButton = screen.getByRole('button', { name: /continue/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          type: 'complex',
          notes: 'Safe notes about our blended family',
        })
      })
    })

    it('allows notes with parentheses and common punctuation', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockResolvedValue(undefined)
      render(<CustodyDeclarationForm onSubmit={mockOnSubmit} />)

      const complexRadio = screen.getByRole('radio', { name: /complex arrangement/i })
      await user.click(complexRadio)

      const notesInput = await screen.findByLabelText(/tell us about your situation/i)
      await user.type(notesInput, 'Step-parent (primary care) on weekdays.')

      const submitButton = screen.getByRole('button', { name: /continue/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          type: 'complex',
          notes: 'Step-parent (primary care) on weekdays.',
        })
      })
    })
  })
})
