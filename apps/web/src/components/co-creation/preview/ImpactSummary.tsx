'use client'

import type { ImpactEstimate } from '@fledgely/contracts'

/**
 * Props for the ImpactSummary component
 */
export interface ImpactSummaryProps {
  /** The impact estimate data */
  impact: ImpactEstimate
  /** Whether to use simplified language for younger children */
  simplifiedMode?: boolean
  /** Additional CSS classes */
  className?: string
  /** Data attributes for testing */
  'data-testid'?: string
}

/**
 * ScreenTimeCard Component
 * Displays screen time impact in a visual card format
 */
interface ScreenTimeCardProps {
  screenTime: NonNullable<ImpactEstimate['screenTime']>
  simplified: boolean
}

function ScreenTimeCard({ screenTime, simplified }: ScreenTimeCardProps) {
  // Calculate hours and minutes for visual display
  const hours = Math.floor(screenTime.daily / 60)
  const minutes = screenTime.daily % 60

  // Child-friendly description
  const description = simplified
    ? `You can use screens for ${screenTime.description}`
    : screenTime.description

  return (
    <div
      className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800"
      data-testid="impact-screen-time"
    >
      {/* Icon and Title */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-blue-600 dark:text-blue-400"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 100-16 8 8 0 000 16zm1-8h4v2h-6V7h2v5z" />
          </svg>
        </div>
        <h4 className="font-semibold text-blue-800 dark:text-blue-200">
          Screen Time
        </h4>
      </div>

      {/* Visual Time Display */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-3xl font-bold text-blue-700 dark:text-blue-300">
          {hours > 0 && `${hours}h`}
          {minutes > 0 && `${minutes}m`}
          {hours === 0 && minutes === 0 && '0m'}
        </span>
        <span className="text-sm text-blue-600 dark:text-blue-400">
          per day
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-blue-700 dark:text-blue-300">
        {description}
      </p>

      {/* Weekly total */}
      <p className="text-xs text-blue-500 dark:text-blue-400 mt-2">
        That&apos;s about {Math.round(screenTime.weekly / 60)} hours each week
      </p>
    </div>
  )
}

/**
 * BedtimeCard Component
 * Displays bedtime schedule impact
 */
interface BedtimeCardProps {
  bedtime: NonNullable<ImpactEstimate['bedtime']>
  simplified: boolean
}

function BedtimeCard({ bedtime, simplified }: BedtimeCardProps) {
  const hasWeekendDifference = bedtime.weekend && bedtime.weekend !== bedtime.weekday

  return (
    <div
      className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800"
      data-testid="impact-bedtime"
    >
      {/* Icon and Title */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-purple-600 dark:text-purple-400"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" />
          </svg>
        </div>
        <h4 className="font-semibold text-purple-800 dark:text-purple-200">
          Device Bedtime
        </h4>
      </div>

      {/* Time Display */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-purple-700 dark:text-purple-300">
            {bedtime.weekday}
          </span>
          <span className="text-sm text-purple-600 dark:text-purple-400">
            {hasWeekendDifference ? 'school nights' : 'every night'}
          </span>
        </div>

        {hasWeekendDifference && (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {bedtime.weekend}
            </span>
            <span className="text-sm text-purple-600 dark:text-purple-400">
              weekends
            </span>
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-purple-700 dark:text-purple-300 mt-3">
        {simplified
          ? 'This is when you need to put away all devices'
          : 'Devices should be put away by this time'}
      </p>
    </div>
  )
}

/**
 * MonitoringCard Component
 * Displays monitoring level impact
 */
interface MonitoringCardProps {
  monitoring: NonNullable<ImpactEstimate['monitoring']>
  simplified: boolean
}

function MonitoringCard({ monitoring, simplified }: MonitoringCardProps) {
  // Map level to visual representation
  const levelConfig = {
    minimal: {
      bars: 1,
      label: 'Light',
      description: simplified
        ? 'Your parents will check in sometimes'
        : 'Occasional check-ins with trust-based approach',
    },
    moderate: {
      bars: 2,
      label: 'Regular',
      description: simplified
        ? 'Your parents will check in regularly'
        : 'Regular monitoring with weekly check-ins',
    },
    active: {
      bars: 3,
      label: 'Close',
      description: simplified
        ? 'Your parents will help keep you safe more closely'
        : 'Active monitoring with parental controls',
    },
  }

  const config = levelConfig[monitoring.level] || levelConfig.moderate

  return (
    <div
      className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800"
      data-testid="impact-monitoring"
    >
      {/* Icon and Title */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-amber-600 dark:text-amber-400"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
          </svg>
        </div>
        <h4 className="font-semibold text-amber-800 dark:text-amber-200">
          {simplified ? 'Safety Checks' : 'Monitoring Level'}
        </h4>
      </div>

      {/* Level Indicator */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg font-bold text-amber-700 dark:text-amber-300">
          {config.label}
        </span>
        <div className="flex gap-1" aria-label={`${config.bars} of 3 bars`}>
          {[1, 2, 3].map((bar) => (
            <div
              key={bar}
              className={`w-3 h-6 rounded ${
                bar <= config.bars
                  ? 'bg-amber-500 dark:bg-amber-400'
                  : 'bg-amber-200 dark:bg-amber-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-amber-700 dark:text-amber-300">
        {monitoring.description || config.description}
      </p>
    </div>
  )
}

/**
 * ImpactSummary Component
 *
 * Story 5.5: Agreement Preview & Summary - Task 4
 *
 * Displays estimated daily/weekly impact of the agreement.
 * Features:
 * - Screen time totals (AC #4)
 * - Bedtime schedule impact
 * - Monitoring level implications
 * - Child-understandable estimates (NFR65)
 *
 * @example
 * ```tsx
 * <ImpactSummary
 *   impact={preview.impact}
 *   simplifiedMode={true}
 * />
 * ```
 */
export function ImpactSummary({
  impact,
  simplifiedMode = false,
  className = '',
  'data-testid': dataTestId = 'impact-summary',
}: ImpactSummaryProps) {
  const hasScreenTime = !!impact.screenTime
  const hasBedtime = !!impact.bedtime
  const hasMonitoring = !!impact.monitoring
  const hasAnyImpact = hasScreenTime || hasBedtime || hasMonitoring

  if (!hasAnyImpact) {
    return (
      <div
        className={`text-center py-4 text-gray-500 dark:text-gray-400 ${className}`}
        data-testid={dataTestId}
        role="status"
      >
        <p>No impact estimates available.</p>
      </div>
    )
  }

  return (
    <div
      className={`space-y-4 ${className}`}
      data-testid={dataTestId}
      role="region"
      aria-label="Impact Summary"
    >
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {simplifiedMode ? 'What This Means For You' : 'Daily & Weekly Impact'}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {simplifiedMode
            ? 'Here is what you agreed to do each day.'
            : 'Estimated impact based on your agreement terms.'}
        </p>
      </div>

      {/* Impact Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {hasScreenTime && (
          <ScreenTimeCard
            screenTime={impact.screenTime!}
            simplified={simplifiedMode}
          />
        )}
        {hasBedtime && (
          <BedtimeCard
            bedtime={impact.bedtime!}
            simplified={simplifiedMode}
          />
        )}
        {hasMonitoring && (
          <MonitoringCard
            monitoring={impact.monitoring!}
            simplified={simplifiedMode}
          />
        )}
      </div>

      {/* Screen Reader Summary */}
      <div className="sr-only">
        <h4>Impact Summary</h4>
        <ul>
          {hasScreenTime && (
            <li>Screen time: {impact.screenTime!.description}</li>
          )}
          {hasBedtime && (
            <li>
              Device bedtime: {impact.bedtime!.weekday}
              {impact.bedtime!.weekend && ` (weekends: ${impact.bedtime!.weekend})`}
            </li>
          )}
          {hasMonitoring && (
            <li>Monitoring: {impact.monitoring!.description}</li>
          )}
        </ul>
      </div>
    </div>
  )
}

export default ImpactSummary
