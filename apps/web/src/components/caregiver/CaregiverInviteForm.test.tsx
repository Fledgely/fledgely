/**
 * Tests for CaregiverInviteForm component.
 *
 * Story 19D.1: Caregiver Invitation & Onboarding
 *
 * Tests cover:
 * - AC1: Parent invites a caregiver from family settings
 * - AC2: Caregiver role is "Status Viewer"
 * - AC5: Parent can set which children caregiver can see
 * - Email validation
 * - Form submission
 * - Error and success states
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CaregiverInviteForm from './CaregiverInviteForm'

// Mock the hooks and services
vi.mock('../../hooks/useChildren', () => ({
  useChildren: vi.fn(),
}))

vi.mock('../../services/caregiverInvitationService', () => ({
  sendCaregiverInvitation: vi.fn(),
  isValidEmail: vi.fn((email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
}))

import { useChildren } from '../../hooks/useChildren'
import { sendCaregiverInvitation } from '../../services/caregiverInvitationService'

const mockChildren = [
  { id: 'child-1', name: 'Emma', photoURL: null },
  { id: 'child-2', name: 'Jack', photoURL: null },
  { id: 'child-3', name: 'Lily', photoURL: null },
]

describe('CaregiverInviteForm', () => {
  const mockOnSuccess = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useChildren).mockReturnValue({
      children: mockChildren,
      loading: false,
      error: null,
    })
  })

  describe('Rendering', () => {
    it('renders the form with title', () => {
      render(<CaregiverInviteForm familyId="family-123" />)

      expect(screen.getByText('Invite a Status Viewer')).toBeInTheDocument()
    })

    it('renders email input field', () => {
      render(<CaregiverInviteForm familyId="family-123" />)

      expect(screen.getByTestId('email-input')).toBeInTheDocument()
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    })

    it('renders child selection checkboxes (AC5)', () => {
      render(<CaregiverInviteForm familyId="family-123" />)

      expect(screen.getByTestId('child-item-child-1')).toBeInTheDocument()
      expect(screen.getByTestId('child-item-child-2')).toBeInTheDocument()
      expect(screen.getByTestId('child-item-child-3')).toBeInTheDocument()
    })

    it('renders select all button', () => {
      render(<CaregiverInviteForm familyId="family-123" />)

      expect(screen.getByTestId('select-all-button')).toBeInTheDocument()
    })

    it('renders submit button', () => {
      render(<CaregiverInviteForm familyId="family-123" />)

      expect(screen.getByTestId('submit-button')).toBeInTheDocument()
      expect(screen.getByTestId('submit-button')).toHaveTextContent('Send Invitation')
    })

    it('renders cancel button when onCancel is provided', () => {
      render(<CaregiverInviteForm familyId="family-123" onCancel={mockOnCancel} />)

      expect(screen.getByTestId('cancel-button')).toBeInTheDocument()
    })

    it('shows Status Viewer explanation (AC2)', () => {
      render(<CaregiverInviteForm familyId="family-123" />)

      expect(screen.getByText(/status viewer access means/i)).toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('shows loading when children are loading', () => {
      vi.mocked(useChildren).mockReturnValue({
        children: [],
        loading: true,
        error: null,
      })

      render(<CaregiverInviteForm familyId="family-123" />)

      expect(screen.getByTestId('loading-children')).toBeInTheDocument()
    })

    it('shows error when children fail to load', () => {
      vi.mocked(useChildren).mockReturnValue({
        children: [],
        loading: false,
        error: 'Failed to load children',
      })

      render(<CaregiverInviteForm familyId="family-123" />)

      expect(screen.getByText('Failed to load children')).toBeInTheDocument()
    })
  })

  describe('Email Validation', () => {
    it('shows error for invalid email format', () => {
      render(<CaregiverInviteForm familyId="family-123" />)

      const emailInput = screen.getByTestId('email-input')
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } })

      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
    })

    it('clears error for valid email format', () => {
      render(<CaregiverInviteForm familyId="family-123" />)

      const emailInput = screen.getByTestId('email-input')

      // Enter invalid email first
      fireEvent.change(emailInput, { target: { value: 'invalid' } })
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()

      // Then enter valid email
      fireEvent.change(emailInput, { target: { value: 'valid@example.com' } })
      expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument()
    })
  })

  describe('Child Selection (AC5)', () => {
    it('allows selecting individual children', () => {
      render(<CaregiverInviteForm familyId="family-123" />)

      const childCheckbox = screen.getByTestId('child-checkbox-child-1')
      fireEvent.click(childCheckbox)

      expect(childCheckbox).toBeChecked()
    })

    it('allows deselecting children', () => {
      render(<CaregiverInviteForm familyId="family-123" />)

      const childCheckbox = screen.getByTestId('child-checkbox-child-1')

      // Select
      fireEvent.click(childCheckbox)
      expect(childCheckbox).toBeChecked()

      // Deselect
      fireEvent.click(childCheckbox)
      expect(childCheckbox).not.toBeChecked()
    })

    it('select all button selects all children', () => {
      render(<CaregiverInviteForm familyId="family-123" />)

      const selectAllButton = screen.getByTestId('select-all-button')
      fireEvent.click(selectAllButton)

      expect(screen.getByTestId('child-checkbox-child-1')).toBeChecked()
      expect(screen.getByTestId('child-checkbox-child-2')).toBeChecked()
      expect(screen.getByTestId('child-checkbox-child-3')).toBeChecked()
    })

    it('select all button deselects all when all are selected', () => {
      render(<CaregiverInviteForm familyId="family-123" />)

      const selectAllButton = screen.getByTestId('select-all-button')

      // Select all
      fireEvent.click(selectAllButton)
      expect(screen.getByTestId('child-checkbox-child-1')).toBeChecked()

      // Deselect all
      fireEvent.click(selectAllButton)
      expect(screen.getByTestId('child-checkbox-child-1')).not.toBeChecked()
    })
  })

  describe('Form Submission', () => {
    it('disables submit when email is empty', () => {
      render(<CaregiverInviteForm familyId="family-123" />)

      const submitButton = screen.getByTestId('submit-button')
      expect(submitButton).toBeDisabled()
    })

    it('disables submit when no children are selected', () => {
      render(<CaregiverInviteForm familyId="family-123" />)

      const emailInput = screen.getByTestId('email-input')
      fireEvent.change(emailInput, { target: { value: 'grandpa@example.com' } })

      const submitButton = screen.getByTestId('submit-button')
      expect(submitButton).toBeDisabled()
    })

    it('enables submit when email is valid and children are selected', () => {
      render(<CaregiverInviteForm familyId="family-123" />)

      const emailInput = screen.getByTestId('email-input')
      fireEvent.change(emailInput, { target: { value: 'grandpa@example.com' } })

      const childCheckbox = screen.getByTestId('child-checkbox-child-1')
      fireEvent.click(childCheckbox)

      const submitButton = screen.getByTestId('submit-button')
      expect(submitButton).not.toBeDisabled()
    })

    it('calls sendCaregiverInvitation on submit', async () => {
      vi.mocked(sendCaregiverInvitation).mockResolvedValue({
        success: true,
        invitationId: 'inv-123',
        message: 'Invitation sent!',
      })

      render(<CaregiverInviteForm familyId="family-123" onSuccess={mockOnSuccess} />)

      const emailInput = screen.getByTestId('email-input')
      fireEvent.change(emailInput, { target: { value: 'grandpa@example.com' } })

      const childCheckbox = screen.getByTestId('child-checkbox-child-1')
      fireEvent.click(childCheckbox)

      const submitButton = screen.getByTestId('submit-button')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(sendCaregiverInvitation).toHaveBeenCalledWith('family-123', 'grandpa@example.com', [
          'child-1',
        ])
      })
    })

    it('calls onSuccess callback on successful submission', async () => {
      vi.mocked(sendCaregiverInvitation).mockResolvedValue({
        success: true,
        invitationId: 'inv-123',
        message: 'Invitation sent!',
      })

      render(<CaregiverInviteForm familyId="family-123" onSuccess={mockOnSuccess} />)

      const emailInput = screen.getByTestId('email-input')
      fireEvent.change(emailInput, { target: { value: 'grandpa@example.com' } })

      fireEvent.click(screen.getByTestId('child-checkbox-child-1'))
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith('inv-123')
      })
    })

    it('shows success message on successful submission', async () => {
      vi.mocked(sendCaregiverInvitation).mockResolvedValue({
        success: true,
        invitationId: 'inv-123',
        message: 'Invitation sent!',
      })

      render(<CaregiverInviteForm familyId="family-123" />)

      const emailInput = screen.getByTestId('email-input')
      fireEvent.change(emailInput, { target: { value: 'grandpa@example.com' } })

      fireEvent.click(screen.getByTestId('child-checkbox-child-1'))
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toBeInTheDocument()
      })
    })

    it('shows error message on failed submission', async () => {
      vi.mocked(sendCaregiverInvitation).mockResolvedValue({
        success: false,
        message: 'This email is already a caregiver',
      })

      render(<CaregiverInviteForm familyId="family-123" />)

      const emailInput = screen.getByTestId('email-input')
      fireEvent.change(emailInput, { target: { value: 'grandpa@example.com' } })

      fireEvent.click(screen.getByTestId('child-checkbox-child-1'))
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument()
        expect(screen.getByText(/this email is already a caregiver/i)).toBeInTheDocument()
      })
    })

    it('shows loading state while submitting', async () => {
      vi.mocked(sendCaregiverInvitation).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ success: true, invitationId: 'inv-123', message: 'Sent!' }),
              100
            )
          )
      )

      render(<CaregiverInviteForm familyId="family-123" />)

      const emailInput = screen.getByTestId('email-input')
      fireEvent.change(emailInput, { target: { value: 'grandpa@example.com' } })

      fireEvent.click(screen.getByTestId('child-checkbox-child-1'))
      fireEvent.click(screen.getByTestId('submit-button'))

      expect(screen.getByText(/sending/i)).toBeInTheDocument()
    })
  })

  describe('Cancel Button', () => {
    it('calls onCancel when cancel is clicked', () => {
      render(<CaregiverInviteForm familyId="family-123" onCancel={mockOnCancel} />)

      fireEvent.click(screen.getByTestId('cancel-button'))

      expect(mockOnCancel).toHaveBeenCalled()
    })
  })
})
