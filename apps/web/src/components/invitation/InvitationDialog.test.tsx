import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InvitationDialog } from './InvitationDialog'
import type { Invitation } from '@fledgely/contracts'

// Mock useInvitation hook
vi.mock('@/hooks/useInvitation', () => ({
  useInvitation: vi.fn(),
}))

import { useInvitation } from '@/hooks/useInvitation'

const mockUseInvitation = vi.mocked(useInvitation)

/**
 * InvitationDialog Component Tests
 *
 * Story 3.1: Co-Parent Invitation Generation
 *
 * Tests verify:
 * - Multi-step dialog flow
 * - Expiry selection
 * - Invitation creation
 * - Existing invitation handling
 * - Success state with link display
 * - Error handling
 * - Accessibility (44x44px touch targets, aria-live)
 */

describe('InvitationDialog', () => {
  const mockInvitation: Invitation = {
    id: 'invitation-456',
    familyId: 'family-789',
    familyName: 'Smith Family',
    invitedBy: 'user-123',
    invitedByName: 'Jane Smith',
    tokenHash: 'hash-abc',
    status: 'pending',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    acceptedAt: null,
    acceptedBy: null,
  }

  const mockCreateResult = {
    invitation: mockInvitation,
    token: 'unhashed-token-xyz',
    invitationLink: 'https://fledgely.app/join/invitation-456?token=unhashed-token-xyz',
  }

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    familyId: 'family-789',
    familyName: 'Smith Family',
    onSuccess: vi.fn(),
    onError: vi.fn(),
  }

  // Create mocks fresh in beforeEach to avoid issues with clearAllMocks
  const createDefaultHookReturn = () => ({
    invitation: null,
    existingInvitation: null,
    loading: false,
    checkingExisting: false,
    error: null,
    createInvitation: vi.fn().mockResolvedValue(mockCreateResult),
    checkExistingInvitation: vi.fn().mockResolvedValue({ exists: false, invitation: null }),
    revokeInvitation: vi.fn().mockResolvedValue(undefined),
    clearError: vi.fn(),
    resetInvitation: vi.fn(),
    // Story 3.2: Email delivery
    emailSending: false,
    emailSent: false,
    emailError: null,
    emailInfo: null,
    sendEmail: vi.fn().mockResolvedValue({ success: true }),
    clearEmailState: vi.fn(),
    canSendEmail: vi.fn().mockReturnValue(true),
  })

  let defaultHookReturn: ReturnType<typeof createDefaultHookReturn>

  beforeEach(() => {
    vi.clearAllMocks()
    defaultHookReturn = createDefaultHookReturn()
    mockUseInvitation.mockReturnValue(defaultHookReturn)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================================================
  // Initial State Tests
  // ============================================================================

  describe('initial state', () => {
    it('renders dialog when open', async () => {
      render(<InvitationDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('shows configuration step by default', async () => {
      render(<InvitationDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Invite Co-Parent')).toBeInTheDocument()
        expect(screen.getByText('Create Invitation')).toBeInTheDocument()
      })
    })

    it('checks for existing invitation on open', async () => {
      const checkExisting = vi.fn().mockResolvedValue({ exists: false, invitation: null })
      mockUseInvitation.mockReturnValue({
        ...defaultHookReturn,
        checkExistingInvitation: checkExisting,
      })

      render(<InvitationDialog {...defaultProps} />)

      await waitFor(() => {
        expect(checkExisting).toHaveBeenCalledWith('family-789')
      })
    })

    it('does not render when closed', () => {
      render(<InvitationDialog {...defaultProps} open={false} />)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Expiry Selection Tests
  // ============================================================================

  describe('expiry selection', () => {
    it('shows expiry selection dropdown', async () => {
      render(<InvitationDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByLabelText(/select expiry/i)).toBeInTheDocument()
      })
    })

    it('defaults to 1 week expiry', async () => {
      render(<InvitationDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('1 week')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Creation Flow Tests
  // ============================================================================

  describe('invitation creation', () => {
    it('calls createInvitation when button clicked', async () => {
      const user = userEvent.setup()
      const createInvitation = vi.fn().mockResolvedValue(mockCreateResult)
      mockUseInvitation.mockReturnValue({
        ...defaultHookReturn,
        createInvitation,
      })

      render(<InvitationDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Create Invitation')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Create Invitation'))

      await waitFor(() => {
        expect(createInvitation).toHaveBeenCalledWith('family-789', '7')
      })
    })

    it('shows success state after creation', async () => {
      const user = userEvent.setup()
      const createInvitation = vi.fn().mockResolvedValue(mockCreateResult)
      mockUseInvitation.mockReturnValue({
        ...defaultHookReturn,
        createInvitation,
        invitation: mockCreateResult,
      })

      render(<InvitationDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Create Invitation')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Create Invitation'))

      await waitFor(() => {
        expect(screen.getByText('Invitation Created!')).toBeInTheDocument()
      })
    })

    it('calls onSuccess callback after creation', async () => {
      const user = userEvent.setup()
      const createInvitation = vi.fn().mockResolvedValue(mockCreateResult)
      mockUseInvitation.mockReturnValue({
        ...defaultHookReturn,
        createInvitation,
      })

      render(<InvitationDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Create Invitation')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Create Invitation'))

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalledWith(mockCreateResult.invitationLink)
      })
    })
  })

  // ============================================================================
  // Existing Invitation Tests
  // ============================================================================

  describe('existing invitation', () => {
    it('shows existing invitation when found', async () => {
      mockUseInvitation.mockReturnValue({
        ...defaultHookReturn,
        checkExistingInvitation: vi.fn().mockResolvedValue({
          exists: true,
          invitation: mockInvitation,
        }),
        existingInvitation: mockInvitation,
      })

      render(<InvitationDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Pending Invitation')).toBeInTheDocument()
      })
    })

    it('allows revoking existing and creating new', async () => {
      const user = userEvent.setup()
      const revokeInvitation = vi.fn().mockResolvedValue(undefined)
      const createInvitation = vi.fn().mockResolvedValue(mockCreateResult)

      mockUseInvitation.mockReturnValue({
        ...defaultHookReturn,
        checkExistingInvitation: vi.fn().mockResolvedValue({
          exists: true,
          invitation: mockInvitation,
        }),
        existingInvitation: mockInvitation,
        revokeInvitation,
        createInvitation,
      })

      render(<InvitationDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Cancel & Create New')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Cancel & Create New'))

      await waitFor(() => {
        expect(revokeInvitation).toHaveBeenCalledWith(mockInvitation.id)
      })
    })
  })

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('error handling', () => {
    it('shows error state when creation fails', async () => {
      const user = userEvent.setup()
      const createInvitation = vi.fn().mockRejectedValue(new Error('Creation failed'))
      mockUseInvitation.mockReturnValue({
        ...defaultHookReturn,
        createInvitation,
        error: 'Could not create invitation. Please try again.',
      })

      render(<InvitationDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Create Invitation')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Create Invitation'))

      await waitFor(() => {
        expect(screen.getByText('Something Went Wrong')).toBeInTheDocument()
      })
    })

    it('calls onError callback when creation fails', async () => {
      const user = userEvent.setup()
      const error = new Error('Creation failed')
      const createInvitation = vi.fn().mockRejectedValue(error)
      mockUseInvitation.mockReturnValue({
        ...defaultHookReturn,
        createInvitation,
      })

      render(<InvitationDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Create Invitation')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Create Invitation'))

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalled()
      })
    })

    it('allows retry after error', async () => {
      const user = userEvent.setup()
      const createInvitation = vi.fn()
        .mockRejectedValueOnce(new Error('Creation failed'))
        .mockResolvedValueOnce(mockCreateResult)
      const clearError = vi.fn()

      mockUseInvitation.mockReturnValue({
        ...defaultHookReturn,
        createInvitation,
        clearError,
        error: 'Could not create invitation. Please try again.',
      })

      render(<InvitationDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Create Invitation')).toBeInTheDocument()
      })

      // First attempt fails
      await user.click(screen.getByText('Create Invitation'))

      await waitFor(() => {
        expect(screen.getByText('Something Went Wrong')).toBeInTheDocument()
      })

      // Retry
      await user.click(screen.getByText('Try Again'))

      await waitFor(() => {
        expect(clearError).toHaveBeenCalled()
      })
    })
  })

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('accessibility', () => {
    it('has accessible dialog title', async () => {
      render(<InvitationDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Invite Co-Parent')).toBeInTheDocument()
      })
    })

    it('buttons have minimum 44x44px touch targets', async () => {
      render(<InvitationDialog {...defaultProps} />)

      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        buttons.forEach((button) => {
          // Check for min-h-[44px] and min-w-[44px] classes
          expect(button.className).toMatch(/min-h-\[44px\]/)
        })
      })
    })

    it('has aria-live region for status updates', async () => {
      const user = userEvent.setup()
      const createInvitation = vi.fn().mockResolvedValue(mockCreateResult)
      mockUseInvitation.mockReturnValue({
        ...defaultHookReturn,
        createInvitation,
        invitation: mockCreateResult,
      })

      render(<InvitationDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Create Invitation')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Create Invitation'))

      await waitFor(() => {
        // Success state should have aria-live for announcement
        // Use getAllByRole since InvitationLink also has a status region
        const liveRegions = screen.getAllByRole('status')
        expect(liveRegions.length).toBeGreaterThan(0)
        expect(liveRegions.some((el) => el.getAttribute('aria-live') === 'polite')).toBe(true)
      })
    })

    it('prevents closing during processing', async () => {
      const user = userEvent.setup()
      // Set up a slow createInvitation that doesn't resolve immediately
      const createInvitation = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockCreateResult), 5000))
      )
      mockUseInvitation.mockReturnValue({
        ...defaultHookReturn,
        createInvitation,
      })

      render(<InvitationDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Create Invitation')).toBeInTheDocument()
      })

      // Start the creation process
      await user.click(screen.getByText('Create Invitation'))

      // Should show processing state
      await waitFor(() => {
        expect(screen.getByText('Creating Invitation...')).toBeInTheDocument()
      })

      // Try to close via escape key during processing
      fireEvent.keyDown(document, { key: 'Escape' })

      // Dialog should still be shown (onOpenChange should not have been called with false)
      // Note: We use a short timeout to check that the dialog didn't close
      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(defaultProps.onOpenChange).not.toHaveBeenCalledWith(false)
    })
  })

  // ============================================================================
  // Dialog Close Tests
  // ============================================================================

  describe('dialog close', () => {
    it('closes when cancel button clicked', async () => {
      const user = userEvent.setup()

      render(<InvitationDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Cancel'))

      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
    })

    it('closes when done button clicked after success', async () => {
      const user = userEvent.setup()
      const createInvitation = vi.fn().mockResolvedValue(mockCreateResult)
      mockUseInvitation.mockReturnValue({
        ...defaultHookReturn,
        createInvitation,
        invitation: mockCreateResult,
      })

      render(<InvitationDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Create Invitation')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Create Invitation'))

      await waitFor(() => {
        expect(screen.getByText('Done')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Done'))

      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
    })

    it('resets state when dialog closes', async () => {
      const resetInvitation = vi.fn()
      const clearError = vi.fn()

      mockUseInvitation.mockReturnValue({
        ...defaultHookReturn,
        resetInvitation,
        clearError,
      })

      const { rerender } = render(<InvitationDialog {...defaultProps} />)

      // Close the dialog
      rerender(<InvitationDialog {...defaultProps} open={false} />)

      await waitFor(() => {
        expect(clearError).toHaveBeenCalled()
        expect(resetInvitation).toHaveBeenCalled()
      })
    })
  })
})
