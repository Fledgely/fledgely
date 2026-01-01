/**
 * StreakCounterCard Component - Story 32.6
 *
 * Displays the family's offline time streak with celebration milestones.
 * Uses positive reinforcement language - never punitive.
 */

import { STREAK_MESSAGES } from '@fledgely/shared'
import type { OfflineStreak } from '@fledgely/shared'

interface StreakCounterCardProps {
  streak: OfflineStreak | null
  loading?: boolean
  isChildView?: boolean
  celebrationMilestone?: number | null
  onCelebrationDismiss?: () => void
}

/**
 * Get the appropriate icon for the streak
 */
function getStreakIcon(days: number): string {
  if (days >= 100) return '🏆'
  if (days >= 30) return '🔥'
  if (days >= 7) return '⭐'
  if (days >= 1) return '✨'
  return '🌱'
}

/**
 * Get milestone badge if applicable
 */
function getMilestoneBadge(days: number): { icon: string; label: string } | null {
  if (days >= 100) return { icon: '🏆', label: '100 Day Champion!' }
  if (days >= 30) return { icon: '🔥', label: '30 Day Streak!' }
  if (days >= 7) return { icon: '⭐', label: '7 Day Streak!' }
  return null
}

export function StreakCounterCard({
  streak,
  loading = false,
  isChildView = false,
  celebrationMilestone,
  onCelebrationDismiss,
}: StreakCounterCardProps) {
  if (loading) {
    return (
      <div
        data-testid="streak-counter-card"
        style={{
          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
          borderRadius: 16,
          padding: 24,
          textAlign: 'center',
        }}
      >
        <style>
          {`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}
        </style>
        <div
          style={{
            width: 24,
            height: 24,
            border: '2px solid #0ea5e9',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto',
          }}
        />
      </div>
    )
  }

  const currentStreak = streak?.currentStreak ?? 0
  const weeklyHours = streak?.weeklyHours ?? 0
  const streakIcon = getStreakIcon(currentStreak)
  const milestoneBadge = getMilestoneBadge(currentStreak)

  // Show celebration overlay if milestone just reached
  if (celebrationMilestone && onCelebrationDismiss) {
    return (
      <div
        data-testid="streak-celebration"
        style={{
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          borderRadius: 16,
          padding: 32,
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <style>
          {`
            @keyframes float {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
            }
          `}
        </style>
        {/* Confetti effect */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
          }}
        >
          {['🎉', '🎊', '⭐', '✨', '🌟'].map((emoji, i) => (
            <span
              key={i}
              style={{
                position: 'absolute',
                fontSize: 24,
                left: `${15 + i * 18}%`,
                top: `${10 + (i % 3) * 20}%`,
                animation: `float ${2 + i * 0.3}s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }}
            >
              {emoji}
            </span>
          ))}
        </div>

        <div style={{ fontSize: 64, marginBottom: 16 }}>🏆</div>

        <h2
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#92400e',
            marginBottom: 8,
          }}
        >
          {STREAK_MESSAGES.milestoneReached(celebrationMilestone)}
        </h2>

        <p
          style={{
            fontSize: 16,
            color: '#b45309',
            marginBottom: 24,
          }}
        >
          {isChildView
            ? celebrationMilestone === 7
              ? STREAK_MESSAGES.childMilestone7
              : celebrationMilestone === 30
                ? STREAK_MESSAGES.childMilestone30
                : STREAK_MESSAGES.childMilestone100
            : STREAK_MESSAGES.keepGoing}
        </p>

        <button
          onClick={onCelebrationDismiss}
          style={{
            background: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '12px 24px',
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Continue
        </button>
      </div>
    )
  }

  return (
    <div
      data-testid="streak-counter-card"
      style={{
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
        borderRadius: 16,
        padding: 24,
        textAlign: 'center',
      }}
    >
      {/* Streak Icon */}
      <div style={{ fontSize: 48, marginBottom: 8 }}>{streakIcon}</div>

      {/* Main Streak Counter */}
      <h2
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: '#0369a1',
          marginBottom: 4,
        }}
      >
        {currentStreak}
      </h2>

      <p
        style={{
          fontSize: 16,
          color: '#0ea5e9',
          marginBottom: 16,
        }}
      >
        {currentStreak === 0
          ? isChildView
            ? STREAK_MESSAGES.noStreak
            : STREAK_MESSAGES.noStreak
          : isChildView
            ? STREAK_MESSAGES.childStreakMessage
            : STREAK_MESSAGES.streakCounter(currentStreak)}
      </p>

      {/* Milestone Badge */}
      {milestoneBadge && (
        <div
          data-testid="milestone-badge"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: '#fef3c7',
            padding: '8px 16px',
            borderRadius: 20,
            marginBottom: 16,
          }}
        >
          <span>{milestoneBadge.icon}</span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#92400e',
            }}
          >
            {milestoneBadge.label}
          </span>
        </div>
      )}

      {/* Weekly Summary */}
      {weeklyHours > 0 && (
        <div
          data-testid="weekly-summary"
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: '1px solid rgba(14, 165, 233, 0.2)',
          }}
        >
          <p
            style={{
              fontSize: 14,
              color: '#0ea5e9',
            }}
          >
            {STREAK_MESSAGES.weeklySummary(Math.round(weeklyHours))}
          </p>
        </div>
      )}

      {/* Longest Streak (if different from current) */}
      {streak && streak.longestStreak > currentStreak && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: '#64748b',
          }}
        >
          Longest streak: {streak.longestStreak} days
        </div>
      )}
    </div>
  )
}
