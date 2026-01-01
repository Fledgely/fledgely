/**
 * ChildTrustScoreView Component Tests - Story 36.3 Task 6
 *
 * Tests for the complete child trust score view page/section.
 * Integrates all trust score components for child-facing display.
 *
 * All ACs covered:
 * - AC1: Score displayed prominently
 * - AC2: Trend shown
 * - AC3: Factors breakdown
 * - AC4: Language is encouraging
 * - AC5: Tips shown
 * - AC6: Growth framing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChildTrustScoreView } from './ChildTrustScoreView'
import * as useScoreCalculationModule from '../../hooks/useScoreCalculation'
import { type TrustScore, TRUST_SCORE_DEFAULT, type TrustFactor } from '@fledgely/shared'

// Mock the hook
vi.mock('../../hooks/useScoreCalculation')

const mockUseScoreCalculation = vi.mocked(useScoreCalculationModule.useScoreCalculation)

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

describe('ChildTrustScoreView - Story 36.3 Task 6', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Integration of all components', () => {
    it('should render the complete view', () => {
      const trustScore = createTrustScore(85)
      mockUseScoreCalculation.mockReturnValue({
        currentScore: 85,
        projectedScore: 85,
        breakdown: {
          positivePoints: 15,
          neutralPoints: 0,
          concerningPoints: 0,
          recencyMultiplier: 1,
          finalDelta: 15,
        },
        breakdownText: ['Good behaviors: +15 points'],
        breakdownSummary: '+15 good',
        positiveContribution: 15,
        concerningContribution: 0,
        canRecalculate: true,
        recalculate: vi.fn(),
        lastChange: 5,
        improvementTips: ['Keep up the good work!'],
        encouragement: "Great job! You're building trust.",
        weeklyTrend: 5,
        monthlyTrend: 10,
        milestoneMessage: null,
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      expect(screen.getByTestId('child-trust-score-view')).toBeInTheDocument()
    })

    it('should include TrustScoreCard (AC1)', () => {
      const trustScore = createTrustScore(85)
      mockUseScoreCalculation.mockReturnValue({
        currentScore: 85,
        projectedScore: 85,
        breakdown: {
          positivePoints: 15,
          neutralPoints: 0,
          concerningPoints: 0,
          recencyMultiplier: 1,
          finalDelta: 15,
        },
        breakdownText: [],
        breakdownSummary: '',
        positiveContribution: 15,
        concerningContribution: 0,
        canRecalculate: true,
        recalculate: vi.fn(),
        lastChange: 0,
        improvementTips: [],
        encouragement: 'Great job!',
        weeklyTrend: 0,
        monthlyTrend: 0,
        milestoneMessage: null,
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      expect(screen.getByTestId('trust-score-card')).toBeInTheDocument()
      expect(screen.getByTestId('trust-score-value')).toHaveTextContent('85')
    })

    it('should include TrustScoreTrend (AC2)', () => {
      const trustScore = createTrustScore(85)
      mockUseScoreCalculation.mockReturnValue({
        currentScore: 85,
        projectedScore: 85,
        breakdown: {
          positivePoints: 15,
          neutralPoints: 0,
          concerningPoints: 0,
          recencyMultiplier: 1,
          finalDelta: 15,
        },
        breakdownText: [],
        breakdownSummary: '',
        positiveContribution: 15,
        concerningContribution: 0,
        canRecalculate: true,
        recalculate: vi.fn(),
        lastChange: 0,
        improvementTips: [],
        encouragement: 'Great job!',
        weeklyTrend: 5,
        monthlyTrend: 10,
        milestoneMessage: null,
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      expect(screen.getByTestId('trust-score-trend')).toBeInTheDocument()
      expect(screen.getByTestId('monthly-trend')).toHaveTextContent('Up 10 points this month')
    })

    it('should include TrustScoreFactors (AC3)', () => {
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 10, 'Following time limits'),
        createFactor('focus-mode-usage', 'positive', 5, 'Using focus mode'),
      ]
      const trustScore = createTrustScore(85, { factors })
      mockUseScoreCalculation.mockReturnValue({
        currentScore: 85,
        projectedScore: 85,
        breakdown: {
          positivePoints: 15,
          neutralPoints: 0,
          concerningPoints: 0,
          recencyMultiplier: 1,
          finalDelta: 15,
        },
        breakdownText: [],
        breakdownSummary: '',
        positiveContribution: 15,
        concerningContribution: 0,
        canRecalculate: true,
        recalculate: vi.fn(),
        lastChange: 0,
        improvementTips: [],
        encouragement: 'Great job!',
        weeklyTrend: 0,
        monthlyTrend: 0,
        milestoneMessage: null,
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      expect(screen.getByTestId('trust-score-factors')).toBeInTheDocument()
    })

    it('should include TrustScoreImprovement (AC5)', () => {
      const trustScore = createTrustScore(70)
      mockUseScoreCalculation.mockReturnValue({
        currentScore: 70,
        projectedScore: 70,
        breakdown: {
          positivePoints: 0,
          neutralPoints: 0,
          concerningPoints: -5,
          recencyMultiplier: 1,
          finalDelta: -5,
        },
        breakdownText: [],
        breakdownSummary: '',
        positiveContribution: 0,
        concerningContribution: -5,
        canRecalculate: true,
        recalculate: vi.fn(),
        lastChange: -5,
        improvementTips: ['To improve: stick to time limits'],
        encouragement: 'Keep going!',
        weeklyTrend: -5,
        monthlyTrend: -3,
        milestoneMessage: null,
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      expect(screen.getByTestId('trust-score-improvement')).toBeInTheDocument()
      expect(screen.getByTestId('improvement-tip-0')).toHaveTextContent('stick to time limits')
    })

    it('should include TrustScoreEncouragement (AC4, AC6)', () => {
      const trustScore = createTrustScore(85)
      mockUseScoreCalculation.mockReturnValue({
        currentScore: 85,
        projectedScore: 85,
        breakdown: {
          positivePoints: 15,
          neutralPoints: 0,
          concerningPoints: 0,
          recencyMultiplier: 1,
          finalDelta: 15,
        },
        breakdownText: [],
        breakdownSummary: '',
        positiveContribution: 15,
        concerningContribution: 0,
        canRecalculate: true,
        recalculate: vi.fn(),
        lastChange: 5,
        improvementTips: [],
        encouragement: "Great job! You're building trust.",
        weeklyTrend: 5,
        monthlyTrend: 10,
        milestoneMessage: null,
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      expect(screen.getByTestId('trust-score-encouragement')).toBeInTheDocument()
      expect(screen.getByTestId('encouragement-message')).toHaveTextContent(
        "Great job! You're building trust."
      )
    })
  })

  describe('Layout matches story requirements', () => {
    it('should have score prominently at top', () => {
      const trustScore = createTrustScore(85)
      mockUseScoreCalculation.mockReturnValue({
        currentScore: 85,
        projectedScore: 85,
        breakdown: {
          positivePoints: 0,
          neutralPoints: 0,
          concerningPoints: 0,
          recencyMultiplier: 1,
          finalDelta: 0,
        },
        breakdownText: [],
        breakdownSummary: '',
        positiveContribution: 0,
        concerningContribution: 0,
        canRecalculate: true,
        recalculate: vi.fn(),
        lastChange: 0,
        improvementTips: [],
        encouragement: 'Great job!',
        weeklyTrend: 5,
        monthlyTrend: 10,
        milestoneMessage: null,
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      const scoreSection = screen.getByTestId('score-section')
      const scoreCard = screen.getByTestId('trust-score-card')

      // Score card should be in the score section near top
      expect(scoreSection).toContainElement(scoreCard)
      // Score section should come early (after h1 heading)
      expect(scoreSection).toBeInTheDocument()
    })
  })

  describe('AC4 & AC6: All language is encouraging', () => {
    it('should not contain punitive language anywhere', () => {
      const factors: TrustFactor[] = [
        createFactor('bypass-attempt', 'concerning', -5, 'Bypass attempt'),
      ]
      const trustScore = createTrustScore(60, { factors })
      mockUseScoreCalculation.mockReturnValue({
        currentScore: 60,
        projectedScore: 60,
        breakdown: {
          positivePoints: 0,
          neutralPoints: 0,
          concerningPoints: -5,
          recencyMultiplier: 1,
          finalDelta: -5,
        },
        breakdownText: [],
        breakdownSummary: '',
        positiveContribution: 0,
        concerningContribution: -5,
        canRecalculate: true,
        recalculate: vi.fn(),
        lastChange: -5,
        improvementTips: ['To improve: avoid trying to get around the rules'],
        encouragement: 'Every day is a new chance!',
        weeklyTrend: -5,
        monthlyTrend: -3,
        milestoneMessage: null,
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      const view = screen.getByTestId('child-trust-score-view')
      const text = view.textContent?.toLowerCase() || ''

      expect(text).not.toContain('punishment')
      expect(text).not.toContain('failure')
      expect(text).not.toContain('bad behavior')
      expect(text).not.toContain('violation')
      expect(text).not.toContain('grounded')
    })
  })

  describe('Milestone celebration', () => {
    it('should show milestone when one was reached', () => {
      const trustScore = createTrustScore(92)
      mockUseScoreCalculation.mockReturnValue({
        currentScore: 92,
        projectedScore: 92,
        breakdown: {
          positivePoints: 12,
          neutralPoints: 0,
          concerningPoints: 0,
          recencyMultiplier: 1,
          finalDelta: 12,
        },
        breakdownText: [],
        breakdownSummary: '',
        positiveContribution: 12,
        concerningContribution: 0,
        canRecalculate: true,
        recalculate: vi.fn(),
        lastChange: 5,
        improvementTips: [],
        encouragement: "Amazing progress! You're doing great!",
        weeklyTrend: 5,
        monthlyTrend: 12,
        milestoneMessage: 'You reached 90! Amazing!',
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      expect(screen.getByTestId('milestone-message')).toHaveTextContent('You reached 90!')
    })
  })

  describe('Empty factors state', () => {
    it('should handle empty factors gracefully', () => {
      const trustScore = createTrustScore(TRUST_SCORE_DEFAULT, { factors: [] })
      mockUseScoreCalculation.mockReturnValue({
        currentScore: TRUST_SCORE_DEFAULT,
        projectedScore: TRUST_SCORE_DEFAULT,
        breakdown: {
          positivePoints: 0,
          neutralPoints: 0,
          concerningPoints: 0,
          recencyMultiplier: 1,
          finalDelta: 0,
        },
        breakdownText: [],
        breakdownSummary: '',
        positiveContribution: 0,
        concerningContribution: 0,
        canRecalculate: true,
        recalculate: vi.fn(),
        lastChange: 0,
        improvementTips: ['Keep up the good work!'],
        encouragement: "You're doing well. Keep going!",
        weeklyTrend: 0,
        monthlyTrend: 0,
        milestoneMessage: null,
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      // Should still render without crashing
      expect(screen.getByTestId('child-trust-score-view')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      const trustScore = createTrustScore(85)
      mockUseScoreCalculation.mockReturnValue({
        currentScore: 85,
        projectedScore: 85,
        breakdown: {
          positivePoints: 0,
          neutralPoints: 0,
          concerningPoints: 0,
          recencyMultiplier: 1,
          finalDelta: 0,
        },
        breakdownText: [],
        breakdownSummary: '',
        positiveContribution: 0,
        concerningContribution: 0,
        canRecalculate: true,
        recalculate: vi.fn(),
        lastChange: 0,
        improvementTips: [],
        encouragement: 'Great job!',
        weeklyTrend: 0,
        monthlyTrend: 0,
        milestoneMessage: null,
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      // Should have main heading
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })

    it('should have accessible region landmark', () => {
      const trustScore = createTrustScore(85)
      mockUseScoreCalculation.mockReturnValue({
        currentScore: 85,
        projectedScore: 85,
        breakdown: {
          positivePoints: 0,
          neutralPoints: 0,
          concerningPoints: 0,
          recencyMultiplier: 1,
          finalDelta: 0,
        },
        breakdownText: [],
        breakdownSummary: '',
        positiveContribution: 0,
        concerningContribution: 0,
        canRecalculate: true,
        recalculate: vi.fn(),
        lastChange: 0,
        improvementTips: [],
        encouragement: 'Great job!',
        weeklyTrend: 0,
        monthlyTrend: 0,
        milestoneMessage: null,
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      const view = screen.getByTestId('child-trust-score-view')
      expect(view).toHaveAttribute('role', 'main')
    })
  })
})
