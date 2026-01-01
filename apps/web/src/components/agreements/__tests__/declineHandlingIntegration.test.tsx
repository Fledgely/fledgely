/**
 * Decline Handling Integration Tests - Story 34.5
 *
 * Integration tests for the complete decline handling workflow.
 * AC1-AC6: Full decline flow from reason selection to after-decline messaging.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DeclineReasonSelector } from '../DeclineReasonSelector'
import { DeclinedProposalView } from '../DeclinedProposalView'
import { CooldownNotice } from '../CooldownNotice'

// Mock shared package
vi.mock('@fledgely/shared', () => ({
  DECLINE_REASONS: [
    { id: 'not-ready', label: "I'm not ready for this change yet" },
    { id: 'need-discussion', label: "Let's discuss this together first" },
    { id: 'too-soon', label: "It's too soon since our last change" },
    { id: 'need-more-info', label: 'I need more information about this' },
    { id: 'prefer-different', label: "I'd prefer a different approach" },
    { id: 'custom', label: 'Other reason...' },
  ],
  DECLINE_MESSAGES: {
    header: 'Why are you declining?',
    subheader: 'A thoughtful response helps continue the conversation',
    customPrompt: 'Share your thoughts:',
    customMinChars: 10,
    encouragement: 'Your response helps the other person understand your perspective.',
  },
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

describe('Decline Handling Integration - Story 34.5', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('complete decline flow', () => {
    it('should flow from reason selection to declined view', () => {
      // Step 1: Select a decline reason
      const onReasonSelect = vi.fn()
      const { rerender } = render(
        <DeclineReasonSelector
          selectedReasonId={null}
          onReasonSelect={onReasonSelect}
          customReason=""
          onCustomReasonChange={vi.fn()}
        />
      )

      // User clicks "not ready"
      fireEvent.click(screen.getByText("I'm not ready for this change yet"))
      expect(onReasonSelect).toHaveBeenCalledWith('not-ready')

      // Step 2: After decline, show declined view
      rerender(
        <DeclinedProposalView
          role="proposer"
          responderName="Emma"
          declineReason="I'm not ready for this change yet"
          declinedAt={new Date()}
        />
      )

      // Should show positive messaging
      expect(screen.getByText('Proposal Declined')).toBeInTheDocument()
      expect(screen.getByText(/end of the conversation/i)).toBeInTheDocument()
      expect(screen.getByText(/7 days/i)).toBeInTheDocument()
    })

    it('should show cooldown notice when proposing again on cooldown', () => {
      render(
        <CooldownNotice
          daysRemaining={4}
          cooldownEndDate={new Date('2026-01-08')}
          declinedProposalId="proposal-123"
        />
      )

      expect(screen.getByText(/Cooldown Period Active/i)).toBeInTheDocument()
      expect(screen.getByText('4')).toBeInTheDocument()
      expect(screen.getByText(/similar change was declined/i)).toBeInTheDocument()
    })
  })

  describe('AC1: Decline reason required', () => {
    it('should provide predefined decline reasons', () => {
      render(
        <DeclineReasonSelector
          selectedReasonId={null}
          onReasonSelect={vi.fn()}
          customReason=""
          onCustomReasonChange={vi.fn()}
        />
      )

      // All 6 reasons should be available
      expect(screen.getByText("I'm not ready for this change yet")).toBeInTheDocument()
      expect(screen.getByText("Let's discuss this together first")).toBeInTheDocument()
      expect(screen.getByText("It's too soon since our last change")).toBeInTheDocument()
      expect(screen.getByText('I need more information about this')).toBeInTheDocument()
      expect(screen.getByText("I'd prefer a different approach")).toBeInTheDocument()
      expect(screen.getByText('Other reason...')).toBeInTheDocument()
    })
  })

  describe('AC2: Respectful language', () => {
    it('should use respectful language throughout the decline flow', () => {
      const { container: selectorContainer } = render(
        <DeclineReasonSelector
          selectedReasonId="not-ready"
          onReasonSelect={vi.fn()}
          customReason=""
          onCustomReasonChange={vi.fn()}
        />
      )

      const selectorText = selectorContainer.textContent?.toLowerCase() || ''
      expect(selectorText).not.toContain('reject')
      expect(selectorText).not.toContain('refuse')

      const { container: viewContainer } = render(
        <DeclinedProposalView
          role="proposer"
          responderName="Emma"
          declineReason="Not ready"
          declinedAt={new Date()}
        />
      )

      const viewText = viewContainer.textContent?.toLowerCase() || ''
      expect(viewText).not.toContain('rejected')
      expect(viewText).not.toContain('failed')
    })
  })

  describe('AC4: 7-day cooldown', () => {
    it('should display cooldown period correctly', () => {
      render(
        <CooldownNotice
          daysRemaining={7}
          cooldownEndDate={new Date('2026-01-10')}
          declinedProposalId="proposal-xyz"
        />
      )

      expect(screen.getByText('7')).toBeInTheDocument()
      expect(screen.getByText(/days remaining/i)).toBeInTheDocument()
    })
  })

  describe('AC5: Proposer can try again', () => {
    it('should show try again messaging for proposer', () => {
      render(
        <DeclinedProposalView
          role="proposer"
          responderName="Emma"
          declineReason="Not ready"
          declinedAt={new Date()}
        />
      )

      expect(screen.getByText(/propose again/i)).toBeInTheDocument()
    })
  })

  describe("AC6: Declined doesn't mean forever", () => {
    it('should show positive framing and suggestions', () => {
      render(
        <DeclinedProposalView
          role="proposer"
          responderName="Emma"
          declineReason="Not ready"
          declinedAt={new Date()}
        />
      )

      // Positive framing
      expect(screen.getByText(/end of the conversation/i)).toBeInTheDocument()

      // Suggestions
      expect(screen.getByText(/modified proposal/i)).toBeInTheDocument()
      expect(screen.getByText(/discuss in person/i)).toBeInTheDocument()
      expect(screen.getByText(/smaller step/i)).toBeInTheDocument()
    })
  })
})
