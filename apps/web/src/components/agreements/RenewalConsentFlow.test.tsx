/**
 * RenewalConsentFlow Component Tests - Story 35.3
 *
 * Tests for the dual-consent renewal flow component.
 * AC4: Child must consent to renewal
 * AC5: Both signatures required
 * AC6: New expiry date set upon completion
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RenewalConsentFlow } from './RenewalConsentFlow'

describe('RenewalConsentFlow - Story 35.3', () => {
  const defaultProps = {
    agreementId: 'agreement-123',
    renewalMode: 'renew-as-is' as const,
    newExpiryDate: new Date('2025-06-01'),
    onComplete: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-01'))
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('step indicator', () => {
    it('should display step indicator', () => {
      render(<RenewalConsentFlow {...defaultProps} />)

      expect(screen.getByTestId('step-indicator')).toBeInTheDocument()
    })

    it('should show step 1 as active initially', () => {
      render(<RenewalConsentFlow {...defaultProps} />)

      expect(screen.getByTestId('step-1')).toHaveAttribute('data-active', 'true')
    })

    it('should show all three steps', () => {
      render(<RenewalConsentFlow {...defaultProps} />)

      expect(screen.getByTestId('step-1')).toBeInTheDocument()
      expect(screen.getByTestId('step-2')).toBeInTheDocument()
      expect(screen.getByTestId('step-3')).toBeInTheDocument()
    })
  })

  describe('parent signature step (AC5)', () => {
    it('should show parent signature prompt initially', () => {
      render(<RenewalConsentFlow {...defaultProps} />)

      expect(screen.getByText(/parent.*confirm/i)).toBeInTheDocument()
    })

    it('should have signature input for parent', () => {
      render(<RenewalConsentFlow {...defaultProps} />)

      expect(screen.getByPlaceholderText(/sign here/i)).toBeInTheDocument()
    })

    it('should enable confirm button when signature entered', () => {
      render(<RenewalConsentFlow {...defaultProps} />)

      const input = screen.getByPlaceholderText(/sign here/i)
      fireEvent.change(input, { target: { value: 'Parent Signature' } })

      expect(screen.getByRole('button', { name: /confirm/i })).not.toBeDisabled()
    })

    it('should advance to child step after parent signs', () => {
      render(<RenewalConsentFlow {...defaultProps} />)

      const input = screen.getByPlaceholderText(/sign here/i)
      fireEvent.change(input, { target: { value: 'Parent Signature' } })
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

      expect(screen.getByTestId('step-2')).toHaveAttribute('data-active', 'true')
    })
  })

  describe('child consent step (AC4)', () => {
    it('should show child consent prompt after parent signs', () => {
      render(<RenewalConsentFlow {...defaultProps} />)

      // Parent signs
      const input = screen.getByPlaceholderText(/sign here/i)
      fireEvent.change(input, { target: { value: 'Parent Signature' } })
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

      expect(screen.getByText(/child.*consent/i)).toBeInTheDocument()
    })

    it('should have signature input for child', () => {
      render(<RenewalConsentFlow {...defaultProps} />)

      // Parent signs
      const input = screen.getByPlaceholderText(/sign here/i)
      fireEvent.change(input, { target: { value: 'Parent Signature' } })
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

      expect(screen.getByPlaceholderText(/sign here/i)).toBeInTheDocument()
    })

    it('should advance to completion after child signs', () => {
      render(<RenewalConsentFlow {...defaultProps} />)

      // Parent signs
      let input = screen.getByPlaceholderText(/sign here/i)
      fireEvent.change(input, { target: { value: 'Parent Signature' } })
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

      // Child signs
      input = screen.getByPlaceholderText(/sign here/i)
      fireEvent.change(input, { target: { value: 'Child Signature' } })
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

      expect(screen.getByTestId('step-3')).toHaveAttribute('data-active', 'true')
    })
  })

  describe('completion step (AC6)', () => {
    it('should show completion confirmation', () => {
      render(<RenewalConsentFlow {...defaultProps} />)

      // Parent signs
      let input = screen.getByPlaceholderText(/sign here/i)
      fireEvent.change(input, { target: { value: 'Parent Signature' } })
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

      // Child signs
      input = screen.getByPlaceholderText(/sign here/i)
      fireEvent.change(input, { target: { value: 'Child Signature' } })
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

      expect(screen.getByText(/renewal complete/i)).toBeInTheDocument()
    })

    it('should display new expiry date', () => {
      render(<RenewalConsentFlow {...defaultProps} />)

      // Complete flow
      let input = screen.getByPlaceholderText(/sign here/i)
      fireEvent.change(input, { target: { value: 'Parent' } })
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

      input = screen.getByPlaceholderText(/sign here/i)
      fireEvent.change(input, { target: { value: 'Child' } })
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

      expect(screen.getByText(/jun 1, 2025/i)).toBeInTheDocument()
    })

    it('should call onComplete when done button clicked', () => {
      render(<RenewalConsentFlow {...defaultProps} />)

      // Complete flow
      let input = screen.getByPlaceholderText(/sign here/i)
      fireEvent.change(input, { target: { value: 'Parent' } })
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

      input = screen.getByPlaceholderText(/sign here/i)
      fireEvent.change(input, { target: { value: 'Child' } })
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

      fireEvent.click(screen.getByRole('button', { name: /done/i }))

      expect(defaultProps.onComplete).toHaveBeenCalled()
    })
  })

  describe('cancel action', () => {
    it('should have cancel button', () => {
      render(<RenewalConsentFlow {...defaultProps} />)

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('should call onCancel when clicked', () => {
      render(<RenewalConsentFlow {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe('renewal mode display', () => {
    it('should display renew as-is mode', () => {
      render(<RenewalConsentFlow {...defaultProps} />)

      expect(screen.getByText(/renew as-is/i)).toBeInTheDocument()
    })

    it('should display renew with changes mode', () => {
      render(<RenewalConsentFlow {...defaultProps} renewalMode="renew-with-changes" />)

      expect(screen.getByText(/renew with changes/i)).toBeInTheDocument()
    })
  })
})
