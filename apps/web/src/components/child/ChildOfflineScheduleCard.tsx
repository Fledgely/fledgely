'use client'

/**
 * ChildOfflineScheduleCard Component - Story 32.1
 *
 * Child-facing display for family offline schedule.
 *
 * Requirements:
 * - AC5: Child sees family offline message
 * - Display "Family offline time: Everyone unplugs together!"
 * - Show current schedule times to child
 */

import { useMemo } from 'react'
import type { OfflineScheduleConfig } from '../../hooks/useFamilyOfflineSchedule'
import { formatTimeForDisplay } from '../../utils/timeUtils'
import { MoonIcon } from '../icons/MoonIcon'

export interface ChildOfflineScheduleCardProps {
  /** Current schedule configuration */
  schedule: OfflineScheduleConfig | null
  /** Loading state */
  loading?: boolean
}

/**
 * Format schedule for display
 */
function formatScheduleDisplay(schedule: OfflineScheduleConfig): string {
  const weekdayStart = formatTimeForDisplay(schedule.weekdayStart)
  const weekdayEnd = formatTimeForDisplay(schedule.weekdayEnd)
  const weekendStart = formatTimeForDisplay(schedule.weekendStart)
  const weekendEnd = formatTimeForDisplay(schedule.weekendEnd)

  // Check if weekday and weekend are the same
  const sameSchedule =
    schedule.weekdayStart === schedule.weekendStart && schedule.weekdayEnd === schedule.weekendEnd

  if (sameSchedule) {
    return `Every day: ${weekdayStart} - ${weekdayEnd}`
  }

  return `Weekdays: ${weekdayStart} - ${weekdayEnd} • Weekends: ${weekendStart} - ${weekendEnd}`
}

const styles = {
  card: {
    background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)',
    borderRadius: '16px',
    border: '1px solid #c7d2fe',
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
    backgroundColor: '#6366f1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#4338ca',
    margin: 0,
  },
  message: {
    fontSize: '16px',
    fontWeight: 500,
    color: '#6366f1',
    margin: '0 0 8px 0',
    lineHeight: 1.4,
  },
  scheduleText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  loading: {
    opacity: 0.6,
  },
}

export function ChildOfflineScheduleCard({
  schedule,
  loading = false,
}: ChildOfflineScheduleCardProps) {
  const scheduleDisplay = useMemo(() => {
    if (!schedule) return null
    return formatScheduleDisplay(schedule)
  }, [schedule])

  // Don't render if schedule is disabled or not configured
  if (!schedule?.enabled) {
    return null
  }

  if (loading) {
    return (
      <div
        style={{ ...styles.card, ...styles.loading }}
        data-testid="child-offline-schedule-loading"
      >
        <div style={styles.header}>
          <div style={styles.iconContainer}>
            <MoonIcon size={28} color="#ffffff" strokeWidth={2.5} />
          </div>
          <h2 style={styles.title}>Family Offline Time</h2>
        </div>
        <p style={styles.message}>Loading...</p>
      </div>
    )
  }

  return (
    <div style={styles.card} data-testid="child-offline-schedule-card">
      <div style={styles.header}>
        <div style={styles.iconContainer}>
          <MoonIcon size={28} color="#ffffff" strokeWidth={2.5} />
        </div>
        <h2 style={styles.title}>Family Offline Time</h2>
      </div>
      <p style={styles.message} data-testid="offline-message">
        Everyone unplugs together!
      </p>
      <p style={styles.scheduleText} data-testid="schedule-times">
        {scheduleDisplay}
      </p>
    </div>
  )
}

export default ChildOfflineScheduleCard
