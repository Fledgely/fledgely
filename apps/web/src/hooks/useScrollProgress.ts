/**
 * Scroll Progress Hook.
 *
 * Story 5.5: Agreement Preview & Summary - AC4
 *
 * Tracks scroll progress through a scrollable element.
 * Used to ensure users read the entire agreement before confirming.
 */

import { useState, useEffect, useRef, useCallback } from 'react'

interface UseScrollProgressOptions {
  /** Threshold percentage to consider "complete" (default: 95) */
  threshold?: number
  /** Debounce delay in ms (default: 100) */
  debounceMs?: number
}

interface UseScrollProgressReturn {
  /** Ref to attach to the scrollable container */
  containerRef: React.RefObject<HTMLDivElement>
  /** Current scroll progress as percentage (0-100) */
  progress: number
  /** Whether the scroll has reached the threshold */
  isComplete: boolean
  /** Reset progress to 0 */
  reset: () => void
}

/**
 * Hook to track scroll progress through a container.
 *
 * @param options Configuration options
 * @returns Scroll tracking state and controls
 *
 * @example
 * ```tsx
 * const { containerRef, progress, isComplete } = useScrollProgress({ threshold: 90 })
 *
 * return (
 *   <div ref={containerRef} style={{ height: 400, overflow: 'auto' }}>
 *     {content}
 *   </div>
 * )
 * ```
 */
export function useScrollProgress(options: UseScrollProgressOptions = {}): UseScrollProgressReturn {
  const { threshold = 95, debounceMs = 100 } = options

  const containerRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /**
   * Calculate and update scroll progress.
   */
  const updateProgress = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const maxScroll = scrollHeight - clientHeight

    // Handle edge case where content fits without scrolling
    if (maxScroll <= 0) {
      setProgress(100)
      setIsComplete(true)
      return
    }

    const currentProgress = Math.min(100, Math.round((scrollTop / maxScroll) * 100))
    setProgress(currentProgress)

    if (currentProgress >= threshold && !isComplete) {
      setIsComplete(true)
    }
  }, [threshold, isComplete])

  /**
   * Debounced scroll handler for performance.
   */
  const handleScroll = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      updateProgress()
    }, debounceMs)
  }, [updateProgress, debounceMs])

  /**
   * Reset progress state.
   */
  const reset = useCallback(() => {
    setProgress(0)
    setIsComplete(false)
    if (containerRef.current) {
      containerRef.current.scrollTop = 0
    }
  }, [])

  /**
   * Set up scroll listener and initial calculation.
   */
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Initial progress calculation
    updateProgress()

    // Add scroll listener
    container.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [handleScroll, updateProgress])

  return {
    containerRef,
    progress,
    isComplete,
    reset,
  }
}
