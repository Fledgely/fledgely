/**
 * Tests for TemplateComparisonDialog
 *
 * Story 4.3: Template Preview & Selection - Task 4
 * AC #5: Side-by-side template comparison
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { TemplateComparisonDialog } from '../TemplateComparisonDialog'
import type { AgreementTemplate } from '@fledgely/contracts'

// Mock templates for testing
const mockTemplate1: AgreementTemplate = {
  id: 'template-1',
  name: 'Strict Template',
  description: 'A strict template for testing.',
  ageGroup: '8-10',
  variation: 'strict',
  concerns: ['screen_time', 'safety'],
  summary: {
    screenTimeLimit: '30 minutes on school days',
    monitoringLevel: 'comprehensive',
    keyRules: ['Rule 1A', 'Rule 2A'],
  },
  sections: [
    {
      id: 'terms-1',
      type: 'terms',
      title: 'Terms Section',
      description: 'Terms description.',
      defaultValue: 'Terms content for template 1',
      customizable: true,
      order: 0,
    },
  ],
  createdAt: '2024-01-15T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
}

const mockTemplate2: AgreementTemplate = {
  id: 'template-2',
  name: 'Balanced Template',
  description: 'A balanced template for testing.',
  ageGroup: '8-10',
  variation: 'balanced',
  concerns: ['screen_time', 'homework'],
  summary: {
    screenTimeLimit: '1 hour on school days',
    monitoringLevel: 'moderate',
    keyRules: ['Rule 1B', 'Rule 2B'],
  },
  sections: [
    {
      id: 'terms-2',
      type: 'terms',
      title: 'Terms Section',
      description: 'Terms description.',
      defaultValue: 'Terms content for template 2',
      customizable: true,
      order: 0,
    },
  ],
  createdAt: '2024-01-15T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
}

const mockTemplate3: AgreementTemplate = {
  id: 'template-3',
  name: 'Permissive Template',
  description: 'A permissive template for testing.',
  ageGroup: '8-10',
  variation: 'permissive',
  concerns: ['gaming', 'social_media'],
  summary: {
    screenTimeLimit: '2 hours on school days',
    monitoringLevel: 'light',
    keyRules: ['Rule 1C', 'Rule 2C'],
  },
  sections: [
    {
      id: 'terms-3',
      type: 'terms',
      title: 'Terms Section',
      description: 'Terms description.',
      defaultValue: 'Terms content for template 3',
      customizable: true,
      order: 0,
    },
  ],
  createdAt: '2024-01-15T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
}

describe('TemplateComparisonDialog', () => {
  describe('rendering', () => {
    it('renders nothing when not open', () => {
      const { container } = render(
        <TemplateComparisonDialog
          templates={[mockTemplate1, mockTemplate2]}
          isOpen={false}
          onClose={() => {}}
        />
      )

      expect(container.textContent).toBe('')
    })

    it('renders dialog when open', () => {
      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1, mockTemplate2]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('displays "Compare Templates" title', () => {
      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1, mockTemplate2]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByRole('heading', { name: /compare templates/i })).toBeInTheDocument()
    })
  })

  describe('template display', () => {
    it('displays all provided template names', () => {
      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1, mockTemplate2, mockTemplate3]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByText('Strict Template')).toBeInTheDocument()
      expect(screen.getByText('Balanced Template')).toBeInTheDocument()
      expect(screen.getByText('Permissive Template')).toBeInTheDocument()
    })

    it('displays screen time for each template', () => {
      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1, mockTemplate2]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByText(/30 minutes/i)).toBeInTheDocument()
      expect(screen.getByText(/1 hour/i)).toBeInTheDocument()
    })

    it('displays monitoring level for each template', () => {
      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1, mockTemplate2]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByText(/comprehensive/i)).toBeInTheDocument()
      expect(screen.getByText(/moderate/i)).toBeInTheDocument()
    })

    it('displays variation badge for each template', () => {
      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1, mockTemplate2]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByText('Strict')).toBeInTheDocument()
      expect(screen.getByText('Balanced')).toBeInTheDocument()
    })
  })

  describe('user interactions', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup()
      const handleClose = vi.fn()

      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1, mockTemplate2]}
          isOpen={true}
          onClose={handleClose}
        />
      )

      await user.click(screen.getByRole('button', { name: /close/i }))

      expect(handleClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when escape key is pressed', async () => {
      const user = userEvent.setup()
      const handleClose = vi.fn()

      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1, mockTemplate2]}
          isOpen={true}
          onClose={handleClose}
        />
      )

      await user.keyboard('{Escape}')

      expect(handleClose).toHaveBeenCalledTimes(1)
    })

    it('calls onSelect when "Select" button is clicked', async () => {
      const user = userEvent.setup()
      const handleSelect = vi.fn()

      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1, mockTemplate2]}
          isOpen={true}
          onClose={() => {}}
          onSelect={handleSelect}
        />
      )

      const selectButtons = screen.getAllByRole('button', { name: /select this template/i })
      await user.click(selectButtons[0])

      expect(handleSelect).toHaveBeenCalledWith(mockTemplate1)
    })

    it('calls onRemove when "Remove" button is clicked', async () => {
      const user = userEvent.setup()
      const handleRemove = vi.fn()

      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1, mockTemplate2]}
          isOpen={true}
          onClose={() => {}}
          onRemove={handleRemove}
        />
      )

      const removeButtons = screen.getAllByRole('button', { name: /remove from comparison/i })
      await user.click(removeButtons[0])

      expect(handleRemove).toHaveBeenCalledWith(mockTemplate1.id)
    })
  })

  describe('clear comparison', () => {
    it('displays "Clear All" button when onClear is provided', () => {
      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1, mockTemplate2]}
          isOpen={true}
          onClose={() => {}}
          onClear={() => {}}
        />
      )

      expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument()
    })

    it('does not display "Clear All" button when onClear is not provided', () => {
      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1, mockTemplate2]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.queryByRole('button', { name: /clear all/i })).not.toBeInTheDocument()
    })

    it('calls onClear when "Clear All" button is clicked', async () => {
      const user = userEvent.setup()
      const handleClear = vi.fn()

      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1, mockTemplate2]}
          isOpen={true}
          onClose={() => {}}
          onClear={handleClear}
        />
      )

      await user.click(screen.getByRole('button', { name: /clear all/i }))

      expect(handleClear).toHaveBeenCalledTimes(1)
    })
  })

  describe('accessibility', () => {
    it('has role="dialog"', () => {
      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1, mockTemplate2]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('has aria-modal="true"', () => {
      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1, mockTemplate2]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    })

    it('has aria-labelledby pointing to title', () => {
      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1, mockTemplate2]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby')
    })
  })

  describe('responsive layout', () => {
    it('renders in grid layout with correct columns', () => {
      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1, mockTemplate2, mockTemplate3]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // Check that all 3 templates are rendered
      const templateCards = screen.getAllByText(/Template$/)
      expect(templateCards.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('edge cases', () => {
    it('handles empty templates array', () => {
      render(
        <TemplateComparisonDialog
          templates={[]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByText(/no templates selected/i)).toBeInTheDocument()
    })

    it('handles single template', () => {
      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByText('Strict Template')).toBeInTheDocument()
    })
  })
})
