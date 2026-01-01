/**
 * NegotiationHistory Component - Story 34.3 (AC5, AC6)
 *
 * Timeline view of negotiation rounds with proposals and responses.
 * Shows who responded, when, and their comments.
 */

import { useState } from 'react'
import type { TimelineEntry } from '../../hooks/useNegotiationHistory'

interface NegotiationHistoryProps {
  timeline: TimelineEntry[]
  currentRound: number
}

/**
 * Format timestamp to readable date string
 */
function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Get action display info
 */
function getActionDisplay(action?: 'accept' | 'decline' | 'counter'): {
  label: string
  color: string
  bg: string
} {
  switch (action) {
    case 'accept':
      return { label: 'Accepted', color: '#16a34a', bg: '#dcfce7' }
    case 'decline':
      return { label: 'Declined', color: '#dc2626', bg: '#fee2e2' }
    case 'counter':
      return { label: 'Counter-proposed', color: '#2563eb', bg: '#dbeafe' }
    default:
      return { label: 'Proposed', color: '#6b7280', bg: '#f3f4f6' }
  }
}

export function NegotiationHistory({ timeline, currentRound }: NegotiationHistoryProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Empty state
  if (timeline.length === 0) {
    return (
      <div
        style={{
          background: '#f8fafc',
          borderRadius: 12,
          padding: 24,
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#64748b', margin: 0 }}>No history yet</p>
      </div>
    )
  }

  // Calculate rounds - each counter-proposal increments
  let roundNumber = 1
  const entriesWithRounds = timeline.map((entry, index) => {
    const entryRound = roundNumber
    if (entry.action === 'counter') {
      roundNumber++
    }
    return { entry, round: entryRound, isFirst: index === 0 }
  })

  const showCollapseToggle = timeline.length > 3
  const displayedEntries = isCollapsed ? entriesWithRounds.slice(-2) : entriesWithRounds

  return (
    <section
      style={{
        background: '#f8fafc',
        borderRadius: 12,
        padding: 20,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h4
          role="heading"
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#64748b',
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Negotiation History
        </h4>

        {currentRound > 1 && (
          <span
            style={{
              padding: '4px 12px',
              background: '#dbeafe',
              color: '#2563eb',
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Round {currentRound}
          </span>
        )}
      </div>

      {/* Collapse toggle */}
      {showCollapseToggle && (
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Show all entries' : 'Collapse entries'}
          style={{
            width: '100%',
            padding: 8,
            marginBottom: 12,
            background: 'transparent',
            border: '1px dashed #cbd5e1',
            borderRadius: 8,
            color: '#64748b',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {isCollapsed
            ? `Show all ${timeline.length} entries`
            : `Hide older entries (${timeline.length - 2} more)`}
        </button>
      )}

      {/* Timeline */}
      <ul
        role="list"
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {displayedEntries.map(({ entry, round }, index) => {
          const actionDisplay =
            entry.type === 'proposal'
              ? { label: 'Initial Proposal', color: '#6b7280', bg: '#f3f4f6' }
              : getActionDisplay(entry.action)

          const showRoundBadge = entry.action === 'counter' && round > 1

          return (
            <li
              key={entry.id}
              role="listitem"
              style={{
                background: '#fff',
                borderRadius: 10,
                padding: 16,
                border: '1px solid #e2e8f0',
                position: 'relative',
              }}
            >
              {/* Timeline connector */}
              {index < displayedEntries.length - 1 && (
                <div
                  style={{
                    position: 'absolute',
                    left: 24,
                    bottom: -12,
                    width: 2,
                    height: 12,
                    background: '#cbd5e1',
                  }}
                />
              )}

              {/* Entry header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Actor avatar placeholder */}
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: entry.type === 'proposal' ? '#e0e7ff' : '#fef3c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 600,
                      color: entry.type === 'proposal' ? '#4f46e5' : '#b45309',
                    }}
                  >
                    {entry.actorName.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{entry.actorName}</span>
                    <span
                      style={{
                        marginLeft: 8,
                        padding: '2px 8px',
                        background: actionDisplay.bg,
                        color: actionDisplay.color,
                        borderRadius: 9999,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {actionDisplay.label}
                    </span>
                    {showRoundBadge && (
                      <span
                        style={{
                          marginLeft: 8,
                          padding: '2px 8px',
                          background: '#f0fdf4',
                          color: '#15803d',
                          borderRadius: 9999,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        Round {round}
                      </span>
                    )}
                  </div>
                </div>

                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  {formatTimestamp(entry.timestamp)}
                </span>
              </div>

              {/* Comment */}
              {entry.comment && (
                <p
                  style={{
                    margin: 0,
                    marginBottom: entry.changes?.length ? 8 : 0,
                    color: '#475569',
                    fontSize: 14,
                    lineHeight: 1.5,
                    paddingLeft: 40,
                  }}
                >
                  &quot;{entry.comment}&quot;
                </p>
              )}

              {/* Changes indicator */}
              {entry.changes && entry.changes.length > 0 && (
                <div
                  style={{
                    paddingLeft: 40,
                    marginTop: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: '#64748b',
                      background: '#f1f5f9',
                      padding: '4px 8px',
                      borderRadius: 4,
                    }}
                  >
                    {entry.changes.length} change{entry.changes.length > 1 ? 's' : ''} proposed
                  </span>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
