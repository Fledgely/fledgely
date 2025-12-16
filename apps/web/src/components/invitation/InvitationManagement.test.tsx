import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InvitationManagement } from './InvitationManagement'
import type { Invitation } from '@fledgely/contracts'

// Mock the hooks and services
vi.mock('@/hooks/useInvitationList', () => ({
  useInvitationList: vi.fn(),
}))

vi.mock('@/services/invitationService', () => ({
  sendInvitationEmail: vi.fn(),
  revokeInvitation: vi.fn(),
  getInvitationEmailInfo: vi.fn(),
}))

import { useInvitationList } from '@/hooks/useInvitationList'
import {
  sendInvitationEmail,
  revokeInvitation,
  getInvitationEmailInfo,
} from '@/services/invitationService'

const mockUseInvitationList = useInvitationList as Mock
const mockSendInvitationEmail = sendInvitationEmail as Mock
const mockRevokeInvitation = revokeInvitation as Mock
const mockGetInvitationEmailInfo = getInvitationEmailInfo as Mock

/**
 * InvitationManagement Component Tests
 *
 * Story 3.5: Invitation Management - Task 3
 *
 * Tests verify:
 * - Loading and error states
 * - Empty state display
 * - Pending invitation display
 * - Invitation history display
 * - Resend functionality
 * - Revoke functionality
 * - Error handling
 */

describe('InvitationManagement', () => {
  const familyId = 'family-123'
  const currentUserId = 'user-123'
  const now = new Date()
  const futureDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
  const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const pendingInvitation: Invitation = {
    id: 'inv-1',
    familyId,
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

  const defaultHookReturn = {
    invitations: [],
    pendingInvitation: null,
    invitationHistory: [],
    loading: false,
    error: null,
    refresh: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseInvitationList.mockReturnValue(defaultHookReturn)
    mockGetInvitationEmailInfo.mockResolvedValue(null)
  })

  // ============================================================================
  // Loading State
  // ============================================================================

  describe('loading state', () => {
    it('shows loading indicator when loading', () => {
      mockUseInvitationList.mockReturnValue({
        ...defaultHookReturn,
        loading: true,
      })

      render(
        <InvitationManagement
          familyId={familyId}
          currentUserId={currentUserId}
        />
      )

      expect(screen.getByText('Loading invitations...')).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
    })
  })

  // ============================================================================
  // Error State
  // ============================================================================

  describe('error state', () => {
    it('shows error message when there is an error', () => {
      mockUseInvitationList.mockReturnValue({
        ...defaultHookReturn,
        error: new Error('Failed to load'),
      })

      render(
        <InvitationManagement
          familyId={familyId}
          currentUserId={currentUserId}
        />
      )

      expect(screen.getByText(/Could not load invitations/)).toBeInTheDocument()
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('provides a retry button on error', () => {
      const mockRefresh = vi.fn()
      mockUseInvitationList.mockReturnValue({
        ...defaultHookReturn,
        error: new Error('Failed to load'),
        refresh: mockRefresh,
      })

      render(
        <InvitationManagement
          familyId={familyId}
          currentUserId={currentUserId}
        />
      )

      fireEvent.click(screen.getByText('Try Again'))

      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Empty State (AC7)
  // ============================================================================

  describe('empty state', () => {
    it('shows empty state when no invitations exist', () => {
      mockUseInvitationList.mockReturnValue(defaultHookReturn)

      render(
        <InvitationManagement
          familyId={familyId}
          currentUserId={currentUserId}
        />
      )

      expect(screen.getByText('No invitations yet')).toBeInTheDocument()
      expect(screen.getByText(/Invite a co-parent to help manage/)).toBeInTheDocument()
    })

    it('shows Invite Co-Parent button in empty state', () => {
      const onCreateInvitation = vi.fn()
      mockUseInvitationList.mockReturnValue(defaultHookReturn)

      render(
        <InvitationManagement
          familyId={familyId}
          currentUserId={currentUserId}
          onCreateInvitation={onCreateInvitation}
        />
      )

      fireEvent.click(screen.getByText('Invite Co-Parent'))

      expect(onCreateInvitation).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Pending Invitation (AC1, AC2, AC3)
  // ============================================================================

  describe('pending invitation', () => {
    it('displays pending invitation card', () => {
      mockUseInvitationList.mockReturnValue({
        ...defaultHookReturn,
        invitations: [pendingInvitation],
        pendingInvitation,
      })

      render(
        <InvitationManagement
          familyId={familyId}
          currentUserId={currentUserId}
        />
      )

      expect(screen.getByText('Pending Invitation')).toBeInTheDocument()
      expect(screen.getByText('Pending')).toBeInTheDocument()
    })

    it('shows Resend and Revoke buttons for owner', () => {
      mockUseInvitationList.mockReturnValue({
        ...defaultHookReturn,
        invitations: [pendingInvitation],
        pendingInvitation,
      })

      render(
        <InvitationManagement
          familyId={familyId}
          currentUserId={currentUserId}
        />
      )

      expect(screen.getByText('Resend')).toBeInTheDocument()
      expect(screen.getByText('Revoke')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Invitation History (AC5)
  // ============================================================================

  describe('invitation history', () => {
    it('displays past invitations', () => {
      mockUseInvitationList.mockReturnValue({
        ...defaultHookReturn,
        invitations: [acceptedInvitation],
        invitationHistory: [acceptedInvitation],
      })

      render(
        <InvitationManagement
          familyId={familyId}
          currentUserId={currentUserId}
        />
      )

      expect(screen.getByText('Past Invitations')).toBeInTheDocument()
      expect(screen.getByText('Accepted')).toBeInTheDocument()
    })

    it('shows both pending and history when both exist', () => {
      mockUseInvitationList.mockReturnValue({
        ...defaultHookReturn,
        invitations: [pendingInvitation, acceptedInvitation],
        pendingInvitation,
        invitationHistory: [acceptedInvitation],
      })

      render(
        <InvitationManagement
          familyId={familyId}
          currentUserId={currentUserId}
        />
      )

      expect(screen.getByText('Pending Invitation')).toBeInTheDocument()
      expect(screen.getByText('Past Invitations')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Revoke Flow
  // ============================================================================

  describe('revoke flow', () => {
    it('opens confirmation dialog when Revoke is clicked', () => {
      mockUseInvitationList.mockReturnValue({
        ...defaultHookReturn,
        invitations: [pendingInvitation],
        pendingInvitation,
      })

      render(
        <InvitationManagement
          familyId={familyId}
          currentUserId={currentUserId}
        />
      )

      fireEvent.click(screen.getByText('Revoke'))

      expect(screen.getByText('Cancel this invitation?')).toBeInTheDocument()
    })

    it('calls revokeInvitation when confirmed', async () => {
      const mockRefresh = vi.fn()
      mockUseInvitationList.mockReturnValue({
        ...defaultHookReturn,
        invitations: [pendingInvitation],
        pendingInvitation,
        refresh: mockRefresh,
      })
      mockRevokeInvitation.mockResolvedValue({
        ...pendingInvitation,
        status: 'revoked',
      })

      render(
        <InvitationManagement
          familyId={familyId}
          currentUserId={currentUserId}
        />
      )

      // Click Revoke to open dialog
      fireEvent.click(screen.getByText('Revoke'))

      // Confirm revocation
      fireEvent.click(screen.getByText('Yes, Cancel Invitation'))

      await waitFor(() => {
        expect(mockRevokeInvitation).toHaveBeenCalledWith('inv-1', currentUserId)
        expect(mockRefresh).toHaveBeenCalled()
      })
    })
  })

  // ============================================================================
  // Create New Invitation
  // ============================================================================

  describe('create new invitation', () => {
    it('shows Invite Co-Parent button when no pending invitation', () => {
      mockUseInvitationList.mockReturnValue({
        ...defaultHookReturn,
        invitations: [acceptedInvitation],
        invitationHistory: [acceptedInvitation],
      })

      const onCreateInvitation = vi.fn()

      render(
        <InvitationManagement
          familyId={familyId}
          currentUserId={currentUserId}
          onCreateInvitation={onCreateInvitation}
        />
      )

      fireEvent.click(screen.getByText('Invite Co-Parent'))

      expect(onCreateInvitation).toHaveBeenCalled()
    })

    it('does not show Invite button when pending invitation exists', () => {
      mockUseInvitationList.mockReturnValue({
        ...defaultHookReturn,
        invitations: [pendingInvitation],
        pendingInvitation,
      })

      render(
        <InvitationManagement
          familyId={familyId}
          currentUserId={currentUserId}
          onCreateInvitation={vi.fn()}
        />
      )

      // Should only find the "Invite Co-Parent" button in the page, not in header
      const inviteButtons = screen.queryAllByText('Invite Co-Parent')
      expect(inviteButtons.length).toBe(0)
    })
  })

  // ============================================================================
  // Accessibility
  // ============================================================================

  describe('accessibility', () => {
    it('has proper section labels', () => {
      mockUseInvitationList.mockReturnValue({
        ...defaultHookReturn,
        invitations: [pendingInvitation, acceptedInvitation],
        pendingInvitation,
        invitationHistory: [acceptedInvitation],
      })

      render(
        <InvitationManagement
          familyId={familyId}
          currentUserId={currentUserId}
        />
      )

      // Check for section aria-labelledby attributes
      const pendingSection = screen.getByRole('region', { name: /Pending Invitation/i })
      const historySection = screen.getByRole('region', { name: /Past Invitations/i })

      expect(pendingSection).toBeInTheDocument()
      expect(historySection).toBeInTheDocument()
    })
  })
})
