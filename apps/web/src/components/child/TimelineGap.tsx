'use client'

/**
 * TimelineGap Component - Story 19B.2
 *
 * Displays a friendly message when there's a gap in screenshot captures.
 *
 * Task 3: Add No-Captures Gap Indicators (AC: #3)
 * - 3.1 Create TimelineGap component for empty time periods
 * - 3.3 Style gaps with friendly, non-alarming appearance
 * - 3.4 Add child-friendly "No pictures during this time" message
 */

import type { GapInfo } from './timelineUtils'
import { formatTimeRange } from './timelineUtils'

/**
 * Props for TimelineGap
 */
export interface TimelineGapProps {
  gap: GapInfo
}

/**
 * Styles using a friendly, non-alarming appearance
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#f1f5f9', // slate-100
    borderRadius: '8px',
    margin: '8px 0',
    border: '1px dashed #cbd5e1', // slate-300
  },
  icon: {
    fontSize: '1rem',
    color: '#94a3b8', // slate-400
  },
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '2px',
  },
  message: {
    fontSize: '0.875rem',
    color: '#64748b', // slate-500
    margin: 0,
  },
  timeRange: {
    fontSize: '0.75rem',
    color: '#94a3b8', // slate-400
    margin: 0,
  },
}

/**
 * TimelineGap - Shows a friendly gap indicator in the timeline
 */
export function TimelineGap({ gap }: TimelineGapProps) {
  const timeRange = formatTimeRange(gap.startTime, gap.endTime)

  return (
    <div
      style={styles.container}
      data-testid={`timeline-gap-${gap.id}`}
      role="status"
      aria-label={`${gap.message} from ${timeRange}`}
    >
      <span style={styles.icon} role="img" aria-hidden="true">
        💤
      </span>
      <div style={styles.content}>
        <p style={styles.message} data-testid="gap-message">
          {gap.message}
        </p>
        <p style={styles.timeRange} data-testid="gap-time-range">
          {timeRange}
        </p>
      </div>
    </div>
  )
}
