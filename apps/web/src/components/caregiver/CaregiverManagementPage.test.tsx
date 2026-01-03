/**
 * Tests for CaregiverManagementPage component.
 *
 * Story 39.1: Caregiver Account Creation
 * Story 39.2: Caregiver Permission Configuration
 * Story 39.3: Temporary Caregiver Access
 *
 * Tests cover:
 * - AC5: Caregiver List Display
 *   - Shows list of all caregivers with name, relationship, status
 *   - Shows pending invitations separately
 *   - Shows count: "3 of 5 caregivers"
 * - Story 39.3: Temporary Access
 *   - Grant Access button on each caregiver card
 *   - TemporaryAccessGrantForm modal
 *   - TemporaryAccessList section
 *   - Active temporary access indicators
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CaregiverManagementPage from './CaregiverManagementPage'

// Mock Firestore
const mockOnSnapshot = vi.fn()
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  onSnapshot: (...args: unknown[]) => {
    mockOnSnapshot(...args)
    return vi.fn() // unsubscribe function
  },
  orderBy: vi.fn(),
}))

vi.mock('../../lib/firebase', () => ({
  db: {},
}))

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

// Mock child components
vi.mock('./CaregiverInviteForm', () => ({
  default: ({ onCancel }: { onCancel: () => void }) => (
    <div data-testid="mock-invite-form">
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}))

vi.mock('./CaregiverPermissionEditor', () => ({
  default: ({ onCancel }: { onCancel: () => void }) => (
    <div data-testid="mock-permission-editor">
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}))

vi.mock('./TemporaryAccessGrantForm', () => ({
  default: ({ onCancel, caregiverName }: { onCancel: () => void; caregiverName: string }) => (
    <div data-testid="mock-grant-form">
      <span data-testid="grant-form-caregiver">{caregiverName}</span>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}))

vi.mock('./TemporaryAccessList', () => ({
  default: ({ grants }: { grants: unknown[] }) => (
    <div data-testid="mock-access-list">
      <span data-testid="grants-count">{grants.length}</span>
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

  describe('Story 39.3: Temporary Access', () => {
    it('shows Grant Access button for each caregiver', () => {
      render(<CaregiverManagementPage familyId="family-123" />)

      expect(screen.getByTestId('grant-access-caregiver-1')).toBeInTheDocument()
      expect(screen.getByTestId('grant-access-caregiver-2')).toBeInTheDocument()
    })

    it('opens grant form modal when Grant Access clicked', () => {
      render(<CaregiverManagementPage familyId="family-123" />)

      fireEvent.click(screen.getByTestId('grant-access-caregiver-1'))

      expect(screen.getByTestId('grant-access-modal')).toBeInTheDocument()
      expect(screen.getByTestId('mock-grant-form')).toBeInTheDocument()
    })

    it('passes caregiver name to grant form', () => {
      render(<CaregiverManagementPage familyId="family-123" />)

      fireEvent.click(screen.getByTestId('grant-access-caregiver-1'))

      expect(screen.getByTestId('grant-form-caregiver')).toHaveTextContent('Grandpa Joe')
    })

    it('closes grant form modal when cancel clicked', () => {
      render(<CaregiverManagementPage familyId="family-123" />)

      fireEvent.click(screen.getByTestId('grant-access-caregiver-1'))
      expect(screen.getByTestId('grant-access-modal')).toBeInTheDocument()

      fireEvent.click(screen.getByText('Cancel'))
      expect(screen.queryByTestId('grant-access-modal')).not.toBeInTheDocument()
    })

    it('subscribes to temporary grants on mount', () => {
      render(<CaregiverManagementPage familyId="family-123" />)

      expect(mockOnSnapshot).toHaveBeenCalled()
    })

    it('shows temporary access list when grants exist', () => {
      // Simulate grants being received via onSnapshot
      mockOnSnapshot.mockImplementation((_query, callback) => {
        callback({
          docs: [
            {
              id: 'grant-1',
              data: () => ({
                familyId: 'family-123',
                caregiverUid: 'caregiver-1',
                grantedByUid: 'parent-1',
                startAt: { toDate: () => new Date() },
                endAt: { toDate: () => new Date(Date.now() + 3600000) },
                preset: 'today_only',
                timezone: 'UTC',
                status: 'active',
                createdAt: { toDate: () => new Date() },
              }),
            },
          ],
        })
        return vi.fn()
      })

      render(<CaregiverManagementPage familyId="family-123" />)

      expect(screen.getByTestId('temporary-access-section')).toBeInTheDocument()
      expect(screen.getByTestId('mock-access-list')).toBeInTheDocument()
    })

    it('shows active temp access indicator on caregiver card', () => {
      const now = new Date()
      mockOnSnapshot.mockImplementation((_query, callback) => {
        callback({
          docs: [
            {
              id: 'grant-1',
              data: () => ({
                familyId: 'family-123',
                caregiverUid: 'caregiver-1',
                grantedByUid: 'parent-1',
                startAt: { toDate: () => new Date(now.getTime() - 60000) }, // 1 min ago
                endAt: { toDate: () => new Date(now.getTime() + 3600000) }, // 1 hour from now
                preset: 'today_only',
                timezone: 'UTC',
                status: 'active',
                createdAt: { toDate: () => new Date() },
              }),
            },
          ],
        })
        return vi.fn()
      })

      render(<CaregiverManagementPage familyId="family-123" />)

      expect(screen.getByTestId('temp-access-caregiver-1')).toBeInTheDocument()
      expect(screen.getByText('⏱️ Temp Access')).toBeInTheDocument()
    })

    it('does not show temp access indicator for inactive grants', () => {
      mockOnSnapshot.mockImplementation((_query, callback) => {
        callback({
          docs: [
            {
              id: 'grant-1',
              data: () => ({
                familyId: 'family-123',
                caregiverUid: 'caregiver-1',
                grantedByUid: 'parent-1',
                startAt: { toDate: () => new Date(Date.now() - 7200000) }, // 2 hours ago
                endAt: { toDate: () => new Date(Date.now() - 3600000) }, // 1 hour ago (expired)
                preset: 'today_only',
                timezone: 'UTC',
                status: 'expired',
                createdAt: { toDate: () => new Date() },
              }),
            },
          ],
        })
        return vi.fn()
      })

      render(<CaregiverManagementPage familyId="family-123" />)

      expect(screen.queryByTestId('temp-access-caregiver-1')).not.toBeInTheDocument()
    })
  })
})
