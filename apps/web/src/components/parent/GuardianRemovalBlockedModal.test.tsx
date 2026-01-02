/**
 * Guardian Removal Blocked Modal Tests - Story 3A.6
 *
 * Tests for the modal shown when guardian removal is blocked.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GuardianRemovalBlockedModal } from './GuardianRemovalBlockedModal'

// Mock the service
vi.mock('../../services/guardianRemovalPreventionService', () => ({
  getRemovalBlockedMessage: () => ({
    title: 'Guardian Removal Not Available',
    explanation:
      "In shared custody families, neither parent can remove the other from accessing family monitoring. This protects both parents' right to monitor their children.",
    options: {
      dissolution: {
        title: 'Family Dissolution (mutual agreement)',
        description:
          'If both parents agree to end the family account, you can initiate family dissolution from settings. Both guardians must acknowledge before dissolution proceeds.',
      },
      selfRemoval: {
        title: 'Self-Removal',
        description:
          'If you wish to leave this family, you can remove yourself at any time. The family and other guardian will remain.',
      },
      courtOrder: {
        title: 'Court Order (forced removal)',
        description:
          'If you have a court order changing custody arrangements, contact our safety team. Verified legal documentation can result in forced access changes. This is the only path to remove a legal parent without their consent.',
        contactEmail: 'safety@fledgely.app',
      },
    },
  }),
}))

describe('GuardianRemovalBlockedModal - Story 3A.6', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Reset body overflow
    document.body.style.overflow = ''
  })

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<GuardianRemovalBlockedModal {...defaultProps} />)

      expect(screen.getByTestId('guardian-removal-blocked-modal')).toBeInTheDocument()
    })

    it('should not render when isOpen is false', () => {
      render(<GuardianRemovalBlockedModal {...defaultProps} isOpen={false} />)

      expect(screen.queryByTestId('guardian-removal-blocked-modal')).not.toBeInTheDocument()
    })

    it('should display the title', () => {
      render(<GuardianRemovalBlockedModal {...defaultProps} />)

      expect(screen.getByText('Guardian Removal Not Available')).toBeInTheDocument()
    })

    it('should display the explanation', () => {
      render(<GuardianRemovalBlockedModal {...defaultProps} />)

      expect(screen.getByText(/neither parent can remove/)).toBeInTheDocument()
    })

    it('should include target guardian name in explanation if provided', () => {
      render(<GuardianRemovalBlockedModal {...defaultProps} targetGuardianName="John" />)

      expect(screen.getByText(/You cannot remove John from this family/)).toBeInTheDocument()
    })
  })

  describe('Options Display', () => {
    it('should display dissolution option', () => {
      render(<GuardianRemovalBlockedModal {...defaultProps} />)

      expect(screen.getByTestId('dissolution-option')).toBeInTheDocument()
      expect(screen.getByText('Family Dissolution (mutual agreement)')).toBeInTheDocument()
      expect(screen.getByText(/both parents agree/)).toBeInTheDocument()
    })

    it('should display self-removal option', () => {
      render(<GuardianRemovalBlockedModal {...defaultProps} />)

      expect(screen.getByTestId('self-removal-option')).toBeInTheDocument()
      expect(screen.getByText('Self-Removal')).toBeInTheDocument()
      expect(screen.getByText(/remove yourself/)).toBeInTheDocument()
    })

    it('should display court order option', () => {
      render(<GuardianRemovalBlockedModal {...defaultProps} />)

      expect(screen.getByTestId('court-order-option')).toBeInTheDocument()
      expect(screen.getByText('Court Order (forced removal)')).toBeInTheDocument()
      expect(screen.getByText(/court order changing custody/)).toBeInTheDocument()
    })

    it('should display safety contact email', () => {
      render(<GuardianRemovalBlockedModal {...defaultProps} />)

      const emailLink = screen.getByText(/Contact: safety@fledgely.app/)
      expect(emailLink).toBeInTheDocument()
      expect(emailLink.closest('a')).toHaveAttribute('href', 'mailto:safety@fledgely.app')
    })
  })

  describe('Buttons', () => {
    it('should display close button', () => {
      render(<GuardianRemovalBlockedModal {...defaultProps} />)

      expect(screen.getByTestId('close-button')).toBeInTheDocument()
      expect(screen.getByText('Understood')).toBeInTheDocument()
    })

    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn()
      render(<GuardianRemovalBlockedModal {...defaultProps} onClose={onClose} />)

      fireEvent.click(screen.getByTestId('close-button'))

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should display dissolution button when callback is provided', () => {
      const onNavigateToDissolution = vi.fn()
      render(
        <GuardianRemovalBlockedModal
          {...defaultProps}
          onNavigateToDissolution={onNavigateToDissolution}
        />
      )

      expect(screen.getByTestId('dissolution-button')).toBeInTheDocument()
    })

    it('should call onNavigateToDissolution when dissolution button is clicked', () => {
      const onNavigateToDissolution = vi.fn()
      render(
        <GuardianRemovalBlockedModal
          {...defaultProps}
          onNavigateToDissolution={onNavigateToDissolution}
        />
      )

      fireEvent.click(screen.getByTestId('dissolution-button'))

      expect(onNavigateToDissolution).toHaveBeenCalledTimes(1)
    })

    it('should display self-removal button when callback is provided', () => {
      const onNavigateToSelfRemoval = vi.fn()
      render(
        <GuardianRemovalBlockedModal
          {...defaultProps}
          onNavigateToSelfRemoval={onNavigateToSelfRemoval}
        />
      )

      expect(screen.getByTestId('self-removal-button')).toBeInTheDocument()
    })

    it('should call onNavigateToSelfRemoval when self-removal button is clicked', () => {
      const onNavigateToSelfRemoval = vi.fn()
      render(
        <GuardianRemovalBlockedModal
          {...defaultProps}
          onNavigateToSelfRemoval={onNavigateToSelfRemoval}
        />
      )

      fireEvent.click(screen.getByTestId('self-removal-button'))

      expect(onNavigateToSelfRemoval).toHaveBeenCalledTimes(1)
    })

    it('should not display dissolution button when callback is not provided', () => {
      render(<GuardianRemovalBlockedModal {...defaultProps} />)

      expect(screen.queryByTestId('dissolution-button')).not.toBeInTheDocument()
    })

    it('should not display self-removal button when callback is not provided', () => {
      render(<GuardianRemovalBlockedModal {...defaultProps} />)

      expect(screen.queryByTestId('self-removal-button')).not.toBeInTheDocument()
    })
  })

  describe('Keyboard Accessibility', () => {
    it('should close on Escape key', () => {
      const onClose = vi.fn()
      render(<GuardianRemovalBlockedModal {...defaultProps} onClose={onClose} />)

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should not close on Escape when modal is not open', () => {
      const onClose = vi.fn()
      render(<GuardianRemovalBlockedModal {...defaultProps} isOpen={false} onClose={onClose} />)

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('Overlay Click', () => {
    it('should close when clicking overlay', () => {
      const onClose = vi.fn()
      render(<GuardianRemovalBlockedModal {...defaultProps} onClose={onClose} />)

      const overlay = screen.getByTestId('guardian-removal-blocked-modal')
      fireEvent.click(overlay)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should not close when clicking modal content', () => {
      const onClose = vi.fn()
      render(<GuardianRemovalBlockedModal {...defaultProps} onClose={onClose} />)

      // Click on the title inside the modal
      fireEvent.click(screen.getByText('Guardian Removal Not Available'))

      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('Body Scroll Prevention', () => {
    it('should prevent body scroll when open', () => {
      render(<GuardianRemovalBlockedModal {...defaultProps} />)

      expect(document.body.style.overflow).toBe('hidden')
    })

    it('should restore body scroll when closed', () => {
      const { rerender } = render(<GuardianRemovalBlockedModal {...defaultProps} />)

      expect(document.body.style.overflow).toBe('hidden')

      rerender(<GuardianRemovalBlockedModal {...defaultProps} isOpen={false} />)

      expect(document.body.style.overflow).toBe('')
    })
  })

  describe('Accessibility Attributes', () => {
    it('should have correct role', () => {
      render(<GuardianRemovalBlockedModal {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should have aria-modal attribute', () => {
      render(<GuardianRemovalBlockedModal {...defaultProps} />)

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    })

    it('should have aria-labelledby attribute', () => {
      render(<GuardianRemovalBlockedModal {...defaultProps} />)

      expect(screen.getByRole('dialog')).toHaveAttribute(
        'aria-labelledby',
        'guardian-removal-blocked-title'
      )
    })

    it('should have aria-describedby attribute', () => {
      render(<GuardianRemovalBlockedModal {...defaultProps} />)

      expect(screen.getByRole('dialog')).toHaveAttribute(
        'aria-describedby',
        'guardian-removal-blocked-description'
      )
    })
  })

  describe('Touch Targets', () => {
    it('should have minimum 44px height on close button', () => {
      render(<GuardianRemovalBlockedModal {...defaultProps} />)

      const closeButton = screen.getByTestId('close-button')
      expect(closeButton).toHaveStyle({ minHeight: '44px' })
    })

    it('should have minimum 44px height on secondary buttons', () => {
      render(
        <GuardianRemovalBlockedModal
          {...defaultProps}
          onNavigateToDissolution={vi.fn()}
          onNavigateToSelfRemoval={vi.fn()}
        />
      )

      const dissolutionButton = screen.getByTestId('dissolution-button')
      const selfRemovalButton = screen.getByTestId('self-removal-button')

      expect(dissolutionButton).toHaveStyle({ minHeight: '44px' })
      expect(selfRemovalButton).toHaveStyle({ minHeight: '44px' })
    })
  })
})
