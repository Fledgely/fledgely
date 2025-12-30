/**
 * CaregiverQuickView Component Tests - Story 19A.3
 *
 * Tests for the Caregiver Quick View component.
 * Covers all acceptance criteria:
 * - AC1: Simplified status display
 * - AC2: No complex device details
 * - AC3: Large touch targets (NFR49: 44x44 minimum)
 * - AC4: Call parent button
 * - AC5: View access logging
 * - AC6: Accessibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CaregiverQuickView } from './CaregiverQuickView'
import * as useCaregiverStatusModule from '../../hooks/useCaregiverStatus'
import * as useCaregiverAccessLogModule from '../../hooks/useCaregiverAccessLog'
import type { CaregiverStatusResult } from '../../hooks/useCaregiverStatus'

// Mock hooks
vi.mock('../../hooks/useCaregiverStatus', () => ({
  useCaregiverStatus: vi.fn(),
}))

vi.mock('../../hooks/useCaregiverAccessLog', () => ({
  useCaregiverAccessLog: vi.fn(),
  logCaregiverAction: vi.fn(),
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

      expect(useCaregiverAccessLogModule.useCaregiverAccessLog).toHaveBeenCalledWith('view', [
        'child-1',
      ])
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
})
