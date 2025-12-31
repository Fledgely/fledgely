/**
 * AccessRevoked Component Tests - Story 19D.5
 *
 * Tests for the access revoked display shown to caregivers.
 *
 * Story 19D.5 Acceptance Criteria:
 * - AC3: Caregiver sees "Your access has been removed"
 * - AC4: No notification to caregiver of reason (parent's choice)
 *
 * @vitest-environment jsdom
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AccessRevoked } from './AccessRevoked'

describe('AccessRevoked', () => {
  describe('Basic rendering (AC3)', () => {
    it('renders access revoked heading', () => {
      render(<AccessRevoked />)

      expect(screen.getByText('Your Access Has Been Removed')).toBeInTheDocument()
    })

    it('displays no reason message (AC4)', () => {
      render(<AccessRevoked />)

      // Should NOT show any reason
      expect(
        screen.getByText("You no longer have access to view this family's status.")
      ).toBeInTheDocument()
      expect(screen.queryByText(/reason/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/because/i)).not.toBeInTheDocument()
    })

    it('has correct test ID', () => {
      render(<AccessRevoked />)

      expect(screen.getByTestId('access-revoked')).toBeInTheDocument()
    })

    it('displays icon', () => {
      render(<AccessRevoked />)

      expect(screen.getByText('🚫')).toBeInTheDocument()
    })
  })

  describe('Contact parent button', () => {
    it('renders contact button when onContactParent provided', () => {
      const onContactParent = vi.fn()
      render(<AccessRevoked onContactParent={onContactParent} />)

      expect(screen.getByTestId('contact-parent-button')).toBeInTheDocument()
      expect(screen.getByText('Contact Parent')).toBeInTheDocument()
    })

    it('shows parent name in button when provided', () => {
      const onContactParent = vi.fn()
      render(
        <AccessRevoked
          parentContact={{ name: 'Mom', phone: '555-1234' }}
          onContactParent={onContactParent}
        />
      )

      expect(screen.getByText('Contact Mom')).toBeInTheDocument()
    })

    it('calls onContactParent when button clicked', () => {
      const onContactParent = vi.fn()
      render(<AccessRevoked onContactParent={onContactParent} />)

      fireEvent.click(screen.getByTestId('contact-parent-button'))
      expect(onContactParent).toHaveBeenCalledTimes(1)
    })

    it('does not render button when onContactParent not provided', () => {
      render(<AccessRevoked />)

      expect(screen.queryByTestId('contact-parent-button')).not.toBeInTheDocument()
    })

    it('displays phone number when provided', () => {
      const onContactParent = vi.fn()
      render(
        <AccessRevoked
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
        <AccessRevoked
          parentContact={{ name: 'Dad', phone: '555-123-4567' }}
          onContactParent={onContactParent}
        />
      )

      const phoneLink = screen.getByRole('link', { name: '555-123-4567' })
      expect(phoneLink).toHaveAttribute('href', 'tel:555-123-4567')
    })
  })

  describe('Re-invitation note (AC6)', () => {
    it('displays note about contacting parent for re-invitation', () => {
      render(<AccessRevoked />)

      expect(
        screen.getByText(/If this was unexpected, please contact the parent directly/i)
      ).toBeInTheDocument()
      expect(screen.getByText(/They can re-invite you if needed/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has correct role and labelledby', () => {
      render(<AccessRevoked />)

      const main = screen.getByRole('main')
      expect(main).toHaveAttribute('aria-labelledby', 'access-revoked-heading')
    })

    it('heading has correct id for labelling', () => {
      render(<AccessRevoked />)

      const heading = screen.getByText('Your Access Has Been Removed')
      expect(heading).toHaveAttribute('id', 'access-revoked-heading')
    })

    it('contact button has descriptive aria-label with parent name', () => {
      const onContactParent = vi.fn()
      render(
        <AccessRevoked
          parentContact={{ name: 'Dad', phone: null }}
          onContactParent={onContactParent}
        />
      )

      const button = screen.getByTestId('contact-parent-button')
      expect(button).toHaveAttribute('aria-label', 'Contact Dad')
    })

    it('contact button has generic aria-label without parent name', () => {
      const onContactParent = vi.fn()
      render(<AccessRevoked onContactParent={onContactParent} />)

      const button = screen.getByTestId('contact-parent-button')
      expect(button).toHaveAttribute('aria-label', 'Contact parent with questions')
    })
  })
})
