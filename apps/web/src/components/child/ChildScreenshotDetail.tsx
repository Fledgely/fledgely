'use client'

/**
 * ChildScreenshotDetail Component - Story 19B.1 & 19B.3
 *
 * Modal for viewing full-size screenshots with navigation.
 * Uses child-friendly language.
 *
 * Story 19B.1 - Original implementation:
 * - Full-size screenshot display
 * - Metadata: timestamp, device, URL
 * - Transparency label
 * - Prev/next navigation with keyboard support
 *
 * Story 19B.3 - Enhanced with mobile gestures:
 * - Pinch-to-zoom support (AC: #5)
 * - Swipe-to-dismiss gesture (AC: #6)
 * - Double-tap to reset zoom
 * - Pan support when zoomed in
 */

import { useEffect, useCallback, useState, useRef } from 'react'
import type { ChildScreenshot } from '../../hooks/useChildScreenshots'

/**
 * Touch gesture configuration
 */
const GESTURE_CONFIG = {
  MIN_ZOOM: 1,
  MAX_ZOOM: 4,
  SWIPE_THRESHOLD: 100, // pixels to trigger dismiss
  VELOCITY_THRESHOLD: 0.5, // pixels per ms for quick swipe
  DOUBLE_TAP_DELAY: 300, // ms
}

/**
 * Touch state for gesture handling
 */
interface TouchState {
  scale: number
  translateX: number
  translateY: number
  lastDistance: number | null
  isDragging: boolean
  startY: number
  currentY: number
  dragStartTime: number
  lastTapTime: number
  pinchCenter: { x: number; y: number } | null
}

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
 * Touch point with client coordinates (compatible with both React.Touch and Touch)
 */
interface TouchPoint {
  clientX: number
  clientY: number
}

/**
 * Calculate distance between two touch points
 */
function getDistance(touch1: TouchPoint, touch2: TouchPoint): number {
  const dx = touch1.clientX - touch2.clientX
  const dy = touch1.clientY - touch2.clientY
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Calculate center point between two touches
 */
function getPinchCenter(touch1: TouchPoint, touch2: TouchPoint): { x: number; y: number } {
  return {
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2,
  }
}

/**
 * Initial touch state
 */
const initialTouchState: TouchState = {
  scale: 1,
  translateX: 0,
  translateY: 0,
  lastDistance: null,
  isDragging: false,
  startY: 0,
  currentY: 0,
  dragStartTime: 0,
  lastTapTime: 0,
  pinchCenter: null,
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
  zoomableImage: {
    maxWidth: '100%',
    maxHeight: '60vh',
    objectFit: 'contain' as const,
    touchAction: 'none',
    userSelect: 'none' as const,
    WebkitUserSelect: 'none' as const,
    cursor: 'grab',
  },
  zoomControls: {
    position: 'absolute' as const,
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: '8px 12px',
    borderRadius: '24px',
  },
  zoomButton: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: '#ffffff',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomLabel: {
    fontSize: '0.75rem',
    color: '#bae6fd',
    display: 'flex',
    alignItems: 'center',
    padding: '0 8px',
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
  const [touchState, setTouchState] = useState<TouchState>(initialTouchState)
  const [isDismissing, setIsDismissing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Find current index for navigation
  const currentIndex = screenshots.findIndex((s) => s.id === screenshot.id)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < screenshots.length - 1

  // Reset touch state when navigating to new screenshot
  useEffect(() => {
    setTouchState(initialTouchState)
  }, [screenshot.id])

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

  // Handle touch start for pinch/pan/swipe gestures
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const now = Date.now()

      // Handle double tap to reset zoom
      if (e.touches.length === 1) {
        if (now - touchState.lastTapTime < GESTURE_CONFIG.DOUBLE_TAP_DELAY) {
          // Double tap detected - reset zoom
          setTouchState((prev) => ({
            ...prev,
            scale: 1,
            translateX: 0,
            translateY: 0,
            lastTapTime: 0,
          }))
          return
        }

        const touch = e.touches[0]
        setTouchState((prev) => ({
          ...prev,
          isDragging: true,
          startY: touch.clientY,
          currentY: touch.clientY,
          dragStartTime: now,
          lastTapTime: now,
        }))
      }

      // Handle pinch start
      if (e.touches.length === 2) {
        const distance = getDistance(e.touches[0], e.touches[1])
        const center = getPinchCenter(e.touches[0], e.touches[1])
        setTouchState((prev) => ({
          ...prev,
          lastDistance: distance,
          pinchCenter: center,
          isDragging: false,
        }))
      }
    },
    [touchState.lastTapTime]
  )

  // Handle touch move for pinch zoom and swipe/pan
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      // Handle pinch zoom
      if (e.touches.length === 2 && touchState.lastDistance !== null) {
        const newDistance = getDistance(e.touches[0], e.touches[1])
        const scaleDelta = newDistance / touchState.lastDistance
        const newScale = Math.min(
          GESTURE_CONFIG.MAX_ZOOM,
          Math.max(GESTURE_CONFIG.MIN_ZOOM, touchState.scale * scaleDelta)
        )

        setTouchState((prev) => ({
          ...prev,
          scale: newScale,
          lastDistance: newDistance,
        }))
        return
      }

      // Handle pan when zoomed or swipe to dismiss when not zoomed
      if (e.touches.length === 1 && touchState.isDragging) {
        const touch = e.touches[0]
        const deltaY = touch.clientY - touchState.startY

        if (touchState.scale > 1) {
          // Pan mode when zoomed in - track movement relative to last position
          setTouchState((prev) => ({
            ...prev,
            translateX:
              prev.translateX + (touch.clientX - (prev.pinchCenter?.x || touch.clientX)) * 0.3,
            translateY: prev.translateY + deltaY * 0.3,
            startY: touch.clientY,
            pinchCenter: { x: touch.clientX, y: touch.clientY }, // Update pinch center to track movement
          }))
        } else {
          // Swipe to dismiss mode when not zoomed
          setTouchState((prev) => ({
            ...prev,
            currentY: touch.clientY,
          }))
        }
      }
    },
    [
      touchState.lastDistance,
      touchState.scale,
      touchState.isDragging,
      touchState.startY,
      touchState.pinchCenter,
    ]
  )

  // Handle touch end for swipe dismiss detection
  const handleTouchEnd = useCallback(() => {
    const deltaY = touchState.currentY - touchState.startY
    const duration = Date.now() - touchState.dragStartTime
    const velocity = Math.abs(deltaY) / duration

    // Check for swipe dismiss (only when not zoomed)
    if (
      touchState.scale <= 1 &&
      deltaY > GESTURE_CONFIG.SWIPE_THRESHOLD &&
      velocity > GESTURE_CONFIG.VELOCITY_THRESHOLD
    ) {
      setIsDismissing(true)
      setTimeout(() => {
        onClose()
      }, 200)
      return
    }

    // Reset dragging state
    setTouchState((prev) => ({
      ...prev,
      isDragging: false,
      lastDistance: null,
      pinchCenter: null,
    }))
  }, [touchState.currentY, touchState.startY, touchState.dragStartTime, touchState.scale, onClose])

  // Zoom control handlers for non-touch users
  const handleZoomIn = useCallback(() => {
    setTouchState((prev) => ({
      ...prev,
      scale: Math.min(GESTURE_CONFIG.MAX_ZOOM, prev.scale + 0.5),
    }))
  }, [])

  const handleZoomOut = useCallback(() => {
    setTouchState((prev) => ({
      ...prev,
      scale: Math.max(GESTURE_CONFIG.MIN_ZOOM, prev.scale - 0.5),
      translateX: prev.scale - 0.5 <= 1 ? 0 : prev.translateX,
      translateY: prev.scale - 0.5 <= 1 ? 0 : prev.translateY,
    }))
  }, [])

  const handleResetZoom = useCallback(() => {
    setTouchState(initialTouchState)
  }, [])

  // Keyboard navigation and zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn()
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut()
      } else if (e.key === '0') {
        handleResetZoom()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, handlePrev, handleNext, handleZoomIn, handleZoomOut, handleResetZoom])

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
          .zoom-button:hover:not(:disabled) { background-color: rgba(255, 255, 255, 0.3) !important; }
          .zoom-button:focus { outline: 2px solid #0ea5e9; outline-offset: 2px; }
          .zoom-button:focus:not(:focus-visible) { outline: none; }
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

        {/* Image container with touch gestures */}
        <div
          ref={containerRef}
          style={{
            ...styles.imageContainer,
            ...(isDismissing
              ? {
                  opacity: 0,
                  transform: 'translateY(100px)',
                  transition: 'opacity 0.2s ease, transform 0.2s ease',
                }
              : touchState.scale <= 1 && touchState.isDragging
                ? {
                    transform: `translateY(${touchState.currentY - touchState.startY}px)`,
                    opacity: Math.max(
                      0.5,
                      1 - Math.abs(touchState.currentY - touchState.startY) / 300
                    ),
                  }
                : {}),
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          data-testid="image-container"
        >
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
              style={{
                ...styles.zoomableImage,
                transform: `scale(${touchState.scale}) translate(${touchState.translateX / touchState.scale}px, ${touchState.translateY / touchState.scale}px)`,
                transition: touchState.isDragging ? 'none' : 'transform 0.2s ease',
                cursor: touchState.scale > 1 ? 'grab' : 'default',
              }}
              onError={() => setImageError(true)}
              draggable={false}
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

          {/* Zoom controls for non-touch users */}
          {screenshot.imageUrl && !imageError && (
            <div style={styles.zoomControls} data-testid="zoom-controls">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={touchState.scale <= GESTURE_CONFIG.MIN_ZOOM}
                style={{
                  ...styles.zoomButton,
                  ...(touchState.scale <= GESTURE_CONFIG.MIN_ZOOM ? { opacity: 0.3 } : {}),
                }}
                className="zoom-button"
                aria-label="Zoom out"
                data-testid="zoom-out-button"
              >
                −
              </button>
              <span style={styles.zoomLabel} data-testid="zoom-level">
                {Math.round(touchState.scale * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={touchState.scale >= GESTURE_CONFIG.MAX_ZOOM}
                style={{
                  ...styles.zoomButton,
                  ...(touchState.scale >= GESTURE_CONFIG.MAX_ZOOM ? { opacity: 0.3 } : {}),
                }}
                className="zoom-button"
                aria-label="Zoom in"
                data-testid="zoom-in-button"
              >
                +
              </button>
              {touchState.scale > 1 && (
                <button
                  type="button"
                  onClick={handleResetZoom}
                  style={styles.zoomButton}
                  className="zoom-button"
                  aria-label="Reset zoom"
                  data-testid="reset-zoom-button"
                >
                  ↺
                </button>
              )}
            </div>
          )}
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
