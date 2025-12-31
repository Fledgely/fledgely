/**
 * Tests for ChildFriendlyOverlay Component
 *
 * Story 8.5.6: Demo for Child Explanation
 * AC1: Child-friendly explanations appear alongside sample data
 * AC5: Language is at 6th-grade reading level
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChildFriendlyOverlay } from './ChildFriendlyOverlay'

describe('ChildFriendlyOverlay', () => {
  const mockOnExitChildMode = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('should render the overlay', () => {
      render(
        <ChildFriendlyOverlay section="general" onExitChildMode={mockOnExitChildMode}>
          <div>Demo content</div>
        </ChildFriendlyOverlay>
      )
      const overlay = screen.getByTestId('child-friendly-overlay')
      expect(overlay).toBeInTheDocument()
    })

    it('should display child mode title', () => {
      render(
        <ChildFriendlyOverlay section="general" onExitChildMode={mockOnExitChildMode}>
          <div>Demo content</div>
        </ChildFriendlyOverlay>
      )
      const title = screen.getByTestId('child-mode-title')
      expect(title).toHaveTextContent('Explaining to Your Child')
    })

    it('should render children content (AC1)', () => {
      render(
        <ChildFriendlyOverlay section="general" onExitChildMode={mockOnExitChildMode}>
          <div data-testid="test-content">Demo content</div>
        </ChildFriendlyOverlay>
      )
      const content = screen.getByTestId('test-content')
      expect(content).toBeInTheDocument()
      expect(content).toHaveTextContent('Demo content')
    })

    it('should display exit child mode button', () => {
      render(
        <ChildFriendlyOverlay section="general" onExitChildMode={mockOnExitChildMode}>
          <div>Demo content</div>
        </ChildFriendlyOverlay>
      )
      const button = screen.getByTestId('exit-child-mode-button')
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('Exit Child Mode')
    })
  })

  describe('exit child mode interaction', () => {
    it('should call onExitChildMode when exit button is clicked', () => {
      render(
        <ChildFriendlyOverlay section="general" onExitChildMode={mockOnExitChildMode}>
          <div>Demo content</div>
        </ChildFriendlyOverlay>
      )
      const button = screen.getByTestId('exit-child-mode-button')
      fireEvent.click(button)
      expect(mockOnExitChildMode).toHaveBeenCalledTimes(1)
    })
  })

  describe('section-specific callouts', () => {
    describe('screenshots section', () => {
      it('should show bilateral transparency callout for screenshots section', () => {
        render(
          <ChildFriendlyOverlay section="screenshots" onExitChildMode={mockOnExitChildMode}>
            <div>Demo content</div>
          </ChildFriendlyOverlay>
        )
        expect(screen.getByTestId('bilateral-transparency-callout')).toBeInTheDocument()
      })

      it('should NOT show agreement co-creation for screenshots section', () => {
        render(
          <ChildFriendlyOverlay section="screenshots" onExitChildMode={mockOnExitChildMode}>
            <div>Demo content</div>
          </ChildFriendlyOverlay>
        )
        expect(screen.queryByTestId('agreement-cocreation-highlight')).not.toBeInTheDocument()
      })

      it('should NOT show crisis resources for screenshots section', () => {
        render(
          <ChildFriendlyOverlay section="screenshots" onExitChildMode={mockOnExitChildMode}>
            <div>Demo content</div>
          </ChildFriendlyOverlay>
        )
        expect(screen.queryByTestId('crisis-resources-preview')).not.toBeInTheDocument()
      })
    })

    describe('time-tracking section', () => {
      it('should show agreement co-creation for time-tracking section', () => {
        render(
          <ChildFriendlyOverlay section="time-tracking" onExitChildMode={mockOnExitChildMode}>
            <div>Demo content</div>
          </ChildFriendlyOverlay>
        )
        expect(screen.getByTestId('agreement-cocreation-highlight')).toBeInTheDocument()
      })

      it('should NOT show bilateral transparency for time-tracking section', () => {
        render(
          <ChildFriendlyOverlay section="time-tracking" onExitChildMode={mockOnExitChildMode}>
            <div>Demo content</div>
          </ChildFriendlyOverlay>
        )
        expect(screen.queryByTestId('bilateral-transparency-callout')).not.toBeInTheDocument()
      })
    })

    describe('flags section', () => {
      it('should show bilateral transparency callout for flags section', () => {
        render(
          <ChildFriendlyOverlay section="flags" onExitChildMode={mockOnExitChildMode}>
            <div>Demo content</div>
          </ChildFriendlyOverlay>
        )
        expect(screen.getByTestId('bilateral-transparency-callout')).toBeInTheDocument()
      })

      it('should show crisis resources for flags section', () => {
        render(
          <ChildFriendlyOverlay section="flags" onExitChildMode={mockOnExitChildMode}>
            <div>Demo content</div>
          </ChildFriendlyOverlay>
        )
        expect(screen.getByTestId('crisis-resources-preview')).toBeInTheDocument()
      })

      it('should NOT show agreement co-creation for flags section', () => {
        render(
          <ChildFriendlyOverlay section="flags" onExitChildMode={mockOnExitChildMode}>
            <div>Demo content</div>
          </ChildFriendlyOverlay>
        )
        expect(screen.queryByTestId('agreement-cocreation-highlight')).not.toBeInTheDocument()
      })
    })

    describe('general section', () => {
      it('should show ALL callouts for general section', () => {
        render(
          <ChildFriendlyOverlay section="general" onExitChildMode={mockOnExitChildMode}>
            <div>Demo content</div>
          </ChildFriendlyOverlay>
        )
        expect(screen.getByTestId('bilateral-transparency-callout')).toBeInTheDocument()
        expect(screen.getByTestId('crisis-resources-preview')).toBeInTheDocument()
        expect(screen.getByTestId('agreement-cocreation-highlight')).toBeInTheDocument()
      })
    })
  })

  describe('styling', () => {
    it('should have demo lavender background', () => {
      render(
        <ChildFriendlyOverlay section="general" onExitChildMode={mockOnExitChildMode}>
          <div>Demo content</div>
        </ChildFriendlyOverlay>
      )
      const overlay = screen.getByTestId('child-friendly-overlay')
      expect(overlay).toHaveStyle({ backgroundColor: '#faf5ff' })
    })

    it('should have brighter purple border for child mode', () => {
      render(
        <ChildFriendlyOverlay section="general" onExitChildMode={mockOnExitChildMode}>
          <div>Demo content</div>
        </ChildFriendlyOverlay>
      )
      const overlay = screen.getByTestId('child-friendly-overlay')
      expect(overlay).toHaveStyle({ border: '3px solid #a78bfa' })
    })
  })

  describe('callouts container', () => {
    it('should have callouts container', () => {
      render(
        <ChildFriendlyOverlay section="general" onExitChildMode={mockOnExitChildMode}>
          <div>Demo content</div>
        </ChildFriendlyOverlay>
      )
      const container = screen.getByTestId('callouts-container')
      expect(container).toBeInTheDocument()
    })

    it('should have demo content wrapper', () => {
      render(
        <ChildFriendlyOverlay section="general" onExitChildMode={mockOnExitChildMode}>
          <div>Demo content</div>
        </ChildFriendlyOverlay>
      )
      const wrapper = screen.getByTestId('demo-content-wrapper')
      expect(wrapper).toBeInTheDocument()
    })
  })
})
