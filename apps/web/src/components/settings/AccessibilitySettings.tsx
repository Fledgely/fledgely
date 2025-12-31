'use client'

/**
 * AccessibilitySettings Component - Story 28.6
 *
 * Settings panel for accessibility preferences.
 *
 * Acceptance Criteria:
 * - AC1: "Always show descriptions" toggle available
 * - AC2: "High contrast mode" option for low-vision users
 * - AC3: "Larger text" option (respects system settings)
 * - AC4: "Audio descriptions" option for spoken playback
 */

import { useCallback } from 'react'
import { useAccessibility } from '../../contexts/AccessibilityContext'
import type { AccessibilitySettings as AccessibilitySettingsType } from '@fledgely/shared'

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  description: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 24px 0',
  },
  settingsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  settingItem: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  settingInfo: {
    flex: 1,
    marginRight: '16px',
  },
  settingLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    margin: '0 0 4px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  settingDescription: {
    fontSize: '13px',
    color: '#6b7280',
    margin: 0,
  },
  toggle: {
    position: 'relative' as const,
    width: '48px',
    height: '28px',
    flexShrink: 0,
  },
  toggleInput: {
    position: 'absolute' as const,
    opacity: 0,
    width: '100%',
    height: '100%',
    cursor: 'pointer',
    zIndex: 1,
  },
  toggleTrack: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#d1d5db',
    borderRadius: '14px',
    transition: 'background-color 0.2s ease',
  },
  toggleTrackActive: {
    backgroundColor: '#0ea5e9', // sky-500
  },
  toggleThumb: {
    position: 'absolute' as const,
    top: '2px',
    left: '2px',
    width: '24px',
    height: '24px',
    backgroundColor: '#ffffff',
    borderRadius: '50%',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
    transition: 'transform 0.2s ease',
  },
  toggleThumbActive: {
    transform: 'translateX(20px)',
  },
  osPreferenceBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    fontSize: '11px',
    fontWeight: 500,
    padding: '2px 6px',
    borderRadius: '4px',
  },
}

interface SettingToggleProps {
  id: string
  label: string
  description: string
  icon: string
  checked: boolean
  onChange: (checked: boolean) => void
  osPreference?: boolean
}

function SettingToggle({
  id,
  label,
  description,
  icon,
  checked,
  onChange,
  osPreference,
}: SettingToggleProps) {
  return (
    <div style={styles.settingItem} data-testid={`setting-${id}`}>
      <div style={styles.settingInfo}>
        <p style={styles.settingLabel}>
          <span role="img" aria-hidden="true">
            {icon}
          </span>
          {label}
          {osPreference && (
            <span style={styles.osPreferenceBadge} data-testid={`os-preference-${id}`}>
              OS Default
            </span>
          )}
        </p>
        <p style={styles.settingDescription}>{description}</p>
      </div>
      <div style={styles.toggle}>
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={styles.toggleInput}
          aria-describedby={`${id}-description`}
          data-testid={`toggle-${id}`}
        />
        <div style={{ ...styles.toggleTrack, ...(checked ? styles.toggleTrackActive : {}) }} />
        <div style={{ ...styles.toggleThumb, ...(checked ? styles.toggleThumbActive : {}) }} />
      </div>
    </div>
  )
}

export function AccessibilitySettings() {
  const { settings, updateSetting, loading, prefersReducedMotion, prefersHighContrast } =
    useAccessibility()

  const handleToggle = useCallback(
    async (key: keyof AccessibilitySettingsType, value: boolean) => {
      await updateSetting(key, value)
    },
    [updateSetting]
  )

  if (loading) {
    return (
      <div style={styles.container} data-testid="accessibility-settings-loading">
        <p>Loading accessibility settings...</p>
      </div>
    )
  }

  return (
    <div style={styles.container} data-testid="accessibility-settings">
      <div style={styles.header}>
        <span role="img" aria-hidden="true" style={{ fontSize: '24px' }}>
          ♿
        </span>
        <h2 style={styles.title}>Accessibility Settings</h2>
      </div>

      <p style={styles.description}>
        Customize how the app works for you. These settings help make the app more accessible for
        users with visual impairments or other needs.
      </p>

      <div style={styles.settingsList}>
        {/* AC1: Always show descriptions */}
        <SettingToggle
          id="alwaysShowDescriptions"
          label="Always Show Descriptions"
          description="Automatically expand AI-generated descriptions for all screenshots"
          icon="📝"
          checked={settings.alwaysShowDescriptions}
          onChange={(value) => handleToggle('alwaysShowDescriptions', value)}
          osPreference={prefersReducedMotion && settings.alwaysShowDescriptions}
        />

        {/* AC2: High contrast mode */}
        <SettingToggle
          id="highContrastMode"
          label="High Contrast Mode"
          description="Increase contrast for better visibility (for low-vision users)"
          icon="🎨"
          checked={settings.highContrastMode}
          onChange={(value) => handleToggle('highContrastMode', value)}
          osPreference={prefersHighContrast && settings.highContrastMode}
        />

        {/* AC3: Larger text */}
        <SettingToggle
          id="largerText"
          label="Larger Text"
          description="Increase text size throughout the app (also respects system font size)"
          icon="🔤"
          checked={settings.largerText}
          onChange={(value) => handleToggle('largerText', value)}
        />

        {/* AC4: Audio descriptions */}
        <SettingToggle
          id="audioDescriptions"
          label="Audio Descriptions"
          description="Enable spoken playback of screenshot descriptions (coming soon)"
          icon="🔊"
          checked={settings.audioDescriptions}
          onChange={(value) => handleToggle('audioDescriptions', value)}
        />
      </div>
    </div>
  )
}
