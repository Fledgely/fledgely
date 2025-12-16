import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ParentSigningComplete } from '../ParentSigningComplete'

describe('ParentSigningComplete', () => {
  const defaultProps = {
    parentName: 'John Smith',
    childName: 'Alex',
    signingLink: '/agreements/sign/child/session-123',
    onContinue: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering (AC: 6)', () => {
    it('displays success message', () => {
      render(<ParentSigningComplete {...defaultProps} />)

      expect(screen.getByText(/you signed/i)).toBeInTheDocument()
    })

    it('shows "Now your child can sign" message', () => {
      render(<ParentSigningComplete {...defaultProps} />)

      expect(screen.getByText(/now.*child can sign/i)).toBeInTheDocument()
    })

    it('displays parent name in message', () => {
      render(<ParentSigningComplete {...defaultProps} />)

      expect(screen.getByText(/john smith/i)).toBeInTheDocument()
    })

    it('displays child name in instructions', () => {
      render(<ParentSigningComplete {...defaultProps} />)

      // Child name appears in the heading "Next Step: Alex Signs"
      expect(screen.getByRole('heading', { name: /next step.*alex/i })).toBeInTheDocument()
    })
  })

  describe('Share Link Options', () => {
    it('shows signing link for sharing', () => {
      render(<ParentSigningComplete {...defaultProps} />)

      expect(screen.getByText(/share.*link/i)).toBeInTheDocument()
    })

    it('displays copy link button', () => {
      render(<ParentSigningComplete {...defaultProps} />)

      const copyButton = screen.getByRole('button', { name: /copy/i })
      expect(copyButton).toBeInTheDocument()
    })

    it('copies link to clipboard when copy button clicked', async () => {
      const user = userEvent.setup()
      const writeText = vi.fn().mockResolvedValue(undefined)

      // Properly mock the clipboard API
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        writable: true,
        configurable: true,
      })

      render(<ParentSigningComplete {...defaultProps} />)

      const copyButton = screen.getByRole('button', { name: /copy/i })
      await user.click(copyButton)

      expect(writeText).toHaveBeenCalled()
    })
  })

  describe('Navigation', () => {
    it('displays continue to dashboard button', () => {
      render(<ParentSigningComplete {...defaultProps} />)

      const continueButton = screen.getByRole('button', { name: /dashboard|continue/i })
      expect(continueButton).toBeInTheDocument()
    })

    it('calls onContinue when continue button clicked', async () => {
      const user = userEvent.setup()
      const onContinue = vi.fn()
      render(<ParentSigningComplete {...defaultProps} onContinue={onContinue} />)

      const continueButton = screen.getByRole('button', { name: /dashboard|continue/i })
      await user.click(continueButton)

      expect(onContinue).toHaveBeenCalled()
    })
  })

  describe('Next Steps Instructions', () => {
    it('shows next steps for child signing', () => {
      render(<ParentSigningComplete {...defaultProps} />)

      expect(screen.getByText(/next step/i)).toBeInTheDocument()
    })

    it('explains child needs to sign', () => {
      render(<ParentSigningComplete {...defaultProps} />)

      expect(screen.getByRole('heading', { name: /alex signs/i })).toBeInTheDocument()
    })
  })

  describe('Accessibility (NFR42, NFR49)', () => {
    it('has success announcement for screen readers', () => {
      render(<ParentSigningComplete {...defaultProps} />)

      // Should have alert or live region for success announcement
      const announcement = document.querySelector('[role="alert"], [aria-live]')
      expect(announcement).toBeInTheDocument()
    })

    it('all buttons have 44px minimum height', () => {
      render(<ParentSigningComplete {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button.className).toMatch(/min-h-\[44px\]/)
      })
    })
  })

  describe('Visual Feedback', () => {
    it('shows success icon or checkmark', () => {
      render(<ParentSigningComplete {...defaultProps} />)

      // Should have a visual success indicator
      const successIcon = document.querySelector('svg')
      expect(successIcon).toBeInTheDocument()
    })
  })
})
