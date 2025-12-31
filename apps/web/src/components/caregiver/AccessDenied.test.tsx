/**
 * AccessDenied Component Tests - Story 19D.4
 *
 * Tests for the access denied display shown to caregivers outside their window.
 *
 * Story 19D.4 Acceptance Criteria:
 * - AC3: Show "Access not currently active" when outside window
 * - AC5: Show access windows so caregiver knows when to check
 *
 * @vitest-environment jsdom
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AccessDenied } from './AccessDenied'
import type { AccessWindow } from '@fledgely/shared'

describe('AccessDenied', () => {
  const defaultProps = {
    statusMessage: 'Next access: tomorrow at 2:00 PM',
  }

  describe('Basic rendering (AC3)', () => {
    it('renders access denied heading', () => {
      render(<AccessDenied {...defaultProps} />)

      expect(screen.getByText('Access Not Currently Active')).toBeInTheDocument()
    })

    it('displays status message', () => {
      render(<AccessDenied {...defaultProps} />)

      expect(screen.getByText('Next access: tomorrow at 2:00 PM')).toBeInTheDocument()
    })

    it('has correct test ID', () => {
      render(<AccessDenied {...defaultProps} />)

      expect(screen.getByTestId('access-denied')).toBeInTheDocument()
    })

    it('displays clock icon', () => {
      render(<AccessDenied {...defaultProps} />)

      expect(screen.getByText('🕐')).toBeInTheDocument()
    })
  })

  describe('Access windows display (AC5)', () => {
    const accessWindows: AccessWindow[] = [
      { dayOfWeek: 'saturday', startTime: '14:00', endTime: '18:00', timezone: 'America/New_York' },
      { dayOfWeek: 'sunday', startTime: '10:00', endTime: '14:00', timezone: 'America/New_York' },
    ]

    it('displays access windows when provided', () => {
      render(<AccessDenied {...defaultProps} accessWindows={accessWindows} />)

      expect(screen.getByText('Your Access Times')).toBeInTheDocument()
      expect(screen.getByTestId('access-windows')).toBeInTheDocument()
    })

    it('formats access windows correctly', () => {
      render(<AccessDenied {...defaultProps} accessWindows={accessWindows} />)

      expect(screen.getByText('Saturday 2:00 PM - 6:00 PM')).toBeInTheDocument()
      expect(screen.getByText('Sunday 10:00 AM - 2:00 PM')).toBeInTheDocument()
    })

    it('does not display access windows section when empty', () => {
      render(<AccessDenied {...defaultProps} accessWindows={[]} />)

      expect(screen.queryByText('Your Access Times')).not.toBeInTheDocument()
      expect(screen.queryByTestId('access-windows')).not.toBeInTheDocument()
    })

    it('has accessible list role for windows', () => {
      render(<AccessDenied {...defaultProps} accessWindows={accessWindows} />)

      expect(screen.getByRole('list', { name: /scheduled access times/i })).toBeInTheDocument()
    })
  })

  describe('Contact parent button', () => {
    it('renders contact button when onContactParent provided', () => {
      const onContactParent = vi.fn()
      render(<AccessDenied {...defaultProps} onContactParent={onContactParent} />)

      expect(screen.getByTestId('contact-parent-button')).toBeInTheDocument()
      expect(screen.getByText('Contact Parent')).toBeInTheDocument()
    })

    it('shows parent name in button when provided', () => {
      const onContactParent = vi.fn()
      render(
        <AccessDenied
          {...defaultProps}
          parentContact={{ name: 'Mom', phone: '555-1234' }}
          onContactParent={onContactParent}
        />
      )

      expect(screen.getByText('Contact Mom')).toBeInTheDocument()
    })

    it('calls onContactParent when button clicked', () => {
      const onContactParent = vi.fn()
      render(<AccessDenied {...defaultProps} onContactParent={onContactParent} />)

      fireEvent.click(screen.getByTestId('contact-parent-button'))
      expect(onContactParent).toHaveBeenCalledTimes(1)
    })

    it('does not render button when onContactParent not provided', () => {
      render(<AccessDenied {...defaultProps} />)

      expect(screen.queryByTestId('contact-parent-button')).not.toBeInTheDocument()
    })

    it('displays phone number when provided', () => {
      const onContactParent = vi.fn()
      render(
        <AccessDenied
          {...defaultProps}
          parentContact={{ name: 'Mom', phone: '555-123-4567' }}
          onContactParent={onContactParent}
        />
      )

      expect(screen.getByTestId('parent-phone')).toBeInTheDocument()
      expect(screen.getByText('555-123-4567')).toBeInTheDocument()
    })

    it('phone link has correct tel: href', () => {
      const onContactParent = vi.fn()
      render(
        <AccessDenied
          {...defaultProps}
          parentContact={{ phone: '555-123-4567' }}
          onContactParent={onContactParent}
        />
      )

      const phoneLink = screen.getByRole('link', { name: '555-123-4567' })
      expect(phoneLink).toHaveAttribute('href', 'tel:555-123-4567')
    })
  })

  describe('Accessibility', () => {
    it('has correct role and labelledby', () => {
      render(<AccessDenied {...defaultProps} />)

      const main = screen.getByRole('main')
      expect(main).toHaveAttribute('aria-labelledby', 'access-denied-heading')
    })

    it('heading has correct id for labelling', () => {
      render(<AccessDenied {...defaultProps} />)

      const heading = screen.getByText('Access Not Currently Active')
      expect(heading).toHaveAttribute('id', 'access-denied-heading')
    })

    it('contact button has descriptive aria-label with parent name', () => {
      const onContactParent = vi.fn()
      render(
        <AccessDenied
          {...defaultProps}
          parentContact={{ name: 'Dad' }}
          onContactParent={onContactParent}
        />
      )

      const button = screen.getByTestId('contact-parent-button')
      expect(button).toHaveAttribute('aria-label', 'Contact Dad')
    })

    it('contact button has generic aria-label without parent name', () => {
      const onContactParent = vi.fn()
      render(<AccessDenied {...defaultProps} onContactParent={onContactParent} />)

      const button = screen.getByTestId('contact-parent-button')
      expect(button).toHaveAttribute('aria-label', 'Contact parent for emergency')
    })
  })

  describe('Different status messages', () => {
    it('displays "today at" format', () => {
      render(<AccessDenied statusMessage="Next access: today at 5:00 PM" />)

      expect(screen.getByText('Next access: today at 5:00 PM')).toBeInTheDocument()
    })

    it('displays day of week format', () => {
      render(<AccessDenied statusMessage="Next access: Saturday at 2:00 PM" />)

      expect(screen.getByText('Next access: Saturday at 2:00 PM')).toBeInTheDocument()
    })

    it('displays "No scheduled access" when no windows', () => {
      render(<AccessDenied statusMessage="No scheduled access" />)

      expect(screen.getByText('No scheduled access')).toBeInTheDocument()
    })
  })
})
