'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

/**
 * KeyCommitmentsReadAloud Component Props
 */
export interface KeyCommitmentsReadAloudProps {
  /** Array of commitment strings to read aloud */
  commitments: string[]
  /** Callback when reading is complete or skipped */
  onComplete: () => void
}

/**
 * KeyCommitmentsReadAloud Component
 *
 * Story 6.1: Child Digital Signature Ceremony - Task 4
 *
 * Uses Web Speech API to read key commitments aloud before
 * the child signs the agreement. This supports accessibility (AC #4)
 * and helps ensure the child understands what they are agreeing to.
 *
 * Features:
 * - Text-to-speech using Web Speech API (Task 4.2)
 * - Extract and display commitments (Task 4.3)
 * - Play/pause/stop controls (Task 4.4)
 * - Highlights current commitment being read (Task 4.5)
 * - Visual alternative for users who prefer reading (Task 4.6)
 * - ARIA live regions for accessibility (Task 4.7, NFR42)
 * - 44x44px touch targets (NFR49)
 *
 * @example
 * ```tsx
 * <KeyCommitmentsReadAloud
 *   commitments={["I will have 2 hours screen time", "I will go to bed by 9pm"]}
 *   onComplete={() => proceedToSigning()}
 * />
 * ```
 */
export function KeyCommitmentsReadAloud({
  commitments,
  onComplete,
}: KeyCommitmentsReadAloudProps) {
  // State
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [speechSupported, setSpeechSupported] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')

  // Refs
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Check for speech synthesis support
  useEffect(() => {
    setSpeechSupported(typeof window !== 'undefined' && 'speechSynthesis' in window)
  }, [])

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  // Speak a specific commitment
  const speakCommitment = useCallback(
    (index: number) => {
      if (!speechSupported || index >= commitments.length) {
        return
      }

      const text = commitments[index]
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = 0.9 // Slightly slower for children
      utterance.pitch = 1

      utterance.onstart = () => {
        setStatusMessage(`Reading commitment ${index + 1} of ${commitments.length}`)
      }

      utterance.onend = () => {
        const nextIndex = index + 1
        if (nextIndex < commitments.length) {
          setCurrentIndex(nextIndex)
          // Small delay between commitments
          setTimeout(() => speakCommitment(nextIndex), 500)
        } else {
          // All done
          setIsPlaying(false)
          setStatusMessage('All commitments have been read')
          onComplete()
        }
      }

      utterance.onerror = () => {
        setIsPlaying(false)
        setStatusMessage('Error reading commitments. Please read them yourself.')
      }

      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    },
    [commitments, speechSupported, onComplete]
  )

  // Handle play button click
  const handlePlay = useCallback(() => {
    if (!speechSupported) return

    if (isPaused) {
      // Resume from pause
      window.speechSynthesis.resume()
      setIsPaused(false)
      setIsPlaying(true)
      setStatusMessage('Resuming...')
    } else {
      // Start fresh
      window.speechSynthesis.cancel()
      setCurrentIndex(0)
      setIsPlaying(true)
      setIsPaused(false)
      setStatusMessage('Starting to read commitments...')
      speakCommitment(0)
    }
  }, [speechSupported, isPaused, speakCommitment])

  // Handle pause button click
  const handlePause = useCallback(() => {
    if (!speechSupported) return

    window.speechSynthesis.pause()
    setIsPaused(true)
    setIsPlaying(false)
    setStatusMessage('Paused')
  }, [speechSupported])

  // Handle stop button click
  const handleStop = useCallback(() => {
    if (!speechSupported) return

    window.speechSynthesis.cancel()
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentIndex(0)
    setStatusMessage('Stopped')
  }, [speechSupported])

  // Handle skip/continue
  const handleSkip = useCallback(() => {
    window.speechSynthesis?.cancel()
    setIsPlaying(false)
    setIsPaused(false)
    onComplete()
  }, [onComplete])

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Listen to Your Commitments
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Let us read the important parts out loud, or read them yourself below.
        </p>
      </div>

      {/* Status announcement for screen readers */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {statusMessage}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-4">
        {speechSupported ? (
          <>
            {/* Play/Pause Button */}
            {isPlaying ? (
              <button
                type="button"
                onClick={handlePause}
                aria-label="Pause reading"
                className="min-h-[44px] min-w-[44px] px-4 py-2 flex items-center gap-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
                Pause
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePlay}
                aria-label={isPaused ? 'Resume reading' : 'Listen to commitments'}
                className="min-h-[44px] min-w-[44px] px-4 py-2 flex items-center gap-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
                {isPaused ? 'Resume' : 'Listen'}
              </button>
            )}

            {/* Stop Button */}
            <button
              type="button"
              onClick={handleStop}
              disabled={!isPlaying && !isPaused}
              aria-label="Stop reading"
              className="min-h-[44px] min-w-[44px] px-4 py-2 flex items-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M6 6h12v12H6z" />
              </svg>
              Stop
            </button>
          </>
        ) : (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Audio is not available on this device. Please read the commitments below.
          </p>
        )}

        {/* Progress */}
        {commitments.length > 0 && (
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
            {isPlaying || isPaused ? `${currentIndex + 1} of ${commitments.length}` : `${commitments.length} commitments`}
          </span>
        )}
      </div>

      {/* Commitments List */}
      <ol className="space-y-3 mb-6">
        {commitments.map((commitment, index) => (
          <li
            key={index}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
              isPlaying && currentIndex === index
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            }`}
          >
            <span
              className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-sm font-medium ${
                isPlaying && currentIndex === index
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {index + 1}
            </span>
            <span className="text-gray-900 dark:text-gray-100">{commitment}</span>
          </li>
        ))}
      </ol>

      {/* Visual Alternative / Skip */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Prefer to read? You can skip the audio.
        </p>
        <button
          type="button"
          onClick={handleSkip}
          aria-label="I have read the commitments, continue"
          className="min-h-[44px] px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-lg transition-colors"
        >
          I've read them, continue
        </button>
      </div>
    </div>
  )
}
