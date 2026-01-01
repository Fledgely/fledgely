/**
 * Graduation Components Integration Tests - Story 38.1 Task 6
 *
 * Integration tests verifying the graduation components work together.
 * Tests the full graduation tracking workflow.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GraduationProgressIndicator } from './GraduationProgressIndicator'
import { GraduationPathExplainer } from './GraduationPathExplainer'
import {
  GraduationEligibilityStatus,
  checkGraduationEligibility,
  TrustScoreHistoryEntry,
  getChildProgressMessage,
  getParentProgressMessage,
  getMotivationalMessage,
  formatProgressDisplay,
} from '@fledgely/shared'

describe('Graduation Integration Tests - Story 38.1 Task 6', () => {
  // Helper to create trust history
  function createHistory(childId: string, monthScores: number[]): TrustScoreHistoryEntry[] {
    const baseDate = new Date('2025-01-01')
    return monthScores.map((score, index) => {
      const date = new Date(baseDate)
      date.setMonth(date.getMonth() + index)
      return { childId, score, date }
    })
  }

  describe('Service to Component Integration', () => {
    it('should pass eligibility status from service to component', () => {
      const history = createHistory('child-123', [100, 100, 100, 100, 100, 100])
      const status = checkGraduationEligibility('child-123', history)

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
        />
      )

      // Component should display service data
      expect(screen.getByTestId('months-display')).toHaveTextContent('6/12 months')
      expect(screen.getByTestId('remaining-display')).toHaveTextContent('6 months to go')
    })

    it('should show eligible state when service returns eligible', () => {
      const history = createHistory('child-123', Array(12).fill(100))
      const status = checkGraduationEligibility('child-123', history)

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('eligible-badge')).toBeInTheDocument()
      expect(screen.getByTestId('remaining-display')).toHaveTextContent('Eligible!')
    })

    it('should show 0 months when streak broken', () => {
      // Most recent month is below threshold
      const history = createHistory('child-123', [100, 100, 100, 100, 100, 95])
      const status = checkGraduationEligibility('child-123', history)

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('months-display')).toHaveTextContent('0/12 months')
    })
  })

  describe('Message Service to Component Integration', () => {
    it('should display correct progress message from service', () => {
      const status: GraduationEligibilityStatus = {
        childId: 'child-123',
        currentTrustScore: 100,
        monthsAtPerfectTrust: 6,
        eligibilityDate: null,
        isEligible: false,
        progressPercentage: 50,
        streakStartDate: new Date(),
        lastCheckedAt: new Date(),
      }

      const expectedMessage = getChildProgressMessage(status)

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('progress-message')).toHaveTextContent(expectedMessage)
    })

    it('should display parent message when parent viewerType', () => {
      const status: GraduationEligibilityStatus = {
        childId: 'child-123',
        currentTrustScore: 100,
        monthsAtPerfectTrust: 6,
        eligibilityDate: null,
        isEligible: false,
        progressPercentage: 50,
        streakStartDate: new Date(),
        lastCheckedAt: new Date(),
      }

      const expectedMessage = getParentProgressMessage(status, 'Emma')

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="parent"
        />
      )

      expect(screen.getByTestId('progress-message')).toHaveTextContent(expectedMessage)
    })

    it('should display motivational message from service', () => {
      const status: GraduationEligibilityStatus = {
        childId: 'child-123',
        currentTrustScore: 100,
        monthsAtPerfectTrust: 6,
        eligibilityDate: null,
        isEligible: false,
        progressPercentage: 50,
        streakStartDate: new Date(),
        lastCheckedAt: new Date(),
      }

      const expectedMessage = getMotivationalMessage(status, 'child')

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('motivational-message')).toHaveTextContent(expectedMessage)
    })
  })

  describe('Progress Display Integration', () => {
    it('should format display correctly from service', () => {
      const status: GraduationEligibilityStatus = {
        childId: 'child-123',
        currentTrustScore: 100,
        monthsAtPerfectTrust: 9,
        eligibilityDate: null,
        isEligible: false,
        progressPercentage: 75,
        streakStartDate: new Date(),
        lastCheckedAt: new Date(),
      }

      const display = formatProgressDisplay(status)

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('months-display')).toHaveTextContent(display.months)
      expect(screen.getByTestId('remaining-display')).toHaveTextContent(display.remaining)
    })
  })

  describe('Component Interaction', () => {
    it('should link indicator to explainer via callback', () => {
      const status: GraduationEligibilityStatus = {
        childId: 'child-123',
        currentTrustScore: 100,
        monthsAtPerfectTrust: 6,
        eligibilityDate: null,
        isEligible: false,
        progressPercentage: 50,
        streakStartDate: new Date(),
        lastCheckedAt: new Date(),
      }

      const showExplainer = vi.fn()

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
          onLearnMore={showExplainer}
        />
      )

      fireEvent.click(screen.getByTestId('learn-more-button'))
      expect(showExplainer).toHaveBeenCalled()
    })
  })

  describe('Full Workflow Scenarios', () => {
    describe('New Child - Just Started', () => {
      it('should show starting state correctly', () => {
        const history = createHistory('child-123', [100])
        const status = checkGraduationEligibility('child-123', history)

        render(
          <GraduationProgressIndicator
            eligibilityStatus={status}
            childName="Emma"
            viewerType="child"
          />
        )

        expect(screen.getByTestId('months-display')).toHaveTextContent('1/12 months')
        expect(screen.queryByTestId('eligible-badge')).not.toBeInTheDocument()
      })
    })

    describe('Halfway Progress', () => {
      it('should show halfway state for child', () => {
        const history = createHistory('child-123', Array(6).fill(100))
        const status = checkGraduationEligibility('child-123', history)

        render(
          <GraduationProgressIndicator
            eligibilityStatus={status}
            childName="Emma"
            viewerType="child"
          />
        )

        expect(screen.getByTestId('months-display')).toHaveTextContent('6/12 months')
        expect(screen.getByTestId('remaining-display')).toHaveTextContent('6 months to go')

        // Milestones 3 and 6 should be checked
        expect(screen.getByTestId('milestone-check-3')).toBeInTheDocument()
        expect(screen.getByTestId('milestone-check-6')).toBeInTheDocument()
        expect(screen.queryByTestId('milestone-check-9')).not.toBeInTheDocument()
      })

      it('should show same progress for parent', () => {
        const history = createHistory('child-123', Array(6).fill(100))
        const status = checkGraduationEligibility('child-123', history)

        render(
          <GraduationProgressIndicator
            eligibilityStatus={status}
            childName="Emma"
            viewerType="parent"
          />
        )

        expect(screen.getByTestId('months-display')).toHaveTextContent('6/12 months')
        expect(screen.getByText("Emma's Graduation Path")).toBeInTheDocument()
      })
    })

    describe('Near Graduation', () => {
      it('should show near graduation state', () => {
        const history = createHistory('child-123', Array(10).fill(100))
        const status = checkGraduationEligibility('child-123', history)

        render(
          <GraduationProgressIndicator
            eligibilityStatus={status}
            childName="Emma"
            viewerType="child"
          />
        )

        expect(screen.getByTestId('months-display')).toHaveTextContent('10/12 months')
        expect(screen.getByTestId('remaining-display')).toHaveTextContent('2 months to go')

        // Progress bar should be ~83%
        const progressBar = screen.getByTestId('progress-bar')
        // Could be 83.3% or 83.33333333333334% depending on rounding
        expect(progressBar.style.width).toMatch(/^83\.3/)
      })
    })

    describe('Graduation Eligible', () => {
      it('should show eligible state with all milestones', () => {
        const history = createHistory('child-123', Array(12).fill(100))
        const status = checkGraduationEligibility('child-123', history)

        render(
          <GraduationProgressIndicator
            eligibilityStatus={status}
            childName="Emma"
            viewerType="child"
          />
        )

        expect(screen.getByTestId('eligible-badge')).toBeInTheDocument()
        expect(screen.getByTestId('months-display')).toHaveTextContent('12/12 months')
        expect(screen.getByTestId('remaining-display')).toHaveTextContent('Eligible!')

        // All milestones checked
        expect(screen.getByTestId('milestone-check-3')).toBeInTheDocument()
        expect(screen.getByTestId('milestone-check-6')).toBeInTheDocument()
        expect(screen.getByTestId('milestone-check-9')).toBeInTheDocument()
        expect(screen.getByTestId('milestone-check-12')).toBeInTheDocument()
      })
    })

    describe('Streak Break Recovery', () => {
      it('should reset to 0 after streak break', () => {
        // Had 5 months, then broke streak
        const history = createHistory('child-123', [100, 100, 100, 100, 100, 95])
        const status = checkGraduationEligibility('child-123', history)

        render(
          <GraduationProgressIndicator
            eligibilityStatus={status}
            childName="Emma"
            viewerType="child"
          />
        )

        expect(screen.getByTestId('months-display')).toHaveTextContent('0/12 months')
        expect(screen.getByTestId('remaining-display')).toHaveTextContent('12 months to go')

        // No milestones checked
        expect(screen.queryByTestId('milestone-check-3')).not.toBeInTheDocument()
        expect(screen.queryByTestId('milestone-check-6')).not.toBeInTheDocument()
      })
    })
  })

  describe('Explainer Component Integration', () => {
    it('should explain graduation path for child', () => {
      render(<GraduationPathExplainer viewerType="child" />)

      // All key sections present
      expect(screen.getByTestId('path-overview-section')).toBeInTheDocument()
      expect(screen.getByTestId('requirements-section')).toBeInTheDocument()
      expect(screen.getByTestId('milestones-section')).toBeInTheDocument()
      expect(screen.getByTestId('eligibility-section')).toBeInTheDocument()

      // Key message about not automatic
      const note = screen.getByTestId('important-note')
      expect(note.textContent?.toLowerCase()).toContain(
        "doesn't mean monitoring ends automatically"
      )
    })

    it('should explain graduation path for parent', () => {
      render(<GraduationPathExplainer viewerType="parent" childName="Emma" />)

      // Shows child name
      expect(screen.getByText("Understanding Emma's Graduation Path")).toBeInTheDocument()

      // Parent-appropriate control messaging
      const note = screen.getByTestId('important-note')
      expect(note.textContent?.toLowerCase()).toContain('control')
    })
  })

  describe('AC Verification Integration', () => {
    describe('AC1: FR38A - 100% trust for 12 consecutive months', () => {
      it('should only become eligible at exactly 12 months of 100%', () => {
        const elevenMonths = createHistory('child-123', Array(11).fill(100))
        const twelveMonths = createHistory('child-123', Array(12).fill(100))

        const status11 = checkGraduationEligibility('child-123', elevenMonths)
        const status12 = checkGraduationEligibility('child-123', twelveMonths)

        expect(status11.isEligible).toBe(false)
        expect(status12.isEligible).toBe(true)

        // Render 11 months
        const { rerender } = render(
          <GraduationProgressIndicator
            eligibilityStatus={status11}
            childName="Emma"
            viewerType="child"
          />
        )

        expect(screen.queryByTestId('eligible-badge')).not.toBeInTheDocument()

        // Render 12 months
        rerender(
          <GraduationProgressIndicator
            eligibilityStatus={status12}
            childName="Emma"
            viewerType="child"
          />
        )

        expect(screen.getByTestId('eligible-badge')).toBeInTheDocument()
      })
    })

    describe('AC2/AC4: Progress visible to both child and parent', () => {
      it('should show same numerical progress for both', () => {
        const history = createHistory('child-123', Array(9).fill(100))
        const status = checkGraduationEligibility('child-123', history)

        // Child view
        const { rerender } = render(
          <GraduationProgressIndicator
            eligibilityStatus={status}
            childName="Emma"
            viewerType="child"
          />
        )

        expect(screen.getByTestId('months-display')).toHaveTextContent('9/12 months')
        expect(screen.getByTestId('remaining-display')).toHaveTextContent('3 months to go')

        // Parent view
        rerender(
          <GraduationProgressIndicator
            eligibilityStatus={status}
            childName="Emma"
            viewerType="parent"
          />
        )

        expect(screen.getByTestId('months-display')).toHaveTextContent('9/12 months')
        expect(screen.getByTestId('remaining-display')).toHaveTextContent('3 months to go')
      })
    })

    describe('AC3: Clear path to end', () => {
      it('should show all milestones as path markers', () => {
        const history = createHistory('child-123', [100])
        const status = checkGraduationEligibility('child-123', history)

        render(
          <GraduationProgressIndicator
            eligibilityStatus={status}
            childName="Emma"
            viewerType="child"
          />
        )

        // All milestones visible even at start
        expect(screen.getByTestId('milestone-marker-3')).toBeInTheDocument()
        expect(screen.getByTestId('milestone-marker-6')).toBeInTheDocument()
        expect(screen.getByTestId('milestone-marker-9')).toBeInTheDocument()
        expect(screen.getByTestId('milestone-marker-12')).toBeInTheDocument()
      })
    })

    describe('AC5: Eligibility triggers conversation', () => {
      it('should show eligible state prompts conversation', () => {
        const history = createHistory('child-123', Array(12).fill(100))
        const status = checkGraduationEligibility('child-123', history)

        render(
          <GraduationProgressIndicator
            eligibilityStatus={status}
            childName="Emma"
            viewerType="child"
          />
        )

        // Shows eligible badge
        expect(screen.getByTestId('eligible-badge')).toBeInTheDocument()

        // Progress message should mention conversation
        const progressMessage = screen.getByTestId('progress-message')
        expect(progressMessage.textContent?.toLowerCase()).toContain('congratulations')
      })
    })

    describe('AC6: Motivates sustained behavior', () => {
      it('should show encouraging motivational messages', () => {
        const history = createHistory('child-123', Array(3).fill(100))
        const status = checkGraduationEligibility('child-123', history)

        render(
          <GraduationProgressIndicator
            eligibilityStatus={status}
            childName="Emma"
            viewerType="child"
          />
        )

        const motivational = screen.getByTestId('motivational-message')
        // Should be encouraging, not demanding
        expect(motivational.textContent?.toLowerCase()).not.toContain('must')
        expect(motivational.textContent?.toLowerCase()).not.toContain('required')
      })
    })
  })
})
