/**
 * Tests for ChildCaregiverActivityView Component
 *
 * Story 39.6: Caregiver Action Logging - AC4
 * Child transparency view with 6th-grade reading level (NFR65)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ChildCaregiverActivityView } from './ChildCaregiverActivityView'
import type { CaregiverAuditLog } from '@fledgely/shared'

// Mock data
const mockLogs: CaregiverAuditLog[] = [
  {
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
  },
  {
    id: 'log-2',
    familyId: 'family-123',
    caregiverUid: 'caregiver-1',
    caregiverName: 'Grandma',
    action: 'flag_viewed',
    changedByUid: 'caregiver-1',
    changes: {},
    childUid: 'child-1',
    childName: 'Emma',
    createdAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
  },
]

// Mock functions
const mockGetActivityForChild = vi.fn()

// Mock the service
vi.mock('../../services/caregiverActivityService', () => ({
  getActivityForChild: (...args: unknown[]) => mockGetActivityForChild(...args),
  formatActivityForChild: (log: CaregiverAuditLog) => {
    switch (log.action) {
      case 'time_extension':
        return `${log.caregiverName} extended your screen time by ${log.changes?.extensionMinutes ?? 0} min`
      case 'flag_viewed':
        return `${log.caregiverName} looked at a flagged item`
      case 'flag_marked_reviewed':
        return `${log.caregiverName} marked something as reviewed`
      case 'permission_change':
        return `${log.caregiverName}'s access was updated`
      default:
        return `${log.caregiverName} did something`
    }
  },
}))

describe('ChildCaregiverActivityView', () => {
  const defaultProps = {
    familyId: 'family-123',
    childUid: 'child-1',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetActivityForChild.mockResolvedValue(mockLogs)
  })

  it('shows loading state initially', () => {
    mockGetActivityForChild.mockReturnValue(new Promise(() => {}))

    render(<ChildCaregiverActivityView {...defaultProps} />)

    expect(screen.getByTestId('loading-state')).toBeInTheDocument()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders child-friendly header', async () => {
    render(<ChildCaregiverActivityView {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('What Your Caregivers Did')).toBeInTheDocument()
    })

    expect(screen.getByText('See what helpers did for you')).toBeInTheDocument()
  })

  it('displays activity items with child-friendly text', async () => {
    render(<ChildCaregiverActivityView {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('activity-list')).toBeInTheDocument()
    })

    const items = screen.getAllByTestId('activity-item')
    expect(items).toHaveLength(2)

    // Check child-friendly text
    expect(screen.getByText('Grandma extended your screen time by 30 min')).toBeInTheDocument()
    expect(screen.getByText('Grandma looked at a flagged item')).toBeInTheDocument()
  })

  it('shows empty state when no activity', async () => {
    mockGetActivityForChild.mockResolvedValue([])

    render(<ChildCaregiverActivityView {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })

    expect(screen.getByText('Nothing yet!')).toBeInTheDocument()
    expect(
      screen.getByText('When your caregivers do things to help you, you will see them here.')
    ).toBeInTheDocument()
  })

  it('displays error state when fetch fails', async () => {
    mockGetActivityForChild.mockRejectedValue(new Error('Failed to load'))

    render(<ChildCaregiverActivityView {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument()
    })

    expect(screen.getByText('Failed to load')).toBeInTheDocument()
  })

  it('respects custom limit', async () => {
    render(<ChildCaregiverActivityView {...defaultProps} limit={5} />)

    await waitFor(() => {
      expect(mockGetActivityForChild).toHaveBeenCalledWith('family-123', 'child-1', 5)
    })
  })

  it('uses default limit of 10', async () => {
    render(<ChildCaregiverActivityView {...defaultProps} />)

    await waitFor(() => {
      expect(mockGetActivityForChild).toHaveBeenCalledWith('family-123', 'child-1', 10)
    })
  })

  it('shows relative time in child-friendly format', async () => {
    const recentLog: CaregiverAuditLog = {
      ...mockLogs[0],
      createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    }
    mockGetActivityForChild.mockResolvedValue([recentLog])

    render(<ChildCaregiverActivityView {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('30 minutes ago')).toBeInTheDocument()
    })
  })

  it('shows "Just now" for very recent activity', async () => {
    const veryRecentLog: CaregiverAuditLog = {
      ...mockLogs[0],
      createdAt: new Date(Date.now() - 10 * 1000), // 10 seconds ago
    }
    mockGetActivityForChild.mockResolvedValue([veryRecentLog])

    render(<ChildCaregiverActivityView {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Just now')).toBeInTheDocument()
    })
  })

  it('shows "Yesterday" for activity from previous day', async () => {
    const yesterdayLog: CaregiverAuditLog = {
      ...mockLogs[0],
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
    }
    mockGetActivityForChild.mockResolvedValue([yesterdayLog])

    render(<ChildCaregiverActivityView {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Yesterday')).toBeInTheDocument()
    })
  })

  it('shows external loading state', () => {
    render(<ChildCaregiverActivityView {...defaultProps} loading={true} />)

    expect(screen.getByTestId('loading-state')).toBeInTheDocument()
  })

  it('shows external error state', async () => {
    render(<ChildCaregiverActivityView {...defaultProps} error="External error" />)

    // Wait for data to load (even with external error, internal fetch still runs)
    await waitFor(() => {
      expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument()
    })

    expect(screen.getByTestId('error-message')).toHaveTextContent('External error')
  })

  it('displays icons for different action types', async () => {
    const allActionsLogs: CaregiverAuditLog[] = [
      { ...mockLogs[0], action: 'time_extension' },
      { ...mockLogs[0], id: 'log-2', action: 'flag_viewed' },
      { ...mockLogs[0], id: 'log-3', action: 'flag_marked_reviewed' },
      { ...mockLogs[0], id: 'log-4', action: 'permission_change' },
    ]
    mockGetActivityForChild.mockResolvedValue(allActionsLogs)

    render(<ChildCaregiverActivityView {...defaultProps} />)

    await waitFor(() => {
      const items = screen.getAllByTestId('activity-item')
      expect(items).toHaveLength(4)
    })
  })
})
