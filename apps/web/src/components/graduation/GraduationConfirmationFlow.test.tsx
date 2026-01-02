/**
 * Graduation Confirmation Flow Tests - Story 38.3 Task 7
 *
 * Tests for graduation confirmation UI component.
 * AC1: Both parties must confirm graduation decision (dual-consent)
 * AC2: Graduation date can be immediate or scheduled for future
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import GraduationConfirmationFlow from './GraduationConfirmationFlow'
import type { GraduationDecision } from '@fledgely/shared'

const createMockDecision = (overrides?: Partial<GraduationDecision>): GraduationDecision => ({
  id: 'decision-123',
  conversationId: 'conv-456',
  familyId: 'family-789',
  childId: 'child-abc',
  graduationType: 'immediate',
  scheduledDate: null,
  childConfirmation: null,
  parentConfirmations: [],
  status: 'pending',
  createdAt: new Date('2025-01-01'),
  confirmedAt: null,
  completedAt: null,
  requiredParentIds: ['parent-1', 'parent-2'],
  ...overrides,
})

describe('GraduationConfirmationFlow', () => {
  const mockOnConfirm = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // Basic Rendering Tests
  // ============================================

  describe('Basic Rendering', () => {
    it('should render component with required props', () => {
      render(
        <GraduationConfirmationFlow
          decision={createMockDecision()}
          viewerType="child"
          childName="Alex"
          hasConfirmed={false}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('should display child name in header for parent view', () => {
      render(
        <GraduationConfirmationFlow
          decision={createMockDecision()}
          viewerType="parent"
          childName="Alex"
          hasConfirmed={false}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Alex/)
    })

    it('should show appropriate title for child view', () => {
      render(
        <GraduationConfirmationFlow
          decision={createMockDecision()}
          viewerType="child"
          childName="Alex"
          hasConfirmed={false}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/graduation/i)
    })
  })

  // ============================================
  // Graduation Type Selection Tests (AC2)
  // ============================================

  describe('Graduation Type Selection', () => {
    it('should display immediate graduation option', () => {
      render(
        <GraduationConfirmationFlow
          decision={createMockDecision()}
          viewerType="child"
          childName="Alex"
          hasConfirmed={false}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByRole('radio', { name: /immediate/i })).toBeInTheDocument()
    })

    it('should display scheduled graduation option', () => {
      render(
        <GraduationConfirmationFlow
          decision={createMockDecision()}
          viewerType="child"
          childName="Alex"
          hasConfirmed={false}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByRole('radio', { name: /schedule/i })).toBeInTheDocument()
    })

    it('should allow selecting immediate graduation', () => {
      render(
        <GraduationConfirmationFlow
          decision={createMockDecision()}
          viewerType="child"
          childName="Alex"
          hasConfirmed={false}
          onConfirm={mockOnConfirm}
        />
      )

      const immediateOption = screen.getByRole('radio', { name: /immediate/i })
      fireEvent.click(immediateOption)

      expect(immediateOption).toBeChecked()
    })

    it('should allow selecting scheduled graduation', () => {
      render(
        <GraduationConfirmationFlow
          decision={createMockDecision()}
          viewerType="child"
          childName="Alex"
          hasConfirmed={false}
          onConfirm={mockOnConfirm}
        />
      )

      const scheduledOption = screen.getByRole('radio', { name: /schedule/i })
      fireEvent.click(scheduledOption)

      expect(scheduledOption).toBeChecked()
    })

    it('should show date picker when scheduled is selected', () => {
      render(
        <GraduationConfirmationFlow
          decision={createMockDecision()}
          viewerType="child"
          childName="Alex"
          hasConfirmed={false}
          onConfirm={mockOnConfirm}
        />
      )

      const scheduledOption = screen.getByRole('radio', { name: /schedule/i })
      fireEvent.click(scheduledOption)

      expect(screen.getByLabelText(/date/i)).toBeInTheDocument()
    })

    it('should hide date picker when immediate is selected', () => {
      render(
        <GraduationConfirmationFlow
          decision={createMockDecision()}
          viewerType="child"
          childName="Alex"
          hasConfirmed={false}
          onConfirm={mockOnConfirm}
        />
      )

      // Start with scheduled
      const scheduledOption = screen.getByRole('radio', { name: /schedule/i })
      fireEvent.click(scheduledOption)

      // Then switch to immediate
      const immediateOption = screen.getByRole('radio', { name: /immediate/i })
      fireEvent.click(immediateOption)

      expect(screen.queryByLabelText(/graduation date/i)).not.toBeInTheDocument()
    })
  })

  // ============================================
  // Confirmation Tests (AC1)
  // ============================================

  describe('Confirmation Functionality', () => {
    it('should display confirm button when not yet confirmed', () => {
      render(
        <GraduationConfirmationFlow
          decision={createMockDecision()}
          viewerType="child"
          childName="Alex"
          hasConfirmed={false}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()
    })

    it('should call onConfirm with immediate type when confirmed', () => {
      render(
        <GraduationConfirmationFlow
          decision={createMockDecision()}
          viewerType="child"
          childName="Alex"
          hasConfirmed={false}
          onConfirm={mockOnConfirm}
        />
      )

      const immediateOption = screen.getByRole('radio', { name: /immediate/i })
      fireEvent.click(immediateOption)

      const confirmButton = screen.getByRole('button', { name: /confirm/i })
      fireEvent.click(confirmButton)

      expect(mockOnConfirm).toHaveBeenCalledWith('immediate', null)
    })

    it('should call onConfirm with scheduled type and date', () => {
      render(
        <GraduationConfirmationFlow
          decision={createMockDecision()}
          viewerType="child"
          childName="Alex"
          hasConfirmed={false}
          onConfirm={mockOnConfirm}
        />
      )

      const scheduledOption = screen.getByRole('radio', { name: /schedule/i })
      fireEvent.click(scheduledOption)

      const dateInput = screen.getByLabelText(/date/i)
      fireEvent.change(dateInput, { target: { value: '2025-02-15' } })

      const confirmButton = screen.getByRole('button', { name: /confirm/i })
      fireEvent.click(confirmButton)

      expect(mockOnConfirm).toHaveBeenCalledWith('scheduled', expect.any(Date))
    })

    it('should show confirmed status when hasConfirmed is true', () => {
      render(
        <GraduationConfirmationFlow
          decision={createMockDecision()}
          viewerType="child"
          childName="Alex"
          hasConfirmed={true}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByText(/confirmed/i)).toBeInTheDocument()
    })

    it('should disable confirm button when already confirmed', () => {
      render(
        <GraduationConfirmationFlow
          decision={createMockDecision()}
          viewerType="child"
          childName="Alex"
          hasConfirmed={true}
          onConfirm={mockOnConfirm}
        />
      )

      // The confirm button should not be visible or should be disabled
      const confirmButton = screen.queryByRole('button', { name: /confirm graduation/i })
      if (confirmButton) {
        expect(confirmButton).toBeDisabled()
      }
    })
  })

  // ============================================
  // Dual-Consent Status Display Tests (AC1)
  // ============================================

  describe('Dual-Consent Status Display', () => {
    it('should show child confirmation status when child has confirmed', () => {
      const decisionWithChildConfirmed = createMockDecision({
        childConfirmation: {
          userId: 'child-abc',
          role: 'child',
          confirmedAt: new Date(),
          selectedGraduationType: 'immediate',
          scheduledDatePreference: null,
        },
      })

      render(
        <GraduationConfirmationFlow
          decision={decisionWithChildConfirmed}
          viewerType="parent"
          childName="Alex"
          hasConfirmed={false}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByText(/Alex has confirmed/)).toBeInTheDocument()
    })

    it('should show parent confirmation status', () => {
      const decisionWithParentConfirmed = createMockDecision({
        parentConfirmations: [
          {
            userId: 'parent-1',
            role: 'parent',
            confirmedAt: new Date(),
            selectedGraduationType: 'immediate',
            scheduledDatePreference: null,
          },
        ],
      })

      render(
        <GraduationConfirmationFlow
          decision={decisionWithParentConfirmed}
          viewerType="child"
          childName="Alex"
          hasConfirmed={false}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByText(/Parent confirmations: 1 of 2/)).toBeInTheDocument()
    })

    it('should show pending status for unconfirmed parties', () => {
      render(
        <GraduationConfirmationFlow
          decision={createMockDecision()}
          viewerType="child"
          childName="Alex"
          hasConfirmed={false}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByText(/awaiting/i)).toBeInTheDocument()
    })

    it('should show number of parents who have confirmed', () => {
      const decisionWithOneParent = createMockDecision({
        requiredParentIds: ['parent-1', 'parent-2'],
        parentConfirmations: [
          {
            userId: 'parent-1',
            role: 'parent',
            confirmedAt: new Date(),
            selectedGraduationType: 'immediate',
            scheduledDatePreference: null,
          },
        ],
      })

      render(
        <GraduationConfirmationFlow
          decision={decisionWithOneParent}
          viewerType="child"
          childName="Alex"
          hasConfirmed={true}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByText(/Parent confirmations: 1 of 2/)).toBeInTheDocument()
    })
  })

  // ============================================
  // Cancel Functionality Tests
  // ============================================

  describe('Cancel Functionality', () => {
    it('should display cancel button when onCancel provided', () => {
      render(
        <GraduationConfirmationFlow
          decision={createMockDecision()}
          viewerType="child"
          childName="Alex"
          hasConfirmed={false}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('should call onCancel when cancel button clicked', () => {
      render(
        <GraduationConfirmationFlow
          decision={createMockDecision()}
          viewerType="child"
          childName="Alex"
          hasConfirmed={false}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalled()
    })

    it('should not show cancel button when onCancel not provided', () => {
      render(
        <GraduationConfirmationFlow
          decision={createMockDecision()}
          viewerType="child"
          childName="Alex"
          hasConfirmed={false}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    })
  })

  // ============================================
  // Explanation Content Tests
  // ============================================

  describe('Explanation Content', () => {
    it('should explain what graduation means for child', () => {
      render(
        <GraduationConfirmationFlow
          decision={createMockDecision()}
          viewerType="child"
          childName="Alex"
          hasConfirmed={false}
          onConfirm={mockOnConfirm}
        />
      )

      const explanationBox = screen.getByRole('heading', { name: /What Happens After Graduation/ })
      expect(explanationBox.parentElement).toHaveTextContent(/monitoring will stop/i)
    })

    it('should explain what graduation means for parent', () => {
      render(
        <GraduationConfirmationFlow
          decision={createMockDecision()}
          viewerType="parent"
          childName="Alex"
          hasConfirmed={false}
          onConfirm={mockOnConfirm}
        />
      )

      const explanationBox = screen.getByRole('heading', { name: /What Happens After Graduation/ })
      expect(explanationBox.parentElement).toHaveTextContent(/monitoring will stop/i)
    })

    it('should mention data deletion timeline', () => {
      render(
        <GraduationConfirmationFlow
          decision={createMockDecision()}
          viewerType="child"
          childName="Alex"
          hasConfirmed={false}
          onConfirm={mockOnConfirm}
        />
      )

      const explanationBox = screen.getByRole('heading', { name: /What Happens After Graduation/ })
      expect(explanationBox.parentElement).toHaveTextContent(/deleted after 30 days/i)
    })
  })

  // ============================================
  // Viewer Type Specific Tests
  // ============================================

  describe('Viewer Type Specific Content', () => {
    it('should show child-specific messaging for child viewer', () => {
      render(
        <GraduationConfirmationFlow
          decision={createMockDecision()}
          viewerType="child"
          childName="Alex"
          hasConfirmed={false}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Your Graduation/)
    })

    it('should show parent-specific messaging for parent viewer', () => {
      render(
        <GraduationConfirmationFlow
          decision={createMockDecision()}
          viewerType="parent"
          childName="Alex"
          hasConfirmed={false}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Alex's Graduation/)
    })
  })

  // ============================================
  // Validation Tests
  // ============================================

  describe('Validation', () => {
    it('should require date selection for scheduled graduation', () => {
      render(
        <GraduationConfirmationFlow
          decision={createMockDecision()}
          viewerType="child"
          childName="Alex"
          hasConfirmed={false}
          onConfirm={mockOnConfirm}
        />
      )

      const scheduledOption = screen.getByRole('radio', { name: /schedule/i })
      fireEvent.click(scheduledOption)

      const confirmButton = screen.getByRole('button', { name: /confirm/i })

      // Should be disabled or show error without date
      expect(confirmButton).toBeDisabled()
    })

    it('should enable confirm button when date is selected for scheduled', () => {
      render(
        <GraduationConfirmationFlow
          decision={createMockDecision()}
          viewerType="child"
          childName="Alex"
          hasConfirmed={false}
          onConfirm={mockOnConfirm}
        />
      )

      const scheduledOption = screen.getByRole('radio', { name: /schedule/i })
      fireEvent.click(scheduledOption)

      const dateInput = screen.getByLabelText(/date/i)
      fireEvent.change(dateInput, { target: { value: '2025-02-15' } })

      const confirmButton = screen.getByRole('button', { name: /confirm/i })

      expect(confirmButton).not.toBeDisabled()
    })

    it('should not require date for immediate graduation', () => {
      render(
        <GraduationConfirmationFlow
          decision={createMockDecision()}
          viewerType="child"
          childName="Alex"
          hasConfirmed={false}
          onConfirm={mockOnConfirm}
        />
      )

      const immediateOption = screen.getByRole('radio', { name: /immediate/i })
      fireEvent.click(immediateOption)

      const confirmButton = screen.getByRole('button', { name: /confirm/i })

      expect(confirmButton).not.toBeDisabled()
    })
  })

  // ============================================
  // Accessibility Tests
  // ============================================

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <GraduationConfirmationFlow
          decision={createMockDecision()}
          viewerType="child"
          childName="Alex"
          hasConfirmed={false}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByRole('article')).toHaveAttribute('aria-label')
    })

    it('should have proper form labels', () => {
      render(
        <GraduationConfirmationFlow
          decision={createMockDecision()}
          viewerType="child"
          childName="Alex"
          hasConfirmed={false}
          onConfirm={mockOnConfirm}
        />
      )

      const radios = screen.getAllByRole('radio')
      radios.forEach((radio) => {
        expect(radio).toHaveAccessibleName()
      })
    })

    it('should have focus-visible styles', () => {
      const { container } = render(
        <GraduationConfirmationFlow
          decision={createMockDecision()}
          viewerType="child"
          childName="Alex"
          hasConfirmed={false}
          onConfirm={mockOnConfirm}
        />
      )

      const style = container.querySelector('style')
      expect(style?.textContent).toMatch(/focus/)
    })
  })
})
