/**
 * Tests for DemoTimeChart Component
 *
 * Story 8.5.3: Sample Time Tracking Display
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DemoTimeChart } from './DemoTimeChart'
import type { DemoDailySummary } from '../../../data/demoData'

// Sample summaries for testing
const mockSummaries: DemoDailySummary[] = [
  {
    date: '2024-01-07',
    dayName: 'Sun',
    isWeekend: true,
    totalMinutes: 195,
    byCategory: { educational: 15, entertainment: 125, social: 35, other: 20 },
    limitStatus: 'over',
  },
  {
    date: '2024-01-06',
    dayName: 'Sat',
    isWeekend: true,
    totalMinutes: 205,
    byCategory: { educational: 20, entertainment: 140, social: 45, other: 0 },
    limitStatus: 'over',
  },
  {
    date: '2024-01-05',
    dayName: 'Fri',
    isWeekend: false,
    totalMinutes: 120,
    byCategory: { educational: 40, entertainment: 50, social: 30, other: 0 },
    limitStatus: 'under',
  },
  {
    date: '2024-01-04',
    dayName: 'Thu',
    isWeekend: false,
    totalMinutes: 100,
    byCategory: { educational: 50, entertainment: 35, social: 15, other: 0 },
    limitStatus: 'under',
  },
]

describe('DemoTimeChart (Story 8.5.3)', () => {
  describe('Basic rendering (AC4)', () => {
    it('should render chart container', () => {
      render(<DemoTimeChart summaries={mockSummaries} />)

      expect(screen.getByTestId('demo-time-chart')).toBeInTheDocument()
    })

    it('should display demo badge', () => {
      render(<DemoTimeChart summaries={mockSummaries} />)

      expect(screen.getByTestId('demo-badge')).toHaveTextContent('Demo Data')
    })

    it('should render chart bars container', () => {
      render(<DemoTimeChart summaries={mockSummaries} />)

      expect(screen.getByTestId('chart-bars')).toBeInTheDocument()
    })
  })

  describe('Day bars (AC1)', () => {
    it('should render a bar for each day', () => {
      render(<DemoTimeChart summaries={mockSummaries} />)

      expect(screen.getByTestId('day-bar-sun')).toBeInTheDocument()
      expect(screen.getByTestId('day-bar-sat')).toBeInTheDocument()
      expect(screen.getByTestId('day-bar-fri')).toBeInTheDocument()
      expect(screen.getByTestId('day-bar-thu')).toBeInTheDocument()
    })

    it('should display day labels', () => {
      render(<DemoTimeChart summaries={mockSummaries} />)

      expect(screen.getByText('Sun')).toBeInTheDocument()
      expect(screen.getByText('Sat')).toBeInTheDocument()
      expect(screen.getByText('Fri')).toBeInTheDocument()
      expect(screen.getByText('Thu')).toBeInTheDocument()
    })

    it('should display duration for each day', () => {
      render(<DemoTimeChart summaries={mockSummaries} />)

      // 195 minutes = 3h 15m
      expect(screen.getByText('3h 15m')).toBeInTheDocument()
      // 205 minutes = 3h 25m
      expect(screen.getByText('3h 25m')).toBeInTheDocument()
      // 120 minutes = 2h
      expect(screen.getByText('2h')).toBeInTheDocument()
    })
  })

  describe('Over limit indicator (AC3)', () => {
    it('should show over-limit indicator for days over limit', () => {
      render(<DemoTimeChart summaries={mockSummaries} />)

      const overIndicators = screen.getAllByTestId('over-limit-indicator')
      expect(overIndicators.length).toBe(2) // Sun and Sat are over
    })

    it('should NOT show over-limit indicator for days under limit', () => {
      const underLimitOnly: DemoDailySummary[] = [
        {
          date: '2024-01-05',
          dayName: 'Fri',
          isWeekend: false,
          totalMinutes: 100,
          byCategory: { educational: 50, entertainment: 30, social: 20, other: 0 },
          limitStatus: 'under',
        },
      ]
      render(<DemoTimeChart summaries={underLimitOnly} />)

      expect(screen.queryByTestId('over-limit-indicator')).not.toBeInTheDocument()
    })
  })

  describe('Legend (AC2)', () => {
    it('should display category legend', () => {
      render(<DemoTimeChart summaries={mockSummaries} />)

      expect(screen.getByTestId('chart-legend')).toBeInTheDocument()
    })

    it('should show all category labels', () => {
      render(<DemoTimeChart summaries={mockSummaries} />)

      expect(screen.getByText('Educational')).toBeInTheDocument()
      expect(screen.getByText('Entertainment')).toBeInTheDocument()
      expect(screen.getByText('Social')).toBeInTheDocument()
      expect(screen.getByText('Other')).toBeInTheDocument()
    })
  })

  describe('Demo styling', () => {
    it('should have dashed border', () => {
      render(<DemoTimeChart summaries={mockSummaries} />)

      const chart = screen.getByTestId('demo-time-chart')
      expect(chart).toHaveStyle({ border: '2px dashed #c4b5fd' })
    })

    it('should have lavender background', () => {
      render(<DemoTimeChart summaries={mockSummaries} />)

      const chart = screen.getByTestId('demo-time-chart')
      expect(chart).toHaveStyle({ backgroundColor: '#faf5ff' })
    })
  })

  describe('Empty state', () => {
    it('should render without errors with empty summaries', () => {
      render(<DemoTimeChart summaries={[]} />)

      expect(screen.getByTestId('demo-time-chart')).toBeInTheDocument()
    })
  })
})
