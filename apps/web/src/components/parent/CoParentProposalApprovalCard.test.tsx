/**
 * CoParentProposalApprovalCard Component Tests - Story 3A.3 Task 4
 *
 * Tests for co-parent approval UI component.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CoParentProposalApprovalCard } from './CoParentProposalApprovalCard'
import type { AgreementProposal } from '@fledgely/shared'
import { CO_PARENT_APPROVAL_EXPIRY_MS } from '../../services/coParentProposalApprovalService'

// =============================================================================
// Mocks
// =============================================================================

const mockApproveAsCoParent = vi.fn()
const mockDeclineAsCoParent = vi.fn()

vi.mock('../../services/coParentProposalApprovalService', async () => {
  const actual = await vi.importActual('../../services/coParentProposalApprovalService')
  return {
    ...actual,
    approveAsCoParent: (...args: unknown[]) => mockApproveAsCoParent(...args),
    declineAsCoParent: (...args: unknown[]) => mockDeclineAsCoParent(...args),
  }
})

// =============================================================================
// Test Data
// =============================================================================

const mockProposal: AgreementProposal = {
  id: 'proposal-1',
  familyId: 'family-1',
  childId: 'child-1',
  agreementId: 'agreement-1',
  proposedBy: 'parent',
  proposerId: 'parent-1',
  proposerName: 'Mom',
  changes: [
    {
      sectionId: 'time-limits',
      sectionName: 'Time Limits',
      fieldPath: 'weekday.gaming',
      oldValue: 60,
      newValue: 90,
      changeType: 'modify',
    },
  ],
  reason: 'You have been responsible with gaming',
  status: 'pending_coparent_approval',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  respondedAt: null,
  version: 1,
  proposalNumber: 1,
  coParentApprovalRequired: true,
  coParentApprovalStatus: 'pending',
  coParentApprovedByUid: null,
  coParentApprovedAt: null,
  coParentDeclineReason: null,
  expiresAt: Date.now() + CO_PARENT_APPROVAL_EXPIRY_MS,
}

const defaultProps = {
  proposal: mockProposal,
  currentUserUid: 'parent-2',
  currentUserName: 'Dad',
}

// =============================================================================
// Tests
// =============================================================================

describe('CoParentProposalApprovalCard - Story 3A.3', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApproveAsCoParent.mockResolvedValue(undefined)
    mockDeclineAsCoParent.mockResolvedValue(undefined)
  })

  // ---------------------------------------------------------------------------
  // Rendering tests
  // ---------------------------------------------------------------------------

  describe('rendering', () => {
    it('should render the card with proposal details', () => {
      render(<CoParentProposalApprovalCard {...defaultProps} />)

      expect(screen.getByTestId('coparent-approval-card')).toBeInTheDocument()
      expect(screen.getByText('Agreement Change Proposal')).toBeInTheDocument()
      expect(screen.getByText('Needs Your Approval')).toBeInTheDocument()
    })

    it('should show proposer name', () => {
      render(<CoParentProposalApprovalCard {...defaultProps} />)

      expect(screen.getByTestId('proposer-info')).toHaveTextContent('Mom')
    })

    it('should display changes with old and new values', () => {
      render(<CoParentProposalApprovalCard {...defaultProps} />)

      expect(screen.getByTestId('change-item-0')).toBeInTheDocument()
      expect(screen.getByText('60')).toBeInTheDocument()
      expect(screen.getByText('90')).toBeInTheDocument()
    })

    it('should display proposal reason', () => {
      render(<CoParentProposalApprovalCard {...defaultProps} />)

      expect(screen.getByTestId('proposal-reason')).toHaveTextContent(
        'You have been responsible with gaming'
      )
    })

    it('should show approve and decline buttons', () => {
      render(<CoParentProposalApprovalCard {...defaultProps} />)

      expect(screen.getByTestId('approve-button')).toBeInTheDocument()
      expect(screen.getByTestId('decline-button')).toBeInTheDocument()
    })

    it('should show modify button when onModify is provided', () => {
      const onModify = vi.fn()
      render(<CoParentProposalApprovalCard {...defaultProps} onModify={onModify} />)

      expect(screen.getByTestId('modify-button')).toBeInTheDocument()
    })

    it('should not show modify button when onModify is not provided', () => {
      render(<CoParentProposalApprovalCard {...defaultProps} />)

      expect(screen.queryByTestId('modify-button')).not.toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Expiration tests
  // ---------------------------------------------------------------------------

  describe('expiration handling', () => {
    it('should show expiration warning when 3 or fewer days remain', () => {
      const soonExpiring = {
        ...mockProposal,
        expiresAt: Date.now() + 2 * 24 * 60 * 60 * 1000, // 2 days
      }
      render(<CoParentProposalApprovalCard {...defaultProps} proposal={soonExpiring} />)

      expect(screen.getByTestId('expiration-warning')).toBeInTheDocument()
      expect(screen.getByTestId('expiration-warning')).toHaveTextContent('2 days remaining')
    })

    it('should show singular day when 1 day remains', () => {
      const oneDayLeft = {
        ...mockProposal,
        expiresAt: Date.now() + 1 * 24 * 60 * 60 * 1000,
      }
      render(<CoParentProposalApprovalCard {...defaultProps} proposal={oneDayLeft} />)

      expect(screen.getByTestId('expiration-warning')).toHaveTextContent('1 day remaining')
    })

    it('should show expired message when proposal has expired', () => {
      const expired = {
        ...mockProposal,
        expiresAt: Date.now() - 1000, // Already expired
      }
      render(<CoParentProposalApprovalCard {...defaultProps} proposal={expired} />)

      expect(screen.getByTestId('coparent-approval-card-expired')).toBeInTheDocument()
      expect(screen.getByText('Proposal Expired')).toBeInTheDocument()
    })

    it('should not show expiration warning when more than 3 days remain', () => {
      render(<CoParentProposalApprovalCard {...defaultProps} />)

      expect(screen.queryByTestId('expiration-warning')).not.toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Approve action tests
  // ---------------------------------------------------------------------------

  describe('approve action - AC4', () => {
    it('should call approveAsCoParent when approve button clicked', async () => {
      const onApproved = vi.fn()
      render(<CoParentProposalApprovalCard {...defaultProps} onApproved={onApproved} />)

      fireEvent.click(screen.getByTestId('approve-button'))

      await waitFor(() => {
        expect(mockApproveAsCoParent).toHaveBeenCalledWith({
          proposalId: 'proposal-1',
          approverUid: 'parent-2',
          approverName: 'Dad',
        })
      })
    })

    it('should call onApproved callback after successful approval', async () => {
      const onApproved = vi.fn()
      render(<CoParentProposalApprovalCard {...defaultProps} onApproved={onApproved} />)

      fireEvent.click(screen.getByTestId('approve-button'))

      await waitFor(() => {
        expect(onApproved).toHaveBeenCalled()
      })
    })

    it('should show loading state during approval', async () => {
      mockApproveAsCoParent.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )
      render(<CoParentProposalApprovalCard {...defaultProps} />)

      fireEvent.click(screen.getByTestId('approve-button'))

      expect(screen.getByTestId('approve-button')).toHaveTextContent('Approving...')
    })

    it('should show error message on approval failure', async () => {
      mockApproveAsCoParent.mockRejectedValue(new Error('Network error'))
      render(<CoParentProposalApprovalCard {...defaultProps} />)

      fireEvent.click(screen.getByTestId('approve-button'))

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Network error')
      })
    })
  })

  // ---------------------------------------------------------------------------
  // Decline action tests
  // ---------------------------------------------------------------------------

  describe('decline action - AC4', () => {
    it('should show decline reason input on first click', () => {
      render(<CoParentProposalApprovalCard {...defaultProps} />)

      fireEvent.click(screen.getByTestId('decline-button'))

      expect(screen.getByTestId('decline-reason-input')).toBeInTheDocument()
    })

    it('should call declineAsCoParent on second decline click', async () => {
      const onDeclined = vi.fn()
      render(<CoParentProposalApprovalCard {...defaultProps} onDeclined={onDeclined} />)

      // First click shows reason input
      fireEvent.click(screen.getByTestId('decline-button'))

      // Enter reason
      fireEvent.change(screen.getByTestId('decline-reason-input'), {
        target: { value: 'Need to discuss first' },
      })

      // Second click submits
      fireEvent.click(screen.getByTestId('decline-button'))

      await waitFor(() => {
        expect(mockDeclineAsCoParent).toHaveBeenCalledWith({
          proposalId: 'proposal-1',
          declinerUid: 'parent-2',
          declinerName: 'Dad',
          reason: 'Need to discuss first',
        })
      })
    })

    it('should allow declining without reason', async () => {
      render(<CoParentProposalApprovalCard {...defaultProps} />)

      // First click shows reason input
      fireEvent.click(screen.getByTestId('decline-button'))

      // Second click without entering reason
      fireEvent.click(screen.getByTestId('decline-button'))

      await waitFor(() => {
        expect(mockDeclineAsCoParent).toHaveBeenCalledWith(
          expect.objectContaining({
            reason: null,
          })
        )
      })
    })

    it('should call onDeclined callback after successful decline', async () => {
      const onDeclined = vi.fn()
      render(<CoParentProposalApprovalCard {...defaultProps} onDeclined={onDeclined} />)

      fireEvent.click(screen.getByTestId('decline-button'))
      fireEvent.click(screen.getByTestId('decline-button'))

      await waitFor(() => {
        expect(onDeclined).toHaveBeenCalled()
      })
    })
  })

  // ---------------------------------------------------------------------------
  // Modify action tests
  // ---------------------------------------------------------------------------

  describe('modify action - AC4', () => {
    it('should call onModify with proposal when modify clicked', () => {
      const onModify = vi.fn()
      render(<CoParentProposalApprovalCard {...defaultProps} onModify={onModify} />)

      fireEvent.click(screen.getByTestId('modify-button'))

      expect(onModify).toHaveBeenCalledWith(mockProposal)
    })
  })

  // ---------------------------------------------------------------------------
  // Accessibility tests (NFR43, NFR49)
  // ---------------------------------------------------------------------------

  describe('accessibility', () => {
    it('should have minimum 44px touch targets on buttons', () => {
      render(<CoParentProposalApprovalCard {...defaultProps} onModify={vi.fn()} />)

      const approveButton = screen.getByTestId('approve-button')
      const declineButton = screen.getByTestId('decline-button')
      const modifyButton = screen.getByTestId('modify-button')

      expect(approveButton).toHaveStyle({ minHeight: '44px' })
      expect(declineButton).toHaveStyle({ minHeight: '44px' })
      expect(modifyButton).toHaveStyle({ minHeight: '44px' })
    })

    it('should have accessible role and label on container', () => {
      render(<CoParentProposalApprovalCard {...defaultProps} />)

      const card = screen.getByTestId('coparent-approval-card')
      expect(card).toHaveAttribute('role', 'region')
      expect(card).toHaveAttribute('aria-label')
    })

    it('should have accessible labels on buttons', () => {
      render(<CoParentProposalApprovalCard {...defaultProps} onModify={vi.fn()} />)

      expect(screen.getByTestId('approve-button')).toHaveAttribute('aria-label')
      expect(screen.getByTestId('decline-button')).toHaveAttribute('aria-label')
      expect(screen.getByTestId('modify-button')).toHaveAttribute('aria-label')
    })

    it('should respond to keyboard Enter on approve button', async () => {
      render(<CoParentProposalApprovalCard {...defaultProps} />)

      const button = screen.getByTestId('approve-button')
      fireEvent.keyDown(button, { key: 'Enter' })

      await waitFor(() => {
        expect(mockApproveAsCoParent).toHaveBeenCalled()
      })
    })

    it('should respond to keyboard Space on decline button', async () => {
      render(<CoParentProposalApprovalCard {...defaultProps} />)

      const button = screen.getByTestId('decline-button')
      fireEvent.keyDown(button, { key: ' ' })

      // First keydown shows input
      expect(screen.getByTestId('decline-reason-input')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    it('should handle proposal with no changes', () => {
      const noChanges = { ...mockProposal, changes: [] }
      render(<CoParentProposalApprovalCard {...defaultProps} proposal={noChanges} />)

      expect(screen.getByText('No specific changes listed')).toBeInTheDocument()
    })

    it('should handle proposal with no reason', () => {
      const noReason = { ...mockProposal, reason: null }
      render(<CoParentProposalApprovalCard {...defaultProps} proposal={noReason} />)

      expect(screen.queryByTestId('proposal-reason')).not.toBeInTheDocument()
    })

    it('should handle proposal with array values', () => {
      const arrayValues = {
        ...mockProposal,
        changes: [
          {
            sectionId: 'apps',
            sectionName: 'Apps',
            fieldPath: 'blocked',
            oldValue: ['TikTok'],
            newValue: ['TikTok', 'Instagram'],
            changeType: 'modify' as const,
          },
        ],
      }
      render(<CoParentProposalApprovalCard {...defaultProps} proposal={arrayValues} />)

      expect(screen.getByText('TikTok')).toBeInTheDocument()
      expect(screen.getByText('TikTok, Instagram')).toBeInTheDocument()
    })

    it('should disable buttons during loading', async () => {
      mockApproveAsCoParent.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )
      render(<CoParentProposalApprovalCard {...defaultProps} />)

      fireEvent.click(screen.getByTestId('approve-button'))

      expect(screen.getByTestId('approve-button')).toBeDisabled()
      expect(screen.getByTestId('decline-button')).toBeDisabled()
    })
  })
})
