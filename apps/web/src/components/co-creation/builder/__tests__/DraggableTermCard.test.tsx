/**
 * Tests for DraggableTermCard Component
 *
 * Story 5.2: Visual Agreement Builder - Task 4.7
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DndContext } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { SessionTerm } from '@fledgely/contracts'
import { DraggableTermCard } from '../DraggableTermCard'

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

// Wrapper that provides required DnD context
function DndWrapper({ children, items }: { children: React.ReactNode; items: string[] }) {
  return (
    <DndContext>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  )
}

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('DraggableTermCard', () => {
  describe('basic rendering', () => {
    it('renders with correct data-testid', () => {
      const term = createMockTerm()
      render(
        <DndWrapper items={[term.id]}>
          <DraggableTermCard term={term} />
        </DndWrapper>
      )

      expect(screen.getByTestId(`draggable-term-${term.id}`)).toBeInTheDocument()
    })

    it('renders custom data-testid when provided', () => {
      const term = createMockTerm()
      render(
        <DndWrapper items={[term.id]}>
          <DraggableTermCard term={term} data-testid="custom-draggable" />
        </DndWrapper>
      )

      expect(screen.getByTestId('custom-draggable')).toBeInTheDocument()
    })

    it('renders the inner AgreementTermCard', () => {
      const term = createMockTerm()
      render(
        <DndWrapper items={[term.id]}>
          <DraggableTermCard term={term} />
        </DndWrapper>
      )

      // AgreementTermCard renders term type label
      expect(screen.getByText('Screen Time')).toBeInTheDocument()
    })

    it('renders term content preview', () => {
      const term = createMockTerm({ content: { minutes: 90 } })
      render(
        <DndWrapper items={[term.id]}>
          <DraggableTermCard term={term} />
        </DndWrapper>
      )

      expect(screen.getByText('1 hour 30 min')).toBeInTheDocument()
    })
  })

  // ============================================
  // DRAG HANDLE TESTS
  // ============================================

  describe('drag handle', () => {
    it('renders drag handle when not disabled', () => {
      const term = createMockTerm()
      render(
        <DndWrapper items={[term.id]}>
          <DraggableTermCard term={term} />
        </DndWrapper>
      )

      expect(screen.getByTestId(`drag-handle-${term.id}`)).toBeInTheDocument()
    })

    it('does not render drag handle when isDragDisabled is true', () => {
      const term = createMockTerm()
      render(
        <DndWrapper items={[term.id]}>
          <DraggableTermCard term={term} isDragDisabled />
        </DndWrapper>
      )

      expect(screen.queryByTestId(`drag-handle-${term.id}`)).not.toBeInTheDocument()
    })

    it('drag handle has aria-label for accessibility', () => {
      const term = createMockTerm({ type: 'bedtime' })
      render(
        <DndWrapper items={[term.id]}>
          <DraggableTermCard term={term} />
        </DndWrapper>
      )

      const handle = screen.getByTestId(`drag-handle-${term.id}`)
      expect(handle).toHaveAttribute('aria-label', 'Drag to reorder bedtime term')
    })

    it('drag handle has cursor-grab class', () => {
      const term = createMockTerm()
      render(
        <DndWrapper items={[term.id]}>
          <DraggableTermCard term={term} />
        </DndWrapper>
      )

      const handle = screen.getByTestId(`drag-handle-${term.id}`)
      expect(handle.className).toContain('cursor-grab')
    })
  })

  // ============================================
  // SELECTION STATE TESTS
  // ============================================

  describe('selection state', () => {
    it('passes isSelected to inner card', () => {
      const term = createMockTerm()
      render(
        <DndWrapper items={[term.id]}>
          <DraggableTermCard term={term} isSelected />
        </DndWrapper>
      )

      // AgreementTermCard adds ring classes when selected
      const card = screen.getByTestId(`term-card-${term.id}`)
      expect(card.className).toContain('ring-2')
    })

    it('inner card is not selected by default', () => {
      const term = createMockTerm()
      render(
        <DndWrapper items={[term.id]}>
          <DraggableTermCard term={term} />
        </DndWrapper>
      )

      const card = screen.getByTestId(`term-card-${term.id}`)
      // Should not have selection ring class (ring-2 without focus-visible prefix)
      expect(card.className).not.toContain(' ring-2 ')
      expect(card.className).not.toMatch(/^ring-2\s/)
    })
  })

  // ============================================
  // CALLBACK TESTS
  // ============================================

  describe('callbacks', () => {
    it('passes onClick to inner card', async () => {
      const term = createMockTerm()
      const handleClick = vi.fn()
      const user = userEvent.setup()

      render(
        <DndWrapper items={[term.id]}>
          <DraggableTermCard term={term} onClick={handleClick} />
        </DndWrapper>
      )

      await user.click(screen.getByTestId(`term-card-${term.id}`))

      expect(handleClick).toHaveBeenCalledWith(term)
    })

    it('passes onEdit to inner card', async () => {
      const term = createMockTerm()
      const handleEdit = vi.fn()
      const user = userEvent.setup()

      render(
        <DndWrapper items={[term.id]}>
          <DraggableTermCard term={term} onEdit={handleEdit} />
        </DndWrapper>
      )

      // Click the edit button
      const editButton = screen.getByRole('button', { name: /edit screen time/i })
      await user.click(editButton)

      expect(handleEdit).toHaveBeenCalledWith(term)
    })

    it('passes onStatusChange to inner card', () => {
      const term = createMockTerm()
      const handleStatusChange = vi.fn()

      render(
        <DndWrapper items={[term.id]}>
          <DraggableTermCard term={term} onStatusChange={handleStatusChange} />
        </DndWrapper>
      )

      // onStatusChange is passed but would need interaction to test
      // This test verifies the prop is accepted without error
      expect(screen.getByTestId(`term-card-${term.id}`)).toBeInTheDocument()
    })
  })

  // ============================================
  // DRAG STATE TESTS
  // ============================================

  describe('drag state', () => {
    it('has data-is-dragging attribute', () => {
      const term = createMockTerm()
      render(
        <DndWrapper items={[term.id]}>
          <DraggableTermCard term={term} />
        </DndWrapper>
      )

      const draggable = screen.getByTestId(`draggable-term-${term.id}`)
      expect(draggable).toHaveAttribute('data-is-dragging')
    })

    it('has data-is-sorting attribute', () => {
      const term = createMockTerm()
      render(
        <DndWrapper items={[term.id]}>
          <DraggableTermCard term={term} />
        </DndWrapper>
      )

      const draggable = screen.getByTestId(`draggable-term-${term.id}`)
      expect(draggable).toHaveAttribute('data-is-sorting')
    })

    it('has cursor-grab class when not dragging and not disabled', () => {
      const term = createMockTerm()
      render(
        <DndWrapper items={[term.id]}>
          <DraggableTermCard term={term} />
        </DndWrapper>
      )

      const draggable = screen.getByTestId(`draggable-term-${term.id}`)
      expect(draggable.className).toContain('cursor-grab')
    })

    it('does not have cursor-grab when drag disabled', () => {
      const term = createMockTerm()
      render(
        <DndWrapper items={[term.id]}>
          <DraggableTermCard term={term} isDragDisabled />
        </DndWrapper>
      )

      const draggable = screen.getByTestId(`draggable-term-${term.id}`)
      expect(draggable.className).not.toContain('cursor-grab')
    })
  })

  // ============================================
  // PADDING/LAYOUT TESTS
  // ============================================

  describe('layout', () => {
    it('has left padding for drag handle when enabled', () => {
      const term = createMockTerm()
      const { container } = render(
        <DndWrapper items={[term.id]}>
          <DraggableTermCard term={term} />
        </DndWrapper>
      )

      // Find the inner wrapper div that has pl-8 class
      const innerWrapper = container.querySelector('.pl-8')
      expect(innerWrapper).toBeInTheDocument()
    })

    it('does not have left padding when drag disabled', () => {
      const term = createMockTerm()
      const { container } = render(
        <DndWrapper items={[term.id]}>
          <DraggableTermCard term={term} isDragDisabled />
        </DndWrapper>
      )

      // Should not have pl-8 class
      const innerWrapper = container.querySelector('.pl-8')
      expect(innerWrapper).not.toBeInTheDocument()
    })
  })

  // ============================================
  // CUSTOM CLASS TESTS
  // ============================================

  describe('custom className', () => {
    it('passes className to inner card', () => {
      const term = createMockTerm()
      render(
        <DndWrapper items={[term.id]}>
          <DraggableTermCard term={term} className="my-custom-class" />
        </DndWrapper>
      )

      const card = screen.getByTestId(`term-card-${term.id}`)
      expect(card.className).toContain('my-custom-class')
    })
  })

  // ============================================
  // MULTIPLE TERM TYPES TESTS
  // ============================================

  describe('multiple term types', () => {
    const termTypes = ['screen_time', 'bedtime', 'monitoring', 'rule', 'consequence', 'reward'] as const

    it.each(termTypes)('renders %s term correctly', (type) => {
      const term = createMockTerm({ type, id: `term-${type}` })
      render(
        <DndWrapper items={[term.id]}>
          <DraggableTermCard term={term} />
        </DndWrapper>
      )

      expect(screen.getByTestId(`draggable-term-${term.id}`)).toBeInTheDocument()
    })
  })
})
