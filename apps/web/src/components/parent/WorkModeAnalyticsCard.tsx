'use client'

/**
 * WorkModeAnalyticsCard Component - Story 33.6
 *
 * Parent dashboard card showing child's work mode analytics.
 * Trust-based, supportive framing - no punitive language.
 */

import { useState } from 'react'
import type { WorkModeAnalyticsData } from '../../hooks/useWorkModeAnalytics'
import { formatWorkHours, getDayLabel } from '../../hooks/useWorkModeAnalytics'
import { WORK_MODE_ANALYTICS_MESSAGES, type DayOfWeek } from '@fledgely/shared'
import { WorkModeCheckIn } from './WorkModeCheckIn'

interface WorkModeAnalyticsCardProps {
  childId: string
  childName: string
  familyId: string
  parentId: string
  parentName: string
  data: WorkModeAnalyticsData | null
  loading?: boolean
  error?: string | null
}

/**
 * Format change value with + or - prefix
 */
function formatChange(value: number, unit: string): string {
  if (value === 0) return 'same as last week'
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${value}${unit} from last week`
}

/**
 * Get color class for anomaly indicator
 */
function getAnomalyColorClass(isAnomalous: boolean): string {
  // Trust-based: even anomalies use soft colors
  return isAnomalous ? 'text-amber-600 bg-amber-50' : 'text-green-600 bg-green-50'
}

export function WorkModeAnalyticsCard({
  childId,
  childName,
  familyId,
  parentId,
  parentName,
  data,
  loading = false,
  error = null,
}: WorkModeAnalyticsCardProps) {
  const [showCheckIn, setShowCheckIn] = useState(false)
  const messages = WORK_MODE_ANALYTICS_MESSAGES

  if (loading) {
    return (
      <div
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        data-testid="work-mode-analytics-card"
      >
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="bg-white rounded-lg shadow-sm border border-red-200 p-6"
        data-testid="work-mode-analytics-card"
      >
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (!data || data.weeklySessionCount === 0) {
    return (
      <div
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        data-testid="work-mode-analytics-card"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{childName}&apos;s Work Mode</h3>
        <p className="text-gray-600">No work mode sessions this week yet.</p>
      </div>
    )
  }

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      data-testid="work-mode-analytics-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{childName}&apos;s Work Mode</h3>
        <button
          type="button"
          onClick={() => setShowCheckIn(true)}
          className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
          data-testid="check-in-button"
        >
          Check In
        </button>
      </div>

      {/* Weekly hours - main stat */}
      <div className="mb-4">
        <p className="text-3xl font-bold text-gray-900" data-testid="weekly-hours">
          {formatWorkHours(data.weeklyTotalHours)}
        </p>
        <p className="text-sm text-gray-600">
          {messages.weeklyHours(data.weeklyTotalHours, childName)}
        </p>
        <p className="text-xs text-gray-500 mt-1" data-testid="hours-change">
          {formatChange(data.hoursChange, 'h')}
        </p>
      </div>

      {/* Anomaly indicator (trust-based framing) */}
      {data.isAnomalous && (
        <div
          className={`mb-4 p-3 rounded-md ${getAnomalyColorClass(true)}`}
          data-testid="anomaly-indicator"
        >
          <p className="text-sm font-medium">Work hours higher than usual</p>
          <p className="text-xs mt-1">
            {messages.anomalyAlert(
              data.weeklyTotalHours,
              data.typicalWeeklyHours,
              data.deviationFromTypical
            )}
          </p>
        </div>
      )}

      {/* Session breakdown */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-500">Sessions this week</p>
          <p className="text-xl font-semibold text-gray-900" data-testid="session-count">
            {data.weeklySessionCount}
          </p>
          <p className="text-xs text-gray-500">
            {data.scheduledSessions} scheduled, {data.manualSessions} manual
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Average session</p>
          <p className="text-xl font-semibold text-gray-900" data-testid="avg-session">
            {formatWorkHours(data.weeklyAverageSessionHours)}
          </p>
        </div>
      </div>

      {/* Outside schedule indicator (informational) */}
      {data.outsideScheduleCount > 0 && (
        <div className="mb-4 p-3 rounded-md bg-gray-50" data-testid="outside-schedule-info">
          <p className="text-sm text-gray-700">
            {data.outsideScheduleCount} session{data.outsideScheduleCount > 1 ? 's' : ''} started
            outside scheduled hours
          </p>
          <p className="text-xs text-gray-500 mt-1">
            This is informational only - work mode was not blocked.
          </p>
        </div>
      )}

      {/* Daily distribution mini-chart */}
      <div className="mb-2">
        <p className="text-sm text-gray-500 mb-2">Sessions by day</p>
        <div className="flex gap-1 items-end h-12" data-testid="daily-distribution">
          {(
            [
              'sunday',
              'monday',
              'tuesday',
              'wednesday',
              'thursday',
              'friday',
              'saturday',
            ] as DayOfWeek[]
          ).map((day) => {
            const count = data.dailyDistribution[day] || 0
            const maxCount = Math.max(...Object.values(data.dailyDistribution), 1)
            const height = count > 0 ? Math.max(12, (count / maxCount) * 48) : 4

            return (
              <div key={day} className="flex-1 flex flex-col items-center">
                <div
                  className={`w-full rounded-t ${count > 0 ? 'bg-blue-500' : 'bg-gray-200'}`}
                  style={{ height: `${height}px` }}
                  title={`${getDayLabel(day)}: ${count} sessions`}
                />
                <p className="text-xs text-gray-500 mt-1">{getDayLabel(day).charAt(0)}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Period info */}
      <p className="text-xs text-gray-400 text-right">
        {data.periodStart} to {data.periodEnd}
      </p>

      {/* Check-in modal */}
      {showCheckIn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full">
            <WorkModeCheckIn
              familyId={familyId}
              childId={childId}
              childName={childName}
              parentId={parentId}
              parentName={parentName}
              onSent={() => setShowCheckIn(false)}
              onCancel={() => setShowCheckIn(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
