'use client'

/**
 * Reverse Mode Toggle Component - Story 52.2 Task 5
 *
 * Shows current reverse mode status with toggle switch.
 * AC3: Mode switch - child controls what's shared.
 */

import type { ReverseModeStatusValue } from '@fledgely/shared'

interface ReverseModeToggleProps {
  status: ReverseModeStatusValue
  isLoading: boolean
  onToggle: () => void
  disabled?: boolean
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '4px',
  },
  description: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.5,
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '16px',
    fontSize: '13px',
    fontWeight: 500,
    marginTop: '8px',
  },
  statusActive: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  statusOff: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
  toggle: {
    position: 'relative' as const,
    width: '52px',
    height: '28px',
    backgroundColor: '#d1d5db',
    borderRadius: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    border: 'none',
    padding: 0,
    marginLeft: '16px',
    flexShrink: 0,
  },
  toggleActive: {
    backgroundColor: '#22c55e',
  },
  toggleDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  toggleKnob: {
    position: 'absolute' as const,
    top: '4px',
    left: '4px',
    width: '20px',
    height: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '50%',
    transition: 'transform 0.2s',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
  },
  toggleKnobActive: {
    transform: 'translateX(24px)',
  },
  loadingIndicator: {
    width: '16px',
    height: '16px',
    border: '2px solid #e5e7eb',
    borderTopColor: '#22c55e',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
}

export default function ReverseModeToggle({
  status,
  isLoading,
  onToggle,
  disabled = false,
}: ReverseModeToggleProps) {
  const isActive = status === 'active'
  const isDisabled = disabled || isLoading

  return (
    <div style={styles.container}>
      <div style={styles.info}>
        <div style={styles.label}>Reverse Mode</div>
        <div style={styles.description}>
          {isActive
            ? 'You control what your parents can see. By default, nothing is shared.'
            : 'When activated, you control what data is shared with your parents.'}
        </div>
        <div
          style={{
            ...styles.statusBadge,
            ...(isActive ? styles.statusActive : styles.statusOff),
          }}
        >
          <span>{isActive ? '●' : '○'}</span>
          <span>{isActive ? 'Active' : 'Off'}</span>
        </div>
      </div>

      <button
        type="button"
        style={{
          ...styles.toggle,
          ...(isActive ? styles.toggleActive : {}),
          ...(isDisabled ? styles.toggleDisabled : {}),
        }}
        onClick={onToggle}
        disabled={isDisabled}
        role="switch"
        aria-checked={isActive}
        aria-label="Toggle Reverse Mode"
      >
        {isLoading ? (
          <div
            style={{
              ...styles.loadingIndicator,
              position: 'absolute',
              top: '6px',
              left: isActive ? '28px' : '6px',
            }}
          />
        ) : (
          <div
            style={{
              ...styles.toggleKnob,
              ...(isActive ? styles.toggleKnobActive : {}),
            }}
          />
        )}
      </button>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
