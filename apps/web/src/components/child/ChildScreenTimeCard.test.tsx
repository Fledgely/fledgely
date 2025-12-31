/**
 * ChildScreenTimeCard Tests - Story 29.5
 *
 * Tests for child-friendly screen time display component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChildScreenTimeCard } from './ChildScreenTimeCard'

// Mock the useChildScreenTime hook
vi.mock('../../hooks/useChildScreenTime', () => ({
  useChildScreenTime: vi.fn(),
  formatDuration: (minutes: number) => {
    if (minutes === 0) return '0m'
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  },
  getCategoryColor: (category: string) => {
    const colors: Record<string, string> = {
      education: '#16a34a',
      productivity: '#3b82f6',
      entertainment: '#d97706',
      social_media: '#ec4899',
      gaming: '#8b5cf6',
      communication: '#0891b2',
      news: '#6366f1',
      shopping: '#0d9488',
      other: '#6b7280',
    }
    return colors[category] || colors.other
  },
  getCategoryLabel: (category: string) => {
    const labels: Record<string, string> = {
      education: 'Education',
      productivity: 'Productivity',
      entertainment: 'Entertainment',
      social_media: 'Social Media',
      gaming: 'Gaming',
      communication: 'Communication',
      news: 'News',
      shopping: 'Shopping',
      other: 'Other',
    }
    return labels[category] || 'Other'
  },
}))

import { useChildScreenTime } from '../../hooks/useChildScreenTime'

const mockUseChildScreenTime = vi.mocked(useChildScreenTime)

describe('ChildScreenTimeCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('rendering', () => {
    it('renders the component with title', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: null,
        loading: false,
        error: null,
      })

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" />)

      expect(screen.getByTestId('child-screen-time-card')).toBeInTheDocument()
      expect(screen.getByText('Your Screen Time')).toBeInTheDocument()
    })

    it('renders help link with correct text', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: null,
        loading: false,
        error: null,
      })

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" />)

      const helpLink = screen.getByTestId('help-link')
      expect(helpLink).toBeInTheDocument()
      expect(helpLink).toHaveTextContent('What is this?')
    })
  })

  describe('loading state', () => {
    it('shows loading state when loading is true', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: null,
        loading: true,
        error: null,
      })

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" />)

      expect(screen.getByTestId('loading-state')).toBeInTheDocument()
      expect(screen.getByText('Getting your screen time...')).toBeInTheDocument()
    })

    it('does not show content when loading', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: null,
        loading: true,
        error: null,
      })

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" />)

      expect(screen.queryByTestId('today-section')).not.toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('shows error state when error occurs', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: null,
        loading: false,
        error: 'Failed to load',
      })

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" />)

      expect(screen.getByTestId('error-state')).toBeInTheDocument()
      expect(screen.getByText('Oops!')).toBeInTheDocument()
      expect(screen.getByText("We couldn't load your screen time right now.")).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('shows empty state when no data', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: null,
        loading: false,
        error: null,
      })

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" />)

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      expect(screen.getByText('No screen time yet!')).toBeInTheDocument()
      expect(
        screen.getByText('When you use your devices, your screen time will show up here.')
      ).toBeInTheDocument()
    })

    it('shows empty state when data is zero', () => {
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

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" />)

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })
  })

  describe('AC1: Today total time shown', () => {
    it('displays today total time prominently', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: {
          todayMinutes: 120,
          todayCategories: [],
          todayDevices: [],
          weeklyData: [],
          weeklyAverage: 90,
          changeFromYesterday: 30,
        },
        loading: false,
        error: null,
      })

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" />)

      expect(screen.getByTestId('today-section')).toBeInTheDocument()
      expect(screen.getByText('2h')).toBeInTheDocument()
    })

    it('shows "You\'ve used today" label', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: {
          todayMinutes: 45,
          todayCategories: [],
          todayDevices: [],
          weeklyData: [],
          weeklyAverage: 60,
          changeFromYesterday: -15,
        },
        loading: false,
        error: null,
      })

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" />)

      expect(screen.getByText("You've used today")).toBeInTheDocument()
    })
  })

  describe('AC3: Child-appropriate language', () => {
    it('uses encouragement message for low screen time', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: {
          todayMinutes: 30,
          todayCategories: [],
          todayDevices: [],
          weeklyData: [],
          weeklyAverage: 60,
          changeFromYesterday: 0,
        },
        loading: false,
        error: null,
      })

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" />)

      expect(screen.getByTestId('encouragement-message')).toHaveTextContent(
        'Just getting started today!'
      )
    })

    it('uses balance message for moderate screen time', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: {
          todayMinutes: 90,
          todayCategories: [],
          todayDevices: [],
          weeklyData: [],
          weeklyAverage: 90,
          changeFromYesterday: 0,
        },
        loading: false,
        error: null,
      })

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" />)

      expect(screen.getByTestId('encouragement-message')).toHaveTextContent(
        'Nice work staying balanced!'
      )
    })

    it('uses break reminder for high screen time', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: {
          todayMinutes: 150,
          todayCategories: [],
          todayDevices: [],
          weeklyData: [],
          weeklyAverage: 120,
          changeFromYesterday: 30,
        },
        loading: false,
        error: null,
      })

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" />)

      expect(screen.getByTestId('encouragement-message')).toHaveTextContent(
        'Remember to take breaks!'
      )
    })

    it('uses offline suggestion for very high screen time', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: {
          todayMinutes: 200,
          todayCategories: [],
          todayDevices: [],
          weeklyData: [],
          weeklyAverage: 150,
          changeFromYesterday: 50,
        },
        loading: false,
        error: null,
      })

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" />)

      expect(screen.getByTestId('encouragement-message')).toHaveTextContent(
        'Consider doing something offline for a bit!'
      )
    })
  })

  describe('AC4: Comparison to limits', () => {
    it('shows remaining time when under limit', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: {
          todayMinutes: 60,
          todayCategories: [],
          todayDevices: [],
          weeklyData: [],
          weeklyAverage: 90,
          changeFromYesterday: 0,
        },
        loading: false,
        error: null,
      })

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" dailyLimit={120} />)

      const limitBadge = screen.getByTestId('limit-badge')
      expect(limitBadge).toHaveTextContent('1h left today')
    })

    it('shows over limit message when exceeded', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: {
          todayMinutes: 150,
          todayCategories: [],
          todayDevices: [],
          weeklyData: [],
          weeklyAverage: 120,
          changeFromYesterday: 30,
        },
        loading: false,
        error: null,
      })

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" dailyLimit={120} />)

      const limitBadge = screen.getByTestId('limit-badge')
      expect(limitBadge).toHaveTextContent('30m over your daily goal')
    })

    it('shows category remaining time when category limit set', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: {
          todayMinutes: 120,
          todayCategories: [
            { category: 'gaming', minutes: 30 },
            { category: 'education', minutes: 60 },
          ],
          todayDevices: [],
          weeklyData: [],
          weeklyAverage: 100,
          changeFromYesterday: 20,
        },
        loading: false,
        error: null,
      })

      render(
        <ChildScreenTimeCard
          familyId="family-1"
          childId="child-1"
          categoryLimits={{ gaming: 60 }}
        />
      )

      const gamingRow = screen.getByTestId('category-row-gaming')
      expect(gamingRow).toHaveTextContent('30m left')
    })
  })

  describe('AC2: Friendly visualization - category breakdown', () => {
    it('shows category breakdown section', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: {
          todayMinutes: 120,
          todayCategories: [
            { category: 'gaming', minutes: 60 },
            { category: 'education', minutes: 40 },
            { category: 'entertainment', minutes: 20 },
          ],
          todayDevices: [],
          weeklyData: [],
          weeklyAverage: 100,
          changeFromYesterday: 20,
        },
        loading: false,
        error: null,
      })

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" />)

      expect(screen.getByTestId('category-section')).toBeInTheDocument()
      expect(screen.getByText("What You've Been Doing")).toBeInTheDocument()
    })

    it('displays categories with times', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: {
          todayMinutes: 120,
          todayCategories: [
            { category: 'gaming', minutes: 60 },
            { category: 'education', minutes: 40 },
          ],
          todayDevices: [],
          weeklyData: [],
          weeklyAverage: 100,
          changeFromYesterday: 20,
        },
        loading: false,
        error: null,
      })

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" />)

      expect(screen.getByTestId('category-row-gaming')).toHaveTextContent('Gaming')
      expect(screen.getByTestId('category-row-gaming')).toHaveTextContent('1h')
      expect(screen.getByTestId('category-row-education')).toHaveTextContent('Education')
      expect(screen.getByTestId('category-row-education')).toHaveTextContent('40m')
    })

    it('limits to top 5 categories', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: {
          todayMinutes: 240,
          todayCategories: [
            { category: 'gaming', minutes: 60 },
            { category: 'education', minutes: 50 },
            { category: 'entertainment', minutes: 40 },
            { category: 'social_media', minutes: 35 },
            { category: 'productivity', minutes: 30 },
            { category: 'communication', minutes: 25 },
          ],
          todayDevices: [],
          weeklyData: [],
          weeklyAverage: 200,
          changeFromYesterday: 40,
        },
        loading: false,
        error: null,
      })

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" />)

      // Should show top 5 categories
      expect(screen.getByTestId('category-row-gaming')).toBeInTheDocument()
      expect(screen.getByTestId('category-row-education')).toBeInTheDocument()
      expect(screen.getByTestId('category-row-entertainment')).toBeInTheDocument()
      expect(screen.getByTestId('category-row-social_media')).toBeInTheDocument()
      expect(screen.getByTestId('category-row-productivity')).toBeInTheDocument()
      // 6th category should not be shown
      expect(screen.queryByTestId('category-row-communication')).not.toBeInTheDocument()
    })
  })

  describe('AC5: Historical view - weekly chart', () => {
    it('shows weekly section', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: {
          todayMinutes: 120,
          todayCategories: [{ category: 'gaming', minutes: 60 }],
          todayDevices: [],
          weeklyData: [
            { date: '2024-12-23', totalMinutes: 90, categories: [] },
            { date: '2024-12-24', totalMinutes: 110, categories: [] },
            { date: '2024-12-25', totalMinutes: 120, categories: [] },
          ],
          weeklyAverage: 107,
          changeFromYesterday: 10,
        },
        loading: false,
        error: null,
      })

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" />)

      expect(screen.getByTestId('weekly-section')).toBeInTheDocument()
      expect(screen.getByText('This Week')).toBeInTheDocument()
    })

    it('displays day rows with times', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: {
          todayMinutes: 120,
          todayCategories: [],
          todayDevices: [],
          weeklyData: [
            { date: '2024-12-23', totalMinutes: 90, categories: [] },
            { date: '2024-12-24', totalMinutes: 110, categories: [] },
          ],
          weeklyAverage: 100,
          changeFromYesterday: 10,
        },
        loading: false,
        error: null,
      })

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" />)

      expect(screen.getByTestId('weekly-chart')).toBeInTheDocument()
      expect(screen.getByTestId('day-row-2024-12-23')).toBeInTheDocument()
      expect(screen.getByTestId('day-row-2024-12-24')).toBeInTheDocument()
    })

    it('shows week comparison message', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: {
          todayMinutes: 120,
          todayCategories: [],
          todayDevices: [],
          weeklyData: [
            { date: '2024-12-22', totalMinutes: 80, categories: [] },
            { date: '2024-12-23', totalMinutes: 90, categories: [] },
            { date: '2024-12-24', totalMinutes: 110, categories: [] },
            { date: '2024-12-25', totalMinutes: 120, categories: [] },
          ],
          weeklyAverage: 100,
          changeFromYesterday: 10,
        },
        loading: false,
        error: null,
      })

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" />)

      expect(screen.getByTestId('week-comparison')).toBeInTheDocument()
    })

    it('shows first week message when no historical data', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: {
          todayMinutes: 120,
          todayCategories: [],
          todayDevices: [],
          weeklyData: [{ date: '2024-12-25', totalMinutes: 120, categories: [] }],
          weeklyAverage: 120,
          changeFromYesterday: 0,
        },
        loading: false,
        error: null,
      })

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" />)

      expect(screen.getByTestId('week-comparison')).toHaveTextContent(
        'This is your first week being tracked!'
      )
    })
  })

  describe('help link interaction', () => {
    it('calls onHelpClick when help link is clicked', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: null,
        loading: false,
        error: null,
      })

      const handleHelpClick = vi.fn()

      render(
        <ChildScreenTimeCard familyId="family-1" childId="child-1" onHelpClick={handleHelpClick} />
      )

      const helpLink = screen.getByTestId('help-link')
      fireEvent.click(helpLink)

      expect(handleHelpClick).toHaveBeenCalledTimes(1)
    })

    it('has accessible label', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: null,
        loading: false,
        error: null,
      })

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" />)

      const helpLink = screen.getByTestId('help-link')
      expect(helpLink).toHaveAttribute('aria-label', 'Learn about your screen time')
    })

    it('shows focus styling when focused', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: null,
        loading: false,
        error: null,
      })

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" />)

      const helpLink = screen.getByTestId('help-link')
      fireEvent.focus(helpLink)

      expect(helpLink).toHaveStyle({ outline: '2px solid #0ea5e9' })
    })
  })

  describe('accessibility', () => {
    it('has accessible category progress bars', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: {
          todayMinutes: 100,
          todayCategories: [{ category: 'gaming', minutes: 50 }],
          todayDevices: [],
          weeklyData: [],
          weeklyAverage: 100,
          changeFromYesterday: 0,
        },
        loading: false,
        error: null,
      })

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" />)

      const gamingRow = screen.getByTestId('category-row-gaming')
      const progressBar = gamingRow.querySelector('[role="progressbar"]')

      expect(progressBar).toHaveAttribute('aria-valuenow', '50')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
      expect(progressBar).toHaveAttribute('aria-label', 'Gaming: 50m')
    })

    it('has loading indicator with accessible text', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: null,
        loading: true,
        error: null,
      })

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" />)

      expect(screen.getByText('Getting your screen time...')).toBeInTheDocument()
    })
  })

  describe('encouragement with daily limit', () => {
    it('shows positive message when well under limit', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: {
          todayMinutes: 30,
          todayCategories: [],
          todayDevices: [],
          weeklyData: [],
          weeklyAverage: 60,
          changeFromYesterday: 0,
        },
        loading: false,
        error: null,
      })

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" dailyLimit={120} />)

      expect(screen.getByTestId('encouragement-message')).toHaveTextContent(
        "You're doing great! Plenty of time left today."
      )
    })

    it('shows balanced message when moderately used', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: {
          todayMinutes: 80,
          todayCategories: [],
          todayDevices: [],
          weeklyData: [],
          weeklyAverage: 90,
          changeFromYesterday: 0,
        },
        loading: false,
        error: null,
      })

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" dailyLimit={120} />)

      expect(screen.getByTestId('encouragement-message')).toHaveTextContent(
        'Nice balance! Keep it up.'
      )
    })

    it('shows break suggestion when nearing limit', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: {
          todayMinutes: 110,
          todayCategories: [],
          todayDevices: [],
          weeklyData: [],
          weeklyAverage: 100,
          changeFromYesterday: 10,
        },
        loading: false,
        error: null,
      })

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" dailyLimit={120} />)

      expect(screen.getByTestId('encouragement-message')).toHaveTextContent(
        'Almost at your daily goal. Time to take a break soon?'
      )
    })

    it('shows limit reached message when over limit', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: {
          todayMinutes: 150,
          todayCategories: [],
          todayDevices: [],
          weeklyData: [],
          weeklyAverage: 120,
          changeFromYesterday: 30,
        },
        loading: false,
        error: null,
      })

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" dailyLimit={120} />)

      expect(screen.getByTestId('encouragement-message')).toHaveTextContent(
        "You've reached your screen time for today."
      )
    })
  })

  describe('edge cases', () => {
    it('handles null familyId and childId', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: null,
        loading: false,
        error: null,
      })

      render(<ChildScreenTimeCard familyId={null} childId={null} />)

      expect(screen.getByTestId('child-screen-time-card')).toBeInTheDocument()
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })

    it('handles empty categories array', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: {
          todayMinutes: 60,
          todayCategories: [],
          todayDevices: [],
          weeklyData: [],
          weeklyAverage: 60,
          changeFromYesterday: 0,
        },
        loading: false,
        error: null,
      })

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" />)

      expect(screen.queryByTestId('category-section')).not.toBeInTheDocument()
    })

    it('handles empty weekly data', () => {
      mockUseChildScreenTime.mockReturnValue({
        data: {
          todayMinutes: 60,
          todayCategories: [{ category: 'gaming', minutes: 60 }],
          todayDevices: [],
          weeklyData: [],
          weeklyAverage: 60,
          changeFromYesterday: 0,
        },
        loading: false,
        error: null,
      })

      render(<ChildScreenTimeCard familyId="family-1" childId="child-1" />)

      expect(screen.queryByTestId('weekly-section')).not.toBeInTheDocument()
    })
  })
})
