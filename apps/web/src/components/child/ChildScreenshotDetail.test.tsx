/**
 * ChildScreenshotDetail Tests - Story 19B.1
 *
 * Task 5.7: Create unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChildScreenshotDetail } from './ChildScreenshotDetail'
import type { ChildScreenshot } from '../../hooks/useChildScreenshots'

describe('ChildScreenshotDetail', () => {
  const mockScreenshots: ChildScreenshot[] = [
    {
      id: 'ss-1',
      imageUrl: 'https://example.com/1.png',
      timestamp: new Date('2024-01-01T14:30:00').getTime(),
      url: 'https://youtube.com/watch',
      title: 'Watching Videos',
      deviceId: 'tablet-1',
    },
    {
      id: 'ss-2',
      imageUrl: 'https://example.com/2.png',
      timestamp: new Date('2024-01-01T15:00:00').getTime(),
      url: 'https://google.com',
      title: 'Searching',
      deviceId: 'tablet-1',
    },
    {
      id: 'ss-3',
      imageUrl: 'https://example.com/3.png',
      timestamp: new Date('2024-01-01T16:00:00').getTime(),
      url: 'https://roblox.com',
      title: 'Playing Roblox',
      deviceId: 'tablet-1',
    },
  ]

  const defaultProps = {
    screenshot: mockScreenshots[1], // Middle screenshot for nav testing
    screenshots: mockScreenshots,
    onClose: vi.fn(),
    onNavigate: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render modal with correct test id', () => {
    render(<ChildScreenshotDetail {...defaultProps} />)

    expect(screen.getByTestId('screenshot-detail-modal')).toBeInTheDocument()
  })

  it('should display screenshot title', () => {
    render(<ChildScreenshotDetail {...defaultProps} />)

    expect(screen.getByTestId('detail-title')).toHaveTextContent('Searching')
  })

  it('should display timestamp', () => {
    render(<ChildScreenshotDetail {...defaultProps} />)

    expect(screen.getByTestId('detail-timestamp')).toBeInTheDocument()
  })

  it('should display transparency label (AC5.4)', () => {
    render(<ChildScreenshotDetail {...defaultProps} />)

    expect(screen.getByTestId('transparency-label')).toBeInTheDocument()
    expect(screen.getByText('This is what your parent can see. No secrets!')).toBeInTheDocument()
  })

  it('should display device info', () => {
    render(<ChildScreenshotDetail {...defaultProps} />)

    expect(screen.getByTestId('detail-device')).toHaveTextContent('tablet-1')
  })

  it('should display website/URL info', () => {
    render(<ChildScreenshotDetail {...defaultProps} />)

    expect(screen.getByTestId('detail-url')).toHaveTextContent('google.com')
  })

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<ChildScreenshotDetail {...defaultProps} onClose={onClose} />)

    fireEvent.click(screen.getByTestId('close-button'))

    expect(onClose).toHaveBeenCalled()
  })

  it('should call onClose when overlay is clicked', () => {
    const onClose = vi.fn()
    render(<ChildScreenshotDetail {...defaultProps} onClose={onClose} />)

    fireEvent.click(screen.getByTestId('screenshot-detail-modal'))

    expect(onClose).toHaveBeenCalled()
  })

  it('should call onClose when Escape key is pressed', () => {
    const onClose = vi.fn()
    render(<ChildScreenshotDetail {...defaultProps} onClose={onClose} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalled()
  })

  it('should navigate to previous screenshot when prev button is clicked', () => {
    const onNavigate = vi.fn()
    render(<ChildScreenshotDetail {...defaultProps} onNavigate={onNavigate} />)

    fireEvent.click(screen.getByTestId('prev-button'))

    expect(onNavigate).toHaveBeenCalledWith(mockScreenshots[0])
  })

  it('should navigate to next screenshot when next button is clicked', () => {
    const onNavigate = vi.fn()
    render(<ChildScreenshotDetail {...defaultProps} onNavigate={onNavigate} />)

    fireEvent.click(screen.getByTestId('next-button'))

    expect(onNavigate).toHaveBeenCalledWith(mockScreenshots[2])
  })

  it('should navigate with arrow keys', () => {
    const onNavigate = vi.fn()
    render(<ChildScreenshotDetail {...defaultProps} onNavigate={onNavigate} />)

    fireEvent.keyDown(document, { key: 'ArrowLeft' })
    expect(onNavigate).toHaveBeenCalledWith(mockScreenshots[0])

    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(onNavigate).toHaveBeenCalledWith(mockScreenshots[2])
  })

  it('should disable prev button on first screenshot', () => {
    render(<ChildScreenshotDetail {...defaultProps} screenshot={mockScreenshots[0]} />)

    const prevButton = screen.getByTestId('prev-button')
    expect(prevButton).toBeDisabled()
  })

  it('should disable next button on last screenshot', () => {
    render(<ChildScreenshotDetail {...defaultProps} screenshot={mockScreenshots[2]} />)

    const nextButton = screen.getByTestId('next-button')
    expect(nextButton).toBeDisabled()
  })

  it('should have dialog role and aria-modal', () => {
    render(<ChildScreenshotDetail {...defaultProps} />)

    const modal = screen.getByTestId('screenshot-detail-modal')
    expect(modal).toHaveAttribute('role', 'dialog')
    expect(modal).toHaveAttribute('aria-modal', 'true')
  })

  it('should show placeholder when image URL is empty', () => {
    render(
      <ChildScreenshotDetail
        {...defaultProps}
        screenshot={{ ...mockScreenshots[1], imageUrl: '' }}
      />
    )

    expect(screen.getByTestId('detail-placeholder')).toBeInTheDocument()
    expect(screen.getByText('Picture not available')).toBeInTheDocument()
  })
})
