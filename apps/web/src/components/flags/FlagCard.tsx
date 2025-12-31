'use client'

/**
 * FlagCard Component - Story 22.1
 *
 * Displays a flag summary in the review queue.
 *
 * Acceptance Criteria:
 * - AC2: Each flag shows: thumbnail, category, severity badge, child name, timestamp
 */

import { useState, useEffect } from 'react'
import type { FlagDocument, ConcernCategory, ConcernSeverity } from '@fledgely/shared'

export interface FlagCardProps {
  /** The flag document to display */
  flag: FlagDocument
  /** Child's name for display */
  childName: string
  /** Optional click handler for navigation */
  onClick?: () => void
  /** Whether the card is selected/expanded */
  selected?: boolean
}

/**
 * Category display configuration
 * Maps to ConcernCategory values from shared contracts
 */
const CATEGORY_CONFIG: Record<ConcernCategory, { label: string; color: string; bg: string }> = {
  Violence: { label: 'Violence', color: '#dc2626', bg: '#fef2f2' },
  'Adult Content': { label: 'Adult Content', color: '#c026d3', bg: '#fdf4ff' },
  Bullying: { label: 'Bullying', color: '#ea580c', bg: '#fff7ed' },
  'Self-Harm Indicators': { label: 'Self-Harm', color: '#dc2626', bg: '#fef2f2' },
  'Explicit Language': { label: 'Explicit Language', color: '#ca8a04', bg: '#fefce8' },
  'Unknown Contacts': { label: 'Unknown Contacts', color: '#0891b2', bg: '#ecfeff' },
}

/**
 * Severity badge configuration
 */
const SEVERITY_CONFIG: Record<ConcernSeverity, { label: string; color: string; bg: string }> = {
  high: { label: 'High', color: '#dc2626', bg: '#fef2f2' },
  medium: { label: 'Medium', color: '#ca8a04', bg: '#fefce8' },
  low: { label: 'Low', color: '#16a34a', bg: '#f0fdf4' },
}

/**
 * Format timestamp as relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return days === 1 ? '1 day ago' : `${days} days ago`
  }
  if (hours > 0) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  }
  if (minutes > 0) {
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`
  }
  return 'Just now'
}

/**
 * Hook to get relative time that updates every minute
 */
function useRelativeTime(timestamp: number): string {
  const [relativeTime, setRelativeTime] = useState(() => formatRelativeTime(timestamp))

  useEffect(() => {
    // Update immediately when timestamp changes
    setRelativeTime(formatRelativeTime(timestamp))

    // Update every minute to keep timestamp fresh
    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime(timestamp))
    }, 60000) // 1 minute

    return () => clearInterval(interval)
  }, [timestamp])

  return relativeTime
}

const styles = {
  card: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  cardHover: {
    backgroundColor: '#f9fafb',
    borderColor: '#d1d5db',
  },
  cardSelected: {
    borderColor: '#8b5cf6',
    boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.2)',
  },
  thumbnail: {
    width: '64px',
    height: '48px',
    backgroundColor: '#e5e7eb',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  childName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1f2937',
  },
  timestamp: {
    fontSize: '12px',
    color: '#6b7280',
  },
  badges: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap' as const,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 500,
  },
  reasoning: {
    marginTop: '6px',
    fontSize: '13px',
    color: '#4b5563',
    lineHeight: 1.4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
  },
  confidence: {
    marginTop: '4px',
    fontSize: '11px',
    color: '#9ca3af',
  },
}

/**
 * FlagCard - Displays a flag summary
 */
export function FlagCard({ flag, childName, onClick, selected = false }: FlagCardProps) {
  // Story 24.1: Use corrected category if available
  const displayCategory = (flag.correctedCategory as ConcernCategory) || flag.category
  const wasCorrected = !!flag.correctedCategory
  const categoryConfig = CATEGORY_CONFIG[displayCategory]
  const severityConfig = SEVERITY_CONFIG[flag.severity]
  const relativeTime = useRelativeTime(flag.createdAt)

  return (
    <div
      data-testid={`flag-card-${flag.id}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Flag for ${childName}: ${flag.category}, ${flag.severity} severity`}
      style={{
        ...styles.card,
        ...(selected ? styles.cardSelected : {}),
      }}
    >
      {/* Thumbnail placeholder */}
      <div style={styles.thumbnail} data-testid="flag-thumbnail">
        <span role="img" aria-label="Screenshot">
          🖼️
        </span>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Header: Child name + timestamp */}
        <div style={styles.header}>
          <span style={styles.childName} data-testid="flag-child-name">
            {childName}
          </span>
          <span style={styles.timestamp} data-testid="flag-timestamp">
            {relativeTime}
          </span>
        </div>

        {/* Badges: Category + Severity */}
        <div style={styles.badges}>
          <span
            style={{
              ...styles.badge,
              color: categoryConfig.color,
              backgroundColor: categoryConfig.bg,
            }}
            data-testid="flag-category-badge"
          >
            {categoryConfig.label}
          </span>
          <span
            style={{
              ...styles.badge,
              color: severityConfig.color,
              backgroundColor: severityConfig.bg,
            }}
            data-testid="flag-severity-badge"
          >
            {severityConfig.label}
          </span>
          {/* Story 24.1: Show corrected indicator */}
          {wasCorrected && (
            <span
              style={{
                ...styles.badge,
                color: '#1e40af',
                backgroundColor: '#dbeafe',
              }}
              data-testid="flag-corrected-badge"
              title={`Originally: ${flag.category}`}
            >
              ✓ Corrected
            </span>
          )}
          {flag.throttled && (
            <span
              style={{
                ...styles.badge,
                color: '#6b7280',
                backgroundColor: '#f3f4f6',
              }}
              data-testid="flag-throttled-badge"
            >
              Throttled
            </span>
          )}
        </div>

        {/* AI Reasoning preview */}
        <div style={styles.reasoning} data-testid="flag-reasoning">
          {flag.reasoning}
        </div>

        {/* Confidence */}
        <div style={styles.confidence} data-testid="flag-confidence">
          {flag.confidence}% confidence
        </div>
      </div>
    </div>
  )
}

export default FlagCard
