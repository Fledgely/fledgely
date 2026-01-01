/**
 * DevelopmentalFramingIndicator Component Tests - Story 37.5 Task 3
 *
 * Tests for developmental framing UI component.
 * AC1: Language uses "recognition" not "reward"
 * AC2: Examples: "Recognizing your maturity" not "You've earned privacy"
 * AC5: Helps children understand their developmental rights
 * AC6: Reduces shame around monitoring
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DevelopmentalFramingIndicator } from './DevelopmentalFramingIndicator'

describe('DevelopmentalFramingIndicator - Story 37.5 Task 3', () => {
  describe('Basic Rendering', () => {
    it('should render with milestone context', () => {
      render(
        <DevelopmentalFramingIndicator
          context="milestone"
          milestone="growing"
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('developmental-framing-indicator')).toBeInTheDocument()
      expect(screen.getByTestId('framing-heading')).toBeInTheDocument()
      expect(screen.getByTestId('framing-message')).toBeInTheDocument()
    })

    it('should set context data attribute', () => {
      render(
        <DevelopmentalFramingIndicator
          context="milestone"
          milestone="growing"
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('developmental-framing-indicator')).toHaveAttribute(
        'data-context',
        'milestone'
      )
    })

    it('should set viewer data attribute', () => {
      render(
        <DevelopmentalFramingIndicator
          context="milestone"
          milestone="growing"
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('developmental-framing-indicator')).toHaveAttribute(
        'data-viewer',
        'child'
      )
    })
  })

  describe('AC1: Language uses "recognition" not "reward"', () => {
    it('should use recognition language for child milestone', () => {
      render(
        <DevelopmentalFramingIndicator
          context="milestone"
          milestone="growing"
          childName="Emma"
          viewerType="child"
        />
      )

      const message = screen.getByTestId('framing-message').textContent
      expect(message?.toLowerCase()).toContain('recogniz')
    })

    it('should not use reward language', () => {
      render(
        <DevelopmentalFramingIndicator
          context="milestone"
          milestone="growing"
          childName="Emma"
          viewerType="child"
        />
      )

      const message = screen.getByTestId('framing-message').textContent
      // Should not contain unqualified "reward" or "earned"
      // (negated forms like "not a reward" are acceptable)
      if (!message?.includes('not a reward') && !message?.includes('not as a reward')) {
        expect(message?.toLowerCase()).not.toContain('reward')
      }
      if (!message?.includes("haven't earned") && !message?.includes('not earned')) {
        expect(message?.toLowerCase()).not.toContain('earned')
      }
    })
  })

  describe('AC2: Correct framing examples', () => {
    it('should show "Growing Together" for growing milestone', () => {
      render(
        <DevelopmentalFramingIndicator
          context="milestone"
          milestone="growing"
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('framing-heading')).toHaveTextContent('Growing Together')
    })

    it('should show "Maturing Responsibility" for maturing milestone', () => {
      render(
        <DevelopmentalFramingIndicator
          context="milestone"
          milestone="maturing"
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('framing-heading')).toHaveTextContent('Maturing Responsibility')
    })

    it('should show "Ready for Independence" for readyForIndependence milestone', () => {
      render(
        <DevelopmentalFramingIndicator
          context="milestone"
          milestone="readyForIndependence"
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('framing-heading')).toHaveTextContent('Ready for Independence')
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

    it('should show growth recognition message', () => {
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

    it('should show privacy reminder for child', () => {
      render(
        <DevelopmentalFramingIndicator
          context="milestone"
          milestone="growing"
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('privacy-reminder')).toBeInTheDocument()
    })

    it('should not show rights emphasis for parent view', () => {
      render(
        <DevelopmentalFramingIndicator
          context="milestone"
          milestone="growing"
          childName="Emma"
          viewerType="parent"
        />
      )

      expect(screen.queryByTestId('rights-emphasis')).not.toBeInTheDocument()
    })
  })

  describe('AC6: Reduces shame around monitoring', () => {
    it('should show shame-reducing context when enabled', () => {
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

    it('should show multiple shame-reducing messages', () => {
      render(
        <DevelopmentalFramingIndicator
          context="milestone"
          milestone="growing"
          childName="Emma"
          viewerType="child"
          showShameContext={true}
        />
      )

      expect(screen.getByTestId('shame-context-0')).toBeInTheDocument()
      expect(screen.getByTestId('shame-context-1')).toBeInTheDocument()
      expect(screen.getByTestId('shame-context-2')).toBeInTheDocument()
    })

    it('should include "normal" in shame-reducing context', () => {
      render(
        <DevelopmentalFramingIndicator
          context="milestone"
          milestone="growing"
          childName="Emma"
          viewerType="child"
          showShameContext={true}
        />
      )

      const context0 = screen.getByTestId('shame-context-0').textContent
      expect(context0).toContain('normal')
    })

    it('should include "no shame" message', () => {
      render(
        <DevelopmentalFramingIndicator
          context="milestone"
          milestone="growing"
          childName="Emma"
          viewerType="child"
          showShameContext={true}
        />
      )

      const context2 = screen.getByTestId('shame-context-2').textContent
      expect(context2).toContain('no shame')
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

  describe('Reduction Context', () => {
    it('should show reduction message', () => {
      render(
        <DevelopmentalFramingIndicator
          context="reduction"
          reductionType="screenshotFrequency"
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('framing-heading')).toHaveTextContent(
        'Screenshot Frequency Reducing'
      )
    })

    it('should show notification-only reduction', () => {
      render(
        <DevelopmentalFramingIndicator
          context="reduction"
          reductionType="notificationOnly"
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('framing-heading')).toHaveTextContent(
        'Notification-Only Mode Activated'
      )
    })

    it('should show automatic reduction', () => {
      render(
        <DevelopmentalFramingIndicator
          context="reduction"
          reductionType="automaticReduction"
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('framing-heading')).toHaveTextContent('Automatic Reduction Applied')
    })
  })

  describe('Regression Context', () => {
    it('should show regression context', () => {
      render(
        <DevelopmentalFramingIndicator context="regression" childName="Emma" viewerType="child" />
      )

      expect(screen.getByTestId('regression-context')).toBeInTheDocument()
    })

    it('should show grace period message', () => {
      render(
        <DevelopmentalFramingIndicator context="regression" childName="Emma" viewerType="child" />
      )

      const message = screen.getByTestId('grace-period-message').textContent
      expect(message).toContain('2-week')
    })

    it('should show support message', () => {
      render(
        <DevelopmentalFramingIndicator context="regression" childName="Emma" viewerType="child" />
      )

      const message = screen.getByTestId('support-message').textContent
      expect(message).toContain('support')
    })

    it('should show "Let\'s Talk" heading for regression', () => {
      render(
        <DevelopmentalFramingIndicator context="regression" childName="Emma" viewerType="child" />
      )

      expect(screen.getByTestId('framing-heading')).toHaveTextContent("Let's Talk")
    })
  })

  describe('Rights Context', () => {
    it('should show rights message', () => {
      render(<DevelopmentalFramingIndicator context="rights" childName="Emma" viewerType="child" />)

      expect(screen.getByTestId('framing-heading')).toHaveTextContent('Your Rights')
    })

    it('should emphasize privacy as a right', () => {
      render(<DevelopmentalFramingIndicator context="rights" childName="Emma" viewerType="child" />)

      const message = screen.getByTestId('framing-message').textContent
      expect(message).toContain('right')
    })
  })

  describe('Info Context', () => {
    it('should show info about monitoring', () => {
      render(<DevelopmentalFramingIndicator context="info" childName="Emma" viewerType="child" />)

      expect(screen.getByTestId('framing-heading')).toHaveTextContent('About Monitoring')
    })

    it('should emphasize temporary nature', () => {
      render(<DevelopmentalFramingIndicator context="info" childName="Emma" viewerType="child" />)

      const message = screen.getByTestId('framing-message').textContent
      expect(message).toContain('not permanent')
    })
  })

  describe('Parent View', () => {
    it('should show parent context', () => {
      render(
        <DevelopmentalFramingIndicator
          context="milestone"
          milestone="growing"
          childName="Emma"
          viewerType="parent"
        />
      )

      expect(screen.getByTestId('parent-context')).toBeInTheDocument()
    })

    it('should explain developmental approach', () => {
      render(
        <DevelopmentalFramingIndicator
          context="milestone"
          milestone="growing"
          childName="Emma"
          viewerType="parent"
        />
      )

      const note = screen.getByTestId('developmental-approach-note').textContent
      expect(note).toContain('developmental framing')
      expect(note).toContain('recognizing growth')
    })

    it('should not show parent context for regression', () => {
      render(
        <DevelopmentalFramingIndicator context="regression" childName="Emma" viewerType="parent" />
      )

      expect(screen.queryByTestId('parent-context')).not.toBeInTheDocument()
    })
  })

  describe('Milestone Badge', () => {
    it('should show milestone badge for milestone context', () => {
      render(
        <DevelopmentalFramingIndicator
          context="milestone"
          milestone="growing"
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('milestone-badge')).toBeInTheDocument()
    })

    it('should display milestone type', () => {
      render(
        <DevelopmentalFramingIndicator
          context="milestone"
          milestone="maturing"
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('milestone-type')).toHaveTextContent('maturing')
    })

    it('should not show badge for non-milestone context', () => {
      render(
        <DevelopmentalFramingIndicator
          context="reduction"
          reductionType="screenshotFrequency"
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.queryByTestId('milestone-badge')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have aria-label', () => {
      render(
        <DevelopmentalFramingIndicator
          context="milestone"
          milestone="growing"
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('developmental-framing-indicator')).toHaveAttribute('aria-label')
    })

    it('should include child name in aria-label', () => {
      render(
        <DevelopmentalFramingIndicator
          context="milestone"
          milestone="growing"
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('developmental-framing-indicator')).toHaveAttribute(
        'aria-label',
        'Developmental framing indicator for Emma'
      )
    })
  })
})
