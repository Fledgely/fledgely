/**
 * RegressionIndicator Component Tests - Story 37.6 Task 4
 *
 * Tests for regression state display and conversation facilitation.
 * AC2: Notification: "Let's talk about what happened"
 * AC4: Parent-child discussion encouraged before changes
 * AC5: Child can explain circumstances
 * AC6: Regression framed as "let's work on this" not "you failed"
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RegressionIndicator } from './RegressionIndicator'
import { RegressionEvent } from '@fledgely/shared'

// Helper to create test regression event
function createTestEvent(overrides: Partial<RegressionEvent> = {}): RegressionEvent {
  const now = new Date()
  const graceExpires = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

  return {
    id: 'event-123',
    childId: 'child-123',
    previousMilestone: 'maturing',
    currentMilestone: 'growing',
    occurredAt: now,
    graceExpiresAt: graceExpires,
    status: 'grace_period',
    conversationHeld: false,
    updatedAt: now,
    ...overrides,
  }
}

describe('RegressionIndicator - Story 37.6 Task 4', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Basic Rendering', () => {
    it('should render with child view', () => {
      render(
        <RegressionIndicator
          regressionEvent={createTestEvent()}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('regression-indicator')).toBeInTheDocument()
      expect(screen.getByTestId('regression-indicator')).toHaveAttribute('data-viewer', 'child')
    })

    it('should render with parent view', () => {
      render(
        <RegressionIndicator
          regressionEvent={createTestEvent()}
          childName="Emma"
          viewerType="parent"
        />
      )

      expect(screen.getByTestId('regression-indicator')).toHaveAttribute('data-viewer', 'parent')
    })

    it('should set status data attribute', () => {
      render(
        <RegressionIndicator
          regressionEvent={createTestEvent()}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('regression-indicator')).toHaveAttribute(
        'data-status',
        'grace_period'
      )
    })
  })

  describe('AC2: "Let\'s talk about what happened"', () => {
    it('should show "Let\'s Talk" title for child', () => {
      render(
        <RegressionIndicator
          regressionEvent={createTestEvent()}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('notification-title')).toHaveTextContent("Let's Talk")
    })

    it('should show conversation-focused title for parent', () => {
      render(
        <RegressionIndicator
          regressionEvent={createTestEvent()}
          childName="Emma"
          viewerType="parent"
        />
      )

      expect(screen.getByTestId('notification-title')).toHaveTextContent('Conversation Needed')
    })
  })

  describe('Grace Period Display', () => {
    it('should show days remaining', () => {
      render(
        <RegressionIndicator
          regressionEvent={createTestEvent()}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('days-remaining')).toHaveTextContent('14')
    })

    it('should show grace period explanation', () => {
      render(
        <RegressionIndicator
          regressionEvent={createTestEvent()}
          childName="Emma"
          viewerType="child"
        />
      )

      const explanation = screen.getByTestId('grace-period-explanation').textContent
      expect(explanation?.toLowerCase()).toContain('2-week')
    })

    it('should show grace period reminder', () => {
      render(
        <RegressionIndicator
          regressionEvent={createTestEvent()}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('grace-period-reminder')).toBeInTheDocument()
    })
  })

  describe('AC4: Parent-child discussion encouraged', () => {
    it('should show conversation prompt for parent', () => {
      render(
        <RegressionIndicator
          regressionEvent={createTestEvent()}
          childName="Emma"
          viewerType="parent"
        />
      )

      const prompt = screen.getByTestId('conversation-prompt').textContent
      expect(prompt?.toLowerCase()).toContain('conversation')
    })

    it('should show mark conversation button for parent', () => {
      render(
        <RegressionIndicator
          regressionEvent={createTestEvent()}
          childName="Emma"
          viewerType="parent"
        />
      )

      expect(screen.getByTestId('mark-conversation-held')).toBeInTheDocument()
    })

    it('should call onMarkConversationHeld when clicked', () => {
      const handleMarkConversation = vi.fn()

      render(
        <RegressionIndicator
          regressionEvent={createTestEvent()}
          childName="Emma"
          viewerType="parent"
          onMarkConversationHeld={handleMarkConversation}
        />
      )

      fireEvent.click(screen.getByTestId('mark-conversation-held'))
      expect(handleMarkConversation).toHaveBeenCalled()
    })

    it('should show conversation held confirmation', () => {
      render(
        <RegressionIndicator
          regressionEvent={createTestEvent({
            conversationHeld: true,
            conversationHeldAt: new Date(),
          })}
          childName="Emma"
          viewerType="parent"
        />
      )

      expect(screen.getByTestId('conversation-held-section')).toBeInTheDocument()
      expect(screen.getByTestId('conversation-complete-message')).toBeInTheDocument()
    })
  })

  describe('AC5: Child can explain circumstances', () => {
    it('should show button to share explanation for child', () => {
      render(
        <RegressionIndicator
          regressionEvent={createTestEvent()}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('show-explanation-form')).toBeInTheDocument()
    })

    it('should show explanation form when button clicked', () => {
      render(
        <RegressionIndicator
          regressionEvent={createTestEvent()}
          childName="Emma"
          viewerType="child"
        />
      )

      fireEvent.click(screen.getByTestId('show-explanation-form'))

      expect(screen.getByTestId('explanation-form')).toBeInTheDocument()
      expect(screen.getByTestId('explanation-input')).toBeInTheDocument()
    })

    it('should call onRecordExplanation when explanation submitted', () => {
      const handleExplanation = vi.fn()

      render(
        <RegressionIndicator
          regressionEvent={createTestEvent()}
          childName="Emma"
          viewerType="child"
          onRecordExplanation={handleExplanation}
        />
      )

      fireEvent.click(screen.getByTestId('show-explanation-form'))
      fireEvent.change(screen.getByTestId('explanation-input'), {
        target: { value: 'I was stressed about exams.' },
      })
      fireEvent.click(screen.getByTestId('submit-explanation'))

      expect(handleExplanation).toHaveBeenCalledWith('I was stressed about exams.')
    })

    it('should show submitted explanation', () => {
      render(
        <RegressionIndicator
          regressionEvent={createTestEvent({
            childExplanation: 'I was having a hard time at school.',
          })}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('explanation-submitted')).toBeInTheDocument()
      expect(screen.getByTestId('submitted-explanation')).toHaveTextContent(
        'I was having a hard time at school.'
      )
    })

    it('should show child explanation to parent', () => {
      render(
        <RegressionIndicator
          regressionEvent={createTestEvent({
            childExplanation: 'I was stressed about a project.',
          })}
          childName="Emma"
          viewerType="parent"
        />
      )

      expect(screen.getByTestId('child-explanation-view')).toBeInTheDocument()
      expect(screen.getByTestId('child-explanation-text')).toHaveTextContent(
        'I was stressed about a project.'
      )
    })
  })

  describe('AC6: "Let\'s work on this" framing', () => {
    it('should show supportive framing message', () => {
      render(
        <RegressionIndicator
          regressionEvent={createTestEvent()}
          childName="Emma"
          viewerType="child"
        />
      )

      const framing = screen.getByTestId('supportive-framing').textContent
      expect(framing?.toLowerCase()).toContain("let's work on this")
    })

    it('should show "let\'s work on this" key message', () => {
      render(
        <RegressionIndicator
          regressionEvent={createTestEvent()}
          childName="Emma"
          viewerType="child"
        />
      )

      const message = screen.getByTestId('lets-work-on-this').textContent
      expect(message?.toLowerCase()).toContain('work on this together')
    })

    it('should show "not punishment" key message', () => {
      render(
        <RegressionIndicator
          regressionEvent={createTestEvent()}
          childName="Emma"
          viewerType="child"
        />
      )

      const message = screen.getByTestId('not-punishment').textContent
      expect(message?.toLowerCase()).toContain('support')
    })

    it('should show "explanation matters" for child', () => {
      render(
        <RegressionIndicator
          regressionEvent={createTestEvent()}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('explanation-matters')).toBeInTheDocument()
    })

    it('should not show "explanation matters" for parent', () => {
      render(
        <RegressionIndicator
          regressionEvent={createTestEvent()}
          childName="Emma"
          viewerType="parent"
        />
      )

      expect(screen.queryByTestId('explanation-matters')).not.toBeInTheDocument()
    })
  })

  describe('Resolution Options (Parent)', () => {
    it('should not show resolution options during grace period', () => {
      render(
        <RegressionIndicator
          regressionEvent={createTestEvent({ conversationHeld: true })}
          childName="Emma"
          viewerType="parent"
        />
      )

      expect(screen.queryByTestId('resolution-options')).not.toBeInTheDocument()
    })

    it('should not show resolution options without conversation', () => {
      // Advance past grace period
      vi.setSystemTime(new Date('2025-01-16T12:00:00Z'))

      render(
        <RegressionIndicator
          regressionEvent={createTestEvent({
            graceExpiresAt: new Date('2025-01-15T12:00:00Z'),
          })}
          childName="Emma"
          viewerType="parent"
        />
      )

      expect(screen.queryByTestId('resolution-options')).not.toBeInTheDocument()
    })

    it('should show resolution options after conversation and grace period', () => {
      vi.setSystemTime(new Date('2025-01-16T12:00:00Z'))

      render(
        <RegressionIndicator
          regressionEvent={createTestEvent({
            conversationHeld: true,
            graceExpiresAt: new Date('2025-01-15T12:00:00Z'),
          })}
          childName="Emma"
          viewerType="parent"
        />
      )

      expect(screen.getByTestId('resolution-options')).toBeInTheDocument()
      expect(screen.getByTestId('resolve-button')).toBeInTheDocument()
      expect(screen.getByTestId('revert-button')).toBeInTheDocument()
    })

    it('should call onResolve when resolve clicked', () => {
      const handleResolve = vi.fn()
      vi.setSystemTime(new Date('2025-01-16T12:00:00Z'))

      render(
        <RegressionIndicator
          regressionEvent={createTestEvent({
            conversationHeld: true,
            graceExpiresAt: new Date('2025-01-15T12:00:00Z'),
          })}
          childName="Emma"
          viewerType="parent"
          onResolve={handleResolve}
        />
      )

      fireEvent.click(screen.getByTestId('resolve-button'))
      expect(handleResolve).toHaveBeenCalled()
    })

    it('should call onRevert when revert clicked', () => {
      const handleRevert = vi.fn()
      vi.setSystemTime(new Date('2025-01-16T12:00:00Z'))

      render(
        <RegressionIndicator
          regressionEvent={createTestEvent({
            conversationHeld: true,
            graceExpiresAt: new Date('2025-01-15T12:00:00Z'),
          })}
          childName="Emma"
          viewerType="parent"
          onRevert={handleRevert}
        />
      )

      fireEvent.click(screen.getByTestId('revert-button'))
      expect(handleRevert).toHaveBeenCalled()
    })
  })

  describe('Status Badge', () => {
    it('should show regression status', () => {
      render(
        <RegressionIndicator
          regressionEvent={createTestEvent()}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('regression-status')).toHaveTextContent('grace_period')
    })

    it('should show conversation badge when conversation held', () => {
      render(
        <RegressionIndicator
          regressionEvent={createTestEvent({ conversationHeld: true })}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('conversation-badge')).toBeInTheDocument()
    })

    it('should show explanation badge when explanation provided', () => {
      render(
        <RegressionIndicator
          regressionEvent={createTestEvent({ childExplanation: 'My explanation' })}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('explanation-badge')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have aria-label', () => {
      render(
        <RegressionIndicator
          regressionEvent={createTestEvent()}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('regression-indicator')).toHaveAttribute(
        'aria-label',
        'Regression indicator for Emma'
      )
    })
  })

  describe('AC Verification', () => {
    it('should verify no punitive language in displayed content', () => {
      render(
        <RegressionIndicator
          regressionEvent={createTestEvent()}
          childName="Emma"
          viewerType="child"
        />
      )

      const content = screen.getByTestId('regression-indicator').textContent || ''
      const contentLower = content.toLowerCase()

      // Should not contain standalone punitive terms
      // (Allow negated forms like "isn't about failure")
      const withoutNegation = contentLower
        .replace(/isn't about failure/gi, '')
        .replace(/not a failure/gi, '')
        .replace(/isn't punishment/gi, '')
        .replace(/isn't about punishment/gi, '')
        .replace(/not punishment/gi, '')

      expect(withoutNegation).not.toContain('you failed')
      expect(withoutNegation).not.toContain('failure')
    })
  })
})
