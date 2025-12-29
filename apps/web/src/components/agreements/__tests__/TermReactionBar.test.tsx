/**
 * Term Reaction Bar Component Tests.
 *
 * Story 5.3: Child Contribution Capture - AC2, AC4
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TermReactionBar } from '../TermReactionBar'
import type { TermReaction, ContributionParty } from '@fledgely/shared/contracts'

describe('TermReactionBar', () => {
  const mockOnReact = vi.fn()
  const termId = 'term-1'
  const currentParty: ContributionParty = 'child'
  const emptyReactions: TermReaction[] = []

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders all reaction buttons', () => {
      render(
        <TermReactionBar
          termId={termId}
          reactions={emptyReactions}
          currentParty={currentParty}
          onReact={mockOnReact}
        />
      )

      expect(screen.getByTestId('reaction-agree')).toBeInTheDocument()
      expect(screen.getByTestId('reaction-question')).toBeInTheDocument()
      expect(screen.getByTestId('reaction-discuss')).toBeInTheDocument()
      expect(screen.getByTestId('reaction-love')).toBeInTheDocument()
      expect(screen.getByTestId('reaction-think')).toBeInTheDocument()
    })

    it('renders emoji picker toggle when enabled', () => {
      render(
        <TermReactionBar
          termId={termId}
          reactions={emptyReactions}
          currentParty={currentParty}
          onReact={mockOnReact}
          showEmojiPicker={true}
        />
      )

      expect(screen.getByTestId('emoji-picker-toggle')).toBeInTheDocument()
    })

    it('does not render emoji picker when disabled', () => {
      render(
        <TermReactionBar
          termId={termId}
          reactions={emptyReactions}
          currentParty={currentParty}
          onReact={mockOnReact}
          showEmojiPicker={false}
        />
      )

      expect(screen.queryByTestId('emoji-picker-toggle')).not.toBeInTheDocument()
    })

    it('has accessible labels for all buttons', () => {
      render(
        <TermReactionBar
          termId={termId}
          reactions={emptyReactions}
          currentParty={currentParty}
          onReact={mockOnReact}
        />
      )

      expect(screen.getByRole('button', { name: /i agree/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /i have a question/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /let's discuss/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /love it/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /need to think/i })).toBeInTheDocument()
    })
  })

  describe('Reaction Interactions', () => {
    it('calls onReact when reaction button is clicked', () => {
      render(
        <TermReactionBar
          termId={termId}
          reactions={emptyReactions}
          currentParty={currentParty}
          onReact={mockOnReact}
        />
      )

      fireEvent.click(screen.getByTestId('reaction-agree'))
      expect(mockOnReact).toHaveBeenCalledWith('agree')
    })

    it('calls onReact with question type', () => {
      render(
        <TermReactionBar
          termId={termId}
          reactions={emptyReactions}
          currentParty={currentParty}
          onReact={mockOnReact}
        />
      )

      fireEvent.click(screen.getByTestId('reaction-question'))
      expect(mockOnReact).toHaveBeenCalledWith('question')
    })

    it('calls onReact with discuss type', () => {
      render(
        <TermReactionBar
          termId={termId}
          reactions={emptyReactions}
          currentParty={currentParty}
          onReact={mockOnReact}
        />
      )

      fireEvent.click(screen.getByTestId('reaction-discuss'))
      expect(mockOnReact).toHaveBeenCalledWith('discuss')
    })
  })

  describe('Active State', () => {
    it('shows active state when party has reaction', () => {
      const reactionsWithAgree: TermReaction[] = [
        {
          id: 'reaction-1',
          termId,
          party: currentParty,
          type: 'agree',
          emoji: null,
          createdAt: new Date(),
        },
      ]

      render(
        <TermReactionBar
          termId={termId}
          reactions={reactionsWithAgree}
          currentParty={currentParty}
          onReact={mockOnReact}
        />
      )

      const agreeButton = screen.getByTestId('reaction-agree')
      expect(agreeButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('shows inactive state when party has no reaction', () => {
      render(
        <TermReactionBar
          termId={termId}
          reactions={emptyReactions}
          currentParty={currentParty}
          onReact={mockOnReact}
        />
      )

      const agreeButton = screen.getByTestId('reaction-agree')
      expect(agreeButton).toHaveAttribute('aria-pressed', 'false')
    })
  })

  describe('Reaction Counts', () => {
    it('displays reaction count when multiple reactions exist', () => {
      const multipleReactions: TermReaction[] = [
        {
          id: 'reaction-1',
          termId,
          party: 'child',
          type: 'agree',
          emoji: null,
          createdAt: new Date(),
        },
        {
          id: 'reaction-2',
          termId,
          party: 'parent',
          type: 'agree',
          emoji: null,
          createdAt: new Date(),
        },
      ]

      render(
        <TermReactionBar
          termId={termId}
          reactions={multipleReactions}
          currentParty={currentParty}
          onReact={mockOnReact}
        />
      )

      // Should show count of 2 for agree reactions
      const agreeButton = screen.getByTestId('reaction-agree')
      expect(agreeButton).toHaveTextContent('2')
    })

    it('does not display count when no reactions', () => {
      render(
        <TermReactionBar
          termId={termId}
          reactions={emptyReactions}
          currentParty={currentParty}
          onReact={mockOnReact}
        />
      )

      const agreeButton = screen.getByTestId('reaction-agree')
      expect(agreeButton.textContent).not.toMatch(/\d/)
    })
  })

  describe('Emoji Picker', () => {
    it('opens emoji picker when toggle is clicked', () => {
      render(
        <TermReactionBar
          termId={termId}
          reactions={emptyReactions}
          currentParty={currentParty}
          onReact={mockOnReact}
          showEmojiPicker={true}
        />
      )

      expect(screen.queryByTestId('emoji-picker')).not.toBeInTheDocument()

      fireEvent.click(screen.getByTestId('emoji-picker-toggle'))

      expect(screen.getByTestId('emoji-picker')).toBeInTheDocument()
    })

    it('calls onReact with emoji when emoji is selected', () => {
      render(
        <TermReactionBar
          termId={termId}
          reactions={emptyReactions}
          currentParty={currentParty}
          onReact={mockOnReact}
          showEmojiPicker={true}
        />
      )

      fireEvent.click(screen.getByTestId('emoji-picker-toggle'))
      fireEvent.click(screen.getByTestId('emoji-option-👍'))

      expect(mockOnReact).toHaveBeenCalledWith('love', '👍')
    })

    it('closes emoji picker after selection', () => {
      render(
        <TermReactionBar
          termId={termId}
          reactions={emptyReactions}
          currentParty={currentParty}
          onReact={mockOnReact}
          showEmojiPicker={true}
        />
      )

      fireEvent.click(screen.getByTestId('emoji-picker-toggle'))
      expect(screen.getByTestId('emoji-picker')).toBeInTheDocument()

      fireEvent.click(screen.getByTestId('emoji-option-😊'))

      expect(screen.queryByTestId('emoji-picker')).not.toBeInTheDocument()
    })
  })

  describe('Size Variants', () => {
    it('applies medium size styles by default', () => {
      render(
        <TermReactionBar
          termId={termId}
          reactions={emptyReactions}
          currentParty={currentParty}
          onReact={mockOnReact}
        />
      )

      const button = screen.getByTestId('reaction-agree')
      expect(button.className).toContain('min-h-[48px]')
    })

    it('applies small size styles when specified', () => {
      render(
        <TermReactionBar
          termId={termId}
          reactions={emptyReactions}
          currentParty={currentParty}
          onReact={mockOnReact}
          size="small"
        />
      )

      const button = screen.getByTestId('reaction-agree')
      expect(button.className).toContain('min-h-[44px]')
    })
  })

  describe('Accessibility', () => {
    it('has correct aria-expanded for emoji picker toggle', () => {
      render(
        <TermReactionBar
          termId={termId}
          reactions={emptyReactions}
          currentParty={currentParty}
          onReact={mockOnReact}
          showEmojiPicker={true}
        />
      )

      const toggle = screen.getByTestId('emoji-picker-toggle')
      expect(toggle).toHaveAttribute('aria-expanded', 'false')

      fireEvent.click(toggle)
      expect(toggle).toHaveAttribute('aria-expanded', 'true')
    })

    it('emoji picker has correct role', () => {
      render(
        <TermReactionBar
          termId={termId}
          reactions={emptyReactions}
          currentParty={currentParty}
          onReact={mockOnReact}
          showEmojiPicker={true}
        />
      )

      fireEvent.click(screen.getByTestId('emoji-picker-toggle'))

      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })
  })
})
