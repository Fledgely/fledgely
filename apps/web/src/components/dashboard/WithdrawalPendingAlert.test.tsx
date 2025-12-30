/**
 * Unit tests for WithdrawalPendingAlert component - Story 6.6
 *
 * Tests cover:
 * - Loading state rendering
 * - Empty state (no alerts shown)
 * - Alert card display
 * - Time formatting
 * - Child name lookup
 * - Accessibility attributes
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WithdrawalPendingAlert } from './WithdrawalPendingAlert'

// Mock the hooks
const mockWithdrawals: Array<{
  requestId: string
  childId: string
  familyId: string
  deviceId: string
  status: 'pending' | 'cancelled' | 'executed'
  requestedAt: Date
  expiresAt: Date
}> = []
let mockLoading = false
let mockError: string | null = null

const mockChildren: Array<{
  id: string
  name: string
  photoURL: string | null
}> = []

vi.mock('../../hooks/usePendingWithdrawals', () => ({
  usePendingWithdrawals: () => ({
    withdrawals: mockWithdrawals,
    loading: mockLoading,
    error: mockError,
  }),
  formatTimeRemaining: (date: Date) => {
    const remaining = date.getTime() - Date.now()
    if (remaining <= 0) return 'Processing...'
    const hours = Math.floor(remaining / (1000 * 60 * 60))
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
    if (hours > 0) return `${hours}h ${minutes}m remaining`
    return `${minutes}m remaining`
  },
}))

vi.mock('../../hooks/useChildren', () => ({
  useChildren: () => ({
    children: mockChildren,
  }),
}))

describe('WithdrawalPendingAlert component - Story 6.6', () => {
  beforeEach(() => {
    // Reset mock state
    mockWithdrawals.length = 0
    mockChildren.length = 0
    mockLoading = false
    mockError = null
  })

  describe('loading state', () => {
    it('renders loading skeleton when loading', () => {
      mockLoading = true

      render(<WithdrawalPendingAlert familyId="family-1" />)

      expect(screen.getByTestId('withdrawal-alert-loading')).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveAttribute(
        'aria-label',
        'Loading withdrawal requests'
      )
    })
  })

  describe('empty state', () => {
    it('renders nothing when no pending withdrawals', () => {
      mockWithdrawals.length = 0

      const { container } = render(<WithdrawalPendingAlert familyId="family-1" />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('alert rendering', () => {
    it('renders alert card when withdrawal pending', () => {
      const now = Date.now()
      mockWithdrawals.push({
        requestId: 'withdrawal-1',
        childId: 'child-1',
        familyId: 'family-1',
        deviceId: 'device-1',
        status: 'pending',
        requestedAt: new Date(now - 60 * 60 * 1000), // 1 hour ago
        expiresAt: new Date(now + 23 * 60 * 60 * 1000), // 23 hours from now
      })

      mockChildren.push({
        id: 'child-1',
        name: 'Emma',
        photoURL: null,
      })

      render(<WithdrawalPendingAlert familyId="family-1" />)

      expect(screen.getByTestId('withdrawal-pending-alert')).toBeInTheDocument()
      expect(screen.getByText('Emma wants to withdraw consent')).toBeInTheDocument()
    })

    it('shows fallback name when child not found', () => {
      const now = Date.now()
      mockWithdrawals.push({
        requestId: 'withdrawal-1',
        childId: 'unknown-child',
        familyId: 'family-1',
        deviceId: 'device-1',
        status: 'pending',
        requestedAt: new Date(now - 60 * 60 * 1000),
        expiresAt: new Date(now + 23 * 60 * 60 * 1000),
      })

      render(<WithdrawalPendingAlert familyId="family-1" />)

      expect(screen.getByText('Your child wants to withdraw consent')).toBeInTheDocument()
    })

    it('displays remaining time countdown', () => {
      const now = Date.now()
      mockWithdrawals.push({
        requestId: 'withdrawal-1',
        childId: 'child-1',
        familyId: 'family-1',
        deviceId: 'device-1',
        status: 'pending',
        requestedAt: new Date(now - 60 * 60 * 1000),
        expiresAt: new Date(now + 23 * 60 * 60 * 1000), // ~23 hours
      })

      mockChildren.push({
        id: 'child-1',
        name: 'Emma',
        photoURL: null,
      })

      render(<WithdrawalPendingAlert familyId="family-1" />)

      expect(screen.getByText(/remaining/)).toBeInTheDocument()
    })

    it('displays helpful information about what happens next', () => {
      const now = Date.now()
      mockWithdrawals.push({
        requestId: 'withdrawal-1',
        childId: 'child-1',
        familyId: 'family-1',
        deviceId: 'device-1',
        status: 'pending',
        requestedAt: new Date(now - 60 * 60 * 1000),
        expiresAt: new Date(now + 23 * 60 * 60 * 1000),
      })

      mockChildren.push({
        id: 'child-1',
        name: 'Emma',
        photoURL: null,
      })

      render(<WithdrawalPendingAlert familyId="family-1" />)

      expect(screen.getByText(/What happens next/)).toBeInTheDocument()
      expect(screen.getByText(/only your child can/)).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has proper alert role', () => {
      const now = Date.now()
      mockWithdrawals.push({
        requestId: 'withdrawal-1',
        childId: 'child-1',
        familyId: 'family-1',
        deviceId: 'device-1',
        status: 'pending',
        requestedAt: new Date(now - 60 * 60 * 1000),
        expiresAt: new Date(now + 23 * 60 * 60 * 1000),
      })

      mockChildren.push({
        id: 'child-1',
        name: 'Emma',
        photoURL: null,
      })

      render(<WithdrawalPendingAlert familyId="family-1" />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('has aria-live="polite" for screen readers', () => {
      const now = Date.now()
      mockWithdrawals.push({
        requestId: 'withdrawal-1',
        childId: 'child-1',
        familyId: 'family-1',
        deviceId: 'device-1',
        status: 'pending',
        requestedAt: new Date(now - 60 * 60 * 1000),
        expiresAt: new Date(now + 23 * 60 * 60 * 1000),
      })

      mockChildren.push({
        id: 'child-1',
        name: 'Emma',
        photoURL: null,
      })

      render(<WithdrawalPendingAlert familyId="family-1" />)

      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('multiple withdrawals', () => {
    it('renders multiple alert cards when multiple children have pending withdrawals', () => {
      const now = Date.now()
      mockWithdrawals.push(
        {
          requestId: 'withdrawal-1',
          childId: 'child-1',
          familyId: 'family-1',
          deviceId: 'device-1',
          status: 'pending',
          requestedAt: new Date(now - 60 * 60 * 1000),
          expiresAt: new Date(now + 23 * 60 * 60 * 1000),
        },
        {
          requestId: 'withdrawal-2',
          childId: 'child-2',
          familyId: 'family-1',
          deviceId: 'device-2',
          status: 'pending',
          requestedAt: new Date(now - 30 * 60 * 1000),
          expiresAt: new Date(now + 23.5 * 60 * 60 * 1000),
        }
      )

      mockChildren.push(
        { id: 'child-1', name: 'Emma', photoURL: null },
        { id: 'child-2', name: 'Liam', photoURL: null }
      )

      render(<WithdrawalPendingAlert familyId="family-1" />)

      expect(screen.getByText('Emma wants to withdraw consent')).toBeInTheDocument()
      expect(screen.getByText('Liam wants to withdraw consent')).toBeInTheDocument()
      expect(screen.getAllByTestId('withdrawal-pending-alert')).toHaveLength(2)
    })
  })

  describe('error handling', () => {
    it('renders nothing on error (errors silently)', () => {
      mockError = 'Failed to load'

      const { container } = render(<WithdrawalPendingAlert familyId="family-1" />)

      expect(container.firstChild).toBeNull()
    })
  })
})
