/**
 * AnnualReviewPrompt Component Tests - Story 35.6
 *
 * Tests for annual review prompt component.
 * AC2: Prompt includes "Your child has grown"
 * AC3: Suggestions based on age
 * AC4: Optional family meeting reminder
 * AC6: Celebrates healthy relationship
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AnnualReviewPrompt } from './AnnualReviewPrompt'

describe('AnnualReviewPrompt - Story 35.6', () => {
  const defaultProps = {
    childName: 'Alex',
    childAge: 14,
    yearsSinceCreation: 1,
    onStartReview: vi.fn(),
    onDismiss: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render prompt', () => {
      render(<AnnualReviewPrompt {...defaultProps} />)

      expect(screen.getByTestId('annual-review-prompt')).toBeInTheDocument()
    })

    it('should display celebration message (AC6)', () => {
      render(<AnnualReviewPrompt {...defaultProps} />)

      expect(screen.getByText(/trust/i)).toBeInTheDocument()
    })

    it('should display growth reminder (AC2)', () => {
      render(<AnnualReviewPrompt {...defaultProps} />)

      expect(screen.getByText(/grown/i)).toBeInTheDocument()
    })

    it('should display child name', () => {
      render(<AnnualReviewPrompt {...defaultProps} />)

      // Multiple elements contain Alex - check at least one exists
      const elements = screen.getAllByText(/Alex/i)
      expect(elements.length).toBeGreaterThan(0)
    })

    it('should display years since creation', () => {
      render(<AnnualReviewPrompt {...defaultProps} />)

      expect(screen.getByText(/1 year/i)).toBeInTheDocument()
    })
  })

  describe('age suggestions (AC3)', () => {
    it('should display suggestions for 14-year-old', () => {
      render(<AnnualReviewPrompt {...defaultProps} childAge={14} />)

      expect(screen.getByText(/screenshot frequency/i)).toBeInTheDocument()
    })

    it('should display suggestions for 16-year-old', () => {
      render(<AnnualReviewPrompt {...defaultProps} childAge={16} />)

      expect(screen.getByText(/notification-only/i)).toBeInTheDocument()
    })

    it('should not crash when no suggestions', () => {
      render(<AnnualReviewPrompt {...defaultProps} childAge={8} />)

      expect(screen.getByTestId('annual-review-prompt')).toBeInTheDocument()
    })
  })

  describe('family meeting option (AC4)', () => {
    it('should show schedule meeting button when handler provided', () => {
      const onScheduleMeeting = vi.fn()
      render(<AnnualReviewPrompt {...defaultProps} onScheduleMeeting={onScheduleMeeting} />)

      expect(screen.getByRole('button', { name: /meeting/i })).toBeInTheDocument()
    })

    it('should call onScheduleMeeting when button clicked', () => {
      const onScheduleMeeting = vi.fn()
      render(<AnnualReviewPrompt {...defaultProps} onScheduleMeeting={onScheduleMeeting} />)

      fireEvent.click(screen.getByRole('button', { name: /meeting/i }))

      expect(onScheduleMeeting).toHaveBeenCalledTimes(1)
    })

    it('should not show meeting button when handler not provided', () => {
      render(<AnnualReviewPrompt {...defaultProps} />)

      expect(screen.queryByRole('button', { name: /meeting/i })).not.toBeInTheDocument()
    })
  })

  describe('actions', () => {
    it('should show start review button', () => {
      render(<AnnualReviewPrompt {...defaultProps} />)

      expect(screen.getByRole('button', { name: /review/i })).toBeInTheDocument()
    })

    it('should call onStartReview when button clicked', () => {
      render(<AnnualReviewPrompt {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /review/i }))

      expect(defaultProps.onStartReview).toHaveBeenCalledTimes(1)
    })

    it('should show dismiss option', () => {
      render(<AnnualReviewPrompt {...defaultProps} />)

      expect(screen.getByRole('button', { name: /later|dismiss/i })).toBeInTheDocument()
    })

    it('should call onDismiss when dismissed', () => {
      render(<AnnualReviewPrompt {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /later|dismiss/i }))

      expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1)
    })
  })

  describe('positive tone', () => {
    it('should not use alarming language', () => {
      render(<AnnualReviewPrompt {...defaultProps} />)

      const prompt = screen.getByTestId('annual-review-prompt')
      const text = prompt.textContent?.toLowerCase() || ''

      expect(text).not.toContain('expired')
      expect(text).not.toContain('urgent')
      expect(text).not.toContain('warning')
    })

    it('should use celebratory language', () => {
      render(<AnnualReviewPrompt {...defaultProps} />)

      const prompt = screen.getByTestId('annual-review-prompt')
      const text = prompt.textContent?.toLowerCase() || ''

      expect(text).toContain('trust')
    })
  })

  describe('accessibility', () => {
    it('should have appropriate role', () => {
      render(<AnnualReviewPrompt {...defaultProps} />)

      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('should have accessible buttons', () => {
      render(<AnnualReviewPrompt {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type', 'button')
      })
    })
  })
})
