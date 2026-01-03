/**
 * Tests for SafeEscapeButton Component
 *
 * Story 40.3: Fleeing Mode - Safe Escape
 *
 * Acceptance Criteria:
 * - AC1: Instant activation, no confirmation
 * - AC6: Available to children with same protections
 * - NFR65: 6th-grade reading level
 * - NFR49: 44px+ touch targets
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SafeEscapeButton } from '../SafeEscapeButton'

describe('SafeEscapeButton', () => {
  const mockOnActivate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnActivate.mockResolvedValue({ activationId: 'activation-123' })
  })

  describe('Rendering', () => {
    it('renders with child-friendly label when isChild=true', () => {
      render(<SafeEscapeButton isChild onActivate={mockOnActivate} />)

      expect(screen.getByRole('button', { name: /I Need to Hide/i })).toBeInTheDocument()
    })

    it('renders with adult label when isChild=false', () => {
      render(<SafeEscapeButton isChild={false} onActivate={mockOnActivate} />)

      expect(screen.getByRole('button', { name: /Safe Escape/i })).toBeInTheDocument()
    })

    it('renders with child hint when isChild=true', () => {
      render(<SafeEscapeButton isChild onActivate={mockOnActivate} />)

      expect(screen.getByText(/Tap to turn off location tracking right now/i)).toBeInTheDocument()
    })

    it('renders with adult hint when isChild=false', () => {
      render(<SafeEscapeButton isChild={false} onActivate={mockOnActivate} />)

      expect(screen.getByText(/Immediately disables all location features/i)).toBeInTheDocument()
    })
  })

  describe('Instant Activation (AC1)', () => {
    it('calls onActivate immediately when clicked', async () => {
      render(<SafeEscapeButton onActivate={mockOnActivate} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(mockOnActivate).toHaveBeenCalledTimes(1)
    })

    it('does not show confirmation dialog', () => {
      render(<SafeEscapeButton onActivate={mockOnActivate} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      // No confirmation elements should appear
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.queryByText(/confirm/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('shows loading state when isLoading=true', () => {
      render(<SafeEscapeButton isLoading onActivate={mockOnActivate} />)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('shows loading state while activating', async () => {
      // Make the promise pending
      let resolvePromise: (value: { activationId: string }) => void
      mockOnActivate.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve
          })
      )

      render(<SafeEscapeButton onActivate={mockOnActivate} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      // Button should be disabled while activating
      await waitFor(() => {
        expect(button).toBeDisabled()
      })

      // Resolve the promise
      resolvePromise!({ activationId: 'test' })

      // Button should be enabled again
      await waitFor(() => {
        expect(button).not.toBeDisabled()
      })
    })

    it('does not call onActivate when disabled', () => {
      render(<SafeEscapeButton isLoading onActivate={mockOnActivate} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(mockOnActivate).not.toHaveBeenCalled()
    })
  })

  describe('Child Protection (AC6)', () => {
    it('provides same functionality for children', async () => {
      render(<SafeEscapeButton isChild onActivate={mockOnActivate} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(mockOnActivate).toHaveBeenCalledTimes(1)
    })

    it('uses child-friendly language (NFR65)', () => {
      render(<SafeEscapeButton isChild onActivate={mockOnActivate} />)

      // Child messages should use simpler language
      expect(screen.getByText(/I Need to Hide/i)).toBeInTheDocument()
      expect(screen.getByText(/Tap to turn off location tracking right now/i)).toBeInTheDocument()
    })
  })

  describe('Touch Target Size (NFR49)', () => {
    it('has minimum 44px touch target', () => {
      render(<SafeEscapeButton onActivate={mockOnActivate} />)

      const button = screen.getByRole('button')

      // Check inline style via data attribute or directly
      // The component uses minHeight: 56px in default size
      expect(button).toHaveStyle({ minHeight: '56px' })
    })

    it('has minimum 48px touch target in compact mode', () => {
      render(<SafeEscapeButton size="compact" onActivate={mockOnActivate} />)

      const button = screen.getByRole('button')
      expect(button).toHaveStyle({ minHeight: '48px' })
    })
  })

  describe('Accessibility', () => {
    it('has aria-label on button', () => {
      render(<SafeEscapeButton onActivate={mockOnActivate} />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label')
    })

    it('has aria-describedby for hint text', () => {
      render(<SafeEscapeButton onActivate={mockOnActivate} />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-describedby', 'safe-escape-hint')
    })

    it('hint element has matching id', () => {
      render(<SafeEscapeButton onActivate={mockOnActivate} />)

      const hint = document.getElementById('safe-escape-hint')
      expect(hint).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('re-enables button after activation error', async () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockOnActivate.mockRejectedValue(new Error('Network error'))

      render(<SafeEscapeButton onActivate={mockOnActivate} />)

      const button = screen.getByRole('button')

      // Use act to properly handle async state updates
      await waitFor(async () => {
        fireEvent.click(button)
      })

      // Should re-enable after error
      await waitFor(() => {
        expect(button).not.toBeDisabled()
      })

      consoleSpy.mockRestore()
    })
  })
})
