/**
 * FocusModeActiveCard Component - Story 33.1
 *
 * Shows active focus session with countdown timer.
 * Child-friendly design with encouraging messaging.
 */

import { FOCUS_MODE_MESSAGES, type FocusModeSession } from '@fledgely/shared'

interface FocusModeActiveCardProps {
  session: FocusModeSession
  timeRemainingMs: number | null
  timeRemainingFormatted: string | null
  onStop: () => void
  loading?: boolean
}

/**
 * Calculate progress percentage (0-100)
 */
function calculateProgress(session: FocusModeSession, timeRemainingMs: number | null): number {
  if (!session.durationMs || timeRemainingMs === null) return 0
  const elapsed = session.durationMs - timeRemainingMs
  return Math.min(100, Math.max(0, (elapsed / session.durationMs) * 100))
}

export function FocusModeActiveCard({
  session,
  timeRemainingMs,
  timeRemainingFormatted,
  onStop,
  loading = false,
}: FocusModeActiveCardProps) {
  const progress = calculateProgress(session, timeRemainingMs)
  const isUntilOff = session.durationType === 'untilOff'

  return (
    <div
      data-testid="focus-mode-active-card"
      style={{
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        borderRadius: 20,
        padding: 24,
        color: 'white',
        boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 32 }}>🎯</span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{FOCUS_MODE_MESSAGES.active}</div>
            <div style={{ fontSize: 14, opacity: 0.9 }}>
              {FOCUS_MODE_MESSAGES.durationLabels[session.durationType]}
            </div>
          </div>
        </div>
        <span style={{ fontSize: 40 }}>✨</span>
      </div>

      {/* Timer Display */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.15)',
          borderRadius: 16,
          padding: 20,
          marginBottom: 16,
          textAlign: 'center',
        }}
      >
        {isUntilOff ? (
          <>
            <div
              data-testid="focus-mode-unlimited"
              style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}
            >
              Focus until you&apos;re ready!
            </div>
            <div style={{ fontSize: 14, opacity: 0.9 }}>
              Take your time - you&apos;re doing great
            </div>
          </>
        ) : (
          <>
            <div
              data-testid="focus-mode-timer"
              style={{ fontSize: 48, fontWeight: 700, fontFamily: 'monospace' }}
            >
              {timeRemainingFormatted || '--:--'}
            </div>
            <div style={{ fontSize: 14, opacity: 0.9 }}>
              {timeRemainingMs !== null && timeRemainingMs > 0
                ? FOCUS_MODE_MESSAGES.timeRemaining(Math.ceil(timeRemainingMs / (60 * 1000)))
                : 'Almost done!'}
            </div>
          </>
        )}
      </div>

      {/* Progress Bar (only for timed sessions) */}
      {!isUntilOff && (
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 10,
            height: 12,
            marginBottom: 20,
            overflow: 'hidden',
          }}
        >
          <div
            data-testid="focus-mode-progress"
            style={{
              background: 'white',
              height: '100%',
              borderRadius: 10,
              width: `${progress}%`,
              transition: 'width 1s linear',
            }}
          />
        </div>
      )}

      {/* Encouraging Message */}
      <div
        style={{
          textAlign: 'center',
          fontSize: 16,
          marginBottom: 20,
          padding: '12px 16px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 12,
        }}
      >
        🌟 You&apos;re doing amazing! Keep it up!
      </div>

      {/* Stop Button */}
      <button
        data-testid="focus-mode-stop"
        onClick={onStop}
        disabled={loading}
        style={{
          width: '100%',
          padding: '14px 20px',
          background: 'rgba(255, 255, 255, 0.2)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          borderRadius: 12,
          color: 'white',
          fontSize: 16,
          fontWeight: 600,
          cursor: loading ? 'wait' : 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
        }}
      >
        {loading ? 'Ending...' : "I'm done focusing"}
      </button>

      {/* Non-punitive message */}
      <div
        style={{
          textAlign: 'center',
          fontSize: 12,
          opacity: 0.8,
          marginTop: 12,
        }}
      >
        It&apos;s okay to stop early - you can always start again!
      </div>
    </div>
  )
}
