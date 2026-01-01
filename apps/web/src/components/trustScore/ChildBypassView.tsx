'use client'

/**
 * ChildBypassView Component - Story 36.5 Task 4
 *
 * Child-facing view for their bypass history.
 * AC4: Child can see their own bypass attempt history
 * AC6: Distinguish between intentional bypass vs accidental
 */

import { useMemo } from 'react'
import { type BypassAttempt } from '@fledgely/shared'
import { BypassAttemptList } from './BypassAttemptList'

// ============================================================================
// Types
// ============================================================================

export interface ChildBypassViewProps {
  /** Array of bypass attempts */
  attempts: BypassAttempt[]
  /** Child's name */
  childName: string
  /** Current trust score */
  currentTrustScore?: number
  /** Callback when marking as accidental */
  onMarkAccidental?: (attemptId: string) => void
}

// ============================================================================
// Helpers
// ============================================================================

function isExpired(attempt: BypassAttempt): boolean {
  return new Date() > attempt.expiresAt
}

function getEarliestExpiry(attempts: BypassAttempt[]): Date | null {
  const active = attempts.filter((a) => !isExpired(a))
  if (active.length === 0) return null

  return active.reduce((earliest, a) => {
    return a.expiresAt < earliest ? a.expiresAt : earliest
  }, active[0].expiresAt)
}

function formatExpiryDate(date: Date): string {
  const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (days === 1) return 'tomorrow'
  if (days <= 7) return `in ${days} days`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ============================================================================
// Main Component
// ============================================================================

export function ChildBypassView({
  attempts,
  childName,
  currentTrustScore,
  onMarkAccidental,
}: ChildBypassViewProps) {
  // Calculate active attempts and impact
  const activeAttempts = useMemo(() => attempts.filter((a) => !isExpired(a)), [attempts])

  const totalImpact = useMemo(
    () => activeAttempts.reduce((sum, a) => sum + a.impactOnScore, 0),
    [activeAttempts]
  )

  const earliestExpiry = useMemo(() => getEarliestExpiry(attempts), [attempts])

  const hasAttempts = activeAttempts.length > 0

  // Empty state
  if (!hasAttempts) {
    return (
      <div
        data-testid="child-bypass-view"
        role="region"
        aria-label="Trust score events"
        style={{
          padding: '24px',
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
        }}
      >
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#374151',
            marginBottom: '16px',
          }}
        >
          {childName}&apos;s Trust Score Events
        </h2>

        <div
          data-testid="empty-state"
          style={{
            padding: '32px',
            textAlign: 'center',
            backgroundColor: '#ecfdf5',
            borderRadius: '8px',
          }}
        >
          <span
            style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}
            aria-hidden="true"
          >
            ⭐
          </span>
          <p
            data-testid="positive-message"
            style={{
              fontSize: '16px',
              color: '#047857',
              fontWeight: 500,
              margin: 0,
            }}
          >
            Awesome! No events affecting your trust score.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      data-testid="child-bypass-view"
      role="region"
      aria-label="Trust score events"
      style={{
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
      }}
    >
      {/* Header */}
      <h2
        style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#374151',
          marginBottom: '8px',
        }}
      >
        {childName}&apos;s Trust Score Events
      </h2>

      {/* Educational message */}
      <p
        data-testid="educational-message"
        style={{
          fontSize: '14px',
          color: '#6b7280',
          marginBottom: '16px',
          lineHeight: 1.5,
        }}
      >
        These events have affected your trust score. Building trust takes time, and these events
        will naturally expire. If any were accidents, you can let us know.
      </p>

      {/* Summary card */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '20px',
          padding: '16px',
          backgroundColor: '#fef3c7',
          borderRadius: '8px',
          flexWrap: 'wrap',
        }}
      >
        {currentTrustScore !== undefined && (
          <div>
            <span style={{ fontSize: '12px', color: '#92400e', display: 'block' }}>
              Current Score
            </span>
            <span
              data-testid="current-score"
              style={{ fontSize: '24px', fontWeight: 700, color: '#92400e' }}
            >
              {currentTrustScore}
            </span>
          </div>
        )}

        <div>
          <span style={{ fontSize: '12px', color: '#92400e', display: 'block' }}>
            Active Impact
          </span>
          <span
            data-testid="total-impact"
            style={{ fontSize: '24px', fontWeight: 700, color: '#dc2626' }}
          >
            {totalImpact}
          </span>
        </div>

        {earliestExpiry && (
          <div>
            <span style={{ fontSize: '12px', color: '#92400e', display: 'block' }}>
              First Event Expires
            </span>
            <span
              data-testid="expiry-info"
              style={{ fontSize: '16px', fontWeight: 500, color: '#92400e' }}
            >
              {formatExpiryDate(earliestExpiry)}
            </span>
          </div>
        )}
      </div>

      {/* Accidental explanation */}
      {onMarkAccidental && (
        <div
          data-testid="accidental-explanation"
          style={{
            padding: '12px',
            backgroundColor: '#f0f9ff',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px',
            color: '#0369a1',
          }}
        >
          <strong>Was it an accident?</strong> If any of these happened by mistake, you can mark
          them as accidental. This reduces their impact on your trust score.
        </div>
      )}

      {/* Bypass attempt list */}
      <BypassAttemptList
        attempts={activeAttempts}
        onMarkAccidental={onMarkAccidental}
        showDescription={false}
        showSummary={false}
      />
    </div>
  )
}
