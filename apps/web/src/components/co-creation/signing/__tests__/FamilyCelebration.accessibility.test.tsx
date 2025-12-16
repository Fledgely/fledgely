import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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

describe('FamilyCelebration Accessibility Tests (Task 6)', () => {
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
    mockMatchMedia(false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('NFR49: Touch Targets (44x44px minimum)', () => {
    it('download button has 44px minimum height', () => {
      render(<FamilyCelebration {...defaultProps} />)

      const button = screen.getByRole('button', { name: /download/i })
      expect(button.className).toContain('min-h-[44px]')
    })

    it('share button has 44px minimum height', () => {
      render(<FamilyCelebration {...defaultProps} />)

      const button = screen.getByRole('button', { name: /share/i })
      expect(button.className).toContain('min-h-[44px]')
    })

    it('device enrollment button has 44px minimum height', () => {
      render(<FamilyCelebration {...defaultProps} />)

      const button = screen.getByRole('button', { name: /set up device/i })
      expect(button.className).toContain('min-h-[44px]')
    })

    it('dashboard button has 44px minimum height', () => {
      render(<FamilyCelebration {...defaultProps} />)

      const button = screen.getByRole('button', { name: /agreement only/i })
      expect(button.className).toContain('min-h-[44px]')
    })
  })

  describe('NFR42: ARIA Labels', () => {
    it('download button has aria-label', () => {
      render(<FamilyCelebration {...defaultProps} />)

      expect(screen.getByRole('button', { name: /download agreement/i })).toBeInTheDocument()
    })

    it('share button has aria-label', () => {
      render(<FamilyCelebration {...defaultProps} />)

      expect(screen.getByRole('button', { name: /share agreement/i })).toBeInTheDocument()
    })

    it('device enrollment button has aria-label', () => {
      render(<FamilyCelebration {...defaultProps} />)

      expect(screen.getByRole('button', { name: /set up device monitoring/i })).toBeInTheDocument()
    })

    it('dashboard button has aria-label', () => {
      render(<FamilyCelebration {...defaultProps} />)

      expect(screen.getByRole('button', { name: /agreement only.*dashboard/i })).toBeInTheDocument()
    })
  })

  describe('NFR47: Screen Reader Announcement', () => {
    it('announces "Congratulations! Your family agreement is now active."', () => {
      render(<FamilyCelebration {...defaultProps} />)

      const liveRegion = document.querySelector('[aria-live="polite"], [role="alert"]')
      expect(liveRegion).toBeInTheDocument()
      expect(liveRegion?.textContent).toMatch(/congratulations.*family agreement.*active/i)
    })

    it('live region uses role="alert" for immediate announcement', () => {
      render(<FamilyCelebration {...defaultProps} />)

      const alertRegion = document.querySelector('[role="alert"]')
      expect(alertRegion).toBeInTheDocument()
    })

    it('screen reader text is visually hidden but present', () => {
      render(<FamilyCelebration {...defaultProps} />)

      const liveRegion = document.querySelector('[aria-live="polite"], [role="alert"]')
      expect(liveRegion?.className).toContain('sr-only')
    })
  })

  describe('NFR43: Keyboard Navigation', () => {
    it('all buttons are focusable via keyboard', () => {
      render(<FamilyCelebration {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        // Should not have negative tabindex
        expect(button).not.toHaveAttribute('tabindex', '-1')
      })
    })

    it('all buttons have visible focus states', () => {
      render(<FamilyCelebration {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        // Should have focus ring classes
        expect(button.className).toMatch(/focus:/)
      })
    })

    it('buttons have focus ring offset for visibility', () => {
      render(<FamilyCelebration {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button.className).toMatch(/focus:ring/)
      })
    })
  })

  describe('NFR45: Color Contrast (4.5:1 minimum)', () => {
    it('main heading uses high contrast text', () => {
      render(<FamilyCelebration {...defaultProps} />)

      const heading = screen.getByRole('heading', { level: 1 })
      // Should use dark text on light background or white text on dark
      expect(heading.className).toMatch(/text-gray-900|text-white/)
    })

    it('partnership message has sufficient contrast', () => {
      render(<FamilyCelebration {...defaultProps} />)

      // "You did this together!" message
      const message = screen.getByText(/you did this together/i)
      // Purple text should be visible
      expect(message.className).toMatch(/text-purple-/)
    })

    it('next steps section has clear headings', () => {
      render(<FamilyCelebration {...defaultProps} />)

      const nextStepsHeading = screen.getByRole('heading', { level: 2 })
      expect(nextStepsHeading.className).toMatch(/text-gray-900|text-white/)
    })
  })

  describe('Reduced Motion Preference (AC #6)', () => {
    it('respects prefers-reduced-motion', () => {
      mockMatchMedia(true)
      render(<FamilyCelebration {...defaultProps} />)

      // Container should still render
      const container = screen.getByTestId('family-celebration-container')
      expect(container).toBeInTheDocument()
    })

    it('does not show confetti when reduced motion preferred', () => {
      mockMatchMedia(true)
      render(<FamilyCelebration {...defaultProps} />)

      // Confetti container should not have animation
      const confettiElements = document.querySelectorAll('.animate-confetti')
      expect(confettiElements.length).toBe(0)
    })

    it('content is fully accessible without animation', () => {
      mockMatchMedia(true)
      render(<FamilyCelebration {...defaultProps} />)

      // All content should still be present
      expect(screen.getByText(/you did this together/i)).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument()
    })
  })

  describe('Proper Heading Structure', () => {
    it('has h1 for main celebration title', () => {
      render(<FamilyCelebration {...defaultProps} />)

      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1).toBeInTheDocument()
      expect(h1).toHaveTextContent(/agreement active/i)
    })

    it('has h2 for next steps section', () => {
      render(<FamilyCelebration {...defaultProps} />)

      const h2 = screen.getByRole('heading', { level: 2 })
      expect(h2).toBeInTheDocument()
      expect(h2).toHaveTextContent(/what's next/i)
    })

    it('headings follow semantic order', () => {
      render(<FamilyCelebration {...defaultProps} />)

      const headings = screen.getAllByRole('heading')
      // h1 should come before h2
      const levels = headings.map((h) => parseInt(h.tagName.charAt(1)))
      for (let i = 1; i < levels.length; i++) {
        // Levels should not skip (e.g., h1 to h3)
        expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1)
      }
    })
  })

  describe('Interactive Elements Accessibility', () => {
    it('buttons have type="button" to prevent form submission', () => {
      render(<FamilyCelebration {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type', 'button')
      })
    })

    it('icons are hidden from screen readers', () => {
      render(<FamilyCelebration {...defaultProps} />)

      // SVG icons should have aria-hidden
      const icons = document.querySelectorAll('svg')
      icons.forEach((icon) => {
        expect(icon).toHaveAttribute('aria-hidden', 'true')
      })
    })
  })

  describe('Shared Custody Support (Task 5.3)', () => {
    it('displays multiple parent names correctly', () => {
      render(
        <FamilyCelebration
          {...defaultProps}
          parentNames={['Sarah', 'Michael']}
        />
      )

      // Both names should appear
      const text = screen.getByText(/Sarah and Michael/i)
      expect(text).toBeInTheDocument()
    })

    it('handles three or more parents grammatically', () => {
      render(
        <FamilyCelebration
          {...defaultProps}
          parentNames={['Sarah', 'Michael', 'Jane']}
        />
      )

      // Should use Oxford comma or similar
      const text = screen.getByText(/Sarah.*Michael.*Jane/i)
      expect(text).toBeInTheDocument()
    })
  })
})
