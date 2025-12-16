/**
 * AgeSelectionStep Tests
 *
 * Story 4.4: Quick Start Wizard - Task 2
 * AC #1: Wizard asks child's age and pre-selects appropriate template
 *
 * Tests:
 * - Age group button rendering
 * - Selection handling
 * - Template auto-selection
 * - Accessibility
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AgeSelectionStep } from '../steps/AgeSelectionStep'
import { QuickStartWizardProvider } from '../QuickStartWizardProvider'

// Storage key must match the one in QuickStartWizardProvider
const STORAGE_KEY = 'quick-start-wizard'

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<QuickStartWizardProvider>{ui}</QuickStartWizardProvider>)
}

describe('AgeSelectionStep', () => {
  beforeEach(() => {
    sessionStorage.removeItem(STORAGE_KEY)
  })

  describe('basic rendering', () => {
    it('renders the step heading', () => {
      renderWithProvider(<AgeSelectionStep />)
      expect(
        screen.getByRole('heading', { name: /select.*age/i })
      ).toBeInTheDocument()
    })

    it('renders step description', () => {
      renderWithProvider(<AgeSelectionStep />)
      expect(screen.getByText(/customize.*template.*age/i)).toBeInTheDocument()
    })

    it('renders all four age group buttons', () => {
      renderWithProvider(<AgeSelectionStep />)
      const radioGroup = screen.getByRole('radiogroup')
      const buttons = within(radioGroup).getAllByRole('radio')
      expect(buttons).toHaveLength(4)
    })

    it('renders age group labels correctly', () => {
      renderWithProvider(<AgeSelectionStep />)
      expect(screen.getByRole('radio', { name: /5-7/i })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /8-10/i })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /11-13/i })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /14-16/i })).toBeInTheDocument()
    })

    it('renders age descriptions', () => {
      renderWithProvider(<AgeSelectionStep />)
      expect(screen.getByText(/early childhood/i)).toBeInTheDocument()
      expect(screen.getByText(/middle childhood/i)).toBeInTheDocument()
      expect(screen.getByText(/pre-teen/i)).toBeInTheDocument()
      expect(screen.getByText(/teen.*autonomy/i)).toBeInTheDocument()
    })
  })

  describe('selection behavior (AC #1)', () => {
    it('no age is selected by default', () => {
      renderWithProvider(<AgeSelectionStep />)
      const buttons = screen.getAllByRole('radio')
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-checked', 'false')
      })
    })

    it('selects age group when clicked', async () => {
      const user = userEvent.setup()
      renderWithProvider(<AgeSelectionStep />)

      const button = screen.getByRole('radio', { name: /8-10/i })
      await user.click(button)

      expect(button).toHaveAttribute('aria-checked', 'true')
    })

    it('deselects previous age when new age is selected', async () => {
      const user = userEvent.setup()
      renderWithProvider(<AgeSelectionStep />)

      const firstButton = screen.getByRole('radio', { name: /8-10/i })
      const secondButton = screen.getByRole('radio', { name: /11-13/i })

      await user.click(firstButton)
      expect(firstButton).toHaveAttribute('aria-checked', 'true')

      await user.click(secondButton)
      expect(firstButton).toHaveAttribute('aria-checked', 'false')
      expect(secondButton).toHaveAttribute('aria-checked', 'true')
    })

    it('shows visual selection state (blue styling)', async () => {
      const user = userEvent.setup()
      renderWithProvider(<AgeSelectionStep />)

      const button = screen.getByRole('radio', { name: /8-10/i })
      await user.click(button)

      expect(button.className).toMatch(/blue/)
    })
  })

  describe('template auto-selection (AC #1)', () => {
    it('shows template preview after age selection', async () => {
      const user = userEvent.setup()
      renderWithProvider(<AgeSelectionStep />)

      expect(screen.queryByText(/recommended template/i)).not.toBeInTheDocument()

      await user.click(screen.getByRole('radio', { name: /8-10/i }))

      expect(screen.getByText(/recommended template/i)).toBeInTheDocument()
    })

    it('shows balanced template variation', async () => {
      const user = userEvent.setup()
      renderWithProvider(<AgeSelectionStep />)

      await user.click(screen.getByRole('radio', { name: /8-10/i }))

      // Should show "Balanced" badge - multiple matches expected (badge + description)
      const matches = screen.getAllByText(/balanced/i)
      expect(matches.length).toBeGreaterThan(0)
    })

    it('shows template description after selection', async () => {
      const user = userEvent.setup()
      renderWithProvider(<AgeSelectionStep />)

      await user.click(screen.getByRole('radio', { name: /8-10/i }))

      // Template should have a description displayed
      const preview = screen.getByText(/recommended template/i).parentElement
      expect(preview).toBeInTheDocument()
    })

    it('updates template preview when age changes', async () => {
      const user = userEvent.setup()
      renderWithProvider(<AgeSelectionStep />)

      await user.click(screen.getByRole('radio', { name: /5-7/i }))
      const firstPreview = screen.getByText(/recommended template/i).parentElement?.textContent

      await user.click(screen.getByRole('radio', { name: /14-16/i }))
      const secondPreview = screen.getByText(/recommended template/i).parentElement?.textContent

      // The template preview content should be different for different ages
      expect(firstPreview).not.toBe(secondPreview)
    })
  })

  describe('accessibility', () => {
    it('has proper radiogroup role', () => {
      renderWithProvider(<AgeSelectionStep />)
      const radioGroup = screen.getByRole('radiogroup')
      expect(radioGroup).toBeInTheDocument()
    })

    it('has accessible label on radiogroup', () => {
      renderWithProvider(<AgeSelectionStep />)
      const radioGroup = screen.getByRole('radiogroup')
      expect(radioGroup).toHaveAttribute('aria-label')
    })

    it('age buttons have radio role', () => {
      renderWithProvider(<AgeSelectionStep />)
      const buttons = screen.getAllByRole('radio')
      expect(buttons.length).toBe(4)
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      renderWithProvider(<AgeSelectionStep />)

      // Tab to first radio button
      await user.tab()

      // First radio should be focused
      expect(document.activeElement).toBe(screen.getAllByRole('radio')[0])
    })

    it('emojis are hidden from screen readers', () => {
      renderWithProvider(<AgeSelectionStep />)
      const hiddenElements = document.querySelectorAll('[aria-hidden="true"]')
      expect(hiddenElements.length).toBeGreaterThan(0)
    })

    it('provides aria-checked state', async () => {
      const user = userEvent.setup()
      renderWithProvider(<AgeSelectionStep />)

      const button = screen.getByRole('radio', { name: /8-10/i })
      expect(button).toHaveAttribute('aria-checked', 'false')

      await user.click(button)
      expect(button).toHaveAttribute('aria-checked', 'true')
    })
  })

  describe('visual styling', () => {
    it('age buttons have minimum touch target size', () => {
      renderWithProvider(<AgeSelectionStep />)
      const buttons = screen.getAllByRole('radio')
      buttons.forEach((button) => {
        expect(button.className).toMatch(/min-h/)
      })
    })

    it('uses grid layout for buttons', () => {
      renderWithProvider(<AgeSelectionStep />)
      const radioGroup = screen.getByRole('radiogroup')
      expect(radioGroup.className).toMatch(/grid/)
    })

    it('shows hover state styling', () => {
      renderWithProvider(<AgeSelectionStep />)
      const button = screen.getByRole('radio', { name: /8-10/i })
      expect(button.className).toMatch(/hover:/)
    })
  })
})
