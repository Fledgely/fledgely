'use client'

/**
 * DemoFlagResolution Component - Story 8.5.4
 *
 * Displays the resolution status and actions for a flagged item.
 *
 * Acceptance Criteria:
 * - AC5: Resolution flow demonstration (parent reviewed, resolved)
 */

import type { DemoFlagResolution as DemoFlagResolutionType } from '../../../data/demoData'
import {
  FLAG_RESOLUTION_STATUS_LABELS,
  FLAG_RESOLUTION_STATUS_COLORS,
  FLAG_RESOLUTION_ACTION_LABELS,
} from '../../../data/demoData'
import { formatRelativeTime } from '../../../utils/formatTime'

export interface DemoFlagResolutionProps {
  /** The resolution data to display */
  resolution: DemoFlagResolutionType
  /** Whether to show in compact mode */
  compact?: boolean
}

/**
 * Status icon based on resolution status
 */
function StatusIcon({ status }: { status: DemoFlagResolutionType['status'] }) {
  const icons = {
    pending: '⏳',
    reviewed: '👀',
    resolved: '✅',
  }

  return (
    <span
      data-testid="status-icon"
      style={{
        fontSize: '18px',
      }}
    >
      {icons[status]}
    </span>
  )
}

/**
 * Action icon based on resolution action
 */
function ActionIcon({ action }: { action: NonNullable<DemoFlagResolutionType['action']> }) {
  const icons = {
    talked: '💬',
    dismissed: '❌',
    false_positive: '🔄',
  }

  return (
    <span
      data-testid="action-icon"
      style={{
        fontSize: '14px',
      }}
    >
      {icons[action]}
    </span>
  )
}

/**
 * DemoFlagResolution - Displays resolution status and action
 */
export function DemoFlagResolution({ resolution, compact = false }: DemoFlagResolutionProps) {
  const { status, action, resolvedAt, note } = resolution

  if (compact) {
    return (
      <div
        data-testid="demo-flag-resolution"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span
          data-testid="resolution-status-badge"
          style={{
            backgroundColor: FLAG_RESOLUTION_STATUS_COLORS[status],
            color: '#fff',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <StatusIcon status={status} />
          {FLAG_RESOLUTION_STATUS_LABELS[status]}
        </span>
        {action && (
          <span
            data-testid="resolution-action-badge"
            style={{
              backgroundColor: '#f3f4f6',
              color: '#374151',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <ActionIcon action={action} />
            {FLAG_RESOLUTION_ACTION_LABELS[action]}
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      data-testid="demo-flag-resolution"
      style={{
        backgroundColor:
          status === 'resolved' ? '#f0fdf4' : status === 'reviewed' ? '#eff6ff' : '#faf5ff',
        border: `2px dashed ${status === 'resolved' ? '#86efac' : status === 'reviewed' ? '#93c5fd' : '#c4b5fd'}`,
        borderRadius: '12px',
        padding: '14px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <StatusIcon status={status} />
          <span
            data-testid="resolution-status-label"
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color:
                status === 'resolved' ? '#166534' : status === 'reviewed' ? '#1e40af' : '#5b21b6',
            }}
          >
            {FLAG_RESOLUTION_STATUS_LABELS[status]}
          </span>
        </div>
        <span
          data-testid="demo-badge"
          style={{
            backgroundColor:
              status === 'resolved' ? '#22c55e' : status === 'reviewed' ? '#3b82f6' : '#8b5cf6',
            color: '#fff',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '10px',
            fontWeight: 600,
          }}
        >
          🎭 Demo
        </span>
      </div>

      {/* Action and timestamp */}
      {(action || resolvedAt) && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontSize: '13px',
            color: '#374151',
          }}
        >
          {action && (
            <div
              data-testid="resolution-action"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <ActionIcon action={action} />
              <span>{FLAG_RESOLUTION_ACTION_LABELS[action]}</span>
            </div>
          )}
          {resolvedAt && (
            <div
              data-testid="resolution-timestamp"
              style={{
                fontSize: '12px',
                color: '#6b7280',
              }}
            >
              {formatRelativeTime(resolvedAt)}
            </div>
          )}
        </div>
      )}

      {/* Note */}
      {note && (
        <div
          data-testid="resolution-note"
          style={{
            marginTop: '10px',
            paddingTop: '10px',
            borderTop: '1px solid rgba(0, 0, 0, 0.1)',
            fontSize: '12px',
            color: '#6b7280',
            fontStyle: 'italic',
          }}
        >
          Note: {note}
        </div>
      )}

      {/* Pending action hint */}
      {status === 'pending' && (
        <div
          data-testid="pending-hint"
          style={{
            marginTop: '10px',
            fontSize: '12px',
            color: '#7c3aed',
            fontStyle: 'italic',
          }}
        >
          This flag is waiting for your review
        </div>
      )}
    </div>
  )
}
