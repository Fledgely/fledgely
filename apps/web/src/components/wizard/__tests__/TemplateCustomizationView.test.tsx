/**
 * Tests for TemplateCustomizationView component.
 *
 * Story 4.5: Template Customization Preview - AC1, AC2, AC7
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TemplateCustomizationView } from '../TemplateCustomizationView'
import type { AgreementTemplate } from '@fledgely/shared/contracts'

const mockTemplate: AgreementTemplate = {
  id: 'test-template',
  name: 'Test Template',
  description: 'A test template',
  ageGroup: '8-10',
  variation: 'balanced',
  screenTimeLimits: { weekday: 90, weekend: 150 },
  monitoringLevel: 'medium',
  keyRules: ['Rule 1', 'Rule 2', 'Rule 3'],
  createdAt: new Date('2024-01-01'),
}

describe('TemplateCustomizationView', () => {
  const mockOnSaveDraft = vi.fn()
  const mockOnContinueToCoCreation = vi.fn()
  const mockOnCancel = vi.fn()

  const defaultProps = {
    template: mockTemplate,
    ageGroup: '8-10' as const,
    onSaveDraft: mockOnSaveDraft,
    onContinueToCoCreation: mockOnContinueToCoCreation,
    onCancel: mockOnCancel,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render heading', () => {
      render(<TemplateCustomizationView {...defaultProps} />)

      expect(screen.getByText('Customize Template')).toBeInTheDocument()
    })

    it('should render template name', () => {
      render(<TemplateCustomizationView {...defaultProps} />)

      expect(screen.getByText(/Customizing: Test Template/)).toBeInTheDocument()
    })

    it('should render cancel button', () => {
      render(<TemplateCustomizationView {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'Cancel customization' })).toBeInTheDocument()
    })
  })

  describe('tab navigation', () => {
    it('should render all tabs', () => {
      render(<TemplateCustomizationView {...defaultProps} />)

      expect(screen.getByRole('tab', { name: 'Settings' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /Rules/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Preview' })).toBeInTheDocument()
    })

    it('should start on settings tab', () => {
      render(<TemplateCustomizationView {...defaultProps} />)

      const settingsTab = screen.getByRole('tab', { name: 'Settings' })
      expect(settingsTab).toHaveAttribute('aria-selected', 'true')
    })

    it('should switch to rules tab when clicked', () => {
      render(<TemplateCustomizationView {...defaultProps} />)

      const rulesTab = screen.getByRole('tab', { name: /Rules/i })
      fireEvent.click(rulesTab)

      expect(rulesTab).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByText('Agreement Rules')).toBeInTheDocument()
    })

    it('should switch to preview tab when clicked', () => {
      render(<TemplateCustomizationView {...defaultProps} />)

      const previewTab = screen.getByRole('tab', { name: 'Preview' })
      fireEvent.click(previewTab)

      expect(previewTab).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByText('Customization Summary')).toBeInTheDocument()
    })
  })

  describe('settings tab', () => {
    it('should render screen time step', () => {
      render(<TemplateCustomizationView {...defaultProps} />)

      expect(screen.getByText('Set Screen Time Limits')).toBeInTheDocument()
    })

    it('should render bedtime step', () => {
      render(<TemplateCustomizationView {...defaultProps} />)

      expect(screen.getByText('Set Bedtime Cutoff')).toBeInTheDocument()
    })

    it('should render monitoring level step', () => {
      render(<TemplateCustomizationView {...defaultProps} />)

      expect(screen.getByText('Choose Monitoring Level')).toBeInTheDocument()
    })

    it('should render Review & Continue button', () => {
      render(<TemplateCustomizationView {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'Review & Continue' })).toBeInTheDocument()
    })
  })

  describe('rules tab', () => {
    it('should render rules editor', () => {
      render(<TemplateCustomizationView {...defaultProps} />)

      fireEvent.click(screen.getByRole('tab', { name: /Rules/i }))

      expect(screen.getByText('Template Rules')).toBeInTheDocument()
      expect(screen.getByText('Custom Rules')).toBeInTheDocument()
    })

    it('should render template rules', () => {
      render(<TemplateCustomizationView {...defaultProps} />)

      fireEvent.click(screen.getByRole('tab', { name: /Rules/i }))

      expect(screen.getByText('Rule 1')).toBeInTheDocument()
      expect(screen.getByText('Rule 2')).toBeInTheDocument()
      expect(screen.getByText('Rule 3')).toBeInTheDocument()
    })
  })

  describe('preview tab', () => {
    it('should render draft preview', () => {
      render(<TemplateCustomizationView {...defaultProps} />)

      fireEvent.click(screen.getByRole('tab', { name: 'Preview' }))

      expect(screen.getByText('Customization Summary')).toBeInTheDocument()
    })
  })

  describe('cancel', () => {
    it('should call onCancel when cancel button clicked', () => {
      render(<TemplateCustomizationView {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: 'Cancel customization' }))

      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  describe('navigation to preview', () => {
    it('should navigate to preview when Review & Continue clicked', () => {
      render(<TemplateCustomizationView {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: 'Review & Continue' }))

      expect(screen.getByText('Customization Summary')).toBeInTheDocument()
    })
  })

  describe('dirty state indicator', () => {
    it('should not show modified badge when unchanged', () => {
      render(<TemplateCustomizationView {...defaultProps} />)

      expect(screen.queryByText('Modified')).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have proper tab navigation', () => {
      render(<TemplateCustomizationView {...defaultProps} />)

      expect(screen.getByRole('navigation', { name: 'Customization tabs' })).toBeInTheDocument()
    })

    it('should have proper tabpanel role', () => {
      render(<TemplateCustomizationView {...defaultProps} />)

      expect(screen.getByRole('tabpanel')).toBeInTheDocument()
    })

    it('should have minimum touch target on cancel button (NFR49)', () => {
      render(<TemplateCustomizationView {...defaultProps} />)

      const cancelButton = screen.getByRole('button', { name: 'Cancel customization' })
      expect(cancelButton).toHaveClass('min-h-[44px]')
    })

    it('should have minimum touch target on tabs (NFR49)', () => {
      render(<TemplateCustomizationView {...defaultProps} />)

      const tabs = screen.getAllByRole('tab')
      tabs.forEach((tab) => {
        expect(tab).toHaveClass('min-h-[44px]')
      })
    })
  })

  describe('integration with customization hook', () => {
    it('should update screen time and show modified badge', () => {
      render(<TemplateCustomizationView {...defaultProps} />)

      // Find weekday slider and change it
      const weekdaySlider = screen.getByLabelText('Weekdays (Mon-Fri)')
      fireEvent.change(weekdaySlider, { target: { value: '120' } })

      // Check that modified badge appears (may have multiple)
      const modifiedBadges = screen.getAllByText('Modified')
      expect(modifiedBadges.length).toBeGreaterThanOrEqual(1)
    })

    it('should track custom rules count in tab', () => {
      render(<TemplateCustomizationView {...defaultProps} />)

      // Go to rules tab
      fireEvent.click(screen.getByRole('tab', { name: /Rules/i }))

      // Add a custom rule
      const input = screen.getByPlaceholderText('Enter a new rule...')
      fireEvent.change(input, { target: { value: 'New custom rule' } })
      fireEvent.click(screen.getByRole('button', { name: 'Add Rule' }))

      // Check that badge shows in tab
      const rulesTab = screen.getByRole('tab', { name: /Rules/i })
      expect(rulesTab.querySelector('.bg-green-100')).toBeInTheDocument()
    })

    it('should reset changes when Reset Changes clicked', () => {
      render(<TemplateCustomizationView {...defaultProps} />)

      // Make a change
      const weekdaySlider = screen.getByLabelText('Weekdays (Mon-Fri)')
      fireEvent.change(weekdaySlider, { target: { value: '120' } })

      // Click reset
      fireEvent.click(screen.getByRole('button', { name: 'Reset Changes' }))

      // Modified badge should be gone
      expect(screen.queryByText('Modified')).not.toBeInTheDocument()
    })
  })
})
