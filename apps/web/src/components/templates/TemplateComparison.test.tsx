/**
 * Unit tests for TemplateComparison component.
 *
 * Story 4.3: Template Preview & Selection - AC4
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TemplateComparison } from './TemplateComparison'
import type { AgreementTemplate } from '@fledgely/shared/contracts'

const mockTemplate1: AgreementTemplate = {
  id: 'template-1',
  name: 'Template One',
  description: 'First test template.',
  ageGroup: '8-10',
  variation: 'balanced',
  categories: ['gaming'],
  screenTimeLimits: { weekday: 60, weekend: 120 },
  monitoringLevel: 'high',
  keyRules: ['Rule 1', 'Rule 2'],
  createdAt: new Date('2024-01-01'),
}

const mockTemplate2: AgreementTemplate = {
  id: 'template-2',
  name: 'Template Two',
  description: 'Second test template.',
  ageGroup: '11-13',
  variation: 'permissive',
  categories: ['social_media'],
  screenTimeLimits: { weekday: 90, weekend: 150 },
  monitoringLevel: 'medium',
  keyRules: ['Rule A', 'Rule B', 'Rule C'],
  createdAt: new Date('2024-01-02'),
}

const mockTemplate3: AgreementTemplate = {
  id: 'template-3',
  name: 'Template Three',
  description: 'Third test template.',
  ageGroup: '14-16',
  variation: 'strict',
  categories: ['homework'],
  screenTimeLimits: { weekday: 120, weekend: 180 },
  monitoringLevel: 'low',
  keyRules: ['Rule X', 'Rule Y', 'Rule Z', 'Rule W'],
  createdAt: new Date('2024-01-03'),
}

describe('TemplateComparison', () => {
  describe('minimum templates validation', () => {
    it('shows message when less than 2 templates provided', () => {
      render(
        <TemplateComparison templates={[mockTemplate1]} onClose={vi.fn()} onSelect={vi.fn()} />
      )

      expect(screen.getByText('Select at least 2 templates to compare.')).toBeInTheDocument()
    })

    it('shows message when empty array provided', () => {
      render(<TemplateComparison templates={[]} onClose={vi.fn()} onSelect={vi.fn()} />)

      expect(screen.getByText('Select at least 2 templates to compare.')).toBeInTheDocument()
    })
  })

  describe('maximum templates validation', () => {
    it('shows message when more than 3 templates provided', () => {
      const fourTemplates = [
        mockTemplate1,
        mockTemplate2,
        mockTemplate3,
        { ...mockTemplate1, id: 'template-4', name: 'Template Four' },
      ]

      render(<TemplateComparison templates={fourTemplates} onClose={vi.fn()} onSelect={vi.fn()} />)

      expect(
        screen.getByText('You can only compare up to 3 templates at a time.')
      ).toBeInTheDocument()
    })
  })

  describe('comparison view rendering', () => {
    it('renders comparison dialog with 2 templates', () => {
      render(
        <TemplateComparison
          templates={[mockTemplate1, mockTemplate2]}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByRole('dialog', { name: 'Compare templates' })).toBeInTheDocument()
      expect(screen.getByText('Compare Templates (2)')).toBeInTheDocument()
    })

    it('renders comparison dialog with 3 templates', () => {
      render(
        <TemplateComparison
          templates={[mockTemplate1, mockTemplate2, mockTemplate3]}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByText('Compare Templates (3)')).toBeInTheDocument()
    })

    it('displays all template names', () => {
      render(
        <TemplateComparison
          templates={[mockTemplate1, mockTemplate2]}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByText('Template One')).toBeInTheDocument()
      expect(screen.getByText('Template Two')).toBeInTheDocument()
    })

    it('displays age group labels', () => {
      render(
        <TemplateComparison
          templates={[mockTemplate1, mockTemplate2]}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByText('Ages 8-10')).toBeInTheDocument()
      expect(screen.getByText('Ages 11-13')).toBeInTheDocument()
    })

    it('displays variation labels', () => {
      render(
        <TemplateComparison
          templates={[mockTemplate1, mockTemplate2]}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByText('Balanced')).toBeInTheDocument()
      expect(screen.getByText('Permissive')).toBeInTheDocument()
    })
  })

  describe('screen time comparison', () => {
    it('displays weekday screen time for each template', () => {
      render(
        <TemplateComparison
          templates={[mockTemplate1, mockTemplate2]}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByText('1h')).toBeInTheDocument() // 60 minutes
      expect(screen.getByText('1h 30m')).toBeInTheDocument() // 90 minutes
    })

    it('displays weekend screen time for each template', () => {
      render(
        <TemplateComparison
          templates={[mockTemplate1, mockTemplate2]}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByText('2h')).toBeInTheDocument() // 120 minutes
      expect(screen.getByText('2h 30m')).toBeInTheDocument() // 150 minutes
    })
  })

  describe('monitoring level comparison', () => {
    it('displays monitoring level for each template', () => {
      render(
        <TemplateComparison
          templates={[mockTemplate1, mockTemplate2]}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByText('High Monitoring')).toBeInTheDocument()
      expect(screen.getByText('Medium Monitoring')).toBeInTheDocument()
    })
  })

  describe('rules comparison', () => {
    it('displays key rules count for each template', () => {
      render(
        <TemplateComparison
          templates={[mockTemplate1, mockTemplate2]}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByText('Key Rules (2)')).toBeInTheDocument()
      expect(screen.getByText('Key Rules (3)')).toBeInTheDocument()
    })

    it('displays up to 3 rules for each template', () => {
      render(
        <TemplateComparison
          templates={[mockTemplate1, mockTemplate2]}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByText('Rule 1')).toBeInTheDocument()
      expect(screen.getByText('Rule 2')).toBeInTheDocument()
      expect(screen.getByText('Rule A')).toBeInTheDocument()
      expect(screen.getByText('Rule B')).toBeInTheDocument()
    })

    it('shows more rules indicator when template has > 3 rules', () => {
      render(
        <TemplateComparison
          templates={[mockTemplate1, mockTemplate3]}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByText('+1 more rules')).toBeInTheDocument()
    })
  })

  describe('difference indicators (AC4)', () => {
    it('shows difference indicators for differing values', () => {
      render(
        <TemplateComparison
          templates={[mockTemplate1, mockTemplate2]}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      // Should have multiple difference indicators
      const indicators = screen.getAllByLabelText('This value differs between templates')
      expect(indicators.length).toBeGreaterThan(0)
    })

    it('does not show difference indicators when values match', () => {
      const sameScreenTimeTemplate = {
        ...mockTemplate2,
        screenTimeLimits: { ...mockTemplate1.screenTimeLimits },
        monitoringLevel: mockTemplate1.monitoringLevel,
        keyRules: [...mockTemplate1.keyRules],
      }

      render(
        <TemplateComparison
          templates={[mockTemplate1, sameScreenTimeTemplate]}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      // Should have no difference indicators
      const indicators = screen.queryAllByLabelText('This value differs between templates')
      expect(indicators.length).toBe(0)
    })

    it('shows legend explaining difference indicators', () => {
      render(
        <TemplateComparison
          templates={[mockTemplate1, mockTemplate2]}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByText('Indicates values that differ between templates')).toBeInTheDocument()
    })
  })

  describe('template selection', () => {
    it('displays Use This Template button for each template', () => {
      render(
        <TemplateComparison
          templates={[mockTemplate1, mockTemplate2]}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      const selectButtons = screen.getAllByRole('button', { name: 'Use This Template' })
      expect(selectButtons).toHaveLength(2)
    })

    it('calls onSelect with correct template when button clicked', () => {
      const onSelect = vi.fn()
      render(
        <TemplateComparison
          templates={[mockTemplate1, mockTemplate2]}
          onClose={vi.fn()}
          onSelect={onSelect}
        />
      )

      const selectButtons = screen.getAllByRole('button', { name: 'Use This Template' })
      fireEvent.click(selectButtons[0])

      expect(onSelect).toHaveBeenCalledWith(mockTemplate1)
    })

    it('calls onClose after selecting a template', () => {
      const onClose = vi.fn()
      render(
        <TemplateComparison
          templates={[mockTemplate1, mockTemplate2]}
          onClose={onClose}
          onSelect={vi.fn()}
        />
      )

      const selectButtons = screen.getAllByRole('button', { name: 'Use This Template' })
      fireEvent.click(selectButtons[0])

      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('close functionality', () => {
    it('displays close button', () => {
      render(
        <TemplateComparison
          templates={[mockTemplate1, mockTemplate2]}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByRole('button', { name: 'Close comparison' })).toBeInTheDocument()
    })

    it('calls onClose when close button clicked', () => {
      const onClose = vi.fn()
      render(
        <TemplateComparison
          templates={[mockTemplate1, mockTemplate2]}
          onClose={onClose}
          onSelect={vi.fn()}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: 'Close comparison' }))

      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('has dialog role', () => {
      render(
        <TemplateComparison
          templates={[mockTemplate1, mockTemplate2]}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('has accessible label for dialog', () => {
      render(
        <TemplateComparison
          templates={[mockTemplate1, mockTemplate2]}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByRole('dialog', { name: 'Compare templates' })).toBeInTheDocument()
    })

    it('select buttons have minimum 44px touch target', () => {
      render(
        <TemplateComparison
          templates={[mockTemplate1, mockTemplate2]}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      const selectButtons = screen.getAllByRole('button', { name: 'Use This Template' })
      selectButtons.forEach((button) => {
        expect(button).toHaveClass('min-h-[44px]')
      })
    })

    it('close button has minimum 44px touch target', () => {
      render(
        <TemplateComparison
          templates={[mockTemplate1, mockTemplate2]}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      const closeButton = screen.getByRole('button', { name: 'Close comparison' })
      expect(closeButton).toHaveClass('min-h-[44px]')
    })
  })
})
