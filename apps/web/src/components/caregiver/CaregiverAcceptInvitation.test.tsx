/**
 * Tests for CaregiverAcceptInvitation component.
 *
 * Story 19D.1: Caregiver Invitation & Onboarding
 *
 * Tests cover:
 * - AC3: Caregiver completes Google Sign-In to accept
 * - AC6: Handles expired/invalid invitation errors
 * - Loading states
 * - Accepting flow
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CaregiverAcceptInvitation from './CaregiverAcceptInvitation'

// Mock the service
vi.mock('../../services/caregiverInvitationService', () => ({
  getCaregiverInvitationByToken: vi.fn(),
  acceptCaregiverInvitation: vi.fn(),
}))

import {
  getCaregiverInvitationByToken,
  acceptCaregiverInvitation,
} from '../../services/caregiverInvitationService'

const mockInvitation = {
  id: 'inv-123',
  familyId: 'family-456',
  inviterUid: 'parent-789',
  inviterName: 'Mom',
  familyName: 'Smith Family',
  token: 'secure-token-abc',
  status: 'pending' as const,
  recipientEmail: 'grandpa@example.com',
  caregiverRole: 'status_viewer' as const,
  childIds: ['child-1', 'child-2'],
  emailSentAt: new Date(),
  acceptedAt: null,
  acceptedByUid: null,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('CaregiverAcceptInvitation', () => {
  const mockOnSignIn = vi.fn()
  const mockOnAccepted = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('shows loading state initially', () => {
      vi.mocked(getCaregiverInvitationByToken).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(
        <CaregiverAcceptInvitation
          token="test-token"
          isAuthenticated={false}
          onSignIn={mockOnSignIn}
          onAccepted={mockOnAccepted}
        />
      )

      expect(screen.getByTestId('accept-invitation-loading')).toBeInTheDocument()
      expect(screen.getByText(/loading invitation/i)).toBeInTheDocument()
    })
  })

  describe('Error States (AC6)', () => {
    it('shows error for not found invitation', async () => {
      vi.mocked(getCaregiverInvitationByToken).mockResolvedValue({
        invitation: null,
        error: 'not-found',
        errorMessage: 'Invitation not found',
      })

      render(
        <CaregiverAcceptInvitation
          token="invalid-token"
          isAuthenticated={false}
          onSignIn={mockOnSignIn}
          onAccepted={mockOnAccepted}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('accept-invitation-error')).toBeInTheDocument()
        expect(screen.getByText(/invitation not found/i)).toBeInTheDocument()
      })
    })

    it('shows error for expired invitation', async () => {
      vi.mocked(getCaregiverInvitationByToken).mockResolvedValue({
        invitation: null,
        error: 'expired',
        errorMessage: 'This invitation has expired',
      })

      render(
        <CaregiverAcceptInvitation
          token="expired-token"
          isAuthenticated={false}
          onSignIn={mockOnSignIn}
          onAccepted={mockOnAccepted}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('accept-invitation-error')).toBeInTheDocument()
        expect(screen.getByText(/invitation expired/i)).toBeInTheDocument()
      })
    })

    it('shows error for revoked invitation', async () => {
      vi.mocked(getCaregiverInvitationByToken).mockResolvedValue({
        invitation: null,
        error: 'revoked',
        errorMessage: 'This invitation has been cancelled',
      })

      render(
        <CaregiverAcceptInvitation
          token="revoked-token"
          isAuthenticated={false}
          onSignIn={mockOnSignIn}
          onAccepted={mockOnAccepted}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('accept-invitation-error')).toBeInTheDocument()
        expect(screen.getByText(/invitation cancelled/i)).toBeInTheDocument()
      })
    })

    it('shows error for already accepted invitation', async () => {
      vi.mocked(getCaregiverInvitationByToken).mockResolvedValue({
        invitation: null,
        error: 'accepted',
        errorMessage: 'This invitation has already been used',
      })

      render(
        <CaregiverAcceptInvitation
          token="used-token"
          isAuthenticated={false}
          onSignIn={mockOnSignIn}
          onAccepted={mockOnAccepted}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('accept-invitation-error')).toBeInTheDocument()
        expect(screen.getByText(/already accepted/i)).toBeInTheDocument()
      })
    })
  })

  describe('Valid Invitation Display', () => {
    beforeEach(() => {
      vi.mocked(getCaregiverInvitationByToken).mockResolvedValue({
        invitation: mockInvitation,
        error: null,
        errorMessage: null,
      })
    })

    it('shows invitation details', async () => {
      render(
        <CaregiverAcceptInvitation
          token="valid-token"
          isAuthenticated={false}
          onSignIn={mockOnSignIn}
          onAccepted={mockOnAccepted}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('accept-invitation-page')).toBeInTheDocument()
        expect(screen.getByTestId('inviter-name')).toHaveTextContent('Mom')
        expect(screen.getByTestId('family-name')).toHaveTextContent('Smith Family')
        expect(screen.getByTestId('role')).toHaveTextContent('Status Viewer')
      })
    })

    it('shows welcome message', async () => {
      render(
        <CaregiverAcceptInvitation
          token="valid-token"
          isAuthenticated={false}
          onSignIn={mockOnSignIn}
          onAccepted={mockOnAccepted}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/you are invited/i)).toBeInTheDocument()
      })
    })

    it('explains what status viewer can do', async () => {
      render(
        <CaregiverAcceptInvitation
          token="valid-token"
          isAuthenticated={false}
          onSignIn={mockOnSignIn}
          onAccepted={mockOnAccepted}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/what you can do/i)).toBeInTheDocument()
        expect(screen.getByText(/view-only role/i)).toBeInTheDocument()
      })
    })
  })

  describe('Authentication Flow (AC3)', () => {
    beforeEach(() => {
      vi.mocked(getCaregiverInvitationByToken).mockResolvedValue({
        invitation: mockInvitation,
        error: null,
        errorMessage: null,
      })
    })

    it('shows Google Sign-In button when not authenticated', async () => {
      render(
        <CaregiverAcceptInvitation
          token="valid-token"
          isAuthenticated={false}
          onSignIn={mockOnSignIn}
          onAccepted={mockOnAccepted}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('sign-in-button')).toBeInTheDocument()
        expect(screen.getByText(/sign in with google/i)).toBeInTheDocument()
      })
    })

    it('calls onSignIn when sign-in button is clicked', async () => {
      render(
        <CaregiverAcceptInvitation
          token="valid-token"
          isAuthenticated={false}
          onSignIn={mockOnSignIn}
          onAccepted={mockOnAccepted}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('sign-in-button')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('sign-in-button'))
      expect(mockOnSignIn).toHaveBeenCalled()
    })

    it('shows Accept button when authenticated', async () => {
      render(
        <CaregiverAcceptInvitation
          token="valid-token"
          isAuthenticated={true}
          onSignIn={mockOnSignIn}
          onAccepted={mockOnAccepted}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('accept-button')).toBeInTheDocument()
        expect(screen.getByText(/accept invitation/i)).toBeInTheDocument()
      })
    })
  })

  describe('Accept Flow', () => {
    beforeEach(() => {
      vi.mocked(getCaregiverInvitationByToken).mockResolvedValue({
        invitation: mockInvitation,
        error: null,
        errorMessage: null,
      })
    })

    it('calls acceptCaregiverInvitation when Accept is clicked', async () => {
      vi.mocked(acceptCaregiverInvitation).mockResolvedValue({
        success: true,
        familyId: 'family-456',
        familyName: 'Smith Family',
        childNames: ['Emma', 'Jack'],
        role: 'status_viewer',
        message: 'Success!',
      })

      render(
        <CaregiverAcceptInvitation
          token="valid-token"
          isAuthenticated={true}
          onSignIn={mockOnSignIn}
          onAccepted={mockOnAccepted}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('accept-button')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('accept-button'))

      await waitFor(() => {
        expect(acceptCaregiverInvitation).toHaveBeenCalledWith('valid-token')
      })
    })

    it('shows accepting state while processing', async () => {
      vi.mocked(acceptCaregiverInvitation).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(
        <CaregiverAcceptInvitation
          token="valid-token"
          isAuthenticated={true}
          onSignIn={mockOnSignIn}
          onAccepted={mockOnAccepted}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('accept-button')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('accept-button'))

      await waitFor(() => {
        expect(screen.getByTestId('accept-invitation-accepting')).toBeInTheDocument()
        expect(screen.getByText(/accepting invitation/i)).toBeInTheDocument()
      })
    })

    it('calls onAccepted with result on success', async () => {
      vi.mocked(acceptCaregiverInvitation).mockResolvedValue({
        success: true,
        familyId: 'family-456',
        familyName: 'Smith Family',
        childNames: ['Emma', 'Jack'],
        role: 'status_viewer',
        message: 'Success!',
      })

      render(
        <CaregiverAcceptInvitation
          token="valid-token"
          isAuthenticated={true}
          onSignIn={mockOnSignIn}
          onAccepted={mockOnAccepted}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('accept-button')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('accept-button'))

      await waitFor(() => {
        expect(mockOnAccepted).toHaveBeenCalledWith({
          familyId: 'family-456',
          familyName: 'Smith Family',
          childNames: ['Emma', 'Jack'],
          role: 'status_viewer',
        })
      })
    })

    it('shows error message on accept failure', async () => {
      vi.mocked(acceptCaregiverInvitation).mockResolvedValue({
        success: false,
        message: 'This invitation has expired',
      })

      render(
        <CaregiverAcceptInvitation
          token="valid-token"
          isAuthenticated={true}
          onSignIn={mockOnSignIn}
          onAccepted={mockOnAccepted}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('accept-button')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('accept-button'))

      await waitFor(() => {
        expect(screen.getByTestId('accept-error')).toBeInTheDocument()
        expect(screen.getByText(/this invitation has expired/i)).toBeInTheDocument()
      })
    })
  })
})
