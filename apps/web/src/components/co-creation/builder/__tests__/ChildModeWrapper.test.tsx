/**
 * Tests for ChildModeWrapper Component
 *
 * Story 5.3: Child Contribution Capture - Task 8
 *
 * Integration component that wraps child mode UI with appropriate styling,
 * context, and behavior.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChildModeWrapper } from '../ChildModeWrapper'

// ============================================
// DEFAULT PROPS
// ============================================

const defaultProps = {
  children: <div data-testid="child-content">Content</div>,
}

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('ChildModeWrapper', () => {
  describe('basic rendering', () => {
    it('renders the wrapper component', () => {
      render(<ChildModeWrapper {...defaultProps} />)
      expect(screen.getByTestId('child-mode-wrapper')).toBeInTheDocument()
    })

    it('renders children content', () => {
      render(<ChildModeWrapper {...defaultProps} />)
      expect(screen.getByTestId('child-content')).toBeInTheDocument()
    })

    it('renders custom data-testid when provided', () => {
      render(<ChildModeWrapper {...defaultProps} data-testid="custom-wrapper" />)
      expect(screen.getByTestId('custom-wrapper')).toBeInTheDocument()
    })
  })

  // ============================================
  // ACTIVE STATE TESTS
  // ============================================

  describe('active state', () => {
    it('shows child-friendly styling when isActive is true', () => {
      render(<ChildModeWrapper {...defaultProps} isActive />)
      const wrapper = screen.getByTestId('child-mode-wrapper')
      expect(wrapper.className).toMatch(/bg-pink|bg-gradient|child-mode-active/)
    })

    it('shows neutral styling when isActive is false', () => {
      render(<ChildModeWrapper {...defaultProps} isActive={false} />)
      const wrapper = screen.getByTestId('child-mode-wrapper')
      expect(wrapper.className).not.toMatch(/child-mode-active/)
    })

    it('defaults to inactive state', () => {
      render(<ChildModeWrapper {...defaultProps} />)
      const wrapper = screen.getByTestId('child-mode-wrapper')
      expect(wrapper.className).not.toMatch(/child-mode-active/)
    })
  })

  // ============================================
  // HEADER TESTS
  // ============================================

  describe('header', () => {
    it('shows child mode header when active', () => {
      render(<ChildModeWrapper {...defaultProps} isActive />)
      expect(screen.getByTestId('child-mode-header')).toBeInTheDocument()
    })

    it('does not show header when inactive', () => {
      render(<ChildModeWrapper {...defaultProps} isActive={false} />)
      expect(screen.queryByTestId('child-mode-header')).not.toBeInTheDocument()
    })

    it('displays child-friendly welcome message', () => {
      render(<ChildModeWrapper {...defaultProps} isActive />)
      expect(screen.getByText(/your turn/i)).toBeInTheDocument()
    })

    it('shows child name when provided', () => {
      render(<ChildModeWrapper {...defaultProps} isActive childName="Alex" />)
      expect(screen.getByText(/Alex/)).toBeInTheDocument()
    })
  })

  // ============================================
  // CLOSE BUTTON TESTS
  // ============================================

  describe('close button', () => {
    it('shows close button when active', () => {
      render(<ChildModeWrapper {...defaultProps} isActive onClose={() => {}} />)
      expect(screen.getByTestId('close-child-mode')).toBeInTheDocument()
    })

    it('calls onClose when close button clicked', async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      render(<ChildModeWrapper {...defaultProps} isActive onClose={onClose} />)

      await user.click(screen.getByTestId('close-child-mode'))

      expect(onClose).toHaveBeenCalled()
    })

    it('has accessible label on close button', () => {
      render(<ChildModeWrapper {...defaultProps} isActive onClose={() => {}} />)
      expect(screen.getByTestId('close-child-mode')).toHaveAttribute('aria-label')
    })
  })

  // ============================================
  // VISUAL STYLING TESTS
  // ============================================

  describe('visual styling', () => {
    it('applies rounded corners', () => {
      render(<ChildModeWrapper {...defaultProps} isActive />)
      const wrapper = screen.getByTestId('child-mode-wrapper')
      expect(wrapper.className).toMatch(/rounded/)
    })

    it('has visible border when active', () => {
      render(<ChildModeWrapper {...defaultProps} isActive />)
      const wrapper = screen.getByTestId('child-mode-wrapper')
      expect(wrapper.className).toMatch(/border/)
    })

    it('uses child-friendly colors', () => {
      render(<ChildModeWrapper {...defaultProps} isActive />)
      const wrapper = screen.getByTestId('child-mode-wrapper')
      expect(wrapper.className).toMatch(/pink|purple|child/)
    })
  })

  // ============================================
  // ANIMATION TESTS
  // ============================================

  describe('animation', () => {
    it('has transition classes for smooth state changes', () => {
      render(<ChildModeWrapper {...defaultProps} />)
      const wrapper = screen.getByTestId('child-mode-wrapper')
      expect(wrapper.className).toMatch(/transition/)
    })
  })

  // ============================================
  // ACCESSIBILITY TESTS
  // ============================================

  describe('accessibility', () => {
    it('has region role when active', () => {
      render(<ChildModeWrapper {...defaultProps} isActive />)
      expect(screen.getByRole('region')).toBeInTheDocument()
    })

    it('has aria-label describing the region', () => {
      render(<ChildModeWrapper {...defaultProps} isActive />)
      expect(screen.getByRole('region')).toHaveAttribute('aria-label')
    })

    it('announces mode change to screen readers', () => {
      render(<ChildModeWrapper {...defaultProps} isActive />)
      const wrapper = screen.getByTestId('child-mode-wrapper')
      expect(wrapper).toHaveAttribute('aria-live', 'polite')
    })
  })

  // ============================================
  // HELP HINT TESTS
  // ============================================

  describe('help hints', () => {
    it('shows help hint when showHints is true', () => {
      render(<ChildModeWrapper {...defaultProps} isActive showHints />)
      expect(screen.getByTestId('child-mode-hint')).toBeInTheDocument()
    })

    it('hides help hint by default', () => {
      render(<ChildModeWrapper {...defaultProps} isActive />)
      expect(screen.queryByTestId('child-mode-hint')).not.toBeInTheDocument()
    })

    it('displays child-friendly hint text', () => {
      render(<ChildModeWrapper {...defaultProps} isActive showHints />)
      expect(screen.getByText(/tap|click|tell us/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // PROGRESS INDICATOR TESTS
  // ============================================

  describe('progress indicator', () => {
    it('shows contribution count when provided', () => {
      render(<ChildModeWrapper {...defaultProps} isActive contributionCount={3} />)
      expect(screen.getByTestId('contribution-count')).toBeInTheDocument()
    })

    it('displays count value', () => {
      render(<ChildModeWrapper {...defaultProps} isActive contributionCount={5} />)
      expect(screen.getByText(/5/)).toBeInTheDocument()
    })

    it('shows celebration message for first contribution', () => {
      render(<ChildModeWrapper {...defaultProps} isActive contributionCount={1} showCelebration />)
      expect(screen.getByTestId('celebration-message')).toBeInTheDocument()
    })
  })
})
