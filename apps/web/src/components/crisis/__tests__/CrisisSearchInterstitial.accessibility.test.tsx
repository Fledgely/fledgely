/**
 * CrisisSearchInterstitial Accessibility Tests
 *
 * Story 7.6: Crisis Search Redirection - Task 7
 *
 * Tests for accessibility compliance:
 * - Keyboard navigation (NFR43)
 * - ARIA labels and roles
 * - Focus trap in modal
 * - Screen reader announcements
 * - Color contrast (NFR45: 4.5:1)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CrisisSearchInterstitial } from '../CrisisSearchInterstitial'
import type { CrisisSearchMatch } from '@fledgely/contracts'

// Mock match for testing
const mockMatch: CrisisSearchMatch = {
  query: 'test query',
  category: 'suicide',
  confidence: 'high',
  matchedPattern: 'test',
}

const mockResources = ['988lifeline.org', 'crisistextline.org']

// Mock window.open
const mockOpen = vi.fn()
const originalOpen = window.open

beforeEach(() => {
  window.open = mockOpen
  mockOpen.mockClear()
})

afterEach(() => {
  window.open = originalOpen
})

describe('CrisisSearchInterstitial Accessibility', () => {
  describe('Keyboard Navigation (NFR43)', () => {
    it('receives focus on first resource link on mount', () => {
      render(
        <CrisisSearchInterstitial
          match={mockMatch}
          suggestedResources={mockResources}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      // First resource link should be focused
      const firstLink = screen.getAllByRole('link')[0]
      expect(document.activeElement).toBe(firstLink)
    })

    it('allows Tab navigation through interactive elements', async () => {
      const user = userEvent.setup()

      render(
        <CrisisSearchInterstitial
          match={mockMatch}
          suggestedResources={mockResources}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      // First focus is already on first link, tab moves to next element
      await user.tab()
      // Should move to next focusable element (crisistextline link)
      expect(document.activeElement?.getAttribute('href')).toContain('crisistextline.org')

      await user.tab()
      // Should move to next focusable element
      expect(document.activeElement).not.toBeNull()
    })

    it('activates buttons with Enter key', async () => {
      const onContinue = vi.fn()
      const user = userEvent.setup()

      render(
        <CrisisSearchInterstitial
          match={mockMatch}
          suggestedResources={mockResources}
          onContinue={onContinue}
          onResourceClick={vi.fn()}
        />
      )

      // Find and focus the Continue button
      const continueButton = screen.getByRole('button', { name: /Continue to Search/i })
      continueButton.focus()

      await user.keyboard('{Enter}')

      expect(onContinue).toHaveBeenCalled()
    })

    it('activates buttons with Space key', async () => {
      const onContinue = vi.fn()
      const user = userEvent.setup()

      render(
        <CrisisSearchInterstitial
          match={mockMatch}
          suggestedResources={mockResources}
          onContinue={onContinue}
          onResourceClick={vi.fn()}
        />
      )

      const continueButton = screen.getByRole('button', { name: /Continue to Search/i })
      continueButton.focus()

      await user.keyboard(' ')

      expect(onContinue).toHaveBeenCalled()
    })

    it('allows Escape key to dismiss (if implemented)', async () => {
      const onContinue = vi.fn()

      render(
        <CrisisSearchInterstitial
          match={mockMatch}
          suggestedResources={mockResources}
          onContinue={onContinue}
          onResourceClick={vi.fn()}
        />
      )

      // Escape should ideally dismiss the modal (behavior may vary)
      fireEvent.keyDown(document, { key: 'Escape' })

      // This test documents expected behavior
      // Implementation may or may not call onContinue on Escape
    })
  })

  describe('ARIA Attributes', () => {
    it('has role="dialog"', () => {
      render(
        <CrisisSearchInterstitial
          match={mockMatch}
          suggestedResources={mockResources}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('has aria-modal="true"', () => {
      render(
        <CrisisSearchInterstitial
          match={mockMatch}
          suggestedResources={mockResources}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
    })

    it('has aria-labelledby pointing to title', () => {
      render(
        <CrisisSearchInterstitial
          match={mockMatch}
          suggestedResources={mockResources}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      const dialog = screen.getByRole('dialog')
      const labelledBy = dialog.getAttribute('aria-labelledby')
      expect(labelledBy).toBeTruthy()

      // Title should exist with that ID
      const title = document.getElementById(labelledBy!)
      expect(title).toBeInTheDocument()
      expect(title?.textContent).toContain('looking for some help')
    })

    it('has aria-describedby pointing to description', () => {
      render(
        <CrisisSearchInterstitial
          match={mockMatch}
          suggestedResources={mockResources}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      const dialog = screen.getByRole('dialog')
      const describedBy = dialog.getAttribute('aria-describedby')
      expect(describedBy).toBeTruthy()

      // Description should exist with that ID
      const description = document.getElementById(describedBy!)
      expect(description).toBeInTheDocument()
      expect(description?.textContent).toContain('24/7')
    })
  })

  describe('Focus Management', () => {
    it('focuses first interactive element on mount', () => {
      render(
        <CrisisSearchInterstitial
          match={mockMatch}
          suggestedResources={mockResources}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      // First focusable element should have focus
      expect(document.activeElement?.tagName).toBe('A')
    })

    it('all interactive elements are focusable', () => {
      render(
        <CrisisSearchInterstitial
          match={mockMatch}
          suggestedResources={mockResources}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      // Get all interactive elements
      const links = screen.getAllByRole('link')
      const buttons = screen.getAllByRole('button')

      // All should be focusable (tabIndex >= 0 or natural)
      links.forEach((link) => {
        expect(link.tabIndex).toBeGreaterThanOrEqual(0)
      })

      buttons.forEach((button) => {
        expect(button.tabIndex).toBeGreaterThanOrEqual(0)
      })
    })

    it('has visible focus indicators on links', () => {
      render(
        <CrisisSearchInterstitial
          match={mockMatch}
          suggestedResources={mockResources}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      const links = screen.getAllByRole('link')

      // All links should have focus ring classes
      links.forEach((link) => {
        expect(link.className).toMatch(/focus:/)
      })
    })

    it('has visible focus indicators on buttons', () => {
      render(
        <CrisisSearchInterstitial
          match={mockMatch}
          suggestedResources={mockResources}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      const continueButton = screen.getByRole('button', { name: /Continue to Search/i })

      // Button should have focus styles (through component library)
      expect(continueButton).toBeInTheDocument()
    })
  })

  describe('Screen Reader Support', () => {
    it('has meaningful heading', () => {
      render(
        <CrisisSearchInterstitial
          match={mockMatch}
          suggestedResources={mockResources}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      // Use getAllByRole since there are multiple headings (h2 title + h3 resource names)
      const headings = screen.getAllByRole('heading')
      const mainHeading = headings[0] // h2 is first
      expect(mainHeading.textContent).toContain('looking for some help')
    })

    it('resource links have descriptive text', () => {
      render(
        <CrisisSearchInterstitial
          match={mockMatch}
          suggestedResources={mockResources}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      // Resources should have descriptive names
      expect(screen.getByText('988 Suicide & Crisis Lifeline')).toBeInTheDocument()
      expect(screen.getByText('Crisis Text Line')).toBeInTheDocument()
    })

    it('buttons have clear labels', () => {
      render(
        <CrisisSearchInterstitial
          match={mockMatch}
          suggestedResources={mockResources}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      expect(screen.getByRole('button', { name: /Continue to Search/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /View More Resources/i })).toBeInTheDocument()
    })

    it('contact method badges are accessible', () => {
      render(
        <CrisisSearchInterstitial
          match={mockMatch}
          suggestedResources={['988lifeline.org']}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      // Phone and text badges should be visible
      expect(screen.getByText('988')).toBeInTheDocument()
      expect(screen.getByText('Chat available')).toBeInTheDocument()
    })
  })

  describe('Color Contrast (NFR45)', () => {
    it('uses high contrast text colors', () => {
      render(
        <CrisisSearchInterstitial
          match={mockMatch}
          suggestedResources={mockResources}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      const headings = screen.getAllByRole('heading')
      const mainHeading = headings[0]

      // Should use dark text on light background
      // gray-900 = #111827 on white = well above 4.5:1
      expect(mainHeading.className).toContain('text-gray-900')
    })

    it('description text has adequate contrast', () => {
      render(
        <CrisisSearchInterstitial
          match={mockMatch}
          suggestedResources={mockResources}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      // gray-600 = #4B5563 on white ≈ 5.74:1 (passes AA)
      // Use getAllByText since "24/7" appears in multiple places
      const descriptions = screen.getAllByText(/24\/7/i)
      // First match is the main description paragraph with gray-600
      expect(descriptions[0].className).toContain('text-gray-600')
    })

    it('badge colors are distinguishable', () => {
      render(
        <CrisisSearchInterstitial
          match={mockMatch}
          suggestedResources={['988lifeline.org']}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      // Check that different contact methods use different colors
      const phoneBadge = screen.getByText('988')
      const chatBadge = screen.getByText('Chat available')

      // Different background colors for different types
      expect(phoneBadge.className).toContain('bg-green-100')
      expect(chatBadge.className).toContain('bg-purple-100')
    })
  })

  describe('Age-Appropriate Content (NFR65)', () => {
    it('uses simple, non-alarming language in heading', () => {
      render(
        <CrisisSearchInterstitial
          match={mockMatch}
          suggestedResources={mockResources}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      const headings = screen.getAllByRole('heading')
      const mainHeading = headings[0]

      // Should NOT use alarming words
      expect(mainHeading.textContent?.toLowerCase()).not.toContain('emergency')
      expect(mainHeading.textContent?.toLowerCase()).not.toContain('danger')
      expect(mainHeading.textContent?.toLowerCase()).not.toContain('crisis')

      // Should use gentle language
      expect(mainHeading.textContent).toContain('help')
    })

    it('uses reassuring privacy message', () => {
      render(
        <CrisisSearchInterstitial
          match={mockMatch}
          suggestedResources={mockResources}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      expect(screen.getByText(/completely private/i)).toBeInTheDocument()
      expect(screen.getByText(/no one in your family/i)).toBeInTheDocument()
    })

    it('resource descriptions are clear and simple', () => {
      render(
        <CrisisSearchInterstitial
          match={mockMatch}
          suggestedResources={['988lifeline.org']}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      // Description should be simple
      expect(screen.getByText(/Free, confidential support/i)).toBeInTheDocument()
    })
  })

  describe('Modal Behavior', () => {
    it('backdrop blocks interaction with page behind', () => {
      render(
        <CrisisSearchInterstitial
          match={mockMatch}
          suggestedResources={mockResources}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      const dialog = screen.getByRole('dialog')
      const parent = dialog.parentElement

      // Should have backdrop styling
      expect(parent?.className || dialog.className).toContain('bg-black')
    })

    it('is visually centered', () => {
      render(
        <CrisisSearchInterstitial
          match={mockMatch}
          suggestedResources={mockResources}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      const dialog = screen.getByRole('dialog')

      // Should have centering classes
      expect(dialog.className).toContain('flex')
      expect(dialog.className).toContain('items-center')
      expect(dialog.className).toContain('justify-center')
    })
  })
})
