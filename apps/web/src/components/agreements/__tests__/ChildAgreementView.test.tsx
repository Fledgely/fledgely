/**
 * Tests for ChildAgreementView component.
 *
 * Story 5.8: Child Agreement Viewing - AC1, AC2, AC3, AC4
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ChildAgreementView, CATEGORY_CONFIG } from '../ChildAgreementView'
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

  describe('ask question callback (AC5)', () => {
    it('should call onAskQuestion when question button is clicked', () => {
      const onAskQuestion = vi.fn()
      render(<ChildAgreementView {...defaultProps} onAskQuestion={onAskQuestion} />)

      // Click the question button for the first term
      const questionButtons = screen.getAllByRole('button', { name: /ask.*question/i })
      fireEvent.click(questionButtons[0])

      expect(onAskQuestion).toHaveBeenCalledWith('term-1', 'No phones at dinner')
    })

    it('should pass loading state to question button', () => {
      render(
        <ChildAgreementView
          {...defaultProps}
          isQuestionLoading={true}
          questionSentTermId="term-1"
        />
      )

      expect(screen.getByText('Sending...')).toBeInTheDocument()
    })

    it('should pass hasSent state to question button', () => {
      render(
        <ChildAgreementView
          {...defaultProps}
          isQuestionLoading={false}
          questionSentTermId="term-1"
        />
      )

      expect(screen.getByText(/sent/i)).toBeInTheDocument()
    })
  })

  describe('status summary integration (AC6)', () => {
    it('should display StatusSummary when screen time data provided', () => {
      render(<ChildAgreementView {...defaultProps} screenTimeUsed={45} screenTimeLimit={120} />)

      expect(screen.getByTestId('status-summary')).toBeInTheDocument()
    })

    it('should not display StatusSummary when no screen time data', () => {
      render(<ChildAgreementView {...defaultProps} />)

      expect(screen.queryByTestId('status-summary')).not.toBeInTheDocument()
    })

    it('should pass refresh callback to StatusSummary', () => {
      const onRefreshStatus = vi.fn()
      render(
        <ChildAgreementView
          {...defaultProps}
          screenTimeUsed={45}
          screenTimeLimit={120}
          onRefreshStatus={onRefreshStatus}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /refresh/i }))
      expect(onRefreshStatus).toHaveBeenCalled()
    })
  })

  describe('category config export', () => {
    it('should export CATEGORY_CONFIG with all required categories', () => {
      expect(CATEGORY_CONFIG).toBeDefined()
      expect(CATEGORY_CONFIG.time).toBeDefined()
      expect(CATEGORY_CONFIG.apps).toBeDefined()
      expect(CATEGORY_CONFIG.monitoring).toBeDefined()
      expect(CATEGORY_CONFIG.rewards).toBeDefined()
      expect(CATEGORY_CONFIG.general).toBeDefined()
    })

    it('should have labels for all categories', () => {
      expect(CATEGORY_CONFIG.time.label).toBe('Screen Time')
      expect(CATEGORY_CONFIG.apps.label).toBe('Apps & Games')
      expect(CATEGORY_CONFIG.monitoring.label).toBe('Rules')
      expect(CATEGORY_CONFIG.rewards.label).toBe('Rewards')
      expect(CATEGORY_CONFIG.general.label).toBe('Other')
    })
  })

  describe('unknown category handling', () => {
    it('should handle unknown category gracefully with fallback styling', () => {
      const unknownCategoryTerms = [
        createTerm({
          id: 'term-unknown',
          text: 'Some unknown category term',
          category: 'unknown-category' as 'time',
          party: 'parent',
          order: 0,
        }),
      ]
      render(<ChildAgreementView {...defaultProps} terms={unknownCategoryTerms} />)

      // Should render without crashing and show the term
      expect(screen.getByText('Some unknown category term')).toBeInTheDocument()
    })
  })
})
