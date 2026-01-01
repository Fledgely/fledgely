'use client'

/**
 * MilestoneTimeline Component - Story 36.4 Task 3
 *
 * Timeline showing trust score milestones with dates.
 * AC3: Milestone markers: "Reached 90 on Sept 15"
 */

import { type TrustScoreHistoryEntry } from '@fledgely/shared'

// ============================================================================
// Types
// ============================================================================

export interface MilestoneTimelineProps {
  /** Score history entries */
  history: TrustScoreHistoryEntry[]
}

interface Milestone {
  threshold: number
  date: Date
  score: number
}

// ============================================================================
// Milestone Detection
// ============================================================================

function detectMilestones(history: TrustScoreHistoryEntry[]): Milestone[] {
  const milestones: Milestone[] = []
  const thresholds = [90, 80, 70, 60, 50]

  for (const entry of history) {
    for (const threshold of thresholds) {
      if (entry.previousScore < threshold && entry.score >= threshold) {
        milestones.push({
          threshold,
          date: entry.date,
          score: entry.score,
        })
      }
    }
  }

  // Sort by date descending (most recent first)
  return milestones.sort((a, b) => b.date.getTime() - a.date.getTime())
}

// ============================================================================
// Date Formatting
// ============================================================================

function formatMilestoneDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  }
  return date.toLocaleDateString('en-US', options)
}

// ============================================================================
// Milestone Item Component
// ============================================================================

interface MilestoneItemProps {
  milestone: Milestone
  isLast: boolean
}

function MilestoneItem({ milestone, isLast }: MilestoneItemProps) {
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        position: 'relative',
      }}
      data-testid={`timeline-milestone-${milestone.threshold}`}
    >
      {/* Icon */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          backgroundColor: '#fef3c7',
          borderRadius: '50%',
          flexShrink: 0,
          zIndex: 1,
        }}
        data-testid={`milestone-icon-${milestone.threshold}`}
      >
        <span style={{ fontSize: '16px' }}>⭐</span>
      </div>

      {/* Content */}
      <div style={{ paddingBottom: isLast ? 0 : '16px' }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#111827',
          }}
        >
          Reached {milestone.threshold}
        </div>
        <div
          style={{
            fontSize: '13px',
            color: '#6b7280',
          }}
        >
          on {formatMilestoneDate(milestone.date)}
        </div>
      </div>
    </li>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function MilestoneTimeline({ history }: MilestoneTimelineProps) {
  const milestones = detectMilestones(history)
  const hasMilestones = milestones.length > 0

  return (
    <div data-testid="milestone-timeline" aria-label="Trust score milestones timeline">
      {hasMilestones ? (
        <div style={{ position: 'relative' }}>
          {/* Timeline connector line */}
          {milestones.length > 1 && (
            <div
              style={{
                position: 'absolute',
                left: '15px',
                top: '32px',
                bottom: '16px',
                width: '2px',
                backgroundColor: '#e5e7eb',
              }}
              data-testid="timeline-connector"
            />
          )}

          {/* Milestones list */}
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
            }}
            role="list"
          >
            {milestones.map((milestone, index) => (
              <MilestoneItem
                key={`${milestone.threshold}-${milestone.date.getTime()}`}
                milestone={milestone}
                isLast={index === milestones.length - 1}
              />
            ))}
          </ul>
        </div>
      ) : (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '14px',
          }}
          data-testid="timeline-empty"
        >
          No milestones yet. Keep building your trust!
        </div>
      )}
    </div>
  )
}
