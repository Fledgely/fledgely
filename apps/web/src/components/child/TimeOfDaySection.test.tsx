/**
 * TimeOfDaySection Tests - Story 19B.2
 *
 * Task 1.5: Create unit tests for time grouping components
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TimeOfDaySection } from './TimeOfDaySection'
import type { TimeOfDayGroup } from './timelineUtils'
import type { ChildScreenshot } from '../../hooks/useChildScreenshots'

// Mock screenshot data
const mockScreenshots: ChildScreenshot[] = [
  {
    id: 'ss-1',
    imageUrl: 'https://example.com/1.png',
    timestamp: new Date('2024-01-15T09:00:00').getTime(),
    url: 'https://youtube.com',
    title: 'Watching Videos',
    deviceId: 'tablet-1',
  },
  {
    id: 'ss-2',
    imageUrl: 'https://example.com/2.png',
    timestamp: new Date('2024-01-15T10:00:00').getTime(),
    url: 'https://google.com',
    title: 'Searching',
    deviceId: 'tablet-1',
  },
]

const mockGroup: TimeOfDayGroup = {
  timeOfDay: 'morning',
  config: {
    key: 'morning',
    label: 'Morning',
    icon: '🌅',
    startHour: 6,
    endHour: 12,
  },
  screenshots: mockScreenshots,
}

describe('TimeOfDaySection', () => {
  const defaultProps = {
    group: mockGroup,
    onSelectScreenshot: vi.fn(),
  }

  it('should render section with correct test id', () => {
    render(<TimeOfDaySection {...defaultProps} />)

    expect(screen.getByTestId('time-section-morning')).toBeInTheDocument()
  })

  it('should display time-of-day label', () => {
    render(<TimeOfDaySection {...defaultProps} />)

    expect(screen.getByText('Morning')).toBeInTheDocument()
  })

  it('should display time-of-day icon', () => {
    render(<TimeOfDaySection {...defaultProps} />)

    const header = screen.getByTestId('time-section-header-morning')
    expect(header).toHaveTextContent('🌅')
  })

  it('should display screenshot count', () => {
    render(<TimeOfDaySection {...defaultProps} />)

    expect(screen.getByTestId('time-section-count-morning')).toHaveTextContent('2 pictures')
  })

  it('should use singular "picture" for count of 1', () => {
    const singleScreenshotGroup: TimeOfDayGroup = {
      ...mockGroup,
      screenshots: [mockScreenshots[0]],
    }

    render(<TimeOfDaySection {...defaultProps} group={singleScreenshotGroup} />)

    expect(screen.getByTestId('time-section-count-morning')).toHaveTextContent('1 picture')
  })

  it('should render all screenshots in the group', () => {
    render(<TimeOfDaySection {...defaultProps} />)

    expect(screen.getByTestId('screenshot-card-ss-1')).toBeInTheDocument()
    expect(screen.getByTestId('screenshot-card-ss-2')).toBeInTheDocument()
  })

  it('should call onSelectScreenshot when screenshot is clicked', () => {
    const onSelectScreenshot = vi.fn()
    render(<TimeOfDaySection {...defaultProps} onSelectScreenshot={onSelectScreenshot} />)

    fireEvent.click(screen.getByTestId('screenshot-card-ss-1'))

    expect(onSelectScreenshot).toHaveBeenCalledWith(mockScreenshots[0])
  })

  it('should have accessible role and aria-labelledby', () => {
    render(<TimeOfDaySection {...defaultProps} />)

    const section = screen.getByTestId('time-section-morning')
    expect(section).toHaveAttribute('role', 'region')
    expect(section).toHaveAttribute('aria-labelledby', 'time-section-label-morning')
  })

  it('should render different time periods correctly', () => {
    const afternoonGroup: TimeOfDayGroup = {
      timeOfDay: 'afternoon',
      config: {
        key: 'afternoon',
        label: 'Afternoon',
        icon: '☀️',
        startHour: 12,
        endHour: 18,
      },
      screenshots: [mockScreenshots[0]],
    }

    render(<TimeOfDaySection {...defaultProps} group={afternoonGroup} />)

    expect(screen.getByTestId('time-section-afternoon')).toBeInTheDocument()
    expect(screen.getByText('Afternoon')).toBeInTheDocument()
    expect(screen.getByTestId('time-section-header-afternoon')).toHaveTextContent('☀️')
  })

  it('should render evening section correctly', () => {
    const eveningGroup: TimeOfDayGroup = {
      timeOfDay: 'evening',
      config: {
        key: 'evening',
        label: 'Evening',
        icon: '🌆',
        startHour: 18,
        endHour: 24,
      },
      screenshots: [mockScreenshots[0]],
    }

    render(<TimeOfDaySection {...defaultProps} group={eveningGroup} />)

    expect(screen.getByText('Evening')).toBeInTheDocument()
  })

  it('should render night section correctly', () => {
    const nightGroup: TimeOfDayGroup = {
      timeOfDay: 'night',
      config: {
        key: 'night',
        label: 'Night',
        icon: '🌙',
        startHour: 0,
        endHour: 6,
      },
      screenshots: [mockScreenshots[0]],
    }

    render(<TimeOfDaySection {...defaultProps} group={nightGroup} />)

    expect(screen.getByText('Night')).toBeInTheDocument()
  })
})
