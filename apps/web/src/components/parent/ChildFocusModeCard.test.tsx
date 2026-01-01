/**
 * ChildFocusModeCard Component Tests - Story 33.1 (AC5)
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChildFocusModeCard } from './ChildFocusModeCard'
import type { FocusModeSession } from '@fledgely/shared'

describe('ChildFocusModeCard - Story 33.1 (AC5)', () => {
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
    childName: 'Emma',
    isActive: false,
    currentSession: null,
    timeRemainingFormatted: null,
    totalSessionsToday: 0,
    totalFocusTimeToday: 0,
    loading: false,
  }

  it('renders card', () => {
    render(<ChildFocusModeCard {...defaultProps} />)

    expect(screen.getByTestId('child-focus-mode-card')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(<ChildFocusModeCard {...defaultProps} loading={true} />)

    expect(screen.getByTestId('child-focus-mode-card-loading')).toBeInTheDocument()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows child name', () => {
    render(<ChildFocusModeCard {...defaultProps} />)

    expect(screen.getByText("Emma's Focus Mode")).toBeInTheDocument()
  })

  it('shows inactive status when not focusing', () => {
    render(<ChildFocusModeCard {...defaultProps} />)

    expect(screen.getByTestId('focus-mode-status')).toHaveTextContent('Not currently focusing')
    expect(screen.queryByTestId('focus-mode-active-badge')).not.toBeInTheDocument()
  })

  it('shows active status and badge when focusing', () => {
    render(
      <ChildFocusModeCard
        {...defaultProps}
        isActive={true}
        currentSession={mockSession}
        timeRemainingFormatted="20m"
      />
    )

    expect(screen.getByTestId('focus-mode-status')).toHaveTextContent(/active/i)
    expect(screen.getByTestId('focus-mode-active-badge')).toBeInTheDocument()
  })

  it('shows time remaining for timed sessions', () => {
    render(
      <ChildFocusModeCard
        {...defaultProps}
        isActive={true}
        currentSession={mockSession}
        timeRemainingFormatted="20m"
      />
    )

    expect(screen.getByTestId('time-remaining')).toHaveTextContent('20m')
  })

  it('shows unlimited mode message for untilOff', () => {
    const untilOffSession: FocusModeSession = {
      ...mockSession,
      durationType: 'untilOff',
      durationMs: null,
    }

    render(
      <ChildFocusModeCard
        {...defaultProps}
        isActive={true}
        currentSession={untilOffSession}
        timeRemainingFormatted={null}
      />
    )

    expect(screen.getByTestId('unlimited-mode')).toHaveTextContent(/until they're ready/i)
  })

  it('shows daily session count', () => {
    render(<ChildFocusModeCard {...defaultProps} totalSessionsToday={3} />)

    expect(screen.getByTestId('sessions-today')).toHaveTextContent('3')
  })

  it('shows daily focus time', () => {
    render(<ChildFocusModeCard {...defaultProps} totalFocusTimeToday={75 * 60 * 1000} />)

    expect(screen.getByTestId('focus-time-today')).toHaveTextContent('1h 15m')
  })

  it('shows 0m when no focus time', () => {
    render(<ChildFocusModeCard {...defaultProps} totalFocusTimeToday={0} />)

    expect(screen.getByTestId('focus-time-today')).toHaveTextContent('0m')
  })

  it('shows transparency note explaining child autonomy', () => {
    render(<ChildFocusModeCard {...defaultProps} />)

    expect(screen.getByText(/can start and stop focus mode on their own/i)).toBeInTheDocument()
  })

  it('shows duration label for active session', () => {
    render(
      <ChildFocusModeCard
        {...defaultProps}
        isActive={true}
        currentSession={mockSession}
        timeRemainingFormatted="20m"
      />
    )

    expect(screen.getByText(/25 min/i)).toBeInTheDocument()
  })
})
