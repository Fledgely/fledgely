/**
 * MilestoneTimeline Component Tests - Story 36.4 Task 3
 *
 * Tests for milestone timeline with "Reached 90 on Sept 15" format.
 * AC3: Milestone markers: "Reached 90 on Sept 15"
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MilestoneTimeline } from './MilestoneTimeline'
import { type TrustScoreHistoryEntry } from '@fledgely/shared'

// Helper to create dates relative to now
const daysAgo = (days: number): Date => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

const createHistoryEntry = (
  date: Date,
  score: number,
  previousScore: number
): TrustScoreHistoryEntry => ({
  date,
  score,
  previousScore,
  reason: 'Daily update',
  factors: [],
})

describe('MilestoneTimeline - Story 36.4 Task 3', () => {
  describe('AC3: Milestone markers with dates', () => {
    it('should render the timeline container', () => {
      render(<MilestoneTimeline history={[]} />)

      expect(screen.getByTestId('milestone-timeline')).toBeInTheDocument()
    })

    it('should show empty state when no milestones', () => {
      const history: TrustScoreHistoryEntry[] = [
        createHistoryEntry(daysAgo(7), 75, 74), // No milestone crossed
      ]

      render(<MilestoneTimeline history={history} />)

      expect(screen.getByTestId('timeline-empty')).toBeInTheDocument()
    })

    it('should show milestone when reaching 90', () => {
      const history: TrustScoreHistoryEntry[] = [
        createHistoryEntry(daysAgo(7), 92, 85), // Crossed 90
      ]

      render(<MilestoneTimeline history={history} />)

      expect(screen.getByTestId('timeline-milestone-90')).toBeInTheDocument()
    })

    it('should format milestone with date', () => {
      const milestoneDate = daysAgo(7)
      const history: TrustScoreHistoryEntry[] = [createHistoryEntry(milestoneDate, 92, 85)]

      render(<MilestoneTimeline history={history} />)

      const milestone = screen.getByTestId('timeline-milestone-90')
      expect(milestone).toHaveTextContent('Reached 90')
      // Should contain date info
      expect(milestone).toHaveTextContent(/on/)
    })

    it('should show multiple milestones in order', () => {
      const history: TrustScoreHistoryEntry[] = [
        createHistoryEntry(daysAgo(21), 72, 68), // Crossed 70
        createHistoryEntry(daysAgo(14), 82, 72), // Crossed 80
        createHistoryEntry(daysAgo(7), 92, 82), // Crossed 90
      ]

      render(<MilestoneTimeline history={history} />)

      expect(screen.getByTestId('timeline-milestone-70')).toBeInTheDocument()
      expect(screen.getByTestId('timeline-milestone-80')).toBeInTheDocument()
      expect(screen.getByTestId('timeline-milestone-90')).toBeInTheDocument()
    })

    it('should show most recent milestone first', () => {
      const history: TrustScoreHistoryEntry[] = [
        createHistoryEntry(daysAgo(14), 72, 68), // Crossed 70
        createHistoryEntry(daysAgo(7), 82, 72), // Crossed 80
      ]

      render(<MilestoneTimeline history={history} />)

      const milestones = screen.getAllByTestId(/timeline-milestone-/)
      expect(milestones[0]).toHaveAttribute('data-testid', 'timeline-milestone-80')
    })
  })

  describe('Milestone thresholds', () => {
    it('should detect 50 threshold', () => {
      const history: TrustScoreHistoryEntry[] = [createHistoryEntry(daysAgo(7), 52, 48)]

      render(<MilestoneTimeline history={history} />)

      expect(screen.getByTestId('timeline-milestone-50')).toBeInTheDocument()
    })

    it('should detect 60 threshold', () => {
      const history: TrustScoreHistoryEntry[] = [createHistoryEntry(daysAgo(7), 62, 58)]

      render(<MilestoneTimeline history={history} />)

      expect(screen.getByTestId('timeline-milestone-60')).toBeInTheDocument()
    })

    it('should detect 70 threshold', () => {
      const history: TrustScoreHistoryEntry[] = [createHistoryEntry(daysAgo(7), 72, 68)]

      render(<MilestoneTimeline history={history} />)

      expect(screen.getByTestId('timeline-milestone-70')).toBeInTheDocument()
    })
  })

  describe('Date formatting', () => {
    it('should show date in readable format', () => {
      const milestoneDate = new Date('2025-09-15')
      const history: TrustScoreHistoryEntry[] = [createHistoryEntry(milestoneDate, 92, 85)]

      render(<MilestoneTimeline history={history} />)

      const milestone = screen.getByTestId('timeline-milestone-90')
      // Should contain "Sep" in the text
      expect(milestone.textContent).toMatch(/Sep/)
    })
  })

  describe('Visual indicators', () => {
    it('should have star icon for milestones', () => {
      const history: TrustScoreHistoryEntry[] = [createHistoryEntry(daysAgo(7), 92, 85)]

      render(<MilestoneTimeline history={history} />)

      expect(screen.getByTestId('milestone-icon-90')).toBeInTheDocument()
    })

    it('should have timeline connector', () => {
      const history: TrustScoreHistoryEntry[] = [
        createHistoryEntry(daysAgo(14), 82, 75),
        createHistoryEntry(daysAgo(7), 92, 82),
      ]

      render(<MilestoneTimeline history={history} />)

      expect(screen.getByTestId('timeline-connector')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have aria label', () => {
      render(<MilestoneTimeline history={[]} />)

      const timeline = screen.getByTestId('milestone-timeline')
      expect(timeline).toHaveAttribute('aria-label')
    })

    it('should have semantic list structure', () => {
      const history: TrustScoreHistoryEntry[] = [createHistoryEntry(daysAgo(7), 92, 85)]

      render(<MilestoneTimeline history={history} />)

      expect(screen.getByRole('list')).toBeInTheDocument()
    })
  })
})
