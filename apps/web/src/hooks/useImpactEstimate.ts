/**
 * useImpactEstimate Hook
 *
 * Story 5.5: Agreement Preview & Summary - Task 4
 *
 * Hook for calculating daily/weekly impact estimates from agreement terms.
 * Provides formatted, child-friendly impact descriptions.
 */

import { useMemo } from 'react'
import type { SessionTerm, ImpactEstimate } from '@fledgely/contracts'
import {
  calculateScreenTimeImpact,
  calculateBedtimeImpact,
  calculateMonitoringImpact,
} from '@fledgely/contracts'

/**
 * Return type for the useImpactEstimate hook
 */
export interface UseImpactEstimateReturn {
  /** The calculated impact estimate */
  impact: ImpactEstimate
  /** Whether any impact data is available */
  hasImpact: boolean
  /** Human-readable summary of the impact */
  summary: string[]
  /** Whether screen time impact is available */
  hasScreenTimeImpact: boolean
  /** Whether bedtime impact is available */
  hasBedtimeImpact: boolean
  /** Whether monitoring impact is available */
  hasMonitoringImpact: boolean
}

/**
 * Generate child-friendly summary statements from impact data
 */
function generateImpactSummary(impact: ImpactEstimate): string[] {
  const summaries: string[] = []

  if (impact.screenTime) {
    summaries.push(impact.screenTime.description)
  }

  if (impact.bedtime) {
    if (impact.bedtime.weekend && impact.bedtime.weekend !== impact.bedtime.weekday) {
      summaries.push(
        `Devices off at ${impact.bedtime.weekday} on school nights, ${impact.bedtime.weekend} on weekends`
      )
    } else {
      summaries.push(`Devices off at ${impact.bedtime.weekday} every night`)
    }
  }

  if (impact.monitoring) {
    summaries.push(impact.monitoring.description)
  }

  if (impact.custom && impact.custom.length > 0) {
    for (const custom of impact.custom) {
      summaries.push(custom.description)
    }
  }

  return summaries
}

/**
 * useImpactEstimate Hook
 *
 * Calculates impact estimates from agreement terms.
 * Uses memoization for efficient re-renders.
 *
 * @param terms - Array of session terms (usually accepted terms only)
 * @returns Impact estimate data and helper values
 *
 * @example
 * ```tsx
 * const { impact, summary, hasImpact } = useImpactEstimate(acceptedTerms)
 *
 * if (hasImpact) {
 *   return <ImpactSummary impact={impact} />
 * }
 * ```
 */
export function useImpactEstimate(terms: SessionTerm[]): UseImpactEstimateReturn {
  const impact = useMemo<ImpactEstimate>(() => {
    // Filter to accepted terms only
    const acceptedTerms = terms.filter((t) => t.status === 'accepted')

    // Calculate each type of impact
    const screenTime = calculateScreenTimeImpact(acceptedTerms)
    const bedtime = calculateBedtimeImpact(acceptedTerms)
    const monitoring = calculateMonitoringImpact(acceptedTerms)

    return {
      screenTime: screenTime || undefined,
      bedtime: bedtime || undefined,
      monitoring: monitoring || undefined,
    }
  }, [terms])

  const hasScreenTimeImpact = !!impact.screenTime
  const hasBedtimeImpact = !!impact.bedtime
  const hasMonitoringImpact = !!impact.monitoring
  const hasCustomImpact = !!(impact.custom && impact.custom.length > 0)

  const hasImpact = hasScreenTimeImpact || hasBedtimeImpact || hasMonitoringImpact || hasCustomImpact

  const summary = useMemo(() => generateImpactSummary(impact), [impact])

  return {
    impact,
    hasImpact,
    summary,
    hasScreenTimeImpact,
    hasBedtimeImpact,
    hasMonitoringImpact,
  }
}

export default useImpactEstimate
