'use client'

/**
 * TimeOfDaySection Component - Story 19B.2
 *
 * Displays a section header for a time-of-day group (morning, afternoon, etc.)
 *
 * Task 1.3: Create time-of-day section header component
 * Task 1.4: Add friendly icons for each time period
 */

import type { TimeOfDayGroup } from './timelineUtils'
import { ChildScreenshotCard } from './ChildScreenshotCard'
import type { ChildScreenshot } from '../../hooks/useChildScreenshots'

/**
 * Props for TimeOfDaySection
 */
export interface TimeOfDaySectionProps {
  group: TimeOfDayGroup
  onSelectScreenshot: (screenshot: ChildScreenshot) => void
}

/**
 * Styles using sky blue theme
 */
const styles: Record<string, React.CSSProperties> = {
  section: {
    marginBottom: '16px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#e0f2fe', // sky-100
    borderRadius: '8px',
    marginBottom: '12px',
  },
  icon: {
    fontSize: '1.25rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#0369a1', // sky-700
    margin: 0,
  },
  count: {
    fontSize: '0.75rem',
    color: '#0ea5e9', // sky-500
    marginLeft: 'auto',
    backgroundColor: '#f0f9ff', // sky-50
    padding: '2px 8px',
    borderRadius: '12px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
  },
}

/**
 * TimeOfDaySection - Displays screenshots grouped by time of day
 */
export function TimeOfDaySection({ group, onSelectScreenshot }: TimeOfDaySectionProps) {
  const { config, screenshots } = group
  const count = screenshots.length

  return (
    <div
      style={styles.section}
      data-testid={`time-section-${config.key}`}
      role="region"
      aria-labelledby={`time-section-label-${config.key}`}
    >
      <div style={styles.header} data-testid={`time-section-header-${config.key}`}>
        <span style={styles.icon} role="img" aria-hidden="true">
          {config.icon}
        </span>
        <span id={`time-section-label-${config.key}`} style={styles.label}>
          {config.label}
        </span>
        <span style={styles.count} data-testid={`time-section-count-${config.key}`}>
          {count} {count === 1 ? 'picture' : 'pictures'}
        </span>
      </div>
      <div style={styles.grid}>
        {screenshots.map((screenshot) => (
          <ChildScreenshotCard
            key={screenshot.id}
            screenshot={screenshot}
            onClick={() => onSelectScreenshot(screenshot)}
          />
        ))}
      </div>
    </div>
  )
}
