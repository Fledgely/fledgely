/**
 * Safety Signal Content Script Tests - Story 7.5.1 Task 6
 *
 * Tests for the Chrome extension safety signal detection.
 *
 * AC1: Hidden gesture/code available (keyboard shortcut)
 * AC4: Cannot be accidentally triggered
 * AC5: Consistent across platforms
 *
 * Note: These are unit tests for the detection logic.
 * The content script behavior with chrome.runtime is mocked.
 */

// Set test environment before any imports
process.env.NODE_ENV = 'test'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock chrome.runtime before importing the module
const mockSendMessage = vi.fn()
const mockAddListener = vi.fn()

vi.stubGlobal('chrome', {
  runtime: {
    sendMessage: mockSendMessage,
    onMessage: {
      addListener: mockAddListener,
    },
    lastError: null,
  },
})

// Import after mocking chrome
import {
  handleKeyDown,
  isDebouncing,
  resetSafetySignalState,
  KEYBOARD_SHORTCUT_KEY,
  DEBOUNCE_MS,
} from './safety-signal'

describe('Safety Signal Content Script - Story 7.5.1', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    resetSafetySignalState() // Reset debounce state between tests
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ============================================
  // Constants Tests (AC5)
  // ============================================

  describe('constants (AC5)', () => {
    it('should use "h" as the shortcut key', () => {
      expect(KEYBOARD_SHORTCUT_KEY).toBe('h')
    })

    it('should use 5 seconds for debounce period', () => {
      expect(DEBOUNCE_MS).toBe(5000)
    })
  })

  // ============================================
  // Keyboard Shortcut Detection Tests (AC1, AC4)
  // ============================================

  describe('keyboard shortcut detection', () => {
    it('should detect Ctrl+Shift+H (AC1)', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'h',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      })

      // Add preventDefault mock
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      handleKeyDown(event)

      expect(preventDefaultSpy).toHaveBeenCalled()
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SAFETY_SIGNAL_TRIGGERED',
          triggerMethod: 'keyboard_shortcut',
          platform: 'chrome_extension',
        }),
        expect.any(Function)
      )
    })

    it('should detect Ctrl+Shift+H with uppercase H', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'H',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      })

      handleKeyDown(event)

      expect(mockSendMessage).toHaveBeenCalled()
    })

    it('should NOT detect Ctrl+H (missing Shift) (AC4)', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'h',
        ctrlKey: true,
        shiftKey: false,
        bubbles: true,
      })

      handleKeyDown(event)

      expect(mockSendMessage).not.toHaveBeenCalled()
    })

    it('should NOT detect Shift+H (missing Ctrl) (AC4)', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'h',
        ctrlKey: false,
        shiftKey: true,
        bubbles: true,
      })

      handleKeyDown(event)

      expect(mockSendMessage).not.toHaveBeenCalled()
    })

    it('should NOT detect just H (AC4)', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'h',
        ctrlKey: false,
        shiftKey: false,
        bubbles: true,
      })

      handleKeyDown(event)

      expect(mockSendMessage).not.toHaveBeenCalled()
    })

    it('should NOT detect Ctrl+Shift+K (wrong key) (AC4)', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      })

      handleKeyDown(event)

      expect(mockSendMessage).not.toHaveBeenCalled()
    })

    it('should NOT detect Alt+Shift+H (wrong modifier) (AC4)', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'h',
        altKey: true,
        shiftKey: true,
        bubbles: true,
      })

      handleKeyDown(event)

      expect(mockSendMessage).not.toHaveBeenCalled()
    })

    it('should NOT detect Meta+Shift+H (wrong modifier) (AC4)', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'h',
        metaKey: true,
        shiftKey: true,
        bubbles: true,
      })

      handleKeyDown(event)

      expect(mockSendMessage).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // Debounce Tests
  // ============================================

  describe('debounce', () => {
    it('should debounce rapid triggers', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'h',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      })

      // First trigger
      handleKeyDown(event)
      expect(mockSendMessage).toHaveBeenCalledTimes(1)

      // Rapid subsequent triggers
      handleKeyDown(event)
      handleKeyDown(event)
      handleKeyDown(event)

      // Should still be 1
      expect(mockSendMessage).toHaveBeenCalledTimes(1)
    })

    it('should allow trigger after debounce period', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'h',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      })

      // First trigger
      handleKeyDown(event)
      expect(mockSendMessage).toHaveBeenCalledTimes(1)

      // Wait for debounce period
      vi.advanceTimersByTime(DEBOUNCE_MS + 100)

      // Second trigger should work
      handleKeyDown(event)
      expect(mockSendMessage).toHaveBeenCalledTimes(2)
    })

    it('should NOT allow trigger during debounce period', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'h',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      })

      // First trigger
      handleKeyDown(event)
      expect(mockSendMessage).toHaveBeenCalledTimes(1)

      // Wait less than debounce period
      vi.advanceTimersByTime(DEBOUNCE_MS - 1000)

      // Second trigger should be blocked
      handleKeyDown(event)
      expect(mockSendMessage).toHaveBeenCalledTimes(1)
    })

    it('should report debouncing state correctly', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'h',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      })

      // Before trigger
      expect(isDebouncing()).toBe(false)

      // After trigger
      handleKeyDown(event)
      expect(isDebouncing()).toBe(true)

      // After debounce period
      vi.advanceTimersByTime(DEBOUNCE_MS + 100)
      expect(isDebouncing()).toBe(false)
    })
  })

  // ============================================
  // Message Format Tests
  // ============================================

  describe('message format', () => {
    it('should include timestamp in message', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'h',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      })

      handleKeyDown(event)

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Number),
        }),
        expect.any(Function)
      )
    })

    it('should include url in message', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'h',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      })

      handleKeyDown(event)

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.any(String),
        }),
        expect.any(Function)
      )
    })
  })

  // ============================================
  // Error Handling Tests
  // ============================================

  describe('error handling', () => {
    it('should handle sendMessage errors silently', () => {
      mockSendMessage.mockImplementationOnce(() => {
        throw new Error('Extension context invalidated')
      })

      const event = new KeyboardEvent('keydown', {
        key: 'h',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      })

      // Should not throw
      expect(() => handleKeyDown(event)).not.toThrow()
    })
  })
})
