/**
 * useScrollCompletion Hook
 *
 * Story 5.5: Agreement Preview & Summary - Task 5
 *
 * Hook for tracking scroll progress to ensure users read the full agreement.
 * Implements anti-TLDR measure per AC #5.
 */

import { useState, useEffect, useCallback, RefObject } from 'react'

/**
 * Return type for the useScrollCompletion hook
 */
export interface UseScrollCompletionReturn {
  /** Current scroll percentage (0-100) */
  scrollPercentage: number
  /** Whether the user has scrolled to the threshold */
  isComplete: boolean
  /** Manually mark as complete (for accessibility bypass) */
  markComplete: () => void
  /** Reset completion state */
  reset: () => void
}

/**
 * Options for the useScrollCompletion hook
 */
export interface UseScrollCompletionOptions {
  /** Percentage threshold to consider as "complete" (default: 90) */
  threshold?: number
  /** Minimum time (ms) user must be at scroll end to complete (default: 500) */
  minDwellTime?: number
  /** Whether tracking is enabled (default: true) */
  enabled?: boolean
}

/**
 * useScrollCompletion Hook
 *
 * Tracks scroll progress within a container element.
 * The agreement preview must be scrolled through to continue.
 *
 * @param containerRef - Reference to the scrollable container element
 * @param options - Configuration options
 * @returns Scroll completion state and actions
 *
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null)
 * const { scrollPercentage, isComplete } = useScrollCompletion(containerRef, {
 *   threshold: 90,
 * })
 * ```
 */
export function useScrollCompletion(
  containerRef: RefObject<HTMLElement | null>,
  options: UseScrollCompletionOptions = {}
): UseScrollCompletionReturn {
  const { threshold = 90, minDwellTime = 500, enabled = true } = options

  const [scrollPercentage, setScrollPercentage] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [dwellStart, setDwellStart] = useState<number | null>(null)

  // Calculate scroll percentage from container
  const calculateScrollPercentage = useCallback(() => {
    const container = containerRef.current
    if (!container) return 0

    const { scrollTop, scrollHeight, clientHeight } = container
    const scrollableHeight = scrollHeight - clientHeight

    if (scrollableHeight <= 0) {
      // Content fits without scrolling, consider complete
      return 100
    }

    const percentage = Math.round((scrollTop / scrollableHeight) * 100)
    return Math.min(100, Math.max(0, percentage))
  }, [containerRef])

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (!enabled) return

    const percentage = calculateScrollPercentage()
    setScrollPercentage(percentage)

    // Check if threshold reached
    if (percentage >= threshold) {
      if (dwellStart === null) {
        setDwellStart(Date.now())
      } else if (Date.now() - dwellStart >= minDwellTime) {
        setIsComplete(true)
      }
    } else {
      // Reset dwell timer if scrolled back up
      setDwellStart(null)
    }
  }, [enabled, calculateScrollPercentage, threshold, dwellStart, minDwellTime])

  // Manual completion for accessibility
  const markComplete = useCallback(() => {
    setIsComplete(true)
    setScrollPercentage(100)
  }, [])

  // Reset completion state
  const reset = useCallback(() => {
    setIsComplete(false)
    setScrollPercentage(0)
    setDwellStart(null)
  }, [])

  // Set up scroll listener
  useEffect(() => {
    const container = containerRef.current
    if (!container || !enabled) return

    // Check initial scroll position
    handleScroll()

    // Add scroll listener
    container.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [containerRef, handleScroll, enabled])

  // Check if content fits without scrolling (auto-complete)
  useEffect(() => {
    const container = containerRef.current
    if (!container || !enabled) return

    const { scrollHeight, clientHeight } = container
    if (scrollHeight <= clientHeight) {
      // Content fits without scrolling
      setIsComplete(true)
      setScrollPercentage(100)
    }
  }, [containerRef, enabled])

  return {
    scrollPercentage,
    isComplete,
    markComplete,
    reset,
  }
}

export default useScrollCompletion
