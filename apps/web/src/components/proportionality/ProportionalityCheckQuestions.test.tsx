/**
 * ProportionalityCheckQuestions Tests - Story 38.4 Task 6
 *
 * Tests for the proportionality check questions interface.
 * AC2: "Is current monitoring appropriate?" question
 * AC3: Additional questions about risk and maturity
 * AC5: Private response indicator
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ProportionalityCheckQuestions, {
  type ProportionalityCheckQuestionsProps,
} from './ProportionalityCheckQuestions'
import type { ProportionalityCheck } from '@fledgely/shared'

describe('ProportionalityCheckQuestions', () => {
  const mockCheck: ProportionalityCheck = {
    id: 'check-123',
    familyId: 'family-456',
    childId: 'child-789',
    triggerType: 'annual',
    status: 'pending',
    monitoringStartDate: new Date('2024-01-01'),
    checkDueDate: new Date('2025-01-01'),
    checkCompletedDate: null,
    expiresAt: new Date('2025-01-15'),
    createdAt: new Date('2025-01-01'),
  }

  const defaultProps: ProportionalityCheckQuestionsProps = {
    check: mockCheck,
    viewerType: 'parent',
    childName: 'Alex',
    childAge: 14,
    onSubmit: vi.fn(),
    onSkip: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // Privacy Indicator Tests (AC5)
  // ============================================

  describe('Privacy Indicator (AC5)', () => {
    it('should display privacy indicator for parent', () => {
      render(<ProportionalityCheckQuestions {...defaultProps} />)

      expect(screen.getByText(/Private Response/i)).toBeInTheDocument()
      expect(screen.getByText(/Your answers are private/i)).toBeInTheDocument()
    })

    it('should display privacy indicator for child', () => {
      render(<ProportionalityCheckQuestions {...defaultProps} viewerType="child" />)

      expect(screen.getByText(/Private Response/i)).toBeInTheDocument()
      expect(screen.getByText(/Your parents/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // Main Question Tests (AC2)
  // ============================================

  describe('Main Question (AC2)', () => {
    it('should display all 5 response choices', () => {
      render(<ProportionalityCheckQuestions {...defaultProps} />)

      expect(screen.getByText('Just Right')).toBeInTheDocument()
      expect(screen.getByText('Could Be Less')).toBeInTheDocument()
      expect(screen.getByText('Need More')).toBeInTheDocument()
      expect(screen.getByText(/Let.*s Talk/)).toBeInTheDocument()
      expect(screen.getByText('Ready to Graduate')).toBeInTheDocument()
    })

    it('should show parent-specific question text', () => {
      render(<ProportionalityCheckQuestions {...defaultProps} />)

      expect(
        screen.getByText(/How do you feel about the current monitoring for Alex/i)
      ).toBeInTheDocument()
    })

    it('should show child-specific question text for teen', () => {
      render(<ProportionalityCheckQuestions {...defaultProps} viewerType="child" />)

      expect(
        screen.getByText(/How do you feel about the current monitoring setup/i)
      ).toBeInTheDocument()
    })

    it('should show age-appropriate question for young child', () => {
      render(<ProportionalityCheckQuestions {...defaultProps} viewerType="child" childAge={9} />)

      expect(
        screen.getByText(/How do you feel about mom and dad checking your phone/i)
      ).toBeInTheDocument()
    })

    it('should show age-appropriate question for pre-teen', () => {
      render(<ProportionalityCheckQuestions {...defaultProps} viewerType="child" childAge={11} />)

      expect(
        screen.getByText(/How do you feel about your parents checking what you do online/i)
      ).toBeInTheDocument()
    })

    it('should allow selecting a response choice', () => {
      render(<ProportionalityCheckQuestions {...defaultProps} />)

      const justRightButton = screen.getByText('Just Right').closest('button')
      expect(justRightButton).toBeInTheDocument()

      fireEvent.click(justRightButton!)
      expect(justRightButton).toHaveAttribute('aria-pressed', 'true')
    })
  })

  // ============================================
  // Additional Questions Tests (AC3)
  // ============================================

  describe('Additional Questions (AC3)', () => {
    it('should show additional questions after selecting main choice', () => {
      render(<ProportionalityCheckQuestions {...defaultProps} />)

      // Initially hidden
      expect(screen.queryByText(/external risk/i)).not.toBeInTheDocument()

      // Select a choice
      fireEvent.click(screen.getByText('Just Right'))

      // Additional questions should appear
      expect(screen.getByText(/risk level/i)).toBeInTheDocument()
    })

    it('should display risk change options', () => {
      render(<ProportionalityCheckQuestions {...defaultProps} />)
      fireEvent.click(screen.getByText('Just Right'))

      expect(screen.getByText('Lower than before')).toBeInTheDocument()
      expect(screen.getByText('About the same')).toBeInTheDocument()
      expect(screen.getByText('Higher than before')).toBeInTheDocument()
    })

    it('should display maturity question for parent', () => {
      render(<ProportionalityCheckQuestions {...defaultProps} />)
      fireEvent.click(screen.getByText('Just Right'))

      expect(screen.getByText(/Has Alex shown increased maturity/i)).toBeInTheDocument()
    })

    it('should display maturity question for child', () => {
      render(<ProportionalityCheckQuestions {...defaultProps} viewerType="child" />)
      fireEvent.click(screen.getByText('Just Right'))

      expect(screen.getByText(/Do you feel like you.*ve grown/i)).toBeInTheDocument()
    })

    it('should allow selecting risk change option', () => {
      render(<ProportionalityCheckQuestions {...defaultProps} />)
      fireEvent.click(screen.getByText('Just Right'))

      const lowerButton = screen.getByText('Lower than before')
      fireEvent.click(lowerButton)

      expect(lowerButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('should allow selecting maturity response', () => {
      render(<ProportionalityCheckQuestions {...defaultProps} />)
      fireEvent.click(screen.getByText('Just Right'))

      const yesButton = screen.getByRole('button', { name: 'Yes' })
      fireEvent.click(yesButton)

      expect(yesButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('should have optional feedback field', () => {
      render(<ProportionalityCheckQuestions {...defaultProps} />)
      fireEvent.click(screen.getByText('Just Right'))

      expect(screen.getByLabelText(/Anything else/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // Submission Tests
  // ============================================

  describe('Submission', () => {
    it('should disable submit button until choice selected', () => {
      render(<ProportionalityCheckQuestions {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /Submit Response/i })
      expect(submitButton).toBeDisabled()
    })

    it('should enable submit button after choice selected', () => {
      render(<ProportionalityCheckQuestions {...defaultProps} />)

      fireEvent.click(screen.getByText('Just Right'))

      const submitButton = screen.getByRole('button', { name: /Submit Response/i })
      expect(submitButton).not.toBeDisabled()
    })

    it('should call onSubmit with correct data', () => {
      const onSubmit = vi.fn()
      render(<ProportionalityCheckQuestions {...defaultProps} onSubmit={onSubmit} />)

      // Select main choice
      fireEvent.click(screen.getByText('Could Be Less'))

      // Select risk change
      fireEvent.click(screen.getByText('Lower than before'))

      // Select maturity
      fireEvent.click(screen.getByRole('button', { name: 'Yes' }))

      // Submit
      fireEvent.click(screen.getByRole('button', { name: /Submit Response/i }))

      expect(onSubmit).toHaveBeenCalledWith({
        isMonitoringAppropriate: 'reduce',
        hasExternalRiskChanged: 'decreased',
        hasMaturityIncreased: true,
        freeformFeedback: null,
        suggestedChanges: [],
      })
    })

    it('should include feedback in submission', () => {
      const onSubmit = vi.fn()
      render(<ProportionalityCheckQuestions {...defaultProps} onSubmit={onSubmit} />)

      fireEvent.click(screen.getByText('Just Right'))

      const feedbackInput = screen.getByLabelText(/Anything else/i)
      fireEvent.change(feedbackInput, { target: { value: 'Great progress!' } })

      fireEvent.click(screen.getByRole('button', { name: /Submit Response/i }))

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          freeformFeedback: 'Great progress!',
        })
      )
    })
  })

  // ============================================
  // Skip Tests
  // ============================================

  describe('Skip functionality', () => {
    it('should show skip button when onSkip provided', () => {
      render(<ProportionalityCheckQuestions {...defaultProps} />)

      expect(screen.getByRole('button', { name: /Skip for Now/i })).toBeInTheDocument()
    })

    it('should not show skip button when onSkip not provided', () => {
      render(<ProportionalityCheckQuestions {...defaultProps} onSkip={undefined} />)

      expect(screen.queryByRole('button', { name: /Skip/i })).not.toBeInTheDocument()
    })

    it('should call onSkip when skip clicked', () => {
      const onSkip = vi.fn()
      render(<ProportionalityCheckQuestions {...defaultProps} onSkip={onSkip} />)

      fireEvent.click(screen.getByRole('button', { name: /Skip for Now/i }))

      expect(onSkip).toHaveBeenCalled()
    })
  })
})
