/**
 * Tests for DraftPreview component.
 *
 * Story 4.5: Template Customization Preview - AC5, AC6
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DraftPreview } from '../DraftPreview'

describe('DraftPreview', () => {
  const mockOnSaveDraft = vi.fn()
  const mockOnRevertToOriginal = vi.fn()
  const mockOnContinueToCoCreation = vi.fn()

  const defaultProps = {
    templateName: 'Test Template',
    originalValues: {
      screenTimeLimits: { weekday: 90, weekend: 150 },
      monitoringLevel: 'medium',
    },
    currentValues: {
      screenTimeLimits: { weekday: 90, weekend: 150 },
      bedtimeCutoff: null,
      monitoringLevel: 'medium',
    },
    modifications: {},
    customRules: [],
    removedRuleCount: 0,
    isDirty: false,
    onSaveDraft: mockOnSaveDraft,
    onRevertToOriginal: mockOnRevertToOriginal,
    onContinueToCoCreation: mockOnContinueToCoCreation,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render heading', () => {
      render(<DraftPreview {...defaultProps} />)

      expect(screen.getByText('Customization Summary')).toBeInTheDocument()
    })

    it('should render template name', () => {
      render(<DraftPreview {...defaultProps} />)

      expect(
        screen.getByText('Review your changes to the Test Template template.')
      ).toBeInTheDocument()
    })

    it('should render screen time section', () => {
      render(<DraftPreview {...defaultProps} />)

      expect(screen.getByText('Screen Time Limits')).toBeInTheDocument()
    })

    it('should render bedtime section', () => {
      render(<DraftPreview {...defaultProps} />)

      expect(screen.getByText('Bedtime Cutoff')).toBeInTheDocument()
    })

    it('should render monitoring level section', () => {
      render(<DraftPreview {...defaultProps} />)

      expect(screen.getByText('Monitoring Level')).toBeInTheDocument()
    })

    it('should render rules changes section', () => {
      render(<DraftPreview {...defaultProps} />)

      expect(screen.getByText('Rules Changes')).toBeInTheDocument()
    })
  })

  describe('unchanged state', () => {
    it('should show original template banner when not dirty', () => {
      render(<DraftPreview {...defaultProps} isDirty={false} />)

      expect(screen.getByText('Using original template')).toBeInTheDocument()
    })

    it('should disable revert button when not dirty', () => {
      render(<DraftPreview {...defaultProps} isDirty={false} />)

      expect(screen.getByRole('button', { name: 'Revert to Original' })).toBeDisabled()
    })

    it('should disable save draft button when not dirty', () => {
      render(<DraftPreview {...defaultProps} isDirty={false} />)

      expect(screen.getByRole('button', { name: 'Save Draft' })).toBeDisabled()
    })
  })

  describe('changed state', () => {
    it('should show unsaved changes banner when dirty', () => {
      render(<DraftPreview {...defaultProps} isDirty={true} />)

      expect(screen.getByText('You have unsaved changes')).toBeInTheDocument()
    })

    it('should enable revert button when dirty', () => {
      render(<DraftPreview {...defaultProps} isDirty={true} />)

      expect(screen.getByRole('button', { name: 'Revert to Original' })).not.toBeDisabled()
    })

    it('should enable save draft button when dirty', () => {
      render(<DraftPreview {...defaultProps} isDirty={true} />)

      expect(screen.getByRole('button', { name: 'Save Draft' })).not.toBeDisabled()
    })
  })

  describe('value display', () => {
    it('should format screen time correctly', () => {
      render(<DraftPreview {...defaultProps} />)

      expect(screen.getByText('1h 30m')).toBeInTheDocument() // 90 minutes
      expect(screen.getByText('2h 30m')).toBeInTheDocument() // 150 minutes
    })

    it('should show no bedtime limit message', () => {
      render(<DraftPreview {...defaultProps} />)

      expect(screen.getByText('No bedtime limit set')).toBeInTheDocument()
    })

    it('should format bedtime correctly when set', () => {
      render(
        <DraftPreview
          {...defaultProps}
          currentValues={{
            ...defaultProps.currentValues,
            bedtimeCutoff: { weekday: '21:00', weekend: '22:00' },
          }}
        />
      )

      expect(screen.getByText('9:00 PM')).toBeInTheDocument()
      expect(screen.getByText('10:00 PM')).toBeInTheDocument()
    })

    it('should show monitoring level label', () => {
      render(<DraftPreview {...defaultProps} />)

      expect(screen.getByText('Medium Monitoring')).toBeInTheDocument()
    })
  })

  describe('rules summary', () => {
    it('should show no rule changes message when none', () => {
      render(<DraftPreview {...defaultProps} />)

      expect(screen.getByText('No rule changes')).toBeInTheDocument()
    })

    it('should show custom rules count', () => {
      render(
        <DraftPreview
          {...defaultProps}
          customRules={[
            { id: '1', text: 'Rule 1', category: 'other', isCustom: true },
            { id: '2', text: 'Rule 2', category: 'other', isCustom: true },
          ]}
        />
      )

      expect(screen.getByText('2 custom rules added')).toBeInTheDocument()
    })

    it('should show removed rules count', () => {
      render(<DraftPreview {...defaultProps} removedRuleCount={3} />)

      expect(screen.getByText('3 template rules removed')).toBeInTheDocument()
    })

    it('should use singular form for single rule', () => {
      render(
        <DraftPreview
          {...defaultProps}
          customRules={[{ id: '1', text: 'Rule 1', category: 'other', isCustom: true }]}
        />
      )

      expect(screen.getByText('1 custom rule added')).toBeInTheDocument()
    })
  })

  describe('actions', () => {
    it('should call onSaveDraft when save button clicked', () => {
      render(<DraftPreview {...defaultProps} isDirty={true} />)

      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }))

      expect(mockOnSaveDraft).toHaveBeenCalled()
    })

    it('should call onContinueToCoCreation when continue button clicked', () => {
      render(<DraftPreview {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: 'Continue to Co-Creation' }))

      expect(mockOnContinueToCoCreation).toHaveBeenCalled()
    })
  })

  describe('revert confirmation', () => {
    it('should show confirmation dialog when revert clicked', () => {
      render(<DraftPreview {...defaultProps} isDirty={true} />)

      fireEvent.click(screen.getByRole('button', { name: 'Revert to Original' }))

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Revert to Original Template?')).toBeInTheDocument()
    })

    it('should call onRevertToOriginal when confirmed', () => {
      render(<DraftPreview {...defaultProps} isDirty={true} />)

      fireEvent.click(screen.getByRole('button', { name: 'Revert to Original' }))
      fireEvent.click(screen.getByRole('button', { name: 'Revert Changes' }))

      expect(mockOnRevertToOriginal).toHaveBeenCalled()
    })

    it('should close dialog when cancelled', () => {
      render(<DraftPreview {...defaultProps} isDirty={true} />)

      fireEvent.click(screen.getByRole('button', { name: 'Revert to Original' }))
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should not call onRevertToOriginal when cancelled', () => {
      render(<DraftPreview {...defaultProps} isDirty={true} />)

      fireEvent.click(screen.getByRole('button', { name: 'Revert to Original' }))
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(mockOnRevertToOriginal).not.toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('should have accessible dialog', () => {
      render(<DraftPreview {...defaultProps} isDirty={true} />)

      fireEvent.click(screen.getByRole('button', { name: 'Revert to Original' }))

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-labelledby', 'revert-dialog-title')
    })

    it('should have minimum touch target on continue button (NFR49)', () => {
      render(<DraftPreview {...defaultProps} />)

      const continueButton = screen.getByRole('button', { name: 'Continue to Co-Creation' })
      expect(continueButton).toHaveClass('min-h-[56px]')
    })

    it('should have minimum touch target on action buttons (NFR49)', () => {
      render(<DraftPreview {...defaultProps} isDirty={true} />)

      expect(screen.getByRole('button', { name: 'Revert to Original' })).toHaveClass('min-h-[44px]')
      expect(screen.getByRole('button', { name: 'Save Draft' })).toHaveClass('min-h-[44px]')
    })
  })
})
