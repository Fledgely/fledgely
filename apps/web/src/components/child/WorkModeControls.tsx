/**
 * WorkModeControls Component - Story 33.3
 *
 * Teen controls for work mode management.
 * Shows work mode status, allows manual start/stop, and displays schedule info.
 */

'use client'

import { useWorkMode } from '../../hooks/useWorkMode'
import { useWorkModeConfig } from '../../hooks/useWorkModeConfig'
import { WORK_MODE_MESSAGES } from '@fledgely/shared'

interface WorkModeControlsProps {
  childId: string
  familyId: string
}

export function WorkModeControls({ childId, familyId }: WorkModeControlsProps) {
  const { config } = useWorkModeConfig({ childId, familyId, parentUid: null })

  const {
    loading,
    error,
    isActive,
    currentSession,
    timeElapsedFormatted,
    timeRemainingFormatted,
    startWorkMode,
    stopWorkMode,
    isInScheduledHours,
    currentSchedule: _currentSchedule,
    nextScheduleStart,
    totalSessionsThisWeek,
    totalWorkTimeThisWeek,
  } = useWorkMode({
    childId,
    familyId,
    schedules: config?.schedules ?? [],
    allowManualActivation: config?.allowManualActivation ?? true,
  })

  if (loading) {
    return (
      <div className="animate-pulse p-4" data-testid="work-mode-controls-loading">
        <div className="h-20 bg-gray-200 rounded-lg"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="p-4 bg-red-50 border border-red-200 rounded-lg"
        data-testid="work-mode-controls-error"
      >
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    )
  }

  const formatTotalTime = (ms: number): string => {
    const hours = Math.floor(ms / (60 * 60 * 1000))
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const formatNextSchedule = (date: Date): string => {
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    const days = Math.floor(diff / (24 * 60 * 60 * 1000))
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    if (days === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    } else if (days === 1) {
      return `Tomorrow at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    } else {
      return `${dayNames[date.getDay()]} at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    }
  }

  return (
    <div className="space-y-4" data-testid="work-mode-controls">
      {/* Main Status Card */}
      <div
        className={`rounded-xl p-5 ${
          isActive
            ? 'bg-gradient-to-br from-blue-500 to-blue-600'
            : 'bg-gradient-to-br from-gray-100 to-gray-200'
        }`}
        data-testid="work-mode-status-card"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{isActive ? '💼' : '🏢'}</span>
            <div>
              <h3
                className={`text-lg font-bold ${isActive ? 'text-white' : 'text-gray-900'}`}
                data-testid="work-mode-status-title"
              >
                {isActive
                  ? WORK_MODE_MESSAGES.active(currentSession?.scheduleName ?? null)
                  : 'Work Mode'}
              </h3>
              <p
                className={`text-sm ${isActive ? 'text-blue-100' : 'text-gray-500'}`}
                data-testid="work-mode-status-subtitle"
              >
                {isActive
                  ? currentSession?.activationType === 'scheduled'
                    ? `Auto-started: ${currentSession?.scheduleName ?? 'Scheduled'}`
                    : WORK_MODE_MESSAGES.manualStart
                  : isInScheduledHours
                    ? 'Scheduled work time active'
                    : 'Ready when you are'}
              </p>
            </div>
          </div>

          {/* Timer Display */}
          {isActive && (
            <div className="text-right" data-testid="work-mode-timer">
              <p className="text-2xl font-bold text-white">{timeElapsedFormatted ?? '0m'}</p>
              {timeRemainingFormatted && (
                <p className="text-sm text-blue-100">{timeRemainingFormatted} remaining</p>
              )}
            </div>
          )}
        </div>

        {/* Manual Controls */}
        {config?.allowManualActivation && (
          <div className="mt-4">
            {isActive ? (
              <button
                onClick={stopWorkMode}
                className="w-full py-3 px-4 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg transition-colors"
                data-testid="work-mode-stop-button"
              >
                End Work Mode
              </button>
            ) : (
              <button
                onClick={startWorkMode}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                data-testid="work-mode-start-button"
              >
                Start Work Mode
              </button>
            )}
          </div>
        )}
      </div>

      {/* Schedule Info Card */}
      {!isActive && (config?.schedules ?? []).length > 0 && (
        <div
          className="bg-white border border-gray-200 rounded-lg p-4"
          data-testid="work-mode-schedule-info"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">📅</span>
            <h4 className="text-sm font-medium text-gray-700">Upcoming Schedule</h4>
          </div>

          {nextScheduleStart ? (
            <p className="text-sm text-gray-600" data-testid="next-schedule-time">
              Next shift: {formatNextSchedule(nextScheduleStart)}
            </p>
          ) : (
            <p className="text-sm text-gray-500">No upcoming scheduled shifts</p>
          )}
        </div>
      )}

      {/* Today's Stats */}
      {(totalSessionsThisWeek > 0 || totalWorkTimeThisWeek > 0) && (
        <div className="bg-gray-50 rounded-lg p-4" data-testid="work-mode-stats">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Today&apos;s Work</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-gray-900" data-testid="sessions-today">
                {totalSessionsThisWeek}
              </p>
              <p className="text-xs text-gray-500">Sessions</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900" data-testid="total-work-time">
                {formatTotalTime(totalWorkTimeThisWeek)}
              </p>
              <p className="text-xs text-gray-500">Total Time</p>
            </div>
          </div>
        </div>
      )}

      {/* Active Benefits Reminder */}
      {isActive && (
        <div
          className="bg-blue-50 border border-blue-100 rounded-lg p-4"
          data-testid="work-mode-benefits"
        >
          <h4 className="text-sm font-medium text-blue-800 mb-2">While Work Mode is Active:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            {config?.pauseScreenshots && (
              <li className="flex items-center gap-2">
                <span>🔒</span> Screenshot capture paused
              </li>
            )}
            {config?.suspendTimeLimits && (
              <li className="flex items-center gap-2">
                <span>⏰</span> App time limits suspended
              </li>
            )}
            <li className="flex items-center gap-2">
              <span>✅</span> Work apps whitelisted
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
