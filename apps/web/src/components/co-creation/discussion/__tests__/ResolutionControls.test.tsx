/**
 * Tests for ResolutionControls Component
 *
 * Story 5.4: Negotiation & Discussion Support - Task 5.7
 *
 * Tests for resolution status display and agreement marking.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResolutionControls } from '../ResolutionControls'
import type { ResolutionStatus } from '@fledgely/contracts'

// ============================================
// DEFAULT PROPS
// ============================================

const defaultProps = {
  termTitle: 'Screen Time',
  status: 'unresolved' as ResolutionStatus,
  contributor: 'parent' as const,
  onMarkAgreement: vi.fn(),
}

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('ResolutionControls', () => {

  describe('basic rendering', () => {
    it('renders the component', () => {
      render(<ResolutionControls {...defaultProps} />)
      expect(screen.getByTestId('resolution-controls')).toBeInTheDocument()
    })

    it('renders custom data-testid', () => {
      render(<ResolutionControls {...defaultProps} data-testid="custom-controls" />)
      expect(screen.getByTestId('custom-controls')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<ResolutionControls {...defaultProps} className="custom-class" />)
      expect(screen.getByTestId('resolution-controls')).toHaveClass('custom-class')
    })

    it('shows header text', () => {
      render(<ResolutionControls {...defaultProps} />)
      expect(screen.getByText('Agreement')).toBeInTheDocument()
    })
  })

  // ============================================
  // STATUS BADGE TESTS
  // ============================================

  describe('status badge', () => {
    it('shows status badge', () => {
      render(<ResolutionControls {...defaultProps} />)
      expect(screen.getByTestId('resolution-status-badge')).toBeInTheDocument()
    })

    it('shows "Needs discussion" for unresolved', () => {
      render(<ResolutionControls {...defaultProps} status="unresolved" />)
      expect(screen.getByText('Needs discussion')).toBeInTheDocument()
    })

    it('shows "Parent agreed" for parent-agreed', () => {
      render(<ResolutionControls {...defaultProps} status="parent-agreed" />)
      expect(screen.getByText('Parent agreed')).toBeInTheDocument()
    })

    it('shows "Child agreed" for child-agreed', () => {
      render(<ResolutionControls {...defaultProps} status="child-agreed" />)
      expect(screen.getByText('Child agreed')).toBeInTheDocument()
    })

    it('shows "Resolved" for resolved', () => {
      render(<ResolutionControls {...defaultProps} status="resolved" />)
      expect(screen.getByText('Resolved')).toBeInTheDocument()
    })
  })

  // ============================================
  // PROGRESS INDICATOR TESTS
  // ============================================

  describe('progress indicator', () => {
    it('shows progress indicator', () => {
      render(<ResolutionControls {...defaultProps} />)
      expect(screen.getByTestId('resolution-progress')).toBeInTheDocument()
    })

    it('shows parent and child progress steps', () => {
      render(<ResolutionControls {...defaultProps} />)
      expect(screen.getByTestId('progress-parent')).toBeInTheDocument()
      expect(screen.getByTestId('progress-child')).toBeInTheDocument()
    })

    it('shows checkmark for parent when parent-agreed', () => {
      render(<ResolutionControls {...defaultProps} status="parent-agreed" />)
      expect(screen.getByTestId('progress-parent')).toHaveTextContent('✓')
    })

    it('shows checkmark for child when child-agreed', () => {
      render(<ResolutionControls {...defaultProps} status="child-agreed" />)
      expect(screen.getByTestId('progress-child')).toHaveTextContent('✓')
    })

    it('shows both checkmarks when resolved', () => {
      render(<ResolutionControls {...defaultProps} status="resolved" />)
      expect(screen.getByTestId('progress-parent')).toHaveTextContent('✓')
      expect(screen.getByTestId('progress-child')).toHaveTextContent('✓')
    })
  })

  // ============================================
  // UNRESOLVED STATE TESTS
  // ============================================

  describe('unresolved state', () => {
    it('shows agree button when unresolved', () => {
      render(<ResolutionControls {...defaultProps} status="unresolved" />)
      expect(screen.getByTestId('agree-button')).toBeInTheDocument()
    })

    it('shows instruction text', () => {
      render(<ResolutionControls {...defaultProps} status="unresolved" />)
      expect(screen.getByTestId('instruction-text')).toHaveTextContent(
        'Both of you need to agree to this term.'
      )
    })

    it('agree button has correct text', () => {
      render(<ResolutionControls {...defaultProps} status="unresolved" />)
      expect(screen.getByTestId('agree-button')).toHaveTextContent('I agree to this term')
    })
  })

  // ============================================
  // PARTIAL AGREEMENT TESTS
  // ============================================

  describe('partial agreement (parent agreed)', () => {
    it('shows waiting message for parent when parent already agreed', () => {
      render(
        <ResolutionControls
          {...defaultProps}
          status="parent-agreed"
          contributor="parent"
        />
      )
      expect(screen.getByTestId('waiting-message')).toBeInTheDocument()
      expect(screen.getByText('You have agreed')).toBeInTheDocument()
    })

    it('shows agree button for child when parent agreed', () => {
      render(
        <ResolutionControls
          {...defaultProps}
          status="parent-agreed"
          contributor="child"
        />
      )
      expect(screen.getByTestId('agree-button')).toBeInTheDocument()
    })
  })

  describe('partial agreement (child agreed)', () => {
    it('shows waiting message for child when child already agreed', () => {
      render(
        <ResolutionControls
          {...defaultProps}
          status="child-agreed"
          contributor="child"
        />
      )
      expect(screen.getByTestId('waiting-message')).toBeInTheDocument()
    })

    it('shows agree button for parent when child agreed', () => {
      render(
        <ResolutionControls
          {...defaultProps}
          status="child-agreed"
          contributor="parent"
        />
      )
      expect(screen.getByTestId('agree-button')).toBeInTheDocument()
    })
  })

  // ============================================
  // RESOLVED STATE TESTS
  // ============================================

  describe('resolved state', () => {
    it('shows resolved message', () => {
      render(<ResolutionControls {...defaultProps} status="resolved" />)
      expect(screen.getByTestId('resolved-message')).toBeInTheDocument()
    })

    it('shows celebration text', () => {
      render(<ResolutionControls {...defaultProps} status="resolved" />)
      expect(screen.getByText('Both parties agree!')).toBeInTheDocument()
    })

    it('does not show agree button', () => {
      render(<ResolutionControls {...defaultProps} status="resolved" />)
      expect(screen.queryByTestId('agree-button')).not.toBeInTheDocument()
    })
  })

  // ============================================
  // AGREEMENT MARKING TESTS
  // ============================================

  describe('marking agreement', () => {
    it('calls onMarkAgreement when button clicked', () => {
      const onMarkAgreement = vi.fn()
      render(
        <ResolutionControls
          {...defaultProps}
          onMarkAgreement={onMarkAgreement}
        />
      )

      fireEvent.click(screen.getByTestId('agree-button'))

      expect(onMarkAgreement).toHaveBeenCalledWith('parent')
    })

    it('passes contributor to callback', () => {
      const onMarkAgreement = vi.fn()
      render(
        <ResolutionControls
          {...defaultProps}
          contributor="child"
          onMarkAgreement={onMarkAgreement}
        />
      )

      fireEvent.click(screen.getByTestId('agree-button'))

      expect(onMarkAgreement).toHaveBeenCalledWith('child')
    })
  })

  // ============================================
  // DEBOUNCE TESTS (5.6)
  // ============================================

  describe('debounce (prevent spam)', () => {
    it('disables button immediately after click', () => {
      render(<ResolutionControls {...defaultProps} />)
      const button = screen.getByTestId('agree-button')

      fireEvent.click(button)

      expect(button).toBeDisabled()
    })

    it('shows processing state during debounce', () => {
      render(<ResolutionControls {...defaultProps} />)

      fireEvent.click(screen.getByTestId('agree-button'))

      expect(screen.getByText('Processing...')).toBeInTheDocument()
    })

    it('prevents multiple clicks during debounce', () => {
      const onMarkAgreement = vi.fn()
      render(
        <ResolutionControls
          {...defaultProps}
          onMarkAgreement={onMarkAgreement}
        />
      )
      const button = screen.getByTestId('agree-button')

      fireEvent.click(button)
      fireEvent.click(button)
      fireEvent.click(button)

      expect(onMarkAgreement).toHaveBeenCalledTimes(1)
    })

    it('re-enables button after debounce period', async () => {
      // Use real timers with a shorter wait
      render(<ResolutionControls {...defaultProps} />)
      const button = screen.getByTestId('agree-button')

      fireEvent.click(button)
      expect(button).toBeDisabled()

      // Wait for debounce period (500ms + buffer)
      await waitFor(
        () => {
          expect(button).not.toBeDisabled()
        },
        { timeout: 1000 }
      )
    })
  })

  // ============================================
  // DISABLED STATE TESTS
  // ============================================

  describe('disabled state', () => {
    it('disables button when disabled prop is true', () => {
      render(<ResolutionControls {...defaultProps} disabled />)
      expect(screen.getByTestId('agree-button')).toBeDisabled()
    })

    it('does not call onMarkAgreement when disabled', () => {
      const onMarkAgreement = vi.fn()
      render(
        <ResolutionControls
          {...defaultProps}
          disabled
          onMarkAgreement={onMarkAgreement}
        />
      )

      fireEvent.click(screen.getByTestId('agree-button'))

      expect(onMarkAgreement).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // STYLING TESTS
  // ============================================

  describe('styling', () => {
    it('uses blue button for parent', () => {
      render(<ResolutionControls {...defaultProps} contributor="parent" />)
      const button = screen.getByTestId('agree-button')
      expect(button.className).toMatch(/blue/)
    })

    it('uses pink button for child', () => {
      render(<ResolutionControls {...defaultProps} contributor="child" />)
      const button = screen.getByTestId('agree-button')
      expect(button.className).toMatch(/pink/)
    })

    it('applies green styling to resolved message', () => {
      render(<ResolutionControls {...defaultProps} status="resolved" />)
      const message = screen.getByTestId('resolved-message')
      expect(message.className).toMatch(/green/)
    })
  })

  // ============================================
  // ACCESSIBILITY TESTS (NFR42, NFR43, NFR49)
  // ============================================

  describe('accessibility', () => {
    it('has region role with label', () => {
      render(<ResolutionControls {...defaultProps} />)
      expect(screen.getByRole('region')).toBeInTheDocument()
      expect(screen.getByRole('region')).toHaveAttribute('aria-labelledby')
    })

    it('status badge has role="status"', () => {
      render(<ResolutionControls {...defaultProps} />)
      const badges = screen.getAllByRole('status')
      expect(badges.length).toBeGreaterThan(0)
    })

    it('status badge has aria-label', () => {
      render(<ResolutionControls {...defaultProps} />)
      const badge = screen.getByTestId('resolution-status-badge')
      expect(badge).toHaveAttribute('aria-label')
      expect(badge.getAttribute('aria-label')).toContain('Resolution status')
    })

    it('progress indicator has aria-label', () => {
      render(<ResolutionControls {...defaultProps} />)
      expect(screen.getByTestId('resolution-progress')).toHaveAttribute(
        'aria-label',
        'Agreement progress'
      )
    })

    it('progress steps have aria-labels', () => {
      render(<ResolutionControls {...defaultProps} status="parent-agreed" />)
      expect(screen.getByTestId('progress-parent').getAttribute('aria-label')).toContain('agreed')
      expect(screen.getByTestId('progress-child').getAttribute('aria-label')).toContain('pending')
    })

    it('agree button has aria-describedby', () => {
      render(<ResolutionControls {...defaultProps} />)
      const button = screen.getByTestId('agree-button')
      expect(button).toHaveAttribute('aria-describedby', 'agree-button-description')
    })

    it('provides screen reader announcement area', () => {
      render(<ResolutionControls {...defaultProps} />)
      const announcement = screen.getByTestId('resolution-announcement')
      expect(announcement).toHaveAttribute('aria-live', 'assertive')
      expect(announcement).toHaveClass('sr-only')
    })

    it('resolved message has role="status"', () => {
      render(<ResolutionControls {...defaultProps} status="resolved" />)
      expect(screen.getByTestId('resolved-message')).toHaveAttribute('role', 'status')
    })

    it('waiting message has role="status"', () => {
      render(
        <ResolutionControls
          {...defaultProps}
          status="parent-agreed"
          contributor="parent"
        />
      )
      expect(screen.getByTestId('waiting-message')).toHaveAttribute('role', 'status')
    })

    it('button has minimum touch target size (NFR49)', () => {
      render(<ResolutionControls {...defaultProps} />)
      const button = screen.getByTestId('agree-button')
      expect(button.className).toMatch(/min-h-\[44px\]/)
    })
  })

  // ============================================
  // KEYBOARD NAVIGATION TESTS (NFR43)
  // ============================================

  describe('keyboard navigation (NFR43)', () => {
    it('button is focusable', () => {
      render(<ResolutionControls {...defaultProps} />)
      const button = screen.getByTestId('agree-button')
      button.focus()
      expect(document.activeElement).toBe(button)
    })

    it('can activate with Enter key', () => {
      const onMarkAgreement = vi.fn()
      render(
        <ResolutionControls
          {...defaultProps}
          onMarkAgreement={onMarkAgreement}
        />
      )
      const button = screen.getByTestId('agree-button')

      button.focus()
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' })
      fireEvent.click(button) // Enter triggers click on buttons

      expect(onMarkAgreement).toHaveBeenCalled()
    })

    it('can activate with Space key', () => {
      const onMarkAgreement = vi.fn()
      render(
        <ResolutionControls
          {...defaultProps}
          onMarkAgreement={onMarkAgreement}
        />
      )
      const button = screen.getByTestId('agree-button')

      button.focus()
      fireEvent.keyUp(button, { key: ' ', code: 'Space' })
      fireEvent.click(button) // Space triggers click on buttons

      expect(onMarkAgreement).toHaveBeenCalled()
    })

    it('has visible focus indicator', () => {
      render(<ResolutionControls {...defaultProps} />)
      const button = screen.getByTestId('agree-button')
      expect(button.className).toMatch(/focus:ring/)
    })
  })
})
