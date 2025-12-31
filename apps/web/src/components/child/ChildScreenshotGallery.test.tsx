/**
 * ChildScreenshotGallery Tests - Story 19B.1 & 19B.2
 *
 * Story 19B.1 - Original tests
 * Story 19B.2 - Added tests for:
 * - Time-of-day sections (AC: #1)
 * - Day headers with counts (AC: #2)
 * - Gap indicators (AC: #3)
 * - Date navigation (AC: #4)
 * - View toggle (AC: #5)
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { ChildScreenshotGallery } from './ChildScreenshotGallery'
import type { ChildScreenshot } from '../../hooks/useChildScreenshots'

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn()
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
})
window.IntersectionObserver = mockIntersectionObserver

describe('ChildScreenshotGallery', () => {
  // Use fixed timestamps for consistent testing
  const todayMorning = new Date()
  todayMorning.setHours(9, 0, 0, 0)

  const todayAfternoon = new Date()
  todayAfternoon.setHours(14, 0, 0, 0)

  const yesterdayMorning = new Date()
  yesterdayMorning.setDate(yesterdayMorning.getDate() - 1)
  yesterdayMorning.setHours(10, 0, 0, 0)

  const mockScreenshots: ChildScreenshot[] = [
    {
      id: 'ss-1',
      imageUrl: 'https://example.com/1.png',
      timestamp: todayMorning.getTime(),
      url: 'https://youtube.com',
      title: 'Watching Videos',
      deviceId: 'device-1',
    },
    {
      id: 'ss-2',
      imageUrl: 'https://example.com/2.png',
      timestamp: todayAfternoon.getTime(),
      url: 'https://google.com',
      title: 'Searching',
      deviceId: 'device-1',
    },
    {
      id: 'ss-3',
      imageUrl: 'https://example.com/3.png',
      timestamp: yesterdayMorning.getTime(),
      url: 'https://roblox.com',
      title: 'Playing Roblox',
      deviceId: 'device-1',
    },
  ]

  const defaultProps = {
    screenshots: mockScreenshots,
    loading: false,
    loadingMore: false,
    hasMore: false,
    error: null,
    onLoadMore: vi.fn(),
    onSelectScreenshot: vi.fn(),
  }

  // Original Story 19B.1 tests
  describe('Story 19B.1 - Basic Gallery', () => {
    it('should render gallery with title', () => {
      render(<ChildScreenshotGallery {...defaultProps} />)

      expect(screen.getByTestId('child-screenshot-gallery')).toBeInTheDocument()
      expect(screen.getByTestId('gallery-title')).toHaveTextContent('Your Pictures')
    })

    it('should display loading state', () => {
      render(<ChildScreenshotGallery {...defaultProps} loading={true} screenshots={[]} />)

      expect(screen.getByTestId('gallery-loading')).toBeInTheDocument()
      expect(screen.getByText('Loading your pictures...')).toBeInTheDocument()
    })

    it('should display error state', () => {
      render(
        <ChildScreenshotGallery
          {...defaultProps}
          error="Failed to load your pictures"
          screenshots={[]}
        />
      )

      expect(screen.getByTestId('gallery-error')).toBeInTheDocument()
      expect(screen.getByText('Failed to load your pictures')).toBeInTheDocument()
    })

    it('should display empty state when no screenshots', () => {
      render(<ChildScreenshotGallery {...defaultProps} screenshots={[]} />)

      expect(screen.getByTestId('gallery-empty')).toBeInTheDocument()
      expect(screen.getByText('No pictures yet!')).toBeInTheDocument()
    })

    it('should display timeline with screenshots', () => {
      render(<ChildScreenshotGallery {...defaultProps} />)

      expect(screen.getByTestId('gallery-timeline')).toBeInTheDocument()
    })

    it('should group screenshots by day', () => {
      render(<ChildScreenshotGallery {...defaultProps} />)

      const dayHeaders = screen.getAllByTestId('day-header')
      expect(dayHeaders.length).toBeGreaterThanOrEqual(1)
    })

    it('should render screenshot cards', () => {
      render(<ChildScreenshotGallery {...defaultProps} />)

      expect(screen.getByTestId('screenshot-card-ss-1')).toBeInTheDocument()
      expect(screen.getByTestId('screenshot-card-ss-2')).toBeInTheDocument()
    })

    it('should call onSelectScreenshot when card is clicked', () => {
      const onSelect = vi.fn()
      render(<ChildScreenshotGallery {...defaultProps} onSelectScreenshot={onSelect} />)

      // Story 28.3: Click the button within the first screenshot card (article)
      const card = screen.getByTestId('screenshot-card-ss-1')
      const button = within(card).getByRole('button')
      fireEvent.click(button)

      expect(onSelect).toHaveBeenCalledWith(mockScreenshots[0])
    })

    it('should show load more trigger when hasMore is true', () => {
      render(<ChildScreenshotGallery {...defaultProps} hasMore={true} />)

      expect(screen.getByTestId('load-more-trigger')).toBeInTheDocument()
    })

    it('should use child-friendly language in subtitle', () => {
      render(<ChildScreenshotGallery {...defaultProps} />)

      expect(
        screen.getByText('These are pictures of what you were doing on your devices.')
      ).toBeInTheDocument()
    })
  })

  // Story 19B.2 tests - Day Headers with Counts (AC: #2)
  describe('Story 19B.2 - Day Headers with Counts (AC: #2)', () => {
    it('should display screenshot count in day header', () => {
      render(<ChildScreenshotGallery {...defaultProps} />)

      const dayCount = screen.getAllByTestId('day-count')[0]
      expect(dayCount).toBeInTheDocument()
      // Should show "X pictures" format
      expect(dayCount.textContent).toMatch(/\d+ pictures?/)
    })

    it('should show "Today" label for today\'s screenshots', () => {
      render(<ChildScreenshotGallery {...defaultProps} />)

      expect(screen.getByText('Today')).toBeInTheDocument()
    })

    it('should show "Yesterday" label for yesterday\'s screenshots', () => {
      render(<ChildScreenshotGallery {...defaultProps} />)

      expect(screen.getByText('Yesterday')).toBeInTheDocument()
    })

    it('should use singular "picture" for single screenshot', () => {
      const singleScreenshot = [mockScreenshots[0]]
      render(<ChildScreenshotGallery {...defaultProps} screenshots={singleScreenshot} />)

      expect(screen.getByTestId('day-count')).toHaveTextContent('1 picture')
    })
  })

  // Story 19B.2 tests - View Toggle (AC: #5)
  describe('Story 19B.2 - View Toggle (AC: #5)', () => {
    it('should render view toggle component', () => {
      render(<ChildScreenshotGallery {...defaultProps} />)

      expect(screen.getByTestId('view-toggle')).toBeInTheDocument()
    })

    it('should render grid and timeline toggle buttons', () => {
      render(<ChildScreenshotGallery {...defaultProps} />)

      expect(screen.getByTestId('view-toggle-grid')).toBeInTheDocument()
      expect(screen.getByTestId('view-toggle-timeline')).toBeInTheDocument()
    })

    it('should default to grid view', () => {
      render(<ChildScreenshotGallery {...defaultProps} />)

      const gridButton = screen.getByTestId('view-toggle-grid')
      expect(gridButton).toHaveAttribute('aria-checked', 'true')
    })

    it('should switch to timeline view when timeline button is clicked', () => {
      render(<ChildScreenshotGallery {...defaultProps} />)

      fireEvent.click(screen.getByTestId('view-toggle-timeline'))

      const timelineButton = screen.getByTestId('view-toggle-timeline')
      expect(timelineButton).toHaveAttribute('aria-checked', 'true')
    })

    it('should show time-of-day sections in timeline view', () => {
      render(<ChildScreenshotGallery {...defaultProps} />)

      // Switch to timeline view
      fireEvent.click(screen.getByTestId('view-toggle-timeline'))

      // Should show time sections (morning/afternoon based on mock data)
      // Use getAllByTestId since multiple days may have morning sections
      const morningSections = screen.getAllByTestId('time-section-morning')
      expect(morningSections.length).toBeGreaterThanOrEqual(1)
    })
  })

  // Story 19B.2 tests - Date Navigation (AC: #4)
  describe('Story 19B.2 - Date Navigation (AC: #4)', () => {
    it('should render calendar button', () => {
      render(<ChildScreenshotGallery {...defaultProps} />)

      expect(screen.getByTestId('calendar-button')).toBeInTheDocument()
    })

    it('should open date picker modal when calendar button is clicked', () => {
      render(<ChildScreenshotGallery {...defaultProps} />)

      fireEvent.click(screen.getByTestId('calendar-button'))

      expect(screen.getByTestId('date-picker-modal')).toBeInTheDocument()
    })

    it('should close date picker when close button is clicked', () => {
      render(<ChildScreenshotGallery {...defaultProps} />)

      fireEvent.click(screen.getByTestId('calendar-button'))
      fireEvent.click(screen.getByTestId('date-picker-close'))

      expect(screen.queryByTestId('date-picker-modal')).not.toBeInTheDocument()
    })

    it('should have calendar button with accessible label', () => {
      render(<ChildScreenshotGallery {...defaultProps} />)

      const calendarButton = screen.getByTestId('calendar-button')
      expect(calendarButton).toHaveAttribute('aria-label', 'Pick a date')
    })
  })

  // Story 19B.2 tests - Time-of-Day Sections (AC: #1)
  describe('Story 19B.2 - Time-of-Day Sections (AC: #1)', () => {
    it('should show time-of-day sections in timeline view', () => {
      render(<ChildScreenshotGallery {...defaultProps} />)

      // Switch to timeline view
      fireEvent.click(screen.getByTestId('view-toggle-timeline'))

      // Morning section should be visible (based on mock data)
      // Use getAllByTestId since multiple days may have morning sections
      const morningSections = screen.getAllByTestId('time-section-morning')
      expect(morningSections.length).toBeGreaterThanOrEqual(1)
    })

    it('should show multiple time sections for different times of day', () => {
      render(<ChildScreenshotGallery {...defaultProps} />)

      // Switch to timeline view
      fireEvent.click(screen.getByTestId('view-toggle-timeline'))

      // Both morning and afternoon should be visible for today
      // Use getAllByTestId since multiple days may have these sections
      const morningSections = screen.getAllByTestId('time-section-morning')
      const afternoonSections = screen.getAllByTestId('time-section-afternoon')
      expect(morningSections.length).toBeGreaterThanOrEqual(1)
      expect(afternoonSections.length).toBeGreaterThanOrEqual(1)
    })

    it('should display friendly time-of-day labels', () => {
      render(<ChildScreenshotGallery {...defaultProps} />)

      // Switch to timeline view
      fireEvent.click(screen.getByTestId('view-toggle-timeline'))

      // Use getAllByText since multiple days may show same labels
      const morningLabels = screen.getAllByText('Morning')
      const afternoonLabels = screen.getAllByText('Afternoon')
      expect(morningLabels.length).toBeGreaterThanOrEqual(1)
      expect(afternoonLabels.length).toBeGreaterThanOrEqual(1)
    })
  })

  // Story 19B.2 tests - Child-Friendly Language (AC: #6)
  describe('Story 19B.2 - Child-Friendly Language (AC: #6)', () => {
    it('should use "pictures" instead of "screenshots"', () => {
      render(<ChildScreenshotGallery {...defaultProps} />)

      expect(screen.getByText('Your Pictures')).toBeInTheDocument()
      expect(screen.queryByText(/screenshot/i)).not.toBeInTheDocument()
    })

    it('should use friendly empty state message', () => {
      render(<ChildScreenshotGallery {...defaultProps} screenshots={[]} />)

      expect(screen.getByText('No pictures yet!')).toBeInTheDocument()
      expect(
        screen.getByText(
          'Once you start using your device, pictures will show up here. Check back later!'
        )
      ).toBeInTheDocument()
    })
  })
})
