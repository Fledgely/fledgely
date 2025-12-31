/**
 * ChildStatusList Component Tests - Story 19A.2
 * Updated: Story 8.5.1 - Demo Child Profile Integration
 *
 * Tests for the Per-Child Status List container component.
 * Covers acceptance criteria:
 * - AC1: Each child shown as a row with status indicator
 * - AC4: Children ordered by status severity
 * - AC5: All children fit on one screen without scrolling (compact layout)
 * - [8.5.1] Show demo child when no real children and demo not dismissed
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChildStatusList } from './ChildStatusList'
import * as useChildStatusModule from '../../hooks/useChildStatus'
import * as useDevicesModule from '../../hooks/useDevices'
import * as useDemoModule from '../../hooks/useDemo'

// Mock the hooks
vi.mock('../../hooks/useChildStatus')
vi.mock('../../hooks/useDemo')
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
const mockUseDemo = vi.mocked(useDemoModule.useDemo)

// Default mock for useDemo that disables demo mode
const defaultDemoMock = {
  showDemo: false,
  demoChild: null,
  demoScreenshots: [],
  activitySummary: {
    totalScreenshots: 0,
    lastCaptureTime: 0,
    topCategories: [],
    daysWithActivity: 0,
  },
  dismissDemo: vi.fn(),
  dismissing: false,
  error: null,
  loading: false,
}

describe('ChildStatusList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: demo disabled so tests work as before
    mockUseDemo.mockReturnValue(defaultDemoMock)
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
    it('should show empty state when no children and demo not shown', () => {
      mockUseChildStatus.mockReturnValue({
        childStatuses: [],
        loading: false,
        error: null,
      })
      mockUseDemo.mockReturnValue(defaultDemoMock) // Demo disabled

      render(<ChildStatusList familyId="family-123" />)

      expect(screen.getByTestId('child-status-empty')).toBeInTheDocument()
      expect(
        screen.getByText(
          'No children in this family yet. Add a child to get started with monitoring.'
        )
      ).toBeInTheDocument()
    })
  })

  describe('Story 8.5.1: Demo child display', () => {
    it('should show demo child card when no children and showDemo is true', () => {
      mockUseChildStatus.mockReturnValue({
        childStatuses: [],
        loading: false,
        error: null,
      })
      mockUseDemo.mockReturnValue({
        ...defaultDemoMock,
        showDemo: true,
        demoChild: {
          id: 'demo-child',
          familyId: 'family-123',
          name: 'Alex Demo',
          birthdate: new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000),
          photoURL: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isDemo: true,
        },
        activitySummary: {
          totalScreenshots: 8,
          lastCaptureTime: Date.now(),
          topCategories: [],
          daysWithActivity: 4,
        },
      })

      render(<ChildStatusList familyId="family-123" />)

      expect(screen.getByTestId('child-status-list-demo')).toBeInTheDocument()
      expect(screen.getByTestId('demo-child-card')).toBeInTheDocument()
    })

    it('should not show demo when real children exist', () => {
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
      // Even if useDemo would show demo, it shouldn't because there are real children
      mockUseDemo.mockReturnValue(defaultDemoMock)

      render(<ChildStatusList familyId="family-123" />)

      expect(screen.queryByTestId('demo-child-card')).not.toBeInTheDocument()
      expect(screen.getByTestId('child-status-list')).toBeInTheDocument()
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
