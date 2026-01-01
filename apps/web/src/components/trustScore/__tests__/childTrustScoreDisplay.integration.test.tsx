/**
 * Child Trust Score Display Integration Tests - Story 36.3 Task 7
 *
 * Integration tests for complete child trust score display.
 * Verifies all acceptance criteria working together.
 *
 * Test Scenarios:
 * - Score displayed prominently (AC1)
 * - Trend calculated and displayed correctly (AC2)
 * - Factors breakdown visible (AC3)
 * - Language is encouraging throughout (AC4)
 * - Improvement tips shown when relevant (AC5)
 * - Growth framing verified (AC6)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChildTrustScoreView } from '../ChildTrustScoreView'
import * as useScoreCalculationModule from '../../../hooks/useScoreCalculation'
import { type TrustScore, type TrustFactor, TRUST_SCORE_DEFAULT } from '@fledgely/shared'

// Mock the hook
vi.mock('../../../hooks/useScoreCalculation')

const mockUseScoreCalculation = vi.mocked(useScoreCalculationModule.useScoreCalculation)

// ============================================================================
// Test Helpers
// ============================================================================

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

const defaultMockReturn = {
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
}

// ============================================================================
// Integration Tests
// ============================================================================

describe('Child Trust Score Display - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AC1: Score displayed prominently', () => {
    it('should display score in a large, visible format', () => {
      const trustScore = createTrustScore(85)
      mockUseScoreCalculation.mockReturnValue({
        ...defaultMockReturn,
        currentScore: 85,
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      const scoreValue = screen.getByTestId('trust-score-value')
      expect(scoreValue).toHaveTextContent('85')
    })

    it('should show "Your trust score" label', () => {
      const trustScore = createTrustScore(75)
      mockUseScoreCalculation.mockReturnValue(defaultMockReturn)

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      // Should have the main heading and card heading
      expect(screen.getAllByText(/Your trust score/i).length).toBeGreaterThanOrEqual(1)
    })

    it('should display default score of 70 for new users', () => {
      const trustScore = createTrustScore(TRUST_SCORE_DEFAULT)
      mockUseScoreCalculation.mockReturnValue(defaultMockReturn)

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      expect(screen.getByTestId('trust-score-value')).toHaveTextContent('70')
    })
  })

  describe('AC2: Trend calculated and displayed correctly', () => {
    it('should show positive monthly trend', () => {
      const trustScore = createTrustScore(85)
      mockUseScoreCalculation.mockReturnValue({
        ...defaultMockReturn,
        currentScore: 85,
        weeklyTrend: 3,
        monthlyTrend: 10,
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      expect(screen.getByTestId('monthly-trend')).toHaveTextContent('Up 10 points this month')
    })

    it('should show negative monthly trend', () => {
      const trustScore = createTrustScore(65)
      mockUseScoreCalculation.mockReturnValue({
        ...defaultMockReturn,
        currentScore: 65,
        weeklyTrend: -2,
        monthlyTrend: -5,
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      expect(screen.getByTestId('monthly-trend')).toHaveTextContent('Down 5 points this month')
    })

    it('should show no change when stable', () => {
      const trustScore = createTrustScore(70)
      mockUseScoreCalculation.mockReturnValue({
        ...defaultMockReturn,
        weeklyTrend: 0,
        monthlyTrend: 0,
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      expect(screen.getByTestId('monthly-trend')).toHaveTextContent('No change this month')
    })
  })

  describe('AC3: Factors breakdown visible', () => {
    it('should show positive factors with + sign', () => {
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 10, 'Following time limits'),
        createFactor('focus-mode-usage', 'positive', 5, 'Using focus mode'),
      ]
      const trustScore = createTrustScore(85, { factors })
      mockUseScoreCalculation.mockReturnValue({
        ...defaultMockReturn,
        currentScore: 85,
        positiveContribution: 15,
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      expect(screen.getByTestId('factor-0')).toHaveTextContent('Following time limits: +10')
      expect(screen.getByTestId('factor-1')).toHaveTextContent('Using focus mode: +5')
    })

    it('should show concerning factors appropriately', () => {
      const factors: TrustFactor[] = [
        createFactor('bypass-attempt', 'concerning', -5, 'Bypass attempt detected'),
      ]
      const trustScore = createTrustScore(65, { factors })
      mockUseScoreCalculation.mockReturnValue({
        ...defaultMockReturn,
        currentScore: 65,
        concerningContribution: -5,
        improvementTips: ['To improve: avoid trying to get around the rules'],
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      expect(screen.getByTestId('factor-0')).toHaveTextContent('Bypass attempt detected: -5')
    })

    it('should group factors by category', () => {
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 10, 'Following time limits'),
        createFactor('bypass-attempt', 'concerning', -3, 'Bypass attempt'),
      ]
      const trustScore = createTrustScore(77, { factors })
      mockUseScoreCalculation.mockReturnValue({
        ...defaultMockReturn,
        currentScore: 77,
        positiveContribution: 10,
        concerningContribution: -3,
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      expect(screen.getByTestId('positive-factors')).toBeInTheDocument()
      expect(screen.getByTestId('concerning-factors')).toBeInTheDocument()
    })
  })

  describe('AC4: Language is encouraging throughout', () => {
    it('should use encouraging headers', () => {
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 10, 'Following time limits'),
      ]
      const trustScore = createTrustScore(80, { factors })
      mockUseScoreCalculation.mockReturnValue({
        ...defaultMockReturn,
        currentScore: 80,
        positiveContribution: 10,
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      expect(screen.getByTestId('positive-factors-header')).toHaveTextContent(
        "What's helping your score"
      )
    })

    it('should not contain punitive language anywhere in view', () => {
      const factors: TrustFactor[] = [
        createFactor('bypass-attempt', 'concerning', -5, 'Bypass attempt'),
        createFactor('monitoring-disabled', 'concerning', -3, 'Monitoring was disabled'),
      ]
      const trustScore = createTrustScore(55, { factors })
      mockUseScoreCalculation.mockReturnValue({
        ...defaultMockReturn,
        currentScore: 55,
        concerningContribution: -8,
        improvementTips: [
          'To improve: avoid trying to get around the rules',
          'To improve: keep monitoring enabled',
        ],
        encouragement: 'Remember, you can always improve. Every day is a new chance!',
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      const view = screen.getByTestId('child-trust-score-view')
      const text = view.textContent?.toLowerCase() || ''

      // Should not contain punitive words
      expect(text).not.toContain('punishment')
      expect(text).not.toContain('punish')
      expect(text).not.toContain('failure')
      expect(text).not.toContain('bad behavior')
      expect(text).not.toContain('violation')
      expect(text).not.toContain('grounded')
      expect(text).not.toContain('consequence')
    })

    it('should use "things to work on" not "problems" or "issues"', () => {
      const factors: TrustFactor[] = [
        createFactor('bypass-attempt', 'concerning', -5, 'Bypass attempt'),
      ]
      const trustScore = createTrustScore(65, { factors })
      mockUseScoreCalculation.mockReturnValue({
        ...defaultMockReturn,
        currentScore: 65,
        concerningContribution: -5,
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      expect(screen.getByTestId('concerning-factors-header')).toHaveTextContent('Things to work on')
    })
  })

  describe('AC5: Improvement tips shown when relevant', () => {
    it('should show improvement tips for concerning factors', () => {
      const trustScore = createTrustScore(60)
      mockUseScoreCalculation.mockReturnValue({
        ...defaultMockReturn,
        currentScore: 60,
        concerningContribution: -10,
        improvementTips: [
          'To improve: avoid trying to get around the rules',
          'To improve: keep monitoring enabled',
        ],
        encouragement: 'Every day is a new chance!',
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      expect(screen.getByTestId('improvement-tip-0')).toHaveTextContent(
        'avoid trying to get around'
      )
      expect(screen.getByTestId('improvement-tip-1')).toHaveTextContent('keep monitoring enabled')
    })

    it('should show encouraging tips when no concerns', () => {
      const trustScore = createTrustScore(85)
      mockUseScoreCalculation.mockReturnValue({
        ...defaultMockReturn,
        currentScore: 85,
        improvementTips: ['Keep up the good work!'],
        encouragement: "Great job! You're building trust.",
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      expect(screen.getByTestId('improvement-tip-0')).toHaveTextContent('Keep up the good work')
    })
  })

  describe('AC6: Score framed as growth metric, not judgment', () => {
    it('should show encouragement for high scores', () => {
      const trustScore = createTrustScore(92)
      mockUseScoreCalculation.mockReturnValue({
        ...defaultMockReturn,
        currentScore: 92,
        improvementTips: [],
        encouragement: "Amazing progress! You're doing great!",
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      expect(screen.getByTestId('encouragement-message')).toHaveTextContent('Amazing progress')
    })

    it('should show supportive encouragement for lower scores', () => {
      const trustScore = createTrustScore(45)
      mockUseScoreCalculation.mockReturnValue({
        ...defaultMockReturn,
        currentScore: 45,
        improvementTips: ['To improve: stick to the agreement for 2 weeks'],
        encouragement: 'Remember, you can always improve. Every day is a new chance!',
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      expect(screen.getByTestId('encouragement-message')).toHaveTextContent(
        'Every day is a new chance'
      )
    })

    it('should celebrate milestones when reached', () => {
      const trustScore = createTrustScore(91)
      mockUseScoreCalculation.mockReturnValue({
        ...defaultMockReturn,
        currentScore: 91,
        improvementTips: [],
        encouragement: "Amazing progress! You're doing great!",
        milestoneMessage: 'You reached 90! Amazing!',
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      expect(screen.getByTestId('milestone-message')).toHaveTextContent('You reached 90!')
    })

    it('should use growth-oriented visual styling', () => {
      const trustScore = createTrustScore(40)
      mockUseScoreCalculation.mockReturnValue({
        ...defaultMockReturn,
        currentScore: 40,
        encouragement: 'Every day is a new chance!',
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      // Even low scores should use "growing" not "bad" or "failing"
      const card = screen.getByTestId('trust-score-card')
      expect(card).toHaveAttribute('data-score-level', 'growing')
    })
  })

  describe('Complete user journey scenarios', () => {
    it('should handle new user with default score', () => {
      const trustScore = createTrustScore(TRUST_SCORE_DEFAULT, {
        factors: [],
        history: [],
      })
      mockUseScoreCalculation.mockReturnValue({
        ...defaultMockReturn,
        improvementTips: ['Keep up the good work!'],
        encouragement: "You're doing well. Keep going!",
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      // Should show default score
      expect(screen.getByTestId('trust-score-value')).toHaveTextContent('70')
      // Should show encouraging message
      expect(screen.getByTestId('encouragement-message')).toBeInTheDocument()
      // Should not show factors section (no factors yet)
      expect(screen.queryByTestId('factors-section')).not.toBeInTheDocument()
    })

    it('should handle user with positive history', () => {
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 10, 'Following time limits'),
        createFactor('focus-mode-usage', 'positive', 5, 'Using focus mode'),
        createFactor('no-bypass-attempts', 'positive', 5, 'No bypass attempts'),
      ]
      const trustScore = createTrustScore(90, { factors })
      mockUseScoreCalculation.mockReturnValue({
        ...defaultMockReturn,
        currentScore: 90,
        positiveContribution: 20,
        weeklyTrend: 5,
        monthlyTrend: 15,
        improvementTips: [],
        encouragement: "Amazing progress! You're doing great!",
        milestoneMessage: 'You reached 90! Amazing!',
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      // Should show high score
      expect(screen.getByTestId('trust-score-value')).toHaveTextContent('90')
      // Should show positive trend
      expect(screen.getByTestId('monthly-trend')).toHaveTextContent('Up 15 points')
      // Should show factors
      expect(screen.getByTestId('positive-factors')).toBeInTheDocument()
      // Should celebrate milestone
      expect(screen.getByTestId('milestone-message')).toBeInTheDocument()
    })

    it('should handle user with mixed factors', () => {
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 8, 'Following time limits'),
        createFactor('bypass-attempt', 'concerning', -5, 'Bypass attempt'),
      ]
      const trustScore = createTrustScore(73, { factors })
      mockUseScoreCalculation.mockReturnValue({
        ...defaultMockReturn,
        currentScore: 73,
        positiveContribution: 8,
        concerningContribution: -5,
        weeklyTrend: -2,
        monthlyTrend: 3,
        improvementTips: ['To improve: avoid trying to get around the rules'],
        encouragement: 'Nice work! Your score is improving.',
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      // Should show score
      expect(screen.getByTestId('trust-score-value')).toHaveTextContent('73')
      // Should show both factor groups
      expect(screen.getByTestId('positive-factors')).toBeInTheDocument()
      expect(screen.getByTestId('concerning-factors')).toBeInTheDocument()
      // Should show improvement tip
      expect(screen.getByTestId('improvement-tip-0')).toBeInTheDocument()
      // Should still be encouraging
      expect(screen.getByTestId('encouragement-message')).toHaveTextContent('improving')
    })
  })

  describe('Accessibility integration', () => {
    it('should have proper semantic structure', () => {
      const trustScore = createTrustScore(80)
      mockUseScoreCalculation.mockReturnValue(defaultMockReturn)

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      // Should have main heading
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
      // Should have main landmark
      expect(screen.getByRole('main')).toBeInTheDocument()
    })

    it('should have accessible labels for score', () => {
      const trustScore = createTrustScore(85)
      mockUseScoreCalculation.mockReturnValue({
        ...defaultMockReturn,
        currentScore: 85,
      })

      render(<ChildTrustScoreView childId="child-123" trustScore={trustScore} />)

      const card = screen.getByTestId('trust-score-card')
      expect(card).toHaveAttribute('aria-label')
      expect(card.getAttribute('aria-label')).toContain('85')
    })
  })
})
