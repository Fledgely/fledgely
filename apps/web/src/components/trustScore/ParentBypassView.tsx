'use client'

/**
 * ParentBypassView Component - Story 36.5 Task 5
 *
 * Parent-facing view for child's bypass attempts.
 * AC5: Parent can see bypass attempts with non-punitive framing
 */

import { useState, useMemo } from 'react'
import { type BypassAttempt, type BypassAttemptType } from '@fledgely/shared'
import { BypassAttemptList } from './BypassAttemptList'

// ============================================================================
// Types
// ============================================================================

export interface ParentBypassViewProps {
  /** Array of bypass attempts */
  attempts: BypassAttempt[]
  /** Child's name */
  childName: string
  /** Callback when marking as accidental */
  onMarkAccidental?: (attemptId: string) => void
  /** Show toggle for expired attempts */
  showExpiredToggle?: boolean
}

// ============================================================================
// Constants
// ============================================================================

const TYPE_LABELS: Record<BypassAttemptType, string> = {
  'extension-disable': 'Extension Disabled',
  'settings-change': 'Settings Changed',
  'vpn-detected': 'VPN Detected',
  'proxy-detected': 'Proxy Detected',
  other: 'Other',
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

function getMostCommonType(attempts: BypassAttempt[]): BypassAttemptType | null {
  if (attempts.length === 0) return null

  const counts: Record<string, number> = {}
  for (const a of attempts) {
    counts[a.attemptType] = (counts[a.attemptType] || 0) + 1
  }

  let maxType: BypassAttemptType | null = null
  let maxCount = 0
  for (const [type, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxType = type as BypassAttemptType
      maxCount = count
    }
  }

  return maxType
}

function getFrequencyDescription(attempts: BypassAttempt[]): string {
  if (attempts.length < 2) return ''

  const sorted = [...attempts].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
  const daysBetween =
    (sorted[sorted.length - 1].occurredAt.getTime() - sorted[0].occurredAt.getTime()) /
    (1000 * 60 * 60 * 24)

  const rate = attempts.length / Math.max(daysBetween, 1)

  if (rate >= 1) return 'occurring frequently'
  if (rate >= 0.3) return 'occurring occasionally'
  return 'occurring rarely'
}

// ============================================================================
// Main Component
// ============================================================================

export function ParentBypassView({
  attempts,
  childName,
  onMarkAccidental,
  showExpiredToggle = false,
}: ParentBypassViewProps) {
  const [showExpired, setShowExpired] = useState(false)

  // Calculate active attempts and stats
  const activeAttempts = useMemo(() => attempts.filter((a) => !isExpired(a)), [attempts])

  const totalImpact = useMemo(
    () => activeAttempts.reduce((sum, a) => sum + a.impactOnScore, 0),
    [activeAttempts]
  )

  const earliestExpiry = useMemo(() => getEarliestExpiry(attempts), [attempts])

  const mostCommonType = useMemo(() => getMostCommonType(activeAttempts), [activeAttempts])

  const frequencyDescription = useMemo(
    () => getFrequencyDescription(activeAttempts),
    [activeAttempts]
  )

  const hasAttempts = activeAttempts.length > 0
  const hasPatterns = activeAttempts.length >= 2

  // Conversation starters based on child name
  const conversationStarters = useMemo(
    () => [
      `I noticed some events affected your trust score, ${childName}. Can we talk about what happened?`,
      `${childName}, I'd like to understand better. Was there a reason you needed to do this?`,
      `Let's figure out together how to build your trust score back up, ${childName}.`,
    ],
    [childName]
  )

  // Empty state
  if (!hasAttempts) {
    return (
      <div
        data-testid="parent-bypass-view"
        role="region"
        aria-label={`${childName}'s trust score events`}
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
            Great news! {childName} has no events affecting their trust score.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      data-testid="parent-bypass-view"
      role="region"
      aria-label={`${childName}'s trust score events`}
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

      {/* Parent guidance */}
      <p
        data-testid="parent-guidance"
        style={{
          fontSize: '14px',
          color: '#6b7280',
          marginBottom: '16px',
          lineHeight: 1.5,
        }}
      >
        These events have affected {childName}&apos;s trust score. This is an opportunity to
        understand what happened and have a conversation about trust and responsibility.
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
        <div>
          <span style={{ fontSize: '12px', color: '#92400e', display: 'block' }}>
            Active Events
          </span>
          <span
            data-testid="active-count"
            style={{ fontSize: '24px', fontWeight: 700, color: '#92400e' }}
          >
            {activeAttempts.length}
          </span>
        </div>

        <div>
          <span style={{ fontSize: '12px', color: '#92400e', display: 'block' }}>Total Impact</span>
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
              First Expires
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

      {/* Pattern insights */}
      {hasPatterns && (
        <div
          data-testid="pattern-insights"
          style={{
            padding: '16px',
            backgroundColor: '#eff6ff',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          <h3
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#1e40af',
              marginBottom: '8px',
            }}
          >
            Pattern Insights
          </h3>
          <div style={{ fontSize: '14px', color: '#1e40af' }}>
            {mostCommonType && (
              <p data-testid="common-type" style={{ margin: '0 0 4px 0' }}>
                Most common: {TYPE_LABELS[mostCommonType]}
              </p>
            )}
            <p data-testid="frequency-insight" style={{ margin: 0 }}>
              Events are {frequencyDescription}
            </p>
          </div>
        </div>
      )}

      {/* Conversation starters */}
      <div
        data-testid="conversation-starters"
        style={{
          padding: '16px',
          backgroundColor: '#f0fdf4',
          borderRadius: '8px',
          marginBottom: '16px',
        }}
      >
        <h3
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#166534',
            marginBottom: '8px',
          }}
        >
          Conversation Starters
        </h3>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          {conversationStarters.map((starter, i) => (
            <li
              key={i}
              data-testid="starter-item"
              style={{
                fontSize: '14px',
                color: '#166534',
                marginBottom: i < conversationStarters.length - 1 ? '6px' : 0,
              }}
            >
              &ldquo;{starter}&rdquo;
            </li>
          ))}
        </ul>
      </div>

      {/* Bypass attempt list */}
      <BypassAttemptList
        attempts={showExpired ? attempts : activeAttempts}
        showExpired={showExpired}
        onToggleExpired={showExpiredToggle ? () => setShowExpired(!showExpired) : undefined}
        onMarkAccidental={onMarkAccidental}
        showDescription={false}
        showSummary={false}
      />
    </div>
  )
}
