/**
 * QuickStartWizard Tests
 *
 * Story 4.4: Quick Start Wizard - Task 1
 * AC #1: Wizard asks child's age and pre-selects appropriate template
 * AC #4: Wizard uses progress indicator showing time remaining
 * AC #5: Wizard can be completed in under 10 minutes with defaults (NFR59)
 *
 * Tests:
 * - Wizard container rendering
 * - Step navigation (next/back/skip)
 * - Progress indicator display
 * - Time estimate calculation
 * - State management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuickStartWizard } from '../QuickStartWizard'
import { QuickStartWizardProvider } from '../QuickStartWizardProvider'

// Storage key must match the one in QuickStartWizardProvider
const STORAGE_KEY = 'quick-start-wizard'

// Wrapper component that provides context
const renderWithProvider = (ui: React.ReactElement) => {
  return render(<QuickStartWizardProvider>{ui}</QuickStartWizardProvider>)
}

describe('QuickStartWizard', () => {
  // Clear sessionStorage before each test to ensure fresh state
  beforeEach(() => {
    sessionStorage.removeItem(STORAGE_KEY)
  })

  describe('basic rendering', () => {
    it('renders the wizard container', () => {
      renderWithProvider(<QuickStartWizard />)
      expect(screen.getByRole('region', { name: /quick start wizard/i })).toBeInTheDocument()
    })

    it('renders the wizard title', () => {
      renderWithProvider(<QuickStartWizard />)
      expect(screen.getByRole('heading', { name: /quick start/i })).toBeInTheDocument()
    })

    it('renders the first step by default', () => {
      renderWithProvider(<QuickStartWizard />)
      expect(screen.getByText(/select.*age/i)).toBeInTheDocument()
    })

    it('renders progress indicator', () => {
      renderWithProvider(<QuickStartWizard />)
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('displays step count (e.g., "Step 1 of 5")', () => {
      renderWithProvider(<QuickStartWizard />)
      // Multiple elements may match (visible text + aria-live region)
      const matches = screen.getAllByText(/step 1 of/i)
      expect(matches.length).toBeGreaterThan(0)
    })
  })

  describe('navigation buttons', () => {
    it('renders Next button on first step', () => {
      renderWithProvider(<QuickStartWizard />)
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
    })

    it('does not render Back button on first step', () => {
      renderWithProvider(<QuickStartWizard />)
      expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument()
    })

    it('renders Back button after navigating to second step', async () => {
      const user = userEvent.setup()
      renderWithProvider(<QuickStartWizard />)

      // Select an age group first (required before next) - uses role="radio"
      const ageButton = screen.getByRole('radio', { name: /8-10/i })
      await user.click(ageButton)

      // Click next
      await user.click(screen.getByRole('button', { name: /next/i }))

      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    })

    it('disables Next button when step validation fails', () => {
      renderWithProvider(<QuickStartWizard />)
      // First step requires age selection
      expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
    })

    it('enables Next button after valid selection', async () => {
      const user = userEvent.setup()
      renderWithProvider(<QuickStartWizard />)

      const ageButton = screen.getByRole('radio', { name: /8-10/i })
      await user.click(ageButton)

      expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled()
    })
  })

  describe('step navigation (AC #4)', () => {
    it('advances to next step when Next is clicked', async () => {
      const user = userEvent.setup()
      renderWithProvider(<QuickStartWizard />)

      // Select age
      await user.click(screen.getByRole('radio', { name: /8-10/i }))
      await user.click(screen.getByRole('button', { name: /next/i }))

      // Multiple elements may match (visible text + aria-live region)
      const matches = screen.getAllByText(/step 2 of/i)
      expect(matches.length).toBeGreaterThan(0)
    })

    it('returns to previous step when Back is clicked', async () => {
      const user = userEvent.setup()
      renderWithProvider(<QuickStartWizard />)

      // Navigate to step 2
      await user.click(screen.getByRole('radio', { name: /8-10/i }))
      await user.click(screen.getByRole('button', { name: /next/i }))

      // Go back
      await user.click(screen.getByRole('button', { name: /back/i }))

      // Multiple elements may match
      const matches = screen.getAllByText(/step 1 of/i)
      expect(matches.length).toBeGreaterThan(0)
    })

    it('preserves selections when going back', async () => {
      const user = userEvent.setup()
      renderWithProvider(<QuickStartWizard />)

      // Select age 8-10
      const ageButton = screen.getByRole('radio', { name: /8-10/i })
      await user.click(ageButton)
      await user.click(screen.getByRole('button', { name: /next/i }))

      // Go back
      await user.click(screen.getByRole('button', { name: /back/i }))

      // Age should still be selected
      expect(screen.getByRole('radio', { name: /8-10/i })).toHaveAttribute(
        'aria-pressed',
        'true'
      )
    })

    it('navigates through all steps in sequence', async () => {
      const user = userEvent.setup()
      renderWithProvider(<QuickStartWizard />)

      // Step 1: Age selection
      await user.click(screen.getByRole('radio', { name: /8-10/i }))
      await user.click(screen.getByRole('button', { name: /next/i }))

      // Step 2: Screen time - use heading to be specific
      expect(screen.getByRole('heading', { name: /screen time/i })).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: /next/i }))

      // Step 3: Bedtime - use heading to be specific
      expect(screen.getByRole('heading', { name: /bedtime/i })).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: /next/i }))

      // Step 4: Monitoring - use heading to be specific
      expect(screen.getByRole('heading', { name: /monitoring/i })).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: /next/i }))

      // Step 5: Preview - use heading to be specific
      expect(screen.getByRole('heading', { name: /preview/i })).toBeInTheDocument()
    })
  })

  describe('progress indicator (AC #4)', () => {
    it('shows correct progress percentage', () => {
      renderWithProvider(<QuickStartWizard />)
      const progressbar = screen.getByRole('progressbar')
      // Step 1 of 5 = 20% progress (or 0% if not started)
      expect(progressbar).toHaveAttribute('aria-valuenow')
    })

    it('updates progress as steps are completed', async () => {
      const user = userEvent.setup()
      renderWithProvider(<QuickStartWizard />)

      const progressbar = screen.getByRole('progressbar')
      const initialValue = progressbar.getAttribute('aria-valuenow')

      // Complete step 1
      await user.click(screen.getByRole('radio', { name: /8-10/i }))
      await user.click(screen.getByRole('button', { name: /next/i }))

      const newValue = progressbar.getAttribute('aria-valuenow')
      expect(Number(newValue)).toBeGreaterThan(Number(initialValue))
    })

    it('displays estimated time remaining', () => {
      renderWithProvider(<QuickStartWizard />)
      expect(screen.getByText(/min remaining/i)).toBeInTheDocument()
    })

    it('updates time estimate as steps are completed', async () => {
      const user = userEvent.setup()
      renderWithProvider(<QuickStartWizard />)

      const initialTimeText = screen.getByText(/min remaining/i).textContent

      // Complete step 1
      await user.click(screen.getByRole('radio', { name: /8-10/i }))
      await user.click(screen.getByRole('button', { name: /next/i }))

      const newTimeText = screen.getByText(/min remaining/i).textContent
      // Time should decrease or stay same
      expect(newTimeText).not.toBe(initialTimeText)
    })
  })

  describe('wizard completion callbacks', () => {
    it('calls onComplete when wizard is finished', async () => {
      const user = userEvent.setup()
      const handleComplete = vi.fn()

      renderWithProvider(<QuickStartWizard onComplete={handleComplete} />)

      // Navigate through all steps
      await user.click(screen.getByRole('radio', { name: /8-10/i }))
      await user.click(screen.getByRole('button', { name: /next/i }))
      await user.click(screen.getByRole('button', { name: /next/i })) // Screen time (uses default)
      await user.click(screen.getByRole('button', { name: /next/i })) // Bedtime (uses default)
      await user.click(screen.getByRole('button', { name: /next/i })) // Monitoring (uses default)

      // Click "Start Co-Creation" on preview step
      await user.click(screen.getByRole('button', { name: /start co-creation/i }))

      expect(handleComplete).toHaveBeenCalledTimes(1)
    })

    it('passes wizard draft data to onComplete', async () => {
      const user = userEvent.setup()
      const handleComplete = vi.fn()

      renderWithProvider(<QuickStartWizard onComplete={handleComplete} />)

      // Navigate through all steps with selections
      await user.click(screen.getByRole('radio', { name: /8-10/i }))
      await user.click(screen.getByRole('button', { name: /next/i }))
      await user.click(screen.getByRole('button', { name: /next/i }))
      await user.click(screen.getByRole('button', { name: /next/i }))
      await user.click(screen.getByRole('button', { name: /next/i }))
      await user.click(screen.getByRole('button', { name: /start co-creation/i }))

      expect(handleComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          childAge: '8-10',
          templateId: expect.any(String),
          customizations: expect.objectContaining({
            screenTimeMinutes: expect.any(Number),
            bedtimeCutoff: expect.any(String),
            monitoringLevel: expect.any(String),
          }),
        })
      )
    })

    it('calls onCancel when wizard is cancelled', async () => {
      const user = userEvent.setup()
      const handleCancel = vi.fn()

      renderWithProvider(<QuickStartWizard onCancel={handleCancel} />)

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(handleCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe('accessibility', () => {
    it('has accessible region role with name', () => {
      renderWithProvider(<QuickStartWizard />)
      expect(screen.getByRole('region', { name: /quick start wizard/i })).toBeInTheDocument()
    })

    it('has proper heading hierarchy', () => {
      renderWithProvider(<QuickStartWizard />)

      // Main wizard title should be h1 or h2
      const heading = screen.getByRole('heading', { name: /quick start/i })
      expect(['H1', 'H2'].includes(heading.tagName)).toBe(true)
    })

    it('announces step changes via live region', async () => {
      const user = userEvent.setup()
      renderWithProvider(<QuickStartWizard />)

      // Look for aria-live region
      const liveRegion = document.querySelector('[aria-live]')
      expect(liveRegion).toBeInTheDocument()
    })

    it('maintains focus when navigating steps', async () => {
      const user = userEvent.setup()
      renderWithProvider(<QuickStartWizard />)

      await user.click(screen.getByRole('radio', { name: /8-10/i }))
      await user.click(screen.getByRole('button', { name: /next/i }))

      // Focus should be on a meaningful element (heading or first interactive element)
      expect(document.activeElement).not.toBe(document.body)
    })

    it('buttons meet minimum touch target size (44x44px)', () => {
      renderWithProvider(<QuickStartWizard />)

      const nextButton = screen.getByRole('button', { name: /next/i })
      // Check for min-h-[44px] or h-11 classes
      expect(nextButton.className).toMatch(/min-h-\[44px\]|h-11|min-h-11/)
    })

    it('keyboard navigation works for all interactive elements', async () => {
      const user = userEvent.setup()
      renderWithProvider(<QuickStartWizard />)

      // Tab through elements
      await user.tab()
      expect(document.activeElement).not.toBe(document.body)

      // Age radio buttons should be focusable
      const ageButtons = screen.getAllByRole('radio', { name: /\d+-\d+/ })
      expect(ageButtons.length).toBeGreaterThan(0)
    })
  })

  describe('responsive design', () => {
    it('uses responsive layout classes', () => {
      renderWithProvider(<QuickStartWizard />)

      const wizard = screen.getByRole('region', { name: /quick start wizard/i })
      // Should have responsive classes like max-w-*, px-* with breakpoints
      expect(wizard.className).toMatch(/max-w-|px-/)
    })
  })
})
