/**
 * WorkModeSettings Component - Story 33.3
 *
 * Parent UI for configuring work mode for their working teen.
 * Allows setting work schedules and customizing work app whitelist.
 */

'use client'

import { useState } from 'react'
import { useWorkModeConfig } from '../../hooks/useWorkModeConfig'
import { WORK_MODE_DEFAULT_APPS } from '@fledgely/shared'
import type { WorkSchedule } from '@fledgely/shared'

interface WorkModeSettingsProps {
  childId: string
  familyId: string
  parentUid: string
  childName?: string
}

const DAY_OPTIONS = [
  { value: 'sunday', label: 'Sun' },
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
] as const

interface ScheduleFormData {
  name: string
  days: WorkSchedule['days']
  startTime: string
  endTime: string
  isEnabled: boolean
}

const INITIAL_SCHEDULE_FORM: ScheduleFormData = {
  name: '',
  days: [],
  startTime: '09:00',
  endTime: '17:00',
  isEnabled: true,
}

export function WorkModeSettings({
  childId,
  familyId,
  parentUid,
  childName,
}: WorkModeSettingsProps) {
  const {
    config,
    loading,
    error,
    addSchedule,
    removeSchedule,
    toggleScheduleEnabled,
    addWorkApp,
    removeWorkApp,
    toggleDefaultWorkApps,
    togglePauseScreenshots,
    toggleSuspendTimeLimits,
    toggleAllowManualActivation,
    effectiveWorkApps,
  } = useWorkModeConfig({ childId, familyId, parentUid })

  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormData>(INITIAL_SCHEDULE_FORM)
  const [addingSchedule, setAddingSchedule] = useState(false)

  const [newWorkApp, setNewWorkApp] = useState({ pattern: '', name: '' })
  const [addingApp, setAddingApp] = useState(false)

  if (loading) {
    return (
      <div className="animate-pulse p-4" data-testid="work-mode-settings-loading">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="p-4 bg-red-50 border border-red-200 rounded-lg"
        data-testid="work-mode-settings-error"
      >
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  const handleToggleDay = (day: WorkSchedule['days'][number]) => {
    setScheduleForm((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day],
    }))
  }

  const handleAddSchedule = async () => {
    if (!scheduleForm.name.trim() || scheduleForm.days.length === 0) return
    setAddingSchedule(true)
    try {
      await addSchedule({
        name: scheduleForm.name.trim(),
        days: scheduleForm.days,
        startTime: scheduleForm.startTime,
        endTime: scheduleForm.endTime,
        isEnabled: scheduleForm.isEnabled,
      })
      setScheduleForm(INITIAL_SCHEDULE_FORM)
      setShowScheduleForm(false)
    } finally {
      setAddingSchedule(false)
    }
  }

  const handleAddWorkApp = async () => {
    if (!newWorkApp.pattern.trim() || !newWorkApp.name.trim()) return
    setAddingApp(true)
    try {
      await addWorkApp(newWorkApp.pattern.trim(), newWorkApp.name.trim())
      setNewWorkApp({ pattern: '', name: '' })
    } finally {
      setAddingApp(false)
    }
  }

  const formatScheduleDays = (days: WorkSchedule['days']) => {
    const dayMap: Record<string, string> = {
      sunday: 'Sun',
      monday: 'Mon',
      tuesday: 'Tue',
      wednesday: 'Wed',
      thursday: 'Thu',
      friday: 'Fri',
      saturday: 'Sat',
    }
    return days.map((d) => dayMap[d]).join(', ')
  }

  return (
    <div className="space-y-6" data-testid="work-mode-settings">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Work Mode Settings</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure work schedules and settings for {childName || 'your teen'}
        </p>
      </div>

      {/* Work Schedules Section */}
      <div
        className="bg-white border border-gray-200 rounded-lg"
        data-testid="work-schedules-section"
      >
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Work Schedules</h3>
            <p className="text-xs text-gray-500 mt-1">
              Define when work mode should automatically activate
            </p>
          </div>
          {!showScheduleForm && (
            <button
              onClick={() => setShowScheduleForm(true)}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
              data-testid="add-schedule-button"
            >
              Add Schedule
            </button>
          )}
        </div>

        {/* Schedule Form */}
        {showScheduleForm && (
          <div className="p-4 border-b border-gray-200 bg-gray-50" data-testid="schedule-form">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Coffee Shop Shifts"
                  value={scheduleForm.name}
                  onChange={(e) => setScheduleForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                  data-testid="schedule-name-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Days</label>
                <div className="flex flex-wrap gap-2">
                  {DAY_OPTIONS.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => handleToggleDay(day.value)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        scheduleForm.days.includes(day.value)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      data-testid={`day-toggle-${day.value}`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={scheduleForm.startTime}
                    onChange={(e) =>
                      setScheduleForm((prev) => ({ ...prev, startTime: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    data-testid="schedule-start-time"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={scheduleForm.endTime}
                    onChange={(e) =>
                      setScheduleForm((prev) => ({ ...prev, endTime: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    data-testid="schedule-end-time"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowScheduleForm(false)
                    setScheduleForm(INITIAL_SCHEDULE_FORM)
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md text-sm hover:bg-gray-200"
                  data-testid="cancel-schedule-button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSchedule}
                  disabled={
                    addingSchedule || !scheduleForm.name.trim() || scheduleForm.days.length === 0
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="save-schedule-button"
                >
                  {addingSchedule ? 'Saving...' : 'Save Schedule'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Schedules List */}
        <div className="p-4">
          {(config?.schedules ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No schedules configured. Add a schedule to enable automatic work mode.
            </p>
          ) : (
            <ul className="space-y-3" data-testid="schedules-list">
              {(config?.schedules ?? []).map((schedule) => (
                <li
                  key={schedule.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  data-testid={`schedule-${schedule.id}`}
                >
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={schedule.isEnabled}
                        onChange={() => toggleScheduleEnabled(schedule.id)}
                        className="sr-only peer"
                        data-testid={`schedule-toggle-${schedule.id}`}
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{schedule.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatScheduleDays(schedule.days)} | {schedule.startTime} -{' '}
                        {schedule.endTime}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeSchedule(schedule.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                    data-testid={`remove-schedule-${schedule.id}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Work Mode Settings Toggles */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-4" data-testid="work-mode-toggles-section">
        <h3 className="text-sm font-medium text-gray-900">Work Mode Behavior</h3>

        <div className="space-y-3">
          {/* Pause Screenshots */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">Pause Screenshot Capture</p>
              <p className="text-xs text-gray-500">
                Privacy at workplace - no screenshots during work
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config?.pauseScreenshots ?? true}
                onChange={(e) => togglePauseScreenshots(e.target.checked)}
                className="sr-only peer"
                data-testid="pause-screenshots-toggle"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Suspend Time Limits */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">Suspend Time Limits</p>
              <p className="text-xs text-gray-500">No app time limits during work hours</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config?.suspendTimeLimits ?? true}
                onChange={(e) => toggleSuspendTimeLimits(e.target.checked)}
                className="sr-only peer"
                data-testid="suspend-time-limits-toggle"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Allow Manual Activation */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">Allow Manual Activation</p>
              <p className="text-xs text-gray-500">
                Teen can start/stop work mode outside scheduled times
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config?.allowManualActivation ?? true}
                onChange={(e) => toggleAllowManualActivation(e.target.checked)}
                className="sr-only peer"
                data-testid="allow-manual-activation-toggle"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Default Work Apps Toggle */}
      <div className="bg-gray-50 p-4 rounded-lg" data-testid="default-apps-section">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Use Default Work Apps</h3>
            <p className="text-xs text-gray-500 mt-1">
              Include common work apps: scheduling, communication, business tools
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config?.useDefaultWorkApps ?? true}
              onChange={(e) => toggleDefaultWorkApps(e.target.checked)}
              className="sr-only peer"
              data-testid="default-work-apps-toggle"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {config?.useDefaultWorkApps && (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Object.entries(WORK_MODE_DEFAULT_APPS).map(([category, apps]) => (
              <div key={category}>
                <p className="text-xs font-medium text-gray-700 mb-1 capitalize">{category}</p>
                <div className="flex flex-wrap gap-1">
                  {apps.slice(0, 3).map((app) => (
                    <span
                      key={app.pattern}
                      className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs"
                    >
                      {app.name}
                    </span>
                  ))}
                  {apps.length > 3 && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">
                      +{apps.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Work Apps Whitelist */}
      <div className="bg-white border border-gray-200 rounded-lg" data-testid="work-apps-section">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <span className="text-blue-600">&#128188;</span> Work App Whitelist
          </h3>
          <p className="text-xs text-gray-500 mt-1">Apps and sites allowed during work mode</p>
        </div>

        {/* App List */}
        <div className="p-4 max-h-64 overflow-y-auto">
          {effectiveWorkApps.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">No work apps configured</p>
          ) : (
            <ul className="space-y-2" data-testid="work-apps-list">
              {effectiveWorkApps.map((app) => (
                <li key={app.pattern} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-gray-900">{app.name}</span>
                    <span className="text-gray-400 text-xs ml-2">{app.pattern}</span>
                    {app.isDefault && (
                      <span className="ml-2 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                        default
                      </span>
                    )}
                  </div>
                  {!app.isDefault && (
                    <button
                      onClick={() => removeWorkApp(app.pattern)}
                      className="text-red-500 hover:text-red-700 text-xs"
                      data-testid={`remove-work-app-${app.pattern}`}
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add App Form */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Domain (e.g., example.com)"
              value={newWorkApp.pattern}
              onChange={(e) => setNewWorkApp((prev) => ({ ...prev, pattern: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              data-testid="work-app-pattern-input"
            />
            <input
              type="text"
              placeholder="Name"
              value={newWorkApp.name}
              onChange={(e) => setNewWorkApp((prev) => ({ ...prev, name: e.target.value }))}
              className="w-32 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              data-testid="work-app-name-input"
            />
            <button
              onClick={handleAddWorkApp}
              disabled={addingApp || !newWorkApp.pattern.trim() || !newWorkApp.name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="add-work-app-button"
            >
              {addingApp ? '...' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
