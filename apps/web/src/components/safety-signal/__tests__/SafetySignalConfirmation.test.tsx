/**
 * SafetySignalConfirmation Component Tests
 *
 * Story 7.5.3: Signal Confirmation & Resources - Task 8
 *
 * Tests for the SafetySignalConfirmation component that shows
 * discrete confirmation when a safety signal is triggered.
 *
 * CRITICAL REQUIREMENTS:
 * - Discrete - doesn't draw observer attention (AC3)
 * - Shows crisis resources immediately available
 * - Emergency 911 button with confirmation on desktop
 * - Auto-dismiss with configurable timeout
 * - Offline state handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { SafetySignalConfirmation } from '../SafetySignalConfirmation'
import { SafetySignalProvider } from '../SafetySignalProvider'
import {
  DEFAULT_CONFIRMATION_CONTENT,
  DEFAULT_CRISIS_RESOURCES,
  SIGNAL_CONFIRMATION_CONSTANTS,
  type SignalConfirmationContent,
  type CrisisResource,
} from '@fledgely/contracts'

// ============================================================================
// Test Utilities
// ============================================================================

// Mock useSafetySignalContextOptional to control signal state
const mockContextValue = {
  onLogoTap: vi.fn(),
  signalTriggered: false,
  isOffline: false,
  onSignalTriggered: vi.fn(() => () => {}),
  enabled: true,
}

vi.mock('../SafetySignalProvider', async () => {
  const actual = await vi.importActual('../SafetySignalProvider')
  return {
    ...actual,
    useSafetySignalContextOptional: () => mockContextValue,
  }
})

// Mock timers
vi.useFakeTimers()

// Mock window.confirm for emergency button tests
const mockConfirm = vi.fn()
Object.defineProperty(window, 'confirm', { value: mockConfirm, writable: true })

// Mock navigator.userAgent
const originalUserAgent = navigator.userAgent
const mockUserAgent = (ua: string) => {
  Object.defineProperty(navigator, 'userAgent', {
    value: ua,
    writable: true,
    configurable: true,
  })
}

// Helper to trigger signal
const triggerSignal = (isOffline = false) => {
  mockContextValue.signalTriggered = true
  mockContextValue.isOffline = isOffline
}

// Helper to reset context
const resetContext = () => {
  mockContextValue.signalTriggered = false
  mockContextValue.isOffline = false
}

// Custom render that re-renders to pick up context changes
const renderAndTrigger = (props = {}, isOffline = false) => {
  const result = render(<SafetySignalConfirmation {...props} />)
  triggerSignal(isOffline)
  result.rerender(<SafetySignalConfirmation {...props} />)
  return result
}

// ============================================================================
// Test Suite
// ============================================================================

describe('SafetySignalConfirmation', () => {
  beforeEach(() => {
    resetContext()
    vi.clearAllTimers()
    mockConfirm.mockReturnValue(true)
  })

  afterEach(() => {
    vi.clearAllMocks()
    mockUserAgent(originalUserAgent)
  })

  // ==========================================================================
  // Visibility Tests
  // ==========================================================================

  describe('Visibility', () => {
    it('should not be visible when signal is not triggered', () => {
      render(<SafetySignalConfirmation />)
      expect(screen.queryByTestId('safety-signal-confirmation')).not.toBeInTheDocument()
    })

    it('should become visible when signal is triggered', () => {
      renderAndTrigger()
      expect(screen.getByTestId('safety-signal-confirmation')).toBeInTheDocument()
    })

    it('should show backdrop when visible', () => {
      renderAndTrigger()
      expect(screen.getByTestId('safety-signal-confirmation-backdrop')).toBeInTheDocument()
    })

    it('should have dialog role for accessibility', () => {
      renderAndTrigger()
      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
      expect(dialog).toHaveAttribute('aria-modal', 'true')
    })
  })

  // ==========================================================================
  // Content Tests
  // ==========================================================================

  describe('Content', () => {
    it('should show default confirmation message', () => {
      renderAndTrigger()
      expect(screen.getByText(DEFAULT_CONFIRMATION_CONTENT.message)).toBeInTheDocument()
    })

    it('should show secondary message', () => {
      renderAndTrigger()
      expect(screen.getByText(DEFAULT_CONFIRMATION_CONTENT.secondaryMessage!)).toBeInTheDocument()
    })

    it('should show dismiss instruction', () => {
      renderAndTrigger()
      expect(screen.getByText(DEFAULT_CONFIRMATION_CONTENT.dismissInstruction)).toBeInTheDocument()
    })

    it('should show custom content when provided', () => {
      const customContent: SignalConfirmationContent = {
        ...DEFAULT_CONFIRMATION_CONTENT,
        message: 'Help is coming',
        secondaryMessage: 'Stay safe',
      }
      renderAndTrigger({ content: customContent })
      expect(screen.getByText('Help is coming')).toBeInTheDocument()
      expect(screen.getByText('Stay safe')).toBeInTheDocument()
    })

    it('should show checkmark icon', () => {
      renderAndTrigger()
      expect(screen.getByText('✓')).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // Offline State Tests
  // ==========================================================================

  describe('Offline State', () => {
    it('should show offline message when signal is queued', () => {
      renderAndTrigger({}, true)
      expect(screen.getByText(DEFAULT_CONFIRMATION_CONTENT.offlineMessage)).toBeInTheDocument()
    })

    it('should show offline secondary message', () => {
      renderAndTrigger({}, true)
      expect(
        screen.getByText(DEFAULT_CONFIRMATION_CONTENT.offlineSecondaryMessage!)
      ).toBeInTheDocument()
    })

    it('should not show offline message when online', () => {
      renderAndTrigger({}, false)
      expect(screen.queryByText(DEFAULT_CONFIRMATION_CONTENT.offlineMessage)).not.toBeInTheDocument()
    })

    it('should use isOffline prop as fallback when context isOffline is undefined', () => {
      // When context isOffline is undefined/null, prop should be used
      mockContextValue.isOffline = undefined as any
      const { rerender } = render(<SafetySignalConfirmation isOffline={true} />)
      // Trigger signal with undefined context isOffline
      mockContextValue.signalTriggered = true
      rerender(<SafetySignalConfirmation isOffline={true} />)
      // Component should use prop value as fallback
      expect(screen.getByText(DEFAULT_CONFIRMATION_CONTENT.offlineMessage)).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // Crisis Resources Tests
  // ==========================================================================

  describe('Crisis Resources', () => {
    it('should display all default crisis resources', () => {
      renderAndTrigger()
      for (const resource of DEFAULT_CRISIS_RESOURCES) {
        expect(screen.getByTestId(`crisis-resource-${resource.id}`)).toBeInTheDocument()
      }
    })

    it('should show resource action text', () => {
      renderAndTrigger()
      for (const resource of DEFAULT_CRISIS_RESOURCES) {
        expect(screen.getByText(resource.action)).toBeInTheDocument()
      }
    })

    it('should show resource description', () => {
      renderAndTrigger()
      for (const resource of DEFAULT_CRISIS_RESOURCES) {
        expect(screen.getByText(resource.description)).toBeInTheDocument()
      }
    })

    it('should have correct href for text resources', () => {
      renderAndTrigger()
      const textResource = DEFAULT_CRISIS_RESOURCES.find((r) => r.type === 'text')!
      const link = screen.getByTestId(`crisis-resource-${textResource.id}`)
      expect(link).toHaveAttribute('href', textResource.href)
    })

    it('should have correct href for phone resources', () => {
      renderAndTrigger()
      const phoneResource = DEFAULT_CRISIS_RESOURCES.find((r) => r.type === 'phone')!
      const link = screen.getByTestId(`crisis-resource-${phoneResource.id}`)
      expect(link).toHaveAttribute('href', phoneResource.href)
    })

    it('should open web/chat resources in new tab', () => {
      const webResource: CrisisResource = {
        id: 'test-web',
        type: 'web',
        name: 'Test Web',
        contact: 'https://example.com',
        action: 'Visit website',
        description: 'Web resource',
        priority: 1,
        jurisdictions: null,
        active: true,
      }
      const content: SignalConfirmationContent = {
        ...DEFAULT_CONFIRMATION_CONTENT,
        resources: [webResource],
      }
      renderAndTrigger({ content })
      const link = screen.getByTestId(`crisis-resource-${webResource.id}`)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('should call onResourceClick when resource is clicked', async () => {
      const onResourceClick = vi.fn()
      renderAndTrigger({ onResourceClick })

      const resource = DEFAULT_CRISIS_RESOURCES[0]
      const link = screen.getByTestId(`crisis-resource-${resource.id}`)
      fireEvent.click(link)

      expect(onResourceClick).toHaveBeenCalledWith(resource)
    })
  })

  // ==========================================================================
  // Emergency Button Tests
  // ==========================================================================

  describe('Emergency Call Button', () => {
    it('should display emergency button', () => {
      renderAndTrigger()
      expect(screen.getByTestId('emergency-call-button')).toBeInTheDocument()
    })

    it('should show emergency message', () => {
      renderAndTrigger()
      expect(screen.getByText(DEFAULT_CONFIRMATION_CONTENT.emergencyMessage)).toBeInTheDocument()
    })

    it('should have tel: href for 911', () => {
      renderAndTrigger()
      const button = screen.getByTestId('emergency-call-button')
      expect(button).toHaveAttribute('href', `tel:${DEFAULT_CONFIRMATION_CONTENT.emergencyContact}`)
    })

    it('should show confirmation on desktop before calling', () => {
      mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')
      mockConfirm.mockReturnValue(false)
      renderAndTrigger()

      const button = screen.getByTestId('emergency-call-button')
      fireEvent.click(button)

      expect(mockConfirm).toHaveBeenCalledWith('Call 911?')
    })

    it('should not show confirmation on mobile', () => {
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)')
      renderAndTrigger()

      const button = screen.getByTestId('emergency-call-button')
      fireEvent.click(button)

      expect(mockConfirm).not.toHaveBeenCalled()
    })

    it('should call onEmergencyClick callback', () => {
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)')
      const onEmergencyClick = vi.fn()
      renderAndTrigger({ onEmergencyClick })

      const button = screen.getByTestId('emergency-call-button')
      fireEvent.click(button)

      expect(onEmergencyClick).toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // Dismiss Tests
  // ==========================================================================

  describe('Dismiss Behavior', () => {
    it('should dismiss when backdrop is clicked', () => {
      renderAndTrigger()
      expect(screen.getByTestId('safety-signal-confirmation')).toBeInTheDocument()

      const backdrop = screen.getByTestId('safety-signal-confirmation-backdrop')
      fireEvent.click(backdrop)

      act(() => {
        vi.advanceTimersByTime(SIGNAL_CONFIRMATION_CONSTANTS.FADE_OUT_MS)
      })

      expect(screen.queryByTestId('safety-signal-confirmation')).not.toBeInTheDocument()
    })

    it('should dismiss when ESC key is pressed', () => {
      renderAndTrigger()
      expect(screen.getByTestId('safety-signal-confirmation')).toBeInTheDocument()

      fireEvent.keyDown(document, { key: 'Escape' })

      act(() => {
        vi.advanceTimersByTime(SIGNAL_CONFIRMATION_CONSTANTS.FADE_OUT_MS)
      })

      expect(screen.queryByTestId('safety-signal-confirmation')).not.toBeInTheDocument()
    })

    it('should not dismiss when clicking inside the panel', () => {
      renderAndTrigger()
      const panel = screen.getByTestId('safety-signal-confirmation')
      fireEvent.click(panel)

      act(() => {
        vi.advanceTimersByTime(SIGNAL_CONFIRMATION_CONSTANTS.FADE_OUT_MS)
      })

      expect(screen.getByTestId('safety-signal-confirmation')).toBeInTheDocument()
    })

    it('should call onDismiss callback when dismissed', () => {
      const onDismiss = vi.fn()
      renderAndTrigger({ onDismiss })

      const backdrop = screen.getByTestId('safety-signal-confirmation-backdrop')
      fireEvent.click(backdrop)

      act(() => {
        vi.advanceTimersByTime(SIGNAL_CONFIRMATION_CONSTANTS.FADE_OUT_MS)
      })

      expect(onDismiss).toHaveBeenCalled()
    })

    it('should auto-dismiss after timeout', () => {
      renderAndTrigger()
      expect(screen.getByTestId('safety-signal-confirmation')).toBeInTheDocument()

      // Wait for the dismissTimeout to trigger handleDismiss
      act(() => {
        vi.advanceTimersByTime(DEFAULT_CONFIRMATION_CONTENT.dismissTimeout)
      })

      // Then wait for the fade animation to complete
      act(() => {
        vi.advanceTimersByTime(SIGNAL_CONFIRMATION_CONSTANTS.FADE_OUT_MS)
      })

      expect(screen.queryByTestId('safety-signal-confirmation')).not.toBeInTheDocument()
    })

    it('should prevent early dismissal when user interacts', () => {
      const onResourceClick = vi.fn()
      renderAndTrigger({ onResourceClick })

      // Advance to just before original timeout
      act(() => {
        vi.advanceTimersByTime(DEFAULT_CONFIRMATION_CONTENT.dismissTimeout - 500)
      })
      // Still visible before original timeout
      expect(screen.getByTestId('safety-signal-confirmation')).toBeInTheDocument()

      // Click a resource - this should reset and extend the timeout
      const resource = DEFAULT_CRISIS_RESOURCES[0]
      const link = screen.getByTestId(`crisis-resource-${resource.id}`)
      fireEvent.click(link)
      expect(onResourceClick).toHaveBeenCalled()

      // Advance past when original would have dismissed (500ms remaining + buffer)
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      // Should still be visible because timeout was extended/reset
      expect(screen.getByTestId('safety-signal-confirmation')).toBeInTheDocument()

      // Advance a bit more - still should be visible
      act(() => {
        vi.advanceTimersByTime(5000)
      })
      expect(screen.getByTestId('safety-signal-confirmation')).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // Position Tests
  // ==========================================================================

  describe('Position', () => {
    it('should position at center by default', () => {
      renderAndTrigger()
      const panel = screen.getByTestId('safety-signal-confirmation')
      expect(panel.style.top).toBe('50%')
      expect(panel.style.transform).toContain('translate(-50%, -50%)')
    })

    it('should position at top when specified', () => {
      renderAndTrigger({ position: 'top' })
      const panel = screen.getByTestId('safety-signal-confirmation')
      expect(panel.style.top).toBe('16px')
    })

    it('should position at bottom when specified', () => {
      renderAndTrigger({ position: 'bottom' })
      const panel = screen.getByTestId('safety-signal-confirmation')
      expect(panel.style.bottom).toBe('16px')
    })
  })

  // ==========================================================================
  // Styling Tests
  // ==========================================================================

  describe('Styling', () => {
    it('should apply custom className', () => {
      renderAndTrigger({ className: 'custom-class' })
      const panel = screen.getByTestId('safety-signal-confirmation')
      expect(panel).toHaveClass('custom-class')
    })

    it('should use custom testId', () => {
      renderAndTrigger({ testId: 'custom-test-id' })
      expect(screen.getByTestId('custom-test-id')).toBeInTheDocument()
    })

    it('should have calming background color', () => {
      renderAndTrigger()
      const panel = screen.getByTestId('safety-signal-confirmation')
      // Soft gray, not alarming
      expect(panel.style.backgroundColor).toContain('rgba(55, 65, 81')
    })
  })

  // ==========================================================================
  // Animation Tests
  // ==========================================================================

  describe('Animation', () => {
    it('should fade out when dismissing', () => {
      renderAndTrigger()
      const panel = screen.getByTestId('safety-signal-confirmation')
      const backdrop = screen.getByTestId('safety-signal-confirmation-backdrop')

      expect(panel.style.opacity).toBe('1')
      expect(backdrop.style.opacity).toBe('1')

      fireEvent.click(backdrop)

      expect(panel.style.opacity).toBe('0')
      expect(backdrop.style.opacity).toBe('0')
    })

    it('should start fading before auto-dismiss', () => {
      renderAndTrigger()
      const panel = screen.getByTestId('safety-signal-confirmation')

      // Advance to fade start
      act(() => {
        vi.advanceTimersByTime(
          DEFAULT_CONFIRMATION_CONTENT.dismissTimeout - SIGNAL_CONFIRMATION_CONSTANTS.FADE_OUT_MS
        )
      })

      expect(panel.style.opacity).toBe('0')
    })
  })

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('Accessibility', () => {
    it('should have proper aria-labelledby', () => {
      renderAndTrigger()
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby', 'confirmation-title')
    })

    it('should have a heading for the confirmation', () => {
      renderAndTrigger()
      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toHaveTextContent(DEFAULT_CONFIRMATION_CONTENT.message)
      expect(heading).toHaveAttribute('id', 'confirmation-title')
    })

    it('should have accessible resource links', () => {
      renderAndTrigger()
      for (const resource of DEFAULT_CRISIS_RESOURCES) {
        const link = screen.getByTestId(`crisis-resource-${resource.id}`)
        expect(link.tagName).toBe('A')
        expect(link).toHaveAttribute('href')
      }
    })
  })

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle undefined context gracefully', async () => {
      // Temporarily mock to return null
      const originalMock = mockContextValue.signalTriggered
      mockContextValue.signalTriggered = undefined as any

      const { container } = render(<SafetySignalConfirmation />)
      expect(container.firstChild).toBeNull()

      mockContextValue.signalTriggered = originalMock
    })

    it('should handle empty resources array', () => {
      const content: SignalConfirmationContent = {
        ...DEFAULT_CONFIRMATION_CONTENT,
        resources: [],
      }
      renderAndTrigger({ content })
      expect(screen.getByTestId('safety-signal-confirmation')).toBeInTheDocument()
    })

    it('should clean up event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
      const { unmount } = renderAndTrigger()
      unmount()
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    })

    it('should clean up timeouts on unmount', () => {
      const { unmount } = renderAndTrigger()

      // Unmount before timeout completes
      unmount()

      // Advance timers - should not throw
      act(() => {
        vi.advanceTimersByTime(DEFAULT_CONFIRMATION_CONTENT.dismissTimeout * 2)
      })
    })

    it('should handle rapid signal triggers', () => {
      const { rerender } = render(<SafetySignalConfirmation />)

      // Trigger, reset, trigger quickly
      triggerSignal()
      rerender(<SafetySignalConfirmation />)
      resetContext()
      rerender(<SafetySignalConfirmation />)
      triggerSignal()
      rerender(<SafetySignalConfirmation />)

      expect(screen.getByTestId('safety-signal-confirmation')).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // Integration with SafetySignalProvider
  // ==========================================================================

  describe('Integration with Provider', () => {
    // These tests would require unmocking, which we'll do in a separate test file
    // For now, we just verify the component works with the mocked context
    it('should work with mocked context', () => {
      renderAndTrigger()
      expect(screen.getByTestId('safety-signal-confirmation')).toBeInTheDocument()
    })
  })
})
