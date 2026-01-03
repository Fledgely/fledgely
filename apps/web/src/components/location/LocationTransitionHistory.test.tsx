/**
 * LocationTransitionHistory Component Tests - Story 40.4
 *
 * Tests for location transition history table.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LocationTransitionHistory, type TransitionRecord } from './LocationTransitionHistory'

describe('LocationTransitionHistory', () => {
  const mockTransitions: TransitionRecord[] = [
    {
      id: 'trans-1',
      childId: 'child-1',
      childName: 'Emma',
      fromZoneName: null,
      toZoneName: 'School',
      detectedAt: new Date('2024-01-15T08:30:00'),
      appliedAt: new Date('2024-01-15T08:35:00'),
      rulesApplied: {
        dailyTimeLimitMinutes: 120,
        educationOnlyMode: true,
      },
    },
    {
      id: 'trans-2',
      childId: 'child-1',
      childName: 'Emma',
      fromZoneName: 'School',
      toZoneName: null,
      detectedAt: new Date('2024-01-15T15:00:00'),
      appliedAt: null,
      rulesApplied: null,
    },
  ]

  const defaultProps = {
    transitions: mockTransitions,
    isLoading: false,
    page: 1,
    totalPages: 1,
    onPageChange: vi.fn(),
  }

  describe('loading state', () => {
    it('shows loading message when loading', () => {
      render(<LocationTransitionHistory {...defaultProps} transitions={[]} isLoading={true} />)

      expect(screen.getByText('Loading transitions...')).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('shows empty message when no transitions', () => {
      render(<LocationTransitionHistory {...defaultProps} transitions={[]} />)

      expect(screen.getByText(/no location transitions recorded/i)).toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('shows error message', () => {
      render(<LocationTransitionHistory {...defaultProps} error="Failed to load transitions" />)

      expect(screen.getByText('Failed to load transitions')).toBeInTheDocument()
    })
  })

  describe('table display', () => {
    it('renders table headers', () => {
      render(<LocationTransitionHistory {...defaultProps} />)

      expect(screen.getByText('Child')).toBeInTheDocument()
      expect(screen.getByText('Transition')).toBeInTheDocument()
      expect(screen.getByText('Time')).toBeInTheDocument()
      expect(screen.getByText('Rules Applied')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
    })

    it('shows child names', () => {
      render(<LocationTransitionHistory {...defaultProps} />)

      expect(screen.getAllByText('Emma')).toHaveLength(2)
    })

    it('shows entered zone badge', () => {
      render(<LocationTransitionHistory {...defaultProps} />)

      expect(screen.getByText('Entered School')).toBeInTheDocument()
    })

    it('shows left zone badge', () => {
      render(<LocationTransitionHistory {...defaultProps} />)

      expect(screen.getByText('Left School')).toBeInTheDocument()
    })

    it('shows applied status', () => {
      render(<LocationTransitionHistory {...defaultProps} />)

      expect(screen.getByText('Applied')).toBeInTheDocument()
    })

    it('shows pending status', () => {
      render(<LocationTransitionHistory {...defaultProps} />)

      expect(screen.getByText('Pending')).toBeInTheDocument()
    })

    it('shows rules applied summary', () => {
      render(<LocationTransitionHistory {...defaultProps} />)

      expect(screen.getByText(/120min limit/)).toBeInTheDocument()
      expect(screen.getByText(/Education only/)).toBeInTheDocument()
    })
  })

  describe('pagination', () => {
    it('hides pagination when only one page', () => {
      render(<LocationTransitionHistory {...defaultProps} totalPages={1} />)

      expect(screen.queryByText('Previous')).not.toBeInTheDocument()
      expect(screen.queryByText('Next')).not.toBeInTheDocument()
    })

    it('shows pagination when multiple pages', () => {
      render(<LocationTransitionHistory {...defaultProps} totalPages={3} page={2} />)

      expect(screen.getByText('Previous')).toBeInTheDocument()
      expect(screen.getByText('Next')).toBeInTheDocument()
      expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()
    })

    it('calls onPageChange when clicking next', () => {
      const onPageChange = vi.fn()
      render(
        <LocationTransitionHistory
          {...defaultProps}
          totalPages={3}
          page={1}
          onPageChange={onPageChange}
        />
      )

      fireEvent.click(screen.getByText('Next'))
      expect(onPageChange).toHaveBeenCalledWith(2)
    })

    it('calls onPageChange when clicking previous', () => {
      const onPageChange = vi.fn()
      render(
        <LocationTransitionHistory
          {...defaultProps}
          totalPages={3}
          page={2}
          onPageChange={onPageChange}
        />
      )

      fireEvent.click(screen.getByText('Previous'))
      expect(onPageChange).toHaveBeenCalledWith(1)
    })

    it('disables previous on first page', () => {
      render(<LocationTransitionHistory {...defaultProps} totalPages={3} page={1} />)

      expect(screen.getByText('Previous')).toBeDisabled()
    })

    it('disables next on last page', () => {
      render(<LocationTransitionHistory {...defaultProps} totalPages={3} page={3} />)

      expect(screen.getByText('Next')).toBeDisabled()
    })
  })
})
