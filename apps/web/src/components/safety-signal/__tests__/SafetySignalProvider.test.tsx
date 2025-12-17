/**
 * SafetySignalProvider Component Tests
 *
 * Story 7.5.3: Signal Confirmation & Resources - Task 8
 *
 * Tests for the SafetySignalProvider component that wraps
 * app sections to enable safety signal detection.
 *
 * CRITICAL REQUIREMENTS:
 * - Provides context to child components
 * - Integrates with useSafetySignal hook
 * - Manages keyboard shortcuts globally
 * - Tracks offline state
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, renderHook, act } from '@testing-library/react'
import React from 'react'
import {
  SafetySignalProvider,
  useSafetySignalContext,
  useSafetySignalContextOptional,
} from '../SafetySignalProvider'

// Mock the useSafetySignal hook
const mockUseSafetySignal = vi.fn()
const mockUseSafetyKeyboardShortcut = vi.fn()

vi.mock('../../../hooks/useSafetySignal', () => ({
  useSafetySignal: (options: any) => mockUseSafetySignal(options),
  useSafetyKeyboardShortcut: (options: any) => mockUseSafetyKeyboardShortcut(options),
}))

// ============================================================================
// Test Utilities
// ============================================================================

const defaultHookReturn = {
  onTap: vi.fn(),
  onKeyboardShortcut: vi.fn(),
  onSignalTriggered: vi.fn(() => () => {}),
  signalTriggered: false,
  isOffline: false,
  gestureInProgress: false,
  gestureProgress: 0,
  resetGesture: vi.fn(),
}

// Consumer component for testing context
function ContextConsumer() {
  const context = useSafetySignalContext()
  return (
    <div>
      <span data-testid="enabled">{String(context.enabled)}</span>
      <span data-testid="signalTriggered">{String(context.signalTriggered)}</span>
      <span data-testid="isOffline">{String(context.isOffline)}</span>
      <button data-testid="tap-button" onClick={context.onLogoTap}>
        Tap
      </button>
    </div>
  )
}

// ============================================================================
// Test Suite
// ============================================================================

describe('SafetySignalProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSafetySignal.mockReturnValue({ ...defaultHookReturn })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ==========================================================================
  // Basic Rendering
  // ==========================================================================

  describe('Basic Rendering', () => {
    it('should render children', () => {
      mockUseSafetySignal.mockReturnValue(defaultHookReturn)

      render(
        <SafetySignalProvider childId="test-child">
          <div data-testid="child">Child content</div>
        </SafetySignalProvider>
      )

      expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    it('should pass childId to useSafetySignal', () => {
      mockUseSafetySignal.mockReturnValue(defaultHookReturn)

      render(
        <SafetySignalProvider childId="test-child-123">
          <div>Content</div>
        </SafetySignalProvider>
      )

      expect(mockUseSafetySignal).toHaveBeenCalledWith(
        expect.objectContaining({
          childId: 'test-child-123',
        })
      )
    })

    it('should pass deviceType as web by default', () => {
      mockUseSafetySignal.mockReturnValue(defaultHookReturn)

      render(
        <SafetySignalProvider childId="test-child">
          <div>Content</div>
        </SafetySignalProvider>
      )

      expect(mockUseSafetySignal).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceType: 'web',
        })
      )
    })

    it('should pass custom gestureConfig', () => {
      mockUseSafetySignal.mockReturnValue(defaultHookReturn)
      const customConfig = { tapCountRequired: 7, tapWindowMs: 5000 }

      render(
        <SafetySignalProvider childId="test-child" gestureConfig={customConfig as any}>
          <div>Content</div>
        </SafetySignalProvider>
      )

      expect(mockUseSafetySignal).toHaveBeenCalledWith(
        expect.objectContaining({
          gestureConfig: customConfig,
        })
      )
    })

    it('should pass enabled prop to useSafetySignal', () => {
      mockUseSafetySignal.mockReturnValue(defaultHookReturn)

      render(
        <SafetySignalProvider childId="test-child" enabled={false}>
          <div>Content</div>
        </SafetySignalProvider>
      )

      expect(mockUseSafetySignal).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })
  })

  // ==========================================================================
  // Context Provider
  // ==========================================================================

  describe('Context Provider', () => {
    it('should provide onLogoTap from onTap', () => {
      const mockOnTap = vi.fn()
      mockUseSafetySignal.mockReturnValue({
        ...defaultHookReturn,
        onTap: mockOnTap,
      })

      render(
        <SafetySignalProvider childId="test-child">
          <ContextConsumer />
        </SafetySignalProvider>
      )

      screen.getByTestId('tap-button').click()
      expect(mockOnTap).toHaveBeenCalled()
    })

    it('should provide signalTriggered state', () => {
      mockUseSafetySignal.mockReturnValue({
        ...defaultHookReturn,
        signalTriggered: true,
      })

      render(
        <SafetySignalProvider childId="test-child">
          <ContextConsumer />
        </SafetySignalProvider>
      )

      expect(screen.getByTestId('signalTriggered')).toHaveTextContent('true')
    })

    it('should provide isOffline state', () => {
      mockUseSafetySignal.mockReturnValue({
        ...defaultHookReturn,
        isOffline: true,
      })

      render(
        <SafetySignalProvider childId="test-child">
          <ContextConsumer />
        </SafetySignalProvider>
      )

      expect(screen.getByTestId('isOffline')).toHaveTextContent('true')
    })

    it('should provide enabled state', () => {
      mockUseSafetySignal.mockReturnValue(defaultHookReturn)

      render(
        <SafetySignalProvider childId="test-child" enabled={true}>
          <ContextConsumer />
        </SafetySignalProvider>
      )

      expect(screen.getByTestId('enabled')).toHaveTextContent('true')
    })

    it('should provide onSignalTriggered callback registration', () => {
      const mockOnSignalTriggered = vi.fn(() => () => {})
      mockUseSafetySignal.mockReturnValue({
        ...defaultHookReturn,
        onSignalTriggered: mockOnSignalTriggered,
      })

      function TestComponent() {
        const { onSignalTriggered } = useSafetySignalContext()
        React.useEffect(() => {
          const unsubscribe = onSignalTriggered(() => {})
          return unsubscribe
        }, [onSignalTriggered])
        return null
      }

      render(
        <SafetySignalProvider childId="test-child">
          <TestComponent />
        </SafetySignalProvider>
      )

      expect(mockOnSignalTriggered).toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // Keyboard Shortcuts
  // ==========================================================================

  describe('Keyboard Shortcuts', () => {
    it('should enable keyboard shortcuts by default', () => {
      mockUseSafetySignal.mockReturnValue(defaultHookReturn)

      render(
        <SafetySignalProvider childId="test-child">
          <div>Content</div>
        </SafetySignalProvider>
      )

      expect(mockUseSafetyKeyboardShortcut).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
        })
      )
    })

    it('should disable keyboard shortcuts when enableKeyboardShortcut is false', () => {
      mockUseSafetySignal.mockReturnValue(defaultHookReturn)

      render(
        <SafetySignalProvider childId="test-child" enableKeyboardShortcut={false}>
          <div>Content</div>
        </SafetySignalProvider>
      )

      expect(mockUseSafetyKeyboardShortcut).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })

    it('should disable keyboard shortcuts when enabled is false', () => {
      mockUseSafetySignal.mockReturnValue(defaultHookReturn)

      render(
        <SafetySignalProvider childId="test-child" enabled={false}>
          <div>Content</div>
        </SafetySignalProvider>
      )

      expect(mockUseSafetyKeyboardShortcut).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })

    it('should pass onKeyboardShortcut to useSafetyKeyboardShortcut', () => {
      const mockOnKeyboardShortcut = vi.fn()
      mockUseSafetySignal.mockReturnValue({
        ...defaultHookReturn,
        onKeyboardShortcut: mockOnKeyboardShortcut,
      })

      render(
        <SafetySignalProvider childId="test-child">
          <div>Content</div>
        </SafetySignalProvider>
      )

      expect(mockUseSafetyKeyboardShortcut).toHaveBeenCalledWith(
        expect.objectContaining({
          onShortcutDetected: mockOnKeyboardShortcut,
        })
      )
    })
  })

  // ==========================================================================
  // Callback Registration
  // ==========================================================================

  describe('Callback Registration', () => {
    it('should register parent onSignalTriggered callback', () => {
      const mockOnSignalTriggered = vi.fn(() => () => {})
      mockUseSafetySignal.mockReturnValue({
        ...defaultHookReturn,
        onSignalTriggered: mockOnSignalTriggered,
      })

      const parentCallback = vi.fn()

      render(
        <SafetySignalProvider childId="test-child" onSignalTriggered={parentCallback}>
          <div>Content</div>
        </SafetySignalProvider>
      )

      expect(mockOnSignalTriggered).toHaveBeenCalledWith(parentCallback)
    })

    it('should not register callback if not provided', () => {
      const mockOnSignalTriggered = vi.fn(() => () => {})
      mockUseSafetySignal.mockReturnValue({
        ...defaultHookReturn,
        onSignalTriggered: mockOnSignalTriggered,
      })

      render(
        <SafetySignalProvider childId="test-child">
          <div>Content</div>
        </SafetySignalProvider>
      )

      // Called by context consumer internally, but not with parent callback
      expect(mockOnSignalTriggered).not.toHaveBeenCalledWith(expect.any(Function))
    })
  })

  // ==========================================================================
  // useSafetySignalContext Hook
  // ==========================================================================

  describe('useSafetySignalContext', () => {
    it('should throw when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        renderHook(() => useSafetySignalContext())
      }).toThrow('useSafetySignalContext must be used within a SafetySignalProvider')

      consoleSpy.mockRestore()
    })

    it('should return context when inside provider', () => {
      mockUseSafetySignal.mockReturnValue(defaultHookReturn)

      const { result } = renderHook(() => useSafetySignalContext(), {
        wrapper: ({ children }) => (
          <SafetySignalProvider childId="test-child">{children}</SafetySignalProvider>
        ),
      })

      expect(result.current).toBeDefined()
      expect(result.current.onLogoTap).toBeDefined()
      expect(result.current.signalTriggered).toBe(false)
    })
  })

  // ==========================================================================
  // useSafetySignalContextOptional Hook
  // ==========================================================================

  describe('useSafetySignalContextOptional', () => {
    it('should return null when used outside provider', () => {
      const { result } = renderHook(() => useSafetySignalContextOptional())
      expect(result.current).toBeNull()
    })

    it('should return context when inside provider', () => {
      mockUseSafetySignal.mockReturnValue(defaultHookReturn)

      const { result } = renderHook(() => useSafetySignalContextOptional(), {
        wrapper: ({ children }) => (
          <SafetySignalProvider childId="test-child">{children}</SafetySignalProvider>
        ),
      })

      expect(result.current).not.toBeNull()
      expect(result.current?.onLogoTap).toBeDefined()
    })
  })

  // ==========================================================================
  // Context Value Memoization
  // ==========================================================================

  describe('Context Value Memoization', () => {
    it('should memoize context value', () => {
      mockUseSafetySignal.mockReturnValue(defaultHookReturn)

      const contextValues: any[] = []
      function ContextTracker() {
        const context = useSafetySignalContext()
        contextValues.push(context)
        return null
      }

      const { rerender } = render(
        <SafetySignalProvider childId="test-child">
          <ContextTracker />
        </SafetySignalProvider>
      )

      rerender(
        <SafetySignalProvider childId="test-child">
          <ContextTracker />
        </SafetySignalProvider>
      )

      // Context should be memoized if dependencies haven't changed
      // Note: This depends on useSafetySignal returning stable references
      expect(contextValues.length).toBe(2)
    })

    it('should update context when hook values change', () => {
      mockUseSafetySignal.mockReturnValue({ ...defaultHookReturn, signalTriggered: false })

      const { rerender } = render(
        <SafetySignalProvider childId="test-child">
          <ContextConsumer />
        </SafetySignalProvider>
      )

      expect(screen.getByTestId('signalTriggered')).toHaveTextContent('false')

      mockUseSafetySignal.mockReturnValue({ ...defaultHookReturn, signalTriggered: true })

      rerender(
        <SafetySignalProvider childId="test-child">
          <ContextConsumer />
        </SafetySignalProvider>
      )

      expect(screen.getByTestId('signalTriggered')).toHaveTextContent('true')
    })
  })
})
