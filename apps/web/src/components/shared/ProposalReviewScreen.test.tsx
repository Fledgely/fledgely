/**
 * ProposalReviewScreen Component Tests - Story 34.3
 *
 * Tests for the main proposal review screen.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProposalReviewScreen } from './ProposalReviewScreen'

// Mock AgreementDiffView
vi.mock('./AgreementDiffView', () => ({
  AgreementDiffView: ({ changes }: { changes: unknown[] }) => (
    <div data-testid="agreement-diff-view">Diff View ({changes.length} changes)</div>
  ),
}))

describe('ProposalReviewScreen - Story 34.3', () => {
  const mockProposal = {
    id: 'proposal-1',
    familyId: 'family-1',
    childId: 'child-1',
    agreementId: 'agreement-1',
    proposedBy: 'parent' as const,
    proposerId: 'parent-1',
    proposerName: 'Mom',
    changes: [
      {
        sectionId: 'time-limits',
        sectionName: 'Time Limits',
        fieldPath: 'timeLimits.weekday.gaming',
        oldValue: 60,
        newValue: 90,
        changeType: 'modify' as const,
      },
    ],
    reason: 'You have been responsible with your screen time',
    status: 'pending' as const,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    respondedAt: null,
    version: 1,
    proposalNumber: 1,
  }

  const defaultProps = {
    proposal: mockProposal,
    isParentViewing: false,
  }

  describe('header display', () => {
    it('should display proposal title', () => {
      render(<ProposalReviewScreen {...defaultProps} />)

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
        /agreement change proposal/i
      )
    })

    it('should display proposer name in header', () => {
      render(<ProposalReviewScreen {...defaultProps} />)

      expect(screen.getByText(/proposed by/i)).toBeInTheDocument()
      expect(screen.getAllByText(/Mom/).length).toBeGreaterThan(0)
    })

    it('should display proposal date', () => {
      render(<ProposalReviewScreen {...defaultProps} />)

      // Check for formatted date (November 14, 2023)
      expect(screen.getByText(/november 14, 2023/i)).toBeInTheDocument()
    })

    it('should display pending status badge', () => {
      render(<ProposalReviewScreen {...defaultProps} />)

      expect(screen.getByText('Pending')).toBeInTheDocument()
    })
  })

  describe('diff view integration - AC1', () => {
    it('should render AgreementDiffView with changes', () => {
      render(<ProposalReviewScreen {...defaultProps} />)

      expect(screen.getByTestId('agreement-diff-view')).toBeInTheDocument()
      expect(screen.getByText(/1 changes/)).toBeInTheDocument()
    })

    it('should show "what changes" section header', () => {
      render(<ProposalReviewScreen {...defaultProps} />)

      expect(screen.getByText(/proposed changes/i)).toBeInTheDocument()
    })
  })

  describe('reason display', () => {
    it('should display proposer reason prominently', () => {
      render(<ProposalReviewScreen {...defaultProps} />)

      // Reason is displayed with quotes around it
      expect(
        screen.getByText(/You have been responsible with your screen time/)
      ).toBeInTheDocument()
    })

    it('should show reason label', () => {
      render(<ProposalReviewScreen {...defaultProps} />)

      expect(screen.getByText(/reason/i)).toBeInTheDocument()
    })

    it('should handle null reason gracefully', () => {
      const propsNoReason = {
        ...defaultProps,
        proposal: { ...mockProposal, reason: null },
      }

      render(<ProposalReviewScreen {...propsNoReason} />)

      expect(screen.getByText(/no reason provided/i)).toBeInTheDocument()
    })
  })

  describe('parent vs child view', () => {
    it('should show parent-friendly message when parent views child proposal', () => {
      const childProposal = {
        ...mockProposal,
        proposedBy: 'child' as const,
        proposerId: 'child-1',
        proposerName: 'Emma',
      }

      render(<ProposalReviewScreen proposal={childProposal} isParentViewing={true} />)

      expect(screen.getByText(/Emma wants to discuss a change/)).toBeInTheDocument()
    })

    it('should show child-friendly message when child views parent proposal', () => {
      render(<ProposalReviewScreen {...defaultProps} isParentViewing={false} />)

      expect(screen.getByText(/Mom proposed a change to your agreement/)).toBeInTheDocument()
    })
  })

  describe('proposal status variations', () => {
    it('should display accepted status', () => {
      const acceptedProposal = { ...mockProposal, status: 'accepted' as const }

      render(<ProposalReviewScreen {...defaultProps} proposal={acceptedProposal} />)

      expect(screen.getByText(/accepted/i)).toBeInTheDocument()
    })

    it('should display declined status', () => {
      const declinedProposal = { ...mockProposal, status: 'declined' as const }

      render(<ProposalReviewScreen {...defaultProps} proposal={declinedProposal} />)

      expect(screen.getByText(/declined/i)).toBeInTheDocument()
    })

    it('should display counter-proposed status', () => {
      const counterProposal = { ...mockProposal, status: 'counter-proposed' as const }

      render(<ProposalReviewScreen {...defaultProps} proposal={counterProposal} />)

      expect(screen.getByText(/counter-proposed/i)).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have accessible heading structure', () => {
      render(<ProposalReviewScreen {...defaultProps} />)

      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
    })

    it('should have accessible main region', () => {
      render(<ProposalReviewScreen {...defaultProps} />)

      expect(screen.getByRole('main')).toBeInTheDocument()
    })
  })

  describe('round number display - AC6', () => {
    it('should display round number when provided', () => {
      render(<ProposalReviewScreen {...defaultProps} currentRound={2} />)

      expect(screen.getByText(/round 2/i)).toBeInTheDocument()
    })

    it('should not show round number for initial proposal', () => {
      render(<ProposalReviewScreen {...defaultProps} currentRound={1} />)

      // Round 1 is the initial proposal, typically not shown as "Round 1"
      expect(screen.queryByText(/round 1/i)).not.toBeInTheDocument()
    })
  })
})
