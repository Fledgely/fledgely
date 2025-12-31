/**
 * Tests for DemoScreenshotCard Component
 *
 * Story 8.5.2: Sample Screenshot Gallery
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DemoScreenshotCard } from './DemoScreenshotCard'
import type { DemoScreenshot } from '../../../data/demoData'

// Sample non-flagged screenshot
const mockScreenshot: DemoScreenshot = {
  id: 'test-screenshot-1',
  title: 'Math Practice',
  url: 'https://khanacademy.org/math',
  category: 'homework',
  timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
  thumbnailDataUri: 'data:image/svg+xml;base64,abc123',
  classification: {
    label: 'Educational',
    confidence: 0.95,
  },
}

// Sample flagged screenshot
const mockFlaggedScreenshot: DemoScreenshot = {
  id: 'test-screenshot-2',
  title: 'Chat Messages',
  url: 'https://messages.example.com',
  category: 'social',
  timestamp: Date.now() - 5 * 60 * 60 * 1000, // 5 hours ago
  thumbnailDataUri: 'data:image/svg+xml;base64,xyz789',
  classification: {
    label: 'Social Media',
    confidence: 0.82,
  },
  flagged: true,
  flagReason: 'This is a conversation opportunity about online communication.',
}

describe('DemoScreenshotCard (Story 8.5.2)', () => {
  describe('Basic rendering', () => {
    it('should render screenshot card', () => {
      render(<DemoScreenshotCard screenshot={mockScreenshot} />)

      expect(screen.getByTestId('demo-screenshot-card-test-screenshot-1')).toBeInTheDocument()
    })

    it('should display thumbnail image', () => {
      render(<DemoScreenshotCard screenshot={mockScreenshot} />)

      const thumbnail = screen.getByTestId('screenshot-thumbnail')
      expect(thumbnail).toBeInTheDocument()
      expect(thumbnail).toHaveAttribute('src', mockScreenshot.thumbnailDataUri)
    })

    it('should display title', () => {
      render(<DemoScreenshotCard screenshot={mockScreenshot} />)

      expect(screen.getByTestId('screenshot-title')).toHaveTextContent('Math Practice')
    })
  })

  describe('AC5: Demo Data watermark', () => {
    it('should display Demo Data watermark', () => {
      render(<DemoScreenshotCard screenshot={mockScreenshot} />)

      const watermark = screen.getByTestId('demo-watermark')
      expect(watermark).toBeInTheDocument()
      expect(watermark).toHaveTextContent('Demo Data')
    })
  })

  describe('AC1: Category badge', () => {
    it('should display category badge', () => {
      render(<DemoScreenshotCard screenshot={mockScreenshot} />)

      const badge = screen.getByTestId('category-badge')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveTextContent('Educational')
    })

    it('should display different category badges', () => {
      const gamingScreenshot = {
        ...mockScreenshot,
        category: 'gaming' as const,
        classification: { label: 'Gaming', confidence: 0.9 },
      }
      render(<DemoScreenshotCard screenshot={gamingScreenshot} />)

      expect(screen.getByTestId('category-badge')).toHaveTextContent('Gaming')
    })
  })

  describe('AC2: Confidence display', () => {
    it('should display confidence percentage', () => {
      render(<DemoScreenshotCard screenshot={mockScreenshot} />)

      const confidenceValue = screen.getByTestId('confidence-value')
      expect(confidenceValue).toHaveTextContent('95%')
    })

    it('should display confidence bar', () => {
      render(<DemoScreenshotCard screenshot={mockScreenshot} />)

      expect(screen.getByTestId('confidence-bar')).toBeInTheDocument()
    })

    it('should display confidence level label', () => {
      render(<DemoScreenshotCard screenshot={mockScreenshot} />)

      const label = screen.getByTestId('confidence-label')
      expect(label).toHaveTextContent('Very confident')
    })

    it('should show Confident for medium confidence', () => {
      const mediumConfidenceScreenshot = {
        ...mockScreenshot,
        classification: { label: 'Educational', confidence: 0.8 },
      }
      render(<DemoScreenshotCard screenshot={mediumConfidenceScreenshot} />)

      expect(screen.getByTestId('confidence-label')).toHaveTextContent('Confident')
    })

    it('should show Uncertain for low confidence', () => {
      const lowConfidenceScreenshot = {
        ...mockScreenshot,
        classification: { label: 'Educational', confidence: 0.6 },
      }
      render(<DemoScreenshotCard screenshot={lowConfidenceScreenshot} />)

      expect(screen.getByTestId('confidence-label')).toHaveTextContent('Uncertain')
    })
  })

  describe('Timestamp display', () => {
    it('should display relative timestamp', () => {
      render(<DemoScreenshotCard screenshot={mockScreenshot} />)

      expect(screen.getByTestId('screenshot-timestamp')).toHaveTextContent('hours ago')
    })
  })

  describe('AC3: Flagged screenshots', () => {
    it('should display flag indicator for flagged screenshots', () => {
      render(<DemoScreenshotCard screenshot={mockFlaggedScreenshot} />)

      const flagIndicator = screen.getByTestId('flag-indicator')
      expect(flagIndicator).toBeInTheDocument()
      expect(flagIndicator).toHaveTextContent('Flagged')
    })

    it('should NOT display flag indicator for non-flagged screenshots', () => {
      render(<DemoScreenshotCard screenshot={mockScreenshot} />)

      expect(screen.queryByTestId('flag-indicator')).not.toBeInTheDocument()
    })

    it('should display flag reason for flagged screenshots', () => {
      render(<DemoScreenshotCard screenshot={mockFlaggedScreenshot} />)

      const flagReason = screen.getByTestId('flag-reason')
      expect(flagReason).toBeInTheDocument()
      expect(flagReason).toHaveTextContent('conversation opportunity')
    })

    it('should NOT display flag reason for non-flagged screenshots', () => {
      render(<DemoScreenshotCard screenshot={mockScreenshot} />)

      expect(screen.queryByTestId('flag-reason')).not.toBeInTheDocument()
    })
  })

  describe('Non-accusatory language', () => {
    it('should NOT contain accusatory language in flag reason', () => {
      render(<DemoScreenshotCard screenshot={mockFlaggedScreenshot} />)

      const flagReason = screen.getByTestId('flag-reason')
      const text = flagReason.textContent?.toLowerCase() || ''

      expect(text).not.toContain('dangerous')
      expect(text).not.toContain('bad')
      expect(text).not.toContain('wrong')
    })
  })
})
