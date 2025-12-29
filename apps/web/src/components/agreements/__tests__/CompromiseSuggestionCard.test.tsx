/**
 * Compromise Suggestion Card Component Tests.
 *
 * Story 5.4: Negotiation & Discussion Support - AC2
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CompromiseSuggestionCard } from '../CompromiseSuggestionCard'

describe('CompromiseSuggestionCard', () => {
  const mockOnSelectCompromise = vi.fn()
  const mockOnWriteOwn = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders with header', () => {
      render(
        <CompromiseSuggestionCard category="time" onSelectCompromise={mockOnSelectCompromise} />
      )

      expect(screen.getByTestId('compromise-suggestion-card')).toBeInTheDocument()
      expect(screen.getByText('Ideas for a Compromise')).toBeInTheDocument()
    })

    it('displays original term when provided', () => {
      render(
        <CompromiseSuggestionCard
          category="time"
          originalTerm="No screens after 8pm"
          onSelectCompromise={mockOnSelectCompromise}
        />
      )

      expect(screen.getByText('Discussing:')).toBeInTheDocument()
      expect(screen.getByText('No screens after 8pm')).toBeInTheDocument()
    })

    it('shows encouragement footer', () => {
      render(
        <CompromiseSuggestionCard category="apps" onSelectCompromise={mockOnSelectCompromise} />
      )

      expect(
        screen.getByText(/A good compromise means everyone gives a little/i)
      ).toBeInTheDocument()
    })
  })

  describe('Category-specific suggestions', () => {
    it('shows time-related suggestions for time category', () => {
      render(
        <CompromiseSuggestionCard category="time" onSelectCompromise={mockOnSelectCompromise} />
      )

      expect(screen.getByText(/Start with shorter time and earn more/i)).toBeInTheDocument()
    })

    it('shows app-related suggestions for apps category', () => {
      render(
        <CompromiseSuggestionCard category="apps" onSelectCompromise={mockOnSelectCompromise} />
      )

      expect(screen.getByText(/Try the app for a trial period/i)).toBeInTheDocument()
    })

    it('shows monitoring suggestions for monitoring category', () => {
      render(
        <CompromiseSuggestionCard
          category="monitoring"
          onSelectCompromise={mockOnSelectCompromise}
        />
      )

      expect(screen.getByText(/Trust trial - show responsibility first/i)).toBeInTheDocument()
    })

    it('shows reward suggestions for rewards category', () => {
      render(
        <CompromiseSuggestionCard category="rewards" onSelectCompromise={mockOnSelectCompromise} />
      )

      expect(screen.getByText(/Pick from a list of rewards/i)).toBeInTheDocument()
    })

    it('shows general suggestions for general category', () => {
      render(
        <CompromiseSuggestionCard category="general" onSelectCompromise={mockOnSelectCompromise} />
      )

      expect(screen.getByText(/Try it for a week, then revisit/i)).toBeInTheDocument()
    })
  })

  describe('Suggestion Expansion', () => {
    it('expands suggestion to show description when clicked', () => {
      render(
        <CompromiseSuggestionCard category="time" onSelectCompromise={mockOnSelectCompromise} />
      )

      const suggestion = screen.getByTestId('compromise-suggestion-time-1')
      fireEvent.click(suggestion.querySelector('button')!)

      expect(
        screen.getByText(/Begin with less screen time. If rules are followed/i)
      ).toBeInTheDocument()
    })

    it('shows "Use This Idea" button when expanded', () => {
      render(
        <CompromiseSuggestionCard category="time" onSelectCompromise={mockOnSelectCompromise} />
      )

      const suggestion = screen.getByTestId('compromise-suggestion-time-1')
      fireEvent.click(suggestion.querySelector('button')!)

      expect(screen.getByTestId('select-compromise-time-1')).toBeInTheDocument()
      expect(screen.getByText('Use This Idea')).toBeInTheDocument()
    })

    it('collapses suggestion when clicked again', () => {
      render(
        <CompromiseSuggestionCard category="time" onSelectCompromise={mockOnSelectCompromise} />
      )

      const suggestion = screen.getByTestId('compromise-suggestion-time-1')
      const toggleButton = suggestion.querySelector('button')!

      // Expand
      fireEvent.click(toggleButton)
      expect(screen.getByTestId('select-compromise-time-1')).toBeInTheDocument()

      // Collapse
      fireEvent.click(toggleButton)
      expect(screen.queryByTestId('select-compromise-time-1')).not.toBeInTheDocument()
    })
  })

  describe('Compromise Selection', () => {
    it('calls onSelectCompromise with suggestion when selected', () => {
      render(
        <CompromiseSuggestionCard category="time" onSelectCompromise={mockOnSelectCompromise} />
      )

      // Expand first suggestion
      const suggestion = screen.getByTestId('compromise-suggestion-time-1')
      fireEvent.click(suggestion.querySelector('button')!)

      // Select the compromise
      fireEvent.click(screen.getByTestId('select-compromise-time-1'))

      expect(mockOnSelectCompromise).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'time-1',
          text: expect.any(String),
          description: expect.any(String),
        })
      )
    })
  })

  describe('Write Own Option', () => {
    it('shows "Write Your Own" button when onWriteOwn provided', () => {
      render(
        <CompromiseSuggestionCard
          category="general"
          onSelectCompromise={mockOnSelectCompromise}
          onWriteOwn={mockOnWriteOwn}
        />
      )

      expect(screen.getByTestId('write-own-compromise')).toBeInTheDocument()
      expect(screen.getByText('Write Your Own Compromise')).toBeInTheDocument()
    })

    it('does not show "Write Your Own" button when onWriteOwn not provided', () => {
      render(
        <CompromiseSuggestionCard category="general" onSelectCompromise={mockOnSelectCompromise} />
      )

      expect(screen.queryByTestId('write-own-compromise')).not.toBeInTheDocument()
    })

    it('calls onWriteOwn when "Write Your Own" is clicked', () => {
      render(
        <CompromiseSuggestionCard
          category="general"
          onSelectCompromise={mockOnSelectCompromise}
          onWriteOwn={mockOnWriteOwn}
        />
      )

      fireEvent.click(screen.getByTestId('write-own-compromise'))

      expect(mockOnWriteOwn).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('has accessible expand/collapse buttons with aria-expanded', () => {
      render(
        <CompromiseSuggestionCard category="time" onSelectCompromise={mockOnSelectCompromise} />
      )

      const suggestion = screen.getByTestId('compromise-suggestion-time-1')
      const toggleButton = suggestion.querySelector('button')!

      expect(toggleButton).toHaveAttribute('aria-expanded', 'false')

      fireEvent.click(toggleButton)
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true')
    })

    it('has list role for suggestions', () => {
      render(
        <CompromiseSuggestionCard category="general" onSelectCompromise={mockOnSelectCompromise} />
      )

      expect(screen.getByRole('list', { name: /Compromise suggestions/i })).toBeInTheDocument()
    })

    it('has proper touch target sizes', () => {
      render(
        <CompromiseSuggestionCard category="general" onSelectCompromise={mockOnSelectCompromise} />
      )

      const suggestion = screen.getByTestId('compromise-suggestion-general-1')
      const button = suggestion.querySelector('button')!
      expect(button.className).toContain('min-h-[48px]')
    })
  })
})
