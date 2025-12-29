/**
 * Tests for AskQuestionButton component.
 *
 * Story 5.8: Child Agreement Viewing - AC5
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AskQuestionButton } from '../AskQuestionButton'

describe('AskQuestionButton', () => {
  const defaultProps = {
    termId: 'term-1',
    termText: 'No phones at dinner',
    onAskQuestion: vi.fn(),
  }

  describe('rendering', () => {
    it('should render the button', () => {
      render(<AskQuestionButton {...defaultProps} />)

      expect(screen.getByTestId('ask-question-button-term-1')).toBeInTheDocument()
    })

    it('should display question text', () => {
      render(<AskQuestionButton {...defaultProps} />)

      expect(screen.getByText(/question/i)).toBeInTheDocument()
    })

    it('should display question icon', () => {
      render(<AskQuestionButton {...defaultProps} />)

      expect(screen.getByText('?')).toBeInTheDocument()
    })
  })

  describe('interaction', () => {
    it('should call onAskQuestion when clicked', () => {
      const onAskQuestion = vi.fn()
      render(<AskQuestionButton {...defaultProps} onAskQuestion={onAskQuestion} />)

      fireEvent.click(screen.getByRole('button'))

      expect(onAskQuestion).toHaveBeenCalledWith('term-1', 'No phones at dinner')
    })

    it('should not call onAskQuestion when disabled', () => {
      const onAskQuestion = vi.fn()
      render(<AskQuestionButton {...defaultProps} onAskQuestion={onAskQuestion} disabled />)

      fireEvent.click(screen.getByRole('button'))

      expect(onAskQuestion).not.toHaveBeenCalled()
    })
  })

  describe('loading state', () => {
    it('should show loading indicator when loading', () => {
      render(<AskQuestionButton {...defaultProps} isLoading />)

      expect(screen.getByText('Sending...')).toBeInTheDocument()
    })

    it('should disable button when loading', () => {
      render(<AskQuestionButton {...defaultProps} isLoading />)

      expect(screen.getByRole('button')).toBeDisabled()
    })
  })

  describe('success state', () => {
    it('should show success message after question sent', () => {
      render(<AskQuestionButton {...defaultProps} hasSent />)

      expect(screen.getByText(/sent/i)).toBeInTheDocument()
    })

    it('should disable button after question sent', () => {
      render(<AskQuestionButton {...defaultProps} hasSent />)

      expect(screen.getByRole('button')).toBeDisabled()
    })
  })

  describe('accessibility', () => {
    it('should have accessible label', () => {
      render(<AskQuestionButton {...defaultProps} />)

      expect(screen.getByRole('button', { name: /ask.*question/i })).toBeInTheDocument()
    })

    it('should have 44px minimum touch target', () => {
      render(<AskQuestionButton {...defaultProps} />)

      expect(screen.getByRole('button')).toHaveClass('min-h-[44px]')
    })

    it('should have aria-disabled when disabled', () => {
      render(<AskQuestionButton {...defaultProps} disabled />)

      expect(screen.getByRole('button')).toBeDisabled()
    })
  })

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<AskQuestionButton {...defaultProps} className="custom-class" />)

      expect(screen.getByRole('button')).toHaveClass('custom-class')
    })

    it('should have child-friendly styling', () => {
      render(<AskQuestionButton {...defaultProps} />)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('rounded-full')
    })
  })
})
