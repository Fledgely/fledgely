/**
 * Safety Signal Components Tests
 *
 * Story 7.5.1: Hidden Safety Signal Access - Task 4
 *
 * Tests for SafetySignalProvider, SafetySignalLogo, and SafetySignalConfirmation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { SafetySignalProvider, useSafetySignalContext } from '../SafetySignalProvider'
import { SafetySignalLogo } from '../SafetySignalLogo'
import { SafetySignalConfirmation } from '../SafetySignalConfirmation'
import { SAFETY_SIGNAL_CONSTANTS, DEFAULT_GESTURE_CONFIG } from '@fledgely/contracts'
import type { TriggerSafetySignalResponse } from '@fledgely/contracts'

// ============================================================================
// Mocks
// ============================================================================

// Mock the SafetySignalQueueService
vi.mock('../../../services/SafetySignalQueueService', () => ({
  getSafetySignalQueueService: vi.fn().mockReturnValue({
    initialize: vi.fn().mockResolvedValue(undefined),
    queueSignal: vi.fn().mockResolvedValue({
      success: true,
      queueId: 'queue_123_test',
      queued: true,
    }),
  }),
}))

// ============================================================================
// Test Components
// ============================================================================

function TestConsumer() {
  const { onLogoTap, signalTriggered, enabled } = useSafetySignalContext()
  return (
    <div>
      <button onClick={onLogoTap} data-testid="tap-button">
        Tap
      </button>
      <span data-testid="signal-triggered">{signalTriggered ? 'yes' : 'no'}</span>
      <span data-testid="enabled">{enabled ? 'yes' : 'no'}</span>
    </div>
  )
}

// ============================================================================
// SafetySignalProvider Tests
// ============================================================================

describe('SafetySignalProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('provides context to children', () => {
    render(
      <SafetySignalProvider childId="child-123">
        <TestConsumer />
      </SafetySignalProvider>
    )

    expect(screen.getByTestId('enabled')).toHaveTextContent('yes')
  })

  it('provides onLogoTap function', () => {
    render(
      <SafetySignalProvider childId="child-123">
        <TestConsumer />
      </SafetySignalProvider>
    )

    const button = screen.getByTestId('tap-button')
    expect(button).toBeInTheDocument()

    // Should not throw when clicking
    act(() => {
      fireEvent.click(button)
    })
  })

  it('tracks tap gestures', async () => {
    render(
      <SafetySignalProvider childId="child-123">
        <TestConsumer />
      </SafetySignalProvider>
    )

    const button = screen.getByTestId('tap-button')

    // Tap 5 times to trigger signal
    for (let i = 0; i < 5; i++) {
      act(() => {
        fireEvent.click(button)
      })
      act(() => {
        vi.advanceTimersByTime(100)
      })
    }

    // Allow signal processing
    await act(async () => {
      vi.advanceTimersByTime(1)
      await Promise.resolve()
    })

    // Signal should be triggered
    expect(screen.getByTestId('signal-triggered')).toHaveTextContent('yes')
  })

  it('respects enabled prop', () => {
    render(
      <SafetySignalProvider childId="child-123" enabled={false}>
        <TestConsumer />
      </SafetySignalProvider>
    )

    expect(screen.getByTestId('enabled')).toHaveTextContent('no')
  })

  it('calls onSignalTriggered callback', async () => {
    const onSignalTriggered = vi.fn()

    render(
      <SafetySignalProvider childId="child-123" onSignalTriggered={onSignalTriggered}>
        <TestConsumer />
      </SafetySignalProvider>
    )

    const button = screen.getByTestId('tap-button')

    // Trigger signal
    for (let i = 0; i < 5; i++) {
      act(() => {
        fireEvent.click(button)
      })
      act(() => {
        vi.advanceTimersByTime(100)
      })
    }

    await act(async () => {
      vi.advanceTimersByTime(1)
      await Promise.resolve()
    })

    expect(onSignalTriggered).toHaveBeenCalled()
  })

  it('throws when useSafetySignalContext used outside provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<TestConsumer />)).toThrow(
      'useSafetySignalContext must be used within a SafetySignalProvider'
    )

    consoleError.mockRestore()
  })
})

// ============================================================================
// SafetySignalLogo Tests
// ============================================================================

describe('SafetySignalLogo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('renders children', () => {
    render(
      <SafetySignalProvider childId="child-123">
        <SafetySignalLogo>
          <span data-testid="logo-content">Logo</span>
        </SafetySignalLogo>
      </SafetySignalProvider>
    )

    expect(screen.getByTestId('logo-content')).toBeInTheDocument()
  })

  it('renders default logo when no children', () => {
    render(
      <SafetySignalProvider childId="child-123">
        <SafetySignalLogo />
      </SafetySignalProvider>
    )

    expect(screen.getByText('Fledgely')).toBeInTheDocument()
  })

  it('renders as button by default', () => {
    render(
      <SafetySignalProvider childId="child-123">
        <SafetySignalLogo />
      </SafetySignalProvider>
    )

    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('renders as div when asButton=false', () => {
    render(
      <SafetySignalProvider childId="child-123">
        <SafetySignalLogo asButton={false} />
      </SafetySignalProvider>
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('registers taps with safety signal', async () => {
    const onSignalTriggered = vi.fn()

    render(
      <SafetySignalProvider childId="child-123" onSignalTriggered={onSignalTriggered}>
        <SafetySignalLogo />
      </SafetySignalProvider>
    )

    const logo = screen.getByTestId('safety-signal-logo')

    // Tap 5 times
    for (let i = 0; i < 5; i++) {
      act(() => {
        fireEvent.click(logo)
      })
      act(() => {
        vi.advanceTimersByTime(100)
      })
    }

    await act(async () => {
      vi.advanceTimersByTime(1)
      await Promise.resolve()
    })

    expect(onSignalTriggered).toHaveBeenCalled()
  })

  it('calls custom onClick handler', () => {
    const onClick = vi.fn()

    render(
      <SafetySignalProvider childId="child-123">
        <SafetySignalLogo onClick={onClick} />
      </SafetySignalProvider>
    )

    fireEvent.click(screen.getByTestId('safety-signal-logo'))

    expect(onClick).toHaveBeenCalled()
  })

  it('works outside provider (graceful degradation)', () => {
    const onClick = vi.fn()

    render(<SafetySignalLogo onClick={onClick} />)

    // Should not throw
    fireEvent.click(screen.getByTestId('safety-signal-logo'))

    expect(onClick).toHaveBeenCalled()
  })

  it('applies custom className', () => {
    render(
      <SafetySignalProvider childId="child-123">
        <SafetySignalLogo className="custom-class" />
      </SafetySignalProvider>
    )

    expect(screen.getByTestId('safety-signal-logo')).toHaveClass('custom-class')
  })
})

// ============================================================================
// SafetySignalConfirmation Tests
// ============================================================================

describe('SafetySignalConfirmation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('is hidden by default', () => {
    render(
      <SafetySignalProvider childId="child-123">
        <SafetySignalConfirmation />
      </SafetySignalProvider>
    )

    expect(screen.queryByTestId('safety-signal-confirmation')).not.toBeInTheDocument()
  })

  it('shows when signal is triggered', async () => {
    render(
      <SafetySignalProvider childId="child-123">
        <SafetySignalLogo />
        <SafetySignalConfirmation />
      </SafetySignalProvider>
    )

    const logo = screen.getByTestId('safety-signal-logo')

    // Trigger signal
    for (let i = 0; i < 5; i++) {
      act(() => {
        fireEvent.click(logo)
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
  })

  it('displays custom message', async () => {
    render(
      <SafetySignalProvider childId="child-123">
        <SafetySignalLogo />
        <SafetySignalConfirmation message="Done" />
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

    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('hides after confirmation display time', async () => {
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

    // Advance past confirmation display time
    act(() => {
      vi.advanceTimersByTime(SAFETY_SIGNAL_CONSTANTS.CONFIRMATION_DISPLAY_MS + 100)
    })

    expect(screen.queryByTestId('safety-signal-confirmation')).not.toBeInTheDocument()
  })

  it('has accessible role', async () => {
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
    expect(confirmation).toHaveAttribute('role', 'status')
    expect(confirmation).toHaveAttribute('aria-live', 'polite')
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('Safety Signal Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('full flow: tap logo 5x triggers signal and shows confirmation', async () => {
    const onSignalTriggered = vi.fn()

    render(
      <SafetySignalProvider childId="child-123" onSignalTriggered={onSignalTriggered}>
        <SafetySignalLogo>
          <img src="/logo.png" alt="Logo" />
        </SafetySignalLogo>
        <SafetySignalConfirmation message="Saved" />
      </SafetySignalProvider>
    )

    const logo = screen.getByTestId('safety-signal-logo')

    // Confirmation should not be visible initially
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()

    // Tap 5 times within window
    for (let i = 0; i < 5; i++) {
      act(() => {
        fireEvent.click(logo)
      })
      act(() => {
        vi.advanceTimersByTime(100)
      })
    }

    // Allow processing
    await act(async () => {
      vi.advanceTimersByTime(1)
      await Promise.resolve()
    })

    // Callback should be called
    expect(onSignalTriggered).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        queued: true,
      })
    )

    // Confirmation should be visible
    expect(screen.getByText('Saved')).toBeInTheDocument()
  })

  it('no visual change during partial gesture', async () => {
    render(
      <SafetySignalProvider childId="child-123">
        <SafetySignalLogo />
        <SafetySignalConfirmation />
      </SafetySignalProvider>
    )

    const logo = screen.getByTestId('safety-signal-logo')

    // Only tap 3 times (not enough to trigger)
    for (let i = 0; i < 3; i++) {
      act(() => {
        fireEvent.click(logo)
      })
      act(() => {
        vi.advanceTimersByTime(100)
      })
    }

    await act(async () => {
      vi.advanceTimersByTime(1)
      await Promise.resolve()
    })

    // No confirmation should appear
    expect(screen.queryByTestId('safety-signal-confirmation')).not.toBeInTheDocument()
  })
})
