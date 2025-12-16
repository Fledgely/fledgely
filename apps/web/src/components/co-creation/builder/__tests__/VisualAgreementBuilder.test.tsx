/**
 * Tests for VisualAgreementBuilder Component
 *
 * Story 5.2: Visual Agreement Builder - Task 6.7
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SessionTerm, SessionTermType } from '@fledgely/contracts'
import { VisualAgreementBuilder } from '../VisualAgreementBuilder'

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
    type: ['screen_time', 'bedtime', 'monitoring', 'rule', 'consequence', 'reward'][i % 6] as SessionTermType,
  }))

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('VisualAgreementBuilder', () => {
  describe('basic rendering', () => {
    it('renders with correct data-testid', () => {
      const terms = createMockTerms(3)
      render(<VisualAgreementBuilder terms={terms} currentContributor="parent" />)
      expect(screen.getByTestId('visual-agreement-builder')).toBeInTheDocument()
    })

    it('renders custom data-testid when provided', () => {
      const terms = createMockTerms(3)
      render(
        <VisualAgreementBuilder
          terms={terms}
          currentContributor="parent"
          data-testid="custom-builder"
        />
      )
      expect(screen.getByTestId('custom-builder')).toBeInTheDocument()
    })

    it('displays term count indicator', () => {
      const terms = createMockTerms(5)
      render(<VisualAgreementBuilder terms={terms} currentContributor="parent" />)
      expect(screen.getByTestId('term-count-indicator')).toBeInTheDocument()
    })

    it('shows add term button', () => {
      const terms = createMockTerms(3)
      render(<VisualAgreementBuilder terms={terms} currentContributor="parent" />)
      expect(screen.getByRole('button', { name: /add new term/i })).toBeInTheDocument()
    })

    it('sets data-term-count attribute', () => {
      const terms = createMockTerms(5)
      render(<VisualAgreementBuilder terms={terms} currentContributor="parent" />)
      const builder = screen.getByTestId('visual-agreement-builder')
      expect(builder).toHaveAttribute('data-term-count', '5')
    })
  })

  // ============================================
  // EMPTY STATE TESTS
  // ============================================

  describe('empty state', () => {
    it('renders empty state when no terms', () => {
      render(<VisualAgreementBuilder terms={[]} currentContributor="parent" />)
      const builder = screen.getByTestId('visual-agreement-builder')
      expect(builder).toHaveAttribute('data-empty', 'true')
    })

    it('shows child-friendly empty message', () => {
      render(<VisualAgreementBuilder terms={[]} currentContributor="parent" />)
      expect(screen.getByText(/build your agreement together/i)).toBeInTheDocument()
    })

    it('shows add first term button in empty state', () => {
      render(<VisualAgreementBuilder terms={[]} currentContributor="parent" />)
      expect(screen.getByRole('button', { name: /add.*first term/i })).toBeInTheDocument()
    })

    it('hides add button when isReadOnly in empty state', () => {
      render(<VisualAgreementBuilder terms={[]} currentContributor="parent" isReadOnly />)
      expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument()
    })
  })

  // ============================================
  // CATEGORY GROUPING TESTS
  // ============================================

  describe('category grouping', () => {
    it('groups terms by category when groupByCategory is true', () => {
      const terms = [
        createMockTerm({ id: 'st-1', type: 'screen_time' }),
        createMockTerm({ id: 'bt-1', type: 'bedtime', content: { time: '20:00' } }),
        createMockTerm({ id: 'st-2', type: 'screen_time', content: { minutes: 30 } }),
      ]
      render(<VisualAgreementBuilder terms={terms} currentContributor="parent" groupByCategory />)

      expect(screen.getByTestId('category-section-screen_time')).toBeInTheDocument()
      expect(screen.getByTestId('category-section-bedtime')).toBeInTheDocument()
    })

    it('shows category headers with count', () => {
      const terms = [
        createMockTerm({ id: 'st-1', type: 'screen_time' }),
        createMockTerm({ id: 'st-2', type: 'screen_time', content: { minutes: 30 } }),
      ]
      render(<VisualAgreementBuilder terms={terms} currentContributor="parent" groupByCategory />)

      // Category header contains the label in an h3
      const categorySection = screen.getByTestId('category-section-screen_time')
      const header = categorySection.querySelector('h3')
      expect(header).toBeInTheDocument()
      expect(header!.textContent).toContain('Screen Time')
      expect(header!.textContent).toContain('(2)')
    })

    it('only shows categories with terms', () => {
      const terms = [createMockTerm({ id: 'st-1', type: 'screen_time' })]
      render(<VisualAgreementBuilder terms={terms} currentContributor="parent" groupByCategory />)

      expect(screen.getByTestId('category-section-screen_time')).toBeInTheDocument()
      expect(screen.queryByTestId('category-section-bedtime')).not.toBeInTheDocument()
    })

    it('shows add button for each category', () => {
      const terms = [createMockTerm({ id: 'st-1', type: 'screen_time' })]
      render(
        <VisualAgreementBuilder
          terms={terms}
          currentContributor="parent"
          groupByCategory
          onAddTerm={() => {}}
        />
      )

      expect(screen.getByRole('button', { name: /add screen time/i })).toBeInTheDocument()
    })
  })

  // ============================================
  // FLAT LIST MODE TESTS
  // ============================================

  describe('flat list mode', () => {
    it('renders flat list when groupByCategory is false', () => {
      const terms = createMockTerms(3)
      render(
        <VisualAgreementBuilder
          terms={terms}
          currentContributor="parent"
          groupByCategory={false}
        />
      )

      expect(screen.getByTestId('term-drop-zone')).toBeInTheDocument()
      expect(screen.queryByTestId('category-section-screen_time')).not.toBeInTheDocument()
    })

    it('renders all terms in single drop zone', () => {
      const terms = createMockTerms(5)
      render(
        <VisualAgreementBuilder
          terms={terms}
          currentContributor="parent"
          groupByCategory={false}
        />
      )

      const dropZone = screen.getByTestId('term-drop-zone')
      expect(dropZone.querySelectorAll('[data-testid^="draggable-term-"]')).toHaveLength(5)
    })
  })

  // ============================================
  // SELECTION TESTS
  // ============================================

  describe('selection', () => {
    it('passes selectedTermId to term cards', () => {
      const terms = createMockTerms(3)
      render(
        <VisualAgreementBuilder
          terms={terms}
          currentContributor="parent"
          selectedTermId="term-1"
          groupByCategory={false}
        />
      )

      const selectedCard = screen.getByTestId('term-card-term-1')
      expect(selectedCard.className).toContain('ring-2')
    })

    it('calls onTermSelect when term is clicked', async () => {
      const terms = createMockTerms(3)
      const handleSelect = vi.fn()
      const user = userEvent.setup()

      render(
        <VisualAgreementBuilder
          terms={terms}
          currentContributor="parent"
          onTermSelect={handleSelect}
          groupByCategory={false}
        />
      )

      await user.click(screen.getByTestId('term-card-term-1'))

      expect(handleSelect).toHaveBeenCalledWith(terms[1])
    })

    it('clears selection on Escape key', () => {
      const terms = createMockTerms(3)
      const handleSelect = vi.fn()

      render(
        <VisualAgreementBuilder
          terms={terms}
          currentContributor="parent"
          selectedTermId="term-1"
          onTermSelect={handleSelect}
          groupByCategory={false}
        />
      )

      const builder = screen.getByTestId('visual-agreement-builder')
      fireEvent.keyDown(builder, { key: 'Escape' })

      expect(handleSelect).toHaveBeenCalledWith(null)
    })
  })

  // ============================================
  // ADD TERM TESTS
  // ============================================

  describe('add term', () => {
    it('calls onAddTerm when add button is clicked', async () => {
      const terms = createMockTerms(3)
      const handleAddTerm = vi.fn()
      const user = userEvent.setup()

      render(
        <VisualAgreementBuilder
          terms={terms}
          currentContributor="parent"
          onAddTerm={handleAddTerm}
        />
      )

      await user.click(screen.getByRole('button', { name: /add new term/i }))

      expect(handleAddTerm).toHaveBeenCalled()
    })

    it('calls onAddTerm with category type when category add button clicked', async () => {
      const terms = [createMockTerm({ id: 'st-1', type: 'screen_time' })]
      const handleAddTerm = vi.fn()
      const user = userEvent.setup()

      render(
        <VisualAgreementBuilder
          terms={terms}
          currentContributor="parent"
          onAddTerm={handleAddTerm}
          groupByCategory
        />
      )

      await user.click(screen.getByRole('button', { name: /add screen time/i }))

      expect(handleAddTerm).toHaveBeenCalledWith('screen_time')
    })

    it('disables add button at max terms', () => {
      const terms = createMockTerms(100)
      render(
        <VisualAgreementBuilder
          terms={terms}
          currentContributor="parent"
          onAddTerm={() => {}}
        />
      )

      const addButton = screen.getByRole('button', { name: /maximum terms reached/i })
      expect(addButton).toBeDisabled()
    })

    it('hides add button when isReadOnly', () => {
      const terms = createMockTerms(3)
      render(
        <VisualAgreementBuilder
          terms={terms}
          currentContributor="parent"
          isReadOnly
        />
      )

      expect(screen.queryByRole('button', { name: /add new term/i })).not.toBeInTheDocument()
    })
  })

  // ============================================
  // EDIT TESTS
  // ============================================

  describe('edit', () => {
    it('calls onTermEdit when edit button is clicked', async () => {
      const terms = createMockTerms(1)
      const handleEdit = vi.fn()
      const user = userEvent.setup()

      render(
        <VisualAgreementBuilder
          terms={terms}
          currentContributor="parent"
          onTermEdit={handleEdit}
          groupByCategory={false}
        />
      )

      const editButton = screen.getByRole('button', { name: /edit/i })
      await user.click(editButton)

      expect(handleEdit).toHaveBeenCalledWith(terms[0])
    })

    it('does not show edit buttons when isReadOnly', () => {
      const terms = createMockTerms(1)
      render(
        <VisualAgreementBuilder
          terms={terms}
          currentContributor="parent"
          onTermEdit={() => {}}
          isReadOnly
          groupByCategory={false}
        />
      )

      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
    })
  })

  // ============================================
  // DRAG AND DROP TESTS
  // ============================================

  describe('drag and drop', () => {
    it('disables drag when isReadOnly', () => {
      const terms = createMockTerms(3)
      render(
        <VisualAgreementBuilder
          terms={terms}
          currentContributor="parent"
          isReadOnly
          groupByCategory={false}
        />
      )

      // Drag handles should not exist when disabled
      terms.forEach((term) => {
        expect(screen.queryByTestId(`drag-handle-${term.id}`)).not.toBeInTheDocument()
      })
    })

    it('shows drag handles when not isReadOnly', () => {
      const terms = createMockTerms(3)
      render(
        <VisualAgreementBuilder
          terms={terms}
          currentContributor="parent"
          groupByCategory={false}
        />
      )

      // Drag handles should exist
      terms.forEach((term) => {
        expect(screen.getByTestId(`drag-handle-${term.id}`)).toBeInTheDocument()
      })
    })
  })

  // ============================================
  // CUSTOM CLASS TESTS
  // ============================================

  describe('custom className', () => {
    it('applies custom className to container', () => {
      const terms = createMockTerms(3)
      render(
        <VisualAgreementBuilder
          terms={terms}
          currentContributor="parent"
          className="my-custom-class"
        />
      )

      const builder = screen.getByTestId('visual-agreement-builder')
      expect(builder.className).toContain('my-custom-class')
    })

    it('applies custom className in empty state', () => {
      render(
        <VisualAgreementBuilder
          terms={[]}
          currentContributor="parent"
          className="my-custom-class"
        />
      )

      const builder = screen.getByTestId('visual-agreement-builder')
      expect(builder.className).toContain('my-custom-class')
    })
  })

  // ============================================
  // TERM TYPE RENDERING TESTS
  // ============================================

  describe('term type rendering', () => {
    const termTypes: SessionTermType[] = [
      'screen_time',
      'bedtime',
      'monitoring',
      'rule',
      'consequence',
      'reward',
    ]

    it.each(termTypes)('renders %s terms correctly', (type) => {
      const term = createMockTerm({ id: `${type}-1`, type })
      render(
        <VisualAgreementBuilder
          terms={[term]}
          currentContributor="parent"
          groupByCategory={false}
        />
      )

      expect(screen.getByTestId(`term-card-${type}-1`)).toBeInTheDocument()
    })
  })

  // ============================================
  // ACCESSIBILITY TESTS
  // ============================================

  describe('accessibility', () => {
    it('add term button meets touch target size (NFR49)', () => {
      const terms = createMockTerms(3)
      render(<VisualAgreementBuilder terms={terms} currentContributor="parent" />)

      const addButton = screen.getByRole('button', { name: /add new term/i })
      expect(addButton.className).toContain('min-h-[44px]')
      expect(addButton.className).toContain('min-w-[44px]')
    })

    it('category sections have aria-labelledby', () => {
      const terms = [createMockTerm({ id: 'st-1', type: 'screen_time' })]
      render(
        <VisualAgreementBuilder
          terms={terms}
          currentContributor="parent"
          groupByCategory
        />
      )

      const section = screen.getByTestId('category-section-screen_time')
      expect(section).toHaveAttribute('aria-labelledby', 'category-screen_time')
    })

    it('has visible focus indicator on add button', () => {
      const terms = createMockTerms(3)
      render(<VisualAgreementBuilder terms={terms} currentContributor="parent" />)

      const addButton = screen.getByRole('button', { name: /add new term/i })
      expect(addButton.className).toContain('focus-visible:ring')
    })
  })

  // ============================================
  // LARGE DATASET TESTS
  // ============================================

  describe('large datasets', () => {
    it('renders 50 terms without issues', () => {
      const terms = createMockTerms(50)
      render(
        <VisualAgreementBuilder
          terms={terms}
          currentContributor="parent"
          groupByCategory={false}
        />
      )

      expect(screen.getByTestId('visual-agreement-builder')).toBeInTheDocument()
    })

    it('renders 100 terms (NFR60 limit) without issues', () => {
      const terms = createMockTerms(100)
      render(
        <VisualAgreementBuilder
          terms={terms}
          currentContributor="parent"
          groupByCategory={false}
        />
      )

      const builder = screen.getByTestId('visual-agreement-builder')
      expect(builder).toHaveAttribute('data-term-count', '100')
    })
  })
})
