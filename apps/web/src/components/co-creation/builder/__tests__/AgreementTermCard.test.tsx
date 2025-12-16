/**
 * Tests for AgreementTermCard Component
 *
 * Story 5.2: Visual Agreement Builder - Task 1.7
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SessionTerm } from '@fledgely/contracts'
import { AgreementTermCard, AgreementTermCardSkeleton } from '../AgreementTermCard'

// ============================================
// TEST DATA
// ============================================

const createMockTerm = (overrides: Partial<SessionTerm> = {}): SessionTerm => ({
  id: 'term-123',
  type: 'screen_time',
  content: { minutes: 60 },
  addedBy: 'parent',
  status: 'accepted',
  order: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

// ============================================
// RENDERING TESTS
// ============================================

describe('AgreementTermCard', () => {
  describe('basic rendering', () => {
    it('renders term card with correct data-testid', () => {
      const term = createMockTerm()
      render(<AgreementTermCard term={term} />)

      expect(screen.getByTestId(`term-card-${term.id}`)).toBeInTheDocument()
    })

    it('renders custom data-testid when provided', () => {
      const term = createMockTerm()
      render(<AgreementTermCard term={term} data-testid="custom-testid" />)

      expect(screen.getByTestId('custom-testid')).toBeInTheDocument()
    })

    it('renders term type label', () => {
      const term = createMockTerm({ type: 'screen_time' })
      render(<AgreementTermCard term={term} />)

      expect(screen.getByText('Screen Time')).toBeInTheDocument()
    })

    it('renders content preview', () => {
      const term = createMockTerm({ type: 'screen_time', content: { minutes: 60 } })
      render(<AgreementTermCard term={term} />)

      expect(screen.getByText('1 hour per day')).toBeInTheDocument()
    })

    it('renders status badge', () => {
      const term = createMockTerm({ status: 'accepted' })
      render(<AgreementTermCard term={term} />)

      expect(screen.getByText('Accepted')).toBeInTheDocument()
    })

    it('renders contributor attribution', () => {
      const term = createMockTerm({ addedBy: 'parent' })
      render(<AgreementTermCard term={term} />)

      expect(screen.getByText('P')).toBeInTheDocument()
      expect(screen.getByText('Parent suggested')).toBeInTheDocument()
    })
  })

  // ============================================
  // TERM TYPE RENDERING TESTS
  // ============================================

  describe('term type rendering', () => {
    it('renders screen_time term with blue colors', () => {
      const term = createMockTerm({ type: 'screen_time' })
      render(<AgreementTermCard term={term} />)

      const card = screen.getByTestId(`term-card-${term.id}`)
      expect(card).toHaveAttribute('data-term-type', 'screen_time')
      expect(card.className).toContain('blue')
    })

    it('renders bedtime term with purple colors', () => {
      const term = createMockTerm({ type: 'bedtime', content: { time: '20:00' } })
      render(<AgreementTermCard term={term} />)

      const card = screen.getByTestId(`term-card-${term.id}`)
      expect(card).toHaveAttribute('data-term-type', 'bedtime')
      expect(card.className).toContain('purple')
    })

    it('renders monitoring term with amber colors', () => {
      const term = createMockTerm({ type: 'monitoring', content: { level: 'moderate' } })
      render(<AgreementTermCard term={term} />)

      const card = screen.getByTestId(`term-card-${term.id}`)
      expect(card).toHaveAttribute('data-term-type', 'monitoring')
      expect(card.className).toContain('amber')
    })

    it('renders rule term with green colors', () => {
      const term = createMockTerm({ type: 'rule', content: { text: 'No phones at dinner' } })
      render(<AgreementTermCard term={term} />)

      const card = screen.getByTestId(`term-card-${term.id}`)
      expect(card).toHaveAttribute('data-term-type', 'rule')
      expect(card.className).toContain('green')
    })

    it('renders consequence term with red colors', () => {
      const term = createMockTerm({ type: 'consequence', content: { text: 'Device taken' } })
      render(<AgreementTermCard term={term} />)

      const card = screen.getByTestId(`term-card-${term.id}`)
      expect(card).toHaveAttribute('data-term-type', 'consequence')
      expect(card.className).toContain('red')
    })

    it('renders reward term with emerald colors', () => {
      const term = createMockTerm({ type: 'reward', content: { text: 'Extra time' } })
      render(<AgreementTermCard term={term} />)

      const card = screen.getByTestId(`term-card-${term.id}`)
      expect(card).toHaveAttribute('data-term-type', 'reward')
      expect(card.className).toContain('emerald')
    })
  })

  // ============================================
  // STATUS RENDERING TESTS
  // ============================================

  describe('status rendering', () => {
    it('renders accepted status with green badge', () => {
      const term = createMockTerm({ status: 'accepted' })
      render(<AgreementTermCard term={term} />)

      const statusBadge = screen.getByText('Accepted')
      expect(statusBadge.className).toContain('green')
    })

    it('renders discussion status with yellow badge', () => {
      const term = createMockTerm({ status: 'discussion' })
      render(<AgreementTermCard term={term} />)

      const statusBadge = screen.getByText('Needs Discussion')
      expect(statusBadge.className).toContain('yellow')
    })

    it('renders removed status with gray badge and opacity', () => {
      const term = createMockTerm({ status: 'removed' })
      render(<AgreementTermCard term={term} />)

      const statusBadge = screen.getByText('Removed')
      expect(statusBadge.className).toContain('gray')

      const card = screen.getByTestId(`term-card-${term.id}`)
      expect(card.className).toContain('opacity-60')
    })

    it('sets data-term-status attribute', () => {
      const term = createMockTerm({ status: 'discussion' })
      render(<AgreementTermCard term={term} />)

      const card = screen.getByTestId(`term-card-${term.id}`)
      expect(card).toHaveAttribute('data-term-status', 'discussion')
    })
  })

  // ============================================
  // CONTRIBUTOR ATTRIBUTION TESTS
  // ============================================

  describe('contributor attribution', () => {
    it('renders parent attribution with P icon', () => {
      const term = createMockTerm({ addedBy: 'parent' })
      render(<AgreementTermCard term={term} />)

      expect(screen.getByText('P')).toBeInTheDocument()
    })

    it('renders child attribution with C icon', () => {
      const term = createMockTerm({ addedBy: 'child' })
      render(<AgreementTermCard term={term} />)

      expect(screen.getByText('C')).toBeInTheDocument()
    })

    it('has screen reader text for parent attribution', () => {
      const term = createMockTerm({ addedBy: 'parent' })
      render(<AgreementTermCard term={term} />)

      expect(screen.getByText('Parent suggested')).toBeInTheDocument()
    })

    it('has screen reader text for child attribution', () => {
      const term = createMockTerm({ addedBy: 'child' })
      render(<AgreementTermCard term={term} />)

      expect(screen.getByText('Child suggested')).toBeInTheDocument()
    })

    it('sets data-term-contributor attribute', () => {
      const term = createMockTerm({ addedBy: 'child' })
      render(<AgreementTermCard term={term} />)

      const card = screen.getByTestId(`term-card-${term.id}`)
      expect(card).toHaveAttribute('data-term-contributor', 'child')
    })
  })

  // ============================================
  // INTERACTION TESTS
  // ============================================

  describe('click interactions', () => {
    it('calls onClick when card is clicked', async () => {
      const term = createMockTerm()
      const handleClick = vi.fn()
      const user = userEvent.setup()

      render(<AgreementTermCard term={term} onClick={handleClick} />)

      await user.click(screen.getByTestId(`term-card-${term.id}`))

      expect(handleClick).toHaveBeenCalledWith(term)
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('does not throw when clicked without onClick handler', async () => {
      const term = createMockTerm()
      const user = userEvent.setup()

      render(<AgreementTermCard term={term} />)

      // Should not throw
      await user.click(screen.getByTestId(`term-card-${term.id}`))
    })
  })

  describe('keyboard interactions', () => {
    it('calls onClick when Enter is pressed', async () => {
      const term = createMockTerm()
      const handleClick = vi.fn()

      render(<AgreementTermCard term={term} onClick={handleClick} />)

      const card = screen.getByTestId(`term-card-${term.id}`)
      await act(async () => {
        card.focus()
        fireEvent.keyDown(card, { key: 'Enter' })
      })

      expect(handleClick).toHaveBeenCalledWith(term)
    })

    it('calls onClick when Space is pressed', async () => {
      const term = createMockTerm()
      const handleClick = vi.fn()

      render(<AgreementTermCard term={term} onClick={handleClick} />)

      const card = screen.getByTestId(`term-card-${term.id}`)
      await act(async () => {
        card.focus()
        fireEvent.keyDown(card, { key: ' ' })
      })

      expect(handleClick).toHaveBeenCalledWith(term)
    })

    it('calls onEdit when e key is pressed', async () => {
      const term = createMockTerm()
      const handleEdit = vi.fn()

      render(<AgreementTermCard term={term} onEdit={handleEdit} />)

      const card = screen.getByTestId(`term-card-${term.id}`)
      await act(async () => {
        card.focus()
        fireEvent.keyDown(card, { key: 'e' })
      })

      expect(handleEdit).toHaveBeenCalledWith(term)
    })
  })

  // ============================================
  // TOOLTIP TESTS
  // ============================================

  describe('tooltip behavior', () => {
    it('shows tooltip on mouse enter', async () => {
      const term = createMockTerm({ type: 'screen_time' })
      const user = userEvent.setup()

      render(<AgreementTermCard term={term} />)

      const card = screen.getByTestId(`term-card-${term.id}`)
      await user.hover(card)

      expect(screen.getByRole('tooltip')).toBeInTheDocument()
      expect(screen.getByText('How much time you can use screens each day')).toBeInTheDocument()
    })

    it('hides tooltip on mouse leave', async () => {
      const term = createMockTerm({ type: 'screen_time' })
      const user = userEvent.setup()

      render(<AgreementTermCard term={term} />)

      const card = screen.getByTestId(`term-card-${term.id}`)
      await user.hover(card)
      await user.unhover(card)

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })

    it('shows tooltip on focus', () => {
      const term = createMockTerm({ type: 'bedtime' })

      render(<AgreementTermCard term={term} />)

      const card = screen.getByTestId(`term-card-${term.id}`)
      fireEvent.focus(card)

      expect(screen.getByRole('tooltip')).toBeInTheDocument()
      expect(screen.getByText('When devices need to be put away for the night')).toBeInTheDocument()
    })

    it('hides tooltip on blur', () => {
      const term = createMockTerm({ type: 'bedtime' })

      render(<AgreementTermCard term={term} />)

      const card = screen.getByTestId(`term-card-${term.id}`)
      fireEvent.focus(card)
      fireEvent.blur(card)

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })

    it('tooltip has correct id for aria-describedby', async () => {
      const term = createMockTerm({ id: 'test-term-id' })
      const user = userEvent.setup()

      render(<AgreementTermCard term={term} />)

      const card = screen.getByTestId(`term-card-${term.id}`)
      await user.hover(card)

      const tooltip = screen.getByRole('tooltip')
      expect(tooltip).toHaveAttribute('id', 'tooltip-test-term-id')
    })
  })

  // ============================================
  // ACCESSIBILITY TESTS
  // ============================================

  describe('accessibility', () => {
    it('has role="button"', () => {
      const term = createMockTerm()
      render(<AgreementTermCard term={term} />)

      const card = screen.getByTestId(`term-card-${term.id}`)
      expect(card).toHaveAttribute('role', 'button')
    })

    it('has tabIndex="0" for keyboard access', () => {
      const term = createMockTerm()
      render(<AgreementTermCard term={term} />)

      const card = screen.getByTestId(`term-card-${term.id}`)
      expect(card).toHaveAttribute('tabIndex', '0')
    })

    it('has aria-label with term information', () => {
      const term = createMockTerm({
        type: 'screen_time',
        status: 'accepted',
        addedBy: 'parent',
        content: { minutes: 60 },
      })
      render(<AgreementTermCard term={term} />)

      const card = screen.getByTestId(`term-card-${term.id}`)
      const ariaLabel = card.getAttribute('aria-label')
      expect(ariaLabel).toContain('Screen Time')
      expect(ariaLabel).toContain('1 hour per day')
      expect(ariaLabel).toContain('Accepted')
      expect(ariaLabel).toContain('Parent suggested')
    })

    it('has aria-selected attribute', () => {
      const term = createMockTerm()
      render(<AgreementTermCard term={term} isSelected />)

      const card = screen.getByTestId(`term-card-${term.id}`)
      expect(card).toHaveAttribute('aria-selected', 'true')
    })

    it('has visible focus indicator class', () => {
      const term = createMockTerm()
      render(<AgreementTermCard term={term} />)

      const card = screen.getByTestId(`term-card-${term.id}`)
      expect(card.className).toContain('focus-visible:ring')
    })

    it('meets minimum touch target size (NFR49)', () => {
      const term = createMockTerm()
      render(<AgreementTermCard term={term} />)

      const card = screen.getByTestId(`term-card-${term.id}`)
      expect(card.className).toContain('min-h-[44px]')
    })
  })

  // ============================================
  // SELECTION STATE TESTS
  // ============================================

  describe('selection state', () => {
    it('applies ring styles when selected', () => {
      const term = createMockTerm()
      render(<AgreementTermCard term={term} isSelected />)

      const card = screen.getByTestId(`term-card-${term.id}`)
      expect(card.className).toContain('ring-2')
      expect(card.className).toContain('ring-primary')
    })

    it('does not have ring styles when not selected', () => {
      const term = createMockTerm()
      render(<AgreementTermCard term={term} isSelected={false} />)

      const card = screen.getByTestId(`term-card-${term.id}`)
      // Should not have ring-2 in the main class list
      expect(card.className).not.toMatch(/\bring-2\b(?! )/)
    })
  })

  // ============================================
  // DRAG STATE TESTS
  // ============================================

  describe('drag state', () => {
    it('applies drag styling when isDragging is true', () => {
      const term = createMockTerm()
      render(<AgreementTermCard term={term} isDragging />)

      const card = screen.getByTestId(`term-card-${term.id}`)
      expect(card.className).toContain('opacity-50')
      expect(card.className).toContain('scale-105')
    })

    it('applies normal styling when isDragging is false', () => {
      const term = createMockTerm()
      render(<AgreementTermCard term={term} isDragging={false} />)

      const card = screen.getByTestId(`term-card-${term.id}`)
      expect(card.className).toContain('shadow-sm')
      expect(card.className).not.toContain('scale-105')
    })
  })

  // ============================================
  // EDIT BUTTON TESTS
  // ============================================

  describe('edit functionality', () => {
    it('renders edit button when onEdit is provided', async () => {
      const term = createMockTerm()
      const handleEdit = vi.fn()
      const user = userEvent.setup()

      render(<AgreementTermCard term={term} onEdit={handleEdit} />)

      // Button should be in document (hidden by CSS opacity initially)
      const editButton = screen.getByRole('button', { name: /edit screen time/i })
      expect(editButton).toBeInTheDocument()
    })

    it('calls onEdit when edit button is clicked', async () => {
      const term = createMockTerm()
      const handleEdit = vi.fn()
      const user = userEvent.setup()

      render(<AgreementTermCard term={term} onEdit={handleEdit} />)

      const editButton = screen.getByRole('button', { name: /edit screen time/i })
      await user.click(editButton)

      expect(handleEdit).toHaveBeenCalledWith(term)
    })

    it('edit button click does not trigger card onClick', async () => {
      const term = createMockTerm()
      const handleClick = vi.fn()
      const handleEdit = vi.fn()
      const user = userEvent.setup()

      render(<AgreementTermCard term={term} onClick={handleClick} onEdit={handleEdit} />)

      const editButton = screen.getByRole('button', { name: /edit screen time/i })
      await user.click(editButton)

      expect(handleEdit).toHaveBeenCalledTimes(1)
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('edit button has minimum touch target size', () => {
      const term = createMockTerm()
      const handleEdit = vi.fn()

      render(<AgreementTermCard term={term} onEdit={handleEdit} />)

      const editButton = screen.getByRole('button', { name: /edit screen time/i })
      expect(editButton.className).toContain('min-h-[44px]')
      expect(editButton.className).toContain('min-w-[44px]')
    })
  })

  // ============================================
  // CUSTOM CLASS TESTS
  // ============================================

  describe('custom className', () => {
    it('applies custom className to card', () => {
      const term = createMockTerm()
      render(<AgreementTermCard term={term} className="my-custom-class" />)

      const card = screen.getByTestId(`term-card-${term.id}`)
      expect(card.className).toContain('my-custom-class')
    })
  })
})

// ============================================
// SKELETON TESTS
// ============================================

describe('AgreementTermCardSkeleton', () => {
  it('renders skeleton with correct data-testid', () => {
    render(<AgreementTermCardSkeleton />)

    expect(screen.getByTestId('term-card-skeleton')).toBeInTheDocument()
  })

  it('has animate-pulse class for loading animation', () => {
    render(<AgreementTermCardSkeleton />)

    const skeleton = screen.getByTestId('term-card-skeleton')
    expect(skeleton.className).toContain('animate-pulse')
  })

  it('renders placeholder elements', () => {
    render(<AgreementTermCardSkeleton />)

    const skeleton = screen.getByTestId('term-card-skeleton')
    // Should have placeholder divs for icon, label, badges
    const placeholders = skeleton.querySelectorAll('.bg-gray-300, .bg-gray-600')
    expect(placeholders.length).toBeGreaterThan(0)
  })
})
