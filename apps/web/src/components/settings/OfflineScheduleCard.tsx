'use client'

/**
 * OfflineScheduleCard Component - Story 32.1
 *
 * Family offline schedule configuration card.
 *
 * Requirements:
 * - AC1: Daily schedule with start and end time
 * - AC2: Different schedules for weekdays vs weekends
 * - AC3: Quick presets available (Dinner time, Bedtime)
 * - AC4: Schedule applies to all family members
 */

import { useState, useCallback, useMemo } from 'react'
import type { OfflineSchedulePreset } from '@fledgely/shared'
import { OFFLINE_PRESET_LABELS } from '@fledgely/shared'
import type { OfflineScheduleConfig } from '../../hooks/useFamilyOfflineSchedule'
import { formatTimeForDisplay } from '../../utils/timeUtils'
import { MoonIcon } from '../icons/MoonIcon'

/**
 * Time options for schedule picker (hourly from 6am to midnight)
 */
const TIME_OPTIONS = [
  '06:00',
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
  '23:00',
  '00:00',
  '01:00',
  '02:00',
  '03:00',
  '04:00',
  '05:00',
]

export interface OfflineScheduleCardProps {
  /** Current schedule configuration */
  schedule: OfflineScheduleConfig | null
  /** Callback when schedule changes */
  onScheduleChange: (schedule: OfflineScheduleConfig) => void
  /** Apply a preset configuration */
  onApplyPreset: (preset: Exclude<OfflineSchedulePreset, 'custom'>) => OfflineScheduleConfig
  /** Save schedule to database */
  onSave: (schedule: OfflineScheduleConfig) => Promise<{ success: boolean; error?: string }>
  /** Whether there are unsaved changes */
  hasChanges: boolean
  /** Loading state */
  loading: boolean
  /** Error message */
  error: string | null
}

const styles = {
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    padding: '24px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconContainer: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    backgroundColor: '#eef2ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '4px 0 0 0',
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
  },
  toggleActive: {
    backgroundColor: '#6366f1',
  },
  toggleKnob: {
    position: 'absolute' as const,
    top: '2px',
    left: '2px',
    width: '24px',
    height: '24px',
    backgroundColor: '#ffffff',
    borderRadius: '50%',
    transition: 'transform 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  toggleKnobActive: {
    transform: 'translateX(24px)',
  },
  content: {
    marginTop: '16px',
  },
  presetSection: {
    marginBottom: '24px',
  },
  presetLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '10px',
    display: 'block',
  },
  presetButtons: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap' as const,
  },
  presetButton: {
    minHeight: '44px',
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    backgroundColor: '#f3f4f6',
    border: '2px solid transparent',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  presetButtonActive: {
    backgroundColor: '#eef2ff',
    color: '#4f46e5',
    borderColor: '#6366f1',
  },
  tabSection: {
    marginBottom: '20px',
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    backgroundColor: '#f3f4f6',
    padding: '4px',
    borderRadius: '10px',
  },
  tab: {
    flex: 1,
    minHeight: '40px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  tabActive: {
    color: '#1f2937',
    backgroundColor: '#ffffff',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  timeSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  timeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  timeGroup: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  timeLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#6b7280',
  },
  timeSelect: {
    minHeight: '44px',
    padding: '10px 14px',
    fontSize: '16px',
    color: '#1f2937',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    cursor: 'pointer',
  },
  divider: {
    height: '1px',
    backgroundColor: '#f3f4f6',
    margin: '20px 0',
  },
  optionRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 0',
  },
  optionLabel: {
    fontSize: '15px',
    color: '#374151',
  },
  optionDescription: {
    fontSize: '13px',
    color: '#9ca3af',
    marginTop: '2px',
  },
  smallToggle: {
    position: 'relative' as const,
    width: '44px',
    height: '24px',
    backgroundColor: '#d1d5db',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    border: 'none',
  },
  smallToggleActive: {
    backgroundColor: '#10b981',
  },
  smallToggleKnob: {
    position: 'absolute' as const,
    top: '2px',
    left: '2px',
    width: '20px',
    height: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '50%',
    transition: 'transform 0.2s',
  },
  smallToggleKnobActive: {
    transform: 'translateX(20px)',
  },
  footer: {
    marginTop: '24px',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  saveButton: {
    minHeight: '44px',
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#6366f1',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  saveButtonDisabled: {
    backgroundColor: '#a5b4fc',
    cursor: 'not-allowed',
  },
  saveButtonSuccess: {
    backgroundColor: '#10b981',
  },
  errorMessage: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '14px',
  },
  loadingOverlay: {
    opacity: 0.6,
    pointerEvents: 'none' as const,
  },
}

export function OfflineScheduleCard({
  schedule,
  onScheduleChange,
  onApplyPreset,
  onSave,
  hasChanges,
  loading,
  error,
}: OfflineScheduleCardProps) {
  const [activeTab, setActiveTab] = useState<'weekdays' | 'weekends'>('weekdays')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Default schedule if none provided
  const currentSchedule = useMemo(
    () =>
      schedule ?? {
        enabled: false,
        preset: 'custom' as const,
        weekdayStart: '21:00',
        weekdayEnd: '07:00',
        weekendStart: '22:00',
        weekendEnd: '08:00',
        appliesToParents: true,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    [schedule]
  )

  const handleToggleEnabled = useCallback(() => {
    onScheduleChange({
      ...currentSchedule,
      enabled: !currentSchedule.enabled,
    })
  }, [currentSchedule, onScheduleChange])

  const handlePresetClick = useCallback(
    (preset: Exclude<OfflineSchedulePreset, 'custom'>) => {
      const newSchedule = onApplyPreset(preset)
      onScheduleChange(newSchedule)
    },
    [onApplyPreset, onScheduleChange]
  )

  const handleTimeChange = useCallback(
    (field: 'weekdayStart' | 'weekdayEnd' | 'weekendStart' | 'weekendEnd', value: string) => {
      onScheduleChange({
        ...currentSchedule,
        [field]: value,
        preset: 'custom', // Changing time clears preset
      })
    },
    [currentSchedule, onScheduleChange]
  )

  const handleToggleParents = useCallback(() => {
    onScheduleChange({
      ...currentSchedule,
      appliesToParents: !currentSchedule.appliesToParents,
    })
  }, [currentSchedule, onScheduleChange])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    const result = await onSave(currentSchedule)

    if (result.success) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } else {
      setSaveError(result.error ?? 'Failed to save')
    }

    setSaving(false)
  }, [currentSchedule, onSave])

  const currentStartTime =
    activeTab === 'weekdays' ? currentSchedule.weekdayStart : currentSchedule.weekendStart
  const currentEndTime =
    activeTab === 'weekdays' ? currentSchedule.weekdayEnd : currentSchedule.weekendEnd
  const startField = activeTab === 'weekdays' ? 'weekdayStart' : 'weekendStart'
  const endField = activeTab === 'weekdays' ? 'weekdayEnd' : 'weekendEnd'

  if (loading) {
    return (
      <div
        style={{ ...styles.card, ...styles.loadingOverlay }}
        data-testid="offline-schedule-card-loading"
      >
        <div style={styles.header}>
          <div style={styles.titleSection}>
            <div style={styles.iconContainer}>
              <MoonIcon />
            </div>
            <div>
              <h2 style={styles.title}>Family Offline Time</h2>
              <p style={styles.subtitle}>Loading...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.card} data-testid="offline-schedule-card">
      {/* Header with title and main toggle */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <div style={styles.iconContainer}>
            <MoonIcon />
          </div>
          <div>
            <h2 style={styles.title}>Family Offline Time</h2>
            <p style={styles.subtitle}>Everyone unplugs together</p>
          </div>
        </div>
        <button
          type="button"
          style={{
            ...styles.toggle,
            ...(currentSchedule.enabled ? styles.toggleActive : {}),
          }}
          onClick={handleToggleEnabled}
          role="switch"
          aria-checked={currentSchedule.enabled}
          aria-label="Enable family offline time"
          data-testid="schedule-toggle"
        >
          <div
            style={{
              ...styles.toggleKnob,
              ...(currentSchedule.enabled ? styles.toggleKnobActive : {}),
            }}
          />
        </button>
      </div>

      {/* Content when enabled */}
      {currentSchedule.enabled && (
        <div style={styles.content}>
          {/* Preset buttons - AC3 */}
          <div style={styles.presetSection}>
            <span style={styles.presetLabel}>Quick presets</span>
            <div style={styles.presetButtons}>
              <button
                type="button"
                style={{
                  ...styles.presetButton,
                  ...(currentSchedule.preset === 'dinner_time' ? styles.presetButtonActive : {}),
                }}
                onClick={() => handlePresetClick('dinner_time')}
                aria-pressed={currentSchedule.preset === 'dinner_time'}
                data-testid="preset-dinner"
              >
                {OFFLINE_PRESET_LABELS.dinner_time}
              </button>
              <button
                type="button"
                style={{
                  ...styles.presetButton,
                  ...(currentSchedule.preset === 'bedtime' ? styles.presetButtonActive : {}),
                }}
                onClick={() => handlePresetClick('bedtime')}
                aria-pressed={currentSchedule.preset === 'bedtime'}
                data-testid="preset-bedtime"
              >
                {OFFLINE_PRESET_LABELS.bedtime}
              </button>
              <button
                type="button"
                style={{
                  ...styles.presetButton,
                  ...(currentSchedule.preset === 'custom' ? styles.presetButtonActive : {}),
                }}
                onClick={() =>
                  onScheduleChange({
                    ...currentSchedule,
                    preset: 'custom',
                  })
                }
                aria-pressed={currentSchedule.preset === 'custom'}
                data-testid="preset-custom"
              >
                {OFFLINE_PRESET_LABELS.custom}
              </button>
            </div>
          </div>

          {/* Weekday/Weekend tabs - AC2 */}
          <div style={styles.tabSection}>
            <div style={styles.tabs} role="tablist">
              <button
                type="button"
                style={{
                  ...styles.tab,
                  ...(activeTab === 'weekdays' ? styles.tabActive : {}),
                }}
                onClick={() => setActiveTab('weekdays')}
                role="tab"
                aria-selected={activeTab === 'weekdays'}
                data-testid="tab-weekdays"
              >
                Weekdays
              </button>
              <button
                type="button"
                style={{
                  ...styles.tab,
                  ...(activeTab === 'weekends' ? styles.tabActive : {}),
                }}
                onClick={() => setActiveTab('weekends')}
                role="tab"
                aria-selected={activeTab === 'weekends'}
                data-testid="tab-weekends"
              >
                Weekends
              </button>
            </div>
          </div>

          {/* Time pickers - AC1 */}
          <div style={styles.timeSection}>
            <div style={styles.timeRow}>
              <div style={styles.timeGroup}>
                <label style={styles.timeLabel} htmlFor="start-time">
                  Start Time
                </label>
                <select
                  id="start-time"
                  style={styles.timeSelect}
                  value={currentStartTime}
                  onChange={(e) => handleTimeChange(startField, e.target.value)}
                  data-testid="start-time-select"
                >
                  {TIME_OPTIONS.map((time) => (
                    <option key={`start-${time}`} value={time}>
                      {formatTimeForDisplay(time)}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.timeGroup}>
                <label style={styles.timeLabel} htmlFor="end-time">
                  End Time
                </label>
                <select
                  id="end-time"
                  style={styles.timeSelect}
                  value={currentEndTime}
                  onChange={(e) => handleTimeChange(endField, e.target.value)}
                  data-testid="end-time-select"
                >
                  {TIME_OPTIONS.map((time) => (
                    <option key={`end-${time}`} value={time}>
                      {formatTimeForDisplay(time)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div style={styles.divider} />

          {/* Parents included option - AC4 */}
          <div style={styles.optionRow}>
            <div>
              <div style={styles.optionLabel}>Include parents</div>
              <div style={styles.optionDescription}>Parents also unplug during offline time</div>
            </div>
            <button
              type="button"
              style={{
                ...styles.smallToggle,
                ...(currentSchedule.appliesToParents ? styles.smallToggleActive : {}),
              }}
              onClick={handleToggleParents}
              role="switch"
              aria-checked={currentSchedule.appliesToParents}
              aria-label="Include parents in offline time"
              data-testid="parents-toggle"
            >
              <div
                style={{
                  ...styles.smallToggleKnob,
                  ...(currentSchedule.appliesToParents ? styles.smallToggleKnobActive : {}),
                }}
              />
            </button>
          </div>

          {/* Error message */}
          {(error || saveError) && (
            <div style={styles.errorMessage} role="alert" data-testid="error-message">
              {error || saveError}
            </div>
          )}

          {/* Save button */}
          <div style={styles.footer}>
            <button
              type="button"
              style={{
                ...styles.saveButton,
                ...(saving || !hasChanges ? styles.saveButtonDisabled : {}),
                ...(saveSuccess ? styles.saveButtonSuccess : {}),
              }}
              onClick={handleSave}
              disabled={saving || !hasChanges}
              data-testid="save-button"
            >
              {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Schedule'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default OfflineScheduleCard
