/**
 * FamilyTrustOverview Component Tests - Story 36.6 Task 3
 *
 * Tests for family trust overview without leaderboard.
 * AC4: No family-wide leaderboard (prevents competition)
 * AC6: Privacy maintains dignity and prevents shame
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FamilyTrustOverview } from './FamilyTrustOverview'

const createChildData = (
  id: string,
  name: string,
  score: number
): { id: string; name: string; score: number } => ({
  id,
  name,
  score,
})

describe('FamilyTrustOverview - Story 36.6 Task 3', () => {
  describe('AC4: No family-wide leaderboard', () => {
    it('should render the overview container', () => {
      const childData = [createChildData('child-1', 'Alex', 85)]

      render(<FamilyTrustOverview childData={childData} />)

      expect(screen.getByTestId('family-trust-overview')).toBeInTheDocument()
    })

    it('should display each child as individual card', () => {
      const childData = [
        createChildData('child-1', 'Alex', 85),
        createChildData('child-2', 'Jordan', 72),
        createChildData('child-3', 'Taylor', 90),
      ]

      render(<FamilyTrustOverview childData={childData} />)

      expect(screen.getAllByTestId('child-card')).toHaveLength(3)
    })

    it('should NOT rank children', () => {
      const childData = [
        createChildData('child-1', 'Alex', 85),
        createChildData('child-2', 'Jordan', 95),
        createChildData('child-3', 'Taylor', 60),
      ]

      render(<FamilyTrustOverview childData={childData} />)

      const cards = screen.getAllByTestId('child-card')

      // Cards should not have ranking indicators
      cards.forEach((card) => {
        expect(card.textContent).not.toMatch(/#\d|rank|place|position/i)
      })
    })

    it('should NOT show comparison metrics', () => {
      const childData = [
        createChildData('child-1', 'Alex', 85),
        createChildData('child-2', 'Jordan', 72),
      ]

      render(<FamilyTrustOverview childData={childData} />)

      const overview = screen.getByTestId('family-trust-overview')

      // Should not contain comparison language
      expect(overview.textContent).not.toMatch(
        /better|worse|highest|lowest|best|worst|winner|loser/i
      )
    })

    it('should NOT show "best performer" indicators', () => {
      const childData = [
        createChildData('child-1', 'Alex', 95), // Highest score
        createChildData('child-2', 'Jordan', 72),
      ]

      render(<FamilyTrustOverview childData={childData} />)

      expect(screen.queryByTestId('best-performer')).not.toBeInTheDocument()
      expect(screen.queryByTestId('top-scorer')).not.toBeInTheDocument()
    })

    it('should show children in consistent order (alphabetical by name)', () => {
      const childData = [
        createChildData('child-3', 'Zara', 60),
        createChildData('child-1', 'Alex', 95),
        createChildData('child-2', 'Morgan', 72),
      ]

      render(<FamilyTrustOverview childData={childData} />)

      const cards = screen.getAllByTestId('child-name')

      // Should be alphabetical, not sorted by score
      expect(cards[0]).toHaveTextContent('Alex')
      expect(cards[1]).toHaveTextContent('Morgan')
      expect(cards[2]).toHaveTextContent('Zara')
    })
  })

  describe('AC6: Privacy maintains dignity', () => {
    it('should display each child equally', () => {
      const childData = [
        createChildData('child-1', 'Alex', 95),
        createChildData('child-2', 'Jordan', 45), // Low score
      ]

      render(<FamilyTrustOverview childData={childData} />)

      const cards = screen.getAllByTestId('child-card')

      // All cards should have the same visual treatment (no shame styling)
      cards.forEach((card) => {
        expect(card).not.toHaveAttribute('data-status', 'poor')
        expect(card).not.toHaveAttribute('data-highlighted', 'best')
      })
    })

    it('should use encouraging language for all scores', () => {
      const childData = [createChildData('child-1', 'Alex', 35)] // Low score

      render(<FamilyTrustOverview childData={childData} />)

      const card = screen.getByTestId('child-card')

      // Should not use shame-inducing language
      expect(card.textContent).not.toMatch(/poor|bad|failing|behind/i)
    })

    it('should show growth opportunity for low scores', () => {
      const childData = [createChildData('child-1', 'Alex', 35)]

      render(<FamilyTrustOverview childData={childData} />)

      // Should show growth-focused messaging
      expect(screen.getByTestId('score-context')).toBeInTheDocument()
    })
  })

  describe('Individual child cards', () => {
    it('should show child name', () => {
      const childData = [createChildData('child-1', 'Alex', 85)]

      render(<FamilyTrustOverview childData={childData} />)

      expect(screen.getByTestId('child-name')).toHaveTextContent('Alex')
    })

    it('should show child score', () => {
      const childData = [createChildData('child-1', 'Alex', 85)]

      render(<FamilyTrustOverview childData={childData} />)

      expect(screen.getByTestId('child-score')).toHaveTextContent('85')
    })

    it('should show score level indicator', () => {
      const childData = [createChildData('child-1', 'Alex', 85)]

      render(<FamilyTrustOverview childData={childData} />)

      expect(screen.getByTestId('score-level')).toBeInTheDocument()
    })

    it('should handle click to view details', () => {
      const onChildClick = vi.fn()
      const childData = [createChildData('child-1', 'Alex', 85)]

      render(<FamilyTrustOverview childData={childData} onChildClick={onChildClick} />)

      fireEvent.click(screen.getByTestId('child-card'))

      expect(onChildClick).toHaveBeenCalledWith('child-1')
    })
  })

  describe('Empty state', () => {
    it('should show empty state when no children', () => {
      render(<FamilyTrustOverview childData={[]} />)

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible list structure', () => {
      const childData = [createChildData('child-1', 'Alex', 85)]

      render(<FamilyTrustOverview childData={childData} />)

      expect(screen.getByRole('list')).toBeInTheDocument()
    })

    it('should have accessible buttons', () => {
      const childData = [createChildData('child-1', 'Alex', 85)]

      render(<FamilyTrustOverview childData={childData} onChildClick={vi.fn()} />)

      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })
})
