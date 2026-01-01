/**
 * ProposalResponseForm Component Tests - Story 34.3
 *
 * Tests for the response form with Accept/Decline/Counter buttons.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProposalResponseForm } from './ProposalResponseForm'

describe('ProposalResponseForm - Story 34.3', () => {
  const defaultProps = {
    onAccept: vi.fn(),
    onDecline: vi.fn(),
    onCounter: vi.fn(),
    isSubmitting: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('response buttons - AC2', () => {
    it('should render Accept button', () => {
      render(<ProposalResponseForm {...defaultProps} />)

      expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument()
    })

    it('should render Decline button', () => {
      render(<ProposalResponseForm {...defaultProps} />)

      expect(screen.getByRole('button', { name: /decline/i })).toBeInTheDocument()
    })

    it('should render Counter-propose button', () => {
      render(<ProposalResponseForm {...defaultProps} />)

      expect(screen.getByRole('button', { name: /counter/i })).toBeInTheDocument()
    })

    it('should disable all buttons when isSubmitting', () => {
      render(<ProposalResponseForm {...defaultProps} isSubmitting={true} />)

      expect(screen.getByRole('button', { name: /accept/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /decline/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /counter/i })).toBeDisabled()
    })
  })

  describe('comment textarea - AC4', () => {
    it('should render comment textarea', () => {
      render(<ProposalResponseForm {...defaultProps} />)

      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('should show character limit', () => {
      render(<ProposalResponseForm {...defaultProps} />)

      expect(screen.getByText(/500/)).toBeInTheDocument()
    })

    it('should update character count as user types', () => {
      render(<ProposalResponseForm {...defaultProps} />)

      const textarea = screen.getByRole('textbox')
      fireEvent.change(textarea, { target: { value: 'Hello' } })

      expect(screen.getByText(/5.*500/)).toBeInTheDocument()
    })

    it('should limit input to 500 characters', () => {
      render(<ProposalResponseForm {...defaultProps} />)

      const textarea = screen.getByRole('textbox')
      const longText = 'a'.repeat(550)
      fireEvent.change(textarea, { target: { value: longText } })

      expect(textarea).toHaveValue('a'.repeat(500))
    })

    it('should have placeholder text', () => {
      render(<ProposalResponseForm {...defaultProps} />)

      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveAttribute('placeholder')
    })
  })

  describe('accept flow', () => {
    it('should call onAccept with comment when confirmed', () => {
      render(<ProposalResponseForm {...defaultProps} />)

      const textarea = screen.getByRole('textbox')
      fireEvent.change(textarea, { target: { value: 'Sounds good!' } })

      const acceptButton = screen.getByRole('button', { name: /accept/i })
      fireEvent.click(acceptButton)

      // Should show confirmation
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      // Confirm the action
      const confirmButton = screen.getByRole('button', { name: /yes/i })
      fireEvent.click(confirmButton)

      expect(defaultProps.onAccept).toHaveBeenCalledWith('Sounds good!')
    })

    it('should allow accept without comment', () => {
      render(<ProposalResponseForm {...defaultProps} />)

      const acceptButton = screen.getByRole('button', { name: /accept/i })
      fireEvent.click(acceptButton)

      const confirmButton = screen.getByRole('button', { name: /yes/i })
      fireEvent.click(confirmButton)

      expect(defaultProps.onAccept).toHaveBeenCalledWith('')
    })
  })

  describe('decline flow', () => {
    it('should require comment for decline', () => {
      render(<ProposalResponseForm {...defaultProps} />)

      const declineButton = screen.getByRole('button', { name: /decline/i })
      fireEvent.click(declineButton)

      // Should show validation message
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/comment.*required/i)).toBeInTheDocument()
    })

    it('should call onDecline with comment when provided', () => {
      render(<ProposalResponseForm {...defaultProps} />)

      const textarea = screen.getByRole('textbox')
      fireEvent.change(textarea, { target: { value: 'Not right now' } })

      const declineButton = screen.getByRole('button', { name: /decline/i })
      fireEvent.click(declineButton)

      const confirmButton = screen.getByRole('button', { name: /yes/i })
      fireEvent.click(confirmButton)

      expect(defaultProps.onDecline).toHaveBeenCalledWith('Not right now')
    })
  })

  describe('counter-propose flow', () => {
    it('should show confirmation before counter-proposing', () => {
      render(<ProposalResponseForm {...defaultProps} />)

      const textarea = screen.getByRole('textbox')
      fireEvent.change(textarea, { target: { value: 'How about a compromise?' } })

      const counterButton = screen.getByRole('button', { name: /counter/i })
      fireEvent.click(counterButton)

      // Should show confirmation dialog
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText(/counter-proposal/i)).toBeInTheDocument()
    })

    it('should call onCounter when confirmed with comment', () => {
      render(<ProposalResponseForm {...defaultProps} />)

      const textarea = screen.getByRole('textbox')
      fireEvent.change(textarea, { target: { value: 'How about a compromise?' } })

      const counterButton = screen.getByRole('button', { name: /counter/i })
      fireEvent.click(counterButton)

      // Confirm the action
      const confirmButton = screen.getByRole('button', { name: /yes/i })
      fireEvent.click(confirmButton)

      expect(defaultProps.onCounter).toHaveBeenCalledWith('How about a compromise?')
    })

    it('should require comment for counter-propose', () => {
      render(<ProposalResponseForm {...defaultProps} />)

      const counterButton = screen.getByRole('button', { name: /counter/i })
      fireEvent.click(counterButton)

      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/comment.*required/i)).toBeInTheDocument()
    })
  })

  describe('confirmation dialog - AC2', () => {
    it('should show confirmation before accepting', () => {
      render(<ProposalResponseForm {...defaultProps} />)

      const acceptButton = screen.getByRole('button', { name: /accept/i })
      fireEvent.click(acceptButton)

      expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
    })

    it('should allow canceling confirmation', () => {
      render(<ProposalResponseForm {...defaultProps} />)

      const acceptButton = screen.getByRole('button', { name: /accept/i })
      fireEvent.click(acceptButton)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)

      expect(defaultProps.onAccept).not.toHaveBeenCalled()
    })
  })

  describe('positive framing suggestions', () => {
    it('should show positive framing hints', () => {
      render(<ProposalResponseForm {...defaultProps} />)

      expect(screen.getByText(/tips/i)).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have accessible button labels', () => {
      render(<ProposalResponseForm {...defaultProps} />)

      expect(screen.getByRole('button', { name: /accept/i })).toHaveAccessibleName()
      expect(screen.getByRole('button', { name: /decline/i })).toHaveAccessibleName()
      expect(screen.getByRole('button', { name: /counter/i })).toHaveAccessibleName()
    })

    it('should have label for textarea', () => {
      render(<ProposalResponseForm {...defaultProps} />)

      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveAccessibleName()
    })
  })
})
