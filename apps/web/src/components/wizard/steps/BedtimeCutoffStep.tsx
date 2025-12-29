/**
 * Bedtime Cutoff Step Component.
 *
 * Story 4.4: Quick Start Wizard - AC2
 *
 * Displays bedtime configuration for weekdays and weekends.
 */

'use client'

import type { BedtimeCutoff, AgeGroup } from '../../../hooks/useQuickStartWizard'

interface BedtimeCutoffStepProps {
  bedtimeCutoff: BedtimeCutoff | null
  ageGroup: AgeGroup | null
  onUpdateBedtime: (bedtime: BedtimeCutoff | null) => void
}

const DEFAULT_BEDTIMES: Record<AgeGroup, BedtimeCutoff> = {
  '5-7': { weekday: '19:30', weekend: '20:30' },
  '8-10': { weekday: '20:00', weekend: '21:00' },
  '11-13': { weekday: '21:00', weekend: '22:00' },
  '14-16': { weekday: '22:00', weekend: '23:00' },
}

export function BedtimeCutoffStep({
  bedtimeCutoff,
  ageGroup,
  onUpdateBedtime,
}: BedtimeCutoffStepProps) {
  // Derive state directly from prop to avoid sync issues
  const noBedtimeLimit = bedtimeCutoff === null

  const defaultBedtime = ageGroup ? DEFAULT_BEDTIMES[ageGroup] : DEFAULT_BEDTIMES['11-13']

  const currentBedtime = bedtimeCutoff || defaultBedtime

  const handleNoBedtimeToggle = (checked: boolean) => {
    if (checked) {
      onUpdateBedtime(null)
    } else {
      onUpdateBedtime(defaultBedtime)
    }
  }

  const handleWeekdayChange = (value: string) => {
    if (!noBedtimeLimit) {
      onUpdateBedtime({ ...currentBedtime, weekday: value })
    }
  }

  const handleWeekendChange = (value: string) => {
    if (!noBedtimeLimit) {
      onUpdateBedtime({ ...currentBedtime, weekend: value })
    }
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">Set Bedtime Cutoff</h2>
        <p className="mt-2 text-gray-600">When should devices stop being available each night?</p>
      </div>

      {/* No bedtime option for older teens */}
      {ageGroup === '14-16' && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={noBedtimeLimit}
              onChange={(e) => handleNoBedtimeToggle(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <div>
              <span className="font-medium text-gray-900">No bedtime limit</span>
              <p className="text-sm text-gray-500">
                Trust your teen to manage their own sleep schedule
              </p>
            </div>
          </label>
        </div>
      )}

      {!noBedtimeLimit && (
        <div className="space-y-6">
          {/* Weekday bedtime */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <label htmlFor="weekday-bedtime" className="font-medium text-gray-900">
                  Weekday Bedtime
                </label>
                <p className="text-sm text-gray-500">Monday through Friday</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="weekday-bedtime"
                  type="time"
                  value={currentBedtime.weekday}
                  onChange={(e) => handleWeekdayChange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                />
                <span className="text-sm text-gray-600 min-w-[80px]">
                  {formatTime(currentBedtime.weekday)}
                </span>
              </div>
            </div>
          </div>

          {/* Weekend bedtime */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <label htmlFor="weekend-bedtime" className="font-medium text-gray-900">
                  Weekend Bedtime
                </label>
                <p className="text-sm text-gray-500">Saturday and Sunday</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="weekend-bedtime"
                  type="time"
                  value={currentBedtime.weekend}
                  onChange={(e) => handleWeekendChange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                />
                <span className="text-sm text-gray-600 min-w-[80px]">
                  {formatTime(currentBedtime.weekend)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>How it works:</strong> At bedtime, device screens will show a gentle reminder and
          recreational apps will be paused until morning.
        </p>
      </div>
    </div>
  )
}

export default BedtimeCutoffStep
