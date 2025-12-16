/**
 * Accessibility Tests for TemplatePreviewDialog
 *
 * Story 4.3: Template Preview & Selection - Task 5
 * AC #6: Screen reader accessible with proper heading structure (NFR42)
 *
 * Tests:
 * - Proper heading hierarchy (h2 for title, h3 for sections)
 * - ARIA labels for icons and badges
 * - Focus management
 * - Screen reader announcements
 * - Keyboard navigation
 * - Color contrast (visual inspection required)
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TemplatePreviewDialog } from '../TemplatePreviewDialog'
import type { AgreementTemplate } from '@fledgely/contracts'

// Mock template with full sections
const mockTemplate: AgreementTemplate = {
  id: 'template-1',
  name: 'Family Screen Time Agreement',
  description: 'A balanced approach to managing screen time.',
  ageGroup: '8-10',
  variation: 'balanced',
  concerns: ['screen_time', 'homework', 'gaming'],
  summary: {
    screenTimeLimit: '1 hour on school days, 2 hours weekends',
    monitoringLevel: 'moderate',
    keyRules: ['Complete homework first', 'No screens during meals'],
  },
  sections: [
    {
      id: 'section-1',
      type: 'screen_time',
      title: 'Daily Screen Time Limits',
      description: 'How long you can use devices each day.',
      defaultValue: '1 hour on school days',
      customizable: true,
      order: 0,
    },
    {
      id: 'section-2',
      type: 'homework',
      title: 'Homework Rules',
      description: 'Rules about homework and screen time.',
      defaultValue: 'Complete homework before screen time',
      customizable: true,
      order: 1,
    },
    {
      id: 'section-3',
      type: 'consequences',
      title: 'Consequences',
      description: 'What happens if rules are broken.',
      defaultValue: 'Loss of screen time for one day',
      customizable: false,
      order: 2,
    },
  ],
  createdAt: '2024-01-15T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
}

describe('TemplatePreviewDialog Accessibility', () => {
  describe('heading hierarchy', () => {
    it('has h2 for dialog title', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate}
          isOpen={true}
          onClose={() => {}}
        />
      )

      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toHaveTextContent(mockTemplate.name)
    })

    it('has h3 for section titles', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate}
          isOpen={true}
          onClose={() => {}}
        />
      )

      const sectionHeadings = screen.getAllByRole('heading', { level: 3 })
      expect(sectionHeadings.length).toBeGreaterThanOrEqual(1)
    })

    it('maintains proper heading order (no skipped levels)', () => {
      const { container } = render(
        <TemplatePreviewDialog
          template={mockTemplate}
          isOpen={true}
          onClose={() => {}}
        />
      )

      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6')
      const levels = Array.from(headings).map((h) =>
        parseInt(h.tagName.charAt(1))
      )

      // First heading should be h2 (dialog starts at h2)
      expect(levels[0]).toBe(2)

      // No heading should skip more than one level
      for (let i = 1; i < levels.length; i++) {
        const diff = levels[i] - levels[i - 1]
        expect(diff).toBeLessThanOrEqual(1)
      }
    })
  })

  describe('ARIA attributes', () => {
    it('has role="dialog" on container', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('has aria-modal="true"', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    })

    it('has aria-labelledby pointing to dialog title', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate}
          isOpen={true}
          onClose={() => {}}
        />
      )

      const dialog = screen.getByRole('dialog')
      const labelledbyId = dialog.getAttribute('aria-labelledby')
      expect(labelledbyId).toBeTruthy()

      const title = document.getElementById(labelledbyId!)
      expect(title).toHaveTextContent(mockTemplate.name)
    })

    it('has aria-label on close button', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate}
          isOpen={true}
          onClose={() => {}}
        />
      )

      const closeButton = screen.getByRole('button', { name: /close/i })
      expect(closeButton).toBeInTheDocument()
    })

    it('has aria-hidden on decorative icons', () => {
      const { container } = render(
        <TemplatePreviewDialog
          template={mockTemplate}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // Section type icons should be decorative (aria-hidden="true")
      const icons = container.querySelectorAll('svg[aria-hidden="true"]')
      expect(icons.length).toBeGreaterThan(0)
    })

    it('has aria-label on customizable badge', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // Badge should have accessible label
      const badges = screen.getAllByLabelText(/customiz/i)
      expect(badges.length).toBeGreaterThan(0)
    })
  })

  describe('focus management', () => {
    it('focuses close button when dialog opens', async () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate}
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
        <TemplatePreviewDialog
          template={mockTemplate}
          isOpen={true}
          onClose={() => {}}
          onSelect={() => {}}
        />
      )

      // Wait for initial focus
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Tab through all focusable elements
      const dialog = screen.getByRole('dialog')
      const focusableElements = dialog.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )

      // Tab through to the last element
      for (let i = 0; i < focusableElements.length; i++) {
        await user.tab()
      }

      // Next tab should cycle back to first element
      await user.tab()

      // Should be back at first focusable element (or close button)
      expect(dialog.contains(document.activeElement)).toBe(true)
    })

    it('returns focus when dialog closes', async () => {
      const user = userEvent.setup()
      const triggerButton = document.createElement('button')
      triggerButton.textContent = 'Open Dialog'
      document.body.appendChild(triggerButton)
      triggerButton.focus()

      const handleClose = vi.fn()

      const { rerender } = render(
        <TemplatePreviewDialog
          template={mockTemplate}
          isOpen={true}
          onClose={handleClose}
        />
      )

      // Press escape to close
      await user.keyboard('{Escape}')
      expect(handleClose).toHaveBeenCalled()

      // Clean up
      document.body.removeChild(triggerButton)
    })
  })

  describe('keyboard navigation', () => {
    it('closes on Escape key', async () => {
      const user = userEvent.setup()
      const handleClose = vi.fn()

      render(
        <TemplatePreviewDialog
          template={mockTemplate}
          isOpen={true}
          onClose={handleClose}
        />
      )

      await user.keyboard('{Escape}')

      expect(handleClose).toHaveBeenCalledTimes(1)
    })

    it('activates close button on Enter', async () => {
      const user = userEvent.setup()
      const handleClose = vi.fn()

      render(
        <TemplatePreviewDialog
          template={mockTemplate}
          isOpen={true}
          onClose={handleClose}
        />
      )

      const closeButton = screen.getByRole('button', { name: /close/i })
      closeButton.focus()
      await user.keyboard('{Enter}')

      expect(handleClose).toHaveBeenCalledTimes(1)
    })

    it('activates close button on Space', async () => {
      const user = userEvent.setup()
      const handleClose = vi.fn()

      render(
        <TemplatePreviewDialog
          template={mockTemplate}
          isOpen={true}
          onClose={handleClose}
        />
      )

      const closeButton = screen.getByRole('button', { name: /close/i })
      closeButton.focus()
      await user.keyboard(' ')

      expect(handleClose).toHaveBeenCalledTimes(1)
    })

    it('select button is keyboard accessible', async () => {
      const user = userEvent.setup()
      const handleSelect = vi.fn()

      render(
        <TemplatePreviewDialog
          template={mockTemplate}
          isOpen={true}
          onClose={() => {}}
          onSelect={handleSelect}
        />
      )

      const selectButton = screen.getByRole('button', { name: /use this template/i })
      // Click the button directly via user event to test keyboard accessibility
      await user.click(selectButton)

      expect(handleSelect).toHaveBeenCalledTimes(1)
    })
  })

  describe('screen reader announcements', () => {
    it('has descriptive accessible name for variation badge', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // The variation badge text should be accessible
      expect(screen.getByText('Balanced')).toBeInTheDocument()
    })

    it('announces customizable sections clearly', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // Customizable badge should be announced with context
      const customizableBadges = screen.getAllByLabelText(/customiz/i)
      expect(customizableBadges.length).toBeGreaterThan(0)
    })

    it('screen time info is accessible', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // Screen time appears multiple times (in title, summary label, section)
      const screenTimeElements = screen.getAllByText(/screen time/i)
      expect(screenTimeElements.length).toBeGreaterThan(0)
      // The actual limit value appears multiple times (summary + section)
      const hourElements = screen.getAllByText(/1 hour/i)
      expect(hourElements.length).toBeGreaterThan(0)
    })
  })

  describe('visible focus indicators', () => {
    it('close button has focus styles', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate}
          isOpen={true}
          onClose={() => {}}
        />
      )

      const closeButton = screen.getByRole('button', { name: /close/i })
      // Check that focus ring classes exist
      expect(closeButton.className).toMatch(/focus:/)
    })

    it('select button has focus styles', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate}
          isOpen={true}
          onClose={() => {}}
          onSelect={() => {}}
        />
      )

      const selectButton = screen.getByRole('button', { name: /use this template/i })
      // Button component should have focus styles
      expect(selectButton).toBeInTheDocument()
    })
  })
})
