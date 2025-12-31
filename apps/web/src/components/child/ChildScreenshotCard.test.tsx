/**
 * ChildScreenshotCard Tests - Story 19B.1 & Story 28.3
 *
 * Story 19B.1 - Task 4.6: Create unit tests
 * Story 28.3 - Screen Reader Integration: AC1, AC2, AC3, AC4, AC5
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

    // Story 28.3: Click the button within the article element
    const button = screen.getByRole('button', { name: /screenshot from/i })
    fireEvent.click(button)

    expect(onClick).toHaveBeenCalled()
  })

  it('should call onClick when Enter key is pressed', () => {
    const onClick = vi.fn()
    render(<ChildScreenshotCard {...defaultProps} onClick={onClick} />)

    // Story 28.3: Find the button and press Enter
    const button = screen.getByRole('button', { name: /screenshot from/i })
    fireEvent.keyDown(button, { key: 'Enter' })

    expect(onClick).toHaveBeenCalled()
  })

  it('should call onClick when Space key is pressed', () => {
    const onClick = vi.fn()
    render(<ChildScreenshotCard {...defaultProps} onClick={onClick} />)

    // Story 28.3: Find the button and press Space
    const button = screen.getByRole('button', { name: /screenshot from/i })
    fireEvent.keyDown(button, { key: ' ' })

    expect(onClick).toHaveBeenCalled()
  })

  it('should have correct aria-label for accessibility', () => {
    render(<ChildScreenshotCard {...defaultProps} />)

    // Story 28.3: Button has the aria-label
    const button = screen.getByRole('button', { name: /screenshot from/i })
    expect(button).toHaveAttribute('aria-label')
    expect(button.getAttribute('aria-label')).toContain('Watching Videos')
  })

  it('should have role button and tabIndex for keyboard navigation', () => {
    render(<ChildScreenshotCard {...defaultProps} />)

    // Story 28.3: Button is properly accessible
    const button = screen.getByRole('button', { name: /screenshot from/i })
    expect(button).toHaveAttribute('role', 'button')
    expect(button).toHaveAttribute('tabIndex', '0')
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

  // Story 28.3: Screen Reader Integration Tests

  describe('accessibility description (Story 28.3)', () => {
    const screenshotWithDescription: ChildScreenshot = {
      ...mockScreenshot,
      accessibilityDescription: {
        status: 'completed',
        description:
          'The YouTube app shows a paused video titled "Minecraft Building Tutorial". The video player interface is visible with play controls at the bottom.',
        wordCount: 150,
      },
    }

    it('should use accessibility description as alt-text when available (AC1)', () => {
      render(<ChildScreenshotCard {...defaultProps} screenshot={screenshotWithDescription} />)

      const img = screen.getByRole('img')
      expect(img).toHaveAttribute('alt')
      expect(img.getAttribute('alt')).toContain('YouTube app shows a paused video')
    })

    it('should use fallback alt-text when description unavailable (AC1)', () => {
      render(<ChildScreenshotCard {...defaultProps} />)

      const img = screen.getByRole('img')
      expect(img).toHaveAttribute('alt', 'Screenshot: Watching Videos')
    })

    it('should use fallback alt-text when description is pending (AC1)', () => {
      const pendingScreenshot: ChildScreenshot = {
        ...mockScreenshot,
        accessibilityDescription: {
          status: 'pending',
        },
      }
      render(<ChildScreenshotCard {...defaultProps} screenshot={pendingScreenshot} />)

      const img = screen.getByRole('img')
      expect(img).toHaveAttribute('alt', 'Screenshot: Watching Videos')
    })

    it('should wrap card in article element for semantic structure (AC3)', () => {
      render(<ChildScreenshotCard {...defaultProps} />)

      const article = screen.getByTestId('screenshot-card-ss-1')
      expect(article.tagName).toBe('ARTICLE')
    })

    it('should show "Read full description" button when description available (AC4)', () => {
      render(<ChildScreenshotCard {...defaultProps} screenshot={screenshotWithDescription} />)

      expect(screen.getByTestId('read-description-button')).toBeInTheDocument()
    })

    it('should not show "Read full description" button when description unavailable', () => {
      render(<ChildScreenshotCard {...defaultProps} />)

      expect(screen.queryByTestId('read-description-button')).not.toBeInTheDocument()
    })

    it('should have full description region for screen readers (AC2)', () => {
      render(<ChildScreenshotCard {...defaultProps} screenshot={screenshotWithDescription} />)

      const descriptionRegion = screen.getByTestId('full-description')
      expect(descriptionRegion).toHaveAttribute('role', 'region')
      expect(descriptionRegion).toHaveAttribute('aria-label', 'Full screenshot description')
    })

    it('should toggle description announcement on button click (AC4)', () => {
      render(<ChildScreenshotCard {...defaultProps} screenshot={screenshotWithDescription} />)

      const button = screen.getByTestId('read-description-button')
      expect(button).toHaveAttribute('aria-expanded', 'false')

      fireEvent.click(button)

      expect(button).toHaveAttribute('aria-expanded', 'true')
    })

    it('should support keyboard activation of description button (AC5)', () => {
      render(<ChildScreenshotCard {...defaultProps} screenshot={screenshotWithDescription} />)

      const button = screen.getByTestId('read-description-button')
      fireEvent.keyDown(button, { key: 'Enter' })

      expect(button).toHaveAttribute('aria-expanded', 'true')
    })
  })
})
