'use client'

/**
 * FlagNotesPanel Component - Story 22.4
 *
 * Panel for viewing and adding discussion notes to flags.
 *
 * Acceptance Criteria:
 * - AC1: Text field available for parent notes
 * - AC4: Multiple notes can be added over time
 * - AC5: Notes show: author, timestamp, content
 * - AC6: Notes help track conversation outcomes
 */

import { useState, useCallback } from 'react'
import type { FlagNote } from '@fledgely/shared'

export interface FlagNotesPanelProps {
  /** Existing notes on the flag */
  notes: FlagNote[]
  /** Whether the panel is in a loading state */
  isLoading?: boolean
  /** Callback when a new note is submitted */
  onAddNote: (content: string) => Promise<void>
}

const styles = {
  panel: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden' as const,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    cursor: 'pointer',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '20px',
    height: '20px',
    padding: '0 6px',
    borderRadius: '10px',
    backgroundColor: '#8b5cf6',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 500,
  },
  expandIcon: {
    fontSize: '12px',
    color: '#6b7280',
    transition: 'transform 0.2s ease',
  },
  content: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  notesList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  emptyState: {
    padding: '24px',
    textAlign: 'center' as const,
    color: '#6b7280',
    fontSize: '14px',
  },
  noteItem: {
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    borderLeft: '3px solid #8b5cf6',
  },
  noteHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  noteAuthor: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
  },
  noteTimestamp: {
    fontSize: '12px',
    color: '#6b7280',
  },
  noteContent: {
    fontSize: '14px',
    color: '#1f2937',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap' as const,
  },
  addNoteSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '8px',
  },
  textarea: {
    width: '100%',
    minHeight: '80px',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical' as const,
    outline: 'none',
    transition: 'border-color 0.15s ease',
  },
  textareaFocused: {
    borderColor: '#8b5cf6',
    boxShadow: '0 0 0 3px rgba(139, 92, 246, 0.1)',
  },
  addButton: {
    marginTop: '12px',
    padding: '10px 16px',
    backgroundColor: '#8b5cf6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  addButtonDisabled: {
    backgroundColor: '#d1d5db',
    cursor: 'not-allowed',
  },
}

/**
 * Format timestamp to readable date string
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * FlagNotesPanel - Panel for viewing and adding flag notes
 */
export function FlagNotesPanel({ notes, isLoading = false, onAddNote }: FlagNotesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(notes.length > 0)
  const [newNoteContent, setNewNoteContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const handleSubmit = useCallback(async () => {
    const trimmedContent = newNoteContent.trim()
    if (!trimmedContent || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onAddNote(trimmedContent)
      setNewNoteContent('')
    } catch {
      // Error handled by parent
    } finally {
      setIsSubmitting(false)
    }
  }, [newNoteContent, isSubmitting, onAddNote])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Submit on Ctrl/Cmd + Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const canSubmit = newNoteContent.trim().length > 0 && !isSubmitting && !isLoading

  // Sort notes by timestamp, newest first
  const sortedNotes = [...notes].sort((a, b) => b.timestamp - a.timestamp)

  return (
    <div style={styles.panel} data-testid="flag-notes-panel">
      {/* Collapsible Header */}
      <div
        style={styles.header}
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        aria-expanded={isExpanded}
        aria-controls="notes-content"
        data-testid="notes-header"
      >
        <div style={styles.headerTitle}>
          <span role="img" aria-label="Notes">
            📝
          </span>
          <span>Discussion Notes</span>
          {notes.length > 0 && (
            <span style={styles.badge} data-testid="notes-count">
              {notes.length}
            </span>
          )}
        </div>
        <span
          style={{
            ...styles.expandIcon,
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
          aria-hidden="true"
        >
          ▼
        </span>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div style={styles.content} id="notes-content">
          {/* Existing Notes */}
          {sortedNotes.length > 0 ? (
            <div style={styles.notesList} data-testid="notes-list">
              {sortedNotes.map((note) => (
                <div key={note.id} style={styles.noteItem} data-testid="note-item">
                  <div style={styles.noteHeader}>
                    <span style={styles.noteAuthor} data-testid="note-author">
                      {note.authorName}
                    </span>
                    <span style={styles.noteTimestamp} data-testid="note-timestamp">
                      {formatTimestamp(note.timestamp)}
                    </span>
                  </div>
                  <div style={styles.noteContent} data-testid="note-content">
                    {note.content}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.emptyState} data-testid="notes-empty">
              No notes yet. Add a note to track your thoughts or conversation outcomes.
            </div>
          )}

          {/* Add Note Section */}
          <div style={styles.addNoteSection}>
            <label htmlFor="new-note-input" style={styles.label}>
              Add a Note
            </label>
            <textarea
              id="new-note-input"
              style={{
                ...styles.textarea,
                ...(isFocused ? styles.textareaFocused : {}),
              }}
              placeholder="e.g., Discussed with Emma on 12/15, agreed to..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              disabled={isLoading || isSubmitting}
              data-testid="note-input"
            />
            <button
              type="button"
              style={{
                ...styles.addButton,
                ...(canSubmit ? {} : styles.addButtonDisabled),
              }}
              onClick={handleSubmit}
              disabled={!canSubmit}
              data-testid="add-note-button"
            >
              {isSubmitting ? 'Adding...' : 'Add Note'}
            </button>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
              Press Ctrl+Enter to submit
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FlagNotesPanel
