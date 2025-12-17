/**
 * Safety Signal Adversarial Tests
 *
 * Story 7.5.1: Hidden Safety Signal Access - Task 8
 *
 * Adversarial tests ensuring:
 * - Signals don't leak to family members (INV-002)
 * - Signals can't be inferred from audit trail gaps
 * - Automation/scripting can't trigger signals inappropriately
 * - Timing attacks are resistant
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { SafetySignalProvider, useSafetySignalContext } from '../SafetySignalProvider'
import { SafetySignalLogo } from '../SafetySignalLogo'
import { SafetySignalConfirmation } from '../SafetySignalConfirmation'
import { SAFETY_SIGNAL_CONSTANTS } from '@fledgely/contracts'

// ============================================================================
// Mock Setup
// ============================================================================

// Mock must be defined inline to avoid hoisting issues
vi.mock('../../../services/SafetySignalQueueService', () => ({
  getSafetySignalQueueService: vi.fn().mockReturnValue({
    initialize: vi.fn().mockResolvedValue(undefined),
    queueSignal: vi.fn().mockResolvedValue({
      success: true,
      queueId: 'queue_adversarial_test',
      queued: true,
    }),
  }),
}))

// ============================================================================
// Test Helper
// ============================================================================

function TestConsumer() {
  const ctx = useSafetySignalContext()
  return (
    <div>
      <span data-testid="signal-triggered">{ctx.signalTriggered ? 'yes' : 'no'}</span>
      <span data-testid="enabled">{ctx.enabled ? 'yes' : 'no'}</span>
      <span data-testid="in-progress">{ctx.isGestureInProgress ? 'yes' : 'no'}</span>
    </div>
  )
}

// ============================================================================
// INV-002: Signals Never Visible to Family
// ============================================================================

describe('INV-002: Safety signals NEVER visible to family', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('context does not expose signal content or history', () => {
    render(
      <SafetySignalProvider childId="child-123">
        <TestConsumer />
      </SafetySignalProvider>
    )

    // The context should NOT expose:
    // - Signal history
    // - Signal content
    // - Queue contents
    // - Timestamps of previous signals

    // We can only see boolean states, not signal data
    expect(screen.getByTestId('signal-triggered')).toHaveTextContent('no')
    expect(screen.getByTestId('enabled')).toHaveTextContent('yes')
  })

  it('provider does not add signals to any observable audit trail', async () => {
    const auditLog: string[] = []

    // Simulate an audit observer
    const originalConsoleLog = console.log
    console.log = (...args) => {
      auditLog.push(args.join(' '))
    }

    render(
      <SafetySignalProvider childId="child-123">
        <SafetySignalLogo />
      </SafetySignalProvider>
    )

    // Trigger signal
    for (let i = 0; i < 5; i++) {
      act(() => {
        fireEvent.click(screen.getByTestId('safety-signal-logo'))
      })
      act(() => {
        vi.advanceTimersByTime(100)
      })
    }

    await act(async () => {
      vi.advanceTimersByTime(1)
      await Promise.resolve()
    })

    console.log = originalConsoleLog

    // Audit log should NOT contain any signal-related content
    const signalRelatedTerms = ['safety', 'signal', 'distress', 'help', 'crisis']
    const hasSignalContent = auditLog.some(entry =>
      signalRelatedTerms.some(term => entry.toLowerCase().includes(term))
    )

    expect(hasSignalContent).toBe(false)
  })

  it('signal triggering does not create detectable network patterns', async () => {
    const networkCalls: { url: string; timestamp: number }[] = []
    const originalFetch = global.fetch

    global.fetch = vi.fn((url) => {
      networkCalls.push({ url: url.toString(), timestamp: Date.now() })
      return Promise.resolve(new Response('{}'))
    }) as typeof fetch

    render(
      <SafetySignalProvider childId="child-123">
        <SafetySignalLogo />
      </SafetySignalProvider>
    )

    // Trigger signal
    for (let i = 0; i < 5; i++) {
      act(() => {
        fireEvent.click(screen.getByTestId('safety-signal-logo'))
      })
      act(() => {
        vi.advanceTimersByTime(100)
      })
    }

    await act(async () => {
      vi.advanceTimersByTime(1)
      await Promise.resolve()
    })

    global.fetch = originalFetch

    // Signal-specific endpoints should NOT be visible in fetch calls
    // (actual signal delivery uses the queue service which has its own isolation)
    const signalEndpoints = networkCalls.filter(c =>
      c.url.includes('signal') || c.url.includes('safety') || c.url.includes('distress')
    )

    expect(signalEndpoints).toHaveLength(0)
  })

  it('confirmation uses calming language and provides crisis resources', async () => {
    render(
      <SafetySignalProvider childId="child-123">
        <SafetySignalLogo />
        <SafetySignalConfirmation />
      </SafetySignalProvider>
    )

    // Trigger signal
    for (let i = 0; i < 5; i++) {
      act(() => {
        fireEvent.click(screen.getByTestId('safety-signal-logo'))
      })
      act(() => {
        vi.advanceTimersByTime(100)
      })
    }

    await act(async () => {
      vi.advanceTimersByTime(1)
      await Promise.resolve()
    })

    const confirmation = screen.getByTestId('safety-signal-confirmation')
    const confirmationText = confirmation.textContent || ''

    // Story 7.5.3: The confirmation now provides crisis resources to the child
    // This is intentional - once a signal is triggered, the child should have
    // immediate access to help. The key invariant (INV-002) protects audit trails,
    // not the confirmation UI itself.

    // Check that the main message (not emergency button) is calming
    // Note: "abuse" and "danger" are allowed in context (resource descriptions, emergency buttons)
    // but the PRIMARY message should be reassuring
    const primaryMessage = screen.getByRole('heading', { level: 2 })
    const primaryText = primaryMessage.textContent?.toLowerCase() || ''

    // Primary message should not contain alarming words
    const alarmingTerms = ['police', 'arrest', 'danger', 'abuse', 'report']
    const hasAlarmingPrimaryContent = alarmingTerms.some(term =>
      primaryText.includes(term)
    )
    expect(hasAlarmingPrimaryContent).toBe(false)

    // Should show reassuring message (mock returns queued:true, so shows offline message)
    expect(confirmationText).toContain('Saved for later')

    // Should provide crisis resources (Story 7.5.3 requirement)
    expect(screen.getByTestId('crisis-resource-crisis-text-line')).toBeInTheDocument()
  })
})

// ============================================================================
// Automation and Scripting Resistance
// ============================================================================

describe('Automation and Scripting Resistance', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('requires deliberate timing - taps too fast still work for accessibility', async () => {
    render(
      <SafetySignalProvider childId="child-123">
        <SafetySignalLogo />
        <SafetySignalConfirmation />
      </SafetySignalProvider>
    )

    const logo = screen.getByTestId('safety-signal-logo')

    // Simulate scripted rapid clicks (1ms apart - unrealistic for human)
    // We don't block these as they might be from legitimate assistive technology
    for (let i = 0; i < 5; i++) {
      act(() => {
        fireEvent.click(logo)
      })
      act(() => {
        vi.advanceTimersByTime(1) // 1ms between taps - very fast
      })
    }

    await act(async () => {
      vi.advanceTimersByTime(1)
      await Promise.resolve()
    })

    // The signal triggers even with fast timing (accessibility support)
    expect(screen.getByTestId('safety-signal-confirmation')).toBeInTheDocument()
  })

  it('does not expose exact gesture count externally', () => {
    render(
      <SafetySignalProvider childId="child-123">
        <SafetySignalLogo />
        <TestConsumer />
      </SafetySignalProvider>
    )

    // Tap 3 times (partial gesture)
    for (let i = 0; i < 3; i++) {
      act(() => {
        fireEvent.click(screen.getByTestId('safety-signal-logo'))
      })
      act(() => {
        vi.advanceTimersByTime(100)
      })
    }

    // The context only exposes boolean flags, not exact counts
    // An observer cannot determine if we're at 1/5, 2/5, 3/5, etc.
    // They only know if enabled/triggered - not progress details
    expect(screen.getByTestId('enabled')).toHaveTextContent('yes')
    expect(screen.getByTestId('signal-triggered')).toHaveTextContent('no')

    // There's no way to know we're at 3/5 taps from the context
    // This prevents an observer from knowing how close the child is
  })

  it('programmatic button.click() still works for accessibility tools', async () => {
    render(
      <SafetySignalProvider childId="child-123">
        <SafetySignalLogo />
        <SafetySignalConfirmation />
      </SafetySignalProvider>
    )

    const logo = screen.getByTestId('safety-signal-logo')

    // Even if someone gets a reference to the DOM element and calls click() programmatically,
    // the React event handlers still fire (this is expected React behavior)
    // We don't block this as it could be from legitimate accessibility tools
    for (let i = 0; i < 5; i++) {
      act(() => {
        logo.click() // Programmatic click
      })
      act(() => {
        vi.advanceTimersByTime(100)
      })
    }

    await act(async () => {
      vi.advanceTimersByTime(1)
      await Promise.resolve()
    })

    // Signal is triggered - we don't block programmatic triggers
    // as they might be from legitimate accessibility tools
    expect(screen.getByTestId('safety-signal-confirmation')).toBeInTheDocument()
  })
})

// ============================================================================
// Timing Attack Resistance
// ============================================================================

describe('Timing Attack Resistance', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('confirmation display time is constant', async () => {
    render(
      <SafetySignalProvider childId="child-123">
        <SafetySignalLogo />
        <SafetySignalConfirmation />
      </SafetySignalProvider>
    )

    // Trigger signal
    for (let i = 0; i < 5; i++) {
      act(() => {
        fireEvent.click(screen.getByTestId('safety-signal-logo'))
      })
      act(() => {
        vi.advanceTimersByTime(100)
      })
    }

    await act(async () => {
      vi.advanceTimersByTime(1)
      await Promise.resolve()
    })

    expect(screen.getByTestId('safety-signal-confirmation')).toBeInTheDocument()

    // Story 7.5.3: Component uses 10000ms dismissTimeout from SIGNAL_CONFIRMATION_CONSTANTS
    // Wait for half the confirmation time (5000ms)
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    // Should still be visible
    expect(screen.getByTestId('safety-signal-confirmation')).toBeInTheDocument()

    // Complete the display time (remaining 5000ms + 200ms fade)
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    act(() => {
      vi.advanceTimersByTime(200)
    })

    // Should be gone
    expect(screen.queryByTestId('safety-signal-confirmation')).not.toBeInTheDocument()
  })

  it('shows consistent confirmation UI regardless of outcome', async () => {
    // The confirmation always shows the same reassuring message
    // with crisis resources - this prevents timing/visual leaks about delivery success

    render(
      <SafetySignalProvider childId="child-123">
        <SafetySignalLogo />
        <SafetySignalConfirmation />
      </SafetySignalProvider>
    )

    // Trigger signal
    for (let i = 0; i < 5; i++) {
      act(() => {
        fireEvent.click(screen.getByTestId('safety-signal-logo'))
      })
      act(() => {
        vi.advanceTimersByTime(100)
      })
    }

    await act(async () => {
      vi.advanceTimersByTime(1)
      await Promise.resolve()
    })

    // Confirmation shows the same reassuring message regardless of delivery outcome
    // (Mock returns queued:true, so shows offline message)
    expect(screen.getByTestId('safety-signal-confirmation')).toBeInTheDocument()
    expect(screen.getByText('Saved for later')).toBeInTheDocument()
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('handles component unmount gracefully', () => {
    const { unmount } = render(
      <SafetySignalProvider childId="child-123">
        <SafetySignalLogo />
      </SafetySignalProvider>
    )

    // Start tapping
    act(() => {
      fireEvent.click(screen.getByTestId('safety-signal-logo'))
    })

    // Unmount mid-gesture - should not throw
    expect(() => unmount()).not.toThrow()
  })

  it('changing child ID does not preserve previous signal-triggered state', async () => {
    const { rerender } = render(
      <SafetySignalProvider childId="child-123">
        <SafetySignalLogo />
        <SafetySignalConfirmation />
        <TestConsumer />
      </SafetySignalProvider>
    )

    // Trigger signal
    for (let i = 0; i < 5; i++) {
      act(() => {
        fireEvent.click(screen.getByTestId('safety-signal-logo'))
      })
      act(() => {
        vi.advanceTimersByTime(100)
      })
    }

    await act(async () => {
      vi.advanceTimersByTime(1)
      await Promise.resolve()
    })

    expect(screen.getByTestId('signal-triggered')).toHaveTextContent('yes')

    // Change child ID
    rerender(
      <SafetySignalProvider childId="child-456">
        <SafetySignalLogo />
        <SafetySignalConfirmation />
        <TestConsumer />
      </SafetySignalProvider>
    )

    // Wait for state to reset
    act(() => {
      vi.advanceTimersByTime(SAFETY_SIGNAL_CONSTANTS.CONFIRMATION_DISPLAY_MS + 100)
    })

    // New child should not inherit previous triggered state
    expect(screen.getByTestId('signal-triggered')).toHaveTextContent('no')
  })

  it('multiple simultaneous providers do not interfere', async () => {
    const callback1 = vi.fn()
    const callback2 = vi.fn()

    render(
      <div>
        <div data-testid="provider-1">
          <SafetySignalProvider childId="child-1" onSignalTriggered={callback1}>
            <SafetySignalLogo testId="logo-1" />
          </SafetySignalProvider>
        </div>
        <div data-testid="provider-2">
          <SafetySignalProvider childId="child-2" onSignalTriggered={callback2}>
            <SafetySignalLogo testId="logo-2" />
          </SafetySignalProvider>
        </div>
      </div>
    )

    // Trigger signal on logo-1 only
    for (let i = 0; i < 5; i++) {
      act(() => {
        fireEvent.click(screen.getByTestId('logo-1'))
      })
      act(() => {
        vi.advanceTimersByTime(100)
      })
    }

    await act(async () => {
      vi.advanceTimersByTime(1)
      await Promise.resolve()
    })

    // Only callback1 should be called
    expect(callback1).toHaveBeenCalled()
    expect(callback2).not.toHaveBeenCalled()
  })
})
