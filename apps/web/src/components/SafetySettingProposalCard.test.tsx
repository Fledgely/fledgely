/**
 * Unit tests for SafetySettingProposalCard component.
 *
 * Story 3A.2: Safety Settings Two-Parent Approval - AC2, AC3, AC7
 * Story 3A.4: Safety Rule 48-Hour Cooling Period - AC2, AC3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SafetySettingProposalCard } from './SafetySettingProposalCard'
import type { SafetySettingChange } from '@fledgely/shared/contracts'

describe('SafetySettingProposalCard', () => {
  const mockOnApprove = vi.fn()
  const mockOnDecline = vi.fn()
  const mockOnCancel = vi.fn()

  const createMockProposal = (overrides?: Partial<SafetySettingChange>): SafetySettingChange => ({
    id: 'change-123',
    familyId: 'family-456',
    settingType: 'monitoring_interval',
    currentValue: 60,
    proposedValue: 30,
    proposedByUid: 'guardian-uid-1',
    approverUid: null,
    status: 'pending_approval',
    declineReason: null,
    isEmergencyIncrease: false,
    reviewExpiresAt: null,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
    resolvedAt: null,
    effectiveAt: null, // Story 3A.4
    cancelledByUid: null, // Story 3A.4
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnApprove.mockResolvedValue(undefined)
    mockOnDecline.mockResolvedValue(undefined)
    mockOnCancel.mockResolvedValue(undefined)
  })

  describe('rendering', () => {
    it('renders the proposal card with setting type', () => {
      render(
        <SafetySettingProposalCard
          proposal={createMockProposal()}
          currentUserUid="guardian-uid-2"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
        />
      )

      expect(screen.getByText('Monitoring Interval')).toBeInTheDocument()
    })

    it('shows current and proposed values', () => {
      render(
        <SafetySettingProposalCard
          proposal={createMockProposal()}
          currentUserUid="guardian-uid-2"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
        />
      )

      expect(screen.getByText('60 minutes')).toBeInTheDocument()
      expect(screen.getByText('30 minutes')).toBeInTheDocument()
    })

    it('shows proposer name when provided', () => {
      render(
        <SafetySettingProposalCard
          proposal={createMockProposal()}
          currentUserUid="guardian-uid-2"
          proposerName="John"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
        />
      )

      expect(screen.getByText(/Proposed by: John/)).toBeInTheDocument()
    })

    it('shows Pending Approval badge for non-emergency changes', () => {
      render(
        <SafetySettingProposalCard
          proposal={createMockProposal({ isEmergencyIncrease: false })}
          currentUserUid="guardian-uid-2"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
        />
      )

      expect(screen.getByText('Pending Approval')).toBeInTheDocument()
    })

    it('shows Emergency Increase badge for emergency changes', () => {
      render(
        <SafetySettingProposalCard
          proposal={createMockProposal({ isEmergencyIncrease: true })}
          currentUserUid="guardian-uid-2"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
        />
      )

      expect(screen.getByText('Emergency Increase')).toBeInTheDocument()
    })

    it('shows expiration countdown', () => {
      render(
        <SafetySettingProposalCard
          proposal={createMockProposal()}
          currentUserUid="guardian-uid-2"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
        />
      )

      expect(screen.getByText(/remaining to respond/)).toBeInTheDocument()
    })
  })

  describe('proposer view', () => {
    it('shows waiting message when user is the proposer', () => {
      render(
        <SafetySettingProposalCard
          proposal={createMockProposal({ proposedByUid: 'current-user' })}
          currentUserUid="current-user"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
        />
      )

      expect(
        screen.getByText('You proposed this change. Waiting for your co-parent to review.')
      ).toBeInTheDocument()
    })

    it('does not show approve/decline buttons for proposer', () => {
      render(
        <SafetySettingProposalCard
          proposal={createMockProposal({ proposedByUid: 'current-user' })}
          currentUserUid="current-user"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
        />
      )

      expect(screen.queryByText('Approve Change')).not.toBeInTheDocument()
      expect(screen.queryByText('Decline')).not.toBeInTheDocument()
    })
  })

  describe('expired proposals', () => {
    it('shows expired message for expired proposals', () => {
      render(
        <SafetySettingProposalCard
          proposal={createMockProposal({
            expiresAt: new Date(Date.now() - 1000), // Already expired
          })}
          currentUserUid="guardian-uid-2"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
        />
      )

      expect(screen.getByText('This proposal has expired')).toBeInTheDocument()
    })

    it('does not show action buttons for expired proposals', () => {
      render(
        <SafetySettingProposalCard
          proposal={createMockProposal({
            expiresAt: new Date(Date.now() - 1000),
          })}
          currentUserUid="guardian-uid-2"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
        />
      )

      expect(screen.queryByText('Approve Change')).not.toBeInTheDocument()
    })
  })

  describe('approve action', () => {
    it('calls onApprove when Approve button is clicked', async () => {
      render(
        <SafetySettingProposalCard
          proposal={createMockProposal()}
          currentUserUid="guardian-uid-2"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
        />
      )

      fireEvent.click(screen.getByText('Approve Change'))

      await waitFor(() => {
        expect(mockOnApprove).toHaveBeenCalledTimes(1)
      })
    })

    it('shows loading state while approving', async () => {
      mockOnApprove.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)))

      render(
        <SafetySettingProposalCard
          proposal={createMockProposal()}
          currentUserUid="guardian-uid-2"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
        />
      )

      fireEvent.click(screen.getByText('Approve Change'))

      expect(screen.getByText('Approving...')).toBeInTheDocument()
    })

    it('shows error message when approval fails', async () => {
      mockOnApprove.mockRejectedValue(new Error('Approval failed'))

      render(
        <SafetySettingProposalCard
          proposal={createMockProposal()}
          currentUserUid="guardian-uid-2"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
        />
      )

      fireEvent.click(screen.getByText('Approve Change'))

      await waitFor(() => {
        expect(screen.getByText('Approval failed')).toBeInTheDocument()
      })
    })
  })

  describe('decline action', () => {
    it('shows decline reason input on first click', () => {
      render(
        <SafetySettingProposalCard
          proposal={createMockProposal()}
          currentUserUid="guardian-uid-2"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
        />
      )

      fireEvent.click(screen.getByText('Decline'))

      expect(screen.getByLabelText(/Reason for declining/)).toBeInTheDocument()
      expect(screen.getByText('Confirm Decline')).toBeInTheDocument()
    })

    it('calls onDecline with reason on confirm', async () => {
      render(
        <SafetySettingProposalCard
          proposal={createMockProposal()}
          currentUserUid="guardian-uid-2"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
        />
      )

      // First click shows reason input
      fireEvent.click(screen.getByText('Decline'))

      // Enter reason
      const textarea = screen.getByLabelText(/Reason for declining/)
      fireEvent.change(textarea, { target: { value: 'Not appropriate now' } })

      // Confirm decline
      fireEvent.click(screen.getByText('Confirm Decline'))

      await waitFor(() => {
        expect(mockOnDecline).toHaveBeenCalledWith('Not appropriate now')
      })
    })

    it('calls onDecline without reason when empty', async () => {
      render(
        <SafetySettingProposalCard
          proposal={createMockProposal()}
          currentUserUid="guardian-uid-2"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
        />
      )

      fireEvent.click(screen.getByText('Decline'))
      fireEvent.click(screen.getByText('Confirm Decline'))

      await waitFor(() => {
        expect(mockOnDecline).toHaveBeenCalledWith(undefined)
      })
    })

    it('shows error message when decline fails', async () => {
      mockOnDecline.mockRejectedValue(new Error('Decline failed'))

      render(
        <SafetySettingProposalCard
          proposal={createMockProposal()}
          currentUserUid="guardian-uid-2"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
        />
      )

      fireEvent.click(screen.getByText('Decline'))
      fireEvent.click(screen.getByText('Confirm Decline'))

      await waitFor(() => {
        expect(screen.getByText('Decline failed')).toBeInTheDocument()
      })
    })
  })

  describe('accessibility (AC7)', () => {
    it('has accessible role and label on the card', () => {
      render(
        <SafetySettingProposalCard
          proposal={createMockProposal()}
          currentUserUid="guardian-uid-2"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
        />
      )

      expect(screen.getByRole('article')).toHaveAttribute(
        'aria-label',
        'Safety setting change proposal'
      )
    })

    it('has aria-busy on approve button while loading', async () => {
      mockOnApprove.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)))

      render(
        <SafetySettingProposalCard
          proposal={createMockProposal()}
          currentUserUid="guardian-uid-2"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
        />
      )

      const approveButton = screen.getByText('Approve Change')
      fireEvent.click(approveButton)

      expect(approveButton).toHaveAttribute('aria-busy', 'true')
    })

    it('has accessible label on decline reason textarea', () => {
      render(
        <SafetySettingProposalCard
          proposal={createMockProposal()}
          currentUserUid="guardian-uid-2"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
        />
      )

      fireEvent.click(screen.getByText('Decline'))

      const textarea = screen.getByLabelText(/Reason for declining/)
      expect(textarea).toBeInTheDocument()
    })

    it('shows error in alert role', async () => {
      mockOnApprove.mockRejectedValue(new Error('Test error'))

      render(
        <SafetySettingProposalCard
          proposal={createMockProposal()}
          currentUserUid="guardian-uid-2"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
        />
      )

      fireEvent.click(screen.getByText('Approve Change'))

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Test error')
      })
    })
  })

  describe('setting type formatting', () => {
    it('formats retention_period correctly', () => {
      render(
        <SafetySettingProposalCard
          proposal={createMockProposal({
            settingType: 'retention_period',
            currentValue: 30,
            proposedValue: 7,
          })}
          currentUserUid="guardian-uid-2"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
        />
      )

      expect(screen.getByText('Data Retention Period')).toBeInTheDocument()
      expect(screen.getByText('30 days')).toBeInTheDocument()
      expect(screen.getByText('7 days')).toBeInTheDocument()
    })

    it('formats time_limits correctly', () => {
      render(
        <SafetySettingProposalCard
          proposal={createMockProposal({
            settingType: 'time_limits',
            currentValue: 120,
            proposedValue: 60,
          })}
          currentUserUid="guardian-uid-2"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
        />
      )

      expect(screen.getByText('Screen Time Limits')).toBeInTheDocument()
      expect(screen.getByText('120 minutes per day')).toBeInTheDocument()
      expect(screen.getByText('60 minutes per day')).toBeInTheDocument()
    })

    it('formats age_restrictions correctly', () => {
      render(
        <SafetySettingProposalCard
          proposal={createMockProposal({
            settingType: 'age_restrictions',
            currentValue: 13,
            proposedValue: 16,
          })}
          currentUserUid="guardian-uid-2"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
        />
      )

      expect(screen.getByText('Age Restrictions')).toBeInTheDocument()
      expect(screen.getByText('13+ years')).toBeInTheDocument()
      expect(screen.getByText('16+ years')).toBeInTheDocument()
    })
  })

  describe('cooling period (Story 3A.4)', () => {
    it('shows cooling period badge when status is cooling_period', () => {
      render(
        <SafetySettingProposalCard
          proposal={createMockProposal({
            status: 'cooling_period',
            approverUid: 'guardian-uid-2',
            effectiveAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
          })}
          currentUserUid="guardian-uid-1"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByText('48-Hour Cooling Period')).toBeInTheDocument()
    })

    it('shows cooling period info with countdown', () => {
      render(
        <SafetySettingProposalCard
          proposal={createMockProposal({
            status: 'cooling_period',
            approverUid: 'guardian-uid-2',
            effectiveAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
          })}
          currentUserUid="guardian-uid-1"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
          onCancel={mockOnCancel}
        />
      )

      expect(
        screen.getByText(/This safety change has been approved but is in a 48-hour cooling period/)
      ).toBeInTheDocument()
      expect(screen.getByText(/until active/)).toBeInTheDocument()
    })

    it('shows Cancel Change button during cooling period when onCancel provided', () => {
      render(
        <SafetySettingProposalCard
          proposal={createMockProposal({
            status: 'cooling_period',
            approverUid: 'guardian-uid-2',
            effectiveAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          })}
          currentUserUid="guardian-uid-1"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByText('Cancel Change')).toBeInTheDocument()
    })

    it('does not show Cancel Change button when onCancel not provided', () => {
      render(
        <SafetySettingProposalCard
          proposal={createMockProposal({
            status: 'cooling_period',
            approverUid: 'guardian-uid-2',
            effectiveAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          })}
          currentUserUid="guardian-uid-1"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
        />
      )

      expect(screen.queryByText('Cancel Change')).not.toBeInTheDocument()
    })

    it('calls onCancel when Cancel Change button is clicked', async () => {
      render(
        <SafetySettingProposalCard
          proposal={createMockProposal({
            status: 'cooling_period',
            approverUid: 'guardian-uid-2',
            effectiveAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          })}
          currentUserUid="guardian-uid-1"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
          onCancel={mockOnCancel}
        />
      )

      fireEvent.click(screen.getByText('Cancel Change'))

      await waitFor(() => {
        expect(mockOnCancel).toHaveBeenCalledTimes(1)
      })
    })

    it('shows loading state while cancelling', async () => {
      mockOnCancel.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)))

      render(
        <SafetySettingProposalCard
          proposal={createMockProposal({
            status: 'cooling_period',
            approverUid: 'guardian-uid-2',
            effectiveAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          })}
          currentUserUid="guardian-uid-1"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
          onCancel={mockOnCancel}
        />
      )

      fireEvent.click(screen.getByText('Cancel Change'))

      expect(screen.getByText('Cancelling...')).toBeInTheDocument()
    })

    it('shows error message when cancel fails', async () => {
      mockOnCancel.mockRejectedValue(new Error('Cancel failed'))

      render(
        <SafetySettingProposalCard
          proposal={createMockProposal({
            status: 'cooling_period',
            approverUid: 'guardian-uid-2',
            effectiveAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          })}
          currentUserUid="guardian-uid-1"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
          onCancel={mockOnCancel}
        />
      )

      fireEvent.click(screen.getByText('Cancel Change'))

      await waitFor(() => {
        expect(screen.getByText('Cancel failed')).toBeInTheDocument()
      })
    })

    it('does not show approve/decline buttons during cooling period', () => {
      render(
        <SafetySettingProposalCard
          proposal={createMockProposal({
            status: 'cooling_period',
            approverUid: 'guardian-uid-2',
            effectiveAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          })}
          currentUserUid="guardian-uid-1"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.queryByText('Approve Change')).not.toBeInTheDocument()
      expect(screen.queryByText('Decline')).not.toBeInTheDocument()
    })
  })

  describe('resolved status display (Story 3A.4)', () => {
    it('shows Activated badge for activated status', () => {
      render(
        <SafetySettingProposalCard
          proposal={createMockProposal({
            status: 'activated',
            approverUid: 'guardian-uid-2',
          })}
          currentUserUid="guardian-uid-1"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
        />
      )

      expect(screen.getByText('Activated')).toBeInTheDocument()
      expect(
        screen.getByText('This change has been activated and is now in effect.')
      ).toBeInTheDocument()
    })

    it('shows Cancelled badge for cancelled status', () => {
      render(
        <SafetySettingProposalCard
          proposal={createMockProposal({
            status: 'cancelled',
            cancelledByUid: 'guardian-uid-1',
          })}
          currentUserUid="guardian-uid-1"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
        />
      )

      expect(screen.getByText('Cancelled')).toBeInTheDocument()
      expect(
        screen.getByText('This change was cancelled during the cooling period.')
      ).toBeInTheDocument()
    })

    it('shows Declined badge with reason for declined status', () => {
      render(
        <SafetySettingProposalCard
          proposal={createMockProposal({
            status: 'declined',
            approverUid: 'guardian-uid-2',
            declineReason: 'Not appropriate at this time',
          })}
          currentUserUid="guardian-uid-1"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
        />
      )

      expect(screen.getByText('Declined')).toBeInTheDocument()
      expect(screen.getByText(/This change was declined/)).toBeInTheDocument()
      expect(screen.getByText(/Not appropriate at this time/)).toBeInTheDocument()
    })

    it('shows approved message for approved status', () => {
      render(
        <SafetySettingProposalCard
          proposal={createMockProposal({
            status: 'approved',
            approverUid: 'guardian-uid-2',
          })}
          currentUserUid="guardian-uid-1"
          onApprove={mockOnApprove}
          onDecline={mockOnDecline}
        />
      )

      expect(
        screen.getByText('This change has been approved and is now in effect.')
      ).toBeInTheDocument()
    })
  })
})
