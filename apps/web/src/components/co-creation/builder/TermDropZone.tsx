'use client'

import { useCallback, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import type { SessionTerm, SessionTermStatus } from '@fledgely/contracts'
import { DraggableTermCard } from './DraggableTermCard'
import { AgreementTermCard } from './AgreementTermCard'

/**
 * Props for the TermDropZone component
 */
export interface TermDropZoneProps {
  /** Array of terms to display */
  terms: SessionTerm[]
  /** Callback when term order changes */
  onReorder?: (terms: SessionTerm[]) => void
  /** Callback when a specific reorder happens (for recording contribution) */
  onTermReorder?: (termId: string, oldIndex: number, newIndex: number) => void
  /** Currently selected term ID */
  selectedTermId?: string
  /** Callback when a term is clicked */
  onTermClick?: (term: SessionTerm) => void
  /** Callback when edit is requested */
  onTermEdit?: (term: SessionTerm) => void
  /** Callback when status change is requested */
  onTermStatusChange?: (term: SessionTerm, status: SessionTermStatus) => void
  /** Whether drag is disabled globally */
  isDragDisabled?: boolean
  /** Empty state content */
  emptyContent?: React.ReactNode
  /** Additional CSS classes */
  className?: string
  /** Data attributes for testing */
  'data-testid'?: string
}

/**
 * Screen reader announcements for drag states
 */
const announcements = {
  onDragStart({ active }: DragStartEvent) {
    return `Picked up term. Use arrow keys to move, space to drop.`
  },
  onDragOver({ active, over }: { active: { id: string | number }; over?: { id: string | number } | null }) {
    if (over) {
      return `Term is now over position ${over.id}. Press space to drop.`
    }
    return `Term is no longer over a drop zone.`
  },
  onDragEnd({ active, over }: DragEndEvent) {
    if (over) {
      return `Term was dropped at position ${over.id}.`
    }
    return `Term was dropped.`
  },
  onDragCancel() {
    return `Dragging was cancelled. Term returned to original position.`
  },
}

/**
 * TermDropZone Component
 *
 * Story 5.2: Visual Agreement Builder - Task 4
 *
 * Container component for drag-and-drop term reordering.
 * Provides the DnD context and sortable context for child DraggableTermCards.
 *
 * Features:
 * - Accessible drag-and-drop with @dnd-kit (AC #2)
 * - Keyboard support: Space to pick up, Arrow keys to move, Space to drop (NFR43)
 * - Screen reader announcements for drag states (NFR42)
 * - Visual feedback during drag operations
 * - Drag overlay for smooth visual experience
 * - Empty state handling
 *
 * @example
 * ```tsx
 * <TermDropZone
 *   terms={sessionTerms}
 *   onReorder={(newTerms) => setTerms(newTerms)}
 *   onTermClick={handleTermClick}
 * />
 * ```
 */
export function TermDropZone({
  terms,
  onReorder,
  onTermReorder,
  selectedTermId,
  onTermClick,
  onTermEdit,
  onTermStatusChange,
  isDragDisabled = false,
  emptyContent,
  className = '',
  'data-testid': dataTestId,
}: TermDropZoneProps) {
  // Track which term is currently being dragged
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeTerm = activeId ? terms.find((t) => t.id === activeId) : null

  // Configure sensors for pointer and keyboard input
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Add a small activation constraint to prevent accidental drags
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      setActiveId(null)

      if (over && active.id !== over.id) {
        const oldIndex = terms.findIndex((t) => t.id === active.id)
        const newIndex = terms.findIndex((t) => t.id === over.id)

        if (oldIndex !== -1 && newIndex !== -1) {
          // Notify about the specific reorder (for recording contribution)
          onTermReorder?.(active.id as string, oldIndex, newIndex)

          // Calculate new array and notify parent
          const newTerms = arrayMove(terms, oldIndex, newIndex).map((term, index) => ({
            ...term,
            order: index,
          }))
          onReorder?.(newTerms)
        }
      }
    },
    [terms, onReorder, onTermReorder]
  )

  // Handle drag cancel
  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  // Get term IDs for sortable context
  const termIds = terms.map((t) => t.id)

  // Empty state
  if (terms.length === 0) {
    return (
      <div
        className={`p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center ${className}`}
        data-testid={dataTestId ?? 'term-drop-zone'}
        data-empty="true"
      >
        {emptyContent ?? (
          <div className="text-gray-500 dark:text-gray-400">
            <p className="text-lg font-medium">No terms yet</p>
            <p className="text-sm mt-1">Add terms to build your agreement together</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable: `To pick up a term, press space or enter.
            While dragging, use the arrow keys to move the term.
            Press space or enter to drop the term, or press escape to cancel.`,
        },
      }}
    >
      <SortableContext items={termIds} strategy={verticalListSortingStrategy}>
        <div
          className={`space-y-3 ${className}`}
          data-testid={dataTestId ?? 'term-drop-zone'}
          role="list"
          aria-label="Agreement terms. Use keyboard to reorder."
        >
          {terms.map((term) => (
            <div key={term.id} role="listitem">
              <DraggableTermCard
                term={term}
                isSelected={term.id === selectedTermId}
                isDragDisabled={isDragDisabled}
                onClick={onTermClick}
                onEdit={onTermEdit}
                onStatusChange={onTermStatusChange}
              />
            </div>
          ))}
        </div>
      </SortableContext>

      {/* Drag Overlay for smooth visual feedback */}
      <DragOverlay dropAnimation={null}>
        {activeTerm ? (
          <AgreementTermCard
            term={activeTerm}
            isDragging
            isDragDisabled
            className="shadow-xl rotate-2"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export default TermDropZone
