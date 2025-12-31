'use client'

/**
 * FlagDetailModal Component - Story 22.2
 *
 * Modal for viewing full flag details including screenshot.
 *
 * Acceptance Criteria:
 * - AC1: Full screenshot displayed with flag overlay
 * - AC2: AI reasoning panel explains why flagged
 * - AC3: Category and severity prominently displayed
 * - AC4: Confidence score shown with explanation
 * - AC5: Timestamp and device information visible
 * - AC6: Can close detail view and return to queue
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { getStorage, ref, getDownloadURL } from 'firebase/storage'
import { getFirebaseApp } from '../../lib/firebase'
import { FlagInfoPanel } from './FlagInfoPanel'
import { AIReasoningPanel } from './AIReasoningPanel'
import type { FlagDocument } from '@fledgely/shared'

/**
 * Parse Firebase Storage error to get user-friendly message
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('not-found') || msg.includes('object-not-found')) {
      return 'Screenshot not found'
    }
    if (msg.includes('unauthorized') || msg.includes('permission-denied')) {
      return 'Unable to access screenshot'
    }
    if (msg.includes('network')) {
      return 'Network error - check your connection'
    }
  }
  return 'Screenshot not available'
}

export interface FlagDetailModalProps {
  /** The flag to display */
  flag: FlagDocument
  /** Child's name */
  childName: string
  /** Device name (optional) */
  deviceName?: string
  /** Screenshot storage path (optional, derived from screenshotId if not provided) */
  screenshotPath?: string
  /** Callback when modal is closed */
  onClose: () => void
  /** Callback for taking action on flag (Story 22.3) */
  onAction?: (action: 'dismiss' | 'discuss' | 'escalate') => void
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    maxWidth: '800px',
    maxHeight: '90vh',
    width: '100%',
    overflow: 'hidden' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  closeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#6b7280',
    fontSize: '20px',
    transition: 'background-color 0.15s ease',
  },
  content: {
    padding: '16px',
    overflowY: 'auto' as const,
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  screenshotContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f2937',
    borderRadius: '8px',
    overflow: 'hidden' as const,
    minHeight: '200px',
    maxHeight: '400px',
    position: 'relative' as const,
  },
  screenshot: {
    maxWidth: '100%',
    maxHeight: '400px',
    objectFit: 'contain' as const,
  },
  screenshotPlaceholder: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    color: '#9ca3af',
    fontSize: '14px',
    padding: '32px',
  },
  loadingSpinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e5e7eb',
    borderTopColor: '#8b5cf6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  panels: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  actionButton: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    border: 'none',
  },
  dismissButton: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
  },
  discussButton: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  escalateButton: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
}

/**
 * FlagDetailModal - Modal for viewing flag details
 */
export function FlagDetailModal({
  flag,
  childName,
  deviceName,
  screenshotPath,
  onClose,
  onAction,
}: FlagDetailModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState<string | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Focus management: capture previous focus and focus close button on mount
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement
    // Small delay to ensure modal is rendered
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus()
    }, 0)
    return () => {
      clearTimeout(timer)
      // Restore focus on unmount
      previousFocusRef.current?.focus()
    }
  }, [])

  // Body scroll lock: prevent background scrolling when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    const originalPaddingRight = document.body.style.paddingRight
    // Prevent layout shift from scrollbar removal
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }
    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = originalPaddingRight
    }
  }, [])

  // Fetch screenshot URL from Firebase Storage with cleanup for memory leaks
  useEffect(() => {
    let isMounted = true

    async function fetchScreenshotUrl() {
      if (!screenshotPath && !flag.screenshotId) {
        if (isMounted) {
          setImageLoading(false)
          setImageError('No screenshot available')
        }
        return
      }

      try {
        const storage = getStorage(getFirebaseApp())
        // Use provided path or construct from childId and screenshotId
        const path = screenshotPath || `screenshots/${flag.childId}/${flag.screenshotId}.webp`
        const storageRef = ref(storage, path)
        const url = await getDownloadURL(storageRef)
        if (isMounted) {
          setImageUrl(url)
          setImageLoading(false)
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching screenshot:', error)
        if (isMounted) {
          setImageError(getErrorMessage(error))
          setImageLoading(false)
        }
      }
    }

    fetchScreenshotUrl()

    return () => {
      isMounted = false
    }
  }, [flag.childId, flag.screenshotId, screenshotPath])

  // Handle keyboard navigation with focus trap
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      // Focus trap: keep focus within modal
      if (e.key === 'Tab') {
        const modal = document.querySelector('[data-testid="flag-detail-modal"] [role="document"]')
        if (!modal) return

        const focusableElements = modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusableElements.length === 0) return

        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    },
    [onClose]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Handle backdrop click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      style={styles.overlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="flag-detail-title"
      data-testid="flag-detail-modal"
    >
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .close-button:hover {
            background-color: #f3f4f6;
          }
          .dismiss-button:hover {
            background-color: #e5e7eb;
          }
          .discuss-button:hover {
            background-color: #fde68a;
          }
          .escalate-button:hover {
            background-color: #fecaca;
          }
        `}
      </style>

      <div style={styles.modal} role="document">
        {/* Header */}
        <div style={styles.header}>
          <h2 id="flag-detail-title" style={styles.title}>
            <span role="img" aria-label="Flag">
              🚩
            </span>
            Flag Details
          </h2>
          <button
            ref={closeButtonRef}
            style={styles.closeButton}
            className="close-button"
            onClick={onClose}
            aria-label="Close detail view"
            data-testid="close-button"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Screenshot - AC #1 */}
          <div style={styles.screenshotContainer} data-testid="screenshot-container">
            {imageLoading ? (
              <div style={styles.screenshotPlaceholder} role="status" aria-live="polite">
                <div style={styles.loadingSpinner} aria-hidden="true" />
                <span>Loading screenshot...</span>
              </div>
            ) : imageError || !imageUrl ? (
              <div
                style={styles.screenshotPlaceholder}
                data-testid="screenshot-error"
                role="alert"
                aria-live="assertive"
              >
                <span role="img" aria-label="Error" style={{ fontSize: '32px' }}>
                  ⚠️
                </span>
                <span>{imageError || 'Screenshot not available'}</span>
              </div>
            ) : (
              <img
                src={imageUrl}
                alt={`Screenshot flagged for ${flag.category}`}
                style={styles.screenshot}
                data-testid="screenshot-image"
              />
            )}
          </div>

          {/* Info Panels */}
          <div style={styles.panels}>
            {/* Flag Info - AC #3, #4, #5 */}
            <FlagInfoPanel flag={flag} childName={childName} deviceName={deviceName} />

            {/* AI Reasoning - AC #2 */}
            <AIReasoningPanel reasoning={flag.reasoning} category={flag.category} />
          </div>
        </div>

        {/* Action Buttons (placeholder for Story 22.3) */}
        {onAction && (
          <div style={styles.actions} data-testid="action-buttons">
            <button
              type="button"
              style={{ ...styles.actionButton, ...styles.dismissButton }}
              className="dismiss-button"
              onClick={() => onAction('dismiss')}
              data-testid="action-dismiss"
            >
              Dismiss
            </button>
            <button
              type="button"
              style={{ ...styles.actionButton, ...styles.discussButton }}
              className="discuss-button"
              onClick={() => onAction('discuss')}
              data-testid="action-discuss"
            >
              Note for Discussion
            </button>
            <button
              type="button"
              style={{ ...styles.actionButton, ...styles.escalateButton }}
              className="escalate-button"
              onClick={() => onAction('escalate')}
              data-testid="action-escalate"
            >
              Requires Action
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default FlagDetailModal
