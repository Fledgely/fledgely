/**
 * Graduation Progress Indicator Tests - Story 38.1 Task 4
 *
 * Tests for the visual progress indicator component.
 * AC2: Progress visible to child
 * AC3: Child sees clear path to end
 * AC4: Parent sees same progress
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GraduationProgressIndicator } from './GraduationProgressIndicator'
import { GraduationEligibilityStatus } from '@fledgely/shared'

describe('GraduationProgressIndicator - Story 38.1 Task 4', () => {
  // Helper to create status
  function createStatus(
    monthsAtPerfectTrust: number,
    currentTrustScore: number = 100,
    isEligible: boolean = false
  ): GraduationEligibilityStatus {
    return {
      childId: 'child-123',
      currentTrustScore,
      monthsAtPerfectTrust,
      eligibilityDate: null,
      isEligible,
      progressPercentage: Math.min(100, (monthsAtPerfectTrust / 12) * 100),
      streakStartDate: new Date(),
      lastCheckedAt: new Date(),
    }
  }

  describe('Rendering', () => {
    it('should render the component', () => {
      const status = createStatus(6)

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('graduation-progress-indicator')).toBeInTheDocument()
    })

    it('should render header', () => {
      const status = createStatus(6)

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('graduation-header')).toBeInTheDocument()
    })

    it('should render progress bar', () => {
      const status = createStatus(6)

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('progress-bar')).toBeInTheDocument()
    })

    it('should render milestone markers', () => {
      const status = createStatus(6)

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('milestone-markers')).toBeInTheDocument()
    })
  })

  describe('Child View (AC2)', () => {
    it('should show child-appropriate header', () => {
      const status = createStatus(6)

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByText('Your Path to Graduation')).toBeInTheDocument()
    })

    it('should display progress message', () => {
      const status = createStatus(6)

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('progress-message')).toBeInTheDocument()
    })

    it('should display motivational message', () => {
      const status = createStatus(6)

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('motivational-message')).toBeInTheDocument()
    })
  })

  describe('Parent View (AC4)', () => {
    it('should show parent-appropriate header with child name', () => {
      const status = createStatus(6)

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="parent"
        />
      )

      expect(screen.getByText("Emma's Graduation Path")).toBeInTheDocument()
    })

    it('should display same progress percentage as child view', () => {
      const status = createStatus(6) // 50%

      const { rerender } = render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
        />
      )

      const childProgressBar = screen.getByTestId('progress-bar')
      const childWidth = childProgressBar.style.width

      rerender(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="parent"
        />
      )

      const parentProgressBar = screen.getByTestId('progress-bar')
      expect(parentProgressBar.style.width).toBe(childWidth)
    })
  })

  describe('Progress Bar', () => {
    it('should set correct width for 0 months', () => {
      const status = createStatus(0)

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
        />
      )

      const progressBar = screen.getByTestId('progress-bar')
      expect(progressBar.style.width).toBe('0%')
    })

    it('should set correct width for 6 months (50%)', () => {
      const status = createStatus(6)

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
        />
      )

      const progressBar = screen.getByTestId('progress-bar')
      expect(progressBar.style.width).toBe('50%')
    })

    it('should set correct width for 12 months (100%)', () => {
      const status = createStatus(12, 100, true)

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
        />
      )

      const progressBar = screen.getByTestId('progress-bar')
      expect(progressBar.style.width).toBe('100%')
    })

    it('should have progressbar role with aria attributes', () => {
      const status = createStatus(6)

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
        />
      )

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '50')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
    })
  })

  describe('Milestone Markers (AC3)', () => {
    it('should render all milestone markers', () => {
      const status = createStatus(6)

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('milestone-marker-3')).toBeInTheDocument()
      expect(screen.getByTestId('milestone-marker-6')).toBeInTheDocument()
      expect(screen.getByTestId('milestone-marker-9')).toBeInTheDocument()
      expect(screen.getByTestId('milestone-marker-12')).toBeInTheDocument()
    })

    it('should mark reached milestones with checkmark', () => {
      const status = createStatus(6)

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('milestone-check-3')).toBeInTheDocument()
      expect(screen.getByTestId('milestone-check-6')).toBeInTheDocument()
      expect(screen.queryByTestId('milestone-check-9')).not.toBeInTheDocument()
      expect(screen.queryByTestId('milestone-check-12')).not.toBeInTheDocument()
    })

    it('should show all checkmarks when eligible', () => {
      const status = createStatus(12, 100, true)

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('milestone-check-3')).toBeInTheDocument()
      expect(screen.getByTestId('milestone-check-6')).toBeInTheDocument()
      expect(screen.getByTestId('milestone-check-9')).toBeInTheDocument()
      expect(screen.getByTestId('milestone-check-12')).toBeInTheDocument()
    })
  })

  describe('Progress Text Display', () => {
    it('should display months completed', () => {
      const status = createStatus(6)

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('months-display')).toHaveTextContent('6/12 months')
    })

    it('should display remaining months', () => {
      const status = createStatus(6)

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('remaining-display')).toHaveTextContent('6 months to go')
    })

    it('should display "Eligible!" when at 12 months', () => {
      const status = createStatus(12, 100, true)

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('remaining-display')).toHaveTextContent('Eligible!')
    })
  })

  describe('Eligible State', () => {
    it('should show eligible badge when eligible', () => {
      const status = createStatus(12, 100, true)

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('eligible-badge')).toBeInTheDocument()
      expect(screen.getByTestId('eligible-badge')).toHaveTextContent('Eligible!')
    })

    it('should not show eligible badge when not eligible', () => {
      const status = createStatus(6)

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.queryByTestId('eligible-badge')).not.toBeInTheDocument()
    })
  })

  describe('Learn More Button', () => {
    it('should render learn more button when callback provided', () => {
      const status = createStatus(6)
      const onLearnMore = vi.fn()

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
          onLearnMore={onLearnMore}
        />
      )

      expect(screen.getByTestId('learn-more-button')).toBeInTheDocument()
    })

    it('should not render learn more button when no callback', () => {
      const status = createStatus(6)

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.queryByTestId('learn-more-button')).not.toBeInTheDocument()
    })

    it('should call onLearnMore when clicked', () => {
      const status = createStatus(6)
      const onLearnMore = vi.fn()

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
          onLearnMore={onLearnMore}
        />
      )

      fireEvent.click(screen.getByTestId('learn-more-button'))
      expect(onLearnMore).toHaveBeenCalledTimes(1)
    })
  })

  describe('AC Verification', () => {
    describe('AC2: Progress visible to child', () => {
      it('should show months and remaining in child-friendly format', () => {
        const status = createStatus(9)

        render(
          <GraduationProgressIndicator
            eligibilityStatus={status}
            childName="Emma"
            viewerType="child"
          />
        )

        expect(screen.getByTestId('months-display')).toHaveTextContent('9/12 months')
        expect(screen.getByTestId('remaining-display')).toHaveTextContent('3 months to go')
      })
    })

    describe('AC3: Child sees clear path to end', () => {
      it('should show all milestone markers as path', () => {
        const status = createStatus(3)

        render(
          <GraduationProgressIndicator
            eligibilityStatus={status}
            childName="Emma"
            viewerType="child"
          />
        )

        // All milestones visible showing the path
        expect(screen.getByTestId('milestone-marker-3')).toBeInTheDocument()
        expect(screen.getByTestId('milestone-marker-6')).toBeInTheDocument()
        expect(screen.getByTestId('milestone-marker-9')).toBeInTheDocument()
        expect(screen.getByTestId('milestone-marker-12')).toBeInTheDocument()
      })
    })

    describe('AC4: Parent sees same progress', () => {
      it('should show same progress percentage for parent', () => {
        const status = createStatus(9)

        render(
          <GraduationProgressIndicator
            eligibilityStatus={status}
            childName="Emma"
            viewerType="parent"
          />
        )

        // Same progress info
        expect(screen.getByTestId('months-display')).toHaveTextContent('9/12 months')
        expect(screen.getByTestId('remaining-display')).toHaveTextContent('3 months to go')
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle 0 months gracefully', () => {
      const status = createStatus(0)

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('months-display')).toHaveTextContent('0/12 months')
      expect(screen.getByTestId('remaining-display')).toHaveTextContent('12 months to go')
    })

    it('should handle score below perfect trust', () => {
      const status = createStatus(6, 95)

      render(
        <GraduationProgressIndicator
          eligibilityStatus={status}
          childName="Emma"
          viewerType="child"
        />
      )

      expect(screen.getByTestId('graduation-progress-indicator')).toBeInTheDocument()
    })
  })
})
