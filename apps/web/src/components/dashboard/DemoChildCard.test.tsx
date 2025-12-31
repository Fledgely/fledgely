/**
 * Tests for DemoChildCard Component
 *
 * Story 8.5.1: Demo Child Profile Creation
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { DemoChildCard, DemoChildCardProps } from './DemoChildCard'
import type { DemoChild } from '../../hooks/useDemo'
import type { DemoActivitySummary } from '../../data/demoData'

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
