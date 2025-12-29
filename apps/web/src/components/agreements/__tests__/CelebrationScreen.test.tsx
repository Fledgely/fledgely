/**
 * Tests for CelebrationScreen component.
 *
 * Story 6.4: Signing Ceremony Celebration - AC1-AC7
 */

import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { describe, it, expect, vi, afterEach, beforeEach, beforeAll, afterAll } from 'vitest'
import { CelebrationScreen } from '../CelebrationScreen'

// Store original matchMedia
const originalMatchMedia = window.matchMedia

// Default matchMedia mock (no reduced motion)
const createMatchMediaMock = (matches: boolean = false) =>
  vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)' ? matches : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))

describe('CelebrationScreen', () => {
  const defaultProps = {
    version: 'v1.0',
    activatedAt: new Date('2024-01-15T12:00:00'),
    childName: 'Alex',
  }

  beforeAll(() => {
    // Mock matchMedia globally for all tests
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: createMatchMediaMock(false),
    })
  })

  afterAll(() => {
    // Restore original matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: originalMatchMedia,
    })
  })

  afterEach(() => {
    cleanup()
    // Reset to default (no reduced motion)
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: createMatchMediaMock(false),
    })
  })

  describe('rendering', () => {
    it('should render the celebration component', () => {
      render(<CelebrationScreen {...defaultProps} />)

      expect(screen.getByTestId('celebration-screen')).toBeInTheDocument()
    })

    it('should display celebration icon', () => {
      render(<CelebrationScreen {...defaultProps} />)

      expect(screen.getByTestId('celebration-icon')).toBeInTheDocument()
    })

    it('should display celebration heading', () => {
      render(<CelebrationScreen {...defaultProps} />)

      expect(screen.getByTestId('celebration-heading')).toBeInTheDocument()
    })
  })

  describe('visual celebration (AC1)', () => {
    it('should show confetti animation by default', () => {
      render(<CelebrationScreen {...defaultProps} />)

      expect(screen.getByTestId('confetti-animation')).toBeInTheDocument()
    })

    it('should hide confetti after animation completes', async () => {
      vi.useFakeTimers()
      render(<CelebrationScreen {...defaultProps} />)

      expect(screen.getByTestId('confetti-animation')).toBeInTheDocument()

      // Advance timer and flush effects wrapped in act to avoid React warning
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5100)
      })

      expect(screen.queryByTestId('confetti-animation')).not.toBeInTheDocument()

      vi.useRealTimers()
    })

    it('should mark confetti as decorative (aria-hidden)', () => {
      render(<CelebrationScreen {...defaultProps} />)

      expect(screen.getByTestId('confetti-animation')).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('partnership message (AC2)', () => {
    it('should show partnership message for parent view', () => {
      render(<CelebrationScreen {...defaultProps} />)

      expect(screen.getByTestId('partnership-message')).toHaveTextContent('You did this together')
    })

    it('should show partnership message for child view', () => {
      render(<CelebrationScreen {...defaultProps} isChildView />)

      expect(screen.getByTestId('partnership-message')).toHaveTextContent('You did this together')
    })

    it('should emphasize collaborative achievement', () => {
      render(<CelebrationScreen {...defaultProps} />)

      const message = screen.getByTestId('partnership-message')
      expect(message.textContent).toMatch(/together|family|team/i)
    })
  })

  describe('download agreement (AC3)', () => {
    it('should show download button when onDownload provided', () => {
      render(<CelebrationScreen {...defaultProps} onDownload={vi.fn()} />)

      expect(screen.getByTestId('download-button')).toBeInTheDocument()
    })

    it('should not show download button when onDownload not provided', () => {
      render(<CelebrationScreen {...defaultProps} />)

      expect(screen.queryByTestId('download-button')).not.toBeInTheDocument()
    })

    it('should call onDownload when clicked', () => {
      const onDownload = vi.fn()
      render(<CelebrationScreen {...defaultProps} onDownload={onDownload} />)

      fireEvent.click(screen.getByTestId('download-button'))

      expect(onDownload).toHaveBeenCalledTimes(1)
    })

    it('should have accessible download button text', () => {
      render(<CelebrationScreen {...defaultProps} onDownload={vi.fn()} />)

      expect(screen.getByTestId('download-button')).toHaveTextContent(/download|save/i)
    })
  })

  describe('photo moment suggestion (AC4)', () => {
    it('should show photo moment suggestion', () => {
      render(<CelebrationScreen {...defaultProps} />)

      expect(screen.getByTestId('photo-moment')).toBeInTheDocument()
    })

    it('should suggest capturing screenshot', () => {
      render(<CelebrationScreen {...defaultProps} />)

      expect(screen.getByTestId('photo-moment')).toHaveTextContent(/screenshot|capture|photo/i)
    })

    it('should be dismissible', () => {
      render(<CelebrationScreen {...defaultProps} />)

      const dismissButton = screen.getByTestId('dismiss-photo-moment')
      fireEvent.click(dismissButton)

      expect(screen.queryByTestId('photo-moment')).not.toBeInTheDocument()
    })

    it('should be non-intrusive (not blocking main content)', () => {
      render(<CelebrationScreen {...defaultProps} />)

      // Photo moment should be positioned below main celebration content
      const photoMoment = screen.getByTestId('photo-moment')
      const heading = screen.getByTestId('celebration-heading')
      expect(photoMoment).toBeInTheDocument()
      expect(heading).toBeInTheDocument()
    })
  })

  describe('next steps (AC5)', () => {
    it('should show next steps section', () => {
      render(<CelebrationScreen {...defaultProps} />)

      expect(screen.getByTestId('next-steps')).toBeInTheDocument()
    })

    it('should show view dashboard option when onViewDashboard provided', () => {
      render(<CelebrationScreen {...defaultProps} onViewDashboard={vi.fn()} />)

      expect(screen.getByTestId('view-dashboard-button')).toBeInTheDocument()
    })

    it('should call onViewDashboard when clicked', () => {
      const onViewDashboard = vi.fn()
      render(<CelebrationScreen {...defaultProps} onViewDashboard={onViewDashboard} />)

      fireEvent.click(screen.getByTestId('view-dashboard-button'))

      expect(onViewDashboard).toHaveBeenCalledTimes(1)
    })

    it('should show device setup option when onSetupDevices provided', () => {
      render(<CelebrationScreen {...defaultProps} onSetupDevices={vi.fn()} />)

      expect(screen.getByTestId('setup-devices-button')).toBeInTheDocument()
    })

    it('should call onSetupDevices when clicked', () => {
      const onSetupDevices = vi.fn()
      render(<CelebrationScreen {...defaultProps} onSetupDevices={onSetupDevices} />)

      fireEvent.click(screen.getByTestId('setup-devices-button'))

      expect(onSetupDevices).toHaveBeenCalledTimes(1)
    })

    it('should show child-friendly next steps for child view', () => {
      render(<CelebrationScreen {...defaultProps} isChildView onViewDashboard={vi.fn()} />)

      expect(screen.getByTestId('view-dashboard-button')).toHaveTextContent(/see|view/i)
    })
  })

  describe('accessibility (AC6)', () => {
    it('should have role="region"', () => {
      render(<CelebrationScreen {...defaultProps} />)

      expect(screen.getByRole('region')).toBeInTheDocument()
    })

    it('should have aria-labelledby pointing to heading', () => {
      render(<CelebrationScreen {...defaultProps} />)

      const region = screen.getByRole('region')
      expect(region).toHaveAttribute('aria-labelledby', 'celebration-heading')
    })

    it('should create screen reader announcement on mount', () => {
      render(<CelebrationScreen {...defaultProps} />)

      const announcement = document.querySelector('[role="status"][aria-live="polite"]')
      expect(announcement).toBeInTheDocument()
      expect(announcement).toHaveTextContent('Congratulations')
      expect(announcement).toHaveTextContent('Your family agreement is now active')
    })

    it('should include version in screen reader announcement', () => {
      render(<CelebrationScreen {...defaultProps} version="v2.0" />)

      const announcement = document.querySelector('[role="status"][aria-live="polite"]')
      expect(announcement).toHaveTextContent('Version v2.0')
    })

    it('should clean up announcement on unmount', () => {
      const { unmount } = render(<CelebrationScreen {...defaultProps} />)

      expect(document.querySelector('[role="status"][aria-live="polite"]')).toBeInTheDocument()

      unmount()

      expect(document.querySelector('[role="status"][aria-live="polite"]')).not.toBeInTheDocument()
    })

    it('should have celebration icon hidden from screen readers', () => {
      render(<CelebrationScreen {...defaultProps} />)

      const icon = screen.getByTestId('celebration-icon')
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })

    it('should have 44px minimum touch targets on buttons', () => {
      render(
        <CelebrationScreen
          {...defaultProps}
          onViewDashboard={vi.fn()}
          onDownload={vi.fn()}
          onSetupDevices={vi.fn()}
        />
      )

      expect(screen.getByTestId('view-dashboard-button')).toHaveClass('min-h-[44px]')
      expect(screen.getByTestId('download-button')).toHaveClass('min-h-[44px]')
      expect(screen.getByTestId('setup-devices-button')).toHaveClass('min-h-[44px]')
    })

    it('should have 44px minimum touch target on skip animation button', () => {
      render(<CelebrationScreen {...defaultProps} />)

      expect(screen.getByTestId('skip-animation-button')).toHaveClass('min-h-[44px]')
    })

    it('should have 44px minimum touch target on dismiss photo moment button', () => {
      render(<CelebrationScreen {...defaultProps} />)

      const dismissButton = screen.getByTestId('dismiss-photo-moment')
      expect(dismissButton).toHaveClass('min-h-[44px]')
      expect(dismissButton).toHaveClass('min-w-[44px]')
    })

    it('should have visible focus indicator on dismiss photo moment button', () => {
      render(<CelebrationScreen {...defaultProps} />)

      const dismissButton = screen.getByTestId('dismiss-photo-moment')
      expect(dismissButton).toHaveClass('focus:ring-2')
    })

    it('should have skip animation button', () => {
      render(<CelebrationScreen {...defaultProps} />)

      expect(screen.getByTestId('skip-animation-button')).toBeInTheDocument()
    })

    it('should hide confetti when skip animation clicked', () => {
      render(<CelebrationScreen {...defaultProps} />)

      expect(screen.getByTestId('confetti-animation')).toBeInTheDocument()

      fireEvent.click(screen.getByTestId('skip-animation-button'))

      expect(screen.queryByTestId('confetti-animation')).not.toBeInTheDocument()
    })
  })

  describe('reduced motion (AC6)', () => {
    beforeEach(() => {
      // Mock matchMedia for reduced motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: createMatchMediaMock(true),
      })
    })

    it('should not show confetti when reduced motion is preferred', () => {
      render(<CelebrationScreen {...defaultProps} />)

      expect(screen.queryByTestId('confetti-animation')).not.toBeInTheDocument()
    })

    it('should hide skip animation button when reduced motion is preferred', () => {
      render(<CelebrationScreen {...defaultProps} />)

      expect(screen.queryByTestId('skip-animation-button')).not.toBeInTheDocument()
    })
  })

  describe('child view (AC7)', () => {
    it('should show child-friendly heading', () => {
      render(<CelebrationScreen {...defaultProps} isChildView />)

      expect(screen.getByTestId('celebration-heading')).toHaveTextContent('You Did It!')
    })

    it('should show parent heading for parent view', () => {
      render(<CelebrationScreen {...defaultProps} familyName="Smith" />)

      expect(screen.getByTestId('celebration-heading')).toHaveTextContent('Smith Family Agreement')
    })

    it('should use simple language for child view', () => {
      render(<CelebrationScreen {...defaultProps} isChildView />)

      // Check for child-friendly vocabulary
      const message = screen.getByTestId('partnership-message')
      expect(message.textContent).not.toMatch(/activated|effective|governing/i)
    })

    it('should show child-friendly button text', () => {
      render(<CelebrationScreen {...defaultProps} isChildView onViewDashboard={vi.fn()} />)

      expect(screen.getByTestId('view-dashboard-button')).toHaveTextContent(/awesome|cool|great/i)
    })
  })

  describe('version and date display', () => {
    it('should display version number', () => {
      render(<CelebrationScreen {...defaultProps} />)

      expect(screen.getByTestId('version-info')).toHaveTextContent('Version v1.0')
    })

    it('should display formatted activation date', () => {
      render(<CelebrationScreen {...defaultProps} />)

      expect(screen.getByTestId('version-info')).toHaveTextContent('Monday, January 15, 2024')
    })
  })

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<CelebrationScreen {...defaultProps} className="custom-class" />)

      expect(screen.getByTestId('celebration-screen')).toHaveClass('custom-class')
    })

    it('should have celebratory gradient background', () => {
      render(<CelebrationScreen {...defaultProps} />)

      const screen_ = screen.getByTestId('celebration-screen')
      expect(screen_).toHaveClass('from-green-50')
    })
  })

  describe('content variations', () => {
    it('should handle different child names', () => {
      render(<CelebrationScreen {...defaultProps} childName="Jordan" />)

      // The component should work with any child name
      expect(screen.getByTestId('celebration-screen')).toBeInTheDocument()
    })

    it('should handle different family names', () => {
      render(<CelebrationScreen {...defaultProps} familyName="Johnson" />)

      expect(screen.getByTestId('celebration-heading')).toHaveTextContent('Johnson')
    })

    it('should handle different versions', () => {
      render(<CelebrationScreen {...defaultProps} version="v3.0" />)

      expect(screen.getByTestId('version-info')).toHaveTextContent('Version v3.0')
    })
  })
})
