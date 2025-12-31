/**
 * ChildAnnotationView Component Tests - Story 23.2
 *
 * Tests for child annotation interface.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChildAnnotationView } from './ChildAnnotationView'
import type { FlagDocument } from '@fledgely/shared'

describe('ChildAnnotationView', () => {
  const mockFlag: FlagDocument = {
    id: 'flag-123',
    childId: 'child-456',
    familyId: 'family-789',
    screenshotRef: 'children/child-456/screenshots/ss-123',
    screenshotId: 'ss-123',
    category: 'Violence',
    severity: 'medium',
    confidence: 75,
    reasoning: 'Test reasoning',
    status: 'pending',
    createdAt: Date.now(),
    throttled: false,
    childNotificationStatus: 'notified',
    annotationDeadline: Date.now() + 30 * 60 * 1000,
  }

  const mockOnSubmit = vi.fn()
  const mockOnSkip = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AC1: Screenshot with flag category display', () => {
    it('should display child-friendly category description', () => {
      render(<ChildAnnotationView flag={mockFlag} onSubmit={mockOnSubmit} onSkip={mockOnSkip} />)

      expect(screen.getByText('Something that looked like violence')).toBeInTheDocument()
    })

    it('should display default message for unknown categories', () => {
      const unknownCategoryFlag = { ...mockFlag, category: 'UnknownCategory' as never }

      render(
        <ChildAnnotationView
          flag={unknownCategoryFlag}
          onSubmit={mockOnSubmit}
          onSkip={mockOnSkip}
        />
      )

      expect(screen.getByText('Something that was flagged')).toBeInTheDocument()
    })

    it('should display supportive subtitle', () => {
      render(<ChildAnnotationView flag={mockFlag} onSubmit={mockOnSubmit} onSkip={mockOnSkip} />)

      expect(screen.getByText(/wanted to give you a chance to explain/i)).toBeInTheDocument()
    })
  })

  describe('AC2: Pre-set response options (NFR152)', () => {
    it('should display all pre-set options', () => {
      render(<ChildAnnotationView flag={mockFlag} onSubmit={mockOnSubmit} onSkip={mockOnSkip} />)

      expect(screen.getByText('School project')).toBeInTheDocument()
      expect(screen.getByText('Friend was showing me')).toBeInTheDocument()
      expect(screen.getByText("Didn't mean to see this")).toBeInTheDocument()
      expect(screen.getByText('Other')).toBeInTheDocument()
    })

    it('should display option icons', () => {
      render(<ChildAnnotationView flag={mockFlag} onSubmit={mockOnSubmit} onSkip={mockOnSkip} />)

      expect(screen.getByText('📚')).toBeInTheDocument()
      expect(screen.getByText('👥')).toBeInTheDocument()
      expect(screen.getByText('😅')).toBeInTheDocument()
      expect(screen.getByText('💬')).toBeInTheDocument()
    })

    it('should highlight selected option', () => {
      render(<ChildAnnotationView flag={mockFlag} onSubmit={mockOnSubmit} onSkip={mockOnSkip} />)

      const schoolProjectButton = screen.getByTestId('option-school_project')
      fireEvent.click(schoolProjectButton)

      expect(schoolProjectButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('should only allow one selection at a time', () => {
      render(<ChildAnnotationView flag={mockFlag} onSubmit={mockOnSubmit} onSkip={mockOnSkip} />)

      const schoolButton = screen.getByTestId('option-school_project')
      const accidentButton = screen.getByTestId('option-accident')

      fireEvent.click(schoolButton)
      expect(schoolButton).toHaveAttribute('aria-pressed', 'true')
      expect(accidentButton).toHaveAttribute('aria-pressed', 'false')

      fireEvent.click(accidentButton)
      expect(schoolButton).toHaveAttribute('aria-pressed', 'false')
      expect(accidentButton).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('AC3: Free-text explanation field', () => {
    it('should display explanation textarea', () => {
      render(<ChildAnnotationView flag={mockFlag} onSubmit={mockOnSubmit} onSkip={mockOnSkip} />)

      expect(screen.getByTestId('explanation-input')).toBeInTheDocument()
    })

    it('should show character count', () => {
      render(<ChildAnnotationView flag={mockFlag} onSubmit={mockOnSubmit} onSkip={mockOnSkip} />)

      expect(screen.getByText(/0 \/ 500 characters/)).toBeInTheDocument()
    })

    it('should update character count as user types', () => {
      render(<ChildAnnotationView flag={mockFlag} onSubmit={mockOnSubmit} onSkip={mockOnSkip} />)

      const textarea = screen.getByTestId('explanation-input')
      fireEvent.change(textarea, { target: { value: 'Hello' } })

      expect(screen.getByText(/5 \/ 500 characters/)).toBeInTheDocument()
    })

    it('should enforce character limit', () => {
      render(<ChildAnnotationView flag={mockFlag} onSubmit={mockOnSubmit} onSkip={mockOnSkip} />)

      const textarea = screen.getByTestId('explanation-input') as HTMLTextAreaElement
      const longText = 'a'.repeat(600)
      fireEvent.change(textarea, { target: { value: longText } })

      // Should be truncated to 500
      expect(textarea.value.length).toBeLessThanOrEqual(500)
    })

    it('should label field as optional', () => {
      render(<ChildAnnotationView flag={mockFlag} onSubmit={mockOnSubmit} onSkip={mockOnSkip} />)

      expect(screen.getByText(/optional/i)).toBeInTheDocument()
    })
  })

  describe('AC4: Submit annotation', () => {
    it('should disable submit button when no option selected', () => {
      render(<ChildAnnotationView flag={mockFlag} onSubmit={mockOnSubmit} onSkip={mockOnSkip} />)

      const submitButton = screen.getByTestId('submit-button')
      expect(submitButton).toBeDisabled()
    })

    it('should enable submit button when option selected', () => {
      render(<ChildAnnotationView flag={mockFlag} onSubmit={mockOnSubmit} onSkip={mockOnSkip} />)

      const schoolButton = screen.getByTestId('option-school_project')
      fireEvent.click(schoolButton)

      const submitButton = screen.getByTestId('submit-button')
      expect(submitButton).not.toBeDisabled()
    })

    it('should call onSubmit with selected option', async () => {
      render(<ChildAnnotationView flag={mockFlag} onSubmit={mockOnSubmit} onSkip={mockOnSkip} />)

      fireEvent.click(screen.getByTestId('option-school_project'))
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('school_project', undefined)
      })
    })

    it('should call onSubmit with explanation when provided', async () => {
      render(<ChildAnnotationView flag={mockFlag} onSubmit={mockOnSubmit} onSkip={mockOnSkip} />)

      fireEvent.click(screen.getByTestId('option-other'))
      fireEvent.change(screen.getByTestId('explanation-input'), {
        target: { value: 'My explanation' },
      })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('other', 'My explanation')
      })
    })

    it('should show loading state when submitting', () => {
      render(
        <ChildAnnotationView
          flag={mockFlag}
          onSubmit={mockOnSubmit}
          onSkip={mockOnSkip}
          submitting={true}
        />
      )

      expect(screen.getByText('Sending...')).toBeInTheDocument()
    })

    it('should disable buttons when submitting', () => {
      render(
        <ChildAnnotationView
          flag={mockFlag}
          onSubmit={mockOnSubmit}
          onSkip={mockOnSkip}
          submitting={true}
        />
      )

      expect(screen.getByTestId('submit-button')).toBeDisabled()
      expect(screen.getByTestId('skip-button')).toBeDisabled()
    })
  })

  describe('AC5: Skip option', () => {
    it('should display skip button', () => {
      render(<ChildAnnotationView flag={mockFlag} onSubmit={mockOnSubmit} onSkip={mockOnSkip} />)

      expect(screen.getByTestId('skip-button')).toBeInTheDocument()
      expect(screen.getByText('Skip for now')).toBeInTheDocument()
    })

    it('should call onSkip when clicked', async () => {
      render(<ChildAnnotationView flag={mockFlag} onSubmit={mockOnSubmit} onSkip={mockOnSkip} />)

      fireEvent.click(screen.getByTestId('skip-button'))

      await waitFor(() => {
        expect(mockOnSkip).toHaveBeenCalled()
      })
    })

    it('should not require option selection to skip', () => {
      render(<ChildAnnotationView flag={mockFlag} onSubmit={mockOnSubmit} onSkip={mockOnSkip} />)

      const skipButton = screen.getByTestId('skip-button')
      expect(skipButton).not.toBeDisabled()
    })
  })

  describe('Supportive messaging', () => {
    it('should display help text', () => {
      render(<ChildAnnotationView flag={mockFlag} onSubmit={mockOnSubmit} onSkip={mockOnSkip} />)

      expect(screen.getByText(/helps your parent understand/i)).toBeInTheDocument()
      expect(screen.getByText(/just be honest/i)).toBeInTheDocument()
    })
  })
})
