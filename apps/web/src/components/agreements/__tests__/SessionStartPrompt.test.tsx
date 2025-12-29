/**
 * SessionStartPrompt Component Tests.
 *
 * Story 5.1: Co-Creation Session Initiation - AC1, AC5
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SessionStartPrompt } from '../SessionStartPrompt'

describe('SessionStartPrompt', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    childName: 'Alex',
    templateName: 'Balanced 11-13',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AC1: Session Prompt for Child Presence', () => {
    it('displays prompt asking to confirm child is present', () => {
      render(<SessionStartPrompt {...defaultProps} />)

      expect(screen.getByText('Ready to Create Together?')).toBeInTheDocument()
      // Check for child name in the description - multiple instances exist
      expect(screen.getAllByText(/Alex/).length).toBeGreaterThan(0)
    })

    it('explains what co-creation means', () => {
      render(<SessionStartPrompt {...defaultProps} />)

      expect(screen.getByText('What is Co-Creation?')).toBeInTheDocument()
      expect(
        screen.getByText(/You and Alex will work together to build your family/)
      ).toBeInTheDocument()
    })

    it('displays preparation checklist', () => {
      render(<SessionStartPrompt {...defaultProps} />)

      expect(screen.getByText(/Sit together where you can both see the screen/)).toBeInTheDocument()
      expect(screen.getByText(/Set aside 15-30 minutes/)).toBeInTheDocument()
      expect(screen.getByText(/You can pause and come back anytime/)).toBeInTheDocument()
    })

    it('shows template name when provided', () => {
      render(<SessionStartPrompt {...defaultProps} />)

      expect(screen.getByText(/Using template:/)).toBeInTheDocument()
      expect(screen.getByText('Balanced 11-13')).toBeInTheDocument()
    })

    it('does not show template section when no template', () => {
      render(<SessionStartPrompt {...defaultProps} templateName={undefined} />)

      expect(screen.queryByText(/Using template:/)).not.toBeInTheDocument()
    })
  })

  describe('AC5: Screen Sharing Design', () => {
    it('renders modal with proper structure', () => {
      render(<SessionStartPrompt {...defaultProps} />)

      expect(screen.getByTestId('session-start-prompt')).toBeInTheDocument()
    })

    it('has readable font sizes for screen sharing', () => {
      render(<SessionStartPrompt {...defaultProps} />)

      const title = screen.getByText('Ready to Create Together?')
      expect(title).toHaveClass('text-xl')
    })
  })

  describe('Accessibility', () => {
    it('confirm button meets minimum touch target size', () => {
      render(<SessionStartPrompt {...defaultProps} />)

      const confirmButton = screen.getByTestId('confirm-start-session')
      expect(confirmButton).toHaveClass('min-h-[44px]')
    })

    it('cancel button meets minimum touch target size', () => {
      render(<SessionStartPrompt {...defaultProps} />)

      const cancelButton = screen.getByTestId('cancel-start-session')
      expect(cancelButton).toHaveClass('min-h-[44px]')
    })

    it('has proper focus indicators on buttons', () => {
      render(<SessionStartPrompt {...defaultProps} />)

      const confirmButton = screen.getByTestId('confirm-start-session')
      expect(confirmButton).toHaveClass('focus:ring-2', 'focus:ring-primary')
    })
  })

  describe('Interactions', () => {
    it('calls onConfirm when confirm button is clicked', () => {
      render(<SessionStartPrompt {...defaultProps} />)

      fireEvent.click(screen.getByTestId('confirm-start-session'))

      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1)
    })

    it('includes child name in confirm button text', () => {
      render(<SessionStartPrompt {...defaultProps} />)

      const confirmButton = screen.getByTestId('confirm-start-session')
      expect(confirmButton).toHaveTextContent(/Yes,.*Alex.*is with me/)
    })
  })
})
