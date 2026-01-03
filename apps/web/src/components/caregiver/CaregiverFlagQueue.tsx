'use client'

/**
 * CaregiverFlagQueue Component - Story 39.5
 *
 * Flag queue for caregivers with restricted actions.
 *
 * Acceptance Criteria:
 * - AC1: Flag Queue Access (flags in priority order)
 * - AC3: Restricted Actions (no dismiss/escalate/resolve)
 * - AC5: Permission Requirement (canViewFlags)
 * - AC6: Child Privacy (only assigned children)
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { FlagCard } from '../flags/FlagCard'
import { subscribeToPendingFlags, getFlagsForChildren } from '../../services/flagService'
import type { FlagDocument } from '@fledgely/shared'

export interface CaregiverFlagQueueProps {
  /** Child IDs this caregiver is assigned to */
  caregiverChildIds: string[]
  /** Whether caregiver has permission to view flags */
  canViewFlags: boolean
  /** Caregiver's display name */
  caregiverName: string
  /** Optional: Family children with names (for display) */
  familyChildren?: Array<{ id: string; name: string }>
  /** Callback when a flag is clicked */
  onFlagClick?: (flag: FlagDocument) => void
}

type TabType = 'pending' | 'reviewed'

const styles = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '24px',
    height: '24px',
    padding: '0 8px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
  },
  badgeZero: {
    backgroundColor: '#16a34a',
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    marginBottom: '16px',
    borderBottom: '1px solid #e5e7eb',
  },
  tab: {
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    marginBottom: '-1px',
    minHeight: '44px', // NFR49: 44px minimum touch target
    minWidth: '44px',
  },
  tabActive: {
    color: '#8b5cf6',
    borderBottomColor: '#8b5cf6',
  },
  tabCount: {
    marginLeft: '6px',
    padding: '2px 6px',
    backgroundColor: '#e5e7eb',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 600,
  },
  tabCountActive: {
    backgroundColor: '#f3e8ff',
    color: '#8b5cf6',
  },
  flagList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  emptyState: {
    padding: '32px 16px',
    textAlign: 'center' as const,
    color: '#6b7280',
  },
  emptyIcon: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: 500,
    color: '#1f2937',
    marginBottom: '4px',
  },
  emptyDescription: {
    fontSize: '14px',
    color: '#6b7280',
  },
  loading: {
    padding: '24px',
    textAlign: 'center' as const,
    color: '#6b7280',
  },
  restrictedMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
    color: '#92400e',
  },
  permissionDenied: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '48px 24px',
    textAlign: 'center' as const,
    backgroundColor: '#fef2f2',
    borderRadius: '12px',
    border: '1px solid #fecaca',
  },
  permissionIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  permissionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#dc2626',
    marginBottom: '8px',
  },
  permissionDescription: {
    fontSize: '14px',
    color: '#7f1d1d',
    maxWidth: '320px',
  },
}

/**
 * Build a map of child IDs to names
 */
function buildChildNameMap(children?: Array<{ id: string; name: string }>): Map<string, string> {
  if (!children) return new Map()
  return new Map(children.map((c) => [c.id, c.name]))
}

/**
 * CaregiverFlagQueue - Flag queue for caregivers with restricted actions
 */
export function CaregiverFlagQueue({
  caregiverChildIds,
  canViewFlags,
  caregiverName,
  familyChildren,
  onFlagClick,
}: CaregiverFlagQueueProps) {
  const [activeTab, setActiveTab] = useState<TabType>('pending')
  const [pendingFlags, setPendingFlags] = useState<FlagDocument[]>([])
  const [reviewedFlags, setReviewedFlags] = useState<FlagDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFlagId, setSelectedFlagId] = useState<string | null>(null)

  // Build child name map
  const childNameMap = useMemo(() => buildChildNameMap(familyChildren), [familyChildren])

  // Subscribe to pending flags (real-time) - only for assigned children (AC6)
  useEffect(() => {
    // Skip if no permission or no children
    if (!canViewFlags || caregiverChildIds.length === 0) {
      setPendingFlags([])
      setLoading(false)
      return
    }

    setLoading(true)
    const unsubscribe = subscribeToPendingFlags(caregiverChildIds, (flags) => {
      setPendingFlags(flags)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [caregiverChildIds, canViewFlags])

  // Fetch flags reviewed by this caregiver
  useEffect(() => {
    // Skip if no permission or no children
    if (!canViewFlags || caregiverChildIds.length === 0) {
      setReviewedFlags([])
      return
    }

    // Fetch reviewed flags for assigned children
    getFlagsForChildren(caregiverChildIds, { status: 'reviewed' }).then((flags) => {
      // Filter to only flags reviewed by this caregiver
      const myReviewedFlags = flags.filter(
        (f) => f.caregiverReviewedBy?.displayName === caregiverName
      )
      setReviewedFlags(myReviewedFlags)
    })
  }, [caregiverChildIds, caregiverName, pendingFlags, canViewFlags]) // Refresh when pending flags change

  // Handle flag click
  const handleFlagClick = useCallback(
    (flag: FlagDocument) => {
      setSelectedFlagId(flag.id)
      onFlagClick?.(flag)
    },
    [onFlagClick]
  )

  // Permission denied state (AC5) - AFTER hooks
  if (!canViewFlags) {
    return (
      <div style={styles.permissionDenied} data-testid="permission-denied">
        <div style={styles.permissionIcon}>
          <span role="img" aria-label="No Access">
            🚫
          </span>
        </div>
        <div style={styles.permissionTitle}>Permission Required</div>
        <div style={styles.permissionDescription}>
          You don&apos;t have permission to view flags. Contact the parents to request access.
        </div>
      </div>
    )
  }

  // Get current flags based on active tab
  const currentFlags = activeTab === 'pending' ? pendingFlags : reviewedFlags

  return (
    <div style={styles.container} data-testid="caregiver-flag-queue">
      {/* Header with count badge */}
      <div style={styles.header}>
        <h2 style={styles.title}>
          <span role="img" aria-label="Flags">
            🚩
          </span>
          <span>Flagged Content</span>
          <span
            style={{
              ...styles.badge,
              ...(pendingFlags.length === 0 ? styles.badgeZero : {}),
            }}
            data-testid="pending-count-badge"
            aria-label={`${pendingFlags.length} pending flags`}
          >
            {pendingFlags.length}
          </span>
        </h2>
      </div>

      {/* Restricted Actions Message (AC3) */}
      <div style={styles.restrictedMessage} data-testid="restricted-actions-message">
        <span role="img" aria-label="Info">
          ℹ️
        </span>
        <span>Only parents can dismiss or resolve flags. You can mark flags as reviewed.</span>
      </div>

      {/* Tabs: Pending / Reviewed by Me */}
      <div style={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'pending'}
          onClick={() => setActiveTab('pending')}
          style={{
            ...styles.tab,
            ...(activeTab === 'pending' ? styles.tabActive : {}),
          }}
          data-testid="tab-pending"
        >
          Pending
          <span
            style={{
              ...styles.tabCount,
              ...(activeTab === 'pending' ? styles.tabCountActive : {}),
            }}
          >
            {pendingFlags.length}
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'reviewed'}
          onClick={() => setActiveTab('reviewed')}
          style={{
            ...styles.tab,
            ...(activeTab === 'reviewed' ? styles.tabActive : {}),
          }}
          data-testid="tab-reviewed"
        >
          Reviewed by Me
          <span
            style={{
              ...styles.tabCount,
              ...(activeTab === 'reviewed' ? styles.tabCountActive : {}),
            }}
          >
            {reviewedFlags.length}
          </span>
        </button>
      </div>

      {/* Flag list */}
      {loading ? (
        <div style={styles.loading} data-testid="loading">
          Loading flags...
        </div>
      ) : currentFlags.length === 0 ? (
        <div style={styles.emptyState} data-testid="empty-state">
          <div style={styles.emptyIcon}>{activeTab === 'pending' ? '✅' : '📋'}</div>
          <div style={styles.emptyTitle}>
            {activeTab === 'pending' ? 'No pending flags' : 'No reviewed flags'}
          </div>
          <div style={styles.emptyDescription}>
            {activeTab === 'pending'
              ? 'No content has been flagged for the children you monitor.'
              : 'Flags you review will appear here.'}
          </div>
        </div>
      ) : (
        <div style={styles.flagList} data-testid="flag-list" role="list">
          {currentFlags.map((flag) => (
            <FlagCard
              key={flag.id}
              flag={flag}
              childName={childNameMap.get(flag.childId) ?? 'Unknown Child'}
              onClick={() => handleFlagClick(flag)}
              selected={selectedFlagId === flag.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default CaregiverFlagQueue
