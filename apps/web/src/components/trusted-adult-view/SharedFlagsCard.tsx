'use client'

/**
 * SharedFlagsCard - Story 52.5 Task 2.3
 *
 * Flags card for trusted adults respecting flag sharing settings.
 *
 * AC3: Respect reverse mode settings
 */

import { useState, useEffect } from 'react'

interface SharedFlagsCardProps {
  childId: string
  childName: string
}

interface FlagData {
  id: string
  category: string
  severity: 'low' | 'medium' | 'high'
  timestamp: Date
  description: string
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    padding: '24px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  title: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  flagCount: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '24px',
    height: '24px',
    padding: '0 8px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 600,
  },
  flagCountZero: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  flagList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  flagItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  severityDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    marginTop: '4px',
    flexShrink: 0,
  },
  severityLow: {
    backgroundColor: '#fbbf24',
  },
  severityMedium: {
    backgroundColor: '#f97316',
  },
  severityHigh: {
    backgroundColor: '#ef4444',
  },
  flagContent: {
    flex: 1,
    minWidth: 0,
  },
  flagCategory: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    margin: '0 0 4px 0',
  },
  flagDescription: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '0 0 4px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  flagTime: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    color: '#6b7280',
    fontSize: '14px',
  },
  noFlags: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '24px',
    textAlign: 'center' as const,
  },
  noFlagsIcon: {
    fontSize: '32px',
    marginBottom: '8px',
    opacity: 0.5,
  },
  noFlagsText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function SharedFlagsCard({ childId: _childId, childName }: SharedFlagsCardProps) {
  const [loading, setLoading] = useState(true)
  const [flags, setFlags] = useState<FlagData[]>([])

  useEffect(() => {
    // Simulate loading flags data
    // In production, this would call the backend
    const timer = setTimeout(() => {
      // Mock data for demonstration
      setFlags([
        {
          id: 'flag-1',
          category: 'Concerning Content',
          severity: 'medium',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          description: 'Content related to self-harm was detected',
        },
      ])
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.loading}>Loading flags...</div>
      </div>
    )
  }

  return (
    <div style={styles.card} data-testid="shared-flags-card">
      <div style={styles.header}>
        <h3 style={styles.title}>Flagged Content</h3>
        <span
          style={{
            ...styles.flagCount,
            ...(flags.length === 0 ? styles.flagCountZero : {}),
          }}
        >
          {flags.length}
        </span>
      </div>

      {flags.length === 0 ? (
        <div style={styles.noFlags}>
          <div style={styles.noFlagsIcon} aria-hidden="true">
            &#x2714;
          </div>
          <p style={styles.noFlagsText}>No flagged content for {childName} today</p>
        </div>
      ) : (
        <div style={styles.flagList}>
          {flags.map((flag) => (
            <div key={flag.id} style={styles.flagItem}>
              <div
                style={{
                  ...styles.severityDot,
                  ...(flag.severity === 'low'
                    ? styles.severityLow
                    : flag.severity === 'medium'
                      ? styles.severityMedium
                      : styles.severityHigh),
                }}
              />
              <div style={styles.flagContent}>
                <p style={styles.flagCategory}>{flag.category}</p>
                <p style={styles.flagDescription}>{flag.description}</p>
                <span style={styles.flagTime}>{formatRelativeTime(flag.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
