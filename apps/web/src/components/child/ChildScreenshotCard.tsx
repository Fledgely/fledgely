'use client'

/**
 * ChildScreenshotCard Component - Story 19B.1
 *
 * Individual screenshot card for the child gallery.
 * Uses child-friendly language.
 *
 * Task 4: Create ChildScreenshotCard Component (AC: #3, #5)
 * - 4.1 Create ChildScreenshotCard.tsx for individual screenshots
 * - 4.2 Display thumbnail with overlay on hover/focus
 * - 4.3 Show timestamp in friendly format ("2:30 PM")
 * - 4.4 Show device name and app/URL (truncated)
 * - 4.5 Add click handler to open detail view
 */

import { useState } from 'react'
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
 */
export function ChildScreenshotCard({ screenshot, onClick }: ChildScreenshotCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }

  const displayTitle = screenshot.title || extractDomain(screenshot.url) || 'Screenshot'

  return (
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
      data-testid={`screenshot-card-${screenshot.id}`}
      aria-label={`Screenshot from ${formatTime(screenshot.timestamp)}: ${displayTitle}`}
    >
      <div style={styles.imageContainer}>
        {screenshot.imageUrl && !imageError ? (
          <img
            src={screenshot.imageUrl}
            alt={`Screenshot: ${displayTitle}`}
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
          data-testid="screenshot-overlay"
        >
          <div style={styles.overlayIcon}>🔍</div>
        </div>
      </div>

      <div style={styles.info}>
        <p style={styles.time} data-testid="screenshot-time">
          {formatTime(screenshot.timestamp)}
        </p>
        <p style={styles.details} data-testid="screenshot-details" title={displayTitle}>
          {truncate(displayTitle, 30)}
        </p>
      </div>
    </div>
  )
}
