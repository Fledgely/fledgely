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

    // Story 4.6: Template Accessibility - AC1, AC3, AC6
    it('uses h2 for proper heading hierarchy (AC1)', () => {
      render(<TemplateCard template={mockTemplate} />)

      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toHaveTextContent('Test Template')
    })

    it('has visible focus indicator classes (AC3)', () => {
      render(<TemplateCard template={mockTemplate} />)

      const button = screen.getByRole('button', { name: /Select Test Template/ })
      expect(button).toHaveClass('focus:ring-2')
      expect(button).toHaveClass('focus:ring-primary')
      expect(button).toHaveClass('focus:ring-offset-2')
    })

    it('has focus:outline-none to prevent double focus ring (AC3)', () => {
      render(<TemplateCard template={mockTemplate} />)

      const button = screen.getByRole('button', { name: /Select Test Template/ })
      expect(button).toHaveClass('focus:outline-none')
    })

    it('compare button has visible focus indicator (AC3)', () => {
      render(<TemplateCard template={mockTemplate} showCompare />)

      const button = screen.getByLabelText('Add to comparison')
      expect(button).toHaveClass('focus:ring-2')
      expect(button).toHaveClass('focus:ring-primary')
      expect(button).toHaveClass('focus:ring-offset-2')
    })

    it('all icons are marked aria-hidden (AC1)', () => {
      render(<TemplateCard template={mockTemplate} showCompare />)

      const { container } = render(<TemplateCard template={mockTemplate} />)
      const svgs = container.querySelectorAll('svg')
      svgs.forEach((svg) => {
        expect(svg).toHaveAttribute('aria-hidden', 'true')
      })
    })

    // Story 4.6: Color Contrast (AC7) - verify info not conveyed by color alone
    it('monitoring level badge has text label, not just color (AC7)', () => {
      render(<TemplateCard template={mockTemplate} />)
      // Verify the monitoring level is communicated via text, not just color
      expect(screen.getByText('Medium Monitoring')).toBeInTheDocument()
    })

    it('variation badge has text label, not just color (AC7)', () => {
      render(<TemplateCard template={mockTemplate} />)
      // Verify variation is communicated via text, not just color
      expect(screen.getByText('Balanced')).toBeInTheDocument()
    })

    it('age-appropriate indicators have text labels (AC7)', () => {
      const youngChildTemplate = {
        ...mockTemplate,
        ageGroup: '5-7' as const,
        simpleRules: [{ text: 'Test rule', isAllowed: true }],
      }
      render(<TemplateCard template={youngChildTemplate} />)
      // Verify the indicator has text, not just an icon
      expect(screen.getByText('Simple Yes/No Rules')).toBeInTheDocument()
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

  // Story 4.3: Compare mode functionality
  describe('compare mode (Story 4.3)', () => {
    it('does not show compare button by default', () => {
      render(<TemplateCard template={mockTemplate} />)
      expect(screen.queryByLabelText(/Add to comparison/)).not.toBeInTheDocument()
    })

    it('shows compare button when showCompare is true', () => {
      render(<TemplateCard template={mockTemplate} showCompare />)
      expect(screen.getByLabelText('Add to comparison')).toBeInTheDocument()
    })

    it('shows checked state when isInComparison is true', () => {
      render(<TemplateCard template={mockTemplate} showCompare isInComparison />)
      const button = screen.getByLabelText('Remove from comparison')
      expect(button).toHaveAttribute('aria-pressed', 'true')
    })

    it('shows unchecked state when isInComparison is false', () => {
      render(<TemplateCard template={mockTemplate} showCompare isInComparison={false} />)
      const button = screen.getByLabelText('Add to comparison')
      expect(button).toHaveAttribute('aria-pressed', 'false')
    })

    it('calls onCompareToggle when compare button is clicked', () => {
      const onCompareToggle = vi.fn()
      render(<TemplateCard template={mockTemplate} showCompare onCompareToggle={onCompareToggle} />)

      fireEvent.click(screen.getByLabelText('Add to comparison'))

      expect(onCompareToggle).toHaveBeenCalledWith(mockTemplate)
    })

    it('does not call onSelect when compare button is clicked', () => {
      const onSelect = vi.fn()
      const onCompareToggle = vi.fn()
      render(
        <TemplateCard
          template={mockTemplate}
          showCompare
          onSelect={onSelect}
          onCompareToggle={onCompareToggle}
        />
      )

      fireEvent.click(screen.getByLabelText('Add to comparison'))

      expect(onCompareToggle).toHaveBeenCalled()
      expect(onSelect).not.toHaveBeenCalled()
    })

    it('disables compare button when canAddToComparison is false and not in comparison', () => {
      render(
        <TemplateCard
          template={mockTemplate}
          showCompare
          isInComparison={false}
          canAddToComparison={false}
        />
      )

      const button = screen.getByLabelText('Add to comparison')
      expect(button).toBeDisabled()
    })

    it('does not disable compare button when already in comparison even if canAddToComparison is false', () => {
      render(
        <TemplateCard
          template={mockTemplate}
          showCompare
          isInComparison={true}
          canAddToComparison={false}
        />
      )

      const button = screen.getByLabelText('Remove from comparison')
      expect(button).not.toBeDisabled()
    })

    it('compare button has minimum 44px touch target', () => {
      render(<TemplateCard template={mockTemplate} showCompare />)

      const button = screen.getByLabelText('Add to comparison')
      expect(button).toHaveClass('min-h-[44px]')
      expect(button).toHaveClass('min-w-[44px]')
    })

    it('responds to Enter key on compare button', () => {
      const onCompareToggle = vi.fn()
      render(<TemplateCard template={mockTemplate} showCompare onCompareToggle={onCompareToggle} />)

      const button = screen.getByLabelText('Add to comparison')
      fireEvent.keyDown(button, { key: 'Enter' })

      expect(onCompareToggle).toHaveBeenCalledWith(mockTemplate)
    })

    it('responds to Space key on compare button', () => {
      const onCompareToggle = vi.fn()
      render(<TemplateCard template={mockTemplate} showCompare onCompareToggle={onCompareToggle} />)

      const button = screen.getByLabelText('Add to comparison')
      fireEvent.keyDown(button, { key: ' ' })

      expect(onCompareToggle).toHaveBeenCalledWith(mockTemplate)
    })
  })
})
