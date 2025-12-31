/**
 * Tests for DemoTimeTrackingPanel Component
 *
 * Story 8.5.3: Sample Time Tracking Display
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DemoTimeTrackingPanel } from './DemoTimeTrackingPanel'
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
  {
    date: '2024-01-03',
    dayName: 'Wed',
    isWeekend: false,
    totalMinutes: 100,
    byCategory: { educational: 50, entertainment: 35, social: 15, other: 0 },
    limitStatus: 'under',
  },
  {
    date: '2024-01-02',
    dayName: 'Tue',
    isWeekend: false,
    totalMinutes: 120,
    byCategory: { educational: 40, entertainment: 50, social: 30, other: 0 },
    limitStatus: 'under',
  },
  {
    date: '2024-01-01',
    dayName: 'Mon',
    isWeekend: false,
    totalMinutes: 215,
    byCategory: { educational: 35, entertainment: 140, social: 40, other: 0 },
    limitStatus: 'over',
  },
]

describe('DemoTimeTrackingPanel (Story 8.5.3)', () => {
  describe('Basic rendering', () => {
    it('should render panel container', () => {
      render(<DemoTimeTrackingPanel summaries={mockSummaries} />)

      expect(screen.getByTestId('demo-time-tracking-panel')).toBeInTheDocument()
    })

    it('should display demo badge', () => {
      render(<DemoTimeTrackingPanel summaries={mockSummaries} />)

      expect(screen.getByTestId('panel-demo-badge')).toHaveTextContent('Sample Data')
    })

    it('should display header', () => {
      render(<DemoTimeTrackingPanel summaries={mockSummaries} />)

      expect(screen.getByText('Demo Time Tracking')).toBeInTheDocument()
    })
  })

  describe('Date range selector (AC6)', () => {
    it('should display date range selector', () => {
      render(<DemoTimeTrackingPanel summaries={mockSummaries} />)

      expect(screen.getByTestId('date-range-selector')).toBeInTheDocument()
    })

    it('should have Today and This Week tabs', () => {
      render(<DemoTimeTrackingPanel summaries={mockSummaries} />)

      expect(screen.getByTestId('tab-today')).toBeInTheDocument()
      expect(screen.getByTestId('tab-week')).toBeInTheDocument()
    })

    it('should default to This Week view', () => {
      render(<DemoTimeTrackingPanel summaries={mockSummaries} />)

      expect(screen.getByText('This Week Screen Time')).toBeInTheDocument()
    })

    it('should switch to Today view when tab clicked', () => {
      render(<DemoTimeTrackingPanel summaries={mockSummaries} />)

      fireEvent.click(screen.getByTestId('tab-today'))

      expect(screen.getByText('Today Screen Time')).toBeInTheDocument()
    })

    it('should switch back to Week view', () => {
      render(<DemoTimeTrackingPanel summaries={mockSummaries} />)

      // Switch to today
      fireEvent.click(screen.getByTestId('tab-today'))
      expect(screen.getByText('Today Screen Time')).toBeInTheDocument()

      // Switch back to week
      fireEvent.click(screen.getByTestId('tab-week'))
      expect(screen.getByText('This Week Screen Time')).toBeInTheDocument()
    })
  })

  describe('Summary display', () => {
    it('should show summary component', () => {
      render(<DemoTimeTrackingPanel summaries={mockSummaries} />)

      expect(screen.getByTestId('demo-time-summary')).toBeInTheDocument()
    })

    it('should update summary when date range changes', () => {
      render(<DemoTimeTrackingPanel summaries={mockSummaries} />)

      // Week view shows total
      expect(screen.getByText('This Week Screen Time')).toBeInTheDocument()

      // Switch to Today
      fireEvent.click(screen.getByTestId('tab-today'))

      // Should now show Today
      expect(screen.getByText('Today Screen Time')).toBeInTheDocument()
    })
  })

  describe('Chart display', () => {
    it('should show chart in week view', () => {
      render(<DemoTimeTrackingPanel summaries={mockSummaries} />)

      expect(screen.getByTestId('demo-time-chart')).toBeInTheDocument()
    })

    it('should hide chart in today view', () => {
      render(<DemoTimeTrackingPanel summaries={mockSummaries} />)

      fireEvent.click(screen.getByTestId('tab-today'))

      expect(screen.queryByTestId('demo-time-chart')).not.toBeInTheDocument()
    })
  })

  describe('Pattern insights (AC5)', () => {
    it('should display pattern insights section', () => {
      render(<DemoTimeTrackingPanel summaries={mockSummaries} />)

      expect(screen.getByTestId('pattern-insights')).toBeInTheDocument()
    })

    it('should mention weekend patterns', () => {
      render(<DemoTimeTrackingPanel summaries={mockSummaries} />)

      expect(screen.getByText(/weekend/i)).toBeInTheDocument()
    })
  })

  describe('With default demo data', () => {
    it('should render with no props (uses default demo data)', () => {
      render(<DemoTimeTrackingPanel />)

      expect(screen.getByTestId('demo-time-tracking-panel')).toBeInTheDocument()
      expect(screen.getByTestId('demo-time-chart')).toBeInTheDocument()
    })
  })
})
