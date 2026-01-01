/**
 * useAgreementExpiry Hook - Story 35.1
 *
 * Hook for managing agreement expiry date state and calculations.
 * AC1: Expiry options (3 months, 6 months, 1 year, no expiry)
 * AC4: Annual review for no-expiry agreements
 * AC5: Expiry date can be changed
 */

import { useState, useMemo, useCallback } from 'react'
import {
  calculateExpiryDate,
  getRecommendedExpiry,
  isExpiringSoon,
  getDaysUntilExpiry,
  getAnnualReviewDate,
  type ExpiryDuration,
} from '@fledgely/shared'

export interface UseAgreementExpiryParams {
  /** Initial expiry duration */
  initialDuration?: ExpiryDuration
  /** Initial expiry date (overrides duration calculation) */
  initialExpiryDate?: Date | null
  /** Child's age for recommendations */
  childAge?: number
  /** Custom start date for calculations */
  startDate?: Date
}

export interface UseAgreementExpiryResult {
  /** Currently selected duration */
  selectedDuration: ExpiryDuration
  /** Calculated or provided expiry date */
  expiryDate: Date | null
  /** Set the expiry duration */
  setDuration: (duration: ExpiryDuration) => void
  /** Set a custom expiry date */
  setExpiryDate: (date: Date | null) => void
  /** Recommended duration based on child age */
  recommendedDuration: ExpiryDuration | null
  /** Whether expiry is within 30 days */
  isExpiringSoon: boolean
  /** Whether agreement has expired */
  isExpired: boolean
  /** Days until expiry (null for no-expiry) */
  daysUntilExpiry: number | null
  /** Annual review date for no-expiry agreements */
  annualReviewDate: Date | null
  /** Reset to initial/default values */
  reset: () => void
}

const DEFAULT_DURATION: ExpiryDuration = '6-months'

/**
 * Hook to manage agreement expiry date state and calculations.
 */
export function useAgreementExpiry({
  initialDuration = DEFAULT_DURATION,
  initialExpiryDate,
  childAge,
  startDate,
}: UseAgreementExpiryParams = {}): UseAgreementExpiryResult {
  const [selectedDuration, setSelectedDuration] = useState<ExpiryDuration>(initialDuration)
  const [customExpiryDate, setCustomExpiryDate] = useState<Date | null | undefined>(
    initialExpiryDate
  )

  // Calculate expiry date based on duration or use custom date
  const expiryDate = useMemo(() => {
    if (customExpiryDate !== undefined) {
      return customExpiryDate
    }
    return calculateExpiryDate(selectedDuration, startDate)
  }, [selectedDuration, customExpiryDate, startDate])

  // Get recommended duration based on child age
  const recommendedDuration = useMemo(() => {
    if (childAge === undefined) {
      return null
    }
    return getRecommendedExpiry(childAge)
  }, [childAge])

  // Calculate expiry status
  const expiringSoon = useMemo(() => {
    return isExpiringSoon(expiryDate)
  }, [expiryDate])

  const daysUntilExpiry = useMemo(() => {
    return getDaysUntilExpiry(expiryDate)
  }, [expiryDate])

  const isExpired = useMemo(() => {
    if (daysUntilExpiry === null) {
      return false
    }
    return daysUntilExpiry < 0
  }, [daysUntilExpiry])

  // Calculate annual review date for no-expiry agreements
  const annualReviewDate = useMemo(() => {
    if (selectedDuration !== 'no-expiry') {
      return null
    }
    return getAnnualReviewDate(startDate)
  }, [selectedDuration, startDate])

  // Set duration and clear custom date
  const setDuration = useCallback((duration: ExpiryDuration) => {
    setSelectedDuration(duration)
    setCustomExpiryDate(undefined)
  }, [])

  // Set custom expiry date
  const setExpiryDate = useCallback((date: Date | null) => {
    setCustomExpiryDate(date)
  }, [])

  // Reset to initial values
  const reset = useCallback(() => {
    setSelectedDuration(initialDuration)
    setCustomExpiryDate(initialExpiryDate)
  }, [initialDuration, initialExpiryDate])

  return {
    selectedDuration,
    expiryDate,
    setDuration,
    setExpiryDate,
    recommendedDuration,
    isExpiringSoon: expiringSoon,
    isExpired,
    daysUntilExpiry,
    annualReviewDate,
    reset,
  }
}
