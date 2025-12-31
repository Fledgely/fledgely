/**
 * ResolutionHistory Component
 *
 * Story 27.5.6: Resolution Markers
 *
 * Displays resolution history for a family.
 * - AC3: Both see same data
 * - AC6: Resolution history
 */

'use client'

import {
  RESOLUTION_MARKER_LABELS,
  type Resolution,
  type ResolutionMarkerType,
} from '@fledgely/shared'

interface ResolutionHistoryProps {
  resolutions: Resolution[]
  isLoading?: boolean
  emptyMessage?: string
}

export function ResolutionHistory({
  resolutions,
  isLoading = false,
  emptyMessage = 'No resolutions yet. Add one when you work through an issue together!',
}: ResolutionHistoryProps) {
  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading resolution history...</div>
      </div>
    )
  }

  if (resolutions.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.empty}>
          <span style={styles.emptyIcon}>🌱</span>
          <p style={styles.emptyText}>{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.timeline}>
        {resolutions.map((resolution) => (
          <div key={resolution.id} style={styles.entry}>
            <div style={styles.iconWrapper}>
              <span style={styles.icon}>{getMarkerIcon(resolution.markerType)}</span>
            </div>
            <div style={styles.content}>
              <div style={styles.header}>
                <span style={styles.label}>{RESOLUTION_MARKER_LABELS[resolution.markerType]}</span>
                <span style={styles.date}>{formatDate(resolution.createdAt)}</span>
              </div>
              <div style={styles.createdBy}>Added by {resolution.createdByName}</div>
              {resolution.note && <p style={styles.note}>{resolution.note}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function getMarkerIcon(type: ResolutionMarkerType): string {
  switch (type) {
    case 'talked_through':
      return '💬'
    case 'parent_apologized':
      return '🤝'
    case 'child_understood':
      return '💡'
    case 'in_progress':
      return '⏳'
    default:
      return '✓'
  }
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return 'Today'
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '8px 0',
  },
  loading: {
    textAlign: 'center',
    padding: '20px',
    color: '#666',
    fontSize: '14px',
  },
  empty: {
    textAlign: 'center',
    padding: '24px 16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  emptyIcon: {
    fontSize: '32px',
    display: 'block',
    marginBottom: '12px',
  },
  emptyText: {
    margin: 0,
    color: '#666',
    fontSize: '14px',
    lineHeight: 1.5,
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  entry: {
    display: 'flex',
    gap: '12px',
  },
  iconWrapper: {
    width: '36px',
    height: '36px',
    backgroundColor: '#e8f5e9',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  icon: {
    fontSize: '18px',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: '2px',
  },
  label: {
    fontSize: '15px',
    fontWeight: 500,
    color: '#333',
  },
  date: {
    fontSize: '12px',
    color: '#888',
  },
  createdBy: {
    fontSize: '13px',
    color: '#666',
    marginBottom: '4px',
  },
  note: {
    margin: '6px 0 0 0',
    fontSize: '14px',
    color: '#555',
    backgroundColor: '#f8f9fa',
    padding: '10px 12px',
    borderRadius: '6px',
    lineHeight: 1.5,
  },
}
