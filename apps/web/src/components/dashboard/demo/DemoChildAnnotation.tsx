'use client'

/**
 * DemoChildAnnotation Component - Story 8.5.4
 *
 * Displays a child's annotation/response on a flagged item.
 *
 * Acceptance Criteria:
 * - AC3: Sample flags include child annotation examples ("I was researching for school")
 */

import type { DemoFlagAnnotation } from '../../../data/demoData'
import { formatRelativeTime } from '../../../utils/formatTime'

export interface DemoChildAnnotationProps {
  /** The annotation to display */
  annotation: DemoFlagAnnotation
  /** Child's name (defaults to "Alex") */
  childName?: string
}

/**
 * DemoChildAnnotation - Displays child's explanation/response
 */
export function DemoChildAnnotation({ annotation, childName = 'Alex' }: DemoChildAnnotationProps) {
  const { text, timestamp, fromChild } = annotation
  const relativeTime = formatRelativeTime(timestamp)

  return (
    <div
      data-testid="demo-child-annotation"
      style={{
        backgroundColor: '#fef3c7',
        border: '2px dashed #fbbf24',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            data-testid="annotation-icon"
            style={{
              fontSize: '16px',
              backgroundColor: fromChild ? '#fef3c7' : '#e0f2fe',
              padding: '4px',
              borderRadius: '50%',
            }}
          >
            {fromChild ? '👤' : '📝'}
          </span>
          <span
            data-testid="annotation-author"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#92400e',
            }}
          >
            {fromChild ? `${childName}'s Response` : 'Parent Note'}
          </span>
        </div>
        <span
          data-testid="demo-badge"
          style={{
            backgroundColor: '#fbbf24',
            color: '#78350f',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '10px',
            fontWeight: 600,
          }}
        >
          🎭 Demo
        </span>
      </div>

      {/* Annotation text */}
      <p
        data-testid="annotation-text"
        style={{
          margin: 0,
          fontSize: '14px',
          color: '#78350f',
          fontStyle: 'italic',
          lineHeight: 1.5,
          marginBottom: '8px',
        }}
      >
        &ldquo;{text}&rdquo;
      </p>

      {/* Timestamp */}
      <div
        data-testid="annotation-timestamp"
        style={{
          fontSize: '11px',
          color: '#a16207',
        }}
      >
        {relativeTime}
      </div>
    </div>
  )
}
