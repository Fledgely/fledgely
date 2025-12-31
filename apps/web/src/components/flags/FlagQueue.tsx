'use client'

/**
 * FlagQueue Component - Story 22.1
 *
 * Main flag review queue displaying pending and reviewed flags.
 *
 * Acceptance Criteria:
 * - AC1: Pending flags shown in priority order (severity, then date)
 * - AC3: Flag count badge visible
 * - AC4: Filters available by child, category, severity
 * - AC5: Reviewed flags in separate History section
 * - AC6: Real-time updates
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { FlagCard } from './FlagCard'
import { FlagFilters } from './FlagFilters'
import {
  subscribeToPendingFlags,
  getFlagsForChildren,
  applyClientFilters,
} from '../../services/flagService'
import type { FlagDocument, ConcernCategory, ConcernSeverity } from '@fledgely/shared'

export interface FlagQueueProps {
  /** Array of children in the family */
  familyChildren: Array<{ id: string; name: string }>
  /** Callback when a flag is clicked */
  onFlagClick?: (flag: FlagDocument) => void
}

type TabType = 'pending' | 'history'

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
}

/**
 * Build a map of child IDs to names
 */
function buildChildNameMap(children: Array<{ id: string; name: string }>): Map<string, string> {
  return new Map(children.map((c) => [c.id, c.name]))
}

/**
 * FlagQueue - Main flag review queue component
 */
export function FlagQueue({ familyChildren, onFlagClick }: FlagQueueProps) {
  const [activeTab, setActiveTab] = useState<TabType>('pending')
  const [pendingFlags, setPendingFlags] = useState<FlagDocument[]>([])
  const [historyFlags, setHistoryFlags] = useState<FlagDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFlagId, setSelectedFlagId] = useState<string | null>(null)

  // Filter state
  const [selectedChildId, setSelectedChildId] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSeverity, setSelectedSeverity] = useState('')

  // Build child name map
  const childNameMap = useMemo(() => buildChildNameMap(familyChildren), [familyChildren])
  const childIds = useMemo(() => familyChildren.map((c) => c.id), [familyChildren])

  // Subscribe to pending flags (real-time) - AC #6
  useEffect(() => {
    if (childIds.length === 0) {
      setPendingFlags([])
      setLoading(false)
      return
    }

    setLoading(true)
    const unsubscribe = subscribeToPendingFlags(childIds, (flags) => {
      setPendingFlags(flags)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [childIds])

  // Fetch history flags (reviewed/dismissed) - not real-time
  useEffect(() => {
    if (childIds.length === 0) {
      setHistoryFlags([])
      return
    }

    // Fetch reviewed and dismissed flags
    Promise.all([
      getFlagsForChildren(childIds, { status: 'reviewed' }),
      getFlagsForChildren(childIds, { status: 'dismissed' }),
    ]).then(([reviewed, dismissed]) => {
      const allHistory = [...reviewed, ...dismissed].sort((a, b) => b.createdAt - a.createdAt)
      setHistoryFlags(allHistory)
    })
  }, [childIds, pendingFlags]) // Refresh history when pending flags change

  // Apply filters - AC #4
  const filteredPendingFlags = useMemo(() => {
    return applyClientFilters(pendingFlags, {
      childIds: selectedChildId ? [selectedChildId] : undefined,
      category: selectedCategory as ConcernCategory | undefined,
      severity: selectedSeverity as ConcernSeverity | undefined,
    })
  }, [pendingFlags, selectedChildId, selectedCategory, selectedSeverity])

  const filteredHistoryFlags = useMemo(() => {
    return applyClientFilters(historyFlags, {
      childIds: selectedChildId ? [selectedChildId] : undefined,
      category: selectedCategory as ConcernCategory | undefined,
      severity: selectedSeverity as ConcernSeverity | undefined,
    })
  }, [historyFlags, selectedChildId, selectedCategory, selectedSeverity])

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSelectedChildId('')
    setSelectedCategory('')
    setSelectedSeverity('')
  }, [])

  // Handle flag click
  const handleFlagClick = useCallback(
    (flag: FlagDocument) => {
      setSelectedFlagId(flag.id)
      onFlagClick?.(flag)
    },
    [onFlagClick]
  )

  // Get current flags based on active tab
  const currentFlags = activeTab === 'pending' ? filteredPendingFlags : filteredHistoryFlags

  return (
    <div style={styles.container} data-testid="flag-queue">
      {/* Header with count badge - AC #3 */}
      <div style={styles.header}>
        <h2 style={styles.title}>
          <span role="img" aria-label="Flags">
            🚩
          </span>
          <span>Flags</span>
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

      {/* Filters - AC #4 */}
      <FlagFilters
        familyChildren={familyChildren}
        selectedChildId={selectedChildId}
        selectedCategory={selectedCategory}
        selectedSeverity={selectedSeverity}
        onChildChange={setSelectedChildId}
        onCategoryChange={setSelectedCategory}
        onSeverityChange={setSelectedSeverity}
        onClearFilters={handleClearFilters}
      />

      {/* Tabs: Pending / History - AC #5 */}
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
            {filteredPendingFlags.length}
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
          style={{
            ...styles.tab,
            ...(activeTab === 'history' ? styles.tabActive : {}),
          }}
          data-testid="tab-history"
        >
          History
          <span
            style={{
              ...styles.tabCount,
              ...(activeTab === 'history' ? styles.tabCountActive : {}),
            }}
          >
            {filteredHistoryFlags.length}
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
              ? "You're all caught up! No content has been flagged for review."
              : 'Reviewed flags will appear here.'}
          </div>
        </div>
      ) : (
        <div style={styles.flagList} data-testid="flag-list" role="list">
          {currentFlags.map((flag) => (
            <FlagCard
              key={flag.id}
              flag={flag}
              childName={childNameMap.get(flag.childId) ?? 'Unknown'}
              onClick={() => handleFlagClick(flag)}
              selected={selectedFlagId === flag.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default FlagQueue
