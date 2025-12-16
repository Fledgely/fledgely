/**
 * Tests for AgreementModeSelector Component
 *
 * Story 5.6: Agreement-Only Mode Selection - Task 2.7
 *
 * Tests for mode selection UI including:
 * - Card display and selection
 * - Feature lists rendering
 * - Keyboard accessibility (NFR43)
 * - ARIA attributes (NFR42)
 * - Touch targets (NFR49)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AgreementModeSelector } from '../AgreementModeSelector'

// ============================================
// SETUP
// ============================================

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('AgreementModeSelector', () => {
  describe('basic rendering', () => {
    it('renders the component', () => {
      render(
        <AgreementModeSelector
          selectedMode="full"
          onModeChange={vi.fn()}
        />
      )
      expect(screen.getByTestId('agreement-mode-selector')).toBeInTheDocument()
    })

    it('displays the title', () => {
      render(
        <AgreementModeSelector
          selectedMode="full"
          onModeChange={vi.fn()}
        />
      )
      expect(screen.getByText('Choose Your Agreement Type')).toBeInTheDocument()
    })

    it('displays both mode cards', () => {
      render(
        <AgreementModeSelector
          selectedMode="full"
          onModeChange={vi.fn()}
        />
      )
      expect(screen.getByTestId('mode-card-full')).toBeInTheDocument()
      expect(screen.getByTestId('mode-card-agreement_only')).toBeInTheDocument()
    })

    it('displays mode labels', () => {
      render(
        <AgreementModeSelector
          selectedMode="full"
          onModeChange={vi.fn()}
        />
      )
      expect(screen.getByText('Full Agreement')).toBeInTheDocument()
      expect(screen.getByText('Agreement Only')).toBeInTheDocument()
    })

    it('displays mode descriptions', () => {
      render(
        <AgreementModeSelector
          selectedMode="full"
          onModeChange={vi.fn()}
        />
      )
      expect(screen.getByText(/monitor device activity/i)).toBeInTheDocument()
      expect(screen.getByText(/without any device monitoring/i)).toBeInTheDocument()
    })

    it('displays upgrade note', () => {
      render(
        <AgreementModeSelector
          selectedMode="full"
          onModeChange={vi.fn()}
        />
      )
      expect(screen.getByText(/upgrade from Agreement Only to Full Agreement anytime/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // SELECTION TESTS (AC #1, #6)
  // ============================================

  describe('mode selection', () => {
    it('shows full mode as selected when selectedMode is full', () => {
      render(
        <AgreementModeSelector
          selectedMode="full"
          onModeChange={vi.fn()}
        />
      )
      const fullCard = screen.getByTestId('mode-card-full')
      expect(fullCard).toHaveAttribute('aria-checked', 'true')
    })

    it('shows agreement_only mode as selected when selectedMode is agreement_only', () => {
      render(
        <AgreementModeSelector
          selectedMode="agreement_only"
          onModeChange={vi.fn()}
        />
      )
      const agreementOnlyCard = screen.getByTestId('mode-card-agreement_only')
      expect(agreementOnlyCard).toHaveAttribute('aria-checked', 'true')
    })

    it('calls onModeChange when clicking full card', async () => {
      const user = userEvent.setup()
      const onModeChange = vi.fn()

      render(
        <AgreementModeSelector
          selectedMode="agreement_only"
          onModeChange={onModeChange}
        />
      )

      await user.click(screen.getByTestId('mode-card-full'))
      expect(onModeChange).toHaveBeenCalledWith('full')
    })

    it('calls onModeChange when clicking agreement_only card', async () => {
      const user = userEvent.setup()
      const onModeChange = vi.fn()

      render(
        <AgreementModeSelector
          selectedMode="full"
          onModeChange={onModeChange}
        />
      )

      await user.click(screen.getByTestId('mode-card-agreement_only'))
      expect(onModeChange).toHaveBeenCalledWith('agreement_only')
    })

    it('does not call onModeChange when disabled', async () => {
      const user = userEvent.setup()
      const onModeChange = vi.fn()

      render(
        <AgreementModeSelector
          selectedMode="full"
          onModeChange={onModeChange}
          disabled={true}
        />
      )

      await user.click(screen.getByTestId('mode-card-agreement_only'))
      expect(onModeChange).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // FEATURES DISPLAY TESTS (AC #6)
  // ============================================

  describe('features display', () => {
    it('shows included features for full mode', () => {
      render(
        <AgreementModeSelector
          selectedMode="full"
          onModeChange={vi.fn()}
        />
      )
      // Screen time commitments appears in both cards, so use getAllByText
      expect(screen.getAllByText('Screen time commitments').length).toBeGreaterThan(0)
      // Device monitoring appears in full as included and agreement_only as excluded
      expect(screen.getAllByText('Device monitoring').length).toBeGreaterThan(0)
    })

    it('shows included features for agreement_only mode', () => {
      render(
        <AgreementModeSelector
          selectedMode="full"
          onModeChange={vi.fn()}
        />
      )
      expect(screen.getByText('Discussion-based accountability')).toBeInTheDocument()
    })

    it('shows excluded features for agreement_only mode', () => {
      render(
        <AgreementModeSelector
          selectedMode="full"
          onModeChange={vi.fn()}
        />
      )
      // The excluded section should show "Not Included"
      expect(screen.getByText('Not Included')).toBeInTheDocument()
    })

    it('shows "Most Popular" badge on full mode card', () => {
      render(
        <AgreementModeSelector
          selectedMode="full"
          onModeChange={vi.fn()}
        />
      )
      expect(screen.getByText('Most Popular')).toBeInTheDocument()
    })

    it('shows "Can upgrade later" badge on agreement_only card', () => {
      render(
        <AgreementModeSelector
          selectedMode="full"
          onModeChange={vi.fn()}
        />
      )
      expect(screen.getByText('Can upgrade later')).toBeInTheDocument()
    })
  })

  // ============================================
  // KEYBOARD ACCESSIBILITY TESTS (NFR43)
  // ============================================

  describe('keyboard accessibility (NFR43)', () => {
    it('cards are focusable', () => {
      render(
        <AgreementModeSelector
          selectedMode="full"
          onModeChange={vi.fn()}
        />
      )
      const fullCard = screen.getByTestId('mode-card-full')
      expect(fullCard).toHaveAttribute('tabindex', '0')
    })

    it('selects mode on Enter key', async () => {
      const user = userEvent.setup()
      const onModeChange = vi.fn()

      render(
        <AgreementModeSelector
          selectedMode="full"
          onModeChange={onModeChange}
        />
      )

      const agreementOnlyCard = screen.getByTestId('mode-card-agreement_only')
      agreementOnlyCard.focus()
      await user.keyboard('{Enter}')

      expect(onModeChange).toHaveBeenCalledWith('agreement_only')
    })

    it('selects mode on Space key', async () => {
      const user = userEvent.setup()
      const onModeChange = vi.fn()

      render(
        <AgreementModeSelector
          selectedMode="full"
          onModeChange={onModeChange}
        />
      )

      const agreementOnlyCard = screen.getByTestId('mode-card-agreement_only')
      agreementOnlyCard.focus()
      await user.keyboard(' ')

      expect(onModeChange).toHaveBeenCalledWith('agreement_only')
    })

    it('cards are not focusable when disabled', () => {
      render(
        <AgreementModeSelector
          selectedMode="full"
          onModeChange={vi.fn()}
          disabled={true}
        />
      )
      const fullCard = screen.getByTestId('mode-card-full')
      expect(fullCard).toHaveAttribute('tabindex', '-1')
    })
  })

  // ============================================
  // ARIA ATTRIBUTES TESTS (NFR42)
  // ============================================

  describe('aria attributes (NFR42)', () => {
    it('has radiogroup role', () => {
      render(
        <AgreementModeSelector
          selectedMode="full"
          onModeChange={vi.fn()}
        />
      )
      expect(screen.getByRole('radiogroup')).toBeInTheDocument()
    })

    it('cards have radio role', () => {
      render(
        <AgreementModeSelector
          selectedMode="full"
          onModeChange={vi.fn()}
        />
      )
      const radios = screen.getAllByRole('radio')
      expect(radios).toHaveLength(2)
    })

    it('selected card has aria-checked true', () => {
      render(
        <AgreementModeSelector
          selectedMode="full"
          onModeChange={vi.fn()}
        />
      )
      const fullCard = screen.getByTestId('mode-card-full')
      const agreementOnlyCard = screen.getByTestId('mode-card-agreement_only')

      expect(fullCard).toHaveAttribute('aria-checked', 'true')
      expect(agreementOnlyCard).toHaveAttribute('aria-checked', 'false')
    })

    it('cards have aria-label with description', () => {
      render(
        <AgreementModeSelector
          selectedMode="full"
          onModeChange={vi.fn()}
        />
      )
      const fullCard = screen.getByTestId('mode-card-full')
      expect(fullCard).toHaveAttribute('aria-label')
      expect(fullCard.getAttribute('aria-label')).toContain('Full Agreement')
    })

    it('radiogroup has aria-labelledby', () => {
      render(
        <AgreementModeSelector
          selectedMode="full"
          onModeChange={vi.fn()}
        />
      )
      const radiogroup = screen.getByRole('radiogroup')
      expect(radiogroup).toHaveAttribute('aria-labelledby', 'mode-selector-title')
    })

    it('has screen reader description', () => {
      render(
        <AgreementModeSelector
          selectedMode="full"
          onModeChange={vi.fn()}
        />
      )
      const description = screen.getByText(/Use arrow keys to navigate/i)
      expect(description).toHaveClass('sr-only')
    })
  })

  // ============================================
  // TOUCH TARGET TESTS (NFR49)
  // ============================================

  describe('touch targets (NFR49)', () => {
    it('cards have minimum height of 44px', () => {
      render(
        <AgreementModeSelector
          selectedMode="full"
          onModeChange={vi.fn()}
        />
      )
      const fullCard = screen.getByTestId('mode-card-full')
      expect(fullCard).toHaveClass('min-h-[44px]')
    })
  })

  // ============================================
  // DISABLED STATE TESTS
  // ============================================

  describe('disabled state', () => {
    it('shows disabled styling when disabled', () => {
      render(
        <AgreementModeSelector
          selectedMode="full"
          onModeChange={vi.fn()}
          disabled={true}
        />
      )
      const fullCard = screen.getByTestId('mode-card-full')
      expect(fullCard).toHaveClass('opacity-50')
      expect(fullCard).toHaveClass('cursor-not-allowed')
    })

    it('does not call onModeChange on keyboard events when disabled', async () => {
      const user = userEvent.setup()
      const onModeChange = vi.fn()

      render(
        <AgreementModeSelector
          selectedMode="full"
          onModeChange={onModeChange}
          disabled={true}
        />
      )

      const agreementOnlyCard = screen.getByTestId('mode-card-agreement_only')
      // Force focus even though tabindex is -1
      fireEvent.focus(agreementOnlyCard)
      await user.keyboard('{Enter}')

      expect(onModeChange).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // VISUAL INDICATOR TESTS
  // ============================================

  describe('visual indicators', () => {
    it('shows checkmark icon when selected', () => {
      const { container } = render(
        <AgreementModeSelector
          selectedMode="full"
          onModeChange={vi.fn()}
        />
      )
      // The selected card should have a checkmark
      const fullCard = screen.getByTestId('mode-card-full')
      expect(fullCard.querySelector('svg')).not.toBeNull()
    })

    it('shows different icons for each mode', () => {
      const { container } = render(
        <AgreementModeSelector
          selectedMode="full"
          onModeChange={vi.fn()}
        />
      )
      // Both cards should have mode-specific icons
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThan(2) // At least mode icons + feature icons
    })
  })
})
