/**
 * Tests for RemovalReasonInput component.
 *
 * Story 39.7: Caregiver Removal
 *
 * Tests cover:
 * - AC6: Optional Removal Reason
 *   - Optional text area for removal reason
 *   - Character limit enforcement
 *   - Privacy note displayed
 *   - Skip functionality
 *   - Accessibility compliance
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RemovalReasonInput } from './RemovalReasonInput'

describe('RemovalReasonInput', () => {
  describe('Rendering', () => {
    it('renders input container', () => {
      render(<RemovalReasonInput value="" onChange={vi.fn()} />)

      expect(screen.getByTestId('removal-reason-input')).toBeInTheDocument()
    })

    it('renders label with optional indicator', () => {
      render(<RemovalReasonInput value="" onChange={vi.fn()} />)

      expect(
        screen.getByText('Why are you removing this caregiver? (optional)')
      ).toBeInTheDocument()
    })

    it('renders textarea', () => {
      render(<RemovalReasonInput value="" onChange={vi.fn()} />)

      expect(screen.getByTestId('reason-textarea')).toBeInTheDocument()
    })

    it('renders private note', () => {
      render(<RemovalReasonInput value="" onChange={vi.fn()} />)

      expect(screen.getByTestId('private-note')).toBeInTheDocument()
      expect(screen.getByText('Private - not shared with caregiver')).toBeInTheDocument()
    })

    it('renders character count', () => {
      render(<RemovalReasonInput value="" onChange={vi.fn()} />)

      expect(screen.getByTestId('char-count')).toHaveTextContent('0/500')
    })

    it('displays placeholder text', () => {
      render(<RemovalReasonInput value="" onChange={vi.fn()} />)

      const textarea = screen.getByTestId('reason-textarea')
      expect(textarea).toHaveAttribute(
        'placeholder',
        "Share your reason if you'd like. This is private and won't be shared with the caregiver."
      )
    })
  })

  describe('Value Handling', () => {
    it('displays current value', () => {
      render(<RemovalReasonInput value="Test reason" onChange={vi.fn()} />)

      expect(screen.getByTestId('reason-textarea')).toHaveValue('Test reason')
    })

    it('calls onChange when text is entered', () => {
      const onChange = vi.fn()
      render(<RemovalReasonInput value="" onChange={onChange} />)

      fireEvent.change(screen.getByTestId('reason-textarea'), {
        target: { value: 'New reason' },
      })

      expect(onChange).toHaveBeenCalledWith('New reason')
    })

    it('updates character count when value changes', () => {
      render(<RemovalReasonInput value="Hello" onChange={vi.fn()} />)

      expect(screen.getByTestId('char-count')).toHaveTextContent('5/500')
    })
  })

  describe('Character Limit', () => {
    it('uses default max length of 500', () => {
      render(<RemovalReasonInput value="" onChange={vi.fn()} />)

      expect(screen.getByTestId('char-count')).toHaveTextContent('/500')
    })

    it('respects custom max length', () => {
      render(<RemovalReasonInput value="" onChange={vi.fn()} maxLength={200} />)

      expect(screen.getByTestId('char-count')).toHaveTextContent('/200')
    })

    it('prevents input beyond max length', () => {
      const onChange = vi.fn()
      render(<RemovalReasonInput value="" onChange={onChange} maxLength={10} />)

      fireEvent.change(screen.getByTestId('reason-textarea'), {
        target: { value: 'This is too long for the limit' },
      })

      expect(onChange).not.toHaveBeenCalled()
    })

    it('allows input at max length', () => {
      const onChange = vi.fn()
      render(<RemovalReasonInput value="" onChange={onChange} maxLength={10} />)

      fireEvent.change(screen.getByTestId('reason-textarea'), {
        target: { value: '1234567890' },
      })

      expect(onChange).toHaveBeenCalledWith('1234567890')
    })

    it('has maxLength attribute on textarea', () => {
      render(<RemovalReasonInput value="" onChange={vi.fn()} maxLength={300} />)

      expect(screen.getByTestId('reason-textarea')).toHaveAttribute('maxLength', '300')
    })
  })

  describe('Skip Functionality', () => {
    it('shows skip button when onSkip provided', () => {
      render(<RemovalReasonInput value="" onChange={vi.fn()} onSkip={vi.fn()} />)

      expect(screen.getByTestId('skip-button')).toBeInTheDocument()
    })

    it('hides skip button when onSkip not provided', () => {
      render(<RemovalReasonInput value="" onChange={vi.fn()} />)

      expect(screen.queryByTestId('skip-button')).not.toBeInTheDocument()
    })

    it('calls onSkip when skip button clicked', () => {
      const onSkip = vi.fn()
      render(<RemovalReasonInput value="" onChange={vi.fn()} onSkip={onSkip} />)

      fireEvent.click(screen.getByTestId('skip-button'))

      expect(onSkip).toHaveBeenCalled()
    })

    it('skip button has correct text', () => {
      render(<RemovalReasonInput value="" onChange={vi.fn()} onSkip={vi.fn()} />)

      expect(screen.getByTestId('skip-button')).toHaveTextContent('Skip & Remove Now')
    })
  })

  describe('Disabled State', () => {
    it('disables textarea when disabled prop is true', () => {
      render(<RemovalReasonInput value="" onChange={vi.fn()} disabled />)

      expect(screen.getByTestId('reason-textarea')).toBeDisabled()
    })

    it('disables skip button when disabled prop is true', () => {
      render(<RemovalReasonInput value="" onChange={vi.fn()} onSkip={vi.fn()} disabled />)

      expect(screen.getByTestId('skip-button')).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('has label associated with textarea', () => {
      render(<RemovalReasonInput value="" onChange={vi.fn()} />)

      const textarea = screen.getByTestId('reason-textarea')
      expect(textarea).toHaveAttribute('id', 'removal-reason')

      const label = screen.getByLabelText('Why are you removing this caregiver? (optional)')
      expect(label).toBe(textarea)
    })

    it('has aria-describedby pointing to helper text', () => {
      render(<RemovalReasonInput value="" onChange={vi.fn()} />)

      expect(screen.getByTestId('reason-textarea')).toHaveAttribute(
        'aria-describedby',
        'reason-helper-text'
      )
    })

    it('character count has aria-live for screen readers', () => {
      render(<RemovalReasonInput value="" onChange={vi.fn()} />)

      expect(screen.getByTestId('char-count')).toHaveAttribute('aria-live', 'polite')
    })

    it('lock icon is hidden from screen readers', () => {
      const { container } = render(<RemovalReasonInput value="" onChange={vi.fn()} />)

      const icon = container.querySelector('[aria-hidden="true"]')
      expect(icon).toBeInTheDocument()
    })
  })
})
