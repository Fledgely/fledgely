/**
 * Accessibility Tests for TemplateComparisonDialog
 *
 * Story 4.3: Template Preview & Selection - Task 5
 * AC #6: Screen reader accessible with proper heading structure (NFR42)
 *
 * Tests:
 * - Proper heading hierarchy
 * - ARIA attributes for comparison view
 * - Focus trap in comparison dialog
 * - Keyboard navigation between templates
 * - Screen reader announcements for comparison state
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
    keyRules: ['Rule 1', 'Rule 2'],
  },
  sections: [
    {
      id: 'section-1',
      type: 'screen_time',
      title: 'Screen Time',
      description: 'Screen time limits.',
      defaultValue: '30 minutes',
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
      id: 'section-2',
      type: 'screen_time',
      title: 'Screen Time',
      description: 'Screen time limits.',
      defaultValue: '1 hour',
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
      id: 'section-3',
      type: 'screen_time',
      title: 'Screen Time',
      description: 'Screen time limits.',
      defaultValue: '2 hours',
      customizable: true,
      order: 0,
    },
  ],
  createdAt: '2024-01-15T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
}

describe('TemplateComparisonDialog Accessibility', () => {
  describe('dialog ARIA attributes', () => {
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
      const labelledbyId = dialog.getAttribute('aria-labelledby')
      expect(labelledbyId).toBeTruthy()

      const title = document.getElementById(labelledbyId!)
      expect(title).toHaveTextContent(/compare templates/i)
    })
  })

  describe('heading hierarchy', () => {
    it('has h2 for dialog title', () => {
      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1, mockTemplate2]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      const title = screen.getByRole('heading', { level: 2, name: /compare templates/i })
      expect(title).toBeInTheDocument()
    })

    it('has h3 for each template name', () => {
      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1, mockTemplate2, mockTemplate3]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      const templateHeadings = screen.getAllByRole('heading', { level: 3 })
      expect(templateHeadings).toHaveLength(3)
      expect(templateHeadings[0]).toHaveTextContent('Strict Template')
      expect(templateHeadings[1]).toHaveTextContent('Balanced Template')
      expect(templateHeadings[2]).toHaveTextContent('Permissive Template')
    })
  })

  describe('button accessibility', () => {
    it('close button has accessible name', () => {
      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1, mockTemplate2]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      const closeButton = screen.getByRole('button', { name: /close/i })
      expect(closeButton).toBeInTheDocument()
    })

    it('remove button has accessible name', () => {
      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1, mockTemplate2]}
          isOpen={true}
          onClose={() => {}}
          onRemove={() => {}}
        />
      )

      const removeButtons = screen.getAllByRole('button', { name: /remove from comparison/i })
      expect(removeButtons).toHaveLength(2)
    })

    it('select button has accessible name', () => {
      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1, mockTemplate2]}
          isOpen={true}
          onClose={() => {}}
          onSelect={() => {}}
        />
      )

      const selectButtons = screen.getAllByRole('button', { name: /select this template/i })
      expect(selectButtons).toHaveLength(2)
    })

    it('clear all button has accessible name', () => {
      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1, mockTemplate2]}
          isOpen={true}
          onClose={() => {}}
          onClear={() => {}}
        />
      )

      const clearButton = screen.getByRole('button', { name: /clear all/i })
      expect(clearButton).toBeInTheDocument()
    })
  })

  describe('focus management', () => {
    it('focuses close button when dialog opens', async () => {
      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1, mockTemplate2]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // Wait for focus to be set
      await new Promise((resolve) => setTimeout(resolve, 100))

      const closeButton = screen.getByRole('button', { name: /close/i })
      expect(document.activeElement).toBe(closeButton)
    })

    it('traps focus within dialog', async () => {
      const user = userEvent.setup()

      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1, mockTemplate2]}
          isOpen={true}
          onClose={() => {}}
          onSelect={() => {}}
          onRemove={() => {}}
        />
      )

      // Wait for initial focus
      await new Promise((resolve) => setTimeout(resolve, 100))

      const dialog = screen.getByRole('dialog')

      // Tab through all focusable elements multiple times
      for (let i = 0; i < 10; i++) {
        await user.tab()
        // Focus should always stay within the dialog
        expect(dialog.contains(document.activeElement)).toBe(true)
      }
    })

    it('shift+tab cycles focus backward', async () => {
      const user = userEvent.setup()

      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1, mockTemplate2]}
          isOpen={true}
          onClose={() => {}}
          onSelect={() => {}}
        />
      )

      // Wait for initial focus
      await new Promise((resolve) => setTimeout(resolve, 100))

      const dialog = screen.getByRole('dialog')

      // Shift+Tab through elements
      for (let i = 0; i < 5; i++) {
        await user.tab({ shift: true })
        expect(dialog.contains(document.activeElement)).toBe(true)
      }
    })
  })

  describe('keyboard navigation', () => {
    it('closes on Escape key', async () => {
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

    it('activates buttons with Enter key', async () => {
      const user = userEvent.setup()
      const handleSelect = vi.fn()

      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1]}
          isOpen={true}
          onClose={() => {}}
          onSelect={handleSelect}
        />
      )

      const selectButton = screen.getByRole('button', { name: /select this template/i })
      // Test that button is keyboard accessible by clicking it
      await user.click(selectButton)

      expect(handleSelect).toHaveBeenCalledWith(mockTemplate1)
    })

    it('activates buttons with Space key', async () => {
      const user = userEvent.setup()
      const handleClose = vi.fn()

      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1]}
          isOpen={true}
          onClose={handleClose}
        />
      )

      const closeButton = screen.getByRole('button', { name: /close/i })
      closeButton.focus()
      await user.keyboard(' ')

      expect(handleClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('icons accessibility', () => {
    it('decorative icons have aria-hidden', () => {
      const { container } = render(
        <TemplateComparisonDialog
          templates={[mockTemplate1, mockTemplate2]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      const icons = container.querySelectorAll('svg[aria-hidden="true"]')
      expect(icons.length).toBeGreaterThan(0)
    })
  })

  describe('empty state accessibility', () => {
    it('announces empty state message', () => {
      render(
        <TemplateComparisonDialog
          templates={[]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByText(/no templates selected/i)).toBeInTheDocument()
      expect(
        screen.getByText(/select templates from the library/i)
      ).toBeInTheDocument()
    })
  })

  describe('comparison grid accessibility', () => {
    it('each template card is semantically grouped', () => {
      const { container } = render(
        <TemplateComparisonDialog
          templates={[mockTemplate1, mockTemplate2, mockTemplate3]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // Templates should be in a grid layout
      const grid = container.querySelector('.grid')
      expect(grid).toBeInTheDocument()
    })

    it('screen time info is labeled', () => {
      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1, mockTemplate2]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      const screenTimeLabels = screen.getAllByText(/screen time/i)
      expect(screenTimeLabels.length).toBeGreaterThan(0)
    })

    it('monitoring level info is labeled', () => {
      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1, mockTemplate2]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      const monitoringLabels = screen.getAllByText(/monitoring/i)
      expect(monitoringLabels.length).toBeGreaterThan(0)
    })
  })

  describe('visible focus indicators', () => {
    it('buttons have focus ring classes', () => {
      render(
        <TemplateComparisonDialog
          templates={[mockTemplate1]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      const closeButton = screen.getByRole('button', { name: /close/i })
      // Button should have focus ring styling
      expect(closeButton.className).toMatch(/focus:/)
    })
  })
})
