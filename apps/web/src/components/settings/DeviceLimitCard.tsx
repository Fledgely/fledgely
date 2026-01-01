'use client'

/**
 * DeviceLimitCard Component - Story 30.5
 *
 * Card for configuring per-device time limits.
 *
 * Requirements:
 * - AC1: Device-specific daily limit
 * - AC4: Device type display with icon
 */

import { formatMinutes } from '../../utils/formatTime'

export interface DeviceLimitConfig {
  deviceId: string
  deviceName: string
  deviceType: 'chromebook' | 'android_phone' | 'android_tablet'
  enabled: boolean
  weekdayMinutes: number
  weekendMinutes: number
  unlimited: boolean
}

interface DeviceLimitCardProps {
  device: DeviceLimitConfig
  scheduleType: 'weekdays' | 'school_days'
  onUpdate: (deviceId: string, updates: Partial<DeviceLimitConfig>) => void
}

// Time limit range: 30 minutes to 8 hours (480 minutes)
const MIN_MINUTES = 30
const MAX_MINUTES = 480
const STEP_MINUTES = 15

// Device type icons
const DEVICE_ICONS: Record<DeviceLimitConfig['deviceType'], React.ReactNode> = {
  chromebook: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  ),
  android_phone: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M12 18h.01" />
    </svg>
  ),
  android_tablet: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M12 18h.01" />
    </svg>
  ),
}

// Device type labels
const DEVICE_TYPE_LABELS: Record<DeviceLimitConfig['deviceType'], string> = {
  chromebook: 'Chromebook',
  android_phone: 'Android Phone',
  android_tablet: 'Android Tablet',
}

// Device type colors
const DEVICE_COLORS: Record<DeviceLimitConfig['deviceType'], string> = {
  chromebook: '#10b981', // emerald
  android_phone: '#8b5cf6', // purple
  android_tablet: '#3b82f6', // blue
}

const styles = {
  card: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    marginBottom: '12px',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    cursor: 'pointer',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconContainer: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  deviceName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1f2937',
  },
  deviceType: {
    fontSize: '12px',
    color: '#6b7280',
  },
  toggle: {
    position: 'relative' as const,
    width: '44px',
    height: '24px',
    backgroundColor: '#d1d5db',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    border: 'none',
    padding: 0,
    flexShrink: 0,
  },
  toggleActive: {
    backgroundColor: '#10b981',
  },
  toggleKnob: {
    position: 'absolute' as const,
    top: '2px',
    left: '2px',
    width: '20px',
    height: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '50%',
    transition: 'transform 0.2s',
  },
  toggleKnobActive: {
    transform: 'translateX(20px)',
  },
  expandedContent: {
    padding: '0 16px 16px',
  },
  sliderContainer: {
    backgroundColor: '#ffffff',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '8px',
  },
  sliderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  sliderLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
  },
  sliderValue: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#10b981',
  },
  sliderValueUnlimited: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#6b7280',
  },
  sliderInput: {
    width: '100%',
    height: '6px',
    backgroundColor: '#e5e7eb',
    borderRadius: '3px',
    appearance: 'none' as const,
    cursor: 'pointer',
    WebkitAppearance: 'none' as const,
  },
  unlimitedRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: '10px 12px',
    borderRadius: '6px',
  },
  unlimitedLabel: {
    fontSize: '13px',
    color: '#374151',
  },
  statusBadge: {
    fontSize: '12px',
    fontWeight: 500,
    padding: '2px 8px',
    borderRadius: '9999px',
  },
}

export function DeviceLimitCard({ device, scheduleType, onUpdate }: DeviceLimitCardProps) {
  const color = DEVICE_COLORS[device.deviceType]
  const icon = DEVICE_ICONS[device.deviceType]
  const typeLabel = DEVICE_TYPE_LABELS[device.deviceType]

  const handleToggle = () => {
    onUpdate(device.deviceId, { enabled: !device.enabled })
  }

  const handleWeekdayChange = (minutes: number) => {
    onUpdate(device.deviceId, { weekdayMinutes: minutes })
  }

  const handleWeekendChange = (minutes: number) => {
    onUpdate(device.deviceId, { weekendMinutes: minutes })
  }

  const handleUnlimitedToggle = () => {
    onUpdate(device.deviceId, { unlimited: !device.unlimited })
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={{ ...styles.iconContainer, backgroundColor: `${color}15`, color }}>
            {icon}
          </div>
          <div style={styles.deviceInfo}>
            <span style={styles.deviceName}>{device.deviceName}</span>
            <span style={styles.deviceType}>{typeLabel}</span>
          </div>
        </div>
        <button
          style={{
            ...styles.toggle,
            ...(device.enabled ? styles.toggleActive : {}),
          }}
          onClick={handleToggle}
          role="switch"
          aria-checked={device.enabled}
          aria-label={`Enable limit for ${device.deviceName}`}
        >
          <div
            style={{
              ...styles.toggleKnob,
              ...(device.enabled ? styles.toggleKnobActive : {}),
            }}
          />
        </button>
      </div>

      {device.enabled && (
        <div style={styles.expandedContent}>
          {/* Weekday/School Day Slider */}
          <div style={styles.sliderContainer}>
            <div style={styles.sliderHeader}>
              <span style={styles.sliderLabel}>
                {scheduleType === 'school_days' ? 'School Days' : 'Weekdays'}
              </span>
              <span style={device.unlimited ? styles.sliderValueUnlimited : styles.sliderValue}>
                {device.unlimited ? 'Unlimited' : formatMinutes(device.weekdayMinutes)}
              </span>
            </div>
            <input
              type="range"
              min={MIN_MINUTES}
              max={MAX_MINUTES}
              step={STEP_MINUTES}
              value={device.weekdayMinutes}
              onChange={(e) => handleWeekdayChange(Number(e.target.value))}
              disabled={device.unlimited}
              style={{
                ...styles.sliderInput,
                opacity: device.unlimited ? 0.5 : 1,
              }}
              aria-label={`${scheduleType === 'school_days' ? 'School day' : 'Weekday'} limit for ${device.deviceName}`}
              aria-valuetext={device.unlimited ? 'Unlimited' : formatMinutes(device.weekdayMinutes)}
            />
          </div>

          {/* Weekend/Non-School Day Slider */}
          <div style={styles.sliderContainer}>
            <div style={styles.sliderHeader}>
              <span style={styles.sliderLabel}>
                {scheduleType === 'school_days' ? 'Non-School Days' : 'Weekends'}
              </span>
              <span style={device.unlimited ? styles.sliderValueUnlimited : styles.sliderValue}>
                {device.unlimited ? 'Unlimited' : formatMinutes(device.weekendMinutes)}
              </span>
            </div>
            <input
              type="range"
              min={MIN_MINUTES}
              max={MAX_MINUTES}
              step={STEP_MINUTES}
              value={device.weekendMinutes}
              onChange={(e) => handleWeekendChange(Number(e.target.value))}
              disabled={device.unlimited}
              style={{
                ...styles.sliderInput,
                opacity: device.unlimited ? 0.5 : 1,
              }}
              aria-label={`${scheduleType === 'school_days' ? 'Non-school day' : 'Weekend'} limit for ${device.deviceName}`}
              aria-valuetext={device.unlimited ? 'Unlimited' : formatMinutes(device.weekendMinutes)}
            />
          </div>

          {/* Unlimited Toggle */}
          <div style={styles.unlimitedRow}>
            <span style={styles.unlimitedLabel}>Unlimited time on this device</span>
            <button
              style={{
                ...styles.toggle,
                width: '40px',
                height: '22px',
                ...(device.unlimited ? styles.toggleActive : {}),
              }}
              onClick={handleUnlimitedToggle}
              role="switch"
              aria-checked={device.unlimited}
              aria-label={`Unlimited time for ${device.deviceName}`}
            >
              <div
                style={{
                  ...styles.toggleKnob,
                  width: '18px',
                  height: '18px',
                  ...(device.unlimited ? { transform: 'translateX(18px)' } : {}),
                }}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Convert Device data to DeviceLimitConfig
 */
export function deviceToLimitConfig(
  device: { deviceId: string; name: string; type: 'chromebook' | 'android' },
  _childId: string
): DeviceLimitConfig {
  // Map 'android' to more specific type (default to phone)
  const deviceType: DeviceLimitConfig['deviceType'] =
    device.type === 'chromebook' ? 'chromebook' : 'android_phone'

  return {
    deviceId: device.deviceId,
    deviceName: device.name,
    deviceType,
    enabled: false,
    weekdayMinutes: 120, // Default 2 hours
    weekendMinutes: 180, // Default 3 hours
    unlimited: false,
  }
}
