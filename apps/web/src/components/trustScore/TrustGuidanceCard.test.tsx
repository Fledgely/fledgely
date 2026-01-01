/**
 * TrustGuidanceCard Component Tests - Story 36.4 Task 5
 *
 * Tests for guidance card showing parent tips and insights.
 * AC5: Guidance card with tips for parents
 */

import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TrustGuidanceCard } from './TrustGuidanceCard'
import { type TrustScore, type TrustFactor } from '@fledgely/shared'

const createTrustScore = (score: number, factors: TrustFactor[] = []): TrustScore => ({
  id: 'ts-123',
  childId: 'child-123',
  currentScore: score,
  history: [],
  factors,
  lastUpdatedAt: new Date(),
  createdAt: new Date(),
})

const createFactor = (
  type: TrustFactor['type'],
  category: TrustFactor['category'],
  value: number
): TrustFactor => ({
  type,
  category,
  value,
  description: 'Test factor',
  occurredAt: new Date(),
})

describe('TrustGuidanceCard - Story 36.4 Task 5', () => {
  describe('Rendering', () => {
    it('should render the guidance card container', () => {
      const trustScore = createTrustScore(75)

      render(<TrustGuidanceCard trustScore={trustScore} childName="Emma" />)

      expect(screen.getByTestId('trust-guidance-card')).toBeInTheDocument()
    })

    it('should display guidance header', () => {
      const trustScore = createTrustScore(75)

      render(<TrustGuidanceCard trustScore={trustScore} childName="Emma" />)

      expect(screen.getByTestId('guidance-header')).toBeInTheDocument()
    })
  })

  describe('Score-based guidance', () => {
    it('should show celebration message for high score (80+)', () => {
      const trustScore = createTrustScore(85)

      render(<TrustGuidanceCard trustScore={trustScore} childName="Emma" />)

      expect(screen.getByTestId('guidance-message')).toHaveTextContent(/great|excellent|wonderful/i)
    })

    it('should show encouragement for medium score (50-79)', () => {
      const trustScore = createTrustScore(65)

      render(<TrustGuidanceCard trustScore={trustScore} childName="Emma" />)

      expect(screen.getByTestId('guidance-message')).toHaveTextContent(/building|growing|progress/i)
    })

    it('should show support message for growing score (<50)', () => {
      const trustScore = createTrustScore(35)

      render(<TrustGuidanceCard trustScore={trustScore} childName="Emma" />)

      expect(screen.getByTestId('guidance-message')).toHaveTextContent(/support|together|help/i)
    })
  })

  describe('Parent tips', () => {
    it('should display parent tips section', () => {
      const trustScore = createTrustScore(75)

      render(<TrustGuidanceCard trustScore={trustScore} childName="Emma" />)

      expect(screen.getByTestId('parent-tips')).toBeInTheDocument()
    })

    it('should show at least one tip', () => {
      const trustScore = createTrustScore(75)

      render(<TrustGuidanceCard trustScore={trustScore} childName="Emma" />)

      const tips = screen.getAllByTestId(/parent-tip-/)
      expect(tips.length).toBeGreaterThan(0)
    })

    it('should provide relevant tips based on factors', () => {
      const factors = [createFactor('time-limit-compliance', 'concerning', -10)]
      const trustScore = createTrustScore(60, factors)

      render(<TrustGuidanceCard trustScore={trustScore} childName="Emma" />)

      const tips = screen.getByTestId('parent-tips')
      expect(tips).toHaveTextContent(/time|limit|screen/i)
    })
  })

  describe('Conversation starters', () => {
    it('should display conversation starters', () => {
      const trustScore = createTrustScore(75)

      render(<TrustGuidanceCard trustScore={trustScore} childName="Emma" />)

      expect(screen.getByTestId('conversation-starters')).toBeInTheDocument()
    })

    it('should personalize with child name', () => {
      const trustScore = createTrustScore(75)

      render(<TrustGuidanceCard trustScore={trustScore} childName="Emma" />)

      const starters = screen.getByTestId('conversation-starters')
      expect(starters.textContent).toContain('Emma')
    })
  })

  describe('Expandable sections', () => {
    it('should allow expanding tips section', () => {
      // Use low score to get more than 2 tips (growing level has 3 tips)
      const trustScore = createTrustScore(35)

      render(<TrustGuidanceCard trustScore={trustScore} childName="Emma" />)

      const expandButton = screen.getByTestId('expand-tips-button')
      fireEvent.click(expandButton)

      expect(screen.getByTestId('expanded-tips')).toBeInTheDocument()
    })

    it('should toggle tips on click', () => {
      // Use low score to get more than 2 tips
      const trustScore = createTrustScore(35)

      render(<TrustGuidanceCard trustScore={trustScore} childName="Emma" />)

      const expandButton = screen.getByTestId('expand-tips-button')

      // First click expands
      fireEvent.click(expandButton)
      expect(screen.getByTestId('expanded-tips')).toBeInTheDocument()

      // Second click collapses
      fireEvent.click(expandButton)
      expect(screen.queryByTestId('expanded-tips')).not.toBeInTheDocument()
    })
  })

  describe('Score level styling', () => {
    it('should have high styling for 80+', () => {
      const trustScore = createTrustScore(85)

      render(<TrustGuidanceCard trustScore={trustScore} childName="Emma" />)

      expect(screen.getByTestId('trust-guidance-card')).toHaveAttribute('data-level', 'high')
    })

    it('should have medium styling for 50-79', () => {
      const trustScore = createTrustScore(65)

      render(<TrustGuidanceCard trustScore={trustScore} childName="Emma" />)

      expect(screen.getByTestId('trust-guidance-card')).toHaveAttribute('data-level', 'medium')
    })

    it('should have growing styling for <50', () => {
      const trustScore = createTrustScore(35)

      render(<TrustGuidanceCard trustScore={trustScore} childName="Emma" />)

      expect(screen.getByTestId('trust-guidance-card')).toHaveAttribute('data-level', 'growing')
    })
  })

  describe('Accessibility', () => {
    it('should have aria label', () => {
      const trustScore = createTrustScore(75)

      render(<TrustGuidanceCard trustScore={trustScore} childName="Emma" />)

      const card = screen.getByTestId('trust-guidance-card')
      expect(card).toHaveAttribute('aria-label')
    })

    it('should have keyboard accessible expand button', () => {
      // Use low score to get more than 2 tips so expand button renders
      const trustScore = createTrustScore(35)

      render(<TrustGuidanceCard trustScore={trustScore} childName="Emma" />)

      const button = screen.getByTestId('expand-tips-button')
      expect(button).toHaveAttribute('aria-expanded')
    })
  })
})
