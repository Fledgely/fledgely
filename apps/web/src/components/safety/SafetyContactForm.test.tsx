import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SafetyContactForm } from './SafetyContactForm'
import { httpsCallable } from 'firebase/functions'

// Mock Firebase functions
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => vi.fn().mockResolvedValue({ data: { success: true } })),
}))

vi.mock('@/lib/firebase', () => ({
  functions: {},
}))

describe('SafetyContactForm', () => {
  const mockOnOpenChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render form when open', () => {
      render(
        <SafetyContactForm
          open={true}
          onOpenChange={mockOnOpenChange}
          source="login-page"
        />
      )

      expect(screen.getByText('Safety Resources')).toBeInTheDocument()
      expect(screen.getByText("We're here to help. Your message is private and secure.")).toBeInTheDocument()
    })

    it('should not render form when closed', () => {
      render(
        <SafetyContactForm
          open={false}
          onOpenChange={mockOnOpenChange}
          source="login-page"
        />
      )

      expect(screen.queryByText('Safety Resources')).not.toBeInTheDocument()
    })

    it('should have message textarea field', () => {
      render(
        <SafetyContactForm
          open={true}
          onOpenChange={mockOnOpenChange}
          source="login-page"
        />
      )

      expect(screen.getByLabelText(/How can we help/i)).toBeInTheDocument()
    })

    it('should have optional safe email field', () => {
      render(
        <SafetyContactForm
          open={true}
          onOpenChange={mockOnOpenChange}
          source="login-page"
        />
      )

      expect(screen.getByLabelText(/Safe email address/i)).toBeInTheDocument()
    })

    it('should have optional safe phone field', () => {
      render(
        <SafetyContactForm
          open={true}
          onOpenChange={mockOnOpenChange}
          source="login-page"
        />
      )

      expect(screen.getByLabelText(/Safe phone number/i)).toBeInTheDocument()
    })
  })

  describe('form submission', () => {
    it('should submit form with valid message', async () => {
      const user = userEvent.setup()

      render(
        <SafetyContactForm
          open={true}
          onOpenChange={mockOnOpenChange}
          source="login-page"
        />
      )

      const messageField = screen.getByLabelText(/How can we help/i)
      await user.type(messageField, 'I need help escaping')

      const submitButton = screen.getByRole('button', { name: /send/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText(/Thank you. Someone will reach out/i)
        ).toBeInTheDocument()
      })
    })

    it('should show validation error for empty message', async () => {
      const user = userEvent.setup()

      render(
        <SafetyContactForm
          open={true}
          onOpenChange={mockOnOpenChange}
          source="login-page"
        />
      )

      const submitButton = screen.getByRole('button', { name: /send/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Message is required/i)).toBeInTheDocument()
      })
    })
  })

  describe('form clearing', () => {
    it('should clear form data when closed', async () => {
      const user = userEvent.setup()

      const { rerender } = render(
        <SafetyContactForm
          open={true}
          onOpenChange={mockOnOpenChange}
          source="login-page"
        />
      )

      const messageField = screen.getByLabelText(/How can we help/i)
      await user.type(messageField, 'Test message')

      // Close the form
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      // Reopen
      rerender(
        <SafetyContactForm
          open={true}
          onOpenChange={mockOnOpenChange}
          source="login-page"
        />
      )

      // Message should be cleared
      const newMessageField = screen.getByLabelText(/How can we help/i)
      expect(newMessageField).toHaveValue('')
    })
  })

  describe('visual subtlety requirements', () => {
    it('should use neutral language (no alarming words)', () => {
      render(
        <SafetyContactForm
          open={true}
          onOpenChange={mockOnOpenChange}
          source="login-page"
        />
      )

      // Verify neutral language is used
      expect(screen.getByText('Safety Resources')).toBeInTheDocument()
      expect(screen.getByText(/We're here to help/i)).toBeInTheDocument()

      // Verify alarming words are NOT present
      const content = document.body.textContent || ''
      expect(content.toLowerCase()).not.toContain('escape')
      expect(content.toLowerCase()).not.toContain('abuse')
      expect(content.toLowerCase()).not.toContain('violence')
      expect(content.toLowerCase()).not.toContain('danger')
    })

    it('should show neutral success message', async () => {
      const user = userEvent.setup()

      render(
        <SafetyContactForm
          open={true}
          onOpenChange={mockOnOpenChange}
          source="login-page"
        />
      )

      const messageField = screen.getByLabelText(/How can we help/i)
      await user.type(messageField, 'I need help')

      const submitButton = screen.getByRole('button', { name: /send/i })
      await user.click(submitButton)

      await waitFor(() => {
        const successMessage = screen.getByText(
          /Thank you. Someone will reach out to your safe contact if provided/i
        )
        expect(successMessage).toBeInTheDocument()
      })
    })
  })

  describe('accessibility', () => {
    it('should have proper aria labels', () => {
      render(
        <SafetyContactForm
          open={true}
          onOpenChange={mockOnOpenChange}
          source="login-page"
        />
      )

      expect(screen.getByLabelText(/How can we help/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Safe email address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Safe phone number/i)).toBeInTheDocument()
    })
  })

  describe('error handling', () => {
    it('should show error message when network request fails', async () => {
      // Mock network failure
      vi.mocked(httpsCallable).mockReturnValue(
        vi.fn().mockRejectedValue(new Error('Network error'))
      )

      const user = userEvent.setup()

      render(
        <SafetyContactForm
          open={true}
          onOpenChange={mockOnOpenChange}
          source="login-page"
        />
      )

      const messageField = screen.getByLabelText(/How can we help/i)
      await user.type(messageField, 'I need help')

      const submitButton = screen.getByRole('button', { name: /send/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText(/We couldn't complete your request/i)
        ).toBeInTheDocument()
      })

      // Should show retry button
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })

    it('should allow retry after network failure', async () => {
      // First call fails, second succeeds
      const mockCallable = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: { success: true } })

      vi.mocked(httpsCallable).mockReturnValue(mockCallable)

      const user = userEvent.setup()

      render(
        <SafetyContactForm
          open={true}
          onOpenChange={mockOnOpenChange}
          source="login-page"
        />
      )

      const messageField = screen.getByLabelText(/How can we help/i)
      await user.type(messageField, 'I need help')

      const submitButton = screen.getByRole('button', { name: /send/i })
      await user.click(submitButton)

      // Wait for error
      await waitFor(() => {
        expect(
          screen.getByText(/We couldn't complete your request/i)
        ).toBeInTheDocument()
      })

      // Click retry
      const retryButton = screen.getByRole('button', { name: /try again/i })
      await user.click(retryButton)

      // Form should be visible again for retry
      expect(screen.getByLabelText(/How can we help/i)).toBeInTheDocument()
    })
  })

  describe('legal parent access links', () => {
    it('should render legal parent access section', () => {
      render(
        <SafetyContactForm
          open={true}
          onOpenChange={mockOnOpenChange}
          source="login-page"
        />
      )

      expect(
        screen.getByText(/legal parent seeking access/i)
      ).toBeInTheDocument()
    })

    it('should render submit request link', () => {
      render(
        <SafetyContactForm
          open={true}
          onOpenChange={mockOnOpenChange}
          source="login-page"
        />
      )

      expect(
        screen.getByRole('button', { name: /submit request/i })
      ).toBeInTheDocument()
    })

    it('should render check status link', () => {
      render(
        <SafetyContactForm
          open={true}
          onOpenChange={mockOnOpenChange}
          source="login-page"
        />
      )

      expect(
        screen.getByRole('button', { name: /check status/i })
      ).toBeInTheDocument()
    })

    it('should open legal petition form when submit request is clicked', async () => {
      const user = userEvent.setup()

      render(
        <SafetyContactForm
          open={true}
          onOpenChange={mockOnOpenChange}
          source="login-page"
        />
      )

      const submitRequestButton = screen.getByRole('button', {
        name: /submit request/i,
      })
      await user.click(submitRequestButton)

      // Legal petition form should appear
      await waitFor(() => {
        expect(
          screen.getByText(/Legal Parent Access Request/i)
        ).toBeInTheDocument()
      })
    })

    it('should open petition status checker when check status is clicked', async () => {
      const user = userEvent.setup()

      render(
        <SafetyContactForm
          open={true}
          onOpenChange={mockOnOpenChange}
          source="login-page"
        />
      )

      const checkStatusButton = screen.getByRole('button', {
        name: /check status/i,
      })
      await user.click(checkStatusButton)

      // Petition status checker should appear
      await waitFor(() => {
        expect(screen.getByText(/Check Petition Status/i)).toBeInTheDocument()
      })
    })
  })
})
