/**
 * FamilyStatusCard Component Tests - Story 19A.1 & 19A.2
 *
 * Tests for the Family Status Summary Card component.
 * Covers all acceptance criteria:
 * - AC1: Status card visibility
 * - AC2: Green "All Good" state
 * - AC3: Yellow "Needs Attention" state
 * - AC4: Red "Action Required" state
 * - AC5: Last update timestamp
 * - AC6: Tap to expand details (now shows ChildStatusList)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FamilyStatusCard } from './FamilyStatusCard'
import * as useFamilyStatusModule from '../../hooks/useFamilyStatus'
import * as useDevicesModule from '../../hooks/useDevices'
import * as useChildStatusModule from '../../hooks/useChildStatus'

// Mock the hooks
vi.mock('../../hooks/useFamilyStatus')
vi.mock('../../hooks/useChildStatus')
vi.mock('../../hooks/useDevices', async () => {
  const actual = await vi.importActual<typeof useDevicesModule>('../../hooks/useDevices')
  return {
    ...actual,
    formatLastSeen: vi.fn((date) => {
      if (!date) return 'Never synced'
      return '2 min ago'
    }),
  }
})

const mockUseFamilyStatus = vi.mocked(useFamilyStatusModule.useFamilyStatus)
const mockUseChildStatus = vi.mocked(useChildStatusModule.useChildStatus)

describe('FamilyStatusCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock for useChildStatus (used by ChildStatusList in expanded view)
    mockUseChildStatus.mockReturnValue({
      childStatuses: [],
      loading: false,
      error: null,
    })
  })

  describe('AC1: Status card visibility', () => {
    it('should render a prominent status card', () => {
      mockUseFamilyStatus.mockReturnValue({
        status: 'good',
        message: 'All Good',
        childCount: 2,
        deviceCount: 3,
        activeDeviceCount: 3,
        issues: [],
        lastUpdated: new Date(),
        loading: false,
        error: null,
      })

      render(<FamilyStatusCard familyId="family-123" />)

      const card = screen.getByTestId('family-status-card')
      expect(card).toBeInTheDocument()
      expect(card).toHaveAttribute('role', 'button')
    })

    it('should show loading skeleton when loading', () => {
      mockUseFamilyStatus.mockReturnValue({
        status: 'good',
        message: 'All Good',
        childCount: 0,
        deviceCount: 0,
        activeDeviceCount: 0,
        issues: [],
        lastUpdated: new Date(),
        loading: true,
        error: null,
      })

      render(<FamilyStatusCard familyId="family-123" />)

      expect(screen.getByTestId('family-status-loading')).toBeInTheDocument()
    })

    it('should show error state when error occurs', () => {
      mockUseFamilyStatus.mockReturnValue({
        status: 'good',
        message: 'All Good',
        childCount: 0,
        deviceCount: 0,
        activeDeviceCount: 0,
        issues: [],
        lastUpdated: new Date(),
        loading: false,
        error: 'Failed to load devices',
      })

      render(<FamilyStatusCard familyId="family-123" />)

      expect(screen.getByTestId('family-status-error')).toBeInTheDocument()
      expect(screen.getByText('Failed to load devices')).toBeInTheDocument()
    })
  })

  describe('AC2: Green "All Good" state', () => {
    it('should display green status when all devices healthy', () => {
      mockUseFamilyStatus.mockReturnValue({
        status: 'good',
        message: 'All Good',
        childCount: 2,
        deviceCount: 3,
        activeDeviceCount: 3,
        issues: [],
        lastUpdated: new Date(),
        loading: false,
        error: null,
      })

      render(<FamilyStatusCard familyId="family-123" />)

      expect(screen.getByTestId('status-message')).toHaveTextContent('All Good')
    })

    it('should show child and device counts', () => {
      mockUseFamilyStatus.mockReturnValue({
        status: 'good',
        message: 'All Good',
        childCount: 2,
        deviceCount: 3,
        activeDeviceCount: 3,
        issues: [],
        lastUpdated: new Date(),
        loading: false,
        error: null,
      })

      render(<FamilyStatusCard familyId="family-123" />)

      const stats = screen.getByTestId('status-stats')
      expect(stats).toHaveTextContent('2 children')
      expect(stats).toHaveTextContent('3 devices')
    })

    it('should use singular form for 1 child', () => {
      mockUseFamilyStatus.mockReturnValue({
        status: 'good',
        message: 'All Good',
        childCount: 1,
        deviceCount: 1,
        activeDeviceCount: 1,
        issues: [],
        lastUpdated: new Date(),
        loading: false,
        error: null,
      })

      render(<FamilyStatusCard familyId="family-123" />)

      const stats = screen.getByTestId('status-stats')
      expect(stats).toHaveTextContent('1 child')
      expect(stats).toHaveTextContent('1 device')
    })

    it('should display active device count when devices exist', () => {
      mockUseFamilyStatus.mockReturnValue({
        status: 'good',
        message: 'All Good',
        childCount: 2,
        deviceCount: 5,
        activeDeviceCount: 3,
        issues: [],
        lastUpdated: new Date(),
        loading: false,
        error: null,
      })

      render(<FamilyStatusCard familyId="family-123" />)

      const stats = screen.getByTestId('status-stats')
      expect(stats).toHaveTextContent('5 devices')
      expect(stats).toHaveTextContent('3 active')
    })
  })

  describe('AC3: Yellow "Needs Attention" state', () => {
    it('should display yellow status with sync delay', () => {
      mockUseFamilyStatus.mockReturnValue({
        status: 'attention',
        message: 'Chromebook last synced 2 hours ago',
        childCount: 1,
        deviceCount: 1,
        activeDeviceCount: 1,
        issues: [
          {
            deviceId: 'dev-1',
            deviceName: 'Chromebook',
            childId: 'child-1',
            type: 'warning',
            message: 'Chromebook last synced 2 hours ago',
          },
        ],
        lastUpdated: new Date(),
        loading: false,
        error: null,
      })

      render(<FamilyStatusCard familyId="family-123" />)

      expect(screen.getByTestId('status-message')).toHaveTextContent(
        'Chromebook last synced 2 hours ago'
      )
    })

    it('should display yellow status with low battery', () => {
      mockUseFamilyStatus.mockReturnValue({
        status: 'attention',
        message: 'Tablet battery low (15%)',
        childCount: 1,
        deviceCount: 1,
        activeDeviceCount: 1,
        issues: [
          {
            deviceId: 'dev-1',
            deviceName: 'Tablet',
            childId: 'child-1',
            type: 'warning',
            message: 'Tablet battery low (15%)',
          },
        ],
        lastUpdated: new Date(),
        loading: false,
        error: null,
      })

      render(<FamilyStatusCard familyId="family-123" />)

      expect(screen.getByTestId('status-message')).toHaveTextContent('Tablet battery low (15%)')
    })

    it('should show multiple issues count when many warnings', () => {
      mockUseFamilyStatus.mockReturnValue({
        status: 'attention',
        message: '3 items need attention',
        childCount: 1,
        deviceCount: 3,
        activeDeviceCount: 3,
        issues: [
          {
            deviceId: 'dev-1',
            deviceName: 'Chromebook',
            childId: 'child-1',
            type: 'warning',
            message: 'Issue 1',
          },
          {
            deviceId: 'dev-2',
            deviceName: 'Tablet',
            childId: 'child-1',
            type: 'warning',
            message: 'Issue 2',
          },
          {
            deviceId: 'dev-3',
            deviceName: 'Phone',
            childId: 'child-1',
            type: 'warning',
            message: 'Issue 3',
          },
        ],
        lastUpdated: new Date(),
        loading: false,
        error: null,
      })

      render(<FamilyStatusCard familyId="family-123" />)

      expect(screen.getByTestId('status-message')).toHaveTextContent('3 items need attention')
    })
  })

  describe('AC4: Red "Action Required" state', () => {
    it('should display red status when device offline > 24h', () => {
      mockUseFamilyStatus.mockReturnValue({
        status: 'action',
        message: 'Chromebook offline for 48 hours',
        childCount: 1,
        deviceCount: 1,
        activeDeviceCount: 0,
        issues: [
          {
            deviceId: 'dev-1',
            deviceName: 'Chromebook',
            childId: 'child-1',
            type: 'critical',
            message: 'Chromebook offline for 48 hours',
          },
        ],
        lastUpdated: new Date(),
        loading: false,
        error: null,
      })

      render(<FamilyStatusCard familyId="family-123" />)

      expect(screen.getByTestId('status-message')).toHaveTextContent(
        'Chromebook offline for 48 hours'
      )
    })

    it('should display red status when monitoring stopped', () => {
      mockUseFamilyStatus.mockReturnValue({
        status: 'action',
        message: 'Monitoring stopped on Tablet',
        childCount: 1,
        deviceCount: 1,
        activeDeviceCount: 0,
        issues: [
          {
            deviceId: 'dev-1',
            deviceName: 'Tablet',
            childId: 'child-1',
            type: 'critical',
            message: 'Monitoring stopped on Tablet',
          },
        ],
        lastUpdated: new Date(),
        loading: false,
        error: null,
      })

      render(<FamilyStatusCard familyId="family-123" />)

      expect(screen.getByTestId('status-message')).toHaveTextContent('Monitoring stopped on Tablet')
    })

    it('should show multiple critical issues count', () => {
      mockUseFamilyStatus.mockReturnValue({
        status: 'action',
        message: '2 critical issues',
        childCount: 1,
        deviceCount: 2,
        activeDeviceCount: 0,
        issues: [
          {
            deviceId: 'dev-1',
            deviceName: 'Chromebook',
            childId: 'child-1',
            type: 'critical',
            message: 'Issue 1',
          },
          {
            deviceId: 'dev-2',
            deviceName: 'Tablet',
            childId: 'child-1',
            type: 'critical',
            message: 'Issue 2',
          },
        ],
        lastUpdated: new Date(),
        loading: false,
        error: null,
      })

      render(<FamilyStatusCard familyId="family-123" />)

      expect(screen.getByTestId('status-message')).toHaveTextContent('2 critical issues')
    })
  })

  describe('AC5: Last update timestamp', () => {
    it('should display timestamp', () => {
      mockUseFamilyStatus.mockReturnValue({
        status: 'good',
        message: 'All Good',
        childCount: 1,
        deviceCount: 1,
        activeDeviceCount: 1,
        issues: [],
        lastUpdated: new Date(),
        loading: false,
        error: null,
      })

      render(<FamilyStatusCard familyId="family-123" />)

      const timestamp = screen.getByTestId('status-timestamp')
      expect(timestamp).toHaveTextContent('Updated 2 min ago')
    })
  })

  describe('AC6: Tap to expand details', () => {
    it('should expand on click to show child status list', () => {
      mockUseFamilyStatus.mockReturnValue({
        status: 'attention',
        message: '2 items need attention',
        childCount: 1,
        deviceCount: 2,
        activeDeviceCount: 2,
        issues: [],
        lastUpdated: new Date(),
        loading: false,
        error: null,
      })

      // Mock child status for expanded view
      mockUseChildStatus.mockReturnValue({
        childStatuses: [
          {
            childId: 'child-1',
            childName: 'Emma',
            photoURL: null,
            status: 'attention',
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

      render(<FamilyStatusCard familyId="family-123" />)

      const card = screen.getByTestId('family-status-card')

      // Initially not expanded
      expect(card).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByTestId('status-details')).not.toBeInTheDocument()

      // Click to expand
      fireEvent.click(card)

      expect(card).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByTestId('status-details')).toBeInTheDocument()
      // Now shows ChildStatusList instead of issue messages
      expect(screen.getByTestId('child-status-list')).toBeInTheDocument()
      expect(screen.getByText('Emma')).toBeInTheDocument()
    })

    it('should collapse on second click', () => {
      mockUseFamilyStatus.mockReturnValue({
        status: 'attention',
        message: '1 item needs attention',
        childCount: 1,
        deviceCount: 1,
        activeDeviceCount: 1,
        issues: [],
        lastUpdated: new Date(),
        loading: false,
        error: null,
      })

      render(<FamilyStatusCard familyId="family-123" />)

      const card = screen.getByTestId('family-status-card')

      // Expand
      fireEvent.click(card)
      expect(card).toHaveAttribute('aria-expanded', 'true')

      // Collapse
      fireEvent.click(card)
      expect(card).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByTestId('status-details')).not.toBeInTheDocument()
    })

    it('should be keyboard accessible with Enter', () => {
      mockUseFamilyStatus.mockReturnValue({
        status: 'good',
        message: 'All Good',
        childCount: 1,
        deviceCount: 1,
        activeDeviceCount: 1,
        issues: [],
        lastUpdated: new Date(),
        loading: false,
        error: null,
      })

      render(<FamilyStatusCard familyId="family-123" />)

      const card = screen.getByTestId('family-status-card')

      // Should be focusable
      expect(card).toHaveAttribute('tabIndex', '0')

      // Expand with Enter
      fireEvent.keyDown(card, { key: 'Enter' })
      expect(card).toHaveAttribute('aria-expanded', 'true')
    })

    it('should be keyboard accessible with Space', () => {
      mockUseFamilyStatus.mockReturnValue({
        status: 'good',
        message: 'All Good',
        childCount: 1,
        deviceCount: 1,
        activeDeviceCount: 1,
        issues: [],
        lastUpdated: new Date(),
        loading: false,
        error: null,
      })

      render(<FamilyStatusCard familyId="family-123" />)

      const card = screen.getByTestId('family-status-card')

      // Expand with Space
      fireEvent.keyDown(card, { key: ' ' })
      expect(card).toHaveAttribute('aria-expanded', 'true')
    })

    it('should show child status list when expanded with healthy children', () => {
      mockUseFamilyStatus.mockReturnValue({
        status: 'good',
        message: 'All Good',
        childCount: 1,
        deviceCount: 1,
        activeDeviceCount: 1,
        issues: [],
        lastUpdated: new Date(),
        loading: false,
        error: null,
      })

      // Mock child status for expanded view
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

      render(<FamilyStatusCard familyId="family-123" />)

      const card = screen.getByTestId('family-status-card')
      fireEvent.click(card)

      // Now shows ChildStatusList with child rows
      expect(screen.getByTestId('child-status-list')).toBeInTheDocument()
      expect(screen.getByText('Emma')).toBeInTheDocument()
    })

    it('should show empty state when no children', () => {
      mockUseFamilyStatus.mockReturnValue({
        status: 'good',
        message: 'Ready to enroll devices',
        childCount: 0,
        deviceCount: 0,
        activeDeviceCount: 0,
        issues: [],
        lastUpdated: new Date(),
        loading: false,
        error: null,
      })

      // Mock empty child status
      mockUseChildStatus.mockReturnValue({
        childStatuses: [],
        loading: false,
        error: null,
      })

      render(<FamilyStatusCard familyId="family-123" />)

      const card = screen.getByTestId('family-status-card')
      fireEvent.click(card)

      expect(screen.getByTestId('child-status-empty')).toBeInTheDocument()
    })
  })

  describe('Edge cases', () => {
    it('should show "Ready to enroll" when no devices', () => {
      mockUseFamilyStatus.mockReturnValue({
        status: 'good',
        message: 'Ready to enroll devices',
        childCount: 1,
        deviceCount: 0,
        activeDeviceCount: 0,
        issues: [],
        lastUpdated: new Date(),
        loading: false,
        error: null,
      })

      render(<FamilyStatusCard familyId="family-123" />)

      expect(screen.getByTestId('status-message')).toHaveTextContent('Ready to enroll devices')
    })

    it('should have proper ARIA label for screen readers', () => {
      mockUseFamilyStatus.mockReturnValue({
        status: 'good',
        message: 'All Good',
        childCount: 2,
        deviceCount: 3,
        activeDeviceCount: 3,
        issues: [],
        lastUpdated: new Date(),
        loading: false,
        error: null,
      })

      render(<FamilyStatusCard familyId="family-123" />)

      const card = screen.getByTestId('family-status-card')
      expect(card.getAttribute('aria-label')).toContain('Family status: All Good')
      expect(card.getAttribute('aria-label')).toContain('2 children')
      expect(card.getAttribute('aria-label')).toContain('3 devices')
    })
  })
})
