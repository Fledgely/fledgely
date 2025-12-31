'use client'

/**
 * ChildScreenshotCard Component - Story 19B.1 & Story 28.3
 *
 * Individual screenshot card for the child gallery.
 * Uses child-friendly language.
 *
 * Story 19B.1 - Original implementation:
 * - 4.1 Create ChildScreenshotCard.tsx for individual screenshots
 * - 4.2 Display thumbnail with overlay on hover/focus
 * - 4.3 Show timestamp in friendly format ("2:30 PM")
 * - 4.4 Show device name and app/URL (truncated)
 * - 4.5 Add click handler to open detail view
 *
 * Story 28.3 - Screen Reader Integration:
 * - AC1: Use accessibility description as alt-text
 * - AC3: Semantic HTML structure
 * - AC4: "Read full description" button
 * - AC5: Keyboard navigation support
 */

import { useState, useCallback } from 'react'
import type { ChildScreenshot } from '../../hooks/useChildScreenshots'

/**
 * Props for ChildScreenshotCard
 */
export interface ChildScreenshotCardProps {
  screenshot: ChildScreenshot
  onClick: () => void
}

/**
 * Format timestamp to friendly time ("2:30 PM")
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Truncate text with ellipsis
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname.replace('www.', '')
  } catch {
    return url
  }
}

/**
 * Get the best available alt-text for the screenshot.
 * Story 28.3: Screen Reader Integration - AC1
 *
 * Priority:
 * 1. AI-generated accessibility description (if completed)
 * 2. Fallback: "Screenshot: {title}" or "Screenshot from {time}"
 */
function getScreenshotAltText(screenshot: ChildScreenshot): string {
  // Use AI-generated description if available and completed
  if (
    screenshot.accessibilityDescription?.status === 'completed' &&
    screenshot.accessibilityDescription.description
  ) {
    return screenshot.accessibilityDescription.description
  }

  // Fallback to title or generic description
  const displayTitle = screenshot.title || extractDomain(screenshot.url) || 'Screenshot'
  return `Screenshot: ${displayTitle}`
}

/**
 * Check if we have a full description available for reading.
 * Story 28.3: Screen Reader Integration - AC4
 */
function hasFullDescription(screenshot: ChildScreenshot): boolean {
  return (
    screenshot.accessibilityDescription?.status === 'completed' &&
    !!screenshot.accessibilityDescription.description &&
    (screenshot.accessibilityDescription.wordCount ?? 0) > 20
  )
}

/**
 * Styles using sky blue theme
 */
const styles: Record<string, React.CSSProperties> = {
  card: {
    position: 'relative' as const,
    borderRadius: '12px',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    border: '2px solid #bae6fd', // sky-200
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  // Story 28.3: Screen reader only styles - visually hidden but accessible
  srOnly: {
    position: 'absolute' as const,
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap' as const,
    border: 0,
  },
  cardHover: {
    borderColor: '#0ea5e9', // sky-500
    boxShadow: '0 4px 12px rgba(14, 165, 233, 0.2)',
    transform: 'translateY(-2px)',
  },
  imageContainer: {
    position: 'relative' as const,
    width: '100%',
    paddingTop: '75%', // 4:3 aspect ratio
    backgroundColor: '#f0f9ff', // sky-50
  },
  image: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  placeholder: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    backgroundColor: '#e0f2fe', // sky-100
    color: '#0369a1', // sky-700
  },
  overlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.15s ease',
  },
  overlayVisible: {
    opacity: 1,
  },
  overlayIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  info: {
    padding: '12px',
  },
  time: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#0c4a6e', // sky-900
    margin: '0 0 4px 0',
  },
  details: {
    fontSize: '0.75rem',
    color: '#0369a1', // sky-700
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
}

/**
 * ChildScreenshotCard - Individual screenshot in gallery
 * Story 28.3: Enhanced with screen reader support
 */
export function ChildScreenshotCard({ screenshot, onClick }: ChildScreenshotCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isDescriptionAnnounced, setIsDescriptionAnnounced] = useState(false)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }

  const displayTitle = screenshot.title || extractDomain(screenshot.url) || 'Screenshot'

  // Story 28.3: Get proper alt-text using AI description when available
  const altText = getScreenshotAltText(screenshot)
  const showDescriptionButton = hasFullDescription(screenshot)

  // Story 28.3 AC4: Handle "Read full description" button click
  const handleReadDescription = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    // Toggle announcement state for screen readers
    setIsDescriptionAnnounced((prev) => !prev)
  }, [])

  const handleDescriptionKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleReadDescription(e)
      }
    },
    [handleReadDescription]
  )

  return (
    // Story 28.3 AC3: Use article element for semantic structure
    <article
      data-testid={`screenshot-card-${screenshot.id}`}
      style={{ position: 'relative' as const }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
        style={{
          ...styles.card,
          ...(isHovered ? styles.cardHover : {}),
        }}
        aria-label={`Screenshot from ${formatTime(screenshot.timestamp)}: ${displayTitle}. ${showDescriptionButton ? 'Press Tab for full description.' : ''}`}
      >
        <div style={styles.imageContainer}>
          {screenshot.imageUrl && !imageError ? (
            <img
              src={screenshot.imageUrl}
              alt={altText}
              style={styles.image}
              loading="lazy"
              onError={() => setImageError(true)}
            />
          ) : (
            <div style={styles.placeholder} data-testid="screenshot-placeholder">
              📸
            </div>
          )}

          {/* Hover overlay */}
          <div
            style={{
              ...styles.overlay,
              ...(isHovered ? styles.overlayVisible : {}),
            }}
            aria-hidden="true"
            data-testid="screenshot-overlay"
          >
            <div style={styles.overlayIcon}>🔍</div>
          </div>
        </div>

        <div style={styles.info} aria-hidden="true">
          <p style={styles.time} data-testid="screenshot-time">
            {formatTime(screenshot.timestamp)}
          </p>
          <p style={styles.details} data-testid="screenshot-details" title={displayTitle}>
            {truncate(displayTitle, 30)}
          </p>
        </div>
      </div>

      {/* Story 28.3 AC4: Screen reader only "Read full description" button */}
      {showDescriptionButton && (
        <button
          type="button"
          style={styles.srOnly}
          onClick={handleReadDescription}
          onKeyDown={handleDescriptionKeyDown}
          aria-expanded={isDescriptionAnnounced}
          aria-controls={`description-${screenshot.id}`}
          data-testid="read-description-button"
        >
          Read full description
        </button>
      )}

      {/* Story 28.3 AC2: Screen reader accessible full description */}
      {showDescriptionButton && (
        <div
          id={`description-${screenshot.id}`}
          style={styles.srOnly}
          role="region"
          aria-label="Full screenshot description"
          aria-live={isDescriptionAnnounced ? 'polite' : 'off'}
          data-testid="full-description"
        >
          {isDescriptionAnnounced && screenshot.accessibilityDescription?.description}
        </div>
      )}
    </article>
  )
}
