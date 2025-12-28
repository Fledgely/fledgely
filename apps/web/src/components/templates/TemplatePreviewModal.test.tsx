/**
 * Unit tests for TemplatePreviewModal component.
 *
 * Story 4.3: Template Preview & Selection - AC1, AC2, AC3, AC5, AC6
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TemplatePreviewModal } from './TemplatePreviewModal'
import type { AgreementTemplate } from '@fledgely/shared/contracts'

const mockTemplate: AgreementTemplate = {
  id: 'test-template',
  name: 'Test Template',
  description: 'A test template for unit testing purposes.',
  ageGroup: '8-10',
  variation: 'balanced',
  categories: ['gaming', 'homework'],
  screenTimeLimits: { weekday: 90, weekend: 150 },
  monitoringLevel: 'medium',
  keyRules: ['Rule 1', 'Rule 2', 'Rule 3'],
  createdAt: new Date('2024-01-01'),
}

const mockYoungChildTemplate: AgreementTemplate = {
  ...mockTemplate,
  id: 'young-template',
  ageGroup: '5-7',
  simpleRules: [
    { text: 'Play in the living room', isAllowed: true },
    { text: 'Download apps alone', isAllowed: false },
  ],
}

const mockTeenTemplate: AgreementTemplate = {
  ...mockTemplate,
  id: 'teen-template',
  ageGroup: '14-16',
  autonomyMilestones: [
    { milestone: 'Get driver license', reward: 'No location sharing' },
    { milestone: 'Hold part-time job', reward: 'Self-managed screen time' },
  ],
}

describe('TemplatePreviewModal', () => {
  describe('rendering', () => {
    it('renders nothing when template is null', () => {
      const { container } = render(
        <TemplatePreviewModal template={null} isOpen={true} onClose={vi.fn()} onSelect={vi.fn()} />
      )
      expect(container).toBeEmptyDOMElement()
    })

    it('renders nothing when isOpen is false', () => {
      const { container } = render(
        <TemplatePreviewModal
          template={mockTemplate}
          isOpen={false}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )
      expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument()
    })

    it('renders modal when isOpen is true and template provided', () => {
      render(
        <TemplatePreviewModal
          template={mockTemplate}
          isOpen={true}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Test Template')).toBeInTheDocument()
    })

    it('displays template name as title', () => {
      render(
        <TemplatePreviewModal
          template={mockTemplate}
          isOpen={true}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByText('Test Template')).toBeInTheDocument()
    })

    it('displays template description', () => {
      render(
        <TemplatePreviewModal
          template={mockTemplate}
          isOpen={true}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByText('A test template for unit testing purposes.')).toBeInTheDocument()
    })

    it('displays age group badge', () => {
      render(
        <TemplatePreviewModal
          template={mockTemplate}
          isOpen={true}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByText('Ages 8-10')).toBeInTheDocument()
    })

    it('displays variation badge', () => {
      render(
        <TemplatePreviewModal
          template={mockTemplate}
          isOpen={true}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByText('Balanced')).toBeInTheDocument()
    })
  })

  describe('screen time section (AC1)', () => {
    it('displays weekday screen time limit', () => {
      render(
        <TemplatePreviewModal
          template={mockTemplate}
          isOpen={true}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByText('Weekdays')).toBeInTheDocument()
      expect(screen.getByText('1h 30m')).toBeInTheDocument()
    })

    it('displays weekend screen time limit', () => {
      render(
        <TemplatePreviewModal
          template={mockTemplate}
          isOpen={true}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByText('Weekends')).toBeInTheDocument()
      expect(screen.getByText('2h 30m')).toBeInTheDocument()
    })
  })

  describe('monitoring section (AC1)', () => {
    it('displays monitoring level badge', () => {
      render(
        <TemplatePreviewModal
          template={mockTemplate}
          isOpen={true}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByText('Medium Monitoring')).toBeInTheDocument()
    })

    it('displays monitoring level description', () => {
      render(
        <TemplatePreviewModal
          template={mockTemplate}
          isOpen={true}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByText(/check in regularly/i)).toBeInTheDocument()
    })
  })

  describe('rules section (AC1)', () => {
    it('displays key rules', () => {
      render(
        <TemplatePreviewModal
          template={mockTemplate}
          isOpen={true}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByText('Rule 1')).toBeInTheDocument()
      expect(screen.getByText('Rule 2')).toBeInTheDocument()
      expect(screen.getByText('Rule 3')).toBeInTheDocument()
    })
  })

  describe('customizable indicators (AC2)', () => {
    it('shows Customizable badge for screen time', () => {
      render(
        <TemplatePreviewModal
          template={mockTemplate}
          isOpen={true}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      const customizableBadges = screen.getAllByText('Customizable')
      expect(customizableBadges.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('categories section', () => {
    it('displays template categories', () => {
      render(
        <TemplatePreviewModal
          template={mockTemplate}
          isOpen={true}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByText('Gaming')).toBeInTheDocument()
      expect(screen.getByText('Homework')).toBeInTheDocument()
    })
  })

  describe('Use This Template action (AC3)', () => {
    it('displays Use This Template button', () => {
      render(
        <TemplatePreviewModal
          template={mockTemplate}
          isOpen={true}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByRole('button', { name: 'Use This Template' })).toBeInTheDocument()
    })

    it('calls onSelect when Use This Template is clicked', () => {
      const onSelect = vi.fn()
      render(
        <TemplatePreviewModal
          template={mockTemplate}
          isOpen={true}
          onClose={vi.fn()}
          onSelect={onSelect}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: 'Use This Template' }))

      expect(onSelect).toHaveBeenCalledWith(mockTemplate)
    })

    it('calls onClose when Use This Template is clicked', () => {
      const onClose = vi.fn()
      render(
        <TemplatePreviewModal
          template={mockTemplate}
          isOpen={true}
          onClose={onClose}
          onSelect={vi.fn()}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: 'Use This Template' }))

      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('close functionality', () => {
    it('displays Cancel button', () => {
      render(
        <TemplatePreviewModal
          template={mockTemplate}
          isOpen={true}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('calls onClose when Cancel button is clicked', () => {
      const onClose = vi.fn()
      render(
        <TemplatePreviewModal
          template={mockTemplate}
          isOpen={true}
          onClose={onClose}
          onSelect={vi.fn()}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(onClose).toHaveBeenCalled()
    })

    it('displays close button in header', () => {
      render(
        <TemplatePreviewModal
          template={mockTemplate}
          isOpen={true}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByRole('button', { name: 'Close preview' })).toBeInTheDocument()
    })

    it('calls onClose when header close button is clicked', () => {
      const onClose = vi.fn()
      render(
        <TemplatePreviewModal
          template={mockTemplate}
          isOpen={true}
          onClose={onClose}
          onSelect={vi.fn()}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: 'Close preview' }))

      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('accessibility (AC5, AC6)', () => {
    it('has dialog role', () => {
      render(
        <TemplatePreviewModal
          template={mockTemplate}
          isOpen={true}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('has accessible description', () => {
      render(
        <TemplatePreviewModal
          template={mockTemplate}
          isOpen={true}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByText(/Full preview of the Test Template/)).toBeInTheDocument()
    })

    it('buttons have minimum 44px touch target', () => {
      render(
        <TemplatePreviewModal
          template={mockTemplate}
          isOpen={true}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      const useButton = screen.getByRole('button', { name: 'Use This Template' })
      expect(useButton).toHaveClass('min-h-[44px]')
    })
  })

  describe('age-specific content', () => {
    it('shows simple rules for 5-7 age group', () => {
      render(
        <TemplatePreviewModal
          template={mockYoungChildTemplate}
          isOpen={true}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByText('Play in the living room')).toBeInTheDocument()
      expect(screen.getByText('Download apps alone')).toBeInTheDocument()
    })

    it('shows autonomy milestones for 14-16 age group', () => {
      render(
        <TemplatePreviewModal
          template={mockTeenTemplate}
          isOpen={true}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      )

      expect(screen.getByText('Get driver license')).toBeInTheDocument()
      expect(screen.getByText('No location sharing')).toBeInTheDocument()
    })
  })
})
