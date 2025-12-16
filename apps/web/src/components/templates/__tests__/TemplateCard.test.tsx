import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemplateCard } from '../TemplateCard'
import type { AgreementTemplate } from '@fledgely/contracts'

// Mock template data
const mockTemplate: AgreementTemplate = {
  id: 'a5c3e8b0-1234-4567-8901-bcdef1234567',
  name: 'Test Template',
  description: 'A test template for ages 8-10',
  ageGroup: '8-10',
  variation: 'balanced',
  concerns: ['screen_time', 'gaming', 'social_media'],
  summary: {
    screenTimeLimit: '2 hours daily',
    monitoringLevel: 'moderate',
    keyRules: [
      'Complete homework before screen time',
      'No devices during meals',
      'Bedtime is device-free',
      'Parents can check activity',
    ],
  },
  sections: [],
  version: '1.0.0',
  lastUpdated: '2024-01-01',
}

describe('TemplateCard', () => {
  describe('rendering', () => {
    it('renders template name', () => {
      render(<TemplateCard template={mockTemplate} />)
      expect(screen.getByText('Test Template')).toBeInTheDocument()
    })

    it('renders template description', () => {
      render(<TemplateCard template={mockTemplate} />)
      expect(screen.getByText('A test template for ages 8-10')).toBeInTheDocument()
    })

    it('renders variation badge', () => {
      render(<TemplateCard template={mockTemplate} />)
      expect(screen.getByText('Balanced')).toBeInTheDocument()
    })

    it('renders screen time limit', () => {
      render(<TemplateCard template={mockTemplate} />)
      expect(screen.getByText('2 hours daily')).toBeInTheDocument()
    })

    it('renders monitoring level badge', () => {
      render(<TemplateCard template={mockTemplate} />)
      expect(screen.getByText('Moderate Monitoring')).toBeInTheDocument()
    })

    it('renders first 3 key rules', () => {
      render(<TemplateCard template={mockTemplate} />)
      expect(screen.getByText('Complete homework before screen time')).toBeInTheDocument()
      expect(screen.getByText('No devices during meals')).toBeInTheDocument()
      expect(screen.getByText('Bedtime is device-free')).toBeInTheDocument()
    })

    it('shows +N more rules when more than 3 rules', () => {
      render(<TemplateCard template={mockTemplate} />)
      expect(screen.getByText('+1 more rules')).toBeInTheDocument()
    })

    it('renders first 3 concern tags', () => {
      render(<TemplateCard template={mockTemplate} />)
      expect(screen.getByText('Screen Time')).toBeInTheDocument()
      expect(screen.getByText('Gaming')).toBeInTheDocument()
      expect(screen.getByText('Social Media')).toBeInTheDocument()
    })
  })

  describe('variation badge colors', () => {
    it('renders strict variation with red color', () => {
      const strictTemplate = { ...mockTemplate, variation: 'strict' as const }
      render(<TemplateCard template={strictTemplate} />)
      const badge = screen.getByText('Strict')
      expect(badge.className).toContain('bg-red-100')
    })

    it('renders balanced variation with blue color', () => {
      render(<TemplateCard template={mockTemplate} />)
      const badge = screen.getByText('Balanced')
      expect(badge.className).toContain('bg-blue-100')
    })

    it('renders permissive variation with green color', () => {
      const permissiveTemplate = { ...mockTemplate, variation: 'permissive' as const }
      render(<TemplateCard template={permissiveTemplate} />)
      const badge = screen.getByText('Permissive')
      expect(badge.className).toContain('bg-green-100')
    })
  })

  describe('selection state', () => {
    it('shows selected indicator when isSelected is true', () => {
      render(<TemplateCard template={mockTemplate} isSelected={true} />)
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
    })

    it('does not show selected indicator when isSelected is false', () => {
      render(<TemplateCard template={mockTemplate} isSelected={false} />)
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')
    })

    it('applies selected styling when isSelected is true', () => {
      render(<TemplateCard template={mockTemplate} isSelected={true} />)
      const card = screen.getByRole('button')
      expect(card.className).toContain('border-blue-500')
    })
  })

  describe('interactions', () => {
    it('calls onSelect when clicked', async () => {
      const user = userEvent.setup()
      const handleSelect = vi.fn()
      render(<TemplateCard template={mockTemplate} onSelect={handleSelect} />)

      await user.click(screen.getByRole('button'))

      expect(handleSelect).toHaveBeenCalledTimes(1)
      expect(handleSelect).toHaveBeenCalledWith(mockTemplate)
    })

    it('calls onSelect when Enter key is pressed', () => {
      const handleSelect = vi.fn()
      render(<TemplateCard template={mockTemplate} onSelect={handleSelect} />)

      const card = screen.getByRole('button')
      fireEvent.keyDown(card, { key: 'Enter' })

      expect(handleSelect).toHaveBeenCalledTimes(1)
      expect(handleSelect).toHaveBeenCalledWith(mockTemplate)
    })

    it('calls onSelect when Space key is pressed', () => {
      const handleSelect = vi.fn()
      render(<TemplateCard template={mockTemplate} onSelect={handleSelect} />)

      const card = screen.getByRole('button')
      fireEvent.keyDown(card, { key: ' ' })

      expect(handleSelect).toHaveBeenCalledTimes(1)
      expect(handleSelect).toHaveBeenCalledWith(mockTemplate)
    })

    it('does not call onSelect for other keys', () => {
      const handleSelect = vi.fn()
      render(<TemplateCard template={mockTemplate} onSelect={handleSelect} />)

      const card = screen.getByRole('button')
      fireEvent.keyDown(card, { key: 'a' })

      expect(handleSelect).not.toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('has role="button"', () => {
      render(<TemplateCard template={mockTemplate} />)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('has tabIndex="0"', () => {
      render(<TemplateCard template={mockTemplate} />)
      expect(screen.getByRole('button')).toHaveAttribute('tabindex', '0')
    })

    it('has accessible aria-label', () => {
      render(<TemplateCard template={mockTemplate} />)
      const card = screen.getByRole('button')
      expect(card).toHaveAttribute('aria-label')
      expect(card.getAttribute('aria-label')).toContain('Test Template')
    })

    it('has aria-pressed attribute', () => {
      render(<TemplateCard template={mockTemplate} />)
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed')
    })
  })
})
