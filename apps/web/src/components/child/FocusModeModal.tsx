/**
 * FocusModeModal Component - Story 33.1
 *
 * Modal for selecting focus mode duration.
 * Shows duration options: 25min, 1h, 2h, Until I turn off.
 */

import { FOCUS_MODE_MESSAGES, type FocusModeDuration } from '@fledgely/shared'

interface FocusModeModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectDuration: (duration: FocusModeDuration) => void
  loading?: boolean
}

const DURATION_OPTIONS: { value: FocusModeDuration; icon: string }[] = [
  { value: 'pomodoro', icon: '🍅' },
  { value: 'oneHour', icon: '⏰' },
  { value: 'twoHours', icon: '📚' },
  { value: 'untilOff', icon: '🎯' },
]

export function FocusModeModal({
  isOpen,
  onClose,
  onSelectDuration,
  loading = false,
}: FocusModeModalProps) {
  if (!isOpen) return null

  return (
    <div
      data-testid="focus-mode-modal"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 20,
          padding: 24,
          maxWidth: 360,
          width: '100%',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎯</div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#1e293b',
              margin: 0,
            }}
          >
            {FOCUS_MODE_MESSAGES.startPrompt}
          </h2>
        </div>

        {/* Duration Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {DURATION_OPTIONS.map((option) => (
            <button
              key={option.value}
              data-testid={`duration-${option.value}`}
              onClick={() => onSelectDuration(option.value)}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px 20px',
                background: '#f8fafc',
                border: '2px solid #e2e8f0',
                borderRadius: 12,
                cursor: loading ? 'wait' : 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ede9fe'
                e.currentTarget.style.borderColor = '#a78bfa'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f8fafc'
                e.currentTarget.style.borderColor = '#e2e8f0'
              }}
            >
              <span style={{ fontSize: 28 }}>{option.icon}</span>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#1e293b',
                }}
              >
                {FOCUS_MODE_MESSAGES.durationLabels[option.value]}
              </span>
            </button>
          ))}
        </div>

        {/* Cancel Button */}
        <button
          data-testid="focus-mode-cancel"
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: 16,
            padding: '12px 16px',
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}
