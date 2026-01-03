/**
 * Tests for CaregiverAddedNotification component.
 *
 * Story 39.1: Caregiver Account Creation
 *
 * Tests cover:
 * - AC4: Child Notification
 *   - Notification displays caregiver name and relationship
 *   - Notification uses friendly language
 *   - Notification can be dismissed
 *   - Accessibility compliance
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  CaregiverAddedNotification,
  type CaregiverAddedNotificationData,
} from './CaregiverAddedNotification'

const createMockNotification = (
  overrides: Partial<CaregiverAddedNotificationData> = {}
): CaregiverAddedNotificationData => ({
  id: 'notification-123',
  type: 'caregiver_added',
  caregiverUid: 'caregiver-uid-123',
  caregiverName: 'Grandpa Joe',
  caregiverRelationship: 'grandparent',
  customRelationship: null,
  message: 'Grandpa Joe (Grandparent) has been added as a caregiver',
  createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
  read: false,
  ...overrides,
})

describe('CaregiverAddedNotification', () => {
  describe('Rendering', () => {
    it('renders notification container', () => {
      render(<CaregiverAddedNotification notification={createMockNotification()} />)

      expect(screen.getByTestId('caregiver-added-notification')).toBeInTheDocument()
    })

    it('renders notification title', () => {
      render(<CaregiverAddedNotification notification={createMockNotification()} />)

      expect(screen.getByTestId('notification-title')).toHaveTextContent('New Caregiver Added')
    })

    it('renders caregiver name in message', () => {
      render(<CaregiverAddedNotification notification={createMockNotification()} />)

      const message = screen.getByTestId('notification-message')
      expect(message.textContent).toContain('Grandpa Joe')
    })

    it('renders relationship in message', () => {
      render(<CaregiverAddedNotification notification={createMockNotification()} />)

      const message = screen.getByTestId('notification-message')
      expect(message.textContent).toContain('Grandparent')
    })

    it('renders time ago', () => {
      render(<CaregiverAddedNotification notification={createMockNotification()} />)

      expect(screen.getByTestId('notification-time')).toBeInTheDocument()
    })
  })

  describe('Relationship Display (AC4)', () => {
    it('displays grandparent relationship', () => {
      render(
        <CaregiverAddedNotification
          notification={createMockNotification({
            caregiverRelationship: 'grandparent',
          })}
        />
      )

      const message = screen.getByTestId('notification-message')
      expect(message.textContent).toContain('Grandparent')
    })

    it('displays aunt/uncle relationship', () => {
      render(
        <CaregiverAddedNotification
          notification={createMockNotification({
            caregiverName: 'Aunt Sarah',
            caregiverRelationship: 'aunt_uncle',
          })}
        />
      )

      const message = screen.getByTestId('notification-message')
      expect(message.textContent).toContain('Aunt Sarah')
      expect(message.textContent).toContain('Aunt/Uncle')
    })

    it('displays babysitter relationship', () => {
      render(
        <CaregiverAddedNotification
          notification={createMockNotification({
            caregiverName: 'Mary',
            caregiverRelationship: 'babysitter',
          })}
        />
      )

      const message = screen.getByTestId('notification-message')
      expect(message.textContent).toContain('Mary')
      expect(message.textContent).toContain('Babysitter')
    })

    it('displays custom relationship for other type', () => {
      render(
        <CaregiverAddedNotification
          notification={createMockNotification({
            caregiverName: 'Mrs. Smith',
            caregiverRelationship: 'other',
            customRelationship: 'Trusted Neighbor',
          })}
        />
      )

      const message = screen.getByTestId('notification-message')
      expect(message.textContent).toContain('Mrs. Smith')
      expect(message.textContent).toContain('Trusted Neighbor')
    })

    it('defaults to Caregiver for other without custom text', () => {
      render(
        <CaregiverAddedNotification
          notification={createMockNotification({
            caregiverName: 'Someone',
            caregiverRelationship: 'other',
            customRelationship: null,
          })}
        />
      )

      const message = screen.getByTestId('notification-message')
      expect(message.textContent).toContain('Someone')
      expect(message.textContent).toContain('Caregiver')
    })
  })

  describe('Dismiss Functionality', () => {
    it('shows dismiss button when onDismiss provided', () => {
      const onDismiss = vi.fn()
      render(
        <CaregiverAddedNotification notification={createMockNotification()} onDismiss={onDismiss} />
      )

      expect(screen.getByTestId('dismiss-button')).toBeInTheDocument()
    })

    it('hides dismiss button when onDismiss not provided', () => {
      render(<CaregiverAddedNotification notification={createMockNotification()} />)

      expect(screen.queryByTestId('dismiss-button')).not.toBeInTheDocument()
    })

    it('calls onDismiss with notification id when clicked', () => {
      const onDismiss = vi.fn()
      render(
        <CaregiverAddedNotification
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
        <CaregiverAddedNotification
          notification={createMockNotification({
            createdAt: new Date(Date.now() - 30 * 1000), // 30 seconds ago
          })}
        />
      )

      expect(screen.getByTestId('notification-time').textContent).toBe('Just now')
    })

    it('shows minutes ago for recent notifications', () => {
      render(
        <CaregiverAddedNotification
          notification={createMockNotification({
            createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
          })}
        />
      )

      expect(screen.getByTestId('notification-time').textContent).toBe('5 minutes ago')
    })

    it('shows singular minute for 1 minute', () => {
      render(
        <CaregiverAddedNotification
          notification={createMockNotification({
            createdAt: new Date(Date.now() - 1 * 60 * 1000), // 1 minute ago
          })}
        />
      )

      expect(screen.getByTestId('notification-time').textContent).toBe('1 minute ago')
    })

    it('shows hours ago for older notifications', () => {
      render(
        <CaregiverAddedNotification
          notification={createMockNotification({
            createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
          })}
        />
      )

      expect(screen.getByTestId('notification-time').textContent).toBe('3 hours ago')
    })

    it('shows days ago for very old notifications', () => {
      render(
        <CaregiverAddedNotification
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
      render(<CaregiverAddedNotification notification={createMockNotification()} />)

      const container = screen.getByTestId('caregiver-added-notification')
      expect(container).toHaveAttribute('role', 'alert')
    })

    it('has aria-live="polite"', () => {
      render(<CaregiverAddedNotification notification={createMockNotification()} />)

      const container = screen.getByTestId('caregiver-added-notification')
      expect(container).toHaveAttribute('aria-live', 'polite')
    })

    it('dismiss button has aria-label', () => {
      render(
        <CaregiverAddedNotification notification={createMockNotification()} onDismiss={vi.fn()} />
      )

      const dismissButton = screen.getByTestId('dismiss-button')
      expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss notification')
    })

    it('emoji icon is hidden from screen readers', () => {
      const { container } = render(
        <CaregiverAddedNotification notification={createMockNotification()} />
      )

      const icon = container.querySelector('[aria-hidden="true"]')
      expect(icon).toBeInTheDocument()
    })
  })

  describe('Data Attributes', () => {
    it('includes notification id in data attribute', () => {
      render(
        <CaregiverAddedNotification notification={createMockNotification({ id: 'notif-789' })} />
      )

      const container = screen.getByTestId('caregiver-added-notification')
      expect(container).toHaveAttribute('data-notification-id', 'notif-789')
    })
  })
})
