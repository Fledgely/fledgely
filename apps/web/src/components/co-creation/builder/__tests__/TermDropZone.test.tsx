/**
 * Tests for TermDropZone Component
 *
 * Story 5.2: Visual Agreement Builder - Task 4.7
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SessionTerm } from '@fledgely/contracts'
import { TermDropZone } from '../TermDropZone'

// ============================================
// TEST HELPERS
// ============================================

const createMockTerm = (overrides: Partial<SessionTerm> = {}): SessionTerm => ({
  id: 'term-123',
  type: 'screen_time',
  content: { minutes: 60 },
  addedBy: 'parent',
  status: 'accepted',
  order: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const createMockTerms = (count: number): SessionTerm[] =>
  Array.from({ length: count }, (_, i) => createMockTerm({
    id: `term-${i}`,
    order: i,
    type: ['screen_time', 'bedtime', 'monitoring', 'rule', 'consequence', 'reward'][i % 6] as SessionTerm['type'],
  }))

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('TermDropZone', () => {
  describe('basic rendering', () => {
    it('renders with correct data-testid', () => {
      const terms = createMockTerms(3)
      render(<TermDropZone terms={terms} />)

      expect(screen.getByTestId('term-drop-zone')).toBeInTheDocument()
    })

    it('renders custom data-testid when provided', () => {
      const terms = createMockTerms(3)
      render(<TermDropZone terms={terms} data-testid="custom-zone" />)

      expect(screen.getByTestId('custom-zone')).toBeInTheDocument()
    })

    it('renders all provided terms', () => {
      const terms = createMockTerms(5)
      render(<TermDropZone terms={terms} />)

      terms.forEach((term) => {
        expect(screen.getByTestId(`draggable-term-${term.id}`)).toBeInTheDocument()
      })
    })

    it('renders terms in correct order', () => {
      const terms = createMockTerms(3)
      render(<TermDropZone terms={terms} />)

      const zone = screen.getByTestId('term-drop-zone')
      const termElements = zone.querySelectorAll('[data-testid^="draggable-term-"]')

      expect(termElements[0]).toHaveAttribute('data-testid', 'draggable-term-term-0')
      expect(termElements[1]).toHaveAttribute('data-testid', 'draggable-term-term-1')
      expect(termElements[2]).toHaveAttribute('data-testid', 'draggable-term-term-2')
    })
  })

  // ============================================
  // EMPTY STATE TESTS
  // ============================================

  describe('empty state', () => {
    it('renders empty state when no terms', () => {
      render(<TermDropZone terms={[]} />)

      const zone = screen.getByTestId('term-drop-zone')
      expect(zone).toHaveAttribute('data-empty', 'true')
    })

    it('renders default empty message', () => {
      render(<TermDropZone terms={[]} />)

      expect(screen.getByText('No terms yet')).toBeInTheDocument()
      expect(screen.getByText('Add terms to build your agreement together')).toBeInTheDocument()
    })

    it('renders custom empty content when provided', () => {
      render(
        <TermDropZone
          terms={[]}
          emptyContent={<div data-testid="custom-empty">Custom empty state</div>}
        />
      )

      expect(screen.getByTestId('custom-empty')).toBeInTheDocument()
      expect(screen.getByText('Custom empty state')).toBeInTheDocument()
    })

    it('empty state has dashed border styling', () => {
      render(<TermDropZone terms={[]} />)

      const zone = screen.getByTestId('term-drop-zone')
      expect(zone.className).toContain('border-dashed')
    })
  })

  // ============================================
  // SELECTION TESTS
  // ============================================

  describe('selection', () => {
    it('highlights selected term', () => {
      const terms = createMockTerms(3)
      render(<TermDropZone terms={terms} selectedTermId="term-1" />)

      // The inner card should have selection styling
      const selectedCard = screen.getByTestId('term-card-term-1')
      expect(selectedCard.className).toContain('ring-2')
    })

    it('does not highlight unselected terms', () => {
      const terms = createMockTerms(3)
      render(<TermDropZone terms={terms} selectedTermId="term-1" />)

      const unselectedCard = screen.getByTestId('term-card-term-0')
      // Should not have selection ring class (ring-2 without focus-visible prefix)
      expect(unselectedCard.className).not.toContain(' ring-2 ')
      expect(unselectedCard.className).not.toMatch(/^ring-2\s/)
    })
  })

  // ============================================
  // CALLBACK TESTS
  // ============================================

  describe('callbacks', () => {
    it('calls onTermClick when a term is clicked', async () => {
      const terms = createMockTerms(3)
      const handleClick = vi.fn()
      const user = userEvent.setup()

      render(<TermDropZone terms={terms} onTermClick={handleClick} />)

      await user.click(screen.getByTestId('term-card-term-1'))

      expect(handleClick).toHaveBeenCalledWith(terms[1])
    })

    it('calls onTermEdit when edit is requested', async () => {
      const terms = createMockTerms(1)
      const handleEdit = vi.fn()
      const user = userEvent.setup()

      render(<TermDropZone terms={terms} onTermEdit={handleEdit} />)

      const editButton = screen.getByRole('button', { name: /edit/i })
      await user.click(editButton)

      expect(handleEdit).toHaveBeenCalledWith(terms[0])
    })
  })

  // ============================================
  // DRAG DISABLED TESTS
  // ============================================

  describe('drag disabled', () => {
    it('passes isDragDisabled to all term cards', () => {
      const terms = createMockTerms(3)
      render(<TermDropZone terms={terms} isDragDisabled />)

      // Drag handles should not exist when disabled
      terms.forEach((term) => {
        expect(screen.queryByTestId(`drag-handle-${term.id}`)).not.toBeInTheDocument()
      })
    })

    it('term cards still render when drag disabled', () => {
      const terms = createMockTerms(3)
      render(<TermDropZone terms={terms} isDragDisabled />)

      terms.forEach((term) => {
        expect(screen.getByTestId(`term-card-${term.id}`)).toBeInTheDocument()
      })
    })
  })

  // ============================================
  // ACCESSIBILITY TESTS
  // ============================================

  describe('accessibility', () => {
    it('has role="list"', () => {
      const terms = createMockTerms(3)
      render(<TermDropZone terms={terms} />)

      const zone = screen.getByTestId('term-drop-zone')
      expect(zone).toHaveAttribute('role', 'list')
    })

    it('has aria-label for screen readers', () => {
      const terms = createMockTerms(3)
      render(<TermDropZone terms={terms} />)

      const zone = screen.getByTestId('term-drop-zone')
      expect(zone).toHaveAttribute('aria-label', 'Agreement terms. Use keyboard to reorder.')
    })

    it('each term is wrapped in listitem role', () => {
      const terms = createMockTerms(3)
      render(<TermDropZone terms={terms} />)

      const listitems = screen.getAllByRole('listitem')
      expect(listitems).toHaveLength(3)
    })
  })

  // ============================================
  // CUSTOM CLASS TESTS
  // ============================================

  describe('custom className', () => {
    it('applies custom className to container', () => {
      const terms = createMockTerms(3)
      render(<TermDropZone terms={terms} className="my-custom-class" />)

      const zone = screen.getByTestId('term-drop-zone')
      expect(zone.className).toContain('my-custom-class')
    })

    it('applies custom className to empty state', () => {
      render(<TermDropZone terms={[]} className="my-custom-class" />)

      const zone = screen.getByTestId('term-drop-zone')
      expect(zone.className).toContain('my-custom-class')
    })
  })

  // ============================================
  // TERM TYPES RENDERING TESTS
  // ============================================

  describe('term type rendering', () => {
    it('renders screen_time terms correctly', () => {
      const terms = [createMockTerm({ id: 'st-1', type: 'screen_time' })]
      render(<TermDropZone terms={terms} />)

      expect(screen.getByText('Screen Time')).toBeInTheDocument()
    })

    it('renders bedtime terms correctly', () => {
      const terms = [createMockTerm({ id: 'bt-1', type: 'bedtime', content: { time: '20:00' } })]
      render(<TermDropZone terms={terms} />)

      expect(screen.getByText('Bedtime')).toBeInTheDocument()
    })

    it('renders monitoring terms correctly', () => {
      const terms = [createMockTerm({ id: 'mon-1', type: 'monitoring', content: { level: 'moderate' } })]
      render(<TermDropZone terms={terms} />)

      expect(screen.getByText('Monitoring')).toBeInTheDocument()
    })

    it('renders rule terms correctly', () => {
      const terms = [createMockTerm({ id: 'rule-1', type: 'rule', content: { text: 'No phones at dinner' } })]
      render(<TermDropZone terms={terms} />)

      expect(screen.getByText('Rule')).toBeInTheDocument()
      expect(screen.getByText('No phones at dinner')).toBeInTheDocument()
    })

    it('renders consequence terms correctly', () => {
      const terms = [createMockTerm({ id: 'con-1', type: 'consequence', content: { text: 'Device taken' } })]
      render(<TermDropZone terms={terms} />)

      expect(screen.getByText('Consequence')).toBeInTheDocument()
    })

    it('renders reward terms correctly', () => {
      const terms = [createMockTerm({ id: 'rew-1', type: 'reward', content: { text: 'Extra time' } })]
      render(<TermDropZone terms={terms} />)

      expect(screen.getByText('Reward')).toBeInTheDocument()
    })
  })

  // ============================================
  // LARGE LIST TESTS
  // ============================================

  describe('large lists', () => {
    it('renders 50 terms without issues', () => {
      const terms = createMockTerms(50)
      render(<TermDropZone terms={terms} />)

      expect(screen.getAllByRole('listitem')).toHaveLength(50)
    })

    it('handles 100 terms (NFR60 limit)', () => {
      const terms = createMockTerms(100)
      render(<TermDropZone terms={terms} />)

      expect(screen.getAllByRole('listitem')).toHaveLength(100)
    })
  })
})
