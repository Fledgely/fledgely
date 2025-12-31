/**
 * ScreenTimeChart Component Tests - Story 29.4
 *
 * Tests for the weekly screen time chart component.
 * Covers AC4: Daily/weekly trend chart
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScreenTimeChart } from './ScreenTimeChart'
import type { DailyScreenTime } from '../../hooks/useChildScreenTime'

const mockWeeklyData: DailyScreenTime[] = [
  {
    date: '2025-12-25',
    totalMinutes: 90,
    categories: [
      { category: 'education', minutes: 60 },
      { category: 'gaming', minutes: 30 },
    ],
  },
  {
    date: '2025-12-26',
    totalMinutes: 120,
    categories: [
      { category: 'education', minutes: 60 },
      { category: 'entertainment', minutes: 60 },
    ],
  },
  {
    date: '2025-12-27',
    totalMinutes: 150,
    categories: [
      { category: 'gaming', minutes: 90 },
      { category: 'social_media', minutes: 60 },
    ],
  },
]

describe('ScreenTimeChart - Story 29.4', () => {
  describe('AC4: Daily/weekly trend chart', () => {
    it('should render the chart', () => {
      render(<ScreenTimeChart weeklyData={mockWeeklyData} />)

      expect(screen.getByTestId('screen-time-chart')).toBeInTheDocument()
    })

    it('should render a bar for each day', () => {
      render(<ScreenTimeChart weeklyData={mockWeeklyData} />)

      expect(screen.getByTestId('day-bar-2025-12-25')).toBeInTheDocument()
      expect(screen.getByTestId('day-bar-2025-12-26')).toBeInTheDocument()
      expect(screen.getByTestId('day-bar-2025-12-27')).toBeInTheDocument()
    })

    it('should display day names', () => {
      render(<ScreenTimeChart weeklyData={mockWeeklyData} />)

      // Check for day abbreviations (Thu, Fri, Sat for Dec 25-27, 2025)
      const bars = screen.getByTestId('chart-bars')
      expect(bars).toHaveTextContent('Thu')
      expect(bars).toHaveTextContent('Fri')
      expect(bars).toHaveTextContent('Sat')
    })

    it('should display duration for each day', () => {
      render(<ScreenTimeChart weeklyData={mockWeeklyData} />)

      expect(screen.getByTestId('day-bar-2025-12-25')).toHaveTextContent('1h 30m')
      expect(screen.getByTestId('day-bar-2025-12-26')).toHaveTextContent('2h')
      expect(screen.getByTestId('day-bar-2025-12-27')).toHaveTextContent('2h 30m')
    })

    it('should render chart legend with used categories', () => {
      render(<ScreenTimeChart weeklyData={mockWeeklyData} />)

      const legend = screen.getByTestId('chart-legend')
      expect(legend).toBeInTheDocument()
      expect(legend).toHaveTextContent('Education')
      expect(legend).toHaveTextContent('Gaming')
      expect(legend).toHaveTextContent('Entertainment')
      expect(legend).toHaveTextContent('Social Media')
    })

    it('should only show categories that are used in the data', () => {
      const data: DailyScreenTime[] = [
        {
          date: '2025-12-25',
          totalMinutes: 60,
          categories: [{ category: 'education', minutes: 60 }],
        },
      ]

      render(<ScreenTimeChart weeklyData={data} />)

      const legend = screen.getByTestId('chart-legend')
      expect(legend).toHaveTextContent('Education')
      expect(legend).not.toHaveTextContent('Gaming')
      expect(legend).not.toHaveTextContent('Social Media')
    })

    it('should have proper aria labels for accessibility', () => {
      render(<ScreenTimeChart weeklyData={mockWeeklyData} />)

      const bars = screen.getAllByRole('img')
      expect(bars[0]).toHaveAttribute('aria-label')
      expect(bars[0].getAttribute('aria-label')).toContain('screen time')
    })
  })

  describe('Weekend highlighting', () => {
    it('should highlight weekend days differently', () => {
      const weekendData: DailyScreenTime[] = [
        {
          date: '2025-12-27', // Saturday
          totalMinutes: 90,
          categories: [{ category: 'gaming', minutes: 90 }],
        },
        {
          date: '2025-12-28', // Sunday
          totalMinutes: 120,
          categories: [{ category: 'gaming', minutes: 120 }],
        },
      ]

      render(<ScreenTimeChart weeklyData={weekendData} />)

      // Weekend days should be rendered (Sat, Sun)
      const bars = screen.getByTestId('chart-bars')
      expect(bars).toHaveTextContent('Sat')
      expect(bars).toHaveTextContent('Sun')
    })
  })

  describe('Edge cases', () => {
    it('should return null when no weekly data', () => {
      const { container } = render(<ScreenTimeChart weeklyData={[]} />)

      expect(container.firstChild).toBeNull()
    })

    it('should handle single day of data', () => {
      const singleDay: DailyScreenTime[] = [
        {
          date: '2025-12-25',
          totalMinutes: 60,
          categories: [{ category: 'education', minutes: 60 }],
        },
      ]

      render(<ScreenTimeChart weeklyData={singleDay} />)

      expect(screen.getByTestId('day-bar-2025-12-25')).toBeInTheDocument()
    })

    it('should handle day with zero minutes', () => {
      const dataWithZero: DailyScreenTime[] = [
        {
          date: '2025-12-25',
          totalMinutes: 0,
          categories: [],
        },
      ]

      render(<ScreenTimeChart weeklyData={dataWithZero} />)

      expect(screen.getByTestId('day-bar-2025-12-25')).toHaveTextContent('0m')
    })

    it('should handle full week of data', () => {
      const fullWeek: DailyScreenTime[] = [
        { date: '2025-12-22', totalMinutes: 60, categories: [] },
        { date: '2025-12-23', totalMinutes: 70, categories: [] },
        { date: '2025-12-24', totalMinutes: 80, categories: [] },
        { date: '2025-12-25', totalMinutes: 90, categories: [] },
        { date: '2025-12-26', totalMinutes: 100, categories: [] },
        { date: '2025-12-27', totalMinutes: 110, categories: [] },
        { date: '2025-12-28', totalMinutes: 120, categories: [] },
      ]

      render(<ScreenTimeChart weeklyData={fullWeek} />)

      expect(screen.getAllByTestId(/^day-bar-/)).toHaveLength(7)
    })

    it('should handle all nine categories', () => {
      const dataWithAllCategories: DailyScreenTime[] = [
        {
          date: '2025-12-25',
          totalMinutes: 90,
          categories: [
            { category: 'education', minutes: 10 },
            { category: 'productivity', minutes: 10 },
            { category: 'entertainment', minutes: 10 },
            { category: 'social_media', minutes: 10 },
            { category: 'gaming', minutes: 10 },
            { category: 'communication', minutes: 10 },
            { category: 'news', minutes: 10 },
            { category: 'shopping', minutes: 10 },
            { category: 'other', minutes: 10 },
          ],
        },
      ]

      render(<ScreenTimeChart weeklyData={dataWithAllCategories} />)

      const legend = screen.getByTestId('chart-legend')
      expect(legend).toHaveTextContent('Education')
      expect(legend).toHaveTextContent('Productivity')
      expect(legend).toHaveTextContent('Entertainment')
      expect(legend).toHaveTextContent('Social Media')
      expect(legend).toHaveTextContent('Gaming')
      expect(legend).toHaveTextContent('Communication')
      expect(legend).toHaveTextContent('News')
      expect(legend).toHaveTextContent('Shopping')
      expect(legend).toHaveTextContent('Other')
    })
  })
})
