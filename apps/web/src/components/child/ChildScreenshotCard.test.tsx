/**
 * ChildScreenshotCard Tests - Story 19B.1
 *
 * Task 4.6: Create unit tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChildScreenshotCard } from './ChildScreenshotCard'
import type { ChildScreenshot } from '../../hooks/useChildScreenshots'

describe('ChildScreenshotCard', () => {
  const mockScreenshot: ChildScreenshot = {
    id: 'ss-1',
    imageUrl: 'https://example.com/screenshot.png',
    timestamp: new Date('2024-01-01T14:30:00').getTime(),
    url: 'https://youtube.com/watch',
    title: 'Watching Videos',
    deviceId: 'device-1',
  }

  const defaultProps = {
    screenshot: mockScreenshot,
    onClick: vi.fn(),
  }

  it('should render card with correct test id', () => {
    render(<ChildScreenshotCard {...defaultProps} />)

    expect(screen.getByTestId('screenshot-card-ss-1')).toBeInTheDocument()
  })

  it('should display time in friendly format', () => {
    render(<ChildScreenshotCard {...defaultProps} />)

    // Time format: "2:30 PM"
    expect(screen.getByTestId('screenshot-time')).toBeInTheDocument()
  })

  it('should display screenshot title', () => {
    render(<ChildScreenshotCard {...defaultProps} />)

    expect(screen.getByTestId('screenshot-details')).toHaveTextContent('Watching Videos')
  })

  it('should call onClick when card is clicked', () => {
    const onClick = vi.fn()
    render(<ChildScreenshotCard {...defaultProps} onClick={onClick} />)

    fireEvent.click(screen.getByTestId('screenshot-card-ss-1'))

    expect(onClick).toHaveBeenCalled()
  })

  it('should call onClick when Enter key is pressed', () => {
    const onClick = vi.fn()
    render(<ChildScreenshotCard {...defaultProps} onClick={onClick} />)

    const card = screen.getByTestId('screenshot-card-ss-1')
    fireEvent.keyDown(card, { key: 'Enter' })

    expect(onClick).toHaveBeenCalled()
  })

  it('should call onClick when Space key is pressed', () => {
    const onClick = vi.fn()
    render(<ChildScreenshotCard {...defaultProps} onClick={onClick} />)

    const card = screen.getByTestId('screenshot-card-ss-1')
    fireEvent.keyDown(card, { key: ' ' })

    expect(onClick).toHaveBeenCalled()
  })

  it('should have correct aria-label for accessibility', () => {
    render(<ChildScreenshotCard {...defaultProps} />)

    const card = screen.getByTestId('screenshot-card-ss-1')
    expect(card).toHaveAttribute('aria-label')
    expect(card.getAttribute('aria-label')).toContain('Watching Videos')
  })

  it('should have role button and tabIndex for keyboard navigation', () => {
    render(<ChildScreenshotCard {...defaultProps} />)

    const card = screen.getByTestId('screenshot-card-ss-1')
    expect(card).toHaveAttribute('role', 'button')
    expect(card).toHaveAttribute('tabIndex', '0')
  })

  it('should show placeholder when image fails to load', () => {
    render(
      <ChildScreenshotCard {...defaultProps} screenshot={{ ...mockScreenshot, imageUrl: '' }} />
    )

    expect(screen.getByTestId('screenshot-placeholder')).toBeInTheDocument()
  })

  it('should show overlay element', () => {
    render(<ChildScreenshotCard {...defaultProps} />)

    expect(screen.getByTestId('screenshot-overlay')).toBeInTheDocument()
  })

  it('should extract domain from URL when title is missing', () => {
    render(<ChildScreenshotCard {...defaultProps} screenshot={{ ...mockScreenshot, title: '' }} />)

    expect(screen.getByTestId('screenshot-details')).toHaveTextContent('youtube.com')
  })
})
