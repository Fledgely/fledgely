/**
 * ChildFocusModeCard Component - Story 33.1 (AC5)
 *
 * Parent view showing child's focus mode status.
 * Provides transparency without control (AC5 requirement).
 */

import { FOCUS_MODE_MESSAGES, type FocusModeSession } from '@fledgely/shared'

interface ChildFocusModeCardProps {
  childName: string
  isActive: boolean
  currentSession: FocusModeSession | null
  timeRemainingFormatted: string | null
  totalSessionsToday: number
  totalFocusTimeToday: number
  loading?: boolean
}

/**
 * Format milliseconds as human-readable duration
 */
function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (60 * 60 * 1000))
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }
  return `${minutes}m`
}

export function ChildFocusModeCard({
  childName,
  isActive,
  currentSession,
  timeRemainingFormatted,
  totalSessionsToday,
  totalFocusTimeToday,
  loading = false,
}: ChildFocusModeCardProps) {
  if (loading) {
    return (
      <div
        data-testid="child-focus-mode-card-loading"
        style={{
          background: '#f8fafc',
          borderRadius: 16,
          padding: 20,
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ color: '#94a3b8', textAlign: 'center' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div
      data-testid="child-focus-mode-card"
      style={{
        background: isActive ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' : '#ffffff',
        borderRadius: 16,
        padding: 20,
        border: isActive ? '2px solid #10b981' : '1px solid #e2e8f0',
        marginBottom: 16,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>{isActive ? '🎯' : '📚'}</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
              {childName}&apos;s Focus Mode
            </div>
            <div
              data-testid="focus-mode-status"
              style={{
                fontSize: 14,
                color: isActive ? '#059669' : '#64748b',
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {isActive ? FOCUS_MODE_MESSAGES.active : 'Not currently focusing'}
            </div>
          </div>
        </div>

        {/* Status badge */}
        {isActive && (
          <div
            data-testid="focus-mode-active-badge"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: '#10b981',
              borderRadius: 20,
              color: 'white',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <span style={{ fontSize: 10 }}>●</span>
            <span>Active</span>
          </div>
        )}
      </div>

      {/* Active session details */}
      {isActive && currentSession && (
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.7)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>Duration</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
                {FOCUS_MODE_MESSAGES.durationLabels[currentSession.durationType]}
              </div>
            </div>

            {currentSession.durationType !== 'untilOff' && timeRemainingFormatted && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>
                  Time Remaining
                </div>
                <div
                  data-testid="time-remaining"
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: '#059669',
                    fontFamily: 'monospace',
                  }}
                >
                  {timeRemainingFormatted}
                </div>
              </div>
            )}

            {currentSession.durationType === 'untilOff' && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>Duration</div>
                <div
                  data-testid="unlimited-mode"
                  style={{ fontSize: 14, fontWeight: 600, color: '#059669' }}
                >
                  Until they&apos;re ready
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Daily stats */}
      <div
        style={{
          display: 'flex',
          gap: 16,
        }}
      >
        <div
          style={{
            flex: 1,
            background: '#f8fafc',
            borderRadius: 12,
            padding: 12,
            textAlign: 'center',
          }}
        >
          <div
            data-testid="sessions-today"
            style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}
          >
            {totalSessionsToday}
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Sessions today</div>
        </div>

        <div
          style={{
            flex: 1,
            background: '#f8fafc',
            borderRadius: 12,
            padding: 12,
            textAlign: 'center',
          }}
        >
          <div
            data-testid="focus-time-today"
            style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}
          >
            {totalFocusTimeToday > 0 ? formatDuration(totalFocusTimeToday) : '0m'}
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Focus time today</div>
        </div>
      </div>

      {/* Transparency note */}
      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: '#f0f9ff',
          borderRadius: 8,
          fontSize: 12,
          color: '#0369a1',
          textAlign: 'center',
        }}
      >
        {childName} can start and stop focus mode on their own. You&apos;ll see their progress here.
      </div>
    </div>
  )
}
