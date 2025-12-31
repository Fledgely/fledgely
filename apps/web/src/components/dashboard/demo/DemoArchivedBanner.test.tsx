/**
 * Tests for DemoArchivedBanner Component
 *
 * Story 8.5.5: Demo-to-Real Transition
 * AC5: Demo Re-access - parent can re-access demo from help section
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DemoArchivedBanner } from './DemoArchivedBanner'

describe('DemoArchivedBanner', () => {
  const mockOnReactivateDemo = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('should render the banner', () => {
      render(<DemoArchivedBanner onReactivateDemo={mockOnReactivateDemo} />)
      const banner = screen.getByTestId('demo-archived-banner')
      expect(banner).toBeInTheDocument()
    })

    it('should display theater mask icon', () => {
      render(<DemoArchivedBanner onReactivateDemo={mockOnReactivateDemo} />)
      const icon = screen.getByTestId('banner-icon')
      expect(icon).toHaveTextContent('🎭')
    })

    it('should display "Demo Mode Available" title', () => {
      render(<DemoArchivedBanner onReactivateDemo={mockOnReactivateDemo} />)
      const title = screen.getByTestId('banner-title')
      expect(title).toHaveTextContent('Demo Mode Available')
    })

    it('should display description about demo mode reference', () => {
      render(<DemoArchivedBanner onReactivateDemo={mockOnReactivateDemo} />)
      const description = screen.getByTestId('banner-description')
      expect(description).toHaveTextContent('revisit demo mode')
      expect(description).toHaveTextContent('reference')
    })

    it('should display "View Demo Mode" button (AC5)', () => {
      render(<DemoArchivedBanner onReactivateDemo={mockOnReactivateDemo} />)
      const button = screen.getByTestId('reactivate-demo-button')
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('View Demo Mode')
    })
  })

  describe('styling', () => {
    it('should have green success-style background', () => {
      render(<DemoArchivedBanner onReactivateDemo={mockOnReactivateDemo} />)
      const banner = screen.getByTestId('demo-archived-banner')
      expect(banner).toHaveStyle({ backgroundColor: '#f0fdf4' })
    })

    it('should have green border', () => {
      render(<DemoArchivedBanner onReactivateDemo={mockOnReactivateDemo} />)
      const banner = screen.getByTestId('demo-archived-banner')
      expect(banner).toHaveStyle({ border: '1px solid #86efac' })
    })

    it('should have green title text', () => {
      render(<DemoArchivedBanner onReactivateDemo={mockOnReactivateDemo} />)
      const title = screen.getByTestId('banner-title')
      expect(title).toHaveStyle({ color: '#166534' })
    })
  })

  describe('button interactions', () => {
    it('should call onReactivateDemo when button clicked', () => {
      render(<DemoArchivedBanner onReactivateDemo={mockOnReactivateDemo} />)
      const button = screen.getByTestId('reactivate-demo-button')
      fireEvent.click(button)
      expect(mockOnReactivateDemo).toHaveBeenCalledTimes(1)
    })

    it('should not call onReactivateDemo when disabled', () => {
      render(<DemoArchivedBanner onReactivateDemo={mockOnReactivateDemo} reactivating />)
      const button = screen.getByTestId('reactivate-demo-button')
      fireEvent.click(button)
      expect(mockOnReactivateDemo).not.toHaveBeenCalled()
    })
  })

  describe('reactivating state', () => {
    it('should show "Loading Demo..." text when reactivating', () => {
      render(<DemoArchivedBanner onReactivateDemo={mockOnReactivateDemo} reactivating />)
      const button = screen.getByTestId('reactivate-demo-button')
      expect(button).toHaveTextContent('Loading Demo...')
    })

    it('should disable button when reactivating', () => {
      render(<DemoArchivedBanner onReactivateDemo={mockOnReactivateDemo} reactivating />)
      const button = screen.getByTestId('reactivate-demo-button')
      expect(button).toBeDisabled()
    })

    it('should have reduced opacity when reactivating', () => {
      render(<DemoArchivedBanner onReactivateDemo={mockOnReactivateDemo} reactivating />)
      const button = screen.getByTestId('reactivate-demo-button')
      expect(button).toHaveStyle({ opacity: '0.7' })
    })

    it('should have wait cursor when reactivating', () => {
      render(<DemoArchivedBanner onReactivateDemo={mockOnReactivateDemo} reactivating />)
      const button = screen.getByTestId('reactivate-demo-button')
      expect(button).toHaveStyle({ cursor: 'wait' })
    })
  })

  describe('default state', () => {
    it('should have pointer cursor when not reactivating', () => {
      render(<DemoArchivedBanner onReactivateDemo={mockOnReactivateDemo} />)
      const button = screen.getByTestId('reactivate-demo-button')
      expect(button).toHaveStyle({ cursor: 'pointer' })
    })

    it('should have full opacity when not reactivating', () => {
      render(<DemoArchivedBanner onReactivateDemo={mockOnReactivateDemo} />)
      const button = screen.getByTestId('reactivate-demo-button')
      expect(button).toHaveStyle({ opacity: '1' })
    })

    it('should show eye emoji in button when not reactivating', () => {
      render(<DemoArchivedBanner onReactivateDemo={mockOnReactivateDemo} />)
      const button = screen.getByTestId('reactivate-demo-button')
      expect(button).toHaveTextContent('👁️')
    })
  })
})
