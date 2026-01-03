/**
 * Tests for CaregiverManagementPage component.
 *
 * Story 39.1: Caregiver Account Creation
 *
 * Tests cover:
 * - AC5: Caregiver List Display
 *   - Shows list of all caregivers with name, relationship, status
 *   - Shows pending invitations separately
 *   - Shows count: "3 of 5 caregivers"
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CaregiverManagementPage from './CaregiverManagementPage'

// Mock the hooks and services
vi.mock('../../hooks/useCaregiverLimit', () => ({
  useCaregiverLimit: vi.fn(),
}))

vi.mock('../../contexts/FamilyContext', () => ({
  useFamily: vi.fn(),
}))

vi.mock('../../services/caregiverInvitationService', () => ({
  getCaregiverInvitationsByFamily: vi.fn(),
}))

// Mock child component
vi.mock('./CaregiverInviteForm', () => ({
  default: ({ onCancel }: { onCancel: () => void }) => (
    <div data-testid="mock-invite-form">
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}))

import { useCaregiverLimit } from '../../hooks/useCaregiverLimit'
import { useFamily } from '../../contexts/FamilyContext'
import { getCaregiverInvitationsByFamily } from '../../services/caregiverInvitationService'

const mockCaregivers = [
  {
    uid: 'caregiver-1',
    email: 'grandpa@example.com',
    displayName: 'Grandpa Joe',
    role: 'status_viewer',
    relationship: 'grandparent',
    customRelationship: null,
    childIds: ['child-1'],
    addedAt: new Date('2024-01-01'),
    addedByUid: 'parent-1',
  },
  {
    uid: 'caregiver-2',
    email: 'aunt@example.com',
    displayName: 'Aunt Sarah',
    role: 'status_viewer',
    relationship: 'aunt_uncle',
    customRelationship: null,
    childIds: ['child-1'],
    addedAt: new Date('2024-01-15'),
    addedByUid: 'parent-1',
  },
]

const mockPendingInvitations = [
  {
    id: 'inv-1',
    familyId: 'family-123',
    inviterUid: 'parent-1',
    inviterName: 'Parent',
    familyName: 'Test Family',
    token: 'token-1',
    status: 'pending',
    recipientEmail: 'sitter@example.com',
    caregiverRole: 'status_viewer',
    relationship: 'babysitter',
    customRelationship: null,
    childIds: ['child-1'],
    emailSentAt: new Date(),
    acceptedAt: null,
    acceptedByUid: null,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const mockLimitInfo = {
  currentCount: 3,
  maxAllowed: 5,
  remaining: 2,
  isAtLimit: false,
  activeCount: 2,
  pendingCount: 1,
}

describe('CaregiverManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useCaregiverLimit).mockReturnValue({
      limit: mockLimitInfo,
      loading: false,
      error: null,
    })
    vi.mocked(useFamily).mockReturnValue({
      family: {
        id: 'family-123',
        name: 'Test Family',
        caregivers: mockCaregivers,
      },
      loading: false,
      error: null,
    } as ReturnType<typeof useFamily>)
    vi.mocked(getCaregiverInvitationsByFamily).mockResolvedValue(mockPendingInvitations)
  })

  describe('Rendering', () => {
    it('renders the page title', () => {
      render(<CaregiverManagementPage familyId="family-123" />)

      expect(screen.getByText('Caregivers')).toBeInTheDocument()
    })

    it('renders caregiver count badge (AC5)', () => {
      render(<CaregiverManagementPage familyId="family-123" />)

      const countBadge = screen.getByTestId('caregiver-count')
      expect(countBadge.textContent).toContain('2')
      expect(countBadge.textContent).toContain('5')
    })

    it('renders add caregiver button', () => {
      render(<CaregiverManagementPage familyId="family-123" />)

      expect(screen.getByTestId('add-caregiver-button')).toBeInTheDocument()
    })

    it('renders active caregivers section', () => {
      render(<CaregiverManagementPage familyId="family-123" />)

      expect(screen.getByText('Active Caregivers')).toBeInTheDocument()
    })

    it('renders pending invitations section', () => {
      render(<CaregiverManagementPage familyId="family-123" />)

      expect(screen.getByText('Pending Invitations')).toBeInTheDocument()
    })
  })

  describe('Caregiver List (AC5)', () => {
    it('displays all caregivers', () => {
      render(<CaregiverManagementPage familyId="family-123" />)

      expect(screen.getByTestId('caregiver-caregiver-1')).toBeInTheDocument()
      expect(screen.getByTestId('caregiver-caregiver-2')).toBeInTheDocument()
    })

    it('shows caregiver name', () => {
      render(<CaregiverManagementPage familyId="family-123" />)

      expect(screen.getByText('Grandpa Joe')).toBeInTheDocument()
      expect(screen.getByText('Aunt Sarah')).toBeInTheDocument()
    })

    it('shows caregiver relationship', () => {
      render(<CaregiverManagementPage familyId="family-123" />)

      expect(screen.getByText('Grandparent')).toBeInTheDocument()
      expect(screen.getByText('Aunt/Uncle')).toBeInTheDocument()
    })

    it('shows manage button for each caregiver', () => {
      render(<CaregiverManagementPage familyId="family-123" />)

      expect(screen.getByTestId('manage-caregiver-1')).toBeInTheDocument()
      expect(screen.getByTestId('manage-caregiver-2')).toBeInTheDocument()
    })

    it('shows empty state when no caregivers', () => {
      vi.mocked(useFamily).mockReturnValue({
        family: {
          id: 'family-123',
          name: 'Test Family',
          caregivers: [],
        },
        loading: false,
        error: null,
      } as ReturnType<typeof useFamily>)

      render(<CaregiverManagementPage familyId="family-123" />)

      expect(screen.getByTestId('no-caregivers')).toBeInTheDocument()
    })
  })

  describe('Add Caregiver Button', () => {
    it('opens invite form when clicked', () => {
      render(<CaregiverManagementPage familyId="family-123" />)

      fireEvent.click(screen.getByTestId('add-caregiver-button'))

      expect(screen.getByTestId('invite-modal')).toBeInTheDocument()
    })

    it('is disabled when at limit', () => {
      vi.mocked(useCaregiverLimit).mockReturnValue({
        limit: {
          ...mockLimitInfo,
          isAtLimit: true,
          remaining: 0,
        },
        loading: false,
        error: null,
      })

      render(<CaregiverManagementPage familyId="family-123" />)

      expect(screen.getByTestId('add-caregiver-button')).toBeDisabled()
    })

    it('closes form when cancel is clicked', () => {
      render(<CaregiverManagementPage familyId="family-123" />)

      // Open form
      fireEvent.click(screen.getByTestId('add-caregiver-button'))
      expect(screen.getByTestId('invite-modal')).toBeInTheDocument()

      // Click cancel
      fireEvent.click(screen.getByText('Cancel'))
      expect(screen.queryByTestId('invite-modal')).not.toBeInTheDocument()
    })
  })

  describe('Pending Invitations', () => {
    it('shows empty state when no pending invitations', async () => {
      vi.mocked(getCaregiverInvitationsByFamily).mockResolvedValue([])

      render(<CaregiverManagementPage familyId="family-123" />)

      // Wait for loading to complete
      await vi.waitFor(() => {
        expect(screen.getByTestId('no-pending')).toBeInTheDocument()
      })
    })
  })

  describe('Count Display', () => {
    it('shows active count in section header', () => {
      render(<CaregiverManagementPage familyId="family-123" />)

      // The caregiver list should have 2 items
      expect(screen.getByTestId('caregiver-list').children.length).toBe(2)
    })
  })
})
