/**
 * ProposerConfirmationScreen Component Tests - Story 34.4
 *
 * Tests for the proposer's confirmation UI after recipient accepts.
 * AC1: Proposer confirmation after acceptance
 * AC2: Dual digital signatures
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ProposerConfirmationScreen } from './ProposerConfirmationScreen'
import type { ProposalChange } from '@fledgely/shared'

// Mock AgreementDiffView component
vi.mock('./AgreementDiffView', () => ({
  AgreementDiffView: ({ changes }: { changes: ProposalChange[] }) => (
    <div data-testid="agreement-diff-view">
      {changes.map((c, i) => (
        <div key={i} data-testid={`change-${i}`}>
          {c.sectionName}: {String(c.oldValue)} → {String(c.newValue)}
        </div>
      ))}
    </div>
  ),
}))

describe('ProposerConfirmationScreen - Story 34.4', () => {
  const mockChanges: ProposalChange[] = [
    {
      sectionId: 'time-limits',
      sectionName: 'Time Limits',
      fieldPath: 'weekday.gaming',
      oldValue: 60,
      newValue: 90,
      changeType: 'modify',
    },
  ]

  const defaultProps = {
    recipientName: 'Emma',
    recipientAcceptedAt: Date.now() - 3600000, // 1 hour ago
    recipientComment: 'Thanks for the extra time!',
    changes: mockChanges,
    proposalReason: 'You earned more gaming time!',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    isActivating: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('header and messaging', () => {
    it('should display acceptance header', () => {
      render(<ProposerConfirmationScreen {...defaultProps} />)

      expect(screen.getByText(/your proposal was accepted/i)).toBeInTheDocument()
    })

    it('should display recipient name in acceptance message', () => {
      render(<ProposerConfirmationScreen {...defaultProps} />)

      // Multiple elements may contain Emma, we just need at least one
      expect(screen.getAllByText(/Emma/).length).toBeGreaterThan(0)
    })

    it('should display acceptance timestamp', () => {
      render(<ProposerConfirmationScreen {...defaultProps} />)

      // Should show relative time in the acceptance message
      expect(screen.getByText(/ago/i)).toBeInTheDocument()
    })
  })

  describe('changes display', () => {
    it('should render AgreementDiffView with changes', () => {
      render(<ProposerConfirmationScreen {...defaultProps} />)

      expect(screen.getByTestId('agreement-diff-view')).toBeInTheDocument()
    })

    it('should display all proposed changes', () => {
      render(<ProposerConfirmationScreen {...defaultProps} />)

      expect(screen.getByTestId('change-0')).toBeInTheDocument()
      expect(screen.getByText(/Time Limits/)).toBeInTheDocument()
    })

    it('should display proposal reason', () => {
      render(<ProposerConfirmationScreen {...defaultProps} />)

      expect(screen.getByText(/You earned more gaming time!/)).toBeInTheDocument()
    })
  })

  describe('recipient comment', () => {
    it('should display recipient comment when provided', () => {
      render(<ProposerConfirmationScreen {...defaultProps} />)

      expect(screen.getByText(/Thanks for the extra time!/)).toBeInTheDocument()
    })

    it('should handle null recipient comment gracefully', () => {
      render(<ProposerConfirmationScreen {...defaultProps} recipientComment={null} />)

      // Should not crash and should not show comment section
      expect(screen.queryByText(/Thanks for the extra time!/)).not.toBeInTheDocument()
    })
  })

  describe('action buttons', () => {
    it('should display Confirm & Activate button', () => {
      render(<ProposerConfirmationScreen {...defaultProps} />)

      expect(screen.getByRole('button', { name: /confirm & activate/i })).toBeInTheDocument()
    })

    it('should display Cancel button', () => {
      render(<ProposerConfirmationScreen {...defaultProps} />)

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('should call onCancel when Cancel button clicked', () => {
      render(<ProposerConfirmationScreen {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

      expect(defaultProps.onCancel).toHaveBeenCalled()
    })

    it('should disable buttons while activating', () => {
      render(<ProposerConfirmationScreen {...defaultProps} isActivating={true} />)

      expect(screen.getByRole('button', { name: /activating/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
    })
  })

  describe('confirmation dialog', () => {
    it('should show confirmation dialog when Confirm & Activate clicked', async () => {
      render(<ProposerConfirmationScreen {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /confirm & activate/i }))

      await waitFor(() => {
        expect(screen.getByText(/activate these changes/i)).toBeInTheDocument()
      })
    })

    it('should call onConfirm when dialog confirmed', async () => {
      render(<ProposerConfirmationScreen {...defaultProps} />)

      // Open dialog
      fireEvent.click(screen.getByRole('button', { name: /confirm & activate/i }))

      await waitFor(() => {
        expect(screen.getByText(/activate these changes/i)).toBeInTheDocument()
      })

      // Confirm in dialog
      fireEvent.click(screen.getByRole('button', { name: /^activate$/i }))

      expect(defaultProps.onConfirm).toHaveBeenCalled()
    })

    it('should close dialog when cancelled', async () => {
      render(<ProposerConfirmationScreen {...defaultProps} />)

      // Open dialog
      fireEvent.click(screen.getByRole('button', { name: /confirm & activate/i }))

      await waitFor(() => {
        expect(screen.getByText(/activate these changes/i)).toBeInTheDocument()
      })

      // Cancel in dialog
      fireEvent.click(screen.getByRole('button', { name: /^no, go back$/i }))

      await waitFor(() => {
        expect(screen.queryByText(/activate these changes/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('accessibility', () => {
    it('should have accessible main landmark', () => {
      render(<ProposerConfirmationScreen {...defaultProps} />)

      expect(screen.getByRole('main')).toBeInTheDocument()
    })

    it('should have accessible button labels', () => {
      render(<ProposerConfirmationScreen {...defaultProps} />)

      const confirmButton = screen.getByRole('button', { name: /confirm & activate/i })
      const cancelButton = screen.getByRole('button', { name: /cancel/i })

      expect(confirmButton).toBeEnabled()
      expect(cancelButton).toBeEnabled()
    })
  })
})
