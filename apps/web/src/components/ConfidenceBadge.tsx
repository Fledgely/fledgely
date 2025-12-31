/**
 * Confidence Badge Component
 *
 * Story 20.3: Confidence Score Assignment - AC5
 *
 * Displays classification confidence score with visual indicator.
 * Shows confidence percentage, level label, and color-coded badge.
 * Includes tooltip explaining what confidence means for parents.
 */

import { useState } from 'react'
import {
  getConfidenceLevel,
  getConfidenceLevelColorClasses,
  type ConfidenceLevel,
} from '../lib/categories'

export interface ConfidenceBadgeProps {
  /** Confidence score (0-100) */
  confidence: number
  /** Whether this was a low-confidence classification (assigned to "Other") */
  isLowConfidence?: boolean
  /** Show confidence level label (High/Medium/Low) */
  showLabel?: boolean
  /** Show tooltip on hover explaining confidence */
  showTooltip?: boolean
  /** Additional CSS class names */
  className?: string
}

const LEVEL_LABELS: Record<ConfidenceLevel, string> = {
  high: 'High',
  moderate: 'Medium',
  low: 'Low',
  uncertain: 'Uncertain',
}

const LEVEL_DESCRIPTIONS: Record<ConfidenceLevel, string> = {
  high: 'The AI is confident about this category.',
  moderate: 'The AI is reasonably sure about this category.',
  low: 'The AI is less certain. You may want to review this.',
  uncertain: 'The AI could not confidently categorize this screenshot.',
}

const styles = {
  container: {
    display: 'inline-flex',
    alignItems: 'center',
    position: 'relative' as const,
    gap: '4px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    padding: '2px 8px',
    borderRadius: '9999px',
    fontWeight: 500,
  },
  percentText: {
    fontWeight: 600,
  },
  labelText: {
    fontWeight: 400,
    marginLeft: '2px',
  },
  tooltip: {
    position: 'absolute' as const,
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: '8px',
    padding: '8px 12px',
    backgroundColor: '#1f2937',
    color: '#f9fafb',
    fontSize: '12px',
    borderRadius: '6px',
    whiteSpace: 'nowrap' as const,
    zIndex: 50,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    maxWidth: '250px',
    textAlign: 'center' as const,
  },
  tooltipArrow: {
    position: 'absolute' as const,
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    borderLeft: '6px solid transparent',
    borderRight: '6px solid transparent',
    borderTop: '6px solid #1f2937',
  },
  infoIcon: {
    width: '14px',
    height: '14px',
    marginLeft: '4px',
    cursor: 'help',
    opacity: 0.7,
  },
}

/**
 * ConfidenceBadge - Displays classification confidence with visual indicator.
 *
 * Story 20.3: Confidence Score Assignment - AC5
 *
 * Features:
 * - Color-coded badge (green/yellow/red/gray) based on confidence level
 * - Displays percentage and optional level label
 * - Tooltip explains confidence levels on hover
 * - Accessible with ARIA attributes
 */
export default function ConfidenceBadge({
  confidence,
  isLowConfidence,
  showLabel = true,
  showTooltip = true,
  className,
}: ConfidenceBadgeProps) {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false)

  const level = getConfidenceLevel(confidence, isLowConfidence)
  const colorClasses = getConfidenceLevelColorClasses(level)
  const levelLabel = LEVEL_LABELS[level]
  const levelDescription = LEVEL_DESCRIPTIONS[level]

  // Build badge style with color classes
  const badgeClasses = `${colorClasses.badge} ${className || ''}`

  // Accessible label for screen readers
  const ariaLabel = `Classification confidence: ${confidence}%. ${levelLabel} confidence. ${levelDescription}`

  return (
    <span
      style={styles.container}
      onMouseEnter={() => showTooltip && setIsTooltipVisible(true)}
      onMouseLeave={() => setIsTooltipVisible(false)}
      onFocus={() => showTooltip && setIsTooltipVisible(true)}
      onBlur={() => setIsTooltipVisible(false)}
    >
      <span
        className={badgeClasses}
        style={styles.badge}
        role="status"
        aria-label={ariaLabel}
        tabIndex={showTooltip ? 0 : undefined}
      >
        <span style={styles.percentText}>{confidence}%</span>
        {showLabel && <span style={styles.labelText}>({levelLabel})</span>}
        {showTooltip && (
          <svg
            style={styles.infoIcon}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
      </span>

      {/* Tooltip */}
      {showTooltip && isTooltipVisible && (
        <span style={styles.tooltip} role="tooltip">
          <strong>{levelLabel} Confidence</strong>
          <br />
          {levelDescription}
          <span style={styles.tooltipArrow} />
        </span>
      )}
    </span>
  )
}

/**
 * Get confidence badge for inline use without tooltip.
 *
 * Story 20.3: Confidence Score Assignment - AC5
 *
 * Simpler version for table cells and compact displays.
 */
export function ConfidenceIndicator({
  confidence,
  isLowConfidence,
}: {
  confidence: number
  isLowConfidence?: boolean
}) {
  return (
    <ConfidenceBadge
      confidence={confidence}
      isLowConfidence={isLowConfidence}
      showLabel={false}
      showTooltip={false}
    />
  )
}
