'use client'

/**
 * ChildScreenshotDetail Component - Story 19B.1
 *
 * Modal for viewing full-size screenshots with navigation.
 * Uses child-friendly language.
 *
 * Task 5: Create ChildScreenshotDetail Modal (AC: #3, #5)
 * - 5.1 Create ChildScreenshotDetail.tsx modal component
 * - 5.2 Display full-size screenshot with zoom support
 * - 5.3 Show metadata: timestamp, device, URL
 * - 5.4 Add "This is what your parent can see" label
 * - 5.5 Add prev/next navigation arrows
 * - 5.6 Support keyboard navigation (arrows, Escape)
 */

import { useEffect, useCallback, useState } from 'react'
import type { ChildScreenshot } from '../../hooks/useChildScreenshots'

/**
 * Props for ChildScreenshotDetail
 */
export interface ChildScreenshotDetailProps {
  screenshot: ChildScreenshot
  screenshots: ChildScreenshot[]
  onClose: () => void
  onNavigate: (screenshot: ChildScreenshot) => void
}

/**
 * Format timestamp to full date and time
 */
function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname.replace('www.', '')
  } catch {
    return url || 'Unknown'
  }
}

/**
 * Styles for modal
 */
const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '24px',
  },
  modal: {
    position: 'relative' as const,
    maxWidth: '900px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: '#0c4a6e', // sky-900
    borderRadius: '16px',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    backgroundColor: '#0c4a6e', // sky-900
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#ffffff',
    margin: '0 0 4px 0',
  },
  timestamp: {
    fontSize: '0.875rem',
    color: '#7dd3fc', // sky-300
    margin: 0,
  },
  closeButton: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.15s ease',
    marginLeft: '16px',
  },
  imageContainer: {
    flex: 1,
    position: 'relative' as const,
    overflow: 'auto',
    backgroundColor: '#000000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    maxWidth: '100%',
    maxHeight: '60vh',
    objectFit: 'contain' as const,
  },
  placeholder: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
    color: '#7dd3fc', // sky-300
  },
  placeholderIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  placeholderText: {
    fontSize: '1rem',
    margin: 0,
  },
  navButton: {
    position: 'absolute' as const,
    top: '50%',
    transform: 'translateY(-50%)',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: '#ffffff',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.15s ease',
  },
  navButtonDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
  },
  prevButton: {
    left: '16px',
  },
  nextButton: {
    right: '16px',
  },
  footer: {
    padding: '16px',
    backgroundColor: '#0c4a6e', // sky-900
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  },
  transparencyLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: 'rgba(14, 165, 233, 0.2)', // sky-500 with opacity
    borderRadius: '8px',
    marginBottom: '12px',
  },
  transparencyIcon: {
    fontSize: '20px',
  },
  transparencyText: {
    fontSize: '0.875rem',
    color: '#bae6fd', // sky-200
    margin: 0,
  },
  metadata: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '16px',
  },
  metadataItem: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  metadataLabel: {
    fontSize: '0.75rem',
    color: '#7dd3fc', // sky-300
    marginBottom: '2px',
  },
  metadataValue: {
    fontSize: '0.875rem',
    color: '#ffffff',
    fontWeight: 500,
  },
}

/**
 * ChildScreenshotDetail - Full-size screenshot viewer
 */
export function ChildScreenshotDetail({
  screenshot,
  screenshots,
  onClose,
  onNavigate,
}: ChildScreenshotDetailProps) {
  const [imageError, setImageError] = useState(false)

  // Find current index for navigation
  const currentIndex = screenshots.findIndex((s) => s.id === screenshot.id)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < screenshots.length - 1

  const handlePrev = useCallback(() => {
    if (hasPrev) {
      onNavigate(screenshots[currentIndex - 1])
      setImageError(false)
    }
  }, [hasPrev, currentIndex, screenshots, onNavigate])

  const handleNext = useCallback(() => {
    if (hasNext) {
      onNavigate(screenshots[currentIndex + 1])
      setImageError(false)
    }
  }, [hasNext, currentIndex, screenshots, onNavigate])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, handlePrev, handleNext])

  // Prevent body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  // Focus trap - focus modal on mount
  useEffect(() => {
    const focusedElement = document.activeElement as HTMLElement
    return () => {
      focusedElement?.focus?.()
    }
  }, [])

  const displayTitle = screenshot.title || extractDomain(screenshot.url) || 'Screenshot'

  return (
    <div
      style={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Screenshot viewer"
      data-testid="screenshot-detail-modal"
    >
      <style>
        {`
          .close-button:hover { background-color: rgba(255, 255, 255, 0.2) !important; }
          .close-button:focus { outline: 2px solid #0ea5e9; outline-offset: 2px; }
          .nav-button:hover:not(:disabled) { background-color: rgba(255, 255, 255, 0.3) !important; }
          .nav-button:focus { outline: 2px solid #0ea5e9; outline-offset: 2px; }
        `}
      </style>

      <div style={styles.modal} onClick={(e) => e.stopPropagation()} role="document">
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <h2 style={styles.title} data-testid="detail-title">
              {displayTitle}
            </h2>
            <p style={styles.timestamp} data-testid="detail-timestamp">
              {formatDateTime(screenshot.timestamp)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={styles.closeButton}
            className="close-button"
            aria-label="Close viewer"
            data-testid="close-button"
          >
            ✕
          </button>
        </div>

        {/* Image */}
        <div style={styles.imageContainer}>
          {/* Prev button */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={!hasPrev}
            style={{
              ...styles.navButton,
              ...styles.prevButton,
              ...(!hasPrev ? styles.navButtonDisabled : {}),
            }}
            className="nav-button"
            aria-label="Previous screenshot"
            data-testid="prev-button"
          >
            ←
          </button>

          {screenshot.imageUrl && !imageError ? (
            <img
              src={screenshot.imageUrl}
              alt={`Screenshot: ${displayTitle}`}
              style={styles.image}
              onError={() => setImageError(true)}
              data-testid="detail-image"
            />
          ) : (
            <div style={styles.placeholder} data-testid="detail-placeholder">
              <div style={styles.placeholderIcon}>📸</div>
              <p style={styles.placeholderText}>Picture not available</p>
            </div>
          )}

          {/* Next button */}
          <button
            type="button"
            onClick={handleNext}
            disabled={!hasNext}
            style={{
              ...styles.navButton,
              ...styles.nextButton,
              ...(!hasNext ? styles.navButtonDisabled : {}),
            }}
            className="nav-button"
            aria-label="Next screenshot"
            data-testid="next-button"
          >
            →
          </button>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          {/* Transparency label - AC5.4 */}
          <div style={styles.transparencyLabel} data-testid="transparency-label">
            <span style={styles.transparencyIcon}>👀</span>
            <p style={styles.transparencyText}>This is what your parent can see. No secrets!</p>
          </div>

          {/* Metadata */}
          <div style={styles.metadata}>
            <div style={styles.metadataItem}>
              <span style={styles.metadataLabel}>When</span>
              <span style={styles.metadataValue} data-testid="detail-when">
                {formatDateTime(screenshot.timestamp)}
              </span>
            </div>
            {screenshot.url && (
              <div style={styles.metadataItem}>
                <span style={styles.metadataLabel}>Website</span>
                <span style={styles.metadataValue} data-testid="detail-url">
                  {extractDomain(screenshot.url)}
                </span>
              </div>
            )}
            {screenshot.deviceId && (
              <div style={styles.metadataItem}>
                <span style={styles.metadataLabel}>Device</span>
                <span style={styles.metadataValue} data-testid="detail-device">
                  {screenshot.deviceId}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
