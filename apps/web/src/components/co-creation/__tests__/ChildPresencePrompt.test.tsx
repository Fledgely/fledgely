/**
 * Unit tests for ChildPresencePrompt Component
 *
 * Story 5.1: Co-Creation Session Initiation - Task 4.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChildPresencePrompt } from '../ChildPresencePrompt'

describe('ChildPresencePrompt', () => {
  const defaultProps = {
    childName: 'Alex',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the component with child name', () => {
      render(<ChildPresencePrompt {...defaultProps} />)
      // Child name appears multiple times (in description and checklist)
      expect(screen.getAllByText(/Alex/).length).toBeGreaterThan(0)
    })

    it('displays the "Time to Sit Together" title', () => {
      render(<ChildPresencePrompt {...defaultProps} />)
      expect(screen.getByText('Time to Sit Together')).toBeInTheDocument()
    })

    it('displays the presence checklist', () => {
      render(<ChildPresencePrompt {...defaultProps} />)
      expect(screen.getByText(/Alex is sitting next to you/)).toBeInTheDocument()
      expect(screen.getByText(/You both can see the screen/)).toBeInTheDocument()
      expect(screen.getByText(/You have 15-30 minutes available/)).toBeInTheDocument()
    })

    it('renders confirm and cancel buttons', () => {
      render(<ChildPresencePrompt {...defaultProps} />)
      expect(screen.getByText("We're Ready!")).toBeInTheDocument()
      expect(screen.getByText('Not Yet')).toBeInTheDocument()
    })

    it('renders with different child names', () => {
      render(<ChildPresencePrompt {...defaultProps} childName="Jordan" />)
      // Name appears multiple times
      expect(screen.getAllByText(/Jordan/).length).toBeGreaterThan(0)
      expect(screen.getByText(/Jordan is sitting next to you/)).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onConfirm when confirm button is clicked', () => {
      const onConfirm = vi.fn()
      render(<ChildPresencePrompt {...defaultProps} onConfirm={onConfirm} />)

      fireEvent.click(screen.getByText("We're Ready!"))
      expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it('calls onCancel when cancel button is clicked', () => {
      const onCancel = vi.fn()
      render(<ChildPresencePrompt {...defaultProps} onCancel={onCancel} />)

      fireEvent.click(screen.getByText('Not Yet'))
      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('disables buttons when isLoading is true', () => {
      render(<ChildPresencePrompt {...defaultProps} isLoading />)

      const confirmButton = screen.getByText('Starting...')
      const cancelButton = screen.getByText('Not Yet')

      expect(confirmButton.closest('button')).toBeDisabled()
      expect(cancelButton).toBeDisabled()
    })

    it('does not call onConfirm when loading', () => {
      const onConfirm = vi.fn()
      render(<ChildPresencePrompt {...defaultProps} onConfirm={onConfirm} isLoading />)

      fireEvent.click(screen.getByText('Starting...'))
      expect(onConfirm).not.toHaveBeenCalled()
    })

    it('does not call onCancel when loading', () => {
      const onCancel = vi.fn()
      render(<ChildPresencePrompt {...defaultProps} onCancel={onCancel} isLoading />)

      fireEvent.click(screen.getByText('Not Yet'))
      expect(onCancel).not.toHaveBeenCalled()
    })
  })

  describe('loading state', () => {
    it('shows loading spinner when isLoading is true', () => {
      render(<ChildPresencePrompt {...defaultProps} isLoading />)
      expect(screen.getByText('Starting...')).toBeInTheDocument()
    })

    it('shows "We\'re Ready!" text when not loading', () => {
      render(<ChildPresencePrompt {...defaultProps} isLoading={false} />)
      expect(screen.getByText("We're Ready!")).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has dialog role', () => {
      render(<ChildPresencePrompt {...defaultProps} />)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('has aria-labelledby pointing to title', () => {
      render(<ChildPresencePrompt {...defaultProps} />)
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby', 'presence-title')
    })

    it('has aria-describedby pointing to description', () => {
      render(<ChildPresencePrompt {...defaultProps} />)
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-describedby', 'presence-description')
    })

    it('has accessible labels on buttons', () => {
      render(<ChildPresencePrompt {...defaultProps} />)
      expect(screen.getByLabelText(/Go back to previous step/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Confirm Alex is present and start session/)).toBeInTheDocument()
    })

    it('buttons have minimum touch target size class', () => {
      render(<ChildPresencePrompt {...defaultProps} />)
      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button.className).toContain('min-h-[44px]')
      })
    })
  })

  describe('design for screen sharing (AC #5)', () => {
    it('uses large text sizes for titles', () => {
      render(<ChildPresencePrompt {...defaultProps} />)
      const title = screen.getByText('Time to Sit Together')
      expect(title.className).toContain('text-2xl')
    })

    it('uses readable text sizes for description', () => {
      render(<ChildPresencePrompt {...defaultProps} />)
      const description = screen.getByText(/Before we start/)
      expect(description.className).toContain('text-lg')
    })
  })
})
