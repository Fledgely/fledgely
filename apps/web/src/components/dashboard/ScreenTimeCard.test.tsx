/**
 * ScreenTimeCard Component Tests - Story 29.4
 *
 * Tests for the Screen Time Card component.
 * Covers acceptance criteria:
 * - AC1: Today's total time shown prominently
 * - AC3: Breakdown by category
 * - AC5: Comparison to agreed limits
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScreenTimeCard } from './ScreenTimeCard'
import * as useChildScreenTimeModule from '../../hooks/useChildScreenTime'
import type { ScreenTimeData } from '../../hooks/useChildScreenTime'

// Mock the hook
vi.mock('../../hooks/useChildScreenTime', async () => {
  const actual = await vi.importActual<typeof useChildScreenTimeModule>(
    '../../hooks/useChildScreenTime'
  )
  return {
    ...actual,
    useChildScreenTime: vi.fn(),
  }
})

const mockUseChildScreenTime = vi.mocked(useChildScreenTimeModule.useChildScreenTime)

const mockScreenTimeData: ScreenTimeData = {
  todayMinutes: 120,
  todayCategories: [
    { category: 'education', minutes: 60 },
    { category: 'gaming', minutes: 30 },
    { category: 'entertainment', minutes: 30 },
  ],
  todayDevices: [
    { deviceId: 'dev-1', deviceName: 'Chromebook', deviceType: 'chromebook', minutes: 90 },
    { deviceId: 'dev-2', deviceName: 'Phone', deviceType: 'android', minutes: 30 },
  ],
  weeklyData: [
    {
      date: '2025-12-25',
      totalMinutes: 90,
      categories: [{ category: 'education', minutes: 90 }],
    },
    {
      date: '2025-12-26',
      totalMinutes: 120,
      categories: [
        { category: 'education', minutes: 60 },
        { category: 'gaming', minutes: 60 },
      ],
    },
  ],
  weeklyAverage: 105,
  changeFromYesterday: 30,
}

describe('ScreenTimeCard - Story 29.4', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("AC1: Today's total time shown prominently", () => {
    it("should display today's total screen time", () => {
      mockUseChildScreenTime.mockReturnValue({
        data: mockScreenTimeData,
        loading: false,
        error: null,
      })

      render(<ScreenTimeCard familyId="family-123" childId="child-456" childName="Emma" />)

      expect(screen.getByTestId('screen-time-card')).toBeInTheDocument()
      expect(screen.getByTestId('today-total')).toHaveTextContent('2h')
    })

    it('should show change from yesterday when increased', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: mockScreenTimeData,
        loading: false,
        error: null,
      })

      render(<ScreenTimeCard familyId="family-123" childId="child-456" childName="Emma" />)

      const changeIndicator = screen.getByTestId('change-indicator')
      expect(changeIndicator).toHaveTextContent('30m more than yesterday')
    })

    it('should show change from yesterday when decreased', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: {
          ...mockScreenTimeData,
          changeFromYesterday: -45,
        },
        loading: false,
        error: null,
      })

      render(<ScreenTimeCard familyId="family-123" childId="child-456" childName="Emma" />)

      const changeIndicator = screen.getByTestId('change-indicator')
      expect(changeIndicator).toHaveTextContent('45m less than yesterday')
    })

    it('should show same as yesterday when no change', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: {
          ...mockScreenTimeData,
          changeFromYesterday: 0,
        },
        loading: false,
        error: null,
      })

      render(<ScreenTimeCard familyId="family-123" childId="child-456" childName="Emma" />)

      const changeIndicator = screen.getByTestId('change-indicator')
      expect(changeIndicator).toHaveTextContent('Same as yesterday')
    })

    it('should show weekly average', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: mockScreenTimeData,
        loading: false,
        error: null,
      })

      render(<ScreenTimeCard familyId="family-123" childId="child-456" childName="Emma" />)

      expect(screen.getByTestId('weekly-average')).toHaveTextContent('1h 45m')
    })
  })

  describe('AC5: Comparison to agreed limits', () => {
    it('should show under limit badge when under limit', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: mockScreenTimeData,
        loading: false,
        error: null,
      })

      render(
        <ScreenTimeCard
          familyId="family-123"
          childId="child-456"
          childName="Emma"
          dailyLimit={180}
        />
      )

      const limitBadge = screen.getByTestId('limit-badge')
      expect(limitBadge).toHaveTextContent('Under limit')
      expect(limitBadge).toHaveTextContent('1h remaining')
    })

    it('should show near limit badge when approaching limit', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: {
          ...mockScreenTimeData,
          todayMinutes: 170,
        },
        loading: false,
        error: null,
      })

      render(
        <ScreenTimeCard
          familyId="family-123"
          childId="child-456"
          childName="Emma"
          dailyLimit={180}
        />
      )

      const limitBadge = screen.getByTestId('limit-badge')
      expect(limitBadge).toHaveTextContent('Near limit')
    })

    it('should show over limit badge when over limit', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: {
          ...mockScreenTimeData,
          todayMinutes: 200,
        },
        loading: false,
        error: null,
      })

      render(
        <ScreenTimeCard
          familyId="family-123"
          childId="child-456"
          childName="Emma"
          dailyLimit={180}
        />
      )

      const limitBadge = screen.getByTestId('limit-badge')
      expect(limitBadge).toHaveTextContent('Over limit')
      expect(limitBadge).toHaveTextContent('20m over')
    })

    it('should not show limit badge when no limit set', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: mockScreenTimeData,
        loading: false,
        error: null,
      })

      render(<ScreenTimeCard familyId="family-123" childId="child-456" childName="Emma" />)

      expect(screen.queryByTestId('limit-badge')).not.toBeInTheDocument()
    })
  })

  describe('Loading and error states', () => {
    it('should show loading skeleton when loading', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: null,
        loading: true,
        error: null,
      })

      render(<ScreenTimeCard familyId="family-123" childId="child-456" childName="Emma" />)

      expect(screen.getByTestId('screen-time-loading')).toBeInTheDocument()
    })

    it('should show error state when error occurs', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: null,
        loading: false,
        error: 'Failed to load screen time',
      })

      render(<ScreenTimeCard familyId="family-123" childId="child-456" childName="Emma" />)

      expect(screen.getByTestId('screen-time-error')).toBeInTheDocument()
      expect(screen.getByText('Failed to load screen time')).toBeInTheDocument()
    })

    it('should show empty state when no data', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: {
          todayMinutes: 0,
          todayCategories: [],
          todayDevices: [],
          weeklyData: [],
          weeklyAverage: 0,
          changeFromYesterday: 0,
        },
        loading: false,
        error: null,
      })

      render(<ScreenTimeCard familyId="family-123" childId="child-456" childName="Emma" />)

      expect(screen.getByTestId('screen-time-empty')).toBeInTheDocument()
      expect(screen.getByText(/No screen time data for Emma/)).toBeInTheDocument()
    })
  })

  describe('Component integration', () => {
    it('should render category breakdown when categories exist', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: mockScreenTimeData,
        loading: false,
        error: null,
      })

      render(<ScreenTimeCard familyId="family-123" childId="child-456" childName="Emma" />)

      expect(screen.getByTestId('category-breakdown')).toBeInTheDocument()
    })

    it('should render device breakdown when devices exist', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: mockScreenTimeData,
        loading: false,
        error: null,
      })

      render(<ScreenTimeCard familyId="family-123" childId="child-456" childName="Emma" />)

      expect(screen.getByTestId('device-breakdown')).toBeInTheDocument()
    })

    it('should render weekly chart when weekly data exists', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: mockScreenTimeData,
        loading: false,
        error: null,
      })

      render(<ScreenTimeCard familyId="family-123" childId="child-456" childName="Emma" />)

      expect(screen.getByTestId('screen-time-chart')).toBeInTheDocument()
    })
  })
})
