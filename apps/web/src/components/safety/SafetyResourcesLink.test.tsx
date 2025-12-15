import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SafetyResourcesLink } from './SafetyResourcesLink'

// Mock the SafetyContactForm to avoid testing it again
vi.mock('./SafetyContactForm', () => ({
  SafetyContactForm: vi.fn(({ open }) =>
    open ? <div data-testid="safety-form">Safety Form Mock</div> : null
  ),
}))

describe('SafetyResourcesLink', () => {
  describe('visual subtlety requirements', () => {
    it('should render with subtle text "Safety Resources"', () => {
      render(<SafetyResourcesLink source="login-page" />)

      const link = screen.getByRole('button', { name: /safety resources/i })
      expect(link).toBeInTheDocument()
    })

    it('should use neutral text (not alarming)', () => {
      render(<SafetyResourcesLink source="login-page" />)

      const link = screen.getByRole('button')
      expect(link.textContent).toBe('Safety Resources')
      expect(link.textContent?.toLowerCase()).not.toContain('escape')
      expect(link.textContent?.toLowerCase()).not.toContain('abuse')
    })

    it('should have muted foreground color class', () => {
      render(<SafetyResourcesLink source="login-page" />)

      const link = screen.getByRole('button')
      expect(link).toHaveClass('text-muted-foreground')
    })

    it('should use small text size', () => {
      render(<SafetyResourcesLink source="login-page" />)

      const link = screen.getByRole('button')
      expect(link).toHaveClass('text-xs')
    })
  })

  describe('accessibility', () => {
    it('should have proper aria-label', () => {
      render(<SafetyResourcesLink source="login-page" />)

      const link = screen.getByRole('button')
      expect(link).toHaveAttribute(
        'aria-label',
        'Access safety resources and support'
      )
    })
  })

  describe('interaction', () => {
    it('should open form when clicked', async () => {
      const user = userEvent.setup()

      render(<SafetyResourcesLink source="login-page" />)

      const link = screen.getByRole('button', { name: /safety resources/i })
      expect(screen.queryByTestId('safety-form')).not.toBeInTheDocument()

      await user.click(link)

      expect(screen.getByTestId('safety-form')).toBeInTheDocument()
    })

    it('should pass correct source to form', async () => {
      const user = userEvent.setup()
      const { SafetyContactForm } = await import('./SafetyContactForm')

      render(<SafetyResourcesLink source="settings" />)

      const link = screen.getByRole('button', { name: /safety resources/i })
      await user.click(link)

      expect(SafetyContactForm).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'settings' }),
        expect.anything()
      )
    })
  })

  describe('custom styling', () => {
    it('should accept custom className', () => {
      render(
        <SafetyResourcesLink source="login-page" className="custom-class" />
      )

      const link = screen.getByRole('button')
      expect(link).toHaveClass('custom-class')
    })
  })
})
