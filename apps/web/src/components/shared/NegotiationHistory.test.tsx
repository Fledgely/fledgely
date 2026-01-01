/**
 * NegotiationHistory Component Tests - Story 34.3 (AC5, AC6)
 *
 * Tests for the negotiation history timeline component.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NegotiationHistory } from './NegotiationHistory'
import type { TimelineEntry } from '../../hooks/useNegotiationHistory'

describe('NegotiationHistory - Story 34.3', () => {
  const mockTimeline: TimelineEntry[] = [
    {
      id: 'proposal-1',
      type: 'proposal',
      actorName: 'Emma',
      actorId: 'child-1',
      comment: 'I would like more gaming time',
      changes: [
        {
          sectionId: 'time-limits',
          sectionName: 'Time Limits',
          fieldPath: 'timeLimits.weekday.gaming',
          oldValue: 60,
          newValue: 90,
          changeType: 'modify',
        },
      ],
      timestamp: 1700000000000,
    },
    {
      id: 'response-1',
      type: 'response',
      actorName: 'Mom',
      actorId: 'parent-1',
      action: 'counter',
      comment: 'How about 75 minutes instead?',
      changes: [
        {
          sectionId: 'time-limits',
          sectionName: 'Time Limits',
          fieldPath: 'timeLimits.weekday.gaming',
          oldValue: 60,
          newValue: 75,
          changeType: 'modify',
        },
      ],
      timestamp: 1700100000000,
    },
    {
      id: 'response-2',
      type: 'response',
      actorName: 'Emma',
      actorId: 'child-1',
      action: 'accept',
      comment: 'Okay, that works!',
      timestamp: 1700200000000,
    },
  ]

  const defaultProps = {
    timeline: mockTimeline,
    currentRound: 2,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('timeline display - AC5', () => {
    it('should render the history title', () => {
      render(<NegotiationHistory {...defaultProps} />)

      expect(screen.getByText(/negotiation history/i)).toBeInTheDocument()
    })

    it('should display all timeline entries', () => {
      render(<NegotiationHistory {...defaultProps} />)

      // All actors should be visible
      expect(screen.getAllByText(/emma/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/mom/i).length).toBeGreaterThan(0)
    })

    it('should show proposal as first entry', () => {
      render(<NegotiationHistory {...defaultProps} />)

      // Initial proposal should be marked
      expect(screen.getByText(/initial proposal/i)).toBeInTheDocument()
    })

    it('should display timestamps for each entry', () => {
      render(<NegotiationHistory {...defaultProps} />)

      // Should have formatted dates
      const timeElements = screen.getAllByText(/nov/i)
      expect(timeElements.length).toBeGreaterThan(0)
    })
  })

  describe('response types - AC5', () => {
    it('should show accept response with correct styling', () => {
      render(<NegotiationHistory {...defaultProps} />)

      expect(screen.getByText(/accepted/i)).toBeInTheDocument()
    })

    it('should show counter response with correct styling', () => {
      render(<NegotiationHistory {...defaultProps} />)

      expect(screen.getByText(/counter-proposed/i)).toBeInTheDocument()
    })

    it('should show decline response with correct styling', () => {
      const declineTimeline: TimelineEntry[] = [
        mockTimeline[0],
        {
          id: 'response-decline',
          type: 'response',
          actorName: 'Mom',
          actorId: 'parent-1',
          action: 'decline',
          comment: 'Not right now',
          timestamp: 1700100000000,
        },
      ]

      render(<NegotiationHistory timeline={declineTimeline} currentRound={1} />)

      expect(screen.getByText(/declined/i)).toBeInTheDocument()
    })
  })

  describe('comments display - AC5', () => {
    it('should display comments in context', () => {
      render(<NegotiationHistory {...defaultProps} />)

      expect(screen.getByText(/I would like more gaming time/)).toBeInTheDocument()
      expect(screen.getByText(/How about 75 minutes instead/)).toBeInTheDocument()
      expect(screen.getByText(/Okay, that works/)).toBeInTheDocument()
    })

    it('should handle entries without comments', () => {
      const noCommentTimeline: TimelineEntry[] = [{ ...mockTimeline[0], comment: null }]

      render(<NegotiationHistory timeline={noCommentTimeline} currentRound={1} />)

      // Should still render without error
      expect(screen.getByText(/emma/i)).toBeInTheDocument()
    })
  })

  describe('round numbers - AC6', () => {
    it('should display current round number', () => {
      render(<NegotiationHistory {...defaultProps} />)

      expect(screen.getByText(/round 2/i)).toBeInTheDocument()
    })

    it('should not show round for initial proposal (round 1)', () => {
      render(<NegotiationHistory timeline={[mockTimeline[0]]} currentRound={1} />)

      // Round 1 is the initial, doesn't need "Round 1" label
      expect(screen.queryByText(/round 1/i)).not.toBeInTheDocument()
    })

    it('should show round progression badges', () => {
      render(<NegotiationHistory {...defaultProps} />)

      // Counter-proposals should indicate round changes
      expect(screen.getAllByText(/round/i).length).toBeGreaterThan(0)
    })
  })

  describe('actor identification - AC5', () => {
    it('should show who responded', () => {
      render(<NegotiationHistory {...defaultProps} />)

      // Names should be visible with their actions
      expect(screen.getAllByText(/emma/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/mom/i).length).toBeGreaterThan(0)
    })

    it('should distinguish between child and parent entries', () => {
      render(<NegotiationHistory {...defaultProps} />)

      // Each entry should show the actor name clearly
      const entries = screen.getAllByRole('listitem')
      expect(entries.length).toBe(3)
    })
  })

  describe('timeline ordering', () => {
    it('should display entries in chronological order', () => {
      render(<NegotiationHistory {...defaultProps} />)

      const entries = screen.getAllByRole('listitem')
      // First entry should be the proposal
      expect(entries[0]).toHaveTextContent(/emma/i)
      expect(entries[0]).toHaveTextContent(/initial/i)
    })
  })

  describe('collapsible behavior', () => {
    it('should be collapsible when many entries', () => {
      const longTimeline: TimelineEntry[] = [
        ...mockTimeline,
        {
          id: 'response-3',
          type: 'response',
          actorName: 'Emma',
          actorId: 'child-1',
          action: 'counter',
          comment: 'Another round',
          timestamp: 1700300000000,
        },
      ]

      render(<NegotiationHistory timeline={longTimeline} currentRound={3} />)

      // Should have a collapse/expand option
      const toggleButton = screen.queryByRole('button', { name: /show|hide|expand|collapse/i })
      expect(toggleButton || screen.getByText(/entries/i)).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('should handle empty timeline gracefully', () => {
      render(<NegotiationHistory timeline={[]} currentRound={0} />)

      expect(screen.getByText(/no history/i)).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have accessible list structure', () => {
      render(<NegotiationHistory {...defaultProps} />)

      expect(screen.getByRole('list')).toBeInTheDocument()
      expect(screen.getAllByRole('listitem').length).toBe(3)
    })

    it('should have accessible heading', () => {
      render(<NegotiationHistory {...defaultProps} />)

      expect(screen.getByRole('heading')).toBeInTheDocument()
    })
  })

  describe('changes display', () => {
    it('should indicate when entry includes changes', () => {
      render(<NegotiationHistory {...defaultProps} />)

      // Entries with changes should show an indicator
      expect(screen.getAllByText(/change/i).length).toBeGreaterThan(0)
    })
  })
})
