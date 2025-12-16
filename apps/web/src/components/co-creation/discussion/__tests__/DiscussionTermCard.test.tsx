/**
 * Tests for DiscussionTermCard Component
 *
 * Story 5.4: Negotiation & Discussion Support - Task 6.7
 *
 * Tests for the expandable discussion card UI.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DiscussionTermCard } from '../DiscussionTermCard'
import type { SessionTerm, DiscussionNote } from '@fledgely/contracts'

// ============================================
// TEST FIXTURES
// ============================================

const createTerm = (overrides: Partial<SessionTerm> = {}): SessionTerm => ({
  id: 'term-1',
  type: 'screen_time',
  content: { duration: 60, unit: 'minutes' },
  status: 'discussion',
  addedBy: 'parent',
  resolutionStatus: 'unresolved',
  discussionNotes: [],
  ...overrides,
} as SessionTerm)

const createNote = (overrides: Partial<DiscussionNote> = {}): DiscussionNote => ({
  id: crypto.randomUUID(),
  contributor: 'parent',
  text: 'Test note',
  createdAt: new Date().toISOString(),
  ...overrides,
})

const defaultProps = {
  term: createTerm(),
  contributor: 'parent' as const,
  onAddNote: vi.fn(),
  onAcceptCompromise: vi.fn(),
  onMarkAgreement: vi.fn(),
}

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('DiscussionTermCard', () => {
  describe('basic rendering', () => {
    it('renders the component', () => {
      render(<DiscussionTermCard {...defaultProps} />)
      expect(screen.getByTestId('discussion-term-card')).toBeInTheDocument()
    })

    it('renders custom data-testid', () => {
      render(<DiscussionTermCard {...defaultProps} data-testid="custom-card" />)
      expect(screen.getByTestId('custom-card')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<DiscussionTermCard {...defaultProps} className="custom-class" />)
      expect(screen.getByTestId('discussion-term-card')).toHaveClass('custom-class')
    })

    it('shows term type label', () => {
      render(<DiscussionTermCard {...defaultProps} />)
      expect(screen.getByTestId('term-type-label')).toHaveTextContent('Screen Time')
    })

    it('shows term content preview', () => {
      render(<DiscussionTermCard {...defaultProps} />)
      expect(screen.getByTestId('term-content-preview')).toBeInTheDocument()
    })

    it('shows discussion icon', () => {
      render(<DiscussionTermCard {...defaultProps} />)
      expect(screen.getByTestId('discussion-icon')).toHaveTextContent('💬')
    })
  })

  // ============================================
  // RESOLUTION STATUS BADGE TESTS
  // ============================================

  describe('resolution status badge', () => {
    it('shows resolution badge', () => {
      render(<DiscussionTermCard {...defaultProps} />)
      expect(screen.getByTestId('resolution-badge')).toBeInTheDocument()
    })

    it('shows "Needs discussion" for unresolved', () => {
      render(
        <DiscussionTermCard
          {...defaultProps}
          term={createTerm({ resolutionStatus: 'unresolved' })}
        />
      )
      expect(screen.getByTestId('resolution-badge')).toHaveTextContent('Needs discussion')
    })

    it('shows "Parent agreed" for parent-agreed', () => {
      render(
        <DiscussionTermCard
          {...defaultProps}
          term={createTerm({ resolutionStatus: 'parent-agreed' })}
        />
      )
      expect(screen.getByTestId('resolution-badge')).toHaveTextContent('Parent agreed')
    })

    it('shows "Child agreed" for child-agreed', () => {
      render(
        <DiscussionTermCard
          {...defaultProps}
          term={createTerm({ resolutionStatus: 'child-agreed' })}
        />
      )
      expect(screen.getByTestId('resolution-badge')).toHaveTextContent('Child agreed')
    })

    it('shows "Resolved" with checkmark for resolved', () => {
      render(
        <DiscussionTermCard
          {...defaultProps}
          term={createTerm({ resolutionStatus: 'resolved' })}
        />
      )
      expect(screen.getByTestId('resolution-badge')).toHaveTextContent('✓')
      expect(screen.getByTestId('resolution-badge')).toHaveTextContent('Resolved')
    })
  })

  // ============================================
  // EXPAND/COLLAPSE TESTS
  // ============================================

  describe('expand/collapse', () => {
    it('starts collapsed by default', () => {
      render(<DiscussionTermCard {...defaultProps} />)
      expect(screen.queryByTestId('discussion-panel')).not.toBeInTheDocument()
    })

    it('starts expanded when defaultExpanded is true', () => {
      render(<DiscussionTermCard {...defaultProps} defaultExpanded />)
      expect(screen.getByTestId('discussion-panel')).toBeInTheDocument()
    })

    it('expands when header is clicked', async () => {
      const user = userEvent.setup()
      render(<DiscussionTermCard {...defaultProps} />)

      await user.click(screen.getByTestId('discussion-card-header'))

      expect(screen.getByTestId('discussion-panel')).toBeInTheDocument()
    })

    it('collapses when header is clicked again', async () => {
      const user = userEvent.setup()
      render(<DiscussionTermCard {...defaultProps} defaultExpanded />)

      await user.click(screen.getByTestId('discussion-card-header'))

      expect(screen.queryByTestId('discussion-panel')).not.toBeInTheDocument()
    })

    it('expands on Enter key', () => {
      render(<DiscussionTermCard {...defaultProps} />)
      const header = screen.getByTestId('discussion-card-header')

      fireEvent.keyDown(header, { key: 'Enter' })

      expect(screen.getByTestId('discussion-panel')).toBeInTheDocument()
    })

    it('expands on Space key', () => {
      render(<DiscussionTermCard {...defaultProps} />)
      const header = screen.getByTestId('discussion-card-header')

      fireEvent.keyDown(header, { key: ' ' })

      expect(screen.getByTestId('discussion-panel')).toBeInTheDocument()
    })
  })

  // ============================================
  // DISCUSSION PANEL CONTENTS TESTS
  // ============================================

  describe('discussion panel contents', () => {
    it('shows discussion prompts when expanded', () => {
      render(<DiscussionTermCard {...defaultProps} defaultExpanded />)
      expect(screen.getByTestId('card-discussion-prompt')).toBeInTheDocument()
    })

    it('shows notes panel when expanded', () => {
      render(<DiscussionTermCard {...defaultProps} defaultExpanded />)
      expect(screen.getByTestId('card-notes-panel')).toBeInTheDocument()
    })

    it('shows compromise suggestions when expanded', () => {
      render(<DiscussionTermCard {...defaultProps} defaultExpanded />)
      expect(screen.getByTestId('card-compromise-suggestions')).toBeInTheDocument()
    })

    it('shows resolution controls when expanded', () => {
      render(<DiscussionTermCard {...defaultProps} defaultExpanded />)
      expect(screen.getByTestId('card-resolution-controls')).toBeInTheDocument()
    })

    it('hides compromise suggestions when resolved', () => {
      render(
        <DiscussionTermCard
          {...defaultProps}
          term={createTerm({ resolutionStatus: 'resolved' })}
          defaultExpanded
        />
      )
      expect(screen.queryByTestId('card-compromise-suggestions')).not.toBeInTheDocument()
    })
  })

  // ============================================
  // NOTES INDICATOR TESTS
  // ============================================

  describe('notes indicator', () => {
    it('shows notes count when collapsed and has notes', () => {
      const notes = [createNote(), createNote()]
      render(
        <DiscussionTermCard
          {...defaultProps}
          term={createTerm({ discussionNotes: notes as DiscussionNote[] })}
        />
      )
      expect(screen.getByTestId('notes-indicator')).toHaveTextContent('2 notes')
    })

    it('shows singular form for 1 note', () => {
      const notes = [createNote()]
      render(
        <DiscussionTermCard
          {...defaultProps}
          term={createTerm({ discussionNotes: notes as DiscussionNote[] })}
        />
      )
      expect(screen.getByTestId('notes-indicator')).toHaveTextContent('1 note in')
    })

    it('hides notes indicator when no notes', () => {
      render(<DiscussionTermCard {...defaultProps} />)
      expect(screen.queryByTestId('notes-indicator')).not.toBeInTheDocument()
    })

    it('hides notes indicator when expanded', () => {
      const notes = [createNote()]
      render(
        <DiscussionTermCard
          {...defaultProps}
          term={createTerm({ discussionNotes: notes as DiscussionNote[] })}
          defaultExpanded
        />
      )
      expect(screen.queryByTestId('notes-indicator')).not.toBeInTheDocument()
    })
  })

  // ============================================
  // CALLBACK TESTS
  // ============================================

  describe('callbacks', () => {
    it('calls onAddNote with term ID', async () => {
      const onAddNote = vi.fn()
      const user = userEvent.setup()
      render(
        <DiscussionTermCard
          {...defaultProps}
          onAddNote={onAddNote}
          defaultExpanded
        />
      )

      const input = screen.getByTestId('note-input')
      await user.type(input, 'Test note text')
      await user.click(screen.getByTestId('add-note-button'))

      expect(onAddNote).toHaveBeenCalledWith('term-1', 'Test note text', 'parent')
    })

    it('calls onAcceptCompromise with term ID', async () => {
      const onAcceptCompromise = vi.fn()
      const user = userEvent.setup()
      render(
        <DiscussionTermCard
          {...defaultProps}
          onAcceptCompromise={onAcceptCompromise}
          defaultExpanded
        />
      )

      await user.click(screen.getByTestId('suggestion-0'))

      expect(onAcceptCompromise).toHaveBeenCalledWith(
        'term-1',
        expect.objectContaining({ id: 'st-less-30' }),
        'parent'
      )
    })

    it('calls onMarkAgreement with term ID', () => {
      const onMarkAgreement = vi.fn()
      render(
        <DiscussionTermCard
          {...defaultProps}
          onMarkAgreement={onMarkAgreement}
          defaultExpanded
        />
      )

      fireEvent.click(screen.getByTestId('agree-button'))

      expect(onMarkAgreement).toHaveBeenCalledWith('term-1', 'parent')
    })
  })

  // ============================================
  // DISABLED STATE TESTS
  // ============================================

  describe('disabled state', () => {
    it('hides add note form when disabled', () => {
      render(<DiscussionTermCard {...defaultProps} disabled defaultExpanded />)
      // When disabled, notes panel is readOnly which hides the form
      expect(screen.queryByTestId('add-note-form')).not.toBeInTheDocument()
    })

    it('disables compromise suggestions when disabled', () => {
      render(<DiscussionTermCard {...defaultProps} disabled defaultExpanded />)
      expect(screen.getByTestId('suggestion-0')).toBeDisabled()
    })

    it('disables resolution controls when disabled', () => {
      render(<DiscussionTermCard {...defaultProps} disabled defaultExpanded />)
      expect(screen.getByTestId('agree-button')).toBeDisabled()
    })

    it('makes notes panel read-only when resolved', () => {
      render(
        <DiscussionTermCard
          {...defaultProps}
          term={createTerm({ resolutionStatus: 'resolved' })}
          defaultExpanded
        />
      )
      expect(screen.queryByTestId('add-note-form')).not.toBeInTheDocument()
    })
  })

  // ============================================
  // STYLING TESTS
  // ============================================

  describe('styling', () => {
    it('has amber border when unresolved', () => {
      render(<DiscussionTermCard {...defaultProps} />)
      const card = screen.getByTestId('discussion-term-card')
      expect(card.className).toMatch(/amber/)
    })

    it('has green border when resolved', () => {
      render(
        <DiscussionTermCard
          {...defaultProps}
          term={createTerm({ resolutionStatus: 'resolved' })}
        />
      )
      const card = screen.getByTestId('discussion-term-card')
      expect(card.className).toMatch(/green/)
    })

    it('has larger shadow when expanded', async () => {
      const user = userEvent.setup()
      render(<DiscussionTermCard {...defaultProps} />)
      const card = screen.getByTestId('discussion-term-card')

      expect(card.className).toMatch(/shadow-sm/)

      await user.click(screen.getByTestId('discussion-card-header'))

      expect(card.className).toMatch(/shadow-lg/)
    })
  })

  // ============================================
  // ACCESSIBILITY TESTS
  // ============================================

  describe('accessibility', () => {
    it('header has button role', () => {
      render(<DiscussionTermCard {...defaultProps} />)
      expect(screen.getByTestId('discussion-card-header')).toHaveAttribute('role', 'button')
    })

    it('header has aria-expanded', () => {
      render(<DiscussionTermCard {...defaultProps} />)
      expect(screen.getByTestId('discussion-card-header')).toHaveAttribute('aria-expanded', 'false')
    })

    it('header aria-expanded updates when expanded', async () => {
      const user = userEvent.setup()
      render(<DiscussionTermCard {...defaultProps} />)

      await user.click(screen.getByTestId('discussion-card-header'))

      expect(screen.getByTestId('discussion-card-header')).toHaveAttribute('aria-expanded', 'true')
    })

    it('header has aria-controls', () => {
      render(<DiscussionTermCard {...defaultProps} defaultExpanded />)
      const header = screen.getByTestId('discussion-card-header')
      const panel = screen.getByTestId('discussion-panel')
      expect(header.getAttribute('aria-controls')).toBe(panel.id)
    })

    it('panel has region role', () => {
      render(<DiscussionTermCard {...defaultProps} defaultExpanded />)
      expect(screen.getByTestId('discussion-panel')).toHaveAttribute('role', 'region')
    })

    it('panel has aria-labelledby', () => {
      render(<DiscussionTermCard {...defaultProps} defaultExpanded />)
      const header = screen.getByTestId('discussion-card-header')
      const panel = screen.getByTestId('discussion-panel')
      expect(panel.getAttribute('aria-labelledby')).toBe(header.id)
    })

    it('header is focusable', () => {
      render(<DiscussionTermCard {...defaultProps} />)
      const header = screen.getByTestId('discussion-card-header')
      header.focus()
      expect(document.activeElement).toBe(header)
    })

    it('header has minimum touch target', () => {
      render(<DiscussionTermCard {...defaultProps} />)
      const header = screen.getByTestId('discussion-card-header')
      expect(header.className).toMatch(/min-h-\[44px\]/)
    })
  })

  // ============================================
  // DATA ATTRIBUTES TESTS
  // ============================================

  describe('data attributes', () => {
    it('has term-id data attribute', () => {
      render(<DiscussionTermCard {...defaultProps} />)
      expect(screen.getByTestId('discussion-term-card')).toHaveAttribute('data-term-id', 'term-1')
    })

    it('has resolution-status data attribute', () => {
      render(<DiscussionTermCard {...defaultProps} />)
      expect(screen.getByTestId('discussion-term-card')).toHaveAttribute(
        'data-resolution-status',
        'unresolved'
      )
    })
  })
})
