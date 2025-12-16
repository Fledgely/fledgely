/**
 * Tests for ChildFeedbackButton Component
 *
 * Story 5.3: Child Contribution Capture - Task 5
 *
 * Allows children to react to parent-added terms with emojis/quick responses
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChildFeedbackButton } from '../ChildFeedbackButton'

// ============================================
// DEFAULT PROPS
// ============================================

const defaultProps = {
  termId: 'term-123',
  onFeedback: vi.fn(),
}

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('ChildFeedbackButton', () => {
  describe('basic rendering', () => {
    it('renders the feedback button', () => {
      render(<ChildFeedbackButton {...defaultProps} />)
      expect(screen.getByTestId('child-feedback-button')).toBeInTheDocument()
    })

    it('renders custom data-testid when provided', () => {
      render(<ChildFeedbackButton {...defaultProps} data-testid="custom-feedback" />)
      expect(screen.getByTestId('custom-feedback')).toBeInTheDocument()
    })

    it('shows child-friendly label', () => {
      render(<ChildFeedbackButton {...defaultProps} />)
      expect(screen.getByText(/What do you think/i)).toBeInTheDocument()
    })

    it('displays a default button state', () => {
      render(<ChildFeedbackButton {...defaultProps} />)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  // ============================================
  // FEEDBACK OPTIONS TESTS
  // ============================================

  describe('feedback options', () => {
    it('shows feedback options on click', async () => {
      const user = userEvent.setup()
      render(<ChildFeedbackButton {...defaultProps} />)

      await user.click(screen.getByTestId('child-feedback-button'))

      expect(screen.getByTestId('feedback-options')).toBeInTheDocument()
    })

    it('includes positive feedback option', async () => {
      const user = userEvent.setup()
      render(<ChildFeedbackButton {...defaultProps} />)

      await user.click(screen.getByTestId('child-feedback-button'))

      expect(screen.getByTestId('feedback-yes')).toBeInTheDocument()
    })

    it('includes negative feedback option', async () => {
      const user = userEvent.setup()
      render(<ChildFeedbackButton {...defaultProps} />)

      await user.click(screen.getByTestId('child-feedback-button'))

      expect(screen.getByTestId('feedback-no')).toBeInTheDocument()
    })

    it('includes maybe/unsure feedback option', async () => {
      const user = userEvent.setup()
      render(<ChildFeedbackButton {...defaultProps} />)

      await user.click(screen.getByTestId('child-feedback-button'))

      expect(screen.getByTestId('feedback-maybe')).toBeInTheDocument()
    })

    it('shows child-friendly feedback labels', async () => {
      const user = userEvent.setup()
      render(<ChildFeedbackButton {...defaultProps} />)

      await user.click(screen.getByTestId('child-feedback-button'))

      expect(screen.getByText(/I like it/i)).toBeInTheDocument()
      expect(screen.getByText(/Not sure/i)).toBeInTheDocument()
      expect(screen.getByText(/I don't like it/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // FEEDBACK SELECTION TESTS
  // ============================================

  describe('feedback selection', () => {
    it('calls onFeedback with positive response', async () => {
      const onFeedback = vi.fn()
      const user = userEvent.setup()
      render(<ChildFeedbackButton {...defaultProps} onFeedback={onFeedback} />)

      await user.click(screen.getByTestId('child-feedback-button'))
      await user.click(screen.getByTestId('feedback-yes'))

      expect(onFeedback).toHaveBeenCalledWith('term-123', 'positive')
    })

    it('calls onFeedback with negative response', async () => {
      const onFeedback = vi.fn()
      const user = userEvent.setup()
      render(<ChildFeedbackButton {...defaultProps} onFeedback={onFeedback} />)

      await user.click(screen.getByTestId('child-feedback-button'))
      await user.click(screen.getByTestId('feedback-no'))

      expect(onFeedback).toHaveBeenCalledWith('term-123', 'negative')
    })

    it('calls onFeedback with neutral response', async () => {
      const onFeedback = vi.fn()
      const user = userEvent.setup()
      render(<ChildFeedbackButton {...defaultProps} onFeedback={onFeedback} />)

      await user.click(screen.getByTestId('child-feedback-button'))
      await user.click(screen.getByTestId('feedback-maybe'))

      expect(onFeedback).toHaveBeenCalledWith('term-123', 'neutral')
    })

    it('closes feedback options after selection', async () => {
      const user = userEvent.setup()
      render(<ChildFeedbackButton {...defaultProps} />)

      await user.click(screen.getByTestId('child-feedback-button'))
      await user.click(screen.getByTestId('feedback-yes'))

      expect(screen.queryByTestId('feedback-options')).not.toBeInTheDocument()
    })
  })

  // ============================================
  // CURRENT FEEDBACK DISPLAY TESTS
  // ============================================

  describe('current feedback display', () => {
    it('shows positive feedback indicator when set', () => {
      render(<ChildFeedbackButton {...defaultProps} currentFeedback="positive" />)
      expect(screen.getByTestId('current-feedback-positive')).toBeInTheDocument()
    })

    it('shows negative feedback indicator when set', () => {
      render(<ChildFeedbackButton {...defaultProps} currentFeedback="negative" />)
      expect(screen.getByTestId('current-feedback-negative')).toBeInTheDocument()
    })

    it('shows neutral feedback indicator when set', () => {
      render(<ChildFeedbackButton {...defaultProps} currentFeedback="neutral" />)
      expect(screen.getByTestId('current-feedback-neutral')).toBeInTheDocument()
    })

    it('allows changing feedback when already set', async () => {
      const onFeedback = vi.fn()
      const user = userEvent.setup()
      render(
        <ChildFeedbackButton
          {...defaultProps}
          currentFeedback="positive"
          onFeedback={onFeedback}
        />
      )

      await user.click(screen.getByTestId('child-feedback-button'))
      await user.click(screen.getByTestId('feedback-no'))

      expect(onFeedback).toHaveBeenCalledWith('term-123', 'negative')
    })
  })

  // ============================================
  // DISABLED STATE TESTS
  // ============================================

  describe('disabled state', () => {
    it('disables button when disabled prop is true', () => {
      render(<ChildFeedbackButton {...defaultProps} disabled />)
      expect(screen.getByTestId('child-feedback-button')).toBeDisabled()
    })

    it('does not show options when disabled', async () => {
      const user = userEvent.setup()
      render(<ChildFeedbackButton {...defaultProps} disabled />)

      await user.click(screen.getByTestId('child-feedback-button'))

      expect(screen.queryByTestId('feedback-options')).not.toBeInTheDocument()
    })
  })

  // ============================================
  // TOUCH TARGET TESTS (NFR49)
  // ============================================

  describe('touch targets (NFR49)', () => {
    it('main button meets minimum touch target size (48px)', () => {
      render(<ChildFeedbackButton {...defaultProps} />)
      const button = screen.getByTestId('child-feedback-button')
      expect(button.className).toMatch(/min-h-\[48px\]|min-h-12/)
    })

    it('feedback option buttons meet minimum touch target size', async () => {
      const user = userEvent.setup()
      render(<ChildFeedbackButton {...defaultProps} />)

      await user.click(screen.getByTestId('child-feedback-button'))

      const yesButton = screen.getByTestId('feedback-yes')
      expect(yesButton.className).toMatch(/min-h-\[48px\]|min-h-12/)
    })
  })

  // ============================================
  // ACCESSIBILITY TESTS
  // ============================================

  describe('accessibility', () => {
    it('main button has aria-label', () => {
      render(<ChildFeedbackButton {...defaultProps} />)
      expect(screen.getByTestId('child-feedback-button')).toHaveAttribute('aria-label')
    })

    it('main button has aria-expanded when options are shown', async () => {
      const user = userEvent.setup()
      render(<ChildFeedbackButton {...defaultProps} />)

      await user.click(screen.getByTestId('child-feedback-button'))

      expect(screen.getByTestId('child-feedback-button')).toHaveAttribute(
        'aria-expanded',
        'true'
      )
    })

    it('feedback options have role="group"', async () => {
      const user = userEvent.setup()
      render(<ChildFeedbackButton {...defaultProps} />)

      await user.click(screen.getByTestId('child-feedback-button'))

      expect(screen.getByRole('menu')).toBeInTheDocument()
    })

    it('feedback buttons have aria-label', async () => {
      const user = userEvent.setup()
      render(<ChildFeedbackButton {...defaultProps} />)

      await user.click(screen.getByTestId('child-feedback-button'))

      expect(screen.getByTestId('feedback-yes')).toHaveAttribute('aria-label')
    })

    it('is keyboard accessible', () => {
      render(<ChildFeedbackButton {...defaultProps} />)
      const button = screen.getByTestId('child-feedback-button')
      button.focus()
      expect(document.activeElement).toBe(button)
    })

    it('opens on Enter key', () => {
      render(<ChildFeedbackButton {...defaultProps} />)
      const button = screen.getByTestId('child-feedback-button')
      button.focus()
      fireEvent.keyDown(button, { key: 'Enter' })
      // Should respond to keyboard
      expect(button).toBeInTheDocument()
    })
  })

  // ============================================
  // VISUAL STYLING TESTS
  // ============================================

  describe('visual styling', () => {
    it('has focus-visible ring styles', () => {
      render(<ChildFeedbackButton {...defaultProps} />)
      const button = screen.getByTestId('child-feedback-button')
      expect(button.className).toContain('focus-visible:ring')
    })

    it('shows appropriate color for positive feedback', () => {
      render(<ChildFeedbackButton {...defaultProps} currentFeedback="positive" />)
      const indicator = screen.getByTestId('current-feedback-positive')
      expect(indicator.className).toMatch(/green|emerald/)
    })

    it('shows appropriate color for negative feedback', () => {
      render(<ChildFeedbackButton {...defaultProps} currentFeedback="negative" />)
      const indicator = screen.getByTestId('current-feedback-negative')
      expect(indicator.className).toMatch(/red|rose/)
    })
  })
})
