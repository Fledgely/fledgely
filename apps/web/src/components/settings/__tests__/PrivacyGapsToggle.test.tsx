/**
 * Tests for PrivacyGapsToggle Component
 *
 * Story 7.8: Privacy Gaps Injection - Task 6.5
 *
 * Tests for privacy gaps configuration UI including:
 * - Toggle display and state
 * - Confirmation dialog for opt-out
 * - Explanatory text
 * - Keyboard accessibility (NFR43)
 * - ARIA attributes (NFR42)
 * - Touch targets (NFR49)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PrivacyGapsToggle } from '../PrivacyGapsToggle'

// ============================================
// SETUP
// ============================================

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('PrivacyGapsToggle', () => {
  describe('basic rendering', () => {
    it('renders the component', () => {
      render(
        <PrivacyGapsToggle
          enabled={true}
          onToggle={vi.fn()}
        />
      )
      expect(screen.getByTestId('privacy-gaps-toggle')).toBeInTheDocument()
    })

    it('displays the title', () => {
      render(
        <PrivacyGapsToggle
          enabled={true}
          onToggle={vi.fn()}
        />
      )
      expect(screen.getByText('Privacy Pauses')).toBeInTheDocument()
    })

    it('displays explanatory text', () => {
      render(
        <PrivacyGapsToggle
          enabled={true}
          onToggle={vi.fn()}
        />
      )
      expect(
        screen.getByText(/Random monitoring pauses protect your child's privacy/i)
      ).toBeInTheDocument()
    })

    it('displays the toggle switch', () => {
      render(
        <PrivacyGapsToggle
          enabled={true}
          onToggle={vi.fn()}
        />
      )
      expect(screen.getByRole('switch')).toBeInTheDocument()
    })
  })

  // ============================================
  // TOGGLE STATE TESTS (AC #7)
  // ============================================

  describe('toggle state', () => {
    it('shows toggle as on when enabled is true', () => {
      render(
        <PrivacyGapsToggle
          enabled={true}
          onToggle={vi.fn()}
        />
      )
      const toggle = screen.getByRole('switch')
      expect(toggle).toHaveAttribute('aria-checked', 'true')
    })

    it('shows toggle as off when enabled is false', () => {
      render(
        <PrivacyGapsToggle
          enabled={false}
          onToggle={vi.fn()}
        />
      )
      const toggle = screen.getByRole('switch')
      expect(toggle).toHaveAttribute('aria-checked', 'false')
    })

    it('shows enabled indicator when on', () => {
      render(
        <PrivacyGapsToggle
          enabled={true}
          onToggle={vi.fn()}
        />
      )
      expect(screen.getByText('Enabled')).toBeInTheDocument()
    })

    it('shows disabled indicator when off', () => {
      render(
        <PrivacyGapsToggle
          enabled={false}
          onToggle={vi.fn()}
        />
      )
      expect(screen.getByText('Disabled')).toBeInTheDocument()
    })
  })

  // ============================================
  // TOGGLE INTERACTION TESTS
  // ============================================

  describe('toggle interactions', () => {
    it('calls onToggle directly when enabling (turning on)', async () => {
      const user = userEvent.setup()
      const onToggle = vi.fn()

      render(
        <PrivacyGapsToggle
          enabled={false}
          onToggle={onToggle}
        />
      )

      await user.click(screen.getByRole('switch'))
      expect(onToggle).toHaveBeenCalledWith(true)
    })

    it('shows confirmation dialog when disabling (turning off)', async () => {
      const user = userEvent.setup()
      const onToggle = vi.fn()

      render(
        <PrivacyGapsToggle
          enabled={true}
          onToggle={onToggle}
        />
      )

      await user.click(screen.getByRole('switch'))

      // Confirmation dialog should appear
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      })

      // onToggle should NOT be called yet
      expect(onToggle).not.toHaveBeenCalled()
    })

    it('does not disable when confirmation is cancelled', async () => {
      const user = userEvent.setup()
      const onToggle = vi.fn()

      render(
        <PrivacyGapsToggle
          enabled={true}
          onToggle={onToggle}
        />
      )

      await user.click(screen.getByRole('switch'))

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      })

      // Click cancel
      await user.click(screen.getByText('Keep Enabled'))

      // onToggle should NOT be called
      expect(onToggle).not.toHaveBeenCalled()

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      })
    })

    it('disables when confirmation is accepted', async () => {
      const user = userEvent.setup()
      const onToggle = vi.fn()

      render(
        <PrivacyGapsToggle
          enabled={true}
          onToggle={onToggle}
        />
      )

      await user.click(screen.getByRole('switch'))

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      })

      // Click confirm
      await user.click(screen.getByText('Disable Privacy Pauses'))

      // onToggle should be called with false
      expect(onToggle).toHaveBeenCalledWith(false)

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      })
    })
  })

  // ============================================
  // CONFIRMATION DIALOG TESTS (AC #7 - 6.3)
  // ============================================

  describe('confirmation dialog', () => {
    it('displays explanation of purpose in dialog', async () => {
      const user = userEvent.setup()

      render(
        <PrivacyGapsToggle
          enabled={true}
          onToggle={vi.fn()}
        />
      )

      await user.click(screen.getByRole('switch'))

      await waitFor(() => {
        expect(
          screen.getByText(/Privacy pauses help protect your child/i)
        ).toBeInTheDocument()
      })
    })

    it('displays warning about disabling', async () => {
      const user = userEvent.setup()

      render(
        <PrivacyGapsToggle
          enabled={true}
          onToggle={vi.fn()}
        />
      )

      await user.click(screen.getByRole('switch'))

      await waitFor(() => {
        // Check for warning text in the dialog (more specific to avoid matching main description)
        expect(
          screen.getByText(/every moment of device activity/i)
        ).toBeInTheDocument()
      })
    })

    it('has descriptive dialog title', async () => {
      const user = userEvent.setup()

      render(
        <PrivacyGapsToggle
          enabled={true}
          onToggle={vi.fn()}
        />
      )

      await user.click(screen.getByRole('switch'))

      await waitFor(() => {
        expect(screen.getByText('Disable Privacy Pauses?')).toBeInTheDocument()
      })
    })
  })

  // ============================================
  // KEYBOARD ACCESSIBILITY TESTS (NFR43)
  // ============================================

  describe('keyboard accessibility (NFR43)', () => {
    it('toggle is focusable', () => {
      render(
        <PrivacyGapsToggle
          enabled={true}
          onToggle={vi.fn()}
        />
      )
      const toggle = screen.getByRole('switch')
      expect(toggle).toHaveAttribute('tabindex', '0')
    })

    it('toggles on Space key', async () => {
      const user = userEvent.setup()
      const onToggle = vi.fn()

      render(
        <PrivacyGapsToggle
          enabled={false}
          onToggle={onToggle}
        />
      )

      const toggle = screen.getByRole('switch')
      toggle.focus()
      await user.keyboard(' ')

      expect(onToggle).toHaveBeenCalledWith(true)
    })

    it('toggles on Enter key', async () => {
      const user = userEvent.setup()
      const onToggle = vi.fn()

      render(
        <PrivacyGapsToggle
          enabled={false}
          onToggle={onToggle}
        />
      )

      const toggle = screen.getByRole('switch')
      toggle.focus()
      await user.keyboard('{Enter}')

      expect(onToggle).toHaveBeenCalledWith(true)
    })

    it('closes dialog on Escape key', async () => {
      const user = userEvent.setup()

      render(
        <PrivacyGapsToggle
          enabled={true}
          onToggle={vi.fn()}
        />
      )

      await user.click(screen.getByRole('switch'))

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      })

      await user.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      })
    })
  })

  // ============================================
  // ARIA ATTRIBUTES TESTS (NFR42)
  // ============================================

  describe('aria attributes (NFR42)', () => {
    it('toggle has switch role', () => {
      render(
        <PrivacyGapsToggle
          enabled={true}
          onToggle={vi.fn()}
        />
      )
      expect(screen.getByRole('switch')).toBeInTheDocument()
    })

    it('toggle has aria-checked', () => {
      render(
        <PrivacyGapsToggle
          enabled={true}
          onToggle={vi.fn()}
        />
      )
      const toggle = screen.getByRole('switch')
      expect(toggle).toHaveAttribute('aria-checked')
    })

    it('toggle has aria-label', () => {
      render(
        <PrivacyGapsToggle
          enabled={true}
          onToggle={vi.fn()}
        />
      )
      const toggle = screen.getByRole('switch')
      expect(toggle).toHaveAttribute('aria-label', 'Toggle privacy pauses')
    })

    it('confirmation dialog has alertdialog role', async () => {
      const user = userEvent.setup()

      render(
        <PrivacyGapsToggle
          enabled={true}
          onToggle={vi.fn()}
        />
      )

      await user.click(screen.getByRole('switch'))

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      })
    })
  })

  // ============================================
  // TOUCH TARGET TESTS (NFR49)
  // ============================================

  describe('touch targets (NFR49)', () => {
    it('toggle has minimum size of 44px', () => {
      render(
        <PrivacyGapsToggle
          enabled={true}
          onToggle={vi.fn()}
        />
      )
      const toggle = screen.getByRole('switch')
      expect(toggle).toHaveClass('min-h-[44px]')
      expect(toggle).toHaveClass('min-w-[44px]')
    })
  })

  // ============================================
  // DISABLED STATE TESTS
  // ============================================

  describe('disabled state', () => {
    it('shows disabled styling when disabled prop is true', () => {
      render(
        <PrivacyGapsToggle
          enabled={true}
          onToggle={vi.fn()}
          disabled={true}
        />
      )
      const toggle = screen.getByRole('switch')
      expect(toggle).toHaveAttribute('aria-disabled', 'true')
    })

    it('does not call onToggle when disabled', async () => {
      const user = userEvent.setup()
      const onToggle = vi.fn()

      render(
        <PrivacyGapsToggle
          enabled={true}
          onToggle={onToggle}
          disabled={true}
        />
      )

      await user.click(screen.getByRole('switch'))
      expect(onToggle).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // LOADING STATE TESTS
  // ============================================

  describe('loading state', () => {
    it('shows loading indicator when saving', () => {
      render(
        <PrivacyGapsToggle
          enabled={true}
          onToggle={vi.fn()}
          loading={true}
        />
      )
      expect(screen.getByText('Saving...')).toBeInTheDocument()
    })

    it('disables toggle during loading', () => {
      render(
        <PrivacyGapsToggle
          enabled={true}
          onToggle={vi.fn()}
          loading={true}
        />
      )
      const toggle = screen.getByRole('switch')
      expect(toggle).toHaveAttribute('aria-disabled', 'true')
    })
  })

  // ============================================
  // DEFAULT ENABLED TESTS (AC #7 - 6.2)
  // ============================================

  describe('default enabled behavior', () => {
    it('component documents that enabled=true is the default', () => {
      // This test verifies the UI correctly displays the enabled state
      // The actual default is handled by DEFAULT_PRIVACY_GAP_CONFIG in @fledgely/contracts
      render(
        <PrivacyGapsToggle
          enabled={true}
          onToggle={vi.fn()}
        />
      )

      // The component should show as enabled when passed true
      const toggle = screen.getByRole('switch')
      expect(toggle).toHaveAttribute('aria-checked', 'true')
      expect(screen.getByText('Enabled')).toBeInTheDocument()
    })
  })
})
