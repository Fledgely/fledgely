/**
 * ResolutionMarkerModal Component
 *
 * Story 27.5.6: Resolution Markers
 *
 * Modal for adding resolution markers to track family communication progress.
 * - AC1: Resolution markers available
 * - AC2: Either party can add
 * - AC5: Celebrate repair
 */

'use client'

import { useState } from 'react'
import { RESOLUTION_MARKER_LABELS, type ResolutionMarkerType } from '@fledgely/shared'

interface ResolutionMarkerModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (markerType: ResolutionMarkerType, note?: string) => Promise<{ message: string } | null>
}

export function ResolutionMarkerModal({ isOpen, onClose, onSubmit }: ResolutionMarkerModalProps) {
  const [selectedType, setSelectedType] = useState<ResolutionMarkerType | null>(null)
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!selectedType) return

    setIsSubmitting(true)
    const result = await onSubmit(selectedType, note.trim() || undefined)
    setIsSubmitting(false)

    if (result) {
      setSuccessMessage(result.message)
      // Show success for 2 seconds, then close
      setTimeout(() => {
        setSelectedType(null)
        setNote('')
        setSuccessMessage(null)
        onClose()
      }, 2000)
    }
  }

  const handleClose = () => {
    setSelectedType(null)
    setNote('')
    setSuccessMessage(null)
    onClose()
  }

  const markerTypes = Object.keys(RESOLUTION_MARKER_LABELS) as ResolutionMarkerType[]

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {successMessage ? (
          // Success state
          <div style={styles.successContainer}>
            <div style={styles.successIcon}>🎉</div>
            <h3 style={styles.successTitle}>Resolution Added!</h3>
            <p style={styles.successMessage}>{successMessage}</p>
          </div>
        ) : (
          // Form state
          <>
            <div style={styles.header}>
              <h2 style={styles.title}>Add Resolution Marker</h2>
              <button onClick={handleClose} style={styles.closeButton}>
                ✕
              </button>
            </div>

            <p style={styles.description}>
              Track your family&apos;s communication progress. Adding a resolution shows you&apos;re
              working together.
            </p>

            <div style={styles.options}>
              {markerTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  style={{
                    ...styles.option,
                    ...(selectedType === type ? styles.optionSelected : {}),
                  }}
                >
                  <span style={styles.optionIcon}>{getMarkerIcon(type)}</span>
                  <span style={styles.optionLabel}>{RESOLUTION_MARKER_LABELS[type]}</span>
                </button>
              ))}
            </div>

            <div style={styles.noteSection}>
              <label style={styles.noteLabel}>Optional note</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add any thoughts about this resolution..."
                style={styles.noteInput}
                maxLength={500}
              />
            </div>

            <div style={styles.actions}>
              <button onClick={handleClose} style={styles.cancelButton} disabled={isSubmitting}>
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                style={{
                  ...styles.submitButton,
                  ...(selectedType ? {} : styles.submitButtonDisabled),
                }}
                disabled={!selectedType || isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Resolution'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function getMarkerIcon(type: ResolutionMarkerType): string {
  switch (type) {
    case 'talked_through':
      return '💬'
    case 'parent_apologized':
      return '🤝'
    case 'child_understood':
      return '💡'
    case 'in_progress':
      return '⏳'
    default:
      return '✓'
  }
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    maxWidth: '480px',
    width: '90%',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600,
    color: '#1a1a2e',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    color: '#666',
    cursor: 'pointer',
    padding: '4px',
  },
  description: {
    margin: '0 0 20px 0',
    fontSize: '14px',
    color: '#666',
    lineHeight: 1.5,
  },
  options: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '20px',
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    backgroundColor: '#f8f9fa',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'left',
  },
  optionSelected: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4caf50',
  },
  optionIcon: {
    fontSize: '20px',
  },
  optionLabel: {
    fontSize: '15px',
    fontWeight: 500,
    color: '#333',
  },
  noteSection: {
    marginBottom: '20px',
  },
  noteLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#555',
    marginBottom: '8px',
  },
  noteInput: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    minHeight: '80px',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#f5f5f5',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#666',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '10px 20px',
    backgroundColor: '#4caf50',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    cursor: 'pointer',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  },
  successContainer: {
    textAlign: 'center',
    padding: '20px',
  },
  successIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  successTitle: {
    margin: '0 0 8px 0',
    fontSize: '24px',
    fontWeight: 600,
    color: '#4caf50',
  },
  successMessage: {
    margin: 0,
    fontSize: '16px',
    color: '#666',
  },
}
