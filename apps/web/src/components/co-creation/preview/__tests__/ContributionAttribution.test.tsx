/**
 * Tests for ContributionAttribution Component
 *
 * Story 5.5: Agreement Preview & Summary - Task 3.6
 *
 * Tests for the contribution attribution display component.
 */

import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ContributionAttribution } from '../ContributionAttribution'
import type { ContributionSummary } from '@fledgely/contracts'

// ============================================
// TEST FIXTURES
// ============================================

const createMockContribution = (
  overrides: Partial<ContributionSummary> = {}
): ContributionSummary => ({
  termId: '550e8400-e29b-41d4-a716-446655440000',
  addedBy: 'parent',
  termTitle: 'Screen Time Limit',
  category: 'screen_time',
  ...overrides,
})

const defaultContributions: ContributionSummary[] = [
  createMockContribution({
    termId: 'term-1',
    addedBy: 'parent',
    termTitle: 'Daily screen time limit',
    category: 'screen_time',
  }),
  createMockContribution({
    termId: 'term-2',
    addedBy: 'child',
    termTitle: 'No phones at dinner',
    category: 'rule',
  }),
  createMockContribution({
    termId: 'term-3',
    addedBy: 'parent',
    termTitle: 'Bedtime for devices',
    category: 'bedtime',
  }),
]

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('ContributionAttribution', () => {
  describe('basic rendering', () => {
    it('renders the component', () => {
      render(<ContributionAttribution contributions={defaultContributions} />)
      expect(screen.getByTestId('contribution-attribution')).toBeInTheDocument()
    })

    it('renders custom data-testid', () => {
      render(
        <ContributionAttribution
          contributions={defaultContributions}
          data-testid="custom-attribution"
        />
      )
      expect(screen.getByTestId('custom-attribution')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(
        <ContributionAttribution
          contributions={defaultContributions}
          className="custom-class"
        />
      )
      expect(screen.getByTestId('contribution-attribution')).toHaveClass('custom-class')
    })

    it('shows header', () => {
      render(<ContributionAttribution contributions={defaultContributions} />)
      expect(screen.getByText('Who Added What')).toBeInTheDocument()
    })

    it('shows total count', () => {
      render(<ContributionAttribution contributions={defaultContributions} />)
      expect(screen.getByText('3 terms total')).toBeInTheDocument()
    })

    it('uses singular for one term', () => {
      render(<ContributionAttribution contributions={[defaultContributions[0]]} />)
      expect(screen.getByText('1 term total')).toBeInTheDocument()
    })
  })

  // ============================================
  // EMPTY STATE TESTS
  // ============================================

  describe('empty state', () => {
    it('shows empty message when no contributions', () => {
      render(<ContributionAttribution contributions={[]} />)
      expect(screen.getByText('No contributions to display.')).toBeInTheDocument()
    })

    it('has status role for empty state', () => {
      render(<ContributionAttribution contributions={[]} />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })
  })

  // ============================================
  // CONTRIBUTOR BADGE TESTS (AC #2)
  // ============================================

  describe('contributor badges (AC #2)', () => {
    it('shows parent badge', () => {
      render(<ContributionAttribution contributions={defaultContributions} />)
      expect(screen.getAllByText('P').length).toBeGreaterThanOrEqual(1)
    })

    it('shows child badge', () => {
      render(<ContributionAttribution contributions={defaultContributions} />)
      expect(screen.getAllByText('C').length).toBeGreaterThanOrEqual(1)
    })

    it('has accessible labels on badges', () => {
      render(<ContributionAttribution contributions={defaultContributions} />)
      expect(screen.getAllByLabelText('Parent suggested').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByLabelText('Child suggested').length).toBeGreaterThanOrEqual(1)
    })
  })

  // ============================================
  // CONTRIBUTION ITEM TESTS
  // ============================================

  describe('contribution items', () => {
    it('renders all contributions', () => {
      render(<ContributionAttribution contributions={defaultContributions} />)

      expect(screen.getByTestId('contribution-item-term-1')).toBeInTheDocument()
      expect(screen.getByTestId('contribution-item-term-2')).toBeInTheDocument()
      expect(screen.getByTestId('contribution-item-term-3')).toBeInTheDocument()
    })

    it('shows term titles', () => {
      render(<ContributionAttribution contributions={defaultContributions} />)

      expect(screen.getByText('Daily screen time limit')).toBeInTheDocument()
      expect(screen.getByText('No phones at dinner')).toBeInTheDocument()
      expect(screen.getByText('Bedtime for devices')).toBeInTheDocument()
    })

    it('shows category labels', () => {
      render(<ContributionAttribution contributions={defaultContributions} />)

      expect(screen.getByText('Screen Time')).toBeInTheDocument()
      expect(screen.getByText('Rule')).toBeInTheDocument()
      expect(screen.getByText('Bedtime')).toBeInTheDocument()
    })

    it('shows attribution text', () => {
      render(<ContributionAttribution contributions={defaultContributions} />)

      expect(screen.getAllByText(/Added by parent/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/Added by child/i).length).toBeGreaterThanOrEqual(1)
    })

    it('shows modification info when present', () => {
      const withModifications = [
        createMockContribution({
          termId: 'term-1',
          addedBy: 'parent',
          termTitle: 'Modified term',
          modifiedBy: ['child'],
        }),
      ]
      render(<ContributionAttribution contributions={withModifications} />)

      expect(screen.getByText(/modified by/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // PERCENTAGE BREAKDOWN TESTS
  // ============================================

  describe('percentage breakdown', () => {
    it('shows stats by default', () => {
      render(<ContributionAttribution contributions={defaultContributions} />)
      expect(screen.getByTestId('contribution-stats')).toBeInTheDocument()
    })

    it('shows percentage bar', () => {
      render(<ContributionAttribution contributions={defaultContributions} />)
      expect(screen.getByTestId('percentage-bar-parent')).toBeInTheDocument()
      expect(screen.getByTestId('percentage-bar-child')).toBeInTheDocument()
    })

    it('can hide percentage with showPercentage=false', () => {
      render(
        <ContributionAttribution
          contributions={defaultContributions}
          showPercentage={false}
        />
      )
      expect(screen.queryByTestId('contribution-stats')).not.toBeInTheDocument()
    })

    it('shows correct counts', () => {
      render(<ContributionAttribution contributions={defaultContributions} />)
      // 2 parent, 1 child out of 3
      const statsContainer = screen.getByTestId('contribution-stats')
      expect(statsContainer.textContent).toContain('Parent: 2')
      expect(statsContainer.textContent).toContain('Child: 1')
    })

    it('shows correct percentages', () => {
      render(<ContributionAttribution contributions={defaultContributions} />)
      // 2 parent = 67%, 1 child = 33%
      const statsContainer = screen.getByTestId('contribution-stats')
      expect(statsContainer.textContent).toContain('67%')
      expect(statsContainer.textContent).toContain('33%')
    })
  })

  // ============================================
  // TIMELINE VIEW TESTS
  // ============================================

  describe('timeline view', () => {
    it('does not show timeline by default', () => {
      render(<ContributionAttribution contributions={defaultContributions} />)
      expect(screen.queryByTestId('contribution-timeline')).not.toBeInTheDocument()
    })

    it('shows timeline when enabled', () => {
      render(
        <ContributionAttribution
          contributions={defaultContributions}
          showTimeline={true}
        />
      )
      expect(screen.getByTestId('contribution-timeline')).toBeInTheDocument()
    })

    it('shows parent and child sections in timeline', () => {
      render(
        <ContributionAttribution
          contributions={defaultContributions}
          showTimeline={true}
        />
      )
      expect(screen.getByText('Parent Added')).toBeInTheDocument()
      expect(screen.getByText('Child Added')).toBeInTheDocument()
    })

    it('shows contribution lists in timeline', () => {
      render(
        <ContributionAttribution
          contributions={defaultContributions}
          showTimeline={true}
        />
      )
      expect(screen.getByRole('list', { name: 'Parent contributions' })).toBeInTheDocument()
      expect(screen.getByRole('list', { name: 'Child contributions' })).toBeInTheDocument()
    })

    it('hides detailed list when timeline is shown', () => {
      render(
        <ContributionAttribution
          contributions={defaultContributions}
          showTimeline={true}
        />
      )
      expect(screen.queryByText('Contribution Details')).not.toBeInTheDocument()
    })
  })

  // ============================================
  // SUMMARY STATEMENT TESTS
  // ============================================

  describe('summary statement', () => {
    it('shows parent contributed more when true', () => {
      const parentMajority = [
        createMockContribution({ termId: 't1', addedBy: 'parent' }),
        createMockContribution({ termId: 't2', addedBy: 'parent' }),
        createMockContribution({ termId: 't3', addedBy: 'child' }),
      ]
      render(<ContributionAttribution contributions={parentMajority} />)
      const container = screen.getByTestId('contribution-attribution')
      expect(container.textContent).toMatch(/Parent.*contributed more/i)
    })

    it('shows child contributed more when true', () => {
      const childMajority = [
        createMockContribution({ termId: 't1', addedBy: 'child' }),
        createMockContribution({ termId: 't2', addedBy: 'child' }),
        createMockContribution({ termId: 't3', addedBy: 'parent' }),
      ]
      render(<ContributionAttribution contributions={childMajority} />)
      const container = screen.getByTestId('contribution-attribution')
      expect(container.textContent).toMatch(/Child.*contributed more/i)
    })

    it('shows equal contribution message', () => {
      const equal = [
        createMockContribution({ termId: 't1', addedBy: 'parent' }),
        createMockContribution({ termId: 't2', addedBy: 'child' }),
      ]
      render(<ContributionAttribution contributions={equal} />)
      const container = screen.getByTestId('contribution-attribution')
      expect(container.textContent).toMatch(/Both.*contributed equally/i)
    })
  })

  // ============================================
  // ACCESSIBILITY TESTS
  // ============================================

  describe('accessibility', () => {
    it('has region role with label', () => {
      render(<ContributionAttribution contributions={defaultContributions} />)
      expect(
        screen.getByRole('region', { name: 'Contribution Attribution' })
      ).toBeInTheDocument()
    })

    it('has list role for contributions', () => {
      render(<ContributionAttribution contributions={defaultContributions} />)
      expect(
        screen.getByRole('list', { name: 'List of contributions' })
      ).toBeInTheDocument()
    })

    it('has accessible percentage bar', () => {
      render(<ContributionAttribution contributions={defaultContributions} />)
      expect(
        screen.getByRole('img', { name: /Contributions: Parent.*Child/ })
      ).toBeInTheDocument()
    })
  })

  // ============================================
  // EDGE CASES
  // ============================================

  describe('edge cases', () => {
    it('handles all parent contributions', () => {
      const allParent = [
        createMockContribution({ termId: 't1', addedBy: 'parent' }),
        createMockContribution({ termId: 't2', addedBy: 'parent' }),
      ]
      render(<ContributionAttribution contributions={allParent} showTimeline={true} />)

      const statsContainer = screen.getByTestId('contribution-stats')
      expect(statsContainer.textContent).toContain('Parent: 2')
      expect(screen.getByText('No contributions yet')).toBeInTheDocument()
    })

    it('handles all child contributions', () => {
      const allChild = [
        createMockContribution({ termId: 't1', addedBy: 'child' }),
        createMockContribution({ termId: 't2', addedBy: 'child' }),
      ]
      render(<ContributionAttribution contributions={allChild} showTimeline={true} />)

      const statsContainer = screen.getByTestId('contribution-stats')
      expect(statsContainer.textContent).toContain('Child: 2')
    })

    it('handles multiple modifiers', () => {
      const multipleModifiers = [
        createMockContribution({
          termId: 'term-1',
          addedBy: 'parent',
          termTitle: 'Multi-modified',
          modifiedBy: ['child', 'parent'],
        }),
      ]
      render(<ContributionAttribution contributions={multipleModifiers} />)

      expect(screen.getByText(/modified by/i)).toBeInTheDocument()
    })
  })
})
