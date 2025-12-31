'use client'

/**
 * DemoScreenshotCard Component - Story 8.5.2
 *
 * Displays a single demo screenshot with classification information.
 * Shows category badge, confidence score, and flag indicator.
 *
 * Acceptance Criteria:
 * - AC1: Category variety display
 * - AC2: AI classification and confidence score
 * - AC3: Flagging demonstration
 * - AC5: Safe content (generated images)
 */

import type { DemoScreenshot, DemoScreenshotCategory } from '../../../data/demoData'
import { getConfidenceLevel, getConfidenceLevelLabel } from '../../../data/demoData'
import { formatRelativeTime } from '../../../utils/formatTime'

export interface DemoScreenshotCardProps {
  screenshot: DemoScreenshot
}

/**
 * Category colors for badges
 */
const categoryColors: Record<DemoScreenshotCategory, { bg: string; text: string; border: string }> =
  {
    homework: { bg: '#dcfce7', text: '#166534', border: '#86efac' }, // Green
    gaming: { bg: '#f3e8ff', text: '#7e22ce', border: '#c4b5fd' }, // Purple
    social: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' }, // Blue
    video: { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' }, // Orange
    creative: { bg: '#fce7f3', text: '#be185d', border: '#f9a8d4' }, // Pink
  }

/**
 * Confidence color based on level
 */
const confidenceColors = {
  high: '#16a34a', // Green
  medium: '#2563eb', // Blue
  low: '#ca8a04', // Yellow/amber
}

/**
 * DemoScreenshotCard - Single screenshot card component
 */
export function DemoScreenshotCard({ screenshot }: DemoScreenshotCardProps) {
  const categoryStyle = categoryColors[screenshot.category]
  const confidenceLevel = getConfidenceLevel(screenshot.classification.confidence)
  const confidencePercent = Math.round(screenshot.classification.confidence * 100)
  const confidenceLabel = getConfidenceLevelLabel(screenshot.classification.confidence)
  const relativeTime = formatRelativeTime(screenshot.timestamp)

  return (
    <div
      data-testid={`demo-screenshot-card-${screenshot.id}`}
      style={{
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#fff',
        border: screenshot.flagged ? '2px solid #f97316' : '1px solid #e5e7eb',
        boxShadow: screenshot.flagged
          ? '0 0 0 2px rgba(249, 115, 22, 0.2)'
          : '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Thumbnail with Demo Data watermark */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16/9',
          backgroundColor: '#f3f4f6',
        }}
      >
        <img
          src={screenshot.thumbnailDataUri}
          alt={`${screenshot.title} - Demo screenshot`}
          data-testid="screenshot-thumbnail"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        {/* Demo Data watermark - AC5 */}
        <div
          data-testid="demo-watermark"
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            backgroundColor: 'rgba(139, 92, 246, 0.9)',
            color: '#fff',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 600,
          }}
        >
          Demo Data
        </div>

        {/* Flag indicator - AC3 */}
        {screenshot.flagged && (
          <div
            data-testid="flag-indicator"
            style={{
              position: 'absolute',
              top: '4px',
              left: '4px',
              backgroundColor: '#f97316',
              color: '#fff',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>🚩</span>
            <span>Flagged</span>
          </div>
        )}
      </div>

      {/* Card content */}
      <div style={{ padding: '12px' }}>
        {/* Title and timestamp */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '8px',
          }}
        >
          <h4
            data-testid="screenshot-title"
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 600,
              color: '#1f2937',
            }}
          >
            {screenshot.title}
          </h4>
          <span
            data-testid="screenshot-timestamp"
            style={{
              fontSize: '11px',
              color: '#6b7280',
              flexShrink: 0,
              marginLeft: '8px',
            }}
          >
            {relativeTime}
          </span>
        </div>

        {/* Category badge - AC1 */}
        <div
          data-testid="category-badge"
          style={{
            display: 'inline-block',
            backgroundColor: categoryStyle.bg,
            color: categoryStyle.text,
            border: `1px solid ${categoryStyle.border}`,
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 500,
            marginBottom: '8px',
          }}
        >
          {screenshot.classification.label}
        </div>

        {/* Confidence score - AC2 */}
        <div
          data-testid="confidence-display"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              flex: 1,
              height: '4px',
              backgroundColor: '#e5e7eb',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              data-testid="confidence-bar"
              style={{
                width: `${confidencePercent}%`,
                height: '100%',
                backgroundColor: confidenceColors[confidenceLevel],
                borderRadius: '2px',
              }}
            />
          </div>
          <span
            data-testid="confidence-value"
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: confidenceColors[confidenceLevel],
              minWidth: '35px',
            }}
          >
            {confidencePercent}%
          </span>
        </div>

        {/* Confidence level label */}
        <div
          data-testid="confidence-label"
          style={{
            fontSize: '10px',
            color: '#6b7280',
            marginTop: '2px',
          }}
        >
          {confidenceLabel}
        </div>

        {/* Flag reason - AC3 */}
        {screenshot.flagged && screenshot.flagReason && (
          <div
            data-testid="flag-reason"
            style={{
              marginTop: '8px',
              padding: '8px',
              backgroundColor: '#fff7ed',
              border: '1px solid #fed7aa',
              borderRadius: '6px',
              fontSize: '11px',
              color: '#9a3412',
              lineHeight: 1.4,
            }}
          >
            {screenshot.flagReason}
          </div>
        )}
      </div>
    </div>
  )
}
