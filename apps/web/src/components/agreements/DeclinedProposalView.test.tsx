/**
 * DeclinedProposalView Tests - Story 34.5
 *
 * Tests for viewing a declined proposal with positive messaging.
 * AC5: Proposer can try again
 * AC6: Declined doesn't mean forever
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DeclinedProposalView } from './DeclinedProposalView'

// Mock shared package
vi.mock('@fledgely/shared', () => ({
  AFTER_DECLINE_MESSAGES: {
    proposer: {
      title: 'Proposal Declined',
      body: "This isn't the end of the conversation.",
      tryAgain: 'You can propose again after some time has passed.',
      cooldownInfo: 'Wait 7 days before proposing the same change.',
      suggestions: [
        'Wait a few days and try a modified proposal',
        'Discuss in person to understand their concerns',
        'Consider a smaller step toward your goal',
      ],
    },
    responder: {
      title: 'You Declined the Proposal',
      body: 'Thank you for your thoughtful response.',
      next: 'Consider discussing this together to find common ground.',
    },
    notification: {
      title: 'Proposal Response',
      body: (name: string) => `${name} isn't ready for this change yet.`,
      supportive: 'You can discuss this together or propose something different later.',
    },
  },
}))

describe('DeclinedProposalView - Story 34.5', () => {
  const defaultProposerProps = {
    role: 'proposer' as const,
    responderName: 'Emma',
    declineReason: "I'm not ready for this change yet",
    declinedAt: new Date(),
  }

  const defaultResponderProps = {
    role: 'responder' as const,
    proposerName: 'Mom',
    declineReason: "I'm not ready for this change yet",
    declinedAt: new Date(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('proposer view', () => {
    it('should show non-final title', () => {
      render(<DeclinedProposalView {...defaultProposerProps} />)

      expect(screen.getByText('Proposal Declined')).toBeInTheDocument()
    })

    it('should not contain "rejected" in title', () => {
      render(<DeclinedProposalView {...defaultProposerProps} />)

      const title = screen.getByRole('heading', { level: 2 })
      expect(title.textContent?.toLowerCase()).not.toContain('rejected')
    })

    it('should emphasize conversation continues', () => {
      render(<DeclinedProposalView {...defaultProposerProps} />)

      expect(screen.getByText(/end of the conversation/i)).toBeInTheDocument()
    })

    it('should show responder name', () => {
      render(<DeclinedProposalView {...defaultProposerProps} />)

      expect(screen.getByText(/Emma/)).toBeInTheDocument()
    })

    it('should show the decline reason', () => {
      render(<DeclinedProposalView {...defaultProposerProps} />)

      expect(screen.getByText(/not ready for this change/i)).toBeInTheDocument()
    })

    it('should provide suggestions for next steps', () => {
      render(<DeclinedProposalView {...defaultProposerProps} />)

      expect(screen.getByText(/modified proposal/i)).toBeInTheDocument()
      expect(screen.getByText(/discuss in person/i)).toBeInTheDocument()
      expect(screen.getByText(/smaller step/i)).toBeInTheDocument()
    })

    it('should include try again messaging', () => {
      render(<DeclinedProposalView {...defaultProposerProps} />)

      expect(screen.getByText(/propose again/i)).toBeInTheDocument()
    })

    it('should include cooldown information', () => {
      render(<DeclinedProposalView {...defaultProposerProps} />)

      expect(screen.getByText(/7 days/i)).toBeInTheDocument()
    })
  })

  describe('responder view', () => {
    it('should thank for thoughtful response', () => {
      render(<DeclinedProposalView {...defaultResponderProps} />)

      expect(screen.getByText(/You Declined the Proposal/i)).toBeInTheDocument()
      expect(screen.getByText(/thoughtful response/i)).toBeInTheDocument()
    })

    it('should suggest continued dialogue', () => {
      render(<DeclinedProposalView {...defaultResponderProps} />)

      expect(screen.getByText(/discuss/i)).toBeInTheDocument()
    })

    it('should show proposer name', () => {
      render(<DeclinedProposalView {...defaultResponderProps} />)

      expect(screen.getByText(/Mom/)).toBeInTheDocument()
    })

    it('should show the decline reason chosen', () => {
      render(<DeclinedProposalView {...defaultResponderProps} />)

      expect(screen.getByText(/not ready for this change/i)).toBeInTheDocument()
    })
  })

  describe('tone and language', () => {
    it('should use positive framing throughout', () => {
      const { container } = render(<DeclinedProposalView {...defaultProposerProps} />)

      const text = container.textContent?.toLowerCase() || ''
      expect(text).not.toContain('never')
      expect(text).not.toContain('refused')
      expect(text).not.toContain('failed')
    })

    it('should encourage future interaction', () => {
      render(<DeclinedProposalView {...defaultProposerProps} />)

      // Should have messaging about trying again or discussing
      expect(screen.getByText(/propose again/i) || screen.getByText(/discuss/i)).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have accessible heading', () => {
      render(<DeclinedProposalView {...defaultProposerProps} />)

      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
    })

    it('should have a list for suggestions', () => {
      render(<DeclinedProposalView {...defaultProposerProps} />)

      expect(screen.getByRole('list')).toBeInTheDocument()
    })
  })
})
