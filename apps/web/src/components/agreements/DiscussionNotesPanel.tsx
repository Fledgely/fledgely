/**
 * Discussion Notes Panel Component.
 *
 * Story 5.4: Negotiation & Discussion Support - AC3, AC4
 *
 * Provides an interface for adding and viewing discussion notes.
 * Notes are saved with attribution and timestamp.
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import type {
  ContributionParty,
  DiscussionNote,
  DiscussionStatus,
} from '@fledgely/shared/contracts'

/**
 * Maximum characters per note.
 */
const MAX_NOTE_LENGTH = 500

interface DiscussionNotesPanelProps {
  /** Discussion notes for this term */
  notes: DiscussionNote[]
  /** Current discussion status */
  status: DiscussionStatus
  /** Who is currently contributing */
  currentParty: ContributionParty
  /** Child's name for display */
  childName: string
  /** Called when a note is added */
  onAddNote: (content: string, party: ContributionParty) => void
  /** Called when discussion is marked as resolved */
  onResolve?: () => void
  /** Whether to allow resolving (only when both parties have contributed) */
  canResolve?: boolean
}

/**
 * Format relative time for display.
 */
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function DiscussionNotesPanel({
  notes,
  status,
  currentParty,
  childName,
  onAddNote,
  onResolve,
  canResolve = false,
}: DiscussionNotesPanelProps) {
  const [newNote, setNewNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const notesEndRef = useRef<HTMLDivElement>(null)
  const prevNotesLengthRef = useRef(notes.length)

  // Scroll to bottom only when new notes are added (not when notes are modified)
  useEffect(() => {
    if (notes.length > prevNotesLengthRef.current) {
      // scrollIntoView may not be available in test environment
      if (notesEndRef.current && typeof notesEndRef.current.scrollIntoView === 'function') {
        notesEndRef.current.scrollIntoView({ behavior: 'smooth' })
      }
    }
    prevNotesLengthRef.current = notes.length
  }, [notes.length])

  /**
   * Handle submitting a note.
   */
  const handleSubmit = () => {
    if (!newNote.trim() || isSubmitting) return

    setIsSubmitting(true)
    onAddNote(newNote.trim(), currentParty)
    setNewNote('')
    setIsSubmitting(false)
    textareaRef.current?.focus()
  }

  /**
   * Handle key press for submit shortcut.
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const isChild = currentParty === 'child'
  const partyDisplayName = isChild ? childName : 'Parent'
  const isResolved = status === 'resolved'

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 overflow-hidden"
      data-testid="discussion-notes-panel"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">
            📝
          </span>
          <h4 className="font-semibold text-gray-900">Discussion Notes</h4>
          {notes.length > 0 && (
            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
              {notes.length}
            </span>
          )}
        </div>
        {isResolved && (
          <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full flex items-center gap-1">
            <span aria-hidden="true">✓</span>
            Resolved
          </span>
        )}
      </div>

      {/* Notes list */}
      <div
        className="max-h-64 overflow-y-auto p-4 space-y-3"
        role="log"
        aria-label="Discussion notes"
        data-testid="notes-list"
      >
        {notes.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-500 text-sm">No notes yet. Share your thoughts!</p>
          </div>
        ) : (
          notes.map((note) => {
            const isNoteFromChild = note.party === 'child'
            return (
              <div
                key={note.id}
                className={`
                  p-3 rounded-lg border-l-4
                  ${isNoteFromChild ? 'bg-pink-50 border-pink-400 ml-4' : 'bg-blue-50 border-blue-600 mr-4'}
                `}
                data-testid={`note-${note.id}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1.5">
                    {/* Icon indicator for non-color differentiation (WCAG 1.4.1) */}
                    <span className="text-sm" aria-hidden="true">
                      {isNoteFromChild ? '👤' : '👨‍👩‍👧'}
                    </span>
                    <span
                      className={`text-xs font-medium ${isNoteFromChild ? 'text-pink-700' : 'text-blue-700'}`}
                    >
                      {isNoteFromChild ? childName : 'Parent'}
                    </span>
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatRelativeTime(note.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-800">{note.content}</p>
              </div>
            )
          })
        )}
        <div ref={notesEndRef} />
      </div>

      {/* Add note form (only if not resolved) */}
      {!isResolved && (
        <div className="p-4 border-t border-gray-200 space-y-3">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value.slice(0, MAX_NOTE_LENGTH))}
              onKeyDown={handleKeyPress}
              placeholder={
                isChild ? `${childName}, share what you think...` : 'Add your thoughts...'
              }
              rows={3}
              disabled={isSubmitting}
              className={`
                w-full p-3 rounded-lg border-2 text-sm resize-none
                focus:outline-none focus:ring-2 focus:ring-offset-2
                ${
                  isChild
                    ? 'border-pink-200 focus:border-pink-400 focus:ring-pink-400'
                    : 'border-blue-200 focus:border-blue-400 focus:ring-blue-400'
                }
                ${isSubmitting ? 'opacity-50' : ''}
              `}
              aria-label="Add a note"
              data-testid="note-input"
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              {newNote.length}/{MAX_NOTE_LENGTH}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!newNote.trim() || isSubmitting}
              className={`
                flex-1 px-4 py-2 font-medium rounded-lg
                transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
                min-h-[44px]
                ${
                  isChild
                    ? 'bg-pink-500 text-white hover:bg-pink-600 focus:ring-pink-500'
                    : 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              data-testid="submit-note"
            >
              Add Note
            </button>

            {onResolve && canResolve && (
              <button
                type="button"
                onClick={onResolve}
                className="
                  px-4 py-2 bg-green-500 text-white font-medium rounded-lg
                  hover:bg-green-600 transition-colors
                  focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                  min-h-[44px]
                "
                data-testid="resolve-discussion"
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden="true">✓</span>
                  <span>Mark Resolved</span>
                </span>
              </button>
            )}
          </div>

          {/* Keyboard shortcut hint */}
          <p className="text-xs text-gray-400 text-center">
            Press ⌘/Ctrl + Enter to add note quickly
          </p>
        </div>
      )}

      {/* Resolution info (if resolved) */}
      {isResolved && (
        <div className="p-4 border-t border-gray-200 bg-green-50">
          <div className="flex items-center gap-2 text-green-700">
            <span className="text-xl" aria-hidden="true">
              🎉
            </span>
            <p className="text-sm font-medium">Discussion resolved! Great teamwork!</p>
          </div>
        </div>
      )}

      {/* Attribution footer */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Currently adding notes as: <span className="font-medium">{partyDisplayName}</span>
        </p>
      </div>
    </div>
  )
}
