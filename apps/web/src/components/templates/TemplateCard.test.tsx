/**
 * Unit tests for TemplateCard component.
 *
 * Story 4.1: Template Library Structure - AC3, AC5
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TemplateCard } from './TemplateCard'
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

describe('TemplateCard', () => {
  describe('rendering', () => {
    it('renders template name', () => {
      render(<TemplateCard template={mockTemplate} />)
      expect(screen.getByText('Test Template')).toBeInTheDocument()
    })

    it('renders template description', () => {
      render(<TemplateCard template={mockTemplate} />)
      expect(screen.getByText('A test template for unit testing purposes.')).toBeInTheDocument()
    })

    it('renders age group badge', () => {
      render(<TemplateCard template={mockTemplate} />)
      expect(screen.getByText('Ages 8-10')).toBeInTheDocument()
    })

    it('renders variation badge', () => {
      render(<TemplateCard template={mockTemplate} />)
      expect(screen.getByText('Balanced')).toBeInTheDocument()
    })

    it('renders screen time limits', () => {
      render(<TemplateCard template={mockTemplate} />)
      expect(screen.getByText(/1h 30m\/day weekdays/)).toBeInTheDocument()
      expect(screen.getByText(/2h 30m\/day weekends/)).toBeInTheDocument()
    })

    it('renders monitoring level badge', () => {
      render(<TemplateCard template={mockTemplate} />)
      expect(screen.getByText('Medium Monitoring')).toBeInTheDocument()
    })

    it('renders key rules count', () => {
      render(<TemplateCard template={mockTemplate} />)
      expect(screen.getByText('3 core rules')).toBeInTheDocument()
    })
  })

  describe('screen time formatting', () => {
    it('formats minutes under 60 as minutes only', () => {
      const template = { ...mockTemplate, screenTimeLimits: { weekday: 45, weekend: 30 } }
      render(<TemplateCard template={template} />)
      expect(screen.getByText(/45m\/day weekdays/)).toBeInTheDocument()
      expect(screen.getByText(/30m\/day weekends/)).toBeInTheDocument()
    })

    it('formats exact hours without minutes', () => {
      const template = { ...mockTemplate, screenTimeLimits: { weekday: 60, weekend: 120 } }
      render(<TemplateCard template={template} />)
      expect(screen.getByText(/1h\/day weekdays/)).toBeInTheDocument()
      expect(screen.getByText(/2h\/day weekends/)).toBeInTheDocument()
    })

    it('formats hours with remaining minutes', () => {
      const template = { ...mockTemplate, screenTimeLimits: { weekday: 75, weekend: 195 } }
      render(<TemplateCard template={template} />)
      expect(screen.getByText(/1h 15m\/day weekdays/)).toBeInTheDocument()
      expect(screen.getByText(/3h 15m\/day weekends/)).toBeInTheDocument()
    })
  })

  describe('variation styling', () => {
    it('applies strict variation color', () => {
      const template = { ...mockTemplate, variation: 'strict' as const }
      render(<TemplateCard template={template} />)
      const badge = screen.getByText('Strict')
      expect(badge).toHaveClass('bg-purple-100')
    })

    it('applies balanced variation color', () => {
      render(<TemplateCard template={mockTemplate} />)
      const badge = screen.getByText('Balanced')
      expect(badge).toHaveClass('bg-blue-100')
    })

    it('applies permissive variation color', () => {
      const template = { ...mockTemplate, variation: 'permissive' as const }
      render(<TemplateCard template={template} />)
      const badge = screen.getByText('Permissive')
      expect(badge).toHaveClass('bg-teal-100')
    })
  })

  describe('monitoring level styling', () => {
    it('applies high monitoring color', () => {
      const template = { ...mockTemplate, monitoringLevel: 'high' as const }
      render(<TemplateCard template={template} />)
      const badge = screen.getByText('High Monitoring')
      expect(badge).toHaveClass('bg-red-100')
    })

    it('applies medium monitoring color', () => {
      render(<TemplateCard template={mockTemplate} />)
      const badge = screen.getByText('Medium Monitoring')
      expect(badge).toHaveClass('bg-yellow-100')
    })

    it('applies low monitoring color', () => {
      const template = { ...mockTemplate, monitoringLevel: 'low' as const }
      render(<TemplateCard template={template} />)
      const badge = screen.getByText('Light Monitoring')
      expect(badge).toHaveClass('bg-green-100')
    })
  })

  describe('interaction', () => {
    it('calls onSelect when clicked', () => {
      const onSelect = vi.fn()
      render(<TemplateCard template={mockTemplate} onSelect={onSelect} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(onSelect).toHaveBeenCalledWith(mockTemplate)
    })

    it('calls onSelect on Enter key', () => {
      const onSelect = vi.fn()
      render(<TemplateCard template={mockTemplate} onSelect={onSelect} />)

      const button = screen.getByRole('button')
      fireEvent.keyDown(button, { key: 'Enter' })

      expect(onSelect).toHaveBeenCalledWith(mockTemplate)
    })

    it('calls onSelect on Space key', () => {
      const onSelect = vi.fn()
      render(<TemplateCard template={mockTemplate} onSelect={onSelect} />)

      const button = screen.getByRole('button')
      fireEvent.keyDown(button, { key: ' ' })

      expect(onSelect).toHaveBeenCalledWith(mockTemplate)
    })

    it('does not error when clicked without onSelect', () => {
      render(<TemplateCard template={mockTemplate} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      // Should not throw
      expect(button).toBeInTheDocument()
    })
  })

  describe('selection state', () => {
    it('shows selected state when isSelected is true', () => {
      render(<TemplateCard template={mockTemplate} isSelected />)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('border-primary')
      expect(button).toHaveClass('ring-2')
    })

    it('does not show selected state when isSelected is false', () => {
      render(<TemplateCard template={mockTemplate} isSelected={false} />)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('border-gray-200')
      expect(button).not.toHaveClass('ring-2')
    })

    it('has aria-pressed attribute matching selection state', () => {
      const { rerender } = render(<TemplateCard template={mockTemplate} isSelected />)

      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')

      rerender(<TemplateCard template={mockTemplate} isSelected={false} />)

      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')
    })
  })

  describe('accessibility', () => {
    it('has descriptive aria-label', () => {
      render(<TemplateCard template={mockTemplate} />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Select Test Template template for Ages 8-10')
    })

    it('is focusable', () => {
      render(<TemplateCard template={mockTemplate} />)

      const button = screen.getByRole('button')
      button.focus()

      expect(button).toHaveFocus()
    })

    it('has minimum touch target size', () => {
      render(<TemplateCard template={mockTemplate} />)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('min-h-[180px]')
    })
  })

  describe('different age groups', () => {
    it.each([
      ['5-7', 'Ages 5-7'],
      ['8-10', 'Ages 8-10'],
      ['11-13', 'Ages 11-13'],
      ['14-16', 'Ages 14-16'],
    ] as const)('renders %s age group correctly', (ageGroup, label) => {
      const template = { ...mockTemplate, ageGroup }
      render(<TemplateCard template={template} />)
      expect(screen.getByText(label)).toBeInTheDocument()
    })
  })

  // Story 4.2: Age-specific indicators
  describe('age-specific indicators (Story 4.2)', () => {
    it('shows simple rules indicator for 5-7 with simpleRules', () => {
      const template = {
        ...mockTemplate,
        ageGroup: '5-7' as const,
        simpleRules: [
          { text: 'Play in living room', isAllowed: true },
          { text: 'Download apps alone', isAllowed: false },
        ],
      }
      render(<TemplateCard template={template} />)

      expect(screen.getByText('Simple Yes/No Rules')).toBeInTheDocument()
    })

    it('does not show simple rules indicator for 5-7 without simpleRules', () => {
      const template = {
        ...mockTemplate,
        ageGroup: '5-7' as const,
      }
      render(<TemplateCard template={template} />)

      expect(screen.queryByText('Simple Yes/No Rules')).not.toBeInTheDocument()
    })

    it('does not show simple rules indicator for other age groups with simpleRules', () => {
      const template = {
        ...mockTemplate,
        ageGroup: '8-10' as const,
        simpleRules: [{ text: 'Some rule', isAllowed: true }],
      }
      render(<TemplateCard template={template} />)

      expect(screen.queryByText('Simple Yes/No Rules')).not.toBeInTheDocument()
    })

    it('shows autonomy path indicator for 14-16 with autonomyMilestones', () => {
      const template = {
        ...mockTemplate,
        ageGroup: '14-16' as const,
        autonomyMilestones: [{ milestone: 'Get license', reward: 'No location sharing' }],
      }
      render(<TemplateCard template={template} />)

      expect(screen.getByText('Includes Autonomy Path')).toBeInTheDocument()
    })

    it('does not show autonomy path indicator for 14-16 without milestones', () => {
      const template = {
        ...mockTemplate,
        ageGroup: '14-16' as const,
      }
      render(<TemplateCard template={template} />)

      expect(screen.queryByText('Includes Autonomy Path')).not.toBeInTheDocument()
    })

    it('does not show autonomy path indicator for other age groups with milestones', () => {
      const template = {
        ...mockTemplate,
        ageGroup: '11-13' as const,
        autonomyMilestones: [{ milestone: 'Some milestone', reward: 'Some reward' }],
      }
      render(<TemplateCard template={template} />)

      expect(screen.queryByText('Includes Autonomy Path')).not.toBeInTheDocument()
    })

    it('marks indicator icons as aria-hidden', () => {
      const template = {
        ...mockTemplate,
        ageGroup: '5-7' as const,
        simpleRules: [{ text: 'Test', isAllowed: true }],
      }
      const { container } = render(<TemplateCard template={template} />)

      const hiddenIcons = container.querySelectorAll('[aria-hidden="true"]')
      expect(hiddenIcons.length).toBeGreaterThan(0)
    })
  })
})
