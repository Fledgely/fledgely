/**
 * Tests for DemoScreenshotGallery Component
 *
 * Story 8.5.2: Sample Screenshot Gallery
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DemoScreenshotGallery } from './DemoScreenshotGallery'
import type { DemoScreenshot } from '../../../data/demoData'

// Sample screenshots for testing
const mockScreenshots: DemoScreenshot[] = [
  {
    id: 'test-1',
    title: 'Math Practice',
    url: 'https://khanacademy.org/math',
    category: 'homework',
    timestamp: Date.now() - 2 * 60 * 60 * 1000, // Today
    thumbnailDataUri: 'data:image/svg+xml;base64,abc',
    classification: { label: 'Educational', confidence: 0.95 },
  },
  {
    id: 'test-2',
    title: 'Gaming Session',
    url: 'https://minecraft.net',
    category: 'gaming',
    timestamp: Date.now() - 26 * 60 * 60 * 1000, // Yesterday
    thumbnailDataUri: 'data:image/svg+xml;base64,def',
    classification: { label: 'Gaming', confidence: 0.92 },
  },
  {
    id: 'test-3',
    title: 'Chat Messages',
    url: 'https://messages.example.com',
    category: 'social',
    timestamp: Date.now() - 5 * 60 * 60 * 1000, // Today
    thumbnailDataUri: 'data:image/svg+xml;base64,ghi',
    classification: { label: 'Social Media', confidence: 0.82 },
    flagged: true,
    flagReason: 'Conversation opportunity about online communication.',
  },
  {
    id: 'test-4',
    title: 'YouTube Video',
    url: 'https://youtube.com',
    category: 'video',
    timestamp: Date.now() - 50 * 60 * 60 * 1000, // 2 days ago
    thumbnailDataUri: 'data:image/svg+xml;base64,jkl',
    classification: { label: 'Video Content', confidence: 0.88 },
  },
]

describe('DemoScreenshotGallery (Story 8.5.2)', () => {
  describe('Basic rendering', () => {
    it('should render gallery container', () => {
      render(<DemoScreenshotGallery screenshots={mockScreenshots} />)

      expect(screen.getByTestId('demo-screenshot-gallery')).toBeInTheDocument()
    })

    it('should display demo badge', () => {
      render(<DemoScreenshotGallery screenshots={mockScreenshots} />)

      expect(screen.getByTestId('demo-badge')).toHaveTextContent('Sample Data')
    })

    it('should display all screenshots by default', () => {
      render(<DemoScreenshotGallery screenshots={mockScreenshots} />)

      expect(screen.getByTestId('results-count')).toHaveTextContent('Showing 4 of 4')
    })
  })

  describe('AC4: Timeline view', () => {
    it('should display timeline view with day groups', () => {
      render(<DemoScreenshotGallery screenshots={mockScreenshots} />)

      expect(screen.getByTestId('timeline-view')).toBeInTheDocument()
    })

    it('should show day headers', () => {
      render(<DemoScreenshotGallery screenshots={mockScreenshots} />)

      const dayHeaders = screen.getAllByTestId('day-header')
      expect(dayHeaders.length).toBeGreaterThan(0)
    })

    it('should group screenshots by day', () => {
      render(<DemoScreenshotGallery screenshots={mockScreenshots} />)

      // Should have multiple day groups
      const dayHeaders = screen.getAllByTestId('day-header')
      expect(dayHeaders.length).toBeGreaterThanOrEqual(2) // At least 2 days
    })
  })

  describe('AC6: Filter chips', () => {
    it('should display filter chips', () => {
      render(<DemoScreenshotGallery screenshots={mockScreenshots} />)

      expect(screen.getByTestId('filter-chips')).toBeInTheDocument()
      expect(screen.getByTestId('filter-chip-all')).toBeInTheDocument()
      expect(screen.getByTestId('filter-chip-educational')).toBeInTheDocument()
      expect(screen.getByTestId('filter-chip-gaming')).toBeInTheDocument()
    })

    it('should filter by category when chip clicked', () => {
      render(<DemoScreenshotGallery screenshots={mockScreenshots} />)

      // Click Educational filter
      fireEvent.click(screen.getByTestId('filter-chip-educational'))

      expect(screen.getByTestId('results-count')).toHaveTextContent('Showing 1 of 4')
    })

    it('should filter to flagged screenshots', () => {
      render(<DemoScreenshotGallery screenshots={mockScreenshots} />)

      // Click Flagged filter
      fireEvent.click(screen.getByTestId('filter-chip-flagged'))

      expect(screen.getByTestId('results-count')).toHaveTextContent('Showing 1 of 4')
    })

    it('should show counts on filter chips', () => {
      render(<DemoScreenshotGallery screenshots={mockScreenshots} />)

      // All chip should show total count
      expect(screen.getByTestId('filter-chip-all')).toHaveTextContent('4')
    })

    it('should reset to all when All chip clicked', () => {
      render(<DemoScreenshotGallery screenshots={mockScreenshots} />)

      // Click Gaming filter first
      fireEvent.click(screen.getByTestId('filter-chip-gaming'))
      expect(screen.getByTestId('results-count')).toHaveTextContent('Showing 1 of 4')

      // Click All filter
      fireEvent.click(screen.getByTestId('filter-chip-all'))
      expect(screen.getByTestId('results-count')).toHaveTextContent('Showing 4 of 4')
    })
  })

  describe('AC6: Search functionality', () => {
    it('should display search input', () => {
      render(<DemoScreenshotGallery screenshots={mockScreenshots} />)

      expect(screen.getByTestId('search-input')).toBeInTheDocument()
    })

    it('should filter by title search', () => {
      render(<DemoScreenshotGallery screenshots={mockScreenshots} />)

      const searchInput = screen.getByTestId('search-input')
      fireEvent.change(searchInput, { target: { value: 'math' } })

      expect(screen.getByTestId('results-count')).toHaveTextContent('Showing 1 of 4')
    })

    it('should filter by URL search', () => {
      render(<DemoScreenshotGallery screenshots={mockScreenshots} />)

      const searchInput = screen.getByTestId('search-input')
      fireEvent.change(searchInput, { target: { value: 'youtube' } })

      expect(screen.getByTestId('results-count')).toHaveTextContent('Showing 1 of 4')
    })

    it('should be case insensitive', () => {
      render(<DemoScreenshotGallery screenshots={mockScreenshots} />)

      const searchInput = screen.getByTestId('search-input')
      fireEvent.change(searchInput, { target: { value: 'MATH' } })

      expect(screen.getByTestId('results-count')).toHaveTextContent('Showing 1 of 4')
    })

    it('should show no results message when no matches', () => {
      render(<DemoScreenshotGallery screenshots={mockScreenshots} />)

      const searchInput = screen.getByTestId('search-input')
      fireEvent.change(searchInput, { target: { value: 'xyznonexistent' } })

      expect(screen.getByTestId('no-results')).toBeInTheDocument()
    })
  })

  describe('Combined filtering', () => {
    it('should combine category filter and search', () => {
      render(<DemoScreenshotGallery screenshots={mockScreenshots} />)

      // Filter by homework category
      fireEvent.click(screen.getByTestId('filter-chip-educational'))

      // Then search
      const searchInput = screen.getByTestId('search-input')
      fireEvent.change(searchInput, { target: { value: 'math' } })

      expect(screen.getByTestId('results-count')).toHaveTextContent('Showing 1 of 4')
    })
  })

  describe('Demo styling', () => {
    it('should have demo-distinct styling (dashed border)', () => {
      render(<DemoScreenshotGallery screenshots={mockScreenshots} />)

      const gallery = screen.getByTestId('demo-screenshot-gallery')
      expect(gallery).toHaveStyle({ border: '2px dashed #c4b5fd' })
    })

    it('should have lavender background', () => {
      render(<DemoScreenshotGallery screenshots={mockScreenshots} />)

      const gallery = screen.getByTestId('demo-screenshot-gallery')
      expect(gallery).toHaveStyle({ backgroundColor: '#faf5ff' })
    })
  })
})
