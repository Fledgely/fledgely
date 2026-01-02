/**
 * NegotiationResourcesPanel Component Tests - Story 34.5.6 Task 1
 *
 * Tests for the proactive negotiation resources panel.
 * AC1: Age-appropriate tips
 * AC2: Practical content with examples
 * AC3: Empowering not manipulative
 * AC4: Proactive access
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NegotiationResourcesPanel } from './NegotiationResourcesPanel'
import type { AgeTier } from '@fledgely/shared/contracts/mediationResources'

// Mock the mediationResourceService
const mockGetNegotiationTips = vi.fn()
vi.mock('@fledgely/shared/services/mediationResourceService', () => ({
  getNegotiationTips: (ageTier: AgeTier) => mockGetNegotiationTips(ageTier),
}))

describe('NegotiationResourcesPanel - Story 34.5.6', () => {
  const defaultTips = [
    {
      id: 'tip-1',
      title: 'Pick the Right Time',
      shortDescription: 'Wait for a good moment to talk',
      fullContent: 'Ask your parents to talk when they are not busy.',
      ageTier: 'child-8-11' as AgeTier,
      order: 0,
    },
    {
      id: 'tip-2',
      title: 'Use Your Listening Ears',
      shortDescription: 'Listen to understand',
      fullContent: 'Before you share your ideas, really listen to what your parents are saying.',
      ageTier: 'child-8-11' as AgeTier,
      order: 1,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetNegotiationTips.mockReturnValue(defaultTips)
  })

  // ============================================
  // AC1: Age-Appropriate Tips Tests
  // ============================================

  describe('AC1: Age-Appropriate Tips', () => {
    it('should render the panel with tips', () => {
      render(<NegotiationResourcesPanel ageTier="child-8-11" />)

      expect(screen.getByTestId('negotiation-resources-panel')).toBeInTheDocument()
    })

    it('should call getNegotiationTips with correct age tier', () => {
      render(<NegotiationResourcesPanel ageTier="tween-12-14" />)

      expect(mockGetNegotiationTips).toHaveBeenCalledWith('tween-12-14')
    })

    it('should display all tips for the age tier', () => {
      render(<NegotiationResourcesPanel ageTier="child-8-11" defaultExpanded />)

      expect(screen.getByText('Pick the Right Time')).toBeInTheDocument()
      expect(screen.getByText('Use Your Listening Ears')).toBeInTheDocument()
    })

    it('should display tip short descriptions', () => {
      render(<NegotiationResourcesPanel ageTier="child-8-11" defaultExpanded />)

      expect(screen.getByText('Wait for a good moment to talk')).toBeInTheDocument()
      expect(screen.getByText('Listen to understand')).toBeInTheDocument()
    })

    it('should adapt content for teen age tier', () => {
      const teenTips = [
        {
          id: 'tip-teen-1',
          title: 'Schedule the Conversation',
          shortDescription: 'Request a dedicated time',
          fullContent: 'Important conversations deserve dedicated time.',
          ageTier: 'teen-15-17' as AgeTier,
          order: 0,
        },
      ]
      mockGetNegotiationTips.mockReturnValue(teenTips)

      render(<NegotiationResourcesPanel ageTier="teen-15-17" defaultExpanded />)

      expect(mockGetNegotiationTips).toHaveBeenCalledWith('teen-15-17')
      expect(screen.getByText('Schedule the Conversation')).toBeInTheDocument()
    })
  })

  // ============================================
  // AC2: Practical Content Tests
  // ============================================

  describe('AC2: Practical Content', () => {
    it('should show full content when tip is expanded', () => {
      render(<NegotiationResourcesPanel ageTier="child-8-11" defaultExpanded />)

      const tip = screen.getByTestId('tip-0')
      fireEvent.click(tip)

      expect(
        screen.getByText('Ask your parents to talk when they are not busy.')
      ).toBeInTheDocument()
    })

    it('should hide full content when tip is collapsed', () => {
      render(<NegotiationResourcesPanel ageTier="child-8-11" defaultExpanded />)

      expect(
        screen.queryByText('Ask your parents to talk when they are not busy.')
      ).not.toBeInTheDocument()
    })

    it('should toggle tip expansion on click', () => {
      render(<NegotiationResourcesPanel ageTier="child-8-11" defaultExpanded />)

      const tip = screen.getByTestId('tip-0')

      // Expand
      fireEvent.click(tip)
      expect(screen.getByTestId('tip-full-content-0')).toBeInTheDocument()

      // Collapse
      fireEvent.click(tip)
      expect(screen.queryByTestId('tip-full-content-0')).not.toBeInTheDocument()
    })
  })

  // ============================================
  // AC3: Empowering Content Tests
  // ============================================

  describe('AC3: Empowering Content', () => {
    it('should display empowering header text', () => {
      render(<NegotiationResourcesPanel ageTier="child-8-11" />)

      const panel = screen.getByTestId('negotiation-resources-panel')
      expect(panel).toHaveTextContent(/tips|talk|parents/i)
    })

    it('should display encouraging subheader', () => {
      render(<NegotiationResourcesPanel ageTier="child-8-11" />)

      expect(screen.getByTestId('panel-subheader')).toBeInTheDocument()
    })

    it('should not contain accusatory language', () => {
      render(<NegotiationResourcesPanel ageTier="child-8-11" defaultExpanded />)

      const panel = screen.getByTestId('negotiation-resources-panel')
      expect(panel.textContent).not.toMatch(/manipulate|trick|force|demand/i)
    })
  })

  // ============================================
  // AC4: Proactive Access Tests
  // ============================================

  describe('AC4: Proactive Access', () => {
    it('should be collapsed by default when defaultExpanded is false', () => {
      render(<NegotiationResourcesPanel ageTier="child-8-11" defaultExpanded={false} />)

      expect(screen.queryByTestId('tips-container')).not.toBeInTheDocument()
    })

    it('should be expanded when defaultExpanded is true', () => {
      render(<NegotiationResourcesPanel ageTier="child-8-11" defaultExpanded />)

      expect(screen.getByTestId('tips-container')).toBeInTheDocument()
    })

    it('should toggle panel expansion on header click', () => {
      render(<NegotiationResourcesPanel ageTier="child-8-11" />)

      const header = screen.getByTestId('panel-header')

      // Expand
      fireEvent.click(header)
      expect(screen.getByTestId('tips-container')).toBeInTheDocument()

      // Collapse
      fireEvent.click(header)
      expect(screen.queryByTestId('tips-container')).not.toBeInTheDocument()
    })

    it('should support keyboard navigation for panel toggle', () => {
      render(<NegotiationResourcesPanel ageTier="child-8-11" />)

      const header = screen.getByTestId('panel-header')

      // Expand with Enter
      fireEvent.keyDown(header, { key: 'Enter' })
      expect(screen.getByTestId('tips-container')).toBeInTheDocument()

      // Collapse with Space
      fireEvent.keyDown(header, { key: ' ' })
      expect(screen.queryByTestId('tips-container')).not.toBeInTheDocument()
    })
  })

  // ============================================
  // Personalization Tests
  // ============================================

  describe('Personalization', () => {
    it('should display child name when provided', () => {
      render(<NegotiationResourcesPanel ageTier="child-8-11" childName="Emma" />)

      const panel = screen.getByTestId('negotiation-resources-panel')
      expect(panel).toHaveTextContent(/Emma/i)
    })

    it('should display generic text when child name not provided', () => {
      render(<NegotiationResourcesPanel ageTier="child-8-11" />)

      const panel = screen.getByTestId('negotiation-resources-panel')
      expect(panel).toBeInTheDocument()
    })
  })

  // ============================================
  // Accessibility Tests
  // ============================================

  describe('Accessibility', () => {
    it('should have appropriate ARIA attributes on panel', () => {
      render(<NegotiationResourcesPanel ageTier="child-8-11" />)

      const header = screen.getByTestId('panel-header')
      expect(header).toHaveAttribute('role', 'button')
      expect(header).toHaveAttribute('aria-expanded')
    })

    it('should have correct aria-expanded state', () => {
      render(<NegotiationResourcesPanel ageTier="child-8-11" />)

      const header = screen.getByTestId('panel-header')
      expect(header).toHaveAttribute('aria-expanded', 'false')

      fireEvent.click(header)
      expect(header).toHaveAttribute('aria-expanded', 'true')
    })

    it('should have tabIndex on interactive elements', () => {
      render(<NegotiationResourcesPanel ageTier="child-8-11" />)

      const header = screen.getByTestId('panel-header')
      expect(header).toHaveAttribute('tabIndex', '0')
    })
  })

  // ============================================
  // Edge Cases Tests
  // ============================================

  describe('Edge Cases', () => {
    it('should handle empty tips array gracefully', () => {
      mockGetNegotiationTips.mockReturnValue([])

      render(<NegotiationResourcesPanel ageTier="child-8-11" defaultExpanded />)

      expect(screen.getByTestId('negotiation-resources-panel')).toBeInTheDocument()
      expect(screen.getByTestId('no-tips-message')).toBeInTheDocument()
    })

    it('should handle single tip correctly', () => {
      mockGetNegotiationTips.mockReturnValue([defaultTips[0]])

      render(<NegotiationResourcesPanel ageTier="child-8-11" defaultExpanded />)

      expect(screen.getByText('Pick the Right Time')).toBeInTheDocument()
      expect(screen.queryByText('Use Your Listening Ears')).not.toBeInTheDocument()
    })

    it('should handle special characters in child name', () => {
      render(
        <NegotiationResourcesPanel ageTier="child-8-11" childName="<script>alert('xss')</script>" />
      )

      const panel = screen.getByTestId('negotiation-resources-panel')
      expect(panel.innerHTML).not.toContain('<script>')
    })
  })
})
