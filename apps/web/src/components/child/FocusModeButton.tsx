/**
 * FocusModeButton Component - Story 33.1
 *
 * One-tap focus mode button for child dashboard.
 * Opens duration selection modal when clicked.
 */

import { FOCUS_MODE_MESSAGES } from '@fledgely/shared'

interface FocusModeButtonProps {
  onClick: () => void
  disabled?: boolean
  isActive?: boolean
}

export function FocusModeButton({
  onClick,
  disabled = false,
  isActive = false,
}: FocusModeButtonProps) {
  return (
    <button
      data-testid="focus-mode-button"
      onClick={onClick}
      disabled={disabled || isActive}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        width: '100%',
        padding: '16px 24px',
        background: isActive
          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
          : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        border: 'none',
        borderRadius: 16,
        cursor: disabled || isActive ? 'default' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: '0 4px 14px rgba(139, 92, 246, 0.3)',
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isActive) {
          e.currentTarget.style.transform = 'scale(1.02)'
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(139, 92, 246, 0.4)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.boxShadow = '0 4px 14px rgba(139, 92, 246, 0.3)'
      }}
    >
      <span style={{ fontSize: 28 }}>{isActive ? '✅' : '🎯'}</span>
      <div style={{ textAlign: 'left' }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: 'white',
          }}
        >
          {isActive ? FOCUS_MODE_MESSAGES.active : 'Focus Mode'}
        </div>
        <div
          style={{
            fontSize: 14,
            color: 'rgba(255, 255, 255, 0.8)',
            marginTop: 2,
          }}
        >
          {isActive ? 'In progress...' : 'Tap to start focusing'}
        </div>
      </div>
    </button>
  )
}
