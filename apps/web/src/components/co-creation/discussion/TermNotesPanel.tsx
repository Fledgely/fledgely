/**
 * TermNotesPanel Component
 *
 * Story 5.4: Negotiation & Discussion Support - Task 3
 *
 * Displays and allows adding notes during term discussions.
 * Both parent and child can add notes with proper attribution.
 *
 * NFR42: Screen reader accessible
 * NFR43: Full keyboard navigation
 */

import { forwardRef, useState, useId, useRef, useCallback } from 'react'
import type { SessionContributor, DiscussionNote } from '@fledgely/contracts'
import { DISCUSSION_LIMITS } from '@fledgely/contracts'
import { getNoteAddedAnnouncement } from './discussionUtils'

// ============================================
// CONSTANTS
// ============================================

const MAX_NOTE_LENGTH = 500
const MAX_NOTES_PER_TERM = DISCUSSION_LIMITS.maxNotesPerTerm

// ============================================
// TYPES
// ============================================

export interface TermNotesPanelProps {
  /** Existing notes on the term */
  notes: DiscussionNote[]
  /** The current contributor */
  contributor: SessionContributor
  /** Callback when a note is added */
  onAddNote: (text: string, contributor: SessionContributor) => void
  /** Whether the panel is read-only */
  readOnly?: boolean
  /** Custom className */
  className?: string
  /** Test ID */
  'data-testid'?: string
}

// ============================================
// NOTE DISPLAY COMPONENT
// ============================================

interface NoteItemProps {
  note: DiscussionNote
  index: number
}

function NoteItem({ note, index }: NoteItemProps) {
  const isChild = note.contributor === 'child'
  const bgColor = isChild ? 'bg-pink-50' : 'bg-blue-50'
  const borderColor = isChild ? 'border-pink-200' : 'border-blue-200'
  const labelColor = isChild ? 'text-pink-700' : 'text-blue-700'
  const labelBg = isChild ? 'bg-pink-100' : 'bg-blue-100'
  const label = isChild ? 'Child' : 'Parent'

  const timestamp = new Date(note.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <li
      className={`${bgColor} rounded-lg p-3 border ${borderColor}`}
      data-testid={`note-item-${index}`}
      role="article"
      aria-label={`${label}'s note: ${note.text}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-xs font-medium ${labelColor} ${labelBg} px-2 py-0.5 rounded`}
          data-testid={`note-contributor-${index}`}
        >
          {label}
        </span>
        <span
          className="text-xs text-gray-500"
          data-testid={`note-timestamp-${index}`}
          aria-label={`Posted at ${timestamp}`}
        >
          {timestamp}
        </span>
      </div>
      <p
        className="text-sm text-gray-800"
        data-testid={`note-text-${index}`}
      >
        {note.text}
      </p>
    </li>
  )
}

// ============================================
// ADD NOTE FORM COMPONENT
// ============================================

interface AddNoteFormProps {
  contributor: SessionContributor
  onAddNote: (text: string) => void
  disabled?: boolean
  maxLength?: number
}

function AddNoteForm({
  contributor,
  onAddNote,
  disabled = false,
  maxLength = MAX_NOTE_LENGTH,
}: AddNoteFormProps) {
  const [noteText, setNoteText] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const formId = useId()
  const inputId = `${formId}-input`
  const counterId = `${formId}-counter`

  const charCount = noteText.length
  const charsRemaining = maxLength - charCount
  const isOverLimit = charCount > maxLength
  const isEmpty = noteText.trim().length === 0

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (isEmpty || isOverLimit || disabled) return

    onAddNote(noteText.trim())
    setNoteText('')
    inputRef.current?.focus()
  }, [noteText, isEmpty, isOverLimit, disabled, onAddNote])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Submit on Cmd/Ctrl + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit(e)
    }
  }, [handleSubmit])

  const isChild = contributor === 'child'
  const borderColor = isChild
    ? 'focus:border-pink-400 focus:ring-pink-200'
    : 'focus:border-blue-400 focus:ring-blue-200'
  const buttonColor = isChild
    ? 'bg-pink-500 hover:bg-pink-600 focus:ring-pink-300'
    : 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-300'

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4"
      data-testid="add-note-form"
    >
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        Add your thoughts
      </label>
      <div className="relative">
        <textarea
          ref={inputRef}
          id={inputId}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={isChild
            ? 'Share how you feel about this...'
            : 'Share your thoughts on this term...'
          }
          rows={3}
          className={`w-full rounded-lg border border-gray-300 p-3 text-sm resize-none
            ${borderColor} focus:outline-none focus:ring-2 transition-colors
            ${isOverLimit ? 'border-red-400' : ''}
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          aria-describedby={counterId}
          aria-invalid={isOverLimit}
          data-testid="note-input"
        />
      </div>

      <div className="flex items-center justify-between mt-2">
        <span
          id={counterId}
          className={`text-xs ${isOverLimit ? 'text-red-600 font-medium' : 'text-gray-500'}`}
          aria-live="polite"
          data-testid="char-counter"
        >
          {charsRemaining} characters remaining
        </span>

        <button
          type="submit"
          disabled={isEmpty || isOverLimit || disabled}
          className={`px-4 py-2 rounded-lg text-white text-sm font-medium
            ${buttonColor} focus:outline-none focus:ring-2
            disabled:opacity-50 disabled:cursor-not-allowed
            min-w-[100px] min-h-[44px]`}
          data-testid="add-note-button"
        >
          Add Note
        </button>
      </div>

      <p className="text-xs text-gray-400 mt-1">
        Press Cmd+Enter to submit
      </p>
    </form>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export const TermNotesPanel = forwardRef<HTMLDivElement, TermNotesPanelProps>(
  function TermNotesPanel(
    {
      notes,
      contributor,
      onAddNote,
      readOnly = false,
      className = '',
      'data-testid': testId = 'term-notes-panel',
    },
    ref
  ) {
    const [announcementText, setAnnouncementText] = useState('')
    const listId = useId()
    const titleId = useId()

    const hasNotes = notes.length > 0
    const canAddMore = notes.length < MAX_NOTES_PER_TERM
    const sortedNotes = [...notes].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    const handleAddNote = useCallback((text: string) => {
      onAddNote(text, contributor)
      // Announce for screen readers
      const announcement = getNoteAddedAnnouncement(contributor)
      setAnnouncementText(announcement)
      // Clear announcement after it's read
      setTimeout(() => setAnnouncementText(''), 1000)
    }, [onAddNote, contributor])

    return (
      <div
        ref={ref}
        className={`term-notes-panel ${className}`}
        data-testid={testId}
        role="region"
        aria-labelledby={titleId}
      >
        {/* Screen reader announcement */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          data-testid="notes-announcement"
        >
          {announcementText}
        </div>

        {/* Header */}
        <h4
          id={titleId}
          className="text-sm font-medium text-gray-700 mb-3 flex items-center"
        >
          <span className="mr-2" aria-hidden="true">💬</span>
          Discussion Notes
          {hasNotes && (
            <span className="ml-2 text-xs text-gray-500" data-testid="notes-count">
              ({notes.length})
            </span>
          )}
        </h4>

        {/* Notes List */}
        {hasNotes ? (
          <ul
            id={listId}
            className="space-y-3"
            data-testid="notes-list"
            aria-label="Discussion notes"
          >
            {sortedNotes.map((note, index) => (
              <NoteItem key={note.id} note={note} index={index} />
            ))}
          </ul>
        ) : (
          <p
            className="text-sm text-gray-500 italic py-4 text-center"
            data-testid="no-notes-message"
          >
            No notes yet. Start the discussion!
          </p>
        )}

        {/* Add Note Form */}
        {!readOnly && (
          <AddNoteForm
            contributor={contributor}
            onAddNote={handleAddNote}
            disabled={!canAddMore}
          />
        )}

        {/* Limit Warning */}
        {!canAddMore && (
          <p
            className="text-xs text-amber-600 mt-2"
            role="alert"
            data-testid="notes-limit-warning"
          >
            Maximum number of notes reached ({MAX_NOTES_PER_TERM})
          </p>
        )}
      </div>
    )
  }
)

