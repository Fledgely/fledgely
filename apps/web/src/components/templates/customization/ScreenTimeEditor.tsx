'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { DiffHighlight, DiffBadge } from './DiffIndicator'
import { type DiffStatus } from './useTemplateDraft'

/**
 * Props for ScreenTimeEditor
 */
export interface ScreenTimeEditorProps {
  /** Current weekday screen time in minutes */
  weekdayMinutes: number
  /** Current weekend screen time in minutes */
  weekendMinutes: number
  /** Original weekday screen time from template (for comparison) */
  originalWeekdayMinutes?: number
  /** Original weekend screen time from template (for comparison) */
  originalWeekendMinutes?: number
  /** Callback when weekday screen time changes */
  onWeekdayChange: (minutes: number) => void
  /** Callback when weekend screen time changes */
  onWeekendChange: (minutes: number) => void
  /** Whether the editor is disabled */
  disabled?: boolean
  /** Additional class names */
  className?: string
}

/**
 * Screen time presets in minutes
 */
const PRESETS = [
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '1.5 hours', value: 90 },
  { label: '2 hours', value: 120 },
  { label: '3 hours', value: 180 },
]

/**
 * Min/max values for slider
 */
const MIN_MINUTES = 15
const MAX_MINUTES = 240
const STEP = 15

/**
 * Format minutes for display
 */
function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`
  }
  return `${hours}h ${mins}m`
}

/**
 * Calculate weekly total
 */
function calculateWeeklyTotal(weekday: number, weekend: number): number {
  return (weekday * 5) + (weekend * 2)
}

/**
 * Format weekly total for display
 */
function formatWeeklyTotal(weekday: number, weekend: number): string {
  const totalMinutes = calculateWeeklyTotal(weekday, weekend)
  const hours = Math.round(totalMinutes / 60 * 10) / 10
  return `${hours} hours per week`
}

/**
 * Get diff status for a value
 */
function getDiffStatus(current: number, original?: number): DiffStatus {
  if (original === undefined) return 'original'
  return current !== original ? 'modified' : 'original'
}

/**
 * ScreenTimeEditor Component
 *
 * Story 4.5: Template Customization Preview - Task 2
 * AC #1: Parent can modify screen time field
 * AC #2: Changes are highlighted compared to original template
 *
 * @param props - Component props
 */
export function ScreenTimeEditor({
  weekdayMinutes,
  weekendMinutes,
  originalWeekdayMinutes,
  originalWeekendMinutes,
  onWeekdayChange,
  onWeekendChange,
  disabled = false,
  className,
}: ScreenTimeEditorProps) {
  const [activeTab, setActiveTab] = useState<'weekday' | 'weekend'>('weekday')

  const weekdayStatus = getDiffStatus(weekdayMinutes, originalWeekdayMinutes)
  const weekendStatus = getDiffStatus(weekendMinutes, originalWeekendMinutes)
  const hasChanges = weekdayStatus === 'modified' || weekendStatus === 'modified'

  const currentMinutes = activeTab === 'weekday' ? weekdayMinutes : weekendMinutes
  const originalMinutes = activeTab === 'weekday' ? originalWeekdayMinutes : originalWeekendMinutes
  const currentStatus = activeTab === 'weekday' ? weekdayStatus : weekendStatus
  const onChange = activeTab === 'weekday' ? onWeekdayChange : onWeekendChange

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseInt(e.target.value, 10))
  }, [onChange])

  const handlePresetClick = useCallback((value: number) => {
    if (!disabled) {
      onChange(value)
    }
  }, [onChange, disabled])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            <span aria-hidden="true">⏱️</span> Daily Screen Time
          </h3>
          <p className="text-sm text-gray-500">
            Set daily screen time limits for your child
          </p>
        </div>
        {hasChanges && <DiffBadge status="modified" label="Modified" />}
      </div>

      {/* Weekday/Weekend tabs */}
      <div
        role="tablist"
        aria-label="Screen time type"
        className="flex rounded-lg bg-gray-100 p-1"
      >
        <button
          role="tab"
          aria-selected={activeTab === 'weekday'}
          aria-controls="weekday-panel"
          id="weekday-tab"
          onClick={() => setActiveTab('weekday')}
          className={cn(
            'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            'min-h-[44px]', // NFR49: Touch target
            activeTab === 'weekday'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          Weekday
          {weekdayStatus === 'modified' && (
            <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
          )}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'weekend'}
          aria-controls="weekend-panel"
          id="weekend-tab"
          onClick={() => setActiveTab('weekend')}
          className={cn(
            'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            'min-h-[44px]', // NFR49: Touch target
            activeTab === 'weekend'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          Weekend
          {weekendStatus === 'modified' && (
            <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Editor panel */}
      <DiffHighlight status={currentStatus}>
        <div
          id={`${activeTab}-panel`}
          role="tabpanel"
          aria-labelledby={`${activeTab}-tab`}
          className="space-y-4"
        >
          {/* Current value display */}
          <div className="text-center">
            <span className="text-4xl font-bold text-gray-900">
              {formatTime(currentMinutes)}
            </span>
            {originalMinutes !== undefined && currentMinutes !== originalMinutes && (
              <div className="mt-1 text-sm text-amber-600">
                Original: {formatTime(originalMinutes)}
              </div>
            )}
          </div>

          {/* Slider */}
          <div className="px-2">
            <label htmlFor={`${activeTab}-slider`} className="sr-only">
              {activeTab === 'weekday' ? 'Weekday' : 'Weekend'} screen time
            </label>
            <input
              type="range"
              id={`${activeTab}-slider`}
              min={MIN_MINUTES}
              max={MAX_MINUTES}
              step={STEP}
              value={currentMinutes}
              onChange={handleSliderChange}
              disabled={disabled}
              className={cn(
                'w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              aria-valuemin={MIN_MINUTES}
              aria-valuemax={MAX_MINUTES}
              aria-valuenow={currentMinutes}
              aria-valuetext={formatTime(currentMinutes)}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{formatTime(MIN_MINUTES)}</span>
              <span>{formatTime(MAX_MINUTES)}</span>
            </div>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-2 justify-center">
            {PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => handlePresetClick(preset.value)}
                disabled={disabled}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                  'min-h-[36px] min-w-[60px]', // NFR49: Touch target
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                  currentMinutes === preset.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
                aria-pressed={currentMinutes === preset.value}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </DiffHighlight>

      {/* Impact preview */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
        <p className="text-sm text-blue-800">
          <span aria-hidden="true">📊</span>{' '}
          <strong>Weekly total:</strong> {formatWeeklyTotal(weekdayMinutes, weekendMinutes)}
        </p>
        <p className="text-xs text-blue-600 mt-1">
          {weekdayMinutes === weekendMinutes
            ? 'Same limit every day'
            : `${formatTime(weekdayMinutes)} on school days, ${formatTime(weekendMinutes)} on weekends`
          }
        </p>
      </div>
    </div>
  )
}
