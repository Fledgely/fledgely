/**
 * Deletion Protection Modal Component Tests.
 *
 * Story 5.3: Child Contribution Capture - AC6
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DeletionProtectionModal } from '../DeletionProtectionModal'

describe('DeletionProtectionModal', () => {
  const mockOnClose = vi.fn()
  const mockOnMarkForDiscussion = vi.fn()
  const childName = 'Emma'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders when open', () => {
      render(
        <DeletionProtectionModal
          isOpen={true}
          onClose={mockOnClose}
          onMarkForDiscussion={mockOnMarkForDiscussion}
          childName={childName}
        />
      )

      expect(screen.getByTestId('deletion-protection-modal')).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      render(
        <DeletionProtectionModal
          isOpen={false}
          onClose={mockOnClose}
          onMarkForDiscussion={mockOnMarkForDiscussion}
          childName={childName}
        />
      )

      expect(screen.queryByTestId('deletion-protection-modal')).not.toBeInTheDocument()
    })

    it('shows child name in title', () => {
      render(
        <DeletionProtectionModal
          isOpen={true}
          onClose={mockOnClose}
          onMarkForDiscussion={mockOnMarkForDiscussion}
          childName={childName}
        />
      )

      expect(screen.getByText(`This Is ${childName}'s Idea`)).toBeInTheDocument()
    })

    it('shows child name in explanation', () => {
      render(
        <DeletionProtectionModal
          isOpen={true}
          onClose={mockOnClose}
          onMarkForDiscussion={mockOnMarkForDiscussion}
          childName={childName}
        />
      )

      expect(screen.getByText(new RegExp(`${childName}'s ideas are protected`))).toBeInTheDocument()
    })
  })

  describe('Alternative Actions', () => {
    it('displays Mark for Discussion option', () => {
      render(
        <DeletionProtectionModal
          isOpen={true}
          onClose={mockOnClose}
          onMarkForDiscussion={mockOnMarkForDiscussion}
          childName={childName}
        />
      )

      // The button and the list both mention "Mark for Discussion"
      const elements = screen.getAllByText(/Mark for Discussion/)
      expect(elements.length).toBeGreaterThan(0)
    })

    it('displays Add a Comment option', () => {
      render(
        <DeletionProtectionModal
          isOpen={true}
          onClose={mockOnClose}
          onMarkForDiscussion={mockOnMarkForDiscussion}
          childName={childName}
        />
      )

      expect(screen.getByText('Add a Comment')).toBeInTheDocument()
    })

    it('displays Suggest a Compromise option', () => {
      render(
        <DeletionProtectionModal
          isOpen={true}
          onClose={mockOnClose}
          onMarkForDiscussion={mockOnMarkForDiscussion}
          childName={childName}
        />
      )

      expect(screen.getByText('Suggest a Compromise')).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('calls onMarkForDiscussion and onClose when mark for discussion is clicked', () => {
      render(
        <DeletionProtectionModal
          isOpen={true}
          onClose={mockOnClose}
          onMarkForDiscussion={mockOnMarkForDiscussion}
          childName={childName}
        />
      )

      fireEvent.click(screen.getByTestId('mark-for-discussion'))

      expect(mockOnMarkForDiscussion).toHaveBeenCalledTimes(1)
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when I Understand button is clicked', () => {
      render(
        <DeletionProtectionModal
          isOpen={true}
          onClose={mockOnClose}
          onMarkForDiscussion={mockOnMarkForDiscussion}
          childName={childName}
        />
      )

      fireEvent.click(screen.getByTestId('close-protection-modal'))

      expect(mockOnClose).toHaveBeenCalledTimes(1)
      expect(mockOnMarkForDiscussion).not.toHaveBeenCalled()
    })

    it('has overlay element for backdrop', () => {
      render(
        <DeletionProtectionModal
          isOpen={true}
          onClose={mockOnClose}
          onMarkForDiscussion={mockOnMarkForDiscussion}
          childName={childName}
        />
      )

      // Radix Dialog handles overlay clicks internally
      // Just verify the overlay is rendered
      expect(screen.getByTestId('deletion-protection-overlay')).toBeInTheDocument()
    })
  })

  describe('Visual Design', () => {
    it('has pink themed header', () => {
      render(
        <DeletionProtectionModal
          isOpen={true}
          onClose={mockOnClose}
          onMarkForDiscussion={mockOnMarkForDiscussion}
          childName={childName}
        />
      )

      const modal = screen.getByTestId('deletion-protection-modal')
      const header = modal.querySelector('.bg-pink-50')
      expect(header).toBeInTheDocument()
    })

    it('has warning icon in header', () => {
      render(
        <DeletionProtectionModal
          isOpen={true}
          onClose={mockOnClose}
          onMarkForDiscussion={mockOnMarkForDiscussion}
          childName={childName}
        />
      )

      const modal = screen.getByTestId('deletion-protection-modal')
      const svg = modal.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has accessible description for screen readers', () => {
      render(
        <DeletionProtectionModal
          isOpen={true}
          onClose={mockOnClose}
          onMarkForDiscussion={mockOnMarkForDiscussion}
          childName={childName}
        />
      )

      expect(
        screen.getByText('Explanation of why child contributions cannot be deleted')
      ).toBeInTheDocument()
    })

    it('mark for discussion button has minimum touch target', () => {
      render(
        <DeletionProtectionModal
          isOpen={true}
          onClose={mockOnClose}
          onMarkForDiscussion={mockOnMarkForDiscussion}
          childName={childName}
        />
      )

      const button = screen.getByTestId('mark-for-discussion')
      expect(button.className).toContain('min-h-[44px]')
    })

    it('close button has minimum touch target', () => {
      render(
        <DeletionProtectionModal
          isOpen={true}
          onClose={mockOnClose}
          onMarkForDiscussion={mockOnMarkForDiscussion}
          childName={childName}
        />
      )

      const button = screen.getByTestId('close-protection-modal')
      expect(button.className).toContain('min-h-[44px]')
    })
  })
})
