/**
 * FlagQueue Component Tests - Story 22.1
 *
 * Tests for the FlagQueue component.
 * Covers acceptance criteria:
 * - AC1: Pending flags shown in priority order (severity, then date)
 * - AC3: Flag count badge visible
 * - AC4: Filters available by child, category, severity
 * - AC5: Reviewed flags in separate History section
 * - AC6: Real-time updates
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FlagQueue } from './FlagQueue'
import type { FlagDocument } from '@fledgely/shared'

// Mock the flag service
vi.mock('../../services/flagService', () => ({
  subscribeToPendingFlags: vi.fn(),
  getFlagsForChildren: vi.fn(),
  applyClientFilters: vi.fn((flags) => flags),
}))

import * as flagServiceModule from '../../services/flagService'

const mockSubscribeToPendingFlags = vi.mocked(flagServiceModule.subscribeToPendingFlags)
const mockGetFlagsForChildren = vi.mocked(flagServiceModule.getFlagsForChildren)
const mockApplyClientFilters = vi.mocked(flagServiceModule.applyClientFilters)

// Helper to create mock flag documents
const createMockFlag = (overrides: Partial<FlagDocument> = {}): FlagDocument => ({
  id: `flag-${Math.random().toString(36).substr(2, 9)}`,
  screenshotId: 'screenshot-456',
  childId: 'child-1',
  familyId: 'family-abc',
  category: 'Violence',
  severity: 'high',
  confidence: 85,
  reasoning: 'Detected concerning content',
  status: 'pending',
  createdAt: Date.now() - 3600000,
  ...overrides,
})

describe('FlagQueue', () => {
  const mockChildren = [
    { id: 'child-1', name: 'Emma' },
    { id: 'child-2', name: 'Liam' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    mockSubscribeToPendingFlags.mockImplementation((childIds, callback) => {
      // Immediately call callback with empty array
      callback([])
      return vi.fn() // Return unsubscribe function
    })

    mockGetFlagsForChildren.mockResolvedValue([])
    mockApplyClientFilters.mockImplementation((flags) => flags)
  })

  describe('AC1: Pending flags display', () => {
    it('should subscribe to pending flags on mount', () => {
      render(<FlagQueue familyChildren={mockChildren} />)

      expect(mockSubscribeToPendingFlags).toHaveBeenCalledWith(
        ['child-1', 'child-2'],
        expect.any(Function)
      )
    })

    it('should display pending flags from subscription', async () => {
      const mockFlags = [
        createMockFlag({ id: 'flag-1', childId: 'child-1' }),
        createMockFlag({ id: 'flag-2', childId: 'child-2' }),
      ]

      mockSubscribeToPendingFlags.mockImplementation((childIds, callback) => {
        callback(mockFlags)
        return vi.fn()
      })

      render(<FlagQueue familyChildren={mockChildren} />)

      await waitFor(() => {
        expect(screen.getByTestId('flag-card-flag-1')).toBeInTheDocument()
        expect(screen.getByTestId('flag-card-flag-2')).toBeInTheDocument()
      })
    })

    it('should show loading state initially', () => {
      mockSubscribeToPendingFlags.mockImplementation(() => {
        // Don't call callback - simulate loading
        return vi.fn()
      })

      render(<FlagQueue familyChildren={mockChildren} />)

      expect(screen.getByTestId('loading')).toBeInTheDocument()
    })

    it('should show empty state when no pending flags', async () => {
      mockSubscribeToPendingFlags.mockImplementation((childIds, callback) => {
        callback([])
        return vi.fn()
      })

      render(<FlagQueue familyChildren={mockChildren} />)

      await waitFor(() => {
        expect(screen.getByTestId('empty-state')).toBeInTheDocument()
        expect(screen.getByText('No pending flags')).toBeInTheDocument()
      })
    })
  })

  describe('AC3: Flag count badge', () => {
    it('should display pending count badge', async () => {
      const mockFlags = [
        createMockFlag({ id: 'flag-1' }),
        createMockFlag({ id: 'flag-2' }),
        createMockFlag({ id: 'flag-3' }),
      ]

      mockSubscribeToPendingFlags.mockImplementation((childIds, callback) => {
        callback(mockFlags)
        return vi.fn()
      })

      render(<FlagQueue familyChildren={mockChildren} />)

      await waitFor(() => {
        const badge = screen.getByTestId('pending-count-badge')
        expect(badge).toHaveTextContent('3')
      })
    })

    it('should update badge count in real-time', async () => {
      let subscriptionCallback: ((flags: FlagDocument[]) => void) | null = null

      mockSubscribeToPendingFlags.mockImplementation((childIds, callback) => {
        subscriptionCallback = callback
        callback([createMockFlag({ id: 'flag-1' })])
        return vi.fn()
      })

      render(<FlagQueue familyChildren={mockChildren} />)

      await waitFor(() => {
        expect(screen.getByTestId('pending-count-badge')).toHaveTextContent('1')
      })

      // Simulate new flag arriving
      if (subscriptionCallback) {
        subscriptionCallback([createMockFlag({ id: 'flag-1' }), createMockFlag({ id: 'flag-2' })])
      }

      await waitFor(() => {
        expect(screen.getByTestId('pending-count-badge')).toHaveTextContent('2')
      })
    })

    it('should show green badge when count is zero', async () => {
      mockSubscribeToPendingFlags.mockImplementation((childIds, callback) => {
        callback([])
        return vi.fn()
      })

      render(<FlagQueue familyChildren={mockChildren} />)

      await waitFor(() => {
        const badge = screen.getByTestId('pending-count-badge')
        expect(badge).toHaveTextContent('0')
        // Badge should have green background color for zero count
        expect(badge).toHaveStyle({ backgroundColor: '#16a34a' })
      })
    })
  })

  describe('AC4: Filters', () => {
    it('should render filter controls', () => {
      mockSubscribeToPendingFlags.mockImplementation((childIds, callback) => {
        callback([])
        return vi.fn()
      })

      render(<FlagQueue familyChildren={mockChildren} />)

      expect(screen.getByTestId('flag-filters')).toBeInTheDocument()
      expect(screen.getByTestId('filter-child')).toBeInTheDocument()
      expect(screen.getByTestId('filter-category')).toBeInTheDocument()
      expect(screen.getByTestId('filter-severity')).toBeInTheDocument()
    })

    it('should apply filters to pending flags', async () => {
      const mockFlags = [
        createMockFlag({ id: 'flag-1', childId: 'child-1' }),
        createMockFlag({ id: 'flag-2', childId: 'child-2' }),
      ]

      mockSubscribeToPendingFlags.mockImplementation((childIds, callback) => {
        callback(mockFlags)
        return vi.fn()
      })

      // Filter to only show child-1 flags
      mockApplyClientFilters.mockImplementation((flags, filters) => {
        if (filters?.childIds?.includes('child-1')) {
          return flags.filter((f) => f.childId === 'child-1')
        }
        return flags
      })

      render(<FlagQueue familyChildren={mockChildren} />)

      await waitFor(() => {
        expect(screen.getByTestId('flag-list')).toBeInTheDocument()
      })

      // Change child filter
      const childFilter = screen.getByTestId('filter-child')
      fireEvent.change(childFilter, { target: { value: 'child-1' } })

      await waitFor(() => {
        expect(mockApplyClientFilters).toHaveBeenCalledWith(
          mockFlags,
          expect.objectContaining({ childIds: ['child-1'] })
        )
      })
    })
  })

  describe('AC5: History section', () => {
    it('should show Pending and History tabs', () => {
      mockSubscribeToPendingFlags.mockImplementation((childIds, callback) => {
        callback([])
        return vi.fn()
      })

      render(<FlagQueue familyChildren={mockChildren} />)

      expect(screen.getByTestId('tab-pending')).toBeInTheDocument()
      expect(screen.getByTestId('tab-history')).toBeInTheDocument()
    })

    it('should show Pending tab as active by default', () => {
      mockSubscribeToPendingFlags.mockImplementation((childIds, callback) => {
        callback([])
        return vi.fn()
      })

      render(<FlagQueue familyChildren={mockChildren} />)

      const pendingTab = screen.getByTestId('tab-pending')
      expect(pendingTab).toHaveAttribute('aria-selected', 'true')
    })

    it('should switch to History tab when clicked', async () => {
      mockSubscribeToPendingFlags.mockImplementation((childIds, callback) => {
        callback([])
        return vi.fn()
      })

      render(<FlagQueue familyChildren={mockChildren} />)

      const historyTab = screen.getByTestId('tab-history')
      fireEvent.click(historyTab)

      await waitFor(() => {
        expect(historyTab).toHaveAttribute('aria-selected', 'true')
        expect(screen.getByTestId('tab-pending')).toHaveAttribute('aria-selected', 'false')
      })
    })

    it('should fetch reviewed/dismissed flags for history', async () => {
      mockSubscribeToPendingFlags.mockImplementation((childIds, callback) => {
        callback([])
        return vi.fn()
      })

      render(<FlagQueue familyChildren={mockChildren} />)

      await waitFor(() => {
        expect(mockGetFlagsForChildren).toHaveBeenCalledWith(['child-1', 'child-2'], {
          status: 'reviewed',
        })
        expect(mockGetFlagsForChildren).toHaveBeenCalledWith(['child-1', 'child-2'], {
          status: 'dismissed',
        })
      })
    })

    it('should display history flags when History tab is selected', async () => {
      const historyFlags = [
        createMockFlag({ id: 'flag-reviewed', status: 'reviewed' }),
        createMockFlag({ id: 'flag-dismissed', status: 'dismissed' }),
      ]

      mockSubscribeToPendingFlags.mockImplementation((childIds, callback) => {
        callback([])
        return vi.fn()
      })

      mockGetFlagsForChildren.mockImplementation((childIds, options) => {
        if (options?.status === 'reviewed') {
          return Promise.resolve([historyFlags[0]])
        }
        if (options?.status === 'dismissed') {
          return Promise.resolve([historyFlags[1]])
        }
        return Promise.resolve([])
      })

      render(<FlagQueue familyChildren={mockChildren} />)

      // Switch to History tab
      const historyTab = screen.getByTestId('tab-history')
      fireEvent.click(historyTab)

      await waitFor(() => {
        expect(screen.getByTestId('flag-card-flag-reviewed')).toBeInTheDocument()
        expect(screen.getByTestId('flag-card-flag-dismissed')).toBeInTheDocument()
      })
    })
  })

  describe('AC6: Real-time updates', () => {
    it('should unsubscribe when component unmounts', () => {
      const unsubscribe = vi.fn()
      mockSubscribeToPendingFlags.mockImplementation((childIds, callback) => {
        callback([])
        return unsubscribe
      })

      const { unmount } = render(<FlagQueue familyChildren={mockChildren} />)

      unmount()

      expect(unsubscribe).toHaveBeenCalled()
    })

    it('should re-subscribe when childIds change', () => {
      mockSubscribeToPendingFlags.mockImplementation((childIds, callback) => {
        callback([])
        return vi.fn()
      })

      const { rerender } = render(<FlagQueue familyChildren={mockChildren} />)

      expect(mockSubscribeToPendingFlags).toHaveBeenCalledTimes(1)

      // Add a new child
      const updatedChildren = [...mockChildren, { id: 'child-3', name: 'Noah' }]
      rerender(<FlagQueue familyChildren={updatedChildren} />)

      expect(mockSubscribeToPendingFlags).toHaveBeenCalledTimes(2)
    })
  })

  describe('Flag click handling', () => {
    it('should call onFlagClick when a flag is clicked', async () => {
      const onFlagClick = vi.fn()
      const mockFlag = createMockFlag({ id: 'flag-1', childId: 'child-1' })

      mockSubscribeToPendingFlags.mockImplementation((childIds, callback) => {
        callback([mockFlag])
        return vi.fn()
      })

      render(<FlagQueue familyChildren={mockChildren} onFlagClick={onFlagClick} />)

      await waitFor(() => {
        expect(screen.getByTestId('flag-card-flag-1')).toBeInTheDocument()
      })

      const flagCard = screen.getByTestId('flag-card-flag-1')
      fireEvent.click(flagCard)

      expect(onFlagClick).toHaveBeenCalledWith(mockFlag)
    })
  })

  describe('Empty children array', () => {
    it('should not subscribe when no children provided', () => {
      render(<FlagQueue familyChildren={[]} />)

      expect(mockSubscribeToPendingFlags).not.toHaveBeenCalled()
    })

    it('should show empty state when no children', () => {
      render(<FlagQueue familyChildren={[]} />)

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })
  })
})
