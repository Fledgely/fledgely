/**
 * Tests for SafeEscapeStatus Component
 *
 * Story 40.3: Fleeing Mode - Safe Escape
 *
 * Acceptance Criteria:
 * - AC5: Only activator can re-enable
 * - NFR65: 6th-grade reading level
 * - NFR49: 44px+ touch targets
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SafeEscapeStatus } from '../SafeEscapeStatus'

describe('SafeEscapeStatus', () => {
  const mockOnReenable = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnReenable.mockResolvedValue(undefined)
  })

  describe('Inactive State', () => {
    it('shows location active message when not activated', () => {
      render(<SafeEscapeStatus isActivated={false} />)

      expect(screen.getByText(/Location Features Active/i)).toBeInTheDocument()
    })

    it('shows adult-friendly message when isChild=false', () => {
      render(<SafeEscapeStatus isActivated={false} isChild={false} />)

      expect(screen.getByText(/Location features are currently enabled/i)).toBeInTheDocument()
    })

    it('shows child-friendly message when isChild=true', () => {
      render(<SafeEscapeStatus isActivated={false} isChild />)

      expect(screen.getByText(/Your location is being shared/i)).toBeInTheDocument()
    })

    it('does not show re-enable button when not activated', () => {
      render(<SafeEscapeStatus isActivated={false} isActivator onReenable={mockOnReenable} />)

      expect(screen.queryByRole('button', { name: /re-enable/i })).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /Turn Location Back On/i })
      ).not.toBeInTheDocument()
    })
  })

  describe('Active State', () => {
    it('shows Safe Escape active message for adults', () => {
      render(<SafeEscapeStatus isActivated activatedAt={new Date()} isChild={false} />)

      expect(screen.getByRole('heading', { name: /Safe Escape Active/i })).toBeInTheDocument()
    })

    it('shows hidden message for children', () => {
      render(<SafeEscapeStatus isActivated activatedAt={new Date()} isChild />)

      expect(screen.getByRole('heading', { name: /You're Hidden/i })).toBeInTheDocument()
    })

    it('shows activated message', () => {
      render(<SafeEscapeStatus isActivated activatedAt={new Date()} isChild={false} />)

      expect(screen.getByText(/All location features disabled/i)).toBeInTheDocument()
    })

    it('shows child-friendly activated message', () => {
      render(<SafeEscapeStatus isActivated activatedAt={new Date()} isChild />)

      expect(screen.getByText(/Location features are off/i)).toBeInTheDocument()
    })
  })

  describe('Countdown Display', () => {
    it('shows hours until notification when recently activated', () => {
      // Activated 1 hour ago - should show ~71 hours remaining
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

      render(<SafeEscapeStatus isActivated activatedAt={oneHourAgo} isChild={false} />)

      // Adult message format: "Neutral notification in X hours"
      expect(screen.getByText(/Neutral notification in \d+ hours/i)).toBeInTheDocument()
    })

    it('does not show countdown when notification already sent', () => {
      // Activated 100 hours ago - notification already sent
      const longAgo = new Date(Date.now() - 100 * 60 * 60 * 1000)

      render(<SafeEscapeStatus isActivated activatedAt={longAgo} isChild={false} />)

      // Should not show countdown
      expect(screen.queryByText(/will see "Location paused"/i)).not.toBeInTheDocument()
    })
  })

  describe('Only Activator Can Re-enable (AC5)', () => {
    it('shows re-enable button when isActivator=true', () => {
      render(
        <SafeEscapeStatus
          isActivated
          activatedAt={new Date()}
          isActivator
          onReenable={mockOnReenable}
        />
      )

      // Adult label is "Re-enable Location Features"
      expect(
        screen.getByRole('button', { name: /Re-enable Location Features/i })
      ).toBeInTheDocument()
    })

    it('does not show re-enable button when isActivator=false', () => {
      render(
        <SafeEscapeStatus
          isActivated
          activatedAt={new Date()}
          isActivator={false}
          onReenable={mockOnReenable}
        />
      )

      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('shows message explaining only activator can re-enable', () => {
      render(
        <SafeEscapeStatus
          isActivated
          activatedAt={new Date()}
          isActivator={false}
          isChild={false}
        />
      )

      expect(screen.getByText(/Only the person who activated Safe Escape/i)).toBeInTheDocument()
    })

    it('shows child-friendly message for non-activator children', () => {
      render(<SafeEscapeStatus isActivated activatedAt={new Date()} isActivator={false} isChild />)

      expect(screen.getByText(/Only the person who turned this on/i)).toBeInTheDocument()
    })

    it('calls onReenable when activator clicks button', async () => {
      render(
        <SafeEscapeStatus
          isActivated
          activatedAt={new Date()}
          isActivator
          onReenable={mockOnReenable}
        />
      )

      // Adult label is "Re-enable Location Features"
      const button = screen.getByRole('button', { name: /Re-enable Location Features/i })
      fireEvent.click(button)

      expect(mockOnReenable).toHaveBeenCalledTimes(1)
    })

    it('shows child-friendly re-enable button for child activator', () => {
      render(
        <SafeEscapeStatus
          isActivated
          activatedAt={new Date()}
          isActivator
          isChild
          onReenable={mockOnReenable}
        />
      )

      // Child label is "Turn Location Back On"
      expect(screen.getByRole('button', { name: /Turn Location Back On/i })).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('disables button when isReenabling=true', () => {
      render(
        <SafeEscapeStatus
          isActivated
          activatedAt={new Date()}
          isActivator
          onReenable={mockOnReenable}
          isReenabling
        />
      )

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })
  })

  describe('Touch Target Size (NFR49)', () => {
    it('re-enable button has minimum 48px touch target', () => {
      render(
        <SafeEscapeStatus
          isActivated
          activatedAt={new Date()}
          isActivator
          onReenable={mockOnReenable}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveStyle({ minHeight: '48px' })
    })
  })

  describe('Accessibility', () => {
    it('has role="status" on active container', () => {
      render(<SafeEscapeStatus isActivated activatedAt={new Date()} />)

      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('button has aria-label', () => {
      render(
        <SafeEscapeStatus
          isActivated
          activatedAt={new Date()}
          isActivator
          onReenable={mockOnReenable}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label')
    })
  })
})
