/**
 * Unit tests for InvitationHistoryList component.
 *
 * Story 3.5: Invitation Management - AC5
 * Tests for invitation history display with status badges.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import InvitationHistoryList from './InvitationHistoryList'
import type { Invitation } from '@fledgely/shared/contracts'

// Mock invitation service
vi.mock('../services/invitationService', () => ({
  getInvitationsByFamily: vi.fn(),
}))

import { getInvitationsByFamily } from '../services/invitationService'

describe('InvitationHistoryList', () => {
  const mockFamilyId = 'family-123'

  const createMockInvitation = (overrides: Partial<Invitation> = {}): Invitation => ({
    id: 'inv-' + Math.random().toString(36).substring(7),
    familyId: mockFamilyId,
    inviterUid: 'inviter-123',
    inviterName: 'Test User',
    familyName: 'Test Family',
    token: 'test-token',
    status: 'accepted',
    recipientEmail: 'recipient@example.com',
    emailSentAt: new Date(),
    expiresAt: new Date(),
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(),
    acceptedAt: new Date('2024-01-16'),
    acceptedByUid: 'accepter-123',
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders nothing when no family ID is provided', () => {
      const { container } = render(<InvitationHistoryList familyId="" />)
      expect(container.firstChild).toBeNull()
    })

    it('renders nothing when there are no non-pending invitations', async () => {
      vi.mocked(getInvitationsByFamily).mockResolvedValueOnce([
        createMockInvitation({ status: 'pending' }),
      ])

      const { container } = render(<InvitationHistoryList familyId={mockFamilyId} />)

      await waitFor(() => {
        expect(container.firstChild).toBeNull()
      })
    })

    it('displays invitation history header', async () => {
      vi.mocked(getInvitationsByFamily).mockResolvedValueOnce([
        createMockInvitation({ status: 'accepted' }),
      ])

      render(<InvitationHistoryList familyId={mockFamilyId} />)

      await waitFor(() => {
        expect(screen.getByText('Invitation History')).toBeInTheDocument()
      })
    })

    it('shows toggle button with count', async () => {
      vi.mocked(getInvitationsByFamily).mockResolvedValueOnce([
        createMockInvitation({ id: '1', status: 'accepted' }),
        createMockInvitation({ id: '2', status: 'expired' }),
      ])

      render(<InvitationHistoryList familyId={mockFamilyId} />)

      await waitFor(() => {
        expect(screen.getByText('Show (2)')).toBeInTheDocument()
      })
    })

    it('displays loading state while fetching', () => {
      vi.mocked(getInvitationsByFamily).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(<InvitationHistoryList familyId={mockFamilyId} />)

      expect(screen.getByText('Loading history...')).toBeInTheDocument()
    })

    it('displays error message on fetch failure', async () => {
      vi.mocked(getInvitationsByFamily).mockRejectedValueOnce(new Error('Network error'))

      // Suppress console.error for this test
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<InvitationHistoryList familyId={mockFamilyId} />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Failed to load invitation history')
      })

      consoleErrorSpy.mockRestore()
    })
  })

  describe('expand/collapse behavior', () => {
    it('list is collapsed by default', async () => {
      vi.mocked(getInvitationsByFamily).mockResolvedValueOnce([
        createMockInvitation({ status: 'accepted', recipientEmail: 'test@example.com' }),
      ])

      render(<InvitationHistoryList familyId={mockFamilyId} />)

      await waitFor(() => {
        expect(screen.getByText('Show (1)')).toBeInTheDocument()
      })

      // List should not be visible
      expect(screen.queryByText('test@example.com')).not.toBeInTheDocument()
    })

    it('expands list when toggle is clicked', async () => {
      vi.mocked(getInvitationsByFamily).mockResolvedValueOnce([
        createMockInvitation({ status: 'accepted', recipientEmail: 'test@example.com' }),
      ])

      render(<InvitationHistoryList familyId={mockFamilyId} />)

      await waitFor(() => {
        expect(screen.getByText('Show (1)')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Show (1)'))

      expect(screen.getByText('test@example.com')).toBeInTheDocument()
      expect(screen.getByText('Hide (1)')).toBeInTheDocument()
    })

    it('collapses list when toggle is clicked again', async () => {
      vi.mocked(getInvitationsByFamily).mockResolvedValueOnce([
        createMockInvitation({ status: 'accepted', recipientEmail: 'test@example.com' }),
      ])

      render(<InvitationHistoryList familyId={mockFamilyId} />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('Show (1)'))
      })

      expect(screen.getByText('test@example.com')).toBeInTheDocument()

      fireEvent.click(screen.getByText('Hide (1)'))

      expect(screen.queryByText('test@example.com')).not.toBeInTheDocument()
    })
  })

  describe('invitation status display (AC5)', () => {
    beforeEach(() => {
      // Mock implementation that returns different statuses
      vi.mocked(getInvitationsByFamily).mockResolvedValue([
        createMockInvitation({
          id: '1',
          status: 'accepted',
          recipientEmail: 'accepted@example.com',
        }),
        createMockInvitation({ id: '2', status: 'expired', recipientEmail: 'expired@example.com' }),
        createMockInvitation({ id: '3', status: 'revoked', recipientEmail: 'revoked@example.com' }),
      ])
    })

    it('displays status badges for each invitation', async () => {
      render(<InvitationHistoryList familyId={mockFamilyId} />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('Show (3)'))
      })

      // Check all status badges
      expect(screen.getByText('accepted')).toBeInTheDocument()
      expect(screen.getByText('expired')).toBeInTheDocument()
      expect(screen.getByText('revoked')).toBeInTheDocument()
    })

    it('displays recipient emails', async () => {
      render(<InvitationHistoryList familyId={mockFamilyId} />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('Show (3)'))
      })

      expect(screen.getByText('accepted@example.com')).toBeInTheDocument()
      expect(screen.getByText('expired@example.com')).toBeInTheDocument()
      expect(screen.getByText('revoked@example.com')).toBeInTheDocument()
    })

    it('shows placeholder for invitations without email', async () => {
      vi.mocked(getInvitationsByFamily).mockResolvedValueOnce([
        createMockInvitation({ status: 'accepted', recipientEmail: null }),
      ])

      render(<InvitationHistoryList familyId={mockFamilyId} />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('Show (1)'))
      })

      expect(screen.getByText('Link shared (no email)')).toBeInTheDocument()
    })

    it('shows accepted date for accepted invitations', async () => {
      vi.mocked(getInvitationsByFamily).mockResolvedValueOnce([
        createMockInvitation({
          status: 'accepted',
          acceptedAt: new Date('2024-03-15'),
        }),
      ])

      render(<InvitationHistoryList familyId={mockFamilyId} />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('Show (1)'))
      })

      expect(screen.getByText(/Accepted Mar 15, 2024/)).toBeInTheDocument()
    })

    it('filters out pending invitations from history', async () => {
      vi.mocked(getInvitationsByFamily).mockResolvedValueOnce([
        createMockInvitation({ id: '1', status: 'pending', recipientEmail: 'pending@example.com' }),
        createMockInvitation({
          id: '2',
          status: 'accepted',
          recipientEmail: 'accepted@example.com',
        }),
      ])

      render(<InvitationHistoryList familyId={mockFamilyId} />)

      await waitFor(() => {
        expect(screen.getByText('Show (1)')).toBeInTheDocument() // Only 1, not 2
      })

      fireEvent.click(screen.getByText('Show (1)'))

      expect(screen.queryByText('pending@example.com')).not.toBeInTheDocument()
      expect(screen.getByText('accepted@example.com')).toBeInTheDocument()
    })
  })

  describe('refresh trigger', () => {
    it('refetches data when refreshTrigger changes', async () => {
      vi.mocked(getInvitationsByFamily).mockResolvedValue([
        createMockInvitation({ status: 'accepted' }),
      ])

      const { rerender } = render(
        <InvitationHistoryList familyId={mockFamilyId} refreshTrigger={0} />
      )

      await waitFor(() => {
        expect(getInvitationsByFamily).toHaveBeenCalledTimes(1)
      })

      rerender(<InvitationHistoryList familyId={mockFamilyId} refreshTrigger={1} />)

      await waitFor(() => {
        expect(getInvitationsByFamily).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('accessibility', () => {
    it('toggle button has aria-expanded attribute', async () => {
      vi.mocked(getInvitationsByFamily).mockResolvedValueOnce([
        createMockInvitation({ status: 'accepted' }),
      ])

      render(<InvitationHistoryList familyId={mockFamilyId} />)

      await waitFor(() => {
        const button = screen.getByRole('button')
        expect(button).toHaveAttribute('aria-expanded', 'false')
      })

      fireEvent.click(screen.getByRole('button'))

      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true')
    })

    it('toggle button controls the list', async () => {
      vi.mocked(getInvitationsByFamily).mockResolvedValueOnce([
        createMockInvitation({ status: 'accepted' }),
      ])

      render(<InvitationHistoryList familyId={mockFamilyId} />)

      await waitFor(() => {
        const button = screen.getByRole('button')
        expect(button).toHaveAttribute('aria-controls', 'invitation-history-list')
      })
    })

    it('list has accessible label', async () => {
      vi.mocked(getInvitationsByFamily).mockResolvedValueOnce([
        createMockInvitation({ status: 'accepted' }),
      ])

      render(<InvitationHistoryList familyId={mockFamilyId} />)

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button'))
      })

      expect(screen.getByRole('list')).toHaveAttribute('aria-label', 'Invitation history')
    })

    it('status badges have role=status with aria-label', async () => {
      vi.mocked(getInvitationsByFamily).mockResolvedValueOnce([
        createMockInvitation({ status: 'accepted' }),
      ])

      render(<InvitationHistoryList familyId={mockFamilyId} />)

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button'))
      })

      const statusBadge = screen.getByRole('status')
      expect(statusBadge).toHaveAttribute('aria-label', 'Invitation status: accepted')
    })
  })
})
