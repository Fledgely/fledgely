/**
 * TrustScoreCard Component Tests - Story 36.3 Task 1
 *
 * Tests for the main trust score display card for child view.
 * AC1: Score displayed prominently: "Your trust score: 85"
 * AC6: Score framed as growth metric, not judgment
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TrustScoreCard } from './TrustScoreCard'
import { type TrustScore, TRUST_SCORE_DEFAULT } from '@fledgely/shared'

const createTrustScore = (score: number, overrides?: Partial<TrustScore>): TrustScore => ({
  id: 'ts-123',
  childId: 'child-123',
  currentScore: score,
  history: [],
  factors: [],
  lastUpdatedAt: new Date(),
  createdAt: new Date(),
  ...overrides,
})

describe('TrustScoreCard - Story 36.3 Task 1', () => {
  describe('AC1: Score displayed prominently', () => {
    it('should display the score prominently', () => {
      const trustScore = createTrustScore(85)

      render(<TrustScoreCard childId="child-123" trustScore={trustScore} />)

      expect(screen.getByTestId('trust-score-value')).toHaveTextContent('85')
    })

    it('should display "Your trust score" label', () => {
      const trustScore = createTrustScore(85)

      render(<TrustScoreCard childId="child-123" trustScore={trustScore} />)

      expect(screen.getByText(/Your trust score/i)).toBeInTheDocument()
    })

    it('should render the card container', () => {
      const trustScore = createTrustScore(85)

      render(<TrustScoreCard childId="child-123" trustScore={trustScore} />)

      expect(screen.getByTestId('trust-score-card')).toBeInTheDocument()
    })

    it('should display score 0 correctly', () => {
      const trustScore = createTrustScore(0)

      render(<TrustScoreCard childId="child-123" trustScore={trustScore} />)

      expect(screen.getByTestId('trust-score-value')).toHaveTextContent('0')
    })

    it('should display score 100 correctly', () => {
      const trustScore = createTrustScore(100)

      render(<TrustScoreCard childId="child-123" trustScore={trustScore} />)

      expect(screen.getByTestId('trust-score-value')).toHaveTextContent('100')
    })

    it('should display default score 70', () => {
      const trustScore = createTrustScore(TRUST_SCORE_DEFAULT)

      render(<TrustScoreCard childId="child-123" trustScore={trustScore} />)

      expect(screen.getByTestId('trust-score-value')).toHaveTextContent('70')
    })
  })

  describe('Encouraging color scheme', () => {
    it('should use green color for high scores (80+)', () => {
      const trustScore = createTrustScore(85)

      render(<TrustScoreCard childId="child-123" trustScore={trustScore} />)

      const card = screen.getByTestId('trust-score-card')
      expect(card).toHaveAttribute('data-score-level', 'high')
    })

    it('should use green color for score 90+', () => {
      const trustScore = createTrustScore(95)

      render(<TrustScoreCard childId="child-123" trustScore={trustScore} />)

      const card = screen.getByTestId('trust-score-card')
      expect(card).toHaveAttribute('data-score-level', 'high')
    })

    it('should use neutral color for mid scores (50-79)', () => {
      const trustScore = createTrustScore(70)

      render(<TrustScoreCard childId="child-123" trustScore={trustScore} />)

      const card = screen.getByTestId('trust-score-card')
      expect(card).toHaveAttribute('data-score-level', 'medium')
    })

    it('should use neutral color for score 50', () => {
      const trustScore = createTrustScore(50)

      render(<TrustScoreCard childId="child-123" trustScore={trustScore} />)

      const card = screen.getByTestId('trust-score-card')
      expect(card).toHaveAttribute('data-score-level', 'medium')
    })

    it('should use encouraging color for low scores (below 50)', () => {
      const trustScore = createTrustScore(35)

      render(<TrustScoreCard childId="child-123" trustScore={trustScore} />)

      const card = screen.getByTestId('trust-score-card')
      expect(card).toHaveAttribute('data-score-level', 'growing')
    })

    it('should handle edge case at score 80 (high)', () => {
      const trustScore = createTrustScore(80)

      render(<TrustScoreCard childId="child-123" trustScore={trustScore} />)

      const card = screen.getByTestId('trust-score-card')
      expect(card).toHaveAttribute('data-score-level', 'high')
    })

    it('should handle edge case at score 79 (medium)', () => {
      const trustScore = createTrustScore(79)

      render(<TrustScoreCard childId="child-123" trustScore={trustScore} />)

      const card = screen.getByTestId('trust-score-card')
      expect(card).toHaveAttribute('data-score-level', 'medium')
    })

    it('should handle edge case at score 49 (growing)', () => {
      const trustScore = createTrustScore(49)

      render(<TrustScoreCard childId="child-123" trustScore={trustScore} />)

      const card = screen.getByTestId('trust-score-card')
      expect(card).toHaveAttribute('data-score-level', 'growing')
    })
  })

  describe('AC6: Score framed as growth metric', () => {
    it('should not use punitive language', () => {
      const trustScore = createTrustScore(35)

      render(<TrustScoreCard childId="child-123" trustScore={trustScore} />)

      // Should not contain punitive words
      const cardText = screen.getByTestId('trust-score-card').textContent?.toLowerCase()
      expect(cardText).not.toContain('bad')
      expect(cardText).not.toContain('punishment')
      expect(cardText).not.toContain('failure')
      expect(cardText).not.toContain('poor')
    })

    it('should use growth-oriented framing', () => {
      const trustScore = createTrustScore(70)

      render(<TrustScoreCard childId="child-123" trustScore={trustScore} />)

      // Should use positive framing - the card shows "Your trust score"
      expect(screen.getByText(/Your trust score/i)).toBeInTheDocument()
    })
  })

  describe('Accessible design', () => {
    it('should have ARIA label for screen readers', () => {
      const trustScore = createTrustScore(85)

      render(<TrustScoreCard childId="child-123" trustScore={trustScore} />)

      const card = screen.getByTestId('trust-score-card')
      expect(card).toHaveAttribute('aria-label')
      expect(card.getAttribute('aria-label')).toContain('85')
    })

    it('should have proper heading structure', () => {
      const trustScore = createTrustScore(85)

      render(<TrustScoreCard childId="child-123" trustScore={trustScore} />)

      // Should have a heading for the score section
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
    })

    it('should be focusable for keyboard navigation', () => {
      const trustScore = createTrustScore(85)

      render(<TrustScoreCard childId="child-123" trustScore={trustScore} />)

      const card = screen.getByTestId('trust-score-card')
      expect(card).toHaveAttribute('tabIndex', '0')
    })
  })

  describe('showDetails prop', () => {
    it('should show details section when showDetails is true', () => {
      const trustScore = createTrustScore(85)

      render(<TrustScoreCard childId="child-123" trustScore={trustScore} showDetails />)

      expect(screen.getByTestId('trust-score-details')).toBeInTheDocument()
    })

    it('should hide details section when showDetails is false', () => {
      const trustScore = createTrustScore(85)

      render(<TrustScoreCard childId="child-123" trustScore={trustScore} showDetails={false} />)

      expect(screen.queryByTestId('trust-score-details')).not.toBeInTheDocument()
    })

    it('should hide details section by default', () => {
      const trustScore = createTrustScore(85)

      render(<TrustScoreCard childId="child-123" trustScore={trustScore} />)

      expect(screen.queryByTestId('trust-score-details')).not.toBeInTheDocument()
    })
  })

  describe('Score display formatting', () => {
    it('should display score as whole number', () => {
      const trustScore = createTrustScore(85.7)

      render(<TrustScoreCard childId="child-123" trustScore={trustScore} />)

      // Should round to nearest whole number
      expect(screen.getByTestId('trust-score-value')).toHaveTextContent('86')
    })

    it('should display large score value prominently', () => {
      const trustScore = createTrustScore(100)

      render(<TrustScoreCard childId="child-123" trustScore={trustScore} />)

      const scoreValue = screen.getByTestId('trust-score-value')
      // Score should be in a prominent element
      expect(scoreValue.tagName).not.toBe('SMALL')
    })
  })

  describe('Visual ring indicator', () => {
    it('should show a visual ring indicator for score', () => {
      const trustScore = createTrustScore(85)

      render(<TrustScoreCard childId="child-123" trustScore={trustScore} />)

      expect(screen.getByTestId('score-ring')).toBeInTheDocument()
    })

    it('should set ring progress based on score percentage', () => {
      const trustScore = createTrustScore(75)

      render(<TrustScoreCard childId="child-123" trustScore={trustScore} />)

      const ring = screen.getByTestId('score-ring')
      expect(ring).toHaveAttribute('data-progress', '75')
    })
  })
})
