'use client'

/**
 * FlagInfoPanel Component - Story 22.2
 *
 * Displays flag metadata: category, severity, confidence, timestamp, device info.
 *
 * Acceptance Criteria:
 * - AC3: Category and severity prominently displayed
 * - AC4: Confidence score shown with explanation
 * - AC5: Timestamp, device info, and child's name visible
 */

import type { FlagDocument, ConcernCategory, ConcernSeverity } from '@fledgely/shared'

export interface FlagInfoPanelProps {
  /** The flag document to display */
  flag: FlagDocument
  /** Child's name */
  childName: string
  /** Device name (optional) */
  deviceName?: string
}

/**
 * Category display configuration
 * Matches FlagCard.tsx for consistency
 */
const CATEGORY_CONFIG: Record<ConcernCategory, { label: string; color: string; bg: string }> = {
  Violence: { label: 'Violence', color: '#dc2626', bg: '#fef2f2' },
  'Adult Content': { label: 'Adult Content', color: '#c026d3', bg: '#fdf4ff' },
  Bullying: { label: 'Bullying', color: '#ea580c', bg: '#fff7ed' },
  'Self-Harm Indicators': { label: 'Self-Harm', color: '#dc2626', bg: '#fef2f2' },
  'Explicit Language': { label: 'Explicit Language', color: '#ca8a04', bg: '#fefce8' },
  'Unknown Contacts': { label: 'Unknown Contacts', color: '#0891b2', bg: '#ecfeff' },
}

/**
 * Severity badge configuration
 * Matches FlagCard.tsx for consistency
 */
const SEVERITY_CONFIG: Record<ConcernSeverity, { label: string; color: string; bg: string }> = {
  high: { label: 'High', color: '#dc2626', bg: '#fef2f2' },
  medium: { label: 'Medium', color: '#ca8a04', bg: '#fefce8' },
  low: { label: 'Low', color: '#16a34a', bg: '#f0fdf4' },
}

/**
 * Get explanation for confidence score
 */
function getConfidenceExplanation(confidence: number): string {
  if (confidence >= 90) return 'Very high confidence in this detection'
  if (confidence >= 70) return 'High confidence in this detection'
  if (confidence >= 50) return 'Moderate confidence - review carefully'
  return 'Lower confidence - consider context carefully'
}

/**
 * Get color for confidence score
 */
function getConfidenceColor(confidence: number): string {
  if (confidence >= 70) return '#16a34a' // green
  if (confidence >= 50) return '#ca8a04' // yellow
  return '#dc2626' // red
}

/**
 * Format timestamp as readable date/time
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    padding: '16px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 12px',
    borderRadius: '16px',
    fontSize: '13px',
    fontWeight: 600,
  },
  section: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  value: {
    fontSize: '14px',
    color: '#1f2937',
  },
  confidenceRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  confidenceBar: {
    flex: 1,
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden' as const,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  confidenceValue: {
    fontSize: '14px',
    fontWeight: 600,
    minWidth: '48px',
    textAlign: 'right' as const,
  },
  explanation: {
    fontSize: '12px',
    color: '#6b7280',
    fontStyle: 'italic' as const,
  },
  row: {
    display: 'flex',
    gap: '24px',
  },
}

/**
 * FlagInfoPanel - Displays flag metadata
 */
export function FlagInfoPanel({ flag, childName, deviceName }: FlagInfoPanelProps) {
  const categoryConfig = CATEGORY_CONFIG[flag.category]
  const severityConfig = SEVERITY_CONFIG[flag.severity]
  const confidenceColor = getConfidenceColor(flag.confidence)
  const confidenceExplanation = getConfidenceExplanation(flag.confidence)

  return (
    <div style={styles.container} data-testid="flag-info-panel">
      {/* Category and Severity badges - AC #3 */}
      <div style={styles.header}>
        <span
          style={{
            ...styles.badge,
            color: categoryConfig.color,
            backgroundColor: categoryConfig.bg,
          }}
          data-testid="flag-category"
        >
          {categoryConfig.label}
        </span>
        <span
          style={{
            ...styles.badge,
            color: severityConfig.color,
            backgroundColor: severityConfig.bg,
          }}
          data-testid="flag-severity"
        >
          {severityConfig.label} Severity
        </span>
      </div>

      {/* Confidence score - AC #4 */}
      <div style={styles.section}>
        <span style={styles.label}>AI Confidence</span>
        <div style={styles.confidenceRow}>
          <div style={styles.confidenceBar}>
            <div
              style={{
                ...styles.confidenceFill,
                width: `${flag.confidence}%`,
                backgroundColor: confidenceColor,
              }}
              data-testid="confidence-bar"
            />
          </div>
          <span
            style={{ ...styles.confidenceValue, color: confidenceColor }}
            data-testid="confidence-value"
          >
            {flag.confidence}%
          </span>
        </div>
        <span style={styles.explanation} data-testid="confidence-explanation">
          {confidenceExplanation}
        </span>
      </div>

      {/* Context information - AC #5 */}
      <div style={styles.row}>
        <div style={styles.section}>
          <span style={styles.label}>Child</span>
          <span style={styles.value} data-testid="child-name">
            {childName}
          </span>
        </div>
        <div style={styles.section}>
          <span style={styles.label}>When</span>
          <span style={styles.value} data-testid="timestamp">
            {formatTimestamp(flag.createdAt)}
          </span>
        </div>
      </div>

      {deviceName && (
        <div style={styles.section}>
          <span style={styles.label}>Device</span>
          <span style={styles.value} data-testid="device-name">
            {deviceName}
          </span>
        </div>
      )}
    </div>
  )
}

export default FlagInfoPanel
