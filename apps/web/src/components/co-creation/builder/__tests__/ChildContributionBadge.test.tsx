/**
 * Tests for ChildContributionBadge Component
 *
 * Story 5.3: Child Contribution Capture - Task 6
 *
 * Visual badge indicating a contribution was made by a child,
 * with optional protection indicator for edit prevention.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChildContributionBadge } from '../ChildContributionBadge'

// ============================================
// DEFAULT PROPS
// ============================================

const defaultProps = {
  contributorName: 'Alex',
}

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('ChildContributionBadge', () => {
  describe('basic rendering', () => {
    it('renders the badge component', () => {
      render(<ChildContributionBadge {...defaultProps} />)
      expect(screen.getByTestId('child-contribution-badge')).toBeInTheDocument()
    })

    it('renders custom data-testid when provided', () => {
      render(<ChildContributionBadge {...defaultProps} data-testid="custom-badge" />)
      expect(screen.getByTestId('custom-badge')).toBeInTheDocument()
    })

    it('shows contributor name', () => {
      render(<ChildContributionBadge {...defaultProps} />)
      expect(screen.getByText(/Alex/)).toBeInTheDocument()
    })

    it('shows child indicator label', () => {
      render(<ChildContributionBadge {...defaultProps} />)
      expect(screen.getByText(/added this/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // VISUAL STYLING TESTS
  // ============================================

  describe('visual styling', () => {
    it('uses child-friendly styling (pink/purple theme)', () => {
      render(<ChildContributionBadge {...defaultProps} />)
      const badge = screen.getByTestId('child-contribution-badge')
      expect(badge.className).toMatch(/pink|purple|child/)
    })

    it('shows child emoji/icon', () => {
      render(<ChildContributionBadge {...defaultProps} />)
      expect(screen.getByTestId('child-icon')).toBeInTheDocument()
    })

    it('applies compact styling when compact prop is true', () => {
      render(<ChildContributionBadge {...defaultProps} compact />)
      const badge = screen.getByTestId('child-contribution-badge')
      expect(badge.className).toMatch(/text-xs|text-sm|compact/)
    })
  })

  // ============================================
  // PROTECTED STATE TESTS
  // ============================================

  describe('protected state', () => {
    it('shows protected indicator when isProtected is true', () => {
      render(<ChildContributionBadge {...defaultProps} isProtected />)
      expect(screen.getByTestId('protected-indicator')).toBeInTheDocument()
    })

    it('shows lock icon when protected', () => {
      render(<ChildContributionBadge {...defaultProps} isProtected />)
      expect(screen.getByTestId('lock-icon')).toBeInTheDocument()
    })

    it('does not show protected indicator by default', () => {
      render(<ChildContributionBadge {...defaultProps} />)
      expect(screen.queryByTestId('protected-indicator')).not.toBeInTheDocument()
    })

    it('has protective tooltip when protected', () => {
      render(<ChildContributionBadge {...defaultProps} isProtected />)
      const badge = screen.getByTestId('child-contribution-badge')
      expect(badge).toHaveAttribute('title')
    })
  })

  // ============================================
  // AVATAR TESTS
  // ============================================

  describe('avatar', () => {
    it('shows avatar when provided', () => {
      render(<ChildContributionBadge {...defaultProps} avatarUrl="/avatar.jpg" />)
      expect(screen.getByTestId('contributor-avatar')).toBeInTheDocument()
    })

    it('shows initials fallback when no avatar', () => {
      render(<ChildContributionBadge {...defaultProps} />)
      expect(screen.getByTestId('contributor-initials')).toBeInTheDocument()
    })

    it('displays correct initials from name', () => {
      render(<ChildContributionBadge {...defaultProps} contributorName="Alex Brown" />)
      const initials = screen.getByTestId('contributor-initials')
      expect(initials.textContent).toMatch(/A|AB/)
    })
  })

  // ============================================
  // ACCESSIBILITY TESTS
  // ============================================

  describe('accessibility', () => {
    it('has accessible label describing the badge', () => {
      render(<ChildContributionBadge {...defaultProps} />)
      const badge = screen.getByTestId('child-contribution-badge')
      expect(badge).toHaveAttribute('aria-label')
    })

    it('protected state is communicated to screen readers', () => {
      render(<ChildContributionBadge {...defaultProps} isProtected />)
      const badge = screen.getByTestId('child-contribution-badge')
      const ariaLabel = badge.getAttribute('aria-label')
      expect(ariaLabel).toMatch(/protect/i)
    })

    it('lock icon is hidden from screen readers', () => {
      render(<ChildContributionBadge {...defaultProps} isProtected />)
      const lockIcon = screen.getByTestId('lock-icon')
      expect(lockIcon).toHaveAttribute('aria-hidden', 'true')
    })
  })

  // ============================================
  // DISPLAY VARIANTS TESTS
  // ============================================

  describe('display variants', () => {
    it('supports inline variant', () => {
      render(<ChildContributionBadge {...defaultProps} variant="inline" />)
      const badge = screen.getByTestId('child-contribution-badge')
      expect(badge.className).toMatch(/inline|flex-row/)
    })

    it('supports block variant', () => {
      render(<ChildContributionBadge {...defaultProps} variant="block" />)
      const badge = screen.getByTestId('child-contribution-badge')
      expect(badge.className).toMatch(/block|flex-col/)
    })

    it('defaults to inline variant', () => {
      render(<ChildContributionBadge {...defaultProps} />)
      const badge = screen.getByTestId('child-contribution-badge')
      expect(badge.className).toMatch(/inline|flex-row/)
    })
  })

  // ============================================
  // INTERACTIVITY TESTS
  // ============================================

  describe('interactivity', () => {
    it('calls onClick when clicked and clickable', async () => {
      const onClick = vi.fn()
      const user = userEvent.setup()
      render(<ChildContributionBadge {...defaultProps} onClick={onClick} />)

      await user.click(screen.getByTestId('child-contribution-badge'))

      expect(onClick).toHaveBeenCalled()
    })

    it('has button role when clickable', () => {
      render(<ChildContributionBadge {...defaultProps} onClick={() => {}} />)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('is not interactive by default', () => {
      render(<ChildContributionBadge {...defaultProps} />)
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('has hover styles when clickable', () => {
      render(<ChildContributionBadge {...defaultProps} onClick={() => {}} />)
      const badge = screen.getByTestId('child-contribution-badge')
      expect(badge.className).toContain('hover:')
    })
  })
})
