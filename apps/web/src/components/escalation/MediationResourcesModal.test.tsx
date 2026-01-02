/**
 * MediationResourcesModal Component Tests - Story 34.5.2 Task 4
 *
 * Tests for the mediation resources modal component.
 * AC2: Link to Family Communication Resources
 * AC3: Family Meeting Template Access
 * AC4: Age-Appropriate Negotiation Tips
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MediationResourcesModal } from './MediationResourcesModal'
import type { AgeTier } from '@fledgely/shared/contracts/mediationResources'

describe('MediationResourcesModal - Story 34.5.2', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    ageTier: 'tween-12-14' as AgeTier,
    childName: 'Emma',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // Modal Visibility Tests
  // ============================================

  describe('Modal Visibility', () => {
    it('should render when isOpen is true', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      expect(screen.getByTestId('mediation-resources-modal')).toBeInTheDocument()
    })

    it('should not render when isOpen is false', () => {
      render(<MediationResourcesModal {...defaultProps} isOpen={false} />)

      expect(screen.queryByTestId('mediation-resources-modal')).not.toBeInTheDocument()
    })

    it('should call onClose when close button is clicked', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('modal-close-button'))

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when backdrop is clicked', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('modal-backdrop'))

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })
  })

  // ============================================
  // AC2: Link to Family Communication Resources
  // ============================================

  describe('AC2: Link to Family Communication Resources', () => {
    it('should display a communication guide section', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      expect(screen.getByTestId('tab-negotiation-tips')).toBeInTheDocument()
    })

    it('should show resources curated for age tier', () => {
      render(<MediationResourcesModal {...defaultProps} ageTier="child-8-11" />)

      const content = screen.getByTestId('resources-content')
      expect(content).toBeInTheDocument()
    })
  })

  // ============================================
  // AC3: Family Meeting Template Access
  // ============================================

  describe('AC3: Family Meeting Template Access', () => {
    it('should display family meeting template tab', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      expect(screen.getByTestId('tab-family-meeting')).toBeInTheDocument()
    })

    it('should show family meeting content when tab is clicked', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('tab-family-meeting'))

      expect(screen.getByTestId('family-meeting-content')).toBeInTheDocument()
    })

    it('should show parent section in family meeting template', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('tab-family-meeting'))

      expect(screen.getByTestId('parent-section')).toBeInTheDocument()
    })

    it('should show child section in family meeting template', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('tab-family-meeting'))

      expect(screen.getByTestId('child-section')).toBeInTheDocument()
    })

    it('should show joint section in family meeting template', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('tab-family-meeting'))

      expect(screen.getByTestId('joint-section')).toBeInTheDocument()
    })

    it('should have printable option for family meeting template', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('tab-family-meeting'))

      expect(screen.getByTestId('print-button')).toBeInTheDocument()
    })
  })

  // ============================================
  // AC4: Age-Appropriate Negotiation Tips
  // ============================================

  describe('AC4: Age-Appropriate Negotiation Tips', () => {
    it('should display negotiation tips tab', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      expect(screen.getByTestId('tab-negotiation-tips')).toBeInTheDocument()
    })

    it('should show negotiation tips content by default', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      expect(screen.getByTestId('negotiation-tips-content')).toBeInTheDocument()
    })

    it('should show multiple tips', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      const tips = screen.getAllByTestId(/^tip-/)
      expect(tips.length).toBeGreaterThanOrEqual(3)
    })

    it('should show different tips for child tier', () => {
      render(<MediationResourcesModal {...defaultProps} ageTier="child-8-11" />)

      const content = screen.getByTestId('negotiation-tips-content')
      expect(content).toBeInTheDocument()
    })

    it('should show different tips for teen tier', () => {
      render(<MediationResourcesModal {...defaultProps} ageTier="teen-15-17" />)

      const content = screen.getByTestId('negotiation-tips-content')
      expect(content).toBeInTheDocument()
    })

    it('should show tip title and description', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      const firstTip = screen.getByTestId('tip-0')
      expect(firstTip.querySelector('[data-testid="tip-title"]')).toBeInTheDocument()
      expect(firstTip.querySelector('[data-testid="tip-description"]')).toBeInTheDocument()
    })

    it('should expand tip to show full content', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('tip-0'))

      expect(screen.getByTestId('tip-full-content-0')).toBeInTheDocument()
    })
  })

  // ============================================
  // Tab Navigation Tests
  // ============================================

  describe('Tab Navigation', () => {
    it('should highlight active tab', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      const activeTab = screen.getByTestId('tab-negotiation-tips')
      expect(activeTab.className).toContain('active')
    })

    it('should switch to family meeting tab when clicked', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('tab-family-meeting'))

      expect(screen.getByTestId('tab-family-meeting').className).toContain('active')
      expect(screen.getByTestId('tab-negotiation-tips').className).not.toContain('active')
    })

    it('should have at least 2 tabs', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      expect(screen.getByTestId('tab-negotiation-tips')).toBeInTheDocument()
      expect(screen.getByTestId('tab-family-meeting')).toBeInTheDocument()
    })
  })

  // ============================================
  // Personalization Tests
  // ============================================

  describe('Personalization', () => {
    it('should display child name in header', () => {
      render(<MediationResourcesModal {...defaultProps} childName="Emma" />)

      const header = screen.getByTestId('modal-header')
      expect(header.textContent).toContain('Emma')
    })
  })

  // ============================================
  // Accessibility Tests
  // ============================================

  describe('Accessibility', () => {
    it('should have proper modal role', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      const modal = screen.getByTestId('mediation-resources-modal')
      expect(modal.getAttribute('role')).toBe('dialog')
    })

    it('should have aria-labelledby for modal title', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      const modal = screen.getByTestId('mediation-resources-modal')
      expect(modal.getAttribute('aria-labelledby')).toBeTruthy()
    })

    it('should trap focus within modal', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      const modal = screen.getByTestId('mediation-resources-modal')
      expect(modal.getAttribute('aria-modal')).toBe('true')
    })
  })
})
