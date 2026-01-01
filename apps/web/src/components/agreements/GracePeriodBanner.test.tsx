/**
 * GracePeriodBanner Component Tests - Story 35.4
 *
 * Tests for grace period notification banner.
 * AC3: Banner shown: "Agreement expired - please renew within 14 days"
 * AC6: Child sees: "Your agreement needs renewal"
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GracePeriodBanner } from './GracePeriodBanner'

describe('GracePeriodBanner - Story 35.4', () => {
  const defaultProps = {
    daysRemaining: 10,
    userRole: 'parent' as const,
    onRenew: vi.fn(),
    onDismiss: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render banner with days remaining', () => {
      render(<GracePeriodBanner {...defaultProps} />)

      expect(screen.getByTestId('grace-period-banner')).toBeInTheDocument()
    })

    it('should display countdown for parent (AC3)', () => {
      render(<GracePeriodBanner {...defaultProps} daysRemaining={10} />)

      expect(screen.getByText(/10/)).toBeInTheDocument()
    })

    it('should display message for parent (AC3)', () => {
      render(<GracePeriodBanner {...defaultProps} />)

      expect(screen.getByText(/expired/i)).toBeInTheDocument()
    })
  })

  describe('parent view (AC3)', () => {
    it('should show renew button for parent', () => {
      render(<GracePeriodBanner {...defaultProps} userRole="parent" />)

      expect(screen.getByRole('button', { name: /renew/i })).toBeInTheDocument()
    })

    it('should call onRenew when button clicked', () => {
      render(<GracePeriodBanner {...defaultProps} userRole="parent" />)

      fireEvent.click(screen.getByRole('button', { name: /renew/i }))

      expect(defaultProps.onRenew).toHaveBeenCalledTimes(1)
    })

    it('should show urgent message for low days', () => {
      render(<GracePeriodBanner {...defaultProps} daysRemaining={2} userRole="parent" />)

      expect(screen.getByText(/urgent/i)).toBeInTheDocument()
    })
  })

  describe('child view (AC6)', () => {
    it('should show child-friendly message', () => {
      render(<GracePeriodBanner {...defaultProps} userRole="child" />)

      expect(screen.getByText(/renewal/i)).toBeInTheDocument()
    })

    it('should not show renew button for child', () => {
      render(<GracePeriodBanner {...defaultProps} userRole="child" />)

      expect(screen.queryByRole('button', { name: /renew/i })).not.toBeInTheDocument()
    })

    it('should not show countdown for child', () => {
      render(<GracePeriodBanner {...defaultProps} daysRemaining={10} userRole="child" />)

      // Child message shouldn't include the countdown number
      const message = screen.getByTestId('banner-message')
      expect(message.textContent).not.toContain('10')
    })
  })

  describe('urgency styling', () => {
    it('should have yellow styling for normal urgency (14-8 days)', () => {
      render(<GracePeriodBanner {...defaultProps} daysRemaining={10} />)

      const banner = screen.getByTestId('grace-period-banner')
      expect(banner).toHaveAttribute('data-urgency', 'normal')
    })

    it('should have orange styling for warning urgency (7-3 days)', () => {
      render(<GracePeriodBanner {...defaultProps} daysRemaining={5} />)

      const banner = screen.getByTestId('grace-period-banner')
      expect(banner).toHaveAttribute('data-urgency', 'warning')
    })

    it('should have red styling for critical urgency (2-1 days)', () => {
      render(<GracePeriodBanner {...defaultProps} daysRemaining={1} />)

      const banner = screen.getByTestId('grace-period-banner')
      expect(banner).toHaveAttribute('data-urgency', 'critical')
    })

    it('should have expired styling for 0 days', () => {
      render(<GracePeriodBanner {...defaultProps} daysRemaining={0} />)

      const banner = screen.getByTestId('grace-period-banner')
      expect(banner).toHaveAttribute('data-urgency', 'expired')
    })
  })

  describe('dismiss action', () => {
    it('should have dismiss button', () => {
      render(<GracePeriodBanner {...defaultProps} />)

      expect(screen.getByRole('button', { name: /dismiss|close/i })).toBeInTheDocument()
    })

    it('should call onDismiss when dismissed', () => {
      render(<GracePeriodBanner {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /dismiss|close/i }))

      expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1)
    })
  })

  describe('expired state', () => {
    it('should show expired message when days is 0', () => {
      render(<GracePeriodBanner {...defaultProps} daysRemaining={0} userRole="parent" />)

      expect(screen.getByText(/ended/i)).toBeInTheDocument()
    })

    it('should still show renew option after expiry', () => {
      render(<GracePeriodBanner {...defaultProps} daysRemaining={0} userRole="parent" />)

      expect(screen.getByRole('button', { name: /renew/i })).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have appropriate role', () => {
      render(<GracePeriodBanner {...defaultProps} />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('should have accessible dismiss button', () => {
      render(<GracePeriodBanner {...defaultProps} />)

      const button = screen.getByRole('button', { name: /dismiss|close/i })
      expect(button).toHaveAttribute('type', 'button')
    })
  })
})
