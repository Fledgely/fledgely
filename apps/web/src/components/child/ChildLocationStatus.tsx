'use client'

/**
 * ChildLocationStatus Component - Story 40.2
 *
 * Child-facing component showing current location and active rules.
 *
 * Acceptance Criteria:
 * - AC5: Child Location Display
 *   - Shows current location name
 *   - Shows active time limit
 *   - Shows special rules (education-only mode)
 *
 * UI/UX Requirements:
 * - Child-friendly language (NFR65: 6th-grade reading level)
 * - Simple, non-anxious presentation
 * - 44x44px minimum touch targets (NFR49)
 * - 4.5:1 contrast ratio (NFR45)
 */

export interface ChildLocationStatusProps {
  /** Current location name (e.g., "Mom's House", "School") */
  locationName: string
  /** Time limit in minutes for this location */
  timeLimitMinutes: number
  /** Time already used today in minutes */
  timeUsedMinutes: number
  /** Whether education-only mode is active */
  educationOnlyMode: boolean
  /** Whether location features are loading */
  loading?: boolean
  /** Location type for styling */
  locationType?: 'home_1' | 'home_2' | 'school' | 'other'
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    padding: '20px',
    maxWidth: '400px',
  },
  locationHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  locationIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  },
  locationIconHome: {
    backgroundColor: '#dbeafe',
  },
  locationIconSchool: {
    backgroundColor: '#fef3c7',
  },
  locationIconOther: {
    backgroundColor: '#f3e8ff',
  },
  locationInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 4px 0',
  },
  locationName: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  rulesSection: {
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '12px',
  },
  ruleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  ruleRowLast: {
    marginBottom: 0,
  },
  ruleIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    flexShrink: 0,
  },
  timeIcon: {
    backgroundColor: '#dbeafe',
  },
  eduIcon: {
    backgroundColor: '#d1fae5',
  },
  ruleContent: {
    flex: 1,
  },
  ruleLabel: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '0 0 2px 0',
  },
  ruleValue: {
    fontSize: '16px',
    fontWeight: 500,
    color: '#1f2937',
    margin: 0,
  },
  timeBar: {
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    marginTop: '8px',
    overflow: 'hidden',
  },
  timeBarFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  timeBarNormal: {
    backgroundColor: '#3b82f6',
  },
  timeBarWarning: {
    backgroundColor: '#f59e0b',
  },
  timeBarDanger: {
    backgroundColor: '#ef4444',
  },
  eduBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    backgroundColor: '#d1fae5',
    borderRadius: '12px',
    fontSize: '13px',
    color: '#065f46',
    fontWeight: 500,
  },
  helpText: {
    fontSize: '13px',
    color: '#9ca3af',
    textAlign: 'center' as const,
    margin: '16px 0 0 0',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    color: '#9ca3af',
  },
}

export function ChildLocationStatus({
  locationName,
  timeLimitMinutes,
  timeUsedMinutes,
  educationOnlyMode,
  loading = false,
  locationType = 'other',
}: ChildLocationStatusProps) {
  if (loading) {
    return (
      <div style={styles.container} data-testid="child-location-status">
        <div style={styles.loadingContainer} data-testid="loading-state">
          Finding your location...
        </div>
      </div>
    )
  }

  const timeRemaining = Math.max(0, timeLimitMinutes - timeUsedMinutes)
  const percentUsed = Math.min(100, (timeUsedMinutes / timeLimitMinutes) * 100)

  // Format time in a child-friendly way
  const formatTimeChildFriendly = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60

    if (hours === 0) {
      return `${mins} minutes`
    }
    if (mins === 0) {
      return hours === 1 ? '1 hour' : `${hours} hours`
    }
    return hours === 1 ? `1 hour and ${mins} minutes` : `${hours} hours and ${mins} minutes`
  }

  // Get icon based on location type
  const getLocationIcon = () => {
    switch (locationType) {
      case 'home_1':
      case 'home_2':
        return '🏠'
      case 'school':
        return '🏫'
      default:
        return '📍'
    }
  }

  // Get icon style based on location type
  const getIconStyle = () => {
    switch (locationType) {
      case 'home_1':
      case 'home_2':
        return styles.locationIconHome
      case 'school':
        return styles.locationIconSchool
      default:
        return styles.locationIconOther
    }
  }

  // Get time bar style based on usage
  const getTimeBarStyle = () => {
    if (percentUsed >= 90) return styles.timeBarDanger
    if (percentUsed >= 70) return styles.timeBarWarning
    return styles.timeBarNormal
  }

  return (
    <div style={styles.container} data-testid="child-location-status">
      {/* Location Header */}
      <div style={styles.locationHeader}>
        <div
          style={{ ...styles.locationIcon, ...getIconStyle() }}
          aria-hidden="true"
          data-testid="location-icon"
        >
          {getLocationIcon()}
        </div>
        <div style={styles.locationInfo}>
          <p style={styles.greeting} data-testid="greeting">
            You&apos;re at
          </p>
          <h2 style={styles.locationName} data-testid="location-name">
            {locationName}
          </h2>
        </div>
      </div>

      {/* Rules Section */}
      <div style={styles.rulesSection} data-testid="rules-section">
        {/* Time Limit */}
        <div style={styles.ruleRow}>
          <div style={{ ...styles.ruleIcon, ...styles.timeIcon }} aria-hidden="true">
            ⏰
          </div>
          <div style={styles.ruleContent}>
            <p style={styles.ruleLabel}>Screen time today</p>
            <p style={styles.ruleValue} data-testid="time-remaining">
              {formatTimeChildFriendly(timeRemaining)} left
            </p>
            <div
              style={styles.timeBar}
              role="progressbar"
              aria-valuenow={percentUsed}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                style={{
                  ...styles.timeBarFill,
                  ...getTimeBarStyle(),
                  width: `${percentUsed}%`,
                }}
                data-testid="time-bar-fill"
              />
            </div>
          </div>
        </div>

        {/* Education-Only Mode */}
        {educationOnlyMode && (
          <div style={{ ...styles.ruleRow, ...styles.ruleRowLast }} data-testid="education-mode">
            <div style={{ ...styles.ruleIcon, ...styles.eduIcon }} aria-hidden="true">
              📚
            </div>
            <div style={styles.ruleContent}>
              <p style={styles.ruleLabel}>Content mode</p>
              <span style={styles.eduBadge} data-testid="education-badge">
                Learning apps only
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Help Text */}
      <p style={styles.helpText} data-testid="help-text">
        Your rules might be different at other places
      </p>
    </div>
  )
}

export default ChildLocationStatus
