/**
 * ChildProposalStatusCard Tests - Story 34.2 (AC5)
 *
 * Tests for child proposal status display.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChildProposalStatusCard } from './ChildProposalStatusCard'
import type { AgreementProposal } from '@fledgely/shared'

// Mock the shared package
vi.mock('@fledgely/shared', () => ({
  CHILD_PROPOSAL_MESSAGES: {
    pendingStatus: (parentName: string) => `Waiting for ${parentName} to review`,
  },
}))

const mockProposal: AgreementProposal = {
  id: 'proposal-1',
  familyId: 'family-1',
  childId: 'child-1',
  agreementId: 'agreement-1',
  proposedBy: 'child',
  proposerId: 'user-child-1',
  proposerName: 'Emma',
  changes: [
    {
      sectionId: 'time-limits',
      sectionName: 'Screen Time',
      fieldPath: 'timeLimits.weekday.gaming',
      oldValue: 60,
      newValue: 90,
      changeType: 'modify',
    },
  ],
  reason: 'I want more gaming time',
  status: 'pending',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  respondedAt: null,
  version: 1,
  proposalNumber: 1,
}

const defaultProps = {
  proposal: mockProposal,
  parentName: 'Mom',
  onWithdraw: vi.fn(),
}

describe('ChildProposalStatusCard - Story 34.2 (AC5)', () => {
  describe('status display', () => {
    it('should display pending status message', () => {
      render(<ChildProposalStatusCard {...defaultProps} />)
      expect(screen.getByText(/waiting for mom to review/i)).toBeInTheDocument()
    })

    it('should show proposal is pending with visual indicator', () => {
      render(<ChildProposalStatusCard {...defaultProps} />)
      // The card should have article role
      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('should display encouraging message', () => {
      render(<ChildProposalStatusCard {...defaultProps} />)
      expect(screen.getByText(/great job speaking up/i)).toBeInTheDocument()
    })
  })

  describe('proposal summary', () => {
    it('should show number of changes', () => {
      render(<ChildProposalStatusCard {...defaultProps} />)
      expect(screen.getByText(/1 change/i)).toBeInTheDocument()
    })

    it('should show multiple changes text correctly', () => {
      const multiChangeProposal = {
        ...mockProposal,
        changes: [
          ...mockProposal.changes,
          {
            sectionId: 'apps',
            sectionName: 'Apps',
            fieldPath: 'apps.allowed',
            oldValue: [],
            newValue: ['TikTok'],
            changeType: 'add' as const,
          },
        ],
      }
      render(<ChildProposalStatusCard {...defaultProps} proposal={multiChangeProposal} />)
      expect(screen.getByText(/2 changes/i)).toBeInTheDocument()
    })

    it('should show affected sections', () => {
      render(<ChildProposalStatusCard {...defaultProps} />)
      expect(screen.getByText('Screen Time')).toBeInTheDocument()
    })

    it('should show reason when provided', () => {
      render(<ChildProposalStatusCard {...defaultProps} />)
      expect(screen.getByText(/I want more gaming time/)).toBeInTheDocument()
    })

    it('should not show reason section when not provided', () => {
      const noReasonProposal = { ...mockProposal, reason: null }
      render(<ChildProposalStatusCard {...defaultProps} proposal={noReasonProposal} />)
      expect(screen.queryByText(/your reason/i)).not.toBeInTheDocument()
    })
  })

  describe('withdraw functionality', () => {
    it('should show withdraw button', () => {
      render(<ChildProposalStatusCard {...defaultProps} />)
      expect(screen.getByRole('button', { name: /take back/i })).toBeInTheDocument()
    })

    it('should call onWithdraw when button clicked', () => {
      const onWithdraw = vi.fn()
      render(<ChildProposalStatusCard {...defaultProps} onWithdraw={onWithdraw} />)
      fireEvent.click(screen.getByRole('button', { name: /take back/i }))
      expect(onWithdraw).toHaveBeenCalledWith('proposal-1')
    })
  })
})
