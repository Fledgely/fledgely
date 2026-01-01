/**
 * RenewalReminderBanner Component Tests - Story 35.2
 *
 * Tests for the banner component displaying renewal reminders.
 * AC1, AC2, AC3: Different reminder thresholds
 * AC4: Parent and child variants
 * AC5: "Renew Now" action
 * AC6: Snooze option
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RenewalReminderBanner } from './RenewalReminderBanner'

describe('RenewalReminderBanner - Story 35.2', () => {
  const defaultProps = {
    expiryDate: new Date('2024-07-01'),
    onRenewClick: vi.fn(),
    onSnoozeClick: vi.fn(),
    onDismiss: vi.fn(),
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-01'))
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('rendering (AC1, AC2, AC3)', () => {
    it('should render 30-day reminder message', () => {
      render(<RenewalReminderBanner {...defaultProps} />)

      expect(screen.getByText(/30 days/i)).toBeInTheDocument()
    })

    it('should render 7-day reminder message', () => {
      const props = { ...defaultProps, expiryDate: new Date('2024-06-10') }
      render(<RenewalReminderBanner {...props} />)

      expect(screen.getByText(/this week/i)).toBeInTheDocument()
    })

    it('should render 1-day reminder message', () => {
      const props = { ...defaultProps, expiryDate: new Date('2024-06-03') }
      render(<RenewalReminderBanner {...props} />)

      expect(screen.getByText(/tomorrow/i)).toBeInTheDocument()
    })

    it('should not render when no expiry date', () => {
      const props = { ...defaultProps, expiryDate: null }
      const { container } = render(<RenewalReminderBanner {...props} />)

      expect(container.firstChild).toBeNull()
    })

    it('should not render when expired', () => {
      const props = { ...defaultProps, expiryDate: new Date('2024-05-01') }
      const { container } = render(<RenewalReminderBanner {...props} />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('styling based on urgency', () => {
    it('should have info styling for 30-day', () => {
      render(<RenewalReminderBanner {...defaultProps} />)

      const banner = screen.getByRole('alert')
      expect(banner).toHaveAttribute('data-urgency', 'info')
    })

    it('should have warning styling for 7-day', () => {
      const props = { ...defaultProps, expiryDate: new Date('2024-06-10') }
      render(<RenewalReminderBanner {...props} />)

      const banner = screen.getByRole('alert')
      expect(banner).toHaveAttribute('data-urgency', 'warning')
    })

    it('should have critical styling for 1-day', () => {
      const props = { ...defaultProps, expiryDate: new Date('2024-06-03') }
      render(<RenewalReminderBanner {...props} />)

      const banner = screen.getByRole('alert')
      expect(banner).toHaveAttribute('data-urgency', 'critical')
    })
  })

  describe('parent and child variants (AC4)', () => {
    it('should show parent message by default', () => {
      render(<RenewalReminderBanner {...defaultProps} />)

      expect(screen.getByText(/Agreement expires/i)).toBeInTheDocument()
    })

    it('should show child-friendly message for child variant', () => {
      render(<RenewalReminderBanner {...defaultProps} variant="child" />)

      expect(screen.getByText(/renewing/i)).toBeInTheDocument()
    })
  })

  describe('Renew Now action (AC5)', () => {
    it('should display Renew Now button', () => {
      render(<RenewalReminderBanner {...defaultProps} />)

      expect(screen.getByRole('button', { name: /renew now/i })).toBeInTheDocument()
    })

    it('should call onRenewClick when button is clicked', () => {
      render(<RenewalReminderBanner {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /renew now/i }))

      expect(defaultProps.onRenewClick).toHaveBeenCalledTimes(1)
    })

    it('should have prominent button styling', () => {
      render(<RenewalReminderBanner {...defaultProps} />)

      const button = screen.getByRole('button', { name: /renew now/i })
      expect(button).toHaveAttribute('data-prominent', 'true')
    })
  })

  describe('Snooze option (AC6)', () => {
    it('should display snooze link for 30-day reminder', () => {
      render(<RenewalReminderBanner {...defaultProps} />)

      expect(screen.getByRole('button', { name: /remind me in 3 days/i })).toBeInTheDocument()
    })

    it('should call onSnoozeClick when snooze is clicked', () => {
      render(<RenewalReminderBanner {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /remind me in 3 days/i }))

      expect(defaultProps.onSnoozeClick).toHaveBeenCalledTimes(1)
    })

    it('should not show snooze for 1-day reminder', () => {
      const props = { ...defaultProps, expiryDate: new Date('2024-06-03') }
      render(<RenewalReminderBanner {...props} />)

      expect(screen.queryByRole('button', { name: /remind me in 3 days/i })).not.toBeInTheDocument()
    })
  })

  describe('dismiss functionality', () => {
    it('should display dismiss button', () => {
      render(<RenewalReminderBanner {...defaultProps} />)

      expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument()
    })

    it('should call onDismiss when dismiss is clicked', () => {
      render(<RenewalReminderBanner {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))

      expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1)
    })
  })

  describe('accessibility', () => {
    it('should have alert role', () => {
      render(<RenewalReminderBanner {...defaultProps} />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('should have accessible name for renew button', () => {
      render(<RenewalReminderBanner {...defaultProps} />)

      const button = screen.getByRole('button', { name: /renew now/i })
      expect(button).toBeInTheDocument()
    })
  })
})
