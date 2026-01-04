'use client'

/**
 * SharedScreenTimeCard - Story 52.5 Task 2.2
 *
 * Screen time card for trusted adults respecting sharing preferences.
 *
 * AC3: Respect reverse mode settings
 */

import { useState, useEffect } from 'react'

interface SharedScreenTimeCardProps {
  childId: string
  childName: string
  detailLevel: 'none' | 'summary' | 'full'
}

interface ScreenTimeData {
  totalMinutes: number
  categories: Array<{
    name: string
    minutes: number
    color: string
  }>
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
  detailBadge: {
    fontSize: '12px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '4px 8px',
    borderRadius: '6px',
  },
  totalTime: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#7c3aed',
    margin: '0 0 8px 0',
  },
  totalLabel: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '0 0 16px 0',
  },
  categoryList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  categoryItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  categoryDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  categoryName: {
    flex: 1,
    fontSize: '14px',
    color: '#374151',
    margin: 0,
  },
  categoryTime: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1f2937',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    color: '#6b7280',
    fontSize: '14px',
  },
  noData: {
    padding: '16px',
    textAlign: 'center' as const,
    color: '#6b7280',
    fontSize: '14px',
  },
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return `${hours}h`
  }
  return `${hours}h ${mins}m`
}

export function SharedScreenTimeCard({
  childId: _childId,
  childName,
  detailLevel,
}: SharedScreenTimeCardProps) {
  const [loading, setLoading] = useState(true)
  const [screenTimeData, setScreenTimeData] = useState<ScreenTimeData | null>(null)

  useEffect(() => {
    // Simulate loading screen time data
    // In production, this would call the backend
    const timer = setTimeout(() => {
      // Mock data for demonstration
      setScreenTimeData({
        totalMinutes: 145,
        categories: [
          { name: 'Social Media', minutes: 45, color: '#f472b6' },
          { name: 'Games', minutes: 35, color: '#60a5fa' },
          { name: 'Education', minutes: 30, color: '#34d399' },
          { name: 'Entertainment', minutes: 25, color: '#fbbf24' },
          { name: 'Other', minutes: 10, color: '#9ca3af' },
        ],
      })
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.loading}>Loading screen time...</div>
      </div>
    )
  }

  if (!screenTimeData) {
    return (
      <div style={styles.card}>
        <div style={styles.noData}>No screen time data available</div>
      </div>
    )
  }

  // AC3: Respect detail level from sharing preferences
  const showDetails = detailLevel === 'full'
  const showSummary = detailLevel === 'summary' || detailLevel === 'full'

  return (
    <div style={styles.card} data-testid="shared-screen-time-card">
      <div style={styles.header}>
        <h3 style={styles.title}>Screen Time Today</h3>
        <span style={styles.detailBadge}>
          {detailLevel === 'summary' ? 'Summary' : 'Full Details'}
        </span>
      </div>

      {showSummary && (
        <>
          <p style={styles.totalTime}>{formatMinutes(screenTimeData.totalMinutes)}</p>
          <p style={styles.totalLabel}>{childName}&apos;s screen time today</p>
        </>
      )}

      {showDetails && screenTimeData.categories.length > 0 && (
        <div style={styles.categoryList}>
          {screenTimeData.categories.map((category) => (
            <div key={category.name} style={styles.categoryItem}>
              <div style={{ ...styles.categoryDot, backgroundColor: category.color }} />
              <span style={styles.categoryName}>{category.name}</span>
              <span style={styles.categoryTime}>{formatMinutes(category.minutes)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
