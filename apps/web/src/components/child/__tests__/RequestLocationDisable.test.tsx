/**
 * Tests for RequestLocationDisable Component.
 *
 * Story 40.5: Location Privacy Controls
 * - AC6: Request Disable Feature
 *
 * NFR Requirements:
 * - NFR65: Child-friendly language
 * - NFR49: 44x44px minimum touch targets
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RequestLocationDisable } from '../RequestLocationDisable'
import { LOCATION_PRIVACY_MESSAGES } from '@fledgely/shared'

describe('RequestLocationDisable', () => {
  describe('Initial Form State', () => {
    it('renders the component', () => {
      render(<RequestLocationDisable />)

      expect(screen.getByTestId('request-location-disable')).toBeInTheDocument()
    })

    it('displays title', () => {
      render(<RequestLocationDisable />)

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Turn off location')
    })

    it('displays explanation text', () => {
      render(<RequestLocationDisable />)

      expect(screen.getByText(/ask them to turn it off/i)).toBeInTheDocument()
    })

    it('shows reason input as optional', () => {
      render(<RequestLocationDisable />)

      expect(screen.getByLabelText(/tell them why/i)).toBeInTheDocument()
      expect(screen.getByText(/optional/i)).toBeInTheDocument()
    })

    it('shows character count', () => {
      render(<RequestLocationDisable />)

      expect(screen.getByText('0/500 characters')).toBeInTheDocument()
    })

    it('shows submit button', () => {
      render(<RequestLocationDisable />)

      expect(screen.getByTestId('submit-button')).toHaveTextContent('Send request to parents')
    })
  })

  describe('Form Interaction', () => {
    it('updates character count when typing', () => {
      render(<RequestLocationDisable />)

      const input = screen.getByTestId('reason-input')
      fireEvent.change(input, { target: { value: 'I want privacy' } })

      expect(screen.getByText('14/500 characters')).toBeInTheDocument()
    })

    it('calls onSubmit with reason when submitted', () => {
      const handleSubmit = vi.fn()
      render(<RequestLocationDisable onSubmit={handleSubmit} />)

      const input = screen.getByTestId('reason-input')
      fireEvent.change(input, { target: { value: 'I want privacy' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      expect(handleSubmit).toHaveBeenCalledWith('I want privacy')
    })

    it('calls onSubmit without reason when empty', () => {
      const handleSubmit = vi.fn()
      render(<RequestLocationDisable onSubmit={handleSubmit} />)

      fireEvent.click(screen.getByTestId('submit-button'))

      expect(handleSubmit).toHaveBeenCalledWith(undefined)
    })

    it('trims whitespace from reason', () => {
      const handleSubmit = vi.fn()
      render(<RequestLocationDisable onSubmit={handleSubmit} />)

      const input = screen.getByTestId('reason-input')
      fireEvent.change(input, { target: { value: '   I want privacy   ' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      expect(handleSubmit).toHaveBeenCalledWith('I want privacy')
    })

    it('shows success message after submit', () => {
      render(<RequestLocationDisable onSubmit={vi.fn()} />)

      fireEvent.click(screen.getByTestId('submit-button'))

      expect(screen.getByTestId('success-message')).toBeInTheDocument()
      expect(screen.getByText(LOCATION_PRIVACY_MESSAGES.requestSent)).toBeInTheDocument()
    })
  })

  describe('Submitting State', () => {
    it('shows loading text on button', () => {
      render(<RequestLocationDisable isSubmitting={true} />)

      expect(screen.getByTestId('submit-button')).toHaveTextContent('Sending...')
    })

    it('disables submit button when submitting', () => {
      render(<RequestLocationDisable isSubmitting={true} />)

      expect(screen.getByTestId('submit-button')).toBeDisabled()
    })

    it('disables textarea when submitting', () => {
      render(<RequestLocationDisable isSubmitting={true} />)

      expect(screen.getByTestId('reason-input')).toBeDisabled()
    })
  })

  describe('Pending Request Status', () => {
    it('shows pending status card', () => {
      render(<RequestLocationDisable hasPendingRequest={true} requestStatus="pending" />)

      expect(screen.getByTestId('status-pending')).toBeInTheDocument()
    })

    it('displays pending message', () => {
      render(<RequestLocationDisable hasPendingRequest={true} requestStatus="pending" />)

      expect(screen.getByText(LOCATION_PRIVACY_MESSAGES.pendingRequest)).toBeInTheDocument()
    })

    it('has accessible status role', () => {
      render(<RequestLocationDisable hasPendingRequest={true} requestStatus="pending" />)

      expect(screen.getByRole('status')).toBeInTheDocument()
    })
  })

  describe('Approved Request Status', () => {
    it('shows approved status card', () => {
      render(<RequestLocationDisable hasPendingRequest={true} requestStatus="approved" />)

      expect(screen.getByTestId('status-approved')).toBeInTheDocument()
    })

    it('displays approved message', () => {
      render(<RequestLocationDisable hasPendingRequest={true} requestStatus="approved" />)

      expect(screen.getByText(LOCATION_PRIVACY_MESSAGES.requestApproved)).toBeInTheDocument()
    })
  })

  describe('Declined Request Status', () => {
    it('shows declined status card', () => {
      render(<RequestLocationDisable hasPendingRequest={true} requestStatus="declined" />)

      expect(screen.getByTestId('status-declined')).toBeInTheDocument()
    })

    it('displays declined message', () => {
      render(<RequestLocationDisable hasPendingRequest={true} requestStatus="declined" />)

      expect(screen.getByText(LOCATION_PRIVACY_MESSAGES.requestDeclined)).toBeInTheDocument()
    })

    it('shows guardian response when available', () => {
      render(
        <RequestLocationDisable
          hasPendingRequest={true}
          requestStatus="declined"
          guardianResponse="We need to talk about this"
        />
      )

      expect(screen.getByTestId('guardian-response')).toBeInTheDocument()
      expect(screen.getByText(/We need to talk about this/)).toBeInTheDocument()
    })
  })

  describe('Child-Friendly Language (NFR65)', () => {
    it('uses simple language in title', () => {
      render(<RequestLocationDisable />)

      expect(screen.getByRole('heading')).toHaveTextContent('Turn off location')
    })

    it('uses friendly language in description', () => {
      render(<RequestLocationDisable />)

      const description = screen.getByText(/don't want your family to see/)
      expect(description).toBeInTheDocument()
    })

    it('uses encouraging language for submission', () => {
      render(<RequestLocationDisable />)

      expect(screen.getByTestId('submit-button')).toHaveTextContent('Send request to parents')
    })
  })

  describe('Accessibility', () => {
    it('has accessible form label', () => {
      render(<RequestLocationDisable />)

      expect(screen.getByLabelText(/tell them why/i)).toBeInTheDocument()
    })

    it('success message has role status', () => {
      render(<RequestLocationDisable onSubmit={vi.fn()} />)
      fireEvent.click(screen.getByTestId('submit-button'))

      expect(screen.getByRole('status')).toBeInTheDocument()
    })
  })
})
