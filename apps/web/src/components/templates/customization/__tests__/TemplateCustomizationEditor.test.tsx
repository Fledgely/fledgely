/**
 * TemplateCustomizationEditor Tests
 *
 * Story 4.5: Template Customization Preview - Task 1, Task 7
 * AC #1: Parent can modify any template field (screen time, rules, monitoring)
 * AC #2: Changes are highlighted compared to original template
 * AC #5: Customized template is saved as "draft" for this child
 *
 * Integration tests for the complete customization editor
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemplateCustomizationEditor } from '../TemplateCustomizationEditor'
import type { AgreementTemplate } from '@fledgely/contracts'

const STORAGE_KEY_PREFIX = 'template-draft-'

// Mock template
const mockTemplate: AgreementTemplate = {
  id: 'template-8-10-balanced',
  name: 'Balanced Agreement (Ages 8-10)',
  description: 'A balanced approach to digital wellness',
  ageGroup: '8-10',
  philosophy: 'balanced',
  monitoringLevel: 'moderate',
  sections: [
    {
      id: 'rule-1',
      title: 'Screen Time Limits',
      description: 'Daily screen time rules',
      category: 'time',
      content: '60 minutes on school days',
    },
    {
      id: 'rule-2',
      title: 'Bedtime Rules',
      description: 'No screens before bed',
      category: 'time',
      content: 'No screens after 8:00 PM',
    },
    {
      id: 'rule-3',
      title: 'App Categories',
      description: 'Allowed app types',
      category: 'apps',
      content: 'Educational and entertainment apps',
    },
  ],
  version: '1.0',
  createdAt: '2024-01-01',
}

const mockChildId = 'child-123'

describe('TemplateCustomizationEditor', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  const defaultProps = {
    template: mockTemplate,
    childId: mockChildId,
    onSave: vi.fn(),
    onClose: vi.fn(),
    onStartCoCreation: vi.fn(),
  }

  describe('initialization', () => {
    it('renders header with Customize Template text', async () => {
      render(<TemplateCustomizationEditor {...defaultProps} />)
      expect(screen.getByText('Customize Template')).toBeInTheDocument()
    })

    it('renders template name', async () => {
      render(<TemplateCustomizationEditor {...defaultProps} />)
      expect(screen.getByText('Balanced Agreement (Ages 8-10)')).toBeInTheDocument()
    })

    it('renders Start Co-Creation button', async () => {
      render(<TemplateCustomizationEditor {...defaultProps} />)
      expect(screen.getByRole('button', { name: /start co-creation/i })).toBeInTheDocument()
    })
  })

  describe('editor sections visibility', () => {
    it('renders screen time section after initialization', async () => {
      render(<TemplateCustomizationEditor {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /daily screen time/i })).toBeInTheDocument()
      }, { timeout: 2000 })
    })

    it('renders monitoring section', async () => {
      render(<TemplateCustomizationEditor {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText(/monitoring level/i)).toBeInTheDocument()
      }, { timeout: 2000 })
    })

    it('renders rules section', async () => {
      render(<TemplateCustomizationEditor {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText(/agreement rules/i)).toBeInTheDocument()
      }, { timeout: 2000 })
    })
  })

  describe('action buttons', () => {
    it('renders Save & Close button when onClose is provided', async () => {
      render(<TemplateCustomizationEditor {...defaultProps} />)
      expect(screen.getByRole('button', { name: /save.*close/i })).toBeInTheDocument()
    })

    it('calls onClose when Save & Close is clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(<TemplateCustomizationEditor {...defaultProps} onClose={onClose} />)

      await user.click(screen.getByRole('button', { name: /save.*close/i }))

      expect(onClose).toHaveBeenCalled()
    })

    it('calls onStartCoCreation when button is clicked', async () => {
      const user = userEvent.setup()
      const onStartCoCreation = vi.fn()
      render(<TemplateCustomizationEditor {...defaultProps} onStartCoCreation={onStartCoCreation} />)

      await user.click(screen.getByRole('button', { name: /start co-creation/i }))

      expect(onStartCoCreation).toHaveBeenCalled()
    })
  })

  describe('footer status', () => {
    it('shows no customizations message initially', async () => {
      render(<TemplateCustomizationEditor {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText(/no customizations yet/i)).toBeInTheDocument()
      }, { timeout: 2000 })
    })
  })

  describe('draft loading', () => {
    it('loads existing draft from sessionStorage', async () => {
      const existingDraft = {
        templateId: mockTemplate.id,
        childId: mockChildId,
        originalTemplate: mockTemplate,
        customizations: {
          screenTimeMinutes: 120,
          weekendScreenTimeMinutes: null,
          bedtimeCutoff: null,
          monitoringLevel: null,
          rules: {
            enabled: ['rule-1', 'rule-2', 'rule-3'],
            disabled: [],
            custom: [],
          },
        },
        modifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }
      sessionStorage.setItem(
        `${STORAGE_KEY_PREFIX}${mockChildId}`,
        JSON.stringify(existingDraft)
      )

      render(<TemplateCustomizationEditor {...defaultProps} />)

      // The draft with 120 minutes should be loaded - check the slider value
      await waitFor(() => {
        const slider = screen.getByRole('slider')
        expect(slider).toHaveValue('120')
      }, { timeout: 2000 })
    })
  })

  describe('layout', () => {
    it('has sticky footer with bg-gray-50 styling', async () => {
      const { container } = render(<TemplateCustomizationEditor {...defaultProps} />)
      const footer = container.querySelector('.border-t.bg-gray-50')
      expect(footer).toBeInTheDocument()
    })

    it('has scrollable content area', async () => {
      const { container } = render(<TemplateCustomizationEditor {...defaultProps} />)
      const scrollArea = container.querySelector('.overflow-y-auto')
      expect(scrollArea).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('Start Co-Creation button meets minimum touch target', () => {
      render(<TemplateCustomizationEditor {...defaultProps} />)
      const button = screen.getByRole('button', { name: /start co-creation/i })
      expect(button.className).toContain('min-h-[44px]')
    })

    it('Save & Close button meets minimum touch target', () => {
      render(<TemplateCustomizationEditor {...defaultProps} />)
      const button = screen.getByRole('button', { name: /save.*close/i })
      expect(button.className).toContain('min-h-[44px]')
    })
  })
})
