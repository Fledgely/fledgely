/**
 * Tests for CaregiverPermissionEditor component.
 *
 * Story 39.2: Caregiver Permission Configuration
 *
 * Tests cover:
 * - AC1: Permission Toggles display
 * - AC2: Default permissions (most restricted)
 * - AC3: Extend Time Permission toggle
 * - AC4: View Flags Permission toggle
 * - AC5: Changes take effect immediately
 * - NFR49: 44px minimum touch targets
 * - Accessibility compliance
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CaregiverPermissionEditor from './CaregiverPermissionEditor'
import type { CaregiverPermissions } from '@fledgely/shared/contracts'

// Mock Firebase Functions
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => mockUpdatePermissions),
}))

// Mock the callable function
const mockUpdatePermissions = vi.fn()

describe('CaregiverPermissionEditor', () => {
  const defaultProps = {
    familyId: 'family-123',
    caregiverUid: 'caregiver-456',
    caregiverName: 'Grandma',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdatePermissions.mockResolvedValue({
      data: {
        success: true,
        permissions: { canExtendTime: true, canViewFlags: false },
      },
    })
  })

  describe('Rendering', () => {
    it('renders the container', () => {
      render(<CaregiverPermissionEditor {...defaultProps} />)

      expect(screen.getByTestId('caregiver-permission-editor')).toBeInTheDocument()
    })

    it('renders the title', () => {
      render(<CaregiverPermissionEditor {...defaultProps} />)

      expect(screen.getByRole('heading', { name: 'Manage Permissions' })).toBeInTheDocument()
    })

    it('displays caregiver name in subtitle', () => {
      render(<CaregiverPermissionEditor {...defaultProps} />)

      expect(screen.getByText('Grandma')).toBeInTheDocument()
    })

    it('displays description with caregiver name', () => {
      render(<CaregiverPermissionEditor {...defaultProps} />)

      expect(
        screen.getByText(/Configure what Grandma can do. All caregivers can always view status./)
      ).toBeInTheDocument()
    })

    it('renders save button', () => {
      render(<CaregiverPermissionEditor {...defaultProps} />)

      expect(screen.getByTestId('save-button')).toBeInTheDocument()
      expect(screen.getByTestId('save-button')).toHaveTextContent('Save Changes')
    })
  })

  describe('Permission Toggles (AC1)', () => {
    it('renders extend time toggle', () => {
      render(<CaregiverPermissionEditor {...defaultProps} />)

      expect(screen.getByTestId('permission-extend-time')).toBeInTheDocument()
      expect(screen.getByTestId('toggle-extend-time')).toBeInTheDocument()
    })

    it('renders view flags toggle', () => {
      render(<CaregiverPermissionEditor {...defaultProps} />)

      expect(screen.getByTestId('permission-view-flags')).toBeInTheDocument()
      expect(screen.getByTestId('toggle-view-flags')).toBeInTheDocument()
    })

    it('displays extend time label and description', () => {
      render(<CaregiverPermissionEditor {...defaultProps} />)

      expect(screen.getByText('Extend Screen Time')).toBeInTheDocument()
      expect(screen.getByText(/grant extra screen time/)).toBeInTheDocument()
    })

    it('displays view flags label and description', () => {
      render(<CaregiverPermissionEditor {...defaultProps} />)

      expect(screen.getByText('View Flagged Content')).toBeInTheDocument()
      expect(screen.getByText(/see flagged items/)).toBeInTheDocument()
    })
  })

  describe('Default Permissions (AC2)', () => {
    it('defaults canExtendTime to false when no permissions provided', () => {
      render(<CaregiverPermissionEditor {...defaultProps} />)

      const toggle = screen.getByTestId('toggle-extend-time')
      expect(toggle).toHaveAttribute('aria-checked', 'false')
    })

    it('defaults canViewFlags to false when no permissions provided', () => {
      render(<CaregiverPermissionEditor {...defaultProps} />)

      const toggle = screen.getByTestId('toggle-view-flags')
      expect(toggle).toHaveAttribute('aria-checked', 'false')
    })

    it('uses provided current permissions', () => {
      const currentPermissions: CaregiverPermissions = {
        canExtendTime: true,
        canViewFlags: true,
      }

      render(
        <CaregiverPermissionEditor {...defaultProps} currentPermissions={currentPermissions} />
      )

      expect(screen.getByTestId('toggle-extend-time')).toHaveAttribute('aria-checked', 'true')
      expect(screen.getByTestId('toggle-view-flags')).toHaveAttribute('aria-checked', 'true')
    })
  })

  describe('Extend Time Permission Toggle (AC3)', () => {
    it('toggles canExtendTime when clicked', () => {
      render(<CaregiverPermissionEditor {...defaultProps} />)

      const toggle = screen.getByTestId('toggle-extend-time')
      expect(toggle).toHaveAttribute('aria-checked', 'false')

      fireEvent.click(toggle)

      expect(toggle).toHaveAttribute('aria-checked', 'true')
    })

    it('can toggle canExtendTime off', () => {
      const currentPermissions: CaregiverPermissions = {
        canExtendTime: true,
        canViewFlags: false,
      }

      render(
        <CaregiverPermissionEditor {...defaultProps} currentPermissions={currentPermissions} />
      )

      const toggle = screen.getByTestId('toggle-extend-time')
      expect(toggle).toHaveAttribute('aria-checked', 'true')

      fireEvent.click(toggle)

      expect(toggle).toHaveAttribute('aria-checked', 'false')
    })
  })

  describe('View Flags Permission Toggle (AC4)', () => {
    it('toggles canViewFlags when clicked', () => {
      render(<CaregiverPermissionEditor {...defaultProps} />)

      const toggle = screen.getByTestId('toggle-view-flags')
      expect(toggle).toHaveAttribute('aria-checked', 'false')

      fireEvent.click(toggle)

      expect(toggle).toHaveAttribute('aria-checked', 'true')
    })

    it('can toggle canViewFlags off', () => {
      const currentPermissions: CaregiverPermissions = {
        canExtendTime: false,
        canViewFlags: true,
      }

      render(
        <CaregiverPermissionEditor {...defaultProps} currentPermissions={currentPermissions} />
      )

      const toggle = screen.getByTestId('toggle-view-flags')
      expect(toggle).toHaveAttribute('aria-checked', 'true')

      fireEvent.click(toggle)

      expect(toggle).toHaveAttribute('aria-checked', 'false')
    })
  })

  describe('Permission Changes (AC5)', () => {
    it('enables save button when changes are made', () => {
      render(<CaregiverPermissionEditor {...defaultProps} />)

      const saveButton = screen.getByTestId('save-button')
      expect(saveButton).toBeDisabled()

      fireEvent.click(screen.getByTestId('toggle-extend-time'))

      expect(saveButton).not.toBeDisabled()
    })

    it('calls updateCaregiverPermissions on save', async () => {
      render(<CaregiverPermissionEditor {...defaultProps} />)

      fireEvent.click(screen.getByTestId('toggle-extend-time'))
      fireEvent.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        expect(mockUpdatePermissions).toHaveBeenCalledWith({
          familyId: 'family-123',
          caregiverUid: 'caregiver-456',
          permissions: { canExtendTime: true, canViewFlags: false },
        })
      })
    })

    it('shows success message on successful save', async () => {
      render(<CaregiverPermissionEditor {...defaultProps} />)

      fireEvent.click(screen.getByTestId('toggle-extend-time'))
      fireEvent.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toBeInTheDocument()
        expect(screen.getByText('Permissions updated successfully')).toBeInTheDocument()
      })
    })

    it('calls onSuccess callback with updated permissions', async () => {
      const onSuccess = vi.fn()
      render(<CaregiverPermissionEditor {...defaultProps} onSuccess={onSuccess} />)

      fireEvent.click(screen.getByTestId('toggle-extend-time'))
      fireEvent.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith({ canExtendTime: true, canViewFlags: false })
      })
    })

    it('shows error message on failed save', async () => {
      mockUpdatePermissions.mockRejectedValue(new Error('Network error'))

      render(<CaregiverPermissionEditor {...defaultProps} />)

      fireEvent.click(screen.getByTestId('toggle-extend-time'))
      fireEvent.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('disables toggles while saving', async () => {
      // Make the save take some time
      mockUpdatePermissions.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: { success: true, permissions: {} } }), 100)
          )
      )

      render(<CaregiverPermissionEditor {...defaultProps} />)

      fireEvent.click(screen.getByTestId('toggle-extend-time'))
      fireEvent.click(screen.getByTestId('save-button'))

      expect(screen.getByTestId('toggle-extend-time')).toBeDisabled()
      expect(screen.getByTestId('toggle-view-flags')).toBeDisabled()

      await waitFor(() => {
        expect(screen.getByTestId('toggle-extend-time')).not.toBeDisabled()
      })
    })

    it('shows saving text on button while saving', async () => {
      mockUpdatePermissions.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: { success: true, permissions: {} } }), 100)
          )
      )

      render(<CaregiverPermissionEditor {...defaultProps} />)

      fireEvent.click(screen.getByTestId('toggle-extend-time'))
      fireEvent.click(screen.getByTestId('save-button'))

      expect(screen.getByTestId('save-button')).toHaveTextContent('Saving...')

      await waitFor(() => {
        expect(screen.getByTestId('save-button')).toHaveTextContent('Save Changes')
      })
    })
  })

  describe('Cancel Button', () => {
    it('renders cancel button when onCancel provided', () => {
      const onCancel = vi.fn()
      render(<CaregiverPermissionEditor {...defaultProps} onCancel={onCancel} />)

      expect(screen.getByTestId('cancel-button')).toBeInTheDocument()
    })

    it('does not render cancel button when onCancel not provided', () => {
      render(<CaregiverPermissionEditor {...defaultProps} />)

      expect(screen.queryByTestId('cancel-button')).not.toBeInTheDocument()
    })

    it('calls onCancel when clicked', () => {
      const onCancel = vi.fn()
      render(<CaregiverPermissionEditor {...defaultProps} onCancel={onCancel} />)

      fireEvent.click(screen.getByTestId('cancel-button'))

      expect(onCancel).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('toggles have role="switch"', () => {
      render(<CaregiverPermissionEditor {...defaultProps} />)

      const toggles = screen.getAllByRole('switch')
      expect(toggles).toHaveLength(2)
    })

    it('toggles have aria-checked attribute', () => {
      render(<CaregiverPermissionEditor {...defaultProps} />)

      const extendTimeToggle = screen.getByTestId('toggle-extend-time')
      const viewFlagsToggle = screen.getByTestId('toggle-view-flags')

      expect(extendTimeToggle).toHaveAttribute('aria-checked')
      expect(viewFlagsToggle).toHaveAttribute('aria-checked')
    })

    it('toggles have aria-label', () => {
      render(<CaregiverPermissionEditor {...defaultProps} />)

      expect(screen.getByLabelText('Toggle extend time permission')).toBeInTheDocument()
      expect(screen.getByLabelText('Toggle view flags permission')).toBeInTheDocument()
    })

    it('error message has role="alert"', async () => {
      mockUpdatePermissions.mockRejectedValue(new Error('Error'))

      render(<CaregiverPermissionEditor {...defaultProps} />)

      fireEvent.click(screen.getByTestId('toggle-extend-time'))
      fireEvent.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })

    it('success message has role="status"', async () => {
      render(<CaregiverPermissionEditor {...defaultProps} />)

      fireEvent.click(screen.getByTestId('toggle-extend-time'))
      fireEvent.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument()
      })
    })

    it('icon is hidden from screen readers', () => {
      const { container } = render(<CaregiverPermissionEditor {...defaultProps} />)

      const icons = container.querySelectorAll('[aria-hidden="true"]')
      expect(icons.length).toBeGreaterThan(0)
    })
  })

  describe('Touch Targets (NFR49)', () => {
    it('save button has min-height of 44px', () => {
      render(<CaregiverPermissionEditor {...defaultProps} />)

      const saveButton = screen.getByTestId('save-button')
      expect(saveButton).toHaveStyle({ minHeight: '44px' })
    })

    it('cancel button has min-height of 44px', () => {
      render(<CaregiverPermissionEditor {...defaultProps} onCancel={vi.fn()} />)

      const cancelButton = screen.getByTestId('cancel-button')
      expect(cancelButton).toHaveStyle({ minHeight: '44px' })
    })
  })
})
