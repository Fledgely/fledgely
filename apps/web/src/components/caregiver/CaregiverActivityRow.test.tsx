/**
 * Tests for CaregiverActivityRow Component
 *
 * Story 39.6: Caregiver Action Logging - AC2
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CaregiverActivityRow } from './CaregiverActivityRow'
import type { CaregiverAuditLog } from '@fledgely/shared'

// Mock the service
vi.mock('../../services/caregiverActivityService', () => ({
  formatActivityDescription: (log: CaregiverAuditLog) => {
    switch (log.action) {
      case 'time_extension':
        return `${log.caregiverName} extended screen time by ${log.changes?.extensionMinutes ?? 0} min for ${log.childName}`
      case 'flag_viewed':
        return `${log.caregiverName} viewed a flag for ${log.childName}`
      case 'flag_marked_reviewed':
        return `${log.caregiverName} marked a flag as reviewed for ${log.childName}`
      case 'permission_change':
        return `${log.caregiverName}'s permissions were updated`
      default:
        return `${log.caregiverName} performed an action`
    }
  },
}))

describe('CaregiverActivityRow', () => {
  const baseLog: CaregiverAuditLog = {
    id: 'log-1',
    familyId: 'family-123',
    caregiverUid: 'caregiver-1',
    caregiverName: 'Grandma',
    action: 'time_extension',
    changedByUid: 'caregiver-1',
    changes: { extensionMinutes: 30 },
    childUid: 'child-1',
    childName: 'Emma',
    createdAt: new Date(),
  }

  it('renders time_extension action correctly', () => {
    render(<CaregiverActivityRow log={baseLog} />)

    expect(screen.getByTestId('activity-row')).toBeInTheDocument()
    expect(screen.getByText(/Grandma extended screen time by 30 min for Emma/)).toBeInTheDocument()
    expect(screen.getByTestId('action-badge')).toHaveTextContent('Time')
  })

  it('renders flag_viewed action correctly', () => {
    const log: CaregiverAuditLog = {
      ...baseLog,
      action: 'flag_viewed',
      changes: {},
    }

    render(<CaregiverActivityRow log={log} />)

    expect(screen.getByText(/Grandma viewed a flag for Emma/)).toBeInTheDocument()
    expect(screen.getByTestId('action-badge')).toHaveTextContent('Viewed')
  })

  it('renders flag_marked_reviewed action correctly', () => {
    const log: CaregiverAuditLog = {
      ...baseLog,
      action: 'flag_marked_reviewed',
      changes: { flagCategory: 'Violence' },
    }

    render(<CaregiverActivityRow log={log} />)

    expect(screen.getByText(/Grandma marked a flag as reviewed for Emma/)).toBeInTheDocument()
    expect(screen.getByTestId('action-badge')).toHaveTextContent('Reviewed')
  })

  it('renders permission_change action correctly', () => {
    const log: CaregiverAuditLog = {
      ...baseLog,
      action: 'permission_change',
      changedByUid: 'parent-1',
      changes: {},
    }

    render(<CaregiverActivityRow log={log} />)

    expect(screen.getByText(/Grandma's permissions were updated/)).toBeInTheDocument()
    expect(screen.getByTestId('action-badge')).toHaveTextContent('Access')
  })

  it('displays correct data attributes', () => {
    render(<CaregiverActivityRow log={baseLog} />)

    const row = screen.getByTestId('activity-row')
    expect(row).toHaveAttribute('data-log-id', 'log-1')
    expect(row).toHaveAttribute('data-action', 'time_extension')
  })

  it('shows relative time for recent activity', () => {
    const recentLog: CaregiverAuditLog = {
      ...baseLog,
      createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    }

    render(<CaregiverActivityRow log={recentLog} />)

    expect(screen.getByText(/5m ago/)).toBeInTheDocument()
  })

  it('shows "Just now" for very recent activity', () => {
    const veryRecentLog: CaregiverAuditLog = {
      ...baseLog,
      createdAt: new Date(Date.now() - 10 * 1000), // 10 seconds ago
    }

    render(<CaregiverActivityRow log={veryRecentLog} />)

    expect(screen.getByText(/Just now/)).toBeInTheDocument()
  })
})
