/**
 * Droppable Term List Component.
 *
 * Story 5.2: Visual Agreement Builder - AC2
 *
 * Container component for a sortable list of agreement terms using @dnd-kit.
 * Manages drag-and-drop reordering with keyboard navigation support.
 */

'use client'

import { useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { AgreementTerm } from '@fledgely/shared/contracts'
import { DraggableTermCard } from './DraggableTermCard'

interface DroppableTermListProps {
  /** List of terms to display */
  terms: AgreementTerm[]
  /** Called when terms are reordered */
  onReorder: (terms: AgreementTerm[]) => void
  /** Selected term ID */
  selectedTermId?: string
  /** Called when a term is selected */
  onSelectTerm?: (termId: string) => void
  /** Called when edit is requested for a term */
  onEditTerm?: (termId: string) => void
  /** Called when delete is requested for a term */
  onDeleteTerm?: (termId: string) => void
  /** Empty state message */
  emptyMessage?: string
}

export function DroppableTermList({
  terms,
  onReorder,
  selectedTermId,
  onSelectTerm,
  onEditTerm,
  onDeleteTerm,
  emptyMessage = 'No terms added yet. Add your first term to get started!',
}: DroppableTermListProps) {
  /**
   * Configure sensors for drag-and-drop.
   * Pointer sensor for mouse/touch, keyboard sensor for accessibility.
   */
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevent accidental drags
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  /**
   * Handle drag end event.
   * Reorders terms and updates order values.
   */
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        const oldIndex = terms.findIndex((t) => t.id === active.id)
        const newIndex = terms.findIndex((t) => t.id === over.id)

        if (oldIndex !== -1 && newIndex !== -1) {
          const newTerms = arrayMove(terms, oldIndex, newIndex)
          // Update order values
          const reorderedTerms = newTerms.map((term, index) => ({
            ...term,
            order: index,
            updatedAt: new Date(),
          }))
          onReorder(reorderedTerms)
        }
      }
    },
    [terms, onReorder]
  )

  // Show empty state
  if (terms.length === 0) {
    return (
      <div
        className="p-8 text-center border-2 border-dashed border-gray-200 rounded-lg"
        data-testid="empty-term-list"
      >
        <svg
          className="w-12 h-12 text-gray-300 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={terms.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3" role="list" aria-label="Agreement terms" data-testid="term-list">
          {terms.map((term) => (
            <DraggableTermCard
              key={term.id}
              term={term}
              isSelected={selectedTermId === term.id}
              onClick={() => onSelectTerm?.(term.id)}
              onEdit={() => onEditTerm?.(term.id)}
              onDelete={() => onDeleteTerm?.(term.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

export default DroppableTermList
