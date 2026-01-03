/**
 * Tests for LocationFeaturesNotification Component.
 *
 * Story 40.1: Location-Based Rule Opt-In
 * - AC3: Child Notification (child-friendly language)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  LocationFeaturesNotification,
  type LocationFeaturesNotificationProps,
} from './LocationFeaturesNotification'

describe('LocationFeaturesNotification', () => {
  const defaultProps: LocationFeaturesNotificationProps = {
    type: 'location_features_enabled',
    createdAt: new Date(),
    onDismiss: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the notification', () => {
      render(<LocationFeaturesNotification {...defaultProps} />)
      expect(screen.getByTestId('location-features-notification')).toBeTruthy()
    })

    it('renders with article role', () => {
      render(<LocationFeaturesNotification {...defaultProps} />)
      expect(screen.getByRole('article')).toBeTruthy()
    })

    it('renders dismiss button', () => {
      render(<LocationFeaturesNotification {...defaultProps} />)
      expect(screen.getByTestId('dismiss-button')).toBeTruthy()
    })
  })

  describe('Location Enabled Notification (AC3)', () => {
    it('shows enabled title', () => {
      render(<LocationFeaturesNotification {...defaultProps} type="location_features_enabled" />)
      expect(screen.getByTestId('notification-title').textContent).toBe(
        'Location Features Are Now On'
      )
    })

    it('shows child-friendly enabled message', () => {
      render(<LocationFeaturesNotification {...defaultProps} type="location_features_enabled" />)
      const message = screen.getByTestId('notification-message').textContent
      expect(message).toContain('Your family turned on location features')
      expect(message).toContain('rules might change based on where you are')
    })

    it('uses 6th-grade reading level language (NFR65)', () => {
      render(<LocationFeaturesNotification {...defaultProps} type="location_features_enabled" />)
      const message = screen.getByTestId('notification-message').textContent
      // Check for simple words and short sentences
      expect(message).toContain('at school')
      expect(message).toContain('at home')
    })
  })

  describe('Location Disabled Notification (AC3)', () => {
    it('shows disabled title', () => {
      render(<LocationFeaturesNotification {...defaultProps} type="location_features_disabled" />)
      expect(screen.getByTestId('notification-title').textContent).toBe(
        'Location Features Are Now Off'
      )
    })

    it('shows child-friendly disabled message', () => {
      render(<LocationFeaturesNotification {...defaultProps} type="location_features_disabled" />)
      const message = screen.getByTestId('notification-message').textContent
      expect(message).toContain('Your family turned off location features')
      expect(message).toContain('rules will stay the same')
    })
  })

  describe('Timestamp Display', () => {
    it('shows "Just now" for recent notifications', () => {
      render(<LocationFeaturesNotification {...defaultProps} createdAt={new Date()} />)
      expect(screen.getByTestId('notification-timestamp').textContent).toBe('Just now')
    })

    it('shows "1 hour ago" for 1 hour old notification', () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      render(<LocationFeaturesNotification {...defaultProps} createdAt={oneHourAgo} />)
      expect(screen.getByTestId('notification-timestamp').textContent).toBe('1 hour ago')
    })

    it('shows hours for same-day notification', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000)
      render(<LocationFeaturesNotification {...defaultProps} createdAt={threeHoursAgo} />)
      expect(screen.getByTestId('notification-timestamp').textContent).toBe('3 hours ago')
    })

    it('shows "Yesterday" for 24-48 hour old notification', () => {
      const yesterday = new Date(Date.now() - 30 * 60 * 60 * 1000)
      render(<LocationFeaturesNotification {...defaultProps} createdAt={yesterday} />)
      expect(screen.getByTestId('notification-timestamp').textContent).toBe('Yesterday')
    })
  })

  describe('Dismiss Action', () => {
    it('calls onDismiss when dismiss button clicked', () => {
      const onDismiss = vi.fn()
      render(<LocationFeaturesNotification {...defaultProps} onDismiss={onDismiss} />)

      fireEvent.click(screen.getByTestId('dismiss-button'))
      expect(onDismiss).toHaveBeenCalledTimes(1)
    })

    it('hides notification after dismissing', () => {
      render(<LocationFeaturesNotification {...defaultProps} />)

      fireEvent.click(screen.getByTestId('dismiss-button'))
      expect(screen.queryByTestId('location-features-notification')).toBeNull()
    })

    it('shows "Got It" button text', () => {
      render(<LocationFeaturesNotification {...defaultProps} />)
      expect(screen.getByTestId('dismiss-button').textContent).toBe('Got It')
    })
  })

  describe('Loading State', () => {
    it('disables dismiss button when loading', () => {
      render(<LocationFeaturesNotification {...defaultProps} loading={true} />)
      expect(screen.getByTestId('dismiss-button')).toBeDisabled()
    })

    it('shows loading text', () => {
      render(<LocationFeaturesNotification {...defaultProps} loading={true} />)
      expect(screen.getByTestId('dismiss-button').textContent).toBe('Saving...')
    })

    it('does not dismiss when loading', () => {
      const onDismiss = vi.fn()
      render(
        <LocationFeaturesNotification {...defaultProps} loading={true} onDismiss={onDismiss} />
      )

      fireEvent.click(screen.getByTestId('dismiss-button'))
      expect(onDismiss).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility (NFR43, NFR49)', () => {
    it('has aria-label on container', () => {
      render(<LocationFeaturesNotification {...defaultProps} />)
      const notification = screen.getByTestId('location-features-notification')
      expect(notification.getAttribute('aria-label')).toBe('Location Features Are Now On')
    })

    it('dismiss button has accessible label', () => {
      render(<LocationFeaturesNotification {...defaultProps} />)
      const button = screen.getByTestId('dismiss-button')
      expect(button.getAttribute('aria-label')).toBe('Got it, dismiss notification')
    })

    it('dismiss button meets minimum touch target (NFR49)', () => {
      render(<LocationFeaturesNotification {...defaultProps} />)
      const button = screen.getByTestId('dismiss-button')
      const style = button.getAttribute('style')
      expect(style).toContain('min-width: 44px')
      expect(style).toContain('min-height: 44px')
    })
  })
})
