/**
 * DignitySafeDisplay Component Tests - Story 36.6 Task 5
 *
 * Tests for dignity-preserving display of trust scores.
 * AC6: Privacy maintains dignity and prevents shame
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DignitySafeDisplay } from './DignitySafeDisplay'

describe('DignitySafeDisplay - Story 36.6 Task 5', () => {
  describe('AC6: Privacy maintains dignity', () => {
    it('should render the display container', () => {
      render(<DignitySafeDisplay score={85} />)

      expect(screen.getByTestId('dignity-safe-display')).toBeInTheDocument()
    })

    it('should NOT use shame-inducing language', () => {
      render(<DignitySafeDisplay score={25} />) // Very low score

      const display = screen.getByTestId('dignity-safe-display')

      // Check for absence of shame language
      expect(display.textContent).not.toMatch(/bad|poor|fail|shame|disappoint|worst/i)
    })

    it('should use growth-focused messaging for low scores', () => {
      render(<DignitySafeDisplay score={30} />)

      expect(screen.getByTestId('score-message')).toBeInTheDocument()
      expect(screen.getByTestId('score-message').textContent).toMatch(
        /grow|build|journey|opportunity/i
      )
    })

    it('should use encouraging framing for all score levels', () => {
      render(<DignitySafeDisplay score={45} />)

      const message = screen.getByTestId('score-message')
      expect(message.textContent).toMatch(/progress|grow|build|journey/i)
    })
  })

  describe('Score level messaging', () => {
    it('should show appropriate message for high scores (80+)', () => {
      render(<DignitySafeDisplay score={85} />)

      expect(screen.getByTestId('score-level')).toHaveTextContent(/high.*trust/i)
    })

    it('should show appropriate message for medium scores (50-79)', () => {
      render(<DignitySafeDisplay score={65} />)

      expect(screen.getByTestId('score-level')).toHaveTextContent(/grow/i)
    })

    it('should show appropriate message for low scores (<50)', () => {
      render(<DignitySafeDisplay score={35} />)

      expect(screen.getByTestId('score-level')).toHaveTextContent(/build/i)
    })
  })

  describe('Private context for low scores', () => {
    it('should show private encouragement for low scores', () => {
      render(<DignitySafeDisplay score={25} showPrivateContext />)

      expect(screen.getByTestId('private-context')).toBeInTheDocument()
    })

    it('should provide actionable guidance', () => {
      render(<DignitySafeDisplay score={25} showPrivateContext />)

      const context = screen.getByTestId('private-context')
      expect(context.textContent).toMatch(/together|help|support/i)
    })

    it('should not show private context for high scores', () => {
      render(<DignitySafeDisplay score={85} showPrivateContext />)

      expect(screen.queryByTestId('private-context')).not.toBeInTheDocument()
    })

    it('should not show context when disabled', () => {
      render(<DignitySafeDisplay score={25} showPrivateContext={false} />)

      expect(screen.queryByTestId('private-context')).not.toBeInTheDocument()
    })
  })

  describe('Score display', () => {
    it('should display the score value', () => {
      render(<DignitySafeDisplay score={75} />)

      expect(screen.getByTestId('score-value')).toHaveTextContent('75')
    })

    it('should use appropriate color for high scores', () => {
      render(<DignitySafeDisplay score={85} />)

      const scoreValue = screen.getByTestId('score-value')
      // Green color for high scores
      expect(scoreValue.style.color).toBe('rgb(5, 150, 105)')
    })

    it('should use neutral color for growing scores', () => {
      render(<DignitySafeDisplay score={65} />)

      const scoreValue = screen.getByTestId('score-value')
      // Amber color for growing scores
      expect(scoreValue.style.color).toBe('rgb(217, 119, 6)')
    })

    it('should use calm color for building scores (not alarming)', () => {
      render(<DignitySafeDisplay score={35} />)

      const scoreValue = screen.getByTestId('score-value')
      // Should NOT be red/alarming, should be calm gray
      expect(scoreValue.style.color).toBe('rgb(107, 114, 128)')
    })
  })

  describe('Visual treatment', () => {
    it('should not use alarming colors for low scores', () => {
      render(<DignitySafeDisplay score={20} />)

      const display = screen.getByTestId('dignity-safe-display')

      // No red background for low scores - should be white
      expect(display.style.backgroundColor).not.toMatch(/red|#dc2626|#ef4444/)
      expect(display.style.backgroundColor).toBe('white')
    })

    it('should maintain consistent card styling across all scores', () => {
      const { rerender } = render(<DignitySafeDisplay score={90} />)
      const highCard = screen.getByTestId('dignity-safe-display')

      rerender(<DignitySafeDisplay score={30} />)
      const lowCard = screen.getByTestId('dignity-safe-display')

      // Both should have the same basic styling
      expect(highCard.style.borderRadius).toBe(lowCard.style.borderRadius)
    })
  })

  describe('Accessibility', () => {
    it('should have accessible heading', () => {
      render(<DignitySafeDisplay score={75} />)

      expect(screen.getByRole('heading')).toBeInTheDocument()
    })

    it('should use aria-label for score context', () => {
      render(<DignitySafeDisplay score={75} />)

      expect(screen.getByTestId('score-value')).toHaveAttribute('aria-label')
    })
  })
})
