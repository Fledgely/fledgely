import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InvitationCard } from './InvitationCard'
import type { Invitation } from '@fledgely/contracts'

/**
 * InvitationCard Component Tests
 *
 * Story 3.5: Invitation Management - Task 4
 *
 * Tests verify:
 * - Status badge display (Pending, Accepted, Revoked, Expired)
 * - Expiry information display
 * - Email tracking info display
 * - Action buttons based on ownership and status
 * - Accessibility attributes
 */

describe('InvitationCard', () => {
  const currentUserId = 'user-123'
  const now = new Date()
  const futureDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
  const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 1 day ago

  const pendingInvitation: Invitation = {
    id: 'inv-1',
    familyId: 'family-1',
    familyName: 'Test Family',
    invitedBy: currentUserId,
    invitedByName: 'John Doe',
    tokenHash: 'hash1',
    status: 'pending',
    createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    expiresAt: futureDate,
    acceptedAt: null,
    acceptedBy: null,
  }

  const acceptedInvitation: Invitation = {
    ...pendingInvitation,
    id: 'inv-2',
    status: 'accepted',
    expiresAt: pastDate,
    acceptedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    acceptedBy: 'user-456',
  }

  const revokedInvitation: Invitation = {
    ...pendingInvitation,
    id: 'inv-3',
    status: 'revoked',
    expiresAt: pastDate,
  }

  const expiredInvitation: Invitation = {
    ...pendingInvitation,
    id: 'inv-4',
    status: 'pending', // Still pending but expired
    expiresAt: pastDate,
  }

  const nonOwnerInvitation: Invitation = {
    ...pendingInvitation,
    id: 'inv-5',
    invitedBy: 'other-user',
    invitedByName: 'Jane Smith',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // Status Badge Display
  // ============================================================================

  describe('status badge', () => {
    it('displays Pending badge for pending invitation', () => {
      render(
        <InvitationCard
          invitation={pendingInvitation}
          currentUserId={currentUserId}
        />
      )

      expect(screen.getByText('Pending')).toBeInTheDocument()
    })

    it('displays Accepted badge for accepted invitation', () => {
      render(
        <InvitationCard
          invitation={acceptedInvitation}
          currentUserId={currentUserId}
        />
      )

      expect(screen.getByText('Accepted')).toBeInTheDocument()
    })

    it('displays Revoked badge for revoked invitation', () => {
      render(
        <InvitationCard
          invitation={revokedInvitation}
          currentUserId={currentUserId}
        />
      )

      expect(screen.getByText('Revoked')).toBeInTheDocument()
    })

    it('displays Expired badge for expired invitation', () => {
      render(
        <InvitationCard
          invitation={expiredInvitation}
          currentUserId={currentUserId}
        />
      )

      expect(screen.getByText('Expired')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Expiry Information
  // ============================================================================

  describe('expiry information', () => {
    it('shows expiry info for pending invitation', () => {
      render(
        <InvitationCard
          invitation={pendingInvitation}
          currentUserId={currentUserId}
        />
      )

      // Should show "Expires in X days" or "Expires soon"
      expect(screen.getByText(/Expires/)).toBeInTheDocument()
    })

    it('shows "Expired on [date]" for expired invitation', () => {
      render(
        <InvitationCard
          invitation={expiredInvitation}
          currentUserId={currentUserId}
        />
      )

      expect(screen.getByText(/Expired on/)).toBeInTheDocument()
    })

    it('shows "Joined the family" for accepted invitation', () => {
      render(
        <InvitationCard
          invitation={acceptedInvitation}
          currentUserId={currentUserId}
        />
      )

      expect(screen.getByText('Joined the family')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Email Info Display
  // ============================================================================

  describe('email info', () => {
    it('shows masked email when emailInfo is provided', () => {
      render(
        <InvitationCard
          invitation={pendingInvitation}
          currentUserId={currentUserId}
          emailInfo={{ emailSentTo: 'j***@example.com', emailSendCount: 1 }}
        />
      )

      expect(screen.getByText(/Sent to j\*\*\*@example.com/)).toBeInTheDocument()
    })

    it('shows send count when greater than 1', () => {
      render(
        <InvitationCard
          invitation={pendingInvitation}
          currentUserId={currentUserId}
          emailInfo={{ emailSentTo: 'j***@example.com', emailSendCount: 3 }}
        />
      )

      expect(screen.getByText(/\(3x\)/)).toBeInTheDocument()
    })

    it('does not show email info when not provided', () => {
      render(
        <InvitationCard
          invitation={pendingInvitation}
          currentUserId={currentUserId}
        />
      )

      expect(screen.queryByText(/Sent to/)).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Action Buttons
  // ============================================================================

  describe('action buttons', () => {
    it('shows Resend and Revoke buttons for pending invitation owned by user', () => {
      const onResend = vi.fn()
      const onRevoke = vi.fn()

      render(
        <InvitationCard
          invitation={pendingInvitation}
          currentUserId={currentUserId}
          onResend={onResend}
          onRevoke={onRevoke}
        />
      )

      expect(screen.getByRole('button', { name: /Resend/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Revoke/i })).toBeInTheDocument()
    })

    it('calls onResend when Resend button is clicked', () => {
      const onResend = vi.fn()
      const onRevoke = vi.fn()

      render(
        <InvitationCard
          invitation={pendingInvitation}
          currentUserId={currentUserId}
          onResend={onResend}
          onRevoke={onRevoke}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /Resend/i }))

      expect(onResend).toHaveBeenCalledWith('inv-1')
    })

    it('calls onRevoke when Revoke button is clicked', () => {
      const onResend = vi.fn()
      const onRevoke = vi.fn()

      render(
        <InvitationCard
          invitation={pendingInvitation}
          currentUserId={currentUserId}
          onResend={onResend}
          onRevoke={onRevoke}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /Revoke/i }))

      expect(onRevoke).toHaveBeenCalledWith('inv-1')
    })

    it('does not show action buttons for non-owner', () => {
      const onResend = vi.fn()
      const onRevoke = vi.fn()

      render(
        <InvitationCard
          invitation={nonOwnerInvitation}
          currentUserId={currentUserId}
          onResend={onResend}
          onRevoke={onRevoke}
        />
      )

      expect(screen.queryByRole('button', { name: /Resend/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Revoke/i })).not.toBeInTheDocument()
    })

    it('does not show action buttons for accepted invitation', () => {
      render(
        <InvitationCard
          invitation={acceptedInvitation}
          currentUserId={currentUserId}
          onResend={vi.fn()}
          onRevoke={vi.fn()}
        />
      )

      expect(screen.queryByRole('button', { name: /Resend/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Revoke/i })).not.toBeInTheDocument()
    })

    it('does not show action buttons for expired invitation', () => {
      render(
        <InvitationCard
          invitation={expiredInvitation}
          currentUserId={currentUserId}
          onResend={vi.fn()}
          onRevoke={vi.fn()}
        />
      )

      expect(screen.queryByRole('button', { name: /Resend/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Revoke/i })).not.toBeInTheDocument()
    })

    it('shows loading state when resending', () => {
      render(
        <InvitationCard
          invitation={pendingInvitation}
          currentUserId={currentUserId}
          onResend={vi.fn()}
          onRevoke={vi.fn()}
          resending={true}
        />
      )

      expect(screen.getByRole('button', { name: /Resending/i })).toBeDisabled()
      expect(screen.getByText('Sending...')).toBeInTheDocument()
    })

    it('shows loading state when revoking', () => {
      render(
        <InvitationCard
          invitation={pendingInvitation}
          currentUserId={currentUserId}
          onResend={vi.fn()}
          onRevoke={vi.fn()}
          revoking={true}
        />
      )

      expect(screen.getByRole('button', { name: /Revoking/i })).toBeDisabled()
      expect(screen.getByText('Revoking...')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Accessibility
  // ============================================================================

  describe('accessibility', () => {
    it('has article role with accessible label', () => {
      render(
        <InvitationCard
          invitation={pendingInvitation}
          currentUserId={currentUserId}
        />
      )

      expect(screen.getByRole('article')).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Invitation created on')
      )
    })

    it('has accessible status badge', () => {
      render(
        <InvitationCard
          invitation={pendingInvitation}
          currentUserId={currentUserId}
        />
      )

      expect(screen.getByText('Pending').closest('span')).toHaveAttribute(
        'aria-label',
        expect.stringContaining('waiting')
      )
    })

    it('action buttons have accessible labels', () => {
      render(
        <InvitationCard
          invitation={pendingInvitation}
          currentUserId={currentUserId}
          onResend={vi.fn()}
          onRevoke={vi.fn()}
        />
      )

      expect(
        screen.getByRole('button', { name: /Resend invitation email/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /Revoke invitation/i })
      ).toBeInTheDocument()
    })

    it('action buttons meet 44x44px minimum touch target', () => {
      render(
        <InvitationCard
          invitation={pendingInvitation}
          currentUserId={currentUserId}
          onResend={vi.fn()}
          onRevoke={vi.fn()}
        />
      )

      const resendButton = screen.getByRole('button', { name: /Resend/i })
      const revokeButton = screen.getByRole('button', { name: /Revoke/i })

      expect(resendButton).toHaveClass('min-h-[44px]')
      expect(resendButton).toHaveClass('min-w-[44px]')
      expect(revokeButton).toHaveClass('min-h-[44px]')
      expect(revokeButton).toHaveClass('min-w-[44px]')
    })
  })

  // ============================================================================
  // Non-Owner View
  // ============================================================================

  describe('non-owner view', () => {
    it('shows creator name for non-owner', () => {
      render(
        <InvitationCard
          invitation={nonOwnerInvitation}
          currentUserId={currentUserId}
        />
      )

      expect(screen.getByText('Created by Jane Smith')).toBeInTheDocument()
    })

    it('does not show creator name for owner', () => {
      render(
        <InvitationCard
          invitation={pendingInvitation}
          currentUserId={currentUserId}
        />
      )

      expect(screen.queryByText(/Created by/)).not.toBeInTheDocument()
    })
  })
})
