/**
 * Tests for DemoChildCard Component
 *
 * Story 8.5.1: Demo Child Profile Creation
 * Story 8.5.2: Sample Screenshot Gallery Integration
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { DemoChildCard, DemoChildCardProps } from './DemoChildCard'
import type { DemoChild } from '../../hooks/useDemo'
import type { DemoActivitySummary, DemoScreenshot } from '../../data/demoData'

// Create mock data
const mockDemoChild: DemoChild = {
  id: 'demo-child',
  familyId: 'test-family',
  name: 'Alex Demo',
  birthdate: new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000), // ~10 years old
  photoURL: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  isDemo: true,
}

const mockActivitySummary: DemoActivitySummary = {
  totalScreenshots: 8,
  lastCaptureTime: Date.now() - 2 * 60 * 60 * 1000,
  topCategories: [
    { category: 'homework', count: 3 },
    { category: 'gaming', count: 2 },
    { category: 'video', count: 2 },
  ],
  daysWithActivity: 4,
}

const defaultProps: DemoChildCardProps = {
  demoChild: mockDemoChild,
  activitySummary: mockActivitySummary,
  onDismiss: vi.fn().mockResolvedValue(undefined),
  dismissing: false,
}

describe('DemoChildCard (Story 8.5.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AC2: Clear Demo Label', () => {
    it('should display "Demo - Sample Data" label', () => {
      render(<DemoChildCard {...defaultProps} />)

      expect(screen.getByTestId('demo-badge')).toHaveTextContent('Demo - Sample Data')
    })

    it('should display demo badge with theater mask emoji', () => {
      render(<DemoChildCard {...defaultProps} />)

      expect(screen.getByTestId('demo-badge')).toHaveTextContent('🎭')
    })
  })

  describe('AC4: Distinct Styling', () => {
    it('should have distinct demo card styling', () => {
      render(<DemoChildCard {...defaultProps} />)

      const card = screen.getByTestId('demo-child-card')
      expect(card).toHaveStyle({ backgroundColor: '#faf5ff' }) // Light purple
      expect(card).toHaveStyle({ border: '2px dashed #c4b5fd' }) // Dashed purple border
    })
  })

  describe('AC5: Dismissible Demo', () => {
    it('should display dismiss button', () => {
      render(<DemoChildCard {...defaultProps} />)

      expect(screen.getByTestId('dismiss-demo-button')).toBeInTheDocument()
    })

    it('should show confirmation dialog when dismiss clicked', () => {
      render(<DemoChildCard {...defaultProps} />)

      fireEvent.click(screen.getByTestId('dismiss-demo-button'))

      expect(screen.getByTestId('dismiss-confirm')).toBeInTheDocument()
      expect(screen.getByText('Dismiss demo profile?')).toBeInTheDocument()
    })

    it('should hide confirmation when cancel clicked', () => {
      render(<DemoChildCard {...defaultProps} />)

      fireEvent.click(screen.getByTestId('dismiss-demo-button'))
      fireEvent.click(screen.getByTestId('dismiss-cancel-button'))

      expect(screen.queryByTestId('dismiss-confirm')).not.toBeInTheDocument()
    })

    it('should call onDismiss when confirm clicked', async () => {
      const onDismiss = vi.fn().mockResolvedValue(undefined)
      render(<DemoChildCard {...defaultProps} onDismiss={onDismiss} />)

      fireEvent.click(screen.getByTestId('dismiss-demo-button'))
      fireEvent.click(screen.getByTestId('dismiss-confirm-button'))

      await waitFor(() => {
        expect(onDismiss).toHaveBeenCalled()
      })
    })

    it('should show dismissing state', () => {
      render(<DemoChildCard {...defaultProps} dismissing={true} />)

      expect(screen.getByTestId('dismiss-demo-button')).toHaveTextContent('Dismissing...')
      expect(screen.getByTestId('dismiss-demo-button')).toBeDisabled()
    })
  })

  describe('Demo Child Info', () => {
    it('should display demo child name', () => {
      render(<DemoChildCard {...defaultProps} />)

      expect(screen.getByText('Alex Demo')).toBeInTheDocument()
    })

    it('should display approximate age', () => {
      render(<DemoChildCard {...defaultProps} />)

      // Should show roughly 10 years
      expect(screen.getByText(/\d+ years old/)).toBeInTheDocument()
    })

    it('should display status message', () => {
      render(<DemoChildCard {...defaultProps} />)

      expect(screen.getByTestId('demo-status')).toHaveTextContent(
        'All Good - This is sample data showing how monitoring would appear'
      )
    })
  })

  describe('Activity Summary', () => {
    it('should display screenshot count', () => {
      render(<DemoChildCard {...defaultProps} />)

      expect(screen.getByTestId('demo-activity-summary')).toHaveTextContent('8 sample screenshots')
    })

    it('should display days with activity', () => {
      render(<DemoChildCard {...defaultProps} />)

      expect(screen.getByTestId('demo-activity-summary')).toHaveTextContent('over 4 days')
    })
  })

  describe('Explore Demo Button', () => {
    it('should show explore button when onExplore provided', () => {
      const onExplore = vi.fn()
      render(<DemoChildCard {...defaultProps} onExplore={onExplore} />)

      expect(screen.getByTestId('explore-demo-button')).toBeInTheDocument()
    })

    it('should not show explore button when onExplore not provided', () => {
      render(<DemoChildCard {...defaultProps} />)

      expect(screen.queryByTestId('explore-demo-button')).not.toBeInTheDocument()
    })

    it('should call onExplore when clicked', () => {
      const onExplore = vi.fn()
      render(<DemoChildCard {...defaultProps} onExplore={onExplore} />)

      fireEvent.click(screen.getByTestId('explore-demo-button'))

      expect(onExplore).toHaveBeenCalled()
    })
  })

  describe('Non-Accusatory Language', () => {
    it('should NOT contain surveillance-type language', () => {
      render(<DemoChildCard {...defaultProps} />)

      const content = screen.getByTestId('demo-child-card').textContent || ''
      const lowerContent = content.toLowerCase()

      expect(lowerContent).not.toContain('spy')
      expect(lowerContent).not.toContain('track everything')
      expect(lowerContent).not.toContain('surveillance')
    })

    it('should use positive framing', () => {
      render(<DemoChildCard {...defaultProps} />)

      expect(screen.getByText(/how monitoring would appear/)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper button attributes', () => {
      render(<DemoChildCard {...defaultProps} />)

      const dismissButton = screen.getByTestId('dismiss-demo-button')
      expect(dismissButton).toHaveAttribute('type', 'button')
    })

    it('should disable buttons when dismissing', () => {
      render(<DemoChildCard {...defaultProps} dismissing={true} />)

      expect(screen.getByTestId('dismiss-demo-button')).toBeDisabled()
    })
  })
})

/**
 * Story 8.5.2: Expandable Gallery Integration Tests
 */
describe('DemoChildCard - Gallery Integration (Story 8.5.2)', () => {
  const mockScreenshots: DemoScreenshot[] = [
    {
      id: 'test-1',
      title: 'Math Practice',
      url: 'https://khanacademy.org/math',
      category: 'homework',
      timestamp: Date.now() - 2 * 60 * 60 * 1000,
      thumbnailDataUri: 'data:image/svg+xml;base64,abc',
      classification: { label: 'Educational', confidence: 0.95 },
    },
    {
      id: 'test-2',
      title: 'Gaming Session',
      url: 'https://minecraft.net',
      category: 'gaming',
      timestamp: Date.now() - 26 * 60 * 60 * 1000,
      thumbnailDataUri: 'data:image/svg+xml;base64,def',
      classification: { label: 'Gaming', confidence: 0.92 },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Gallery Toggle Button', () => {
    it('should show toggle button when screenshots provided', () => {
      render(<DemoChildCard {...defaultProps} screenshots={mockScreenshots} />)

      expect(screen.getByTestId('toggle-gallery-button')).toBeInTheDocument()
      expect(screen.getByTestId('toggle-gallery-button')).toHaveTextContent('Explore Demo')
    })

    it('should NOT show toggle button when no screenshots', () => {
      render(<DemoChildCard {...defaultProps} />)

      expect(screen.queryByTestId('toggle-gallery-button')).not.toBeInTheDocument()
    })

    it('should show onExplore button when no screenshots but onExplore provided', () => {
      const onExplore = vi.fn()
      render(<DemoChildCard {...defaultProps} onExplore={onExplore} />)

      expect(screen.getByTestId('explore-demo-button')).toBeInTheDocument()
    })
  })

  describe('Gallery Expansion', () => {
    it('should NOT show gallery section by default', () => {
      render(<DemoChildCard {...defaultProps} screenshots={mockScreenshots} />)

      expect(screen.queryByTestId('gallery-section')).not.toBeInTheDocument()
    })

    it('should show gallery when toggle button clicked', () => {
      render(<DemoChildCard {...defaultProps} screenshots={mockScreenshots} />)

      fireEvent.click(screen.getByTestId('toggle-gallery-button'))

      expect(screen.getByTestId('gallery-section')).toBeInTheDocument()
    })

    it('should change button text to Hide Gallery when expanded', () => {
      render(<DemoChildCard {...defaultProps} screenshots={mockScreenshots} />)

      fireEvent.click(screen.getByTestId('toggle-gallery-button'))

      expect(screen.getByTestId('toggle-gallery-button')).toHaveTextContent('Hide Gallery')
    })

    it('should hide gallery when toggle button clicked again', () => {
      render(<DemoChildCard {...defaultProps} screenshots={mockScreenshots} />)

      // Expand
      fireEvent.click(screen.getByTestId('toggle-gallery-button'))
      expect(screen.getByTestId('gallery-section')).toBeInTheDocument()

      // Collapse
      fireEvent.click(screen.getByTestId('toggle-gallery-button'))
      expect(screen.queryByTestId('gallery-section')).not.toBeInTheDocument()
    })

    it('should show gallery when showGallery prop is true', () => {
      render(<DemoChildCard {...defaultProps} screenshots={mockScreenshots} showGallery={true} />)

      expect(screen.getByTestId('gallery-section')).toBeInTheDocument()
    })
  })

  describe('Gallery Content', () => {
    it('should render DemoScreenshotGallery inside gallery section', () => {
      render(<DemoChildCard {...defaultProps} screenshots={mockScreenshots} showGallery={true} />)

      // Check that the gallery component is rendered
      expect(screen.getByTestId('demo-screenshot-gallery')).toBeInTheDocument()
    })

    it('should pass screenshots to gallery component', () => {
      render(<DemoChildCard {...defaultProps} screenshots={mockScreenshots} showGallery={true} />)

      // Gallery should show correct count
      expect(screen.getByTestId('results-count')).toHaveTextContent('Showing 2 of 2')
    })
  })
})

/**
 * Story 8.5.3: Time Tracking Integration Tests
 */
describe('DemoChildCard - Time Tracking Integration (Story 8.5.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Time Tracking Toggle Button', () => {
    it('should always show time tracking toggle button', () => {
      render(<DemoChildCard {...defaultProps} />)

      expect(screen.getByTestId('toggle-time-tracking-button')).toBeInTheDocument()
      expect(screen.getByTestId('toggle-time-tracking-button')).toHaveTextContent(
        'View Time Tracking'
      )
    })

    it('should display chart emoji in toggle button', () => {
      render(<DemoChildCard {...defaultProps} />)

      expect(screen.getByTestId('toggle-time-tracking-button')).toHaveTextContent('📊')
    })
  })

  describe('Time Tracking Expansion', () => {
    it('should NOT show time tracking section by default', () => {
      render(<DemoChildCard {...defaultProps} />)

      expect(screen.queryByTestId('time-tracking-section')).not.toBeInTheDocument()
    })

    it('should show time tracking section when toggle button clicked', () => {
      render(<DemoChildCard {...defaultProps} />)

      fireEvent.click(screen.getByTestId('toggle-time-tracking-button'))

      expect(screen.getByTestId('time-tracking-section')).toBeInTheDocument()
    })

    it('should change button text to Hide Time Tracking when expanded', () => {
      render(<DemoChildCard {...defaultProps} />)

      fireEvent.click(screen.getByTestId('toggle-time-tracking-button'))

      expect(screen.getByTestId('toggle-time-tracking-button')).toHaveTextContent(
        'Hide Time Tracking'
      )
    })

    it('should hide time tracking section when toggle button clicked again', () => {
      render(<DemoChildCard {...defaultProps} />)

      // Expand
      fireEvent.click(screen.getByTestId('toggle-time-tracking-button'))
      expect(screen.getByTestId('time-tracking-section')).toBeInTheDocument()

      // Collapse
      fireEvent.click(screen.getByTestId('toggle-time-tracking-button'))
      expect(screen.queryByTestId('time-tracking-section')).not.toBeInTheDocument()
    })

    it('should show time tracking when showTimeTracking prop is true', () => {
      render(<DemoChildCard {...defaultProps} showTimeTracking={true} />)

      expect(screen.getByTestId('time-tracking-section')).toBeInTheDocument()
    })
  })

  describe('Time Tracking Content', () => {
    it('should render DemoTimeTrackingPanel inside time tracking section', () => {
      render(<DemoChildCard {...defaultProps} showTimeTracking={true} />)

      // Check that the panel component is rendered
      expect(screen.getByTestId('demo-time-tracking-panel')).toBeInTheDocument()
    })

    it('should show chart component inside panel', () => {
      render(<DemoChildCard {...defaultProps} showTimeTracking={true} />)

      // Panel should show chart in week view (default)
      expect(screen.getByTestId('demo-time-chart')).toBeInTheDocument()
    })

    it('should show summary component inside panel', () => {
      render(<DemoChildCard {...defaultProps} showTimeTracking={true} />)

      expect(screen.getByTestId('demo-time-summary')).toBeInTheDocument()
    })
  })
})

/**
 * Story 8.5.4: Flag Review Integration Tests
 */
describe('DemoChildCard - Flag Review Integration (Story 8.5.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Flag Review Toggle Button', () => {
    it('should always show flag review toggle button', () => {
      render(<DemoChildCard {...defaultProps} />)

      expect(screen.getByTestId('toggle-flag-review-button')).toBeInTheDocument()
      expect(screen.getByTestId('toggle-flag-review-button')).toHaveTextContent(
        'View Flagged Content'
      )
    })

    it('should display flag emoji in toggle button', () => {
      render(<DemoChildCard {...defaultProps} />)

      expect(screen.getByTestId('toggle-flag-review-button')).toHaveTextContent('🚩')
    })
  })

  describe('Flag Review Expansion', () => {
    it('should NOT show flag review section by default', () => {
      render(<DemoChildCard {...defaultProps} />)

      expect(screen.queryByTestId('flag-review-section')).not.toBeInTheDocument()
    })

    it('should show flag review section when toggle button clicked', () => {
      render(<DemoChildCard {...defaultProps} />)

      fireEvent.click(screen.getByTestId('toggle-flag-review-button'))

      expect(screen.getByTestId('flag-review-section')).toBeInTheDocument()
    })

    it('should change button text to Hide Flag Review when expanded', () => {
      render(<DemoChildCard {...defaultProps} />)

      fireEvent.click(screen.getByTestId('toggle-flag-review-button'))

      expect(screen.getByTestId('toggle-flag-review-button')).toHaveTextContent('Hide Flag Review')
    })

    it('should hide flag review section when toggle button clicked again', () => {
      render(<DemoChildCard {...defaultProps} />)

      // Expand
      fireEvent.click(screen.getByTestId('toggle-flag-review-button'))
      expect(screen.getByTestId('flag-review-section')).toBeInTheDocument()

      // Collapse
      fireEvent.click(screen.getByTestId('toggle-flag-review-button'))
      expect(screen.queryByTestId('flag-review-section')).not.toBeInTheDocument()
    })

    it('should show flag review when showFlagReview prop is true', () => {
      render(<DemoChildCard {...defaultProps} showFlagReview={true} />)

      expect(screen.getByTestId('flag-review-section')).toBeInTheDocument()
    })
  })

  describe('Flag Review Content', () => {
    it('should render DemoFlagReviewPanel inside flag review section', () => {
      render(<DemoChildCard {...defaultProps} showFlagReview={true} />)

      // Check that the panel component is rendered
      expect(screen.getByTestId('demo-flag-review-panel')).toBeInTheDocument()
    })

    it('should show flag stats inside panel', () => {
      render(<DemoChildCard {...defaultProps} showFlagReview={true} />)

      expect(screen.getByTestId('flag-stats')).toBeInTheDocument()
    })

    it('should show filter tabs inside panel', () => {
      render(<DemoChildCard {...defaultProps} showFlagReview={true} />)

      expect(screen.getByTestId('filter-tabs')).toBeInTheDocument()
    })

    it('should show flag cards inside panel', () => {
      render(<DemoChildCard {...defaultProps} showFlagReview={true} />)

      expect(screen.getByTestId('flag-list')).toBeInTheDocument()
    })

    it('should show notification preview inside panel', () => {
      render(<DemoChildCard {...defaultProps} showFlagReview={true} />)

      expect(screen.getByTestId('demo-notification-preview')).toBeInTheDocument()
    })
  })
})
