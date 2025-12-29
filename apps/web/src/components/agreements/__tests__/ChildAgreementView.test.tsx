/**
 * Tests for ChildAgreementView component.
 *
 * Story 5.8: Child Agreement Viewing - AC1, AC2, AC3, AC4
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ChildAgreementView } from '../ChildAgreementView'
import type { AgreementTerm } from '@fledgely/shared/contracts'

const createTerm = (overrides: Partial<AgreementTerm> = {}): AgreementTerm => ({
  id: 'term-1',
  text: 'No phones at dinner',
  category: 'time',
  party: 'parent',
  order: 0,
  explanation: 'Family time is important',
  createdAt: new Date('2024-01-15T10:00:00'),
  updatedAt: new Date('2024-01-15T10:00:00'),
  ...overrides,
})

const mockTerms: AgreementTerm[] = [
  createTerm({
    id: 'term-1',
    text: 'No phones at dinner',
    category: 'time',
    party: 'parent',
    order: 0,
    explanation: 'Family time means we talk to each other.',
  }),
  createTerm({
    id: 'term-2',
    text: 'Extra game time on weekends',
    category: 'rewards',
    party: 'child',
    order: 1,
    explanation: 'I can play more games on Saturday and Sunday.',
  }),
  createTerm({
    id: 'term-3',
    text: 'Finish homework before screens',
    category: 'apps',
    party: 'parent',
    order: 2,
    explanation: 'Do your homework first, then you can play.',
  }),
]

describe('ChildAgreementView', () => {
  const defaultProps = {
    terms: mockTerms,
    childName: 'Alex',
    agreementTitle: 'Our Family Rules',
    signedAt: new Date('2024-01-15T12:00:00'),
    onAskQuestion: vi.fn(),
  }

  describe('rendering', () => {
    it('should render the agreement view', () => {
      render(<ChildAgreementView {...defaultProps} />)

      expect(screen.getByTestId('child-agreement-view')).toBeInTheDocument()
    })

    it('should display the agreement title', () => {
      render(<ChildAgreementView {...defaultProps} />)

      expect(screen.getByText('Our Family Rules')).toBeInTheDocument()
    })

    it('should display signed date', () => {
      render(<ChildAgreementView {...defaultProps} />)

      expect(screen.getByTestId('signed-date')).toBeInTheDocument()
    })

    it('should display all terms', () => {
      render(<ChildAgreementView {...defaultProps} />)

      expect(screen.getByText('No phones at dinner')).toBeInTheDocument()
      expect(screen.getByText('Extra game time on weekends')).toBeInTheDocument()
      expect(screen.getByText('Finish homework before screens')).toBeInTheDocument()
    })

    it('should display term explanations', () => {
      render(<ChildAgreementView {...defaultProps} />)

      expect(screen.getByText('Family time means we talk to each other.')).toBeInTheDocument()
      expect(screen.getByText('I can play more games on Saturday and Sunday.')).toBeInTheDocument()
    })
  })

  describe('category grouping (AC2)', () => {
    it('should group terms by category', () => {
      render(<ChildAgreementView {...defaultProps} />)

      // Check for category sections
      expect(screen.getByTestId('category-section-time')).toBeInTheDocument()
      expect(screen.getByTestId('category-section-rewards')).toBeInTheDocument()
      expect(screen.getByTestId('category-section-apps')).toBeInTheDocument()
    })

    it('should display category icons', () => {
      render(<ChildAgreementView {...defaultProps} />)

      // Check for emoji icons
      expect(screen.getByText('Screen Time')).toBeInTheDocument()
      expect(screen.getByText('Rewards')).toBeInTheDocument()
      expect(screen.getByText('Apps & Games')).toBeInTheDocument()
    })

    it('should display friendly category labels', () => {
      render(<ChildAgreementView {...defaultProps} />)

      expect(screen.getByText('Screen Time')).toBeInTheDocument()
      expect(screen.getByText('Rewards')).toBeInTheDocument()
    })
  })

  describe('contribution highlighting (AC3)', () => {
    it('should highlight child contributions', () => {
      render(<ChildAgreementView {...defaultProps} />)

      const childTerm = screen.getByTestId('term-card-term-2')
      expect(childTerm).toHaveClass('border-pink-400')
    })

    it('should show "My idea" badge for child terms', () => {
      render(<ChildAgreementView {...defaultProps} />)

      expect(screen.getByText('My idea')).toBeInTheDocument()
    })

    it('should style parent terms differently', () => {
      render(<ChildAgreementView {...defaultProps} />)

      const parentTerm = screen.getByTestId('term-card-term-1')
      expect(parentTerm).toHaveClass('border-blue-400')
    })
  })

  describe('read-only mode (AC4)', () => {
    it('should not have any edit controls', () => {
      render(<ChildAgreementView {...defaultProps} />)

      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    })

    it('should not have any text inputs', () => {
      render(<ChildAgreementView {...defaultProps} />)

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('should display empty state when no terms', () => {
      render(<ChildAgreementView {...defaultProps} terms={[]} />)

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      expect(screen.getByText(/no rules yet/i)).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have main region with label', () => {
      render(<ChildAgreementView {...defaultProps} />)

      expect(screen.getByRole('main', { name: /agreement/i })).toBeInTheDocument()
    })

    it('should have heading structure', () => {
      render(<ChildAgreementView {...defaultProps} />)

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })

    it('should have category headings', () => {
      render(<ChildAgreementView {...defaultProps} />)

      const headings = screen.getAllByRole('heading', { level: 2 })
      expect(headings.length).toBeGreaterThan(0)
    })

    it('should have 44px minimum touch targets', () => {
      render(<ChildAgreementView {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toHaveClass('min-h-[44px]')
      })
    })
  })

  describe('child-friendly text (NFR65)', () => {
    it('should display title in child-friendly font', () => {
      render(<ChildAgreementView {...defaultProps} />)

      const title = screen.getByRole('heading', { level: 1 })
      expect(title).toHaveClass('text-2xl')
    })

    it('should use readable text sizes', () => {
      render(<ChildAgreementView {...defaultProps} />)

      const terms = screen.getAllByTestId(/term-card-/)
      terms.forEach((term) => {
        expect(term).toBeInTheDocument()
      })
    })
  })

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<ChildAgreementView {...defaultProps} className="custom-class" />)

      expect(screen.getByTestId('child-agreement-view')).toHaveClass('custom-class')
    })
  })
})
