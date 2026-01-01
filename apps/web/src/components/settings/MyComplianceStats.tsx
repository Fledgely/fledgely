'use client'

/**
 * MyComplianceStats Component - Story 32.4
 *
 * Parent self-view of their offline time compliance.
 *
 * Requirements:
 * - AC3: Parent Self-View
 *   - Parents see their own compliance stats
 *   - Shows compliance percentage over time
 *   - Displayed with encouragement, not shame
 * - AC4: Transparency Without Shaming
 *   - Language is factual, not judgmental
 *   - Builds trust through transparency
 */

import { useMemo } from 'react'
import { useParentCompliance } from '../../hooks/useParentCompliance'
import { PARENT_COMPLIANCE_MESSAGES } from '@fledgely/shared'
import { CheckCircleIcon } from '../icons/CheckCircleIcon'

export interface MyComplianceStatsProps {
  /** Family ID */
  familyId: string | null | undefined
  /** Parent UID to show stats for */
  parentUid: string | null | undefined
  /** Number of records to include in stats */
  recordLimit?: number
  /** Loading state override */
  loading?: boolean
}

/**
 * Format a percentage as a display string
 */
function formatPercentage(value: number): string {
  return `${Math.round(value)}%`
}

/**
 * Get encouraging message based on compliance percentage
 * AC4: Uses positive, encouraging language
 */
function getEncouragingMessage(percentage: number): string {
  if (percentage >= 90) {
    return PARENT_COMPLIANCE_MESSAGES.greatJob
  }
  if (percentage >= 70) {
    return 'Good progress! Keep it up.'
  }
  if (percentage >= 50) {
    return PARENT_COMPLIANCE_MESSAGES.encouragement
  }
  return "It's okay - every effort counts!"
}

const styles = {
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    padding: '24px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
  },
  iconContainer: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    backgroundColor: '#ecfdf5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '4px 0 0 0',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '20px',
  },
  statCard: {
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center' as const,
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#22c55e',
    margin: 0,
    lineHeight: 1.2,
  },
  statLabel: {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '4px',
  },
  progressSection: {
    marginBottom: '16px',
  },
  progressLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  progressLabelText: {
    fontSize: '14px',
    color: '#374151',
    fontWeight: 500,
  },
  progressLabelValue: {
    fontSize: '14px',
    color: '#22c55e',
    fontWeight: 600,
  },
  progressBar: {
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: '4px',
    transition: 'width 0.3s ease-out',
  },
  encouragement: {
    textAlign: 'center' as const,
    padding: '16px',
    backgroundColor: '#f0fdf4',
    borderRadius: '12px',
    marginTop: '16px',
  },
  encouragementText: {
    fontSize: '15px',
    fontWeight: 500,
    color: '#166534',
    margin: 0,
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '32px 16px',
  },
  emptyIcon: {
    width: '48px',
    height: '48px',
    margin: '0 auto 12px',
    backgroundColor: '#f3f4f6',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9ca3af',
  },
  emptyText: {
    fontSize: '15px',
    color: '#6b7280',
    margin: 0,
  },
  emptySubtext: {
    fontSize: '13px',
    color: '#9ca3af',
    marginTop: '4px',
  },
  loading: {
    opacity: 0.6,
    pointerEvents: 'none' as const,
  },
}

export function MyComplianceStats({
  familyId,
  parentUid,
  recordLimit = 30,
  loading: loadingOverride,
}: MyComplianceStatsProps) {
  const {
    summary,
    loading: hookLoading,
    error,
  } = useParentCompliance({
    familyId,
    parentUid: parentUid || undefined,
    recordLimit,
    enabled: !!familyId && !!parentUid,
  })

  const loading = loadingOverride ?? hookLoading

  // Calculate display values
  const displayStats = useMemo(() => {
    if (!summary) {
      return {
        percentage: 0,
        compliantWindows: 0,
        totalWindows: 0,
        message: '',
      }
    }

    return {
      percentage: summary.compliancePercentage,
      compliantWindows: summary.compliantWindows,
      totalWindows: summary.totalWindows,
      message: getEncouragingMessage(summary.compliancePercentage),
    }
  }, [summary])

  // Don't render if missing IDs
  if (!familyId || !parentUid) {
    return null
  }

  if (loading) {
    return (
      <div style={{ ...styles.card, ...styles.loading }} data-testid="my-compliance-stats-loading">
        <div style={styles.header}>
          <div style={styles.iconContainer}>
            <CheckCircleIcon size={24} color="#22c55e" />
          </div>
          <div>
            <h2 style={styles.title}>{PARENT_COMPLIANCE_MESSAGES.yourStats}</h2>
            <p style={styles.subtitle}>Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return null
  }

  // Empty state for no records
  if (displayStats.totalWindows === 0) {
    return (
      <div style={styles.card} data-testid="my-compliance-stats-empty">
        <div style={styles.header}>
          <div style={styles.iconContainer}>
            <CheckCircleIcon size={24} color="#22c55e" />
          </div>
          <div>
            <h2 style={styles.title}>{PARENT_COMPLIANCE_MESSAGES.yourStats}</h2>
            <p style={styles.subtitle}>Offline time participation</p>
          </div>
        </div>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>
            <span style={{ fontSize: '24px' }}>📱</span>
          </div>
          <p style={styles.emptyText}>No offline time recorded yet</p>
          <p style={styles.emptySubtext}>Your compliance will appear here after offline time</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.card} data-testid="my-compliance-stats">
      <div style={styles.header}>
        <div style={styles.iconContainer}>
          <CheckCircleIcon size={24} color="#22c55e" />
        </div>
        <div>
          <h2 style={styles.title}>{PARENT_COMPLIANCE_MESSAGES.yourStats}</h2>
          <p style={styles.subtitle}>Offline time participation</p>
        </div>
      </div>

      {/* Stats grid */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <p style={styles.statValue} data-testid="compliance-percentage">
            {formatPercentage(displayStats.percentage)}
          </p>
          <p style={styles.statLabel}>Compliance Rate</p>
        </div>
        <div style={styles.statCard}>
          <p style={{ ...styles.statValue, fontSize: '28px' }} data-testid="window-count">
            {displayStats.compliantWindows}/{displayStats.totalWindows}
          </p>
          <p style={styles.statLabel}>Offline Windows</p>
        </div>
      </div>

      {/* Progress bar */}
      <div style={styles.progressSection}>
        <div style={styles.progressLabel}>
          <span style={styles.progressLabelText}>Progress</span>
          <span style={styles.progressLabelValue} data-testid="progress-value">
            {formatPercentage(displayStats.percentage)}
          </span>
        </div>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: `${displayStats.percentage}%`,
            }}
            data-testid="progress-bar"
            role="progressbar"
            aria-valuenow={displayStats.percentage}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* Encouraging message - AC4 */}
      <div style={styles.encouragement}>
        <p style={styles.encouragementText} data-testid="encouragement-message">
          {displayStats.message}
        </p>
      </div>
    </div>
  )
}

export default MyComplianceStats
