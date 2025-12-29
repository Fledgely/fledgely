/**
 * useVoiceInput Hook Tests.
 *
 * Story 5.3: Child Contribution Capture - AC4
 */

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useVoiceInput } from '../useVoiceInput'

// Mock SpeechRecognition
const mockSpeechRecognition = {
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
  continuous: false,
  interimResults: false,
  lang: 'en-US',
  onresult: null as ((event: unknown) => void) | null,
  onerror: null as ((event: unknown) => void) | null,
  onend: null as (() => void) | null,
  onstart: null as (() => void) | null,
}

const MockSpeechRecognitionConstructor = vi.fn(() => mockSpeechRecognition)

describe('useVoiceInput', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSpeechRecognition.onresult = null
    mockSpeechRecognition.onerror = null
    mockSpeechRecognition.onend = null
    mockSpeechRecognition.onstart = null
    // Reset window properties
    Object.defineProperty(window, 'SpeechRecognition', {
      value: undefined,
      writable: true,
    })
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: undefined,
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Browser Support', () => {
    it('returns isSupported=false when Speech API is not available', () => {
      const { result } = renderHook(() => useVoiceInput())

      expect(result.current.isSupported).toBe(false)
    })

    it('returns isSupported=true when SpeechRecognition is available', () => {
      Object.defineProperty(window, 'SpeechRecognition', {
        value: MockSpeechRecognitionConstructor,
        writable: true,
      })

      const { result } = renderHook(() => useVoiceInput())

      expect(result.current.isSupported).toBe(true)
    })

    it('returns isSupported=true when webkitSpeechRecognition is available', () => {
      Object.defineProperty(window, 'webkitSpeechRecognition', {
        value: MockSpeechRecognitionConstructor,
        writable: true,
      })

      const { result } = renderHook(() => useVoiceInput())

      expect(result.current.isSupported).toBe(true)
    })
  })

  describe('Initial State', () => {
    it('initializes with correct default values', () => {
      Object.defineProperty(window, 'SpeechRecognition', {
        value: MockSpeechRecognitionConstructor,
        writable: true,
      })

      const { result } = renderHook(() => useVoiceInput())

      expect(result.current.isListening).toBe(false)
      expect(result.current.transcript).toBe('')
      expect(result.current.error).toBe(null)
    })
  })

  describe('startListening', () => {
    it('sets error when not supported', () => {
      const onError = vi.fn()
      const { result } = renderHook(() => useVoiceInput({ onError }))

      act(() => {
        result.current.startListening()
      })

      expect(result.current.error).toBe('Voice input is not supported in this browser.')
      expect(onError).toHaveBeenCalledWith('Voice input is not supported in this browser.')
    })

    it('calls recognition.start() when supported', () => {
      Object.defineProperty(window, 'SpeechRecognition', {
        value: MockSpeechRecognitionConstructor,
        writable: true,
      })

      const { result } = renderHook(() => useVoiceInput())

      act(() => {
        result.current.startListening()
      })

      expect(mockSpeechRecognition.start).toHaveBeenCalled()
    })

    it('clears transcript when starting', () => {
      Object.defineProperty(window, 'SpeechRecognition', {
        value: MockSpeechRecognitionConstructor,
        writable: true,
      })

      const { result } = renderHook(() => useVoiceInput())

      act(() => {
        result.current.startListening()
      })

      expect(result.current.transcript).toBe('')
    })
  })

  describe('stopListening', () => {
    it('calls recognition.stop() when listening', () => {
      Object.defineProperty(window, 'SpeechRecognition', {
        value: MockSpeechRecognitionConstructor,
        writable: true,
      })

      const { result } = renderHook(() => useVoiceInput())

      // Simulate starting
      act(() => {
        result.current.startListening()
      })

      // Trigger onstart callback
      act(() => {
        mockSpeechRecognition.onstart?.()
      })

      expect(result.current.isListening).toBe(true)

      act(() => {
        result.current.stopListening()
      })

      expect(mockSpeechRecognition.stop).toHaveBeenCalled()
    })
  })

  describe('clearTranscript', () => {
    it('clears the transcript', () => {
      Object.defineProperty(window, 'SpeechRecognition', {
        value: MockSpeechRecognitionConstructor,
        writable: true,
      })

      const { result } = renderHook(() => useVoiceInput())

      act(() => {
        result.current.clearTranscript()
      })

      expect(result.current.transcript).toBe('')
    })
  })

  describe('Error Handling', () => {
    it('handles no-speech error with friendly message', () => {
      Object.defineProperty(window, 'SpeechRecognition', {
        value: MockSpeechRecognitionConstructor,
        writable: true,
      })

      const onError = vi.fn()
      const { result } = renderHook(() => useVoiceInput({ onError }))

      act(() => {
        result.current.startListening()
      })

      act(() => {
        mockSpeechRecognition.onerror?.({ error: 'no-speech' })
      })

      expect(result.current.error).toBe("I didn't hear anything. Try speaking louder!")
      expect(onError).toHaveBeenCalledWith("I didn't hear anything. Try speaking louder!")
    })

    it('handles audio-capture error', () => {
      Object.defineProperty(window, 'SpeechRecognition', {
        value: MockSpeechRecognitionConstructor,
        writable: true,
      })

      const { result } = renderHook(() => useVoiceInput())

      act(() => {
        result.current.startListening()
      })

      act(() => {
        mockSpeechRecognition.onerror?.({ error: 'audio-capture' })
      })

      expect(result.current.error).toBe('Microphone not found. Please check your microphone.')
    })

    it('handles not-allowed error', () => {
      Object.defineProperty(window, 'SpeechRecognition', {
        value: MockSpeechRecognitionConstructor,
        writable: true,
      })

      const { result } = renderHook(() => useVoiceInput())

      act(() => {
        result.current.startListening()
      })

      act(() => {
        mockSpeechRecognition.onerror?.({ error: 'not-allowed' })
      })

      expect(result.current.error).toBe(
        'Microphone access was denied. Please enable it in settings.'
      )
    })

    it('handles network error', () => {
      Object.defineProperty(window, 'SpeechRecognition', {
        value: MockSpeechRecognitionConstructor,
        writable: true,
      })

      const { result } = renderHook(() => useVoiceInput())

      act(() => {
        result.current.startListening()
      })

      act(() => {
        mockSpeechRecognition.onerror?.({ error: 'network' })
      })

      expect(result.current.error).toBe('Network error. Please check your internet connection.')
    })

    it('handles aborted error', () => {
      Object.defineProperty(window, 'SpeechRecognition', {
        value: MockSpeechRecognitionConstructor,
        writable: true,
      })

      const { result } = renderHook(() => useVoiceInput())

      act(() => {
        result.current.startListening()
      })

      act(() => {
        mockSpeechRecognition.onerror?.({ error: 'aborted' })
      })

      expect(result.current.error).toBe('Voice input was cancelled.')
    })

    it('handles unknown errors with generic message', () => {
      Object.defineProperty(window, 'SpeechRecognition', {
        value: MockSpeechRecognitionConstructor,
        writable: true,
      })

      const { result } = renderHook(() => useVoiceInput())

      act(() => {
        result.current.startListening()
      })

      act(() => {
        mockSpeechRecognition.onerror?.({ error: 'unknown-error' })
      })

      expect(result.current.error).toBe('Something went wrong. Please try again.')
    })

    it('sets isListening to false on error', () => {
      Object.defineProperty(window, 'SpeechRecognition', {
        value: MockSpeechRecognitionConstructor,
        writable: true,
      })

      const { result } = renderHook(() => useVoiceInput())

      act(() => {
        result.current.startListening()
        mockSpeechRecognition.onstart?.()
      })

      expect(result.current.isListening).toBe(true)

      act(() => {
        mockSpeechRecognition.onerror?.({ error: 'network' })
      })

      expect(result.current.isListening).toBe(false)
    })
  })

  describe('Recognition Lifecycle', () => {
    it('sets isListening=true on onstart', () => {
      Object.defineProperty(window, 'SpeechRecognition', {
        value: MockSpeechRecognitionConstructor,
        writable: true,
      })

      const { result } = renderHook(() => useVoiceInput())

      act(() => {
        result.current.startListening()
        mockSpeechRecognition.onstart?.()
      })

      expect(result.current.isListening).toBe(true)
    })

    it('sets isListening=false on onend', () => {
      Object.defineProperty(window, 'SpeechRecognition', {
        value: MockSpeechRecognitionConstructor,
        writable: true,
      })

      const { result } = renderHook(() => useVoiceInput())

      act(() => {
        result.current.startListening()
        mockSpeechRecognition.onstart?.()
      })

      expect(result.current.isListening).toBe(true)

      act(() => {
        mockSpeechRecognition.onend?.()
      })

      expect(result.current.isListening).toBe(false)
    })

    it('clears error on onstart', () => {
      Object.defineProperty(window, 'SpeechRecognition', {
        value: MockSpeechRecognitionConstructor,
        writable: true,
      })

      const { result } = renderHook(() => useVoiceInput())

      act(() => {
        result.current.startListening()
        mockSpeechRecognition.onerror?.({ error: 'network' })
      })

      expect(result.current.error).not.toBe(null)

      act(() => {
        result.current.startListening()
        mockSpeechRecognition.onstart?.()
      })

      expect(result.current.error).toBe(null)
    })
  })

  describe('Language Configuration', () => {
    it('uses en-US as default language', () => {
      Object.defineProperty(window, 'SpeechRecognition', {
        value: MockSpeechRecognitionConstructor,
        writable: true,
      })

      renderHook(() => useVoiceInput())

      expect(mockSpeechRecognition.lang).toBe('en-US')
    })

    it('uses custom language when specified', () => {
      Object.defineProperty(window, 'SpeechRecognition', {
        value: MockSpeechRecognitionConstructor,
        writable: true,
      })

      renderHook(() => useVoiceInput({ language: 'es-ES' }))

      expect(mockSpeechRecognition.lang).toBe('es-ES')
    })
  })

  describe('Cleanup', () => {
    it('aborts recognition on unmount', () => {
      Object.defineProperty(window, 'SpeechRecognition', {
        value: MockSpeechRecognitionConstructor,
        writable: true,
      })

      const { unmount } = renderHook(() => useVoiceInput())

      unmount()

      expect(mockSpeechRecognition.abort).toHaveBeenCalled()
    })
  })
})
