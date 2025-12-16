/**
 * Unit tests for SessionTimeoutWarning Component
 *
 * Story 5.1: Co-Creation Session Initiation - Task 6.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionTimeoutWarning } from '../SessionTimeoutWarning'

describe('SessionTimeoutWarning', () => {
  const defaultProps = {
    show: true,
    remainingFormatted: '4:30',
    remainingMs: 4 * 60 * 1000 + 30 * 1000, // 4:30 in ms
    onContinue: vi.fn(),
    onSaveAndExit: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // RENDERING TESTS
  // ============================================
  describe('rendering', () => {
    it('renders dialog when show is true', () => {
      render(<SessionTimeoutWarning {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Session Timeout Warning')).toBeInTheDocument()
    })

    it('does not render dialog when show is false', () => {
      render(<SessionTimeoutWarning {...defaultProps} show={false} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('displays the formatted remaining time', () => {
      render(<SessionTimeoutWarning {...defaultProps} />)

      expect(screen.getByText('4:30')).toBeInTheDocument()
    })

    it('displays description about timeout', () => {
      render(<SessionTimeoutWarning {...defaultProps} />)

      expect(
        screen.getByText(/session will time out due to inactivity/i)
      ).toBeInTheDocument()
    })

    it('renders Continue Session button', () => {
      render(<SessionTimeoutWarning {...defaultProps} />)

      expect(
        screen.getByRole('button', { name: /continue session/i })
      ).toBeInTheDocument()
    })

    it('renders Save & Exit button', () => {
      render(<SessionTimeoutWarning {...defaultProps} />)

      expect(
        screen.getByRole('button', { name: /save & exit/i })
      ).toBeInTheDocument()
    })

    it('displays Clock icon', () => {
      render(<SessionTimeoutWarning {...defaultProps} />)

      // The title contains the icon
      const title = screen.getByText('Session Timeout Warning')
      expect(title.parentElement?.querySelector('svg')).toBeInTheDocument()
    })
  })

  // ============================================
  // URGENCY LEVEL TESTS
  // ============================================
  describe('urgency levels', () => {
    it('shows normal state when more than 2 minutes remaining', () => {
      render(
        <SessionTimeoutWarning
          {...defaultProps}
          remainingMs={3 * 60 * 1000} // 3 minutes
          remainingFormatted="3:00"
        />
      )

      const countdown = screen.getByText('3:00')
      expect(countdown).not.toHaveClass('text-destructive')
      expect(countdown).not.toHaveClass('animate-pulse')
    })

    it('shows warning state when between 1-2 minutes remaining', () => {
      render(
        <SessionTimeoutWarning
          {...defaultProps}
          remainingMs={90 * 1000} // 1.5 minutes
          remainingFormatted="1:30"
        />
      )

      const countdown = screen.getByText('1:30')
      expect(countdown).toHaveClass('text-orange-600')
    })

    it('shows critical state when less than 1 minute remaining', () => {
      render(
        <SessionTimeoutWarning
          {...defaultProps}
          remainingMs={45 * 1000} // 45 seconds
          remainingFormatted="0:45"
        />
      )

      const countdown = screen.getByText('0:45')
      expect(countdown).toHaveClass('text-destructive')
      expect(countdown).toHaveClass('animate-pulse')
    })

    it('displays critical warning message when under 1 minute', () => {
      render(
        <SessionTimeoutWarning
          {...defaultProps}
          remainingMs={30 * 1000} // 30 seconds
          remainingFormatted="0:30"
        />
      )

      expect(screen.getByText(/session will expire soon/i)).toBeInTheDocument()
    })

    it('does not display critical message when more than 1 minute', () => {
      render(
        <SessionTimeoutWarning
          {...defaultProps}
          remainingMs={2 * 60 * 1000} // 2 minutes
          remainingFormatted="2:00"
        />
      )

      expect(
        screen.queryByText(/session will expire soon/i)
      ).not.toBeInTheDocument()
    })
  })

  // ============================================
  // INTERACTION TESTS
  // ============================================
  describe('interactions', () => {
    it('calls onContinue when Continue Session is clicked', async () => {
      const user = userEvent.setup()
      render(<SessionTimeoutWarning {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /continue session/i }))

      expect(defaultProps.onContinue).toHaveBeenCalledTimes(1)
    })

    it('calls onSaveAndExit when Save & Exit is clicked', async () => {
      const user = userEvent.setup()
      render(<SessionTimeoutWarning {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /save & exit/i }))

      expect(defaultProps.onSaveAndExit).toHaveBeenCalledTimes(1)
    })

    it('calls onContinue when dialog is closed via escape', () => {
      render(<SessionTimeoutWarning {...defaultProps} />)

      const dialog = screen.getByRole('dialog')
      fireEvent.keyDown(dialog, { key: 'Escape' })

      expect(defaultProps.onContinue).toHaveBeenCalled()
    })

    it('calls onContinue when Enter key is pressed', () => {
      render(<SessionTimeoutWarning {...defaultProps} />)

      fireEvent.keyDown(window, { key: 'Enter' })

      expect(defaultProps.onContinue).toHaveBeenCalled()
    })

    it('does not call onContinue when Shift+Enter is pressed', () => {
      render(<SessionTimeoutWarning {...defaultProps} />)

      fireEvent.keyDown(window, { key: 'Enter', shiftKey: true })

      expect(defaultProps.onContinue).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // LOADING STATE TESTS
  // ============================================
  describe('loading states', () => {
    it('shows Saving... text when isSaving is true', () => {
      render(<SessionTimeoutWarning {...defaultProps} isSaving={true} />)

      expect(screen.getByText('Saving...')).toBeInTheDocument()
    })

    it('disables Save & Exit button when saving', () => {
      render(<SessionTimeoutWarning {...defaultProps} isSaving={true} />)

      const saveButton = screen.getByRole('button', { name: /saving/i })
      expect(saveButton).toBeDisabled()
    })

    it('keeps Continue Session button enabled when saving', () => {
      render(<SessionTimeoutWarning {...defaultProps} isSaving={true} />)

      const continueButton = screen.getByRole('button', {
        name: /continue session/i,
      })
      expect(continueButton).not.toBeDisabled()
    })
  })

  // ============================================
  // ACCESSIBILITY TESTS
  // ============================================
  describe('accessibility', () => {
    it('has proper dialog role', () => {
      render(<SessionTimeoutWarning {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('has accessible title', () => {
      render(<SessionTimeoutWarning {...defaultProps} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAccessibleName('Session Timeout Warning')
    })

    it('has timer role for countdown', () => {
      render(<SessionTimeoutWarning {...defaultProps} />)

      expect(screen.getByRole('timer')).toBeInTheDocument()
    })

    it('has aria-live for countdown updates', () => {
      render(<SessionTimeoutWarning {...defaultProps} />)

      const timer = screen.getByRole('timer')
      expect(timer).toHaveAttribute('aria-live', 'polite')
    })

    it('Continue Session button has autoFocus', () => {
      render(<SessionTimeoutWarning {...defaultProps} />)

      const continueButton = screen.getByRole('button', {
        name: /continue session/i,
      })
      expect(continueButton).toHaveFocus()
    })

    it('buttons have minimum touch target size', () => {
      render(<SessionTimeoutWarning {...defaultProps} />)

      const continueButton = screen.getByRole('button', {
        name: /continue session/i,
      })
      const saveButton = screen.getByRole('button', { name: /save & exit/i })

      expect(continueButton).toHaveClass('min-h-[44px]')
      expect(continueButton).toHaveClass('min-w-[44px]')
      expect(saveButton).toHaveClass('min-h-[44px]')
      expect(saveButton).toHaveClass('min-w-[44px]')
    })

    it('has screen reader descriptions for buttons', () => {
      render(<SessionTimeoutWarning {...defaultProps} />)

      expect(
        screen.getByText(/continue working on your agreement/i)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/save your progress and pause the session/i)
      ).toBeInTheDocument()
    })

    it('countdown has accessible label', () => {
      render(<SessionTimeoutWarning {...defaultProps} />)

      const countdown = screen.getByText('4:30')
      expect(countdown).toHaveAttribute('aria-label', '4:30 remaining')
    })
  })

  // ============================================
  // CONTENT TESTS
  // ============================================
  describe('content', () => {
    it('explains Continue Session action', () => {
      render(<SessionTimeoutWarning {...defaultProps} />)

      expect(
        screen.getByText(/keep working on your agreement/i)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/activity will reset the timer/i)
      ).toBeInTheDocument()
    })

    it('explains Save & Exit action', () => {
      render(<SessionTimeoutWarning {...defaultProps} />)

      expect(screen.getByText(/progress will be saved/i)).toBeInTheDocument()
      expect(
        screen.getByText(/resume this session later/i)
      ).toBeInTheDocument()
    })

    it('displays Time remaining label', () => {
      render(<SessionTimeoutWarning {...defaultProps} />)

      expect(screen.getByText('Time remaining:')).toBeInTheDocument()
    })
  })

  // ============================================
  // EDGE CASE TESTS
  // ============================================
  describe('edge cases', () => {
    it('handles zero remaining time', () => {
      render(
        <SessionTimeoutWarning
          {...defaultProps}
          remainingMs={0}
          remainingFormatted="0:00"
        />
      )

      expect(screen.getByText('0:00')).toBeInTheDocument()
      expect(screen.getByText(/session will expire soon/i)).toBeInTheDocument()
    })

    it('handles very long remaining time', () => {
      render(
        <SessionTimeoutWarning
          {...defaultProps}
          remainingMs={10 * 60 * 1000} // 10 minutes
          remainingFormatted="10:00"
        />
      )

      expect(screen.getByText('10:00')).toBeInTheDocument()
    })

    it('updates display when props change', () => {
      const { rerender } = render(
        <SessionTimeoutWarning
          {...defaultProps}
          remainingFormatted="5:00"
          remainingMs={5 * 60 * 1000}
        />
      )

      expect(screen.getByText('5:00')).toBeInTheDocument()

      rerender(
        <SessionTimeoutWarning
          {...defaultProps}
          remainingFormatted="4:59"
          remainingMs={4 * 60 * 1000 + 59 * 1000}
        />
      )

      expect(screen.getByText('4:59')).toBeInTheDocument()
    })

    it('handles rapid button clicks', async () => {
      const user = userEvent.setup()
      render(<SessionTimeoutWarning {...defaultProps} />)

      const continueButton = screen.getByRole('button', {
        name: /continue session/i,
      })

      // Rapid clicks
      await user.click(continueButton)
      await user.click(continueButton)
      await user.click(continueButton)

      expect(defaultProps.onContinue).toHaveBeenCalledTimes(3)
    })
  })
})
