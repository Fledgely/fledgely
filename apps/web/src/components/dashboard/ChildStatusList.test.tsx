/**
 * ChildStatusList Component Tests - Story 19A.2
 *
 * Tests for the Per-Child Status List container component.
 * Covers acceptance criteria:
 * - AC1: Each child shown as a row with status indicator
 * - AC4: Children ordered by status severity
 * - AC5: All children fit on one screen without scrolling (compact layout)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChildStatusList } from './ChildStatusList'
import * as useChildStatusModule from '../../hooks/useChildStatus'
import * as useDevicesModule from '../../hooks/useDevices'

// Mock the hooks
vi.mock('../../hooks/useChildStatus')
vi.mock('../../hooks/useDevices', async () => {
  const actual = await vi.importActual<typeof useDevicesModule>('../../hooks/useDevices')
  return {
    ...actual,
    formatLastSeen: vi.fn((date) => {
      if (!date) return 'Never synced'
      return '5 min ago'
    }),
  }
})

const mockUseChildStatus = vi.mocked(useChildStatusModule.useChildStatus)

describe('ChildStatusList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading state', () => {
    it('should show loading skeleton when loading', () => {
      mockUseChildStatus.mockReturnValue({
        childStatuses: [],
        loading: true,
        error: null,
      })

      render(<ChildStatusList familyId="family-123" />)

      expect(screen.getByTestId('child-status-loading')).toBeInTheDocument()
    })
  })

  describe('Error state', () => {
    it('should show error message when error occurs', () => {
      mockUseChildStatus.mockReturnValue({
        childStatuses: [],
        loading: false,
        error: 'Failed to load children',
      })

      render(<ChildStatusList familyId="family-123" />)

      expect(screen.getByTestId('child-status-error')).toBeInTheDocument()
      expect(screen.getByText('Failed to load children')).toBeInTheDocument()
    })
  })

  describe('Empty state', () => {
    it('should show empty state when no children', () => {
      mockUseChildStatus.mockReturnValue({
        childStatuses: [],
        loading: false,
        error: null,
      })

      render(<ChildStatusList familyId="family-123" />)

      expect(screen.getByTestId('child-status-empty')).toBeInTheDocument()
      expect(screen.getByText('No children in this family yet')).toBeInTheDocument()
    })
  })

  describe('AC1: Child rows displayed', () => {
    it('should render a row for each child', () => {
      mockUseChildStatus.mockReturnValue({
        childStatuses: [
          {
            childId: 'child-1',
            childName: 'Emma',
            photoURL: null,
            status: 'good',
            deviceCount: 2,
            activeDeviceCount: 2,
            lastActivity: new Date(),
            devices: [],
            issues: [],
          },
          {
            childId: 'child-2',
            childName: 'Liam',
            photoURL: null,
            status: 'attention',
            deviceCount: 1,
            activeDeviceCount: 1,
            lastActivity: new Date(),
            devices: [],
            issues: [],
          },
        ],
        loading: false,
        error: null,
      })

      render(<ChildStatusList familyId="family-123" />)

      expect(screen.getByTestId('child-status-list')).toBeInTheDocument()
      expect(screen.getByTestId('child-status-row-child-1')).toBeInTheDocument()
      expect(screen.getByTestId('child-status-row-child-2')).toBeInTheDocument()
      expect(screen.getByText('Emma')).toBeInTheDocument()
      expect(screen.getByText('Liam')).toBeInTheDocument()
    })
  })

  describe('AC4: Children ordered by severity', () => {
    it('should display children in order provided by hook (sorted by severity)', () => {
      // The hook already sorts by severity, so we verify the order is preserved
      mockUseChildStatus.mockReturnValue({
        childStatuses: [
          {
            childId: 'child-2',
            childName: 'Liam',
            photoURL: null,
            status: 'action', // Most severe first
            deviceCount: 1,
            activeDeviceCount: 0,
            lastActivity: new Date(),
            devices: [],
            issues: [],
          },
          {
            childId: 'child-3',
            childName: 'Olivia',
            photoURL: null,
            status: 'attention',
            deviceCount: 1,
            activeDeviceCount: 1,
            lastActivity: new Date(),
            devices: [],
            issues: [],
          },
          {
            childId: 'child-1',
            childName: 'Emma',
            photoURL: null,
            status: 'good',
            deviceCount: 2,
            activeDeviceCount: 2,
            lastActivity: new Date(),
            devices: [],
            issues: [],
          },
        ],
        loading: false,
        error: null,
      })

      render(<ChildStatusList familyId="family-123" />)

      const list = screen.getByTestId('child-status-list')
      const items = list.querySelectorAll('[role="listitem"]')

      expect(items).toHaveLength(3)
      // Verify order by checking the text content order
      expect(items[0]).toHaveTextContent('Liam')
      expect(items[1]).toHaveTextContent('Olivia')
      expect(items[2]).toHaveTextContent('Emma')
    })
  })

  describe('AC5: Compact layout', () => {
    it('should render up to 6 children without scrolling indication', () => {
      const children = Array.from({ length: 6 }, (_, i) => ({
        childId: `child-${i + 1}`,
        childName: `Child ${i + 1}`,
        photoURL: null,
        status: 'good' as const,
        deviceCount: 1,
        activeDeviceCount: 1,
        lastActivity: new Date(),
        devices: [],
        issues: [],
      }))

      mockUseChildStatus.mockReturnValue({
        childStatuses: children,
        loading: false,
        error: null,
      })

      render(<ChildStatusList familyId="family-123" />)

      const list = screen.getByTestId('child-status-list')
      const items = list.querySelectorAll('[role="listitem"]')

      expect(items).toHaveLength(6)
    })
  })

  describe('Accessibility', () => {
    it('should have proper list role and label', () => {
      mockUseChildStatus.mockReturnValue({
        childStatuses: [
          {
            childId: 'child-1',
            childName: 'Emma',
            photoURL: null,
            status: 'good',
            deviceCount: 1,
            activeDeviceCount: 1,
            lastActivity: new Date(),
            devices: [],
            issues: [],
          },
        ],
        loading: false,
        error: null,
      })

      render(<ChildStatusList familyId="family-123" />)

      const list = screen.getByRole('list')
      expect(list).toHaveAttribute('aria-label', 'Children status list')
    })

    it('should wrap each row in a listitem role', () => {
      mockUseChildStatus.mockReturnValue({
        childStatuses: [
          {
            childId: 'child-1',
            childName: 'Emma',
            photoURL: null,
            status: 'good',
            deviceCount: 1,
            activeDeviceCount: 1,
            lastActivity: new Date(),
            devices: [],
            issues: [],
          },
        ],
        loading: false,
        error: null,
      })

      render(<ChildStatusList familyId="family-123" />)

      const listItems = screen.getAllByRole('listitem')
      expect(listItems).toHaveLength(1)
    })
  })
})
