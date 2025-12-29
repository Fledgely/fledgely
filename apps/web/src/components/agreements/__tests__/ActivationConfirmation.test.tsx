/**
 * Tests for ActivationConfirmation component.
 *
 * Story 6.3: Agreement Activation - AC4
 */

import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { ActivationConfirmation } from '../ActivationConfirmation'

describe('ActivationConfirmation', () => {
  const defaultProps = {
    version: 'v1.0',
    activatedAt: new Date('2024-01-15T12:00:00'),
    childName: 'Alex',
  }

  afterEach(() => {
    cleanup()
  })

  describe('rendering', () => {
    it('should render the confirmation component', () => {
      render(<ActivationConfirmation {...defaultProps} />)

      expect(screen.getByTestId('activation-confirmation')).toBeInTheDocument()
    })

    it('should display celebration icon', () => {
      render(<ActivationConfirmation {...defaultProps} />)

      expect(screen.getByTestId('celebration-icon')).toBeInTheDocument()
    })

    it('should display confirmation heading', () => {
      render(<ActivationConfirmation {...defaultProps} />)

      expect(screen.getByTestId('confirmation-heading')).toBeInTheDocument()
    })
  })

  describe('parent view', () => {
    it('should show family name in heading when provided', () => {
      render(<ActivationConfirmation {...defaultProps} familyName="Smith" />)

      expect(screen.getByTestId('confirmation-heading')).toHaveTextContent(
        'Smith Agreement Activated!'
      )
    })

    it('should show generic "Family" when no family name provided', () => {
      render(<ActivationConfirmation {...defaultProps} />)

      expect(screen.getByTestId('confirmation-heading')).toHaveTextContent(
        'Family Agreement Activated!'
      )
    })

    it('should show parent-specific confirmation message', () => {
      render(<ActivationConfirmation {...defaultProps} />)

      expect(screen.getByTestId('confirmation-message')).toHaveTextContent(
        'Your family agreement with Alex is now active'
      )
    })

    it('should show "Continue to Dashboard" button text', () => {
      render(<ActivationConfirmation {...defaultProps} onContinue={vi.fn()} />)

      expect(screen.getByTestId('continue-button')).toHaveTextContent('Continue to Dashboard')
    })

    it('should show parent-specific next steps', () => {
      render(<ActivationConfirmation {...defaultProps} />)

      const nextSteps = screen.getByTestId('what-this-means')
      expect(nextSteps).toHaveTextContent('The agreement is visible on your dashboard')
      expect(nextSteps).toHaveTextContent('All agreed terms are now in effect')
      expect(nextSteps).toHaveTextContent('Changes require a new co-creation session')
    })
  })

  describe('child view', () => {
    it('should show child-friendly heading', () => {
      render(<ActivationConfirmation {...defaultProps} isChildView />)

      expect(screen.getByTestId('confirmation-heading')).toHaveTextContent(
        'Your Agreement is Ready!'
      )
    })

    it('should show child-specific confirmation message', () => {
      render(<ActivationConfirmation {...defaultProps} isChildView />)

      expect(screen.getByTestId('confirmation-message')).toHaveTextContent(
        'You and your family made this agreement together'
      )
      expect(screen.getByTestId('confirmation-message')).toHaveTextContent(
        'Everyone promised to follow it!'
      )
    })

    it('should show "Got It!" button text', () => {
      render(<ActivationConfirmation {...defaultProps} isChildView onContinue={vi.fn()} />)

      expect(screen.getByTestId('continue-button')).toHaveTextContent('Got It!')
    })

    it('should show child-friendly next steps', () => {
      render(<ActivationConfirmation {...defaultProps} isChildView />)

      const nextSteps = screen.getByTestId('what-this-means')
      expect(nextSteps).toHaveTextContent('You can see your agreement any time')
      expect(nextSteps).toHaveTextContent('The rules you agreed to are now active')
      expect(nextSteps).toHaveTextContent('You can ask questions if something is confusing')
    })
  })

  describe('version and date display', () => {
    it('should display version number', () => {
      render(<ActivationConfirmation {...defaultProps} />)

      expect(screen.getByTestId('version-info')).toHaveTextContent('Version v1.0')
    })

    it('should display formatted activation date', () => {
      render(<ActivationConfirmation {...defaultProps} />)

      expect(screen.getByTestId('version-info')).toHaveTextContent('Monday, January 15, 2024')
    })

    it('should include both version and date', () => {
      render(<ActivationConfirmation {...defaultProps} version="v2.0" />)

      const versionInfo = screen.getByTestId('version-info')
      expect(versionInfo).toHaveTextContent('Version v2.0')
      expect(versionInfo).toHaveTextContent('Effective')
    })
  })

  describe('continue button', () => {
    it('should render continue button when onContinue provided', () => {
      render(<ActivationConfirmation {...defaultProps} onContinue={vi.fn()} />)

      expect(screen.getByTestId('continue-button')).toBeInTheDocument()
    })

    it('should not render continue button when onContinue not provided', () => {
      render(<ActivationConfirmation {...defaultProps} />)

      expect(screen.queryByTestId('continue-button')).not.toBeInTheDocument()
    })

    it('should call onContinue when clicked', () => {
      const onContinue = vi.fn()
      render(<ActivationConfirmation {...defaultProps} onContinue={onContinue} />)

      fireEvent.click(screen.getByTestId('continue-button'))

      expect(onContinue).toHaveBeenCalledTimes(1)
    })
  })

  describe('accessibility', () => {
    it('should have role="region"', () => {
      render(<ActivationConfirmation {...defaultProps} />)

      expect(screen.getByRole('region')).toBeInTheDocument()
    })

    it('should have aria-labelledby pointing to heading', () => {
      render(<ActivationConfirmation {...defaultProps} />)

      const region = screen.getByRole('region')
      expect(region).toHaveAttribute('aria-labelledby', 'activation-heading')
    })

    it('should have celebration icon hidden from screen readers', () => {
      render(<ActivationConfirmation {...defaultProps} />)

      const icon = screen.getByTestId('celebration-icon')
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })

    it('should have heading with correct id', () => {
      render(<ActivationConfirmation {...defaultProps} />)

      const heading = screen.getByTestId('confirmation-heading')
      expect(heading).toHaveAttribute('id', 'activation-heading')
    })

    it('should have next steps list with aria-label', () => {
      render(<ActivationConfirmation {...defaultProps} />)

      expect(screen.getByLabelText('Next steps')).toBeInTheDocument()
    })

    it('should have 44px minimum touch target on continue button', () => {
      render(<ActivationConfirmation {...defaultProps} onContinue={vi.fn()} />)

      const button = screen.getByTestId('continue-button')
      expect(button).toHaveClass('min-h-[44px]')
    })

    it('should create screen reader announcement on mount', () => {
      render(<ActivationConfirmation {...defaultProps} />)

      // Check that announcement element is created in the DOM
      const announcement = document.querySelector('[role="status"][aria-live="polite"]')
      expect(announcement).toBeInTheDocument()
      expect(announcement).toHaveTextContent('Congratulations! Your family agreement is now active')
    })

    it('should include version in screen reader announcement', () => {
      render(<ActivationConfirmation {...defaultProps} version="v2.0" />)

      const announcement = document.querySelector('[role="status"][aria-live="polite"]')
      expect(announcement).toHaveTextContent('Version v2.0')
    })

    it('should clean up announcement on unmount', () => {
      const { unmount } = render(<ActivationConfirmation {...defaultProps} />)

      // Verify it exists
      expect(document.querySelector('[role="status"][aria-live="polite"]')).toBeInTheDocument()

      unmount()

      // Verify it's removed
      expect(document.querySelector('[role="status"][aria-live="polite"]')).not.toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<ActivationConfirmation {...defaultProps} className="custom-class" />)

      expect(screen.getByTestId('activation-confirmation')).toHaveClass('custom-class')
    })

    it('should have green gradient background', () => {
      render(<ActivationConfirmation {...defaultProps} />)

      const confirmation = screen.getByTestId('activation-confirmation')
      expect(confirmation).toHaveClass('from-green-50')
      expect(confirmation).toHaveClass('to-emerald-50')
    })

    it('should have check marks hidden from screen readers', () => {
      render(<ActivationConfirmation {...defaultProps} />)

      const checkMarks = screen.getAllByText('✓')
      checkMarks.forEach((check) => {
        expect(check).toHaveAttribute('aria-hidden', 'true')
      })
    })
  })

  describe('content variations', () => {
    it('should handle different child names', () => {
      render(<ActivationConfirmation {...defaultProps} childName="Jordan" />)

      expect(screen.getByTestId('confirmation-message')).toHaveTextContent(
        'Your family agreement with Jordan is now active'
      )
    })

    it('should handle different family names', () => {
      render(<ActivationConfirmation {...defaultProps} familyName="Johnson" />)

      expect(screen.getByTestId('confirmation-heading')).toHaveTextContent(
        'Johnson Agreement Activated!'
      )
    })

    it('should handle different versions', () => {
      render(<ActivationConfirmation {...defaultProps} version="v3.0" />)

      expect(screen.getByTestId('version-info')).toHaveTextContent('Version v3.0')
    })

    it('should handle different dates', () => {
      render(
        <ActivationConfirmation {...defaultProps} activatedAt={new Date('2025-06-20T15:30:00')} />
      )

      expect(screen.getByTestId('version-info')).toHaveTextContent('Friday, June 20, 2025')
    })
  })
})
