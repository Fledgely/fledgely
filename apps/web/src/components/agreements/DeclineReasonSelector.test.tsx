/**
 * DeclineReasonSelector Tests - Story 34.5
 *
 * Tests for decline reason selection component.
 * AC1: Decline reason required
 * AC2: Respectful language
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DeclineReasonSelector } from './DeclineReasonSelector'

// Mock shared package
vi.mock('@fledgely/shared', () => ({
  DECLINE_REASONS: [
    { id: 'not-ready', label: "I'm not ready for this change yet" },
    { id: 'need-discussion', label: "Let's discuss this together first" },
    { id: 'too-soon', label: "It's too soon since our last change" },
    { id: 'need-more-info', label: 'I need more information about this' },
    { id: 'prefer-different', label: "I'd prefer a different approach" },
    { id: 'custom', label: 'Other reason...' },
  ],
  DECLINE_MESSAGES: {
    header: 'Why are you declining?',
    subheader: 'A thoughtful response helps continue the conversation',
    customPrompt: 'Share your thoughts:',
    customMinChars: 10,
    encouragement: 'Your response helps the other person understand your perspective.',
  },
}))

describe('DeclineReasonSelector - Story 34.5', () => {
  const defaultProps = {
    onReasonSelect: vi.fn(),
    onCustomReasonChange: vi.fn(),
    selectedReasonId: null as string | null,
    customReason: '',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render header with supportive language', () => {
      render(<DeclineReasonSelector {...defaultProps} />)

      expect(screen.getByText('Why are you declining?')).toBeInTheDocument()
    })

    it('should render subheader encouraging thoughtful response', () => {
      render(<DeclineReasonSelector {...defaultProps} />)

      expect(
        screen.getByText('A thoughtful response helps continue the conversation')
      ).toBeInTheDocument()
    })

    it('should render all predefined decline reasons', () => {
      render(<DeclineReasonSelector {...defaultProps} />)

      expect(screen.getByText("I'm not ready for this change yet")).toBeInTheDocument()
      expect(screen.getByText("Let's discuss this together first")).toBeInTheDocument()
      expect(screen.getByText("It's too soon since our last change")).toBeInTheDocument()
      expect(screen.getByText('I need more information about this')).toBeInTheDocument()
      expect(screen.getByText("I'd prefer a different approach")).toBeInTheDocument()
      expect(screen.getByText('Other reason...')).toBeInTheDocument()
    })

    it('should have respectful labels without negative words', () => {
      render(<DeclineReasonSelector {...defaultProps} />)

      const radios = screen.getAllByRole('radio')
      radios.forEach((radio) => {
        const text = radio.textContent?.toLowerCase() || ''
        expect(text).not.toContain('reject')
        expect(text).not.toContain('refuse')
        expect(text).not.toContain('never')
      })
    })
  })

  describe('selection behavior', () => {
    it('should call onReasonSelect when a reason is clicked', () => {
      const onReasonSelect = vi.fn()
      render(<DeclineReasonSelector {...defaultProps} onReasonSelect={onReasonSelect} />)

      fireEvent.click(screen.getByText("I'm not ready for this change yet"))

      expect(onReasonSelect).toHaveBeenCalledWith('not-ready')
    })

    it('should highlight selected reason', () => {
      render(<DeclineReasonSelector {...defaultProps} selectedReasonId="not-ready" />)

      const selectedButton = screen.getByText("I'm not ready for this change yet").closest('button')
      expect(selectedButton).toHaveClass('border-blue-500')
    })

    it('should show custom reason input when "Other" is selected', () => {
      render(<DeclineReasonSelector {...defaultProps} selectedReasonId="custom" />)

      expect(screen.getByPlaceholderText(/share your thoughts/i)).toBeInTheDocument()
    })

    it('should not show custom reason input when a predefined reason is selected', () => {
      render(<DeclineReasonSelector {...defaultProps} selectedReasonId="not-ready" />)

      expect(screen.queryByPlaceholderText(/share your thoughts/i)).not.toBeInTheDocument()
    })
  })

  describe('custom reason input', () => {
    it('should call onCustomReasonChange when typing custom reason', () => {
      const onCustomReasonChange = vi.fn()
      render(
        <DeclineReasonSelector
          {...defaultProps}
          selectedReasonId="custom"
          onCustomReasonChange={onCustomReasonChange}
        />
      )

      const input = screen.getByPlaceholderText(/share your thoughts/i)
      fireEvent.change(input, { target: { value: 'My custom reason' } })

      expect(onCustomReasonChange).toHaveBeenCalledWith('My custom reason')
    })

    it('should show character count for custom reason', () => {
      render(
        <DeclineReasonSelector {...defaultProps} selectedReasonId="custom" customReason="Hello" />
      )

      expect(screen.getByText(/5/)).toBeInTheDocument()
    })

    it('should show warning when custom reason is too short', () => {
      render(
        <DeclineReasonSelector {...defaultProps} selectedReasonId="custom" customReason="Short" />
      )

      expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument()
    })

    it('should not show warning when custom reason meets minimum', () => {
      render(
        <DeclineReasonSelector
          {...defaultProps}
          selectedReasonId="custom"
          customReason="This is a long enough reason"
        />
      )

      expect(screen.queryByText(/at least 10 characters/i)).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have accessible radio roles', () => {
      render(<DeclineReasonSelector {...defaultProps} />)

      const radios = screen.getAllByRole('radio')
      expect(radios.length).toBeGreaterThanOrEqual(6)
    })

    it('should have accessible textarea for custom reason', () => {
      render(<DeclineReasonSelector {...defaultProps} selectedReasonId="custom" />)

      const textarea = screen.getByRole('textbox')
      expect(textarea).toBeInTheDocument()
    })
  })

  describe('disabled state', () => {
    it('should disable all radio options when disabled prop is true', () => {
      render(<DeclineReasonSelector {...defaultProps} disabled />)

      const radios = screen.getAllByRole('radio')
      radios.forEach((radio) => {
        expect(radio).toBeDisabled()
      })
    })

    it('should disable custom input when disabled prop is true', () => {
      render(<DeclineReasonSelector {...defaultProps} selectedReasonId="custom" disabled />)

      expect(screen.getByRole('textbox')).toBeDisabled()
    })
  })
})
