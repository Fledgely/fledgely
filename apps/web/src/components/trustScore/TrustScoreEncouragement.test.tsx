/**
 * TrustScoreEncouragement Component Tests - Story 36.3 Task 5
 *
 * Tests for encouragement and growth messaging component.
 * AC4: Language is encouraging, not punitive
 * AC6: Score framed as growth metric, not judgment
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TrustScoreEncouragement } from './TrustScoreEncouragement'

describe('TrustScoreEncouragement - Story 36.3 Task 5', () => {
  describe('AC4: Encouraging language', () => {
    it('should display encouragement message', () => {
      render(
        <TrustScoreEncouragement
          message="Great job! You're building trust."
          milestoneMessage={null}
        />
      )

      expect(screen.getByTestId('encouragement-message')).toHaveTextContent(
        "Great job! You're building trust."
      )
    })

    it('should not use punitive language', () => {
      render(
        <TrustScoreEncouragement
          message="Remember, you can always improve. Every day is a new chance!"
          milestoneMessage={null}
        />
      )

      const container = screen.getByTestId('trust-score-encouragement')
      const text = container.textContent?.toLowerCase() || ''
      expect(text).not.toContain('punishment')
      expect(text).not.toContain('failure')
      expect(text).not.toContain('bad')
      expect(text).not.toContain('wrong')
    })

    it('should use positive language even for lower scores', () => {
      render(
        <TrustScoreEncouragement
          message="Every day is a new chance to improve!"
          milestoneMessage={null}
        />
      )

      expect(screen.getByTestId('encouragement-message')).toHaveTextContent('new chance')
    })
  })

  describe('AC6: Growth-oriented framing', () => {
    it('should frame messaging as growth opportunity', () => {
      render(
        <TrustScoreEncouragement
          message="Nice work! Your score is improving."
          milestoneMessage={null}
        />
      )

      expect(screen.getByTestId('encouragement-message').textContent).toMatch(/improving/i)
    })

    it('should not use judgmental framing', () => {
      render(<TrustScoreEncouragement message="Keep it up!" milestoneMessage={null} />)

      const container = screen.getByTestId('trust-score-encouragement')
      const text = container.textContent?.toLowerCase() || ''
      expect(text).not.toContain('judge')
      expect(text).not.toContain('evaluated')
      expect(text).not.toContain('graded')
    })
  })

  describe('Milestone celebrations', () => {
    it('should display milestone message when provided', () => {
      render(
        <TrustScoreEncouragement message="Great job!" milestoneMessage="You reached 90! Amazing!" />
      )

      expect(screen.getByTestId('milestone-message')).toHaveTextContent('You reached 90!')
    })

    it('should not show milestone section when no milestone', () => {
      render(<TrustScoreEncouragement message="Great job!" milestoneMessage={null} />)

      expect(screen.queryByTestId('milestone-message')).not.toBeInTheDocument()
    })

    it('should use celebration styling for milestone', () => {
      render(<TrustScoreEncouragement message="Great job!" milestoneMessage="You reached 80!" />)

      const milestone = screen.getByTestId('milestone-message')
      expect(milestone).toHaveAttribute('data-type', 'celebration')
    })
  })

  describe('Rendering', () => {
    it('should render the encouragement container', () => {
      render(<TrustScoreEncouragement message="Keep going!" milestoneMessage={null} />)

      expect(screen.getByTestId('trust-score-encouragement')).toBeInTheDocument()
    })

    it('should have accessible structure', () => {
      render(<TrustScoreEncouragement message="Keep going!" milestoneMessage={null} />)

      const container = screen.getByTestId('trust-score-encouragement')
      expect(container).toHaveAttribute('aria-label')
    })
  })

  describe('Visual design', () => {
    it('should use positive visual styling', () => {
      render(<TrustScoreEncouragement message="Great job!" milestoneMessage={null} />)

      const container = screen.getByTestId('trust-score-encouragement')
      expect(container).toHaveAttribute('data-mood', 'positive')
    })

    it('should show icon for encouragement', () => {
      render(<TrustScoreEncouragement message="Keep it up!" milestoneMessage={null} />)

      expect(screen.getByTestId('encouragement-icon')).toBeInTheDocument()
    })

    it('should show special icon for milestone celebration', () => {
      render(<TrustScoreEncouragement message="Great job!" milestoneMessage="You reached 90!" />)

      expect(screen.getByTestId('milestone-icon')).toBeInTheDocument()
    })
  })

  describe('Different message types', () => {
    it('should handle high score encouragement', () => {
      render(
        <TrustScoreEncouragement
          message="Amazing progress! You're doing great!"
          milestoneMessage={null}
        />
      )

      expect(screen.getByTestId('encouragement-message')).toHaveTextContent('Amazing progress')
    })

    it('should handle stable score encouragement', () => {
      render(
        <TrustScoreEncouragement
          message="Keep it up! Your trust score is strong."
          milestoneMessage={null}
        />
      )

      expect(screen.getByTestId('encouragement-message')).toHaveTextContent('trust score is strong')
    })

    it('should handle improvement-focused encouragement', () => {
      render(
        <TrustScoreEncouragement message="You're doing well. Keep going!" milestoneMessage={null} />
      )

      expect(screen.getByTestId('encouragement-message')).toHaveTextContent('Keep going')
    })
  })

  describe('Combined display', () => {
    it('should show both encouragement and milestone when both provided', () => {
      render(
        <TrustScoreEncouragement message="Amazing progress!" milestoneMessage="You reached 90!" />
      )

      expect(screen.getByTestId('encouragement-message')).toBeInTheDocument()
      expect(screen.getByTestId('milestone-message')).toBeInTheDocument()
    })

    it('should show milestone above encouragement', () => {
      render(
        <TrustScoreEncouragement message="Amazing progress!" milestoneMessage="You reached 90!" />
      )

      const container = screen.getByTestId('trust-score-encouragement')
      const children = Array.from(container.children)
      const milestoneIndex = children.findIndex(
        (el) => el.getAttribute('data-testid') === 'milestone-section'
      )
      const encouragementIndex = children.findIndex(
        (el) => el.getAttribute('data-testid') === 'encouragement-section'
      )
      expect(milestoneIndex).toBeLessThan(encouragementIndex)
    })
  })
})
