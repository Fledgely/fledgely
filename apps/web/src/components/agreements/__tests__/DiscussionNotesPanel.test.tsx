/**
 * Discussion Notes Panel Component Tests.
 *
 * Story 5.4: Negotiation & Discussion Support - AC3, AC4
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DiscussionNotesPanel } from '../DiscussionNotesPanel'
import type { DiscussionNote } from '@fledgely/shared/contracts'

describe('DiscussionNotesPanel', () => {
  const childName = 'Emma'
  const mockOnAddNote = vi.fn()
  const mockOnResolve = vi.fn()

  const sampleNotes: DiscussionNote[] = [
    {
      id: 'note-1',
      party: 'parent',
      content: 'I think 30 minutes is a good start.',
      createdAt: new Date(),
    },
    {
      id: 'note-2',
      party: 'child',
      content: 'But I need more time for my games!',
      createdAt: new Date(),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders with header', () => {
      render(
        <DiscussionNotesPanel
          notes={[]}
          status="needs_discussion"
          currentParty="parent"
          childName={childName}
          onAddNote={mockOnAddNote}
        />
      )

      expect(screen.getByTestId('discussion-notes-panel')).toBeInTheDocument()
      expect(screen.getByText('Discussion Notes')).toBeInTheDocument()
    })

    it('shows note count badge when there are notes', () => {
      render(
        <DiscussionNotesPanel
          notes={sampleNotes}
          status="needs_discussion"
          currentParty="parent"
          childName={childName}
          onAddNote={mockOnAddNote}
        />
      )

      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('shows empty state when no notes', () => {
      render(
        <DiscussionNotesPanel
          notes={[]}
          status="needs_discussion"
          currentParty="parent"
          childName={childName}
          onAddNote={mockOnAddNote}
        />
      )

      expect(screen.getByText('No notes yet. Share your thoughts!')).toBeInTheDocument()
    })
  })

  describe('Notes Display', () => {
    it('renders all notes', () => {
      render(
        <DiscussionNotesPanel
          notes={sampleNotes}
          status="needs_discussion"
          currentParty="parent"
          childName={childName}
          onAddNote={mockOnAddNote}
        />
      )

      expect(screen.getByText('I think 30 minutes is a good start.')).toBeInTheDocument()
      expect(screen.getByText('But I need more time for my games!')).toBeInTheDocument()
    })

    it('shows party attribution on notes', () => {
      render(
        <DiscussionNotesPanel
          notes={sampleNotes}
          status="needs_discussion"
          currentParty="parent"
          childName={childName}
          onAddNote={mockOnAddNote}
        />
      )

      // Parent appears in the note attribution and footer
      const parentTexts = screen.getAllByText('Parent')
      expect(parentTexts.length).toBeGreaterThanOrEqual(1)
      // Child name appears in note attribution
      const childTexts = screen.getAllByText(childName)
      expect(childTexts.length).toBeGreaterThanOrEqual(1)
    })

    it('applies different styling for parent vs child notes', () => {
      render(
        <DiscussionNotesPanel
          notes={sampleNotes}
          status="needs_discussion"
          currentParty="parent"
          childName={childName}
          onAddNote={mockOnAddNote}
        />
      )

      const parentNote = screen.getByTestId('note-note-1')
      const childNote = screen.getByTestId('note-note-2')

      // Background colors
      expect(parentNote.className).toContain('bg-blue-50')
      expect(childNote.className).toContain('bg-pink-50')
      // Border-left indicator for WCAG 1.4.1 compliance (non-color differentiation)
      expect(parentNote.className).toContain('border-l-4')
      expect(childNote.className).toContain('border-l-4')
    })
  })

  describe('Adding Notes', () => {
    it('shows note input textarea', () => {
      render(
        <DiscussionNotesPanel
          notes={[]}
          status="needs_discussion"
          currentParty="parent"
          childName={childName}
          onAddNote={mockOnAddNote}
        />
      )

      expect(screen.getByTestId('note-input')).toBeInTheDocument()
    })

    it('shows personalized placeholder for child', () => {
      render(
        <DiscussionNotesPanel
          notes={[]}
          status="needs_discussion"
          currentParty="child"
          childName={childName}
          onAddNote={mockOnAddNote}
        />
      )

      const input = screen.getByTestId('note-input')
      expect(input).toHaveAttribute('placeholder', `${childName}, share what you think...`)
    })

    it('shows generic placeholder for parent', () => {
      render(
        <DiscussionNotesPanel
          notes={[]}
          status="needs_discussion"
          currentParty="parent"
          childName={childName}
          onAddNote={mockOnAddNote}
        />
      )

      const input = screen.getByTestId('note-input')
      expect(input).toHaveAttribute('placeholder', 'Add your thoughts...')
    })

    it('updates character count as user types', () => {
      render(
        <DiscussionNotesPanel
          notes={[]}
          status="needs_discussion"
          currentParty="parent"
          childName={childName}
          onAddNote={mockOnAddNote}
        />
      )

      fireEvent.change(screen.getByTestId('note-input'), {
        target: { value: 'Test note' },
      })

      expect(screen.getByText('9/500')).toBeInTheDocument()
    })

    it('calls onAddNote when submit button clicked', () => {
      render(
        <DiscussionNotesPanel
          notes={[]}
          status="needs_discussion"
          currentParty="parent"
          childName={childName}
          onAddNote={mockOnAddNote}
        />
      )

      fireEvent.change(screen.getByTestId('note-input'), {
        target: { value: 'My new note' },
      })
      fireEvent.click(screen.getByTestId('submit-note'))

      expect(mockOnAddNote).toHaveBeenCalledWith('My new note', 'parent')
    })

    it('clears input after submission', () => {
      render(
        <DiscussionNotesPanel
          notes={[]}
          status="needs_discussion"
          currentParty="parent"
          childName={childName}
          onAddNote={mockOnAddNote}
        />
      )

      const input = screen.getByTestId('note-input')
      fireEvent.change(input, { target: { value: 'My new note' } })
      fireEvent.click(screen.getByTestId('submit-note'))

      expect(input).toHaveValue('')
    })

    it('disables submit button when input is empty', () => {
      render(
        <DiscussionNotesPanel
          notes={[]}
          status="needs_discussion"
          currentParty="parent"
          childName={childName}
          onAddNote={mockOnAddNote}
        />
      )

      expect(screen.getByTestId('submit-note')).toBeDisabled()
    })

    it('does not submit when only whitespace', () => {
      render(
        <DiscussionNotesPanel
          notes={[]}
          status="needs_discussion"
          currentParty="parent"
          childName={childName}
          onAddNote={mockOnAddNote}
        />
      )

      fireEvent.change(screen.getByTestId('note-input'), {
        target: { value: '   ' },
      })
      fireEvent.click(screen.getByTestId('submit-note'))

      expect(mockOnAddNote).not.toHaveBeenCalled()
    })
  })

  describe('Resolution', () => {
    it('shows resolve button when canResolve is true', () => {
      render(
        <DiscussionNotesPanel
          notes={sampleNotes}
          status="needs_discussion"
          currentParty="parent"
          childName={childName}
          onAddNote={mockOnAddNote}
          onResolve={mockOnResolve}
          canResolve={true}
        />
      )

      expect(screen.getByTestId('resolve-discussion')).toBeInTheDocument()
    })

    it('hides resolve button when canResolve is false', () => {
      render(
        <DiscussionNotesPanel
          notes={sampleNotes}
          status="needs_discussion"
          currentParty="parent"
          childName={childName}
          onAddNote={mockOnAddNote}
          onResolve={mockOnResolve}
          canResolve={false}
        />
      )

      expect(screen.queryByTestId('resolve-discussion')).not.toBeInTheDocument()
    })

    it('calls onResolve when resolve button clicked', () => {
      render(
        <DiscussionNotesPanel
          notes={sampleNotes}
          status="needs_discussion"
          currentParty="parent"
          childName={childName}
          onAddNote={mockOnAddNote}
          onResolve={mockOnResolve}
          canResolve={true}
        />
      )

      fireEvent.click(screen.getByTestId('resolve-discussion'))

      expect(mockOnResolve).toHaveBeenCalled()
    })

    it('shows resolved badge when status is resolved', () => {
      render(
        <DiscussionNotesPanel
          notes={sampleNotes}
          status="resolved"
          currentParty="parent"
          childName={childName}
          onAddNote={mockOnAddNote}
        />
      )

      expect(screen.getByText('Resolved')).toBeInTheDocument()
    })

    it('hides input form when resolved', () => {
      render(
        <DiscussionNotesPanel
          notes={sampleNotes}
          status="resolved"
          currentParty="parent"
          childName={childName}
          onAddNote={mockOnAddNote}
        />
      )

      expect(screen.queryByTestId('note-input')).not.toBeInTheDocument()
    })

    it('shows celebration message when resolved', () => {
      render(
        <DiscussionNotesPanel
          notes={sampleNotes}
          status="resolved"
          currentParty="parent"
          childName={childName}
          onAddNote={mockOnAddNote}
        />
      )

      expect(screen.getByText(/Discussion resolved! Great teamwork!/i)).toBeInTheDocument()
    })
  })

  describe('Party Attribution', () => {
    it('shows current party in footer', () => {
      render(
        <DiscussionNotesPanel
          notes={[]}
          status="needs_discussion"
          currentParty="parent"
          childName={childName}
          onAddNote={mockOnAddNote}
        />
      )

      expect(screen.getByText(/Currently adding notes as:/i)).toBeInTheDocument()
      expect(screen.getByText(/Parent/)).toBeInTheDocument()
    })

    it('shows child name when child is current party', () => {
      render(
        <DiscussionNotesPanel
          notes={[]}
          status="needs_discussion"
          currentParty="child"
          childName={childName}
          onAddNote={mockOnAddNote}
        />
      )

      expect(screen.getByText(childName)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has accessible notes list with log role', () => {
      render(
        <DiscussionNotesPanel
          notes={sampleNotes}
          status="needs_discussion"
          currentParty="parent"
          childName={childName}
          onAddNote={mockOnAddNote}
        />
      )

      expect(screen.getByRole('log', { name: /Discussion notes/i })).toBeInTheDocument()
    })

    it('has accessible textarea with label', () => {
      render(
        <DiscussionNotesPanel
          notes={[]}
          status="needs_discussion"
          currentParty="parent"
          childName={childName}
          onAddNote={mockOnAddNote}
        />
      )

      expect(screen.getByRole('textbox', { name: /Add a note/i })).toBeInTheDocument()
    })

    it('has proper touch target sizes for buttons', () => {
      render(
        <DiscussionNotesPanel
          notes={[]}
          status="needs_discussion"
          currentParty="parent"
          childName={childName}
          onAddNote={mockOnAddNote}
        />
      )

      const submitButton = screen.getByTestId('submit-note')
      expect(submitButton.className).toContain('min-h-[44px]')
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('submits note on Cmd+Enter (Mac)', () => {
      render(
        <DiscussionNotesPanel
          notes={[]}
          status="needs_discussion"
          currentParty="parent"
          childName={childName}
          onAddNote={mockOnAddNote}
        />
      )

      const input = screen.getByTestId('note-input')
      fireEvent.change(input, { target: { value: 'Test note via keyboard' } })
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', metaKey: true })

      expect(mockOnAddNote).toHaveBeenCalledWith('Test note via keyboard', 'parent')
    })

    it('submits note on Ctrl+Enter (Windows/Linux)', () => {
      render(
        <DiscussionNotesPanel
          notes={[]}
          status="needs_discussion"
          currentParty="parent"
          childName={childName}
          onAddNote={mockOnAddNote}
        />
      )

      const input = screen.getByTestId('note-input')
      fireEvent.change(input, { target: { value: 'Test note via keyboard' } })
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', ctrlKey: true })

      expect(mockOnAddNote).toHaveBeenCalledWith('Test note via keyboard', 'parent')
    })

    it('does not submit on Enter alone', () => {
      render(
        <DiscussionNotesPanel
          notes={[]}
          status="needs_discussion"
          currentParty="parent"
          childName={childName}
          onAddNote={mockOnAddNote}
        />
      )

      const input = screen.getByTestId('note-input')
      fireEvent.change(input, { target: { value: 'Test note' } })
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

      expect(mockOnAddNote).not.toHaveBeenCalled()
    })

    it('does not submit empty note via keyboard shortcut', () => {
      render(
        <DiscussionNotesPanel
          notes={[]}
          status="needs_discussion"
          currentParty="parent"
          childName={childName}
          onAddNote={mockOnAddNote}
        />
      )

      const input = screen.getByTestId('note-input')
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', metaKey: true })

      expect(mockOnAddNote).not.toHaveBeenCalled()
    })
  })
})
