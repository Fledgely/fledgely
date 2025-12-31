/**
 * Tests for DemoTimeSummary Component
 *
 * Story 8.5.3: Sample Time Tracking Display
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DemoTimeSummary } from './DemoTimeSummary'
import type { DemoTimeCategory } from '../../../data/demoData'

// Sample category breakdown
const mockByCategory: Record<DemoTimeCategory, number> = {
  educational: 75,
  entertainment: 55,
  social: 25,
  other: 5,
}

describe('DemoTimeSummary (Story 8.5.3)', () => {
  describe('Basic rendering (AC1)', () => {
    it('should render summary container', () => {
      render(<DemoTimeSummary totalMinutes={160} byCategory={mockByCategory} period="Today" />)

      expect(screen.getByTestId('demo-time-summary')).toBeInTheDocument()
    })

    it('should display demo badge', () => {
      render(<DemoTimeSummary totalMinutes={160} byCategory={mockByCategory} period="Today" />)

      expect(screen.getByTestId('demo-badge')).toHaveTextContent('Demo Data')
    })

    it('should display period in header', () => {
      render(<DemoTimeSummary totalMinutes={160} byCategory={mockByCategory} period="Today" />)

      expect(screen.getByText('Today Screen Time')).toBeInTheDocument()
    })

    it('should display total time', () => {
      render(<DemoTimeSummary totalMinutes={160} byCategory={mockByCategory} period="Today" />)

      expect(screen.getByTestId('total-time-display')).toHaveTextContent('2h 40m')
    })
  })

  describe('Category breakdown (AC2)', () => {
    it('should display category breakdown section', () => {
      render(<DemoTimeSummary totalMinutes={160} byCategory={mockByCategory} period="Today" />)

      expect(screen.getByTestId('category-breakdown')).toBeInTheDocument()
    })

    it('should display all categories', () => {
      render(<DemoTimeSummary totalMinutes={160} byCategory={mockByCategory} period="Today" />)

      expect(screen.getByTestId('category-row-educational')).toBeInTheDocument()
      expect(screen.getByTestId('category-row-entertainment')).toBeInTheDocument()
      expect(screen.getByTestId('category-row-social')).toBeInTheDocument()
      expect(screen.getByTestId('category-row-other')).toBeInTheDocument()
    })

    it('should show category labels', () => {
      render(<DemoTimeSummary totalMinutes={160} byCategory={mockByCategory} period="Today" />)

      expect(screen.getByText('Educational')).toBeInTheDocument()
      expect(screen.getByText('Entertainment')).toBeInTheDocument()
      expect(screen.getByText('Social')).toBeInTheDocument()
      expect(screen.getByText('Other')).toBeInTheDocument()
    })

    it('should show category durations', () => {
      render(<DemoTimeSummary totalMinutes={160} byCategory={mockByCategory} period="Today" />)

      expect(screen.getByText('1h 15m')).toBeInTheDocument() // 75m
      expect(screen.getByText('55m')).toBeInTheDocument()
      expect(screen.getByText('25m')).toBeInTheDocument()
      expect(screen.getByText('5m')).toBeInTheDocument()
    })
  })

  describe('Limit indicators (AC3)', () => {
    it('should show under limit status when under', () => {
      render(
        <DemoTimeSummary
          totalMinutes={100}
          byCategory={mockByCategory}
          period="Today"
          dailyLimit={180}
        />
      )

      expect(screen.getByTestId('limit-status')).toHaveTextContent('Under Limit')
    })

    it('should show approaching limit status when at 90%+', () => {
      render(
        <DemoTimeSummary
          totalMinutes={170}
          byCategory={mockByCategory}
          period="Today"
          dailyLimit={180}
        />
      )

      expect(screen.getByTestId('limit-status')).toHaveTextContent('Approaching Limit')
    })

    it('should show over limit status when exceeded', () => {
      render(
        <DemoTimeSummary
          totalMinutes={200}
          byCategory={mockByCategory}
          period="Today"
          dailyLimit={180}
        />
      )

      expect(screen.getByTestId('limit-status')).toHaveTextContent('Over Limit')
    })

    it('should display limit progress bar', () => {
      render(<DemoTimeSummary totalMinutes={160} byCategory={mockByCategory} period="Today" />)

      expect(screen.getByTestId('limit-progress')).toBeInTheDocument()
      expect(screen.getByTestId('limit-bar')).toBeInTheDocument()
    })

    it('should show limit in total display', () => {
      render(
        <DemoTimeSummary
          totalMinutes={160}
          byCategory={mockByCategory}
          period="Today"
          dailyLimit={180}
        />
      )

      expect(screen.getByText('of 3h limit')).toBeInTheDocument()
    })
  })

  describe('Demo styling', () => {
    it('should have dashed border', () => {
      render(<DemoTimeSummary totalMinutes={160} byCategory={mockByCategory} period="Today" />)

      const summary = screen.getByTestId('demo-time-summary')
      expect(summary).toHaveStyle({ border: '2px dashed #c4b5fd' })
    })

    it('should have lavender background', () => {
      render(<DemoTimeSummary totalMinutes={160} byCategory={mockByCategory} period="Today" />)

      const summary = screen.getByTestId('demo-time-summary')
      expect(summary).toHaveStyle({ backgroundColor: '#faf5ff' })
    })
  })

  describe('Different periods', () => {
    it('should display This Week period', () => {
      render(<DemoTimeSummary totalMinutes={840} byCategory={mockByCategory} period="This Week" />)

      expect(screen.getByText('This Week Screen Time')).toBeInTheDocument()
      expect(screen.getByText('14h')).toBeInTheDocument() // 840 minutes
    })
  })
})
