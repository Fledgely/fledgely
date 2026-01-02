/**
 * ViewingRateAlertBanner Component Tests - Story 3A.5
 *
 * Tests for the dismissible alert banner shown to co-parents.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import ViewingRateAlertBanner from './ViewingRateAlertBanner'

describe('ViewingRateAlertBanner - Story 3A.5', () => {
  const defaultProps = {
    viewCount: 55,
    alertTime: new Date(),
    onDismiss: vi.fn(),
    isVisible: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Rendering', () => {
    it('should render when isVisible is true', () => {
      render(<ViewingRateAlertBanner {...defaultProps} />)

      expect(screen.getByTestId('viewing-rate-alert-banner')).toBeInTheDocument()
    })

    it('should not render when isVisible is false', () => {
      render(<ViewingRateAlertBanner {...defaultProps} isVisible={false} />)

      expect(screen.queryByTestId('viewing-rate-alert-banner')).not.toBeInTheDocument()
    })

    it('should display the view count', () => {
      render(<ViewingRateAlertBanner {...defaultProps} viewCount={55} />)

      expect(screen.getByText(/55 screenshots/)).toBeInTheDocument()
    })

    it('should display "last hour" timeframe (AC2)', () => {
      render(<ViewingRateAlertBanner {...defaultProps} />)

      expect(screen.getByText(/last hour/)).toBeInTheDocument()
    })
  })

  describe('Message Content (AC2)', () => {
    it('should show count but NOT which screenshots', () => {
      render(<ViewingRateAlertBanner {...defaultProps} viewCount={55} />)

      const message = screen.getByText(/A family member has viewed/)
      expect(message.textContent).toContain('55')
      expect(message.textContent).not.toContain('screenshot-')
    })

    it('should use neutral "family member" language (no identity reveal)', () => {
      render(<ViewingRateAlertBanner {...defaultProps} />)

      expect(screen.getByText(/A family member/)).toBeInTheDocument()
      expect(screen.queryByText(/parent/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/co-parent/i)).not.toBeInTheDocument()
    })

    it('should state no action is required (AC3)', () => {
      render(<ViewingRateAlertBanner {...defaultProps} />)

      expect(screen.getByText(/No action is required/)).toBeInTheDocument()
    })
  })

  describe('Dismiss Behavior', () => {
    it('should call onDismiss when dismiss button clicked', async () => {
      render(<ViewingRateAlertBanner {...defaultProps} />)

      const dismissButton = screen.getByTestId('dismiss-button')
      fireEvent.click(dismissButton)

      // Wait for animation timeout
      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(defaultProps.onDismiss).toHaveBeenCalled()
    })

    it('should call onDismiss when Escape key pressed', async () => {
      render(<ViewingRateAlertBanner {...defaultProps} />)

      const banner = screen.getByTestId('viewing-rate-alert-banner')
      fireEvent.keyDown(banner, { key: 'Escape' })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(defaultProps.onDismiss).toHaveBeenCalled()
    })

    it('should auto-dismiss after specified timeout', () => {
      render(<ViewingRateAlertBanner {...defaultProps} autoDismissMs={30000} />)

      // Initially visible
      expect(screen.getByTestId('viewing-rate-alert-banner')).toBeInTheDocument()

      // Advance time to just before timeout
      act(() => {
        vi.advanceTimersByTime(29000)
      })

      // Still visible
      expect(screen.getByTestId('viewing-rate-alert-banner')).toBeInTheDocument()

      // Advance past timeout
      act(() => {
        vi.advanceTimersByTime(1500)
      })

      // Should have called onDismiss
      expect(defaultProps.onDismiss).toHaveBeenCalled()
    })

    it('should not auto-dismiss when autoDismissMs is 0', () => {
      render(<ViewingRateAlertBanner {...defaultProps} autoDismissMs={0} />)

      act(() => {
        vi.advanceTimersByTime(60000)
      })

      expect(defaultProps.onDismiss).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have role="alert"', () => {
      render(<ViewingRateAlertBanner {...defaultProps} />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('should have aria-live="polite"', () => {
      render(<ViewingRateAlertBanner {...defaultProps} />)

      const banner = screen.getByTestId('viewing-rate-alert-banner')
      expect(banner).toHaveAttribute('aria-live', 'polite')
    })

    it('should have aria-atomic="true"', () => {
      render(<ViewingRateAlertBanner {...defaultProps} />)

      const banner = screen.getByTestId('viewing-rate-alert-banner')
      expect(banner).toHaveAttribute('aria-atomic', 'true')
    })

    it('dismiss button should have accessible label', () => {
      render(<ViewingRateAlertBanner {...defaultProps} />)

      const dismissButton = screen.getByLabelText('Dismiss alert')
      expect(dismissButton).toBeInTheDocument()
    })
  })

  describe('Touch Targets (NFR49)', () => {
    it('should have minimum 44px height on dismiss button', () => {
      render(<ViewingRateAlertBanner {...defaultProps} />)

      const dismissButton = screen.getByTestId('dismiss-button')
      expect(dismissButton).toHaveStyle({ minHeight: '44px' })
    })

    it('should have minimum 44px width on dismiss button', () => {
      render(<ViewingRateAlertBanner {...defaultProps} />)

      const dismissButton = screen.getByTestId('dismiss-button')
      expect(dismissButton).toHaveStyle({ minWidth: '44px' })
    })
  })

  describe('No Child Information (AC5)', () => {
    it('should NOT contain any child references', () => {
      render(<ViewingRateAlertBanner {...defaultProps} />)

      const banner = screen.getByTestId('viewing-rate-alert-banner')
      expect(banner.textContent).not.toContain('child')
      expect(banner.textContent).not.toContain('son')
      expect(banner.textContent).not.toContain('daughter')
    })

    it('should NOT contain any specific screenshot IDs', () => {
      render(<ViewingRateAlertBanner {...defaultProps} />)

      const banner = screen.getByTestId('viewing-rate-alert-banner')
      expect(banner.textContent).not.toMatch(/screenshot-\d+/)
    })
  })
})
