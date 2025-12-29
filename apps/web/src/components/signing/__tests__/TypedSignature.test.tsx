/**
 * Tests for TypedSignature component.
 *
 * Story 6.1: Child Digital Signature Ceremony - AC2
 * Story 6.7: Signature Accessibility - AC2
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TypedSignature } from '../TypedSignature'

describe('TypedSignature', () => {
  const defaultProps = {
    onChange: vi.fn(),
  }

  describe('rendering', () => {
    it('should render the typed signature component', () => {
      render(<TypedSignature {...defaultProps} />)

      expect(screen.getByTestId('typed-signature')).toBeInTheDocument()
    })

    it('should render input field', () => {
      render(<TypedSignature {...defaultProps} />)

      expect(screen.getByTestId('typed-signature-input')).toBeInTheDocument()
    })

    it('should display label', () => {
      render(<TypedSignature {...defaultProps} />)

      expect(screen.getByText('Your Name')).toBeInTheDocument()
    })

    it('should display help text', () => {
      render(<TypedSignature {...defaultProps} />)

      expect(
        screen.getByText('Type your name exactly as you want it to appear on the agreement.')
      ).toBeInTheDocument()
    })
  })

  describe('input behavior', () => {
    it('should call onChange when text is entered', () => {
      const onChange = vi.fn()
      render(<TypedSignature {...defaultProps} onChange={onChange} />)

      fireEvent.change(screen.getByTestId('typed-signature-input'), {
        target: { value: 'Alex' },
      })

      expect(onChange).toHaveBeenCalledWith('Alex')
    })

    it('should display initial value', () => {
      render(<TypedSignature {...defaultProps} value="Initial Name" />)

      expect(screen.getByTestId('typed-signature-input')).toHaveValue('Initial Name')
    })

    it('should use custom placeholder', () => {
      render(<TypedSignature {...defaultProps} placeholder="Enter your name" />)

      expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument()
    })
  })

  describe('validation', () => {
    it('should show checkmark when valid (minLength met)', () => {
      render(<TypedSignature {...defaultProps} value="Al" minLength={2} />)

      expect(screen.getByText('✓')).toBeInTheDocument()
    })

    it('should not show checkmark when invalid', () => {
      render(<TypedSignature {...defaultProps} value="A" minLength={2} />)

      expect(screen.queryByText('✓')).not.toBeInTheDocument()
    })

    it('should set aria-invalid when partially filled', () => {
      render(<TypedSignature {...defaultProps} value="A" minLength={2} />)

      expect(screen.getByTestId('typed-signature-input')).toHaveAttribute('aria-invalid', 'true')
    })
  })

  describe('disabled state', () => {
    it('should disable input when disabled prop is true', () => {
      render(<TypedSignature {...defaultProps} disabled />)

      expect(screen.getByTestId('typed-signature-input')).toBeDisabled()
    })

    it('should not show checkmark when disabled', () => {
      render(<TypedSignature {...defaultProps} value="Valid Name" disabled />)

      expect(screen.queryByText('✓')).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have associated label', () => {
      render(<TypedSignature {...defaultProps} />)

      const input = screen.getByTestId('typed-signature-input')
      expect(input).toHaveAccessibleName('Your Name')
    })

    it('should have aria-describedby for help text', () => {
      render(<TypedSignature {...defaultProps} />)

      const input = screen.getByTestId('typed-signature-input')
      expect(input).toHaveAttribute('aria-describedby', 'typed-signature-help')
    })

    it('should have 44px minimum height', () => {
      render(<TypedSignature {...defaultProps} />)

      expect(screen.getByTestId('typed-signature-input')).toHaveClass('min-h-[44px]')
    })
  })

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<TypedSignature {...defaultProps} className="custom-class" />)

      expect(screen.getByTestId('typed-signature')).toHaveClass('custom-class')
    })
  })
})
