/**
 * TrustScoreTrend Component Tests - Story 36.3 Task 2
 *
 * Tests for component showing score trend over time.
 * AC2: Trend shown: "Up 5 points this month"
 * AC4: Language is encouraging, not punitive
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TrustScoreTrend } from './TrustScoreTrend'

describe('TrustScoreTrend - Story 36.3 Task 2', () => {
  describe('AC2: Trend display', () => {
    it('should display weekly trend with positive change', () => {
      render(<TrustScoreTrend weeklyTrend={5} monthlyTrend={10} />)

      expect(screen.getByTestId('weekly-trend')).toHaveTextContent('Up 5 points this week')
    })

    it('should display monthly trend with positive change', () => {
      render(<TrustScoreTrend weeklyTrend={5} monthlyTrend={10} />)

      expect(screen.getByTestId('monthly-trend')).toHaveTextContent('Up 10 points this month')
    })

    it('should display weekly trend with negative change', () => {
      render(<TrustScoreTrend weeklyTrend={-3} monthlyTrend={-5} />)

      expect(screen.getByTestId('weekly-trend')).toHaveTextContent('Down 3 points this week')
    })

    it('should display monthly trend with negative change', () => {
      render(<TrustScoreTrend weeklyTrend={-3} monthlyTrend={-5} />)

      expect(screen.getByTestId('monthly-trend')).toHaveTextContent('Down 5 points this month')
    })

    it('should display no change for zero weekly trend', () => {
      render(<TrustScoreTrend weeklyTrend={0} monthlyTrend={5} />)

      expect(screen.getByTestId('weekly-trend')).toHaveTextContent('No change this week')
    })

    it('should display no change for zero monthly trend', () => {
      render(<TrustScoreTrend weeklyTrend={0} monthlyTrend={0} />)

      expect(screen.getByTestId('monthly-trend')).toHaveTextContent('No change this month')
    })

    it('should use singular "point" for 1 point change', () => {
      render(<TrustScoreTrend weeklyTrend={1} monthlyTrend={-1} />)

      expect(screen.getByTestId('weekly-trend')).toHaveTextContent('Up 1 point this week')
      expect(screen.getByTestId('monthly-trend')).toHaveTextContent('Down 1 point this month')
    })
  })

  describe('Up/down arrow indicators', () => {
    it('should show up arrow for positive weekly trend', () => {
      render(<TrustScoreTrend weeklyTrend={5} monthlyTrend={0} />)

      expect(screen.getByTestId('weekly-trend-icon')).toHaveAttribute('data-direction', 'up')
    })

    it('should show down arrow for negative weekly trend', () => {
      render(<TrustScoreTrend weeklyTrend={-3} monthlyTrend={0} />)

      expect(screen.getByTestId('weekly-trend-icon')).toHaveAttribute('data-direction', 'down')
    })

    it('should show no arrow for zero weekly trend', () => {
      render(<TrustScoreTrend weeklyTrend={0} monthlyTrend={0} />)

      expect(screen.getByTestId('weekly-trend-icon')).toHaveAttribute('data-direction', 'none')
    })

    it('should show up arrow for positive monthly trend', () => {
      render(<TrustScoreTrend weeklyTrend={0} monthlyTrend={10} />)

      expect(screen.getByTestId('monthly-trend-icon')).toHaveAttribute('data-direction', 'up')
    })

    it('should show down arrow for negative monthly trend', () => {
      render(<TrustScoreTrend weeklyTrend={0} monthlyTrend={-5} />)

      expect(screen.getByTestId('monthly-trend-icon')).toHaveAttribute('data-direction', 'down')
    })
  })

  describe('AC4: Encouraging language', () => {
    it('should use encouraging language for increases', () => {
      render(<TrustScoreTrend weeklyTrend={5} monthlyTrend={10} />)

      const text = screen.getByTestId('trust-score-trend').textContent?.toLowerCase()
      expect(text).toContain('up')
      expect(text).not.toContain('bad')
      expect(text).not.toContain('fail')
    })

    it('should use neutral language for decreases (not punitive)', () => {
      render(<TrustScoreTrend weeklyTrend={-5} monthlyTrend={-10} />)

      const text = screen.getByTestId('trust-score-trend').textContent?.toLowerCase()
      // Uses "down" not "dropped" or other punitive language
      expect(text).toContain('down')
      expect(text).not.toContain('dropped')
      expect(text).not.toContain('lost')
      expect(text).not.toContain('failed')
      expect(text).not.toContain('bad')
    })
  })

  describe('Rendering', () => {
    it('should render the trend container', () => {
      render(<TrustScoreTrend weeklyTrend={0} monthlyTrend={0} />)

      expect(screen.getByTestId('trust-score-trend')).toBeInTheDocument()
    })

    it('should have accessible labels', () => {
      render(<TrustScoreTrend weeklyTrend={5} monthlyTrend={10} />)

      const trend = screen.getByTestId('trust-score-trend')
      expect(trend).toHaveAttribute('aria-label')
    })
  })

  describe('Positive coloring', () => {
    it('should use green color for positive trends', () => {
      render(<TrustScoreTrend weeklyTrend={5} monthlyTrend={10} />)

      const weeklyTrend = screen.getByTestId('weekly-trend')
      expect(weeklyTrend).toHaveAttribute('data-positive', 'true')
    })

    it('should use warm color for negative trends (encouraging)', () => {
      render(<TrustScoreTrend weeklyTrend={-5} monthlyTrend={-10} />)

      const weeklyTrend = screen.getByTestId('weekly-trend')
      expect(weeklyTrend).toHaveAttribute('data-positive', 'false')
    })

    it('should use neutral color for no change', () => {
      render(<TrustScoreTrend weeklyTrend={0} monthlyTrend={0} />)

      const weeklyTrend = screen.getByTestId('weekly-trend')
      expect(weeklyTrend).toHaveAttribute('data-positive', 'neutral')
    })
  })

  describe('View mode', () => {
    it('should show only weekly when mode is weekly', () => {
      render(<TrustScoreTrend weeklyTrend={5} monthlyTrend={10} mode="weekly" />)

      expect(screen.getByTestId('weekly-trend')).toBeInTheDocument()
      expect(screen.queryByTestId('monthly-trend')).not.toBeInTheDocument()
    })

    it('should show only monthly when mode is monthly', () => {
      render(<TrustScoreTrend weeklyTrend={5} monthlyTrend={10} mode="monthly" />)

      expect(screen.queryByTestId('weekly-trend')).not.toBeInTheDocument()
      expect(screen.getByTestId('monthly-trend')).toBeInTheDocument()
    })

    it('should show both when mode is both', () => {
      render(<TrustScoreTrend weeklyTrend={5} monthlyTrend={10} mode="both" />)

      expect(screen.getByTestId('weekly-trend')).toBeInTheDocument()
      expect(screen.getByTestId('monthly-trend')).toBeInTheDocument()
    })

    it('should default to both mode', () => {
      render(<TrustScoreTrend weeklyTrend={5} monthlyTrend={10} />)

      expect(screen.getByTestId('weekly-trend')).toBeInTheDocument()
      expect(screen.getByTestId('monthly-trend')).toBeInTheDocument()
    })
  })
})
