/**
 * Unit tests for InvitationStatusCard component.
 *
 * Story 3.5: Invitation Management
 * Tests for AC1 (view status), AC2 (resend), AC3 (revoke), AC6 (accessibility).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import InvitationStatusCard from './InvitationStatusCard'
import type { Invitation } from '@fledgely/shared/contracts'

// Mock invitation service
vi.mock('../services/invitationService', () => ({
  resendInvitationEmail: vi.fn(),
  revokeInvitation: vi.fn(),
}))

import { resendInvitationEmail, revokeInvitation } from '../services/invitationService'

describe('InvitationStatusCard', () => {
  const mockCurrentUserUid = 'inviter-uid-123'

  const createMockInvitation = (overrides: Partial<Invitation> = {}): Invitation => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 5)

    return {
      id: 'inv-123',
      familyId: 'family-123',
      inviterUid: mockCurrentUserUid,
      inviterName: 'Test User',
      familyName: 'Test Family',
      token: 'test-token',
      status: 'pending',
      recipientEmail: 'recipient@example.com',
      emailSentAt: new Date(),
      expiresAt: futureDate,
      createdAt: new Date(),
      updatedAt: new Date(),
      acceptedAt: null,
      acceptedByUid: null,
      ...overrides,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering (AC1)', () => {
    it('displays pending invitation status with recipient email', () => {
      const invitation = createMockInvitation()

      render(<InvitationStatusCard invitation={invitation} currentUserUid={mockCurrentUserUid} />)

      expect(screen.getByText('Pending Co-Parent Invitation')).toBeInTheDocument()
      expect(screen.getByText('recipient@example.com')).toBeInTheDocument()
      expect(screen.getByText('Sent to:')).toBeInTheDocument()
    })

    it('displays expiry days', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 5)
      const invitation = createMockInvitation({ expiresAt: futureDate })

      render(<InvitationStatusCard invitation={invitation} currentUserUid={mockCurrentUserUid} />)

      expect(screen.getByText(/5 days/)).toBeInTheDocument()
    })

    it('shows urgent warning when expiry is soon', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)
      const invitation = createMockInvitation({ expiresAt: futureDate })

      render(<InvitationStatusCard invitation={invitation} currentUserUid={mockCurrentUserUid} />)

      expect(screen.getByText(/expiring soon/)).toBeInTheDocument()
    })

    it('does not render if user is not the inviter', () => {
      const invitation = createMockInvitation({ inviterUid: 'other-user' })

      const { container } = render(
        <InvitationStatusCard invitation={invitation} currentUserUid={mockCurrentUserUid} />
      )

      expect(container.firstChild).toBeNull()
    })

    it('does not show resend button if no recipient email', () => {
      const invitation = createMockInvitation({ recipientEmail: null })

      render(<InvitationStatusCard invitation={invitation} currentUserUid={mockCurrentUserUid} />)

      expect(screen.queryByText('Resend Email')).not.toBeInTheDocument()
      // Revoke should still be visible
      expect(screen.getByText('Revoke')).toBeInTheDocument()
    })
  })

  describe('resend functionality (AC2)', () => {
    it('calls resendInvitationEmail when resend is clicked', async () => {
      const invitation = createMockInvitation()
      vi.mocked(resendInvitationEmail).mockResolvedValueOnce({
        success: true,
        message: 'Email sent',
      })

      render(<InvitationStatusCard invitation={invitation} currentUserUid={mockCurrentUserUid} />)

      const resendButton = screen.getByText('Resend Email')
      fireEvent.click(resendButton)

      await waitFor(() => {
        expect(resendInvitationEmail).toHaveBeenCalledWith('inv-123', 'recipient@example.com')
      })
    })

    it('displays success message after successful resend', async () => {
      const invitation = createMockInvitation()
      vi.mocked(resendInvitationEmail).mockResolvedValueOnce({
        success: true,
        message: 'Email sent',
      })

      render(<InvitationStatusCard invitation={invitation} currentUserUid={mockCurrentUserUid} />)

      fireEvent.click(screen.getByText('Resend Email'))

      await waitFor(() => {
        expect(screen.getByText(/resent successfully/)).toBeInTheDocument()
      })
    })

    it('displays error message if resend fails', async () => {
      const invitation = createMockInvitation()
      vi.mocked(resendInvitationEmail).mockResolvedValueOnce({
        success: false,
        message: 'Failed to send email',
      })

      render(<InvitationStatusCard invitation={invitation} currentUserUid={mockCurrentUserUid} />)

      fireEvent.click(screen.getByText('Resend Email'))

      await waitFor(() => {
        expect(screen.getByText('Failed to send email')).toBeInTheDocument()
      })
    })

    it('calls onResent callback after successful resend', async () => {
      const invitation = createMockInvitation()
      const onResent = vi.fn()
      vi.mocked(resendInvitationEmail).mockResolvedValueOnce({
        success: true,
        message: 'Email sent',
      })

      render(
        <InvitationStatusCard
          invitation={invitation}
          currentUserUid={mockCurrentUserUid}
          onResent={onResent}
        />
      )

      fireEvent.click(screen.getByText('Resend Email'))

      await waitFor(() => {
        expect(onResent).toHaveBeenCalled()
      })
    })

    it('shows loading state during resend', async () => {
      const invitation = createMockInvitation()
      vi.mocked(resendInvitationEmail).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ success: true, message: 'Sent' }), 100)
          )
      )

      render(<InvitationStatusCard invitation={invitation} currentUserUid={mockCurrentUserUid} />)

      fireEvent.click(screen.getByText('Resend Email'))

      expect(screen.getByText('Sending...')).toBeInTheDocument()
    })
  })

  describe('revoke functionality (AC3)', () => {
    it('shows confirmation modal when revoke is clicked', () => {
      const invitation = createMockInvitation()

      render(<InvitationStatusCard invitation={invitation} currentUserUid={mockCurrentUserUid} />)

      fireEvent.click(screen.getByText('Revoke'))

      expect(screen.getByText('Revoke Invitation?')).toBeInTheDocument()
      expect(screen.getByText(/Are you sure/)).toBeInTheDocument()
    })

    it('closes modal when cancel is clicked', () => {
      const invitation = createMockInvitation()

      render(<InvitationStatusCard invitation={invitation} currentUserUid={mockCurrentUserUid} />)

      fireEvent.click(screen.getByText('Revoke'))
      fireEvent.click(screen.getByText('Cancel'))

      expect(screen.queryByText('Revoke Invitation?')).not.toBeInTheDocument()
    })

    it('closes modal when Escape key is pressed', () => {
      const invitation = createMockInvitation()

      render(<InvitationStatusCard invitation={invitation} currentUserUid={mockCurrentUserUid} />)

      fireEvent.click(screen.getByText('Revoke'))
      expect(screen.getByText('Revoke Invitation?')).toBeInTheDocument()

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(screen.queryByText('Revoke Invitation?')).not.toBeInTheDocument()
    })

    it('closes modal when clicking backdrop', () => {
      const invitation = createMockInvitation()

      render(<InvitationStatusCard invitation={invitation} currentUserUid={mockCurrentUserUid} />)

      fireEvent.click(screen.getByText('Revoke'))
      expect(screen.getByText('Revoke Invitation?')).toBeInTheDocument()

      // Click on the backdrop (dialog element)
      const dialog = screen.getByRole('dialog')
      fireEvent.click(dialog)

      expect(screen.queryByText('Revoke Invitation?')).not.toBeInTheDocument()
    })

    it('calls revokeInvitation when confirmed', async () => {
      const invitation = createMockInvitation()
      vi.mocked(revokeInvitation).mockResolvedValueOnce(undefined)

      render(<InvitationStatusCard invitation={invitation} currentUserUid={mockCurrentUserUid} />)

      fireEvent.click(screen.getByText('Revoke'))
      fireEvent.click(screen.getByRole('button', { name: /Revoke Invitation/i }))

      await waitFor(() => {
        expect(revokeInvitation).toHaveBeenCalledWith('inv-123', mockCurrentUserUid)
      })
    })

    it('displays success message after successful revoke', async () => {
      const invitation = createMockInvitation()
      vi.mocked(revokeInvitation).mockResolvedValueOnce(undefined)

      render(<InvitationStatusCard invitation={invitation} currentUserUid={mockCurrentUserUid} />)

      fireEvent.click(screen.getByText('Revoke'))
      fireEvent.click(screen.getByRole('button', { name: /Revoke Invitation/i }))

      await waitFor(() => {
        expect(screen.getByText(/revoked successfully/)).toBeInTheDocument()
      })
    })

    it('calls onRevoked callback after successful revoke', async () => {
      const invitation = createMockInvitation()
      const onRevoked = vi.fn()
      vi.mocked(revokeInvitation).mockResolvedValueOnce(undefined)

      render(
        <InvitationStatusCard
          invitation={invitation}
          currentUserUid={mockCurrentUserUid}
          onRevoked={onRevoked}
        />
      )

      fireEvent.click(screen.getByText('Revoke'))
      fireEvent.click(screen.getByRole('button', { name: /Revoke Invitation/i }))

      await waitFor(() => {
        expect(onRevoked).toHaveBeenCalled()
      })
    })

    it('displays error message if revoke fails', async () => {
      const invitation = createMockInvitation()
      vi.mocked(revokeInvitation).mockRejectedValueOnce(new Error('Permission denied'))

      // Suppress console.error for this test since we're testing error handling
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<InvitationStatusCard invitation={invitation} currentUserUid={mockCurrentUserUid} />)

      fireEvent.click(screen.getByText('Revoke'))
      fireEvent.click(screen.getByRole('button', { name: /Revoke Invitation/i }))

      await waitFor(() => {
        expect(screen.getByText('Permission denied')).toBeInTheDocument()
      })

      consoleErrorSpy.mockRestore()
    })
  })

  describe('accessibility (AC6)', () => {
    it('has accessible region role', () => {
      const invitation = createMockInvitation()

      render(<InvitationStatusCard invitation={invitation} currentUserUid={mockCurrentUserUid} />)

      expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'Pending invitation status')
    })

    it('buttons have aria-labels', () => {
      const invitation = createMockInvitation()

      render(<InvitationStatusCard invitation={invitation} currentUserUid={mockCurrentUserUid} />)

      expect(screen.getByLabelText('Resend invitation email')).toBeInTheDocument()
      expect(screen.getByLabelText('Revoke this invitation')).toBeInTheDocument()
    })

    it('status messages are announced with role=status', async () => {
      const invitation = createMockInvitation()
      vi.mocked(resendInvitationEmail).mockResolvedValueOnce({
        success: true,
        message: 'Email sent',
      })

      render(<InvitationStatusCard invitation={invitation} currentUserUid={mockCurrentUserUid} />)

      fireEvent.click(screen.getByText('Resend Email'))

      await waitFor(() => {
        const statusMessage = screen.getByRole('status')
        expect(statusMessage).toBeInTheDocument()
      })
    })

    it('confirmation modal has proper dialog role', () => {
      const invitation = createMockInvitation()

      render(<InvitationStatusCard invitation={invitation} currentUserUid={mockCurrentUserUid} />)

      fireEvent.click(screen.getByText('Revoke'))

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-labelledby', 'revoke-modal-title')
    })
  })
})
