'use client'

/**
 * SharedDataDashboard - Story 52.5 Task 2.1
 *
 * Dashboard component for trusted adults showing only teen-allowed data.
 *
 * AC1: Dashboard limited to what teen shares
 * AC2: Read-only access
 * AC3: Respect reverse mode settings
 */

import { SharedScreenTimeCard } from './SharedScreenTimeCard'
import { SharedFlagsCard } from './SharedFlagsCard'
import type { SharedDataFilter } from '@fledgely/shared'

interface SharedDataDashboardProps {
  childId: string
  childName: string
  sharedByLabel: string
  dataFilter: SharedDataFilter
  hasData: boolean
  noDataMessage: string | null
  reverseModeActive: boolean
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 0',
    borderBottom: '1px solid #e5e7eb',
  },
  sharedByLabel: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  reverseModeIndicator: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: '#ede9fe',
    color: '#7c3aed',
    borderRadius: '16px',
    fontSize: '13px',
    fontWeight: 500,
  },
  readOnlyBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 24px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    textAlign: 'center' as const,
  },
  emptyStateIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    opacity: 0.5,
  },
  emptyStateTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 8px 0',
  },
  emptyStateMessage: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
    maxWidth: '400px',
    lineHeight: 1.5,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
  },
  infoBox: {
    padding: '12px 16px',
    backgroundColor: '#f0fdf4',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#166534',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
}

export function SharedDataDashboard({
  childId,
  childName,
  sharedByLabel,
  dataFilter,
  hasData,
  noDataMessage,
  reverseModeActive,
}: SharedDataDashboardProps) {
  // AC2: Display read-only badge
  // AC1: Display shared by label

  if (!hasData) {
    // AC3: Show empty state when teen shares nothing
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.sharedByLabel}>{sharedByLabel}</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {reverseModeActive && (
              <span style={styles.reverseModeIndicator}>
                <span aria-hidden="true">&#x1F512;</span>
                Reverse Mode Active
              </span>
            )}
            <span style={styles.readOnlyBadge}>
              <span aria-hidden="true">&#x1F441;</span>
              View Only
            </span>
          </div>
        </div>

        <div style={styles.emptyState}>
          <div style={styles.emptyStateIcon} aria-hidden="true">
            &#x1F510;
          </div>
          <h3 style={styles.emptyStateTitle}>No Data Shared</h3>
          <p style={styles.emptyStateMessage}>
            {noDataMessage || `${childName} hasn't chosen to share any data with you yet.`}
          </p>
        </div>

        <div style={styles.infoBox}>
          <span aria-hidden="true">&#x2139;</span>
          {childName} controls what data you can see. They can update their sharing preferences at
          any time.
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.sharedByLabel}>{sharedByLabel}</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {reverseModeActive && (
            <span style={styles.reverseModeIndicator}>
              <span aria-hidden="true">&#x1F512;</span>
              Reverse Mode Active
            </span>
          )}
          <span style={styles.readOnlyBadge}>
            <span aria-hidden="true">&#x1F441;</span>
            View Only
          </span>
        </div>
      </div>

      <div style={styles.grid}>
        {/* Screen Time Card - AC3 respects sharing preferences */}
        {dataFilter.screenTime && (
          <SharedScreenTimeCard
            childId={childId}
            childName={childName}
            detailLevel={dataFilter.screenTimeDetail}
          />
        )}

        {/* Flags Card - AC3 respects sharing preferences */}
        {dataFilter.flags && <SharedFlagsCard childId={childId} childName={childName} />}

        {/* Time Limit Status - AC3 respects sharing preferences */}
        {dataFilter.timeLimitStatus && (
          <div
            style={{
              padding: '24px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: '#1f2937',
                margin: '0 0 16px 0',
              }}
            >
              Time Limit Status
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
              {childName} is sharing their time limit status with you.
            </p>
          </div>
        )}
      </div>

      <div style={styles.infoBox}>
        <span aria-hidden="true">&#x2139;</span>
        You&apos;re viewing data that {childName} has chosen to share with you.
      </div>
    </div>
  )
}
