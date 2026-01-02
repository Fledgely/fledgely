/**
 * SafetySignalGestureDetector Tests - Story 7.5.1 Task 3
 *
 * Tests for the hidden safety gesture detection component.
 * AC1: Hidden gesture/code available (logo tap 5x, Ctrl+Shift+H)
 * AC4: Cannot be accidentally triggered
 * AC5: Consistent across platforms
 *
 * CRITICAL: No visible UI feedback on gesture detection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { useRef } from 'react'
import SafetySignalGestureDetector from './SafetySignalGestureDetector'
import { LOGO_TAP_COUNT, LOGO_TAP_WINDOW_MS, KEYBOARD_SHORTCUT } from '@fledgely/shared/contracts'

// Test wrapper component that provides logo ref
function TestWrapper({
  onSignalTriggered,
  disabled = false,
}: {
  onSignalTriggered: (method: 'logo_tap' | 'keyboard_shortcut') => void
  disabled?: boolean
}) {
  const logoRef = useRef<HTMLDivElement>(null)

  return (
    <SafetySignalGestureDetector
      logoRef={logoRef}
      onSignalTriggered={onSignalTriggered}
      disabled={disabled}
    >
      <div data-testid="app-content">
        <div ref={logoRef} data-testid="logo">
          Fledgely Logo
        </div>
        <div data-testid="other-content">Other Content</div>
      </div>
    </SafetySignalGestureDetector>
  )
}

describe('SafetySignalGestureDetector', () => {
  let onSignalTriggered: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onSignalTriggered = vi.fn()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  // ============================================
  // Rendering Tests
  // ============================================

  describe('rendering', () => {
    it('should render children without any visible changes', () => {
      render(<TestWrapper onSignalTriggered={onSignalTriggered} />)

      expect(screen.getByTestId('app-content')).toBeInTheDocument()
      expect(screen.getByTestId('logo')).toBeInTheDocument()
      expect(screen.getByTestId('other-content')).toBeInTheDocument()
    })

    it('should not add any visible UI elements', () => {
      const { container } = render(<TestWrapper onSignalTriggered={onSignalTriggered} />)

      // The wrapper should not add any extra DOM elements that are visible
      const wrapper = container.firstChild
      expect(wrapper).toBeTruthy()
      // Check no extra visible elements were added
      expect(container.querySelectorAll('[role="alert"]')).toHaveLength(0)
      expect(container.querySelectorAll('[role="dialog"]')).toHaveLength(0)
    })
  })

  // ============================================
  // Logo Tap Detection Tests (AC1, AC4)
  // ============================================

  describe('logo tap detection', () => {
    it('should trigger signal after 5 taps on logo (AC1)', () => {
      render(<TestWrapper onSignalTriggered={onSignalTriggered} />)
      const logo = screen.getByTestId('logo')

      // Tap logo 5 times
      for (let i = 0; i < LOGO_TAP_COUNT; i++) {
        fireEvent.click(logo)
      }

      expect(onSignalTriggered).toHaveBeenCalledTimes(1)
      expect(onSignalTriggered).toHaveBeenCalledWith('logo_tap')
    })

    it('should NOT trigger signal after only 4 taps (AC4)', () => {
      render(<TestWrapper onSignalTriggered={onSignalTriggered} />)
      const logo = screen.getByTestId('logo')

      // Tap logo only 4 times
      for (let i = 0; i < LOGO_TAP_COUNT - 1; i++) {
        fireEvent.click(logo)
      }

      expect(onSignalTriggered).not.toHaveBeenCalled()
    })

    it('should NOT trigger signal after 3 taps (AC4)', () => {
      render(<TestWrapper onSignalTriggered={onSignalTriggered} />)
      const logo = screen.getByTestId('logo')

      // Tap logo only 3 times
      for (let i = 0; i < 3; i++) {
        fireEvent.click(logo)
      }

      expect(onSignalTriggered).not.toHaveBeenCalled()
    })

    it('should trigger signal when 5 taps occur within time window', () => {
      render(<TestWrapper onSignalTriggered={onSignalTriggered} />)
      const logo = screen.getByTestId('logo')

      // Tap within the window
      for (let i = 0; i < LOGO_TAP_COUNT; i++) {
        fireEvent.click(logo)
        act(() => {
          vi.advanceTimersByTime(500) // 500ms between taps = 2.5s total
        })
      }

      expect(onSignalTriggered).toHaveBeenCalledTimes(1)
    })

    it('should NOT trigger signal when 5 taps are spread beyond time window (AC4)', () => {
      render(<TestWrapper onSignalTriggered={onSignalTriggered} />)
      const logo = screen.getByTestId('logo')

      // First 2 taps
      fireEvent.click(logo)
      fireEvent.click(logo)

      // Wait beyond the window
      act(() => {
        vi.advanceTimersByTime(LOGO_TAP_WINDOW_MS + 100)
      })

      // Next 3 taps (not enough since window reset)
      fireEvent.click(logo)
      fireEvent.click(logo)
      fireEvent.click(logo)

      expect(onSignalTriggered).not.toHaveBeenCalled()
    })

    it('should reset tap count after time window expires', () => {
      render(<TestWrapper onSignalTriggered={onSignalTriggered} />)
      const logo = screen.getByTestId('logo')

      // Tap 3 times
      for (let i = 0; i < 3; i++) {
        fireEvent.click(logo)
      }

      // Wait for window to expire
      act(() => {
        vi.advanceTimersByTime(LOGO_TAP_WINDOW_MS + 100)
      })

      // Tap 3 more times (should not trigger since counter reset)
      for (let i = 0; i < 3; i++) {
        fireEvent.click(logo)
      }

      expect(onSignalTriggered).not.toHaveBeenCalled()
    })

    it('should trigger after window reset plus 5 new taps', () => {
      render(<TestWrapper onSignalTriggered={onSignalTriggered} />)
      const logo = screen.getByTestId('logo')

      // Tap 3 times
      for (let i = 0; i < 3; i++) {
        fireEvent.click(logo)
      }

      // Wait for window to expire
      act(() => {
        vi.advanceTimersByTime(LOGO_TAP_WINDOW_MS + 100)
      })

      // Tap 5 times (should trigger)
      for (let i = 0; i < LOGO_TAP_COUNT; i++) {
        fireEvent.click(logo)
      }

      expect(onSignalTriggered).toHaveBeenCalledTimes(1)
    })

    it('should NOT trigger on clicks to non-logo elements (AC4)', () => {
      render(<TestWrapper onSignalTriggered={onSignalTriggered} />)
      const otherContent = screen.getByTestId('other-content')

      // Click other content 5 times
      for (let i = 0; i < LOGO_TAP_COUNT; i++) {
        fireEvent.click(otherContent)
      }

      expect(onSignalTriggered).not.toHaveBeenCalled()
    })

    it('should only count clicks on logo element (AC4)', () => {
      render(<TestWrapper onSignalTriggered={onSignalTriggered} />)
      const logo = screen.getByTestId('logo')
      const otherContent = screen.getByTestId('other-content')

      // Mix of clicks
      fireEvent.click(logo)
      fireEvent.click(otherContent) // Should not count
      fireEvent.click(logo)
      fireEvent.click(otherContent) // Should not count
      fireEvent.click(logo)
      fireEvent.click(logo)
      // Only 4 logo clicks, should not trigger

      expect(onSignalTriggered).not.toHaveBeenCalled()

      // One more logo click
      fireEvent.click(logo)
      expect(onSignalTriggered).toHaveBeenCalledTimes(1)
    })
  })

  // ============================================
  // Keyboard Shortcut Detection Tests (AC1, AC5)
  // ============================================

  describe('keyboard shortcut detection', () => {
    it('should trigger signal on Ctrl+Shift+H (AC1)', () => {
      render(<TestWrapper onSignalTriggered={onSignalTriggered} />)

      fireEvent.keyDown(document, {
        key: 'h',
        ctrlKey: true,
        shiftKey: true,
      })

      expect(onSignalTriggered).toHaveBeenCalledTimes(1)
      expect(onSignalTriggered).toHaveBeenCalledWith('keyboard_shortcut')
    })

    it('should trigger on uppercase H', () => {
      render(<TestWrapper onSignalTriggered={onSignalTriggered} />)

      fireEvent.keyDown(document, {
        key: 'H',
        ctrlKey: true,
        shiftKey: true,
      })

      expect(onSignalTriggered).toHaveBeenCalledTimes(1)
      expect(onSignalTriggered).toHaveBeenCalledWith('keyboard_shortcut')
    })

    it('should NOT trigger on Ctrl+H (missing Shift) (AC4)', () => {
      render(<TestWrapper onSignalTriggered={onSignalTriggered} />)

      fireEvent.keyDown(document, {
        key: 'h',
        ctrlKey: true,
        shiftKey: false,
      })

      expect(onSignalTriggered).not.toHaveBeenCalled()
    })

    it('should NOT trigger on Shift+H (missing Ctrl) (AC4)', () => {
      render(<TestWrapper onSignalTriggered={onSignalTriggered} />)

      fireEvent.keyDown(document, {
        key: 'h',
        ctrlKey: false,
        shiftKey: true,
      })

      expect(onSignalTriggered).not.toHaveBeenCalled()
    })

    it('should NOT trigger on just H (AC4)', () => {
      render(<TestWrapper onSignalTriggered={onSignalTriggered} />)

      fireEvent.keyDown(document, {
        key: 'h',
        ctrlKey: false,
        shiftKey: false,
      })

      expect(onSignalTriggered).not.toHaveBeenCalled()
    })

    it('should NOT trigger on Ctrl+Shift+K (wrong key) (AC4)', () => {
      render(<TestWrapper onSignalTriggered={onSignalTriggered} />)

      fireEvent.keyDown(document, {
        key: 'k',
        ctrlKey: true,
        shiftKey: true,
      })

      expect(onSignalTriggered).not.toHaveBeenCalled()
    })

    it('should NOT trigger on Alt+Shift+H (AC4)', () => {
      render(<TestWrapper onSignalTriggered={onSignalTriggered} />)

      fireEvent.keyDown(document, {
        key: 'h',
        altKey: true,
        shiftKey: true,
      })

      expect(onSignalTriggered).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // Debounce/Double-Trigger Prevention Tests
  // ============================================

  describe('double-trigger prevention', () => {
    it('should debounce rapid logo taps beyond 5', () => {
      render(<TestWrapper onSignalTriggered={onSignalTriggered} />)
      const logo = screen.getByTestId('logo')

      // Tap logo 10 times rapidly
      for (let i = 0; i < 10; i++) {
        fireEvent.click(logo)
      }

      // Should only trigger once
      expect(onSignalTriggered).toHaveBeenCalledTimes(1)
    })

    it('should debounce rapid keyboard shortcuts', () => {
      render(<TestWrapper onSignalTriggered={onSignalTriggered} />)

      // Press shortcut 5 times rapidly
      for (let i = 0; i < 5; i++) {
        fireEvent.keyDown(document, {
          key: 'h',
          ctrlKey: true,
          shiftKey: true,
        })
      }

      // Should only trigger once
      expect(onSignalTriggered).toHaveBeenCalledTimes(1)
    })

    it('should allow new trigger after debounce period', () => {
      render(<TestWrapper onSignalTriggered={onSignalTriggered} />)
      const logo = screen.getByTestId('logo')

      // First trigger
      for (let i = 0; i < LOGO_TAP_COUNT; i++) {
        fireEvent.click(logo)
      }
      expect(onSignalTriggered).toHaveBeenCalledTimes(1)

      // Wait for debounce to clear (5 seconds)
      act(() => {
        vi.advanceTimersByTime(5000)
      })

      // Second trigger
      for (let i = 0; i < LOGO_TAP_COUNT; i++) {
        fireEvent.click(logo)
      }
      expect(onSignalTriggered).toHaveBeenCalledTimes(2)
    })

    it('should NOT allow trigger during debounce period', () => {
      render(<TestWrapper onSignalTriggered={onSignalTriggered} />)
      const logo = screen.getByTestId('logo')

      // First trigger
      for (let i = 0; i < LOGO_TAP_COUNT; i++) {
        fireEvent.click(logo)
      }
      expect(onSignalTriggered).toHaveBeenCalledTimes(1)

      // Wait short time (within debounce)
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Try second trigger
      for (let i = 0; i < LOGO_TAP_COUNT; i++) {
        fireEvent.click(logo)
      }
      // Should still be 1
      expect(onSignalTriggered).toHaveBeenCalledTimes(1)
    })
  })

  // ============================================
  // Disabled State Tests
  // ============================================

  describe('disabled state', () => {
    it('should NOT trigger on logo tap when disabled', () => {
      render(<TestWrapper onSignalTriggered={onSignalTriggered} disabled={true} />)
      const logo = screen.getByTestId('logo')

      for (let i = 0; i < LOGO_TAP_COUNT; i++) {
        fireEvent.click(logo)
      }

      expect(onSignalTriggered).not.toHaveBeenCalled()
    })

    it('should NOT trigger on keyboard shortcut when disabled', () => {
      render(<TestWrapper onSignalTriggered={onSignalTriggered} disabled={true} />)

      fireEvent.keyDown(document, {
        key: 'h',
        ctrlKey: true,
        shiftKey: true,
      })

      expect(onSignalTriggered).not.toHaveBeenCalled()
    })

    it('should still render children when disabled', () => {
      render(<TestWrapper onSignalTriggered={onSignalTriggered} disabled={true} />)

      expect(screen.getByTestId('app-content')).toBeInTheDocument()
      expect(screen.getByTestId('logo')).toBeInTheDocument()
    })
  })

  // ============================================
  // No Visual Feedback Tests (AC2)
  // ============================================

  describe('no visual feedback (AC2)', () => {
    it('should not change any DOM elements when logo tap triggers signal', () => {
      const { container } = render(<TestWrapper onSignalTriggered={onSignalTriggered} />)
      const logo = screen.getByTestId('logo')

      const initialHTML = container.innerHTML

      // Trigger signal
      for (let i = 0; i < LOGO_TAP_COUNT; i++) {
        fireEvent.click(logo)
      }

      // DOM should be identical
      expect(container.innerHTML).toBe(initialHTML)
    })

    it('should not change any DOM elements when keyboard shortcut triggers signal', () => {
      const { container } = render(<TestWrapper onSignalTriggered={onSignalTriggered} />)

      const initialHTML = container.innerHTML

      // Trigger signal
      fireEvent.keyDown(document, {
        key: 'h',
        ctrlKey: true,
        shiftKey: true,
      })

      // DOM should be identical
      expect(container.innerHTML).toBe(initialHTML)
    })

    it('should not add any visible indicators', () => {
      const { container } = render(<TestWrapper onSignalTriggered={onSignalTriggered} />)
      const logo = screen.getByTestId('logo')

      // Trigger signal
      for (let i = 0; i < LOGO_TAP_COUNT; i++) {
        fireEvent.click(logo)
      }

      // Check for common feedback elements
      expect(container.querySelector('[data-signal-triggered]')).toBeNull()
      expect(container.querySelector('.signal-indicator')).toBeNull()
      expect(container.querySelector('[aria-live]')).toBeNull()
    })
  })

  // ============================================
  // Cleanup Tests
  // ============================================

  describe('cleanup', () => {
    it('should remove keyboard listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

      const { unmount } = render(<TestWrapper onSignalTriggered={onSignalTriggered} />)

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
      removeEventListenerSpy.mockRestore()
    })
  })

  // ============================================
  // Constants Verification Tests (AC5)
  // ============================================

  describe('constants verification (AC5)', () => {
    it('should use correct LOGO_TAP_COUNT constant', () => {
      expect(LOGO_TAP_COUNT).toBe(5)
    })

    it('should use correct LOGO_TAP_WINDOW_MS constant', () => {
      expect(LOGO_TAP_WINDOW_MS).toBe(3000)
    })

    it('should use correct KEYBOARD_SHORTCUT constant', () => {
      expect(KEYBOARD_SHORTCUT).toBe('Ctrl+Shift+H')
    })
  })

  // ============================================
  // Edge Cases
  // ============================================

  describe('edge cases', () => {
    it('should handle rapid alternating tap and keyboard triggers', () => {
      render(<TestWrapper onSignalTriggered={onSignalTriggered} />)
      const logo = screen.getByTestId('logo')

      // Tap 3 times
      for (let i = 0; i < 3; i++) {
        fireEvent.click(logo)
      }

      // Keyboard shortcut (triggers)
      fireEvent.keyDown(document, {
        key: 'h',
        ctrlKey: true,
        shiftKey: true,
      })

      // Should trigger from keyboard
      expect(onSignalTriggered).toHaveBeenCalledTimes(1)
      expect(onSignalTriggered).toHaveBeenCalledWith('keyboard_shortcut')
    })

    it('should handle logoRef being null gracefully', () => {
      function NullRefWrapper({
        onSignalTriggered,
      }: {
        onSignalTriggered: (method: 'logo_tap' | 'keyboard_shortcut') => void
      }) {
        const logoRef = useRef<HTMLDivElement>(null)
        // Don't assign ref to any element

        return (
          <SafetySignalGestureDetector logoRef={logoRef} onSignalTriggered={onSignalTriggered}>
            <div data-testid="app-content">App Content</div>
          </SafetySignalGestureDetector>
        )
      }

      // Should not throw
      expect(() => {
        render(<NullRefWrapper onSignalTriggered={onSignalTriggered} />)
      }).not.toThrow()

      // Keyboard should still work
      fireEvent.keyDown(document, {
        key: 'h',
        ctrlKey: true,
        shiftKey: true,
      })
      expect(onSignalTriggered).toHaveBeenCalledTimes(1)
    })

    it('should handle onSignalTriggered throwing an error gracefully', () => {
      const errorHandler = vi.fn().mockImplementation(() => {
        throw new Error('Handler error')
      })
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<TestWrapper onSignalTriggered={errorHandler} />)

      // Should not throw even if handler throws
      expect(() => {
        fireEvent.keyDown(document, {
          key: 'h',
          ctrlKey: true,
          shiftKey: true,
        })
      }).not.toThrow()

      consoleSpy.mockRestore()
    })
  })
})
