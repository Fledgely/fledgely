import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JoinFamily, JoinFamilyProps } from './JoinFamily'

/**
 * JoinFamily Component Tests
 *
 * Story 3.3: Co-Parent Invitation Acceptance
 *
 * Tests verify:
 * - All UI states render correctly (7 states)
 * - User interactions trigger correct callbacks
 * - Accessibility (44x44px touch targets, aria-live)
 * - 6th-grade reading level error messages (NFR65)
 * - Loading states and button disablement
 */

describe('JoinFamily', () => {
  const mockOnAccept = vi.fn()
  const mockOnSignIn = vi.fn()
  const mockOnClearError = vi.fn()

  const validInvitation = {
    familyName: 'Smith Family',
    invitedByName: 'Jane Smith',
    status: 'pending' as const,
    expiresAt: new Date(Date.now() + 86400000), // Tomorrow
    isExpired: false,
  }

  const defaultProps: JoinFamilyProps = {
    invitation: validInvitation,
    error: null,
    isAuthenticated: false,
    isAccepting: false,
    onAccept: mockOnAccept,
    onSignIn: mockOnSignIn,
    onClearError: mockOnClearError,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // Not Authenticated State
  // ============================================================================

  describe('not authenticated state', () => {
    it('shows sign in button when user not authenticated', () => {
      render(<JoinFamily {...defaultProps} isAuthenticated={false} />)

      expect(screen.getByText('Sign in to Join')).toBeInTheDocument()
      expect(screen.queryByText('Accept Invitation')).not.toBeInTheDocument()
    })

    it('calls onSignIn when sign in button clicked', async () => {
      const user = userEvent.setup()
      render(<JoinFamily {...defaultProps} isAuthenticated={false} />)

      await user.click(screen.getByText('Sign in to Join'))
      expect(mockOnSignIn).toHaveBeenCalledTimes(1)
    })

    it('displays family and inviter information', () => {
      render(<JoinFamily {...defaultProps} isAuthenticated={false} />)

      expect(screen.getByText('Smith Family')).toBeInTheDocument()
      expect(screen.getByText(/Jane Smith invited you/i)).toBeInTheDocument()
    })

    it('shows helper text about Google sign-in', () => {
      render(<JoinFamily {...defaultProps} isAuthenticated={false} />)

      expect(
        screen.getByText(/sign in with your Google account/i)
      ).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Authenticated State
  // ============================================================================

  describe('authenticated state', () => {
    it('shows accept button when user authenticated', () => {
      render(<JoinFamily {...defaultProps} isAuthenticated={true} />)

      expect(screen.getByText('Accept Invitation')).toBeInTheDocument()
      expect(screen.queryByText('Sign in to Join')).not.toBeInTheDocument()
    })

    it('calls onAccept when accept button clicked', async () => {
      const user = userEvent.setup()
      render(<JoinFamily {...defaultProps} isAuthenticated={true} />)

      await user.click(screen.getByText('Accept Invitation'))
      expect(mockOnAccept).toHaveBeenCalledTimes(1)
    })

    it('shows loading state while accepting', () => {
      render(
        <JoinFamily {...defaultProps} isAuthenticated={true} isAccepting={true} />
      )

      expect(screen.getByText('Joining...')).toBeInTheDocument()
      const button = screen.getByRole('button', { name: /joining/i })
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('aria-busy', 'true')
    })

    it('displays expiry information', () => {
      render(<JoinFamily {...defaultProps} isAuthenticated={true} />)

      expect(screen.getByText(/this invitation expires/i)).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Error States
  // ============================================================================

  describe('error states', () => {
    it('displays generic error message', () => {
      render(
        <JoinFamily
          {...defaultProps}
          error="Could not join the family. Please try again."
          isAuthenticated={true}
        />
      )

      expect(screen.getByText(/could not join the family/i)).toBeInTheDocument()
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('displays expired error with correct heading', () => {
      render(
        <JoinFamily
          {...defaultProps}
          error="This invitation has expired. Please ask the person who invited you to send a new one."
          isAuthenticated={true}
        />
      )

      expect(screen.getByText('Invitation Expired')).toBeInTheDocument()
      expect(screen.getByText(/invitation has expired/i)).toBeInTheDocument()
    })

    it('displays canceled error with correct heading', () => {
      render(
        <JoinFamily
          {...defaultProps}
          error="This invitation was canceled."
          isAuthenticated={true}
        />
      )

      expect(screen.getByText('Invitation Canceled')).toBeInTheDocument()
    })

    it('displays already used error with correct heading', () => {
      render(
        <JoinFamily
          {...defaultProps}
          error="This invitation has already been used."
          isAuthenticated={true}
        />
      )

      expect(screen.getByText('Invitation Already Used')).toBeInTheDocument()
    })

    it('shows try again button for recoverable errors', async () => {
      const user = userEvent.setup()
      render(
        <JoinFamily
          {...defaultProps}
          error="Could not join the family. Please try again."
          isAuthenticated={true}
        />
      )

      const tryAgainButton = screen.getByText('Try Again')
      expect(tryAgainButton).toBeInTheDocument()

      await user.click(tryAgainButton)
      expect(mockOnClearError).toHaveBeenCalledTimes(1)
    })

    it('does not show try again for permanent errors (expired)', () => {
      render(
        <JoinFamily
          {...defaultProps}
          error="This invitation has expired. Please ask the person who invited you to send a new one."
          isAuthenticated={true}
        />
      )

      expect(screen.queryByText('Try Again')).not.toBeInTheDocument()
      expect(screen.getByText('Go Home')).toBeInTheDocument()
    })

    it('does not show try again for canceled errors', () => {
      render(
        <JoinFamily
          {...defaultProps}
          error="This invitation was canceled."
          isAuthenticated={true}
        />
      )

      expect(screen.queryByText('Try Again')).not.toBeInTheDocument()
    })

    it('does not show try again for already used errors', () => {
      render(
        <JoinFamily
          {...defaultProps}
          error="This invitation has already been used."
          isAuthenticated={true}
        />
      )

      expect(screen.queryByText('Try Again')).not.toBeInTheDocument()
    })

    it('shows family name in error state when invitation data available', () => {
      render(
        <JoinFamily
          {...defaultProps}
          invitation={validInvitation}
          error="This invitation has expired."
          isAuthenticated={true}
        />
      )

      expect(screen.getByText(/smith family/i)).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Invitation Status States
  // ============================================================================

  describe('invitation status states', () => {
    it('shows not found state when invitation is null', () => {
      render(
        <JoinFamily
          {...defaultProps}
          invitation={null}
          error={null}
          isAuthenticated={true}
        />
      )

      expect(screen.getByText('Invitation Not Found')).toBeInTheDocument()
      expect(
        screen.getByText(/not valid or no longer exists/i)
      ).toBeInTheDocument()
    })

    it('shows Go Home button in not found state', () => {
      render(
        <JoinFamily
          {...defaultProps}
          invitation={null}
          error={null}
          isAuthenticated={true}
        />
      )

      expect(screen.getByText('Go Home')).toBeInTheDocument()
    })

    it('shows accepted state for already used invitation', () => {
      render(
        <JoinFamily
          {...defaultProps}
          invitation={{ ...validInvitation, status: 'accepted' }}
          isAuthenticated={true}
        />
      )

      expect(screen.getByText('Already Joined')).toBeInTheDocument()
      expect(screen.getByText(/already been used/i)).toBeInTheDocument()
      expect(screen.getByText('Go to Family Dashboard')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Accessibility Tests (NFR43, NFR45, NFR46, NFR49)
  // ============================================================================

  describe('accessibility', () => {
    it('has 44x44px minimum touch target for primary buttons (NFR49)', () => {
      render(<JoinFamily {...defaultProps} isAuthenticated={true} />)

      const button = screen.getByText('Accept Invitation')
      // Button uses min-h-[48px] which exceeds the 44px minimum
      expect(button).toHaveClass('min-h-[48px]')
    })

    it('has proper touch target for sign in button (NFR49)', () => {
      render(<JoinFamily {...defaultProps} isAuthenticated={false} />)

      const button = screen.getByText('Sign in to Join')
      expect(button).toHaveClass('min-h-[48px]')
    })

    it('announces errors with aria-live', () => {
      render(
        <JoinFamily
          {...defaultProps}
          error="Could not join the family. Please try again."
          isAuthenticated={true}
        />
      )

      const errorElement = screen.getByRole('alert')
      expect(errorElement).toHaveAttribute('aria-live', 'polite')
    })

    it('has proper heading hierarchy', () => {
      render(<JoinFamily {...defaultProps} isAuthenticated={true} />)

      const heading = screen.getByRole('heading', { name: /join family/i })
      expect(heading.tagName).toBe('H1')
    })

    it('sets aria-busy on button during acceptance', () => {
      render(
        <JoinFamily {...defaultProps} isAuthenticated={true} isAccepting={true} />
      )

      const button = screen.getByRole('button', { name: /joining/i })
      expect(button).toHaveAttribute('aria-busy', 'true')
    })

    it('has minimum touch target for Go Home button (NFR49)', () => {
      render(
        <JoinFamily
          {...defaultProps}
          invitation={null}
          error={null}
          isAuthenticated={true}
        />
      )

      const button = screen.getByText('Go Home')
      expect(button).toHaveClass('min-h-[44px]')
    })

    it('has minimum touch target for Try Again button (NFR49)', () => {
      render(
        <JoinFamily
          {...defaultProps}
          error="Could not join the family. Please try again."
          isAuthenticated={true}
        />
      )

      const button = screen.getByText('Try Again')
      expect(button).toHaveClass('min-h-[44px]')
    })
  })

  // ============================================================================
  // User Experience Tests (NFR65 - 6th grade reading level)
  // ============================================================================

  describe('user experience', () => {
    it('uses simple language for family access description', () => {
      render(<JoinFamily {...defaultProps} isAuthenticated={true} />)

      // Check for simple, clear language about what joining means
      expect(
        screen.getByText(/see and help manage family agreements/i)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/view your children's online activity/i)
      ).toBeInTheDocument()
    })

    it('does not use technical jargon', () => {
      render(<JoinFamily {...defaultProps} isAuthenticated={true} />)

      // No technical terms like "authenticate", "authorization", etc.
      expect(screen.queryByText(/authenticate/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/authorization/i)).not.toBeInTheDocument()
    })

    it('displays clear call to action for sign-in', () => {
      render(<JoinFamily {...defaultProps} isAuthenticated={false} />)

      // Clear button text
      expect(screen.getByText('Sign in to Join')).toBeInTheDocument()
      // Helpful context
      expect(
        screen.getByText(/Google account/i)
      ).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Expiry Date Formatting
  // ============================================================================

  describe('expiry date formatting', () => {
    it('shows expiry in days when more than 24 hours', () => {
      const tomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days
      render(
        <JoinFamily
          {...defaultProps}
          invitation={{ ...validInvitation, expiresAt: tomorrow }}
          isAuthenticated={true}
        />
      )

      expect(screen.getByText(/in 2 days/i)).toBeInTheDocument()
    })

    it('shows expiry in hours when less than 24 hours', () => {
      const inHours = new Date(Date.now() + 5 * 60 * 60 * 1000) // 5 hours
      render(
        <JoinFamily
          {...defaultProps}
          invitation={{ ...validInvitation, expiresAt: inHours }}
          isAuthenticated={true}
        />
      )

      expect(screen.getByText(/in \d+ hours?/i)).toBeInTheDocument()
    })

    it('uses singular day for 1 day', () => {
      const oneDayFromNow = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 1000) // Just over 1 day
      render(
        <JoinFamily
          {...defaultProps}
          invitation={{ ...validInvitation, expiresAt: oneDayFromNow }}
          isAuthenticated={true}
        />
      )

      expect(screen.getByText(/in 1 day/i)).toBeInTheDocument()
    })

    it('does not show expiry for expired invitations', () => {
      const yesterday = new Date(Date.now() - 86400000)
      render(
        <JoinFamily
          {...defaultProps}
          invitation={{ ...validInvitation, expiresAt: yesterday, isExpired: true }}
          isAuthenticated={true}
        />
      )

      expect(screen.queryByText(/this invitation expires/i)).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // CSS Classes and Styling
  // ============================================================================

  describe('styling', () => {
    it('applies custom className when provided', () => {
      const { container } = render(
        <JoinFamily {...defaultProps} className="custom-class" isAuthenticated={true} />
      )

      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('has card styling', () => {
      const { container } = render(
        <JoinFamily {...defaultProps} isAuthenticated={true} />
      )

      expect(container.firstChild).toHaveClass('rounded-lg')
      expect(container.firstChild).toHaveClass('border')
      expect(container.firstChild).toHaveClass('bg-card')
    })
  })
})
