'use client'

/**
 * AILearningIndicator Component - Story 24.2
 *
 * Displays AI learning status in settings page.
 * Shows correction count, learning status, and adapted categories.
 *
 * AC #6: AI learning indicator shown in settings
 */

import type { AILearningStatus, ConcernCategory } from '@fledgely/shared'
import { MINIMUM_CORRECTIONS_THRESHOLD } from '@fledgely/shared'

/**
 * Category display names for user-friendly labels
 */
const CATEGORY_DISPLAY_NAMES: Record<ConcernCategory, string> = {
  Violence: 'Violence',
  'Adult Content': 'Adult Content',
  Bullying: 'Bullying',
  'Self-Harm Indicators': 'Self-Harm',
  'Explicit Language': 'Explicit Language',
  'Unknown Contacts': 'Unknown Contacts',
}

/**
 * Styles for the AI learning indicator
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  icon: {
    fontSize: '1.25rem',
  },
  title: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 500,
    marginLeft: 'auto',
  },
  statusActive: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  statusLearning: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  description: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: '0 0 12px 0',
    lineHeight: 1.5,
  },
  progressContainer: {
    marginBottom: '12px',
  },
  progressBar: {
    height: '6px',
    backgroundColor: '#e5e7eb',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginTop: '4px',
    textAlign: 'right' as const,
  },
  categoriesSection: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #e5e7eb',
  },
  categoriesLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginBottom: '8px',
  },
  categoriesList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
  },
  categoryTag: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  lastUpdated: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    marginTop: '12px',
    textAlign: 'right' as const,
  },
  loadingState: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
    color: '#6b7280',
    fontSize: '0.875rem',
  },
  errorState: {
    padding: '16px',
    color: '#dc2626',
    fontSize: '0.875rem',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
  },
}

export interface AILearningIndicatorProps {
  /** AI learning status from hook */
  status: AILearningStatus
  /** Whether data is loading */
  loading?: boolean
  /** Error message if any */
  error?: string | null
}

/**
 * Format timestamp to relative time
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days} day${days === 1 ? '' : 's'} ago`
  }
  if (hours > 0) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`
  }
  return 'Recently'
}

export function AILearningIndicator({
  status,
  loading = false,
  error = null,
}: AILearningIndicatorProps) {
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>
          <span>Loading AI learning status...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorState}>{error}</div>
      </div>
    )
  }

  const progressPercent = Math.min(
    100,
    (status.correctionCount / MINIMUM_CORRECTIONS_THRESHOLD) * 100
  )

  return (
    <div style={styles.container} data-testid="ai-learning-indicator">
      <div style={styles.header}>
        <span style={styles.icon}>🧠</span>
        <h3 style={styles.title}>AI Learning</h3>
        <span
          style={{
            ...styles.statusBadge,
            ...(status.isActive ? styles.statusActive : styles.statusLearning),
          }}
          data-testid="ai-learning-status"
        >
          {status.isActive ? 'Active' : 'Learning'}
        </span>
      </div>

      <p style={styles.description}>
        {status.isActive
          ? 'Our AI is learning from your corrections to improve accuracy for your family.'
          : `Make ${status.correctionsNeeded} more correction${status.correctionsNeeded === 1 ? '' : 's'} to activate personalized AI learning.`}
      </p>

      {!status.isActive && (
        <div style={styles.progressContainer}>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${progressPercent}%`,
              }}
            />
          </div>
          <div style={styles.progressText}>
            {status.correctionCount} of {MINIMUM_CORRECTIONS_THRESHOLD} corrections
          </div>
        </div>
      )}

      {status.isActive && status.adjustedCategories && status.adjustedCategories.length > 0 && (
        <div style={styles.categoriesSection}>
          <div style={styles.categoriesLabel}>Adjusted categories:</div>
          <div style={styles.categoriesList}>
            {status.adjustedCategories.map((category) => (
              <span key={category} style={styles.categoryTag}>
                {CATEGORY_DISPLAY_NAMES[category]}
              </span>
            ))}
          </div>
        </div>
      )}

      {status.lastAdaptedAt && (
        <div style={styles.lastUpdated}>
          Last updated: {formatRelativeTime(status.lastAdaptedAt)}
        </div>
      )}
    </div>
  )
}
