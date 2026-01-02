/**
 * ProportionalitySuggestions Tests - Story 38.4 Task 7
 *
 * Tests for displaying suggestions based on age and trust score.
 * AC4: Suggestions based on age and trust score
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ProportionalitySuggestions, {
  type ProportionalitySuggestionsProps,
} from './ProportionalitySuggestions'
import type { ProportionalitySuggestion } from '@fledgely/shared'

describe('ProportionalitySuggestions', () => {
  const mockSuggestions: ProportionalitySuggestion[] = [
    {
      type: 'graduation_eligible',
      title: 'Ready to Graduate',
      description: 'Your family may be ready to end monitoring.',
      basedOn: {
        childAge: 16,
        trustScore: 100,
        monthsMonitored: 24,
        trustMilestone: 'trusted',
      },
      priority: 'high',
    },
    {
      type: 'reduce_monitoring',
      title: 'Consider Reduced Monitoring',
      description: 'Trust level suggests monitoring can be reduced.',
      basedOn: {
        childAge: 15,
        trustScore: 90,
        monthsMonitored: 18,
        trustMilestone: null,
      },
      priority: 'medium',
    },
  ]

  const defaultProps: ProportionalitySuggestionsProps = {
    suggestions: mockSuggestions,
    childName: 'Alex',
    viewerType: 'parent',
    onDismiss: vi.fn(),
  }

  // ============================================
  // Display Tests (AC4)
  // ============================================

  describe('Display suggestions (AC4)', () => {
    it('should display all suggestions', () => {
      render(<ProportionalitySuggestions {...defaultProps} />)

      expect(screen.getByText('Ready to Graduate')).toBeInTheDocument()
      expect(screen.getByText('Consider Reduced Monitoring')).toBeInTheDocument()
    })

    it('should display suggestion descriptions', () => {
      render(<ProportionalitySuggestions {...defaultProps} />)

      expect(screen.getByText(/Your family may be ready/i)).toBeInTheDocument()
      expect(screen.getByText(/Trust level suggests/i)).toBeInTheDocument()
    })

    it('should display basis data', () => {
      render(<ProportionalitySuggestions {...defaultProps} />)

      expect(screen.getByText('Age: 16')).toBeInTheDocument()
      expect(screen.getByText('Trust: 100%')).toBeInTheDocument()
      expect(screen.getByText('24 months monitored')).toBeInTheDocument()
    })

    it('should display trust milestone when present', () => {
      render(<ProportionalitySuggestions {...defaultProps} />)

      expect(screen.getByText('Milestone: trusted')).toBeInTheDocument()
    })

    it('should not display milestone when null', () => {
      const singleSuggestion: ProportionalitySuggestion[] = [mockSuggestions[1]]
      render(<ProportionalitySuggestions {...defaultProps} suggestions={singleSuggestion} />)

      expect(screen.queryByText(/Milestone:/)).not.toBeInTheDocument()
    })
  })

  // ============================================
  // Viewer Type Tests
  // ============================================

  describe('Viewer type', () => {
    it('should show parent-specific header', () => {
      render(<ProportionalitySuggestions {...defaultProps} />)

      expect(screen.getByText('Suggestions for Alex')).toBeInTheDocument()
    })

    it('should show child-specific header', () => {
      render(<ProportionalitySuggestions {...defaultProps} viewerType="child" />)

      expect(screen.getByText('What We Suggest')).toBeInTheDocument()
    })
  })

  // ============================================
  // Empty State Tests
  // ============================================

  describe('Empty state', () => {
    it('should show message when no suggestions', () => {
      render(<ProportionalitySuggestions {...defaultProps} suggestions={[]} />)

      expect(screen.getByText(/No suggestions available/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // Action Links Tests
  // ============================================

  describe('Action links', () => {
    it('should show trust score link', () => {
      render(<ProportionalitySuggestions {...defaultProps} />)

      expect(screen.getByRole('link', { name: /Trust Score Progress/i })).toHaveAttribute(
        'href',
        '/dashboard/trust'
      )
    })

    it('should show graduation link when graduation suggestion present', () => {
      render(<ProportionalitySuggestions {...defaultProps} />)

      expect(screen.getByRole('link', { name: /Graduation Path/i })).toHaveAttribute(
        'href',
        '/dashboard/graduation'
      )
    })

    it('should not show graduation link when no graduation suggestion', () => {
      const noGraduation: ProportionalitySuggestion[] = [mockSuggestions[1]]
      render(<ProportionalitySuggestions {...defaultProps} suggestions={noGraduation} />)

      expect(screen.queryByRole('link', { name: /Graduation Path/i })).not.toBeInTheDocument()
    })
  })

  // ============================================
  // Dismiss Tests
  // ============================================

  describe('Dismiss functionality', () => {
    it('should show dismiss button when onDismiss provided', () => {
      render(<ProportionalitySuggestions {...defaultProps} />)

      expect(screen.getByRole('button', { name: /Dismiss/i })).toBeInTheDocument()
    })

    it('should not show dismiss button when onDismiss not provided', () => {
      render(<ProportionalitySuggestions {...defaultProps} onDismiss={undefined} />)

      expect(screen.queryByRole('button', { name: /Dismiss/i })).not.toBeInTheDocument()
    })

    it('should call onDismiss when clicked', () => {
      const onDismiss = vi.fn()
      render(<ProportionalitySuggestions {...defaultProps} onDismiss={onDismiss} />)

      fireEvent.click(screen.getByRole('button', { name: /Dismiss/i }))

      expect(onDismiss).toHaveBeenCalled()
    })
  })

  // ============================================
  // Priority Styling Tests
  // ============================================

  describe('Priority styling', () => {
    it('should have correct high priority styling', () => {
      const highPriority: ProportionalitySuggestion[] = [mockSuggestions[0]]
      render(<ProportionalitySuggestions {...defaultProps} suggestions={highPriority} />)

      // The styled card is the outer wrapper containing the title
      const title = screen.getByText('Ready to Graduate')
      // Navigate up: title h3 -> flex-1 div -> flex items-start div -> styled card div
      const card = title.closest('.flex-1')?.parentElement?.parentElement
      expect(card?.className).toContain('bg-green-50')
    })

    it('should have correct medium priority styling', () => {
      const mediumPriority: ProportionalitySuggestion[] = [mockSuggestions[1]]
      render(<ProportionalitySuggestions {...defaultProps} suggestions={mediumPriority} />)

      const title = screen.getByText('Consider Reduced Monitoring')
      const card = title.closest('.flex-1')?.parentElement?.parentElement
      expect(card?.className).toContain('bg-blue-50')
    })
  })
})
