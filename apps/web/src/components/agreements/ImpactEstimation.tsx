/**
 * Impact Estimation Component.
 *
 * Story 5.5: Agreement Preview & Summary - AC3
 *
 * Calculates and displays estimated daily/weekly impact of agreement terms.
 * Shows screen time totals and other measurable commitments.
 */

'use client'

import { useMemo } from 'react'
import type { AgreementTerm } from '@fledgely/shared/contracts'

interface ImpactEstimationProps {
  /** Agreement terms to analyze */
  terms: AgreementTerm[]
  /** Child's name for personalization */
  childName: string
}

interface TimeImpact {
  weekdayMinutes: number | null
  weekendMinutes: number | null
  source: string
}

/**
 * Extracts time values from term text.
 * Parses common patterns like "2 hours", "30 minutes", "1.5 hours".
 */
function extractTimeMinutes(text: string): number | null {
  const lowerText = text.toLowerCase()

  // Match patterns like "2 hours", "1.5 hours", "30 minutes"
  const hourMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*hours?/)
  const minMatch = lowerText.match(/(\d+)\s*min(?:ute)?s?/)

  if (hourMatch) {
    return Math.round(parseFloat(hourMatch[1]) * 60)
  }
  if (minMatch) {
    return parseInt(minMatch[1], 10)
  }

  return null
}

/**
 * Determines if a term applies to weekdays, weekends, or both.
 */
function getTermTimeContext(text: string): 'weekday' | 'weekend' | 'both' {
  const lowerText = text.toLowerCase()

  if (
    lowerText.includes('weekday') ||
    lowerText.includes('school day') ||
    lowerText.includes('school night')
  ) {
    return 'weekday'
  }
  if (
    lowerText.includes('weekend') ||
    lowerText.includes('saturday') ||
    lowerText.includes('sunday')
  ) {
    return 'weekend'
  }

  return 'both'
}

/**
 * Checks if a term is related to screen time.
 */
function isScreenTimeTerm(term: AgreementTerm): boolean {
  const lowerText = term.text.toLowerCase()
  return (
    term.category === 'time' ||
    lowerText.includes('screen') ||
    lowerText.includes('device') ||
    lowerText.includes('phone') ||
    lowerText.includes('tablet') ||
    lowerText.includes('computer') ||
    lowerText.includes('gaming') ||
    lowerText.includes('video') ||
    lowerText.includes('tv')
  )
}

/**
 * Formats minutes into human-readable format.
 */
function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`
  }

  return `${hours}h ${remainingMinutes}m`
}

export function ImpactEstimation({ terms, childName }: ImpactEstimationProps) {
  /**
   * Calculate time impacts from terms.
   */
  const impacts = useMemo(() => {
    const timeImpacts: TimeImpact[] = []

    terms.forEach((term) => {
      if (!isScreenTimeTerm(term)) return

      const minutes = extractTimeMinutes(term.text)
      if (minutes === null) return

      const context = getTermTimeContext(term.text)
      const impact: TimeImpact = {
        weekdayMinutes: null,
        weekendMinutes: null,
        source: term.text,
      }

      if (context === 'weekday' || context === 'both') {
        impact.weekdayMinutes = minutes
      }
      if (context === 'weekend' || context === 'both') {
        impact.weekendMinutes = minutes
      }

      timeImpacts.push(impact)
    })

    return timeImpacts
  }, [terms])

  /**
   * Calculate totals.
   */
  const totals = useMemo(() => {
    let weekdayTotal = 0
    let weekendTotal = 0
    let weekdayCount = 0
    let weekendCount = 0

    impacts.forEach((impact) => {
      if (impact.weekdayMinutes !== null) {
        weekdayTotal += impact.weekdayMinutes
        weekdayCount++
      }
      if (impact.weekendMinutes !== null) {
        weekendTotal += impact.weekendMinutes
        weekendCount++
      }
    })

    // Calculate weekly total (5 weekdays + 2 weekend days)
    const weeklyTotal = weekdayTotal * 5 + weekendTotal * 2

    return {
      weekdayTotal,
      weekendTotal,
      weeklyTotal,
      weekdayCount,
      weekendCount,
    }
  }, [impacts])

  // Don't render if no time impacts found
  if (impacts.length === 0) {
    return null
  }

  return (
    <div
      className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200"
      data-testid="impact-estimation"
      role="region"
      aria-label="Time impact estimation"
    >
      <h3 className="flex items-center gap-2 text-lg font-semibold text-amber-900 mb-3">
        <span aria-hidden="true">📊</span>
        What This Means for {childName}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {/* Weekday time */}
        {totals.weekdayCount > 0 && (
          <div
            className="p-3 bg-white rounded-lg border border-amber-200"
            data-testid="weekday-impact"
          >
            <div className="text-sm text-amber-700 mb-1">School Days</div>
            <div className="text-2xl font-bold text-amber-900">
              {formatTime(totals.weekdayTotal)}
            </div>
            <div className="text-xs text-amber-600">per day</div>
          </div>
        )}

        {/* Weekend time */}
        {totals.weekendCount > 0 && (
          <div
            className="p-3 bg-white rounded-lg border border-amber-200"
            data-testid="weekend-impact"
          >
            <div className="text-sm text-amber-700 mb-1">Weekends</div>
            <div className="text-2xl font-bold text-amber-900">
              {formatTime(totals.weekendTotal)}
            </div>
            <div className="text-xs text-amber-600">per day</div>
          </div>
        )}

        {/* Weekly total */}
        {(totals.weekdayCount > 0 || totals.weekendCount > 0) && (
          <div
            className="p-3 bg-white rounded-lg border border-amber-200"
            data-testid="weekly-impact"
          >
            <div className="text-sm text-amber-700 mb-1">Weekly Total</div>
            <div className="text-2xl font-bold text-amber-900">
              {formatTime(totals.weeklyTotal)}
            </div>
            <div className="text-xs text-amber-600">screen time</div>
          </div>
        )}
      </div>

      {/* Breakdown by term */}
      <details className="group">
        <summary
          className="flex items-center gap-2 text-sm text-amber-700 cursor-pointer hover:text-amber-900 min-h-[44px]"
          data-testid="impact-details-toggle"
        >
          <svg
            className="w-4 h-4 transition-transform group-open:rotate-90"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          See how this breaks down
        </summary>

        <div className="mt-3 space-y-2" data-testid="impact-breakdown">
          {impacts.map((impact, index) => (
            <div key={index} className="flex items-start gap-2 text-sm text-amber-800 pl-6">
              <span className="text-amber-500 mt-0.5" aria-hidden="true">
                →
              </span>
              <span>
                {impact.weekdayMinutes !== null && impact.weekendMinutes !== null ? (
                  <>
                    {formatTime(impact.weekdayMinutes)} (weekdays) /{' '}
                    {formatTime(impact.weekendMinutes)} (weekends)
                  </>
                ) : impact.weekdayMinutes !== null ? (
                  <>{formatTime(impact.weekdayMinutes)} on school days</>
                ) : (
                  <>{formatTime(impact.weekendMinutes!)} on weekends</>
                )}
              </span>
            </div>
          ))}
        </div>
      </details>

      {/* Encouraging note */}
      <p className="mt-4 text-sm text-amber-700 italic">
        These times help make sure there&apos;s balance between screen time and other activities.
      </p>
    </div>
  )
}
