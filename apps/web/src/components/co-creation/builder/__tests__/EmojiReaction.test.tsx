/**
 * Tests for EmojiReaction Component
 *
 * Story 5.3: Child Contribution Capture - Task 4
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmojiReaction } from '../EmojiReaction'

// ============================================
// DEFAULT PROPS
// ============================================

const defaultProps = {
  onSelect: vi.fn(),
}

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('EmojiReaction', () => {
  describe('basic rendering', () => {
    it('renders the emoji reaction component', () => {
      render(<EmojiReaction {...defaultProps} />)
      expect(screen.getByTestId('emoji-reaction')).toBeInTheDocument()
    })

    it('renders custom data-testid when provided', () => {
      render(<EmojiReaction {...defaultProps} data-testid="custom-emoji" />)
      expect(screen.getByTestId('custom-emoji')).toBeInTheDocument()
    })

    it('shows child-friendly quick emoji options', () => {
      render(<EmojiReaction {...defaultProps} />)
      // Common positive emojis for children
      expect(screen.getByTestId('emoji-thumbs-up')).toBeInTheDocument()
      expect(screen.getByTestId('emoji-heart')).toBeInTheDocument()
      expect(screen.getByTestId('emoji-star')).toBeInTheDocument()
    })

    it('displays label text', () => {
      render(<EmojiReaction {...defaultProps} />)
      expect(screen.getByText(/How do you feel/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // EMOJI OPTIONS TESTS
  // ============================================

  describe('emoji options', () => {
    it('renders at least 5 emoji options', () => {
      render(<EmojiReaction {...defaultProps} />)
      const emojiButtons = screen.getAllByRole('button')
      expect(emojiButtons.length).toBeGreaterThanOrEqual(5)
    })

    it('includes positive reaction emojis', () => {
      render(<EmojiReaction {...defaultProps} />)
      // Check for common positive emojis
      expect(screen.getByTestId('emoji-thumbs-up')).toBeInTheDocument()
      expect(screen.getByTestId('emoji-heart')).toBeInTheDocument()
    })

    it('includes thinking/unsure emoji', () => {
      render(<EmojiReaction {...defaultProps} />)
      expect(screen.getByTestId('emoji-thinking')).toBeInTheDocument()
    })

    it('includes negative/disagreement emoji', () => {
      render(<EmojiReaction {...defaultProps} />)
      expect(screen.getByTestId('emoji-thumbs-down')).toBeInTheDocument()
    })
  })

  // ============================================
  // SELECTION TESTS
  // ============================================

  describe('selection', () => {
    it('calls onSelect with emoji when clicked', async () => {
      const onSelect = vi.fn()
      const user = userEvent.setup()
      render(<EmojiReaction {...defaultProps} onSelect={onSelect} />)

      await user.click(screen.getByTestId('emoji-thumbs-up'))

      expect(onSelect).toHaveBeenCalledWith('👍')
    })

    it('calls onSelect with heart emoji', async () => {
      const onSelect = vi.fn()
      const user = userEvent.setup()
      render(<EmojiReaction {...defaultProps} onSelect={onSelect} />)

      await user.click(screen.getByTestId('emoji-heart'))

      expect(onSelect).toHaveBeenCalledWith('❤️')
    })

    it('highlights selected emoji when value prop is set', () => {
      render(<EmojiReaction {...defaultProps} value="👍" />)

      expect(screen.getByTestId('emoji-thumbs-up')).toHaveAttribute('aria-pressed', 'true')
    })

    it('shows correct selection when value changes', () => {
      const { rerender } = render(<EmojiReaction {...defaultProps} value="👍" />)

      expect(screen.getByTestId('emoji-thumbs-up')).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByTestId('emoji-heart')).toHaveAttribute('aria-pressed', 'false')

      rerender(<EmojiReaction {...defaultProps} value="❤️" />)

      expect(screen.getByTestId('emoji-thumbs-up')).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByTestId('emoji-heart')).toHaveAttribute('aria-pressed', 'true')
    })
  })

  // ============================================
  // SELECTED VALUE TESTS
  // ============================================

  describe('selected value', () => {
    it('shows pre-selected emoji when value provided', () => {
      render(<EmojiReaction {...defaultProps} value="👍" />)
      expect(screen.getByTestId('emoji-thumbs-up')).toHaveAttribute('aria-pressed', 'true')
    })

    it('updates selection when value prop changes', () => {
      const { rerender } = render(<EmojiReaction {...defaultProps} value="👍" />)
      expect(screen.getByTestId('emoji-thumbs-up')).toHaveAttribute('aria-pressed', 'true')

      rerender(<EmojiReaction {...defaultProps} value="❤️" />)
      expect(screen.getByTestId('emoji-heart')).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByTestId('emoji-thumbs-up')).toHaveAttribute('aria-pressed', 'false')
    })
  })

  // ============================================
  // DISABLED STATE TESTS
  // ============================================

  describe('disabled state', () => {
    it('disables all emoji buttons when disabled', () => {
      render(<EmojiReaction {...defaultProps} disabled />)
      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toBeDisabled()
      })
    })

    it('does not call onSelect when disabled', async () => {
      const onSelect = vi.fn()
      const user = userEvent.setup()
      render(<EmojiReaction {...defaultProps} onSelect={onSelect} disabled />)

      await user.click(screen.getByTestId('emoji-thumbs-up'))

      expect(onSelect).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // TOUCH TARGET TESTS (NFR49)
  // ============================================

  describe('touch targets (NFR49)', () => {
    it('emoji buttons meet minimum touch target size (48px)', () => {
      render(<EmojiReaction {...defaultProps} />)
      const button = screen.getByTestId('emoji-thumbs-up')
      expect(button.className).toMatch(/min-h-\[48px\]|min-h-12|w-12|h-12/)
    })

    it('has adequate spacing between emoji buttons', () => {
      render(<EmojiReaction {...defaultProps} />)
      const container = screen.getByTestId('emoji-reaction')
      expect(container.className).toMatch(/gap-2|gap-3|gap-4/)
    })
  })

  // ============================================
  // ACCESSIBILITY TESTS
  // ============================================

  describe('accessibility', () => {
    it('has group role on container', () => {
      render(<EmojiReaction {...defaultProps} />)
      expect(screen.getByRole('group')).toBeInTheDocument()
    })

    it('has aria-label on container', () => {
      render(<EmojiReaction {...defaultProps} />)
      expect(screen.getByRole('group')).toHaveAttribute('aria-label')
    })

    it('emoji buttons have aria-pressed attribute', () => {
      render(<EmojiReaction {...defaultProps} />)
      const button = screen.getByTestId('emoji-thumbs-up')
      expect(button).toHaveAttribute('aria-pressed')
    })

    it('emoji buttons have aria-label', () => {
      render(<EmojiReaction {...defaultProps} />)
      const button = screen.getByTestId('emoji-thumbs-up')
      expect(button).toHaveAttribute('aria-label')
    })

    it('emoji buttons are keyboard accessible', () => {
      render(<EmojiReaction {...defaultProps} />)
      const button = screen.getByTestId('emoji-thumbs-up')
      button.focus()
      expect(document.activeElement).toBe(button)
    })

    it('selects emoji on Enter key', () => {
      const onSelect = vi.fn()
      render(<EmojiReaction {...defaultProps} onSelect={onSelect} />)
      const button = screen.getByTestId('emoji-thumbs-up')
      button.focus()
      fireEvent.keyDown(button, { key: 'Enter' })
      expect(onSelect).toHaveBeenCalled()
    })
  })

  // ============================================
  // VISUAL STYLING TESTS
  // ============================================

  describe('visual styling', () => {
    it('applies selected styling to chosen emoji', async () => {
      const user = userEvent.setup()
      render(<EmojiReaction {...defaultProps} />)

      await user.click(screen.getByTestId('emoji-thumbs-up'))

      const button = screen.getByTestId('emoji-thumbs-up')
      expect(button.className).toMatch(/ring|border|scale/)
    })

    it('has hover effect on emoji buttons', () => {
      render(<EmojiReaction {...defaultProps} />)
      const button = screen.getByTestId('emoji-thumbs-up')
      expect(button.className).toContain('hover:')
    })

    it('has focus-visible ring styles', () => {
      render(<EmojiReaction {...defaultProps} />)
      const button = screen.getByTestId('emoji-thumbs-up')
      expect(button.className).toContain('focus-visible:ring')
    })

    it('renders emojis at readable size', () => {
      render(<EmojiReaction {...defaultProps} />)
      const button = screen.getByTestId('emoji-thumbs-up')
      expect(button.className).toMatch(/text-2xl|text-3xl|text-4xl/)
    })
  })
})
