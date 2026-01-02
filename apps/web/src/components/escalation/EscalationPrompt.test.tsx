/**
 * EscalationPrompt Component Tests - Story 34.5.2 Task 3
 *
 * Tests for the escalation prompt component shown to children.
 * AC1: Display Mediation Prompt on Escalation
 * AC5: Supportive, Non-Accusatory Messaging
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EscalationPrompt } from './EscalationPrompt'
import type { AgeTier } from '@fledgely/shared/contracts/mediationResources'

describe('EscalationPrompt - Story 34.5.2', () => {
  const defaultProps = {
    childId: 'child-123',
    familyId: 'family-456',
    ageTier: 'tween-12-14' as AgeTier,
    onAcknowledge: vi.fn(),
    onViewResources: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // AC1: Display Mediation Prompt on Escalation
  // ============================================

  describe('AC1: Display Mediation Prompt on Escalation', () => {
    it('should render the escalation prompt', () => {
      render(<EscalationPrompt {...defaultProps} />)

      expect(screen.getByTestId('escalation-prompt')).toBeInTheDocument()
    })

    it('should display a title', () => {
      render(<EscalationPrompt {...defaultProps} />)

      expect(screen.getByTestId('escalation-title')).toBeInTheDocument()
      expect(screen.getByTestId('escalation-title').textContent).toBeTruthy()
    })

    it('should display a message', () => {
      render(<EscalationPrompt {...defaultProps} />)

      expect(screen.getByTestId('escalation-message')).toBeInTheDocument()
      expect(screen.getByTestId('escalation-message').textContent).toBeTruthy()
    })

    it('should display a call-to-action button', () => {
      render(<EscalationPrompt {...defaultProps} />)

      expect(screen.getByTestId('escalation-cta')).toBeInTheDocument()
    })

    it('should call onViewResources when CTA is clicked', () => {
      render(<EscalationPrompt {...defaultProps} />)

      fireEvent.click(screen.getByTestId('escalation-cta'))

      expect(defaultProps.onViewResources).toHaveBeenCalledTimes(1)
    })

    it('should have a dismiss/acknowledge option', () => {
      render(<EscalationPrompt {...defaultProps} />)

      expect(screen.getByTestId('escalation-acknowledge')).toBeInTheDocument()
    })

    it('should call onAcknowledge when dismiss is clicked', () => {
      render(<EscalationPrompt {...defaultProps} />)

      fireEvent.click(screen.getByTestId('escalation-acknowledge'))

      expect(defaultProps.onAcknowledge).toHaveBeenCalledTimes(1)
    })

    it('should be prominently visible with proper styling', () => {
      render(<EscalationPrompt {...defaultProps} />)

      const prompt = screen.getByTestId('escalation-prompt')
      // Check it has styling classes for prominence
      expect(prompt.className).toContain('escalation-prompt')
    })
  })

  // ============================================
  // AC5: Supportive, Non-Accusatory Messaging
  // ============================================

  describe('AC5: Supportive, Non-Accusatory Messaging', () => {
    it('should not contain accusatory language about parents', () => {
      render(<EscalationPrompt {...defaultProps} />)

      const prompt = screen.getByTestId('escalation-prompt')
      const text = prompt.textContent?.toLowerCase() || ''

      // Should not blame parents
      expect(text).not.toContain('your fault')
      expect(text).not.toContain('blame')
      expect(text).not.toContain('wrong')
      expect(text).not.toContain('unfair parents')
      expect(text).not.toContain('parents are being')
    })

    it('should contain supportive language', () => {
      render(<EscalationPrompt {...defaultProps} />)

      const message = screen.getByTestId('escalation-message')
      const text = message.textContent?.toLowerCase() || ''

      // Should have supportive/constructive messaging
      const hasSupportiveLanguage =
        text.includes('help') ||
        text.includes('resource') ||
        text.includes('conversation') ||
        text.includes('talk') ||
        text.includes('together') ||
        text.includes('communication')

      expect(hasSupportiveLanguage).toBe(true)
    })

    it('should focus on empowerment, not conflict', () => {
      render(<EscalationPrompt {...defaultProps} />)

      const cta = screen.getByTestId('escalation-cta')
      const text = cta.textContent?.toLowerCase() || ''

      // CTA should be positive action-oriented
      const isPositiveAction =
        text.includes('view') ||
        text.includes('see') ||
        text.includes('access') ||
        text.includes('help') ||
        text.includes('tips')

      expect(isPositiveAction).toBe(true)
    })
  })

  // ============================================
  // Age-Appropriate Messaging Tests
  // ============================================

  describe('Age-Appropriate Messaging', () => {
    it('should display child-appropriate content for child-8-11 tier', () => {
      render(<EscalationPrompt {...defaultProps} ageTier="child-8-11" />)

      const title = screen.getByTestId('escalation-title')
      expect(title.textContent).toBeTruthy()

      // Child content should be simpler
      const message = screen.getByTestId('escalation-message')
      expect(message.textContent?.length).toBeLessThan(300)
    })

    it('should display tween-appropriate content for tween-12-14 tier', () => {
      render(<EscalationPrompt {...defaultProps} ageTier="tween-12-14" />)

      const title = screen.getByTestId('escalation-title')
      expect(title.textContent).toBeTruthy()

      const message = screen.getByTestId('escalation-message')
      expect(message.textContent).toBeTruthy()
    })

    it('should display teen-appropriate content for teen-15-17 tier', () => {
      render(<EscalationPrompt {...defaultProps} ageTier="teen-15-17" />)

      const title = screen.getByTestId('escalation-title')
      expect(title.textContent).toBeTruthy()

      const message = screen.getByTestId('escalation-message')
      expect(message.textContent).toBeTruthy()
    })

    it('should display different titles for different age tiers', () => {
      const { rerender } = render(<EscalationPrompt {...defaultProps} ageTier="child-8-11" />)
      const childTitle = screen.getByTestId('escalation-title').textContent

      rerender(<EscalationPrompt {...defaultProps} ageTier="teen-15-17" />)
      const teenTitle = screen.getByTestId('escalation-title').textContent

      expect(childTitle).not.toBe(teenTitle)
    })

    it('should display different CTAs for different age tiers', () => {
      const { rerender } = render(<EscalationPrompt {...defaultProps} ageTier="child-8-11" />)
      const childCta = screen.getByTestId('escalation-cta').textContent

      rerender(<EscalationPrompt {...defaultProps} ageTier="teen-15-17" />)
      const teenCta = screen.getByTestId('escalation-cta').textContent

      expect(childCta).not.toBe(teenCta)
    })
  })

  // ============================================
  // Accessibility Tests
  // ============================================

  describe('Accessibility', () => {
    it('should have proper ARIA role for alert/notification', () => {
      render(<EscalationPrompt {...defaultProps} />)

      const prompt = screen.getByTestId('escalation-prompt')
      expect(prompt.getAttribute('role')).toBe('alert')
    })

    it('should have accessible button labels', () => {
      render(<EscalationPrompt {...defaultProps} />)

      const ctaButton = screen.getByTestId('escalation-cta')
      expect(ctaButton.getAttribute('aria-label') || ctaButton.textContent).toBeTruthy()

      const acknowledgeButton = screen.getByTestId('escalation-acknowledge')
      expect(
        acknowledgeButton.getAttribute('aria-label') || acknowledgeButton.textContent
      ).toBeTruthy()
    })
  })

  // ============================================
  // Component Props Tests
  // ============================================

  describe('Component Props', () => {
    it('should accept all required props', () => {
      expect(() => {
        render(<EscalationPrompt {...defaultProps} />)
      }).not.toThrow()
    })

    it('should handle all three age tiers', () => {
      const tiers: AgeTier[] = ['child-8-11', 'tween-12-14', 'teen-15-17']

      tiers.forEach((tier) => {
        const { unmount } = render(<EscalationPrompt {...defaultProps} ageTier={tier} />)
        expect(screen.getByTestId('escalation-prompt')).toBeInTheDocument()
        unmount()
      })
    })
  })
})
