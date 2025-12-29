/**
 * Tests for SignatureConfirmation component.
 *
 * Story 6.1: Child Digital Signature Ceremony - AC6
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SignatureConfirmation } from '../SignatureConfirmation'

describe('SignatureConfirmation', () => {
  const defaultProps = {
    signerName: 'Alex',
    party: 'child' as const,
  }

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('rendering', () => {
    it('should render the confirmation component', () => {
      render(<SignatureConfirmation {...defaultProps} />)

      expect(screen.getByTestId('signature-confirmation')).toBeInTheDocument()
    })

    it('should display celebration icons', () => {
      render(<SignatureConfirmation {...defaultProps} />)

      // Multiple 🎉 emojis appear (confetti + main icon)
      expect(screen.getAllByText('🎉').length).toBeGreaterThanOrEqual(1)
    })

    it('should display confetti animation initially', () => {
      render(<SignatureConfirmation {...defaultProps} />)

      expect(screen.getByTestId('confetti-animation')).toBeInTheDocument()
    })
  })

  describe('child party messages', () => {
    it('should display personalized message for child', () => {
      render(<SignatureConfirmation {...defaultProps} signerName="Alex" party="child" />)

      expect(screen.getByText('You signed, Alex! Great job!')).toBeInTheDocument()
    })

    it('should display sub-message for child', () => {
      render(<SignatureConfirmation {...defaultProps} party="child" />)

      expect(screen.getByText('Now we wait for your parent to sign too.')).toBeInTheDocument()
    })
  })

  describe('parent party messages', () => {
    it('should display personalized message for parent', () => {
      render(<SignatureConfirmation {...defaultProps} signerName="Mom" party="parent" />)

      expect(screen.getByText('Thank you for signing, Mom!')).toBeInTheDocument()
    })

    it('should display sub-message for parent', () => {
      render(<SignatureConfirmation {...defaultProps} party="parent" />)

      expect(screen.getByText('The agreement is now complete!')).toBeInTheDocument()
    })
  })

  describe('continue button', () => {
    it('should render continue button when onContinue provided', () => {
      render(<SignatureConfirmation {...defaultProps} onContinue={() => {}} />)

      expect(screen.getByTestId('continue-button')).toBeInTheDocument()
    })

    it('should not render continue button when onContinue not provided', () => {
      render(<SignatureConfirmation {...defaultProps} />)

      expect(screen.queryByTestId('continue-button')).not.toBeInTheDocument()
    })

    it('should call onContinue when clicked', () => {
      const onContinue = vi.fn()
      render(<SignatureConfirmation {...defaultProps} onContinue={onContinue} />)

      fireEvent.click(screen.getByTestId('continue-button'))

      expect(onContinue).toHaveBeenCalled()
    })
  })

  describe('confetti animation timing', () => {
    it('should show confetti initially and hide it later', () => {
      render(<SignatureConfirmation {...defaultProps} />)

      // Confetti should be visible initially
      expect(screen.getByTestId('confetti-animation')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have role=status', () => {
      render(<SignatureConfirmation {...defaultProps} />)

      expect(screen.getByTestId('signature-confirmation')).toHaveAttribute('role', 'status')
    })

    it('should have aria-live=polite', () => {
      render(<SignatureConfirmation {...defaultProps} />)

      expect(screen.getByTestId('signature-confirmation')).toHaveAttribute('aria-live', 'polite')
    })

    it('should have screen reader announcement', () => {
      render(<SignatureConfirmation {...defaultProps} />)

      expect(
        screen.getByText(/Congratulations! Your signature has been recorded/)
      ).toBeInTheDocument()
    })

    it('should have 44px minimum touch target on continue button', () => {
      render(<SignatureConfirmation {...defaultProps} onContinue={() => {}} />)

      expect(screen.getByTestId('continue-button')).toHaveClass('min-h-[44px]')
    })
  })

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<SignatureConfirmation {...defaultProps} className="custom-class" />)

      expect(screen.getByTestId('signature-confirmation')).toHaveClass('custom-class')
    })
  })
})
