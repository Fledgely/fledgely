/**
 * WhatParentsSeeExplainer Tests - Story 19B.5
 *
 * Tests for the "What Parents See" explainer component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WhatParentsSeeExplainer } from './WhatParentsSeeExplainer'

describe('WhatParentsSeeExplainer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Clean up body overflow style
    document.body.style.overflow = ''
  })

  describe('rendering', () => {
    it('does not render when isOpen is false', () => {
      render(<WhatParentsSeeExplainer isOpen={false} onClose={vi.fn()} />)

      expect(screen.queryByTestId('what-parents-see-explainer')).not.toBeInTheDocument()
    })

    it('renders modal when isOpen is true', () => {
      render(<WhatParentsSeeExplainer isOpen={true} onClose={vi.fn()} />)

      expect(screen.getByTestId('what-parents-see-explainer')).toBeInTheDocument()
      expect(screen.getByTestId('explainer-modal')).toBeInTheDocument()
    })

    it('renders title correctly', () => {
      render(<WhatParentsSeeExplainer isOpen={true} onClose={vi.fn()} />)

      expect(screen.getByText('What Your Parents Can See')).toBeInTheDocument()
    })

    it('renders close button', () => {
      render(<WhatParentsSeeExplainer isOpen={true} onClose={vi.fn()} />)

      expect(screen.getByTestId('close-button')).toBeInTheDocument()
      expect(screen.getByLabelText('Close')).toBeInTheDocument()
    })
  })

  describe('AC1: explainer access', () => {
    it('closes when close button is clicked', () => {
      const handleClose = vi.fn()
      render(<WhatParentsSeeExplainer isOpen={true} onClose={handleClose} />)

      fireEvent.click(screen.getByTestId('close-button'))

      expect(handleClose).toHaveBeenCalledTimes(1)
    })

    it('closes when Escape key is pressed', () => {
      const handleClose = vi.fn()
      render(<WhatParentsSeeExplainer isOpen={true} onClose={handleClose} />)

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(handleClose).toHaveBeenCalledTimes(1)
    })

    it('closes when overlay is clicked', () => {
      const handleClose = vi.fn()
      render(<WhatParentsSeeExplainer isOpen={true} onClose={handleClose} />)

      fireEvent.click(screen.getByTestId('what-parents-see-explainer'))

      expect(handleClose).toHaveBeenCalledTimes(1)
    })

    it('does not close when modal content is clicked', () => {
      const handleClose = vi.fn()
      render(<WhatParentsSeeExplainer isOpen={true} onClose={handleClose} />)

      fireEvent.click(screen.getByTestId('explainer-modal'))

      expect(handleClose).not.toHaveBeenCalled()
    })
  })

  describe('AC2: what parents CAN see', () => {
    it('shows "can see" section', () => {
      render(<WhatParentsSeeExplainer isOpen={true} onClose={vi.fn()} />)

      expect(screen.getByTestId('can-see-section')).toBeInTheDocument()
      expect(screen.getByText('✓ Your parents CAN see...')).toBeInTheDocument()
    })

    it('shows screenshots item', () => {
      render(<WhatParentsSeeExplainer isOpen={true} onClose={vi.fn()} />)

      expect(screen.getByTestId('can-see-screenshots')).toBeInTheDocument()
      expect(screen.getByText('Screenshots')).toBeInTheDocument()
      expect(screen.getByText('Pictures of what was on your screen')).toBeInTheDocument()
    })

    it('shows timestamp item', () => {
      render(<WhatParentsSeeExplainer isOpen={true} onClose={vi.fn()} />)

      expect(screen.getByTestId('can-see-when')).toBeInTheDocument()
      expect(screen.getByText('When')).toBeInTheDocument()
      expect(screen.getByText('The date and time each picture was taken')).toBeInTheDocument()
    })

    it('shows websites & apps item', () => {
      render(<WhatParentsSeeExplainer isOpen={true} onClose={vi.fn()} />)

      expect(screen.getByTestId('can-see-websites-&-apps')).toBeInTheDocument()
      expect(screen.getByText('Websites & Apps')).toBeInTheDocument()
      expect(screen.getByText('Which sites and apps you visited')).toBeInTheDocument()
    })

    it('shows device item', () => {
      render(<WhatParentsSeeExplainer isOpen={true} onClose={vi.fn()} />)

      expect(screen.getByTestId('can-see-device')).toBeInTheDocument()
      expect(screen.getByText('Device')).toBeInTheDocument()
      expect(screen.getByText('Which computer or tablet you used')).toBeInTheDocument()
    })
  })

  describe('AC3: what parents CANNOT see', () => {
    it('shows "cannot see" section', () => {
      render(<WhatParentsSeeExplainer isOpen={true} onClose={vi.fn()} />)

      expect(screen.getByTestId('cannot-see-section')).toBeInTheDocument()
      expect(screen.getByText('🔒 Your parents CANNOT see...')).toBeInTheDocument()
    })

    it('shows message content item', () => {
      render(<WhatParentsSeeExplainer isOpen={true} onClose={vi.fn()} />)

      expect(screen.getByTestId('cannot-see-message-content')).toBeInTheDocument()
      expect(screen.getByText('Message Content')).toBeInTheDocument()
      expect(screen.getByText('What your private messages say inside')).toBeInTheDocument()
    })

    it('shows passwords item', () => {
      render(<WhatParentsSeeExplainer isOpen={true} onClose={vi.fn()} />)

      expect(screen.getByTestId('cannot-see-passwords')).toBeInTheDocument()
      expect(screen.getByText('Passwords')).toBeInTheDocument()
      expect(screen.getByText('Any passwords you type in')).toBeInTheDocument()
    })

    it('shows thoughts item', () => {
      render(<WhatParentsSeeExplainer isOpen={true} onClose={vi.fn()} />)

      expect(screen.getByTestId('cannot-see-your-thoughts')).toBeInTheDocument()
      expect(screen.getByText('Your Thoughts')).toBeInTheDocument()
      expect(screen.getByText("What you're thinking or feeling")).toBeInTheDocument()
    })
  })

  describe('AC4: age-appropriate language', () => {
    it('uses friendly introduction', () => {
      render(<WhatParentsSeeExplainer isOpen={true} onClose={vi.fn()} />)

      const intro = screen.getByTestId('intro-text')
      expect(intro).toHaveTextContent(
        'When you agreed to use this device, you and your parents made a deal'
      )
    })

    it('uses simple descriptions for "can see" items', () => {
      render(<WhatParentsSeeExplainer isOpen={true} onClose={vi.fn()} />)

      // Descriptions should be simple and child-friendly
      expect(screen.getByText('Pictures of what was on your screen')).toBeInTheDocument()
      expect(screen.getByText('Which sites and apps you visited')).toBeInTheDocument()
    })

    it('uses reassuring descriptions for "cannot see" items', () => {
      render(<WhatParentsSeeExplainer isOpen={true} onClose={vi.fn()} />)

      // Privacy items should be reassuring
      expect(screen.getByText('What your private messages say inside')).toBeInTheDocument()
      expect(screen.getByText('Any passwords you type in')).toBeInTheDocument()
    })
  })

  describe('AC5: link to family agreement', () => {
    it('shows agreement link when onViewAgreement is provided', () => {
      render(<WhatParentsSeeExplainer isOpen={true} onClose={vi.fn()} onViewAgreement={vi.fn()} />)

      expect(screen.getByTestId('view-agreement-link')).toBeInTheDocument()
      expect(screen.getByText('📄 View My Agreement')).toBeInTheDocument()
    })

    it('does not show agreement link when onViewAgreement is not provided', () => {
      render(<WhatParentsSeeExplainer isOpen={true} onClose={vi.fn()} />)

      expect(screen.queryByTestId('view-agreement-link')).not.toBeInTheDocument()
    })

    it('calls onViewAgreement when link is clicked', () => {
      const handleViewAgreement = vi.fn()
      render(
        <WhatParentsSeeExplainer
          isOpen={true}
          onClose={vi.fn()}
          onViewAgreement={handleViewAgreement}
        />
      )

      fireEvent.click(screen.getByTestId('view-agreement-link'))

      expect(handleViewAgreement).toHaveBeenCalledTimes(1)
    })
  })

  describe('AC6: "Talk to Your Parents" prompt', () => {
    it('shows talk section', () => {
      render(<WhatParentsSeeExplainer isOpen={true} onClose={vi.fn()} />)

      expect(screen.getByTestId('talk-section')).toBeInTheDocument()
      expect(screen.getByText('Have Questions?')).toBeInTheDocument()
    })

    it('shows conversation starters', () => {
      render(<WhatParentsSeeExplainer isOpen={true} onClose={vi.fn()} />)

      expect(screen.getByTestId('conversation-starter-0')).toBeInTheDocument()
      expect(screen.getByTestId('conversation-starter-1')).toBeInTheDocument()
      expect(screen.getByTestId('conversation-starter-2')).toBeInTheDocument()
    })

    it('displays helpful conversation prompts', () => {
      render(<WhatParentsSeeExplainer isOpen={true} onClose={vi.fn()} />)

      expect(
        screen.getByText('"I noticed you can see my screenshots. Can we talk about that?"')
      ).toBeInTheDocument()
      expect(screen.getByText('"I want to understand our agreement better."')).toBeInTheDocument()
      expect(
        screen.getByText('"Is there a way to have more privacy for some things?"')
      ).toBeInTheDocument()
    })

    it('shows encouraging intro text', () => {
      render(<WhatParentsSeeExplainer isOpen={true} onClose={vi.fn()} />)

      expect(
        screen.getByText("It's okay to talk to your parents about this! You could say:")
      ).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has proper modal role and aria attributes', () => {
      render(<WhatParentsSeeExplainer isOpen={true} onClose={vi.fn()} />)

      const overlay = screen.getByTestId('what-parents-see-explainer')
      expect(overlay).toHaveAttribute('role', 'dialog')
      expect(overlay).toHaveAttribute('aria-modal', 'true')
      expect(overlay).toHaveAttribute('aria-labelledby', 'explainer-title')
    })

    it('icons are hidden from screen readers', () => {
      render(<WhatParentsSeeExplainer isOpen={true} onClose={vi.fn()} />)

      const modal = screen.getByTestId('explainer-modal')
      const hiddenIcons = modal.querySelectorAll('[aria-hidden="true"]')
      expect(hiddenIcons.length).toBeGreaterThan(0)
    })

    it('shows focus styling on close button', () => {
      render(<WhatParentsSeeExplainer isOpen={true} onClose={vi.fn()} />)

      const closeButton = screen.getByTestId('close-button')
      fireEvent.focus(closeButton)

      expect(closeButton).toHaveStyle({ outline: '2px solid #ffffff' })
    })

    it('shows focus styling on agreement link', () => {
      render(<WhatParentsSeeExplainer isOpen={true} onClose={vi.fn()} onViewAgreement={vi.fn()} />)

      const agreementLink = screen.getByTestId('view-agreement-link')
      fireEvent.focus(agreementLink)

      expect(agreementLink).toHaveStyle({ outline: '2px solid #0ea5e9' })
    })

    it('prevents body scroll when open', () => {
      render(<WhatParentsSeeExplainer isOpen={true} onClose={vi.fn()} />)

      expect(document.body.style.overflow).toBe('hidden')
    })

    it('restores body scroll when closed', () => {
      const { rerender } = render(<WhatParentsSeeExplainer isOpen={true} onClose={vi.fn()} />)

      expect(document.body.style.overflow).toBe('hidden')

      rerender(<WhatParentsSeeExplainer isOpen={false} onClose={vi.fn()} />)

      expect(document.body.style.overflow).toBe('')
    })
  })

  describe('edge cases', () => {
    it('handles rapid open/close without errors', () => {
      const { rerender } = render(<WhatParentsSeeExplainer isOpen={false} onClose={vi.fn()} />)

      for (let i = 0; i < 5; i++) {
        rerender(<WhatParentsSeeExplainer isOpen={true} onClose={vi.fn()} />)
        rerender(<WhatParentsSeeExplainer isOpen={false} onClose={vi.fn()} />)
      }

      // Should not crash
      expect(screen.queryByTestId('what-parents-see-explainer')).not.toBeInTheDocument()
    })

    it('cleans up event listeners on unmount', () => {
      const handleClose = vi.fn()
      const { unmount } = render(<WhatParentsSeeExplainer isOpen={true} onClose={handleClose} />)

      unmount()

      // Pressing escape after unmount should not call onClose
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(handleClose).not.toHaveBeenCalled()
    })
  })
})
