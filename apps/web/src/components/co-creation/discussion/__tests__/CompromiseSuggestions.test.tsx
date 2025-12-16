/**
 * Tests for CompromiseSuggestions Component
 *
 * Story 5.4: Negotiation & Discussion Support - Task 4.6
 *
 * Tests for compromise suggestion display and acceptance.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CompromiseSuggestions } from '../CompromiseSuggestions'
import { COMPROMISE_SUGGESTIONS } from '../discussionUtils'

// ============================================
// DEFAULT PROPS
// ============================================

const defaultProps = {
  termType: 'screen_time' as const,
  contributor: 'parent' as const,
  onAcceptSuggestion: vi.fn(),
}

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('CompromiseSuggestions', () => {
  describe('basic rendering', () => {
    it('renders the component for term types with suggestions', () => {
      render(<CompromiseSuggestions {...defaultProps} />)
      expect(screen.getByTestId('compromise-suggestions')).toBeInTheDocument()
    })

    it('renders custom data-testid', () => {
      render(<CompromiseSuggestions {...defaultProps} data-testid="custom-suggestions" />)
      expect(screen.getByTestId('custom-suggestions')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<CompromiseSuggestions {...defaultProps} className="custom-class" />)
      expect(screen.getByTestId('compromise-suggestions')).toHaveClass('custom-class')
    })

    it('shows header text', () => {
      render(<CompromiseSuggestions {...defaultProps} />)
      expect(screen.getByText('Try a compromise')).toBeInTheDocument()
    })

    it('shows description text', () => {
      render(<CompromiseSuggestions {...defaultProps} />)
      expect(screen.getByTestId('suggestions-description')).toHaveTextContent(
        'These ideas might help you find middle ground.'
      )
    })
  })

  // ============================================
  // SUGGESTIONS FOR DIFFERENT TERM TYPES
  // ============================================

  describe('term type suggestions', () => {
    it('shows screen_time suggestions', () => {
      render(<CompromiseSuggestions {...defaultProps} termType="screen_time" />)
      expect(screen.getByText('Try 30 minutes less')).toBeInTheDocument()
      expect(screen.getByText('Try 15 minutes more')).toBeInTheDocument()
      expect(screen.getByText('Less on school days, more on weekends')).toBeInTheDocument()
    })

    it('shows bedtime suggestions', () => {
      render(<CompromiseSuggestions {...defaultProps} termType="bedtime" />)
      expect(screen.getByText('Try 15 minutes earlier')).toBeInTheDocument()
      expect(screen.getByText('Try 15 minutes later')).toBeInTheDocument()
      expect(screen.getByText('Later bedtime on weekends')).toBeInTheDocument()
    })

    it('shows monitoring suggestions', () => {
      render(<CompromiseSuggestions {...defaultProps} termType="monitoring" />)
      expect(screen.getByText('Try a 2-week trial at lower level')).toBeInTheDocument()
      expect(screen.getByText('Gradually reduce over time')).toBeInTheDocument()
    })

    it('does not render for term types without suggestions', () => {
      render(<CompromiseSuggestions {...defaultProps} termType="rule" />)
      expect(screen.queryByTestId('compromise-suggestions')).not.toBeInTheDocument()
    })

    it('does not render for consequence type', () => {
      render(<CompromiseSuggestions {...defaultProps} termType="consequence" />)
      expect(screen.queryByTestId('compromise-suggestions')).not.toBeInTheDocument()
    })

    it('does not render for reward type', () => {
      render(<CompromiseSuggestions {...defaultProps} termType="reward" />)
      expect(screen.queryByTestId('compromise-suggestions')).not.toBeInTheDocument()
    })
  })

  // ============================================
  // SUGGESTION BUTTONS TESTS
  // ============================================

  describe('suggestion buttons', () => {
    it('renders all suggestions as buttons', () => {
      render(<CompromiseSuggestions {...defaultProps} termType="screen_time" />)
      const suggestions = COMPROMISE_SUGGESTIONS.screen_time
      suggestions.forEach((_, index) => {
        expect(screen.getByTestId(`suggestion-${index}`)).toBeInTheDocument()
      })
    })

    it('shows lightbulb icon for unaccepted suggestions', () => {
      render(<CompromiseSuggestions {...defaultProps} />)
      const button = screen.getByTestId('suggestion-0')
      expect(button).toHaveTextContent('💡')
    })

    it('shows "Try it" label for unaccepted suggestions', () => {
      render(<CompromiseSuggestions {...defaultProps} />)
      expect(screen.getAllByText('Try it').length).toBeGreaterThan(0)
    })
  })

  // ============================================
  // ACCEPTANCE TESTS
  // ============================================

  describe('accepting suggestions', () => {
    it('calls onAcceptSuggestion when button clicked', async () => {
      const onAcceptSuggestion = vi.fn()
      const user = userEvent.setup()
      render(
        <CompromiseSuggestions
          {...defaultProps}
          onAcceptSuggestion={onAcceptSuggestion}
        />
      )

      await user.click(screen.getByTestId('suggestion-0'))

      expect(onAcceptSuggestion).toHaveBeenCalledWith(
        COMPROMISE_SUGGESTIONS.screen_time[0],
        'parent'
      )
    })

    it('passes contributor to callback', async () => {
      const onAcceptSuggestion = vi.fn()
      const user = userEvent.setup()
      render(
        <CompromiseSuggestions
          {...defaultProps}
          contributor="child"
          onAcceptSuggestion={onAcceptSuggestion}
        />
      )

      await user.click(screen.getByTestId('suggestion-0'))

      expect(onAcceptSuggestion).toHaveBeenCalledWith(
        expect.anything(),
        'child'
      )
    })

    it('shows checkmark for accepted suggestion', () => {
      render(
        <CompromiseSuggestions
          {...defaultProps}
          acceptedSuggestionId={COMPROMISE_SUGGESTIONS.screen_time[0].id}
        />
      )
      const acceptedButton = screen.getByTestId('suggestion-0')
      expect(acceptedButton).toHaveTextContent('✓')
    })

    it('shows "Accepted" label for accepted suggestion', () => {
      render(
        <CompromiseSuggestions
          {...defaultProps}
          acceptedSuggestionId={COMPROMISE_SUGGESTIONS.screen_time[0].id}
        />
      )
      expect(screen.getByText('Accepted')).toBeInTheDocument()
    })

    it('shows accepted status message', () => {
      render(
        <CompromiseSuggestions
          {...defaultProps}
          acceptedSuggestionId={COMPROMISE_SUGGESTIONS.screen_time[0].id}
        />
      )
      expect(screen.getByTestId('accepted-status')).toHaveTextContent(
        'Term value has been updated with your compromise'
      )
    })

    it('disables accepted suggestion button', () => {
      render(
        <CompromiseSuggestions
          {...defaultProps}
          acceptedSuggestionId={COMPROMISE_SUGGESTIONS.screen_time[0].id}
        />
      )
      expect(screen.getByTestId('suggestion-0')).toBeDisabled()
    })
  })

  // ============================================
  // DISABLED STATE TESTS
  // ============================================

  describe('disabled state', () => {
    it('disables all buttons when disabled prop is true', () => {
      render(<CompromiseSuggestions {...defaultProps} disabled />)
      const suggestions = COMPROMISE_SUGGESTIONS.screen_time
      suggestions.forEach((_, index) => {
        expect(screen.getByTestId(`suggestion-${index}`)).toBeDisabled()
      })
    })

    it('does not call onAcceptSuggestion when disabled', async () => {
      const onAcceptSuggestion = vi.fn()
      const user = userEvent.setup()
      render(
        <CompromiseSuggestions
          {...defaultProps}
          disabled
          onAcceptSuggestion={onAcceptSuggestion}
        />
      )

      await user.click(screen.getByTestId('suggestion-0'))

      expect(onAcceptSuggestion).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // STYLING TESTS
  // ============================================

  describe('styling', () => {
    it('applies green styling to accepted suggestion', () => {
      render(
        <CompromiseSuggestions
          {...defaultProps}
          acceptedSuggestionId={COMPROMISE_SUGGESTIONS.screen_time[0].id}
        />
      )
      const acceptedButton = screen.getByTestId('suggestion-0')
      expect(acceptedButton.className).toMatch(/green/)
    })

    it('applies default styling to non-accepted suggestions', () => {
      render(<CompromiseSuggestions {...defaultProps} />)
      const button = screen.getByTestId('suggestion-0')
      expect(button.className).toMatch(/border-gray/)
    })
  })

  // ============================================
  // ACCESSIBILITY TESTS (NFR42, NFR43, NFR49)
  // ============================================

  describe('accessibility', () => {
    it('has region role with label', () => {
      render(<CompromiseSuggestions {...defaultProps} />)
      expect(screen.getByRole('region')).toBeInTheDocument()
      expect(screen.getByRole('region')).toHaveAttribute('aria-labelledby')
    })

    it('suggestions group has aria-label', () => {
      render(<CompromiseSuggestions {...defaultProps} />)
      expect(screen.getByTestId('suggestions-list')).toHaveAttribute(
        'aria-label',
        'Compromise suggestions'
      )
    })

    it('buttons have aria-pressed attribute', () => {
      render(
        <CompromiseSuggestions
          {...defaultProps}
          acceptedSuggestionId={COMPROMISE_SUGGESTIONS.screen_time[0].id}
        />
      )
      expect(screen.getByTestId('suggestion-0')).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByTestId('suggestion-1')).toHaveAttribute('aria-pressed', 'false')
    })

    it('buttons have descriptive aria-label', () => {
      render(<CompromiseSuggestions {...defaultProps} />)
      const button = screen.getByTestId('suggestion-0')
      expect(button).toHaveAttribute('aria-label')
      expect(button.getAttribute('aria-label')).toContain('Suggest:')
    })

    it('accepted button has appropriate aria-label', () => {
      render(
        <CompromiseSuggestions
          {...defaultProps}
          acceptedSuggestionId={COMPROMISE_SUGGESTIONS.screen_time[0].id}
        />
      )
      const button = screen.getByTestId('suggestion-0')
      expect(button.getAttribute('aria-label')).toContain('Accepted:')
    })

    it('provides screen reader announcement area', () => {
      render(<CompromiseSuggestions {...defaultProps} />)
      const announcement = screen.getByTestId('suggestions-announcement')
      expect(announcement).toHaveAttribute('aria-live', 'polite')
      expect(announcement).toHaveClass('sr-only')
    })

    it('accepted status has role="status"', () => {
      render(
        <CompromiseSuggestions
          {...defaultProps}
          acceptedSuggestionId={COMPROMISE_SUGGESTIONS.screen_time[0].id}
        />
      )
      expect(screen.getByTestId('accepted-status')).toHaveAttribute('role', 'status')
    })

    it('decorative icons are hidden from screen readers', () => {
      render(<CompromiseSuggestions {...defaultProps} />)
      const header = screen.getByText('🤝')
      expect(header).toHaveAttribute('aria-hidden', 'true')
    })

    it('buttons have minimum touch target size (NFR49)', () => {
      render(<CompromiseSuggestions {...defaultProps} />)
      const button = screen.getByTestId('suggestion-0')
      expect(button.className).toMatch(/min-h-\[44px\]/)
    })
  })

  // ============================================
  // KEYBOARD NAVIGATION TESTS (NFR43)
  // ============================================

  describe('keyboard navigation (NFR43)', () => {
    it('buttons are focusable', () => {
      render(<CompromiseSuggestions {...defaultProps} />)
      const button = screen.getByTestId('suggestion-0')
      button.focus()
      expect(document.activeElement).toBe(button)
    })

    it('can activate button with Enter key', async () => {
      const onAcceptSuggestion = vi.fn()
      const user = userEvent.setup()
      render(
        <CompromiseSuggestions
          {...defaultProps}
          onAcceptSuggestion={onAcceptSuggestion}
        />
      )
      const button = screen.getByTestId('suggestion-0')

      button.focus()
      await user.keyboard('{Enter}')

      expect(onAcceptSuggestion).toHaveBeenCalled()
    })

    it('can activate button with Space key', async () => {
      const onAcceptSuggestion = vi.fn()
      const user = userEvent.setup()
      render(
        <CompromiseSuggestions
          {...defaultProps}
          onAcceptSuggestion={onAcceptSuggestion}
        />
      )
      const button = screen.getByTestId('suggestion-0')

      button.focus()
      await user.keyboard(' ')

      expect(onAcceptSuggestion).toHaveBeenCalled()
    })

    it('has visible focus indicator', () => {
      render(<CompromiseSuggestions {...defaultProps} />)
      const button = screen.getByTestId('suggestion-0')
      expect(button.className).toMatch(/focus:ring/)
    })
  })
})
