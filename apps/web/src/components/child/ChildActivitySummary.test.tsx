/**
 * ChildActivitySummary Tests - Story 19B.4
 *
 * Tests for activity summary component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChildActivitySummary } from './ChildActivitySummary'
import type { ChildScreenshot } from '../../hooks/useChildScreenshots'

// Mock screenshot data
const createMockScreenshot = (id: string, timestamp: number, url: string): ChildScreenshot => ({
  id,
  imageUrl: `https://example.com/image-${id}.png`,
  timestamp,
  url,
  title: `Screenshot ${id}`,
  deviceId: 'device-1',
})

// Helper to create timestamps for different times of day
// Uses mocked time set in beforeEach: Wednesday, Dec 25, 2024 at 14:30
const createTimestamp = (hour: number, daysAgo = 0): number => {
  // Based on mocked time: Dec 25, 2024
  const date = new Date(2024, 11, 25 - daysAgo, hour, 0, 0)
  return date.getTime()
}

describe('ChildActivitySummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock current date to ensure consistent tests
    vi.useFakeTimers()
    // Set to Wednesday, Dec 25, 2024 at 14:30:00
    vi.setSystemTime(new Date(2024, 11, 25, 14, 30, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('rendering', () => {
    it('renders the component with title', () => {
      render(<ChildActivitySummary screenshots={[]} loading={false} />)

      expect(screen.getByTestId('child-activity-summary')).toBeInTheDocument()
      expect(screen.getByText('Your Day in Review')).toBeInTheDocument()
    })

    it('renders help link', () => {
      render(<ChildActivitySummary screenshots={[]} loading={false} />)

      const helpLink = screen.getByTestId('help-link')
      expect(helpLink).toBeInTheDocument()
      expect(helpLink).toHaveTextContent('Why am I seeing this?')
    })
  })

  describe('loading state', () => {
    it('shows loading state when loading is true', () => {
      render(<ChildActivitySummary screenshots={[]} loading={true} />)

      expect(screen.getByTestId('summary-loading')).toBeInTheDocument()
      expect(screen.getByText('Getting your activity...')).toBeInTheDocument()
    })

    it('does not show content when loading', () => {
      render(<ChildActivitySummary screenshots={[]} loading={true} />)

      expect(screen.queryByTestId('stats-grid')).not.toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('shows empty state when no screenshots', () => {
      render(<ChildActivitySummary screenshots={[]} loading={false} />)

      expect(screen.getByTestId('summary-empty')).toBeInTheDocument()
      expect(screen.getByText('No activity yet!')).toBeInTheDocument()
      expect(
        screen.getByText('When you use your device, your activity will show up here.')
      ).toBeInTheDocument()
    })

    it('does not show stats when empty', () => {
      render(<ChildActivitySummary screenshots={[]} loading={false} />)

      expect(screen.queryByTestId('stats-grid')).not.toBeInTheDocument()
    })
  })

  describe('AC1: total screenshots display', () => {
    it('shows today count', () => {
      const screenshots = [
        createMockScreenshot('1', createTimestamp(10), 'https://example.com'),
        createMockScreenshot('2', createTimestamp(14), 'https://example.com'),
      ]

      render(<ChildActivitySummary screenshots={screenshots} loading={false} />)

      const todayStat = screen.getByTestId('stat-today')
      expect(todayStat).toHaveTextContent('2')
      expect(todayStat).toHaveTextContent('Screenshots today')
    })

    it('shows week count', () => {
      // Dec 25, 2024 is Wednesday, week starts on Sunday Dec 22
      // Dec 23 (2 days ago) = Monday, in this week
      // Dec 22 (3 days ago) = Sunday, start of this week, in this week
      const screenshots = [
        createMockScreenshot('1', createTimestamp(10), 'https://example.com'), // today (Wed Dec 25)
        createMockScreenshot('2', createTimestamp(14, 2), 'https://example.com'), // Mon Dec 23
        createMockScreenshot('3', createTimestamp(9, 3), 'https://example.com'), // Sun Dec 22 (start of week)
      ]

      render(<ChildActivitySummary screenshots={screenshots} loading={false} />)

      const weekStat = screen.getByTestId('stat-week')
      expect(weekStat).toHaveTextContent('3')
      expect(weekStat).toHaveTextContent('Screenshots this week')
    })

    it('shows zero counts correctly', () => {
      // Screenshot from 10 days ago (not today, not this week if week started less than 10 days ago)
      const screenshots = [
        createMockScreenshot('1', createTimestamp(10, 10), 'https://example.com'),
      ]

      render(<ChildActivitySummary screenshots={screenshots} loading={false} />)

      const todayStat = screen.getByTestId('stat-today')
      expect(todayStat).toHaveTextContent('0')
    })
  })

  describe('AC2: most captured apps', () => {
    it('shows top apps section', () => {
      const screenshots = [
        createMockScreenshot('1', createTimestamp(10), 'https://youtube.com/watch'),
        createMockScreenshot('2', createTimestamp(11), 'https://youtube.com/home'),
        createMockScreenshot('3', createTimestamp(12), 'https://google.com'),
      ]

      render(<ChildActivitySummary screenshots={screenshots} loading={false} />)

      expect(screen.getByTestId('top-apps-section')).toBeInTheDocument()
      expect(screen.getByText('Most Visited Sites')).toBeInTheDocument()
    })

    it('displays top 3 apps with counts', () => {
      const screenshots = [
        createMockScreenshot('1', createTimestamp(10), 'https://youtube.com/watch'),
        createMockScreenshot('2', createTimestamp(11), 'https://youtube.com/home'),
        createMockScreenshot('3', createTimestamp(12), 'https://youtube.com/video'),
        createMockScreenshot('4', createTimestamp(13), 'https://google.com/search'),
        createMockScreenshot('5', createTimestamp(14), 'https://google.com'),
        createMockScreenshot('6', createTimestamp(15), 'https://facebook.com'),
      ]

      render(<ChildActivitySummary screenshots={screenshots} loading={false} />)

      const app0 = screen.getByTestId('app-item-0')
      const app1 = screen.getByTestId('app-item-1')
      const app2 = screen.getByTestId('app-item-2')

      expect(app0).toHaveTextContent('youtube.com')
      expect(app0).toHaveTextContent('3 times')
      expect(app1).toHaveTextContent('google.com')
      expect(app1).toHaveTextContent('2 times')
      expect(app2).toHaveTextContent('facebook.com')
      expect(app2).toHaveTextContent('1 time')
    })

    it('handles less than 3 apps', () => {
      const screenshots = [createMockScreenshot('1', createTimestamp(10), 'https://youtube.com')]

      render(<ChildActivitySummary screenshots={screenshots} loading={false} />)

      expect(screen.getByTestId('app-item-0')).toBeInTheDocument()
      expect(screen.queryByTestId('app-item-1')).not.toBeInTheDocument()
    })

    it('shows "No sites recorded" when all URLs are unknown', () => {
      const screenshots = [createMockScreenshot('1', createTimestamp(10), '')]

      render(<ChildActivitySummary screenshots={screenshots} loading={false} />)

      expect(screen.getByTestId('no-apps-message')).toBeInTheDocument()
      expect(screen.getByText('No sites recorded yet')).toBeInTheDocument()
    })
  })

  describe('AC3: time distribution', () => {
    it('shows time distribution section', () => {
      const screenshots = [createMockScreenshot('1', createTimestamp(10), 'https://example.com')]

      render(<ChildActivitySummary screenshots={screenshots} loading={false} />)

      expect(screen.getByTestId('time-distribution-section')).toBeInTheDocument()
      expect(screen.getByText('When You Were Online')).toBeInTheDocument()
    })

    it('displays all time periods', () => {
      const screenshots = [
        createMockScreenshot('1', createTimestamp(8), 'https://example.com'), // morning
        createMockScreenshot('2', createTimestamp(14), 'https://example.com'), // afternoon
        createMockScreenshot('3', createTimestamp(20), 'https://example.com'), // evening
        createMockScreenshot('4', createTimestamp(2), 'https://example.com'), // night
      ]

      render(<ChildActivitySummary screenshots={screenshots} loading={false} />)

      expect(screen.getByTestId('time-row-morning')).toBeInTheDocument()
      expect(screen.getByTestId('time-row-afternoon')).toBeInTheDocument()
      expect(screen.getByTestId('time-row-evening')).toBeInTheDocument()
      expect(screen.getByTestId('time-row-night')).toBeInTheDocument()
    })

    it('shows correct percentages', () => {
      const screenshots = [
        createMockScreenshot('1', createTimestamp(8), 'https://example.com'), // morning
        createMockScreenshot('2', createTimestamp(9), 'https://example.com'), // morning
        createMockScreenshot('3', createTimestamp(14), 'https://example.com'), // afternoon
        createMockScreenshot('4', createTimestamp(15), 'https://example.com'), // afternoon
      ]

      render(<ChildActivitySummary screenshots={screenshots} loading={false} />)

      // 2/4 = 50% for morning and afternoon, 0% for evening and night
      const morningRow = screen.getByTestId('time-row-morning')
      const afternoonRow = screen.getByTestId('time-row-afternoon')
      const eveningRow = screen.getByTestId('time-row-evening')
      const nightRow = screen.getByTestId('time-row-night')

      expect(morningRow).toHaveTextContent('50%')
      expect(afternoonRow).toHaveTextContent('50%')
      expect(eveningRow).toHaveTextContent('0%')
      expect(nightRow).toHaveTextContent('0%')
    })

    it('renders progress bars with correct widths', () => {
      const screenshots = [
        createMockScreenshot('1', createTimestamp(8), 'https://example.com'), // morning
        createMockScreenshot('2', createTimestamp(14), 'https://example.com'), // afternoon
        createMockScreenshot('3', createTimestamp(14), 'https://example.com'), // afternoon
        createMockScreenshot('4', createTimestamp(14), 'https://example.com'), // afternoon
      ]

      render(<ChildActivitySummary screenshots={screenshots} loading={false} />)

      const morningBar = screen.getByTestId('time-bar-morning')
      const afternoonBar = screen.getByTestId('time-bar-afternoon')

      // 1/4 = 25% morning, 3/4 = 75% afternoon
      expect(morningBar).toHaveStyle({ width: '25%' })
      expect(afternoonBar).toHaveStyle({ width: '75%' })
    })
  })

  describe('AC4: child-friendly language', () => {
    it('uses "Your Day in Review" title', () => {
      render(<ChildActivitySummary screenshots={[]} loading={false} />)

      expect(screen.getByText('Your Day in Review')).toBeInTheDocument()
    })

    it('uses "Screenshots today/this week" labels', () => {
      const screenshots = [createMockScreenshot('1', createTimestamp(10), 'https://example.com')]

      render(<ChildActivitySummary screenshots={screenshots} loading={false} />)

      expect(screen.getByText('Screenshots today')).toBeInTheDocument()
      expect(screen.getByText('Screenshots this week')).toBeInTheDocument()
    })

    it('uses "Most Visited Sites" for apps section', () => {
      const screenshots = [createMockScreenshot('1', createTimestamp(10), 'https://example.com')]

      render(<ChildActivitySummary screenshots={screenshots} loading={false} />)

      expect(screen.getByText('Most Visited Sites')).toBeInTheDocument()
    })

    it('uses "When You Were Online" for time distribution', () => {
      const screenshots = [createMockScreenshot('1', createTimestamp(10), 'https://example.com')]

      render(<ChildActivitySummary screenshots={screenshots} loading={false} />)

      expect(screen.getByText('When You Were Online')).toBeInTheDocument()
    })

    it('uses friendly time of day labels', () => {
      const screenshots = [createMockScreenshot('1', createTimestamp(8), 'https://example.com')]

      render(<ChildActivitySummary screenshots={screenshots} loading={false} />)

      expect(screen.getByText('Morning')).toBeInTheDocument()
      expect(screen.getByText('Afternoon')).toBeInTheDocument()
      expect(screen.getByText('Evening')).toBeInTheDocument()
      expect(screen.getByText('Night')).toBeInTheDocument()
    })
  })

  describe('AC6: help link', () => {
    it('calls onHelpClick when help link is clicked', () => {
      const handleHelpClick = vi.fn()

      render(
        <ChildActivitySummary screenshots={[]} loading={false} onHelpClick={handleHelpClick} />
      )

      const helpLink = screen.getByTestId('help-link')
      fireEvent.click(helpLink)

      expect(handleHelpClick).toHaveBeenCalledTimes(1)
    })

    it('handles keyboard navigation (Enter/Space are native button behavior)', () => {
      const handleHelpClick = vi.fn()

      render(
        <ChildActivitySummary screenshots={[]} loading={false} onHelpClick={handleHelpClick} />
      )

      const helpLink = screen.getByTestId('help-link')
      // Buttons natively handle Enter and Space keys
      // We just verify the button exists and is focusable
      expect(helpLink.tagName).toBe('BUTTON')
    })

    it('has accessible label', () => {
      render(<ChildActivitySummary screenshots={[]} loading={false} />)

      const helpLink = screen.getByTestId('help-link')
      expect(helpLink).toHaveAttribute('aria-label', 'Learn why you see this activity summary')
    })

    it('shows focus styling when focused', () => {
      render(<ChildActivitySummary screenshots={[]} loading={false} />)

      const helpLink = screen.getByTestId('help-link')
      fireEvent.focus(helpLink)

      // Focus state should apply outline styling
      expect(helpLink).toHaveStyle({ outline: '2px solid #0ea5e9' })
    })
  })

  describe('accessibility', () => {
    it('has accessible time distribution bars', () => {
      const screenshots = [
        createMockScreenshot('1', createTimestamp(8), 'https://example.com'),
        createMockScreenshot('2', createTimestamp(9), 'https://example.com'),
      ]

      render(<ChildActivitySummary screenshots={screenshots} loading={false} />)

      const morningRow = screen.getByTestId('time-row-morning')
      const progressBar = morningRow.querySelector('[role="progressbar"]')

      expect(progressBar).toHaveAttribute('aria-valuenow', '100')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
      expect(progressBar).toHaveAttribute('aria-label', 'Morning: 100%')
    })

    it('icons are hidden from screen readers', () => {
      const screenshots = [createMockScreenshot('1', createTimestamp(8), 'https://example.com')]

      render(<ChildActivitySummary screenshots={screenshots} loading={false} />)

      // Main icon should be hidden
      const container = screen.getByTestId('child-activity-summary')
      const icons = container.querySelectorAll('[aria-hidden="true"]')
      expect(icons.length).toBeGreaterThan(0)
    })
  })

  describe('edge cases', () => {
    it('handles screenshots with invalid URLs', () => {
      const screenshots = [createMockScreenshot('1', createTimestamp(10), 'not-a-valid-url')]

      render(<ChildActivitySummary screenshots={screenshots} loading={false} />)

      // Should still render without crashing
      expect(screen.getByTestId('child-activity-summary')).toBeInTheDocument()
    })

    it('handles single screenshot correctly', () => {
      const screenshots = [createMockScreenshot('1', createTimestamp(10), 'https://example.com')]

      render(<ChildActivitySummary screenshots={screenshots} loading={false} />)

      expect(screen.getByTestId('stat-today')).toHaveTextContent('1')
      expect(screen.getByTestId('app-item-0')).toHaveTextContent('1 time')
    })

    it('handles many screenshots without performance issues', () => {
      const screenshots = Array.from({ length: 100 }, (_, i) =>
        createMockScreenshot(
          String(i),
          createTimestamp(8 + (i % 16), Math.floor(i / 20)),
          `https://site${i % 10}.com`
        )
      )

      const startTime = performance.now()
      render(<ChildActivitySummary screenshots={screenshots} loading={false} />)
      const endTime = performance.now()

      // Should render in reasonable time
      expect(endTime - startTime).toBeLessThan(500)
      expect(screen.getByTestId('child-activity-summary')).toBeInTheDocument()
    })
  })
})
