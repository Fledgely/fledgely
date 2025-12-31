/**
 * FlagNotesPanel Tests - Story 22.4
 *
 * Tests for the flag discussion notes panel.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FlagNotesPanel } from './FlagNotesPanel'
import type { FlagNote } from '@fledgely/shared'

const createMockNote = (overrides: Partial<FlagNote> = {}): FlagNote => ({
  id: 'note-123',
  content: 'This is a test note',
  authorId: 'parent-456',
  authorName: 'John Doe',
  timestamp: Date.now(),
  ...overrides,
})

describe('FlagNotesPanel', () => {
  const mockOnAddNote = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Panel structure', () => {
    it('should render the panel', () => {
      render(<FlagNotesPanel notes={[]} onAddNote={mockOnAddNote} />)

      expect(screen.getByTestId('flag-notes-panel')).toBeInTheDocument()
    })

    it('should render header with title', () => {
      render(<FlagNotesPanel notes={[]} onAddNote={mockOnAddNote} />)

      expect(screen.getByText('Discussion Notes')).toBeInTheDocument()
    })

    it('should show note count badge when notes exist', () => {
      const notes = [createMockNote({ id: '1' }), createMockNote({ id: '2' })]
      render(<FlagNotesPanel notes={notes} onAddNote={mockOnAddNote} />)

      expect(screen.getByTestId('notes-count')).toHaveTextContent('2')
    })

    it('should not show badge when no notes', () => {
      render(<FlagNotesPanel notes={[]} onAddNote={mockOnAddNote} />)

      expect(screen.queryByTestId('notes-count')).not.toBeInTheDocument()
    })
  })

  describe('AC1: Notes text field', () => {
    it('should render note input field', () => {
      render(<FlagNotesPanel notes={[]} onAddNote={mockOnAddNote} />)

      // Expand panel first
      fireEvent.click(screen.getByTestId('notes-header'))

      expect(screen.getByTestId('note-input')).toBeInTheDocument()
    })

    it('should render add note button', () => {
      render(<FlagNotesPanel notes={[]} onAddNote={mockOnAddNote} />)

      fireEvent.click(screen.getByTestId('notes-header'))

      expect(screen.getByTestId('add-note-button')).toBeInTheDocument()
      expect(screen.getByTestId('add-note-button')).toHaveTextContent('Add Note')
    })

    it('should allow typing in input field', () => {
      render(<FlagNotesPanel notes={[]} onAddNote={mockOnAddNote} />)

      fireEvent.click(screen.getByTestId('notes-header'))
      const input = screen.getByTestId('note-input')
      fireEvent.change(input, { target: { value: 'New note content' } })

      expect(input).toHaveValue('New note content')
    })
  })

  describe('AC4: Multiple notes over time', () => {
    it('should display multiple notes', () => {
      const notes = [
        createMockNote({ id: '1', content: 'First note' }),
        createMockNote({ id: '2', content: 'Second note' }),
        createMockNote({ id: '3', content: 'Third note' }),
      ]
      render(<FlagNotesPanel notes={notes} onAddNote={mockOnAddNote} />)

      const noteItems = screen.getAllByTestId('note-item')
      expect(noteItems).toHaveLength(3)
    })

    it('should display notes in reverse chronological order (newest first)', () => {
      const notes = [
        createMockNote({ id: '1', content: 'Old note', timestamp: 1000 }),
        createMockNote({ id: '2', content: 'New note', timestamp: 2000 }),
      ]
      render(<FlagNotesPanel notes={notes} onAddNote={mockOnAddNote} />)

      const noteContents = screen.getAllByTestId('note-content')
      expect(noteContents[0]).toHaveTextContent('New note')
      expect(noteContents[1]).toHaveTextContent('Old note')
    })
  })

  describe('AC5: Note metadata', () => {
    it('should display author name', () => {
      const notes = [createMockNote({ authorName: 'Jane Smith' })]
      render(<FlagNotesPanel notes={notes} onAddNote={mockOnAddNote} />)

      expect(screen.getByTestId('note-author')).toHaveTextContent('Jane Smith')
    })

    it('should display timestamp', () => {
      const notes = [createMockNote({ timestamp: new Date('2024-12-15T15:45:00').getTime() })]
      render(<FlagNotesPanel notes={notes} onAddNote={mockOnAddNote} />)

      // Should contain date info
      expect(screen.getByTestId('note-timestamp')).toBeInTheDocument()
    })

    it('should display note content', () => {
      const notes = [createMockNote({ content: 'Discussed with Emma about gaming' })]
      render(<FlagNotesPanel notes={notes} onAddNote={mockOnAddNote} />)

      expect(screen.getByTestId('note-content')).toHaveTextContent(
        'Discussed with Emma about gaming'
      )
    })
  })

  describe('AC6: Conversation tracking', () => {
    it('should show placeholder text suggesting conversation tracking', () => {
      render(<FlagNotesPanel notes={[]} onAddNote={mockOnAddNote} />)

      fireEvent.click(screen.getByTestId('notes-header'))
      const input = screen.getByTestId('note-input')

      expect(input).toHaveAttribute(
        'placeholder',
        'e.g., Discussed with Emma on 12/15, agreed to...'
      )
    })
  })

  describe('Adding notes', () => {
    it('should call onAddNote with content when submitted', async () => {
      mockOnAddNote.mockResolvedValue(undefined)
      render(<FlagNotesPanel notes={[]} onAddNote={mockOnAddNote} />)

      fireEvent.click(screen.getByTestId('notes-header'))
      fireEvent.change(screen.getByTestId('note-input'), {
        target: { value: 'New discussion note' },
      })
      fireEvent.click(screen.getByTestId('add-note-button'))

      await waitFor(() => {
        expect(mockOnAddNote).toHaveBeenCalledWith('New discussion note')
      })
    })

    it('should clear input after successful submission', async () => {
      mockOnAddNote.mockResolvedValue(undefined)
      render(<FlagNotesPanel notes={[]} onAddNote={mockOnAddNote} />)

      fireEvent.click(screen.getByTestId('notes-header'))
      const input = screen.getByTestId('note-input')
      fireEvent.change(input, { target: { value: 'New note' } })
      fireEvent.click(screen.getByTestId('add-note-button'))

      await waitFor(() => {
        expect(input).toHaveValue('')
      })
    })

    it('should disable button when input is empty', () => {
      render(<FlagNotesPanel notes={[]} onAddNote={mockOnAddNote} />)

      fireEvent.click(screen.getByTestId('notes-header'))

      expect(screen.getByTestId('add-note-button')).toBeDisabled()
    })

    it('should trim whitespace from note content', async () => {
      mockOnAddNote.mockResolvedValue(undefined)
      render(<FlagNotesPanel notes={[]} onAddNote={mockOnAddNote} />)

      fireEvent.click(screen.getByTestId('notes-header'))
      fireEvent.change(screen.getByTestId('note-input'), {
        target: { value: '  trimmed note  ' },
      })
      fireEvent.click(screen.getByTestId('add-note-button'))

      await waitFor(() => {
        expect(mockOnAddNote).toHaveBeenCalledWith('trimmed note')
      })
    })

    it('should submit on Ctrl+Enter', async () => {
      mockOnAddNote.mockResolvedValue(undefined)
      render(<FlagNotesPanel notes={[]} onAddNote={mockOnAddNote} />)

      fireEvent.click(screen.getByTestId('notes-header'))
      const input = screen.getByTestId('note-input')
      fireEvent.change(input, { target: { value: 'Keyboard submit' } })
      fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true })

      await waitFor(() => {
        expect(mockOnAddNote).toHaveBeenCalledWith('Keyboard submit')
      })
    })
  })

  describe('Loading state', () => {
    it('should disable input when loading', () => {
      render(<FlagNotesPanel notes={[]} onAddNote={mockOnAddNote} isLoading={true} />)

      fireEvent.click(screen.getByTestId('notes-header'))

      expect(screen.getByTestId('note-input')).toBeDisabled()
    })

    it('should disable button when loading', () => {
      render(<FlagNotesPanel notes={[]} onAddNote={mockOnAddNote} isLoading={true} />)

      fireEvent.click(screen.getByTestId('notes-header'))

      expect(screen.getByTestId('add-note-button')).toBeDisabled()
    })
  })

  describe('Empty state', () => {
    it('should show empty state message when no notes', () => {
      render(<FlagNotesPanel notes={[]} onAddNote={mockOnAddNote} />)

      fireEvent.click(screen.getByTestId('notes-header'))

      expect(screen.getByTestId('notes-empty')).toBeInTheDocument()
      expect(screen.getByTestId('notes-empty')).toHaveTextContent('No notes yet')
    })

    it('should not show empty state when notes exist', () => {
      const notes = [createMockNote()]
      render(<FlagNotesPanel notes={notes} onAddNote={mockOnAddNote} />)

      expect(screen.queryByTestId('notes-empty')).not.toBeInTheDocument()
    })
  })

  describe('Collapsible behavior', () => {
    it('should be collapsed by default when no notes', () => {
      render(<FlagNotesPanel notes={[]} onAddNote={mockOnAddNote} />)

      expect(screen.queryByTestId('note-input')).not.toBeInTheDocument()
    })

    it('should be expanded by default when notes exist', () => {
      const notes = [createMockNote()]
      render(<FlagNotesPanel notes={notes} onAddNote={mockOnAddNote} />)

      expect(screen.getByTestId('notes-list')).toBeInTheDocument()
    })

    it('should toggle expansion on header click', () => {
      render(<FlagNotesPanel notes={[]} onAddNote={mockOnAddNote} />)

      fireEvent.click(screen.getByTestId('notes-header'))
      expect(screen.getByTestId('note-input')).toBeInTheDocument()

      fireEvent.click(screen.getByTestId('notes-header'))
      expect(screen.queryByTestId('note-input')).not.toBeInTheDocument()
    })

    it('should have correct aria-expanded attribute', () => {
      render(<FlagNotesPanel notes={[]} onAddNote={mockOnAddNote} />)

      const header = screen.getByTestId('notes-header')
      expect(header).toHaveAttribute('aria-expanded', 'false')

      fireEvent.click(header)
      expect(header).toHaveAttribute('aria-expanded', 'true')
    })
  })
})
