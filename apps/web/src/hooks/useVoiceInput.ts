/**
 * Voice Input Hook.
 *
 * Story 5.3: Child Contribution Capture - AC4
 *
 * Provides voice-to-text input using the Web Speech API.
 * Designed for children who may find typing difficult.
 *
 * PRIVACY CONSIDERATIONS:
 * - All voice processing happens locally in the browser (Web Speech API)
 * - Transcripts are NOT sent to Fledgely servers
 * - Browser vendors (Chrome, Safari) may send audio to their servers for processing
 * - Users should be informed via consent dialog before first use
 * - No persistent storage of audio or intermediate transcripts
 *
 * BROWSER COMPATIBILITY:
 * - Chrome/Edge: Full support (uses Google's speech service)
 * - Safari: Full support (uses Apple's speech service)
 * - Firefox: Limited support (may require additional setup)
 * - Gracefully degrades when unsupported (isSupported = false)
 *
 * SECURITY:
 * - Only processes input when explicitly started by user action
 * - Automatically stops on component unmount
 * - No XSS risk - output is sanitized by React
 */

import { useState, useCallback, useEffect, useRef } from 'react'

interface UseVoiceInputOptions {
  /** Language for speech recognition (default: 'en-US') */
  language?: string
  /** Called when transcript is updated */
  onTranscript?: (text: string) => void
  /** Called when an error occurs */
  onError?: (error: string) => void
}

interface UseVoiceInputReturn {
  /** Whether speech recognition is supported */
  isSupported: boolean
  /** Whether currently listening */
  isListening: boolean
  /** Current transcript */
  transcript: string
  /** Start listening */
  startListening: () => void
  /** Stop listening */
  stopListening: () => void
  /** Clear the transcript */
  clearTranscript: () => void
  /** Any error message */
  error: string | null
}

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: Event & { error: string }) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition
    webkitSpeechRecognition?: new () => SpeechRecognition
  }
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const { language = 'en-US', onTranscript, onError } = options

  const [isSupported, setIsSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognition | null>(null)

  /**
   * Check for Web Speech API support.
   */
  useEffect(() => {
    const SpeechRecognitionAPI =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null

    setIsSupported(!!SpeechRecognitionAPI)

    if (SpeechRecognitionAPI && !recognitionRef.current) {
      const recognition = new SpeechRecognitionAPI()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = language

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = ''
        let interimTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            finalTranscript += result[0].transcript
          } else {
            interimTranscript += result[0].transcript
          }
        }

        const newTranscript = finalTranscript || interimTranscript
        if (newTranscript) {
          setTranscript((prev) => {
            const updated = finalTranscript ? prev + finalTranscript : prev + interimTranscript
            return updated.trim()
          })
          onTranscript?.(newTranscript)
        }
      }

      recognition.onerror = (event: Event & { error: string }) => {
        const errorMessage = getErrorMessage(event.error)
        setError(errorMessage)
        setIsListening(false)
        onError?.(errorMessage)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognition.onstart = () => {
        setIsListening(true)
        setError(null)
      }

      recognitionRef.current = recognition
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [language, onTranscript, onError])

  /**
   * Map speech recognition errors to user-friendly messages.
   */
  const getErrorMessage = (errorType: string): string => {
    switch (errorType) {
      case 'no-speech':
        return "I didn't hear anything. Try speaking louder!"
      case 'audio-capture':
        return 'Microphone not found. Please check your microphone.'
      case 'not-allowed':
        return 'Microphone access was denied. Please enable it in settings.'
      case 'network':
        return 'Network error. Please check your internet connection.'
      case 'aborted':
        return 'Voice input was cancelled.'
      default:
        return 'Something went wrong. Please try again.'
    }
  }

  /**
   * Start listening for voice input.
   */
  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Voice input is not supported in this browser.')
      onError?.('Voice input is not supported in this browser.')
      return
    }

    if (recognitionRef.current && !isListening) {
      setError(null)
      setTranscript('')
      try {
        recognitionRef.current.start()
      } catch {
        // Recognition may already be started
        setError('Voice input is already active.')
      }
    }
  }, [isSupported, isListening, onError])

  /**
   * Stop listening for voice input.
   */
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
  }, [isListening])

  /**
   * Clear the current transcript.
   */
  const clearTranscript = useCallback(() => {
    setTranscript('')
  }, [])

  return {
    isSupported,
    isListening,
    transcript,
    startListening,
    stopListening,
    clearTranscript,
    error,
  }
}

export default useVoiceInput
