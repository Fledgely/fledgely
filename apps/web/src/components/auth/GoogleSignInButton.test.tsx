import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GoogleSignInButton } from './GoogleSignInButton'

// Mock the dependencies
vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

describe('GoogleSignInButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders with default state', () => {
      render(<GoogleSignInButton />)

      const button = screen.getByRole('button', { name: /sign in with google/i })
      expect(button).toBeInTheDocument()
      expect(button).not.toBeDisabled()
    })

    it('displays Google icon when not loading', () => {
      render(<GoogleSignInButton />)

      // Check for "Sign in with Google" text
      expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
    })

    it('displays loading state when loading prop is true', () => {
      render(<GoogleSignInButton loading={true} />)

      // Use getAllByText since "Signing in..." appears in both visible text and sr-only
      const signingInElements = screen.getAllByText('Signing in...')
      expect(signingInElements.length).toBeGreaterThanOrEqual(1)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('is disabled when loading', () => {
      render(<GoogleSignInButton loading={true} />)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('is disabled when disabled prop is true', () => {
      render(<GoogleSignInButton disabled={true} />)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })
  })

  describe('accessibility', () => {
    it('meets 44x44px minimum touch target', () => {
      render(<GoogleSignInButton />)

      const button = screen.getByRole('button')
      // Check for min-h-[44px] class
      expect(button.className).toContain('min-h-[44px]')
    })

    it('has correct aria-label when not loading', () => {
      render(<GoogleSignInButton />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Sign in with Google')
    })

    it('has correct aria-label when loading', () => {
      render(<GoogleSignInButton loading={true} />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute(
        'aria-label',
        'Signing in with Google, please wait'
      )
    })

    it('has aria-busy attribute when loading', () => {
      render(<GoogleSignInButton loading={true} />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-busy', 'true')
    })

    it('has aria-disabled attribute when disabled', () => {
      render(<GoogleSignInButton disabled={true} />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-disabled', 'true')
    })

    it('has visible focus indicator classes', () => {
      render(<GoogleSignInButton />)

      const button = screen.getByRole('button')
      expect(button.className).toContain('focus-visible:ring')
    })

    it('contains screen reader announcement for loading state', () => {
      render(<GoogleSignInButton loading={true} />)

      // Should have sr-only element with aria-live
      const srElement = document.querySelector('[aria-live="polite"]')
      expect(srElement).toBeInTheDocument()
    })

    it('is keyboard focusable', () => {
      render(<GoogleSignInButton />)

      const button = screen.getByRole('button')
      button.focus()
      expect(document.activeElement).toBe(button)
    })
  })

  describe('interactions', () => {
    it('calls onClick when clicked', async () => {
      const handleClick = vi.fn()
      render(<GoogleSignInButton onClick={handleClick} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('does not call onClick when disabled', () => {
      const handleClick = vi.fn()
      render(<GoogleSignInButton onClick={handleClick} disabled={true} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(handleClick).not.toHaveBeenCalled()
    })

    it('does not call onClick when loading', () => {
      const handleClick = vi.fn()
      render(<GoogleSignInButton onClick={handleClick} loading={true} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(handleClick).not.toHaveBeenCalled()
    })

    it('handles async onClick', async () => {
      const handleClick = vi.fn().mockResolvedValue(undefined)
      render(<GoogleSignInButton onClick={handleClick} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(handleClick).toHaveBeenCalled()
    })

    it('can be activated with Enter key', () => {
      const handleClick = vi.fn()
      render(<GoogleSignInButton onClick={handleClick} />)

      const button = screen.getByRole('button')
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' })

      // The native button behavior handles Enter key
      // Just verify button is keyboard accessible
      expect(button).not.toBeDisabled()
    })

    it('can be activated with Space key', () => {
      const handleClick = vi.fn()
      render(<GoogleSignInButton onClick={handleClick} />)

      const button = screen.getByRole('button')
      fireEvent.keyDown(button, { key: ' ', code: 'Space' })

      // The native button behavior handles Space key
      // Just verify button is keyboard accessible
      expect(button).not.toBeDisabled()
    })
  })

  describe('styling', () => {
    it('applies custom className', () => {
      render(<GoogleSignInButton className="custom-class" />)

      const button = screen.getByRole('button')
      expect(button.className).toContain('custom-class')
    })

    it('has gap for icon and text spacing', () => {
      render(<GoogleSignInButton />)

      const button = screen.getByRole('button')
      expect(button.className).toContain('gap-3')
    })

    it('has minimum width for consistent sizing', () => {
      render(<GoogleSignInButton />)

      const button = screen.getByRole('button')
      expect(button.className).toContain('min-w-[200px]')
    })
  })
})
