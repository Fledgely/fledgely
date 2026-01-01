/**
 * FocusModeActiveCard Component Tests - Story 33.1
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FocusModeActiveCard } from './FocusModeActiveCard'
import type { FocusModeSession } from '@fledgely/shared'

describe('FocusModeActiveCard - Story 33.1', () => {
  const mockSession: FocusModeSession = {
    id: 'session-1',
    childId: 'child-1',
    familyId: 'family-1',
    status: 'active',
    durationType: 'pomodoro',
    durationMs: 25 * 60 * 1000,
    startedAt: Date.now(),
    endedAt: null,
    completedFully: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  const defaultProps = {
    session: mockSession,
    timeRemainingMs: 20 * 60 * 1000, // 20 minutes
    timeRemainingFormatted: '20m',
    onStop: vi.fn(),
    loading: false,
  }

  it('renders active card', () => {
    render(<FocusModeActiveCard {...defaultProps} />)

    expect(screen.getByTestId('focus-mode-active-card')).toBeInTheDocument()
  })

  it('displays focus mode active message', () => {
    render(<FocusModeActiveCard {...defaultProps} />)

    expect(screen.getByText(/Focus mode active/i)).toBeInTheDocument()
  })

  it('displays time remaining', () => {
    render(<FocusModeActiveCard {...defaultProps} />)

    expect(screen.getByTestId('focus-mode-timer')).toBeInTheDocument()
    expect(screen.getByText('20m')).toBeInTheDocument()
  })

  it('displays progress bar for timed sessions', () => {
    render(<FocusModeActiveCard {...defaultProps} />)

    expect(screen.getByTestId('focus-mode-progress')).toBeInTheDocument()
  })

  it('calls onStop when stop button clicked', () => {
    const onStop = vi.fn()
    render(<FocusModeActiveCard {...defaultProps} onStop={onStop} />)

    fireEvent.click(screen.getByTestId('focus-mode-stop'))
    expect(onStop).toHaveBeenCalledTimes(1)
  })

  it('disables stop button when loading', () => {
    render(<FocusModeActiveCard {...defaultProps} loading={true} />)

    expect(screen.getByTestId('focus-mode-stop')).toBeDisabled()
    expect(screen.getByText('Ending...')).toBeInTheDocument()
  })

  it('shows encouraging message', () => {
    render(<FocusModeActiveCard {...defaultProps} />)

    expect(screen.getByText(/doing amazing/i)).toBeInTheDocument()
  })

  it('shows non-punitive early stop message', () => {
    render(<FocusModeActiveCard {...defaultProps} />)

    expect(screen.getByText(/okay to stop early/i)).toBeInTheDocument()
  })

  describe('untilOff mode', () => {
    const untilOffSession: FocusModeSession = {
      ...mockSession,
      durationType: 'untilOff',
      durationMs: null,
    }

    it('displays unlimited focus message', () => {
      render(
        <FocusModeActiveCard
          {...defaultProps}
          session={untilOffSession}
          timeRemainingMs={null}
          timeRemainingFormatted={null}
        />
      )

      expect(screen.getByTestId('focus-mode-unlimited')).toBeInTheDocument()
      expect(screen.getByText(/until you're ready/i)).toBeInTheDocument()
    })

    it('does not show progress bar', () => {
      render(
        <FocusModeActiveCard
          {...defaultProps}
          session={untilOffSession}
          timeRemainingMs={null}
          timeRemainingFormatted={null}
        />
      )

      expect(screen.queryByTestId('focus-mode-progress')).not.toBeInTheDocument()
    })

    it('does not show countdown timer', () => {
      render(
        <FocusModeActiveCard
          {...defaultProps}
          session={untilOffSession}
          timeRemainingMs={null}
          timeRemainingFormatted={null}
        />
      )

      expect(screen.queryByTestId('focus-mode-timer')).not.toBeInTheDocument()
    })
  })

  describe('progress calculation', () => {
    it('shows correct progress for halfway through', () => {
      const halfwaySession: FocusModeSession = {
        ...mockSession,
        durationMs: 20 * 60 * 1000,
        startedAt: Date.now() - 10 * 60 * 1000, // Started 10 min ago
      }

      render(
        <FocusModeActiveCard
          {...defaultProps}
          session={halfwaySession}
          timeRemainingMs={10 * 60 * 1000} // 10 min remaining
        />
      )

      const progressBar = screen.getByTestId('focus-mode-progress')
      expect(progressBar).toHaveStyle('width: 50%')
    })
  })

  describe('duration labels', () => {
    it('shows pomodoro label', () => {
      render(<FocusModeActiveCard {...defaultProps} />)

      expect(screen.getByText(/25 min/i)).toBeInTheDocument()
    })

    it('shows oneHour label', () => {
      const oneHourSession: FocusModeSession = {
        ...mockSession,
        durationType: 'oneHour',
        durationMs: 60 * 60 * 1000,
      }

      render(<FocusModeActiveCard {...defaultProps} session={oneHourSession} />)

      expect(screen.getByText(/1 hour/i)).toBeInTheDocument()
    })

    it('shows twoHours label', () => {
      const twoHoursSession: FocusModeSession = {
        ...mockSession,
        durationType: 'twoHours',
        durationMs: 2 * 60 * 60 * 1000,
      }

      render(<FocusModeActiveCard {...defaultProps} session={twoHoursSession} />)

      expect(screen.getByText(/2 hours/i)).toBeInTheDocument()
    })
  })
})
