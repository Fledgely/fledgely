/**
 * Tests for ActiveAgreementCard component.
 *
 * Story 6.3: Agreement Activation - AC5
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ActiveAgreementCard } from '../ActiveAgreementCard'
import type { ActiveAgreement, AgreementTerm } from '@fledgely/shared/contracts'

// Helper to create mock terms
const createMockTerm = (overrides: Partial<AgreementTerm> = {}): AgreementTerm => ({
  id: 'term-1',
  text: 'No phones at dinner',
  category: 'time',
  party: 'child',
  order: 0,
  explanation: 'Family time is important',
  createdAt: new Date('2024-01-15T10:00:00'),
  updatedAt: new Date('2024-01-15T10:00:00'),
  ...overrides,
})

// Helper to create mock active agreement
const createMockAgreement = (overrides: Partial<ActiveAgreement> = {}): ActiveAgreement => ({
  id: 'agreement-1',
  familyId: 'family-1',
  childId: 'child-1',
  version: 'v1.0',
  signingSessionId: 'signing-1',
  coCreationSessionId: 'session-1',
  terms: [
    createMockTerm({ id: 'term-1', text: 'No phones at dinner' }),
    createMockTerm({ id: 'term-2', text: 'Homework before screen time' }),
    createMockTerm({ id: 'term-3', text: 'Devices off by 9 PM' }),
    createMockTerm({ id: 'term-4', text: 'Ask permission for new apps' }),
    createMockTerm({ id: 'term-5', text: 'Share passwords with parents' }),
    createMockTerm({ id: 'term-6', text: 'No devices during meals' }),
  ],
  activatedAt: new Date('2024-01-15T12:00:00'),
  activatedByUid: 'parent-1',
  status: 'active',
  archivedAt: null,
  archivedByAgreementId: null,
  ...overrides,
})

describe('ActiveAgreementCard', () => {
  const defaultProps = {
    agreement: createMockAgreement(),
  }

  describe('rendering', () => {
    it('should render the card', () => {
      render(<ActiveAgreementCard {...defaultProps} />)

      expect(screen.getByTestId('active-agreement-card')).toBeInTheDocument()
    })

    it('should display active agreement title for parent view', () => {
      render(<ActiveAgreementCard {...defaultProps} />)

      expect(screen.getByTestId('agreement-title')).toHaveTextContent('Active Agreement')
    })

    it('should display child-friendly title for child view', () => {
      render(<ActiveAgreementCard {...defaultProps} isChildView />)

      expect(screen.getByTestId('agreement-title')).toHaveTextContent('Our Family Agreement')
    })

    it('should display version number', () => {
      render(<ActiveAgreementCard {...defaultProps} />)

      expect(screen.getByTestId('agreement-version')).toHaveTextContent('Version v1.0')
    })

    it('should display status badge', () => {
      render(<ActiveAgreementCard {...defaultProps} />)

      expect(screen.getByTestId('status-badge')).toHaveTextContent('Active')
    })
  })

  describe('activation date display', () => {
    it('should display activation date for parent view', () => {
      render(<ActiveAgreementCard {...defaultProps} />)

      expect(screen.getByTestId('activation-date')).toHaveTextContent('Activated:')
    })

    it('should display "Started" for child view', () => {
      render(<ActiveAgreementCard {...defaultProps} isChildView />)

      expect(screen.getByTestId('activation-date')).toHaveTextContent('Started:')
    })

    it('should format date correctly', () => {
      render(<ActiveAgreementCard {...defaultProps} />)

      expect(screen.getByTestId('activation-date')).toHaveTextContent('January 15, 2024')
    })
  })

  describe('terms summary', () => {
    it('should display terms list', () => {
      render(<ActiveAgreementCard {...defaultProps} />)

      expect(screen.getByTestId('terms-list')).toBeInTheDocument()
    })

    it('should show first 5 terms for parent view', () => {
      render(<ActiveAgreementCard {...defaultProps} />)

      const termsList = screen.getByTestId('terms-list')
      const items = termsList.querySelectorAll('li')
      // 5 terms + 1 "more items" indicator
      expect(items.length).toBe(6)
    })

    it('should show first 3 terms for child view', () => {
      render(<ActiveAgreementCard {...defaultProps} isChildView />)

      const termsList = screen.getByTestId('terms-list')
      const items = termsList.querySelectorAll('li')
      // 3 terms + 1 "more items" indicator
      expect(items.length).toBe(4)
    })

    it('should show "more items" count when truncated', () => {
      render(<ActiveAgreementCard {...defaultProps} />)

      expect(screen.getByText(/\+1 more/)).toBeInTheDocument()
    })

    it('should use singular "item" for one more', () => {
      const agreement = createMockAgreement({
        terms: [
          createMockTerm({ id: 'term-1' }),
          createMockTerm({ id: 'term-2' }),
          createMockTerm({ id: 'term-3' }),
          createMockTerm({ id: 'term-4' }),
          createMockTerm({ id: 'term-5' }),
          createMockTerm({ id: 'term-6' }),
        ],
      })
      render(<ActiveAgreementCard agreement={agreement} />)

      expect(screen.getByText('+1 more item')).toBeInTheDocument()
    })

    it('should use plural "items" for multiple more', () => {
      const agreement = createMockAgreement({
        terms: Array.from({ length: 8 }, (_, i) =>
          createMockTerm({ id: `term-${i}`, text: `Term ${i}` })
        ),
      })
      render(<ActiveAgreementCard agreement={agreement} />)

      expect(screen.getByText('+3 more items')).toBeInTheDocument()
    })

    it('should not show "more items" when all fit', () => {
      const agreement = createMockAgreement({
        terms: [createMockTerm({ id: 'term-1' }), createMockTerm({ id: 'term-2' })],
      })
      render(<ActiveAgreementCard agreement={agreement} />)

      expect(screen.queryByText(/more item/)).not.toBeInTheDocument()
    })

    it('should truncate long term text', () => {
      const agreement = createMockAgreement({
        terms: [
          createMockTerm({
            id: 'term-1',
            text: 'This is a very long term text that should be truncated at some point',
          }),
        ],
      })
      render(<ActiveAgreementCard agreement={agreement} />)

      const termsList = screen.getByTestId('terms-list')
      expect(termsList.textContent).toContain('...')
    })

    it('should show heading based on view type', () => {
      render(<ActiveAgreementCard {...defaultProps} />)
      expect(screen.getByText('Key Terms:')).toBeInTheDocument()

      const { container } = render(<ActiveAgreementCard {...defaultProps} isChildView />)
      expect(container).toHaveTextContent('What we agreed to:')
    })
  })

  describe('view full agreement button', () => {
    it('should show button when onViewFull provided', () => {
      render(<ActiveAgreementCard {...defaultProps} onViewFull={vi.fn()} />)

      expect(screen.getByTestId('view-full-button')).toBeInTheDocument()
    })

    it('should not show button when onViewFull not provided', () => {
      render(<ActiveAgreementCard {...defaultProps} />)

      expect(screen.queryByTestId('view-full-button')).not.toBeInTheDocument()
    })

    it('should call onViewFull when clicked', () => {
      const onViewFull = vi.fn()
      render(<ActiveAgreementCard {...defaultProps} onViewFull={onViewFull} />)

      fireEvent.click(screen.getByTestId('view-full-button'))

      expect(onViewFull).toHaveBeenCalledTimes(1)
    })

    it('should have correct button text', () => {
      render(<ActiveAgreementCard {...defaultProps} onViewFull={vi.fn()} />)

      expect(screen.getByTestId('view-full-button')).toHaveTextContent('View Full Agreement')
    })
  })

  describe('accessibility', () => {
    it('should have accessible article element', () => {
      render(<ActiveAgreementCard {...defaultProps} />)

      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('should have aria-labelledby on article', () => {
      render(<ActiveAgreementCard {...defaultProps} />)

      const article = screen.getByRole('article')
      expect(article).toHaveAttribute('aria-labelledby', 'agreement-title')
    })

    it('should have status badge with role="status"', () => {
      render(<ActiveAgreementCard {...defaultProps} />)

      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should have aria-label on status badge', () => {
      render(<ActiveAgreementCard {...defaultProps} />)

      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Agreement status: Active')
    })

    it('should have aria-label on terms list', () => {
      render(<ActiveAgreementCard {...defaultProps} />)

      expect(screen.getByLabelText('Agreement terms summary')).toBeInTheDocument()
    })

    it('should have 44px minimum touch target on button', () => {
      render(<ActiveAgreementCard {...defaultProps} onViewFull={vi.fn()} />)

      const button = screen.getByTestId('view-full-button')
      expect(button).toHaveClass('min-h-[44px]')
    })
  })

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<ActiveAgreementCard {...defaultProps} className="custom-class" />)

      expect(screen.getByTestId('active-agreement-card')).toHaveClass('custom-class')
    })

    it('should have green theme for active status', () => {
      render(<ActiveAgreementCard {...defaultProps} />)

      const card = screen.getByTestId('active-agreement-card')
      expect(card).toHaveClass('border-green-200')
      expect(card).toHaveClass('bg-green-50')
    })
  })
})
