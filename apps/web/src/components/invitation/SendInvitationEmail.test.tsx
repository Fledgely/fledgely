import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SendInvitationEmail, SendInvitationEmailProps } from './SendInvitationEmail'

/**
 * SendInvitationEmail Component Tests
 *
 * Story 3.2: Invitation Delivery
 *
 * Tests verify:
 * - Email input validation
 * - Send button functionality
 * - Loading states
 * - Success/error feedback
 * - Rate limiting display
 * - Accessibility (44x44px touch targets, aria-live)
 */

describe('SendInvitationEmail', () => {
  const defaultProps: SendInvitationEmailProps = {
    onSendEmail: vi.fn(),
    sending: false,
    sent: false,
    error: null,
    canSend: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================================================
  // Rendering Tests
  // ============================================================================

  describe('rendering', () => {
    it('renders email input field', () => {
      render(<SendInvitationEmail {...defaultProps} />)

      expect(screen.getByLabelText(/send invitation by email/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/enter email address/i)).toBeInTheDocument()
    })

    it('renders send button', () => {
      render(<SendInvitationEmail {...defaultProps} />)

      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
    })

    it('renders helper text', () => {
      render(<SendInvitationEmail {...defaultProps} />)

      expect(
        screen.getByText(/we will send an email with a link to join your family/i)
      ).toBeInTheDocument()
    })

    it('shows last sent email when provided', () => {
      render(<SendInvitationEmail {...defaultProps} lastSentTo="ja***@example.com" />)

      expect(screen.getByText(/last sent to/i)).toBeInTheDocument()
      expect(screen.getByText('ja***@example.com')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Input Validation Tests
  // ============================================================================

  describe('input validation', () => {
    it('disables submit button when email is empty', () => {
      render(<SendInvitationEmail {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /send/i })
      expect(submitButton).toBeDisabled()
    })

    it('enables submit button when email is entered', async () => {
      const user = userEvent.setup()
      render(<SendInvitationEmail {...defaultProps} />)

      const input = screen.getByPlaceholderText(/enter email address/i)
      await user.type(input, 'test@example.com')

      const submitButton = screen.getByRole('button', { name: /send/i })
      expect(submitButton).not.toBeDisabled()
    })

    it('relies on HTML5 email validation for invalid formats', async () => {
      // Note: HTML5 email input type provides built-in validation
      // Our custom validation is a backup for cases that slip through
      const user = userEvent.setup()
      render(<SendInvitationEmail {...defaultProps} />)

      const input = screen.getByPlaceholderText(/enter email address/i) as HTMLInputElement
      await user.type(input, 'invalid-email')

      // HTML5 validation should mark the input as invalid
      expect(input.validity.valid).toBe(false)
    })

    it('clears HTML5 validation error when user types valid email', async () => {
      const user = userEvent.setup()
      render(<SendInvitationEmail {...defaultProps} />)

      const input = screen.getByPlaceholderText(/enter email address/i) as HTMLInputElement

      // Type invalid email
      await user.type(input, 'invalid')
      expect(input.validity.valid).toBe(false)

      // Clear and type valid email
      await user.clear(input)
      await user.type(input, 'valid@example.com')

      expect(input.validity.valid).toBe(true)
    })

    it('accepts valid email format', async () => {
      const onSendEmail = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      render(<SendInvitationEmail {...defaultProps} onSendEmail={onSendEmail} />)

      const input = screen.getByPlaceholderText(/enter email address/i)
      await user.type(input, 'test@example.com')

      const submitButton = screen.getByRole('button', { name: /send/i })
      await user.click(submitButton)

      expect(onSendEmail).toHaveBeenCalledWith('test@example.com')
    })
  })

  // ============================================================================
  // Submit Behavior Tests
  // ============================================================================

  describe('submit behavior', () => {
    it('calls onSendEmail with valid email', async () => {
      const onSendEmail = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      render(<SendInvitationEmail {...defaultProps} onSendEmail={onSendEmail} />)

      const input = screen.getByPlaceholderText(/enter email address/i)
      await user.type(input, 'coparent@example.com')

      const submitButton = screen.getByRole('button', { name: /send/i })
      await user.click(submitButton)

      expect(onSendEmail).toHaveBeenCalledWith('coparent@example.com')
    })

    it('does not call onSendEmail when rate limited', async () => {
      const onSendEmail = vi.fn()
      const user = userEvent.setup()
      render(
        <SendInvitationEmail {...defaultProps} onSendEmail={onSendEmail} canSend={false} />
      )

      const input = screen.getByPlaceholderText(/enter email address/i)
      await user.type(input, 'test@example.com')

      const submitButton = screen.getByRole('button', { name: /send/i })
      await user.click(submitButton)

      expect(onSendEmail).not.toHaveBeenCalled()
    })

    it('submits on Enter key press', async () => {
      const onSendEmail = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      render(<SendInvitationEmail {...defaultProps} onSendEmail={onSendEmail} />)

      const input = screen.getByPlaceholderText(/enter email address/i)
      await user.type(input, 'test@example.com{Enter}')

      expect(onSendEmail).toHaveBeenCalledWith('test@example.com')
    })
  })

  // ============================================================================
  // Loading State Tests
  // ============================================================================

  describe('loading state', () => {
    it('disables input when sending', () => {
      render(<SendInvitationEmail {...defaultProps} sending={true} />)

      const input = screen.getByPlaceholderText(/enter email address/i)
      expect(input).toBeDisabled()
    })

    it('disables button when sending', () => {
      render(<SendInvitationEmail {...defaultProps} sending={true} />)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('shows loading indicator when sending', () => {
      render(<SendInvitationEmail {...defaultProps} sending={true} />)

      expect(screen.getByLabelText(/sending email/i)).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Success/Error State Tests
  // ============================================================================

  describe('success state', () => {
    it('shows success message when sent', () => {
      render(<SendInvitationEmail {...defaultProps} sent={true} />)

      expect(screen.getByText(/email sent successfully/i)).toBeInTheDocument()
    })

    it('does not show success message when sending', () => {
      render(<SendInvitationEmail {...defaultProps} sent={true} sending={true} />)

      expect(screen.queryByText(/email sent successfully/i)).not.toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('shows error message', () => {
      render(<SendInvitationEmail {...defaultProps} error="Could not send email." />)

      expect(screen.getByText('Could not send email.')).toBeInTheDocument()
    })

    it('shows service error when present', () => {
      render(<SendInvitationEmail {...defaultProps} error="Service error" />)

      expect(screen.getByText('Service error')).toBeInTheDocument()
    })

    it('clears displayed error when prop changes to null', () => {
      const { rerender } = render(<SendInvitationEmail {...defaultProps} error="Service error" />)

      expect(screen.getByText('Service error')).toBeInTheDocument()

      rerender(<SendInvitationEmail {...defaultProps} error={null} />)

      expect(screen.queryByText('Service error')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Rate Limiting Tests
  // ============================================================================

  describe('rate limiting', () => {
    it('shows rate limit warning when canSend is false', () => {
      render(<SendInvitationEmail {...defaultProps} canSend={false} />)

      expect(
        screen.getByText(/please wait a moment before sending again/i)
      ).toBeInTheDocument()
    })

    it('disables button when rate limited', () => {
      render(<SendInvitationEmail {...defaultProps} canSend={false} />)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('does not show rate limit warning when there is an error', () => {
      render(
        <SendInvitationEmail {...defaultProps} canSend={false} error="Some error" />
      )

      expect(
        screen.queryByText(/please wait a moment before sending again/i)
      ).not.toBeInTheDocument()
      expect(screen.getByText('Some error')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Disabled State Tests
  // ============================================================================

  describe('disabled state', () => {
    it('disables input when disabled prop is true', () => {
      render(<SendInvitationEmail {...defaultProps} disabled={true} />)

      const input = screen.getByPlaceholderText(/enter email address/i)
      expect(input).toBeDisabled()
    })

    it('disables button when disabled prop is true', () => {
      render(<SendInvitationEmail {...defaultProps} disabled={true} />)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })
  })

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('accessibility', () => {
    it('has proper aria-live region for feedback', () => {
      render(<SendInvitationEmail {...defaultProps} />)

      const feedbackRegion = document.querySelector('[aria-live="polite"]')
      expect(feedbackRegion).toBeInTheDocument()
    })

    it('marks input as invalid when there is an error prop', () => {
      render(<SendInvitationEmail {...defaultProps} error="Some error" />)

      const input = screen.getByPlaceholderText(/enter email address/i)
      expect(input).toHaveAttribute('aria-invalid', 'true')
    })

    it('marks input as valid when there is no error', () => {
      render(<SendInvitationEmail {...defaultProps} error={null} />)

      const input = screen.getByPlaceholderText(/enter email address/i)
      expect(input).toHaveAttribute('aria-invalid', 'false')
    })

    it('has accessible button label during loading', () => {
      render(<SendInvitationEmail {...defaultProps} sending={true} />)

      expect(screen.getByLabelText(/sending email/i)).toBeInTheDocument()
    })

    it('button has minimum 44px touch target', () => {
      render(<SendInvitationEmail {...defaultProps} />)

      const button = screen.getByRole('button', { name: /send/i })
      expect(button).toHaveClass('min-h-[44px]')
    })

    it('input has minimum 44px touch target', () => {
      render(<SendInvitationEmail {...defaultProps} />)

      const input = screen.getByPlaceholderText(/enter email address/i)
      expect(input).toHaveClass('min-h-[44px]')
    })
  })
})
