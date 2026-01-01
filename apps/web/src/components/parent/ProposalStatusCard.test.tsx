/**
 * ProposalStatusCard Component Tests - Story 34.1
 *
 * Tests for showing pending proposal status to parent.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProposalStatusCard } from './ProposalStatusCard'
import type { AgreementProposal } from '@fledgely/shared'

// Mock @fledgely/shared
vi.mock('@fledgely/shared', async () => {
  const actual = await vi.importActual<typeof import('@fledgely/shared')>('@fledgely/shared')
  return {
    ...actual,
    AGREEMENT_PROPOSAL_MESSAGES: {
      childNotification: (name: string) => `${name} proposed a change`,
      pendingStatus: (name: string) => `Waiting for ${name} to review`,
      withdrawConfirmation: 'Are you sure you want to withdraw?',
      reasonPrompts: ["You've been responsible with gaming"],
    },
  }
})

describe('ProposalStatusCard - Story 34.1', () => {
  const mockProposal: AgreementProposal = {
    id: 'proposal-123',
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
        fieldPath: 'timeLimits.weekday.gaming',
        oldValue: 60,
        newValue: 90,
        changeType: 'modify',
      },
    ],
    reason: "You've been responsible",
    status: 'pending',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    respondedAt: null,
    version: 1,
    proposalNumber: 1,
  }

  const defaultProps = {
    proposal: mockProposal,
    childName: 'Alex',
    onWithdraw: vi.fn(),
  }

  describe('status display', () => {
    it('should display pending status message', () => {
      render(<ProposalStatusCard {...defaultProps} />)

      expect(screen.getByText(/waiting for alex to review/i)).toBeInTheDocument()
    })

    it('should display proposal summary', () => {
      render(<ProposalStatusCard {...defaultProps} />)

      expect(screen.getByText(/time limits/i)).toBeInTheDocument()
    })

    it('should display reason if provided', () => {
      render(<ProposalStatusCard {...defaultProps} />)

      expect(screen.getByText(/responsible/i)).toBeInTheDocument()
    })

    it('should not display reason if null', () => {
      const noReasonProposal = { ...mockProposal, reason: null }
      render(<ProposalStatusCard {...defaultProps} proposal={noReasonProposal} />)

      expect(screen.queryByText(/reason:/i)).not.toBeInTheDocument()
    })
  })

  describe('withdraw functionality', () => {
    it('should show withdraw button', () => {
      render(<ProposalStatusCard {...defaultProps} />)

      expect(screen.getByRole('button', { name: /withdraw/i })).toBeInTheDocument()
    })

    it('should call onWithdraw when button is clicked', () => {
      const onWithdraw = vi.fn()
      render(<ProposalStatusCard {...defaultProps} onWithdraw={onWithdraw} />)

      fireEvent.click(screen.getByRole('button', { name: /withdraw/i }))

      expect(onWithdraw).toHaveBeenCalledWith('proposal-123')
    })
  })

  describe('change count', () => {
    it('should display number of changes', () => {
      render(<ProposalStatusCard {...defaultProps} />)

      expect(screen.getByText(/1 change/i)).toBeInTheDocument()
    })

    it('should display plural for multiple changes', () => {
      const multiChangeProposal = {
        ...mockProposal,
        changes: [
          ...mockProposal.changes,
          {
            sectionId: 'apps',
            sectionName: 'Apps',
            fieldPath: 'apps.blocked',
            oldValue: [],
            newValue: ['TikTok'],
            changeType: 'modify' as const,
          },
        ],
      }
      render(<ProposalStatusCard {...defaultProps} proposal={multiChangeProposal} />)

      expect(screen.getByText(/2 changes/i)).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have accessible card structure', () => {
      render(<ProposalStatusCard {...defaultProps} />)

      expect(screen.getByRole('article')).toBeInTheDocument()
    })
  })
})
