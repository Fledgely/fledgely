/**
 * StreakCounterCard Component Tests - Story 32.6
 *
 * Tests for streak display and celebration UI.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StreakCounterCard } from './StreakCounterCard'
import type { OfflineStreak } from '@fledgely/shared'

vi.mock('@fledgely/shared', () => ({
  STREAK_MESSAGES: {
    streakCounter: (days: number) =>
      days === 1 ? '1 day of family offline time!' : `${days} days of family offline time!`,
    weeklySummary: (hours: number) =>
      `Your family unplugged ${hours} ${hours === 1 ? 'hour' : 'hours'} together`,
    milestoneReached: (days: number) => `Amazing! You've reached ${days} days together!`,
    childStreakMessage: 'Great job unplugging with your family!',
    childMilestone7: "You're a superstar! 7 days of family time!",
    childMilestone30: 'Incredible! 30 days of unplugging together!',
    childMilestone100: 'LEGENDARY! 100 days of family time!',
    noStreak: 'Start your family offline time streak today!',
    keepGoing: 'Keep up the great work!',
    almostMilestone: (daysToGo: number, milestone: number) =>
      `Only ${daysToGo} more ${daysToGo === 1 ? 'day' : 'days'} until your ${milestone}-day milestone!`,
  },
  STREAK_MILESTONE_DAYS: {
    seven: 7,
    thirty: 30,
    hundred: 100,
  },
}))

describe('StreakCounterCard - Story 32.6', () => {
  const createStreak = (overrides: Partial<OfflineStreak> = {}): OfflineStreak => ({
    familyId: 'family-1',
    currentStreak: 5,
    longestStreak: 10,
    lastCompletedDate: Date.now(),
    weeklyHours: 14,
    weeklyStartDate: Date.now() - 3 * 24 * 60 * 60 * 1000,
    milestones: {
      sevenDays: false,
      thirtyDays: false,
      hundredDays: false,
    },
    leaderboardOptIn: false,
    updatedAt: Date.now(),
    ...overrides,
  })

  describe('rendering', () => {
    it('renders with test id', () => {
      render(<StreakCounterCard streak={createStreak()} />)

      expect(screen.getByTestId('streak-counter-card')).toBeInTheDocument()
    })

    it('shows loading state', () => {
      render(<StreakCounterCard streak={null} loading={true} />)

      expect(screen.getByTestId('streak-counter-card')).toBeInTheDocument()
    })

    it('shows streak count', () => {
      render(<StreakCounterCard streak={createStreak({ currentStreak: 5 })} />)

      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('shows streak message for parent view', () => {
      render(<StreakCounterCard streak={createStreak({ currentStreak: 7 })} />)

      expect(screen.getByText('7 days of family offline time!')).toBeInTheDocument()
    })

    it('shows child-friendly message for child view', () => {
      render(<StreakCounterCard streak={createStreak({ currentStreak: 7 })} isChildView={true} />)

      expect(screen.getByText('Great job unplugging with your family!')).toBeInTheDocument()
    })
  })

  describe('AC1: Streak Counter', () => {
    it('shows correct streak number', () => {
      render(<StreakCounterCard streak={createStreak({ currentStreak: 12 })} />)

      expect(screen.getByText('12')).toBeInTheDocument()
    })

    it('shows zero streak message', () => {
      render(<StreakCounterCard streak={createStreak({ currentStreak: 0 })} />)

      expect(screen.getByText('Start your family offline time streak today!')).toBeInTheDocument()
    })
  })

  describe('AC2: Weekly Summary', () => {
    it('shows weekly hours summary', () => {
      render(<StreakCounterCard streak={createStreak({ weeklyHours: 14 })} />)

      expect(screen.getByTestId('weekly-summary')).toBeInTheDocument()
      expect(screen.getByText('Your family unplugged 14 hours together')).toBeInTheDocument()
    })

    it('hides weekly summary when zero hours', () => {
      render(<StreakCounterCard streak={createStreak({ weeklyHours: 0 })} />)

      expect(screen.queryByTestId('weekly-summary')).not.toBeInTheDocument()
    })
  })

  describe('AC3: Celebration Milestones', () => {
    it('shows milestone badge for 7 days', () => {
      render(
        <StreakCounterCard
          streak={createStreak({
            currentStreak: 7,
            milestones: { sevenDays: true, thirtyDays: false, hundredDays: false },
          })}
        />
      )

      expect(screen.getByTestId('milestone-badge')).toBeInTheDocument()
      expect(screen.getByText('7 Day Streak!')).toBeInTheDocument()
    })

    it('shows milestone badge for 30 days', () => {
      render(
        <StreakCounterCard
          streak={createStreak({
            currentStreak: 30,
            milestones: { sevenDays: true, thirtyDays: true, hundredDays: false },
          })}
        />
      )

      expect(screen.getByText('30 Day Streak!')).toBeInTheDocument()
    })

    it('shows milestone badge for 100 days', () => {
      render(
        <StreakCounterCard
          streak={createStreak({
            currentStreak: 100,
            milestones: { sevenDays: true, thirtyDays: true, hundredDays: true },
          })}
        />
      )

      expect(screen.getByText('100 Day Champion!')).toBeInTheDocument()
    })

    it('shows celebration overlay when milestone reached', () => {
      const onDismiss = vi.fn()

      render(
        <StreakCounterCard
          streak={createStreak({ currentStreak: 7 })}
          celebrationMilestone={7}
          onCelebrationDismiss={onDismiss}
        />
      )

      expect(screen.getByTestId('streak-celebration')).toBeInTheDocument()
      expect(screen.getByText("Amazing! You've reached 7 days together!")).toBeInTheDocument()
    })

    it('calls onCelebrationDismiss when Continue clicked', () => {
      const onDismiss = vi.fn()

      render(
        <StreakCounterCard
          streak={createStreak({ currentStreak: 7 })}
          celebrationMilestone={7}
          onCelebrationDismiss={onDismiss}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /continue/i }))

      expect(onDismiss).toHaveBeenCalled()
    })
  })

  describe('AC5: Positive Reinforcement', () => {
    it('never shows punitive messages', () => {
      const { container } = render(
        <StreakCounterCard streak={createStreak({ currentStreak: 0 })} />
      )

      // Check that no negative words appear
      const text = container.textContent || ''
      expect(text.toLowerCase()).not.toContain('fail')
      expect(text.toLowerCase()).not.toContain('miss')
      expect(text.toLowerCase()).not.toContain('broke')
      expect(text.toLowerCase()).not.toContain('lost')
    })

    it('shows encouragement for zero streak', () => {
      render(<StreakCounterCard streak={createStreak({ currentStreak: 0 })} />)

      expect(screen.getByText('Start your family offline time streak today!')).toBeInTheDocument()
    })
  })

  describe('AC6: Child-Friendly View', () => {
    it('shows child-appropriate messages', () => {
      render(<StreakCounterCard streak={createStreak({ currentStreak: 5 })} isChildView={true} />)

      expect(screen.getByText('Great job unplugging with your family!')).toBeInTheDocument()
    })

    it('shows child milestone message in celebration', () => {
      const onDismiss = vi.fn()

      render(
        <StreakCounterCard
          streak={createStreak({ currentStreak: 7 })}
          isChildView={true}
          celebrationMilestone={7}
          onCelebrationDismiss={onDismiss}
        />
      )

      expect(screen.getByText("You're a superstar! 7 days of family time!")).toBeInTheDocument()
    })
  })

  describe('streak icons', () => {
    it('shows seedling for no streak', () => {
      const { container } = render(
        <StreakCounterCard streak={createStreak({ currentStreak: 0 })} />
      )

      expect(container.textContent).toContain('🌱')
    })

    it('shows sparkles for small streak', () => {
      const { container } = render(
        <StreakCounterCard streak={createStreak({ currentStreak: 3 })} />
      )

      expect(container.textContent).toContain('✨')
    })

    it('shows star for 7+ days', () => {
      const { container } = render(
        <StreakCounterCard streak={createStreak({ currentStreak: 7 })} />
      )

      expect(container.textContent).toContain('⭐')
    })

    it('shows fire for 30+ days', () => {
      const { container } = render(
        <StreakCounterCard streak={createStreak({ currentStreak: 30 })} />
      )

      expect(container.textContent).toContain('🔥')
    })

    it('shows trophy for 100+ days', () => {
      const { container } = render(
        <StreakCounterCard streak={createStreak({ currentStreak: 100 })} />
      )

      expect(container.textContent).toContain('🏆')
    })
  })

  describe('longest streak display', () => {
    it('shows longest streak when different from current', () => {
      render(<StreakCounterCard streak={createStreak({ currentStreak: 5, longestStreak: 15 })} />)

      expect(screen.getByText('Longest streak: 15 days')).toBeInTheDocument()
    })

    it('hides longest streak when equal to current', () => {
      render(<StreakCounterCard streak={createStreak({ currentStreak: 5, longestStreak: 5 })} />)

      expect(screen.queryByText(/Longest streak/)).not.toBeInTheDocument()
    })
  })
})
