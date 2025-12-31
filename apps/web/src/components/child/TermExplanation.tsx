/**
 * TermExplanation Component - Story 19C.2
 *
 * Tooltip component that shows simple explanations for terms
 * when child hovers or taps on them.
 *
 * Task 2: Create explanation tooltip component
 */

import React, { useState, useRef, useEffect } from 'react'

/**
 * Inline styles using React.CSSProperties (NOT Tailwind per Epic 19B pattern)
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    display: 'inline',
  },
  trigger: {
    cursor: 'help',
    borderBottom: '1px dashed #0ea5e9',
    color: 'inherit',
  },
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '8px 12px',
    backgroundColor: '#0c4a6e',
    color: '#ffffff',
    borderRadius: '8px',
    fontSize: '12px',
    lineHeight: 1.4,
    maxWidth: '200px',
    textAlign: 'center',
    zIndex: 1000,
    marginBottom: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  },
  tooltipArrow: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    borderLeft: '6px solid transparent',
    borderRight: '6px solid transparent',
    borderTop: '6px solid #0c4a6e',
  },
  // Hidden tooltip for screen readers
  srOnly: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
  },
}

interface TermExplanationProps {
  /** The explanation text to show in tooltip */
  explanation: string
  /** The child content (term text) */
  children: React.ReactNode
  /** Optional additional styles for the trigger */
  triggerStyle?: React.CSSProperties
}

export function TermExplanation({ explanation, children, triggerStyle }: TermExplanationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef<HTMLSpanElement>(null)
  const tooltipId = useRef(`tooltip-${Math.random().toString(36).slice(2)}`).current

  // Handle click outside to close tooltip on touch devices
  useEffect(() => {
    if (!isVisible) return

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsVisible(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isVisible])

  // Handle keyboard for accessibility
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setIsVisible(!isVisible)
    }
    if (event.key === 'Escape') {
      setIsVisible(false)
    }
  }

  return (
    <span ref={containerRef} style={styles.container} data-testid="term-explanation">
      <span
        role="button"
        tabIndex={0}
        aria-describedby={isVisible ? tooltipId : undefined}
        style={{ ...styles.trigger, ...triggerStyle }}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        onKeyDown={handleKeyDown}
        data-testid="term-explanation-trigger"
      >
        {children}
      </span>

      {isVisible && (
        <span
          id={tooltipId}
          role="tooltip"
          style={styles.tooltip}
          data-testid="term-explanation-tooltip"
        >
          {explanation}
          <span style={styles.tooltipArrow} aria-hidden="true" />
        </span>
      )}

      {/* Screen reader only explanation */}
      <span style={styles.srOnly}>{explanation}</span>
    </span>
  )
}
