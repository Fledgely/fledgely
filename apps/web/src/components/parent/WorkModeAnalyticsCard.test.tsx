/**
 * WorkModeAnalyticsCard Tests - Story 33.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WorkModeAnalyticsCard } from './WorkModeAnalyticsCard'
import type { WorkModeAnalyticsData } from '../../hooks/useWorkModeAnalytics'

// Mock the service
vi.mock('../../services/workModeService', () => ({
  sendParentCheckIn: vi.fn().mockResolvedValue('check-in-id'),
}))

describe('WorkModeAnalyticsCard - Story 33.6', () => {
  const defaultProps = {
    childId: 'child-1',
    childName: 'Jake',
    familyId: 'family-1',
    parentId: 'parent-1',
    parentName: 'Mom',
    data: null,
    loading: false,
    error: null,
  }

  const mockData: WorkModeAnalyticsData = {
    weeklySessionCount: 5,
    weeklyTotalHours: 12.5,
    weeklyAverageSessionHours: 2.5,
    sessionCountChange: 2,
    hoursChange: 3,
    typicalWeeklyHours: 10,
    deviationFromTypical: 0.25,
    isAnomalous: false,
    scheduledSessions: 3,
    manualSessions: 2,
    outsideScheduleCount: 0,
    dailyDistribution: {
      sunday: 0,
      monday: 2,
      tuesday: 1,
      wednesday: 1,
      thursday: 1,
      friday: 0,
      saturday: 0,
    },
    dailySummaries: [],
    periodStart: '2024-01-08',
    periodEnd: '2024-01-14',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loading state', () => {
    it('shows loading skeleton', () => {
      render(<WorkModeAnalyticsCard {...defaultProps} loading={true} />)

      const card = screen.getByTestId('work-mode-analytics-card')
      expect(card.querySelector('.animate-pulse')).toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('shows error message', () => {
      render(<WorkModeAnalyticsCard {...defaultProps} error="Failed to load" />)

      expect(screen.getByText('Failed to load')).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('shows empty message when no data', () => {
      render(<WorkModeAnalyticsCard {...defaultProps} />)

      expect(screen.getByText(/No work mode sessions this week yet/)).toBeInTheDocument()
    })

    it('shows empty message when zero sessions', () => {
      render(
        <WorkModeAnalyticsCard {...defaultProps} data={{ ...mockData, weeklySessionCount: 0 }} />
      )

      expect(screen.getByText(/No work mode sessions this week yet/)).toBeInTheDocument()
    })
  })

  describe('data display', () => {
    it('shows child name in header', () => {
      render(<WorkModeAnalyticsCard {...defaultProps} data={mockData} />)

      expect(screen.getByText("Jake's Work Mode")).toBeInTheDocument()
    })

    it('shows weekly hours prominently', () => {
      render(<WorkModeAnalyticsCard {...defaultProps} data={mockData} />)

      expect(screen.getByTestId('weekly-hours')).toHaveTextContent('12h 30m')
    })

    it('shows hours change from last week', () => {
      render(<WorkModeAnalyticsCard {...defaultProps} data={mockData} />)

      expect(screen.getByTestId('hours-change')).toHaveTextContent('+3h from last week')
    })

    it('shows negative hours change', () => {
      render(<WorkModeAnalyticsCard {...defaultProps} data={{ ...mockData, hoursChange: -2 }} />)

      expect(screen.getByTestId('hours-change')).toHaveTextContent('-2h from last week')
    })

    it('shows session count', () => {
      render(<WorkModeAnalyticsCard {...defaultProps} data={mockData} />)

      expect(screen.getByTestId('session-count')).toHaveTextContent('5')
      expect(screen.getByText('3 scheduled, 2 manual')).toBeInTheDocument()
    })

    it('shows average session time', () => {
      render(<WorkModeAnalyticsCard {...defaultProps} data={mockData} />)

      expect(screen.getByTestId('avg-session')).toHaveTextContent('2h 30m')
    })

    it('shows daily distribution chart', () => {
      render(<WorkModeAnalyticsCard {...defaultProps} data={mockData} />)

      expect(screen.getByTestId('daily-distribution')).toBeInTheDocument()
    })

    it('shows period dates', () => {
      render(<WorkModeAnalyticsCard {...defaultProps} data={mockData} />)

      expect(screen.getByText('2024-01-08 to 2024-01-14')).toBeInTheDocument()
    })
  })

  describe('anomaly indicator', () => {
    it('shows anomaly indicator when isAnomalous is true', () => {
      render(
        <WorkModeAnalyticsCard
          {...defaultProps}
          data={{ ...mockData, isAnomalous: true, deviationFromTypical: 0.75 }}
        />
      )

      expect(screen.getByTestId('anomaly-indicator')).toBeInTheDocument()
    })

    it('does not show anomaly indicator when not anomalous', () => {
      render(<WorkModeAnalyticsCard {...defaultProps} data={mockData} />)

      expect(screen.queryByTestId('anomaly-indicator')).not.toBeInTheDocument()
    })

    it('uses trust-based framing for anomaly', () => {
      render(
        <WorkModeAnalyticsCard
          {...defaultProps}
          data={{ ...mockData, isAnomalous: true, deviationFromTypical: 0.75 }}
        />
      )

      // Check for trust-based messages from WORK_MODE_ANALYTICS_MESSAGES.anomalyAlert
      expect(screen.getByText(/Work hours higher than usual/)).toBeInTheDocument()
    })
  })

  describe('outside schedule indicator', () => {
    it('shows outside schedule info when count > 0', () => {
      render(
        <WorkModeAnalyticsCard {...defaultProps} data={{ ...mockData, outsideScheduleCount: 2 }} />
      )

      expect(screen.getByTestId('outside-schedule-info')).toBeInTheDocument()
      expect(screen.getByText(/2 sessions started outside scheduled hours/)).toBeInTheDocument()
    })

    it('does not show outside schedule info when count is 0', () => {
      render(<WorkModeAnalyticsCard {...defaultProps} data={mockData} />)

      expect(screen.queryByTestId('outside-schedule-info')).not.toBeInTheDocument()
    })

    it('uses informational framing', () => {
      render(
        <WorkModeAnalyticsCard {...defaultProps} data={{ ...mockData, outsideScheduleCount: 1 }} />
      )

      expect(screen.getByText(/informational only/)).toBeInTheDocument()
    })
  })

  describe('check-in feature', () => {
    it('shows check-in button', () => {
      render(<WorkModeAnalyticsCard {...defaultProps} data={mockData} />)

      expect(screen.getByTestId('check-in-button')).toBeInTheDocument()
    })

    it('opens check-in modal when button clicked', async () => {
      render(<WorkModeAnalyticsCard {...defaultProps} data={mockData} />)

      fireEvent.click(screen.getByTestId('check-in-button'))

      expect(screen.getByTestId('work-mode-check-in')).toBeInTheDocument()
    })

    it('closes check-in modal on cancel', async () => {
      render(<WorkModeAnalyticsCard {...defaultProps} data={mockData} />)

      fireEvent.click(screen.getByTestId('check-in-button'))
      fireEvent.click(screen.getByText('Cancel'))

      expect(screen.queryByTestId('work-mode-check-in')).not.toBeInTheDocument()
    })
  })
})
