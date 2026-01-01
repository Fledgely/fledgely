/**
 * RenewalReminderCard Component Tests - Story 35.2
 *
 * Tests for the card component displaying renewal reminders.
 * AC1, AC2, AC3: Different reminder thresholds
 * AC4: Parent and child variants
 * AC5: "Renew Now" action
 * AC6: Snooze option
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RenewalReminderCard } from './RenewalReminderCard'

describe('RenewalReminderCard - Story 35.2', () => {
  const defaultProps = {
    expiryDate: new Date('2024-07-01'),
    onRenewClick: vi.fn(),
    onSnoozeClick: vi.fn(),
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
    it('should render 30-day reminder with expiry info', () => {
      render(<RenewalReminderCard {...defaultProps} />)

      expect(screen.getByText(/30 days/i)).toBeInTheDocument()
    })

    it('should render 7-day reminder with urgency', () => {
      const props = { ...defaultProps, expiryDate: new Date('2024-06-10') }
      render(<RenewalReminderCard {...props} />)

      expect(screen.getByText(/this week/i)).toBeInTheDocument()
    })

    it('should render 1-day reminder with critical urgency', () => {
      const props = { ...defaultProps, expiryDate: new Date('2024-06-03') }
      render(<RenewalReminderCard {...props} />)

      expect(screen.getByText(/tomorrow/i)).toBeInTheDocument()
    })

    it('should not render when no expiry date', () => {
      const props = { ...defaultProps, expiryDate: null }
      const { container } = render(<RenewalReminderCard {...props} />)

      expect(container.firstChild).toBeNull()
    })

    it('should not render when expired', () => {
      const props = { ...defaultProps, expiryDate: new Date('2024-05-01') }
      const { container } = render(<RenewalReminderCard {...props} />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('card structure', () => {
    it('should render as a card with proper structure', () => {
      render(<RenewalReminderCard {...defaultProps} />)

      const card = screen.getByTestId('renewal-reminder-card')
      expect(card).toBeInTheDocument()
    })

    it('should display header with title', () => {
      render(<RenewalReminderCard {...defaultProps} />)

      expect(screen.getByText(/renewal reminder/i)).toBeInTheDocument()
    })

    it('should display expiry date formatted', () => {
      render(<RenewalReminderCard {...defaultProps} />)

      expect(screen.getByText(/jul 1, 2024/i)).toBeInTheDocument()
    })
  })

  describe('urgency styling', () => {
    it('should have info styling for 30-day', () => {
      render(<RenewalReminderCard {...defaultProps} />)

      const card = screen.getByTestId('renewal-reminder-card')
      expect(card).toHaveAttribute('data-urgency', 'info')
    })

    it('should have warning styling for 7-day', () => {
      const props = { ...defaultProps, expiryDate: new Date('2024-06-10') }
      render(<RenewalReminderCard {...props} />)

      const card = screen.getByTestId('renewal-reminder-card')
      expect(card).toHaveAttribute('data-urgency', 'warning')
    })

    it('should have critical styling for 1-day', () => {
      const props = { ...defaultProps, expiryDate: new Date('2024-06-03') }
      render(<RenewalReminderCard {...props} />)

      const card = screen.getByTestId('renewal-reminder-card')
      expect(card).toHaveAttribute('data-urgency', 'critical')
    })
  })

  describe('parent and child variants (AC4)', () => {
    it('should show parent message by default', () => {
      render(<RenewalReminderCard {...defaultProps} />)

      expect(screen.getByText(/Agreement expires/i)).toBeInTheDocument()
    })

    it('should show child-friendly message for child variant', () => {
      render(<RenewalReminderCard {...defaultProps} variant="child" />)

      expect(screen.getByText(/renewing/i)).toBeInTheDocument()
    })

    it('should show child-friendly title for child variant', () => {
      render(<RenewalReminderCard {...defaultProps} variant="child" />)

      expect(screen.getByText(/time to renew/i)).toBeInTheDocument()
    })
  })

  describe('Renew Now action (AC5)', () => {
    it('should display Renew Now button', () => {
      render(<RenewalReminderCard {...defaultProps} />)

      expect(screen.getByRole('button', { name: /renew now/i })).toBeInTheDocument()
    })

    it('should call onRenewClick when button is clicked', () => {
      render(<RenewalReminderCard {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /renew now/i }))

      expect(defaultProps.onRenewClick).toHaveBeenCalledTimes(1)
    })

    it('should have prominent button styling', () => {
      render(<RenewalReminderCard {...defaultProps} />)

      const button = screen.getByRole('button', { name: /renew now/i })
      expect(button).toHaveAttribute('data-prominent', 'true')
    })
  })

  describe('Snooze option (AC6)', () => {
    it('should display snooze link for 30-day reminder', () => {
      render(<RenewalReminderCard {...defaultProps} />)

      expect(screen.getByRole('button', { name: /remind me later/i })).toBeInTheDocument()
    })

    it('should call onSnoozeClick when snooze is clicked', () => {
      render(<RenewalReminderCard {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /remind me later/i }))

      expect(defaultProps.onSnoozeClick).toHaveBeenCalledTimes(1)
    })

    it('should not show snooze for 1-day reminder', () => {
      const props = { ...defaultProps, expiryDate: new Date('2024-06-03') }
      render(<RenewalReminderCard {...props} />)

      expect(screen.queryByRole('button', { name: /remind me later/i })).not.toBeInTheDocument()
    })
  })

  describe('days countdown display', () => {
    it('should show days remaining prominently', () => {
      render(<RenewalReminderCard {...defaultProps} />)

      expect(screen.getByTestId('days-countdown')).toBeInTheDocument()
      expect(screen.getByText('30')).toBeInTheDocument()
      expect(screen.getByText(/days left/i)).toBeInTheDocument()
    })

    it('should show singular day for 1 day', () => {
      const props = { ...defaultProps, expiryDate: new Date('2024-06-02') }
      render(<RenewalReminderCard {...props} />)

      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText(/day left/i)).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have accessible labels', () => {
      render(<RenewalReminderCard {...defaultProps} />)

      const renewButton = screen.getByRole('button', { name: /renew now/i })
      expect(renewButton).toBeInTheDocument()
    })

    it('should have section landmark', () => {
      render(<RenewalReminderCard {...defaultProps} />)

      expect(screen.getByRole('region')).toBeInTheDocument()
    })

    it('should have accessible name for card region', () => {
      render(<RenewalReminderCard {...defaultProps} />)

      expect(screen.getByRole('region', { name: /renewal reminder/i })).toBeInTheDocument()
    })
  })
})
