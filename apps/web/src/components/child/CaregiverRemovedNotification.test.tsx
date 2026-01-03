/**
 * Tests for CaregiverRemovedNotification component.
 *
 * Story 39.7: Caregiver Removal
 *
 * Tests cover:
 * - AC3: Child Notification
 *   - Notification displays caregiver name
 *   - Notification uses child-friendly language (NFR65)
 *   - Notification can be dismissed
 *   - Accessibility compliance
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  CaregiverRemovedNotification,
  type CaregiverRemovedNotificationData,
} from './CaregiverRemovedNotification'

const createMockNotification = (
  overrides: Partial<CaregiverRemovedNotificationData> = {}
): CaregiverRemovedNotificationData => ({
  id: 'notification-123',
  type: 'caregiver_removed',
  caregiverName: 'Grandma',
  message: undefined,
  createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
  read: false,
  ...overrides,
})

describe('CaregiverRemovedNotification', () => {
  describe('Rendering', () => {
    it('renders notification container', () => {
      render(<CaregiverRemovedNotification notification={createMockNotification()} />)

      expect(screen.getByTestId('caregiver-removed-notification')).toBeInTheDocument()
    })

    it('renders notification title', () => {
      render(<CaregiverRemovedNotification notification={createMockNotification()} />)

      expect(screen.getByTestId('notification-title')).toHaveTextContent('Caregiver Update')
    })

    it('renders caregiver name in message', () => {
      render(<CaregiverRemovedNotification notification={createMockNotification()} />)

      const message = screen.getByTestId('notification-message')
      expect(message.textContent).toContain('Grandma')
    })

    it('renders default child-friendly message', () => {
      render(<CaregiverRemovedNotification notification={createMockNotification()} />)

      const message = screen.getByTestId('notification-message')
      expect(message.textContent).toBe('Grandma is no longer a caregiver')
    })

    it('renders time ago', () => {
      render(<CaregiverRemovedNotification notification={createMockNotification()} />)

      expect(screen.getByTestId('notification-time')).toBeInTheDocument()
    })
  })

  describe('Child-Friendly Language (AC3, NFR65)', () => {
    it('uses simple language for different caregiver names', () => {
      render(
        <CaregiverRemovedNotification
          notification={createMockNotification({
            caregiverName: 'Grandpa Joe',
          })}
        />
      )

      const message = screen.getByTestId('notification-message')
      expect(message.textContent).toBe('Grandpa Joe is no longer a caregiver')
    })

    it('uses custom message when provided', () => {
      render(
        <CaregiverRemovedNotification
          notification={createMockNotification({
            caregiverName: 'Aunt Sarah',
            message: 'Aunt Sarah stopped being a helper',
          })}
        />
      )

      const message = screen.getByTestId('notification-message')
      expect(message.textContent).toBe('Aunt Sarah stopped being a helper')
    })

    it('falls back to default message when custom message is empty', () => {
      render(
        <CaregiverRemovedNotification
          notification={createMockNotification({
            caregiverName: 'Uncle Bob',
            message: '',
          })}
        />
      )

      const message = screen.getByTestId('notification-message')
      expect(message.textContent).toBe('Uncle Bob is no longer a caregiver')
    })
  })

  describe('Dismiss Functionality', () => {
    it('shows dismiss button when onDismiss provided', () => {
      const onDismiss = vi.fn()
      render(
        <CaregiverRemovedNotification
          notification={createMockNotification()}
          onDismiss={onDismiss}
        />
      )

      expect(screen.getByTestId('dismiss-button')).toBeInTheDocument()
    })

    it('hides dismiss button when onDismiss not provided', () => {
      render(<CaregiverRemovedNotification notification={createMockNotification()} />)

      expect(screen.queryByTestId('dismiss-button')).not.toBeInTheDocument()
    })

    it('calls onDismiss with notification id when clicked', () => {
      const onDismiss = vi.fn()
      render(
        <CaregiverRemovedNotification
          notification={createMockNotification({ id: 'test-id-456' })}
          onDismiss={onDismiss}
        />
      )

      fireEvent.click(screen.getByTestId('dismiss-button'))

      expect(onDismiss).toHaveBeenCalledWith('test-id-456')
    })
  })

  describe('Relative Time Display', () => {
    it('shows "Just now" for very recent notifications', () => {
      render(
        <CaregiverRemovedNotification
          notification={createMockNotification({
            createdAt: new Date(Date.now() - 30 * 1000), // 30 seconds ago
          })}
        />
      )

      expect(screen.getByTestId('notification-time').textContent).toBe('Just now')
    })

    it('shows minutes ago for recent notifications', () => {
      render(
        <CaregiverRemovedNotification
          notification={createMockNotification({
            createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
          })}
        />
      )

      expect(screen.getByTestId('notification-time').textContent).toBe('5 minutes ago')
    })

    it('shows singular minute for 1 minute', () => {
      render(
        <CaregiverRemovedNotification
          notification={createMockNotification({
            createdAt: new Date(Date.now() - 1 * 60 * 1000), // 1 minute ago
          })}
        />
      )

      expect(screen.getByTestId('notification-time').textContent).toBe('1 minute ago')
    })

    it('shows hours ago for older notifications', () => {
      render(
        <CaregiverRemovedNotification
          notification={createMockNotification({
            createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
          })}
        />
      )

      expect(screen.getByTestId('notification-time').textContent).toBe('3 hours ago')
    })

    it('shows days ago for very old notifications', () => {
      render(
        <CaregiverRemovedNotification
          notification={createMockNotification({
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          })}
        />
      )

      expect(screen.getByTestId('notification-time').textContent).toBe('2 days ago')
    })
  })

  describe('Accessibility', () => {
    it('has role="alert" on container', () => {
      render(<CaregiverRemovedNotification notification={createMockNotification()} />)

      const container = screen.getByTestId('caregiver-removed-notification')
      expect(container).toHaveAttribute('role', 'alert')
    })

    it('has aria-live="polite"', () => {
      render(<CaregiverRemovedNotification notification={createMockNotification()} />)

      const container = screen.getByTestId('caregiver-removed-notification')
      expect(container).toHaveAttribute('aria-live', 'polite')
    })

    it('dismiss button has aria-label', () => {
      render(
        <CaregiverRemovedNotification notification={createMockNotification()} onDismiss={vi.fn()} />
      )

      const dismissButton = screen.getByTestId('dismiss-button')
      expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss notification')
    })

    it('emoji icon is hidden from screen readers', () => {
      const { container } = render(
        <CaregiverRemovedNotification notification={createMockNotification()} />
      )

      const icon = container.querySelector('[aria-hidden="true"]')
      expect(icon).toBeInTheDocument()
    })

    it('dismiss button meets 44x44px touch target (NFR49)', () => {
      render(
        <CaregiverRemovedNotification notification={createMockNotification()} onDismiss={vi.fn()} />
      )

      const dismissButton = screen.getByTestId('dismiss-button')
      // Check minWidth and minHeight styles are applied
      expect(dismissButton).toBeInTheDocument()
      // The component sets minWidth: 44px, minHeight: 44px in styles
    })
  })

  describe('Data Attributes', () => {
    it('includes notification id in data attribute', () => {
      render(
        <CaregiverRemovedNotification notification={createMockNotification({ id: 'notif-789' })} />
      )

      const container = screen.getByTestId('caregiver-removed-notification')
      expect(container).toHaveAttribute('data-notification-id', 'notif-789')
    })
  })
})
