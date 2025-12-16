'use client'

import { useState, useCallback, useEffect } from 'react'

/**
 * useStepAnnouncer Hook
 *
 * Story 6.7: Signature Accessibility - Task 3.2
 *
 * Provides screen reader announcements for multi-step processes.
 * Creates announcements that are read by screen readers using
 * aria-live regions.
 *
 * Features:
 * - Step progress announcements ("Step 1 of 3: Review commitments")
 * - Custom message announcements
 * - Auto-clear after timeout
 * - Polite vs assertive announcement levels
 *
 * @example
 * ```tsx
 * function SigningCeremony() {
 *   const [step, setStep] = useState(1)
 *   const { announcement, announceStep, announceMessage, AnnouncerRegion } =
 *     useStepAnnouncer()
 *
 *   useEffect(() => {
 *     announceStep(step, 3, stepDescriptions[step])
 *   }, [step])
 *
 *   return (
 *     <>
 *       <AnnouncerRegion />
 *       {// ... step content}
 *     </>
 *   )
 * }
 * ```
 */

type AnnouncementLevel = 'polite' | 'assertive'

interface UseStepAnnouncerOptions {
  /** Auto-clear announcement after this many ms (0 = don't clear) */
  clearAfterMs?: number
  /** Default announcement level */
  defaultLevel?: AnnouncementLevel
}

interface UseStepAnnouncerReturn {
  /** Current announcement text */
  announcement: string
  /** Current announcement level */
  level: AnnouncementLevel
  /** Announce a step in a multi-step process */
  announceStep: (current: number, total: number, description: string) => void
  /** Announce a custom message */
  announceMessage: (message: string, level?: AnnouncementLevel) => void
  /** Announce completion */
  announceCompletion: (message: string) => void
  /** Announce an error */
  announceError: (message: string) => void
  /** Clear current announcement */
  clearAnnouncement: () => void
  /** Component to render the aria-live region */
  AnnouncerRegion: React.FC
}

export function useStepAnnouncer(
  options: UseStepAnnouncerOptions = {}
): UseStepAnnouncerReturn {
  const { clearAfterMs = 0, defaultLevel = 'polite' } = options

  const [announcement, setAnnouncement] = useState('')
  const [level, setLevel] = useState<AnnouncementLevel>(defaultLevel)

  const clearAnnouncement = useCallback(() => {
    setAnnouncement('')
  }, [])

  // Auto-clear announcement after timeout
  useEffect(() => {
    if (!announcement || !clearAfterMs) return

    const timeoutId = setTimeout(clearAnnouncement, clearAfterMs)
    return () => clearTimeout(timeoutId)
  }, [announcement, clearAfterMs, clearAnnouncement])

  const announceStep = useCallback(
    (current: number, total: number, description: string) => {
      // Force re-announcement by briefly clearing
      setAnnouncement('')
      setTimeout(() => {
        setLevel('polite')
        setAnnouncement(`Step ${current} of ${total}: ${description}`)
      }, 50)
    },
    []
  )

  const announceMessage = useCallback(
    (message: string, messageLevel: AnnouncementLevel = defaultLevel) => {
      // Force re-announcement by briefly clearing
      setAnnouncement('')
      setTimeout(() => {
        setLevel(messageLevel)
        setAnnouncement(message)
      }, 50)
    },
    [defaultLevel]
  )

  const announceCompletion = useCallback((message: string) => {
    // Force re-announcement by briefly clearing
    setAnnouncement('')
    setTimeout(() => {
      setLevel('polite')
      setAnnouncement(message)
    }, 50)
  }, [])

  const announceError = useCallback((message: string) => {
    // Errors use assertive for immediate announcement
    setAnnouncement('')
    setTimeout(() => {
      setLevel('assertive')
      setAnnouncement(message)
    }, 50)
  }, [])

  // Announcer region component (sr-only, placed in DOM)
  const AnnouncerRegion: React.FC = useCallback(
    () => (
      <>
        {/* Polite announcements */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {level === 'polite' ? announcement : ''}
        </div>
        {/* Assertive announcements (for errors) */}
        <div
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="sr-only"
        >
          {level === 'assertive' ? announcement : ''}
        </div>
      </>
    ),
    [announcement, level]
  )

  return {
    announcement,
    level,
    announceStep,
    announceMessage,
    announceCompletion,
    announceError,
    clearAnnouncement,
    AnnouncerRegion,
  }
}

export type { UseStepAnnouncerOptions, UseStepAnnouncerReturn, AnnouncementLevel }
