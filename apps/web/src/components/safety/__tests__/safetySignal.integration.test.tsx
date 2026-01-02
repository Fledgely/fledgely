/**
 * Safety Signal Integration Tests - Story 7.5.1 Task 8
 *
 * Integration tests for the complete safety signal flow.
 *
 * AC1: Hidden gesture/code available (logo tap, keyboard shortcut)
 * AC2: No visible UI change
 * AC3: Works offline
 * AC4: Cannot be accidentally triggered
 * AC5: Consistent across platforms
 * AC6: Signal queuing infrastructure
 *
 * CRITICAL: These tests verify that safety signals work correctly
 * while maintaining invisibility from potential abusers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import React, { useRef, useState, useCallback } from 'react'
import SafetySignalGestureDetector from '../SafetySignalGestureDetector'
import { CrisisAllowlistView } from '../../crisis/CrisisAllowlistView'
import {
  createSafetySignalWithQueue,
  queueOfflineSignal,
  processOfflineQueue,
  getPendingSignals,
  clearAllSignalData,
  SignalStatus,
  TriggerMethod,
  Platform,
  LOGO_TAP_WINDOW_MS,
} from '@fledgely/shared'

// Mock navigator.onLine
const mockOnLine = vi.fn(() => true)
Object.defineProperty(navigator, 'onLine', {
  get: mockOnLine,
  configurable: true,
})

/**
 * Test wrapper component that integrates SafetySignalGestureDetector
 * with actual signal creation.
 */
function IntegratedSignalWrapper({
  childId = 'child-123',
  familyId = 'family-456',
  isOnline = true,
}: {
  childId?: string
  familyId?: string
  isOnline?: boolean
}) {
  const logoRef = useRef<HTMLDivElement>(null)
  const [signalCount, setSignalCount] = useState(0)
  const [lastTriggeredMethod, setLastTriggeredMethod] = useState<TriggerMethod | null>(null)

  const handleSignalTriggered = useCallback(
    (method: TriggerMethod) => {
      // Create actual signal using the service
      createSafetySignalWithQueue(childId, familyId, method, 'web' as Platform, !isOnline)
      setSignalCount((c) => c + 1)
      setLastTriggeredMethod(method)
    },
    [childId, familyId, isOnline]
  )

  return (
    <SafetySignalGestureDetector logoRef={logoRef} onSignalTriggered={handleSignalTriggered}>
      <div data-testid="app-container">
        <div ref={logoRef} data-testid="logo" role="img" aria-label="Fledgely logo">
          Logo
        </div>
        <div data-testid="content">Regular content here</div>
        {/* These are for test assertions only - NOT visible in production */}
        <span data-testid="signal-count" hidden>
          {signalCount}
        </span>
        <span data-testid="last-method" hidden>
          {lastTriggeredMethod}
        </span>
      </div>
    </SafetySignalGestureDetector>
  )
}

describe('Safety Signal Integration Tests - Story 7.5.1', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.clearAllMocks()
    mockOnLine.mockReturnValue(true)
    clearAllSignalData()
  })

  afterEach(() => {
    vi.useRealTimers()
    clearAllSignalData()
  })

  // ============================================
  // Logo Tap Gesture Integration (AC1, AC4)
  // ============================================

  describe('logo tap gesture integration (AC1, AC4)', () => {
    it('should trigger signal creation after 5 rapid logo taps', async () => {
      render(<IntegratedSignalWrapper />)

      const logo = screen.getByTestId('logo')

      // Perform 5 rapid taps
      for (let i = 0; i < 5; i++) {
        fireEvent.click(logo)
      }

      await waitFor(() => {
        expect(screen.getByTestId('signal-count').textContent).toBe('1')
      })

      expect(screen.getByTestId('last-method').textContent).toBe('logo_tap')
    })

    it('should NOT trigger signal after only 4 taps (AC4)', async () => {
      render(<IntegratedSignalWrapper />)

      const logo = screen.getByTestId('logo')

      // Only 4 taps - should NOT trigger
      for (let i = 0; i < 4; i++) {
        fireEvent.click(logo)
      }

      // Wait a bit to ensure no trigger
      await act(async () => {
        vi.advanceTimersByTime(500)
      })

      expect(screen.getByTestId('signal-count').textContent).toBe('0')
    })

    it('should require taps within time window (AC4)', async () => {
      render(<IntegratedSignalWrapper />)

      const logo = screen.getByTestId('logo')

      // First 3 taps
      for (let i = 0; i < 3; i++) {
        fireEvent.click(logo)
      }

      // Wait for window to expire
      await act(async () => {
        vi.advanceTimersByTime(LOGO_TAP_WINDOW_MS + 100)
      })

      // Another 2 taps - should NOT trigger since window reset
      for (let i = 0; i < 2; i++) {
        fireEvent.click(logo)
      }

      expect(screen.getByTestId('signal-count').textContent).toBe('0')
    })

    it('should create signal with correct metadata after tap gesture', async () => {
      const childId = 'test-child-789'
      const familyId = 'test-family-101'

      render(<IntegratedSignalWrapper childId={childId} familyId={familyId} />)

      const logo = screen.getByTestId('logo')

      // Trigger gesture
      for (let i = 0; i < 5; i++) {
        fireEvent.click(logo)
      }

      await waitFor(() => {
        expect(screen.getByTestId('signal-count').textContent).toBe('1')
      })

      // Verify signal was created with correct data
      const pendingSignals = getPendingSignals(childId)
      expect(pendingSignals).toHaveLength(1)
      expect(pendingSignals[0]).toMatchObject({
        childId,
        familyId,
        status: 'pending' as SignalStatus,
      })
    })
  })

  // ============================================
  // Keyboard Shortcut Integration (AC1, AC4, AC5)
  // ============================================

  describe('keyboard shortcut integration (AC1, AC4, AC5)', () => {
    it('should trigger signal creation with Ctrl+Shift+H', async () => {
      render(<IntegratedSignalWrapper />)

      // Trigger keyboard shortcut
      fireEvent.keyDown(document, {
        key: 'h',
        ctrlKey: true,
        shiftKey: true,
      })

      await waitFor(() => {
        expect(screen.getByTestId('signal-count').textContent).toBe('1')
      })

      expect(screen.getByTestId('last-method').textContent).toBe('keyboard_shortcut')
    })

    it('should NOT trigger with Ctrl+H only (AC4)', async () => {
      render(<IntegratedSignalWrapper />)

      fireEvent.keyDown(document, {
        key: 'h',
        ctrlKey: true,
        shiftKey: false,
      })

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      expect(screen.getByTestId('signal-count').textContent).toBe('0')
    })

    it('should NOT trigger with Shift+H only (AC4)', async () => {
      render(<IntegratedSignalWrapper />)

      fireEvent.keyDown(document, {
        key: 'h',
        ctrlKey: false,
        shiftKey: true,
      })

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      expect(screen.getByTestId('signal-count').textContent).toBe('0')
    })

    it('should NOT trigger with Meta+Shift+H (wrong modifier) (AC4)', async () => {
      render(<IntegratedSignalWrapper />)

      fireEvent.keyDown(document, {
        key: 'h',
        metaKey: true,
        shiftKey: true,
      })

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      expect(screen.getByTestId('signal-count').textContent).toBe('0')
    })

    it('should handle uppercase H key', async () => {
      render(<IntegratedSignalWrapper />)

      fireEvent.keyDown(document, {
        key: 'H',
        ctrlKey: true,
        shiftKey: true,
      })

      await waitFor(() => {
        expect(screen.getByTestId('signal-count').textContent).toBe('1')
      })
    })
  })

  // ============================================
  // No Visible UI Change (AC2)
  // ============================================

  describe('no visible UI change (AC2)', () => {
    it('should NOT change any visible DOM element on trigger', async () => {
      render(<IntegratedSignalWrapper />)

      const logo = screen.getByTestId('logo')

      // Trigger gesture
      for (let i = 0; i < 5; i++) {
        fireEvent.click(logo)
      }

      await waitFor(() => {
        expect(screen.getByTestId('signal-count').textContent).toBe('1')
      })

      // The visible content should NOT change (only hidden test elements change)
      const content = screen.getByTestId('content')
      expect(content.textContent).toBe('Regular content here')

      // Logo should still be visible and unchanged
      expect(screen.getByTestId('logo')).toBeInTheDocument()
      expect(screen.getByTestId('logo').textContent).toBe('Logo')
    })

    it('should NOT show any success/error messages after trigger', async () => {
      render(<IntegratedSignalWrapper />)

      const logo = screen.getByTestId('logo')

      // Trigger gesture
      for (let i = 0; i < 5; i++) {
        fireEvent.click(logo)
      }

      await waitFor(() => {
        expect(screen.getByTestId('signal-count').textContent).toBe('1')
      })

      // Check for common feedback patterns that should NOT exist
      expect(screen.queryByText(/success/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/sent/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/help.*on.*way/i)).not.toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    it('should NOT show loading indicators during signal creation', async () => {
      render(<IntegratedSignalWrapper />)

      const logo = screen.getByTestId('logo')

      // Trigger gesture
      for (let i = 0; i < 5; i++) {
        fireEvent.click(logo)
      }

      // Check for loading indicators that should NOT exist
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/sending/i)).not.toBeInTheDocument()
    })
  })

  // ============================================
  // Offline Signal Queuing (AC3)
  // ============================================

  describe('offline signal queuing (AC3)', () => {
    it('should queue signal when offline', async () => {
      const childId = 'offline-child-123'

      render(<IntegratedSignalWrapper childId={childId} isOnline={false} />)

      const logo = screen.getByTestId('logo')

      // Trigger gesture while offline
      for (let i = 0; i < 5; i++) {
        fireEvent.click(logo)
      }

      await waitFor(() => {
        expect(screen.getByTestId('signal-count').textContent).toBe('1')
      })

      // Signal should be queued (offlineQueued = true)
      const signals = getPendingSignals(childId)
      expect(signals).toHaveLength(1)
      expect(signals[0]?.offlineQueued).toBe(true)
    })

    it('should create signal immediately when online', async () => {
      const childId = 'online-child-456'

      render(<IntegratedSignalWrapper childId={childId} isOnline={true} />)

      const logo = screen.getByTestId('logo')

      // Trigger gesture while online
      for (let i = 0; i < 5; i++) {
        fireEvent.click(logo)
      }

      await waitFor(() => {
        expect(screen.getByTestId('signal-count').textContent).toBe('1')
      })

      // Signal should NOT be queued (offlineQueued = false)
      const signals = getPendingSignals(childId)
      expect(signals).toHaveLength(1)
      expect(signals[0]?.offlineQueued).toBe(false)
    })

    it('should process offline queue when connectivity restored', async () => {
      const childId = 'queue-child-789'

      // Create offline signal directly
      const offlineSignal = createSafetySignalWithQueue(
        childId,
        'family-123',
        'logo_tap' as TriggerMethod,
        'web' as Platform,
        true
      )

      expect(offlineSignal.offlineQueued).toBe(true)

      // Queue it
      queueOfflineSignal(offlineSignal)

      // Process queue (simulates reconnection)
      const processed = processOfflineQueue(childId)

      expect(processed).toHaveLength(1)
      expect(processed[0]?.id).toBe(offlineSignal.id)
    })
  })

  // ============================================
  // Multiple Trigger Methods (AC5)
  // ============================================

  describe('multiple trigger methods (AC5)', () => {
    it('should support both logo tap and keyboard shortcut in same session', async () => {
      render(<IntegratedSignalWrapper />)

      const logo = screen.getByTestId('logo')

      // First: logo tap
      for (let i = 0; i < 5; i++) {
        fireEvent.click(logo)
      }

      await waitFor(() => {
        expect(screen.getByTestId('signal-count').textContent).toBe('1')
      })

      expect(screen.getByTestId('last-method').textContent).toBe('logo_tap')

      // Wait for debounce
      await act(async () => {
        vi.advanceTimersByTime(6000)
      })

      // Second: keyboard shortcut
      fireEvent.keyDown(document, {
        key: 'h',
        ctrlKey: true,
        shiftKey: true,
      })

      await waitFor(() => {
        expect(screen.getByTestId('signal-count').textContent).toBe('2')
      })

      expect(screen.getByTestId('last-method').textContent).toBe('keyboard_shortcut')
    })

    it('should debounce rapid triggers from different methods', async () => {
      render(<IntegratedSignalWrapper />)

      const logo = screen.getByTestId('logo')

      // Logo tap trigger
      for (let i = 0; i < 5; i++) {
        fireEvent.click(logo)
      }

      await waitFor(() => {
        expect(screen.getByTestId('signal-count').textContent).toBe('1')
      })

      // Immediately try keyboard shortcut - should be debounced
      fireEvent.keyDown(document, {
        key: 'h',
        ctrlKey: true,
        shiftKey: true,
      })

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      // Still only 1 signal
      expect(screen.getByTestId('signal-count').textContent).toBe('1')
    })
  })

  // ============================================
  // Signal Documentation in Protected View (AC1)
  // ============================================

  describe('signal documentation in protected resources view (AC1)', () => {
    it('should display secret help button section in CrisisAllowlistView', () => {
      render(<CrisisAllowlistView />)

      expect(screen.getByRole('heading', { name: 'Secret Help Button' })).toBeInTheDocument()
    })

    it('should display logo tap instructions', () => {
      render(<CrisisAllowlistView />)

      expect(
        screen.getByText(/tap the fledgely logo 5 times quickly to send a silent help signal/i)
      ).toBeInTheDocument()
    })

    it('should display keyboard shortcut instructions', () => {
      render(<CrisisAllowlistView />)

      expect(screen.getByText(/press ctrl\+shift\+h on your keyboard/i)).toBeInTheDocument()
    })

    it('should display reassurance message about invisibility', () => {
      render(<CrisisAllowlistView />)

      expect(
        screen.getByText(/no one will see that you did this\. help will reach out to you\./i)
      ).toBeInTheDocument()
    })

    it('should display secret help section before privacy banner', () => {
      render(<CrisisAllowlistView />)

      const secretSection = screen.getByTestId('secret-help-section')
      const privacyRegion = screen.getByRole('region', { name: /always private/i })

      // Secret help should come before privacy banner in DOM order
      expect(
        secretSection.compareDocumentPosition(privacyRegion) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy()
    })
  })

  // ============================================
  // Signal Data Isolation (AC6)
  // ============================================

  describe('signal data isolation (AC6)', () => {
    it('should store signal with required metadata', async () => {
      const childId = 'iso-child-123'
      const familyId = 'iso-family-456'

      render(<IntegratedSignalWrapper childId={childId} familyId={familyId} />)

      const logo = screen.getByTestId('logo')

      for (let i = 0; i < 5; i++) {
        fireEvent.click(logo)
      }

      await waitFor(() => {
        expect(screen.getByTestId('signal-count').textContent).toBe('1')
      })

      const signals = getPendingSignals(childId)
      expect(signals).toHaveLength(1)

      const signal = signals[0]
      expect(signal).toBeDefined()
      expect(signal?.childId).toBe(childId)
      expect(signal?.familyId).toBe(familyId)
      expect(signal?.triggeredAt).toBeInstanceOf(Date)
      expect(signal?.status).toBe('pending')
      expect(signal?.id).toBeDefined()
    })

    it('should NOT include parent-identifying data in signal', async () => {
      const childId = 'noparent-child'

      render(<IntegratedSignalWrapper childId={childId} />)

      const logo = screen.getByTestId('logo')

      for (let i = 0; i < 5; i++) {
        fireEvent.click(logo)
      }

      await waitFor(() => {
        expect(screen.getByTestId('signal-count').textContent).toBe('1')
      })

      const signals = getPendingSignals(childId)
      const signal = signals[0]

      // Verify NO parent data
      expect(signal).not.toHaveProperty('parentId')
      expect(signal).not.toHaveProperty('parentEmail')
      expect(signal).not.toHaveProperty('parentPhone')
      expect(signal).not.toHaveProperty('parentName')
    })

    it('should be retrievable only by childId', async () => {
      const childId = 'retrieval-child'
      const otherChildId = 'other-child'

      render(<IntegratedSignalWrapper childId={childId} />)

      const logo = screen.getByTestId('logo')

      for (let i = 0; i < 5; i++) {
        fireEvent.click(logo)
      }

      await waitFor(() => {
        expect(screen.getByTestId('signal-count').textContent).toBe('1')
      })

      // Child can retrieve their signals
      const childSignals = getPendingSignals(childId)
      expect(childSignals).toHaveLength(1)

      // Other child cannot see these signals
      const otherSignals = getPendingSignals(otherChildId)
      expect(otherSignals).toHaveLength(0)
    })
  })

  // ============================================
  // Error Handling (Robustness)
  // ============================================

  describe('error handling', () => {
    it('should handle trigger errors silently without UI feedback', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<IntegratedSignalWrapper />)

      const logo = screen.getByTestId('logo')

      // Trigger gesture
      for (let i = 0; i < 5; i++) {
        fireEvent.click(logo)
      }

      await waitFor(() => {
        expect(screen.getByTestId('signal-count').textContent).toBe('1')
      })

      // No error toast/message should appear
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument()

      consoleSpy.mockRestore()
    })
  })

  // ============================================
  // Accessibility (WCAG 2.1 AA)
  // ============================================

  describe('accessibility', () => {
    it('should not interfere with normal keyboard navigation', async () => {
      render(<IntegratedSignalWrapper />)

      // Regular tab navigation should work
      fireEvent.keyDown(document, { key: 'Tab' })
      fireEvent.keyDown(document, { key: 'Tab' })

      // Signal should NOT be triggered by tab
      expect(screen.getByTestId('signal-count').textContent).toBe('0')
    })

    it('should not trigger on single modifier keys', async () => {
      render(<IntegratedSignalWrapper />)

      // Just Ctrl
      fireEvent.keyDown(document, { key: 'Control', ctrlKey: true })
      // Just Shift
      fireEvent.keyDown(document, { key: 'Shift', shiftKey: true })
      // Ctrl+Shift without H
      fireEvent.keyDown(document, { key: 'Shift', ctrlKey: true, shiftKey: true })

      expect(screen.getByTestId('signal-count').textContent).toBe('0')
    })
  })
})
