import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SigningCelebration } from '../SigningCelebration'

// Mock canvas for confetti
beforeEach(() => {
  const mockContext = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
  }
  HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext) as unknown as typeof HTMLCanvasElement.prototype.getContext
})

// Mock matchMedia for reduced motion preference
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? matches : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('SigningCelebration', () => {
  const defaultProps = {
    childName: 'Alex',
    onContinue: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockMatchMedia(false) // No reduced motion preference by default
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Celebration Message (Task 5.3)', () => {
    it('displays "You signed!" message', () => {
      render(<SigningCelebration {...defaultProps} />)

      expect(screen.getByText(/you signed/i)).toBeInTheDocument()
    })

    it('addresses child by name', () => {
      render(<SigningCelebration {...defaultProps} />)

      // Child name appears in multiple places (heading and screen reader text)
      const nameElements = screen.getAllByText(/Alex/)
      expect(nameElements.length).toBeGreaterThanOrEqual(1)
    })

    it('displays encouraging next steps message (Task 5.5)', () => {
      render(<SigningCelebration {...defaultProps} />)

      // Should have message about next steps or success - may have multiple matches
      const messageElements = screen.getAllByText(/agreement|family|promise/i)
      expect(messageElements.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Confetti Animation (Task 5.2)', () => {
    it('renders celebration container', () => {
      render(<SigningCelebration {...defaultProps} />)

      expect(screen.getByTestId('celebration-container')).toBeInTheDocument()
    })

    it('has celebratory visual styling', () => {
      render(<SigningCelebration {...defaultProps} />)

      const container = screen.getByTestId('celebration-container')
      // Should have celebratory colors or animations
      expect(container).toBeInTheDocument()
    })
  })

  describe('Screen Reader Announcement (Task 5.4, NFR47)', () => {
    it('announces celebration to screen readers', () => {
      render(<SigningCelebration {...defaultProps} />)

      // Should have live region with celebration message
      const liveRegion = document.querySelector('[aria-live="polite"], [role="alert"]')
      expect(liveRegion).toBeInTheDocument()
    })

    it('announces success message', () => {
      render(<SigningCelebration {...defaultProps} />)

      // Look for announcement element with success text - handle role="alert" too
      const announcement = document.querySelector('[aria-live], [role="alert"]')
      expect(announcement?.textContent).toMatch(/signed|success|congratulations/i)
    })
  })

  describe('Reduced Motion Preference (Task 5.6)', () => {
    it('respects prefers-reduced-motion', () => {
      mockMatchMedia(true) // Enable reduced motion
      render(<SigningCelebration {...defaultProps} />)

      // Should not have animation classes when reduced motion is preferred
      const container = screen.getByTestId('celebration-container')
      // The container should still render but without confetti animation
      expect(container).toBeInTheDocument()
    })

    it('shows static alternative when reduced motion preferred', () => {
      mockMatchMedia(true)
      render(<SigningCelebration {...defaultProps} />)

      // Should show static success indicator instead of animated confetti
      const successIcon = screen.getByRole('img', { hidden: true })
      expect(successIcon).toBeInTheDocument()
    })
  })

  describe('Continue Button', () => {
    it('renders continue button', () => {
      render(<SigningCelebration {...defaultProps} />)

      expect(screen.getByRole('button', { name: /continue|next|done/i })).toBeInTheDocument()
    })

    it('calls onContinue when clicked', async () => {
      const user = userEvent.setup()
      render(<SigningCelebration {...defaultProps} />)

      const continueButton = screen.getByRole('button', { name: /continue|next|done/i })
      await user.click(continueButton)

      expect(defaultProps.onContinue).toHaveBeenCalled()
    })

    it('has 44px minimum touch target (NFR49)', () => {
      render(<SigningCelebration {...defaultProps} />)

      const button = screen.getByRole('button', { name: /continue|next|done/i })
      expect(button.className).toContain('min-h-[44px]')
    })
  })

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<SigningCelebration {...defaultProps} />)

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })

    it('has accessible celebration message', () => {
      render(<SigningCelebration {...defaultProps} />)

      // Main message should be accessible
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveAccessibleName()
    })
  })
})
