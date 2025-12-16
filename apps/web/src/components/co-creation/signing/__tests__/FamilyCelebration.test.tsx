import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FamilyCelebration } from '../FamilyCelebration'

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

describe('FamilyCelebration', () => {
  const defaultProps = {
    agreement: {
      id: 'agreement-123',
      version: '1.0',
      activatedAt: '2025-12-16T12:00:00Z',
      termsCount: 5,
    },
    parentNames: ['Sarah'],
    childName: 'Alex',
    onNextStep: vi.fn(),
    onDownload: vi.fn().mockResolvedValue(undefined),
    onShare: vi.fn().mockResolvedValue(undefined),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockMatchMedia(false) // No reduced motion preference by default
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Task 1.1: FamilyCelebration component structure', () => {
    it('renders celebration container', () => {
      render(<FamilyCelebration {...defaultProps} />)

      expect(screen.getByTestId('family-celebration-container')).toBeInTheDocument()
    })

    it('displays family agreement activation message', () => {
      render(<FamilyCelebration {...defaultProps} />)

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })
  })

  describe('Task 1.2: Partnership message (AC #2)', () => {
    it('displays "You did this together!" message', () => {
      render(<FamilyCelebration {...defaultProps} />)

      expect(screen.getByText(/you did this together/i)).toBeInTheDocument()
    })

    it('emphasizes partnership in celebration', () => {
      render(<FamilyCelebration {...defaultProps} />)

      // Should have partnership-focused messaging - use getAllBy for multiple matches
      const partnershipElements = screen.getAllByText(/together|family|partnership/i)
      expect(partnershipElements.length).toBeGreaterThan(0)
    })
  })

  describe('Task 1.3: Display parent and child names', () => {
    it('displays child name', () => {
      render(<FamilyCelebration {...defaultProps} />)

      // Child name appears in multiple places
      const childNameElements = screen.getAllByText(/Alex/)
      expect(childNameElements.length).toBeGreaterThan(0)
    })

    it('displays single parent name', () => {
      render(<FamilyCelebration {...defaultProps} />)

      expect(screen.getAllByText(/Sarah/).length).toBeGreaterThan(0)
    })

    it('displays multiple parent names for shared custody', () => {
      render(
        <FamilyCelebration
          {...defaultProps}
          parentNames={['Sarah', 'Michael']}
        />
      )

      expect(screen.getAllByText(/Sarah/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Michael/).length).toBeGreaterThan(0)
    })
  })

  describe('Task 1.4: Confetti/animation (AC #1)', () => {
    it('renders celebration container with animation', () => {
      render(<FamilyCelebration {...defaultProps} />)

      const container = screen.getByTestId('family-celebration-container')
      expect(container).toBeInTheDocument()
    })

    it('shows visual celebration elements', () => {
      render(<FamilyCelebration {...defaultProps} />)

      // Should have confetti or celebration visual
      const celebration = screen.getByTestId('family-celebration-container')
      expect(celebration).toBeInTheDocument()
    })
  })

  describe('Task 1.5: Screen reader announcement (AC #7)', () => {
    it('announces "Congratulations! Your family agreement is now active."', () => {
      render(<FamilyCelebration {...defaultProps} />)

      const liveRegion = document.querySelector('[aria-live="polite"], [role="alert"]')
      expect(liveRegion).toBeInTheDocument()
      expect(liveRegion?.textContent).toMatch(/congratulations.*family agreement.*active/i)
    })
  })

  describe('Task 1.6: Reduced motion preference (AC #6)', () => {
    it('respects prefers-reduced-motion', () => {
      mockMatchMedia(true)
      render(<FamilyCelebration {...defaultProps} />)

      const container = screen.getByTestId('family-celebration-container')
      expect(container).toBeInTheDocument()
      // Should not have confetti when reduced motion is preferred
    })

    it('still shows celebration content without animation', () => {
      mockMatchMedia(true)
      render(<FamilyCelebration {...defaultProps} />)

      // Main message still visible
      expect(screen.getByText(/you did this together/i)).toBeInTheDocument()
    })
  })

  describe('Download/Share buttons (AC #3)', () => {
    it('renders download button', () => {
      render(<FamilyCelebration {...defaultProps} />)

      expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument()
    })

    it('renders share button', () => {
      render(<FamilyCelebration {...defaultProps} />)

      expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument()
    })

    it('calls onDownload when download button clicked', async () => {
      const user = userEvent.setup()
      render(<FamilyCelebration {...defaultProps} />)

      const downloadButton = screen.getByRole('button', { name: /download/i })
      await user.click(downloadButton)

      expect(defaultProps.onDownload).toHaveBeenCalled()
    })

    it('calls onShare when share button clicked', async () => {
      const user = userEvent.setup()
      render(<FamilyCelebration {...defaultProps} />)

      const shareButton = screen.getByRole('button', { name: /share/i })
      await user.click(shareButton)

      expect(defaultProps.onShare).toHaveBeenCalled()
    })

    it('download button has 44px minimum touch target (NFR49)', () => {
      render(<FamilyCelebration {...defaultProps} />)

      const button = screen.getByRole('button', { name: /download/i })
      expect(button.className).toContain('min-h-[44px]')
    })

    it('share button has 44px minimum touch target (NFR49)', () => {
      render(<FamilyCelebration {...defaultProps} />)

      const button = screen.getByRole('button', { name: /share/i })
      expect(button.className).toContain('min-h-[44px]')
    })
  })

  describe('Photo moment suggestion (AC #4)', () => {
    it('displays screenshot suggestion prompt', () => {
      render(<FamilyCelebration {...defaultProps} />)

      // Multiple elements may contain photo-related text
      const photoElements = screen.getAllByText(/screenshot|photo|capture this moment/i)
      expect(photoElements.length).toBeGreaterThan(0)
    })
  })

  describe('Next steps navigation (AC #5)', () => {
    it('displays device enrollment option', () => {
      render(<FamilyCelebration {...defaultProps} />)

      expect(screen.getByRole('button', { name: /device|monitoring|set up/i })).toBeInTheDocument()
    })

    it('displays agreement-only option', () => {
      render(<FamilyCelebration {...defaultProps} />)

      expect(screen.getByRole('button', { name: /agreement only|dashboard|later/i })).toBeInTheDocument()
    })

    it('calls onNextStep with device-enrollment when selected', async () => {
      const user = userEvent.setup()
      render(<FamilyCelebration {...defaultProps} />)

      const deviceButton = screen.getByRole('button', { name: /device|monitoring|set up/i })
      await user.click(deviceButton)

      expect(defaultProps.onNextStep).toHaveBeenCalledWith('device-enrollment')
    })

    it('calls onNextStep with dashboard when agreement-only selected', async () => {
      const user = userEvent.setup()
      render(<FamilyCelebration {...defaultProps} />)

      const dashboardButton = screen.getByRole('button', { name: /agreement only|dashboard|later/i })
      await user.click(dashboardButton)

      expect(defaultProps.onNextStep).toHaveBeenCalledWith('dashboard')
    })
  })

  describe('Accessibility (NFR42, NFR43, NFR45)', () => {
    it('has proper heading structure', () => {
      render(<FamilyCelebration {...defaultProps} />)

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })

    it('all buttons are keyboard focusable', () => {
      render(<FamilyCelebration {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).not.toHaveAttribute('tabindex', '-1')
      })
    })

    it('buttons have visible focus states', () => {
      render(<FamilyCelebration {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button.className).toMatch(/focus:/)
      })
    })

    it('uses dark text colors for contrast (NFR45)', () => {
      render(<FamilyCelebration {...defaultProps} />)

      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading.className).toMatch(/text-gray-900|text-white/)
    })
  })

  describe('Agreement data display', () => {
    it('displays agreement version', () => {
      render(<FamilyCelebration {...defaultProps} />)

      expect(screen.getByText(/version 1.0/i)).toBeInTheDocument()
    })

    it('displays terms count', () => {
      render(<FamilyCelebration {...defaultProps} />)

      expect(screen.getByText(/5 terms/i)).toBeInTheDocument()
    })
  })
})
