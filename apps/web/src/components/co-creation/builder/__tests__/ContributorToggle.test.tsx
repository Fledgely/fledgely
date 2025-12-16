/**
 * Tests for ContributorToggle Component
 *
 * Story 5.3: Child Contribution Capture - Task 1.5
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SessionContributor } from '@fledgely/contracts'
import { ContributorToggle } from '../ContributorToggle'

// ============================================
// DEFAULT PROPS
// ============================================

const defaultProps = {
  currentContributor: 'parent' as SessionContributor,
  onContributorChange: vi.fn(),
}

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('ContributorToggle', () => {
  describe('basic rendering', () => {
    it('renders the toggle component', () => {
      render(<ContributorToggle {...defaultProps} />)
      expect(screen.getByTestId('contributor-toggle')).toBeInTheDocument()
    })

    it('renders custom data-testid when provided', () => {
      render(<ContributorToggle {...defaultProps} data-testid="custom-toggle" />)
      expect(screen.getByTestId('custom-toggle')).toBeInTheDocument()
    })

    it('renders "Who\'s adding this?" label', () => {
      render(<ContributorToggle {...defaultProps} />)
      expect(screen.getByText(/Who's adding this/i)).toBeInTheDocument()
    })

    it('renders parent option', () => {
      render(<ContributorToggle {...defaultProps} />)
      expect(screen.getByTestId('contributor-parent')).toBeInTheDocument()
    })

    it('renders child option', () => {
      render(<ContributorToggle {...defaultProps} />)
      expect(screen.getByTestId('contributor-child')).toBeInTheDocument()
    })

    it('shows parent label text', () => {
      render(<ContributorToggle {...defaultProps} />)
      expect(screen.getByText('Parent')).toBeInTheDocument()
    })

    it('shows child label text', () => {
      render(<ContributorToggle {...defaultProps} />)
      expect(screen.getByText('Child')).toBeInTheDocument()
    })
  })

  // ============================================
  // CURRENT CONTRIBUTOR INDICATOR TESTS
  // ============================================

  describe('current contributor indicator', () => {
    it('shows parent as selected when currentContributor is parent', () => {
      render(<ContributorToggle {...defaultProps} currentContributor="parent" />)
      const parentButton = screen.getByTestId('contributor-parent')
      expect(parentButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('shows child as selected when currentContributor is child', () => {
      render(<ContributorToggle {...defaultProps} currentContributor="child" />)
      const childButton = screen.getByTestId('contributor-child')
      expect(childButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('parent button is not pressed when child is selected', () => {
      render(<ContributorToggle {...defaultProps} currentContributor="child" />)
      const parentButton = screen.getByTestId('contributor-parent')
      expect(parentButton).toHaveAttribute('aria-pressed', 'false')
    })

    it('child button is not pressed when parent is selected', () => {
      render(<ContributorToggle {...defaultProps} currentContributor="parent" />)
      const childButton = screen.getByTestId('contributor-child')
      expect(childButton).toHaveAttribute('aria-pressed', 'false')
    })

    it('displays parent icon/avatar when parent is selected', () => {
      render(<ContributorToggle {...defaultProps} currentContributor="parent" />)
      expect(screen.getByTestId('parent-icon')).toBeInTheDocument()
    })

    it('displays child icon/avatar when child is selected', () => {
      render(<ContributorToggle {...defaultProps} currentContributor="child" />)
      expect(screen.getByTestId('child-icon')).toBeInTheDocument()
    })
  })

  // ============================================
  // INTERACTION TESTS
  // ============================================

  describe('interactions', () => {
    it('calls onContributorChange with "child" when child button is clicked', async () => {
      const onContributorChange = vi.fn()
      const user = userEvent.setup()
      render(
        <ContributorToggle
          {...defaultProps}
          currentContributor="parent"
          onContributorChange={onContributorChange}
        />
      )

      await user.click(screen.getByTestId('contributor-child'))
      expect(onContributorChange).toHaveBeenCalledWith('child')
    })

    it('calls onContributorChange with "parent" when parent button is clicked', async () => {
      const onContributorChange = vi.fn()
      const user = userEvent.setup()
      render(
        <ContributorToggle
          {...defaultProps}
          currentContributor="child"
          onContributorChange={onContributorChange}
        />
      )

      await user.click(screen.getByTestId('contributor-parent'))
      expect(onContributorChange).toHaveBeenCalledWith('parent')
    })

    it('does not call onContributorChange when clicking already selected contributor', async () => {
      const onContributorChange = vi.fn()
      const user = userEvent.setup()
      render(
        <ContributorToggle
          {...defaultProps}
          currentContributor="parent"
          onContributorChange={onContributorChange}
        />
      )

      await user.click(screen.getByTestId('contributor-parent'))
      expect(onContributorChange).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // DISABLED STATE TESTS
  // ============================================

  describe('disabled state', () => {
    it('disables both buttons when disabled prop is true', () => {
      render(<ContributorToggle {...defaultProps} disabled />)
      expect(screen.getByTestId('contributor-parent')).toBeDisabled()
      expect(screen.getByTestId('contributor-child')).toBeDisabled()
    })

    it('does not call onContributorChange when disabled', async () => {
      const onContributorChange = vi.fn()
      const user = userEvent.setup()
      render(
        <ContributorToggle
          {...defaultProps}
          disabled
          onContributorChange={onContributorChange}
        />
      )

      await user.click(screen.getByTestId('contributor-child'))
      expect(onContributorChange).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // KEYBOARD ACCESSIBILITY TESTS
  // ============================================

  describe('keyboard accessibility', () => {
    it('parent button is focusable', () => {
      render(<ContributorToggle {...defaultProps} />)
      const parentButton = screen.getByTestId('contributor-parent')
      parentButton.focus()
      expect(document.activeElement).toBe(parentButton)
    })

    it('child button is focusable', () => {
      render(<ContributorToggle {...defaultProps} />)
      const childButton = screen.getByTestId('contributor-child')
      childButton.focus()
      expect(document.activeElement).toBe(childButton)
    })

    it('triggers onContributorChange on Enter key', () => {
      const onContributorChange = vi.fn()
      render(
        <ContributorToggle
          {...defaultProps}
          currentContributor="parent"
          onContributorChange={onContributorChange}
        />
      )

      const childButton = screen.getByTestId('contributor-child')
      childButton.focus()
      fireEvent.keyDown(childButton, { key: 'Enter' })

      expect(onContributorChange).toHaveBeenCalledWith('child')
    })

    it('triggers onContributorChange on Space key', () => {
      const onContributorChange = vi.fn()
      render(
        <ContributorToggle
          {...defaultProps}
          currentContributor="parent"
          onContributorChange={onContributorChange}
        />
      )

      const childButton = screen.getByTestId('contributor-child')
      childButton.focus()
      fireEvent.keyDown(childButton, { key: ' ' })

      expect(onContributorChange).toHaveBeenCalledWith('child')
    })
  })

  // ============================================
  // ARIA ACCESSIBILITY TESTS
  // ============================================

  describe('ARIA accessibility', () => {
    it('has role="group" on container', () => {
      render(<ContributorToggle {...defaultProps} />)
      expect(screen.getByRole('group')).toBeInTheDocument()
    })

    it('has aria-label on container', () => {
      render(<ContributorToggle {...defaultProps} />)
      expect(screen.getByRole('group')).toHaveAttribute('aria-label')
    })

    it('buttons have aria-pressed attribute', () => {
      render(<ContributorToggle {...defaultProps} />)
      expect(screen.getByTestId('contributor-parent')).toHaveAttribute('aria-pressed')
      expect(screen.getByTestId('contributor-child')).toHaveAttribute('aria-pressed')
    })

    it('buttons have aria-label', () => {
      render(<ContributorToggle {...defaultProps} />)
      expect(screen.getByTestId('contributor-parent')).toHaveAttribute('aria-label')
      expect(screen.getByTestId('contributor-child')).toHaveAttribute('aria-label')
    })
  })

  // ============================================
  // TOUCH TARGET TESTS (NFR49)
  // ============================================

  describe('touch targets (NFR49)', () => {
    it('parent button meets minimum touch target size (48px)', () => {
      render(<ContributorToggle {...defaultProps} />)
      const parentButton = screen.getByTestId('contributor-parent')
      expect(parentButton.className).toMatch(/min-h-\[48px\]|min-h-12/)
      expect(parentButton.className).toMatch(/min-w-\[48px\]|min-w-12/)
    })

    it('child button meets minimum touch target size (48px)', () => {
      render(<ContributorToggle {...defaultProps} />)
      const childButton = screen.getByTestId('contributor-child')
      expect(childButton.className).toMatch(/min-h-\[48px\]|min-h-12/)
      expect(childButton.className).toMatch(/min-w-\[48px\]|min-w-12/)
    })
  })

  // ============================================
  // VISUAL STYLING TESTS
  // ============================================

  describe('visual styling', () => {
    it('applies selected styles to parent when selected', () => {
      render(<ContributorToggle {...defaultProps} currentContributor="parent" />)
      const parentButton = screen.getByTestId('contributor-parent')
      expect(parentButton.className).toContain('bg-indigo')
    })

    it('applies selected styles to child when selected', () => {
      render(<ContributorToggle {...defaultProps} currentContributor="child" />)
      const childButton = screen.getByTestId('contributor-child')
      expect(childButton.className).toContain('bg-pink')
    })

    it('applies unselected styles to parent when not selected', () => {
      render(<ContributorToggle {...defaultProps} currentContributor="child" />)
      const parentButton = screen.getByTestId('contributor-parent')
      expect(parentButton.className).not.toContain('bg-indigo-500')
    })

    it('applies focus-visible ring styles', () => {
      render(<ContributorToggle {...defaultProps} />)
      const parentButton = screen.getByTestId('contributor-parent')
      expect(parentButton.className).toContain('focus-visible:ring')
    })
  })
})
