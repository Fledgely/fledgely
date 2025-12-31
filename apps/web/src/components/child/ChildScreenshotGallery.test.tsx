/**
 * ChildScreenshotGallery Tests - Story 19B.1
 *
 * Task 3.7: Create unit tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
  const mockScreenshots: ChildScreenshot[] = [
    {
      id: 'ss-1',
      imageUrl: 'https://example.com/1.png',
      timestamp: Date.now(),
      url: 'https://youtube.com',
      title: 'Watching Videos',
      deviceId: 'device-1',
    },
    {
      id: 'ss-2',
      imageUrl: 'https://example.com/2.png',
      timestamp: Date.now() - 86400000, // Yesterday
      url: 'https://google.com',
      title: 'Searching',
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
    expect(screen.getByTestId('day-group-today')).toBeInTheDocument()
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

    fireEvent.click(screen.getByTestId('screenshot-card-ss-1'))

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
