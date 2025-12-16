/**
 * Unit tests for SessionStartButton Component
 *
 * Story 5.1: Co-Creation Session Initiation - Task 4.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SessionStartButton } from '../SessionStartButton'

describe('SessionStartButton', () => {
  const defaultProps = {
    onStart: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the button with default text', () => {
      render(<SessionStartButton {...defaultProps} />)
      expect(screen.getByText('Start Building Together')).toBeInTheDocument()
    })

    it('renders a button element', () => {
      render(<SessionStartButton {...defaultProps} />)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  describe('state: idle', () => {
    it('shows default start text in idle state', () => {
      render(<SessionStartButton {...defaultProps} state="idle" />)
      expect(screen.getByText('Start Building Together')).toBeInTheDocument()
    })

    it('calls onStart when clicked in idle state', () => {
      const onStart = vi.fn()
      render(<SessionStartButton {...defaultProps} onStart={onStart} state="idle" />)

      fireEvent.click(screen.getByRole('button'))
      expect(onStart).toHaveBeenCalledTimes(1)
    })

    it('has blue background in idle state', () => {
      render(<SessionStartButton {...defaultProps} state="idle" />)
      const button = screen.getByRole('button')
      expect(button.className).toContain('bg-blue-600')
    })
  })

  describe('state: loading', () => {
    it('shows loading text', () => {
      render(<SessionStartButton {...defaultProps} state="loading" />)
      expect(screen.getByText('Creating Session...')).toBeInTheDocument()
    })

    it('does not call onStart when clicked in loading state', () => {
      const onStart = vi.fn()
      render(<SessionStartButton {...defaultProps} onStart={onStart} state="loading" />)

      fireEvent.click(screen.getByRole('button'))
      expect(onStart).not.toHaveBeenCalled()
    })

    it('disables the button in loading state', () => {
      render(<SessionStartButton {...defaultProps} state="loading" />)
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('has aria-busy=true in loading state', () => {
      render(<SessionStartButton {...defaultProps} state="loading" />)
      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
    })

    it('has cursor-wait style in loading state', () => {
      render(<SessionStartButton {...defaultProps} state="loading" />)
      const button = screen.getByRole('button')
      expect(button.className).toContain('cursor-wait')
    })
  })

  describe('state: success', () => {
    it('shows success text', () => {
      render(<SessionStartButton {...defaultProps} state="success" />)
      expect(screen.getByText('Session Started!')).toBeInTheDocument()
    })

    it('disables the button in success state', () => {
      render(<SessionStartButton {...defaultProps} state="success" />)
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('has green background in success state', () => {
      render(<SessionStartButton {...defaultProps} state="success" />)
      const button = screen.getByRole('button')
      expect(button.className).toContain('bg-green-600')
    })
  })

  describe('state: error', () => {
    it('shows retry text', () => {
      render(<SessionStartButton {...defaultProps} state="error" />)
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })

    it('calls onStart when clicked in error state', () => {
      const onStart = vi.fn()
      render(<SessionStartButton {...defaultProps} onStart={onStart} state="error" />)

      fireEvent.click(screen.getByRole('button'))
      expect(onStart).toHaveBeenCalledTimes(1)
    })

    it('has red background in error state', () => {
      render(<SessionStartButton {...defaultProps} state="error" />)
      const button = screen.getByRole('button')
      expect(button.className).toContain('bg-red-600')
    })

    it('displays error message when provided', () => {
      render(
        <SessionStartButton
          {...defaultProps}
          state="error"
          errorMessage="Failed to create session"
        />
      )
      expect(screen.getByText('Failed to create session')).toBeInTheDocument()
    })

    it('does not display error message when not provided', () => {
      render(<SessionStartButton {...defaultProps} state="error" />)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('error message has alert role', () => {
      render(
        <SessionStartButton
          {...defaultProps}
          state="error"
          errorMessage="Something went wrong"
        />
      )
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('button has aria-describedby pointing to error', () => {
      render(
        <SessionStartButton
          {...defaultProps}
          state="error"
          errorMessage="Error occurred"
        />
      )
      expect(screen.getByRole('button')).toHaveAttribute('aria-describedby', 'start-error')
    })
  })

  describe('disabled prop', () => {
    it('disables button when disabled is true', () => {
      render(<SessionStartButton {...defaultProps} disabled />)
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('does not call onStart when disabled', () => {
      const onStart = vi.fn()
      render(<SessionStartButton {...defaultProps} onStart={onStart} disabled />)

      fireEvent.click(screen.getByRole('button'))
      expect(onStart).not.toHaveBeenCalled()
    })

    it('shows reduced opacity when disabled', () => {
      render(<SessionStartButton {...defaultProps} disabled />)
      const button = screen.getByRole('button')
      expect(button.className).toContain('opacity-50')
    })
  })

  describe('accessibility', () => {
    it('has minimum touch target size (56px height)', () => {
      render(<SessionStartButton {...defaultProps} />)
      const button = screen.getByRole('button')
      expect(button.className).toContain('min-h-[56px]')
    })

    it('has focus ring for keyboard navigation', () => {
      render(<SessionStartButton {...defaultProps} />)
      const button = screen.getByRole('button')
      expect(button.className).toContain('focus:ring-4')
    })

    it('button is of type button', () => {
      render(<SessionStartButton {...defaultProps} />)
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
    })
  })

  describe('design for screen sharing (AC #5)', () => {
    it('uses large text size', () => {
      render(<SessionStartButton {...defaultProps} />)
      const button = screen.getByRole('button')
      expect(button.className).toContain('text-lg')
    })

    it('uses bold font weight', () => {
      render(<SessionStartButton {...defaultProps} />)
      const button = screen.getByRole('button')
      expect(button.className).toContain('font-semibold')
    })

    it('has full width for prominent display', () => {
      render(<SessionStartButton {...defaultProps} />)
      const button = screen.getByRole('button')
      expect(button.className).toContain('w-full')
    })
  })
})
