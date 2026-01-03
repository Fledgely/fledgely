/**
 * Tests for CaregiverExtensionNotification component.
 *
 * Story 39.4: Caregiver PIN for Time Extension
 *
 * Tests cover:
 * - AC6: Child Notification
 *   - Notification displays caregiver name and extension amount
 *   - Notification shows new time balance
 *   - Notification uses friendly language
 *   - Notification can be dismissed
 *   - Accessibility compliance
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  CaregiverExtensionNotification,
  type CaregiverExtensionNotificationData,
} from './CaregiverExtensionNotification'

const createMockNotification = (
  overrides: Partial<CaregiverExtensionNotificationData> = {}
): CaregiverExtensionNotificationData => ({
  id: 'notification-123',
  type: 'caregiver_extension',
  caregiverUid: 'caregiver-uid-123',
  caregiverName: 'Grandma',
  extensionMinutes: 30,
  newTimeBalanceMinutes: 60,
  message: 'Grandma gave you 30 more minutes!',
  createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
  read: false,
  ...overrides,
})

describe('CaregiverExtensionNotification', () => {
  describe('Rendering', () => {
    it('renders notification container', () => {
      render(<CaregiverExtensionNotification notification={createMockNotification()} />)

      expect(screen.getByTestId('caregiver-extension-notification')).toBeInTheDocument()
    })

    it('renders notification title', () => {
      render(<CaregiverExtensionNotification notification={createMockNotification()} />)

      expect(screen.getByTestId('notification-title')).toHaveTextContent('Extra Time Granted!')
    })

    it('renders caregiver name in message', () => {
      render(<CaregiverExtensionNotification notification={createMockNotification()} />)

      const message = screen.getByTestId('notification-message')
      expect(message.textContent).toContain('Grandma')
    })

    it('renders extension amount in message', () => {
      render(<CaregiverExtensionNotification notification={createMockNotification()} />)

      const message = screen.getByTestId('notification-message')
      expect(message.textContent).toContain('30 minutes')
    })

    it('renders new balance badge', () => {
      render(<CaregiverExtensionNotification notification={createMockNotification()} />)

      expect(screen.getByTestId('new-balance-badge')).toBeInTheDocument()
    })

    it('renders time ago', () => {
      render(<CaregiverExtensionNotification notification={createMockNotification()} />)

      expect(screen.getByTestId('notification-time')).toBeInTheDocument()
    })
  })

  describe('Extension Display (AC6)', () => {
    it('displays extension minutes correctly', () => {
      render(
        <CaregiverExtensionNotification
          notification={createMockNotification({
            extensionMinutes: 15,
          })}
        />
      )

      const message = screen.getByTestId('notification-message')
      expect(message.textContent).toContain('15 minutes')
    })

    it('displays singular minute for 1 minute extension', () => {
      render(
        <CaregiverExtensionNotification
          notification={createMockNotification({
            extensionMinutes: 1,
          })}
        />
      )

      const message = screen.getByTestId('notification-message')
      expect(message.textContent).toContain('1 minute')
      expect(message.textContent).not.toContain('minutes')
    })

    it('displays hours for 60+ minute extensions', () => {
      render(
        <CaregiverExtensionNotification
          notification={createMockNotification({
            extensionMinutes: 60,
          })}
        />
      )

      const message = screen.getByTestId('notification-message')
      expect(message.textContent).toContain('1 hour')
    })

    it('displays hours and minutes for mixed extensions', () => {
      render(
        <CaregiverExtensionNotification
          notification={createMockNotification({
            extensionMinutes: 90,
          })}
        />
      )

      const message = screen.getByTestId('notification-message')
      expect(message.textContent).toContain('1h 30m')
    })

    it('displays new time balance in badge', () => {
      render(
        <CaregiverExtensionNotification
          notification={createMockNotification({
            newTimeBalanceMinutes: 45,
          })}
        />
      )

      const badge = screen.getByTestId('new-balance-badge')
      expect(badge.textContent).toContain('45 minutes')
    })

    it('displays different caregiver names', () => {
      render(
        <CaregiverExtensionNotification
          notification={createMockNotification({
            caregiverName: 'Aunt Sarah',
          })}
        />
      )

      const message = screen.getByTestId('notification-message')
      expect(message.textContent).toContain('Aunt Sarah')
    })
  })

  describe('Dismiss Functionality', () => {
    it('shows dismiss button when onDismiss provided', () => {
      const onDismiss = vi.fn()
      render(
        <CaregiverExtensionNotification
          notification={createMockNotification()}
          onDismiss={onDismiss}
        />
      )

      expect(screen.getByTestId('dismiss-button')).toBeInTheDocument()
    })

    it('hides dismiss button when onDismiss not provided', () => {
      render(<CaregiverExtensionNotification notification={createMockNotification()} />)

      expect(screen.queryByTestId('dismiss-button')).not.toBeInTheDocument()
    })

    it('calls onDismiss with notification id when clicked', () => {
      const onDismiss = vi.fn()
      render(
        <CaregiverExtensionNotification
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
        <CaregiverExtensionNotification
          notification={createMockNotification({
            createdAt: new Date(Date.now() - 30 * 1000), // 30 seconds ago
          })}
        />
      )

      expect(screen.getByTestId('notification-time').textContent).toBe('Just now')
    })

    it('shows minutes ago for recent notifications', () => {
      render(
        <CaregiverExtensionNotification
          notification={createMockNotification({
            createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
          })}
        />
      )

      expect(screen.getByTestId('notification-time').textContent).toBe('5 minutes ago')
    })

    it('shows singular minute for 1 minute', () => {
      render(
        <CaregiverExtensionNotification
          notification={createMockNotification({
            createdAt: new Date(Date.now() - 1 * 60 * 1000), // 1 minute ago
          })}
        />
      )

      expect(screen.getByTestId('notification-time').textContent).toBe('1 minute ago')
    })

    it('shows hours ago for older notifications', () => {
      render(
        <CaregiverExtensionNotification
          notification={createMockNotification({
            createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
          })}
        />
      )

      expect(screen.getByTestId('notification-time').textContent).toBe('3 hours ago')
    })

    it('shows days ago for very old notifications', () => {
      render(
        <CaregiverExtensionNotification
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
      render(<CaregiverExtensionNotification notification={createMockNotification()} />)

      const container = screen.getByTestId('caregiver-extension-notification')
      expect(container).toHaveAttribute('role', 'alert')
    })

    it('has aria-live="polite"', () => {
      render(<CaregiverExtensionNotification notification={createMockNotification()} />)

      const container = screen.getByTestId('caregiver-extension-notification')
      expect(container).toHaveAttribute('aria-live', 'polite')
    })

    it('dismiss button has aria-label', () => {
      render(
        <CaregiverExtensionNotification
          notification={createMockNotification()}
          onDismiss={vi.fn()}
        />
      )

      const dismissButton = screen.getByTestId('dismiss-button')
      expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss notification')
    })

    it('emoji icon is hidden from screen readers', () => {
      const { container } = render(
        <CaregiverExtensionNotification notification={createMockNotification()} />
      )

      const icon = container.querySelector('[aria-hidden="true"]')
      expect(icon).toBeInTheDocument()
    })
  })

  describe('Data Attributes', () => {
    it('includes notification id in data attribute', () => {
      render(
        <CaregiverExtensionNotification
          notification={createMockNotification({ id: 'notif-789' })}
        />
      )

      const container = screen.getByTestId('caregiver-extension-notification')
      expect(container).toHaveAttribute('data-notification-id', 'notif-789')
    })
  })

  describe('Touch Targets (NFR49)', () => {
    it('dismiss button has min size of 44px', () => {
      render(
        <CaregiverExtensionNotification
          notification={createMockNotification()}
          onDismiss={vi.fn()}
        />
      )

      const button = screen.getByTestId('dismiss-button')
      expect(button).toHaveStyle({ minWidth: '44px', minHeight: '44px' })
    })
  })
})
