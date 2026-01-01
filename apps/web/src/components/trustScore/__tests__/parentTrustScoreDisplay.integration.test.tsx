/**
 * Parent Trust Score Display Integration Tests - Story 36.4 Task 7
 *
 * Integration tests covering all acceptance criteria for Story 36.4:
 * AC1: Same score visible as child sees (transparency)
 * AC2: Historical chart: trust score over time
 * AC3: Milestone markers: "Reached 90 on Sept 15"
 * AC4: Factor details available on click
 * AC5: Guidance card with parenting tips
 */

import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ParentTrustScoreView } from '../ParentTrustScoreView'
import {
  type TrustScore,
  type TrustFactor,
  type TrustScoreHistoryEntry,
  TRUST_SCORE_DEFAULT,
} from '@fledgely/shared'

// ============================================================================
// Test Helpers
// ============================================================================

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
  id: 'ts-integration-test',
  childId: 'child-integration',
  currentScore: score,
  history,
  factors,
  lastUpdatedAt: new Date(),
  createdAt: new Date(),
})

// ============================================================================
// AC1: Same score visible as child sees (transparency)
// ============================================================================

describe('AC1: Score transparency', () => {
  it('should display exact score value parent can verify matches child view', () => {
    const trustScore = createTrustScore(85)

    render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

    // Parent sees the same numeric score
    expect(screen.getByTestId('parent-score-value')).toHaveTextContent('85')
  })

  it('should show default score of 70 for new users', () => {
    const trustScore = createTrustScore(TRUST_SCORE_DEFAULT)

    render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

    expect(screen.getByTestId('parent-score-value')).toHaveTextContent('70')
  })

  it('should display all factors visible to child', () => {
    const factors = [
      createFactor('time-limit-compliance', 'positive', 10, 'Following time limits'),
      createFactor('focus-mode-usage', 'positive', 5, 'Using focus mode'),
      createFactor('bypass-attempt', 'concerning', -15, 'Bypass attempt'),
    ]
    const trustScore = createTrustScore(70, factors)

    render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

    // All factors should be visible
    expect(screen.getByTestId('parent-factor-0')).toBeInTheDocument()
    expect(screen.getByTestId('parent-factor-1')).toBeInTheDocument()
    expect(screen.getByTestId('parent-factor-2')).toBeInTheDocument()
  })

  it('should show monthly trend matching calculation', () => {
    const history = [
      createHistoryEntry(daysAgo(25), 65, 60),
      createHistoryEntry(daysAgo(10), 75, 65),
    ]
    const trustScore = createTrustScore(80, [], history)

    render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

    // Trend should show positive change (80 - 60 = 20 points)
    expect(screen.getByTestId('parent-trend')).toHaveTextContent(/Up \d+ points/)
  })
})

// ============================================================================
// AC2: Historical chart with trust score over time
// ============================================================================

describe('AC2: Historical chart', () => {
  it('should display chart with history data', () => {
    const history = [
      createHistoryEntry(daysAgo(21), 72, 70),
      createHistoryEntry(daysAgo(14), 75, 72),
      createHistoryEntry(daysAgo(7), 80, 75),
    ]
    const trustScore = createTrustScore(80, [], history)

    render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

    expect(screen.getByTestId('trust-score-history-chart')).toBeInTheDocument()
    expect(screen.getByTestId('chart-data-points')).toBeInTheDocument()
  })

  it('should include current score as latest data point', () => {
    const history = [createHistoryEntry(daysAgo(7), 75, 70)]
    const trustScore = createTrustScore(85, [], history)

    render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

    expect(screen.getByTestId('current-score-point')).toBeInTheDocument()
  })

  it('should support time range filtering', () => {
    const history = [createHistoryEntry(daysAgo(7), 75, 70)]
    const trustScore = createTrustScore(80, [], history)

    render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

    // Range selector should be available
    expect(screen.getByTestId('range-week')).toBeInTheDocument()
    expect(screen.getByTestId('range-month')).toBeInTheDocument()
    expect(screen.getByTestId('range-all')).toBeInTheDocument()
  })

  it('should allow changing time range', () => {
    const history = [createHistoryEntry(daysAgo(7), 75, 70)]
    const trustScore = createTrustScore(80, [], history)

    render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

    // Click week selector
    fireEvent.click(screen.getByTestId('range-week'))

    expect(screen.getByTestId('range-week')).toHaveAttribute('data-selected', 'true')
  })
})

// ============================================================================
// AC3: Milestone markers with dates
// ============================================================================

describe('AC3: Milestone markers', () => {
  it('should show milestone timeline section', () => {
    const trustScore = createTrustScore(80)

    render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

    expect(screen.getByTestId('milestone-timeline')).toBeInTheDocument()
  })

  it('should display milestone when score reaches 90', () => {
    const history = [
      createHistoryEntry(daysAgo(14), 85, 80),
      createHistoryEntry(daysAgo(7), 92, 85), // Crossed 90
    ]
    const trustScore = createTrustScore(92, [], history)

    render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

    expect(screen.getByTestId('timeline-milestone-90')).toBeInTheDocument()
  })

  it('should format milestone with "Reached X on date" format', () => {
    const history = [createHistoryEntry(daysAgo(7), 92, 85)]
    const trustScore = createTrustScore(92, [], history)

    render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

    const milestone = screen.getByTestId('timeline-milestone-90')
    expect(milestone).toHaveTextContent('Reached 90')
    expect(milestone).toHaveTextContent(/on/)
  })

  it('should show multiple milestones in chronological order', () => {
    const history = [
      createHistoryEntry(daysAgo(21), 72, 68), // Crossed 70
      createHistoryEntry(daysAgo(14), 82, 72), // Crossed 80
      createHistoryEntry(daysAgo(7), 92, 82), // Crossed 90
    ]
    const trustScore = createTrustScore(92, [], history)

    render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

    expect(screen.getByTestId('timeline-milestone-70')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-milestone-80')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-milestone-90')).toBeInTheDocument()
  })
})

// ============================================================================
// AC4: Factor details on click
// ============================================================================

describe('AC4: Factor details on click', () => {
  it('should indicate factors are clickable', () => {
    const factors = [createFactor('time-limit-compliance', 'positive', 10, 'Following time limits')]
    const trustScore = createTrustScore(80, factors)

    render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

    const factor = screen.getByTestId('parent-factor-0')
    expect(factor).toHaveAttribute('role', 'button')
  })

  it('should open detail modal when factor clicked', () => {
    const factors = [createFactor('time-limit-compliance', 'positive', 10, 'Following time limits')]
    const trustScore = createTrustScore(80, factors)

    render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

    fireEvent.click(screen.getByTestId('parent-factor-0'))

    expect(screen.getByTestId('factor-detail-modal')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('should show factor description in modal', () => {
    const factors = [createFactor('time-limit-compliance', 'positive', 10, 'Following time limits')]
    const trustScore = createTrustScore(80, factors)

    render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

    fireEvent.click(screen.getByTestId('parent-factor-0'))

    expect(screen.getByTestId('factor-description')).toHaveTextContent('Following time limits')
  })

  it('should show factor value in modal', () => {
    const factors = [createFactor('time-limit-compliance', 'positive', 10, 'Following time limits')]
    const trustScore = createTrustScore(80, factors)

    render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

    fireEvent.click(screen.getByTestId('parent-factor-0'))

    expect(screen.getByTestId('factor-value')).toHaveTextContent('+10')
  })

  it('should close modal when backdrop clicked', () => {
    const factors = [createFactor('time-limit-compliance', 'positive', 10, 'Following time limits')]
    const trustScore = createTrustScore(80, factors)

    render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

    fireEvent.click(screen.getByTestId('parent-factor-0'))
    expect(screen.getByTestId('factor-detail-modal')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('modal-backdrop'))
    expect(screen.queryByTestId('factor-detail-modal')).not.toBeInTheDocument()
  })

  it('should support keyboard activation of factors', () => {
    const factors = [createFactor('time-limit-compliance', 'positive', 10, 'Following time limits')]
    const trustScore = createTrustScore(80, factors)

    render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

    const factor = screen.getByTestId('parent-factor-0')
    expect(factor).toHaveAttribute('tabIndex', '0')

    fireEvent.keyDown(factor, { key: 'Enter' })
    expect(screen.getByTestId('factor-detail-modal')).toBeInTheDocument()
  })
})

// ============================================================================
// AC5: Guidance card with parenting tips
// ============================================================================

describe('AC5: Guidance card', () => {
  it('should display guidance card', () => {
    const trustScore = createTrustScore(75)

    render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

    expect(screen.getByTestId('trust-guidance-card')).toBeInTheDocument()
  })

  it('should show parent tips', () => {
    const trustScore = createTrustScore(75)

    render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

    expect(screen.getByTestId('parent-tips')).toBeInTheDocument()
    expect(screen.getByTestId('parent-tip-0')).toBeInTheDocument()
  })

  it('should show conversation starters personalized with child name', () => {
    const trustScore = createTrustScore(75)

    render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

    const starters = screen.getByTestId('conversation-starters')
    expect(starters.textContent).toContain('Emma')
  })

  it('should adapt message based on score level', () => {
    // Test high score message
    const highTrustScore = createTrustScore(85)

    const { rerender } = render(
      <ParentTrustScoreView childId="child-123" childName="Emma" trustScore={highTrustScore} />
    )

    expect(screen.getByTestId('guidance-message')).toHaveTextContent(/great|excellent/i)

    // Test growing score message
    const growingTrustScore = createTrustScore(35)

    rerender(
      <ParentTrustScoreView childId="child-123" childName="Emma" trustScore={growingTrustScore} />
    )

    expect(screen.getByTestId('guidance-message')).toHaveTextContent(/together|support/i)
  })

  it('should provide contextual tips based on factors', () => {
    const factors = [
      createFactor('time-limit-compliance', 'concerning', -10, 'Screen time exceeded'),
    ]
    const trustScore = createTrustScore(60, factors)

    render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

    const tips = screen.getByTestId('parent-tips')
    // Should have tips related to screen time
    expect(tips).toHaveTextContent(/time|screen|limit/i)
  })
})

// ============================================================================
// End-to-end user flow
// ============================================================================

describe('End-to-end parent flow', () => {
  it('should support complete parent interaction flow', () => {
    const factors = [
      createFactor('time-limit-compliance', 'positive', 10, 'Following time limits'),
      createFactor('focus-mode-usage', 'positive', 5, 'Using focus mode'),
    ]
    const history = [
      createHistoryEntry(daysAgo(21), 72, 68),
      createHistoryEntry(daysAgo(14), 82, 72),
      createHistoryEntry(daysAgo(7), 92, 82),
    ]
    const trustScore = createTrustScore(92, factors, history)

    render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

    // 1. Parent sees child's name and score
    expect(screen.getByTestId('view-title')).toHaveTextContent("Emma's Trust Score")
    expect(screen.getByTestId('parent-score-value')).toHaveTextContent('92')

    // 2. Parent views history chart
    expect(screen.getByTestId('chart-data-points')).toBeInTheDocument()

    // 3. Parent changes time range
    fireEvent.click(screen.getByTestId('range-all'))
    expect(screen.getByTestId('range-all')).toHaveAttribute('data-selected', 'true')

    // 4. Parent sees milestones
    expect(screen.getByTestId('timeline-milestone-90')).toBeInTheDocument()

    // 5. Parent clicks on a factor to see details
    fireEvent.click(screen.getByTestId('parent-factor-0'))
    expect(screen.getByTestId('factor-detail-modal')).toBeInTheDocument()
    expect(screen.getByTestId('factor-description')).toHaveTextContent('Following time limits')

    // 6. Parent closes modal
    fireEvent.click(screen.getByTestId('modal-close-button'))
    expect(screen.queryByTestId('factor-detail-modal')).not.toBeInTheDocument()

    // 7. Parent reads guidance
    expect(screen.getByTestId('trust-guidance-card')).toBeInTheDocument()
  })

  it('should be fully accessible', () => {
    const trustScore = createTrustScore(75)

    render(<ParentTrustScoreView childId="child-123" childName="Emma" trustScore={trustScore} />)

    // Main landmark
    expect(screen.getByRole('main')).toBeInTheDocument()

    // Section headings
    expect(screen.getByText('History')).toBeInTheDocument()
    expect(screen.getByText('Milestones')).toBeInTheDocument()

    // ARIA labels on key components
    expect(screen.getByTestId('trust-score-history-chart')).toHaveAttribute('aria-label')
    expect(screen.getByTestId('milestone-timeline')).toHaveAttribute('aria-label')
    expect(screen.getByTestId('trust-guidance-card')).toHaveAttribute('aria-label')
  })
})
