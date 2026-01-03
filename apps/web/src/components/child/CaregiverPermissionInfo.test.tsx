/**
 * Tests for CaregiverPermissionInfo component.
 *
 * Story 39.2: Caregiver Permission Configuration
 *
 * Tests cover:
 * - AC6: Child sees caregiver permissions in child-friendly language
 *   - "[Name] can see your status" (always displayed)
 *   - "[Name] can give you extra time" (if canExtendTime)
 *   - "[Name] can see flagged items" (if canViewFlags)
 * - Accessibility compliance
 */

import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CaregiverPermissionInfo from './CaregiverPermissionInfo'
import type { CaregiverPermissions } from '@fledgely/shared/contracts'

describe('CaregiverPermissionInfo', () => {
  const defaultProps = {
    caregiverName: 'Grandma',
  }

  describe('Rendering', () => {
    it('renders the container', () => {
      render(<CaregiverPermissionInfo {...defaultProps} />)

      expect(screen.getByTestId('caregiver-permission-info')).toBeInTheDocument()
    })

    it('displays header with caregiver name', () => {
      render(<CaregiverPermissionInfo {...defaultProps} />)

      expect(screen.getByRole('heading', { name: 'What Grandma can do' })).toBeInTheDocument()
    })

    it('renders permission list', () => {
      render(<CaregiverPermissionInfo {...defaultProps} />)

      expect(screen.getByTestId('permission-list')).toBeInTheDocument()
    })
  })

  describe('View Status Permission (Always On)', () => {
    it('always displays view status permission', () => {
      render(<CaregiverPermissionInfo {...defaultProps} />)

      expect(screen.getByTestId('permission-view-status')).toBeInTheDocument()
    })

    it('shows correct text for view status', () => {
      render(<CaregiverPermissionInfo {...defaultProps} />)

      expect(screen.getByText('Grandma can see your status')).toBeInTheDocument()
    })

    it('displays view status even when no permissions provided', () => {
      render(<CaregiverPermissionInfo caregiverName="Uncle Bob" />)

      expect(screen.getByText('Uncle Bob can see your status')).toBeInTheDocument()
    })

    it('displays view status even when permissions are both false', () => {
      const permissions: CaregiverPermissions = {
        canExtendTime: false,
        canViewFlags: false,
      }

      render(<CaregiverPermissionInfo caregiverName="Aunt Sarah" permissions={permissions} />)

      expect(screen.getByText('Aunt Sarah can see your status')).toBeInTheDocument()
    })
  })

  describe('Extend Time Permission (AC6)', () => {
    it('shows extend time when enabled', () => {
      const permissions: CaregiverPermissions = {
        canExtendTime: true,
        canViewFlags: false,
      }

      render(<CaregiverPermissionInfo {...defaultProps} permissions={permissions} />)

      expect(screen.getByTestId('permission-extend-time')).toBeInTheDocument()
      expect(screen.getByText('Grandma can give you extra time')).toBeInTheDocument()
    })

    it('does not show extend time when disabled', () => {
      const permissions: CaregiverPermissions = {
        canExtendTime: false,
        canViewFlags: false,
      }

      render(<CaregiverPermissionInfo {...defaultProps} permissions={permissions} />)

      expect(screen.queryByTestId('permission-extend-time')).not.toBeInTheDocument()
    })

    it('does not show extend time when no permissions provided', () => {
      render(<CaregiverPermissionInfo {...defaultProps} />)

      expect(screen.queryByTestId('permission-extend-time')).not.toBeInTheDocument()
    })
  })

  describe('View Flags Permission (AC6)', () => {
    it('shows view flags when enabled', () => {
      const permissions: CaregiverPermissions = {
        canExtendTime: false,
        canViewFlags: true,
      }

      render(<CaregiverPermissionInfo {...defaultProps} permissions={permissions} />)

      expect(screen.getByTestId('permission-view-flags')).toBeInTheDocument()
      expect(screen.getByText('Grandma can see flagged items')).toBeInTheDocument()
    })

    it('does not show view flags when disabled', () => {
      const permissions: CaregiverPermissions = {
        canExtendTime: false,
        canViewFlags: false,
      }

      render(<CaregiverPermissionInfo {...defaultProps} permissions={permissions} />)

      expect(screen.queryByTestId('permission-view-flags')).not.toBeInTheDocument()
    })

    it('does not show view flags when no permissions provided', () => {
      render(<CaregiverPermissionInfo {...defaultProps} />)

      expect(screen.queryByTestId('permission-view-flags')).not.toBeInTheDocument()
    })
  })

  describe('All Permissions Enabled', () => {
    it('shows all three permissions when both are enabled', () => {
      const permissions: CaregiverPermissions = {
        canExtendTime: true,
        canViewFlags: true,
      }

      render(<CaregiverPermissionInfo {...defaultProps} permissions={permissions} />)

      expect(screen.getByTestId('permission-view-status')).toBeInTheDocument()
      expect(screen.getByTestId('permission-extend-time')).toBeInTheDocument()
      expect(screen.getByTestId('permission-view-flags')).toBeInTheDocument()
    })

    it('shows correct child-friendly text for all permissions', () => {
      const permissions: CaregiverPermissions = {
        canExtendTime: true,
        canViewFlags: true,
      }

      render(<CaregiverPermissionInfo caregiverName="Babysitter Mary" permissions={permissions} />)

      expect(screen.getByText('Babysitter Mary can see your status')).toBeInTheDocument()
      expect(screen.getByText('Babysitter Mary can give you extra time')).toBeInTheDocument()
      expect(screen.getByText('Babysitter Mary can see flagged items')).toBeInTheDocument()
    })
  })

  describe('Caregiver Name Variations', () => {
    it('handles different caregiver names', () => {
      const testCases = ['Grandpa Joe', 'Aunt Lisa', 'Mr. Johnson', 'Coach Mike']

      testCases.forEach((name) => {
        const { unmount } = render(<CaregiverPermissionInfo caregiverName={name} />)

        expect(screen.getByText(`${name} can see your status`)).toBeInTheDocument()

        unmount()
      })
    })
  })

  describe('Accessibility', () => {
    it('has aria-label on container', () => {
      render(<CaregiverPermissionInfo {...defaultProps} />)

      expect(screen.getByTestId('caregiver-permission-info')).toHaveAttribute(
        'aria-label',
        'What Grandma can do'
      )
    })

    it('permission list has role="list"', () => {
      render(<CaregiverPermissionInfo {...defaultProps} />)

      expect(screen.getByTestId('permission-list')).toHaveAttribute('role', 'list')
    })

    it('permission items have role="listitem"', () => {
      const permissions: CaregiverPermissions = {
        canExtendTime: true,
        canViewFlags: true,
      }

      render(<CaregiverPermissionInfo {...defaultProps} permissions={permissions} />)

      expect(screen.getByTestId('permission-view-status')).toHaveAttribute('role', 'listitem')
      expect(screen.getByTestId('permission-extend-time')).toHaveAttribute('role', 'listitem')
      expect(screen.getByTestId('permission-view-flags')).toHaveAttribute('role', 'listitem')
    })

    it('icons are hidden from screen readers', () => {
      const permissions: CaregiverPermissions = {
        canExtendTime: true,
        canViewFlags: true,
      }

      const { container } = render(
        <CaregiverPermissionInfo {...defaultProps} permissions={permissions} />
      )

      const hiddenIcons = container.querySelectorAll('[aria-hidden="true"]')
      expect(hiddenIcons.length).toBeGreaterThanOrEqual(3) // At least 3 icons
    })
  })
})
