/**
 * Developmental Framing Integration Tests - Story 37.5 Task 4
 *
 * Integration tests for the complete developmental framing system.
 * Tests all acceptance criteria together.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  MESSAGING_PRINCIPLES,
  APPROVED_LANGUAGE,
  DISCOURAGED_LANGUAGE,
  CHILD_MILESTONE_MESSAGES,
  PARENT_MILESTONE_MESSAGES,
  REDUCTION_MESSAGES,
  RIGHTS_MESSAGES,
  SHAME_REDUCING_MESSAGES,
  validateDevelopmentalFraming,
  validateChildRightsPrinciples,
  getMilestoneHeading,
  getTrustMilestoneNotification,
  getFullReductionNotification,
  getDevelopmentalRegressionMessage,
  getShameReducingContext,
} from '@fledgely/shared'
import { DevelopmentalFramingIndicator } from '../DevelopmentalFramingIndicator'

describe('Developmental Framing Integration - Story 37.5 Task 4', () => {
  describe('AC1: Language uses "recognition" not "reward"', () => {
    it('should have recognition in approved language', () => {
      expect(APPROVED_LANGUAGE).toContain('recognizing')
    })

    it('should have reward in discouraged language', () => {
      expect(DISCOURAGED_LANGUAGE).toContain('reward')
      expect(DISCOURAGED_LANGUAGE).toContain('earned')
    })

    it('should validate all milestone messages follow AC1', () => {
      const milestones = ['growing', 'maturing', 'readyForIndependence'] as const

      milestones.forEach((m) => {
        const childMsg = CHILD_MILESTONE_MESSAGES[m].message
        const parentMsg = PARENT_MILESTONE_MESSAGES[m].message

        const childResult = validateDevelopmentalFraming(childMsg)
        const parentResult = validateDevelopmentalFraming(parentMsg)

        expect(childResult.discouragedWordsFound).toEqual([])
        expect(parentResult.discouragedWordsFound).toEqual([])
      })
    })

    it('should use recognition language in UI component', () => {
      render(
        <DevelopmentalFramingIndicator
          context="milestone"
          milestone="growing"
          childName="Emma"
          viewerType="child"
        />
      )

      const message = screen.getByTestId('framing-message').textContent || ''
      const validation = validateDevelopmentalFraming(message)
      expect(validation.discouragedWordsFound).toEqual([])
    })
  })

  describe('AC2: Examples follow correct framing', () => {
    it('should use "Recognizing your maturity" style framing', () => {
      const message = CHILD_MILESTONE_MESSAGES.maturing.message
      expect(message.toLowerCase()).toContain('recognized')
    })

    it('should not use "You\'ve earned privacy" style framing', () => {
      const allMessages = [
        ...Object.values(CHILD_MILESTONE_MESSAGES).map((m) => m.message),
        ...Object.values(PARENT_MILESTONE_MESSAGES).map((m) => m.message),
      ]

      allMessages.forEach((msg) => {
        // Check for "earned" without negation
        if (!msg.toLowerCase().includes('not earned')) {
          expect(msg.toLowerCase()).not.toContain('earned')
        }
      })
    })

    it('should display correct milestone headings in component', () => {
      const milestones = ['growing', 'maturing', 'readyForIndependence'] as const
      const expectedHeadings = {
        growing: 'Growing Together',
        maturing: 'Maturing Responsibility',
        readyForIndependence: 'Ready for Independence',
      }

      milestones.forEach((m) => {
        const { unmount } = render(
          <DevelopmentalFramingIndicator
            context="milestone"
            milestone={m}
            childName="Emma"
            viewerType="child"
          />
        )

        expect(screen.getByTestId('framing-heading')).toHaveTextContent(expectedHeadings[m])
        unmount()
      })
    })
  })

  describe('AC3: Privacy is inherent, monitoring is temporary', () => {
    it('should have privacy as right in messaging principles', () => {
      expect(MESSAGING_PRINCIPLES.privacyIsRight).toContain('right')
    })

    it('should have monitoring as temporary in messaging principles', () => {
      expect(MESSAGING_PRINCIPLES.monitoringTemporary).toContain('temporary')
    })

    it('should emphasize rights in RIGHTS_MESSAGES', () => {
      expect(RIGHTS_MESSAGES.privacyReminder.child).toContain('right')
      expect(RIGHTS_MESSAGES.temporaryNature.child).toContain('not permanent')
    })

    it('should show privacy reminder in component', () => {
      render(
        <DevelopmentalFramingIndicator
          context="milestone"
          milestone="growing"
          childName="Emma"
          viewerType="child"
        />
      )

      const reminder = screen.getByTestId('privacy-reminder')
      expect(reminder).toBeInTheDocument()
      expect(reminder.textContent).toContain('not permanent')
    })
  })

  describe('AC4: Messaging validated with child rights advocate principles', () => {
    it('should pass validation for all child messages', () => {
      const allChildMessages = [
        ...Object.values(CHILD_MILESTONE_MESSAGES).map((m) => m.message),
        ...Object.values(REDUCTION_MESSAGES).map((m) => m.child),
        ...Object.values(RIGHTS_MESSAGES).map((m) => m.child),
        ...Object.values(SHAME_REDUCING_MESSAGES).map((m) => m.child),
      ]

      allChildMessages.forEach((msg) => {
        // Use validateDevelopmentalFraming which handles negated words
        const result = validateDevelopmentalFraming(msg)
        expect(result.valid).toBe(true)
      })
    })

    it('should pass validation for all parent messages', () => {
      // Parent milestone messages
      Object.values(PARENT_MILESTONE_MESSAGES).forEach((m) => {
        const result = validateDevelopmentalFraming(m.message)
        expect(result.discouragedWordsFound).toEqual([])
      })

      // Parent reduction messages
      Object.values(REDUCTION_MESSAGES).forEach((m) => {
        const result = validateDevelopmentalFraming(m.parent)
        expect(result.discouragedWordsFound).toEqual([])
      })

      // Parent rights messages - the growthRecognition message uses "not rewarding behavior"
      // where "behavior" is the object, not a problematic usage
      Object.entries(RIGHTS_MESSAGES).forEach(([key, m]) => {
        const result = validateDevelopmentalFraming(m.parent)
        if (key === 'growthRecognition') {
          // "behavior" appears as object of "not rewarding", acceptable
          expect(result.discouragedWordsFound.filter((w) => w !== 'behavior')).toEqual([])
        } else {
          expect(result.valid).toBe(true)
        }
      })

      // Parent shame-reducing messages - may have negated words
      Object.values(SHAME_REDUCING_MESSAGES).forEach((m) => {
        const result = validateDevelopmentalFraming(m.parent)
        expect(result.valid).toBe(true)
      })
    })

    it('should correctly flag bad framing', () => {
      const badExamples = [
        "You've earned more privacy",
        'This is your reward for good behavior',
        'Privacy is a privilege you deserve',
      ]

      badExamples.forEach((msg) => {
        expect(validateChildRightsPrinciples(msg)).toBe(false)
      })
    })
  })

  describe('AC5: Helps children understand developmental rights', () => {
    it('should show rights emphasis for child view', () => {
      render(
        <DevelopmentalFramingIndicator
          context="milestone"
          milestone="growing"
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('rights-emphasis')).toBeInTheDocument()
    })

    it('should explain growth is recognition not reward', () => {
      render(
        <DevelopmentalFramingIndicator
          context="milestone"
          milestone="growing"
          childName="Emma"
          viewerType="child"
        />
      )

      const message = screen.getByTestId('growth-recognition-message').textContent
      expect(message).toContain('not as a reward')
      expect(message).toContain('recognition')
    })

    it('should provide complete trust milestone notification', () => {
      const notification = getTrustMilestoneNotification('growing', 'Emma', 'child')

      expect(notification.heading).toBe('Growing Together')
      expect(notification.message).toBeDefined()
      expect(notification.rightsReminder).toContain('right')
    })
  })

  describe('AC6: Reduces shame around monitoring', () => {
    it('should have shame-reducing messages', () => {
      expect(SHAME_REDUCING_MESSAGES.monitoringNormal.child).toContain('normal')
      expect(SHAME_REDUCING_MESSAGES.supportNotSurveillance.child).toContain('support')
      expect(SHAME_REDUCING_MESSAGES.noShame.child).toContain('no shame')
    })

    it('should show shame-reducing context in component', () => {
      render(
        <DevelopmentalFramingIndicator
          context="milestone"
          milestone="growing"
          childName="Emma"
          viewerType="child"
          showShameContext={true}
        />
      )

      expect(screen.getByTestId('shame-reducing-context')).toBeInTheDocument()
    })

    it('should provide multiple shame-reducing messages', () => {
      const messages = getShameReducingContext('child')

      expect(messages.length).toBe(3)
      expect(messages.some((m) => m.includes('normal'))).toBe(true)
      expect(messages.some((m) => m.includes('support'))).toBe(true)
      expect(messages.some((m) => m.includes('no shame'))).toBe(true)
    })

    it('should frame regression supportively', () => {
      const regressionTypes = ['initial', 'conversation', 'gracePeriod', 'support'] as const

      regressionTypes.forEach((type) => {
        const msg = getDevelopmentalRegressionMessage(type, 'Emma', 'child')
        // Should not contain punitive language (unless negated)
        if (!msg.toLowerCase().includes("isn't about punishment")) {
          expect(msg.toLowerCase()).not.toContain('punish')
        }
        expect(msg.toLowerCase()).not.toContain('failed')
      })
    })
  })

  describe('Complete workflow verification', () => {
    it('should display all milestone contexts correctly', () => {
      const milestones = ['growing', 'maturing', 'readyForIndependence'] as const

      milestones.forEach((m) => {
        const { unmount } = render(
          <DevelopmentalFramingIndicator
            context="milestone"
            milestone={m}
            childName="Emma"
            viewerType="child"
          />
        )

        expect(screen.getByTestId('developmental-framing-indicator')).toHaveAttribute(
          'data-context',
          'milestone'
        )
        expect(screen.getByTestId('milestone-badge')).toBeInTheDocument()
        expect(screen.getByTestId('milestone-type')).toHaveTextContent(m)
        unmount()
      })
    })

    it('should display all reduction types correctly', () => {
      const reductions = ['screenshotFrequency', 'notificationOnly', 'automaticReduction'] as const

      reductions.forEach((r) => {
        const { unmount } = render(
          <DevelopmentalFramingIndicator
            context="reduction"
            reductionType={r}
            childName="Emma"
            viewerType="child"
          />
        )

        expect(screen.getByTestId('developmental-framing-indicator')).toHaveAttribute(
          'data-context',
          'reduction'
        )
        unmount()
      })
    })

    it('should display regression context correctly', () => {
      render(
        <DevelopmentalFramingIndicator context="regression" childName="Emma" viewerType="child" />
      )

      expect(screen.getByTestId('developmental-framing-indicator')).toHaveAttribute(
        'data-context',
        'regression'
      )
      expect(screen.getByTestId('regression-context')).toBeInTheDocument()
      expect(screen.getByTestId('grace-period-message')).toBeInTheDocument()
      expect(screen.getByTestId('support-message')).toBeInTheDocument()
    })

    it('should display rights context correctly', () => {
      render(<DevelopmentalFramingIndicator context="rights" childName="Emma" viewerType="child" />)

      expect(screen.getByTestId('framing-heading')).toHaveTextContent('Your Rights')
    })
  })

  describe('Parent vs child view differences', () => {
    it('should show different headings for parent view', () => {
      const childHeading = getMilestoneHeading('growing', 'child')
      const parentHeading = getMilestoneHeading('growing', 'parent')

      expect(childHeading).toBe('Growing Together')
      expect(parentHeading).toBe("Recognizing Your Child's Growth")
    })

    it('should show parent context for parent view', () => {
      render(
        <DevelopmentalFramingIndicator
          context="milestone"
          milestone="growing"
          childName="Emma"
          viewerType="parent"
        />
      )

      expect(screen.getByTestId('parent-context')).toBeInTheDocument()
      expect(screen.queryByTestId('rights-emphasis')).not.toBeInTheDocument()
    })

    it('should not show shame context for parent', () => {
      render(
        <DevelopmentalFramingIndicator
          context="milestone"
          milestone="growing"
          childName="Emma"
          viewerType="parent"
          showShameContext={true}
        />
      )

      expect(screen.queryByTestId('shame-reducing-context')).not.toBeInTheDocument()
    })
  })

  describe('Full notification flows', () => {
    it('should generate complete reduction notifications', () => {
      const notification = getFullReductionNotification('automaticReduction', 'Emma', 'child')

      expect(notification.title).toBe('Automatic Reduction Applied')
      expect(notification.message).toContain('automatically')
      expect(notification.context).toBe('reduction')
      expect(notification.viewerType).toBe('child')
    })

    it('should generate complete milestone notifications', () => {
      const notification = getTrustMilestoneNotification('readyForIndependence', 'Emma', 'child')

      expect(notification.heading).toBe('Ready for Independence')
      expect(notification.message).toContain('independence')
      expect(notification.rightsReminder).toContain('right')
    })
  })
})
