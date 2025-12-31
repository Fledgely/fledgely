'use client'

/**
 * DemoFlagCard Component - Story 8.5.4
 *
 * Displays a single flagged content item with AI reasoning and confidence.
 *
 * Acceptance Criteria:
 * - AC2: Flag shows screenshot, AI reasoning, confidence level
 * - AC6: Tone demonstrates "conversation starter, not accusation" framing
 */

import type { DemoFlag, DemoScreenshot } from '../../../data/demoData'
import {
  FLAG_CONCERN_TYPE_LABELS,
  FLAG_CONCERN_TYPE_COLORS,
  FLAG_RESOLUTION_STATUS_LABELS,
  FLAG_RESOLUTION_STATUS_COLORS,
  getConfidenceLevel,
  getConfidenceLevelLabel,
  getScreenshotForFlag,
} from '../../../data/demoData'
import { formatRelativeTime } from '../../../utils/formatTime'

export interface DemoFlagCardProps {
  /** The flag to display */
  flag: DemoFlag
  /** Optional custom screenshot (defaults to looking up by screenshotId) */
  screenshot?: DemoScreenshot
  /** Whether to show expanded details */
  expanded?: boolean
  /** Callback when card is clicked */
  onClick?: () => void
}

/**
 * Confidence badge component
 */
function ConfidenceBadge({ confidence }: { confidence: number }) {
  const level = getConfidenceLevel(confidence)
  const label = getConfidenceLevelLabel(confidence)

  const colors = {
    high: { bg: '#dcfce7', text: '#166534' },
    medium: { bg: '#fef3c7', text: '#92400e' },
    low: { bg: '#fee2e2', text: '#991b1b' },
  }

  return (
    <span
      data-testid="confidence-badge"
      style={{
        backgroundColor: colors[level].bg,
        color: colors[level].text,
        padding: '2px 8px',
        borderRadius: '10px',
        fontSize: '10px',
        fontWeight: 600,
      }}
    >
      {label} ({Math.round(confidence * 100)}%)
    </span>
  )
}

/**
 * Concern type badge component
 */
function ConcernTypeBadge({ concernType }: { concernType: DemoFlag['concernType'] }) {
  return (
    <span
      data-testid="concern-type-badge"
      style={{
        backgroundColor: FLAG_CONCERN_TYPE_COLORS[concernType],
        color: '#fff',
        padding: '2px 8px',
        borderRadius: '10px',
        fontSize: '10px',
        fontWeight: 600,
      }}
    >
      {FLAG_CONCERN_TYPE_LABELS[concernType]}
    </span>
  )
}

/**
 * Resolution status badge component
 */
function ResolutionStatusBadge({ status }: { status: DemoFlag['resolution']['status'] }) {
  return (
    <span
      data-testid="resolution-status-badge"
      style={{
        backgroundColor: FLAG_RESOLUTION_STATUS_COLORS[status],
        color: '#fff',
        padding: '2px 8px',
        borderRadius: '10px',
        fontSize: '10px',
        fontWeight: 600,
      }}
    >
      {FLAG_RESOLUTION_STATUS_LABELS[status]}
    </span>
  )
}

/**
 * DemoFlagCard - Displays a flagged item with AI reasoning
 */
export function DemoFlagCard({
  flag,
  screenshot: propScreenshot,
  expanded = false,
  onClick,
}: DemoFlagCardProps) {
  // Get screenshot for this flag
  const screenshot = propScreenshot ?? getScreenshotForFlag(flag)

  // Format timestamp
  const flagDate = new Date(flag.createdAt)
  const timeAgo = formatRelativeTime(flag.createdAt)

  return (
    <div
      data-testid="demo-flag-card"
      onClick={onClick}
      style={{
        backgroundColor: '#faf5ff',
        border: '2px dashed #c4b5fd',
        borderRadius: '12px',
        padding: '16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ConcernTypeBadge concernType={flag.concernType} />
            <ResolutionStatusBadge status={flag.resolution.status} />
          </div>
          <span
            data-testid="flag-timestamp"
            style={{
              fontSize: '11px',
              color: '#6b7280',
            }}
          >
            {timeAgo}
          </span>
        </div>
        <span
          data-testid="demo-badge"
          style={{
            backgroundColor: '#8b5cf6',
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

      {/* Screenshot thumbnail (if available) */}
      {screenshot && (
        <div
          data-testid="flag-screenshot"
          style={{
            marginBottom: '12px',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: '#f3f4f6',
          }}
        >
          <img
            src={screenshot.thumbnailDataUri}
            alt={screenshot.title}
            style={{
              width: '100%',
              height: '120px',
              objectFit: 'cover',
            }}
          />
          <div
            style={{
              padding: '8px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#374151',
            }}
          >
            {screenshot.title}
          </div>
        </div>
      )}

      {/* AI Reasoning (AC2, AC6) */}
      <div
        data-testid="ai-reasoning"
        style={{
          backgroundColor: '#f3e8ff',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '8px',
          }}
        >
          <span style={{ fontSize: '14px' }}>💬</span>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#5b21b6',
            }}
          >
            AI Insight
          </span>
          <ConfidenceBadge confidence={flag.confidence} />
        </div>
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            color: '#374151',
            lineHeight: 1.5,
          }}
        >
          {flag.aiReasoning}
        </p>
      </div>

      {/* Child annotation (if present) */}
      {flag.annotation && (
        <div
          data-testid="child-annotation"
          style={{
            backgroundColor: '#fef3c7',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: expanded ? '12px' : 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '6px',
            }}
          >
            <span style={{ fontSize: '14px' }}>👤</span>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#92400e',
              }}
            >
              {flag.annotation.fromChild ? "Alex's Response" : 'Note'}
            </span>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: '#78350f',
              fontStyle: 'italic',
            }}
          >
            &ldquo;{flag.annotation.text}&rdquo;
          </p>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div
          data-testid="expanded-details"
          style={{
            paddingTop: '12px',
            borderTop: '1px solid #e9d5ff',
            fontSize: '12px',
            color: '#6b7280',
          }}
        >
          <div>
            <strong>Flag ID:</strong> {flag.id}
          </div>
          <div>
            <strong>Created:</strong> {flagDate.toLocaleString()}
          </div>
          {flag.resolution.resolvedAt && (
            <div>
              <strong>Resolved:</strong> {new Date(flag.resolution.resolvedAt).toLocaleString()}
            </div>
          )}
          {flag.resolution.note && (
            <div>
              <strong>Note:</strong> {flag.resolution.note}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
