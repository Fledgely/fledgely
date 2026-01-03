/**
 * ChildNotificationList Component Tests - Story 39.7, AC3
 *
 * Tests for the child notification list display.
 *
 * Story 39.7 Acceptance Criteria:
 * - AC3: Child notified when caregiver is removed
 * - AC3: Notification uses child-friendly language (NFR65)
 * - AC3: Notification appears in child's activity feed
 *
 * @vitest-environment jsdom
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChildNotificationList, type ChildNotification } from './ChildNotificationList'

describe('ChildNotificationList', () => {
  const mockOnDismiss = vi.fn()

  const mockCaregiverRemovedNotification: ChildNotification = {
    id: 'notif-1',
    type: 'caregiver_removed',
    caregiverName: 'Grandma',
    message: 'Grandma is no longer a caregiver',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    read: false,
  }

  const mockNotifications: ChildNotification[] = [
    mockCaregiverRemovedNotification,
    {
      id: 'notif-2',
      type: 'caregiver_removed',
      caregiverName: 'Uncle Bob',
      message: 'Uncle Bob is no longer a caregiver',
      createdAt: new Date('2024-01-14T10:00:00Z'),
      read: false,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic rendering (AC3)', () => {
    it('renders notification list container', () => {
      render(<ChildNotificationList notifications={mockNotifications} onDismiss={mockOnDismiss} />)

      expect(screen.getByTestId('notification-list')).toBeInTheDocument()
    })

    it('renders "Updates" heading', () => {
      render(<ChildNotificationList notifications={mockNotifications} onDismiss={mockOnDismiss} />)

      expect(screen.getByRole('heading', { name: 'Updates' })).toBeInTheDocument()
    })

    it('renders all notifications', () => {
      render(<ChildNotificationList notifications={mockNotifications} onDismiss={mockOnDismiss} />)

      expect(screen.getByText(/Grandma/)).toBeInTheDocument()
      expect(screen.getByText(/Uncle Bob/)).toBeInTheDocument()
    })

    it('renders notification items list', () => {
      render(<ChildNotificationList notifications={mockNotifications} onDismiss={mockOnDismiss} />)

      expect(screen.getByTestId('notification-items')).toBeInTheDocument()
      expect(screen.getByRole('list')).toBeInTheDocument()
    })
  })

  describe('Loading state', () => {
    it('shows loading indicator when loading', () => {
      render(<ChildNotificationList notifications={[]} loading onDismiss={mockOnDismiss} />)

      expect(screen.getByTestId('notification-list-loading')).toBeInTheDocument()
      expect(screen.getByText('Loading updates...')).toBeInTheDocument()
    })

    it('has loading role and aria-busy', () => {
      render(<ChildNotificationList notifications={[]} loading onDismiss={mockOnDismiss} />)

      const loadingContainer = screen.getByTestId('notification-list-loading')
      expect(loadingContainer).toHaveAttribute('role', 'status')
      expect(loadingContainer).toHaveAttribute('aria-busy', 'true')
    })

    it('does not show notifications when loading', () => {
      render(
        <ChildNotificationList
          notifications={mockNotifications}
          loading
          onDismiss={mockOnDismiss}
        />
      )

      expect(screen.queryByTestId('notification-items')).not.toBeInTheDocument()
    })
  })

  describe('Error state', () => {
    it('shows error message when error provided', () => {
      render(
        <ChildNotificationList
          notifications={[]}
          error="Something went wrong"
          onDismiss={mockOnDismiss}
        />
      )

      expect(screen.getByTestId('notification-list-error')).toBeInTheDocument()
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('has alert role for error', () => {
      render(
        <ChildNotificationList
          notifications={[]}
          error="Something went wrong"
          onDismiss={mockOnDismiss}
        />
      )

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('does not show notifications when error', () => {
      render(
        <ChildNotificationList
          notifications={mockNotifications}
          error="Something went wrong"
          onDismiss={mockOnDismiss}
        />
      )

      expect(screen.queryByTestId('notification-items')).not.toBeInTheDocument()
    })
  })

  describe('Empty state', () => {
    it('shows default empty message when no notifications', () => {
      render(<ChildNotificationList notifications={[]} onDismiss={mockOnDismiss} />)

      expect(screen.getByTestId('notification-list-empty')).toBeInTheDocument()
      expect(screen.getByText('No new updates')).toBeInTheDocument()
    })

    it('shows custom empty message when provided', () => {
      render(
        <ChildNotificationList
          notifications={[]}
          emptyMessage="All caught up!"
          onDismiss={mockOnDismiss}
        />
      )

      expect(screen.getByText('All caught up!')).toBeInTheDocument()
    })

    it('shows empty state when all notifications are read', () => {
      const readNotifications: ChildNotification[] = [
        { ...mockCaregiverRemovedNotification, read: true },
      ]

      render(<ChildNotificationList notifications={readNotifications} onDismiss={mockOnDismiss} />)

      expect(screen.getByTestId('notification-list-empty')).toBeInTheDocument()
    })
  })

  describe('Dismiss functionality', () => {
    it('calls onDismiss when notification is dismissed', () => {
      render(
        <ChildNotificationList
          notifications={[mockCaregiverRemovedNotification]}
          onDismiss={mockOnDismiss}
        />
      )

      const dismissButton = screen.getByTestId('dismiss-button')
      fireEvent.click(dismissButton)

      expect(mockOnDismiss).toHaveBeenCalledWith('notif-1')
    })

    it('hides notification after dismiss (optimistic update)', () => {
      render(
        <ChildNotificationList
          notifications={[mockCaregiverRemovedNotification]}
          onDismiss={mockOnDismiss}
        />
      )

      expect(screen.getByText(/Grandma/)).toBeInTheDocument()

      const dismissButton = screen.getByTestId('dismiss-button')
      fireEvent.click(dismissButton)

      expect(screen.queryByText(/Grandma/)).not.toBeInTheDocument()
      expect(screen.getByTestId('notification-list-empty')).toBeInTheDocument()
    })

    it('can dismiss multiple notifications', () => {
      render(<ChildNotificationList notifications={mockNotifications} onDismiss={mockOnDismiss} />)

      // Dismiss first notification
      const dismissButtons = screen.getAllByTestId('dismiss-button')
      fireEvent.click(dismissButtons[0])

      expect(mockOnDismiss).toHaveBeenCalledWith('notif-1')
      expect(screen.queryByText(/Grandma/)).not.toBeInTheDocument()
      expect(screen.getByText(/Uncle Bob/)).toBeInTheDocument()

      // Dismiss second notification
      const remainingDismiss = screen.getByTestId('dismiss-button')
      fireEvent.click(remainingDismiss)

      expect(mockOnDismiss).toHaveBeenCalledWith('notif-2')
    })
  })

  describe('Accessibility (NFR43)', () => {
    it('renders as accessible list', () => {
      render(<ChildNotificationList notifications={mockNotifications} onDismiss={mockOnDismiss} />)

      const list = screen.getByRole('list')
      expect(list).toHaveAttribute('aria-labelledby', 'notifications-heading')
    })

    it('heading has correct id for aria-labelledby', () => {
      render(<ChildNotificationList notifications={mockNotifications} onDismiss={mockOnDismiss} />)

      const heading = screen.getByRole('heading', { name: 'Updates' })
      expect(heading).toHaveAttribute('id', 'notifications-heading')
    })
  })

  describe('Caregiver removed notifications (AC3)', () => {
    it('renders CaregiverRemovedNotification for caregiver_removed type', () => {
      render(
        <ChildNotificationList
          notifications={[mockCaregiverRemovedNotification]}
          onDismiss={mockOnDismiss}
        />
      )

      expect(screen.getByTestId('caregiver-removed-notification')).toBeInTheDocument()
    })

    it('displays child-friendly message', () => {
      render(
        <ChildNotificationList
          notifications={[mockCaregiverRemovedNotification]}
          onDismiss={mockOnDismiss}
        />
      )

      // The CaregiverRemovedNotification should show the friendly message
      expect(screen.getByText(/no longer a caregiver/i)).toBeInTheDocument()
    })
  })

  describe('Read filtering', () => {
    it('does not show already-read notifications', () => {
      const mixedNotifications: ChildNotification[] = [
        mockCaregiverRemovedNotification,
        { ...mockNotifications[1], read: true },
      ]

      render(<ChildNotificationList notifications={mixedNotifications} onDismiss={mockOnDismiss} />)

      expect(screen.getByText(/Grandma/)).toBeInTheDocument()
      expect(screen.queryByText(/Uncle Bob/)).not.toBeInTheDocument()
    })
  })
})
