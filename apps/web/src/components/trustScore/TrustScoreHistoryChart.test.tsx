/**
 * TrustScoreHistoryChart Component Tests - Story 36.4 Task 2
 *
 * Tests for historical chart showing score over time.
 * AC2: Historical chart: trust score over time
 * AC3: Milestone markers: "Reached 90 on Sept 15"
 */

import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TrustScoreHistoryChart } from './TrustScoreHistoryChart'
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

describe('TrustScoreHistoryChart - Story 36.4 Task 2', () => {
  describe('AC2: Historical chart display', () => {
    it('should render the chart container', () => {
      const history: TrustScoreHistoryEntry[] = []

      render(<TrustScoreHistoryChart history={history} currentScore={70} />)

      expect(screen.getByTestId('trust-score-history-chart')).toBeInTheDocument()
    })

    it('should display chart with history entries', () => {
      const history: TrustScoreHistoryEntry[] = [
        createHistoryEntry(daysAgo(21), 72, 70),
        createHistoryEntry(daysAgo(14), 75, 72),
        createHistoryEntry(daysAgo(7), 80, 75),
      ]

      render(<TrustScoreHistoryChart history={history} currentScore={80} />)

      expect(screen.getByTestId('chart-data-points')).toBeInTheDocument()
    })

    it('should show empty state when no history', () => {
      render(<TrustScoreHistoryChart history={[]} currentScore={70} />)

      expect(screen.getByTestId('chart-empty')).toBeInTheDocument()
    })

    it('should include current score as latest point', () => {
      const history: TrustScoreHistoryEntry[] = [createHistoryEntry(daysAgo(7), 75, 70)]

      render(<TrustScoreHistoryChart history={history} currentScore={85} />)

      // Current score should be shown
      expect(screen.getByTestId('current-score-point')).toBeInTheDocument()
    })
  })

  describe('Time range selector', () => {
    it('should show time range options', () => {
      render(<TrustScoreHistoryChart history={[]} currentScore={70} />)

      expect(screen.getByTestId('range-selector')).toBeInTheDocument()
    })

    it('should have week option', () => {
      render(<TrustScoreHistoryChart history={[]} currentScore={70} />)

      expect(screen.getByTestId('range-week')).toBeInTheDocument()
    })

    it('should have month option', () => {
      render(<TrustScoreHistoryChart history={[]} currentScore={70} />)

      expect(screen.getByTestId('range-month')).toBeInTheDocument()
    })

    it('should have all option', () => {
      render(<TrustScoreHistoryChart history={[]} currentScore={70} />)

      expect(screen.getByTestId('range-all')).toBeInTheDocument()
    })

    it('should default to month view', () => {
      render(<TrustScoreHistoryChart history={[]} currentScore={70} />)

      expect(screen.getByTestId('range-month')).toHaveAttribute('data-selected', 'true')
    })

    it('should change selection when clicked', () => {
      render(<TrustScoreHistoryChart history={[]} currentScore={70} />)

      fireEvent.click(screen.getByTestId('range-week'))

      expect(screen.getByTestId('range-week')).toHaveAttribute('data-selected', 'true')
      expect(screen.getByTestId('range-month')).toHaveAttribute('data-selected', 'false')
    })
  })

  describe('AC3: Milestone markers', () => {
    it('should show milestone marker when score reaches 90', () => {
      const history: TrustScoreHistoryEntry[] = [
        createHistoryEntry(daysAgo(14), 85, 80),
        createHistoryEntry(daysAgo(7), 92, 85), // Crossed 90
      ]

      render(<TrustScoreHistoryChart history={history} currentScore={92} />)

      expect(screen.getByTestId('milestone-marker-90')).toBeInTheDocument()
    })

    it('should show milestone marker when score reaches 80', () => {
      const history: TrustScoreHistoryEntry[] = [
        createHistoryEntry(daysAgo(14), 75, 70),
        createHistoryEntry(daysAgo(7), 82, 75), // Crossed 80
      ]

      render(<TrustScoreHistoryChart history={history} currentScore={82} />)

      expect(screen.getByTestId('milestone-marker-80')).toBeInTheDocument()
    })

    it('should format milestone with date', () => {
      const history: TrustScoreHistoryEntry[] = [
        createHistoryEntry(daysAgo(7), 92, 85), // Crossed 90
      ]

      render(<TrustScoreHistoryChart history={history} currentScore={92} />)

      const milestone = screen.getByTestId('milestone-marker-90')
      expect(milestone).toHaveTextContent('Reached 90')
    })
  })

  describe('Hover tooltips', () => {
    it('should show tooltip on hover', () => {
      const history: TrustScoreHistoryEntry[] = [createHistoryEntry(daysAgo(7), 80, 75)]

      render(<TrustScoreHistoryChart history={history} currentScore={80} />)

      const dataPoint = screen.getByTestId('data-point-0')
      fireEvent.mouseEnter(dataPoint)

      expect(screen.getByTestId('chart-tooltip')).toBeInTheDocument()
    })

    it('should display score in tooltip', () => {
      const history: TrustScoreHistoryEntry[] = [createHistoryEntry(daysAgo(7), 80, 75)]

      render(<TrustScoreHistoryChart history={history} currentScore={80} />)

      const dataPoint = screen.getByTestId('data-point-0')
      fireEvent.mouseEnter(dataPoint)

      expect(screen.getByTestId('chart-tooltip')).toHaveTextContent('80')
    })
  })

  describe('Accessibility', () => {
    it('should have keyboard navigation', () => {
      const history: TrustScoreHistoryEntry[] = [createHistoryEntry(daysAgo(7), 80, 75)]

      render(<TrustScoreHistoryChart history={history} currentScore={80} />)

      const dataPoint = screen.getByTestId('data-point-0')
      expect(dataPoint).toHaveAttribute('tabIndex', '0')
    })

    it('should have aria label on chart', () => {
      render(<TrustScoreHistoryChart history={[]} currentScore={70} />)

      const chart = screen.getByTestId('trust-score-history-chart')
      expect(chart).toHaveAttribute('aria-label')
    })
  })
})
