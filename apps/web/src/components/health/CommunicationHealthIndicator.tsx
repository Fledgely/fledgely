/**
 * CommunicationHealthIndicator Component - Story 34.5.5 Task 1
 *
 * Displays communication health status between parent and child.
 * AC1: Health Indicator Display
 * AC3: Actionable Suggestion
 * AC4: Parent Pattern Awareness
 * AC5: Child Transparency
 *
 * CRITICAL SAFETY:
 * - Neutral, non-blaming language
 * - Same view for both parent and child (bilateral transparency)
 * - Empowers children by surfacing communication patterns
 */

import { memo } from 'react'
import { useCommunicationMetrics } from '../../hooks/useCommunicationMetrics'

// ============================================
// Types
// ============================================

export interface CommunicationHealthIndicatorProps {
  /** Child ID for metrics lookup */
  childId: string
  /** Family ID for context */
  familyId: string
  /** Child's name for display */
  childName: string
  /** Whether this is child's view (affects language) */
  isChild?: boolean
}

// ============================================
// Styles
// ============================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  badgeHealthy: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    borderRadius: '9999px',
    fontSize: '13px',
    fontWeight: 500,
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  badgeAttention: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    borderRadius: '9999px',
    fontSize: '13px',
    fontWeight: 500,
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  suggestion: {
    fontSize: '13px',
    color: '#6b7280',
    margin: 0,
    lineHeight: 1.5,
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#9ca3af',
    fontSize: '13px',
  },
  noData: {
    fontSize: '13px',
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  error: {
    fontSize: '13px',
    color: '#dc2626',
  },
  icon: {
    fontSize: '16px',
  },
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get health status label based on trend.
 */
function getHealthStatus(
  trend: 'improving' | 'stable' | 'needs-attention'
): 'healthy' | 'attention' {
  return trend === 'needs-attention' ? 'attention' : 'healthy'
}

/**
 * Get display text for health status.
 */
function getHealthStatusText(status: 'healthy' | 'attention'): string {
  return status === 'healthy' ? 'Healthy' : 'Needs attention'
}

/**
 * Sanitize child name for display, providing fallback if empty.
 */
function sanitizeChildName(childName: string): string {
  const trimmed = childName.trim()
  return trimmed.length > 0 ? trimmed : 'Your child'
}

/**
 * Get suggestion text based on metrics and viewer type.
 */
function getSuggestionText(
  totalProposals: number,
  childName: string,
  isChild: boolean,
  status: 'healthy' | 'attention'
): string | null {
  if (totalProposals === 0) {
    return null
  }

  if (isChild) {
    // Child-friendly language
    if (status === 'attention') {
      return `You've made ${totalProposals} request${totalProposals === 1 ? '' : 's'} - consider having a conversation with your parent about what you need.`
    }
    return `You've made ${totalProposals} request${totalProposals === 1 ? '' : 's'} - your communication is going well!`
  }

  // Parent-oriented language with sanitized child name
  const displayName = sanitizeChildName(childName)
  if (status === 'attention') {
    return `${displayName} has made ${totalProposals} request${totalProposals === 1 ? '' : 's'} - consider discussing what they need.`
  }
  return `${displayName} has made ${totalProposals} request${totalProposals === 1 ? '' : 's'} - communication is going well!`
}

// ============================================
// Component
// ============================================

export const CommunicationHealthIndicator = memo(function CommunicationHealthIndicator({
  childId,
  familyId,
  childName,
  isChild = false,
}: CommunicationHealthIndicatorProps) {
  // Hook must be called unconditionally (React hooks rules)
  const { metrics, loading, error } = useCommunicationMetrics(familyId, childId)

  // Validate required props - return null for invalid IDs
  if (!childId || childId.trim().length === 0) {
    return null
  }

  if (!familyId || familyId.trim().length === 0) {
    return null
  }

  // Loading state
  if (loading) {
    return (
      <div
        data-testid="communication-health-indicator"
        style={styles.container}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label="Loading communication health"
      >
        <div data-testid="loading-indicator" style={styles.loading}>
          <span style={styles.icon}>...</span>
          <span>Loading communication health...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div
        data-testid="communication-health-indicator"
        style={styles.container}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label="Error loading communication health"
      >
        <div data-testid="error-message" style={styles.error}>
          Unable to load communication health
        </div>
      </div>
    )
  }

  // No data state
  if (!metrics) {
    return (
      <div
        data-testid="communication-health-indicator"
        style={styles.container}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label="No communication data available"
      >
        <div style={styles.header}>
          <h3 style={styles.title}>
            <span style={styles.icon}>💬</span>
            Communication Health
          </h3>
        </div>
        <p data-testid="no-data-message" style={styles.noData}>
          No communication history yet
        </p>
      </div>
    )
  }

  const status = getHealthStatus(metrics.trend)
  const statusText = getHealthStatusText(status)
  const suggestion = getSuggestionText(metrics.totalProposals, childName, isChild, status)

  const badgeStyle = status === 'healthy' ? styles.badgeHealthy : styles.badgeAttention
  const badgeClassName = status === 'healthy' ? 'healthy' : 'attention'
  const statusIcon = status === 'healthy' ? '✓' : '!'

  return (
    <div
      data-testid="communication-health-indicator"
      style={styles.container}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Communication health: ${statusText}`}
    >
      <div style={styles.header}>
        <h3 style={styles.title}>
          <span style={styles.icon}>💬</span>
          Communication Health
        </h3>
        <div data-testid="health-badge" className={badgeClassName} style={badgeStyle}>
          <span>{statusIcon}</span>
          <span data-testid="health-status">{statusText}</span>
        </div>
      </div>

      {suggestion && (
        <p data-testid="suggestion-text" style={styles.suggestion}>
          {suggestion}
        </p>
      )}
    </div>
  )
})
