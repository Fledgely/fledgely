/**
 * Discussion Prompt Card Component Tests.
 *
 * Story 5.4: Negotiation & Discussion Support - AC1, AC6
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DiscussionPromptCard } from '../DiscussionPromptCard'

describe('DiscussionPromptCard', () => {
  const childName = 'Emma'

  describe('Rendering', () => {
    it('renders with discussion prompt header', () => {
      render(<DiscussionPromptCard category="time" childName={childName} />)

      expect(screen.getByTestId('discussion-prompt-card')).toBeInTheDocument()
      expect(screen.getByText(/Let's talk|I want to hear|Your ideas/i)).toBeInTheDocument()
    })

    it('displays personalized intro with child name', () => {
      render(<DiscussionPromptCard category="apps" childName={childName} />)

      expect(
        screen.getByText(/Emma, here are some questions to help you share your thoughts/i)
      ).toBeInTheDocument()
    })

    it('renders at least one discussion prompt', () => {
      render(<DiscussionPromptCard category="monitoring" childName={childName} />)

      expect(screen.getByTestId('discussion-prompt-0')).toBeInTheDocument()
    })

    it('shows encouragement footer', () => {
      render(<DiscussionPromptCard category="rewards" childName={childName} />)

      expect(
        screen.getByText(/There are no wrong answers. Be honest about how you feel!/i)
      ).toBeInTheDocument()
    })
  })

  describe('Category-specific prompts', () => {
    it('shows time-related prompts for time category', () => {
      render(<DiscussionPromptCard category="time" childName={childName} showAllPrompts={true} />)

      expect(screen.getByText(/screen time feels fair/i)).toBeInTheDocument()
    })

    it('shows app-related prompts for apps category', () => {
      render(<DiscussionPromptCard category="apps" childName={childName} showAllPrompts={true} />)

      expect(screen.getByText(/apps are most important/i)).toBeInTheDocument()
    })

    it('shows monitoring-related prompts for monitoring category', () => {
      render(
        <DiscussionPromptCard category="monitoring" childName={childName} showAllPrompts={true} />
      )

      expect(screen.getByText(/feel about having this rule/i)).toBeInTheDocument()
    })

    it('shows reward-related prompts for rewards category', () => {
      render(
        <DiscussionPromptCard category="rewards" childName={childName} showAllPrompts={true} />
      )

      expect(screen.getByText(/reward would make you excited/i)).toBeInTheDocument()
    })

    it('shows general prompts for general category', () => {
      render(
        <DiscussionPromptCard category="general" childName={childName} showAllPrompts={true} />
      )

      expect(screen.getByText(/Tell me more about what you think/i)).toBeInTheDocument()
    })
  })

  describe('Prompt Selection', () => {
    it('calls onPromptSelect when a prompt is clicked', () => {
      const mockOnPromptSelect = vi.fn()
      render(
        <DiscussionPromptCard
          category="time"
          childName={childName}
          onPromptSelect={mockOnPromptSelect}
        />
      )

      fireEvent.click(screen.getByTestId('discussion-prompt-0'))

      expect(mockOnPromptSelect).toHaveBeenCalled()
    })

    it('passes the prompt text to onPromptSelect', () => {
      const mockOnPromptSelect = vi.fn()
      render(
        <DiscussionPromptCard
          category="time"
          childName={childName}
          onPromptSelect={mockOnPromptSelect}
        />
      )

      fireEvent.click(screen.getByTestId('discussion-prompt-0'))

      expect(mockOnPromptSelect).toHaveBeenCalledWith(expect.any(String))
    })
  })

  describe('Show More Prompts', () => {
    it('shows "See more questions" button when not showing all', () => {
      render(<DiscussionPromptCard category="time" childName={childName} showAllPrompts={false} />)

      expect(screen.getByTestId('show-more-prompts')).toBeInTheDocument()
    })

    it('does not show "See more questions" when showing all prompts', () => {
      render(<DiscussionPromptCard category="time" childName={childName} showAllPrompts={true} />)

      expect(screen.queryByTestId('show-more-prompts')).not.toBeInTheDocument()
    })

    it('shows multiple prompts when showAllPrompts is true', () => {
      render(<DiscussionPromptCard category="time" childName={childName} showAllPrompts={true} />)

      // Time category has 3 prompts
      expect(screen.getByTestId('discussion-prompt-0')).toBeInTheDocument()
      expect(screen.getByTestId('discussion-prompt-1')).toBeInTheDocument()
      expect(screen.getByTestId('discussion-prompt-2')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has accessible buttons with min touch targets', () => {
      render(<DiscussionPromptCard category="general" childName={childName} />)

      const promptButton = screen.getByTestId('discussion-prompt-0')
      expect(promptButton.className).toContain('min-h-[48px]')
    })

    it('has focus ring for keyboard navigation', () => {
      render(<DiscussionPromptCard category="general" childName={childName} />)

      const promptButton = screen.getByTestId('discussion-prompt-0')
      expect(promptButton.className).toContain('focus:ring-2')
    })
  })
})
