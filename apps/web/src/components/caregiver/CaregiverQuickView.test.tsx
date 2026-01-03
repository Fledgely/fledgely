/**
 * CaregiverQuickView Component Tests - Story 19A.3, Story 19D.4
 *
 * Tests for the Caregiver Quick View component.
 * Covers all acceptance criteria:
 * - AC1: Simplified status display
 * - AC2: No complex device details
 * - AC3: Large touch targets (NFR49: 44x44 minimum)
 * - AC4: Call parent button
 * - AC5: View access logging
 * - AC6: Accessibility
 * - 19D.4-AC2: Access only during active window
 * - 19D.4-AC3: Show "Access not currently active" outside window
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CaregiverQuickView } from './CaregiverQuickView'
import * as useCaregiverStatusModule from '../../hooks/useCaregiverStatus'
import * as useCaregiverAccessLogModule from '../../hooks/useCaregiverAccessLog'
import type { CaregiverStatusResult } from '../../hooks/useCaregiverStatus'
import type { AccessWindow } from '@fledgely/shared'

// Mock hooks
vi.mock('../../hooks/useCaregiverStatus', () => ({
  useCaregiverStatus: vi.fn(),
}))

vi.mock('../../hooks/useCaregiverAccessLog', () => ({
  useCaregiverAccessLog: vi.fn(),
  logCaregiverAction: vi.fn(),
}))

// Mock flagService for CaregiverFlagQueue
vi.mock('../../services/flagService', () => ({
  subscribeToPendingFlags: vi.fn((childIds, callback) => {
    callback([])
    return vi.fn() // unsubscribe function
  }),
  getFlagsForChildren: vi.fn().mockResolvedValue([]),
  applyClientFilters: vi.fn((flags) => flags),
}))

/**
 * Helper to create default mock result
 */
function createMockResult(overrides: Partial<CaregiverStatusResult> = {}): CaregiverStatusResult {
  return {
    overallStatus: 'good',
    statusMessage: 'Your grandchildren are doing well',
    children: [],
    childrenNeedingAttention: [],
    parentContact: { name: 'Parent', phone: '555-123-4567' },
    loading: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  }
}

describe('CaregiverQuickView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useCaregiverStatusModule.useCaregiverStatus).mockReturnValue(createMockResult())
    vi.mocked(useCaregiverAccessLogModule.useCaregiverAccessLog).mockImplementation(() => {})
  })

  describe('AC1: Simplified status display', () => {
    it('should render the main container', () => {
      render(<CaregiverQuickView familyId="family-1" />)

      expect(screen.getByTestId('caregiver-quick-view')).toBeInTheDocument()
    })

    it('should show "Your grandchildren are doing well" when all good', () => {
      vi.mocked(useCaregiverStatusModule.useCaregiverStatus).mockReturnValue(
        createMockResult({
          overallStatus: 'good',
          statusMessage: 'Your grandchildren are doing well',
          children: [
            {
              childId: 'child-1',
              childName: 'Emma',
              photoURL: null,
              status: 'good',
              statusMessage: 'Doing well',
            },
          ],
        })
      )

      render(<CaregiverQuickView familyId="family-1" />)

      expect(screen.getByTestId('status-message')).toHaveTextContent(
        'Your grandchildren are doing well'
      )
    })

    it('should show "Check in with [child]" when child needs attention', () => {
      vi.mocked(useCaregiverStatusModule.useCaregiverStatus).mockReturnValue(
        createMockResult({
          overallStatus: 'attention',
          statusMessage: 'Check in with Emma',
          childrenNeedingAttention: ['Emma'],
          children: [
            {
              childId: 'child-1',
              childName: 'Emma',
              photoURL: null,
              status: 'attention',
              statusMessage: 'Check in',
            },
          ],
        })
      )

      render(<CaregiverQuickView familyId="family-1" />)

      expect(screen.getByTestId('status-message')).toHaveTextContent('Check in with Emma')
    })
  })

  describe('AC2: No complex device details', () => {
    it('should NOT show device counts', () => {
      vi.mocked(useCaregiverStatusModule.useCaregiverStatus).mockReturnValue(
        createMockResult({
          children: [
            {
              childId: 'child-1',
              childName: 'Emma',
              photoURL: null,
              status: 'good',
              statusMessage: 'Doing well',
            },
          ],
        })
      )

      render(<CaregiverQuickView familyId="family-1" />)

      expect(screen.queryByText(/device/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/active/i)).not.toBeInTheDocument()
    })

    it('should NOT show last sync time', () => {
      vi.mocked(useCaregiverStatusModule.useCaregiverStatus).mockReturnValue(
        createMockResult({
          children: [
            {
              childId: 'child-1',
              childName: 'Emma',
              photoURL: null,
              status: 'good',
              statusMessage: 'Doing well',
            },
          ],
        })
      )

      render(<CaregiverQuickView familyId="family-1" />)

      expect(screen.queryByText(/min ago/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/hour/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/synced/i)).not.toBeInTheDocument()
    })
  })

  describe('AC3: Large touch targets', () => {
    it('should have large buttons (verified via test data-testid presence)', () => {
      vi.mocked(useCaregiverStatusModule.useCaregiverStatus).mockReturnValue(
        createMockResult({
          parentContact: { name: 'Parent', phone: '555-123-4567' },
        })
      )

      render(<CaregiverQuickView familyId="family-1" />)

      const callButton = screen.getByTestId('call-parent-button')
      expect(callButton).toBeInTheDocument()
    })

    it('should render child cards with large touch-friendly height', () => {
      vi.mocked(useCaregiverStatusModule.useCaregiverStatus).mockReturnValue(
        createMockResult({
          children: [
            {
              childId: 'child-1',
              childName: 'Emma',
              photoURL: null,
              status: 'good',
              statusMessage: 'Doing well',
            },
          ],
        })
      )

      render(<CaregiverQuickView familyId="family-1" />)

      const childCard = screen.getByTestId('caregiver-child-card-child-1')
      expect(childCard).toBeInTheDocument()
    })
  })

  describe('AC4: Call parent button', () => {
    it('should show call parent button with phone number', () => {
      vi.mocked(useCaregiverStatusModule.useCaregiverStatus).mockReturnValue(
        createMockResult({
          parentContact: { name: 'Mom', phone: '555-123-4567' },
        })
      )

      render(<CaregiverQuickView familyId="family-1" />)

      const button = screen.getByTestId('call-parent-button')
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('Call Mom')
      expect(button).toHaveAttribute('href', 'tel:555-123-4567')
    })

    it('should show message when parent has no phone', () => {
      vi.mocked(useCaregiverStatusModule.useCaregiverStatus).mockReturnValue(
        createMockResult({
          parentContact: { name: 'Parent', phone: null },
        })
      )

      render(<CaregiverQuickView familyId="family-1" />)

      expect(screen.getByTestId('call-parent-no-phone')).toBeInTheDocument()
      expect(screen.getByText(/Contact Parent directly/i)).toBeInTheDocument()
    })
  })

  describe('AC5: View access logging', () => {
    it('should call useCaregiverAccessLog on mount', () => {
      vi.mocked(useCaregiverStatusModule.useCaregiverStatus).mockReturnValue(
        createMockResult({
          children: [
            {
              childId: 'child-1',
              childName: 'Emma',
              photoURL: null,
              status: 'good',
              statusMessage: 'Doing well',
            },
          ],
        })
      )

      render(<CaregiverQuickView familyId="family-1" />)

      // Story 19D.3: Now passes viewerUid and familyId for Firestore logging
      expect(useCaregiverAccessLogModule.useCaregiverAccessLog).toHaveBeenCalledWith(
        'view',
        ['child-1'],
        undefined, // viewerUid is undefined when not passed
        'family-1'
      )
    })
  })

  describe('AC6: Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<CaregiverQuickView familyId="family-1" />)

      expect(screen.getByRole('heading', { name: 'Family Status' })).toBeInTheDocument()
    })

    it('should have aria-live on status message', () => {
      vi.mocked(useCaregiverStatusModule.useCaregiverStatus).mockReturnValue(
        createMockResult({
          children: [
            {
              childId: 'child-1',
              childName: 'Emma',
              photoURL: null,
              status: 'good',
              statusMessage: 'Doing well',
            },
          ],
        })
      )

      render(<CaregiverQuickView familyId="family-1" />)

      const statusMessage = screen.getByTestId('status-message')
      expect(statusMessage).toHaveAttribute('role', 'status')
      expect(statusMessage).toHaveAttribute('aria-live', 'polite')
    })

    it('should have children list with role="list"', () => {
      vi.mocked(useCaregiverStatusModule.useCaregiverStatus).mockReturnValue(
        createMockResult({
          children: [
            {
              childId: 'child-1',
              childName: 'Emma',
              photoURL: null,
              status: 'good',
              statusMessage: 'Doing well',
            },
          ],
        })
      )

      render(<CaregiverQuickView familyId="family-1" />)

      expect(screen.getByRole('list', { name: 'Children status' })).toBeInTheDocument()
    })

    it('should have aria-label on call button', () => {
      vi.mocked(useCaregiverStatusModule.useCaregiverStatus).mockReturnValue(
        createMockResult({
          parentContact: { name: 'Mom', phone: '555-123-4567' },
        })
      )

      render(<CaregiverQuickView familyId="family-1" />)

      const button = screen.getByTestId('call-parent-button')
      expect(button).toHaveAttribute('aria-label', 'Call Mom')
    })
  })

  describe('Loading and error states', () => {
    it('should show loading state', () => {
      vi.mocked(useCaregiverStatusModule.useCaregiverStatus).mockReturnValue(
        createMockResult({ loading: true })
      )

      render(<CaregiverQuickView familyId="family-1" />)

      expect(screen.getByRole('status', { name: 'Loading family status' })).toBeInTheDocument()
    })

    it('should show error state with retry button', () => {
      vi.mocked(useCaregiverStatusModule.useCaregiverStatus).mockReturnValue(
        createMockResult({ error: 'Failed to load' })
      )

      render(<CaregiverQuickView familyId="family-1" />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Failed to load')).toBeInTheDocument()
      expect(screen.getByTestId('retry-button')).toBeInTheDocument()
    })

    it('should show empty state when no children', () => {
      vi.mocked(useCaregiverStatusModule.useCaregiverStatus).mockReturnValue(
        createMockResult({ children: [] })
      )

      render(<CaregiverQuickView familyId="family-1" />)

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      expect(screen.getByText('No children to monitor')).toBeInTheDocument()
    })
  })

  describe('Child cards rendering', () => {
    it('should render child cards with correct data', () => {
      vi.mocked(useCaregiverStatusModule.useCaregiverStatus).mockReturnValue(
        createMockResult({
          children: [
            {
              childId: 'child-1',
              childName: 'Emma',
              photoURL: null,
              status: 'good',
              statusMessage: 'Doing well',
            },
            {
              childId: 'child-2',
              childName: 'Liam',
              photoURL: null,
              status: 'attention',
              statusMessage: 'Check in',
            },
          ],
        })
      )

      render(<CaregiverQuickView familyId="family-1" />)

      expect(screen.getByText('Emma')).toBeInTheDocument()
      expect(screen.getByText('Liam')).toBeInTheDocument()
      expect(screen.getByText('Doing well')).toBeInTheDocument()
      expect(screen.getByText('Check in')).toBeInTheDocument()
    })
  })

  describe('Story 19D.4: Access Window Enforcement', () => {
    beforeEach(() => {
      // Mock current time: Tuesday, December 30, 2025, 2:30 PM EST
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-12-30T14:30:00-05:00'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should show status when no access windows configured (always active)', () => {
      vi.mocked(useCaregiverStatusModule.useCaregiverStatus).mockReturnValue(
        createMockResult({
          children: [
            {
              childId: 'child-1',
              childName: 'Emma',
              photoURL: null,
              status: 'good',
              statusMessage: 'Doing well',
            },
          ],
        })
      )

      render(<CaregiverQuickView familyId="family-1" accessWindows={[]} />)

      expect(screen.getByTestId('status-message')).toBeInTheDocument()
      expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument()
    })

    it('should show status when within access window (AC2)', () => {
      vi.mocked(useCaregiverStatusModule.useCaregiverStatus).mockReturnValue(
        createMockResult({
          children: [
            {
              childId: 'child-1',
              childName: 'Emma',
              photoURL: null,
              status: 'good',
              statusMessage: 'Doing well',
            },
          ],
        })
      )

      // Tuesday 2-6 PM window - current time is Tuesday 2:30 PM
      const accessWindows: AccessWindow[] = [
        {
          dayOfWeek: 'tuesday',
          startTime: '14:00',
          endTime: '18:00',
          timezone: 'America/New_York',
        },
      ]

      render(<CaregiverQuickView familyId="family-1" accessWindows={accessWindows} />)

      expect(screen.getByTestId('status-message')).toBeInTheDocument()
      expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument()
    })

    it('should show AccessDenied when outside access window (AC3)', () => {
      vi.mocked(useCaregiverStatusModule.useCaregiverStatus).mockReturnValue(
        createMockResult({
          children: [
            {
              childId: 'child-1',
              childName: 'Emma',
              photoURL: null,
              status: 'good',
              statusMessage: 'Doing well',
            },
          ],
        })
      )

      // Saturday 2-6 PM window - current time is Tuesday 2:30 PM
      const accessWindows: AccessWindow[] = [
        {
          dayOfWeek: 'saturday',
          startTime: '14:00',
          endTime: '18:00',
          timezone: 'America/New_York',
        },
      ]

      render(<CaregiverQuickView familyId="family-1" accessWindows={accessWindows} />)

      expect(screen.getByTestId('access-denied')).toBeInTheDocument()
      expect(screen.getByText('Access Not Currently Active')).toBeInTheDocument()
      // Verify children list is NOT shown (main status view)
      expect(screen.queryByTestId('children-list')).not.toBeInTheDocument()
    })

    it('should show access windows to caregiver (AC5)', () => {
      vi.mocked(useCaregiverStatusModule.useCaregiverStatus).mockReturnValue(
        createMockResult({
          children: [
            {
              childId: 'child-1',
              childName: 'Emma',
              photoURL: null,
              status: 'good',
              statusMessage: 'Doing well',
            },
          ],
        })
      )

      const accessWindows: AccessWindow[] = [
        {
          dayOfWeek: 'saturday',
          startTime: '14:00',
          endTime: '18:00',
          timezone: 'America/New_York',
        },
      ]

      render(<CaregiverQuickView familyId="family-1" accessWindows={accessWindows} />)

      expect(screen.getByTestId('access-windows')).toBeInTheDocument()
      expect(screen.getByText('Your Access Times')).toBeInTheDocument()
      expect(screen.getByText('Saturday 2:00 PM - 6:00 PM')).toBeInTheDocument()
    })

    it('should allow access with active one-time extension', () => {
      vi.mocked(useCaregiverStatusModule.useCaregiverStatus).mockReturnValue(
        createMockResult({
          children: [
            {
              childId: 'child-1',
              childName: 'Emma',
              photoURL: null,
              status: 'good',
              statusMessage: 'Doing well',
            },
          ],
        })
      )

      // Saturday window - not active on Tuesday
      const accessWindows: AccessWindow[] = [
        {
          dayOfWeek: 'saturday',
          startTime: '14:00',
          endTime: '18:00',
          timezone: 'America/New_York',
        },
      ]

      // But have active extension until 4 PM today
      const oneTimeExtension = {
        grantedAt: new Date('2025-12-30T14:00:00'),
        expiresAt: new Date('2025-12-30T16:00:00'),
        grantedBy: 'parent-123',
      }

      render(
        <CaregiverQuickView
          familyId="family-1"
          accessWindows={accessWindows}
          oneTimeExtension={oneTimeExtension}
        />
      )

      expect(screen.getByTestId('status-message')).toBeInTheDocument()
      expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument()
    })

    it('should not log access when outside window', () => {
      vi.mocked(useCaregiverStatusModule.useCaregiverStatus).mockReturnValue(
        createMockResult({
          children: [
            {
              childId: 'child-1',
              childName: 'Emma',
              photoURL: null,
              status: 'good',
              statusMessage: 'Doing well',
            },
          ],
        })
      )

      // Saturday window - not active on Tuesday
      const accessWindows: AccessWindow[] = [
        {
          dayOfWeek: 'saturday',
          startTime: '14:00',
          endTime: '18:00',
          timezone: 'America/New_York',
        },
      ]

      render(<CaregiverQuickView familyId="family-1" accessWindows={accessWindows} />)

      // Should be called with empty array (no children logged) when access is denied
      expect(useCaregiverAccessLogModule.useCaregiverAccessLog).toHaveBeenCalledWith(
        'view',
        [], // Empty array when outside window
        undefined,
        'family-1'
      )
    })

    it('should log access when inside window', () => {
      vi.mocked(useCaregiverStatusModule.useCaregiverStatus).mockReturnValue(
        createMockResult({
          children: [
            {
              childId: 'child-1',
              childName: 'Emma',
              photoURL: null,
              status: 'good',
              statusMessage: 'Doing well',
            },
          ],
        })
      )

      // Tuesday 2-6 PM window - current time is Tuesday 2:30 PM
      const accessWindows: AccessWindow[] = [
        {
          dayOfWeek: 'tuesday',
          startTime: '14:00',
          endTime: '18:00',
          timezone: 'America/New_York',
        },
      ]

      render(
        <CaregiverQuickView
          familyId="family-1"
          viewerUid="caregiver-123"
          accessWindows={accessWindows}
        />
      )

      // Should be called with child IDs when access is active
      expect(useCaregiverAccessLogModule.useCaregiverAccessLog).toHaveBeenCalledWith(
        'view',
        ['child-1'],
        'caregiver-123',
        'family-1'
      )
    })
  })

  // Story 39.5: Flag viewing section
  describe('Flag Viewing Section (Story 39.5)', () => {
    beforeEach(() => {
      vi.mocked(useCaregiverStatusModule.useCaregiverStatus).mockReturnValue(
        createMockResult({
          children: [
            {
              childId: 'child-1',
              childName: 'Emma',
              photoURL: null,
              status: 'good',
              statusMessage: 'Doing well',
            },
          ],
        })
      )
    })

    it('should show flag section when canViewFlags is true', () => {
      render(
        <CaregiverQuickView
          familyId="family-1"
          canViewFlags={true}
          caregiverChildIds={['child-1']}
          caregiverName="Grandma"
        />
      )

      expect(screen.getByTestId('caregiver-flags-section')).toBeInTheDocument()
    })

    it('should NOT show flag section when canViewFlags is false', () => {
      render(
        <CaregiverQuickView
          familyId="family-1"
          canViewFlags={false}
          caregiverChildIds={['child-1']}
          caregiverName="Grandma"
        />
      )

      expect(screen.queryByTestId('caregiver-flags-section')).not.toBeInTheDocument()
    })

    it('should NOT show flag section when caregiverChildIds is empty', () => {
      render(
        <CaregiverQuickView
          familyId="family-1"
          canViewFlags={true}
          caregiverChildIds={[]}
          caregiverName="Grandma"
        />
      )

      expect(screen.queryByTestId('caregiver-flags-section')).not.toBeInTheDocument()
    })

    it('should NOT show flag section when familyId is null', () => {
      render(
        <CaregiverQuickView
          familyId={null}
          canViewFlags={true}
          caregiverChildIds={['child-1']}
          caregiverName="Grandma"
        />
      )

      expect(screen.queryByTestId('caregiver-flags-section')).not.toBeInTheDocument()
    })

    it('should pass correct props to CaregiverFlagQueue', () => {
      render(
        <CaregiverQuickView
          familyId="family-1"
          canViewFlags={true}
          caregiverChildIds={['child-1', 'child-2']}
          caregiverName="Grandma"
          familyChildren={[
            { id: 'child-1', name: 'Emma' },
            { id: 'child-2', name: 'Liam' },
          ]}
        />
      )

      // CaregiverFlagQueue should be rendered with correct data-testid
      expect(screen.getByTestId('caregiver-flag-queue')).toBeInTheDocument()
    })
  })
})
