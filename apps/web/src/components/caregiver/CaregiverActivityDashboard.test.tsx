/**
 * Tests for CaregiverActivityDashboard Component
 *
 * Story 39.6: Caregiver Action Logging - AC2, AC3, AC5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { CaregiverActivityDashboard } from './CaregiverActivityDashboard'
import type { CaregiverAuditLog, CaregiverActivitySummary } from '@fledgely/shared'

// Mock data
const mockSummaries: CaregiverActivitySummary[] = [
  {
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
  },
  {
    caregiverUid: 'caregiver-2',
    caregiverName: 'Grandpa',
    actionCounts: {
      time_extension: 1,
      flag_viewed: 0,
      flag_marked_reviewed: 0,
      permission_change: 0,
    },
    lastActiveAt: new Date(),
    totalActions: 1,
  },
]

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
]

// Mock functions
const mockGetCaregiverActivitySummaries = vi.fn()
const mockGetCaregiverActivity = vi.fn()
const mockSubscribeToActivity = vi.fn()

// Mock the service
vi.mock('../../services/caregiverActivityService', () => ({
  getCaregiverActivitySummaries: (...args: unknown[]) => mockGetCaregiverActivitySummaries(...args),
  getCaregiverActivity: (...args: unknown[]) => mockGetCaregiverActivity(...args),
  subscribeToActivity: (...args: unknown[]) => mockSubscribeToActivity(...args),
}))

// Mock child components
vi.mock('./CaregiverActivityRow', () => ({
  CaregiverActivityRow: ({ log }: { log: CaregiverAuditLog }) => (
    <div data-testid="activity-row" data-log-id={log.id}>
      Activity Row: {log.caregiverName}
    </div>
  ),
}))

vi.mock('./CaregiverSummaryCard', () => ({
  CaregiverSummaryCard: ({ summary }: { summary: CaregiverActivitySummary }) => (
    <div data-testid="summary-card" data-caregiver-uid={summary.caregiverUid}>
      Summary: {summary.caregiverName}
    </div>
  ),
}))

describe('CaregiverActivityDashboard', () => {
  const defaultProps = {
    familyId: 'family-123',
    caregiverNames: {
      'caregiver-1': 'Grandma',
      'caregiver-2': 'Grandpa',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCaregiverActivitySummaries.mockResolvedValue(mockSummaries)
    mockGetCaregiverActivity.mockResolvedValue(mockLogs)
    mockSubscribeToActivity.mockReturnValue(() => {})
  })

  it('shows loading state initially', () => {
    // Make the promises hang
    mockGetCaregiverActivitySummaries.mockReturnValue(new Promise(() => {}))
    mockGetCaregiverActivity.mockReturnValue(new Promise(() => {}))

    render(<CaregiverActivityDashboard {...defaultProps} />)

    expect(screen.getByTestId('loading-state')).toBeInTheDocument()
    expect(screen.getByText('Loading caregiver activity...')).toBeInTheDocument()
  })

  it('renders header with title', async () => {
    render(<CaregiverActivityDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Caregiver Activity')).toBeInTheDocument()
    })
  })

  it('displays total action count badge', async () => {
    render(<CaregiverActivityDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('total-count')).toHaveTextContent('4')
    })
  })

  it('renders summary cards for each caregiver', async () => {
    render(<CaregiverActivityDashboard {...defaultProps} />)

    await waitFor(() => {
      const summaryCards = screen.getAllByTestId('summary-card')
      expect(summaryCards).toHaveLength(2)
    })

    expect(screen.getByText('Summary: Grandma')).toBeInTheDocument()
    expect(screen.getByText('Summary: Grandpa')).toBeInTheDocument()
  })

  it('renders activity log rows', async () => {
    render(<CaregiverActivityDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('activity-log')).toBeInTheDocument()
    })

    expect(screen.getByText('Activity Row: Grandma')).toBeInTheDocument()
  })

  it('shows empty state when no activity', async () => {
    mockGetCaregiverActivitySummaries.mockResolvedValue([])
    mockGetCaregiverActivity.mockResolvedValue([])

    render(<CaregiverActivityDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })

    expect(screen.getByText('No caregiver activity yet')).toBeInTheDocument()
  })

  it('displays error state when fetch fails', async () => {
    mockGetCaregiverActivitySummaries.mockRejectedValue(new Error('Network error'))

    render(<CaregiverActivityDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument()
    })

    expect(screen.getByText('Network error')).toBeInTheDocument()
  })

  it('subscribes to real-time updates when enabled', async () => {
    render(<CaregiverActivityDashboard {...defaultProps} enableRealtime={true} />)

    await waitFor(() => {
      expect(mockSubscribeToActivity).toHaveBeenCalledWith('family-123', expect.any(Function), 20)
    })
  })

  it('does not subscribe when realtime is disabled', async () => {
    render(<CaregiverActivityDashboard {...defaultProps} enableRealtime={false} />)

    await waitFor(() => {
      expect(screen.getByTestId('summary-section')).toBeInTheDocument()
    })

    expect(mockSubscribeToActivity).not.toHaveBeenCalled()
  })

  it('unsubscribes on unmount', async () => {
    const unsubscribe = vi.fn()
    mockSubscribeToActivity.mockReturnValue(unsubscribe)

    const { unmount } = render(
      <CaregiverActivityDashboard {...defaultProps} enableRealtime={true} />
    )

    await waitFor(() => {
      expect(mockSubscribeToActivity).toHaveBeenCalled()
    })

    unmount()

    expect(unsubscribe).toHaveBeenCalled()
  })

  it('shows realtime badge when connected', async () => {
    // Simulate subscription callback
    mockSubscribeToActivity.mockImplementation((_familyId, callback) => {
      // Call the callback to simulate realtime connection
      setTimeout(() => callback(mockLogs), 0)
      return () => {}
    })

    render(<CaregiverActivityDashboard {...defaultProps} enableRealtime={true} />)

    await waitFor(() => {
      expect(screen.getByTestId('realtime-badge')).toBeInTheDocument()
    })

    expect(screen.getByText('Live')).toBeInTheDocument()
  })

  it('respects custom log limit', async () => {
    render(<CaregiverActivityDashboard {...defaultProps} logLimit={50} />)

    await waitFor(() => {
      expect(mockGetCaregiverActivity).toHaveBeenCalledWith(expect.objectContaining({ limit: 50 }))
    })
  })

  it('shows external loading state', () => {
    render(<CaregiverActivityDashboard {...defaultProps} loading={true} />)

    expect(screen.getByTestId('loading-state')).toBeInTheDocument()
  })

  it('shows external error state', async () => {
    render(<CaregiverActivityDashboard {...defaultProps} error="External error" />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument()
    })

    // Error is shown, which blocks summary section from rendering
    expect(screen.getByTestId('error-message')).toHaveTextContent('External error')
    expect(screen.queryByTestId('summary-section')).not.toBeInTheDocument()
  })

  // AC2: Filter controls tests
  describe('filter controls (AC2)', () => {
    it('renders filter section with dropdowns', async () => {
      render(<CaregiverActivityDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('filter-section')).toBeInTheDocument()
      })

      expect(screen.getByTestId('filter-caregiver')).toBeInTheDocument()
      expect(screen.getByTestId('filter-action')).toBeInTheDocument()
    })

    it('renders caregiver filter with all caregivers', async () => {
      render(<CaregiverActivityDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('filter-caregiver')).toBeInTheDocument()
      })

      const caregiverSelect = screen.getByTestId('filter-caregiver')
      expect(caregiverSelect).toHaveTextContent('All Caregivers')
      expect(caregiverSelect).toHaveTextContent('Grandma')
      expect(caregiverSelect).toHaveTextContent('Grandpa')
    })

    it('renders child filter when childrenList prop is provided', async () => {
      const childrenList = [
        { uid: 'child-1', name: 'Emma' },
        { uid: 'child-2', name: 'Liam' },
      ]

      render(<CaregiverActivityDashboard {...defaultProps} childrenList={childrenList} />)

      await waitFor(() => {
        expect(screen.getByTestId('filter-child')).toBeInTheDocument()
      })

      const childSelect = screen.getByTestId('filter-child')
      expect(childSelect).toHaveTextContent('All Children')
      expect(childSelect).toHaveTextContent('Emma')
      expect(childSelect).toHaveTextContent('Liam')
    })

    it('does not render child filter when no children prop', async () => {
      render(<CaregiverActivityDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('filter-section')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('filter-child')).not.toBeInTheDocument()
    })

    it('renders action type filter with all action types', async () => {
      render(<CaregiverActivityDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('filter-action')).toBeInTheDocument()
      })

      const actionSelect = screen.getByTestId('filter-action')
      expect(actionSelect).toHaveTextContent('All Actions')
      expect(actionSelect).toHaveTextContent('Time Extensions')
      expect(actionSelect).toHaveTextContent('Flags Viewed')
      expect(actionSelect).toHaveTextContent('Flags Reviewed')
      expect(actionSelect).toHaveTextContent('Permission Changes')
    })

    it('filters by caregiver when selected', async () => {
      render(<CaregiverActivityDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('filter-caregiver')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByTestId('filter-caregiver'), {
        target: { value: 'caregiver-1' },
      })

      await waitFor(() => {
        expect(mockGetCaregiverActivity).toHaveBeenCalledWith(
          expect.objectContaining({ caregiverUid: 'caregiver-1' })
        )
      })
    })

    it('filters by action type when selected', async () => {
      render(<CaregiverActivityDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('filter-action')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByTestId('filter-action'), {
        target: { value: 'time_extension' },
      })

      await waitFor(() => {
        expect(mockGetCaregiverActivity).toHaveBeenCalledWith(
          expect.objectContaining({ action: 'time_extension' })
        )
      })
    })

    it('shows clear filters button when filters active', async () => {
      render(<CaregiverActivityDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('filter-caregiver')).toBeInTheDocument()
      })

      // Initially no clear button
      expect(screen.queryByTestId('clear-filters')).not.toBeInTheDocument()

      // Select a filter
      fireEvent.change(screen.getByTestId('filter-caregiver'), {
        target: { value: 'caregiver-1' },
      })

      await waitFor(() => {
        expect(screen.getByTestId('clear-filters')).toBeInTheDocument()
      })
    })

    it('clears all filters when clear button clicked', async () => {
      render(<CaregiverActivityDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('filter-caregiver')).toBeInTheDocument()
      })

      // Set a filter
      fireEvent.change(screen.getByTestId('filter-caregiver'), {
        target: { value: 'caregiver-1' },
      })

      await waitFor(() => {
        expect(screen.getByTestId('clear-filters')).toBeInTheDocument()
      })

      // Clear filters
      fireEvent.click(screen.getByTestId('clear-filters'))

      await waitFor(() => {
        expect(screen.queryByTestId('clear-filters')).not.toBeInTheDocument()
      })

      // Verify filter is reset
      expect(screen.getByTestId('filter-caregiver')).toHaveValue('')
    })

    it('shows no results message when filters match nothing', async () => {
      mockGetCaregiverActivity.mockResolvedValue([])

      render(<CaregiverActivityDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('filter-action')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByTestId('filter-action'), {
        target: { value: 'permission_change' },
      })

      await waitFor(() => {
        expect(screen.getByTestId('no-results')).toBeInTheDocument()
      })

      expect(screen.getByText('No activity matches the current filters.')).toBeInTheDocument()
    })
  })
})
