/**
 * Tests for TemporaryAccessList component.
 *
 * Story 39.3: Temporary Caregiver Access
 *
 * Tests cover:
 * - AC5: Early revocation with immediate effect
 * - AC6: All temporary access logged
 * - List display and filtering
 * - Revocation modal and confirmation
 * - NFR49: 44px minimum touch targets
 * - Accessibility compliance
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TemporaryAccessList from './TemporaryAccessList'
import type { TemporaryAccessGrant } from '@fledgely/shared/contracts'

// Mock Firebase Functions
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => mockRevokeTemporaryAccess),
}))

// Mock the callable function
const mockRevokeTemporaryAccess = vi.fn()

// Mock grants for testing
const createMockGrant = (overrides: Partial<TemporaryAccessGrant> = {}): TemporaryAccessGrant => ({
  id: 'grant-123',
  familyId: 'family-456',
  caregiverUid: 'caregiver-789',
  grantedByUid: 'parent-123',
  startAt: new Date('2026-01-03T10:00:00Z'),
  endAt: new Date('2026-01-03T18:00:00Z'),
  preset: 'custom',
  timezone: 'America/New_York',
  status: 'active',
  createdAt: new Date('2026-01-03T09:00:00Z'),
  ...overrides,
})

describe('TemporaryAccessList', () => {
  const defaultProps = {
    familyId: 'family-456',
    grants: [] as TemporaryAccessGrant[],
    caregiverNames: { 'caregiver-789': 'Grandma', 'caregiver-101': 'Uncle Bob' },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockRevokeTemporaryAccess.mockResolvedValue({
      data: { success: true },
    })
  })

  describe('Rendering', () => {
    it('renders the container', () => {
      render(<TemporaryAccessList {...defaultProps} />)

      expect(screen.getByTestId('temporary-access-list')).toBeInTheDocument()
    })

    it('renders the title', () => {
      render(<TemporaryAccessList {...defaultProps} />)

      expect(screen.getByRole('heading', { name: 'Temporary Access' })).toBeInTheDocument()
    })

    it('renders empty state when no grants', () => {
      render(<TemporaryAccessList {...defaultProps} />)

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      expect(screen.getByText('No temporary access grants yet.')).toBeInTheDocument()
    })

    it('renders grant list when grants exist', () => {
      const grants = [createMockGrant()]
      render(<TemporaryAccessList {...defaultProps} grants={grants} />)

      expect(screen.getByTestId('grant-list')).toBeInTheDocument()
      expect(screen.getByTestId('grant-grant-123')).toBeInTheDocument()
    })
  })

  describe('Grant Display', () => {
    it('displays caregiver name', () => {
      const grants = [createMockGrant()]
      render(<TemporaryAccessList {...defaultProps} grants={grants} />)

      expect(screen.getByText('Grandma')).toBeInTheDocument()
    })

    it('displays status badge', () => {
      const grants = [createMockGrant({ status: 'active' })]
      render(<TemporaryAccessList {...defaultProps} grants={grants} />)

      const statusBadge = screen.getByTestId('status-grant-123')
      expect(statusBadge).toBeInTheDocument()
      expect(statusBadge).toHaveTextContent('Active')
    })

    it('displays pending status', () => {
      const grants = [createMockGrant({ status: 'pending' })]
      render(<TemporaryAccessList {...defaultProps} grants={grants} />)

      const statusBadge = screen.getByTestId('status-grant-123')
      expect(statusBadge).toHaveTextContent('Pending')
    })

    it('displays expired status', () => {
      const grants = [createMockGrant({ status: 'expired' })]
      render(<TemporaryAccessList {...defaultProps} grants={grants} />)

      const statusBadge = screen.getByTestId('status-grant-123')
      expect(statusBadge).toHaveTextContent('Expired')
    })

    it('displays revoked status', () => {
      const grants = [createMockGrant({ status: 'revoked' })]
      render(<TemporaryAccessList {...defaultProps} grants={grants} />)

      const statusBadge = screen.getByTestId('status-grant-123')
      expect(statusBadge).toHaveTextContent('Revoked')
    })

    it('displays revocation reason if provided', () => {
      const grants = [
        createMockGrant({
          status: 'revoked',
          revokedReason: 'Plans changed',
        }),
      ]
      render(<TemporaryAccessList {...defaultProps} grants={grants} />)

      expect(screen.getByText('Reason: Plans changed')).toBeInTheDocument()
    })

    it('shows revoke button for active grants', () => {
      const grants = [createMockGrant({ status: 'active' })]
      render(<TemporaryAccessList {...defaultProps} grants={grants} />)

      expect(screen.getByTestId('revoke-grant-123')).toBeInTheDocument()
    })

    it('shows revoke button for pending grants', () => {
      const grants = [createMockGrant({ status: 'pending' })]
      render(<TemporaryAccessList {...defaultProps} grants={grants} />)

      expect(screen.getByTestId('revoke-grant-123')).toBeInTheDocument()
    })

    it('does not show revoke button for expired grants', () => {
      const grants = [createMockGrant({ status: 'expired' })]
      render(<TemporaryAccessList {...defaultProps} grants={grants} />)

      expect(screen.queryByTestId('revoke-grant-123')).not.toBeInTheDocument()
    })

    it('does not show revoke button for revoked grants', () => {
      const grants = [createMockGrant({ status: 'revoked' })]
      render(<TemporaryAccessList {...defaultProps} grants={grants} />)

      expect(screen.queryByTestId('revoke-grant-123')).not.toBeInTheDocument()
    })
  })

  describe('Filtering', () => {
    it('renders all filter buttons', () => {
      render(<TemporaryAccessList {...defaultProps} />)

      expect(screen.getByTestId('filter-all')).toBeInTheDocument()
      expect(screen.getByTestId('filter-active')).toBeInTheDocument()
      expect(screen.getByTestId('filter-pending')).toBeInTheDocument()
      expect(screen.getByTestId('filter-expired')).toBeInTheDocument()
      expect(screen.getByTestId('filter-revoked')).toBeInTheDocument()
    })

    it('defaults to all filter', () => {
      render(<TemporaryAccessList {...defaultProps} />)

      expect(screen.getByTestId('filter-all')).toHaveAttribute('aria-pressed', 'true')
    })

    it('filters by active status', () => {
      const grants = [
        createMockGrant({ id: 'grant-1', status: 'active' }),
        createMockGrant({ id: 'grant-2', status: 'expired' }),
      ]
      render(<TemporaryAccessList {...defaultProps} grants={grants} />)

      fireEvent.click(screen.getByTestId('filter-active'))

      expect(screen.getByTestId('grant-grant-1')).toBeInTheDocument()
      expect(screen.queryByTestId('grant-grant-2')).not.toBeInTheDocument()
    })

    it('filters by pending status', () => {
      const grants = [
        createMockGrant({ id: 'grant-1', status: 'pending' }),
        createMockGrant({ id: 'grant-2', status: 'active' }),
      ]
      render(<TemporaryAccessList {...defaultProps} grants={grants} />)

      fireEvent.click(screen.getByTestId('filter-pending'))

      expect(screen.getByTestId('grant-grant-1')).toBeInTheDocument()
      expect(screen.queryByTestId('grant-grant-2')).not.toBeInTheDocument()
    })

    it('shows filtered empty state', () => {
      const grants = [createMockGrant({ status: 'active' })]
      render(<TemporaryAccessList {...defaultProps} grants={grants} />)

      fireEvent.click(screen.getByTestId('filter-expired'))

      expect(screen.getByText('No expired grants.')).toBeInTheDocument()
    })
  })

  describe('Revocation Modal (AC5)', () => {
    it('opens modal when revoke button clicked', () => {
      const grants = [createMockGrant()]
      render(<TemporaryAccessList {...defaultProps} grants={grants} />)

      fireEvent.click(screen.getByTestId('revoke-grant-123'))

      expect(screen.getByTestId('revoke-modal')).toBeInTheDocument()
    })

    it('displays confirmation message in modal', () => {
      const grants = [createMockGrant()]
      render(<TemporaryAccessList {...defaultProps} grants={grants} />)

      fireEvent.click(screen.getByTestId('revoke-grant-123'))

      expect(screen.getByText(/Are you sure you want to revoke/)).toBeInTheDocument()
    })

    it('has reason input field', () => {
      const grants = [createMockGrant()]
      render(<TemporaryAccessList {...defaultProps} grants={grants} />)

      fireEvent.click(screen.getByTestId('revoke-grant-123'))

      expect(screen.getByTestId('revoke-reason-input')).toBeInTheDocument()
    })

    it('closes modal when cancel clicked', () => {
      const grants = [createMockGrant()]
      render(<TemporaryAccessList {...defaultProps} grants={grants} />)

      fireEvent.click(screen.getByTestId('revoke-grant-123'))
      expect(screen.getByTestId('revoke-modal')).toBeInTheDocument()

      fireEvent.click(screen.getByTestId('cancel-revoke-button'))

      expect(screen.queryByTestId('revoke-modal')).not.toBeInTheDocument()
    })

    it('calls revokeTemporaryAccess on confirm', async () => {
      const grants = [createMockGrant()]
      render(<TemporaryAccessList {...defaultProps} grants={grants} />)

      fireEvent.click(screen.getByTestId('revoke-grant-123'))
      fireEvent.click(screen.getByTestId('confirm-revoke-button'))

      await waitFor(() => {
        expect(mockRevokeTemporaryAccess).toHaveBeenCalledWith({
          familyId: 'family-456',
          grantId: 'grant-123',
          reason: undefined,
        })
      })
    })

    it('includes reason when provided', async () => {
      const grants = [createMockGrant()]
      render(<TemporaryAccessList {...defaultProps} grants={grants} />)

      fireEvent.click(screen.getByTestId('revoke-grant-123'))
      fireEvent.change(screen.getByTestId('revoke-reason-input'), {
        target: { value: 'Plans changed' },
      })
      fireEvent.click(screen.getByTestId('confirm-revoke-button'))

      await waitFor(() => {
        expect(mockRevokeTemporaryAccess).toHaveBeenCalledWith({
          familyId: 'family-456',
          grantId: 'grant-123',
          reason: 'Plans changed',
        })
      })
    })

    it('calls onRevoke callback on success', async () => {
      const grants = [createMockGrant()]
      const onRevoke = vi.fn()
      render(<TemporaryAccessList {...defaultProps} grants={grants} onRevoke={onRevoke} />)

      fireEvent.click(screen.getByTestId('revoke-grant-123'))
      fireEvent.click(screen.getByTestId('confirm-revoke-button'))

      await waitFor(() => {
        expect(onRevoke).toHaveBeenCalledWith('grant-123')
      })
    })

    it('calls onRefresh callback on success', async () => {
      const grants = [createMockGrant()]
      const onRefresh = vi.fn()
      render(<TemporaryAccessList {...defaultProps} grants={grants} onRefresh={onRefresh} />)

      fireEvent.click(screen.getByTestId('revoke-grant-123'))
      fireEvent.click(screen.getByTestId('confirm-revoke-button'))

      await waitFor(() => {
        expect(onRefresh).toHaveBeenCalled()
      })
    })

    it('shows error on revocation failure', async () => {
      mockRevokeTemporaryAccess.mockRejectedValue(new Error('Network error'))

      const grants = [createMockGrant()]
      render(<TemporaryAccessList {...defaultProps} grants={grants} />)

      fireEvent.click(screen.getByTestId('revoke-grant-123'))
      fireEvent.click(screen.getByTestId('confirm-revoke-button'))

      await waitFor(() => {
        expect(screen.getByTestId('revoke-error')).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('disables buttons while revoking', async () => {
      mockRevokeTemporaryAccess.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { success: true } }), 100))
      )

      const grants = [createMockGrant()]
      render(<TemporaryAccessList {...defaultProps} grants={grants} />)

      fireEvent.click(screen.getByTestId('revoke-grant-123'))
      fireEvent.click(screen.getByTestId('confirm-revoke-button'))

      expect(screen.getByTestId('confirm-revoke-button')).toBeDisabled()
      expect(screen.getByTestId('confirm-revoke-button')).toHaveTextContent('Revoking...')

      await waitFor(() => {
        expect(screen.queryByTestId('revoke-modal')).not.toBeInTheDocument()
      })
    })
  })

  describe('Sorting', () => {
    it('sorts active grants first', () => {
      const grants = [
        createMockGrant({ id: 'grant-1', status: 'expired' }),
        createMockGrant({ id: 'grant-2', status: 'active' }),
      ]
      render(<TemporaryAccessList {...defaultProps} grants={grants} />)

      const grantCards = screen.getAllByTestId(/^grant-grant-/)
      expect(grantCards[0]).toHaveAttribute('data-testid', 'grant-grant-2')
      expect(grantCards[1]).toHaveAttribute('data-testid', 'grant-grant-1')
    })

    it('sorts pending before expired', () => {
      const grants = [
        createMockGrant({ id: 'grant-1', status: 'expired' }),
        createMockGrant({ id: 'grant-2', status: 'pending' }),
      ]
      render(<TemporaryAccessList {...defaultProps} grants={grants} />)

      const grantCards = screen.getAllByTestId(/^grant-grant-/)
      expect(grantCards[0]).toHaveAttribute('data-testid', 'grant-grant-2')
      expect(grantCards[1]).toHaveAttribute('data-testid', 'grant-grant-1')
    })
  })

  describe('Accessibility', () => {
    it('filter buttons have aria-pressed attribute', () => {
      render(<TemporaryAccessList {...defaultProps} />)

      const filters = [
        'filter-all',
        'filter-active',
        'filter-pending',
        'filter-expired',
        'filter-revoked',
      ]
      filters.forEach((filter) => {
        expect(screen.getByTestId(filter)).toHaveAttribute('aria-pressed')
      })
    })

    it('revoke error has role="alert"', async () => {
      mockRevokeTemporaryAccess.mockRejectedValue(new Error('Error'))

      const grants = [createMockGrant()]
      render(<TemporaryAccessList {...defaultProps} grants={grants} />)

      fireEvent.click(screen.getByTestId('revoke-grant-123'))
      fireEvent.click(screen.getByTestId('confirm-revoke-button'))

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })
  })

  describe('Touch Targets (NFR49)', () => {
    it('revoke button has min-height of 44px', () => {
      const grants = [createMockGrant()]
      render(<TemporaryAccessList {...defaultProps} grants={grants} />)

      const revokeButton = screen.getByTestId('revoke-grant-123')
      expect(revokeButton).toHaveStyle({ minHeight: '44px' })
    })

    it('confirm revoke button has min-height of 44px', () => {
      const grants = [createMockGrant()]
      render(<TemporaryAccessList {...defaultProps} grants={grants} />)

      fireEvent.click(screen.getByTestId('revoke-grant-123'))

      const confirmButton = screen.getByTestId('confirm-revoke-button')
      expect(confirmButton).toHaveStyle({ minHeight: '44px' })
    })

    it('cancel revoke button has min-height of 44px', () => {
      const grants = [createMockGrant()]
      render(<TemporaryAccessList {...defaultProps} grants={grants} />)

      fireEvent.click(screen.getByTestId('revoke-grant-123'))

      const cancelButton = screen.getByTestId('cancel-revoke-button')
      expect(cancelButton).toHaveStyle({ minHeight: '44px' })
    })
  })
})
