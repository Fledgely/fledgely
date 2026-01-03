'use client'

/**
 * TemporaryAccessGrantForm - Story 39.3
 *
 * Component for granting temporary access to caregivers.
 *
 * Acceptance Criteria:
 * - AC1: Start and end time configurable (1 hour min, 7 days max)
 * - AC2: Access presets (today_only, this_weekend, custom)
 *
 * UI/UX Requirements:
 * - Preset buttons for quick selection
 * - Custom mode shows date/time pickers
 * - Duration displayed in human-readable format
 * - 44px minimum touch targets (NFR49)
 *
 * Uses React.CSSProperties inline styles per project pattern.
 */

import { useState, useCallback, useMemo } from 'react'
import { httpsCallable, getFunctions } from 'firebase/functions'
import {
  type TemporaryAccessPreset,
  formatTemporaryAccessDuration,
  MIN_TEMP_ACCESS_DURATION_HOURS,
  MAX_TEMP_ACCESS_DURATION_DAYS,
} from '@fledgely/shared/contracts'

interface TemporaryAccessGrantFormProps {
  /** Family ID */
  familyId: string
  /** Caregiver UID to grant access to */
  caregiverUid: string
  /** Caregiver display name for UI */
  caregiverName: string
  /** Callback when grant is successful */
  onSuccess?: (grant: GrantResponse) => void
  /** Callback when user cancels */
  onCancel?: () => void
}

interface GrantResponse {
  success: boolean
  grantId: string
  startAt: string
  endAt: string
  preset: string
  status: string
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    maxWidth: '420px',
    padding: '24px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  header: {
    marginBottom: '24px',
    textAlign: 'center' as const,
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
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
  presetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  presetButton: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '80px',
    padding: '12px 8px',
    backgroundColor: '#f9fafb',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    gap: '4px',
  },
  presetButtonSelected: {
    backgroundColor: '#ede9fe',
    borderColor: '#7c3aed',
  },
  presetIcon: {
    fontSize: '24px',
    marginBottom: '4px',
  },
  presetLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    textAlign: 'center' as const,
  },
  presetDescription: {
    fontSize: '11px',
    color: '#9ca3af',
    textAlign: 'center' as const,
  },
  customDateSection: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },
  dateRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px',
  },
  dateGroup: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    minHeight: '44px',
    padding: '10px 12px',
    fontSize: '16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  durationPreview: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#ecfdf5',
    borderRadius: '8px',
    marginTop: '16px',
  },
  durationIcon: {
    fontSize: '20px',
  },
  durationText: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#065f46',
  },
  error: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '14px',
    textAlign: 'center' as const,
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
  },
  cancelButton: {
    flex: 1,
    minHeight: '48px',
    padding: '12px 24px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  submitButton: {
    flex: 1,
    minHeight: '48px',
    padding: '12px 24px',
    backgroundColor: '#7c3aed',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  submitButtonDisabled: {
    backgroundColor: '#a78bfa',
    cursor: 'not-allowed',
  },
  success: {
    textAlign: 'center' as const,
    padding: '24px',
  },
  successIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  successText: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#059669',
    marginBottom: '8px',
  },
  successDetails: {
    fontSize: '14px',
    color: '#6b7280',
  },
}

/** Preset configuration with icons and labels */
const PRESETS: Array<{
  value: TemporaryAccessPreset
  icon: string
  label: string
  description: string
}> = [
  {
    value: 'today_only',
    icon: '☀️',
    label: 'Today Only',
    description: 'Until midnight',
  },
  {
    value: 'this_weekend',
    icon: '📅',
    label: 'Weekend',
    description: 'Fri-Sun',
  },
  {
    value: 'custom',
    icon: '⚙️',
    label: 'Custom',
    description: 'Set times',
  },
]

/**
 * TemporaryAccessGrantForm - Modal form for granting temporary access
 *
 * Story 39.3: AC1 - Start and end time configurable
 * Story 39.3: AC2 - Access presets available
 */
export function TemporaryAccessGrantForm({
  familyId,
  caregiverUid,
  caregiverName,
  onSuccess,
  onCancel,
}: TemporaryAccessGrantFormProps) {
  const [selectedPreset, setSelectedPreset] = useState<TemporaryAccessPreset>('today_only')
  const [customStartAt, setCustomStartAt] = useState<string>('')
  const [customEndAt, setCustomEndAt] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<GrantResponse | null>(null)

  // Get user's timezone
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])

  // Calculate preview dates based on preset
  const previewDates = useMemo(() => {
    const now = new Date()

    switch (selectedPreset) {
      case 'today_only': {
        const endOfDay = new Date(now)
        endOfDay.setHours(23, 59, 59, 999)
        return { startAt: now, endAt: endOfDay }
      }
      case 'this_weekend': {
        const dayOfWeek = now.getDay()
        let daysToFriday = 5 - dayOfWeek
        if (daysToFriday < 0) daysToFriday += 7
        if (daysToFriday === 0 && now.getHours() >= 17) {
          daysToFriday = 0
        }

        const friday = new Date(now)
        friday.setDate(friday.getDate() + daysToFriday)
        friday.setHours(17, 0, 0, 0)

        const sunday = new Date(friday)
        sunday.setDate(sunday.getDate() + 2)
        sunday.setHours(22, 0, 0, 0)

        const startAt = now > friday ? now : friday
        return { startAt, endAt: sunday }
      }
      case 'custom': {
        if (customStartAt && customEndAt) {
          return {
            startAt: new Date(customStartAt),
            endAt: new Date(customEndAt),
          }
        }
        return null
      }
    }
  }, [selectedPreset, customStartAt, customEndAt])

  // Calculate duration display
  const durationDisplay = useMemo(() => {
    if (!previewDates) return null
    const { startAt, endAt } = previewDates
    if (endAt <= startAt) return null
    return formatTemporaryAccessDuration(startAt, endAt)
  }, [previewDates])

  // Validate custom dates
  const customDateError = useMemo(() => {
    if (selectedPreset !== 'custom') return null
    if (!customStartAt || !customEndAt) return null

    const startAt = new Date(customStartAt)
    const endAt = new Date(customEndAt)
    const now = new Date()

    if (endAt <= startAt) {
      return 'End time must be after start time'
    }

    if (endAt <= now) {
      return 'End time must be in the future'
    }

    const durationHours = (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60)
    if (durationHours < MIN_TEMP_ACCESS_DURATION_HOURS) {
      return `Duration must be at least ${MIN_TEMP_ACCESS_DURATION_HOURS} hour`
    }

    const maxDurationHours = MAX_TEMP_ACCESS_DURATION_DAYS * 24
    if (durationHours > maxDurationHours) {
      return `Duration cannot exceed ${MAX_TEMP_ACCESS_DURATION_DAYS} days`
    }

    return null
  }, [selectedPreset, customStartAt, customEndAt])

  const canSubmit = useMemo(() => {
    if (isSubmitting) return false
    if (selectedPreset === 'custom') {
      return customStartAt && customEndAt && !customDateError
    }
    return true
  }, [selectedPreset, customStartAt, customEndAt, customDateError, isSubmitting])

  const handlePresetClick = useCallback((preset: TemporaryAccessPreset) => {
    setSelectedPreset(preset)
    setError(null)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return

    setIsSubmitting(true)
    setError(null)

    try {
      const functions = getFunctions()
      const grantTemporaryAccess = httpsCallable<
        {
          familyId: string
          caregiverUid: string
          preset: TemporaryAccessPreset
          startAt?: string
          endAt?: string
          timezone: string
        },
        GrantResponse
      >(functions, 'grantTemporaryAccess')

      const requestData: {
        familyId: string
        caregiverUid: string
        preset: TemporaryAccessPreset
        startAt?: string
        endAt?: string
        timezone: string
      } = {
        familyId,
        caregiverUid,
        preset: selectedPreset,
        timezone,
      }

      if (selectedPreset === 'custom') {
        requestData.startAt = new Date(customStartAt).toISOString()
        requestData.endAt = new Date(customEndAt).toISOString()
      }

      const result = await grantTemporaryAccess(requestData)
      setSuccess(result.data)
      onSuccess?.(result.data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to grant temporary access'
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }, [
    canSubmit,
    familyId,
    caregiverUid,
    selectedPreset,
    customStartAt,
    customEndAt,
    timezone,
    onSuccess,
  ])

  // Show success state
  if (success) {
    return (
      <div style={styles.container} data-testid="temporary-access-grant-form">
        <div style={styles.success}>
          <div style={styles.successIcon}>✅</div>
          <p style={styles.successText}>Access Granted!</p>
          <p style={styles.successDetails}>
            {caregiverName} now has temporary access until{' '}
            {new Date(success.endAt).toLocaleString()}
          </p>
        </div>
      </div>
    )
  }

  // Get default datetime-local values for custom inputs
  const getDefaultStartAt = () => {
    const now = new Date()
    now.setMinutes(0, 0, 0)
    return now.toISOString().slice(0, 16)
  }

  const getDefaultEndAt = () => {
    const end = new Date()
    end.setHours(end.getHours() + 4)
    end.setMinutes(0, 0, 0)
    return end.toISOString().slice(0, 16)
  }

  return (
    <div style={styles.container} data-testid="temporary-access-grant-form">
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Grant Temporary Access</h2>
        <p style={styles.subtitle}>Give {caregiverName} limited-time access</p>
      </div>

      {/* Preset Selection */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Access Duration</h3>
        <div style={styles.presetGrid}>
          {PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              style={{
                ...styles.presetButton,
                ...(selectedPreset === preset.value ? styles.presetButtonSelected : {}),
              }}
              onClick={() => handlePresetClick(preset.value)}
              data-testid={`preset-${preset.value}`}
              aria-pressed={selectedPreset === preset.value}
            >
              <span style={styles.presetIcon} aria-hidden="true">
                {preset.icon}
              </span>
              <span style={styles.presetLabel}>{preset.label}</span>
              <span style={styles.presetDescription}>{preset.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date/Time Inputs */}
      {selectedPreset === 'custom' && (
        <div style={styles.customDateSection} data-testid="custom-date-section">
          <div style={styles.dateRow}>
            <div style={styles.dateGroup}>
              <label htmlFor="start-datetime" style={styles.label}>
                Start
              </label>
              <input
                type="datetime-local"
                id="start-datetime"
                style={styles.input}
                value={customStartAt || getDefaultStartAt()}
                onChange={(e) => {
                  setCustomStartAt(e.target.value)
                  setError(null)
                }}
                data-testid="custom-start-input"
              />
            </div>
            <div style={styles.dateGroup}>
              <label htmlFor="end-datetime" style={styles.label}>
                End
              </label>
              <input
                type="datetime-local"
                id="end-datetime"
                style={styles.input}
                value={customEndAt || getDefaultEndAt()}
                onChange={(e) => {
                  setCustomEndAt(e.target.value)
                  setError(null)
                }}
                data-testid="custom-end-input"
              />
            </div>
          </div>
          {customDateError && (
            <div style={styles.error} role="alert" data-testid="custom-date-error">
              {customDateError}
            </div>
          )}
        </div>
      )}

      {/* Duration Preview */}
      {durationDisplay && !customDateError && (
        <div style={styles.durationPreview} data-testid="duration-preview">
          <span style={styles.durationIcon}>⏱️</span>
          <span style={styles.durationText}>Duration: {durationDisplay}</span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={styles.error} role="alert" data-testid="form-error">
          {error}
        </div>
      )}

      {/* Actions */}
      <div style={styles.actions}>
        <button
          type="button"
          style={styles.cancelButton}
          onClick={onCancel}
          data-testid="cancel-button"
        >
          Cancel
        </button>
        <button
          type="button"
          style={{
            ...styles.submitButton,
            ...(!canSubmit ? styles.submitButtonDisabled : {}),
          }}
          onClick={handleSubmit}
          disabled={!canSubmit}
          data-testid="submit-button"
        >
          {isSubmitting ? 'Granting...' : 'Grant Access'}
        </button>
      </div>
    </div>
  )
}

export default TemporaryAccessGrantForm
