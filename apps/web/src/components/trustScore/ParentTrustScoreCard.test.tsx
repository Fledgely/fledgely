/**
 * ParentTrustScoreCard Component Tests - Story 36.4 Task 1
 *
 * Tests for parent-facing trust score card.
 * AC1: Same score visible as child sees (transparency)
 * AC4: Factor details available on click
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ParentTrustScoreCard } from './ParentTrustScoreCard'
import { type TrustScore, type TrustFactor, TRUST_SCORE_DEFAULT } from '@fledgely/shared'

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

const createFactor = (
  type: TrustFactor['type'],
  category: TrustFactor['category'],
  value: number,
  description: string
): TrustFactor => ({
  type,
  category,
  value,
  description,
  occurredAt: new Date(),
})

describe('ParentTrustScoreCard - Story 36.4 Task 1', () => {
  describe('AC1: Same score visible as child sees', () => {
    it('should display the same score value', () => {
      const trustScore = createTrustScore(85)

      render(<ParentTrustScoreCard childId="child-123" childName="Emma" trustScore={trustScore} />)

      expect(screen.getByTestId('parent-score-value')).toHaveTextContent('85')
    })

    it("should show child's name in header", () => {
      const trustScore = createTrustScore(75)

      render(<ParentTrustScoreCard childId="child-123" childName="Emma" trustScore={trustScore} />)

      expect(screen.getByTestId('parent-score-header')).toHaveTextContent("Emma's Trust Score")
    })

    it('should display default score of 70', () => {
      const trustScore = createTrustScore(TRUST_SCORE_DEFAULT)

      render(<ParentTrustScoreCard childId="child-123" childName="Alex" trustScore={trustScore} />)

      expect(screen.getByTestId('parent-score-value')).toHaveTextContent('70')
    })

    it('should show score 100 correctly', () => {
      const trustScore = createTrustScore(100)

      render(<ParentTrustScoreCard childId="child-123" childName="Emma" trustScore={trustScore} />)

      expect(screen.getByTestId('parent-score-value')).toHaveTextContent('100')
    })

    it('should show score 0 correctly', () => {
      const trustScore = createTrustScore(0)

      render(<ParentTrustScoreCard childId="child-123" childName="Emma" trustScore={trustScore} />)

      expect(screen.getByTestId('parent-score-value')).toHaveTextContent('0')
    })
  })

  describe('Trend display', () => {
    it('should show positive monthly trend', () => {
      const trustScore = createTrustScore(85, {
        history: [
          {
            date: new Date(),
            score: 85,
            previousScore: 80,
            reason: 'Daily update',
            factors: [],
          },
        ],
      })

      render(
        <ParentTrustScoreCard
          childId="child-123"
          childName="Emma"
          trustScore={trustScore}
          monthlyTrend={10}
        />
      )

      expect(screen.getByTestId('parent-trend')).toHaveTextContent('Up 10 points this month')
    })

    it('should show negative monthly trend', () => {
      const trustScore = createTrustScore(65)

      render(
        <ParentTrustScoreCard
          childId="child-123"
          childName="Emma"
          trustScore={trustScore}
          monthlyTrend={-5}
        />
      )

      expect(screen.getByTestId('parent-trend')).toHaveTextContent('Down 5 points this month')
    })

    it('should show no change', () => {
      const trustScore = createTrustScore(70)

      render(
        <ParentTrustScoreCard
          childId="child-123"
          childName="Emma"
          trustScore={trustScore}
          monthlyTrend={0}
        />
      )

      expect(screen.getByTestId('parent-trend')).toHaveTextContent('No change this month')
    })
  })

  describe('AC4: Factor details on click', () => {
    it('should display factors list', () => {
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 10, 'Following time limits'),
        createFactor('focus-mode-usage', 'positive', 5, 'Using focus mode'),
      ]
      const trustScore = createTrustScore(85, { factors })

      render(<ParentTrustScoreCard childId="child-123" childName="Emma" trustScore={trustScore} />)

      expect(screen.getByTestId('parent-factor-0')).toHaveTextContent('Following time limits: +10')
      expect(screen.getByTestId('parent-factor-1')).toHaveTextContent('Using focus mode: +5')
    })

    it('should call onFactorClick when factor is clicked', () => {
      const onFactorClick = vi.fn()
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 10, 'Following time limits'),
      ]
      const trustScore = createTrustScore(85, { factors })

      render(
        <ParentTrustScoreCard
          childId="child-123"
          childName="Emma"
          trustScore={trustScore}
          onFactorClick={onFactorClick}
        />
      )

      fireEvent.click(screen.getByTestId('parent-factor-0'))

      expect(onFactorClick).toHaveBeenCalledWith(factors[0])
    })

    it('should indicate factors are clickable', () => {
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 10, 'Following time limits'),
      ]
      const trustScore = createTrustScore(85, { factors })

      render(
        <ParentTrustScoreCard
          childId="child-123"
          childName="Emma"
          trustScore={trustScore}
          onFactorClick={vi.fn()}
        />
      )

      const factor = screen.getByTestId('parent-factor-0')
      expect(factor).toHaveAttribute('role', 'button')
      expect(factor).toHaveAttribute('tabIndex', '0')
    })

    it('should support keyboard activation for factor click', () => {
      const onFactorClick = vi.fn()
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 10, 'Following time limits'),
      ]
      const trustScore = createTrustScore(85, { factors })

      render(
        <ParentTrustScoreCard
          childId="child-123"
          childName="Emma"
          trustScore={trustScore}
          onFactorClick={onFactorClick}
        />
      )

      fireEvent.keyDown(screen.getByTestId('parent-factor-0'), { key: 'Enter' })

      expect(onFactorClick).toHaveBeenCalled()
    })
  })

  describe('Score level styling', () => {
    it('should use high level for 80+', () => {
      const trustScore = createTrustScore(85)

      render(<ParentTrustScoreCard childId="child-123" childName="Emma" trustScore={trustScore} />)

      expect(screen.getByTestId('parent-trust-score-card')).toHaveAttribute(
        'data-score-level',
        'high'
      )
    })

    it('should use medium level for 50-79', () => {
      const trustScore = createTrustScore(70)

      render(<ParentTrustScoreCard childId="child-123" childName="Emma" trustScore={trustScore} />)

      expect(screen.getByTestId('parent-trust-score-card')).toHaveAttribute(
        'data-score-level',
        'medium'
      )
    })

    it('should use growing level for below 50', () => {
      const trustScore = createTrustScore(40)

      render(<ParentTrustScoreCard childId="child-123" childName="Emma" trustScore={trustScore} />)

      expect(screen.getByTestId('parent-trust-score-card')).toHaveAttribute(
        'data-score-level',
        'growing'
      )
    })
  })

  describe('Rendering', () => {
    it('should render the card container', () => {
      const trustScore = createTrustScore(75)

      render(<ParentTrustScoreCard childId="child-123" childName="Emma" trustScore={trustScore} />)

      expect(screen.getByTestId('parent-trust-score-card')).toBeInTheDocument()
    })

    it('should have accessible label', () => {
      const trustScore = createTrustScore(85)

      render(<ParentTrustScoreCard childId="child-123" childName="Emma" trustScore={trustScore} />)

      const card = screen.getByTestId('parent-trust-score-card')
      expect(card).toHaveAttribute('aria-label')
      expect(card.getAttribute('aria-label')).toContain('Emma')
      expect(card.getAttribute('aria-label')).toContain('85')
    })
  })

  describe('Empty factors', () => {
    it('should show message when no factors', () => {
      const trustScore = createTrustScore(70, { factors: [] })

      render(<ParentTrustScoreCard childId="child-123" childName="Emma" trustScore={trustScore} />)

      expect(screen.getByTestId('parent-factors-empty')).toBeInTheDocument()
    })
  })
})
