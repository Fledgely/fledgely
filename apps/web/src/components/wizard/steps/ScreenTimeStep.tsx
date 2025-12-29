/**
 * Screen Time Step Component.
 *
 * Story 4.4: Quick Start Wizard - AC2
 *
 * Displays screen time limit configuration with
 * friendly time formatting and sliders.
 */

'use client'

import type { ScreenTimeLimits } from '../../../hooks/useQuickStartWizard'
import { formatMinutes } from '../../../utils/formatTime'

interface ScreenTimeStepProps {
  screenTimeLimits: ScreenTimeLimits
  onUpdateLimits: (limits: ScreenTimeLimits) => void
  templateDefaults?: ScreenTimeLimits
}

export function ScreenTimeStep({
  screenTimeLimits,
  onUpdateLimits,
  templateDefaults,
}: ScreenTimeStepProps) {
  const handleWeekdayChange = (value: number) => {
    onUpdateLimits({ ...screenTimeLimits, weekday: value })
  }

  const handleWeekendChange = (value: number) => {
    onUpdateLimits({ ...screenTimeLimits, weekend: value })
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">Set Screen Time Limits</h2>
        <p className="mt-2 text-gray-600">How much screen time should your child have each day?</p>
      </div>

      <div className="space-y-8">
        {/* Weekday limits */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <label htmlFor="weekday-time" className="font-medium text-gray-900">
              Weekdays (Mon-Fri)
            </label>
            <span className="text-lg font-semibold text-primary">
              {formatMinutes(screenTimeLimits.weekday)}
            </span>
          </div>

          <div className="min-h-[44px] flex items-center">
            <input
              id="weekday-time"
              type="range"
              min={30}
              max={300}
              step={15}
              value={screenTimeLimits.weekday}
              onChange={(e) => handleWeekdayChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              aria-valuetext={formatMinutes(screenTimeLimits.weekday)}
            />
          </div>

          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>30 min</span>
            <span>5 hours</span>
          </div>

          {templateDefaults && templateDefaults.weekday !== screenTimeLimits.weekday && (
            <p className="mt-2 text-xs text-gray-500">
              Template default: {formatMinutes(templateDefaults.weekday)}
            </p>
          )}
        </div>

        {/* Weekend limits */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <label htmlFor="weekend-time" className="font-medium text-gray-900">
              Weekends (Sat-Sun)
            </label>
            <span className="text-lg font-semibold text-primary">
              {formatMinutes(screenTimeLimits.weekend)}
            </span>
          </div>

          <div className="min-h-[44px] flex items-center">
            <input
              id="weekend-time"
              type="range"
              min={30}
              max={300}
              step={15}
              value={screenTimeLimits.weekend}
              onChange={(e) => handleWeekendChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              aria-valuetext={formatMinutes(screenTimeLimits.weekend)}
            />
          </div>

          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>30 min</span>
            <span>5 hours</span>
          </div>

          {templateDefaults && templateDefaults.weekend !== screenTimeLimits.weekend && (
            <p className="mt-2 text-xs text-gray-500">
              Template default: {formatMinutes(templateDefaults.weekend)}
            </p>
          )}
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> These limits include all recreational screen time. Educational
          content can be excluded in your full agreement.
        </p>
      </div>
    </div>
  )
}

export default ScreenTimeStep
