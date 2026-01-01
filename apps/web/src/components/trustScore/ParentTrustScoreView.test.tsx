/**
 * ParentTrustScoreView Component Tests - Story 36.4 Task 6
 *
 * Tests for the main parent view integrating all parent-facing components.
 */

import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ParentTrustScoreView } from './ParentTrustScoreView'
import { type TrustScore, type TrustFactor, type TrustScoreHistoryEntry } from '@fledgely/shared'

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

const createFactor = (
  type: TrustFactor['type'],
  category: TrustFactor['category'],
  value: number,
  description: string
): TrustFactor => ({
  type,
  category,
  value,
  description,
  occurredAt: new Date(),
})

const createTrustScore = (
  score: number,
  factors: TrustFactor[] = [],
  history: TrustScoreHistoryEntry[] = []
): TrustScore => ({
  id: 'ts-123',
  childId: 'child-123',
  currentScore: score,
  history,
  factors,
  lastUpdatedAt: new Date(),
  createdAt: new Date(),
})

describe('ParentTrustScoreView - Story 36.4 Task 6', () => {
  describe('Rendering', () => {
    it('should render the parent view container', () => {
      const trustScore = createTrustScore(75)

      render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

      expect(screen.getByTestId('parent-trust-score-view')).toBeInTheDocument()
    })

    it('should display page title with child name', () => {
      const trustScore = createTrustScore(75)

      render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

      expect(screen.getByTestId('view-title')).toHaveTextContent("Emma's Trust Score")
    })
  })

  describe('Component integration', () => {
    it('should include ParentTrustScoreCard', () => {
      const trustScore = createTrustScore(75)

      render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

      expect(screen.getByTestId('parent-trust-score-card')).toBeInTheDocument()
    })

    it('should include TrustScoreHistoryChart', () => {
      const history = [createHistoryEntry(daysAgo(7), 75, 70)]
      const trustScore = createTrustScore(75, [], history)

      render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

      expect(screen.getByTestId('trust-score-history-chart')).toBeInTheDocument()
    })

    it('should include MilestoneTimeline', () => {
      const trustScore = createTrustScore(75)

      render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

      expect(screen.getByTestId('milestone-timeline')).toBeInTheDocument()
    })

    it('should include TrustGuidanceCard', () => {
      const trustScore = createTrustScore(75)

      render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

      expect(screen.getByTestId('trust-guidance-card')).toBeInTheDocument()
    })
  })

  describe('Factor detail modal', () => {
    it('should open modal when factor is clicked', () => {
      const factors = [
        createFactor('time-limit-compliance', 'positive', 10, 'Following time limits'),
      ]
      const trustScore = createTrustScore(75, factors)

      render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

      fireEvent.click(screen.getByTestId('parent-factor-0'))

      expect(screen.getByTestId('factor-detail-modal')).toBeInTheDocument()
    })

    it('should close modal when close button clicked', () => {
      const factors = [
        createFactor('time-limit-compliance', 'positive', 10, 'Following time limits'),
      ]
      const trustScore = createTrustScore(75, factors)

      render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

      // Open modal
      fireEvent.click(screen.getByTestId('parent-factor-0'))
      expect(screen.getByTestId('factor-detail-modal')).toBeInTheDocument()

      // Close modal
      fireEvent.click(screen.getByTestId('modal-close-button'))
      expect(screen.queryByTestId('factor-detail-modal')).not.toBeInTheDocument()
    })
  })

  describe('Section organization', () => {
    it('should have score section', () => {
      const trustScore = createTrustScore(75)

      render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

      expect(screen.getByTestId('score-section')).toBeInTheDocument()
    })

    it('should have history section', () => {
      const trustScore = createTrustScore(75)

      render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

      expect(screen.getByTestId('history-section')).toBeInTheDocument()
    })

    it('should have milestones section', () => {
      const trustScore = createTrustScore(75)

      render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

      expect(screen.getByTestId('milestones-section')).toBeInTheDocument()
    })

    it('should have guidance section', () => {
      const trustScore = createTrustScore(75)

      render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

      expect(screen.getByTestId('guidance-section')).toBeInTheDocument()
    })
  })

  describe('Monthly trend calculation', () => {
    it('should calculate and display positive trend', () => {
      const history = [
        createHistoryEntry(daysAgo(25), 65, 60),
        createHistoryEntry(daysAgo(7), 75, 65),
      ]
      const trustScore = createTrustScore(75, [], history)

      render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

      expect(screen.getByTestId('parent-trend')).toHaveTextContent(/Up \d+ points this month/)
    })
  })

  describe('Accessibility', () => {
    it('should have main landmark', () => {
      const trustScore = createTrustScore(75)

      render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

      expect(screen.getByRole('main')).toBeInTheDocument()
    })

    it('should have section headings', () => {
      const trustScore = createTrustScore(75)

      render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

      expect(screen.getByText('History')).toBeInTheDocument()
      expect(screen.getByText('Milestones')).toBeInTheDocument()
    })
  })
})
