/**
 * Tests for DemoFlagReviewPanel Component
 *
 * Story 8.5.4: Sample Flag & Alert Examples
 * AC1: Sample flagged items
 * AC2: Flag details display
 * AC5: Resolution flow demonstration
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DemoFlagReviewPanel } from './DemoFlagReviewPanel'
import type { DemoFlag } from '../../../data/demoData'

// Sample test data
const mockFlags: DemoFlag[] = [
  {
    id: 'test-flag-1',
    screenshotId: 'demo-screenshot-10',
    concernType: 'research',
    confidence: 0.85,
    aiReasoning: 'Health research search. Great opportunity to check in.',
    resolution: {
      status: 'resolved',
      action: 'talked',
      resolvedAt: Date.now() - 1 * 60 * 60 * 1000,
    },
    createdAt: Date.now() - 3 * 60 * 60 * 1000,
  },
  {
    id: 'test-flag-2',
    screenshotId: 'demo-screenshot-9',
    concernType: 'communication',
    confidence: 0.72,
    aiReasoning: 'Messaging app activity noticed.',
    resolution: {
      status: 'reviewed',
    },
    createdAt: Date.now() - 2 * 60 * 60 * 1000,
  },
  {
    id: 'test-flag-3',
    screenshotId: 'demo-screenshot-11',
    concernType: 'time',
    confidence: 0.9,
    aiReasoning: 'Screen time exceeded daily limit.',
    resolution: {
      status: 'pending',
    },
    createdAt: Date.now() - 30 * 60 * 1000,
  },
]

describe('DemoFlagReviewPanel', () => {
  describe('basic rendering', () => {
    it('should render the component', () => {
      render(<DemoFlagReviewPanel />)
      const panel = screen.getByTestId('demo-flag-review-panel')
      expect(panel).toBeInTheDocument()
    })

    it('should show demo badge', () => {
      render(<DemoFlagReviewPanel />)
      const badge = screen.getByTestId('panel-demo-badge')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveTextContent('Sample Data')
    })

    it('should render with default demo flags', () => {
      render(<DemoFlagReviewPanel />)
      const flagList = screen.getByTestId('flag-list')
      expect(flagList).toBeInTheDocument()
    })

    it('should render with custom flags', () => {
      render(<DemoFlagReviewPanel flags={mockFlags} />)
      expect(screen.getAllByTestId('demo-flag-card')).toHaveLength(3)
    })
  })

  describe('flag stats (AC1)', () => {
    it('should display total count', () => {
      render(<DemoFlagReviewPanel flags={mockFlags} />)
      const stats = screen.getByTestId('flag-stats')
      expect(stats).toBeInTheDocument()
    })

    it('should show correct total stat', () => {
      render(<DemoFlagReviewPanel flags={mockFlags} />)
      const total = screen.getByTestId('stat-total')
      expect(total).toHaveTextContent('3')
    })

    it('should show correct pending stat', () => {
      render(<DemoFlagReviewPanel flags={mockFlags} />)
      const pending = screen.getByTestId('stat-pending')
      expect(pending).toHaveTextContent('1')
    })

    it('should show correct resolved stat', () => {
      render(<DemoFlagReviewPanel flags={mockFlags} />)
      const resolved = screen.getByTestId('stat-resolved')
      expect(resolved).toHaveTextContent('1')
    })
  })

  describe('filter tabs', () => {
    it('should display all filter tabs', () => {
      render(<DemoFlagReviewPanel flags={mockFlags} />)
      expect(screen.getByTestId('filter-all')).toBeInTheDocument()
      expect(screen.getByTestId('filter-pending')).toBeInTheDocument()
      expect(screen.getByTestId('filter-reviewed')).toBeInTheDocument()
      expect(screen.getByTestId('filter-resolved')).toBeInTheDocument()
    })

    it('should have "All" filter active by default', () => {
      render(<DemoFlagReviewPanel flags={mockFlags} />)
      const allFilter = screen.getByTestId('filter-all')
      // Check it has the active styling (border color)
      expect(allFilter).toHaveStyle({ borderColor: '#8b5cf6' })
    })

    it('should show all flags when "All" filter is active', () => {
      render(<DemoFlagReviewPanel flags={mockFlags} />)
      expect(screen.getAllByTestId('demo-flag-card')).toHaveLength(3)
    })

    it('should filter by pending status', () => {
      render(<DemoFlagReviewPanel flags={mockFlags} />)
      fireEvent.click(screen.getByTestId('filter-pending'))
      expect(screen.getAllByTestId('demo-flag-card')).toHaveLength(1)
    })

    it('should filter by reviewed status', () => {
      render(<DemoFlagReviewPanel flags={mockFlags} />)
      fireEvent.click(screen.getByTestId('filter-reviewed'))
      expect(screen.getAllByTestId('demo-flag-card')).toHaveLength(1)
    })

    it('should filter by resolved status', () => {
      render(<DemoFlagReviewPanel flags={mockFlags} />)
      fireEvent.click(screen.getByTestId('filter-resolved'))
      expect(screen.getAllByTestId('demo-flag-card')).toHaveLength(1)
    })

    it('should show empty state when filter has no matches', () => {
      const onlyPending: DemoFlag[] = [mockFlags[2]]
      render(<DemoFlagReviewPanel flags={onlyPending} />)
      fireEvent.click(screen.getByTestId('filter-resolved'))
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })
  })

  describe('flag cards (AC1, AC2)', () => {
    it('should render flag cards for each flag', () => {
      render(<DemoFlagReviewPanel flags={mockFlags} />)
      const cards = screen.getAllByTestId('demo-flag-card')
      expect(cards).toHaveLength(3)
    })

    it('should show AI reasoning in flag cards', () => {
      render(<DemoFlagReviewPanel flags={mockFlags} />)
      expect(screen.getByText(/Health research search/)).toBeInTheDocument()
      expect(screen.getByText(/Messaging app activity/)).toBeInTheDocument()
    })
  })

  describe('expandable flag detail (AC2)', () => {
    it('should not show expanded details by default', () => {
      render(<DemoFlagReviewPanel flags={mockFlags} />)
      expect(screen.queryByTestId('expanded-details')).not.toBeInTheDocument()
    })

    it('should expand flag details when clicked', () => {
      render(<DemoFlagReviewPanel flags={mockFlags} />)
      const cards = screen.getAllByTestId('demo-flag-card')
      fireEvent.click(cards[0])
      expect(screen.getByTestId('expanded-details')).toBeInTheDocument()
    })

    it('should collapse flag details when clicked again', () => {
      render(<DemoFlagReviewPanel flags={mockFlags} />)
      const cards = screen.getAllByTestId('demo-flag-card')
      fireEvent.click(cards[0])
      expect(screen.getByTestId('expanded-details')).toBeInTheDocument()
      fireEvent.click(cards[0])
      expect(screen.queryByTestId('expanded-details')).not.toBeInTheDocument()
    })

    it('should collapse previous flag when different flag is clicked', () => {
      render(<DemoFlagReviewPanel flags={mockFlags} />)
      const cards = screen.getAllByTestId('demo-flag-card')
      fireEvent.click(cards[0])
      expect(screen.getByTestId('expanded-details')).toBeInTheDocument()
      fireEvent.click(cards[1])
      // Only one expanded details should be visible
      expect(screen.getAllByTestId('expanded-details')).toHaveLength(1)
    })
  })

  describe('notification preview (AC4)', () => {
    it('should show notification preview by default', () => {
      render(<DemoFlagReviewPanel flags={mockFlags} />)
      expect(screen.getByTestId('demo-notification-preview')).toBeInTheDocument()
    })

    it('should hide notification preview when showNotificationPreview is false', () => {
      render(<DemoFlagReviewPanel flags={mockFlags} showNotificationPreview={false} />)
      expect(screen.queryByTestId('demo-notification-preview')).not.toBeInTheDocument()
    })
  })
})
