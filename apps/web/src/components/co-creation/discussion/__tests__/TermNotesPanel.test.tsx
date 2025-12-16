/**
 * Tests for TermNotesPanel Component
 *
 * Story 5.4: Negotiation & Discussion Support - Task 3.7
 *
 * Tests for viewing and adding discussion notes.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TermNotesPanel } from '../TermNotesPanel'
import type { DiscussionNote } from '@fledgely/contracts'

// ============================================
// TEST FIXTURES
// ============================================

const createNote = (
  overrides: Partial<DiscussionNote> = {}
): DiscussionNote => ({
  id: crypto.randomUUID(),
  contributor: 'parent',
  text: 'Test note',
  createdAt: new Date().toISOString(),
  ...overrides,
})

const defaultProps = {
  notes: [],
  contributor: 'parent' as const,
  onAddNote: vi.fn(),
}

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('TermNotesPanel', () => {
  describe('basic rendering', () => {
    it('renders the component', () => {
      render(<TermNotesPanel {...defaultProps} />)
      expect(screen.getByTestId('term-notes-panel')).toBeInTheDocument()
    })

    it('renders custom data-testid', () => {
      render(<TermNotesPanel {...defaultProps} data-testid="custom-panel" />)
      expect(screen.getByTestId('custom-panel')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<TermNotesPanel {...defaultProps} className="custom-class" />)
      expect(screen.getByTestId('term-notes-panel')).toHaveClass('custom-class')
    })

    it('shows discussion notes title', () => {
      render(<TermNotesPanel {...defaultProps} />)
      expect(screen.getByText('Discussion Notes')).toBeInTheDocument()
    })
  })

  // ============================================
  // EMPTY STATE TESTS
  // ============================================

  describe('empty state', () => {
    it('shows no notes message when empty', () => {
      render(<TermNotesPanel {...defaultProps} notes={[]} />)
      expect(screen.getByTestId('no-notes-message')).toBeInTheDocument()
    })

    it('displays encouraging empty message', () => {
      render(<TermNotesPanel {...defaultProps} notes={[]} />)
      expect(screen.getByText(/Start the discussion/i)).toBeInTheDocument()
    })

    it('still shows add note form when empty', () => {
      render(<TermNotesPanel {...defaultProps} notes={[]} />)
      expect(screen.getByTestId('add-note-form')).toBeInTheDocument()
    })
  })

  // ============================================
  // NOTES DISPLAY TESTS
  // ============================================

  describe('notes display', () => {
    it('displays existing notes', () => {
      const notes = [
        createNote({ text: 'First note' }),
        createNote({ text: 'Second note' }),
      ]
      render(<TermNotesPanel {...defaultProps} notes={notes} />)
      expect(screen.getByTestId('notes-list')).toBeInTheDocument()
      expect(screen.getByText('First note')).toBeInTheDocument()
      expect(screen.getByText('Second note')).toBeInTheDocument()
    })

    it('shows note count', () => {
      const notes = [createNote(), createNote(), createNote()]
      render(<TermNotesPanel {...defaultProps} notes={notes} />)
      expect(screen.getByTestId('notes-count')).toHaveTextContent('(3)')
    })

    it('shows contributor label for each note', () => {
      const notes = [
        createNote({ contributor: 'parent' }),
        createNote({ contributor: 'child' }),
      ]
      render(<TermNotesPanel {...defaultProps} notes={notes} />)
      expect(screen.getByTestId('note-contributor-0')).toHaveTextContent('Parent')
      expect(screen.getByTestId('note-contributor-1')).toHaveTextContent('Child')
    })

    it('shows timestamp for each note', () => {
      const notes = [createNote()]
      render(<TermNotesPanel {...defaultProps} notes={notes} />)
      expect(screen.getByTestId('note-timestamp-0')).toBeInTheDocument()
    })

    it('sorts notes by creation time', () => {
      const older = createNote({
        text: 'Older note',
        createdAt: '2024-01-01T10:00:00.000Z',
      })
      const newer = createNote({
        text: 'Newer note',
        createdAt: '2024-01-01T12:00:00.000Z',
      })
      render(<TermNotesPanel {...defaultProps} notes={[newer, older]} />)
      const noteItems = screen.getAllByRole('article')
      expect(noteItems[0]).toHaveTextContent('Older note')
      expect(noteItems[1]).toHaveTextContent('Newer note')
    })
  })

  // ============================================
  // NOTE STYLING TESTS
  // ============================================

  describe('note styling', () => {
    it('applies pink styling for child notes', () => {
      const notes = [createNote({ contributor: 'child' })]
      render(<TermNotesPanel {...defaultProps} notes={notes} />)
      const noteItem = screen.getByTestId('note-item-0')
      expect(noteItem.className).toMatch(/pink/)
    })

    it('applies blue styling for parent notes', () => {
      const notes = [createNote({ contributor: 'parent' })]
      render(<TermNotesPanel {...defaultProps} notes={notes} />)
      const noteItem = screen.getByTestId('note-item-0')
      expect(noteItem.className).toMatch(/blue/)
    })
  })

  // ============================================
  // ADD NOTE FORM TESTS
  // ============================================

  describe('add note form', () => {
    it('shows add note form', () => {
      render(<TermNotesPanel {...defaultProps} />)
      expect(screen.getByTestId('add-note-form')).toBeInTheDocument()
    })

    it('shows note input', () => {
      render(<TermNotesPanel {...defaultProps} />)
      expect(screen.getByTestId('note-input')).toBeInTheDocument()
    })

    it('shows add note button', () => {
      render(<TermNotesPanel {...defaultProps} />)
      expect(screen.getByTestId('add-note-button')).toBeInTheDocument()
    })

    it('shows character counter', () => {
      render(<TermNotesPanel {...defaultProps} />)
      expect(screen.getByTestId('char-counter')).toBeInTheDocument()
      expect(screen.getByText('500 characters remaining')).toBeInTheDocument()
    })

    it('updates character counter as user types', async () => {
      const user = userEvent.setup()
      render(<TermNotesPanel {...defaultProps} />)
      const input = screen.getByTestId('note-input')

      await user.type(input, 'Hello')

      expect(screen.getByText('495 characters remaining')).toBeInTheDocument()
    })

    it('shows negative count when over limit', async () => {
      const user = userEvent.setup()
      render(<TermNotesPanel {...defaultProps} />)
      const input = screen.getByTestId('note-input')

      // Type 501 characters
      const longText = 'a'.repeat(501)
      await user.type(input, longText)

      expect(screen.getByText('-1 characters remaining')).toBeInTheDocument()
    })

    it('disables button when input is empty', () => {
      render(<TermNotesPanel {...defaultProps} />)
      expect(screen.getByTestId('add-note-button')).toBeDisabled()
    })

    it('enables button when input has text', async () => {
      const user = userEvent.setup()
      render(<TermNotesPanel {...defaultProps} />)
      const input = screen.getByTestId('note-input')

      await user.type(input, 'Test note')

      expect(screen.getByTestId('add-note-button')).not.toBeDisabled()
    })

    it('disables button when over character limit', async () => {
      const user = userEvent.setup()
      render(<TermNotesPanel {...defaultProps} />)
      const input = screen.getByTestId('note-input')

      await user.type(input, 'a'.repeat(501))

      expect(screen.getByTestId('add-note-button')).toBeDisabled()
    })
  })

  // ============================================
  // ADD NOTE SUBMISSION TESTS
  // ============================================

  describe('add note submission', () => {
    it('calls onAddNote with text and contributor', async () => {
      const onAddNote = vi.fn()
      const user = userEvent.setup()
      render(<TermNotesPanel {...defaultProps} onAddNote={onAddNote} contributor="child" />)

      await user.type(screen.getByTestId('note-input'), 'My note')
      await user.click(screen.getByTestId('add-note-button'))

      expect(onAddNote).toHaveBeenCalledWith('My note', 'child')
    })

    it('clears input after submission', async () => {
      const user = userEvent.setup()
      render(<TermNotesPanel {...defaultProps} />)
      const input = screen.getByTestId('note-input')

      await user.type(input, 'My note')
      await user.click(screen.getByTestId('add-note-button'))

      expect(input).toHaveValue('')
    })

    it('trims whitespace from note text', async () => {
      const onAddNote = vi.fn()
      const user = userEvent.setup()
      render(<TermNotesPanel {...defaultProps} onAddNote={onAddNote} />)

      await user.type(screen.getByTestId('note-input'), '  My note  ')
      await user.click(screen.getByTestId('add-note-button'))

      expect(onAddNote).toHaveBeenCalledWith('My note', 'parent')
    })

    it('does not submit empty or whitespace-only notes', async () => {
      const onAddNote = vi.fn()
      const user = userEvent.setup()
      render(<TermNotesPanel {...defaultProps} onAddNote={onAddNote} />)

      await user.type(screen.getByTestId('note-input'), '   ')
      await user.click(screen.getByTestId('add-note-button'))

      expect(onAddNote).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // KEYBOARD NAVIGATION TESTS (NFR43)
  // ============================================

  describe('keyboard navigation (NFR43)', () => {
    it('submits on Ctrl+Enter', async () => {
      const onAddNote = vi.fn()
      const user = userEvent.setup()
      render(<TermNotesPanel {...defaultProps} onAddNote={onAddNote} />)
      const input = screen.getByTestId('note-input')

      await user.type(input, 'My note')
      await user.keyboard('{Control>}{Enter}{/Control}')

      expect(onAddNote).toHaveBeenCalledWith('My note', 'parent')
    })

    it('submits on Meta+Enter (Mac)', async () => {
      const onAddNote = vi.fn()
      const user = userEvent.setup()
      render(<TermNotesPanel {...defaultProps} onAddNote={onAddNote} />)
      const input = screen.getByTestId('note-input')

      await user.type(input, 'My note')
      await user.keyboard('{Meta>}{Enter}{/Meta}')

      expect(onAddNote).toHaveBeenCalledWith('My note', 'parent')
    })

    it('textarea is focusable', () => {
      render(<TermNotesPanel {...defaultProps} />)
      const input = screen.getByTestId('note-input')
      input.focus()
      expect(document.activeElement).toBe(input)
    })

    it('button is focusable when enabled', async () => {
      const user = userEvent.setup()
      render(<TermNotesPanel {...defaultProps} />)
      const input = screen.getByTestId('note-input')

      // Type something to enable the button
      await user.type(input, 'Test note')

      const button = screen.getByTestId('add-note-button')
      button.focus()
      expect(document.activeElement).toBe(button)
    })
  })

  // ============================================
  // READ ONLY MODE TESTS
  // ============================================

  describe('read only mode', () => {
    it('hides add note form when readOnly', () => {
      render(<TermNotesPanel {...defaultProps} readOnly />)
      expect(screen.queryByTestId('add-note-form')).not.toBeInTheDocument()
    })

    it('still shows existing notes when readOnly', () => {
      const notes = [createNote({ text: 'Read only note' })]
      render(<TermNotesPanel {...defaultProps} notes={notes} readOnly />)
      expect(screen.getByText('Read only note')).toBeInTheDocument()
    })
  })

  // ============================================
  // NOTE LIMIT TESTS
  // ============================================

  describe('note limits', () => {
    it('shows warning when max notes reached', () => {
      const notes = Array.from({ length: 50 }, () => createNote())
      render(<TermNotesPanel {...defaultProps} notes={notes} />)
      expect(screen.getByTestId('notes-limit-warning')).toBeInTheDocument()
    })

    it('disables form when max notes reached', () => {
      const notes = Array.from({ length: 50 }, () => createNote())
      render(<TermNotesPanel {...defaultProps} notes={notes} />)
      expect(screen.getByTestId('note-input')).toBeDisabled()
    })

    it('does not show warning below limit', () => {
      const notes = Array.from({ length: 10 }, () => createNote())
      render(<TermNotesPanel {...defaultProps} notes={notes} />)
      expect(screen.queryByTestId('notes-limit-warning')).not.toBeInTheDocument()
    })
  })

  // ============================================
  // ACCESSIBILITY TESTS (NFR42)
  // ============================================

  describe('accessibility (NFR42)', () => {
    it('has region role with label', () => {
      render(<TermNotesPanel {...defaultProps} />)
      expect(screen.getByRole('region')).toBeInTheDocument()
      expect(screen.getByRole('region')).toHaveAttribute('aria-labelledby')
    })

    it('notes list has aria-label', () => {
      const notes = [createNote()]
      render(<TermNotesPanel {...defaultProps} notes={notes} />)
      expect(screen.getByTestId('notes-list')).toHaveAttribute('aria-label', 'Discussion notes')
    })

    it('each note has article role', () => {
      const notes = [createNote(), createNote()]
      render(<TermNotesPanel {...defaultProps} notes={notes} />)
      expect(screen.getAllByRole('article')).toHaveLength(2)
    })

    it('notes have aria-label describing content', () => {
      const notes = [createNote({ text: 'Test content', contributor: 'parent' })]
      render(<TermNotesPanel {...defaultProps} notes={notes} />)
      const article = screen.getByRole('article')
      expect(article).toHaveAttribute('aria-label', "Parent's note: Test content")
    })

    it('input has aria-describedby for counter', () => {
      render(<TermNotesPanel {...defaultProps} />)
      const input = screen.getByTestId('note-input')
      expect(input).toHaveAttribute('aria-describedby')
    })

    it('input has aria-invalid when over limit', async () => {
      const user = userEvent.setup()
      render(<TermNotesPanel {...defaultProps} />)
      const input = screen.getByTestId('note-input')

      await user.type(input, 'a'.repeat(501))

      expect(input).toHaveAttribute('aria-invalid', 'true')
    })

    it('character counter has aria-live', () => {
      render(<TermNotesPanel {...defaultProps} />)
      expect(screen.getByTestId('char-counter')).toHaveAttribute('aria-live', 'polite')
    })

    it('provides screen reader announcement area', () => {
      render(<TermNotesPanel {...defaultProps} />)
      const announcement = screen.getByTestId('notes-announcement')
      expect(announcement).toHaveAttribute('aria-live', 'polite')
      expect(announcement).toHaveClass('sr-only')
    })

    it('limit warning has alert role', () => {
      const notes = Array.from({ length: 50 }, () => createNote())
      render(<TermNotesPanel {...defaultProps} notes={notes} />)
      expect(screen.getByTestId('notes-limit-warning')).toHaveAttribute('role', 'alert')
    })
  })

  // ============================================
  // CONTRIBUTOR-SPECIFIC UI TESTS
  // ============================================

  describe('contributor-specific UI', () => {
    it('shows child-friendly placeholder for child contributor', () => {
      render(<TermNotesPanel {...defaultProps} contributor="child" />)
      expect(screen.getByTestId('note-input')).toHaveAttribute(
        'placeholder',
        'Share how you feel about this...'
      )
    })

    it('shows parent placeholder for parent contributor', () => {
      render(<TermNotesPanel {...defaultProps} contributor="parent" />)
      expect(screen.getByTestId('note-input')).toHaveAttribute(
        'placeholder',
        'Share your thoughts on this term...'
      )
    })

    it('uses pink button for child', () => {
      render(<TermNotesPanel {...defaultProps} contributor="child" />)
      const button = screen.getByTestId('add-note-button')
      expect(button.className).toMatch(/pink/)
    })

    it('uses blue button for parent', () => {
      render(<TermNotesPanel {...defaultProps} contributor="parent" />)
      const button = screen.getByTestId('add-note-button')
      expect(button.className).toMatch(/blue/)
    })
  })
})
