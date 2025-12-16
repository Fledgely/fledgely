'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

/**
 * Props for the VoiceInputButton component
 */
export interface VoiceInputButtonProps {
  /** Callback when speech is transcribed */
  onTranscript: (text: string) => void
  /** Callback when an error occurs */
  onError?: (error: string) => void
  /** Whether the button is disabled */
  disabled?: boolean
  /** Language code for speech recognition (default: 'en-US') */
  lang?: string
  /** Additional CSS classes */
  className?: string
  /** Data attributes for testing */
  'data-testid'?: string
}

/**
 * Check if speech recognition is supported
 */
function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

/**
 * VoiceInputButton Component
 *
 * Story 5.3: Child Contribution Capture - Task 3
 *
 * A child-friendly voice input button for hands-free text entry.
 * Features:
 * - Large, clear microphone button
 * - Visual recording indicator
 * - Child-friendly "Talk to me" label
 * - Graceful fallback for unsupported browsers
 * - 48x48px touch targets (NFR49)
 * - Full keyboard accessibility (NFR43)
 * - ARIA labels for screen readers (NFR42)
 *
 * @example
 * ```tsx
 * <VoiceInputButton
 *   onTranscript={(text) => setText(text)}
 *   onError={(error) => console.error(error)}
 * />
 * ```
 */
export function VoiceInputButton({
  onTranscript,
  onError,
  disabled = false,
  lang = 'en-US',
  className = '',
  'data-testid': dataTestId,
}: VoiceInputButtonProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Check browser support on mount
  useEffect(() => {
    setIsSupported(isSpeechRecognitionSupported())
  }, [])

  /**
   * Initialize speech recognition
   */
  const initRecognition = useCallback(() => {
    if (!isSpeechRecognitionSupported()) return null

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognitionAPI()

    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = lang

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      onTranscript(transcript)
      setIsRecording(false)
    }

    recognition.onerror = (event) => {
      const errorMessage = `Speech recognition error: ${event.error}`
      onError?.(errorMessage)
      setIsRecording(false)
    }

    recognition.onend = () => {
      setIsRecording(false)
    }

    return recognition
  }, [lang, onTranscript, onError])

  /**
   * Toggle recording state
   */
  const toggleRecording = useCallback(() => {
    if (disabled || !isSupported) return

    if (isRecording) {
      // Stop recording
      recognitionRef.current?.stop()
      setIsRecording(false)
    } else {
      // Start recording
      const recognition = initRecognition()
      if (recognition) {
        recognitionRef.current = recognition
        recognition.start()
        setIsRecording(true)
      }
    }
  }, [disabled, isSupported, isRecording, initRecognition])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
    }
  }, [])

  // Unsupported browser fallback
  if (!isSupported) {
    return (
      <div
        className={`flex items-center gap-2 text-gray-500 dark:text-gray-400 ${className}`}
        data-testid="voice-unsupported"
      >
        <span className="text-2xl">🎤</span>
        <span className="text-sm">Sorry, voice input isn't available in your browser</span>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={toggleRecording}
      disabled={disabled}
      aria-label={isRecording ? 'Stop listening' : 'Start voice input'}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl
        min-h-[48px] min-w-[48px]
        font-medium text-lg transition-all
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
        ${
          isRecording
            ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border-2 border-red-400 dark:border-red-600 recording'
            : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-2 border-blue-300 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-800'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      data-testid={dataTestId ?? 'voice-input-button'}
    >
      {/* Microphone icon */}
      {isRecording ? (
        <span
          className="relative flex items-center justify-center w-8 h-8"
          data-testid="recording-indicator"
        >
          {/* Pulsing animation for recording */}
          <span className="absolute w-full h-full bg-red-400 dark:bg-red-600 rounded-full animate-ping opacity-75" />
          <span className="relative text-2xl">🎙️</span>
        </span>
      ) : (
        <span className="text-2xl" data-testid="mic-icon">
          🎤
        </span>
      )}

      {/* Label */}
      <span>{isRecording ? 'Listening...' : 'Talk to me!'}</span>
    </button>
  )
}

export default VoiceInputButton
