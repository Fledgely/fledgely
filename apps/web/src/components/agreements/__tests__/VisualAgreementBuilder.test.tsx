/**
 * Tests for VisualAgreementBuilder component.
 *
 * Story 5.2: Visual Agreement Builder - AC1, AC2, AC4, AC5, AC6
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VisualAgreementBuilder } from '../VisualAgreementBuilder'
import type { AgreementTerm, CoCreationSession } from '@fledgely/shared/contracts'

// Mock dnd-kit since it requires more complex setup
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: vi.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  arrayMove: (arr: unknown[], from: number, to: number) => {
    const result = [...arr]
    const [removed] = result.splice(from, 1)
    result.splice(to, 0, removed)
    return result
  },
}))

describe('VisualAgreementBuilder', () => {
  const mockSession: CoCreationSession = {
    id: 'session-1',
    familyId: 'family-1',
    childId: 'child-1',
    agreementDraftId: null,
    templateId: null,
    status: 'active',
    contributions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    pausedAt: null,
    completedAt: null,
    lastActivityAt: new Date(),
    createdByUid: 'parent-1',
  }

  const mockTerm: AgreementTerm = {
    id: 'term-1',
    text: 'Screen time ends at 8pm',
    category: 'time',
    party: 'parent',
    order: 0,
    explanation: 'Turn off devices at 8pm on school nights.',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const defaultProps = {
    session: mockSession,
    terms: [] as AgreementTerm[],
    onTermsChange: vi.fn(),
    onContribution: vi.fn(),
    childName: 'Alex',
  }

  describe('AC1: Visual Cards Interface', () => {
    it('renders the builder with term count', () => {
      render(<VisualAgreementBuilder {...defaultProps} />)

      expect(screen.getByTestId('visual-agreement-builder')).toBeInTheDocument()
      expect(screen.getByTestId('term-count')).toHaveTextContent('0 / 100 rules')
    })

    it('shows empty state when no terms', () => {
      render(<VisualAgreementBuilder {...defaultProps} />)

      expect(screen.getByTestId('empty-term-list')).toBeInTheDocument()
      expect(screen.getByText(/No rules added yet/)).toBeInTheDocument()
    })

    it('displays terms as cards', () => {
      render(<VisualAgreementBuilder {...defaultProps} terms={[mockTerm]} />)

      expect(screen.getByText('Screen time ends at 8pm')).toBeInTheDocument()
    })
  })

  describe('AC4: Party Attribution', () => {
    it('shows parent add button', () => {
      render(<VisualAgreementBuilder {...defaultProps} />)

      expect(screen.getByTestId('add-parent-term')).toBeInTheDocument()
      expect(screen.getByText('Parent Adds a Rule')).toBeInTheDocument()
    })

    it('shows child add button with child name', () => {
      render(<VisualAgreementBuilder {...defaultProps} />)

      expect(screen.getByTestId('add-child-term')).toBeInTheDocument()
      expect(screen.getByText('Alex Adds a Rule')).toBeInTheDocument()
    })

    it('opens add modal for parent', async () => {
      render(<VisualAgreementBuilder {...defaultProps} />)

      fireEvent.click(screen.getByTestId('add-parent-term'))

      await waitFor(() => {
        expect(screen.getByTestId('add-term-modal')).toBeInTheDocument()
      })
      expect(screen.getByText(/Parent's Idea/)).toBeInTheDocument()
    })

    it('opens add modal for child', async () => {
      render(<VisualAgreementBuilder {...defaultProps} />)

      fireEvent.click(screen.getByTestId('add-child-term'))

      await waitFor(() => {
        expect(screen.getByTestId('add-term-modal')).toBeInTheDocument()
      })
      expect(screen.getByText(/Child's Idea/)).toBeInTheDocument()
    })
  })

  describe('AC5: Category Color Coding', () => {
    it('shows category summary when terms exist', () => {
      const terms: AgreementTerm[] = [
        { ...mockTerm, id: '1', category: 'time' },
        { ...mockTerm, id: '2', category: 'time' },
        { ...mockTerm, id: '3', category: 'apps' },
      ]

      render(<VisualAgreementBuilder {...defaultProps} terms={terms} />)

      expect(screen.getByTestId('category-summary')).toBeInTheDocument()
      expect(screen.getByText('time: 2')).toBeInTheDocument()
      expect(screen.getByText('apps: 1')).toBeInTheDocument()
    })
  })

  describe('AC6: 100 Term Limit', () => {
    it('shows term count', () => {
      const terms = Array.from({ length: 5 }, (_, i) => ({
        ...mockTerm,
        id: `term-${i}`,
        order: i,
      }))

      render(<VisualAgreementBuilder {...defaultProps} terms={terms} />)

      expect(screen.getByTestId('term-count')).toHaveTextContent('5 / 100 rules')
    })

    it('shows limit warning when at 100 terms', () => {
      const terms = Array.from({ length: 100 }, (_, i) => ({
        ...mockTerm,
        id: `term-${i}`,
        order: i,
      }))

      render(<VisualAgreementBuilder {...defaultProps} terms={terms} />)

      expect(screen.getByTestId('limit-warning')).toBeInTheDocument()
      expect(screen.getByText(/reached the maximum of 100 rules/)).toBeInTheDocument()
    })

    it('disables add buttons when at limit', () => {
      const terms = Array.from({ length: 100 }, (_, i) => ({
        ...mockTerm,
        id: `term-${i}`,
        order: i,
      }))

      render(<VisualAgreementBuilder {...defaultProps} terms={terms} />)

      expect(screen.getByTestId('add-parent-term')).toBeDisabled()
      expect(screen.getByTestId('add-child-term')).toBeDisabled()
    })
  })

  describe('Term Management', () => {
    it('calls onTermsChange when adding a term', async () => {
      const onTermsChange = vi.fn()
      render(<VisualAgreementBuilder {...defaultProps} onTermsChange={onTermsChange} />)

      // Open add modal
      fireEvent.click(screen.getByTestId('add-parent-term'))

      await waitFor(() => {
        expect(screen.getByTestId('add-term-modal')).toBeInTheDocument()
      })

      // Fill in form
      fireEvent.change(screen.getByTestId('term-text-input'), {
        target: { value: 'New rule text' },
      })
      fireEvent.change(screen.getByTestId('term-explanation-input'), {
        target: { value: 'Simple explanation' },
      })

      // Submit
      fireEvent.click(screen.getByTestId('save-term'))

      await waitFor(() => {
        expect(onTermsChange).toHaveBeenCalled()
      })
    })

    it('shows delete confirmation dialog', async () => {
      render(<VisualAgreementBuilder {...defaultProps} terms={[mockTerm]} />)

      // Click delete on the term
      fireEvent.click(screen.getByTestId('delete-term'))

      await waitFor(() => {
        expect(screen.getByTestId('delete-confirm-overlay')).toBeInTheDocument()
      })
      expect(screen.getByText('Remove this rule?')).toBeInTheDocument()
    })

    it('calls onTermsChange when confirming delete', async () => {
      const onTermsChange = vi.fn()
      render(
        <VisualAgreementBuilder
          {...defaultProps}
          terms={[mockTerm]}
          onTermsChange={onTermsChange}
        />
      )

      // Click delete
      fireEvent.click(screen.getByTestId('delete-term'))

      await waitFor(() => {
        expect(screen.getByTestId('confirm-delete')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('confirm-delete'))

      expect(onTermsChange).toHaveBeenCalledWith([])
    })

    it('cancels delete when clicking Keep It', async () => {
      const onTermsChange = vi.fn()
      render(
        <VisualAgreementBuilder
          {...defaultProps}
          terms={[mockTerm]}
          onTermsChange={onTermsChange}
        />
      )

      // Click delete
      fireEvent.click(screen.getByTestId('delete-term'))

      await waitFor(() => {
        expect(screen.getByTestId('cancel-delete')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('cancel-delete'))

      expect(onTermsChange).not.toHaveBeenCalled()
      expect(screen.queryByTestId('delete-confirm-overlay')).not.toBeInTheDocument()
    })
  })

  describe('Contributions', () => {
    it('calls onContribution when adding a term', async () => {
      const onContribution = vi.fn()
      render(<VisualAgreementBuilder {...defaultProps} onContribution={onContribution} />)

      // Open add modal
      fireEvent.click(screen.getByTestId('add-parent-term'))

      await waitFor(() => {
        expect(screen.getByTestId('add-term-modal')).toBeInTheDocument()
      })

      // Fill in form
      fireEvent.change(screen.getByTestId('term-text-input'), {
        target: { value: 'New rule' },
      })
      fireEvent.change(screen.getByTestId('term-explanation-input'), {
        target: { value: 'Explanation' },
      })

      // Submit
      fireEvent.click(screen.getByTestId('save-term'))

      await waitFor(() => {
        expect(onContribution).toHaveBeenCalledWith('parent', 'add_term', expect.any(Object))
      })
    })

    it('calls onContribution when deleting a term', async () => {
      const onContribution = vi.fn()
      render(
        <VisualAgreementBuilder
          {...defaultProps}
          terms={[mockTerm]}
          onContribution={onContribution}
        />
      )

      // Click delete
      fireEvent.click(screen.getByTestId('delete-term'))

      await waitFor(() => {
        expect(screen.getByTestId('confirm-delete')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('confirm-delete'))

      expect(onContribution).toHaveBeenCalledWith('parent', 'remove_term', { termId: 'term-1' })
    })
  })

  describe('Accessibility', () => {
    it('has accessible add buttons with 44px touch targets', () => {
      render(<VisualAgreementBuilder {...defaultProps} />)

      expect(screen.getByTestId('add-parent-term')).toHaveClass('min-h-[44px]')
      expect(screen.getByTestId('add-child-term')).toHaveClass('min-h-[44px]')
    })

    it('has role alert on limit warning', () => {
      const terms = Array.from({ length: 100 }, (_, i) => ({
        ...mockTerm,
        id: `term-${i}`,
        order: i,
      }))

      render(<VisualAgreementBuilder {...defaultProps} terms={terms} />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})
