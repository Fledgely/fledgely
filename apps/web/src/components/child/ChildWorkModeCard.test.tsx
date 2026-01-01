/**
 * ChildWorkModeCard Tests - Story 33.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChildWorkModeCard } from './ChildWorkModeCard'
import type { WorkModeAnalyticsData } from '../../hooks/useWorkModeAnalytics'

// Mock the service
const mockGetRecentCheckIns = vi.fn()
const mockMarkCheckInAsRead = vi.fn()
const mockRespondToCheckIn = vi.fn()

vi.mock('../../services/workModeService', () => ({
  getRecentCheckIns: (...args: unknown[]) => mockGetRecentCheckIns(...args),
  markCheckInAsRead: (...args: unknown[]) => mockMarkCheckInAsRead(...args),
  respondToCheckIn: (...args: unknown[]) => mockRespondToCheckIn(...args),
}))

describe('ChildWorkModeCard - Story 33.6', () => {
  const defaultProps = {
    childId: 'child-1',
    familyId: 'family-1',
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
    mockGetRecentCheckIns.mockResolvedValue([])
    mockMarkCheckInAsRead.mockResolvedValue(undefined)
    mockRespondToCheckIn.mockResolvedValue(undefined)
  })

  describe('loading state', () => {
    it('shows loading skeleton', () => {
      render(<ChildWorkModeCard {...defaultProps} loading={true} />)

      const card = screen.getByTestId('child-work-mode-card')
      expect(card.querySelector('.animate-pulse')).toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('shows error message', () => {
      render(<ChildWorkModeCard {...defaultProps} error="Failed to load" />)

      expect(screen.getByText('Failed to load')).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('shows empty message when no data', () => {
      render(<ChildWorkModeCard {...defaultProps} />)

      expect(screen.getByText(/No work mode sessions this week yet/)).toBeInTheDocument()
    })
  })

  describe('data display', () => {
    it('shows header for child', () => {
      render(<ChildWorkModeCard {...defaultProps} data={mockData} />)

      expect(screen.getByText('Your Work Mode Stats')).toBeInTheDocument()
    })

    it('shows weekly hours', () => {
      render(<ChildWorkModeCard {...defaultProps} data={mockData} />)

      expect(screen.getByTestId('weekly-hours')).toHaveTextContent('12h 30m')
    })

    it('shows session count', () => {
      render(<ChildWorkModeCard {...defaultProps} data={mockData} />)

      expect(screen.getByTestId('session-count')).toHaveTextContent('5')
    })

    it('shows daily distribution', () => {
      render(<ChildWorkModeCard {...defaultProps} data={mockData} />)

      expect(screen.getByTestId('daily-distribution')).toBeInTheDocument()
    })
  })

  describe('bilateral transparency', () => {
    it('shows transparency section', () => {
      render(<ChildWorkModeCard {...defaultProps} data={mockData} />)

      expect(screen.getByTestId('transparency-section')).toBeInTheDocument()
      expect(screen.getByText('What your parent sees:')).toBeInTheDocument()
    })

    it('tells child parent sees same data', () => {
      render(<ChildWorkModeCard {...defaultProps} data={mockData} />)

      expect(screen.getByText(/Same work hours and session counts as you/)).toBeInTheDocument()
    })

    it('shows anomaly info in transparency section when anomalous', () => {
      render(<ChildWorkModeCard {...defaultProps} data={{ ...mockData, isAnomalous: true }} />)

      expect(screen.getByText(/higher than usual/)).toBeInTheDocument()
    })

    it('shows outside schedule info when applicable', () => {
      render(
        <ChildWorkModeCard {...defaultProps} data={{ ...mockData, outsideScheduleCount: 2 }} />
      )

      expect(screen.getByText(/2 times outside scheduled hours/)).toBeInTheDocument()
    })
  })

  describe('check-ins', () => {
    it('shows unread check-ins notification', async () => {
      mockGetRecentCheckIns.mockResolvedValue([
        {
          id: 'check-1',
          familyId: 'family-1',
          childId: 'child-1',
          parentId: 'parent-1',
          parentName: 'Mom',
          message: 'How was work today?',
          sentAt: Date.now(),
          readAt: null,
          response: null,
          respondedAt: null,
        },
      ])

      render(<ChildWorkModeCard {...defaultProps} data={mockData} />)

      await waitFor(() => {
        expect(screen.getByTestId('unread-check-ins')).toBeInTheDocument()
      })

      expect(screen.getByText(/How was work today/)).toBeInTheDocument()
    })

    it('allows marking check-in as read', async () => {
      mockGetRecentCheckIns.mockResolvedValue([
        {
          id: 'check-1',
          familyId: 'family-1',
          childId: 'child-1',
          parentId: 'parent-1',
          parentName: 'Mom',
          message: 'How was work?',
          sentAt: Date.now(),
          readAt: null,
          response: null,
          respondedAt: null,
        },
      ])

      render(<ChildWorkModeCard {...defaultProps} data={mockData} />)

      await waitFor(() => {
        expect(screen.getByText('Mark as read')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Mark as read'))

      expect(mockMarkCheckInAsRead).toHaveBeenCalledWith('family-1', 'child-1', 'check-1')
    })

    it('allows replying to check-in', async () => {
      mockGetRecentCheckIns.mockResolvedValue([
        {
          id: 'check-1',
          familyId: 'family-1',
          childId: 'child-1',
          parentId: 'parent-1',
          parentName: 'Mom',
          message: 'How was work?',
          sentAt: Date.now(),
          readAt: null,
          response: null,
          respondedAt: null,
        },
      ])

      render(<ChildWorkModeCard {...defaultProps} data={mockData} />)

      await waitFor(() => {
        expect(screen.getByText('Reply (optional)')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Reply (optional)'))

      const input = screen.getByTestId('response-input')
      fireEvent.change(input, { target: { value: 'It was great!' } })

      fireEvent.click(screen.getByTestId('submit-response'))

      expect(mockRespondToCheckIn).toHaveBeenCalledWith(
        'family-1',
        'child-1',
        'check-1',
        'It was great!'
      )
    })

    it('shows reply is optional', async () => {
      mockGetRecentCheckIns.mockResolvedValue([
        {
          id: 'check-1',
          familyId: 'family-1',
          childId: 'child-1',
          parentId: 'parent-1',
          parentName: 'Mom',
          message: 'How was work?',
          sentAt: Date.now(),
          readAt: null,
          response: null,
          respondedAt: null,
        },
      ])

      render(<ChildWorkModeCard {...defaultProps} data={mockData} />)

      await waitFor(() => {
        expect(screen.getByText('Reply (optional)')).toBeInTheDocument()
      })
    })
  })
})
