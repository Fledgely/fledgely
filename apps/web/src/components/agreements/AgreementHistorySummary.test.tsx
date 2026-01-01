/**
 * AgreementHistorySummary Tests - Story 34.6
 *
 * Tests for the history summary component with growth messaging.
 * AC4: "We've updated the agreement X times" summary
 * AC5: History demonstrates growth and trust-building
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AgreementHistorySummary } from './AgreementHistorySummary'

// Mock shared package
vi.mock('@fledgely/shared', () => ({
  HISTORY_MESSAGES: {
    growth: {
      milestone: {
        five: "You've reached 5 updates! Your family is learning to adapt together.",
        ten: '10 updates and counting! This shows real commitment to growth.',
        twenty: '20 updates! Your agreement evolves with your family.',
      },
      collaboration: 'Every update represents a conversation and a decision made together.',
      evolution: 'Agreements that change are agreements that work.',
    },
  },
  getUpdateCountMessage: (count: number) =>
    count === 0
      ? "We haven't updated the agreement yet."
      : count === 1
        ? "We've updated the agreement 1 time."
        : `We've updated the agreement ${count} times.`,
  getGrowthMessage: (count: number) => {
    if (count >= 20) return '20 updates! Your agreement evolves with your family.'
    if (count >= 10) return '10 updates and counting! This shows real commitment to growth.'
    if (count >= 5) return "You've reached 5 updates! Your family is learning to adapt together."
    if (count >= 2) return 'Every update represents a conversation and a decision made together.'
    return 'Agreements that change are agreements that work.'
  },
}))

describe('AgreementHistorySummary - Story 34.6', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('update count message (AC4)', () => {
    it('should show "updated X times" for multiple updates', () => {
      render(<AgreementHistorySummary versionCount={5} />)

      expect(screen.getByText(/updated the agreement 4 times/i)).toBeInTheDocument()
    })

    it('should show singular message for 1 update', () => {
      render(<AgreementHistorySummary versionCount={2} />)

      expect(screen.getByText(/updated the agreement 1 time/i)).toBeInTheDocument()
    })

    it('should show no updates message for initial version only', () => {
      render(<AgreementHistorySummary versionCount={1} />)

      expect(screen.getByText(/haven't updated/i)).toBeInTheDocument()
    })

    it('should handle zero versions', () => {
      render(<AgreementHistorySummary versionCount={0} />)

      expect(screen.getByText(/haven't updated/i)).toBeInTheDocument()
    })
  })

  describe('growth messaging (AC5)', () => {
    it('should show milestone message at 5+ versions', () => {
      render(<AgreementHistorySummary versionCount={6} />)

      expect(screen.getByText(/5 updates/i)).toBeInTheDocument()
      expect(screen.getByText(/learning to adapt together/i)).toBeInTheDocument()
    })

    it('should show milestone message at 10+ versions', () => {
      render(<AgreementHistorySummary versionCount={11} />)

      expect(screen.getByText(/10 updates/i)).toBeInTheDocument()
      expect(screen.getByText(/commitment to growth/i)).toBeInTheDocument()
    })

    it('should show milestone message at 20+ versions', () => {
      render(<AgreementHistorySummary versionCount={21} />)

      expect(screen.getByText(/20 updates/i)).toBeInTheDocument()
      expect(screen.getByText(/evolves with your family/i)).toBeInTheDocument()
    })

    it('should show collaboration message for 2+ versions', () => {
      render(<AgreementHistorySummary versionCount={3} />)

      expect(screen.getByText(/conversation and a decision/i)).toBeInTheDocument()
    })

    it('should show evolution message for 1 version', () => {
      render(<AgreementHistorySummary versionCount={1} />)

      expect(screen.getByText(/agreements that change/i)).toBeInTheDocument()
    })

    it('should use positive language throughout', () => {
      render(<AgreementHistorySummary versionCount={10} />)

      const container = screen.getByTestId('agreement-history-summary')
      const text = container.textContent?.toLowerCase() || ''

      expect(text).not.toContain('failed')
      expect(text).not.toContain('wrong')
      expect(text).not.toContain('bad')
    })
  })

  describe('visual presentation', () => {
    it('should render with appropriate styling', () => {
      render(<AgreementHistorySummary versionCount={5} />)

      const summary = screen.getByTestId('agreement-history-summary')
      expect(summary).toHaveClass('bg-gradient-to-r')
    })

    it('should show celebratory icon for milestones', () => {
      render(<AgreementHistorySummary versionCount={11} />)

      // Should have a star or celebration icon
      expect(screen.getByText('🌟')).toBeInTheDocument()
    })

    it('should show growth icon for non-milestones', () => {
      render(<AgreementHistorySummary versionCount={3} />)

      // Should have growth-related icon
      expect(screen.getByText('🌱')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have appropriate heading', () => {
      render(<AgreementHistorySummary versionCount={5} />)

      expect(screen.getByRole('heading')).toBeInTheDocument()
    })

    it('should have accessible description', () => {
      render(<AgreementHistorySummary versionCount={5} />)

      // The summary should be readable by screen readers
      const summary = screen.getByTestId('agreement-history-summary')
      expect(summary).toBeInTheDocument()
    })
  })
})
