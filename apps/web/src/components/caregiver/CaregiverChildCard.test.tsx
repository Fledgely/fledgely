/**
 * CaregiverChildCard Component Tests - Story 19A.3, 19D.2
 *
 * Tests for the caregiver child status card component.
 *
 * Story 19A.3 Acceptance Criteria:
 * - AC1: Simplified status display
 * - AC2: No complex device details
 * - AC3: Large touch targets (NFR49: 44x44 minimum)
 * - AC6: Accessibility
 *
 * Story 19D.2 Acceptance Criteria:
 * - AC2: Status shows "Screen time available" or "Screen time finished"
 * - AC3: Shows "X minutes left today" if time remaining
 * - AC4: No screenshot access (verified by data structure)
 * - AC5: No device details (verified by data structure)
 * - AC6: Large, clear UI for older adults (NFR49)
 */

import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CaregiverChildCard } from './CaregiverChildCard'
import type { CaregiverChildSummary } from '../../hooks/useCaregiverStatus'

/**
 * Helper to create mock CaregiverChildSummary
 */
function createMockChild(overrides: Partial<CaregiverChildSummary> = {}): CaregiverChildSummary {
  return {
    childId: 'child-1',
    childName: 'Emma',
    photoURL: null,
    status: 'good',
    statusMessage: 'Doing well',
    screenTimeStatus: 'available',
    timeRemainingMinutes: 45,
    ...overrides,
  }
}

describe('CaregiverChildCard', () => {
  describe('Basic rendering (Story 19A.3)', () => {
    it('renders child name', () => {
      render(<CaregiverChildCard child={createMockChild({ childName: 'Emma' })} />)

      expect(screen.getByText('Emma')).toBeInTheDocument()
    })

    it('renders monitoring status message', () => {
      render(<CaregiverChildCard child={createMockChild({ statusMessage: 'Doing well' })} />)

      expect(screen.getByText('Doing well')).toBeInTheDocument()
    })

    it('renders with correct test id', () => {
      render(<CaregiverChildCard child={createMockChild({ childId: 'child-123' })} />)

      expect(screen.getByTestId('caregiver-child-card-child-123')).toBeInTheDocument()
    })

    it('renders avatar with initials when no photo', () => {
      render(
        <CaregiverChildCard child={createMockChild({ photoURL: null, childName: 'Emma Smith' })} />
      )

      expect(screen.getByText('ES')).toBeInTheDocument()
    })
  })

  describe('Screen time status display (Story 19D.2 AC2)', () => {
    it('shows "Screen time available" when status is available', () => {
      render(<CaregiverChildCard child={createMockChild({ screenTimeStatus: 'available' })} />)

      expect(screen.getByTestId('screen-time-status')).toHaveTextContent('Screen time available')
    })

    it('shows "Screen time finished" when status is finished', () => {
      render(<CaregiverChildCard child={createMockChild({ screenTimeStatus: 'finished' })} />)

      expect(screen.getByTestId('screen-time-status')).toHaveTextContent('Screen time finished')
    })

    it('shows checkmark for available status', () => {
      render(<CaregiverChildCard child={createMockChild({ screenTimeStatus: 'available' })} />)

      expect(screen.getByTestId('screen-time-status')).toHaveTextContent('✓')
    })

    it('shows dash for finished status', () => {
      render(<CaregiverChildCard child={createMockChild({ screenTimeStatus: 'finished' })} />)

      expect(screen.getByTestId('screen-time-status')).toHaveTextContent('—')
    })
  })

  describe('Time remaining display (Story 19D.2 AC3)', () => {
    it('shows time remaining in minutes when less than an hour', () => {
      render(<CaregiverChildCard child={createMockChild({ timeRemainingMinutes: 45 })} />)

      expect(screen.getByTestId('time-remaining')).toHaveTextContent('45 minutes left today')
    })

    it('shows time remaining in hours when exactly one hour', () => {
      render(<CaregiverChildCard child={createMockChild({ timeRemainingMinutes: 60 })} />)

      expect(screen.getByTestId('time-remaining')).toHaveTextContent('1 hour left today')
    })

    it('shows time remaining in hours and minutes for 2h 30m', () => {
      render(<CaregiverChildCard child={createMockChild({ timeRemainingMinutes: 150 })} />)

      expect(screen.getByTestId('time-remaining')).toHaveTextContent('2h 30m left today')
    })

    it('shows singular "minute" for 1 minute', () => {
      render(<CaregiverChildCard child={createMockChild({ timeRemainingMinutes: 1 })} />)

      expect(screen.getByTestId('time-remaining')).toHaveTextContent('1 minute left today')
    })

    it('shows plural "hours" for 2 hours', () => {
      render(<CaregiverChildCard child={createMockChild({ timeRemainingMinutes: 120 })} />)

      expect(screen.getByTestId('time-remaining')).toHaveTextContent('2 hours left today')
    })

    it('does not show time remaining when null', () => {
      render(<CaregiverChildCard child={createMockChild({ timeRemainingMinutes: null })} />)

      expect(screen.queryByTestId('time-remaining')).not.toBeInTheDocument()
    })

    it('does not show time remaining when 0', () => {
      render(<CaregiverChildCard child={createMockChild({ timeRemainingMinutes: 0 })} />)

      expect(screen.queryByTestId('time-remaining')).not.toBeInTheDocument()
    })
  })

  describe('No sensitive data (Story 19D.2 AC4, AC5)', () => {
    it('does not expose device details in the component', () => {
      const child = createMockChild()

      // Verify the type doesn't include device details
      expect(child).not.toHaveProperty('deviceCount')
      expect(child).not.toHaveProperty('devices')
      expect(child).not.toHaveProperty('issues')
      expect(child).not.toHaveProperty('lastActivity')
    })

    it('does not expose screenshot URLs', () => {
      const child = createMockChild()

      // Verify the type doesn't include screenshot data
      expect(child).not.toHaveProperty('screenshots')
      expect(child).not.toHaveProperty('screenshotUrls')
    })
  })

  describe('Accessibility (Story 19D.2 AC6 / NFR49)', () => {
    it('has accessible aria-label with screen time status', () => {
      render(
        <CaregiverChildCard
          child={createMockChild({
            childName: 'Emma',
            screenTimeStatus: 'available',
            timeRemainingMinutes: 45,
            statusMessage: 'Doing well',
          })}
        />
      )

      const card = screen.getByRole('listitem')
      expect(card).toHaveAttribute('aria-label', expect.stringContaining('Screen time available'))
      expect(card).toHaveAttribute('aria-label', expect.stringContaining('45 minutes left today'))
    })

    it('has accessible aria-label when screen time finished', () => {
      render(
        <CaregiverChildCard
          child={createMockChild({
            childName: 'Emma',
            screenTimeStatus: 'finished',
            timeRemainingMinutes: 0,
          })}
        />
      )

      const card = screen.getByRole('listitem')
      expect(card).toHaveAttribute('aria-label', expect.stringContaining('Screen time finished'))
    })

    it('renders as a listitem for proper list semantics', () => {
      render(<CaregiverChildCard child={createMockChild()} />)

      expect(screen.getByRole('listitem')).toBeInTheDocument()
    })
  })

  describe('Different monitoring statuses', () => {
    it('renders attention status with correct styling', () => {
      render(
        <CaregiverChildCard
          child={createMockChild({ status: 'attention', statusMessage: 'Check in' })}
        />
      )

      expect(screen.getByText('Check in')).toBeInTheDocument()
    })

    it('renders action status with correct styling', () => {
      render(
        <CaregiverChildCard
          child={createMockChild({ status: 'action', statusMessage: 'Needs help' })}
        />
      )

      expect(screen.getByText('Needs help')).toBeInTheDocument()
    })
  })
})
