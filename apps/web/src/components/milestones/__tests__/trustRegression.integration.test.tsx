/**
 * Trust Regression Integration Tests - Story 37.6 Task 5
 *
 * Integration tests for the complete regression handling system.
 * Tests all acceptance criteria together.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  createTrustRegressionEvent,
  getTrustRegressionStatus,
  isTrustRegressionInGracePeriod,
  getTrustGraceDaysRemaining,
  recordChildExplanation,
  markConversationHeld,
  resolveRegression,
  revertMonitoring,
  clearTrustRegressionEvents,
  REGRESSION_MESSAGES,
  validateSupportiveFraming,
  getChildRegressionNotification,
  getParentRegressionNotification,
  getSupportiveFraming,
  getGracePeriodReminder,
} from '@fledgely/shared'
import { RegressionIndicator } from '../RegressionIndicator'

describe('Trust Regression Integration - Story 37.6 Task 5', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T12:00:00Z'))
    clearTrustRegressionEvents()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('AC1: 2-week grace period before monitoring increases', () => {
    it('should enforce 2-week grace period from detection to change', () => {
      // Create regression event
      const event = createTrustRegressionEvent('child-123', 'maturing', 'growing')

      // Verify initial state
      expect(isTrustRegressionInGracePeriod('child-123')).toBe(true)
      expect(getTrustGraceDaysRemaining('child-123')).toBe(14)

      // Day 7: Still in grace period
      vi.setSystemTime(new Date('2025-01-08T12:00:00Z'))
      expect(isTrustRegressionInGracePeriod('child-123')).toBe(true)
      expect(getTrustGraceDaysRemaining('child-123')).toBe(7)

      // Day 14: Still in grace period (boundary)
      vi.setSystemTime(new Date('2025-01-15T11:00:00Z'))
      expect(isTrustRegressionInGracePeriod('child-123')).toBe(true)

      // Day 15: Grace period expired
      vi.setSystemTime(new Date('2025-01-16T12:00:00Z'))
      expect(isTrustRegressionInGracePeriod('child-123')).toBe(false)

      // Even after grace period, cannot revert without conversation
      expect(() => revertMonitoring(event.id)).toThrow('Conversation must be held')
    })

    it('should display grace period countdown in component', () => {
      const event = createTrustRegressionEvent('child-123', 'maturing', 'growing')

      render(<RegressionIndicator regressionEvent={event} childName="Emma" viewerType="child" />)

      expect(screen.getByTestId('days-remaining')).toHaveTextContent('14')
      expect(screen.getByTestId('grace-period-explanation').textContent).toContain('2-week')
    })
  })

  describe('AC2: Notification says "Let\'s talk about what happened"', () => {
    it('should show "Let\'s Talk" notification for child', () => {
      const notification = getChildRegressionNotification('Emma')
      expect(notification.title).toBe("Let's Talk")
      expect(notification.message.toLowerCase()).toContain('discuss')
    })

    it('should show conversation-focused notification for parent', () => {
      const notification = getParentRegressionNotification('Emma')
      expect(notification.title).toContain('Conversation')
      expect(notification.message).toContain('Emma')
    })

    it('should render notification in component', () => {
      const event = createTrustRegressionEvent('child-123', 'maturing', 'growing')

      render(<RegressionIndicator regressionEvent={event} childName="Emma" viewerType="child" />)

      expect(screen.getByTestId('notification-title')).toHaveTextContent("Let's Talk")
    })
  })

  describe('AC3: Conversation-first approach, not automatic punishment', () => {
    it('should require conversation before resolving', () => {
      const event = createTrustRegressionEvent('child-123', 'maturing', 'growing')

      // Cannot resolve without conversation
      expect(() => resolveRegression(event.id)).toThrow('Conversation must be held')

      // Mark conversation held
      markConversationHeld(event.id)

      // Now can resolve
      expect(() => resolveRegression(event.id)).not.toThrow()
    })

    it('should require conversation before reverting monitoring', () => {
      const event = createTrustRegressionEvent('child-123', 'maturing', 'growing')

      // Cannot revert without conversation
      expect(() => revertMonitoring(event.id)).toThrow('Conversation must be held')

      // Mark conversation held
      markConversationHeld(event.id)

      // Now can revert
      expect(() => revertMonitoring(event.id)).not.toThrow()
    })

    it('should never automatically change monitoring', () => {
      createTrustRegressionEvent('child-123', 'maturing', 'growing')

      // Advance past grace period
      vi.setSystemTime(new Date('2025-01-20T12:00:00Z'))

      // Status should still be awaiting conversation
      const status = getTrustRegressionStatus('child-123')
      // Should still have active regression (not auto-reverted)
      expect(status).not.toBeNull()
    })
  })

  describe('AC4: Parent-child discussion encouraged before changes', () => {
    it('should provide conversation prompts', () => {
      const event = createTrustRegressionEvent('child-123', 'maturing', 'growing')

      render(<RegressionIndicator regressionEvent={event} childName="Emma" viewerType="parent" />)

      expect(screen.getByTestId('conversation-prompt')).toBeInTheDocument()
      expect(screen.getByTestId('conversation-prompt').textContent?.toLowerCase()).toContain(
        'conversation'
      )
    })

    it('should allow marking conversation as held', () => {
      const event = createTrustRegressionEvent('child-123', 'maturing', 'growing')
      const handleMarkConversation = vi.fn()

      render(
        <RegressionIndicator
          regressionEvent={event}
          childName="Emma"
          viewerType="parent"
          onMarkConversationHeld={handleMarkConversation}
        />
      )

      fireEvent.click(screen.getByTestId('mark-conversation-held'))
      expect(handleMarkConversation).toHaveBeenCalled()
    })

    it('should show conversation held confirmation', () => {
      const event = createTrustRegressionEvent('child-123', 'maturing', 'growing')
      markConversationHeld(event.id, 'Good discussion about stress management')

      const updated = getTrustRegressionStatus('child-123')
      expect(updated?.conversationHeld).toBe(true)
      expect(updated?.parentNotes).toContain('stress management')
    })
  })

  describe('AC5: Child can explain circumstances', () => {
    it('should allow child to record explanation', () => {
      const event = createTrustRegressionEvent('child-123', 'maturing', 'growing')

      recordChildExplanation(event.id, 'I was stressed about exams and made poor choices.')

      const status = getTrustRegressionStatus('child-123')
      expect(status?.childExplanation).toContain('stressed about exams')
    })

    it('should show explanation form in component', () => {
      const event = createTrustRegressionEvent('child-123', 'maturing', 'growing')

      render(<RegressionIndicator regressionEvent={event} childName="Emma" viewerType="child" />)

      fireEvent.click(screen.getByTestId('show-explanation-form'))
      expect(screen.getByTestId('explanation-form')).toBeInTheDocument()
    })

    it('should display submitted explanation to parent', () => {
      const event = createTrustRegressionEvent('child-123', 'maturing', 'growing')
      recordChildExplanation(event.id, 'School has been really hard lately.')

      const updated = getTrustRegressionStatus('child-123')

      render(
        <RegressionIndicator regressionEvent={updated!} childName="Emma" viewerType="parent" />
      )

      expect(screen.getByTestId('child-explanation-view')).toBeInTheDocument()
      expect(screen.getByTestId('child-explanation-text')).toHaveTextContent(
        'School has been really hard lately.'
      )
    })
  })

  describe('AC6: Regression framed as "let\'s work on this" not "you failed"', () => {
    it('should use "let\'s work on this" language', () => {
      const framing = getSupportiveFraming('child')
      expect(framing.toLowerCase()).toContain("let's work on this")
    })

    it('should never use "you failed" language', () => {
      // Check all message constants
      const allMessages = Object.values(REGRESSION_MESSAGES).join(' ')

      // Should not contain "you failed"
      expect(allMessages.toLowerCase()).not.toContain('you failed')
    })

    it('should validate all notifications pass supportive framing', () => {
      const childNotification = getChildRegressionNotification('Emma')
      const parentNotification = getParentRegressionNotification('Emma')

      // Validate child notification
      const childResult = validateSupportiveFraming(childNotification.message)
      expect(childResult.valid).toBe(true)

      // Validate parent notification
      const parentResult = validateSupportiveFraming(parentNotification.message)
      expect(parentResult.valid).toBe(true)
    })

    it('should display supportive framing in component', () => {
      const event = createTrustRegressionEvent('child-123', 'maturing', 'growing')

      render(<RegressionIndicator regressionEvent={event} childName="Emma" viewerType="child" />)

      expect(screen.getByTestId('lets-work-on-this')).toHaveTextContent(
        "Let's work on this together"
      )
      expect(screen.getByTestId('not-punishment').textContent?.toLowerCase()).toContain('support')
    })
  })

  describe('Complete Regression Workflow', () => {
    it('should complete full regression workflow from detection to resolution', () => {
      // Step 1: Create regression event
      const event = createTrustRegressionEvent('child-123', 'maturing', 'growing')
      expect(event.status).toBe('grace_period')
      expect(getTrustGraceDaysRemaining('child-123')).toBe(14)

      // Step 2: Child provides explanation
      recordChildExplanation(event.id, 'I was having a hard time with school.')
      let status = getTrustRegressionStatus('child-123')
      expect(status?.childExplanation).toBeDefined()

      // Step 3: Time passes (7 days)
      vi.setSystemTime(new Date('2025-01-08T12:00:00Z'))
      expect(getTrustGraceDaysRemaining('child-123')).toBe(7)

      // Step 4: Parent and child have conversation
      markConversationHeld(event.id, 'We discussed stress management strategies.')
      status = getTrustRegressionStatus('child-123')
      expect(status?.conversationHeld).toBe(true)

      // Step 5: Grace period expires (day 15)
      vi.setSystemTime(new Date('2025-01-16T12:00:00Z'))
      expect(isTrustRegressionInGracePeriod('child-123')).toBe(false)

      // Step 6: Parent decides to keep current level
      resolveRegression(event.id)
      expect(getTrustRegressionStatus('child-123')).toBeNull() // Resolved
    })

    it('should complete workflow with monitoring revert', () => {
      // Create regression and hold conversation
      const event = createTrustRegressionEvent('child-123', 'readyForIndependence', 'maturing')
      recordChildExplanation(event.id, 'I broke some rules.')
      markConversationHeld(event.id, 'Discussed accountability.')

      // Advance past grace period
      vi.setSystemTime(new Date('2025-01-16T12:00:00Z'))

      // Revert monitoring
      revertMonitoring(event.id)
      expect(getTrustRegressionStatus('child-123')).toBeNull() // Reverted
    })
  })

  describe('Language Validation', () => {
    it('should validate all grace period messages', () => {
      const daysVariants = [0, 1, 7, 14]
      const viewerTypes: Array<'child' | 'parent'> = ['child', 'parent']

      for (const days of daysVariants) {
        for (const viewer of viewerTypes) {
          const message = getGracePeriodReminder(days, viewer)
          const result = validateSupportiveFraming(message)
          expect(result.valid).toBe(true)
        }
      }
    })

    it('should validate supportive framing message', () => {
      const childFraming = getSupportiveFraming('child')
      const parentFraming = getSupportiveFraming('parent')

      // Both should pass validation
      expect(validateSupportiveFraming(childFraming).valid).toBe(true)
      expect(validateSupportiveFraming(parentFraming).valid).toBe(true)

      // Both should contain supportive language
      expect(childFraming.toLowerCase()).toContain("let's work on this")
      expect(parentFraming.toLowerCase()).toContain('learning opportunity')
    })

    it('should reject punitive language', () => {
      const badMessages = [
        'You failed to maintain your trust level.',
        'This is a consequence of your behavior.',
        'You violated our family agreement.',
      ]

      for (const msg of badMessages) {
        const result = validateSupportiveFraming(msg)
        expect(result.valid).toBe(false)
      }
    })
  })

  describe('Component Integration', () => {
    it('should display complete regression state for child', () => {
      const event = createTrustRegressionEvent('child-123', 'maturing', 'growing')
      recordChildExplanation(event.id, 'My explanation')

      const updated = getTrustRegressionStatus('child-123')

      render(<RegressionIndicator regressionEvent={updated!} childName="Emma" viewerType="child" />)

      // Verify all key elements
      expect(screen.getByTestId('notification-title')).toHaveTextContent("Let's Talk")
      expect(screen.getByTestId('days-remaining')).toHaveTextContent('14')
      expect(screen.getByTestId('supportive-framing')).toBeInTheDocument()
      expect(screen.getByTestId('explanation-submitted')).toBeInTheDocument()
    })

    it('should display complete regression state for parent', () => {
      const event = createTrustRegressionEvent('child-123', 'maturing', 'growing')
      recordChildExplanation(event.id, 'My explanation')
      markConversationHeld(event.id)

      // Advance past grace period
      vi.setSystemTime(new Date('2025-01-16T12:00:00Z'))

      const updated = getTrustRegressionStatus('child-123')

      render(
        <RegressionIndicator regressionEvent={updated!} childName="Emma" viewerType="parent" />
      )

      // Verify all key elements
      expect(screen.getByTestId('child-explanation-view')).toBeInTheDocument()
      expect(screen.getByTestId('conversation-held-section')).toBeInTheDocument()
      expect(screen.getByTestId('resolution-options')).toBeInTheDocument()
    })
  })
})
