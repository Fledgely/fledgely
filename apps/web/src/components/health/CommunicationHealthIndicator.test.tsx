/**
 * CommunicationHealthIndicator Component Tests - Story 34.5.5 Task 1
 *
 * Tests for the communication health indicator component.
 * AC1: Health Indicator Display
 * AC3: Actionable Suggestion
 * AC4: Parent Pattern Awareness
 * AC5: Child Transparency
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CommunicationHealthIndicator } from './CommunicationHealthIndicator'
import type { CommunicationMetrics } from '../../hooks/useCommunicationMetrics'

// Mock the useCommunicationMetrics hook
const mockUseCommunicationMetrics = vi.fn()
vi.mock('../../hooks/useCommunicationMetrics', () => ({
  useCommunicationMetrics: (familyId: string, childId: string) =>
    mockUseCommunicationMetrics(familyId, childId),
}))

describe('CommunicationHealthIndicator - Story 34.5.5', () => {
  const defaultProps = {
    childId: 'child-123',
    familyId: 'family-456',
    childName: 'Emma',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // AC1: Health Indicator Display Tests
  // ============================================

  describe('AC1: Health Indicator Display', () => {
    it('should render the indicator container', () => {
      mockUseCommunicationMetrics.mockReturnValue({
        metrics: null,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<CommunicationHealthIndicator {...defaultProps} />)

      expect(screen.getByTestId('communication-health-indicator')).toBeInTheDocument()
    })

    it('should display "Healthy" when trend is improving', () => {
      const metrics: CommunicationMetrics = {
        totalProposals: 5,
        totalRejections: 1,
        rejectionsInWindow: 0,
        rejectionRate: 20,
        escalationTriggered: false,
        trend: 'improving',
      }

      mockUseCommunicationMetrics.mockReturnValue({
        metrics,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<CommunicationHealthIndicator {...defaultProps} />)

      expect(screen.getByTestId('health-status')).toHaveTextContent(/healthy/i)
    })

    it('should display "Healthy" when trend is stable', () => {
      const metrics: CommunicationMetrics = {
        totalProposals: 5,
        totalRejections: 2,
        rejectionsInWindow: 1,
        rejectionRate: 40,
        escalationTriggered: false,
        trend: 'stable',
      }

      mockUseCommunicationMetrics.mockReturnValue({
        metrics,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<CommunicationHealthIndicator {...defaultProps} />)

      expect(screen.getByTestId('health-status')).toHaveTextContent(/healthy/i)
    })

    it('should display "Needs attention" when trend is needs-attention', () => {
      const metrics: CommunicationMetrics = {
        totalProposals: 5,
        totalRejections: 4,
        rejectionsInWindow: 3,
        rejectionRate: 80,
        escalationTriggered: true,
        trend: 'needs-attention',
      }

      mockUseCommunicationMetrics.mockReturnValue({
        metrics,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<CommunicationHealthIndicator {...defaultProps} />)

      expect(screen.getByTestId('health-status')).toHaveTextContent(/needs attention/i)
    })

    it('should show green styling for healthy status', () => {
      const metrics: CommunicationMetrics = {
        totalProposals: 5,
        totalRejections: 1,
        rejectionsInWindow: 0,
        rejectionRate: 20,
        escalationTriggered: false,
        trend: 'improving',
      }

      mockUseCommunicationMetrics.mockReturnValue({
        metrics,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<CommunicationHealthIndicator {...defaultProps} />)

      const badge = screen.getByTestId('health-badge')
      expect(badge.className).toContain('healthy')
    })

    it('should show amber styling for needs-attention status', () => {
      const metrics: CommunicationMetrics = {
        totalProposals: 5,
        totalRejections: 4,
        rejectionsInWindow: 3,
        rejectionRate: 80,
        escalationTriggered: true,
        trend: 'needs-attention',
      }

      mockUseCommunicationMetrics.mockReturnValue({
        metrics,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<CommunicationHealthIndicator {...defaultProps} />)

      const badge = screen.getByTestId('health-badge')
      expect(badge.className).toContain('attention')
    })
  })

  // ============================================
  // Loading and Empty States
  // ============================================

  describe('Loading and Empty States', () => {
    it('should show loading state while fetching metrics', () => {
      mockUseCommunicationMetrics.mockReturnValue({
        metrics: null,
        loading: true,
        error: null,
        refetch: vi.fn(),
      })

      render(<CommunicationHealthIndicator {...defaultProps} />)

      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    })

    it('should show empty state when no metrics available', () => {
      mockUseCommunicationMetrics.mockReturnValue({
        metrics: null,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<CommunicationHealthIndicator {...defaultProps} />)

      expect(screen.getByTestId('no-data-message')).toBeInTheDocument()
    })

    it('should show error state when fetch fails', () => {
      mockUseCommunicationMetrics.mockReturnValue({
        metrics: null,
        loading: false,
        error: new Error('Failed to fetch'),
        refetch: vi.fn(),
      })

      render(<CommunicationHealthIndicator {...defaultProps} />)

      expect(screen.getByTestId('error-message')).toBeInTheDocument()
    })
  })

  // ============================================
  // AC3: Actionable Suggestion Tests
  // ============================================

  describe('AC3: Actionable Suggestion', () => {
    it('should show suggestion with request count', () => {
      const metrics: CommunicationMetrics = {
        totalProposals: 4,
        totalRejections: 2,
        rejectionsInWindow: 2,
        rejectionRate: 50,
        escalationTriggered: false,
        trend: 'stable',
      }

      mockUseCommunicationMetrics.mockReturnValue({
        metrics,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<CommunicationHealthIndicator {...defaultProps} />)

      const suggestion = screen.getByTestId('suggestion-text')
      expect(suggestion).toHaveTextContent(/4 requests/i)
    })

    it('should use neutral, non-blaming tone in suggestion', () => {
      const metrics: CommunicationMetrics = {
        totalProposals: 4,
        totalRejections: 3,
        rejectionsInWindow: 3,
        rejectionRate: 75,
        escalationTriggered: false,
        trend: 'needs-attention',
      }

      mockUseCommunicationMetrics.mockReturnValue({
        metrics,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<CommunicationHealthIndicator {...defaultProps} />)

      const suggestion = screen.getByTestId('suggestion-text')
      // Should not contain blaming language
      expect(suggestion.textContent).not.toMatch(/ignored|failed|bad/i)
      // Should contain constructive language
      expect(suggestion.textContent).toMatch(/consider|discuss/i)
    })

    it('should not show suggestion when no proposals', () => {
      const metrics: CommunicationMetrics = {
        totalProposals: 0,
        totalRejections: 0,
        rejectionsInWindow: 0,
        rejectionRate: 0,
        escalationTriggered: false,
        trend: 'stable',
      }

      mockUseCommunicationMetrics.mockReturnValue({
        metrics,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<CommunicationHealthIndicator {...defaultProps} />)

      expect(screen.queryByTestId('suggestion-text')).not.toBeInTheDocument()
    })
  })

  // ============================================
  // AC5: Child Transparency Tests
  // ============================================

  describe('AC5: Child Transparency', () => {
    it('should show same indicator when isChild is true', () => {
      const metrics: CommunicationMetrics = {
        totalProposals: 5,
        totalRejections: 4,
        rejectionsInWindow: 3,
        rejectionRate: 80,
        escalationTriggered: true,
        trend: 'needs-attention',
      }

      mockUseCommunicationMetrics.mockReturnValue({
        metrics,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<CommunicationHealthIndicator {...defaultProps} isChild />)

      expect(screen.getByTestId('health-status')).toHaveTextContent(/needs attention/i)
    })

    it('should use child-friendly language when isChild is true', () => {
      const metrics: CommunicationMetrics = {
        totalProposals: 4,
        totalRejections: 2,
        rejectionsInWindow: 2,
        rejectionRate: 50,
        escalationTriggered: false,
        trend: 'stable',
      }

      mockUseCommunicationMetrics.mockReturnValue({
        metrics,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<CommunicationHealthIndicator {...defaultProps} isChild />)

      const suggestion = screen.getByTestId('suggestion-text')
      // Child-friendly language
      expect(suggestion.textContent).toMatch(/you've|your/i)
    })

    it('should use parent-oriented language when isChild is false', () => {
      const metrics: CommunicationMetrics = {
        totalProposals: 4,
        totalRejections: 2,
        rejectionsInWindow: 2,
        rejectionRate: 50,
        escalationTriggered: false,
        trend: 'stable',
      }

      mockUseCommunicationMetrics.mockReturnValue({
        metrics,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<CommunicationHealthIndicator {...defaultProps} isChild={false} />)

      const suggestion = screen.getByTestId('suggestion-text')
      // Parent-oriented language should reference child's name
      expect(suggestion.textContent).toMatch(/Emma/i)
    })
  })

  // ============================================
  // Accessibility Tests
  // ============================================

  describe('Accessibility', () => {
    it('should have appropriate ARIA labels', () => {
      const metrics: CommunicationMetrics = {
        totalProposals: 5,
        totalRejections: 1,
        rejectionsInWindow: 0,
        rejectionRate: 20,
        escalationTriggered: false,
        trend: 'improving',
      }

      mockUseCommunicationMetrics.mockReturnValue({
        metrics,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<CommunicationHealthIndicator {...defaultProps} />)

      const indicator = screen.getByTestId('communication-health-indicator')
      expect(indicator).toHaveAttribute('role', 'status')
      expect(indicator).toHaveAttribute('aria-label')
    })

    it('should announce status to screen readers', () => {
      const metrics: CommunicationMetrics = {
        totalProposals: 5,
        totalRejections: 1,
        rejectionsInWindow: 0,
        rejectionRate: 20,
        escalationTriggered: false,
        trend: 'improving',
      }

      mockUseCommunicationMetrics.mockReturnValue({
        metrics,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<CommunicationHealthIndicator {...defaultProps} />)

      const indicator = screen.getByTestId('communication-health-indicator')
      expect(indicator.getAttribute('aria-label')).toMatch(/communication|health/i)
    })
  })

  // ============================================
  // Integration Tests
  // ============================================

  describe('Integration', () => {
    it('should call useCommunicationMetrics with correct parameters', () => {
      mockUseCommunicationMetrics.mockReturnValue({
        metrics: null,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<CommunicationHealthIndicator {...defaultProps} />)

      expect(mockUseCommunicationMetrics).toHaveBeenCalledWith('family-456', 'child-123')
    })

    it('should display header with communication health title', () => {
      const metrics: CommunicationMetrics = {
        totalProposals: 5,
        totalRejections: 1,
        rejectionsInWindow: 0,
        rejectionRate: 20,
        escalationTriggered: false,
        trend: 'improving',
      }

      mockUseCommunicationMetrics.mockReturnValue({
        metrics,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<CommunicationHealthIndicator {...defaultProps} />)

      expect(screen.getByText(/communication health/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // Edge Cases & Security Tests (Code Review Fixes)
  // ============================================

  describe('Edge Cases & Security', () => {
    it('should use singular "request" when totalProposals is 1', () => {
      const metrics: CommunicationMetrics = {
        totalProposals: 1,
        totalRejections: 0,
        rejectionsInWindow: 0,
        rejectionRate: 0,
        escalationTriggered: false,
        trend: 'stable',
      }

      mockUseCommunicationMetrics.mockReturnValue({
        metrics,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      // Test parent view
      const { rerender } = render(
        <CommunicationHealthIndicator {...defaultProps} isChild={false} />
      )

      const suggestionParent = screen.getByTestId('suggestion-text')
      expect(suggestionParent.textContent).toMatch(/1 request[^s]/)
      expect(suggestionParent.textContent).not.toMatch(/1 requests/)

      // Test child view
      rerender(<CommunicationHealthIndicator {...defaultProps} isChild={true} />)

      const suggestionChild = screen.getByTestId('suggestion-text')
      expect(suggestionChild.textContent).toMatch(/1 request[^s]/)
      expect(suggestionChild.textContent).not.toMatch(/1 requests/)
    })

    it('should safely escape special characters in child name', () => {
      const metrics: CommunicationMetrics = {
        totalProposals: 4,
        totalRejections: 2,
        rejectionsInWindow: 2,
        rejectionRate: 50,
        escalationTriggered: false,
        trend: 'stable',
      }

      mockUseCommunicationMetrics.mockReturnValue({
        metrics,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      // Test with potentially malicious child name
      render(
        <CommunicationHealthIndicator
          {...defaultProps}
          childName="<script>alert('xss')</script>"
          isChild={false}
        />
      )

      const suggestion = screen.getByTestId('suggestion-text')
      // Verify the raw HTML is not present (React should escape it)
      expect(suggestion.innerHTML).not.toContain('<script>')
    })

    it('should handle child names with template literal syntax', () => {
      const metrics: CommunicationMetrics = {
        totalProposals: 3,
        totalRejections: 1,
        rejectionsInWindow: 1,
        rejectionRate: 33,
        escalationTriggered: false,
        trend: 'stable',
      }

      mockUseCommunicationMetrics.mockReturnValue({
        metrics,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(
        <CommunicationHealthIndicator
          {...defaultProps}
          childName="${process.env.SECRET}"
          isChild={false}
        />
      )

      const suggestion = screen.getByTestId('suggestion-text')
      expect(suggestion.textContent).toContain('${process.env.SECRET}')
      expect(suggestion.textContent).not.toContain('undefined')
    })

    it('should handle empty child name gracefully', () => {
      const metrics: CommunicationMetrics = {
        totalProposals: 4,
        totalRejections: 2,
        rejectionsInWindow: 2,
        rejectionRate: 50,
        escalationTriggered: false,
        trend: 'stable',
      }

      mockUseCommunicationMetrics.mockReturnValue({
        metrics,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<CommunicationHealthIndicator {...defaultProps} childName="   " isChild={false} />)

      const suggestion = screen.getByTestId('suggestion-text')
      expect(suggestion.textContent).toContain('Your child has made 4 requests')
    })

    it('should return null for invalid childId', () => {
      mockUseCommunicationMetrics.mockReturnValue({
        metrics: null,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      const { container } = render(
        <CommunicationHealthIndicator childId="" familyId="family-123" childName="Emma" />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should return null for invalid familyId', () => {
      mockUseCommunicationMetrics.mockReturnValue({
        metrics: null,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      const { container } = render(
        <CommunicationHealthIndicator childId="child-123" familyId="" childName="Emma" />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should handle Unicode and emoji in child names', () => {
      const metrics: CommunicationMetrics = {
        totalProposals: 2,
        totalRejections: 1,
        rejectionsInWindow: 1,
        rejectionRate: 50,
        escalationTriggered: false,
        trend: 'stable',
      }

      mockUseCommunicationMetrics.mockReturnValue({
        metrics,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<CommunicationHealthIndicator {...defaultProps} childName="Emma 👧🏻" isChild={false} />)

      const suggestion = screen.getByTestId('suggestion-text')
      expect(suggestion.textContent).toContain('Emma 👧🏻')
    })
  })
})
