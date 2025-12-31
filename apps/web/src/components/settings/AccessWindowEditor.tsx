'use client'

/**
 * AccessWindowEditor Component - Story 19D.4
 *
 * Parent UI to configure caregiver access windows.
 *
 * Acceptance Criteria:
 * - AC1: Parent can set access windows (e.g., Saturday 2-6pm)
 *
 * UI/UX Requirements:
 * - Simple day/time picker (not complex scheduling)
 * - Support multiple windows
 * - Clear preview of when caregiver can access
 * - Validate window times (start before end)
 */

import { useState, useCallback } from 'react'
import type { AccessWindow } from '@fledgely/shared'

/**
 * Day options for access window selection
 */
const DAY_OPTIONS = [
  { value: 'sunday', label: 'Sunday' },
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
] as const

/**
 * Common time options for picker
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
]

/**
 * Format time string (HH:MM) for display
 */
function formatTimeForDisplay(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

/**
 * Props for AccessWindowEditor component
 */
export interface AccessWindowEditorProps {
  /** Current access windows */
  accessWindows: AccessWindow[]
  /** Callback when windows change */
  onChange: (windows: AccessWindow[]) => void
  /** Parent's timezone (IANA format) */
  timezone?: string
  /** Maximum number of windows allowed */
  maxWindows?: number
  /** Whether editing is disabled */
  disabled?: boolean
}

/**
 * Validation result for an access window
 */
interface WindowValidation {
  isValid: boolean
  error?: string
}

/**
 * Validate a single access window
 */
function validateWindow(window: Partial<AccessWindow>): WindowValidation {
  if (!window.dayOfWeek) {
    return { isValid: false, error: 'Select a day' }
  }
  if (!window.startTime) {
    return { isValid: false, error: 'Select a start time' }
  }
  if (!window.endTime) {
    return { isValid: false, error: 'Select an end time' }
  }

  const startMinutes =
    parseInt(window.startTime.split(':')[0]) * 60 + parseInt(window.startTime.split(':')[1])
  const endMinutes =
    parseInt(window.endTime.split(':')[0]) * 60 + parseInt(window.endTime.split(':')[1])

  if (startMinutes >= endMinutes) {
    return { isValid: false, error: 'End time must be after start time' }
  }

  return { isValid: true }
}

/**
 * AccessWindowEditor - Parent UI for configuring caregiver access windows
 *
 * Story 19D.4: AC1 - Parent can set access windows
 */
export function AccessWindowEditor({
  accessWindows,
  onChange,
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  maxWindows = 7,
  disabled = false,
}: AccessWindowEditorProps) {
  const [editingWindow, setEditingWindow] = useState<Partial<AccessWindow> | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAddWindow = useCallback(() => {
    setEditingWindow({
      dayOfWeek: 'saturday',
      startTime: '14:00',
      endTime: '18:00',
      timezone,
    })
    setEditingIndex(null)
    setError(null)
  }, [timezone])

  const handleEditWindow = useCallback(
    (index: number) => {
      setEditingWindow({ ...accessWindows[index] })
      setEditingIndex(index)
      setError(null)
    },
    [accessWindows]
  )

  const handleRemoveWindow = useCallback(
    (index: number) => {
      const newWindows = accessWindows.filter((_, i) => i !== index)
      onChange(newWindows)
    },
    [accessWindows, onChange]
  )

  const handleSaveWindow = useCallback(() => {
    if (!editingWindow) return

    const validation = validateWindow(editingWindow)
    if (!validation.isValid) {
      setError(validation.error ?? 'Invalid window')
      return
    }

    const completeWindow: AccessWindow = {
      dayOfWeek: editingWindow.dayOfWeek as AccessWindow['dayOfWeek'],
      startTime: editingWindow.startTime!,
      endTime: editingWindow.endTime!,
      timezone: editingWindow.timezone ?? timezone,
    }

    if (editingIndex !== null) {
      // Update existing
      const newWindows = [...accessWindows]
      newWindows[editingIndex] = completeWindow
      onChange(newWindows)
    } else {
      // Add new
      onChange([...accessWindows, completeWindow])
    }

    setEditingWindow(null)
    setEditingIndex(null)
    setError(null)
  }, [editingWindow, editingIndex, accessWindows, onChange, timezone])

  const handleCancelEdit = useCallback(() => {
    setEditingWindow(null)
    setEditingIndex(null)
    setError(null)
  }, [])

  // Styles
  const containerStyles: React.CSSProperties = {
    fontFamily: 'system-ui, -apple-system, sans-serif',
  }

  const headerStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  }

  const titleStyles: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  }

  const addButtonStyles: React.CSSProperties = {
    minHeight: '44px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    cursor: disabled || accessWindows.length >= maxWindows ? 'not-allowed' : 'pointer',
    opacity: disabled || accessWindows.length >= maxWindows ? 0.6 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  }

  const windowListStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  }

  const windowItemStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  }

  const windowInfoStyles: React.CSSProperties = {
    fontSize: '16px',
    color: '#374151',
  }

  const windowActionsStyles: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
  }

  const iconButtonStyles: React.CSSProperties = {
    minHeight: '44px',
    minWidth: '44px',
    padding: '8px',
    fontSize: '16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  }

  const editFormStyles: React.CSSProperties = {
    padding: '20px',
    backgroundColor: '#f0f9ff',
    borderRadius: '12px',
    border: '1px solid #bfdbfe',
    marginBottom: '16px',
  }

  const formRowStyles: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  }

  const formGroupStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: '1 1 auto',
    minWidth: '120px',
  }

  const labelStyles: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  }

  const selectStyles: React.CSSProperties = {
    minHeight: '44px',
    padding: '10px 12px',
    fontSize: '16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: 'white',
  }

  const formActionsStyles: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  }

  const saveButtonStyles: React.CSSProperties = {
    minHeight: '44px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    color: 'white',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  }

  const cancelButtonStyles: React.CSSProperties = {
    minHeight: '44px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  }

  const errorStyles: React.CSSProperties = {
    marginTop: '8px',
    padding: '8px 12px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '6px',
    fontSize: '14px',
  }

  const emptyStateStyles: React.CSSProperties = {
    textAlign: 'center',
    padding: '24px',
    color: '#6b7280',
    fontSize: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    border: '1px dashed #d1d5db',
  }

  const formatWindowDisplay = (window: AccessWindow): string => {
    const dayLabel =
      DAY_OPTIONS.find((d) => d.value === window.dayOfWeek)?.label ?? window.dayOfWeek
    return `${dayLabel} ${formatTimeForDisplay(window.startTime)} - ${formatTimeForDisplay(window.endTime)}`
  }

  return (
    <div style={containerStyles} data-testid="access-window-editor">
      <div style={headerStyles}>
        <h3 style={titleStyles}>Access Windows</h3>
        {!editingWindow && (
          <button
            style={addButtonStyles}
            onClick={handleAddWindow}
            disabled={disabled || accessWindows.length >= maxWindows}
            aria-label="Add access window"
            data-testid="add-window-button"
          >
            <span aria-hidden="true">+</span>
            Add Window
          </button>
        )}
      </div>

      {/* Edit/Add Form */}
      {editingWindow && (
        <div style={editFormStyles} data-testid="window-edit-form">
          <div style={formRowStyles}>
            <div style={formGroupStyles}>
              <label style={labelStyles} htmlFor="window-day">
                Day
              </label>
              <select
                id="window-day"
                style={selectStyles}
                value={editingWindow.dayOfWeek ?? ''}
                onChange={(e) =>
                  setEditingWindow({
                    ...editingWindow,
                    dayOfWeek: e.target.value as AccessWindow['dayOfWeek'],
                  })
                }
                data-testid="window-day-select"
              >
                {DAY_OPTIONS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={formGroupStyles}>
              <label style={labelStyles} htmlFor="window-start">
                Start Time
              </label>
              <select
                id="window-start"
                style={selectStyles}
                value={editingWindow.startTime ?? ''}
                onChange={(e) => setEditingWindow({ ...editingWindow, startTime: e.target.value })}
                data-testid="window-start-select"
              >
                {TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>
                    {formatTimeForDisplay(time)}
                  </option>
                ))}
              </select>
            </div>

            <div style={formGroupStyles}>
              <label style={labelStyles} htmlFor="window-end">
                End Time
              </label>
              <select
                id="window-end"
                style={selectStyles}
                value={editingWindow.endTime ?? ''}
                onChange={(e) => setEditingWindow({ ...editingWindow, endTime: e.target.value })}
                data-testid="window-end-select"
              >
                {TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>
                    {formatTimeForDisplay(time)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div style={errorStyles} role="alert" data-testid="window-error">
              {error}
            </div>
          )}

          <div style={formActionsStyles}>
            <button
              style={cancelButtonStyles}
              onClick={handleCancelEdit}
              data-testid="cancel-window-button"
            >
              Cancel
            </button>
            <button
              style={saveButtonStyles}
              onClick={handleSaveWindow}
              data-testid="save-window-button"
            >
              {editingIndex !== null ? 'Update' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {/* Window List */}
      <div style={windowListStyles}>
        {accessWindows.length === 0 && !editingWindow ? (
          <div style={emptyStateStyles} data-testid="no-windows-message">
            No access windows set. Caregiver has access anytime.
          </div>
        ) : (
          accessWindows.map((window, index) => (
            <div key={index} style={windowItemStyles} data-testid={`window-item-${index}`}>
              <span style={windowInfoStyles}>{formatWindowDisplay(window)}</span>
              <div style={windowActionsStyles}>
                <button
                  style={iconButtonStyles}
                  onClick={() => handleEditWindow(index)}
                  disabled={disabled || editingWindow !== null}
                  aria-label={`Edit ${formatWindowDisplay(window)}`}
                  data-testid={`edit-window-${index}`}
                >
                  ✏️
                </button>
                <button
                  style={{ ...iconButtonStyles, color: '#dc2626' }}
                  onClick={() => handleRemoveWindow(index)}
                  disabled={disabled || editingWindow !== null}
                  aria-label={`Remove ${formatWindowDisplay(window)}`}
                  data-testid={`remove-window-${index}`}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default AccessWindowEditor
