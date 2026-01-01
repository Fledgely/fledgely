/**
 * Milestone System Integration Tests - Story 37.1 Task 6
 *
 * Integration tests for the complete milestone system.
 * Tests all acceptance criteria together.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  getMilestoneForScore,
  checkMilestoneEligibility,
  transitionMilestone,
  MILESTONE_DURATION_DAYS,
  MILESTONE_THRESHOLDS,
  checkForRegressionRisk,
  applyGracePeriod,
  isMilestoneInGracePeriod,
  MILESTONE_GRACE_PERIOD_DAYS,
  type ScoreHistoryEntry,
} from '@fledgely/shared'
import { MilestoneNotification } from '../MilestoneNotification'
import { MilestoneProgress } from '../MilestoneProgress'

// Helper to create score history
function createScoreHistory(
  daysAtScore: number,
  score: number,
  startDaysAgo = 0
): ScoreHistoryEntry[] {
  return Array.from({ length: daysAtScore }, (_, i) => ({
    date: daysAgo(startDaysAgo + daysAtScore - 1 - i),
    score,
  }))
}

function daysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(0, 0, 0, 0)
  return date
}

describe('Milestone System Integration - Story 37.1 Task 6', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-12-15T12:00:00Z'))
  })

  describe('AC1: Milestones at 80, 90, 95', () => {
    it('should correctly identify milestone thresholds', () => {
      expect(MILESTONE_THRESHOLDS.growing).toBe(80)
      expect(MILESTONE_THRESHOLDS.maturing).toBe(90)
      expect(MILESTONE_THRESHOLDS['ready-for-independence']).toBe(95)
    })

    it('should return correct milestone for each score range', () => {
      expect(getMilestoneForScore(79)?.level).toBeUndefined()
      expect(getMilestoneForScore(80)?.level).toBe('growing')
      expect(getMilestoneForScore(89)?.level).toBe('growing')
      expect(getMilestoneForScore(90)?.level).toBe('maturing')
      expect(getMilestoneForScore(94)?.level).toBe('maturing')
      expect(getMilestoneForScore(95)?.level).toBe('ready-for-independence')
      expect(getMilestoneForScore(100)?.level).toBe('ready-for-independence')
    })
  })

  describe('AC2: Duration requirement of 30+ days', () => {
    it('should require exactly 30 days for milestone eligibility', () => {
      expect(MILESTONE_DURATION_DAYS).toBe(30)
    })

    it('should not be eligible with 29 days', () => {
      const history = createScoreHistory(29, 85)
      const result = checkMilestoneEligibility('child-1', history)

      expect(result.eligible).toBe(false)
      expect(result.daysRemaining).toBe(1)
    })

    it('should be eligible with 30 days', () => {
      const history = createScoreHistory(30, 85)
      const result = checkMilestoneEligibility('child-1', history)

      expect(result.eligible).toBe(true)
      expect(result.milestoneLevel).toBe('growing')
    })

    it('should be eligible with more than 30 days', () => {
      const history = createScoreHistory(45, 85)
      const result = checkMilestoneEligibility('child-1', history)

      expect(result.eligible).toBe(true)
      expect(result.milestoneLevel).toBe('growing')
    })
  })

  describe('AC3: Milestone notifications sent to both parties', () => {
    it('should render notification for child view', () => {
      render(<MilestoneNotification milestoneLevel="growing" viewerType="child" childName="Alex" />)

      expect(screen.getByTestId('milestone-notification')).toBeInTheDocument()
    })

    it('should render notification for parent view', () => {
      render(
        <MilestoneNotification milestoneLevel="growing" viewerType="parent" childName="Alex" />
      )

      const notification = screen.getByTestId('milestone-notification')
      expect(notification).toHaveTextContent('Alex')
    })
  })

  describe('AC4: Language uses recognition, not reward', () => {
    it('should use developmental language in notifications', () => {
      render(<MilestoneNotification milestoneLevel="growing" viewerType="child" childName="Alex" />)

      const notification = screen.getByTestId('milestone-notification')
      const text = notification.textContent?.toLowerCase() ?? ''

      expect(text).toMatch(/recogniz|growth|growing/)
      expect(text).not.toContain('earned')
      expect(text).not.toContain('reward')
      expect(text).not.toContain('deserve')
    })

    it('should use developmental language in transitions', () => {
      const transition = transitionMilestone('child-1', null, 'growing')

      const message = transition.message.toLowerCase()
      expect(message).toContain('recogniz')
      expect(message).not.toContain('earned')
      expect(message).not.toContain('reward')
    })

    it('should use developmental language in progress display', () => {
      render(<MilestoneProgress currentScore={85} consecutiveDays={15} currentMilestone={null} />)

      const progress = screen.getByTestId('milestone-progress')
      const text = progress.textContent?.toLowerCase() ?? ''

      expect(text).toMatch(/growth|growing|journey|progress/)
      expect(text).not.toContain('earned')
      expect(text).not.toContain('reward')
    })
  })

  describe('AC5: Milestones documented in agreement', () => {
    it('should have descriptions for all milestones', () => {
      const growing = getMilestoneForScore(80)
      const maturing = getMilestoneForScore(90)
      const ready = getMilestoneForScore(95)

      expect(growing?.description).toBeDefined()
      expect(growing?.description.length).toBeGreaterThan(0)
      expect(maturing?.description).toBeDefined()
      expect(maturing?.description.length).toBeGreaterThan(0)
      expect(ready?.description).toBeDefined()
      expect(ready?.description.length).toBeGreaterThan(0)
    })

    it('should have benefits for all milestones', () => {
      const growing = getMilestoneForScore(80)
      const maturing = getMilestoneForScore(90)
      const ready = getMilestoneForScore(95)

      expect(growing?.benefits.length).toBeGreaterThan(0)
      expect(maturing?.benefits.length).toBeGreaterThan(0)
      expect(ready?.benefits.length).toBeGreaterThan(0)
    })
  })

  describe('AC6: Regression handled gracefully', () => {
    it('should have 2-week grace period', () => {
      expect(MILESTONE_GRACE_PERIOD_DAYS).toBe(14)
    })

    it('should detect regression risk when score drops', () => {
      const riskStatus = checkForRegressionRisk('growing', 75)

      expect(riskStatus.atRisk).toBe(true)
      expect(riskStatus.currentMilestone).toBe('growing')
    })

    it('should maintain milestone during grace period', () => {
      const state = applyGracePeriod('growing', 75, null)

      expect(state.isActive).toBe(true)
      expect(state.originalMilestone).toBe('growing')
      expect(isMilestoneInGracePeriod(state)).toBe(true)
    })

    it('should allow recovery during grace period', () => {
      const initialState = applyGracePeriod('growing', 75, null)
      expect(initialState.isActive).toBe(true)

      // Score recovers
      const recoveredState = applyGracePeriod('growing', 85, initialState)
      expect(recoveredState.isActive).toBe(false)
    })

    it('should use compassionate language for regression', () => {
      const transition = transitionMilestone('child-1', 'maturing', 'growing')
      const message = transition.message.toLowerCase()

      expect(message).not.toContain('lost')
      expect(message).not.toContain('failed')
      expect(message).toMatch(/journey|support/)
    })
  })

  describe('Complete milestone journey', () => {
    it('should progress through all milestones with 30+ days at each', () => {
      // Start with no milestone
      let result = checkMilestoneEligibility('child-1', [])
      expect(result.milestoneLevel).toBeNull()

      // 30 days at 85 -> Growing
      let history = createScoreHistory(30, 85)
      result = checkMilestoneEligibility('child-1', history)
      expect(result.eligible).toBe(true)
      expect(result.milestoneLevel).toBe('growing')

      // Create transition
      let transition = transitionMilestone('child-1', null, 'growing')
      expect(transition.transitionType).toBe('achievement')
      expect(transition.benefits.length).toBeGreaterThan(0)

      // 30 days at 92 -> Maturing
      history = createScoreHistory(30, 92)
      result = checkMilestoneEligibility('child-1', history)
      expect(result.eligible).toBe(true)
      expect(result.milestoneLevel).toBe('maturing')

      transition = transitionMilestone('child-1', 'growing', 'maturing')
      expect(transition.transitionType).toBe('progression')

      // 30 days at 96 -> Ready for Independence
      history = createScoreHistory(30, 96)
      result = checkMilestoneEligibility('child-1', history)
      expect(result.eligible).toBe(true)
      expect(result.milestoneLevel).toBe('ready-for-independence')

      transition = transitionMilestone('child-1', 'maturing', 'ready-for-independence')
      expect(transition.transitionType).toBe('progression')
    })

    it('should display progress correctly throughout journey', () => {
      // 15 days into growing milestone journey
      const { rerender } = render(
        <MilestoneProgress currentScore={85} consecutiveDays={15} currentMilestone={null} />
      )

      expect(screen.getByTestId('days-progress')).toHaveTextContent('15')
      expect(screen.getByTestId('days-remaining')).toHaveTextContent('15')
      expect(screen.getByTestId('next-milestone')).toHaveTextContent(/growing/i)

      // After achieving growing milestone
      rerender(
        <MilestoneProgress currentScore={85} consecutiveDays={35} currentMilestone="growing" />
      )

      expect(screen.getByTestId('milestone-growing')).toHaveAttribute('data-achieved', 'true')
      expect(screen.getByTestId('next-milestone')).toHaveTextContent(/maturing/i)
    })
  })

  describe('Notification and celebration flow', () => {
    it('should show celebratory elements on achievement', () => {
      render(<MilestoneNotification milestoneLevel="growing" viewerType="child" childName="Alex" />)

      expect(screen.getByTestId('celebration-icon')).toBeInTheDocument()
      expect(screen.getByTestId('milestone-notification')).toHaveAttribute(
        'data-celebratory',
        'true'
      )
    })

    it('should display milestone benefits', () => {
      render(
        <MilestoneNotification milestoneLevel="maturing" viewerType="child" childName="Alex" />
      )

      expect(screen.getByTestId('milestone-benefits')).toBeInTheDocument()
    })

    it('should have accessible notification', () => {
      render(<MilestoneNotification milestoneLevel="growing" viewerType="child" childName="Alex" />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByRole('heading')).toBeInTheDocument()
    })
  })
})
