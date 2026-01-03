/**
 * Tests for CaregiverSummaryCard Component
 *
 * Story 39.6: Caregiver Action Logging - AC3
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CaregiverSummaryCard } from './CaregiverSummaryCard'
import type { CaregiverActivitySummary } from '@fledgely/shared'

// Mock the service
vi.mock('../../services/caregiverActivityService', () => ({
  formatActivitySummary: (summary: CaregiverActivitySummary) => {
    const parts: string[] = []
    if (summary.actionCounts.time_extension > 0) {
      parts.push(
        `${summary.actionCounts.time_extension} time extension${summary.actionCounts.time_extension === 1 ? '' : 's'}`
      )
    }
    if (summary.actionCounts.flag_viewed > 0) {
      parts.push(
        `${summary.actionCounts.flag_viewed} flag${summary.actionCounts.flag_viewed === 1 ? '' : 's'} viewed`
      )
    }
    if (summary.actionCounts.flag_marked_reviewed > 0) {
      parts.push(
        `${summary.actionCounts.flag_marked_reviewed} flag${summary.actionCounts.flag_marked_reviewed === 1 ? '' : 's'} reviewed`
      )
    }
    if (parts.length === 0) {
      return `${summary.caregiverName}: No recent activity`
    }
    return `${summary.caregiverName}: ${parts.join(', ')}`
  },
}))

describe('CaregiverSummaryCard', () => {
  const baseSummary: CaregiverActivitySummary = {
    caregiverUid: 'caregiver-1',
    caregiverName: 'Grandma',
    actionCounts: {
      time_extension: 2,
      flag_viewed: 1,
      flag_marked_reviewed: 0,
      permission_change: 0,
    },
    lastActiveAt: new Date(),
    totalActions: 3,
  }

  it('renders caregiver name and initials', () => {
    render(<CaregiverSummaryCard summary={baseSummary} />)

    expect(screen.getByText('Grandma')).toBeInTheDocument()
    expect(screen.getByText('G')).toBeInTheDocument() // Initial for single word
  })

  it('displays activity summary text', () => {
    render(<CaregiverSummaryCard summary={baseSummary} />)

    expect(screen.getByTestId('summary-text')).toHaveTextContent('2 time extensions, 1 flag viewed')
  })

  it('shows stat badges for each action type with activity', () => {
    render(<CaregiverSummaryCard summary={baseSummary} />)

    const statsGrid = screen.getByTestId('stats-grid')
    expect(statsGrid).toBeInTheDocument()

    expect(screen.getByTestId('stat-time-extension')).toHaveTextContent('2')
    expect(screen.getByTestId('stat-flag-viewed')).toHaveTextContent('1')
    expect(screen.queryByTestId('stat-flag-reviewed')).not.toBeInTheDocument()
    expect(screen.queryByTestId('stat-permission')).not.toBeInTheDocument()
  })

  it('displays "No recent activity" when no actions', () => {
    const noActivitySummary: CaregiverActivitySummary = {
      ...baseSummary,
      actionCounts: {
        time_extension: 0,
        flag_viewed: 0,
        flag_marked_reviewed: 0,
        permission_change: 0,
      },
      totalActions: 0,
    }

    render(<CaregiverSummaryCard summary={noActivitySummary} />)

    expect(screen.getByText('No recent activity')).toBeInTheDocument()
    expect(screen.queryByTestId('stats-grid')).not.toBeInTheDocument()
  })

  it('handles single-name caregivers', () => {
    const singleNameSummary: CaregiverActivitySummary = {
      ...baseSummary,
      caregiverName: 'Maria',
    }

    render(<CaregiverSummaryCard summary={singleNameSummary} />)

    expect(screen.getByText('M')).toBeInTheDocument() // Single word = first letter
  })

  it('handles multi-word caregiver names', () => {
    const multiWordSummary: CaregiverActivitySummary = {
      ...baseSummary,
      caregiverName: 'Mary Jane Watson',
    }

    render(<CaregiverSummaryCard summary={multiWordSummary} />)

    expect(screen.getByText('MJ')).toBeInTheDocument() // First letters of first two words
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<CaregiverSummaryCard summary={baseSummary} onClick={onClick} />)

    const card = screen.getByTestId('caregiver-summary-card')
    fireEvent.click(card)

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('is keyboard accessible when onClick provided', () => {
    const onClick = vi.fn()
    render(<CaregiverSummaryCard summary={baseSummary} onClick={onClick} />)

    const card = screen.getByTestId('caregiver-summary-card')
    expect(card).toHaveAttribute('role', 'button')
    expect(card).toHaveAttribute('tabIndex', '0')

    fireEvent.keyDown(card, { key: 'Enter' })
    expect(onClick).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(card, { key: ' ' })
    expect(onClick).toHaveBeenCalledTimes(2)
  })

  it('is not keyboard accessible when onClick not provided', () => {
    render(<CaregiverSummaryCard summary={baseSummary} />)

    const card = screen.getByTestId('caregiver-summary-card')
    expect(card).not.toHaveAttribute('role')
    expect(card).not.toHaveAttribute('tabIndex')
  })

  it('includes caregiver UID in data attribute', () => {
    render(<CaregiverSummaryCard summary={baseSummary} />)

    const card = screen.getByTestId('caregiver-summary-card')
    expect(card).toHaveAttribute('data-caregiver-uid', 'caregiver-1')
  })

  it('shows all action types when all have activity', () => {
    const allActionsSummary: CaregiverActivitySummary = {
      ...baseSummary,
      actionCounts: {
        time_extension: 5,
        flag_viewed: 3,
        flag_marked_reviewed: 2,
        permission_change: 1,
      },
      totalActions: 11,
    }

    render(<CaregiverSummaryCard summary={allActionsSummary} />)

    expect(screen.getByTestId('stat-time-extension')).toHaveTextContent('5')
    expect(screen.getByTestId('stat-flag-viewed')).toHaveTextContent('3')
    expect(screen.getByTestId('stat-flag-reviewed')).toHaveTextContent('2')
    expect(screen.getByTestId('stat-permission')).toHaveTextContent('1')
  })
})
