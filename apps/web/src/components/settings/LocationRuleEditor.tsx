'use client'

/**
 * LocationRuleEditor Component - Story 40.2
 *
 * UI for configuring per-location rules for a child.
 *
 * Acceptance Criteria:
 * - AC2: Per-Location Time Limits
 * - AC3: Per-Location Category Rules (education-only mode)
 * - AC6: Location Rule Preview
 *
 * UI/UX Requirements:
 * - 44x44px minimum touch targets (NFR49)
 * - 4.5:1 contrast ratio (NFR45)
 * - Keyboard accessible (NFR43)
 */

import { useState, useCallback } from 'react'
import type { LocationZone, LocationRule } from '@fledgely/shared'

export interface LocationRuleEditorProps {
  /** Zone to configure rules for */
  zone: LocationZone
  /** Child name for display */
  childName: string
  /** Child's default daily time limit in minutes */
  defaultTimeLimitMinutes: number
  /** Existing rule for this zone/child (null if using defaults) */
  existingRule: LocationRule | null
  /** Callback when rule is saved */
  onSaveRule: (rule: { dailyTimeLimitMinutes: number | null; educationOnlyMode: boolean }) => void
  /** Callback when rule is deleted (revert to defaults) */
  onDeleteRule: () => void
  /** Callback to close editor */
  onClose: () => void
  /** Whether any action is in progress */
  loading?: boolean
  /** Error message to display */
  error?: string | null
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '500px',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  closeButton: {
    minWidth: '44px',
    minHeight: '44px',
    padding: '8px',
    fontSize: '18px',
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '12px',
  },
  timeLimitContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '16px',
  },
  overrideToggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  toggleLabel: {
    fontSize: '14px',
    color: '#374151',
  },
  toggle: {
    position: 'relative' as const,
    width: '48px',
    height: '28px',
    backgroundColor: '#d1d5db',
    borderRadius: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    border: 'none',
    padding: 0,
  },
  toggleActive: {
    backgroundColor: '#3b82f6',
  },
  toggleThumb: {
    position: 'absolute' as const,
    top: '2px',
    left: '2px',
    width: '24px',
    height: '24px',
    backgroundColor: '#ffffff',
    borderRadius: '50%',
    transition: 'transform 0.2s',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  },
  toggleThumbActive: {
    transform: 'translateX(20px)',
  },
  sliderContainer: {
    marginTop: '12px',
  },
  sliderLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '8px',
  },
  slider: {
    width: '100%',
    minHeight: '44px',
  },
  defaultIndicator: {
    fontSize: '12px',
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  overrideIndicator: {
    fontSize: '12px',
    color: '#3b82f6',
    fontWeight: 500,
  },
  educationModeContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '16px',
  },
  educationModeRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  educationModeInfo: {
    flex: 1,
    marginRight: '16px',
  },
  educationModeLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    margin: '0 0 4px 0',
  },
  educationModeDescription: {
    fontSize: '13px',
    color: '#6b7280',
    margin: 0,
  },
  comparison: {
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
  },
  comparisonTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1e40af',
    marginBottom: '8px',
  },
  comparisonRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    marginBottom: '6px',
  },
  comparisonLabel: {
    color: '#3b82f6',
  },
  comparisonValue: {
    color: '#1e40af',
    fontWeight: 500,
  },
  comparisonChanged: {
    color: '#059669',
    fontWeight: 600,
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
  resetButton: {
    flex: 1,
    minHeight: '44px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b7280',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  saveButton: {
    flex: 1,
    minHeight: '44px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  error: {
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    fontSize: '14px',
    color: '#dc2626',
  },
}

export function LocationRuleEditor({
  zone,
  childName,
  defaultTimeLimitMinutes,
  existingRule,
  onSaveRule,
  onDeleteRule,
  onClose,
  loading = false,
  error = null,
}: LocationRuleEditorProps) {
  // Default education-only mode to true for school zones
  const defaultEducationOnly = zone.type === 'school'

  const [overrideTimeLimit, setOverrideTimeLimit] = useState(
    existingRule?.dailyTimeLimitMinutes !== null &&
      existingRule?.dailyTimeLimitMinutes !== undefined
  )
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(
    existingRule?.dailyTimeLimitMinutes ?? defaultTimeLimitMinutes
  )
  const [educationOnlyMode, setEducationOnlyMode] = useState(
    existingRule?.educationOnlyMode ?? defaultEducationOnly
  )

  const handleSave = useCallback(() => {
    onSaveRule({
      dailyTimeLimitMinutes: overrideTimeLimit ? timeLimitMinutes : null,
      educationOnlyMode,
    })
  }, [overrideTimeLimit, timeLimitMinutes, educationOnlyMode, onSaveRule])

  const handleReset = useCallback(() => {
    if (existingRule) {
      onDeleteRule()
    } else {
      // Reset form to defaults
      setOverrideTimeLimit(false)
      setTimeLimitMinutes(defaultTimeLimitMinutes)
      setEducationOnlyMode(defaultEducationOnly)
    }
  }, [existingRule, onDeleteRule, defaultTimeLimitMinutes, defaultEducationOnly])

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }

  const hasChanges =
    (overrideTimeLimit && timeLimitMinutes !== defaultTimeLimitMinutes) ||
    educationOnlyMode !== defaultEducationOnly

  return (
    <div style={styles.container} data-testid="location-rule-editor">
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h2 style={styles.title}>Rules at {zone.name}</h2>
          <p style={styles.subtitle}>Configure rules for {childName} at this location</p>
        </div>
        <button
          style={styles.closeButton}
          onClick={onClose}
          aria-label="Close rule editor"
          data-testid="close-button"
        >
          ×
        </button>
      </div>

      {error && (
        <div style={styles.error} role="alert" data-testid="error-message">
          {error}
        </div>
      )}

      {/* Time Limit Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Daily Screen Time Limit</h3>
        <div style={styles.timeLimitContainer}>
          <div style={styles.overrideToggle}>
            <span style={styles.toggleLabel}>Override default time limit</span>
            <button
              style={{
                ...styles.toggle,
                ...(overrideTimeLimit ? styles.toggleActive : {}),
              }}
              onClick={() => setOverrideTimeLimit(!overrideTimeLimit)}
              role="switch"
              aria-checked={overrideTimeLimit}
              data-testid="override-toggle"
            >
              <span
                style={{
                  ...styles.toggleThumb,
                  ...(overrideTimeLimit ? styles.toggleThumbActive : {}),
                }}
              />
            </button>
          </div>

          {overrideTimeLimit ? (
            <div style={styles.sliderContainer}>
              <div style={styles.sliderLabel}>
                <span style={styles.overrideIndicator} data-testid="override-indicator">
                  Custom limit for this location
                </span>
                <span data-testid="time-value">{formatTime(timeLimitMinutes)}</span>
              </div>
              <input
                type="range"
                style={styles.slider}
                min={0}
                max={480}
                step={15}
                value={timeLimitMinutes}
                onChange={(e) => setTimeLimitMinutes(parseInt(e.target.value, 10))}
                aria-label="Time limit in minutes"
                data-testid="time-slider"
              />
            </div>
          ) : (
            <div style={styles.sliderLabel}>
              <span style={styles.defaultIndicator} data-testid="default-indicator">
                Using default: {formatTime(defaultTimeLimitMinutes)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Education-Only Mode Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Content Restrictions</h3>
        <div style={styles.educationModeContainer}>
          <div style={styles.educationModeRow}>
            <div style={styles.educationModeInfo}>
              <p style={styles.educationModeLabel}>Education-Only Mode</p>
              <p style={styles.educationModeDescription}>
                Only educational content allowed at this location
              </p>
            </div>
            <button
              style={{
                ...styles.toggle,
                ...(educationOnlyMode ? styles.toggleActive : {}),
              }}
              onClick={() => setEducationOnlyMode(!educationOnlyMode)}
              role="switch"
              aria-checked={educationOnlyMode}
              data-testid="education-toggle"
            >
              <span
                style={{
                  ...styles.toggleThumb,
                  ...(educationOnlyMode ? styles.toggleThumbActive : {}),
                }}
              />
            </button>
          </div>
          {zone.type === 'school' && (
            <p
              style={{ ...styles.defaultIndicator, marginTop: '8px' }}
              data-testid="school-default-note"
            >
              {educationOnlyMode
                ? 'Recommended for school locations'
                : 'Education-only mode is recommended for school'}
            </p>
          )}
        </div>
      </div>

      {/* Rule Comparison/Preview */}
      <div style={styles.comparison} data-testid="rule-comparison">
        <h3 style={styles.comparisonTitle}>Rule Summary</h3>
        <div style={styles.comparisonRow}>
          <span style={styles.comparisonLabel}>Time Limit:</span>
          <span
            style={
              overrideTimeLimit && timeLimitMinutes !== defaultTimeLimitMinutes
                ? styles.comparisonChanged
                : styles.comparisonValue
            }
            data-testid="comparison-time"
          >
            {overrideTimeLimit
              ? formatTime(timeLimitMinutes)
              : `${formatTime(defaultTimeLimitMinutes)} (default)`}
          </span>
        </div>
        <div style={styles.comparisonRow}>
          <span style={styles.comparisonLabel}>Education-Only:</span>
          <span
            style={
              educationOnlyMode !== defaultEducationOnly
                ? styles.comparisonChanged
                : styles.comparisonValue
            }
            data-testid="comparison-education"
          >
            {educationOnlyMode ? 'Yes' : 'No'}
            {educationOnlyMode === defaultEducationOnly &&
              zone.type === 'school' &&
              ' (default for school)'}
          </span>
        </div>
        {hasChanges && (
          <p
            style={{ ...styles.overrideIndicator, marginTop: '8px' }}
            data-testid="changes-indicator"
          >
            * Changes from default highlighted in green
          </p>
        )}
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        <button
          style={{ ...styles.resetButton, ...(loading ? styles.buttonDisabled : {}) }}
          onClick={handleReset}
          disabled={loading}
          data-testid="reset-button"
        >
          {existingRule ? 'Remove Override' : 'Reset to Default'}
        </button>
        <button
          style={{ ...styles.saveButton, ...(loading ? styles.buttonDisabled : {}) }}
          onClick={handleSave}
          disabled={loading}
          data-testid="save-button"
        >
          {loading ? 'Saving...' : 'Save Rules'}
        </button>
      </div>
    </div>
  )
}

export default LocationRuleEditor
