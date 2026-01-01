'use client'

/**
 * ParentComplianceCard Component - Story 32.4
 *
 * Child-facing display for parent compliance during offline time.
 *
 * Requirements:
 * - AC2: Child can see parent compliance
 * - AC4: Transparency without shaming
 *   - Language is factual, not judgmental
 *   - Focuses on shared accountability
 *   - Builds trust through transparency
 */

import { useMemo } from 'react'
import { useParentComplianceByParent } from '../../hooks/useParentCompliance'
import { PARENT_COMPLIANCE_MESSAGES } from '@fledgely/shared'
import type { ParentComplianceRecord } from '@fledgely/shared'
import { UsersIcon } from '../icons/UsersIcon'

export interface ParentComplianceCardProps {
  /** Family ID to show compliance for */
  familyId: string | null | undefined
  /** Number of recent records to show */
  recordLimit?: number
  /** Loading state override */
  loading?: boolean
}

/**
 * Format timestamp for child-friendly display
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  // Check if it's today
  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  }

  // Check if it's yesterday
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  }

  // Return day of week for recent days
  const dayDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (dayDiff < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' })
  }

  // Return short date for older
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Get display message for a record (AC4: non-shaming language)
 */
function getRecordMessage(record: ParentComplianceRecord): string {
  const name = record.parentDisplayName || 'Parent'
  if (record.wasCompliant) {
    return PARENT_COMPLIANCE_MESSAGES.compliant(name)
  }
  return PARENT_COMPLIANCE_MESSAGES.nonCompliant(name)
}

const styles = {
  card: {
    background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
    borderRadius: '16px',
    border: '1px solid #bbf7d0',
    padding: '20px',
    marginBottom: '16px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  iconContainer: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: '#22c55e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#166534',
    margin: 0,
  },
  message: {
    fontSize: '16px',
    fontWeight: 500,
    color: '#22c55e',
    margin: '0 0 16px 0',
    lineHeight: 1.4,
  },
  recordList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  recordItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    marginBottom: '8px',
    borderRadius: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  recordItemCompliant: {
    borderLeft: '3px solid #22c55e',
  },
  recordItemNonCompliant: {
    borderLeft: '3px solid #f59e0b',
  },
  recordText: {
    fontSize: '14px',
    color: '#374151',
    margin: 0,
    flex: 1,
  },
  recordDate: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  emptyState: {
    fontSize: '14px',
    color: '#6b7280',
    textAlign: 'center' as const,
    padding: '16px 0',
  },
  encouragement: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#15803d',
    textAlign: 'center' as const,
    marginTop: '12px',
    padding: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: '8px',
  },
  loading: {
    opacity: 0.6,
  },
}

export function ParentComplianceCard({
  familyId,
  recordLimit = 5,
  loading: loadingOverride,
}: ParentComplianceCardProps) {
  const {
    byParent,
    loading: hookLoading,
    error,
  } = useParentComplianceByParent({
    familyId,
    recordLimit: recordLimit * 3, // Get more to show recent per parent
    enabled: !!familyId,
  })

  const loading = loadingOverride ?? hookLoading

  // Get recent records across all parents
  const recentRecords = useMemo(() => {
    const allRecords: ParentComplianceRecord[] = []
    for (const parent of byParent) {
      allRecords.push(...parent.records)
    }
    // Sort by date and take most recent
    return allRecords.sort((a, b) => b.createdAt - a.createdAt).slice(0, recordLimit)
  }, [byParent, recordLimit])

  // Calculate if everyone was compliant recently
  const recentlyAllCompliant = useMemo(() => {
    if (recentRecords.length === 0) return false
    return recentRecords.every((r) => r.wasCompliant)
  }, [recentRecords])

  // Don't render if no familyId
  if (!familyId) {
    return null
  }

  if (loading) {
    return (
      <div style={{ ...styles.card, ...styles.loading }} data-testid="parent-compliance-loading">
        <div style={styles.header}>
          <div style={styles.iconContainer}>
            <UsersIcon size={28} color="#ffffff" strokeWidth={2.5} />
          </div>
          <h2 style={styles.title}>{PARENT_COMPLIANCE_MESSAGES.summaryHeader}</h2>
        </div>
        <p style={styles.message}>Loading...</p>
      </div>
    )
  }

  if (error) {
    return null
  }

  return (
    <div style={styles.card} data-testid="parent-compliance-card">
      <div style={styles.header}>
        <div style={styles.iconContainer}>
          <UsersIcon size={28} color="#ffffff" strokeWidth={2.5} />
        </div>
        <h2 style={styles.title}>{PARENT_COMPLIANCE_MESSAGES.summaryHeader}</h2>
      </div>
      <p style={styles.message} data-testid="family-message">
        {PARENT_COMPLIANCE_MESSAGES.familyCompliance}
      </p>

      {recentRecords.length === 0 ? (
        <p style={styles.emptyState}>No offline time yet</p>
      ) : (
        <>
          <ul style={styles.recordList} data-testid="compliance-records">
            {recentRecords.map((record, index) => (
              <li
                key={`${record.parentUid}-${record.createdAt}`}
                style={{
                  ...styles.recordItem,
                  ...(record.wasCompliant
                    ? styles.recordItemCompliant
                    : styles.recordItemNonCompliant),
                }}
                data-testid={`compliance-record-${index}`}
              >
                <p style={styles.recordText}>{getRecordMessage(record)}</p>
                <span style={styles.recordDate}>{formatDate(record.createdAt)}</span>
              </li>
            ))}
          </ul>

          {recentlyAllCompliant && (
            <p style={styles.encouragement} data-testid="encouragement-message">
              {PARENT_COMPLIANCE_MESSAGES.greatJob}
            </p>
          )}
        </>
      )}
    </div>
  )
}

export default ParentComplianceCard
