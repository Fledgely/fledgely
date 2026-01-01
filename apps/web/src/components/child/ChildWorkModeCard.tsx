'use client'

/**
 * ChildWorkModeCard Component - Story 33.6
 *
 * Child dashboard card showing their own work mode analytics.
 * Bilateral transparency: shows exact same data as parent sees.
 */

import { useEffect, useState } from 'react'
import type { WorkModeAnalyticsData } from '../../hooks/useWorkModeAnalytics'
import { formatWorkHours, getDayLabel } from '../../hooks/useWorkModeAnalytics'
import { type DayOfWeek, type WorkModeCheckIn } from '@fledgely/shared'
import {
  getRecentCheckIns,
  markCheckInAsRead,
  respondToCheckIn,
} from '../../services/workModeService'

interface ChildWorkModeCardProps {
  childId: string
  familyId: string
  data: WorkModeAnalyticsData | null
  loading?: boolean
  error?: string | null
}

interface CheckInWithId extends WorkModeCheckIn {
  id: string
}

export function ChildWorkModeCard({
  childId,
  familyId,
  data,
  loading = false,
  error = null,
}: ChildWorkModeCardProps) {
  const [checkIns, setCheckIns] = useState<CheckInWithId[]>([])
  const [_loadingCheckIns, setLoadingCheckIns] = useState(true)
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [response, setResponse] = useState('')

  // Load recent check-ins
  useEffect(() => {
    if (!familyId || !childId) {
      setLoadingCheckIns(false)
      return
    }

    let mounted = true

    async function loadCheckIns() {
      try {
        const recent = await getRecentCheckIns(familyId, childId, 5)
        if (mounted) {
          setCheckIns(recent as CheckInWithId[])
        }
      } catch (err) {
        console.error('[ChildWorkModeCard] Error loading check-ins:', err)
      } finally {
        if (mounted) {
          setLoadingCheckIns(false)
        }
      }
    }

    loadCheckIns()

    return () => {
      mounted = false
    }
  }, [familyId, childId])

  // Mark check-in as read
  const handleMarkRead = async (checkInId: string) => {
    try {
      await markCheckInAsRead(familyId, childId, checkInId)
      setCheckIns((prev) =>
        prev.map((c) => (c.id === checkInId ? { ...c, readAt: Date.now() } : c))
      )
    } catch (err) {
      console.error('[ChildWorkModeCard] Error marking as read:', err)
    }
  }

  // Submit response
  const handleSubmitResponse = async (checkInId: string) => {
    if (!response.trim()) return

    try {
      await respondToCheckIn(familyId, childId, checkInId, response.trim())
      setCheckIns((prev) =>
        prev.map((c) =>
          c.id === checkInId ? { ...c, response: response.trim(), respondedAt: Date.now() } : c
        )
      )
      setRespondingTo(null)
      setResponse('')
    } catch (err) {
      console.error('[ChildWorkModeCard] Error responding:', err)
    }
  }

  // Unread check-ins
  const unreadCheckIns = checkIns.filter((c) => !c.readAt)

  if (loading) {
    return (
      <div
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        data-testid="child-work-mode-card"
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
        data-testid="child-work-mode-card"
      >
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      data-testid="child-work-mode-card"
    >
      {/* Header */}
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Work Mode Stats</h3>

      {/* Unread check-ins notification */}
      {unreadCheckIns.length > 0 && (
        <div
          className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-md"
          data-testid="unread-check-ins"
        >
          <p className="text-sm font-medium text-blue-800">
            You have {unreadCheckIns.length} new message{unreadCheckIns.length > 1 ? 's' : ''} from
            your parent
          </p>
          {unreadCheckIns.map((checkIn) => (
            <div key={checkIn.id} className="mt-2 p-2 bg-white rounded border border-blue-100">
              <p className="text-sm text-gray-700">
                <span className="font-medium">{checkIn.parentName}:</span> &ldquo;{checkIn.message}
                &rdquo;
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => handleMarkRead(checkIn.id)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Mark as read
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleMarkRead(checkIn.id)
                    setRespondingTo(checkIn.id)
                  }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Reply (optional)
                </button>
              </div>
              {respondingTo === checkIn.id && (
                <div className="mt-2">
                  <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Type a reply..."
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    rows={2}
                    maxLength={1000}
                    data-testid="response-input"
                  />
                  <div className="flex justify-end gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setRespondingTo(null)}
                      className="text-xs text-gray-600 hover:underline"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSubmitResponse(checkIn.id)}
                      className="text-xs text-blue-600 font-medium hover:underline"
                      data-testid="submit-response"
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {(!data || data.weeklySessionCount === 0) && (
        <p className="text-gray-600 mb-4">No work mode sessions this week yet.</p>
      )}

      {/* Stats when data exists */}
      {data && data.weeklySessionCount > 0 && (
        <>
          {/* Weekly hours */}
          <div className="mb-4">
            <p className="text-3xl font-bold text-gray-900" data-testid="weekly-hours">
              {formatWorkHours(data.weeklyTotalHours)}
            </p>
            <p className="text-sm text-gray-600">worked this week</p>
          </div>

          {/* Session count */}
          <div className="mb-4">
            <p className="text-sm text-gray-500">Sessions this week</p>
            <p className="text-xl font-semibold text-gray-900" data-testid="session-count">
              {data.weeklySessionCount}
            </p>
          </div>

          {/* Daily distribution */}
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">Your work days</p>
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
                      className={`w-full rounded-t ${count > 0 ? 'bg-green-500' : 'bg-gray-200'}`}
                      style={{ height: `${height}px` }}
                      title={`${getDayLabel(day)}: ${count} sessions`}
                    />
                    <p className="text-xs text-gray-500 mt-1">{getDayLabel(day).charAt(0)}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Transparency section */}
          <div className="mt-4 pt-4 border-t border-gray-200" data-testid="transparency-section">
            <p className="text-xs font-medium text-gray-500 mb-2">What your parent sees:</p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>
                <span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-2"></span>
                Same work hours and session counts as you
              </li>
              {data.isAnomalous && (
                <li>
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-2"></span>A
                  friendly note that work hours are higher than usual
                </li>
              )}
              {data.outsideScheduleCount > 0 && (
                <li>
                  <span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-2"></span>
                  That you started work {data.outsideScheduleCount} time
                  {data.outsideScheduleCount > 1 ? 's' : ''} outside scheduled hours
                </li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
